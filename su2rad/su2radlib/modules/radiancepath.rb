module Tbleicher

  module Su2Rad

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
        end
        uimessage("Creating directory '%s'" % path)
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
            result = runSystemCmd(cmd)
            if result == true and File.exists?(rtmfile)
              return "\n#{name} mesh #{name}_obj\n1 objects/#{name}.rtm\n0\n0"
            else
              msg = "Error: could not convert obj file '#{objfile}'"
              uimessage(msg, -2)
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
        if RUBY_PLATFORM !~ /darwin/
          ## if not on a Mac substitute path separators
          cmd.gsub!(/\//, '\\')
        end
        uimessage("system cmd= %s" % cmd, 3)
        result = system(cmd)
        uimessage(" => result= %s" % result, 3)
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
        if path == ''
            ## use user home directory or temp
            if ENV.has_key?('HOME')
              path = ENV['HOME']
            elsif ENV.has_key?('USERPROFILE')
              path = ENV['USERPROFILE']
            elsif ENV.has_key?('HOMEPATH')
                ## home path missing drive letter!?
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

    end # RadiancePath

  end # Su2Rad

end # Tbleicher
