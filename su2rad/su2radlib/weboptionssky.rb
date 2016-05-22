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

    class WebOptionsSky
    
      include Tbleicher::Su2Rad::JSONUtils
      include Tbleicher::Su2Rad::Session

      attr_accessor :state

      def initialize(state)
        @state = state
        @rsky = Tbleicher::Su2Rad::RadianceSky.new(state)
        
        @_settings = {}
        @_settings['SkyCommand'] = getSkyCommand()
        @_sinfo_unused = [
          'DisplayNorth',
          'EdgesCastShadows',
          'Light',
          'Dark', 
          'SunRise',
          'SunRise_time_t',
          'SunSet',
          'SunSet_time_t',
          'ShadowTime',
          #'DaylightSavings',
          'SunDirection',
          #'DisplayShadows',
          'UseSunForAllShading',
          'DisplayOnAllFaces',
          'DisplayOnGroundPlane'
        ]
        _syncSettings()
        updateFromAttributes()
      end
      
      def updateFromAttributes
        attr_dict = Sketchup.active_model.attribute_dictionary('SU2RAD_SKYOPTIONS')
        if attr_dict != nil
          uimessage('loading sky options from attributes', 1)
          d = {}
          attr_dict.each_pair { |k,v| d[k]=v }
          @_settings.update(d)
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
        settings.each_pair { |k,v|
          begin
            printf "SU2RAD_SKYOPTIONS '#{k}' = '#{v}'\n"
            Sketchup.active_model.set_attribute('SU2RAD_SKYOPTIONS', k.to_s, v.to_s)
          rescue => e
            printf "ERROR at key '#{k}' (v='#{v}'): %s\n" % e.to_s
          end
        }
        writeSkySettingsToShadowInfo(d,p) 
      end

      def _evalParams(param)
        ## evaluate string <param> to [k,v] pairs
        pairs = param.split("&")
        newpairs = []
        pairs.each { |pair| 
          k,v = pair.split("=")
          if (k == 'ShadowTime')
            ## keep Time object out of it
            next
          elsif (k == 'City' || k == 'Country' || k == 'SkyCommand')
            ## String values
            newpairs.push([k,v])
          elsif (v == 'true' || v == 'false')
            newpairs.push([k,eval(v)])
          else
            ## should only be Floats values left
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
     
      def getSettings
        return @_settings
      end 

      def getAttributeSettings
        ## filter settings that are saved elsewhere (shadow_info)?
        d = {}
        d['SkyCommand'] = @_settings['SkyCommand']
        return d
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
            if sinfo[k] != v.to_i
              #printf "> old sinfo[%s] : %d\n" % [k,sinfo[k]]
              sinfo[k] = v.to_i
              #printf "> new sinfo[%s] : %d\n" % [k,v.to_i]
              uimessage(" => %s: %d" % [k,v.to_i], 1)
            end
          elsif k == 'SkyCommand'
              uimessage(" -> SkyCommand: '#{v}'", 2)
          else
            begin
              if sinfo[k] != v
                sinfo[k] = v
                uimessage(" => %s: '%s'" % [k,v], 1)
              end
            rescue AttributeError => e
              uimessage("SkyOptions AttributeError at '#{k}' (v='#{v}')", -2)
            end
          end
        }
        #@_settings['ShadowTime'] = sinfo['ShadowTime']
        #@_settings['ShadowTime_time_t'] = sinfo['ShadowTime_time_t']
        #d.execute_script("setShadowInfoJSON('%s')" % encodeJSON(toJSON()) )
      end

    end # WebOptionsSky
    
  end # Su2Rad

end # Tbleicher

