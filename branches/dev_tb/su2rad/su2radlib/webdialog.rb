
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
        uimessage("ExportOptions.initialize()", 2)
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
        replmarks = getConfig('REPLMARKS')
        if replmarks != '' and File.exists?(replmarks)
            uimessage("'replmarks' found => keeping 'global coords' options", 1)
            #todo? dlg.execute_script('enableGlobalOption()')
        else
            uimessage("'replmarks' not found => disabling 'global coords' options", -1)
            dlg.execute_script('disableGlobalOption()')
            if @exportMode == 'by group'
                @exportMode = 'by color'
            end
            @global_coords = true
        end
        
        convert = getConfig('CONVERT')
        ra_ppm = getConfig('RA_PPM')
        if convert != '' and ra_ppm != '' and File.exists?(convert) and File.exists?(ra_ppm)
            uimessage("'convert' found => keeping 'textures' options", 1)
        else
            uimessage("'convert' not found => disabling 'textures' options", -1)
            dlg.execute_script('disableTextureOption()')
            @textures = false
        end
            
        if @exportMode != 'by color'
            @textures = false
        end
    end
    
    def setExportOptions(dlg, p='')
        ## set general export options
        uimessage("setExportOptions() ...", 2)
        _setDialogOptions(dlg)
        json = toJSON()
        dlg.execute_script( "setExportOptionsJSON('%s')" % encodeJSON(json) )
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
        json = getJSONDictionary(dict)
        return json
    end
        
    def writeOptionsToConfig()
        ## apply export options to global config
        setConfig('TRIANGULATE', @triangulate)
        setConfig('TEXTURES', @textures)
        setConfig('MODE', @exportMode)
        setConfig('MAKEGLOBAL', @global_coords)
        setConfig('SCENEPATH', @scenePath)
        setConfig('SCENENAME', @sceneName)
    end

end


