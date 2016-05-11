module Tbleicher

  module Su2Rad

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

        ## path template
        'PATHTMPL'  => '$FILE/radiance/$PAGE.rif',
        
        ## paths to utility programs
        'REPLMARKS' => '',
        'CONVERT'   => '',
        'RA_PPM'    => '',
        'OBJ2MESH'  => '',

        ## misc and unused options
        'ZOFFSET'         => nil,
        'CONFIRM_REPLACE' => true,
        'RAD'             => '',
        'PREVIEW'         => false}

      @@_paths = ['REPLMARKS', 'CONVERT', 'RA_PPM', 'OBJ2MESH',
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
    
      def platform
        RUBY_PLATFORM =~ /darwin/ ? 'MAC' : 'WIN'
      end

      def initPaths
        uimessage("RunTimeConfig: initPaths() ...", 1)
        keys = ['REPLMARKS', 'CONVERT', 'RA_PPM', 'OBJ2MESH']
        paths = keys.map { |app| search_app(app) }

        keys.each_index { |idx|
          if paths[idx] 
            set(keys[idx], paths[idx])
            uimessage("  => found '#{keys[idx]}' in '#{paths[idx]}'", 1)
          else 
            uimessage("  => application '#{keys[idx]}' not found", -1)
          end
        }
      end

      def get_system_paths(var)
        paths = ENV.values_at(var)[0] || ""
        return paths.split(File::PATH_SEPARATOR).map { |p| p !~ /system/i ? p : "" }
      end

      def search_app(app)
        app = app.downcase()
        if platform == 'WIN'
          app += '.exe'
        end
        bindir = File.join(File.dirname(__FILE__), 'bin', platform)
        paths = [bindir] + get_system_paths('PATH') + get_system_paths('Path')
        app_paths = paths.map { |p| search_app_in_path(p, app) }
        app_paths.compact()[0]
      end

      def search_app_in_path(path, app)
        app_path = File.join(path, app)
        File.exists?(app_path) ? app_path : nil
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
        #printf "\nevalLines()\n"
        config = Hash.new()
        lines.each { |line|
          line.strip!() 
          #printf "line='%s'\n" % line
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
        text = [
          "#",
          "# .config.rb",
          "#",
          "# This file is generated by a script.",
          "# Do not change unless you know what you\'re doing!",
          "",
          self.to_s
          ].join("\n")

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

    end # end RunTimeConfig
  
  end # end Su2Rad

end # Tbleicher


