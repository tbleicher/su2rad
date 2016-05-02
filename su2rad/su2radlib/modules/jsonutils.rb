
module SU2RAD

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
        
        # ecapeHTML from Ruby::CGI
        #
        # Escape special characters in HTML, namely &\"<>
        #   CGI::escapeHTML('Usage: foo "bar" <baz>')
        #      # => "Usage: foo &quot;bar&quot; &lt;baz&gt;"
        def JSONUtils::escapeHTML(string)
            string.gsub(/&/n, '&amp;').gsub(/\"/n, '&quot;').gsub(/>/n, '&gt;').gsub(/</n, '&lt;')
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

        def JSONUtils::toStringJSON(obj)
            if obj.class == Array
                str = "[%s]" % obj.collect{ |e| "%s" % toStringJSON(e) }.join(",")
            elsif obj.class == FalseClass
                str = 'false'
            elsif obj.class == Fixnum or obj.class == Bignum
                str = "%s" % obj
            elsif obj.class == Float
                str = "%f" % obj
            elsif obj.class == Hash
                str = "{%s}" % obj.collect{ |k,v| "%s:%s" % [toStringJSON(k),toStringJSON(v)] }.join(",")
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
        
        def setOptionsFromString(dlg, params, verbose=false)
            ## set export options from string <p>
            pairs = params.split("&")
            pairs.each { |pair|
                k,v = pair.split("=")
                old = eval("@%s" % k)
                if verbose
                    uimessage(" -  %s (old='%s')" % [pair, old], 2)
                end
                if (v == 'true' || v == 'false' || v =~ /\A[+-]?\d+\z/ || v =~ /\A[+-]?\d+\.\d+\z/)
                    val = eval("%s" % v)
                else
                    val = v
                    v = "'%s'" % v
                end
                if val != old
                    eval("@%s = %s" % [k,v])
                    msg = "#{self.class} new value for @%s: %s" % [k,v]
                    uimessage(msg)
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

        def vectorToJSON(v)
            return "[%.3f,%.3f,%.3f]" % v
        end
        
    end

end
