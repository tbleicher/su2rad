
module Geometry

    def getCenter(vertices)
        x_sum = 0
        y_sum = 0
        z_sum = 0
        vertices.each { |v|
            x_sum += v.position.x
            y_sum += v.position.y
            z_sum += v.position.z
        }
        n = vertices.length
        if n > 0
            return Geom::Point3d.new(x_sum/n, y_sum/n, z_sum/n)
        else 
            return nil
        end
    end

    def getGlobalTransformation(e)
        ## find global transformation for entity <e>
        transStack = []
        while e.parent
            if e.parent == Sketchup.active_model
                break
            else
                ## e.parent is SketchUp::ComponentDefinition
                e = e.parent.instances[0]
                transStack.push(e.transformation)
            end
        end
        transStack.reverse!
        gt = Geom::Transformation.new()
        transStack.each { |t|
            gt *= t
        }
        return gt
    end
    
    def getNearestPoint(p, verts)
        return verts[getNearestPointIndex(p,verts)]
    end
    
    def getNearestPointDistance(p, verts)
        v = getNearestPoint(p, verts)
        return p.distance(v.position)
    end
    
    def getNearestPointIndex(p, verts)
        dists = verts.collect { |v| p.distance(v.position) }
        min = dists.sort[0]
        idx = 0
        verts.each_index { |i|
            v = verts[i]
            if p.distance(v) == min
                idx = i
                break
            end
        }
        return idx
    end
   
    def getPolyMesh(face, trans=nil)
        polymesh = face.mesh 7 
        if trans != nil
            polymesh.transform! trans
        end
        return polymesh
    end
        
    
end



