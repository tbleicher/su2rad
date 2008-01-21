require "su2radlib/exportbase.rb"

class RadianceScene < ExportBase

    def initialize
        @model = Sketchup.active_model
        initGlobals() 
        initGlobalHashes()
        initLog()
        @radOpts = RadianceOptions.new()
        
        $scene_name = "unnamed_scene"
        $export_dir = Dir.pwd()
        setExportDirectory()
        
        #@copy_textures = true
        #@texturewriter = Sketchup.create_texture_writer
    end

    def initGlobals
        $materialNames = {}
        $materialDescriptions = {}
        $usedMaterials = {}
        $materialContext = MaterialContext.new()
        $nameContext = []
        $components = []
        $componentNames = {}
        $uniqueFileNames = {}
        $skyfile = ''
        $log = []
        $facecount = 0
        $filecount = 0
        $createdFiles = Hash.new()
        $inComponent = false
    end
    
    def initGlobalHashes
        $byColor = {}
        $byLayer = {}
        $visibleLayers = {}
        @model.layers.each { |l|
            $byLayer[remove_spaces(l.name)] = []
            if l.visible?
                $visibleLayers[l] = 1
            end
        }
    end
    
    def initLog
        super
        line1 = "###  RadianceScene (#{$scene_name})  ###" #XXX $scene_name undefined
        line2 = "###  %s  ###" % Time.now.asctime
        $log = [line1,line2]
        printf "%s\n" % line1
        Sketchup.set_status_text(line1)
    end
    
    def setExportDirectory
        ## get name of subdir for Radiance file structure
        page = @model.pages.selected_page
        if page != nil
            $scene_name = remove_spaces(page.name)
        end
        path = Sketchup.active_model.path
        if path != '' and path.length > 5:
            $export_dir = path[0..-5]
        end
    end
   
    def confirmExportDirectory
        ## show user dialog for export options
        ud = UserDialog.new()
        ud.addOption("export path", $export_dir)
        ud.addOption("scene name", $scene_name)
        ud.addOption("show options", $SHOWRADOPTS) 
        ud.addOption("all views", $EXPORTALLVIEWS) 
        ud.addOption("mode", $MODE, "by group|by layer|by color")
        ud.addOption("triangulate", $TRIANGULATE)
        if $REPLMARKS != '' and File.exists?($REPLMARKS)
            ud.addOption("global coords", $MAKEGLOBAL) 
        end
        #if $RAD != ''
        #    ud.addOption("run preview", $PREVIEW)
        #end
        if ud.show('export options') == true
            $export_dir = ud.results[0] 
            $scene_name = ud.results[1] 
            $SHOWRADOPTS = ud.results[2] 
            $EXPORTALLVIEWS = ud.results[3] 
            $MODE = ud.results[4]
            printf "$MODE= #{$MODE}\n"
            $TRIANGULATE = ud.results[5]
            if $REPLMARKS != '' and File.exists?($REPLMARKS)
                $MAKEGLOBAL = ud.results[6]
            end
            #if $RAD != ''
            #    $PREVIEW = ud.result[7]
            #end
        else
            uimessage('export canceled')
            return false
        end
        
        ## use test directory in debug mode
        if $debug != 0 and  $testdir != ''
            $export_dir = $testdir
            scene_dir = "#{$export_dir}/#{$scene_name}"
            if FileTest.exists?(scene_dir)
                system("rm -rf #{scene_dir}")
            end
        end
        if $export_dir[-1,1] == '/'
            $export_dir = $export_dir[0,$export_dir.length-1]
        end
        return true
    end
    
    def createMainScene(references, faces_text, parenttrans=nil)
        ## top level scene split in references (*.rad) and faces ('objects/*_faces.rad')
        if $MODE != 'by group'
            ## start with replacement files for components
            ref_text = $components.join("\n")
            ref_text += "\n"
        else
            ref_text = ""
        end
        ## create 'objects/*_faces.rad' file
        if faces_text != ''
            faces_filename = getFilename("objects/#{$scene_name}_faces.rad")
            if createFile(faces_filename, faces_text)
                xform = "!xform objects/#{$scene_name}_faces.rad"
            else
                msg = "ERROR creating file '#{faces_filename}'"
                uimessage(msg)
                xform = "## " + msg
            end
            references.push(xform)
        end
        ref_text += references.join("\n")
        ## add materials and sky at top of file
        ref_text = "!xform ./materials.rad\n" + ref_text
        if $skyfile != ''
            ref_text = "!xform #{$skyfile} \n" + ref_text
        end
        ref_filename = getFilename("#{$scene_name}.rad")
        if not createFile(ref_filename, ref_text)
            msg = "\n## ERROR: error creating file '%s'\n" % filename
            uimessage(msg)
            return msg
        end
    end
    
    def export(selected_only=0)
        scene_dir = "#{$export_dir}/#{$scene_name}"
        if not confirmExportDirectory or not removeExisting(scene_dir)
            return
        end
        if $SHOWRADOPTS == true
            @radOpts.showDialog
        end
        
        ## check if global coord system is required
        if $MODE != 'by group'
            uimessage("export mode '#{$MODE}' requires global coordinates")
            $MAKEGLOBAL = true
        elsif $REPLMARKS == '' or not File.exists?($REPLMARKS)
            if $MAKEGLOBAL == false
                uimessage("WARNING: 'replmarks' not found.")
                uimessage("=> global coordinates will be used in files")
                $MAKEGLOBAL = true
            end
        end
        
        ## write sky first for <scene>.rad file
        sky = RadianceSky.new()
        sky.skytype = @radOpts.skytype
        $skyfile = sky.export()
        
        ## export geometry
        if selected_only != 0
            entities = []
            Sketchup.active_model.selection.each{|e| entities = entities + [e]}
        else
            entities = Sketchup.active_model.entities
        end
        $globaltrans = Geom::Transformation.new
        $nameContext.push($scene_name) 
        sceneref = exportByGroup(entities, Geom::Transformation.new)
        saveFilesByCL()
        $nameContext.pop()
        $materialContext.export()
        createRifFile()
        runPreview()
        writeLogFile()
    end
    
    def saveFilesByCL
        if $MODE == 'by layer'
            hash = $byLayer
        elsif $MODE == 'by color'
            hash = $byColor
        else
            return
        end
        references = []
        hash.each_pair { |name,lines|
            if lines.length == 0
                next
            end
            name = remove_spaces(name)
            filename = getFilename("objects/#{name}.rad")
            if not createFile(filename, lines.join("\n"))
                uimessage("Error: could not create file '#{filename}'")
            else
                references.push("!xform objects/#{name}.rad")
            end
        }
        createMainScene(references, '')
    end
    
    def runPreview
        ##TODO: preview
        if $RAD == '' or $PREVIEW != true
            return
        end
        dir, riffile = File.split(getFilename("%s.rif" % $scene_name))
        #Dir.chdir("#{$export_dir}/#{$scene_name}")
        #cmd = "%s -o x11 %s" % [$RAD, riffile]
        #printf "cmd = %s\n" % cmd
    end
    
    def writeLogFile
        line = "###  finished: %s  ###" % Time.new()
        $log.push(line)
        line2 = "### success: #{$export_dir}/#{$scene_name})  ###"
        $log.push(line2)
        logname = getFilename("%s.log" % $scene_name)
        if not createFile(logname, $log.join("\n"))
            uimessage("Error: Could not create log file '#{logname}'")
            line = "### export failed: %s  ###" % Time.new()
            printf "%s\n" % line
            Sketchup.set_status_text(line)
        else
            printf "%s\n" % line
            Sketchup.set_status_text(line)
            printf "%s\n" % line2
            Sketchup.set_status_text(line2)
        end
    end
   
    def getRifObjects
        text = ''
        if $skyfile != ''
            text += "objects=\t#{$skyfile}\n"
        end
        i = 0
        j = 0
        line = ""
        Dir.foreach(getFilename("objects")) { |f|
            if f[0,1] == '.'
                next
            elsif f[-4,4] == '.rad'
                line += "\tobjects/#{f}"
                i += 1
                j += 1
                if i == 3
                    text += "objects=#{line}\n"
                    i = 0
                    line = ""
                end
                if j == 63
                    uimessage("too many objects for rif file")
                    break
                end
            end
        }
        if line != ""
            text += "objects=#{line}\n"
        end
        return text
    end
    
    def createRifFile
        text =  "# scene input file for rad\n"
        text += @radOpts.getRadOptions
        text += "\n"
        text += "PICTURE=      images/\n"
        text += "OCTREE=       octrees/#{$scene_name}.oct\n"
        text += "AMBFILE=      ambfiles/#{$scene_name}.amb\n"
        text += "REPORT=       3 logfiles/#{$scene_name}.log\n"
        text += "scene=        #{$scene_name}.rad\n"
        text += "materials=    materials.rad\n\n"
        text += "%s\n\n" % exportViews()
        text += getRifObjects
        text += "\n"
        
        filename = getFilename("%s.rif" % $scene_name)
        if not createFile(filename, text)
            uimessage("Error: Could not create rif file '#{filename}'")
        end
    end
        
    def exportViews
        views = []
        views.push(createViewFile(@model.active_view.camera, $scene_name))
        if $EXPORTALLVIEWS == true
            pages = @model.pages
            pages.each { |page|
                if page == @model.pages.selected_page
                    next
                elsif page.use_camera? == true
                    name = remove_spaces(page.name)
                    views.push(createViewFile(page.camera, name))
                end
            }
        end
        return views.join('\n')
    end

    def createViewFile(c, viewname)
        text =  "-vp %.3f %.3f %.3f  " % [c.eye.x*$UNIT,c.eye.y*$UNIT,c.eye.z*$UNIT]
        text += "-vd %.3f %.3f %.3f  " % [c.zaxis.x,c.zaxis.y,c.zaxis.z]
        text += "-vu %.3f %.3f %.3f  " % [c.up.x,c.up.y,c.up.z]
        imgW = @model.active_view.vpwidth.to_f
        imgH = @model.active_view.vpheight.to_f
        aspect = imgW/imgH
        if c.perspective?
            type = '-vtv'
            if aspect > 1.0
                vv = c.fov
                vh = getFoVAngle(vv, imgH, imgW)
            else
                vh = c.fov
                vv = getFoVAngle(vh, imgW, imgH)
            end
        else
            type = '-vtl'
            vv = c.height*$UNIT
            vh = vv*aspect
        end
        text += "-vv %.3f -vh %.3f" % [vv, vh]
        text = "rvu #{type} " + text
        
        filename = getFilename("views/%s.vf" % viewname)
        if not createFile(filename, text)
            msg = "## Error: Could not create view file '#{filename}'"
            uimessage(msg)
            return msg
        else
            return "view=   #{viewname} -vf views/#{viewname}.vf" 
        end
    end
    
    def getFoVAngle(ang1, side1, side2)
        ang1_rad = ang1*Math::PI/180
        dist = side1 / (2.0*Math::tan(ang1_rad/2.0))
        ang2_rad = 2 * Math::atan2(side2/(2*dist), 1)
        ang2 = (ang2_rad*180.0)/Math::PI
        return ang2
    end
end

