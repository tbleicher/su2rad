
class RunTimeConfig
   
    attr_reader :filename
        
    @@_dict = {'MODE'     => 'by color',
        'MAKEGLOBAL'     => false,
        'TRIANGULATE'    => false,
        'TEXTURES'       => true,

        'SHOWRADOPTS'    => false,
        'EXPORTALLVIEWS' => false,

        'LOGLEVEL'       => 2,
        'UNIT'           => 0.0254,
        'UTC_OFFSET'     => nil,

        ## paths template
        'EXPORT PATH' => '$FILE/radiance/$PAGE.rif',
        
        ## paths to utility programs
        'REPLMARKS' => '/usr/local/bin/replmarks',
        'CONVERT'   => '/usr/local/bin/convert',
        'RA_TIFF'   => '/usr/local/bin/ra_tiff',
        'OBJ2MESH'  => '/usr/local/bin/obj2mesh',

        ## library options
        'MATERIALLIB'        => '/usr/local/lib/ray/lib/material.rad',
        'SUPPORTDIR'         => '/Library/Application Support/Google Sketchup 6/Sketchup',
        'BUILD_MATERIAL_LIB' => false,

        ## misc and unused options
        'ZOFFSET'         => nil,
        'CONFIRM_REPLACE' => true,
        'RAD'             => '',
        'PREVIEW'         => false}
        
    def initialize
        @filename = File.expand_path('_config.rb', File.dirname(__FILE__))
        initPaths
    end

    def initPaths
        keys = ['REPLMARKS', 'CONVERT', 'RA_TIFF', 'OBJ2MESH']
        bindir = File.join(File.dirname(__FILE__), 'bin', $OS)
        keys.each { |k|
            app = k.downcase()
            binpath = File.join(bindir, app)
            if File.exists?(binpath)
                set(k, binpath)
                uimessage("found '#{app}' in '#{bindir}'") 
            elsif $OS == 'MAC'
                p = IO.popen('which %s' % app)
                lines = p.readlines()
                p.close()
                if lines != []
                    path = lines[0].strip()
                    if File.exists?(path)
                        set(k, path)
                        uimessage("found '#{app}' in '#{path}'")
                    end
                end
            elsif ENV.has_key?('Path')
                ENV['Path'].split(File::PATH_SEPARATOR).each { |p|
                    path = File.join(p, app)
                    if File.exists?(path)
                        set(k, path)
                        uimessage("found '#{app}' in '#{path}'")
                    end
                }
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
        @@_dict[key] = value
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
                printf msg
                return false
            end
        end
        su2rad_config = _evalLines(lines)
        if su2rad_config.class == Hash
            printf "=> updating config from file '#{@filename}' ...\n"
            @filename = filename
            @@_dict.update(su2rad_config)
        end
    end 
    
    def _evalLines(lines)
        printf "\nevalLines()\n"
        config = Hash.new()
        lines.each { |line|
            line.strip!() 
            printf "line='%s'\n" % line
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
        config = _consolidate(config)
        return config       
    end
    
    def _consolidate(config)
        ## convert strings to objects
        config.each_pair { |k,v|
            if k == 'LOGLEVEL'
                config[k] = Integer(v)
            elsif k == 'UNIT'
                config[k] = Float(v)
            elsif v == 'true'
                config[k] = nil
            elsif v == 'false'
                config[k] = false
            elsif v == 'nil'
                config[k] = nil
            elsif k == 'ZOFFSET'
                config[k] = Float(v)
            elsif k == 'UTC_OFFSET'
                config[k] = Float(v)
            end
            printf " k=%s config[k]='%s'\t\tclass=%s\n" % [k,config[k],config[k].class]
        }    
        return config       
    end 
    
    def to_s(sep="\n")
        pairs = []
        @@_dict.each_pair { |k,v|
            if v == false
                pairs.push("%s => %s" % [k,'false'])
            elsif v.class == NilClass
                pairs.push("%s => %s" % [k,'nil'])
            else
                pairs.push("%s => %s" % [k,v])
            end
        }
        return "%s\n" % pairs.join(sep) 
    end
    
    def uimessage(msg)
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
            printf "=> wrote file '#{filename}'\n"
            filename = @filename
        rescue => e
            printf "ERROR creating preferences file '#{@filepath}'!\n"
            printf "Preferences will not be saved.\n"
        end
    end
        
end


def test_config
    rtc = RunTimeConfig.new()
    printf "\n%s\n" % rtc.to_s
    rtc.write()
    rtc.readConfig()
    printf "\n%s\n" % rtc.to_s
end

#test_config()

