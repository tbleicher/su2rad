module FileSystemProxy
   
    def FileSystemProxy.listFileSystemTree(path)
        print "listFileSystemTree(path='" + path + "')\n"
        abspath = File.expand_path(path)
        idPath = abspath
        while not File.exists?(abspath)
	    abspath = File.dirname(abspath)
            idPath = abspath
        end
        if File.file?(abspath)
            abspath = File.dirname(abspath)
        end
        children = FileSystemProxy.listDirectory(abspath,idPath)
        parent = File.basename(abspath)
        abspath = File.dirname(abspath)
        while abspath
            dirs = FileSystemProxy.listDirectory(abspath,idPath)
            dirs.each { |d|
                if d['name'] == parent
                    printf("  => '#{parent}': adding %d children\n" % children.length)
                    d['children'] = children
                end
            }
            children = dirs
	    if File.dirname(abspath) == abspath
                #puts "DEBUG: tree starts at '#{abspath}'"
		children = FileSystemProxy.addRoot(abspath, children)
        	return children
	    else
                parent = File.basename(abspath)
	        abspath = File.dirname(abspath)
	    end
        end
        return children
    end
    
    def FileSystemProxy.addRoot(abspath, children)
        #puts "addRoot() abspath=#{abspath} children=#{children.length}"
        if abspath == '/'
	    root = {'name' => '/', 
		    'type' => File.ftype('/'),
		    'path' => '/',
		    'ext'  => 'ext_drive',
		    'access' => FileTest.readable?('/'),
	            'children'=> children}
	    return [root]
	else
	    drives = []
	    letters = ('a'..'z').to_a
	    letters.each { |l|
		drive = "%s:/" % l
	        if File.exists?(drive)
		    entry = {'name' => drive, 
			     'type' => File.ftype(drive),
			     'path' => drive,
			     'ext'  => 'ext_drive',
			     'access' => FileTest.readable?(drive)}
		    if drive.downcase() == abspath.downcase()
			entry['children'] = children
		    end
		    drives.push(entry)
		end
	    }
	    return drives
	end
    end

    def FileSystemProxy.printDirectoryTree(entries, indent="")
        entries.each { |e|
            #printf "DEBUG: #{indent}#{e['name']}\n"
            if e.has_key?('children')
                FileSystemProxy.printDirectoryTree(e['children'], indent+"    ")
            end 
        }
    end 
    
    def FileSystemProxy.listDirectory(path,idPath='')
        #puts "listDirectory() path=#{path}"
        epath = File.expand_path(path)
        if File.directory?(epath)
            abspath = epath
            #puts "listing directory '#{epath}'"
            #puts "DEBUG:            idPath='#{idPath}'"
        elsif File.file?(epath)
            #puts "DEBUG: listing parent dir of '#{abspath}'"
            abspath = File.dirname(epath)
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
            if p.index("'") != nil
                entry['access'] = false
            elsif entry['type'] == 'file'
                entry['access'] = FileTest.writable?(p)
            end
            if entry['type'] == 'file' && p.length > 3
                entry['ext'] = "ext_%s" % p.slice(-3,3)
            end
            if p == idPath
                entry['id'] = 'requestedPath'
            end
            dirList.push(entry)
        }
        return dirList
    end
    
end
