
require 'sketchup.rb'
require 'radiance_entities.rb'
require 'radiancescene.rb'
require 'export_modules.rb'
require 'exportbase.rb'


class ExportOptions

    include JSONUtils
    include InterfaceBase
    include RadiancePath

    attr_reader :sceneName
    attr_reader :scenePath
    
    def initialize
        setExportDirectory()
        @scenePath     = getConfig('SCENEPATH')
        @sceneName     = getConfig('SCENENAME')
        @triangulate   = getConfig('TRIANGULATE')
        @textures      = getConfig('TEXTURES')
        @exportMode    = getConfig('MODE')
        @global_coords = getConfig('MAKEGLOBAL')
    end
    
    def applyExportOptions(dlg,params)
        setOptionsFromString(dlg, params)
        ## check if selected file path exists and enable 'load' button
    end
    
    def _setDialogOptions(dlg)
        ## disable 'global_coords' option in dialog if not available
        replmarks = $SU2RAD_CONFIG.get('REPLMARKS')
        if replmarks != '' and File.exists?(replmarks)
            dlg.execute_script('enableGlobalOption()')
        else
            dlg.execute_script('disableGlobalOption()')
            if @exportMode == 'by group'
                @exportMode = 'by color'
            end
            @global_coords = true
        end
        print "TODO: texture option\n"
    end
    
    def setExportOptions(dlg, p='')
        ## set general export options
        uimessage("setExportOptions() ...", 2)
        _setDialogOptions(dlg)
        dlg.execute_script( "setExportOptionsJSON('%s')" % encodeJSON(toJSON()) )
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
        
    def writeOptionsToConfig(dlg,params='')
        ## apply export options to global config
        setConfig('TRIANGULATE', @triangulate)
        setConfig('TEXTURES', @textures)
        setConfig('MODE', @exportMode)
        setConfig('MAKEGLOBAL', @global_coords)
        setConfig('SCENEPATH', @scenePath)
        setConfig('SCENENAME', @sceneName)
    end

end



class RenderOptions

    include JSONUtils
    include InterfaceBase

    def initialize
        @Quality = 'medium'
        @Detail = 'medium'
        @Variability = 'high'
        @Indirect = 2
        @Penumbras = true
        @ImageType = 'normal'
        @ImageSizeX = 345
        @ImageSizeY = 512
        @ZoneSize = 10.0
        @ZoneType = 'interior'
        @Report = 0
        @ReportFile = getConfig('SCENENAME') + '.log'
        @render = '' 
        @filename = '' 
    end

    def applyRenderOptions(dlg,params)
        setOptionsFromString(dlg, params)
    end
   
    def loadSceneFile(path='')
        if path == ''
            scenePath = getConfig('SCENEPATH')
            sceneName = getConfig('SCENENAME')
            path = File.join(scenePath, sceneName + '.rif')
        end
        if File.exists?(path)
            begin
                f = File.new(path, 'r')
                text = f.read()
                f.close()
            rescue => e
                uimessage("#{self.class}: error reading file '#{path}'", -2)
                uimessage("\n%s\n\n%s\n" % [$!.message,e.backtrace.join("\n")],-2)
                return
            end
        end
        settings = parseRifFile(text)
        update(settings)
        if settings != {}
            @filename = path
        end
    end
    
    def loaded?(path)
        ## return true if <path> is already loaded
        if @filename == path
            return true
        end
        return false
    end
    
    def parseRifFile(text)
        if text == ''
            return false
        end
        printf "TODO: parseRifFile()\n"
        return true
    end
    
    def setRenderOptions(dlg, p='')
        ## set general export options
        uimessage("setRenderOptions() ...", 2)
        dlg.execute_script( "setRenderOptionsJSON('%s')" % encodeJSON(toJSON()) )
    end 
    
    def toJSON
        dict = Hash.new()
        dict['Quality'] = @Quality
        dict['Detail'] = @Detail
        dict['Variability'] = @Variability
        dict['Indirect'] = @Indirect
        dict['Penumbras'] = @Penumbras
        dict['ImageType'] = @ImageType
        dict['ImageSizeX'] = @ImageSizeX
        dict['ImageSizeY'] = @ImageSizeY
        dict['ZoneSize'] = @ZoneSize
        dict['ZoneType'] = @ZoneType
        dict['Report'] = @Report
        dict['ReportFile'] = @ReportFile
        dict['render'] = @render
        json = getJSONDictionary(dict)
        return json
    end

    def update(dict)
        printf "\nTODO: #{self.class}.update()\n"
    end

