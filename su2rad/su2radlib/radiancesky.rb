require "exportbase.rb"

module Tbleicher

  module Su2Rad

    class RadianceSky < Tbleicher::Su2Rad::ExportBase
        
      attr_reader :filename
      attr_accessor :skytype
      
      def initialize(state)
        @state = state
        @skytype = getSkyType()
        @filename = ''
        @comments = ''
        @sinfo = nil
      end
      
      def getDaysimSiteInfo
        ## return site/sky information for Daysim *.hea file
        if @sinfo == nil
          sinfo = Sketchup.active_model.shadow_info
        else
          sinfo = @sinfo
        end
        city = sinfo['City'].gsub(/\s/, '_').gsub(/\W/, '')
        text =  ""
        text += "########################\n"
        text += "### site information ###\n"
        text += "########################\n"
        text += "place %s\n"       % city
        text += "latitude %.3f\n"  % sinfo['Latitude']
        text += "longitude %.3f\n" % (sinfo['Longitude']*-1)
        text += "time_zone %d\n"   % (sinfo['TZOffset']*-15.0)
        text += "site_elevation 0.0\n"       
        text += "ground_reflectance 0.2\n"       
        text += "scene_rotation_angle %.2d\n" % sinfo['NorthAngle']
        text += "time_step 60\n"              
        text += "#wea_data_file_short C:\\DAYSIM\\wea\\CAN_ON_Ottawa_CWEC_5min.wea"
        return text
      end

      def getSkyType
        sinfo = Sketchup.active_model.shadow_info
        type = "-c"
        if sinfo['DisplayShadows'] == true
          type = "+i"
          if sinfo['UseSunForAllShading'] == true
            type = "+s" + type
          end
        end
        return type
      end
      
      def export
        if @sinfo == nil
          sinfo = Sketchup.active_model.shadow_info
          skycmd = "!%s" % getGenSkyOptions(sinfo)
          skycmd += " | xform -rz %.1f\n\n" % (-1*sinfo['NorthAngle']) #XXX
        else
          sinfo = @sinfo
          skycmd = "!%s\n\n" % sinfo['SkyCommand']
        end
        
        text =  "## sky description for %s, %s\n" % [sinfo['City'], sinfo['Country']]
        text += "##   latitude:  %.3f\n" % sinfo['Latitude']
        text += "##   longitude: %.3f\n" % sinfo['Longitude']
        text += "\n"
        text += skycmd
        text += "skyfunc glow skyglow\n0\n0\n4 1.000 1.000 1.000 0\n"
        text += "skyglow source sky\n0\n0\n4 0 0 1 180\n\n"
        text += "skyfunc glow groundglow\n0\n0\n4 1.000 1.000 1.000 0\n"
        text += "groundglow source ground\n0\n0\n4 0 0 -1 180\n"

        city = remove_spaces(sinfo['City'])
        if sinfo['ShadowTime'].class == Time
          timestamp = sinfo['ShadowTime'].strftime("%m%d_%H%M")
        else
          skytime = Time.at(sinfo['ShadowTime_time_t'])
          if skytime.isdst == true
            skytime -= 3600
          end
          skytime.utc             ## time zone of ShadowTime is UTC
          timestamp = skytime.strftime("%m%d_%H%M")
        end
        rpath = File.join("skies","%s_%s.sky" % [city, timestamp])
        filename = getFilename(rpath)
        filetext = @comments + "\n" + text
        if not createFile(filename, filetext)
          uimessage("Error: Could not create sky file '#{filename}'")
          @filename = ''
        else
          @filename = rpath
        end
        return @filename
      end
        
      def getGenSkyOptions(sinfo=nil)
        if sinfo == nil
          sinfo = Sketchup.active_model.shadow_info
        end
        skytime = sinfo['ShadowTime']
        if skytime.isdst == true
          skytime -= 3600
        end
        skytime.utc                 ## time zone of ShadowTime is UTC
        lat = sinfo['Latitude']
        lng = sinfo['Longitude']
        mer = "%.1f" % (sinfo['TZOffset']*-15.0)
        text = "gensky %s #{@skytype}" % skytime.strftime("%m %d %H:%M")
        text += " -a %.3f -o %.3f -m %1.f" % [lat, -1*lng, mer]
        text += " -g 0.2 -t 1.7"
        return text
      end
       
      def setSkyOptions(sinfo)
        @sinfo = sinfo
      end
      
      def test
        sinfo = Sketchup.active_model.shadow_info
        lat = sinfo['Latitude']
        long = sinfo['Longitude']
        s,m,hour,day,month,y,wday,yday,isdst,zone = sinfo['ShadowTime'].to_a
        (6..12).each { |month|
          (4..20).each { |hour|
          t = Time.utc(y,month,21,hour,0,0)
          sinfo['ShadowTime'] = t
          angs = getGenSkyOptions(sinfo)
          alt = angs.split()[-2]
          azi = angs.split()[-1]
          alt = alt.to_f
          azi = azi.to_f
          gensky = "/usr/local/bin/gensky %d 21 %02d:00 -o %.2f -m -105 -a %.2f | grep alti" % [month,hour,long,lat]
          f = IO.popen(gensky)
          lines = f.readlines()
          f.close()
          begin
            parts = lines[0].split()
            galti = parts[-2].to_f
            gazim = parts[-1].to_f
            dalt = galti - alt
            dazi = gazim - azi
            if dalt.abs > 1.0 or dazi.abs > 1.0
              print "==> %d 21 %02d:00  ->  dalt=%.2f  dazi=%.2f\n" % [month,hour,dalt, dazi]
            end
          rescue
            print "Error\n"
          end
        }}
      end
            
    end # RadianceSky

  end # Su2Rad

end # Tbleicher 


