require "exportbase.rb"
require "context.rb"
require "export_modules.rb"

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


class StatusPage 
   
    include InterfaceBase

    attr_reader :tmplpath, :htmlpath
    attr_writer :tmplpath, :htmlpath
    
    def initialize
        @tmplpath = File.join(File.dirname(__FILE__), "html", "progress.html")
        if $OS == 'MAC'
            @htmlpath = "/tmp/su2rad_%d_%d.html" % [Process.pid, rand(10000)]
        else
            #XXX check availability of Process.pid on Windows
            @htmlpath = "C:/windows/temp/su2rad_%d_%d.html" % [Process.pid, rand(10000)]
        end 
        @statusHash = Hash[ "status" => "initializing",
                            "faces" => 0,
                            "groups" => 0,
                            "components" => 0,
                            "materials" => 0,
                            "textures" => 0,
                            "files" => 0]
    end
    
    def close
        @template = @template.sub('onload="updateTimeStamp()"', 'onload="window.close()"')
        update()
        sleep(3.5)
        begin
            File.delete(@htmlpath)
            return true
        rescue => e
            puts $!.message, e.backtrace.join("\n")
        end
    end
    
    def create
        abspath = File.join(File.dirname(__FILE__), "html", "css") + File::SEPARATOR
        begin
            t = File.open(@tmplpath, 'r')
            template = t.read()
            t.close()
            @template = template.gsub('./css/', abspath)
            html = @template.sub('<!--STATUS-->', "initializing ...")
            h = File.open(@htmlpath, 'w')
            h.write(html)
            h.close()
            update()
            return true
        rescue => e
            puts $!.message, e.backtrace.join("\n")
            @template = ''
            return false
        end
    end

    def getStatusHTML(dict=nil)
        if dict != nil
            @statusHash.update(dict)
        end
        v = @statusHash['status']
        #TODO: higlight warnings and errors
        html = "<div class=\"gridLabel\"><span class=\"highlight\">status:</span></div>"
        html += "<div class=\"gridCell\"><span class=\"highlight\">%s</span></div>" % v
        a = @statusHash.to_a
        a = a.sort()
        a.each { |k,v|
            if k != "status"
                html += "<div class=\"gridLabel\">%s</div><div class=\"gridCell\">%s</div>" % [v,k]
            end
        }
        return html
    end

    def show
        if $OS == 'MAC'
            browser = "open"
        elsif $OS == 'WIN'
            browser = "iexplorer.exe"
        else
            return false
        end
        puts "starting browser thread ..."
	Thread.new do
	    system(`#{browser} "#{@htmlpath}"`)
	end
    end
    
    def update(dict=nil)
        if @template == ''
            return false
        end
        begin
            html = @template.sub('<!--STATUS-->', getStatusHTML(dict))
            h = File.open(@htmlpath, 'w')
            h.write(html)
            h.close()
            return true
        rescue => e
            puts $!.message, e.backtrace.join("\n")
            return false
        end
    end 
end



