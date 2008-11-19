
require 'sketchup.rb'


module JSONUtils
    
    def escapeCharsJSON(s)
        s.gsub('"','\\\\\\"').gsub("'","\\\\'")
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





class ExportDialogWeb
    
    include JSONUtils

    def initialize()
        @selectedViews = {}
    end

    
    def getExportOptions(dlg, p='')
        ## collect and set general export options
        d = Hash.new()
        d['scenePath'] = $export_dir
        d['sceneName'] = $scene_name
        d['triangulate'] = $TRIANGULATE
        d['textures'] = $TEXTURES
        if $REPLMARKS != '' and File.exists?($REPLMARKS)
            dlg.execute_script('enableGlobalOption()')
        else
            dlg.execute_script('disableGlobalOption()')
            if $MODE == 'by group'
                $MODE = 'by color'
            end
            $MAKEGLOBAL = true
        end
        d['exportMode'] = $MODE
        d['global_coords'] = $MAKEGLOBAL
        #TODO render options
        json = getJSONDictionary(d)
        printf "\nJSON=\n%s\n" % json
        dlg.execute_script("setExportOptionsJSON(%s)" % json )
    end 
    
    
    
    
    def getViewsList(d,p='')
        ## build and return JSON string of views (scenes)
        printf ("getViewsList()\n")
        json = "["
        pages = Sketchup.active_model.pages
        #printf "pages.count=%d\n" % pages.count
        if pages.count == 0
            json += "{\"name\":\"%s\",\"selected\":\"false\",\"current\":\"%s\"}" % ['unnamed_view', true]
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
            }
        end
        json += "]"
        json.gsub!(/,/,"#COMMA#")
        d.execute_script("setViewsListJSON(%s)" % json )
    end

    
    def setViewSelection(d,p)
        printf "TEST: setViewsSelection() p='%s'\n" % p 
        viewname, state = p.split('&')
        if state == 'selected'
            @selectedViews[viewname] = true
        else
            @selectedViews.delete(viewname) {|v| printf "error: view '%s' not found\n" % v}
        end 
        @selectedViews.each_key { |k|
            printf "%15s\n" % k
        }
    end

    def getShadowInfo(d,p='')
        ## get shadow_info dict and apply to dialog
        sinfo = Sketchup.active_model.shadow_info
        dict = {}
        sinfo.each { |k,v| dict[k] = v }
        json = getJSONDictionary(dict)
        d.execute_script("setShadowInfoJSON(%s)" % json )
    end

    def setShadowInfoValues(d,p)
        ## set shadow_info values from dialog
        sinfo = Sketchup.active_model.shadow_info
        pairs = p.split(";")
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
        
        dlg.add_action_callback("on_close") { |d,p| d.close(); }
        ## would be called when dialog is loaded
        #dlg.add_action_callback("onload") {|d,p|
        #   pass
        #}
        
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
        dlg.add_action_callback("setViewSelection") { |d,p|
            setViewSelection(d,p)
        }
        
        ## "apply" button callback 
        dlg.add_action_callback("apply_action") {|d,p|
            #XXX read all text input variables to get latest changes
            #d.execute_script("getFinalValues()")
            d.close();
        }
        #dlg.set_on_close {
        #}
        
        html = File.dirname(__FILE__) + "/html/su2rad_export.html";
        dlg.set_file(html, nil)
        
        ## show dialog
        dlg.show_modal {
            #isize = 456
            #dlg.execute_script("setValue('image_size','%d')" % isize )
            if $DEBUG 
                dlg.execute_script("log.toggle()")
            end
            dlg.execute_script("setSketchup()")
            getExportOptions(dlg, '')
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