module NumericEntity

    def findIntersection(line, x, y)
        ## Sketchup's intersect_line_line returns garbage.
        ## Our requirements are simple so let's do our own function.
        dx = line[0][0] - line[1][0]
        dy = line[0][1] - line[1][1]
        if y == 0
            ## find intersection on x
            n = (x-line[0][0])/dx
            y = n*dy+line[0][1]
        else
            n = (y-line[0][1])/dy
            x = n*dx+line[0][0]
        end
        return x,y
    end
    
    def getBBoxOnGrid(p1,p2,p3)
        ## return bbox for 0.25m grid
        xs = [p1.x,p2.x,p3.x]
        ys = [p1.y,p2.y,p3.y]
        xs.sort!
        ys.sort!
        unit = getConfig('UNIT')
        gsX = getConfig('GRIDSPACINGX')
        gsY = getConfig('GRIDSPACINGY')
        xmin = xs[0]*unit - gsX
        xmin = ((xmin/gsX).to_i-1) * gsX
        xmax = xs[2]*unit + gsX
        xmax = ((xmax/gsX).to_i+1) * gsX
        ymin = ys[0]*unit - gsY
        ymin = ((ymin/gsY).to_i-1) * gsY
        ymax = ys[2]*unit + gsY
        ymax = ((ymax/gsY).to_i+1) * gsY
        return [xmin/unit, ymin/unit, xmax/unit, ymax/unit]
    end
    
    def getNumericEdgePoints(face)
        ## return intersection points of edge with 0.25m grid lines
        unit = getConfig('UNIT')
        gsX = getConfig('GRIDSPACINGY')
        gsY = getConfig('GRIDSPACINGX')
        dx = gsX/unit
        dy = gsY/unit
        entities = Sketchup.active_model.entities
        
        bbox = Geom::BoundingBox.new()
        edgePoints = []
        edgeLines = []
        zValues = []

        ## add corner points first
        face.edges.each { |oedge|
            edge = entities.add_line(oedge.start.position, oedge.end.position)
            entities.transform_entities($globaltrans, edge)
            s = edge.start.position
            e = edge.end.position
            edgePoints.push("%.2f %.2f %.2f 0 0 1" % [s.x*unit, s.y*unit, s.z*unit])
            zValues.push(s.z)
            bbox.add(s)
            bbox.add(e)
            edgeLines.push([[s.x,s.y,0],[e.x,e.y,0]])
            entities.erase_entities(edge)
        }
        
        ## find average z-value of corners
        if zValues.length > 0
            sum = 0
            zValues.each { |z| sum += z }
            zValue = sum / zValues.length
        else
            zValue = 0
        end
        uimessage("number of edge verts : #{edgePoints.length}\n", 2)

        ## find edge intersections with grid lines
        gridBBox = getBBoxOnGrid(bbox.min, bbox.max, bbox.max)
        edgeLines.each { |line|
            xmin = [line[0][0],line[1][0]].min
            xmax = [line[0][0],line[1][0]].max
            ymin = [line[0][1],line[1][1]].min
            ymax = [line[0][1],line[1][1]].max
            deltaX = xmax - xmin
            deltaY = ymax - ymin
            
            if deltaX > deltaY
                ## edge is more horizontal; intersect with x-grid
                y1 = gridBBox[1]
                y2 = gridBBox[3]
                x = gridBBox[0]
                while x <= gridBBox[2]
                    if (xmin < x) && (x < xmax)
                        px,py = findIntersection(line, x, 0)
                        if px && (xmin < px) && (xmax > px)
                            edgePoints.push("%.2f %.2f %.2f 0 0 1" % [px*unit, py*unit, zValue*unit])
                        end
                    end
                    x += dx
                end
                
            else
                ## edge is more vertical; intersect with y-grid
                x1 = gridBBox[0]
                x2 = gridBBox[2]
                y = gridBBox[1]
                while y <= gridBBox[3]
                    if (ymin < y) && (y < ymax)
                        px,py = findIntersection(line, 0, y)
                        if py && (ymin < py) && (ymax > py)
                            edgePoints.push("%.2f %.2f %.2f 0 0 1" % [px*unit, py*unit, zValue*unit])
                        end
                    end
                    y += dy
                end
            end 
        }
        edgePoints.uniq!
        uimessage("number of edge points: #{edgePoints.length}\n", 2)
        return edgePoints
    end
    
    def getNumericMeshes(e,trans=nil)
        ## return polymesh for each numeric face in <e>
        if not trans
            trans = getGlobalTransformation(e)
        end
        meshes = []
        if e.class == Sketchup::Face
            if isNumeric?(e)
                meshes.push(getPolyMesh(e,trans))
            end
        elsif e.class == Sketchup::Group
            e.entities.each { |ee|
                meshes += getNumericMeshes(ee, trans*e.transformation)
            }
        elsif e.class == Sketchup::ComponentInstance
            e.definition.entities.each { |ee|
                meshes += getNumericMeshes(ee, trans*e.transformation)
            }
        end
        meshes.compact!
        return meshes
    end
    
    def getNumericPoints(face)
        ## return array of points on grid lines within face    
        unit = getConfig('UNIT')
        gsX = getConfig('GRIDSPACINGX')
        gsY = getConfig('GRIDSPACINGY')
        dx = gsX/unit
        dy = gsY/unit
        
        points = getNumericEdgePoints(face)
        polymeshes = getNumericMeshes(face, $globaltrans)
        polymeshes.each { |pm|
            pm.polygons.each { |p|
                verts = []
                [0,1,2].each { |i|
                    idx = p[i]
                    verts.push(pm.point_at(idx.abs()))
                }
                bbox = getBBoxOnGrid(*verts)
                z = (verts[0].z + verts[1].z + verts[2].z) / 3.0
                x = bbox[0]
                while x <= bbox[2]
                    y = bbox[1] 
                    while y <= bbox[3]
                        pt = Geom::Point3d.new(x,y,z)
                        if Geom::point_in_polygon_2D pt, verts, true
                            points.push("%.2f %.2f %.2f 0 0 1" % [pt.x*unit, pt.y*unit, pt.z*unit])
                        end
                        y += dy
                    end
                    x += dx
                end
            }
        }
        return points
    end
    
    def isNumeric?(entity)
        ## return true for entities with numeric attributes
        if entity.layer.name.downcase == 'numeric'
            return true
        elsif entity.attribute_dictionary('SU2RAD_NUMERIC')
            return true
        end
        return false
    end
    
end



