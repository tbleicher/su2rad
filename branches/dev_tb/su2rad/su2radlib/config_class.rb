
class RunTimeConfig
   
    attr_reader :filename
        
    @@_dict = {'MODE'    => 'by color',
        'MAKEGLOBAL'     => false,
        'TRIANGULATE'    => false,
        'TEXTURES'       => false,

        'SHOWRADOPTS'    => false,
        'EXPORTALLVIEWS' => false,

        'LOGLEVEL'       => 2,
        'USEWX'          => false,

        'UTC_OFFSET'     => nil,
        
        'UNIT'           => 0.0254,
        'GRIDSPACINGX'   => 0.25,    ## assumes meters!
        'GRIDSPACINGY'   => 0.25,    ## assumes meters!

        ## path template
        'PATHTMPL'      => '$FILE/radiance/$PAGE.rif',
        
        ## paths to utility programs
        'REPLMARKS'     => '',
        'RA_PPM'        => '',
        'OBJ2MESH'      => '',
        
        'CONVERT'       => '',
        'DAYSIM'        => '',
        'RADSUNPATH'    => '',

        ## misc and unused options
        'ZOFFSET'         => nil,
        'COLOR_SCHEME'    => 'blue-red-yellow',
        'CONFIRM_REPLACE' => true,
        'RAD'             => '',
        'PREVIEW'         => false}

    @@_paths = ['REPLMARKS', 'CONVERT', 'RA_PPM', 'OBJ2MESH', 'EPW2WEA',
                'MATERIALLIB', 'SUPPORTDIR']
    
    def initialize
        printf "RunTimeConfig.initialize()\n"
        @filename = File.expand_path('_config.rb', File.dirname(__FILE__))
        initPaths()
        _checkDictSettings(@@_dict, false)
    end

    def _checkDictSettings(dict, remove=true)
        @@_paths.each { |p|
            if dict.has_key?(p) and not File.exists?(dict[p])
                uimessage("WARNING: path for #{p} does not exist ('#{dict[p]}')", -1)
                if remove == true
                    dict.delete(p)
                else
                    dict[p] = ''
                end
            end
        }
        return dict
    end
    
    def initPaths
        uimessage("RunTimeConfig: initPaths() ...", 1)
        bindir = File.join(File.dirname(__FILE__), 'bin', $SU2RAD_PLATFORM)
        keys = ['REPLMARKS', 'CONVERT', 'RA_PPM', 'OBJ2MESH', 'EPW2WEA']
        keys.each { |k|
            app = k.downcase()
	    if $SU2RAD_PLATFORM == 'WIN'
		app += '.exe'
	    end
            uimessage("  searching '#{app}' ...", 2)
            binpath = File.join(bindir, app)
            if File.exists?(binpath)
                set(k, binpath)
                uimessage("  => found '#{app}' in '#{bindir}'", 1) 
            elsif $SU2RAD_PLATFORM == 'MAC'
                p = IO.popen('which %s' % app)
                lines = p.readlines()
                p.close()
                if lines != []
                    path = lines[0].strip()
                    if File.exists?(path)
                        set(k, path)
                        uimessage("  => found '#{app}' in '#{path}'", 1)
                    end
                else
                    ## add /usr/local/bin to PATH before searching
                    paths = ENV['PATH']
                    paths = paths + ':/usr/local/bin'
                    searchEnvPaths(paths, k, app)
                end
            elsif ENV.has_key?('Path')
                searchEnvPaths(ENV['Path'], k, app)
	    end
	    if get(k) == ''
                uimessage("  => application '#{app}' not found", -1)
            end
        }
    end
   
    def searchEnvPaths(searchpaths, k, app)
        searchpaths.split(File::PATH_SEPARATOR).each { |p|
            if p =~ /system/i
                uimessage("  ... skipping system folder '#{p}'", 2)
                next ## skip system folder on Windows
            end
            path = File.join(p, app)
            if File.exists?(path)
                set(k, path)
                uimessage("  => found '#{app}' in '#{path}'")
                break
            end
        }
    end
     
    def [](key)
        get(key)
    end

    def []=(key,value)
        set(key,value)
    end

    def get(key)
        return @@_dict[key]
    end

    def set(key,value)
        if @@_paths.index(key) != nil 
            if value != '' and File.exists?(value)
                @@_dict[key] = value
                if key == 'REPLMARKS'
                    set('RA_PPM', value.sub("replmarks", "ra_ppm"))
                    set('OBJ2MESH', value.sub("replmarks", "obj2mesh"))
                end
            else
                return false
            end
        else
            @@_dict[key] = value
        end
    end

    def readConfig(filename='')
        ## load config from file
        if filename == ''
            filename = @filename
        end
        lines = []
        if File.exists?(filename)
            begin
                f = File.new(filename, 'r')
                lines = f.readlines()
                f.close()
            rescue => e
                msg = "ERROR reading config file:\n%s\n\n%s" % [$!.message,e.backtrace.join("\n")]
                uimessage(msg, -2)
                return false
            end
        end
        su2rad_config = _evalLines(lines)
        if applyDict(su2rad_config, filename) == true
            @filename = filename
        end
    end 
   
    def applyDict(d, filename='')
        if d.class != Hash
            uimessage("ERROR: can't apply object of class '#{d.class}'", -2)
            return false
        end
        d = _checkDictSettings(d)
        if d.length == 0
            return false
        end
        if filename != ''
            uimessage(" => updating config from file '#{filename}' ...")
        end
        @@_dict.update(d)
        return true
    end
    
    def _evalLines(lines)
        config = Hash.new()
        lines.each { |line|
            line.strip!() 
            if line[-1] == ','
                line = line.slice[0..-2]
            end
            if line[0] == "#"
                next
            elsif line.index("=>") != nil
                k,v = line.split("=>")
                if v != nil
                    config[k.strip!] = v.strip!
                end
            end
        }
        config = consolidate(config)
        return config       
    end
    
    def consolidate(config)
        ## convert strings to objects
        config.each_pair { |k,v|
            if k == 'LOGLEVEL'
                config[k] = Integer(v)
            elsif k == 'UNIT'
                config[k] = Float(v)
            elsif v == 'true'
                config[k] = true
            elsif v == 'false'
                config[k] = false
            elsif v == "''"
                config[k] = ''
            elsif v == 'nil'
                config[k] = nil
            elsif k == 'ZOFFSET'
                config[k] = Float(v)
            elsif k == 'UTC_OFFSET'
                config[k] = Float(v)
            end
            #printf " k=%s config[k]='%s'\t\tclass=%s\n" % [k,config[k],config[k].class]
        }    
        return config       
    end 
   
    def toJSON()
        options = {
            'MODE'         => 'by color|by layer|by group',
            'MAKEGLOBAL'   => 'true|false',
            'TRIANGULATE'  => 'true|false',
            'TEXTURES'     => 'true|false',
            'LOGLEVEL'     => '-2|-1|0|1|2|3|4',
            'USEWX'        => 'true|false',
            'COLOR_SCHEME' => 'roygbiv|blue-red-yellow'
        }
        options.default = ""
        help = {
            "MODE"        => "default export mode - set this to the mode you are going to use most often.",
            "MAKEGLOBAL"  => "default setting for make global check box.",
            "TRIANGULATE" => "default setting for triangulate check box.",
            "TEXTURES"    => "default setting for textures check box.",
            "UNIT"        => "conversion unit for SketchUp inches to Radiance scene units. Use 0.0254 if you want Radiance to use meters, or 0.0833 if your prefered scene unit is imperial foot.",
            "LOGLEVEL"    => "amount of information to report in the log file:<br/>-2 is only errors<br/> -1 are errors and warnings<br/>0 includes important messages (default)<br/> 1 to 4 increases the verbosity.",
            "PATHTMPL"    => "This string is used to create the default path for the Radiance files. $FILE will be replaced by the path of the SketchUp file, $PAGE by the name of the SketchUp scene.",
            "USEWX"       => "If you have wxSU installed on your system this setting will allow you to use the extension for improved progress dialogs. Note that this might create instability of SketchUp.",
            "REPLMARKS"   => "path to REPLMARKS and other Radiance binaries. If you have Radiance installed select the replmarks application of your installation.",
            "CONVERT"     => "path to ImageMagick convert. If you have ImageMagick or GraphicsMagick installed select the convert application of your installation.",
            "DAYSIM"      => "If you have DAYSIM installed select the daysim java application.",
            "RADSUNPATH"  => "If you have RADSUNPATH installed select the radsunpath executable.",
            'COLOR_SCHEME' => "UNUSED - colour gradient used for numeric graph",
        }
        help.default = ""
        help.default = "This is the default help. this is the default help. this is the default help. this is the default help. htis is the default help."
        opts_in_sequence = [["basic settings", 'title'], 
                            ["MODE",        'choice'],
                            ["MAKEGLOBAL",  'choice'],
                            ["TRIANGULATE", 'choice'],
                            ["TEXTURES",    'choice'],
                            ["UNIT",        'number'],
                            
                            ["paths", 'title'], 
                            ["REPLMARKS",   'path'],
                            ["CONVERT",     'path'],
                            ["DAYSIM",      'path'],
                            ["RADSUNPATH",  'path'],
                            
                            ["advanced settings", 'title'], 
                            ["LOGLEVEL",    'choice'],
                            ["PATHTMPL",    'string'],
                            ["USEWX",       'choice'],

                            ["numeric settings", 'title'],
                            ["ZOFFSET",      'number'],
                            ["COLOR_SCHEME", 'choice']]
        array = []
        opts_in_sequence.each { |opt|
            oname = opt[0]
            otype = opt[1]  
            array.push("{name: \"#{oname}\", value: \"#{get(oname)}\", help: \"#{help[oname]}\", options: \"#{options[oname]}\", type: \"#{otype}\"}")
        }
        json = "[%s]" % array.join(',')
        return json
    end

    def to_s(sep="\n")
        pairs = []
        @@_dict.each_pair { |k,v|
            if v == ''
                pairs.push("%s => ''" % k)
            elsif v == false
                pairs.push("%s => %s" % [k,'false'])
            elsif v.class == NilClass
                pairs.push("%s => %s" % [k,'nil'])
            else
                pairs.push("%s => %s" % [k,v])
            end
        }
        return "%s\n" % pairs.join(sep) 
    end
    
    def uimessage(msg, level=0)
        printf "%s\n" % msg.rstrip()
    end
    
    def write(filename='')
        if filename == ''
            filename = @filename
        end
        text = ["#",
                "# .config.rb",
                "#",
                "# This file is generated by a script.",
                "# Do not change unless you know what you\'re doing!",
                "",
                self.to_s].join("\n")
        begin
            f = File.new(filename, 'w')
            f.write(text)
            f.close()
            uimessage("=> wrote file '#{filename}'")
            filename = @filename
        rescue => e
            uimessage("ERROR creating preferences file '#{@filepath}'!")
            uimessage("Preferences will not be saved.")
        end
    end
        
end


def test_config
    rtc = RunTimeConfig.new()
    printf "\n%s\n" % rtc.to_s
    rtc.write()
    rtc.readConfig()
    printf "\n%s\n" % rtc.to_s
    ## paths to utility programs
    paths = {'REPLMARKS' => '/some/path/to/replmarks',
             'CONVERT'   => '/some/path/to/convert',
             'RA_PPM'    => '/usr/local/bin/ra_ppm',
             'OBJ2MESH'  => '/usr/local/bin/obj2mesh'}
    rtc.applyDict(paths, 'testpaths.dict')
    printf "\n%s\n" % rtc.to_s
end

#test_config()

