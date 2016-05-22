require 'sketchup.rb'
require 'radiancecomponent.rb'
require 'radiancegroup.rb'
require 'radiancepolygon.rb'
require 'radiancesky.rb'
require 'radiance.rb'

require 'modules/jsonutils.rb'
require 'modules/session.rb'
require 'modules/radiancepath.rb'


module Tbleicher

  module Su2Rad

    class WebOptionsRender

      include Tbleicher::Su2Rad::JSONUtils
      include Tbleicher::Su2Rad::Session

      attr_accessor :state
      
      def initialize(state={})
        @state = state
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
          
      def applyRenderOptions(dlg, optsString)
        setOptionsFromString(dlg, optsString)
        saveToAttributes()
      end
    
      def getRifOptionsText
        zone = "%s 0 %.1f 0 %.1f 0 %.1f" % [@ZoneType, @ZoneSize, @ZoneSize, @ZoneSize]
        lines = [
          "# scene options file for rad\n",
          "QUALITY=     %s" % @Quality,
          "DETAIL=      %s" % @Detail,
          "VARIABILITY= %s" % @Variability,
          "INDIRECT=    %s" % @Indirect,
          "PENUMBRAS=   %s" % @Penumbras
        ]
        if $SU2RAD_DEBUG == true
          lines = lines.collect { |l| "#%s" % l }
          lines += [
            "\n# test settings for DEBUG option",
            "QUALITY=     low",
            "DETAIL=      low",
            "VARIABILITY= medium",
            "INDIRECT=    1",
            "PENUMBRAS=   true"
          ]
        end
        lines += [
          "",
          "PICTURE=     images/%s" % getConfig('PROJECT'),
          "RESOLUTION=  %s %s" % [@ImageSizeX, @ImageSizeY],
          "ZONE=        %s" % zone,
          "EXPOSURE=    %s" % "-2",
          "",
          "REPORT=      %s logfiles/%s" % [@Report, @ReportFile],
          "AMBFILE=     ambfiles/#{getConfig('SCENENAME')}.amb",
          "OCTREE=      octrees/#{getConfig('SCENENAME')}.oct",
          "scene=       #{getConfig('SCENENAME')}.rad",
          ""
        ]
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
          rif = Radiance::RifFile(path)
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
        @ZoneSize = Sketchup.active_model.bounds.diagonal*getConfig('UNIT')
        @ImageAspect = @ImageSizeX.to_f/@ImageSizeY.to_f
        updateFromAttributes()
      end 

      def saveToAttributes
        sDict = _getSettingsDict()
        sDict.each_pair { |k,v|
          Sketchup.active_model.set_attribute('SU2RAD_RENDEROPTIONS', k, v)
        }
      end
          
      def updateFromAttributes
        attrDict = Sketchup.active_model.attribute_dictionary('SU2RAD_RENDEROPTIONS')
        if attrDict != nil
          uimessage('loading render options from attribute', 1)
          updateFromDict(attrDict, false)
        end
      end
      
      def updateFromDict(dict, store=true)
        dict.each_pair { |k,v|
          old = eval("@%s" % k)
          if old != v
            uimessage("new value for '#{k}': '#{v}'", 1)
          end
          if old.class == String
            v = "'%s'" % v
          end
          begin
            eval("@%s = %s" % [k,v])
          rescue => e
            uimessage("RenderOptions.updateFromDict -  error in eval():", -2)
            uimessage("%s\n[k='%s'  v='%s'\n" % [$!.message, k, v], -2)
          end
        }
        if store
          saveToAttributes()
        end
        @ImageAspect = @ImageSizeX.to_f/@ImageSizeY.to_f
      end

    end # WebOptionsRender

  end # Su2Rad

end # Tbleicher