module InterfaceBase

    def initLog(lines=[])
        $SU2RAD_LOG = lines
    end
   
    def getConfig(key)
        return $SU2RAD_CONFIG.get(key)
    end
    
    def getNestingLevel
        return 0
    end
    
    def setConfig(key,value)
        $SU2RAD_CONFIG.set(key, value)
    end
    
    def uimessage(msg, loglevel=0)
        begin
            msg.gsub!("%", "%%")
            prefix = "  " * getNestingLevel()
            levels = ["I", "V", "D", "3", "4", "5", "E", "W"]  ## [0,1,2,-2,-1]
            line = "%s[%s] %s" % [prefix, levels[loglevel], msg]
            if loglevel <= $SU2RAD_LOGLEVEL
                Sketchup.set_status_text(line.strip())
                msg.split("\n").each { |l|  printf "%s[%s] %s\n" % [prefix,levels[loglevel],l] }
                $SU2RAD_LOG.push(line)
            end
            if loglevel == -2
                $SU2RAD_COUNTER.add('errors')
            elsif loglevel == -1
                $SU2RAD_COUNTER.add('warnings')
            end
        rescue => e
            printf "## %s" % $!.message
            printf "## %s" % e.backtrace.join("\n## ")
            printf "\n[uimessage rescue] #{msg}\n"
        end
    end
    
    def writeLogFile
        line  = "###  finished: %s  ###" % Time.new()
        line2 = "###  %s  ###" % $SU2RAD_COUNTER.getStatusLine()
        $SU2RAD_LOG.push(line)
        $SU2RAD_LOG.push(line2)
        logname = File.join('logfiles', "%s_export.log" % getConfig('SCENENAME'))
        logname = getFilename(logname)
        if not createFile(logname, $SU2RAD_LOG.join("\n"))
            uimessage("Error: Could not create log file '#{logname}'")
            line = "### creating log file failed: %s  ###" % Time.new()
            printf "%s\n" % line
            Sketchup.set_status_text(line)
        else
            printf "%s\n" % line
            printf "%s\n" % line2
        end
    end
end



