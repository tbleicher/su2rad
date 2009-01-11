require 'sketchup.rb'
require 'radiance_entities.rb'
require 'export_modules.rb'


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
        optsString = Sketchup.active_model.get_attribute('SU2RAD', 'EXPORTOPTIONS')
        if optsString != nil
            uimessage('loading export options from attribute', 1)
            setOptionsFromString(nil, optsString, true)
        end
    end
    
    def applyExportOptions(dlg, optsString)
        setOptionsFromString(dlg, optsString)
        ## check if selected file path exists and enable 'load' button
        Sketchup.active_model.set_attribute('SU2RAD', 'EXPORTOPTIONS', optsString) 
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
    
    def _getSettings
        dict = Hash.new()
        dict['scenePath'] = @scenePath
        dict['sceneName'] = @sceneName
        dict['triangulate'] = @triangulate
        dict['textures'] = @textures
        dict['exportMode'] = @exportMode
        dict['global_coords'] = @global_coords
        return dict
    end
    
    def toJSON
        ## collect export options and return JSON string
        dict = _getSettings()
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

        optsString = Sketchup.active_model.get_attribute('SU2RAD', 'RENDEROPTIONS')
        if optsString != nil
            uimessage('loading render options from attribute', 1)
            setOptionsFromString(nil, optsString, true)
        end
    end
        
    def applyRenderOptions(dlg, optsString)
        setOptionsFromString(dlg, optsString)
        ## save 
        Sketchup.active_model.set_attribute('SU2RAD', 'RENDEROPTIONS', optsString) 
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
   
    def _getSettingsDict
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
        return dict
    end
    
    def toJSON
        dict = _getSettingsDict()
        json = getJSONDictionary(dict)
        return json
    end
    
    def update
        @ImageSizeX = Sketchup.active_model.active_view.vpwidth
        @ImageSizeY = Sketchup.active_model.active_view.vpheight
        @ImageAspect = @ImageSizeX.to_f/@ImageSizeY.to_f
        @ZoneSize = Sketchup.active_model.bounds.diagonal*getConfig('UNIT')
    end 
    
    def updateFromDict(dict, store=true)
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
        sDict = _getSettingsDict()
        opts = sDict.collect { |k,v| "%s=%s" [k,v] }
        Sketchup.active_model.set_attribute('SU2RAD', 'RENDEROPTIONS', opts.join('&')) 
    end

end



class SkyOptions
    
    include JSONUtils
    include InterfaceBase

    def initialize
        @rsky = RadianceSky.new()
        @_settings = {}
        @_settings['SkyCommand'] = getSkyCommand()
        @_sinfo_unused = ['DisplayNorth', 'EdgesCastShadows', 'Light', 'Dark', 
                          'SunRise', 'SunRise_time_t',
                          'SunSet', 'SunSet_time_t',
                          #'ShadowTime',
                          #'DaylightSavings',
                          'SunDirection',
                          #'DisplayShadows', 'UseSunForAllShading',
                          'DisplayOnAllFaces', 'DisplayOnGroundPlane']
        _syncSettings()
        opts = Sketchup.active_model.get_attribute('SU2RAD', 'SKYOPTIONS')
        if opts != nil
            #printf "\nDEBUG: found SKYOPTIONS:\n r %s\n\n" % opts.gsub(/&/, "&\n r ") 
            uimessage('loading sky options from attribute', 1)
            applySkySettings(nil, opts)
        end
    end
    
    def applySkySettings(d,p)
        ## set shadow_info values from dialog
        pairs = _evalParams(p)
        pairs.each { |k,v|
            if (@_settings.has_key?(k) == false) || @_settings[k] != v
                uimessage("sky: new value for '%s': '%s'" % [k,v])
                @_settings[k] = v
            end
        }
        settings = getAttributeSettings()
        opts = settings.collect { |k,v| "%s=%s" % [k,v] }
        #printf "DEBUG: SKYOPTIONS opts=\n w %s\n\n" % opts.join("\n w ")
        Sketchup.active_model.set_attribute('SU2RAD', 'SKYOPTIONS', opts.join('&')) 
    end

    def _evalParams(param)
        ## evaluate string <param> to [k,v] pairs
        pairs = param.split("&")
        newpairs = []
        pairs.each { |pair| 
            k,v = pair.split("=")
            if (k == 'City' || k == 'Country' || k == 'SkyCommand' || k == 'ShadowTime')
                newpairs.push([k,v])
            elsif (v == 'true' || v == 'false')
                newpairs.push([k,eval(v)])
            else
                begin
                    v = Float(v)
                    newpairs.push([k,v])
                rescue ArgumentError => e
                    v = v
                    uimessage("sky: ArgumentError for key '%s' (v='%s')" % [k,v], -2)
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
   
    def getAttributeSettings
        ## filter settings that are saved elsewhere (shadow_info)?
        return @_settings
    end
    
    def setSkyOptions(dlg, params='')
        ## get shadow_info dict and apply to dialog
        uimessage("setSkyOptions() ...\n", 2)
        #_syncSettings()
        json = toJSON()
        dlg.execute_script( "setShadowInfoJSON('%s')" % encodeJSON(json) )
    end
    
    def _syncSettings() 
        sinfo = Sketchup.active_model.shadow_info
        dict = {}
        sinfo.each { |k,v| dict[k] = v }
        @_sinfo_unused.each { |k| dict.delete(k) }
        #dict['SkyCommand'] = getSkyCommand()
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

