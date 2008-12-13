require "exportbase.rb"
require "context.rb"


class UserDialogOptions < ExportBase
    
    def initialize
        @ud = UserDialog.new()
        setDialogOptions()
    end
    
    def applyDialogResults
        setConfig('SCENEPATH', cleanPath(@ud.results[0]))
        setConfig('SCENENAME', remove_spaces(@ud.results[1]))
        $SHOWRADOPTS = @ud.results[2] 
        $EXPORTALLVIEWS = @ud.results[3] 
        setConfig('MODE',        @ud.results[4])
        setConfig('TEXTURES',    @ud.results[5])
        setConfig('TRIANGULATE', @ud.results[6])
        if getConfig('REPLMARKS') != '' and File.exists?(getConfig('REPLMARKS'))
            setConfig('MAKEGLOBAL', @ud.results[7])
        end
    end

    def setDialogOptions
        @ud.addOption("export path", getConfig('SCENEPATH'))
        @ud.addOption("scene name", getConfig('SCENENAME'))
        @ud.addOption("show options", $SHOWRADOPTS) 
        @ud.addOption("all views", $EXPORTALLVIEWS) 
        @ud.addOption("mode", getConfig('MODE'), "by group|by layer|by color")
        @ud.addOption("textures", getConfig('TEXTURES'))
        @ud.addOption("triangulate", getConfig('TRIANGULATE'))
        if getConfig('REPLMARKS') != '' and File.exists?(getConfig('REPLMARKS'))
            @ud.addOption("global coords", getConfig('MAKEGLOBAL')) 
        end
    end

    def show(title='export options')
        if @ud.show(title) == true
            applyDialogResults()
            return true
        else
            return false
        end
    end
    
end 