class RifFile

    attr_reader :settings, :filename
        
    def initialize(path='')
        @filename = ''
        @_isValid = true
        @settings = getDefaults()
        if path != ''
            readFile(path)
        end
    end

    def isValid?
        ## return true if file is a correct rif file
        return false
    end
    
    def getDefaults
        d = Hash.new()
        d["Quality"] = 'medium'
        d["Detail"] = 'medium'
        d["Variability"] = 'high'
        d["Indirect"] = 2
        d["Penumbras"] = true
        d["ImageType"] = 'normal'
        d["ImageSizeX"] = 512
        d["ImageSizeY"] = 512
        d["ZoneSize"] = 10.0
        d["ZoneType"] = 'exterior'
        d["Report"] = 0
        d["ReportFile"] = getConfig('SCENENAME') + '.log'
        d["render"] = '' 
        return d
    end
    
    def readFile(path)
        @_isValid = false
        printf "TODO: RifFile.parseFile('%s')\n" % path
        #@_isValid = true
        @filename = path
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
        @ImageSizeX = 512
        @ImageSizeY = 512
        @ImageAspect = 1.0
        @ZoneSize = 10.0
        @ZoneType = 'exterior'
        @Report = 0
        @ReportFile = getConfig('SCENENAME') + '.log'
        @render = ''
        @oconv = '-w'
        @filename = ''
        update()
    end
    
    def applyRenderOptions(dlg,params)
        setOptionsFromString(dlg, params)
    end
  
    def getRifOptionsText
        zone = "%s 0 %.1f 0 %.1f 0 %.1f" % [@ZoneType, @ZoneSize, @ZoneSize, @ZoneSize]
        lines = ["# scene options file for rad\n",
            "QUALITY=     %s" % @Quality,
            "DETAIL=      %s" % @Detail,
            "VARIABILITY= %s" % @Variability,
            "INDIRECT=    %s" % @Indirect,
            "PENUMBRAS=   %s" % @Penumbras]
        if $SU2RAD_DEBUG == true
            lines = lines.collect { |l| "#%s" % l }
            lines += ["\n# test settings for DEBUG option",
                "QUALITY=     low",
                "DETAIL=      low",
                "VARIABILITY= medium",
                "INDIRECT=    1",
                "PENUMBRAS=   true"]
        end
        lines += ["",
            "PICTURE=     images/%s" % getConfig('PROJECT'),
            "RESOLUTION=  %s %s" % [@ImageSizeX, @ImageSizeY],
            "ZONE=        %s" % zone,
            "EXPOSURE=    %s" % "-2",
            "",
            "REPORT=      %s logfiles/%s" % [@Report, @ReportFile],
            "AMBFILE=     ambfiles/#{getConfig('SCENENAME')}.amb",
            "OCTREE=      octrees/#{getConfig('SCENENAME')}.oct",
            "scene=       #{getConfig('SCENENAME')}.rad",
            "",]
        if $SU2RAD_DEBUG == true
            lines.push("#render=      %s\n" % @render)
        else
            lines.push("render=      %s\n" % @render)
        end
        lines.push("oconv=      %s\n" % @oconv)
        return lines.join("\n")
    end
    
    def loadSceneFile(path='')
        if path == ''
            scenePath = getConfig('SCENEPATH')
            sceneName = getConfig('SCENENAME')
            path = File.join(scenePath, sceneName + '.rif')
        end
        if File.exists?(path)
            rif = RifFile(path)
            if rif.isValid? == true
                updateFromDict(rif.settings)
                @filename = rif.filename
            end
        end
    end
    
    def loaded?(path)
        ## return true if <path> is already loaded
        if @filename == path
            return true
        end
        return false
    end
    
    def setRenderOptions(dlg, p='')
        ## set general export options
        uimessage("setRenderOptions() ...", 2)
        json = toJSON()
        dlg.execute_script( "setRenderOptionsJSON('%s')" % encodeJSON(json) )
    end 
    
    def toJSON
        dict = Hash.new()
        dict['Quality'] = @Quality
        dict['Detail'] = @Detail
        dict['Variability'] = @Variability
        dict['Indirect'] = @Indirect
        dict['Penumbras'] = @Penumbras
        dict['ImageType'] = @ImageType
        dict['ImageAspect'] = @ImageAspect
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

    def update
        @ImageSizeX = Sketchup.active_model.active_view.vpwidth
        @ImageSizeY = Sketchup.active_model.active_view.vpheight
        @ImageAspect = @ImageSizeX.to_f/@ImageSizeY.to_f
        @ZoneSize = Sketchup.active_model.bounds.diagonal*getConfig('UNIT')
    end 
    
    def updateFromDict(dict)
        dict.each_pair { |k,v|
            old = eval("@%s" % k)
            if old != v
                uimessage("new Value for %s: %s")
            end
            if v.class == String
                v = "'%s'" % v
            end
            begin
                eval("@%s = %s" % [k,v])
            rescue => e
                uimessage("RenderOptions.updateFromDict -  error in eval():", -2)
                uimessage("%s\n[k='%s'  v='%s'\n" % [$!.message, k, v], -2)
            end
        }
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
                uimessage("SkyOptions: new value for '%s': '%s'\n" % [k,v])
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
                    uimessage("SkyOptions: ArgumentError for key '%s' (v='%s')" % [k,v], -2)
                end
            end
        }
        return newpairs
    end 
    
    def getSkyCommand
        txt = @rsky.getGenSkyOptions()
        #TODO: update from attributes
        return txt
    end
   
    def getSettings
        return @_settings
    end
    
    def setSkyOptions(dlg, params='')
        ## get shadow_info dict and apply to dialog
        uimessage("setSkyOptions() ...\n", 2)
        _syncSettings()
        json = toJSON()
        dlg.execute_script( "setShadowInfoJSON('%s')" % encodeJSON(json) )
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
        uimessage("SkyOptions writing new sky settings ...", 1)
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
                    uimessage("SkyOptions AttributeError at '%s' (v='%s')" % [k,v], -2)
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
    include RadiancePath
    
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

    def createViewFile
        name = remove_spaces(@name)
        viewpath = File.join("views", "%s.vf" % name)
        filename = getFilename(viewpath)
        if not createFile(filename, getViewLine())
            msg = "Error: could not create view file '#{filename}'"
            uimessage(msg)
            return "## %s" % msg
        elsif @selected == true
            return "view=  #{name} -vf #{viewpath}"
        else
            return "# view=  #{name} -vf #{viewpath}"
        end
    end
    
    def getOptions
        text = "rvu -vt#{@vt} -vp #{@vp} -vd #{@vd} -vu #{@vu}"
        text +=  " -vv #{@vv} -vh #{@vh} -vo #{@vo} -va #{@va}"
        return text
    end 
    
    def getViewLine
        return getOptions()
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
        unit = getConfig('UNIT')
        @vp = "%.3f %.3f %.3f" % [camera.eye.x*unit, camera.eye.y*unit, camera.eye.z*unit]
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
            @vv = camera.height*unit
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

    def getViewLines
        lines = @_views.values.collect { |v| v.createViewFile() }
        return lines.join("\n")
    end
    
    def initViews
        pages = Sketchup.active_model.pages
        if pages.count == 0
            view = SketchupView.new("unnamed_view", true)
            view.setViewParameters(Sketchup.active_model.active_view.camera)
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
        uimessage("ViewsList: setting views list ...", 2)
        json = "["
        @_views.each_value { |v|
            json += "%s," % v.toJSON()
        }
        json += "]"
        dlg.execute_script("setViewsListJSON('%s')" % encodeJSON(json) )
    end

    def showViews(indent="",loglevel=1)
        @_views.each_value { |v|
            uimessage("%sname='%s' - selected=%s\n" % [indent, v.name, v.selected], loglevel)
        }
    end

    def updateViews(a)
        a.each { |d|
            if not d.has_key?('name')
                uimessage("ViewsList error: no 'name' for view", -2)
                next
            end
            viewname = d['name']
            if @_views.has_key?(viewname)
                view = @_views[viewname]
                begin
                    view.update(d)
                rescue => e
                    uimessage("ViewsList error:\n%s\n\n%s\n" % [$!.message,e.backtrace.join("\n")],-2)
                    return false 
                end
            else
                uimessage("ViewsList error: unknown view '%s'\n" % viewname, -2)
                showViews("   ", -2)
            end
        }
    end
    
