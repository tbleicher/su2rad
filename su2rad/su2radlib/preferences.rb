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
        @mode       = 'by group'                    ## "by group"|"by layer"|"by color"
        @makeglobal = false                         ## keep local coordinates of groups and instances
        @triangulate = false                        ## export faces as triangles (should always work)
        @unit       = 0.0254                        ## use meters for Radiance scene
        
        @replmarks  = '/usr/local/bin/replmarks'    ## path to replmarks binary
        @convert    = '/usr/local/bin/convert'      ## path to ImageMagick 'convert'
        @ra_tiff    = '/usr/local/bin/ra_tiff  '    ## path to ra_tiff binary
        
        @confirm_replace = false                    ## replace existing dirs without asking
        @utc_offset = nil
        @showradopts = true                         ## show Radiance option dialog
        @allviews = false                           ## export all saved views

        @supportdir = '/Library/Application Support/Google Sketchup 6/Sketchup'
        @build_mlib = false                         ## update/create material library in file system
       
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
        @loglevel    = $LOGLEVEL
        @replmarks   = $REPLMARKS
        @mode        = $MODE
        @makeglobal  = $MAKEGLOBAL
        @triangulate = $TRIANGULATE
        @unit        = $UNIT
        @utc_offset  = $UTC_OFFSET
        @showradopts = $SHOWRADOPTS
        @allviews = $EXPORTALLVIEWS
        @supportdir  = $SUPPORTDIR
        @build_mlib = $BUILD_MATERIAL_LIB
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
        if @convert != '' and not File.exists?(@convert)
            disableConvert()
        end
        if @ra_tiff != '' and not File.exists?(@ra_tiff)
            disableConvert()
        end
    end
   
    def disableConvert
        printf "$CONVERT or $RA_TIFF do not exits => settings ignored\n"
        @convert = ''
        $CONVERT = ''
        @ra_tiff = ''
        $RA_TIFF = ''
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
        prompts += ['export all views',  'unit',  'replmarks path',  'convert path', 'ra_tiff path']
        values  += [    @allviews.to_s,   @unit,        @replmarks,        @convert,       @ra_tiff]
        choices += [       'true|false',     '',                '',              '',             '']
        prompts += ['supportdir',   'update library',  'system clock offset']
        values  += [ @supportdir,   @build_mlib.to_s,       @utc_offset.to_s]
        choices += [          '',       'true|false',                   utcs]
        
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
        @allviews    = truefalse(dlg[5])
        begin
            @unit = dlg[6].to_f
        rescue
            printf "unit setting not a number('#{dlg[6]}') => ignored\n"
        end 
        @replmarks  = dlg[7]
        @convert    = dlg[8]
        @ra_tiff    = dlg[9]
        @supportdir = dlg[10]
        @build_mlib = dlg[11]
        if dlg[12] == 'nil'
            @utc_offset = nil
        else
            @utc_offset = dlg[12].to_f
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
        $LOGLEVEL           = @loglevel
        $REPLMARKS          = @replmarks 
        $MODE               = @mode 
        $MAKEGLOBAL         = @makeglobal
        $TRIANGULATE        = @triangulate
        $UTC_OFFSET         = @utc_offset
        $UNIT               = @unit
        $SUPPORTDIR         = @supportdir
        $SHOWRADOPTS        = @showradopts 
        $EXPORTALLVIEWS     = @allviews  
        $BUILD_MATERIAL_LIB = @build_mlib
        $RA_TIFF            = @ra_tiff
        $CONVERT            = @convert
        $CONFIRM_REPLACE    = @confirm_replace
    end
    
    def getSettingsText
        if $UTC_OFFSET == nil
            utc = 'nil'
        else
            utc = "%.1f" % $UTC_OFFSET
        end
        l= ["\n## script behaviour",
            "$MODE                  = '#{$MODE}'",
            "$MAKEGLOBAL            = #{$MAKEGLOBAL}",
            "$TRIANGULATE           = #{$TRIANGULATE}",
            "$SHOWRADOPTS           = #{$SHOWRADOPTS}",
            "$EXPORTALLVIEWS        = #{$EXPORTALLVIEWS}",
            "",
            "$LOGLEVEL              = #{$LOGLEVEL}",
            "$UNIT                  = %.4f" % $UNIT,
            "$UTC_OFFSET            = %s" % utc,
            "\n## paths to utility programs",
            "$REPLMARKS             = '#{$REPLMARKS}'",
            "$CONVERT               = '#{$CONVERT}'",
            "$RA_TIFF               = '#{$RA_TIFF}'"
            "\n## library options",
            "$SUPPORTDIR            = '#{$SUPPORTDIR}'",
            "$BUILD_MATERIAL_LIB    = #{$BUILD_MATERIAL_LIB}",
            "\n## misc and unused options",
            "$ZOFFSET               = nil",
            "$CONFIRM_REPLACE       = #{$CONFIRM_REPLACE}",
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