class RadianceScene < ExportBase
        
    attr_reader :exportLock, :pollCounter
    attr_writer :exportLock

    def initialize
        @model = Sketchup.active_model
        
        $inComponent = [false]
        @@materialContext = MaterialContext.new()
        
        resetState()
        initLog()
        
        @radOpts = RadianceOptions.new()
        
        @sky = RadianceSky.new()
        setExportDirectory()
        
        @viewsList = nil
        @renderOptions = nil
    end

    
    def initLog
        line1 = "###  su2rad.rb export  ###" 
        line2 = "###  %s  ###" % Time.now.asctime
        super([line1,line2])
        printf "\n\n%s\n" % line1
        Sketchup.set_status_text(line1)
    end
    

    def confirmExportDirectory
        ## show user dialog for export options
        ud = UserDialogOptions.new()    
        if ud.show('export options') == false
            uimessage('export canceled')
            return false
        end
        ## use test directory in debug mode
        if $DEBUG 
            setTestDirectory()
        end
        return true
    end
   

    
    def createMainScene(references, faces_text, parenttrans=nil)
        ## top level scene split in references (*.rad) and faces ('objects/*_faces.rad')
        if getConfig('MODE') != 'by group'
            ## start with replacement files for components
            ref_text = @@components.join("\n")
            ref_text += "\n"
        else
            ref_text = ""
        end
        ## create 'objects/*_faces.rad' file
        if faces_text != ''
            fpath = File.join('objects', getConfig('SCENENAME') + '_faces.rad')
            faces_filename = getFilename(fpath)
            if createFile(faces_filename, faces_text)
                xform = "!xform %s" % fpath
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
        if @sky.filename != ''
            ref_text = "!xform #{@sky.filename} \n" + ref_text
        end
        ref_filename = getFilename(getConfig('SCENENAME') + ".rad")
        if not createFile(ref_filename, ref_text)
            msg = "\n## ERROR: error creating file '%s'\n" % filename
            uimessage(msg)
            return msg
        end
    end
    

    def startExport(selected_only=0)
        if confirmExportDirectory() == false
            return
        end
        scene_dir = File.join(getConfig('SCENEPATH'),getConfig('SCENENAME'))
        if removeExisting(scene_dir) == false
            return
        end
        @radOpts.skytype = @sky.skytype
        if $SHOWRADOPTS == true
            @radOpts.showDialog
        end
        
        ## check if global coord system is required
        if getConfig('MODE') != 'by group'
            uimessage("export mode '%s' requires global coordinates" % getConfig('MODE'))
            setConfig('MAKEGLOBAL', true)
        elsif getConfig('REPLMARKS') == '' || File.exists?(getConfig('REPLMARKS')) == false
            if makeGlobal?() == false
                uimessage("WARNING: 'replmarks' not found.")
                uimessage("=> global coordinates will be used in files")
                setConfig('MAKEGLOBAL', true)
            end
        end
        export(selected_only)
    end

    def getExportStatus
        return {"groups"     => 345,
                "components" => 56,
                "faces"      => 45678,
                "files"      => 31,
                "status"     => 'success',
                "messages"   => [],
                "time"       => 17.3}
    end 
    
    def startExportWebTest(selected_only=0)
        puts "startExportWebTest\n"
        sleep(0.3)
        puts "export update 1\n"
        sleep(0.3)
        puts "export update 2\n"
        sleep(0.3)
        puts "export update 3\n"
        sleep(0.3)
        puts "export update 4\n" 
    end
    
    def startExportWeb(selected_only=0)
        #puts "\nTODO: start real export action\n"
        #startExportWebTest(selected_only)
        #return
        printf "\n\n"
        sceneDir = getConfig('SCENEPATH')
        if File.exists?(sceneDir)
            t = Time.new()
            newname = sceneDir + t.strftime("_%y%m%d_%H%M")
            begin
                File.rename(sceneDir, newname)
                uimessage("renamed scene directory to '%s'" % newname)
            rescue => e
                uimessage("could not rename directory '%s':\n%s" % [sceneDir, $!.message])
                return false
            end
        end
        prepareSceneDir(sceneDir)
        return export(selected_only)
    end 
    
    def export(selected_only=0)
       
        ## write sky first for <scene>.rad file
        @sky.skytype = @radOpts.skytype
        @sky.export()
        
        ## export geometry
        if selected_only != 0
            entities = []
            Sketchup.active_model.selection.each{|e| entities = entities + [e]}
        else
            entities = Sketchup.active_model.entities
        end
        $globaltrans = Geom::Transformation.new
        @@nameContext.push(getConfig('SCENENAME')) 
        sceneref = exportByGroup(entities, Geom::Transformation.new)
        saveFilesByColor()
        saveFilesByLayer()
        @@nameContext.pop()
        @@materialContext.export()
        createRifFile()
        writeLogFile()
        return true
    end
   
   
    def saveFilesByColor
        if getConfig('MODE') != 'by color'
            return
        end
        references = []
        @@byColor.each_pair { |name,lines|
            if lines.length == 0
                next
            end
            skm = @@materialContext.getByName(name)
            name = remove_spaces(name)
            if doTextures(skm)
                uimessage("material='#{skm}' texture='#{skm.texture}'", 2)
                references.push(obj2mesh(name, lines))
            else
                filename = getFilename("objects/#{name}.rad")
                if not createFile(filename, lines.join("\n"))
                    uimessage("Error: could not create file '#{filename}'")
                else
                    references.push("!xform objects/#{name}.rad")
                end
            end
        }
        createMainScene(references, '')
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
                cmd = "#{$OBJ2MESH} #{objfile} #{rtmfile}"
                uimessage("converting obj to rtm (cmd='#{cmd}')", 2)
                f = IO.popen(cmd)
                f.close()
                if File.exists?(rtmfile)
                    return "\n#{name} mesh #{name}_obj\n1 objects/#{name}.rtm\n0\n0"
                else
                    msg = "Error: could not convert obj file '#{objfile}'"
                    uimessage(msg, -2)
                    return "## #{msg}"
                end
            rescue
                msg = "Error converting obj file '#{name}.obj'"
                uimessage(msg, -2)
                return "## #{msg}"
            end
        end
    end
    
    def saveFilesByLayer
        if getConfig('MODE') != 'by layer'
            return
        end
        references = []
        @@byLayer.each_pair { |name,lines|
            if lines.length == 0
                next
            end
            name = remove_spaces(name)
            filename = getFilename("objects/#{name}.rad")
            if not createFile(filename, lines.join("\n"))
                uimessage("Error: could not create file '#{filename}'")
            else
                references.push("\n!xform objects/#{name}.rad")
            end
        }
        createMainScene(references, '')
    end

    def runPreview
        ##TODO: preview
        if $RAD == '' or $PREVIEW != true
            return
        end
    end
    
    def getRifObjects
        text = ''
        if @sky.filename != ''
            text += "objects=\t#{@sky.filename}\n"
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
        sceneName = getConfig('SCENENAME')
        text =  "# scene options file for rad\n"
        if @renderOptions != nil
            opts = @renderOptions.getRifOptionsText()
        else
            opts = @radOpts.getRadOptions
        end
        if $DEBUG
            newopts = ["# test settings for DEBUG option",
                       "QUALITY=     low",
                       "DETAIL=      low",
                       "VARIABILITY= medium",
                       "INDIRECT=    1",
                       "PENUMBRAS=   true"]
            lines = opts.split("\n")
            lines.each { |line|
                if (line.slice(0,1).upcase == 'R' || line.slice(0,1).upcase == 'Z')
                    newopts.push(line)
                else
                    newopts.push('#' + line)
                end
            }
            opts = newopts.join("\n")
        end
        text += opts
        text += "\n"
        text += "PICTURE=      images/%s\n" % getProjectName() 
        text += "OCTREE=       octrees/#{sceneName}.oct\n"
        text += "AMBFILE=      ambfiles/#{sceneName}.amb\n"
        #text += "REPORT=       3 logfiles/#{sceneName}.log\n"
        text += "scene=        #{sceneName}.rad\n"
        text += "materials=    materials.rad\n\n"
        text += "%s\n\n" % exportViews()
        text += getRifObjects
        text += "\n"
        
        filename = getFilename("%s.rif" % sceneName)
        if not createFile(filename, text)
            uimessage("Error: Could not create rif file '#{filename}'")
        end
    end
        
    def exportViews
        viewLines = []
        if @viewsList != nil
            return @viewsList.getViewLines()
        else
            viewLines.push( createViewFile(@model.active_view.camera, getConfig('SCENENAME')) )
            if $EXPORTALLVIEWS == true
                pages = @model.pages
                pages.each { |page|
                    if page == @model.pages.selected_page
                        next
                    elsif page.use_camera? == true
                        name = remove_spaces(page.name)
                        viewLines.push(createViewFile(page.camera, name))
                    end
                }
            end
        end
        return viewLines.join("\n")
    end
    
    def setExportOptions(exOpts)
        @exportOptions = exOpts
        exOpts.writeOptionsToConfig()
    end
    
    def setRenderOptions(optsObject)
        @renderOptions = optsObject
    end
    
    def setViewsList(viewsList)
        @viewsList = viewsList
    end
    

    def _getViewLine(c)
        unit = getConfig('UNIT')
        text =  "-vp %.3f %.3f %.3f  " % [c.eye.x*unit,c.eye.y*unit,c.eye.z*unit]
        text += "-vd %.3f %.3f %.3f  " % [c.zaxis.x,c.zaxis.y,c.zaxis.z]
        text += "-vu %.3f %.3f %.3f  " % [c.up.x,c.up.y,c.up.z]
        imgW = Sketchup.active_model.active_view.vpwidth.to_f
        imgH = Sketchup.active_model.active_view.vpheight.to_f
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
            vv = c.height*unit
            vh = vv*aspect
        end
        text += "-vv %.3f -vh %.3f" % [vv, vh]
        text = "rvu #{type} " + text
        return text
    end
    
    def createViewFile(c, viewname)
        filename = getFilename("views/%s.vf" % viewname)
        if not createFile(filename, getViewLine(c))
            msg = "## Error: Could not create view file '#{filename}'"
            uimessage(msg)
            return msg
        else
            return "view=   #{viewname} -vf views/#{viewname}.vf" 
        end
    end
    
    def getFoVAngle(ang1, side1, side2)
        ang1_rad = ang1*Math::PI/180.0
        dist = side1 / (2.0*Math::tan(ang1_rad/2.0))
        ang2_rad = 2 * Math::atan2(side2/(2*dist), 1)
        ang2 = (ang2_rad*180.0)/Math::PI
        return ang2
    end
end
