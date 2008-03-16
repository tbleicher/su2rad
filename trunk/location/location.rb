#
# location.rb - version 0.0
#
# replacement for previous 'location' dialog
#
# written by Thomas Bleicher, tbleicher@gmail.com
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU Lesser General Public License
# as published by the Free Software Foundation; either version 2 of
# the License, or (at your option) any later version.
# 
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
# See the GNU Lesser General Public License for more details.
# 
# You should have received a copy of the GNU Lesser General Public
# License along with this program; if not, write to the
# Free Software Foundation, Inc., 59 Temple
# Place - Suite 330, Boston, MA 02111-1307, USA, or go to
# http://www.gnu.org/copyleft/lesser.txt.


# revisions:
# v 0.0              :  first release

## defaults

class LocationDialog

    def initialize
        @errormsg    = ''
        @city        = 'city'
        @country     = 'country'
        @latitude    = 0.0
        @longitude   = 51.6
        @tzoffset    = 0
        @north       = 0.0
        @shownorth   = 'false'
        getValues
        printf "=================\nLocation dialog\n=================\n"
        showValues
    end
    
    def checkRange(var, max, name="variable")
        begin
            val = var.to_f
            if val.abs > max
                @errormsg += "#{name} not in range [-%.1f,+%.1f]\n#{name}= %.1f\n" % [max,max,val]
            else
                return val
            end
        rescue => e 
            @errormsg = "%s:\n%s\n\n%s" % [name, $!.message, e.backtrace.join("\n")]
        end
    end

    def evaluateData(dlg)
        ## check values in dlg
        @errormsg  = ''
        @city      = dlg[0] 
        @country   = dlg[1]
        @latitude  = checkRange(dlg[2],   90, 'latitude')
        @longitude = checkRange(dlg[3],  180, 'longitude')
        @tzoffset  = checkRange(dlg[4], 12.5, 'time zone offset')
        @north     = checkRange(dlg[5],  180, 'north angle')
        shownorth  = dlg[6]
        if shownorth == 'true'
            @shownorth = true
        else
            @shownorth = false
        end
        if @errormsg != ''
            ## show error message
            UI.messagebox @errormsg            
            return false
        else
            return true
        end
    end

    def getValues
        ## get values from shadow settings
        s = Sketchup.active_model.shadow_info
        @city      = s['City']       
        @country   = s['Country']    
        @latitude  = s['Latitude']   
        @longitude = s['Longitude']  
        @tzoffset  = s['TZOffset']   
        @north     = s['NorthAngle']
        @shownorth = s['DisplayNorth']
    end

    def showValues
        s = Sketchup.active_model.shadow_info
        printf "City\t\t= #{s['City']}\n"  
        printf "Country\t= #{s['Country']}\n"
        printf "Latitude\t= #{s['Latitude']}\n"
        printf "Longitude\t= #{s['Longitude']}\n"
        printf "TZOffset\t= #{s['TZOffset']}\n"
        printf "NorthAngle\t= #{s['NorthAngle']}\n"
        printf "DisplayNorth\t= #{s['DisplayNorth']}\n"
    end

    def setValues
        ## apply values to shadow settings
        s = Sketchup.active_model.shadow_info
        s['City']         = @city
        s['Country']      = @country
        s['Latitude']     = @latitude
        s['Longitude']    = @longitude
        s['TZOffset']     = @tzoffset
        s['NorthAngle']   = @north
        s['DisplayNorth'] = @shownorth
    end

    def show
        getValues
        tzones  = (-12..12).to_a
        tzones.collect! { |i| "%.1f" % i.to_f }
        tzones  = tzones.join('|')
        prompts = ['city', 'country', 'latitude (+=N)', 'longitude (+=E)', 'tz offset', 'north', 'show north']
        values  = [@city,  @country,  @latitude,         @longitude,    @tzoffset.to_s,  @north,  @shownorth.to_s]
        choices = ['','','','',tzones,'','true|false']
        dlg = UI.inputbox(prompts, values, choices, 'location')
        if not dlg
            printf "location.rb: dialog canceled\n"
            return 
        else
            if evaluateData(dlg) == true
                setValues
            end
        end
        printf "\nnew settings:\n"
        showValues
    end
end

def locationdialog
    begin
        ld = LocationDialog.new()
        ld.show()
    rescue => e 
        msg = "%s\n\n%s" % [$!.message,e.backtrace.join("\n")]
        UI.messagebox msg            
    end 
end


def runTest
    locationdialog()
end



if $DEBUG
    printf "debug mode\n"
    runTest()
else
    ## create menu entry
    begin
        if (not file_loaded?("location.rb"))
            pmenu = UI.menu("Plugin")
            pmenu.add_item("location") { locationdialog }
        end
    rescue => e
        msg = "%s\n\n%s" % [$!.message,e.backtrace.join("\n")]
        UI.messagebox msg
        printf "location.rb: entry to menu 'Plugin' failed:\n\n%s\n" % msg
    end
    file_loaded("location.rb")
end


