require 'export_modules.rb'
require 'radiance_entities.rb'
require 'exportbase.rb'
require 'delauney_mod.rb'
require 'filesystemproxy.rb'


class NumericImportDialog < ExportBase

    include JSONUtils
    include InterfaceBase

    def initialize

    end

    def show 
        if $SU2RAD_DIALOG_WINDOW
            $SU2RAD_DIALOG_WINDOW.bring_to_front()
            return
        end
        dlg = UI::WebDialog.new("su2rad - acknowledgement", true, nil, 900, 700, 50, 50, true);
        
        dlg.add_action_callback("onCancel") { |d,p|
            uimessage("closing dialog ...")
            d.close();
            $SU2RAD_DIALOG_WINDOW = nil
        }
        dlg.add_action_callback("getDirectoryListing") {|d,p|
            getDirectoryListing(d,p);
        }
        dlg.add_action_callback("importFromWebDialog") {|d,p|
            importFromWebDialog(d,p);
        }
        dlg.add_action_callback("loadTextFile") {|d,p|
            loadTextFile(d,p);
        }
        
        ## clean up actions
        dlg.set_on_close {
            uimessage("TODO: webdialog closed", 1)
            $SU2RAD_DIALOG_WINDOW = nil
        }
        
        exportdir = "."
        latest = Su2Rad.getLatestExportPath()
        latest = Sketchup.active_model.get_attribute('SU2RAD_EXPORTOPTIONS', 'latestExportPath')
        if latest != nil
            exportdir = File.join(File.dirname(latest), "numeric")
            uimessage("exportdir='#{exportdir}'\n")
            while not File.directory?(exportdir)
                exportdir = File.dirname(exportdir)
                uimessage("exportdir='#{exportdir}'\n")
            end
        end
        ## load html file and show dialog
        html = File.join(File.dirname(__FILE__), "html","importGrid.html")
        dlg.set_file(html, nil)
        $SU2RAD_DIALOG_WINDOW = dlg
        dlg.show {
            dlg.execute_script("su2rad.dialog.setSketchup()")
            dlg.execute_script("su2rad.dialog.gridImport.directory='#{exportdir}'")
        }
    end

    def getDirectoryListing(dlg, dirpath)
        ## send directory listing to dialog
        dirpath,root = dirpath.split('&')
        if root == 'true'
            dirs = FileSystemProxy.listFileSystemTree(dirpath)
        else
            dirs = FileSystemProxy.listDirectory(dirpath)
        end
        json = toStringJSON(dirs)
        dlg.execute_script("su2rad.dialog.fileSelector.setFileTreeJSON('%s', '%s')" % [escape_javascript(json),root])
    end
    
    def importFromWebDialog(dlg, opts)
        ## get options from URL string
        optsDict = {'filename' => 'unknown'}
        items = opts.split('&')
        items.each { |txt|
            k,v = txt.split('=')
            optsDict[k] = v
            uimessage("TEST option '#{k}' = '#{v}'", 2)
        }
        begin
            ## TODO: find proplems with this method
            #if optsDict['allfiles'] == 'true'
            #    dlg.close()
            #    importDirectory(optsDict)
            if optsDict['triangles'] != nil
                uimessage("TEST: 'triangles' option = '%s'" % optsDict['triangles'], 2)
                text = dlg.get_element_value(optsDict['triangles'])
                uimessage("TEST: triangles text found (%d bytes)" % text.length, 2)
                triangles = eval(text)
                uimessage("TEST: triangles text evaluated: found %d triangles" % triangles.length, 2)
                ni = NumericImport.new()
                ni.setTriangles(triangles)
                ni.applyOptions(optsDict)
                ni.createGraph()
                dlg.close()
            else
                ## try to get values, set options and create graph
                values = dlg.get_element_value(optsDict['elementId'])
                lines = values.split("\n")
                ni = NumericImport.new()
                if ni.setLines(lines) == true
                    ni.applyOptions(optsDict)
                    ni.createGraph()
                    ## if successfull close the web dialog
                    dlg.close()
                else
                    ## TODO: set error message in dialog
                    dlg.close()
                end
            end
        rescue => e
            msg = "Error importing graph:\n%s\n\n%s\n" % [$!.message,e.backtrace.join("\n")]
            uimessage(msg, -2)
            ## set error message in dialog
            dlg.close()  #XXX dlg.setErrorMessage(msg)
        end
    end
    
    def importDirectory(optsDict)
        ## loop over files in directory (XXX doesn't work)
        fields = []
        dirpath,filename = File.split(optsDict['filename'])
        if filename.rindex('.') != nil
            ext = filename.slice(filename.rindex('.'), 10)
            pattern = "#{dirpath}/*#{ext}"
            uimessage("TEST glob='#{pattern}'", 2)
            fields = Dir.glob(pattern)
        end
        fields = fields.slice(0,3)
        fields.each { |f|
            uimessage(" test1 f='#{f}'", 2)
        }
        fields.each_index { |idx|
            f = fields[idx]
            uimessage(" test2 f='#{f}'", 2)
            ni = NumericImport.new(f)
            ni.applyOptions(optsDict)
            if idx != 0
                ni.setLegendPosition('none')
            end
            ni.createGraph()
            sleep 3
        }
    end
    
    def loadTextFile(dlg, filepath)
        ## send encoded file content to dialog
        uimessage("NumericImportdialog.loadTextFile(filepath='#{filepath}')", 2)
        text = ''
        if File.exists?(filepath)
            f = File.open(filepath, 'r')
            text = f.read()
            text = escape_javascript(text)
        end
        dlg.execute_script("su2rad.dialog.gridImport._loadFileSU('%s')" % text)
    end

