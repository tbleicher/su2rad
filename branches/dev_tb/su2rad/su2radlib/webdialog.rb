
require 'sketchup.rb'
require 'radiance_entities.rb'
require 'radiancescene.rb'



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
            dict.each_key { |k|
                json += '{'
                json += '"name":"' + k + '",'
                if(dict[k].class != Geom::Transformation)
                    json += '"value":"' + dict[k].to_s + '"},'
                else
                    json += '"value":"' + dict[k].to_a.to_s + '"},'
                end
            }
            json += ']'
        end
        #json.gsub!(/,/,"#COMMA#")
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
        @triangulate = $SU2RAD_CONFIG.get('TRIANGULATE')
        @textures = $SU2RAD_CONFIG.get('TEXTURES')
        @exportMode = $SU2RAD_CONFIG.get('MODE')
        @global_coords = $SU2RAD_CONFIG.get('MAKEGLOBAL')
    end
    
    def applyExportOptions(dlg,params='')
        ## apply export options to global config
        $SU2RAD_CONFIG['TRIANGULATE'] = @triangulate
        $SU2RAD_CONFIG['TEXTURES']    = @textures 
        $SU2RAD_CONFIG['MODE']        = @exportMode 
        $SU2RAD_CONFIG['MAKEGLOBAL']  = @global_coords
        $SU2RAD_CONFIG['export_dir']  = @scenePath 
        $SU2RAD_CONFIG['scene_name']  = @sceneName 
    end

    def setDialogOptions(dlg)
        ## disable 'global_coords' option in dialog if not available
        replmarks = @textures = $SU2RAD_CONFIG.get('REPLMARKS')
        if replmarks != '' and File.exists?(replmarks)
            dlg.execute_script('enableGlobalOption()')
        else
            dlg.execute_script('disableGlobalOption()')
            if @exportMode == 'by group'
                @exportMode = 'by color'
            end
            @global_coords = true
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


class SkyOptions
    
    include JSONUtils

    def initialize
        @_settings = Hash.new()
        @_sinfo_unused = ['DisplayNorth', 'EdgesCastShadows', 'Light', 'Dark', 
                          'SunRise', 'SunRise_time_t',
                          'SunSet', 'SunSet_time_t',
                          'DisplayOnAllFaces', 'DisplayOnGroundPlane']
        _syncSettings()
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
        _syncSettings()
        json = getJSONDictionary(@_settings)
        d.execute_script( "setShadowInfoJSON('%s')" % encodeJSON(json) )
        printf "done\n"
    end

    def _syncSettings() 
        sinfo = Sketchup.active_model.shadow_info
        dict = {}
        sinfo.each { |k,v| dict[k] = v }
        @_sinfo_unused.each { |k| dict.delete(k) }
        dict['SkyCommand'] = getSkyCommand()
        @_settings.update(dict)
    end
        
    def toJSON
        json = getJSONDictionary(@_settings)
        return json
    end
    
    def _evalParams(param)
        ## evaluate string <param> to [k,v] pairs
        pairs = param.split("&")
        newpairs = []
        pairs.each { |pair| 
            k,v = pair.split("=")
            begin
                v = Float(v)
            rescue => e
                v = v
            end
            newpairs.push([k,v])
        }
        return newpairs
    end 
    
    def writeSkySettings(d,p)
        ## set shadow_info values from dialog
        pairs = _evalParams(p)
        pairs.each { |k,v|
            #printf "writeSkySettings: k='%s'  v='%s'\n" % [k,v]
            if (@_settings.has_key?(k) == false) || @_settings[k] != v
                printf "skySettings: new value for '%s': '%s'\n" % [k,v]
                @_settings[k] = v
            end
        }
    end

    def applySkySettingsToShadowInfo(d,p) 
        ## apply values in _settings to shadow_info
        printf "\n"
        sinfo = Sketchup.active_model.shadow_info
        @_settings.each_pair { |k,v|
            if k == 'ShadowTime_time_t'
                printf "> old sinfo[%s] : %d\n" % [k,sinfo[k]]
                sinfo[k] = v.to_i
                printf "> new sinfo[%s] : %d\n" % [k,v.to_i]
            else
                begin
                    sinfo[k] = v
                    printf "> sinfo[%s] : %s\n" % [k,v]
                rescue => e
                    # attribute error
                    printf "  TEST - error: %s (k=%s)\n" % [e,k] 
                end
            end
        }
        @_settings['ShadowTime'] = sinfo['ShadowTime']
        @_settings['ShadowTime_time_t'] = sinfo['ShadowTime_time_t']
        d.execute_script("setShadowInfoJSON('%s')" % encodeJSON(toJSON()) )
    end
        
end


