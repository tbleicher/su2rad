require "exportbase.rb"
require "context.rb"
require "export_modules.rb"

require 'webdialog_options.rb'
require 'webdialog_views.rb'
require 'scene_materials.rb'


class StatusPage 
   
    include InterfaceBase

    attr_reader :tmplpath, :htmlpath
    attr_writer :tmplpath, :htmlpath
    
    def initialize(htmlpath)
        @htmlpath = htmlpath
        @tmplpath = File.join(File.dirname(__FILE__), "html", "exportStatsProgress.html")
        @statusHash = {"status" => "initializing"}
        @statusHash.default = 0
        @timeStart = Time.now()
        @csspath = "file://" + File.join(File.dirname(__FILE__), "html", "css") + File::SEPARATOR
        if $SU2RAD_PLATFORM == 'WIN'
            @csspath.gsub!(File::SEPARATOR, '/')
        end
        @shortnames = { "Sketchup::ComponentInstance" => "components",
                        "Sketchup::Group"    => "groups",
                        "Sketchup::Material" => "materials",
                        "Sketchup::Texture"  => "textures" }
    end
    
    def showFinal()
        if @statusHash['errors'] != 0
            @statusHash.update({"status" => "finished (errors)"})
        elsif @statusHash['warnings'] != 0
            @statusHash.update({"status" => "finished (warnings)"})
        else
            @statusHash.update({"status" => "finished"})
        end
        begin
            newtmpl = File.join(File.dirname(@tmplpath), 'exportStatsFinal.html')
            t = File.open(newtmpl, 'r')
            template = t.read()
            t.close()
            @template = template.gsub(/\.\/css\//, @csspath)
        rescue
            @template = @template.sub('onload="updateTimeStamp()"', '')
        end
        update()
    end
    
    def create
        begin
            t = File.open(@tmplpath, 'r')
            template = t.read()
            t.close()
            @template = template.gsub(/\.\/css\//, @csspath)
            html = @template.sub(/--STATUS--/, "initializing ...")
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
        if v =~ /warn/i
            style = "highlightWarn"
        elsif v =~ /err/i
            style = "highlightError"
        else
            style = "highlight"
        end
        html = "<div class=\"gridLabel\"><span class=\"%s\">status:</span></div>" % style
        html += "<div class=\"gridCell\"><span class=\"%s\">%s</span></div>" % [style,v]
        a = @statusHash.to_a 
        a = a.sort()
        a.each { |k,v|
            if k != "status"
                k = @shortnames[k] if @shortnames.has_key?(k)
                html += "<div class=\"gridLabel\">%s</div><div class=\"gridCell\">%s</div>" % [v,k]
            end
        }
        html += "<div class=\"gridLabel\"><span class=\"highlight\">time:</span></div>"
        html += "<div class=\"gridCell\"><span class=\"highlight\">%d sec</span></div>" % getTimeDiff()
        return html
    end

    def getTimeDiff
        return Integer(Time.now() - @timeStart)
    end

    def show
        @timeStart = Time.now()
        if $SU2RAD_PLATFORM == 'MAC'
            browser = "open"
	    htmlpath = @htmlpath
        elsif $SU2RAD_PLATFORM == 'WIN'
            browser = "\"C:\\Program Files\\Internet Explorer\\iexplore.exe\""
	    htmlpath = @htmlpath.gsub(/\//, '\\')
	    ## separate browser thread does not work in windows ...
	    return
	end
	Thread.new do
	    system(`#{browser} "#{htmlpath}"`)
	end
    end
    
    def update(dict=nil)
	if @template == ''
            return false
        end
        begin
            html = @template.sub(/--STATUS--/, getStatusHTML(dict))
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
    
    attr_reader :exportOptions, :renderOptions, :viewsList, :skyOptions, :materialLists
    
    def initialize
        @model = Sketchup.active_model
        
        $inComponent = [false]
        @@materialContext = MaterialContext.new()
        
        resetState()
        initLog()
        
        @sky = RadianceSky.new()
        setExportDirectory()
        
        @exportOptions = ExportOptions.new()
        @renderOptions = RenderOptions.new()
        @viewsList     = SketchupViewsList.new()
        @skyOptions    = SkyOptions.new()
        @materialLists = MaterialLists.new() 
    end
    
    def initLog
        line1 = "###  su2rad.rb export  ###" 
        line2 = "###  %s  ###" % Time.now.asctime
        super([line1,line2])
        printf "\n\n%s\n" % line1
        Sketchup.set_status_text(line1)
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
                uimessage(msg, -2)
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
            uimessage(msg, -2)
            return msg
        end
    end
    
    def showStatusPage
        htmlpath = getFilename(File.join('logfiles', 'status.html'))
        if not createFile(htmlpath, "foo")
            return nil
        end
        statusPage = StatusPage.new(htmlpath)
        if statusPage.create() == true
            statusPage.show()
            $SU2RAD_COUNTER.setStatusPage(statusPage)
            return statusPage
        else
            return nil
        end
    end
    
    def startExportWeb(selected_only=0)
        sceneDir = getConfig('SCENEPATH')
        if renameExisting(sceneDir) == false
            return false
        end
        statusPage = showStatusPage()
        begin 
            prepareSceneDir(sceneDir)
            $SU2RAD_COUNTER.setStartTime()
            success = export(selected_only)
        rescue => e
            uimessage($!.message, -2)
            printf e.backtrace.join("\n")
            success = false
        ensure
            if statusPage
                $SU2RAD_COUNTER.updateStatus() 
                statusPage.showFinal()
            end
        end
        return success
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
        
        uimessage("\nOBJECTS:", 0)
        sceneref = exportByGroup(entities, Geom::Transformation.new)
        if getConfig('MODE') == 'by color'
            refs = _saveFilesByColor(@@byColor)
            createMainScene(refs, '')
        elsif getConfig('MODE') == 'by layer'
            refs = _saveFilesByLayer(@@byLayer)
            createMainScene(refs, '')
        end
        
        @@nameContext.pop()
        uimessage("\nMATERIALS:", 0)
        @@materialContext.export(@materialLists.matLib)
        createRifFile()
        writeLogFile()
        return true
    end
   
    def _saveFilesByColor(byColor)
        references = []
        uimessage("\nSCENEFILES:", 0)
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
    
    def _saveFilesByLayer(byLayer)
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
        if $SU2RAD_PLATFORM != 'MAC'
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
            else
                #XXX
                printf "XXX object file: %s\n" % f
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
        
    def prepareExport()
        @exportOptions.writeOptionsToConfig()
        @sky.setSkyOptions(@skyOptions.getSettings())
    end

end