end 



class NumericImport < ExportBase
    
    include Delauney
    include NumericEntity
    include Geometry
    
    if not $SU2RAD_LOG
        $SU2RAD_LOG = [] #XXX make singleton class instance
    end

    def initialize(filename='')
        @bbox = [0,0,1,1]   ## [xmin,ymin,xmax,ymax]
        @clevels = []       ## list of contour level heights
        @filename = ''      ## values file to be read
        @index_value = 6    ## index of column of df/lux values
        @_labelSide = '+x'  ## display labels to the left (-x) or right (+x)
        @labelLeaderLength = 4
        @colorStyle = 'roygbivXXX'
        @scalevalue = 1     ## scale of surface 'height' (e.g. 500lx/m)
        @zOffset = 0.0      ## config for offset of value scale
        @_clstep = 100.0
        
        @doFalsecolor = 'yes'
        @doLabels = 'no'
        @labelText = ''
        @legendPos = 'right'
        @lightness = 0.0    ## intensity of contour colors
        
        @lines = []         ## raw lines in values file
        @maxvalue = 0.0     ## max in values
        @minvalue = 0.0     ## min in values
        @triangles = []

        @surface = nil      ## SU group for graph entities
        @legend = nil       ## SU group for legend entities
        @materials = []
        if filename != ''
            loadFile(filename)
        end
    end
 
    def setCLStep
        steps = [0.1,0.2,0.5,1.0,2.0,5.0,10,20,50,100,200,500,1000,2000,5000,10000]
        step = 100.0
        steps.each { |step|
            if @maxvalue / step < 10
                uimessage("step value: '%.2f'" % step, 1)
                break
            end
        }
        @_clstep = step
    end
    
    def applyOptions(opts)
        uimessage("min=#{@minvalue} max=#{@maxvalue} @_clstep=#{@_clstep}")
        @minvalue = Float(opts['minValue'])
        @maxvalue = Float(opts['maxValue'])
        @_clstep  = (@maxvalue-@minvalue) / Integer(opts['steps'])
        uimessage("min=#{@minvalue} max=#{@maxvalue} @_clstep=#{@_clstep}")
        if opts['filename']
            setFilename(opts['filename'])
        end

        #XXX @doFalsecolor = dlg[1]
        #XXX @lightness = dlg[2].to_f
        #XXX @legendPos = dlg[3]
        #XXX @doLables = dlg[4]
        #XXX @labelText = dlg[5]
    end
    
    def getContourLevels
        clevels = []
        v = @minvalue
        while v < @maxvalue
            v += @_clstep
            z = v/@scalevalue + @zOffset
            clevels.push([z,v])
            printf("TEST: getContourLevels: z=%.2f  v=%.2f\n" % [z,v])
        end
        return clevels
    end

    # add contour lines via intersection with polygon mesh
    def addContourLines
        if @surface == nil
            return
        end
        @clevels = getContourLevels()
        s_ents = @surface.entities
        ents = Sketchup.active_model.entities
        cl = ents.add_group
        unit = getConfig('UNIT')
        @clevels.each { |z,v|
            p1 = [@bbox[0], @bbox[1], z/unit]
            p2 = [@bbox[2], @bbox[1], z/unit]
            p3 = [@bbox[2], @bbox[3], z/unit]
            p4 = [@bbox[0], @bbox[3], z/unit]
            face = cl.entities.add_face [p1,p2,p3,p4]
        }
        polys = []
        @surface.entities.each { |e|
            if e.class == Sketchup::Face
                polys.push(e)
            end
        }
        cl.entities.intersect_with(true, cl.transformation, @surface, @surface.transformation, true, polys)
        ents.erase_entities(cl)
        
        ## finally sort faces into groups    
        _addContourGroups
    end
    
    def _addContourGroups
        ## create groups for contour bands and 'sort' faces into groups
        unit = getConfig('UNIT')
        levels = @clevels.collect { |z,v| z/unit } 
        step = levels[0]                ## XXX find better way to identify step
        
        ## add groups and store in hash indexed by height
        g_dflt = @surface.entities.add_group()
        g_dflt.name = "numeric_dflt"
        groupsHash = Hash.new(g_dflt)
        @clevels.each { |z,v|
            z -= 0.01                   ## reduce z for idx rounding
            idx = Integer( (z/unit)/step )
            g = @surface.entities.add_group()
            if step.to_i == step
                g.name = "%s_faces_%05d" % [@labelText, v] ## format with leading '0's for sorting
            else
                g.name = "%s_faces_%09.3f" % [@labelText, v] ## format with leading '0's for sorting
            end
            groupsHash["%02d" % idx] = g
        }
        
        ## faces can't be moved; so we recreate the face inside the
        ## new group and delete the old faces from the parent group
        faces_to_erase = []
        @surface.entities.each { |e|
            if e.class == Sketchup::Face
                z = e.bounds.center.to_a[2]
                idx = Integer(z/step)
                grp = groupsHash["%02d" % idx]
                f = grp.entities.add_face e.vertices
                f.edges.each { |edge| edge.soft=true }
                faces_to_erase.push(e)
            end
        }
        @surface.entities.erase_entities(faces_to_erase)
        if g_dflt.entities.length == 0
            @surface.entities.erase_entities([g_dflt])
        end
        
        ## show some stats for debugging
        if $SU2RAD_DEBUG
            msg = "surface stats:\n"
            classes_in_surface = Hash.new(0)
            @surface.entities.each { |e|
                classes_in_surface["%s" % e.class] += 1
            }
            classes_in_surface.each { |k,v| msg += " > class '%s': %d\n" % [k,v] }
            uimessage(msg,2)
        end
    end

    def addFalsecolor
        ## assign colors based on color gradient to contour groups
        if @surface == nil
            return
        end
        bands = {}
        pattern = "%s_faces" % @labelText
        @surface.entities.each { |e|
            if e.class == Sketchup::Group
                if e.name and e.name.index(pattern) == 0
                    bands[e.name] = e
                end
            end
        }
        
        ## get r,g,b for n materials from color gradient
        @materials = []
        materials = Sketchup.active_model.materials
        names = bands.keys()
        names.sort!()
        names.each_index { |i|
            name = names[i]
            v = (i+0.5) / names.length
            r,g,b = _getColorByValue(v)
            m = materials[name] || materials.add(name)
            m.color = Sketchup::Color.new(r,g,b)
            bands[name].material = m
            @materials.push(m)
        }
    end

    def _colorBRY(v)
        r = Math.sin((v-0.4)*Math::PI     ) * 0.5 + 0.5
        g = Math.sin(  (v-1)*Math::PI*0.7 ) * 1.0 + 1.0
        b = Math.cos(      v*Math::PI     ) * 0.6
        r = (r > 1.0) ? 255 : r*255
        r = (r < 0.0) ?   0 : r
        g = (g > 1.0) ? 255 : g*255
        g = (g < 0.0) ?   0 : g
        b = (b > 1.0) ? 255 : b*255
        b = (b < 0.0) ?   0 : b
        r = _lightenColor(r)
        g = _lightenColor(g)
        b = _lightenColor(b)
        return [r,g,b]
    end
    
    def _colorROYGBIV(value)
        ## add 0.5 at the top to get red, and limit bottom at x=1.7 to get purple
        if @colorStyle == 'roygbiv'
            shft = 0.5*value + 1.7*(1-value)
        else
            shft = value + 0.2 + 5.5*(1-value)
        end
        ## scale will be multiplied by the cos(x) + 1 
        ## (value from 0 to 2) so it comes up to a max of 255
        scale = 128;
        ## period is 2Pi
        period = 2*Math::PI
        ## x is place along x axis of cosine wave
        x = shft + value * period
        r = _lightenColor( ((Math.cos(x)            + 1) * scale).floor )
        g = _lightenColor( ((Math.cos(x+Math::PI/2) + 1) * scale).floor )
        b = _lightenColor( ((Math.cos(x+Math::PI)   + 1) * scale).floor )
        return [r,g,b]
    end
    
    def _getColorByValue(value)
        if value == 0.0
            return [0,0,0]
        end
        ## add 0.5 at the top to get red, and limit bottom at x=1.7 to get purple
        if @colorStyle == 'roygbiv'
            return _colorROYGBIV(value)
        else
            return _colorBRY(value)
        end
    end
    
    def _lightenColor(num)
        ## adjust lightness of color component
        n = num + @lightness*(256-num)
        return n.floor
    end
    
    def addLabels
        if @surface == nil
            return
        end
        points = {}
        values = {}
        @clevels.each { |z,v|
            key = "%.2f" % z
            points[key] = []
            values[key] = v
        }
        @surface.entities.each { |e|
            if e.class == Sketchup::Edge
                [e.start.position, e.end.position].each { |p|
                    z = "%.2f" % (p.z*getConfig('UNIT'))
                    if points.has_key?(z)
                        points[z].push([p.x,p.y,p.z])
                    end
                }
            end
        }
        if @_labelSide == '+x'
            dy = @labelLeaderLength
        else
            dy = -1*@labelLeaderLength
        end
        vector = Geom::Vector3d.new(0,dy,@labelLeaderLength)
        points.each_pair { |z,verts|
            if verts.length != 0
                verts.sort!
                if @_labelSide == '+x'
                    p = verts[-1]
                else
                    p = verts[0]
                end
                begin
                    point = Geom::Point3d.new(p[0], p[1], p[2])
                    text = @surface.entities.add_text("%d %s" % [values[z], @labelText], point)
                    text.vector = vector
                    text.leader_type = 1
                    text.display_leader = true
                    text.arrow_type = 0
                rescue
                    uimessage("Error: could not create label for contour line at '#{z}'", -2)
                end
            end
        }
        return true
    end
    
    def loadFile(filename='')
        if filename == ''
            filename = UI.openpanel("import numeric results", '', '')
        end
        if not filename
            uimessage("import canceled", 0)
            return false
        end
        begin
            f = File.new(filename)
            text = f.read()
            lines = text.split("\n")
            f.close()
        rescue => e
            uimessage("Error loading file '%s':\n%s\n\n%s\n" % [filename,$!.message,e.backtrace.join("\n")])
            return false
        end
        setFilename(filename)
        return setLines(lines)
    end
    
    def setFilename(filename)
        @filename = filename
        uimessage("filename='#{filename}'")
        if @filename.rindex('.')
            @labelText = @filename.slice(@filename.rindex('.')+1,@filename.length)
            @labelText.upcase!()
        end
    end

    def setLines(lines)
        ## set file text as array of lines
        @lines = lines
        begin
            cleanLines()
            getMaxValue()
            setCLStep()
        rescue => e
            uimessage("Error loading file '%s':\n%s\n\n%s\n" % [@filename,$!.message,e.backtrace.join("\n")])
            return false
        end
        return true
    end
   
    def setTriangles(triangles)
        ## triangles as array of [v1,v2,v3] vertices
        uimessage("TEST: setTriangles() (%d triangles)" % triangles.length, 2)
        @triangles = triangles
        points_hash = {}
        triangles.each { |tri|
            tri.each { |vertex|
                x = vertex[0]
                y = vertex[1]
                v = vertex[2] 
                points_hash["%.4f_%.4f" % [x,y]] = [x,y,0.85,v] #XXX fixed value for vertex-z
            }
        }
        @lines = points_hash.values()
        @index_value = 3
        uimessage("TEST: setTriangles() @lines.length=%d" % @lines.length, 2)
        getMaxValue()
        setCLStep()
    end

    def confirmDialog
        ## show import options with simple UI.dialog
        if @lines.length == 0
            return
        end
        
        ## prepare options
        if ['DA', 'DF', 'ADF', 'UDI'].index(@labelText) != nil
            @labelText = "% " + @labelText
        end
        options = [['contour step', @_clstep,      ''],
                   ['add colour',   @doFalsecolor, 'yes|no'],
                   ['lightness',    @lightness,    '0.0|0.1|0.2|0.3|0.4|0.5|0.6|0.7|0.8'],
                   ['legend',       @legendPos,    'none|left|right|top|bottom'],
                   ['add lables',   @doLabels,     'yes|no'],
                   ['label text',   @labelText,    '']]
        prompts = options.collect { |o| o[0] }
        values  = options.collect { |o| o[1] }
        choices = options.collect { |o| o[2] }
        
        ## set status bar to provide basic information
        msg =  "%d values - " % @lines.length
        msg += "maximum: %.2f - " % @maxvalue 
        msg += "step: %.2f" % @_clstep
        Sketchup.set_status_text(msg)
        
        ## show and evaluate dialog
        dlg = UI.inputbox(prompts,values,choices, 'graph options')
        if not dlg
            uimessage("import canceled", 0)
            return
        end
        begin
            @_clstep = dlg[0].to_f
        rescue => e
            uimessage("Error evaluating option:\n%s\n\n%s\n" % [$!.message,e.backtrace.join("\n")])
        end
        @doFalsecolor = dlg[1]
        @lightness = dlg[2].to_f
        @legendPos = dlg[3]
        @doLables = dlg[4]
        @labelText = dlg[5]

        ## kick of import
        createGraph()
    end
    
    def createGraph
        ## create graph with new options
        
        if @lines.length == 0
            return
        end
        
        begin
            createSurface()
            if @surface == nil
                uimessage("error: no surface created", -2)
                return
            end
            if @doLables == 'yes'
                addLabels()
            end
            if @doFalsecolor == 'yes'
                addFalsecolor()
            end
            if @legendPos != 'none'
                createLegend()
            end
        rescue => e
            msg = "Error creating graph:\n%s\n\n%s\n" % [$!.message,e.backtrace.join("\n")]
            uimessage(msg, -2)
        end
    end
   
    def createGraphFromTriangles(tris, points, parentGroup=nil, name=nil)
        ## create individual faces from triangles
        uimessage("TEST: tris = %d" % tris.length, 2)
        uimessage("TEST: points = %d" % points.length, 2)
        if parentGroup != nil
            entities = parentGroup.entities
            name = "#{name}_graph"
            uimessage("applying transformation of '#{name}'", 2) 
            ptrans = getGlobalTransformation(parentGroup) * parentGroup.transformation
            ptrans = ptrans.invert!()
        else
            entities = Sketchup.active_model.entities
            name = "unknown_graph"
        end
        suPoints = points.collect { |p| Geom::Point3d.new(p[0], p[1], p[2]) }
        @surface = entities.add_group
        @surface.name = name
        @clevels = getContourLevels()
        
        tris[0...5].each { |tri|
            z = suPoints[tri[0]].z
            uimessage("TEST: vertex z = %.2f\n" % z, 2)
        }

        ## create group for each contour level
        old_clevel = 0
        @clevels.each { |cl|
            uimessage("creating faces for contour level %.2f" % cl[1], 2)
            cl_name = "%s_%.3f" % [name, cl[1]]
            max_clevel = cl[0] # / getConfig('UNIT')
            uimessage("TEST: max_clevel =  %.2f" % max_clevel, 2)
            tris.each { |tri|
                z = suPoints[tri[0]].z
                if old_clevel <= z and z < max_clevel
                    f = @surface.entities.add_face(suPoints[tri[0]], suPoints[tri[1]], suPoints[tri[2]])
                    f.edges.each { |edge| edge.soft=true }
                end
            }
            old_clevel = max_clevel
            uimessage("TODO: added surface group '#{cl_name}' to scene", 2) 
        }
        
        
        scaletrans = Geom::Transformation.new(1/getConfig('UNIT'))
        @surface.transform!(scaletrans)
        uimessage("created surface from triangles", 2) 
        uimessage("added surface group '#{name}' to scene", 2) 
    end

    def createSurface
        if @triangles != []
            ## convert triangles from javascript to indexed lists
            tris, points = getIndexedTris()
            uimessage("tris=%d, points=%d" % [tris.length, points.length], 2)
        else
            if @lines.length == 0
                return
            end
            uimessage("processing %d values" % @lines.length, 2) 
            points = []
            @lines.each { |l|
                x = l[0]
                y = l[1]
                z = @zOffset
                v = l[@index_value]
                dz = v / @scalevalue
                points.push([x,y,z+dz])
            }
            ## create triangles (as indices to array 'points')
            tris = triangulate(points)
        end

        ## find containing group 
        name = getGroupName()
        parentGroup = findGroupByName(name)
        if parentGroup != nil
            tris = eliminateFillTriangles(parentGroup,tris,points)
        end
        #if @triangles != []
        if false
            createGraphFromTriangles(tris, points, parentGroup, name)
        else
            createMesh(tris, points, parentGroup, name)
        end
    end

    def cleanLines
        newlines = []
        @lines.each { |l|
            if l.index('#') == 0
                next
            end
            parts = l.split()
            begin
                parts.collect! { |p| p.to_f }
                newlines.push(parts)
            rescue
                uimessage("line ignored: '#{l}'", 3)
            end
        }
        ## find index of column with illum values (4 or 7)
        h = Hash.new(0)
        newlines.each { |l|
            h[l.length] += 1
        }
        colindex = 0
        maxlines = 0
        h.each_pair { |i,ml|
            if ml >= maxlines
                colindex = i-1
                maxlines = ml
            end
        }

        if colindex == 3 || colindex == 6 
            @index_value = colindex
            uimessage("values found at column index %d" % @index_value, 1) 
            @lines = newlines
        else
            if UI
                msg = "ArgumentError:\n\nInput lines are in an unknown format!\n\n"
                msg += "Aborting import ...\n\n"
                msg += "Please check the import file\n'%s'\n\n" % @filename
                msg += "These are the first lines:\n\n"
                msg += @lines[0..4].join("\n")
                UI.messagebox(msg, MB_MULTILINE)
            end
            raise ArgumentError, "input lines in wrong format", caller
        end
    end
    
    def getMaxValue
        if @lines.length == 0
            return
        end
        unit = getConfig('UNIT')
        xs = @lines.collect { |l| l[0] }
        ys = @lines.collect { |l| l[1] }
        xs.sort!
        ys.sort!
        @bbox = [xs[0]/unit, ys[0]/unit, xs[-1]/unit, ys[-1]/unit]
        zs = @lines.collect { |l| l[2] }
        if @zOffset == nil
            n = 0
            zs.each { |z| n += z }
            @zOffset = n / zs.length.to_f
            uimessage("z offset set to '%.2f'" % @zOffset, 0) 
        else
            uimessage("z offset = '#{@zOffset}'", 0)
        end
        values = @lines.collect { |l| l[@index_value] }
        values.sort!
        @maxvalue = values[-1]
        uimessage("maximum value: %.2f" % @maxvalue, 2) 
        max = values[-1]
        divider = 1
        while max > 10:
            max = max / 10.0
            divider *= 10
        end
        if max > 5
            step = 0.2
        elsif max > 2
            step = 0.4
        elsif max > 1
            step = 1.0
        end
        @delta = step
        @scalevalue = divider.to_f / step
    end
    
    def getIndexedTris
        ## get array of points and triangles with indexes from @triangles
        printf("TEST: getIndexedTris()\n") 
        points_hash = {}
        @triangles.each { |tri|
            tri.each { |vertex|
                x = vertex[0]
                y = vertex[1]
                #v = vertex[2] 
                z = @zOffset + vertex[2] / @scalevalue
                points_hash["%.4f_%.4f" % [x,y]] = [x,y,z]
            }
        }
        points = points_hash.values()
        index_hash = {}
        index = 0
        points.each { |p|
            x = p[0]
            y = p[1]
            key = "%.4f_%.4f" % [x,y]
            index_hash[key] = index
            index += 1
        }
        triangles = []
        uimessage("@triangles.length=%d" % @triangles.length, 2)
        @triangles.each { |tri|
            newtri = []
            tri.each { |vertex|
                x = vertex[0]
                y = vertex[1]
                key = "%.4f_%.4f" % [x,y]
                index = index_hash[key]
                if index != nil
                    newtri.push(index)
                else
                    uimessage("could not get index of triangle point (x=%.4f y=%.4f)" % [x,y], -2) 
                end
            }
            if newtri.length == 3
                triangles.push(newtri)
            else
                printf("newtri.length = %d\n" % newtri.length)
            end
        }
        uimessage("triangles.length=%d" % triangles.length, 2)
        return triangles, points
    end

    def createMesh(tris, points, parentGroup=nil, name="")
        ## create 3D graph as polygon mesh 
        suPoints = points.collect { |p| Geom::Point3d.new(p[0], p[1], p[2]) }
        mesh = Geom::PolygonMesh.new(points.length, tris.length)
        tris.each { |v|
            mesh.add_polygon(suPoints[v[0]], suPoints[v[1]], suPoints[v[2]])
        }
        scaletrans = Geom::Transformation.new(1/getConfig('UNIT'))
        mesh.transform!(scaletrans)
        uimessage("created mesh", 2) 
        
        ## add to parent or create new group
        if parentGroup != nil
            entities = parentGroup.entities
            name = "#{name}_graph"
            uimessage("applying transformation of '#{name}'", 2) 
            ptrans = getGlobalTransformation(parentGroup) * parentGroup.transformation
            ptrans = ptrans.invert!()
            mesh = mesh.transform!(ptrans)
        else
            entities = Sketchup.active_model.entities
        end
        @surface = entities.add_group
        @surface.entities.add_faces_from_mesh(mesh)
        @surface.name = name
        uimessage("added surface group '#{name}' to scene", 2) 
        ## add contour lines via intersection with polygon mesh
        addContourLines()
    end

    def getGroupName
        fname = File.basename(@filename)
        if fname.rindex('.')
            fname = fname.slice(0,fname.rindex('.'))
        end
        return remove_spaces(fname)
    end 
    
    def findGroupByName(name)
        uimessage("searching for existing group '#{name}'", 2)
        Sketchup.active_model.definitions.each { |d|
            d.instances.each { |i|
                if i.name == name
                    uimessage(" => found group '#{name}'", 2)
                    return i
                end
            }
        }
        return nil
    end
    
    def eliminateFillTriangles(parent,triangles,points)
        ## convert meshes to arrays of polygon vertices
        meshes = getNumericMeshes(parent)
        polys = []
        meshes.each { |mesh|
            mesh.polygons.each { |p|
                vertices = [0,1,2].collect { |i| mesh.point_at( p[i].abs() ) }
                polys.push(vertices)
            }    
        }
        
        ## filter triangles (arrays of indices) by centre point
        unit = getConfig('UNIT')
        newTris = []
        triangles.each { |t|
            p1 = points[t[0]]
            p2 = points[t[1]]
            p3 = points[t[2]]
            x = (p1[0] + p2[0] + p3[0]) / (3.0*unit)
            y = (p1[1] + p2[1] + p3[1]) / (3.0*unit)
            z = (p1[2] + p2[2] + p3[2]) / (3.0*unit)
            polys.each { |verts|
                pt = Geom::Point3d.new(x,y,z)
                if Geom::point_in_polygon_2D(pt, verts, true)
                    newTris.push(t)
                    break
                end
            }
        }
        n = triangles.length - newTris.length
        uimessage("removed #{n} fill triangles", 2)
        return newTris
    end
    
    def createLegend
        if @surface == nil or @materials == []
            return
        end
        if @legendPos == 'none'
            return
        end
        @legend = Sketchup.active_model.entities.add_group()
        if @legend != nil
            @legend.name = "legend %s" % @labelText 
            x,y,w,h,dx,dy = getLegendExtents()
            _createLegendFaces(x,y,w,h,dx,dy)
            _createLegendText(x,y,w,h,dx,dy)
        end
    end
    
    def _createLegendFaces(x,y,w,h,dx,dy)
        ## create coloured squares 
        matnames = @materials.collect { |m| m.name }
        matnames.sort!()
        f_grp = @legend.entities.add_group()
        matnames.each { |mname|
            pt1 = [x,y,0]
            pt2 = [x+w,y,0]
            pt3 = [x+w,y+h,0]
            pt4 = [x,y+h,0]
            f = f_grp.entities.add_face([pt1,pt2,pt3,pt4])
            m = Sketchup.active_model.materials[mname]
            if f and m
                f.material = m
                f.back_material = m
            end
            x += dx
            y += dy
        }
    end 
    
    def _createLegendText(x,y,w,h,dx,dy)
        ## add text to legend 
        tt_grp = @legend.entities.add_group()
        m = Sketchup.active_model.materials['Black'] || Sketchup.active_model.materials.add('Black')
        m.color = Sketchup::Color.new('Black')
        tt_grp.material = m
        values = @clevels.collect { |z,v| v }
        if values.max < 100.0
            fmt = "%%.2f %s" % @labelText.gsub(/%/, '%%')
        else
            fmt = "%%d %s" % @labelText.gsub(/%/, '%%')
        end
        values.sort!()
        values.each { |v|
            t_grp = tt_grp.entities.add_group()
            ## 3d text options:  string, alignment (constant),    font, bold, italic, h,     tol, z, fill, extrusion
            t_grp.entities.add_3d_text(fmt % v, TextAlignLeft, "Arial", true, false,  h/3.0, 0.0, 1, true, 0.0)
            t_grp.transform!( Geom::Transformation.new([x+0.05*w, y+0.7*h, 0]) )
            x += dx
            y += dy
        }
    end
    
    def getLegendExtents
        bl = @surface.bounds.corner(0)
        tr = @surface.bounds.corner(3)
        if @legendPos == 'right'
            w = (tr.x-bl.x)/8.0
            h = (tr.y-bl.y)
            x = tr.x + 2.5*w
            y = bl.y
        elsif @legendPos == 'left'
            w = (tr.x-bl.x)/8.0
            h = (tr.y-bl.y)
            x = bl.x - 3.75*w
            y = bl.y
        elsif @legendPos == 'top'
            w = tr.x - bl.x
            h = (tr.y - bl.y)/8.0
            x = bl.x
            y = tr.y + 2.5*h
        elsif @legendPos == 'bottom'
            w = tr.x - bl.x
            h = (tr.y - bl.y)/8.0
            x = bl.x
            y = bl.y - 3.75*h
        else
            raise ValueError, "wrong value for @legendPos: '%s' (expected one of left,right,top,bottom)" % @legendPos
        end
        if w > h
            dx = w/@materials.length
            dy = 0
            w = dx
        else
            dx = 0
            dy = h/@materials.length
            h = dy
        end
        return x,y,w,h,dx,dy
    end
    
    def setLegendPosition(pos)
        @legendPos = pos
    end
    
    def showWebDialog()
        wDlg = NumericImportDialog.new()
        wDlg.show()
    end
    
end