class SketchupView
    
    attr_reader :name
    attr_reader :selected
    attr_reader :current
    attr_writer :selected
    
    include JSONUtils
    
    def initialize (name, current=false)
        @name = name
        @current = current
        @vt = "v";
        @vp = "0 0 1";
        @vd = "0 1 0";
        @vu = "0 0 1";
        @va = 0.0;
        @vo = 0.0;
        @vv = 60.0;
        @vh = 60.0;
        if current == true
            @selected = true
        else
            @selected = false
        end
    end

    def getOptions
        text = "rvu -vt#{@vt} -vp #{@vp} -vd #{@vd} -vu #{@vu}"
        text +=  " -vv #{@vv} -vh #{@vh} -vo #{@vo} -va #{@va}"
        return text
    end 
    
    def toJSON
        text = "{\"name\":\"%s\", " % @name
        text += "\"selected\":\"%s\", \"current\":\"%s\", " % [@selected, @current]
        text += "\"vt\":\"#{@vt}\", \"vp\":\"#{@vp}\", \"vd\":\"#{@vd}\", \"vu\":\"#{@vu}\", " 
        text += "\"vv\":\"#{@vv}\", \"vh\":\"#{@vh}\", \"vo\":\"#{@vo}\", \"va\":\"#{@va}\", "
        text += "\"options\":\"%s\"}" % getOptions()
        return text
    end
    
    def _setFloatValue(k, v)
        begin
            #val = parseFloat(v)
            eval("@%s = %s" % [k,v])
        rescue
            printf "Error: value for '#{k}' not a float value [v='#{v}']\n"
        end
            
    end
    
    def _setViewVector(k, value)
        ## parse v as x,y,z tripple
        begin
            x,y,z = value.split().collect { |v| v.to_f }
            s = "%.3f %.3f %.3f" % [x,y,z]
            eval("@%s = '%s'" % [k,s])
        rescue
            printf "Error: value for '#{k}' not a view vector [v='#{value}']\n"
        end
    end
   
    def _setViewOption(k,v)
        #printf "#{@name}: _setViewOption('%s', '%s')\n" % [k,v] 
        if v == 'true'
            v = true
        elsif v == 'false'
            v = false
        end
        value = eval("@%s" % k)
        #printf "TEST: k='%s'  eval(@%s)=%s\n" % [k,k,value]
        if v != value
            printf "view '%s': new value for '%s' = '%s'\n" % [@name,k,v]
            if (v == 'true' || v == 'false')
                eval("@%s = %s" % [k,v])
            elsif (v.class == TrueClass || v.class == FalseClass)
                eval("@%s = %s" % [k,v])
            else
                eval("@%s = '%s'" % [k,v])
            end
        end
    end
    
    def update(dict)
        dict.each_pair { |k,v|
            if (k == 'vp' || k == 'vd' || k == 'vu')
                _setViewVector(k, v)
            elsif (k == 'vo' || k == 'va' || k == 'vv' || k == 'vh')
                _setFloatValue(k, v)
            else
                begin
                    _setViewOption(k,v)
                rescue => e
                    printf "view '%s':\n%s\n" % [@name,$!.message]
                end
            end
        }       
    end
    
    def setViewParameters(camera)
        @vp = "%.3f %.3f %.3f" % [camera.eye.x*$UNIT, camera.eye.y*$UNIT, camera.eye.z*$UNIT]
        @vd = "%.3f %.3f %.3f" % [camera.zaxis.x, camera.zaxis.y, camera.zaxis.z]
        @vu = "%.3f %.3f %.3f" % [camera.up.x, camera.up.y, camera.up.z]
        imgW = Sketchup.active_model.active_view.vpwidth.to_f
        imgH = Sketchup.active_model.active_view.vpheight.to_f
        aspect = imgW/imgH
        if camera.perspective?
            @vt = 'v'
            if aspect > 1.0
                @vv = camera.fov
                @vh = _getFoVAngle(@vv, imgH, imgW)
            else
                @vh = camera.fov
                @vv = _getFoVAngle(@vh, imgW, imgH)
            end
        else
            @vt = 'v'
            @vv = camera.height*$UNIT
            @vh = @vv*aspect
        end
    end
    
    def _getFoVAngle(ang1, side1, side2)
        ang1_rad = ang1*Math::PI/180.0
        dist = side1 / (2.0*Math::tan(ang1_rad/2.0))
        ang2_rad = 2 * Math::atan2(side2/(2*dist), 1)
        ang2 = (ang2_rad*180.0)/Math::PI
        return ang2
    end
end