end



class SkyOptions
    
    include JSONUtils
    include InterfaceBase

    def initialize
        @rsky = RadianceSky.new()
        @_settings = Hash.new()
        @_sinfo_unused = ['DisplayNorth', 'EdgesCastShadows', 'Light', 'Dark', 
                          'SunRise', 'SunRise_time_t',
                          'SunSet', 'SunSet_time_t',
                          'DisplayOnAllFaces', 'DisplayOnGroundPlane']
        _syncSettings()
    end
    
    def applySkySettings(d,p)
        ## set shadow_info values from dialog
        pairs = _evalParams(p)
        pairs.each { |k,v|
            if (@_settings.has_key?(k) == false) || @_settings[k] != v
                uimessage("#{self.class} new value for '%s': '%s'\n" % [k,v])
                @_settings[k] = v
            end
        }
    end

    def _evalParams(param)
        ## evaluate string <param> to [k,v] pairs
        pairs = param.split("&")
        newpairs = []
        pairs.each { |pair| 
            k,v = pair.split("=")
            if (k == "City" || k == "Country" || k == "SkyCommand")
                newpairs.push([k,v])
            else
                begin
                    v = Float(v)
                    newpairs.push([k,v])
                rescue ArgumentError => e
                    v = v
                    uimessage("#{self.class}: ArgumentError for key '%s' (v='%s')" % [k,v], -2)
                end
            end
        }
        return newpairs
    end 
    
    def getSkyCommand()
        txt = @rsky.getGenSkyOptions()
        #TODO: update from attributes
        return txt
    end
    
    def setSkyOptions(dlg, params='')
        ## get shadow_info dict and apply to dialog
        printf "\nsetSkyOptions() ... "
        _syncSettings()
        dlg.execute_script( "setShadowInfoJSON('%s')" % encodeJSON(toJSON) )
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

    def writeSkySettingsToShadowInfo(d,p) 
        ## apply values in _settings to shadow_info
        sinfo = Sketchup.active_model.shadow_info
        uimessage("#{self.class} writeing new sky settings ...", 1)
        @_settings.each_pair { |k,v|
            if k == 'ShadowTime_time_t'
                printf "> old sinfo[%s] : %d\n" % [k,sinfo[k]]
                sinfo[k] = v.to_i
                printf "> new sinfo[%s] : %d\n" % [k,v.to_i]
                uimessage(" -> %s: %d" % [k,v.to_i], 1)
            else
                begin
                    sinfo[k] = v
                    uimessage(" -> %s: '%s'" % [k,v], 1)
                rescue AttributeError => e
                    uimessage("#{self.class} AttributeError at '%s' (v='%s')" % [k,v], -2)
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
    include InterfaceBase
    
    ## TODO:
    ## parse and format vectors
    
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
            uimessage("view '%s': value for '%s' not a float value [v='%s']" % [@name,k,v],-2)
        end
            
    end
    
    def _setViewVector(k, value)
        ## parse v as x,y,z tripple
        begin
            x,y,z = value.split().collect { |v| v.to_f }
            s = "%.3f %.3f %.3f" % [x,y,z]
            eval("@%s = '%s'" % [k,s])
        rescue
            uimessage("view '%s': value for '%s' not a vector [v='%s']" % [@name,k,v],-2)
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
            uimessage("view '%s': new value for '%s' = '%s'" % [@name,k,v])
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
                    uimessage("view '%s':\n%s" % [@name,$!.message], -2)
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
    include InterfaceBase

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
    
    def setViewsList(dlg,p='')
        ## build and return JSON string of views (scenes)
        printf ("\nsetViewsList() ... ")
        uimessage("#{self.class} setting views list ...", 2)
        json = "["
        @_views.each_value { |v|
            json += "%s, " % v.toJSON()
        }
        json += "]"
        dlg.execute_script("setViewsListJSON('%s')" % encodeJSON(json) )
        printf " done\n"
    end

    def showViews(indent="",loglevel=1)
        @_views.each_value { |v|
            uimessage("%sname='%s' - selected=%s\n" % [indent, v.name, v.selected], loglevel)
        }
    end

    def updateViews(a)
        a.each { |d|
            if not d.has_key?('name')
                uimessage("#{self.class} error: no 'name' for view", -2)
                next
            end
            viewname = d['name']
            if @_views.has_key?(viewname)
                view = @_views[viewname]
                begin
                    view.update(d)
                rescue => e
                    uimessage("#{self.class} error:\n%s\n\n%s\n" % [$!.message,e.backtrace.join("\n")],-2)
                    return false 
                end
            else
                uimessage("#{self.class} error: unknown view '%s'\n" % viewname, -2)
                showViews("   ", -2)
            end
        }
    end
    
end



class ExportDialogWeb < ExportBase
    
    include JSONUtils
    include InterfaceBase
    
    def initialize()
        printf "ExportDialogWeb.initialize()\n"
        @scene = RadianceScene.new()
        @exportOptions = ExportOptions.new()
        @renderOptions = RenderOptions.new()
        @skyOptions = SkyOptions.new()
        @viewsList = ViewsList.new()
    end

    def applyExportOptions(dlg, params='')
        @exportOptions.applyExportOptions(dlg,params)
        filepath = File.join(@exportOptions.scenePath,@exportOptions.sceneName)
        if File.exists?(filepath) && (@renderOptions.loaded?(filepath) == false)
            printf "enabling 'load' ...\n"
            dlg.execute_script("enableLoadSceneFile('%s')" % filepath)
        end
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
   
    def updateViewsFromString(d,p)
        ## convert <p> to Ruby array and update views
        begin
            views = eval(p)
        rescue => e 
            uimessage("#{self.class} applyViews(): %s\n\n%s\n" % [$!.message,e.backtrace.join("\n")], -2)
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
            @exportOptions.writeOptionsToConfig(d,p)
            d.execute_script('applyRenderOptions()')
            printf "TODO: writeRenderOptions()\n"
            printf "TODO: @scene.export() ...\n"
        }
        
        dlg.add_action_callback("loadTextFile") {|d,p|
            loadTextFile(d,p);
        }
        
        ## update of ...Options objects
        dlg.add_action_callback("applyExportOptions") { |d,p|
            applyExportOptions(d,p)
        }
        dlg.add_action_callback("applyRenderOptions") { |d,p|
            @renderOptions.applyRenderOptions(d,p)
        }
        
        ## shadow_info (location and sky)
        dlg.add_action_callback("getSkySettinge") { |d,p|
            ## get shadow_info dict and apply to dialog
            d.execute_script("setShadowInfoJSON('%s')" % encodeJSON(@skyOptions.toJSON()) )
        }
        dlg.add_action_callback("applySkySettings") { |d,p|
            ## set shadow_info values from dialog
            @skyOptions.applySkySettings(d,p)
        }
        dlg.add_action_callback("writeSkySettingsToShadowInfo") { |d,p|
            ## set shadow_info values from dialog
            @skyOptions.writeSkySettingsToShadowInfo(d,p) 
        }
        
        ## views
        dlg.add_action_callback("setViewsList") { |d,p|
            @viewsList.setViewsList(d,p)
        }
        dlg.add_action_callback("applyViews") { |d,p|
            updateViewsFromString(d,p)
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
            printf "setExportOptions()\n"
            @exportOptions.setExportOptions(dlg, '')
            printf "setRenderOptions()\n"
            @renderOptions.setRenderOptions(dlg, '')
            printf "setViewsList()\n"
            @viewsList.setViewsList(dlg, '')
            @skyOptions.setSkyOptions(dlg, '')
            dlg.execute_script("updateExportPage()")
        }
    end ## end def show

end ## end class exportDialogWeb

 
def test_showWebDialog()
    edw = ExportDialogWeb.new()
    edw.show()
end