end



class ExportDialogWeb < ExportBase
    
    include JSONUtils
    include InterfaceBase
    
    def initialize()
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
            printf "DEBUG: enabling 'load' ...\n"
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
 
    def show(title="su2rad")
        ## create and show WebDialog
        dlg = UI::WebDialog.new(title, true, nil, 650, 800, 50, 50, true);
        #dlg.set_background_color("0000ff")
            
        ## export and cancel actions
        dlg.add_action_callback("onCancel") { |d,p|
            uimessage("closing dialog ...")
            d.close();
        }
        dlg.add_action_callback("onExport") {|d,p|
            startExport(d,p)
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
        
        html = File.join(File.dirname(__FILE__), "html","su2rad_export.html")
        dlg.set_file(html, nil)
        
        ## show dialog
        dlg.show {
            uimessage("setSketchup()", 2)
            dlg.execute_script("setSketchup()")
            @exportOptions.setExportOptions(dlg, '')
            @renderOptions.setRenderOptions(dlg, '')
            @viewsList.setViewsList(dlg, '')
            @skyOptions.setSkyOptions(dlg, '')
            dlg.execute_script("updateExportPage()")
        }
    end ## end def show
        
    def startExport(dlg,params)
        @scene.setOptionsFromDialog(@exportOptions,@renderOptions,@skyOptions,@viewsList)
        dlg.close()
        status = @scene.startExportWeb()
        if status 
            showFinalStatus(status)
        end
    end

    def showFinalStatus(status)
        return
        tmplpath = File.join(File.dirname(__FILE__), "html", "final.html")
        abspath = "file://" + File.join(File.dirname(__FILE__), "html", "css") + File::SEPARATOR
        t = File.open(tmplpath, 'r')
        template = t.read()
        t.close()
        template = template.gsub(/\.\/css\//, abspath)
        html = template.sub(/--STATUS--/, status)
        printf "\n\n%s\n\n" % html
        dlg = UI::WebDialog.new("export summary", true, nil, 300, 200, 150, 150, true);
        dlg.set_html(html)
        dlg.show_modal { dlg.bring_to_front() }
    end

end ## end class exportDialogWeb

 
def test_showWebDialog()
    edw = ExportDialogWeb.new()
    edw.show()
end

