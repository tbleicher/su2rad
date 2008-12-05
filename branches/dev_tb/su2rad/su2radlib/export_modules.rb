
module InterfaceBase

    def initLog(lines=[])
        @@_log = lines
    end
    
    def uimessage(msg, loglevel=0)
        n = getNestingLevel()
        if n+loglevel > 0
            prefix = "  " * (n+loglevel)
        else
            prefix = ""
        end
        line = "%s[%d] %s" % [prefix, n, msg]
        begin
            Sketchup.set_status_text(line.strip())
            if loglevel <= $LOGLEVEL
                printf "#{line}\n"
                @@_log.push(line)
            end
        rescue
            printf "#{line}\n"
        end
    end
    
    def writeLogFile
        line  = "###  finished: %s  ###" % Time.new()
        line2 = "###  success:  #{$export_dir}/#{$scene_name})  ###"
        @@_log.push(line)
        @@_log.push(line2)
        logname = getFilename("%s.log" % $scene_name)
        if not createFile(logname, @@_log.join("\n"))
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

    def find_support_files(filename, subdir="")
        ## replacement for Sketchup.find_support_files
        if subdir == ""
            subdir = $SUPPORTDIR
        elsif subdir.slice(0,1) != '/'
            ## subdir not abs path (Mac)
            subdir = File.join($SUPPORTDIR, subdir)
        elsif subdir.slice(1,1) != ':'
            ## subdir not abs path (Windows)
            subdir = File.join($SUPPORTDIR, subdir)
        end
        if FileTest.directory?(subdir) == false
            return []
        end
        paths = []
        Dir.foreach(subdir) { |p|
            path = File.join(subdir, p)
            if p[0,1] == '.'[0,1]
                next
            elsif FileTest.directory?(path) == true
                lst = find_support_files(filename, path)
                lst.each { |f| paths.push(f) }
            elsif p.downcase == filename.downcase
                paths.push(path)
            end
        }
        return paths
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
    
    def removeExisting(scene_dir)
        if FileTest.exists?(scene_dir)
            scene_name = File.basename(scene_dir)
            if $CONFIRM_REPLACE == false
                uimessage("removing scene directory #{scene_name}")
                clearDirectory(scene_dir)
                prepareSceneDir(scene_dir)
                return true
            end
            ui_result = (UI.messagebox "Remove existing directory\n'#{scene_name}'?", MB_OKCANCEL, "Remove directory?")
            if ui_result == 1
                uimessage("removing scene directory #{scene_name}")
                clearDirectory(scene_dir)
                prepareSceneDir(scene_dir)
                return true
            else
                uimessage('export canceled')
                return false
            end
        else
            prepareSceneDir(scene_dir)
        end
        return true
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
    end
   
    def createFile(filename, text)
        ## write 'text' to 'filename' in a save way
        path = File.dirname(filename)
        createDirectory(path)
        if not FileTest.directory?(path)
            return false
        end
        f = File.new(filename, 'w')
        f.write(text)
        f.close()
        uimessage("created file '%s'" % filename, 1)
        $createdFiles[filename] = 1
        
        $filecount += 1
        Sketchup.set_status_text "files:", SB_VCB_LABEL
        Sketchup.set_status_text "%d" % $filecount, SB_VCB_VALUE
        return true
    end 
     
end




