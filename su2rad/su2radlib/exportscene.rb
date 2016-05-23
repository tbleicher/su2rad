require "exportbase.rb"

require 'materialcontext.rb'

require 'weboptionsexport.rb'
require 'weboptionsrender.rb'
require 'weboptionssky.rb'

require 'sketchupviewslist.rb'

require 'scene_materials.rb'
require 'materiallists.rb'
require 'statuspage.rb'

require 'modules/logger.rb'
require 'modules/session.rb'


module Tbleicher

  module Su2Rad

    class ExportScene < Tbleicher::Su2Rad::ExportBase
    
      include Tbleicher::Su2Rad::Session

      attr_accessor :state
      attr_reader :exportOptions, :renderOptions, :viewsList, :skyOptions, :materialLists
      

      def initialize(state)
        
        @state = state 
        @model = Sketchup.active_model
        
        $inComponent = [false]
        @@materialContext = Tbleicher::Su2Rad::MaterialContext.new(state)
        
        resetState()
        initLog()
        
        @sky = Tbleicher::Su2Rad::RadianceSky.new(@state)
        
        setConfig("Foo", "bar")
        puts "Foo set"
        setExportDirectory()
        
        @exportOptions = Tbleicher::Su2Rad::WebOptionsExport.new(state)
        @renderOptions = Tbleicher::Su2Rad::WebOptionsRender.new(state)
        @skyOptions    = Tbleicher::Su2Rad::WebOptionsSky.new(state)
        @viewsList     = Tbleicher::Su2Rad::SketchupViewsList.new(state)
        @materialLists = Tbleicher::Su2Rad::MaterialLists.new() 
      end
    

      def initLog
        line1 = "###  su2rad.rb export  ###" 
        line2 = "###  %s  ###" % Time.now.asctime
        Tbleicher::Su2Rad::Logger.initLog([line1,line2])
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
        statusPage = Tbleicher::Su2Rad::StatusPage.new(htmlpath)
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
          uimessage("Could not rename existing directory '#{sceneDir}' - files will be replaced", -1)
        end
        
        if getConfig('SHOW_STATUS_PAGE')
          statusPage = showStatusPage()
        else
          statusPage = nil
        end

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
        emode = getConfig('MODE')
        if emode == 'by color' || emode == 'daysim'
          refs = _saveFilesByColor(@@byColor)
          createMainScene(refs, '')
        elsif emode == 'by layer' 
          refs = _saveFilesByLayer(@@byLayer)
          createMainScene(refs, '')
        end
        
        @@nameContext.pop()
        uimessage("\nMATERIALS:", 0)
        @@materialContext.export(@materialLists.matLib)
        createRifFile()

        if getConfig('MODE') == 'daysim'
          puts "DAYSIM == true"
          hea = createDaysimFiles()
          if hea != ''
            startDaysim(hea)
          end
        end
        
        logname = File.join('logfiles', "%s_export.log" % getConfig('SCENENAME'))
        logname = getFilename(logname)
        Tbleicher::Su2Rad::Logger.closeLog( $SU2RAD_COUNTER.getStatusLine() )
        Tbleicher::Su2Rad::Logger.write( logname )

        return true
      end
  

      def startDaysim(heafile)
        if RUBY_PLATFORM =~ /darwin/
          uimessage("platform != 'WIN' -> can't start daysim", 4)
          return
        end
        uimessage("trying to start daysim ...", 1)
        daysim = "C:\\daysim\\bin_windows\\daysimExe.jar"
        heafile.gsub!(/\//, "\\")
        olddir = Dir.pwd()
        Dir.chdir("C:/daysim/bin_windows")
        
        begin
          Thread.new do
            #system(`java -jar #{daysim} <"#{heafile}"`)
            system(`start #{daysim} "#{heafile}"`)
          end
        rescue
          uimessage("Error starting 'daysimExe.jar' thread", -2)
          uimessage("%s\n%s\n" % [$!.message, e.backtrace.join("\n")], -2)
        end
        Dir.chdir(olddir)
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
          if doTextures(skm) == false
            filename = getFilename("objects/#{name}.rad")
            if not createFile(filename, lines.join("\n"))
              uimessage("Error: could not create file '#{filename}'")
            else
              references.push("!xform objects/#{name}.rad")
            end
          
          else
            uimessage("material='#{skm}' texture='#{skm.texture}'", 2)
            references.push(obj2mesh(name, lines))
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
        if RUBY_PLATFORM !~ /darwin/
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
            uimessage("XXX object file: %s\n" % f, 3)
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
  

      def createDaysimFiles
        ## create subdirectory 'daysim' with geometry and control files
        dsdir = getFilename("Daysim")
        uimessage("creating DAYSIM structure in '#{dsdir}'", 1)
        createDirectory(dsdir)
        ['res', 'rad', 'pts', 'tmp', 'wea'].each { |d|
            createDirectory(File.join(dsdir, d))
        }
        radfile = _createDaysimRAD()
        ptsfile = _createDaysimPTS()
        if radfile != ''
            return _createDaysimHEA(radfile,ptsfile)
        end
        return ''
      end
    

      def _createDaysimRAD
        ## remove sky from radiance scene and convert to single file
        radfile = getFilename(getConfig('SCENENAME') + ".rad")
        lines = File.new(radfile).readlines()
        dspath = getFilename("Daysim/%s.rad" % getConfig('SCENENAME'))

        begin
          fDaysim = File.new(dspath, 'w')
          lines.each { |l|

            if l.strip() =~ /.sky$/
              uimessage("stripping sky: '#{l.strip}'", 1)
            
            elsif l =~ /^!xform/
              if l.strip =~ /materials.rad$/
                uimessage("identified materials file: '#{l.strip}'", 2)
                uimessage("-> TODO: convert to greyscale", 2)
              end
              uimessage("adding scene file '%s'" % l.split()[-1], 2)
              scenefile = getFilename(l.split()[-1])
              if File.exists?(scenefile)
                fDaysim.write(File.open(scenefile).read())
                fDaysim.write("\n\n")
              else
                uimessage("Error: Could not locate  scene file '#{scenefile}'", -2)
              end
            
            else
              fDaysim.write(l)
            end
          }
          fDaysim.write("\n")
          fDaysim.close()
        
        rescue => e
          uimessage("Error: Could not create daysim scene file '#{dspath}'", -2)
          uimessage("error message: '%s'\n%s\n" % [$!.message, e.backtrace.join("\n")], -2)
          return ''
        end
        return dspath
      end
    

      def _createDaysimHEA(radfile, ptsfile='')
        ## create Daysim/*.hea file
        lines = [
          "project_name %s" % getConfig('SCENENAME'),
          @sky.getDaysimSiteInfo(),
          "\n########################\n# building information #\n########################",
          "material_file %s_material.rad" % getConfig('SCENENAME'),
          "geometry_file %s_geometry.rad" % getConfig('SCENENAME'),
          "radiance_source_files 1,%s"    % File.basename(radfile)
        ]
        if ptsfile != ''
          lines.push("sensor_file %s" % File.basename(ptsfile))
        end
        lines.push("shading 0\nViewPoint 0\n")
        
        heafile = getFilename("Daysim/%s.hea" % getConfig('SCENENAME'))
        text = lines.join("\n")
        if not createFile(heafile, text)
          uimessage("Error: Could not create DAYSIM hea file '#{heafile}'", -2)
          return ''
        end
        return heafile
      end
    

      def _createDaysimPTS
        ## add field descriptions
        numdir = getFilename('numeric')
        if not File.exists?(numdir)
          return ''
        end

        Dir.foreach(numdir) { |f|
          if f =~ /.fld$/
            fullpath = File.join(numdir, f)
            ptsfile = getFilename("Daysim/%s.pts" % getConfig('SCENENAME'))
            if not createFile(ptsfile, File.open(fullpath).read())
              uimessage("Error: Could not create DAYSIM pts file '#{ptsfile}'", -2)
            else
              uimessage("created DAYSIM pts file '#{ptsfile}'", 1)
              return ptsfile
            end
          end
        }
        ## default: empty string (no file copied)
        return ''
      end
    

      def createRifFile
        ## last step in Radiance export: write radiance input file
        sceneName = getConfig('SCENENAME')
        text = @renderOptions.getRifOptionsText()
        text += "\n"
        text += "materials=    materials.rad\n\n"
        text += "%s\n\n" % @viewsList.getViewLines()
        text += getRifObjects
        text += "\n"
        
        filename = getFilename("%s.rif" % sceneName)
        if not createFile(filename, text)
          uimessage("Error: Could not create rif file '#{filename}'", -2)
        end
      end
       

      def prepareExport()
        @exportOptions.writeOptionsToConfig()
        @sky.setSkyOptions(@skyOptions.getSettings())
      end

    end # RadianceScene

  end # Su2Rad

end # Tbleicher

