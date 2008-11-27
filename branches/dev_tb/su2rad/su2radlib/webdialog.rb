
require 'sketchup.rb'
require 'radiance_entities.rb'

module JSONUtils
    
    def escapeCharsJSON(s)
        s.gsub('"','\\\\\\"').gsub("'","\\\\'")
    end

    def myEscape(string)
        string.gsub(/([^ a-zA-Z0-9_.-]+)/n) do
            '%' + $1.unpack('H2' * $1.size).join('%').upcase
        end.tr(' ', '+')
    end
    
    def getJSONDictionary(dict)
        if(dict == nil)
            return "{}"
        else
            json = "["
            dict.each_key { |k|
                json += '{'
                json += '"name":"' + k + '",'
                if(dict[k].class != Geom::Transformation)
                    json += '"value":"' + escapeCharsJSON(dict[k].to_s) + '"},'
                else
                    json += '"value":"' + escapeCharsJSON(dict[k].to_a.to_s) + '"},'
                end
            }
            json += ']'
        end
        json.gsub!(/,/,"#COMMA#")
        return json
    end

    def toStringJSON(obj, level=0)
        if obj.class == Array
            str = '['
            obj.each { |e|
                str += " %s," % toStringJSON(e,1)
            }
            str = str.chop()
            str += ' ]'
            if level == 0 
                str = "{ %s }" % str
            end
        elsif obj.class == FalseClass
            str = 'false'
        elsif obj.class == Fixnum or obj.class == Bignum
            str = "%s" % obj
        elsif obj.class == Float
            str = "%f" % obj
        elsif obj.class == Hash
            str = '{'
            obj.each_pair { |k,v|
                str += " %s : %s," % [toStringJSON(k,1),toStringJSON(v,1)]
            }
            str = str.chop()
            str += ' }' 
        elsif obj.class == String
            str = "'%s'" % obj
        elsif obj.class == TrueClass
            str = 'true'
        else
            str = "'%s'" % obj
        end
        return str
    end

    def pprintJSON(json, text="\njson string:")
        ## prettyprint JSON string
        printf "#{text}\n"
        printf json.gsub!(/#COMMA#\{/,"\n\{")
        printf "\n"
        
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


class ExportOptions

    include JSONUtils

    attr_reader :sceneName
    attr_reader :scenePath
    
    def initialize
        @scenePath = $export_dir
        @sceneName = $scene_name
        @triangulate = $TRIANGULATE
        @textures = $TEXTURES
        @exportMode = $MODE
        @global_coords = $MAKEGLOBAL
    end

    def setDialogOptions(dlg)
        ## disable 'global_coords' option in dialog if not available
        if $REPLMARKS != '' and File.exists?($REPLMARKS)
            dlg.execute_script('enableGlobalOption()')
        else
            dlg.execute_script('disableGlobalOption()')
            if $MODE == 'by group'
                $MODE = 'by color'
            end
            $MAKEGLOBAL = true
        end
    end
    
    def setOptionsFromString(dlg, params)
        ## set export options from string <p>
        pairs = params.split("&")
        pairs.each { |pair|
            k,v = pair.split("=")
            if (v == 'true' || v == 'false')
                eval("@%s = %s" % [k,v])
            else
                eval("@%s = '%s'" % [k,v])
            end
        }
        #pprintJSON(toJSON(), "\nnew values:")
    end

    def toJSON
        ## collect export options and return JSON string
        dict = Hash.new()
        dict['scenePath'] = @scenePath
        dict['sceneName'] = @sceneName
        dict['triangulate'] = @triangulate
        dict['textures'] = @textures
        dict['exportMode'] = @exportMode
        dict['global_coords'] = @global_coords
        #TODO render options
        json = getJSONDictionary(dict)
        return json
    end
    
end


class RenderOptions

    include JSONUtils

    def setOptionsFromString(dlg, params)
        ## set export options from string <p>
        pairs = params.split("&")
        printf "\nnew RenderOptions:\n"
        pairs.each { |pair|
            k,v = pair.split("=")
            printf "  => %12s : %s\n" % [k,v]
            if (v == 'true' || v == 'false')
                eval("@%s = %s" % [k,v])
            else
                eval("@%s = '%s'" % [k,v])
            end
        }
        printf "\n"
    end
    
    def loaded?(path)
        ## return true if <path> is already loaded
        printf "TODO: RenderOptions.loaded?()\n"
        return false
    end
    
    def toJSON
        return ''
    end
    
end


class ExportDialogWeb
    
    include JSONUtils

    def initialize
        printf "ExportDialogWeb.intiialize()\n"
        @selectedViews = {}
        @exportOptions = ExportOptions.new()
        @renderOptions = RenderOptions.new()
        
        @sinfo_unused = ['DisplayNorth', 'EdgesCastShadows', 'Light', 'Dark', 
                         'SunRise', 'SunRise_time_t',
                         'SunSet', 'SunSet_time_t',
                         'DisplayOnAllFaces', 'DisplayOnGroundPlane']
    end

    def _initExportOptions(dlg, p='')
        ## set general export options
        printf "\n_initExportOptions() ... "
        @exportOptions.setDialogOptions(dlg)
        json = @exportOptions.toJSON()
        dlg.execute_script("setExportOptionsJSON('%s')" % json )
        printf " done\n"
    end 
    
    def loadTextFile(dlg, filepath)
        text = ''
        if File.exists?(filepath)
            f = File.open(filepath, 'r')
            text = f.read()
            text = myEscape(text)
        end
        dlg.execute_script("loadFileCallback('%s')" % text)
    end
    
    def getViewsList(dlg,p='')
        ## build and return JSON string of views (scenes)
        printf ("\ngetViewsList() ... ")
        json = "["
        pages = Sketchup.active_model.pages
        nViews = 0
        if pages.count == 0
            json += "{\"name\":\"%s\",\"selected\":\"false\",\"current\":\"%s\"}" % ['unnamed_view', true]
            nViews = 1
        else 
            pages.each { |page|
                current = "false"
                if page == pages.selected_page
                    current = "true"
                    @selectedViews[page.name] = true
                elsif page.use_camera? != true
                    next
                end
                json += ",{\"name\":\"%s\",\"selected\":\"false\",\"current\":\"%s\"}" % [page.name, current]
                nViews += 1
            }
        end
        json += "]"
        json.gsub!(/,/,"#COMMA#")
        dlg.execute_script("setViewsListJSON('%s')" % json )
        printf "done [%d views]\n" % nViews
        #pprintJSON(json)
    end

    def setViewsSelection(d,p)
        printf "\nsetViewsSelection() p='%s'\n" % p 
        viewname, state = p.split('&')
        if state == 'selected'
            @selectedViews[viewname] = true
        else
            @selectedViews.delete(viewname) {|v| printf "error: view '%s' not found\n" % v}
        end 
        @selectedViews.each_key { |k|
            printf "    %s\n" % k
        }
    end

    def getSkyCommand()
        rsky = RadianceSky.new()
        txt = rsky.getGenSkyOptions()
        #TODO: update from attributes
        return txt
    end
    
    def getShadowInfo(d,p='')
        ## get shadow_info dict and apply to dialog
        printf "\ngetShadowInfo() ... "
        sinfo = Sketchup.active_model.shadow_info
        dict = {}
        sinfo.each { |k,v| dict[k] = v }
        @sinfo_unused.each { |k| dict.delete(k) }
        dict['SkyCommand'] = getSkyCommand()
        json = getJSONDictionary(dict)
        d.execute_script( "setShadowInfoJSON('%s')" % json )
        printf "done\n"
        printf "SkyCommand: %s\n" % getSkyCommand()
    end

    def setShadowInfoValues(d,p)
        ## set shadow_info values from dialog
        sinfo = Sketchup.active_model.shadow_info
        pairs = p.split("&")
        pairs.each { |pair|
            k,v = pair.split("=")
            begin
                sinfo[k] = Float(v)
            rescue => e
                sinfo[k] = v
            end
        }
    end
        
    def show(title="dialog_TEST")
        ## create and show WebDialog
        dlg = UI::WebDialog.new(title, true, nil, 600, 750, 50, 50, true);
            
        ## export and cancel actions
        dlg.add_action_callback("onCancel") { |d,p|
            printf "closing dialog ...\n"
            d.close();
        }
        dlg.add_action_callback("onExport") {|d,p|
            printf "TODO: starting export ...\n"
        }
        
        dlg.add_action_callback("loadTextFile") {|d,p|
            loadTextFile(d,p);
        }
        
        ## update of ...Options objects
        dlg.add_action_callback("applyExportOptions") { |d,p|
            @exportOptions.setOptionsFromString(d,p)
            ## check if selected file path exists and enable 'load' button
            filepath = File.join(@exportOptions.scenePath,@exportOptions.sceneName)
            if File.exists?(filepath) && (@renderOptions.loaded?(filepath) == false)
                printf "enableing 'load' ...\n"
                d.execute_script("enableLoadSceneFile('%s')" % filepath)
            end
        }
        dlg.add_action_callback("applyRenderOptions") { |d,p|
            @renderOptions.setOptionsFromString(d,p)
        }
        
        ## shadow_info (location and sky)
        dlg.add_action_callback("getShadowInfo") { |d,p|
            ## get shadow_info dict and apply to dialog
            getShadowInfo(d,p)
        }
        dlg.add_action_callback("setShadowInfo") { |d,p|
            ## set shadow_info values from dialog
            setShadowInfoValues(d,p)
        }
        
        ## views
        dlg.add_action_callback("getViewsList") { |d,p|
            getViewsList(d,p)
        }
        dlg.add_action_callback("setViewsSelection") { |d,p|
            setViewsSelection(d,p)
        }
        
        #dlg.set_on_close {
        #}
        
        html = File.dirname(__FILE__) + "/html/su2rad_export.html";
        dlg.set_file(html, nil)
        
        ## show dialog
        dlg.show_modal {
            #if $DEBUG 
            #    dlg.execute_script("log.toggle()")
            #end
            dlg.execute_script("setSketchup()")
            _initExportOptions(dlg, '')
            getViewsList(dlg, '')
            getShadowInfo(dlg, '')
            dlg.execute_script("updateExportPage()")
        }
    end ## end def show

end ## end class exportDialogWeb

 
def test_showWebDialog()
    edw = ExportDialogWeb.new()
    edw.show()
end



begin 
    if (not file_loaded?("dialog_TEST.rb"))
        dmenu = UI.menu("Plugins")
        dmenu.add_item("dialog_TEST") { test_showWebDialog }
    end
rescue => e 
    msg = "%s\n\n%s" % [$!.message,e.backtrace.join("\n")]
    UI.messagebox msg            
    printf "dialog_TEST: entry to menu 'Plugin' failed:\n\n%s\n" % msg
end 
file_loaded("dialog_TEST.rb")
