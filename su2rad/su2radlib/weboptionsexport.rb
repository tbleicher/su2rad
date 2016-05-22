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

    class WebOptionsExport

      include Tbleicher::Su2Rad::JSONUtils
      include Tbleicher::Su2Rad::Session
      include Tbleicher::Su2Rad::RadiancePath

      attr_reader :sceneName
      attr_reader :scenePath
      
      def initialize(state={})
        @state = state
        uimessage("ExportOptions.initialize()", 2)
        setExportDirectory()
        @scenePath     = getConfig('SCENEPATH')
        @sceneName     = getConfig('SCENENAME')
        @triangulate   = getConfig('TRIANGULATE')
        @textures      = getConfig('TEXTURES')
        @exportMode    = getConfig('MODE')
        @global_coords = getConfig('MAKEGLOBAL')
        updateFromAttributes()
      end
     
      def applyExportOptions(dlg, optsString)
        setOptionsFromString(dlg, optsString)
        ## TODO: check if selected file path exists and enable 'load' button
        saveToAttributes()
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
      
      def saveToAttributes
        dict = _getSettings()
        dict.delete('scenePath')
        dict.delete('sceneName')
        dict.each_pair { |k,v|
          Sketchup.active_model.set_attribute('SU2RAD_EXPORTOPTIONS', k, v)
        }
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
        
        ## check requirements for texture export
        convert = getConfig('CONVERT')
        ra_ppm = getConfig('RA_PPM')
        if convert != '' and ra_ppm != '' and File.exists?(convert) and File.exists?(ra_ppm)
          uimessage("'convert' found => keeping 'textures' options", 1)
        else
          uimessage("'convert' not found => disabling 'textures' options", -1)
          dlg.execute_script("disableTextureOption()")
          @textures = false
        end
        if @exportMode != 'by color'
          @textures = false
        end
        
        if @exportMode == 'daysim'
          @textures = false
          dlg.execute_script("hideExportOption(\"textures\")")
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
        dict = _getSettings()
        json = getJSONDictionary(dict)
        return json
      end
          
      def updateFromAttributes
        attr_dict = Sketchup.active_model.attribute_dictionary('SU2RAD_EXPORTOPTIONS')
        if attr_dict != nil
          uimessage('loading export options from attribute', 1)
          attr_dict.each_pair { |k,v|
            if k == 'triangulate'
              @triangulate = v
            elsif k == 'textures'
              @textures = v
            elsif k == 'exportMode'
              @exportMode = v
            elsif k == 'global_coords'
              @global_coords = v
            end
          }
        end
      end
      
      def writeOptionsToConfig
        ## apply export options to global config
        setConfig('TRIANGULATE', @triangulate)
        setConfig('TEXTURES', @textures)
        setConfig('MODE', @exportMode)
        setConfig('MAKEGLOBAL', @global_coords)
        setConfig('SCENEPATH', @scenePath)
        setConfig('SCENENAME', @sceneName)
        saveToAttributes()
      end

    end # WebOptionsExport

  end

end