module JSONUtils
    
    def escapeCharsJSON(s)
        s.gsub('"','\\\\\\"').gsub("'","\\\\'")
        return s
    end

    def replaceChars(name)
        ## TODO: replace characters in name for save html display
        return name
    end

    def decodeJSON(string)
        string.gsub(/((?:%[0-9a-fA-F]{2})+)/n) do
            [$1.delete('%')].pack('H*')
        end
        return string
    end
    
    def encodeJSON(string)
        string.gsub(/([^ a-zA-Z0-9_.-]+)/n) do
            '%' + $1.unpack('H2' * $1.size).join('%').upcase
        end
        string.gsub!(/'/,"\\\\'") 
        return string
    end
    
    def escape_javascript(javascript)
        if javascript
            js_escape_map = {'\\' => '\\\\', '</' => '<\/', "\r\n" => '\n',
                             "\n" => '\n',   "\r" => '\n',     '"' => '\\"',
                             "'"  => "\\'"}
            javascript.gsub(/(\\|<\/|\r\n|[\n\r"'])/) { js_escape_map[$1] }
            #enc = encodeJSON(javascript)
            #puts enc
            #return enc
        else
            ''
        end
    end

    def urlEncode(string)
        ## URL-encode from Ruby::CGI
        string.gsub(/([^ a-zA-Z0-9_.-]+)/n) do
            '%' + $1.unpack('H2' * $1.size).join('%').upcase
        end.tr(' ', '+')
        return string
    end
    
    # ecapeHTML from Ruby::CGI
    #
    # Escape special characters in HTML, namely &\"<>
    #   CGI::escapeHTML('Usage: foo "bar" <baz>')
    #      # => "Usage: foo &quot;bar&quot; &lt;baz&gt;"
    def JSONUtils::escapeHTML(string)
        string.gsub(/&/n, '&amp;').gsub(/\"/n, '&quot;').gsub(/>/n, '&gt;').gsub(/</n, '&lt;')
    end
    
    def urlDecode(string)
        ## URL-decode from Ruby::CGI
        string.tr('+', ' ').gsub(/((?:%[0-9a-fA-F]{2})+)/n) do
            [$1.delete('%')].pack('H*')
        end
    end
    
    def getJSONDictionary(dict)
        if(dict == nil)
            return "{}"
        else
            pairs = []
            dict.each_pair { |k,v|
                pairs.push("%s:%s" % [toStringJSON(k),toStringJSON(v)])
            }
        end
        return "{%s}" % pairs.join(',')
    end

    def getJSONDictionary2(dict)
        if(dict == nil)
            return "[]"
        else
            json = "["
            dict.each_pair { |k,v|
                json += "{\"name\":%s,\"value\":%s}," % [toStringJSON(k),toStringJSON(v)]
            }
            json += ']'
        end
        return json
    end

    def toStringJSON(obj)
        if obj.class == Array
            str = "[%s]" % obj.collect{ |e| "%s" % toStringJSON(e) }.join(",")
        elsif obj.class == FalseClass
            str = 'false'
        elsif obj.class == Fixnum or obj.class == Bignum
            str = "%s" % obj
        elsif obj.class == Float
            str = "%f" % obj
        elsif obj.class == Hash
            str = "{%s}" % obj.collect{ |k,v| "%s:%s" % [toStringJSON(k),toStringJSON(v)] }.join(",")
        elsif obj.class == String
            str = "\"%s\"" % obj.to_s
        elsif obj.class == TrueClass
            str = 'true'
        elsif obj.class == Geom::Transformation
            str = obj.to_a.to_s
        else
            str = "\"%s\"" % obj
        end
        return str
    end

    def pprintJSON(json, text="\njson string:")
        ## prettyprint JSON string
        printf "#{text}\n"
        json = json.gsub(/#COMMA#\{/,",\{")
        json = json.gsub(/,/,"\n")
        lines = json.split("\n")
        indent = ""
        lines.each { |line|
            print "%s%s\n" % [indent,line]
            if line.index('{') != nil
                indent += "  "
            elsif line.index('}') != nil
                indent = indent.slice(0..-3)
            end
        }
        printf "\n"
    end
    
    def setOptionsFromString(dlg, params, verbose=false)
        ## set export options from string <p>
        pairs = params.split("&")
        pairs.each { |pair|
            k,v = pair.split("=")
            old = eval("@%s" % k)
            if verbose
                uimessage(" -  %s (old='%s')" % [pair, old], 2)
            end
            if (v == 'true' || v == 'false' || v =~ /\A[+-]?\d+\z/ || v =~ /\A[+-]?\d+\.\d+\z/)
                val = eval("%s" % v)
            else
                val = v
                v = "'%s'" % v
            end
            if val != old
                eval("@%s = %s" % [k,v])
                msg = "#{self.class} new value for @%s: %s" % [k,v]
                uimessage(msg)
            end
        }
    end

    def test_toStringJSON()
        i = 17
        f = 3.14
        s = "string"
        a = [1, 2.3, "four"]
        h = { "one" => 1, "two" => 2, "three" => [1,2,3], "nested" => { "n1" => 11, "n2" => 22 } }
        obj = { "int" => i, "float" => f, "string" => s, "array" => a, "hash" => h }
        printf toStringJSON(obj) + "\n"
    end 

    def vectorToJSON(v)
        return "[%.3f,%.3f,%.3f]" % v
    end
    
end



module RadiancePath
    
    def append_paths(p,f)
        if p[-1,1] == "\\" or p[-1,1] == "/"
            p+f
        else
            p+"\\"+f
        end
    end
    
    def clearDirectory(scene_dir)
        uimessage("clearing directory '#{scene_dir}'",1)
        if not File.exists?(scene_dir)
            return
        end
        Dir.foreach(scene_dir) { |f|
            fpath = File.join(scene_dir, f)
	    if f == '.' or f == '..'
		next
            elsif f[0,1] == '.'
                next
            elsif f == 'textures'
                uimessage("skipping directory 'textures'", 2)
                next
            elsif FileTest.directory?(fpath) == true
                clearDirectory(fpath)
                begin
                    Dir.delete(fpath)
                    uimessage("deleted directory '#{fpath}'", 2)
                rescue
                    uimessage("directory '#{fpath}' not empty")
                end
            elsif FileTest.file?(fpath) == true
		File.delete(fpath)
                uimessage("deleted file '#{fpath}'", 3)
            else
                uimessage("unexpected entry in file system: '#{fpath}'")
            end
        }
    end

    def createDirectory(path)
        if File.exists?(path) and FileTest.directory?(path)
            return true
        else
            uimessage("Creating directory '%s'" % path)
        end
        dirs = []
        while not File.exists?(path)
            dirs.push(path)
            path = File.dirname(path)
        end
        dirs.reverse!
        dirs.each { |p|
            begin 
                Dir.mkdir(p)
            rescue
                uimessage("ERROR creating directory '%s'" %  p, -2)
                return false
            end
        }
        return true
    end
   
    def createFile(filename, text)
        ## write 'text' to 'filename' in a save way
        path = File.dirname(filename)
        createDirectory(path)
        if not FileTest.directory?(path)
            return false
        end
        begin
            f = File.new(filename, 'w')
            f.write(text)
            f.close()
            uimessage("created file '%s'" % filename, 1)
        rescue => e
            uimessage("could not create file '%s': %s" % [filename, $!.message], -2)
            return false
        end
        $createdFiles[filename] = 1
        $SU2RAD_COUNTER.add('files')
        return true
    end 
    
    def getFilename(name)
        return File.join(getConfig('SCENEPATH'), name)
    end
    
    def obj2mesh(name, lines)
        objfile = getFilename("objects/#{name}.obj")
        uimessage("creating obj file '#{objfile}'")
        if not createFile(objfile, lines.join("\n"))
            msg = "Error: could not create file '#{objfile}'"
            uimessage(msg)
            return "## #{msg}"
        else
            begin
                rtmfile = getFilename("objects/#{name}.rtm")
                cmd = "\"%s\" \"#{objfile}\" \"#{rtmfile}\"" % getConfig('OBJ2MESH')
                uimessage("cmd=" + cmd, 4)
                result = runSystemCmd(cmd)
                if result == true and File.exists?(rtmfile)
                    return "\n#{name} mesh #{name}_obj\n1 objects/#{name}.rtm\n0\n0"
                else
                    msg = "Error: could not convert obj file '#{objfile}'"
                    return "## #{msg}"
                end
            rescue => e
                msg = "Error converting obj file '#{name}.obj'\n%s\n%s" % [$!.message,e.backtrace.join("\n")]
                uimessage(msg, -2)
                return "## #{msg}"
            end
        end
    end
    
    def remove_spaces(s)
        ## remove spaces and other funny chars from names
        for i in (0..s.length)
            if s[i,1] == " " 
                s[i] = "_" 
            end 
        end
        return s.gsub(/\W/, '')
    end
    
    def renameExisting(sceneDir)
        if File.exists?(sceneDir)
            t = Time.new()
            newname = sceneDir + t.strftime("_%y%m%d_%H%M%S")
            begin
                File.rename(sceneDir, newname)
                uimessage("renamed scene directory to '%s'" % newname)
            rescue => e
                uimessage("could not rename directory '%s':\n%s" % [sceneDir, $!.message])
                return false
            end
        end
    end
    
    def runSystemCmd(cmd)
        if $SU2RAD_PLATFORM == 'WIN'
           cmd.gsub!(/\//, '\\')
        end
        uimessage("system cmd= %s" % cmd, 3)
        printf("system cmd= %s\n" % cmd)
        result = system(cmd)
        uimessage("    result= %s" % result, 3)
        printf("    result= %s\n" % result)
        return result
    end

    def setExportDirectory
        ## get name of subdir for Radiance file structure
        page = Sketchup.active_model.pages.selected_page
        if page != nil
            name = remove_spaces(page.name)
        else
            name = "unnamed_scene"
        end
        path = Sketchup.active_model.path
        if path == '':
            ## use user home directory or temp
            if ENV.has_key?('HOME')
                path = ENV['HOME']
            elsif ENV.has_key?('USERPROFILE')
                path = ENV['USERPROFILE']
            elsif ENV.has_key?('HOMEPATH')
                ## HOMEPATH missing drive letter!?
                path = ENV['HOMEPATH']
            elsif ENV.has_key?('TEMP')
                path = ENV['TEMP']
            end
            path = File.join(path, 'unnamed_project')
        else
            ## remove '.skp' and use as directory
            fname = File.basename(path)
            if fname =~ /\.skp\z/i
                fname = fname.slice(0..-5)
            end
            path = File.join(File.dirname(path), fname)
            setConfig('PROJECT', remove_spaces(fname))
        end
        ## apply to PATHTMPL
        tmpl = getConfig('PATHTMPL')
        tmpl = tmpl.gsub(/\$FILE/, path)
        tmpl = tmpl.gsub(/\$PAGE/, name)
	tmpl = cleanPath(tmpl)
        setConfig('SCENEPATH', File.dirname(tmpl))
        setConfig('SCENENAME', File.basename(tmpl,'.rif'))
    end

    def cleanPath(path)
        if path.slice(-1,1) == File::SEPARATOR
            path = path.slice(0,path.length-1)
        end
	path = path.gsub(/\\/, File::SEPARATOR)
        return path
    end
    
end