class RadianceScene < ExportBase
        
    def initialize
        @model = Sketchup.active_model
        
        $inComponent = [false]
        @@materialContext = MaterialContext.new()
        
        resetState()
        initLog()
        
        #@radOpts = RadianceOptions.new()
        
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
    

    def confirmExportDirectoryOLD
        ## show user dialog for export options
        ud = UserDialogOptions.new()    
        if ud.show('export options') == false
            uimessage('export canceled')
            return false
        end
        ## use test directory in debug mode
        if $SU2RAD_DEBUG 
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
    

    def startExportOLD(selected_only=0)
        if confirmExportDirectory() == false
            return
        end
        scene_dir = File.join(getConfig('SCENEPATH'),getConfig('SCENENAME'))
        if removeExisting(scene_dir) == false
            return
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

    def showStatusPage
        statusPage = StatusPage.new()
        if statusPage.create() == true
            statusPage.show()
            return statusPage
        else
            return false
        end
    end
    
    def startExportWebTest(selected_only=0)
        puts "startExportWebTest\n"
        if @statusPage
            updates = 0
            faces = 0
            groups = 0
            while updates < 17
                sleep(1)
                faces += Integer(rand()*1000)
                groups += Integer(rand()*10)
                updates += 1
                d = {"status" => "testing",
                     "faces"  =>  faces,
                     "groups" =>  groups,
                     "updates" => updates}
                @statusPage.update(d)
            end
        else
            printf "no @statusPage!\n"
        end
        @statusPage.close()
    end
    
    def startExportWeb(selected_only=0)
        sceneDir = getConfig('SCENEPATH')
        ## TODO: find temporary path and move rename after status page
        if renameExisting(sceneDir) == false
            return
        end
        @statusPage = showStatusPage()
        if @statusPage
            $SU2RAD_COUNTER.setStatusPage(@statusPage)
        end
        startExportWebTest(selected_only)
        puts "\nTODO: start real export action\n"
        return
        prepareSceneDir(sceneDir)
        if export(selected_only) == true
            $SU2RAD_COUNTER.showSuccess()
        else
            $SU2RAD_COUNTER.showError()
        end    
    end 
    
    def renameExisting(sceneDir)
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
    end
    
    def export(selected_only=0)
       
        ## write sky first for <scene>.rad file
        #@sky.skytype = @radOpts.skytype
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
        if getConfig('MODE') == 'by color'
            refs = saveFilesByColor(@@byColor)
            createMainScene(refs, '')
        elsif getConfig('MODE') == 'by layer'
            refs = saveFilesByLayer(@@byLayer)
            createMainScene(refs, '')
        end
        
        @@nameContext.pop()
        @@materialContext.export()
        createRifFile()
        writeLogFile()
        return true
    end
   
    def saveFilesByColor(byColor)
        references = []
        byColor.each_pair { |name,lines|
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
        return references
    end
    
    def saveFilesByLayer(byLayer)
        references = []
        byLayer.each_pair { |name,lines|
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
        return references
    end

    def runPreview
        if $OS =! 'MAC'
            uimessage("'rvu' only available on Mac OS X",-1)
            return
        end
        if getConfig('RAD') == ''
            uimessage("Radiance not found in search path!",-1) 
            return
        end
        #TODO: set temporary directory
        #      export to temp directory
        #      run subshell with 'rad -x 11 ...'
    end
    
    def getRifObjects
        text = ''
        if @sky.filename != ''
            text += "objects=\t#{@sky.filename}\n"
        end
        files = []
        meshes = []
        Dir.foreach(getFilename("objects")) { |f|
            if f =~ /\.rad\z/i
                files.push("objects/#{f}")
            elsif f =~ /\.rtm\z/i
                meshes.push("objects/#{f}")
            end
        }
        files += meshes
        i=0
        lines = ["## scene object files (total=%d)" % files.length]
        while i < files.length()
            lines.push("objects=\t%s" % files.slice(i,3).join("\t"))
            i += 3
        end
        text += lines.slice(0,51).join("\n")
        if lines.length > 50
            text += "\n## total number of objects too large\n"
        end
        return text
    end
    
    def createRifFile
        sceneName = getConfig('SCENENAME')
        text = @renderOptions.getRifOptionsText()
        text += "\n"
        text += "materials=    materials.rad\n\n"
        text += "%s\n\n" % @viewsList.getViewLines()
        text += getRifObjects
        text += "\n"
        
        filename = getFilename("%s.rif" % sceneName)
        if not createFile(filename, text)
            uimessage("Error: Could not create rif file '#{filename}'")
        end
    end
        
    def exportViews_OLD
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
    
    def setOptionsFromDialog(export,render,sky,views)
        @exportOptions = export
        export.writeOptionsToConfig()
        @renderOptions = render
        @sky.setSkyOptions(sky.getSettings())
        @viewsList = views
    end

    def _getViewLineOLD(c)
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
    
    def createViewFileOLD(c, viewname)
        filename = getFilename("views/%s.vf" % viewname)
        if not createFile(filename, getViewLine(c))
            msg = "## Error: Could not create view file '#{filename}'"
            uimessage(msg)
            return msg
        else
            return "view=   #{viewname} -vf views/#{viewname}.vf" 
        end
    end
    
    def getFoVAngleOLD(ang1, side1, side2)
        ang1_rad = ang1*Math::PI/180.0
        dist = side1 / (2.0*Math::tan(ang1_rad/2.0))
        ang2_rad = 2 * Math::atan2(side2/(2*dist), 1)
        ang2 = (ang2_rad*180.0)/Math::PI
        return ang2
    end
end

