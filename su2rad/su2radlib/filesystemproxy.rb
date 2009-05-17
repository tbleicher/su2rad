module FileSystemProxy
   
    def FileSystemProxy.listDirectoryTree(path)
        abspath = File.expand_path(path)
        idPath = abspath
        if File.file?(abspath)
            abspath = File.dirname(abspath)
        end
        puts "DEBUG: directoryTree '#{abspath}'"
        children = FileSystemProxy.listDirectory(abspath,idPath)
        parent = File.basename(abspath)
        abspath = File.dirname(abspath)
        while abspath != parent
            dirs = FileSystemProxy.listDirectory(abspath,idPath)
            dirs.each { |d|
                if d['name'] == parent
                    d['children'] = children
                end
            }
            children = dirs
            parent = File.basename(abspath)
            abspath = File.dirname(abspath)
        end
        return children
    end
    
    def FileSystemProxy.printDirectoryTree(entries, indent="")
        entries.each { |e|
            printf "DEBUG: #{indent}#{e['name']}\n"
            if e.has_key?('children')
                FileSystemProxy.printDirectoryTree(e['children'], indent+"    ")
            end 
        }
    end 
    
    def FileSystemProxy.listDirectory(path,idPath='')
        abspath = File.expand_path(path)
        if File.directory?(abspath)
            puts "DEBUG: listing directory '#{abspath}'"
            puts "DEBUG:            idPath='#{idPath}'"
        elsif File.file?(abspath)
            abspath = File.dirname(abspath)
            puts "DEBUG: listing parent dir of '#{abspath}'"
        else
            abspath = File.expand_path('~')
            puts "DEBUG: dir '#{abspath}' does not exist! default = '#{abspath}'"
        end
         
        dirs = Array.new()
        files = Array.new()
        Dir.foreach(abspath) { |e|
            path = File.join(abspath, e)
            if e.slice(0,1) == '.'
                next
            elsif File.directory?(path)
                dirs.push(path)
            elsif File.file?(path)
                files.push(path)
            end 
        }
        dirList = Array.new() 
        dirs.sort!()
        files.sort!()
        all = dirs + files
        all.each  { |p|
            entry = {'name' => File.basename(p), 
                     'type' => File.ftype(p),
                     'path' => p,
                     'ext'  => 'ext_foo',
                     'access' => FileTest.readable?(p)}
            if entry['type'} == 'file'
                entry['access'] = FileTest.writeable?(p)
            end
            if entry['type'] == 'file' && p.length > 3
                entry['ext'] = "ext_%s" % p.slice(-3,3)
            end
            if p == idPath
                entry['id'] = 'requestedPath'
                puts "DEBUG: path == idPath: #{p}"
            end
            dirList.push(entry)
        }
        return dirList
    end
    
end