class ViewsList
    
    include JSONUtils

    def initialize
        @_views = {}
        initViews()
    end

    def initViews
        pages = Sketchup.active_model.pages
        if pages.count == 0
            view = SketchupView.new("unnamed_view", true)
            @_views[view.name] = view
        else
            pages.each { |page|
                viewname = replaceChars(page.name)
                if page == pages.selected_page
                    view = SketchupView.new(viewname, true)
                    view.setViewParameters(page.camera)
                    @_views[view.name] = view
                elsif page.use_camera? == true
                    view = SketchupView.new(viewname)
                    view.setViewParameters(page.camera)
                    @_views[view.name] = view
                end
            }
        end
    end
    
    def getViewsList(dlg,p='')
        ## build and return JSON string of views (scenes)
        printf ("\ngetViewsList() ... ")
        json = "["
        @_views.each_value { |v|
            json += "%s, " % v.toJSON()
        }
        json += "]"
        dlg.execute_script("setViewsListJSON('%s')" % encodeJSON(json) )
        printf " done\n"
    end

    def showViews(indent="")
        @_views.each_value { |v|
            printf "%sname='%s' - selected=%s\n" % [indent,v.name, v.selected]
        }
    end

    def updateViews(a)
        a.each { |d|
            if not d.has_key?('name')
                printf "ERROR: no 'name' for view\n"
                next
            end
            viewname = d['name']
            if @_views.has_key?(viewname)
                view = @_views[viewname]
                begin
                    view.update(d)
                rescue => e
                    printf "%s\n\n%s\n" % [$!.message,e.backtrace.join("\n")]
                    return false 
                end
            else
                printf "ERROR: unknown view '%s'\n" % viewname
                printf "views=\n"
                showViews("   ")
            end
        }
        #showViews()
    end
    
end



class ExportDialogWeb
    
    include JSONUtils

    def initialize(scene=nil)
        printf "ExportDialogWeb.initialize()\n"
        if scene == nil
            @scene = RadianceScene.new()
        else
            @scene = scene
        end
        @exportOptions = ExportOptions.new()
        @renderOptions = RenderOptions.new()
        @skyOptions = SkyOptions.new()
        @viewsList = ViewsList.new()
    end

    def _initExportOptions(dlg, p='')
        ## set general export options
        printf "\n_initExportOptions() ... "
        @exportOptions.setDialogOptions(dlg)
        json = @exportOptions.toJSON()
        dlg.execute_script("setExportOptionsJSON('%s')" % encodeJSON(json) )
        printf " done\n"
    end 
    
    def loadTextFile(dlg, filepath)
        text = ''
        if File.exists?(filepath)
            f = File.open(filepath, 'r')
            text = f.read()
            text = urlEncode(text)
        end
        dlg.execute_script("loadFileCallback('%s')" % text)
    end
    

    def applyViews(d,p)
        ## select/deselect individual views
        #printf "\napplyViews() p=\n'%s'\n\n" % p
        begin
            views = eval(p)
        rescue => e 
            printf "%s\n\n%s\n" % [$!.message,e.backtrace.join("\n")]
            return
        end
        ## apply info to views
        @viewsList.updateViews(views)
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
            @exportOptions.applyExportOptions(d,p)
            printf "TODO: setOptions()\n"
            printf "TODO: @scene.export() ...\n"
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
                printf "enabling 'load' ...\n"
                d.execute_script("enableLoadSceneFile('%s')" % filepath)
            end
        }
        dlg.add_action_callback("applyRenderOptions") { |d,p|
            @renderOptions.setOptionsFromString(d,p)
        }
        
        ## shadow_info (location and sky)
        dlg.add_action_callback("getSkySettinge") { |d,p|
            ## get shadow_info dict and apply to dialog
            d.execute_script("setShadowInfoJSON('%s')" % encodeJSON(@skyOptions.toJSON()) )
        }
        dlg.add_action_callback("writeSkySettings") { |d,p|
            ## set shadow_info values from dialog
            @skyOptions.writeSkySettings(d,p)
        }
        dlg.add_action_callback("applySkySettingsToShadowInfo") { |d,p|
            ## set shadow_info values from dialog
            @skyOptions.applySkySettingsToShadowInfo(d,p) 
        }
        
        ## views
        dlg.add_action_callback("getViewsList") { |d,p|
            @viewsList.getViewsList(d,p)
        }
        dlg.add_action_callback("applyViews") { |d,p|
            applyViews(d,p)
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
            printf "setSketchup()\n"
            dlg.execute_script("setSketchup()")
            printf "_initExportOptions()\n"
            _initExportOptions(dlg, '')
            printf "getViewsList()\n"
            @viewsList.getViewsList(dlg, '')
            dlg.execute_script( "setShadowInfoJSON('%s')" % encodeJSON(@skyOptions.toJSON()) )
            dlg.execute_script("updateExportPage()")
        }
    end ## end def show

end ## end class exportDialogWeb

 
def test_showWebDialog()
    edw = ExportDialogWeb.new()
    edw.show()
end

