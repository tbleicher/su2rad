#
# preferences.rb 
#
# dialog to set preferences for su2rad.rb
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

## defaults



def loadPreferences(interactive=0)
    ## check if config.rb exists in su2radlib
    configPath = File.expand_path('config.rb', File.dirname(__FILE__))
    if File.exists?(configPath)
        printf "++ found preferences file '#{configPath}'\n"
        begin
            load configPath
            printf "++ applied preferences from '#{configPath}'\n"
        rescue => e 
            printf "-- ERROR reading preferences file '#{configPath}'!\n"
            msg = "-- %s\n\n%s" % [$!.message,e.backtrace.join("\n")]
            printf msg
        end
    elsif interactive != 0
        begin
            f = File.new(configPath, 'w')
            f.write("#\n# config.rb\n#\n")
            f.close()
            pd = PreferencesDialog.new(configPath)
            pd.showDialog()
        rescue => e
            printf "ERROR creating preferences file '#{configPath}'!\n"
            printf "Preferences will not be saved.\n"
        end
    end
    
end


class PreferencesDialog

    def initialize(filepath='')

        @filepath = File.expand_path('config.rb', File.dirname(__FILE__))
        
        @loglevel   = 0                             ## level of report messages
        @replmarks  = '/usr/local/bin/replmarks'    ## path to replmarks binary
        @mode       = 'by group'                    ## "by group"|"by layer"|"by color"
        @makeglobal = false                         ## keep local coordinates of groups and instances
        @triangulate = false                        ## export faces as triangles (should always work)
        @unit       = 0.0254                        ## use meters for Radiance scene
        
        @utc_offset = nil
        @showradopts = true                        ## show Radiance option dialog
        @exportallviews = false                     ## export all saved views

        @supportdir = '/Library/Application Support/Google Sketchup 6/Sketchup'
        @build_material_lib = false                 ## update/create material library in file system
       
        printf "\n=====\nPreferencesDialog('#{filepath}')\n=====\n"
        
        if filepath != ''
            filepath = File.expand_path(filepath, File.dirname(__FILE__))
            updateFromFile(filepath)
        end
    end

    def updateFromFile(filepath)
        if File.exists?(filepath)
            begin
                load filepath
                @filepath = filepath
                printf "settings updated from file '#{filepath}\n"
            rescue => e
                printf "ERROR reading preferences file '#{filepath}'!\n"
                msg = "%s\n\n%s" % [$!.message,e.backtrace.join("\n")]
                return
            end
        end
        ## now all values are in global vars
        @loglevel   = $LOGLEVEL
        @replmarks  = $REPLMARKS
        @mode       = $MODE
        @makeglobal = $MAKEGLOBAL
        @triangulate = $TRIANGULATE
        @unit       = $UNIT
        @utc_offset = $UTC_OFFSET
        @showradopts = $SHOWRADOPTS
        @exportallviews = $EXPORTALLVIEWS
        @supportdir = $SUPPORTDIR
        @build_material_lib = $BUILD_MATERIAL_LIB
        validate()
    end

    def validate
        ## check settings after loading from file
        if @supportdir != '' and not File.exists?(@supportdir)
            printf "$SUPPORTDIR does not exist => setting ignored ('#{@supportdir}')\n"
            @supportdir = ''
            $SUPPORTDIR = ''
        end
        if @replmarks != '' and not File.exists?(@replmarks)
            printf "$REPLMARKS does not exist => setting ignored ('#{@REPLMARKS}')\n"
            @replmarks = ''
            $REPLMARKS = ''
        end
    end
    
    def showDialog
        updateFromFile(@filepath)
        modes = 'by group|by layer|by color'
        a = (-12..12).to_a
        a.collect! { |i| "%.1f" % i }
        utcs = 'nil|' + a.join("|")
        prompts = [   'log level', 'export mode',  'global coords', 'triangulate faces',     'show options']
        values  = [     @loglevel,         @mode,      @makeglobal,   @triangulate.to_s,  @showradopts.to_s]
        choices = [     '0|1|2|3',         modes,     'true|false',        'true|false',       'true|false']
        prompts += [  'export all views', 'unit', 'replmarks path', 'supportdir',         'update library',  'system clock offset']
        values  += [@exportallviews.to_s,  @unit,       @replmarks,  @supportdir, @build_material_lib.to_s,       @utc_offset.to_s]
        choices += [        'true|false',     '',               '',           '',             'true|false',                   utcs]
        
        dlg = UI.inputbox(prompts, values, choices, 'preferences')
        if not dlg
            printf "preferences dialog.rb canceled\n"
            return 
        else
            evaluateDialog(dlg) 
            applySettings()
            writeValues
        end
    end
    
    def evaluateDialog(dlg)
        @loglevel    = dlg[0].to_i
        @mode        = dlg[1]  
        @makeglobal  = truefalse(dlg[2])
        @triangulate = truefalse(dlg[3])
        @showradopts = truefalse(dlg[4])
        @exportallviews = truefalse(dlg[5])
        begin
            @unit = dlg[6].to_f
        rescue
            printf "unit setting not a number('#{dlg[6]}') => ignored\n"
        end 
        @replmarks  = dlg[7]
        @supportdir = dlg[8]
        @build_material_lib = dlg[9]
        if dlg[10] == 'nil'
            @utc_offset = nil
        else
            @utc_offset = dlg[10].to_f
        end
        validate()
    end    
    
    def truefalse(s)
        if s == "true"
            return true
        else
            return false
        end
    end
    
    def showFile
        begin
            f = File.new(@filepath, 'r')
            printf f.read()
            printf "\n\n"
            f.close()
        rescue => e
            printf "\n-- ERROR reading preferences file '#{@filepath}'!\n"
        end 
    end 
    
    def showValues
        updateFromFile(@filepath)
        text = getSettingsText()
        printf "settings in file:\n"
        printf "#{text}\n"
    end

    def writeValues
        values = getSettingsText()
        text = ['#',
                '# config.rb',
                '#',
                '# This file is generated by a script.',
                "# Do not change unless you know what you're doing!",
                '',
                values, ''].join("\n")
        begin
            f = File.new(@filepath, 'w')
            f.write(text)
            f.close()
            printf "=> wrote file '#{@filepath}'\n"
        rescue => e
            printf "ERROR creating preferences file '#{@filepath}'!\n"
            printf "Preferences will not be saved.\n"
        end
        showValues()
    end

    def applySettings
        $LOGLEVEL   = @loglevel
        $REPLMARKS  = @replmarks 
        $MODE       = @mode 
        $MAKEGLOBAL = @makeglobal
        $TRIANGULATE = @triangulate
        $UTC_OFFSET = @utc_offset
        $UNIT       = @unit
        $SUPPORTDIR = @supportdir
        $SHOWRADOPTS        = @showradopts 
        $EXPORTALLVIEWS     = @exportallviews  
        $BUILD_MATERIAL_LIB = @build_material_lib
    end
    
    def getSettingsText
        if $UTC_OFFSET == nil
            utc = 'nil'
        else
            utc = "%.1f" % $UTC_OFFSET
        end
        l= ["$LOGLEVEL              = #{$LOGLEVEL}",
            "$UNIT                  = %.4f" % $UNIT,
            "$UTC_OFFSET            = %s" % utc,
            "$SUPPORTDIR            = '#{$SUPPORTDIR}'",
            "$REPLMARKS             = '#{$REPLMARKS}'",
            "$MODE                  = '#{$MODE}'",
            "$MAKEGLOBAL            = #{$MAKEGLOBAL}",
            "$TRIANGULATE           = #{$TRIANGULATE}",
            "$SHOWRADOPTS           = #{$SHOWRADOPTS}",
            "$EXPORTALLVIEWS        = #{$EXPORTALLVIEWS}",
            "$BUILD_MATERIAL_LIB    = #{$BUILD_MATERIAL_LIB}",
            "$ZOFFSET               = nil",
            "$RAD                   = ''",
            "$PREVIEW               = false"]
        return l.join("\n")
    end
end

def preferencesTest
    begin
        ld = PreferencesDialog.new()
        ld.showDialog()
    rescue => e 
        msg = "%s\n\n%s" % [$!.message,e.backtrace.join("\n")]
        UI.messagebox msg            
    end 
end



