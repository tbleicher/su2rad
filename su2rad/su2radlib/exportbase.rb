
class ExportBase
    
    def remove_spaces(s)
        ## remove spaces and other funny chars from names
        for i in (0..s.length)
            if s[i,1] == " " 
                s[i] = "_" 
            end 
        end
        return s.gsub(/\W/, '')
    end

    def append_paths(p,f)
        if p[-1,1] == "\\" or p[-1,1] == "/"
            p+f
        else
            p+"\\"+f
        end
    end
   
    def isVisible(e)
        if $inComponent == true and e.layer.name == 'Layer0'
            return true
        elsif e.hidden?
            return false
        elsif not $visibleLayers.has_key?(e.layer)
            return false
        end
        return true
    end
    
    def exportByCL(entity_list, mat, globaltrans)
        $materialContext.push(mat)
        lines = []
        entity_list.each { |e|
            if e.class == Sketchup::Group
                if not isVisible(e)
                    next
                end
                gtrans = globaltrans * e.transformation
                lines += exportByCL(e.entities, e.material, gtrans)
            elsif e.class == Sketchup::ComponentInstance
                if not isVisible(e)
                    next
                end
                gtrans = globaltrans * e.transformation
                $inComponent = true
                lines += exportByCL(e.definition.entities, e.material, gtrans)
                $inComponent = false
            elsif e.class == Sketchup::Face
                if not isVisible(e)
                    next
                end
                $facecount += 1
                rp = RadiancePolygon.new(e, $facecount)
                if rp.material == nil or rp.material.texture == nil
                    face = rp.getText(globaltrans)
                else
                    face = rp.getPolyMesh(globaltrans)
                    #XXX$texturewriter.load(e,true)
                end
                lines.push([rp.material, rp.layer.name, face])
            end
        }
        $materialContext.pop()
        return lines
    end
        
    def exportByGroup(entity_list, parenttrans, instance=false)
        ## split scene in individual files
        references = []
        faces = []
        entity_list.each { |e|
            if e.class == Sketchup::Group
                if not isVisible(e)
                    next
                end
                rg = RadianceGroup.new(e)
                ref = rg.export(parenttrans)
                references.push(ref)
            elsif e.class == Sketchup::ComponentInstance
                if not isVisible(e)
                    next
                end
                rg = RadianceComponent.new(e)
                ref = rg.export(parenttrans)
                references.push(ref)
            elsif e.class == Sketchup::Face
                if instance == false
                    ## skip layer test if instance is exported
                    if not isVisible(e)
                        next
                    end
                end
                faces.push(e)
                #@texturewriter.load(e,true)
            end
        }
        faces_text = ''
        numpoints = []
        faces.each_index { |i|
            f = faces[i]
            rp = RadiancePolygon.new(f,i)
            if rp.isNumeric
                numpoints += rp.getNumericPoints()
            elsif $MAKEGLOBAL
                faces_text += rp.getText(parenttrans)
            else
                faces_text += rp.getText()
            end
        }
        
        ## if we have numeric points save to *.fld file
        if numpoints != []
            createNumericFile(numpoints)
        end
        
        if $verbose == true
            uimessage("exported entities [refs=%d, faces=%d]" % [references.length, faces.length])
        end

        ## create 'by group' files or stop here
        if $MODE == 'by layer' or $MODE == 'by color'
            return "## mode = '#{$MODE}' -> no export"
        elsif $nameContext.length <= 1
            return createMainScene(references, faces_text, parenttrans)
        else
            ref_text = references.join("\n")
            text = ref_text + "\n\n" + faces_text
            filename = getFilename()
            if not createFile(filename, text)
                msg = "\n## ERROR: error creating file '%s'\n" % filename
                uimessage(msg)
                return msg
            else
                xform = getXform(filename, parenttrans)
                return xform
            end
        end
    end
    
    def createMainScene(references, faces_text, parenttrans)
        ## only implemented by RadianceScene
        true
    end
    
    def clearDirectory(scene_dir)
        uimessage("clearing directory '#{scene_dir}'")
        Dir.foreach(scene_dir) { |f|
            fpath = File.join(scene_dir, f)
	    if f == '.' or f == '..'
		next
            elsif f[0,1] == '.'
                next
            elsif FileTest.directory?(fpath) == true
                clearDirectory(fpath)
                begin
                    Dir.delete(fpath)
                rescue
                    uimessage("directory '#{fpath}' not empty")
                end
            elsif FileTest.file?(fpath) == true
		File.delete(fpath)
            else
                uimessage("unexpected entry in fs: '#{fpath}'")
            end
        }
    end
    
    def removeExisting(scene_dir)
        if FileTest.exists?(scene_dir)
            scene_name = File.basename(scene_dir)
            ui_result = (UI.messagebox "Remove existing directory\n'#{scene_name}'?", MB_OKCANCEL, "Remove directory?")
            if ui_result == 1
                uimessage('removing directories')
                clearDirectory(scene_dir)
                ["octrees", "images", "logfiles", "ambfiles"].each { |subdir|
                    createDirectory("#{scene_dir}/#{subdir}")
                }
                return true
            else
                uimessage('export canceled')
                return false
            end
        end
        return true
    end

    def isMirror(trans)
        ##TODO: identify mirror axes
        xa = point_to_vector(trans.xaxis)
        ya = point_to_vector(trans.yaxis)
        za = point_to_vector(trans.zaxis)
        xy = xa.cross(ya)
        xz = xa.cross(za)
        yz = ya.cross(za)
        if xy.dot(za) < 0
            return true
        end
        if xz.dot(ya) > 0
            return true
        end
        if yz.dot(xa) < 0
            return true
        end
        return false
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
                uimessage("creating '%s'" % p)
                Dir.mkdir(p)
            rescue
                uimessage("ERROR creating directory '%s'" %  p)
                return false
            end
        }
    end
   
    def createFile(filename, text)
        path = File.dirname(filename)
        createDirectory(path)
        if not FileTest.directory?(path)
            return false
        end
        f = File.new(filename, 'w')
        f.write(text)
        f.close()
        $createdFiles[filename] = 1
        #$createdFiles.each_pair { |k,v| print "#{k} -> #{v}\n" }
        
        if $verbose == true
            uimessage("created file '%s'" % filename)
        end
        $filecount += 1
        Sketchup.set_status_text "files:", SB_VCB_LABEL
        Sketchup.set_status_text "%d" % $filecount, SB_VCB_VALUE
        return true
    end 
    
    def createNumericFile(points)
        ## save to file
        name = $nameContext[-1]
        filename = getFilename("numeric/#{name}.fld")
        if FileTest.exists?(filename)
            uimessage("updating field '%s'" % filename)
            f = File.new(filename)
            txt = f.read()
            f.close()
            oldpoints = txt.split("\n")
            points += oldpoints
        end
        points.uniq!
        points.sort!
        text = points.join("\n")
        if not createFile(filename, text)
            uimessage("Error: Could not create numeric file '#{filename}'")
        else
            uimessage("Created field '%s' (%d points)" % [filename, points.length])
        end
    end

    def getFilename(name=nil)
        if name == nil
            name = "objects/%s.rad" %  remove_spaces($nameContext[-1])
        end
        return "#{$export_dir}/#{$scene_name}/#{name}"
    end
    
    def getMaterial(entity)
        return $materialContext.getEntityMaterial(entity)
    end
    
    def getMaterialName(mat)
        return $materialContext.getMaterialName(mat)
    end
    
    def point_to_vector(p)
        Geom::Vector3d.new(p.x,p.y,p.z)
    end
        
    def getXform(filename, trans)
        if $nameContext.length <= 2
            ## for main scene file
            path = "%s/%s/" % [$export_dir, $scene_name]
        else
            path = "%s/%s/objects/" % [$export_dir, $scene_name]
        end 
        filename.sub!(path, '')
        objname = $nameContext[-1]
        if $MAKEGLOBAL
            xform = "!xform -n #{objname} #{filename}"
        else
            #TODO: mirror 
            mirror = ""
            
            ## scale is calculated by replmarks
            ## we just check for extrem values
            a = trans.to_a
            scale = Geom::Vector3d.new(a[0..2])
            if scale.length > 10000 or scale.length < 0.0001
                uimessage("Warning unusual scale (%.3f) for object '%s'" % [scale.length, objname]) 
            end
            #scale = "-s %.3f" % scale.length
            
            ## transformation
            trans = trans * $SCALETRANS
            a = trans.to_a
            o = a[12..14]
            vx = [o[0]+a[0], o[1]+a[1], o[2]+a[2]]
            vy = [o[0]+a[4]*0.5, o[1]+a[5]*0.5, o[2]+a[6]*0.5]
            marker = "replaceme polygon #{objname}\n0\n0\n9\n"
            marker += "%.6f %.6f %.6f\n" % o
            marker += "%.6f %.6f %.6f\n" % vx 
            marker += "%.6f %.6f %.6f\n" % vy
            
            cmd = "echo '#{marker}' | replmarks -s 1.0 -x #{filename} replaceme"
            f = IO.popen(cmd)
            lines = f.readlines
            f.close()
            begin
                xform = lines[2].strip()
                parts = xform.split()
                p1 = parts[0..2]
                p2 = parts[3..30]
                xform = p1.join(" ") + " #{mirror} " + p2.join(" ")
            rescue
                msg = "ERROR: could not generate '!xform' command for file '#{filename}'"
                uimessage("%s\n" % msg)
                xform = "## %s" % msg
            end
        end
        return xform
    end 
    
    def getUniqueName(pattern="")
        if pattern == "" or pattern == nil
            pattern = "group"
        end
        pattern = remove_spaces(pattern)
        if not $uniqueFileNames.has_key?(pattern)
            $uniqueFileNames[pattern] = nil
            return pattern
        else
            all = $uniqueFileNames.keys
            count = 0
            all.each { |name|
                if name.index(pattern) == 0
                    count += 1
                end
            }
            newname = "%s%02d" % [pattern, count]
            $uniqueFileNames[newname] = nil
            return newname
        end
    end
    
    def isRadianceTransform(trans)
        ## test if trans can be created with xform (uniform scale only)
        a = trans.to_a
        vx = Geom::Vector3d.new(a[0..2])
        vy = Geom::Vector3d.new(a[4..6])
        vz = Geom::Vector3d.new(a[8..10])
        lengths = [vx.length, vy.length, vz.length]
        sorted = lengths.sort
        diff = sorted[2] - sorted[0]
        if diff > 0.01
            uimessage("  scale not uniform: sx=%.2f sy=%.2f sz=%.2f\n" % lengths)
            return false
        end
        return true
    end
    
    def showTransformation(trans)
        a = trans.to_a
        printf "  %5.2f  %5.2f  %5.2f  %5.2f\n" % a[0..3]
        printf "  %5.2f  %5.2f  %5.2f  %5.2f\n" % a[4..7]
        printf "  %5.2f  %5.2f  %5.2f  %5.2f\n" % a[8..11]
        printf "  %5.2f  %5.2f  %5.2f  %5.2f\n" % a[12..15]
    end

    def uimessage(msg)
        n = $nameContext.length
        prefix = "    " * n
        line = "%s [%d] %s" % [prefix, n, msg]
        Sketchup.set_status_text(line)
        printf "%s\n" % line
        $log.push(line)
    end
end 
