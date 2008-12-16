
module InterfaceBase

    def initLog(lines=[])
        @@_log = lines
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
        prefix = "  " * getNestingLevel()
        levels = ["I", "V", "D", "D", "D", "D", "E", "W"]  ## [0,1,2,-2,-1]
        line = "%s[%s] %s" % [prefix, levels[loglevel], msg]
        begin
            Sketchup.set_status_text(line.strip())
            if loglevel <= $SU2RAD_LOGLEVEL
                printf "#{line}\n"
                @@_log.push(line)
            end
        rescue
            printf "#{line}\n"
        end
    end
    
    def writeLogFile
        line  = "###  finished: %s  ###" % Time.new()
        line2 = "###  success:  %s  ###" % File.join(getConfig('SCENEPATH'), getConfig('SCENENAME'))
        @@_log.push(line)
        @@_log.push(line2)
        logname = getFilename("%s.log" % getConfig('SCENENAME'))
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
        return string
    end
    
    def urlEncode(string)
        ## URL-encode from Ruby::CGI
        string.gsub(/([^ a-zA-Z0-9_.-]+)/n) do
            '%' + $1.unpack('H2' * $1.size).join('%').upcase
        end.tr(' ', '+')
    end
    
    def urlDecode(string)
        ## URL-decode from Ruby::CGI
        string.tr('+', ' ').gsub(/((?:%[0-9a-fA-F]{2})+)/n) do
            [$1.delete('%')].pack('H*')
        end
    end
    
    def getJSONDictionary(dict)
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
            str = '['
            obj.each { |e|
                str += "%s," % toStringJSON(e)
            }
            str = str.chop()
            str += ']'
        elsif obj.class == FalseClass
            str = 'false'
        elsif obj.class == Fixnum or obj.class == Bignum
            str = "%s" % obj
        elsif obj.class == Float
            str = "%f" % obj
        elsif obj.class == Hash
            str = '{'
            obj.each_pair { |k,v|
                str += "%s:%s," % [toStringJSON(k),toStringJSON(v)]
            }
            str = str.chop()
            str += '}' 
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
    
    def setOptionsFromString(dlg, params)
        ## set export options from string <p>
        pairs = params.split("&")
        pairs.each { |pair|
            k,v = pair.split("=")
            old = eval("@%s" % k)
            if (v == 'true' || v == 'false' || v =~ /\A[+-]?\d+\z/ || v =~ /\A[+-]?\d+\.\d+\z/)
                val = eval("%s" % v)
            else
                val = v
                v = "'%s'" % v
            end
            if val != old
                eval("@%s = %s" % [k,v])
                uimessage("#{self.class} new value for @%s: %s" % [k,v])
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
                cmd = "%s '#{objfile}' '#{rtmfile}'" % getConfig('OBJ2MESH')
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
        tmpl = tmpl.gsub('$FILE', path)
        tmpl = tmpl.gsub('$PAGE', name)
        setConfig('SCENEPATH', File.dirname(tmpl))
        setConfig('SCENENAME', File.basename(tmpl,'.rif'))
    end

    def cleanPath(path)
        if path.slice(-1,1) == File.SEPARATOR
            path = path.slice(0,path.length-1)
        end
        return path
    end
        
    def setTestDirectory
        if $testdir and $testdir != ''
            setConfig('SCENEPATH', $testdir)
            scene_dir = File.join(getConfig('SCENEPATH'), getConfig('SCENENAME'))
            if FileTest.exists?(scene_dir)
                system("rm -rf #{scene_dir}")
            end
        end
    end
    
end




