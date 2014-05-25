# Sketchup To Radiance Exporter
#
# su2rad_loader.rb 
#
# written by Thomas Bleicher
#
# tbleicher@gmail.com
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


## extend search path to subdirectories
$:.push(File.dirname(__FILE__))

require "sketchup.rb"
require "exportbase.rb"
require "context.rb"
require "numeric.rb"
require "material.rb"
require "radiance_entities.rb"
require "radiancescene.rb"
require "webdialog.rb"
require "config_class.rb"


module Su2rad

    if RUBY_PLATFORM =~ /darwin/
        $SU2RAD_PLATFORM = 'MAC'
    else
        $SU2RAD_PLATFORM = 'WIN'
    end

    ## define defaults if config file is messed up
    $SU2RAD_LOGLEVEL = -1        #XXX report warnings and errors only
    $SU2RAD_LOG = []

    ## load configuration from file
    #loadPreferences()


    def self.startExport(selected_only=0)
        begin
            $SU2RAD_CONFIG = RunTimeConfig.new()
            $SU2RAD_COUNTER = ProgressCounter.new()
            rs = RadianceScene.new()
            rs.startExport(selected_only)
        rescue => e 
            msg = "%s\n\n%s" % [$!.message,e.backtrace.join("\n")]
            UI.messagebox msg            
        end 
    end


    def self.startWebExport(selected_only=0)
        begin
            if $SU2RAD_DIALOG_WINDOW
                $SU2RAD_DIALOG_WINDOW.bring_to_front()
            else 
                $SU2RAD_CONFIG = RunTimeConfig.new()
                $SU2RAD_COUNTER = ProgressCounter.new()
                edw = ExportDialogWeb.new()
                edw.show()
            end
        rescue => e 
            msg = "%s\n\n%s" % [$!.message,e.backtrace.join("\n")]
            UI.messagebox msg            
        end 
    end



    $matConflicts = nil

    def self.countConflicts
        $SU2RAD_CONFIG = RunTimeConfig.new()
        if $matConflicts == nil
            $matConflicts = MaterialConflicts.new()
        end
        $matConflicts.count()
    end

    def self.resolveConflicts
        $SU2RAD_CONFIG = RunTimeConfig.new()
        if $matConflicts == nil
            $matConflicts = MaterialConflicts.new()
        end
        $matConflicts.resolve()
    end

    def self.startImport()
        $SU2RAD_CONFIG = RunTimeConfig.new()
        ni = NumericImport.new()
        if $SU2RAD_DEBUG
            if ni.loadFile('/Users/ble/tmp/numimport/ADF_medium.df') == true
                ni.confirmDialog
                #ni.createMesh
                #ni.addContourLines
                #ni.addLabels
            end
        else
            if ni.loadFile() == true
                ni.confirmDialog
            end
        end
    end

    def self.aboutDialog
        msg = "su2rad\nSketchUp to Radiance exporter\nversion:  #{VERSION}"
        msg += "\n#{COPYRIGHT}\ntbleicher@gmail.com"
        UI.messagebox(msg, MB_OK, 'About su2rad')
    end

    def self.acknowledgementDialog
        dlg = UI::WebDialog.new("su2rad - acknowledgement", true, nil, 650, 800, 50, 50, true);
        html = File.join(File.dirname(__FILE__), "html","acknowledgement.html")
        dlg.set_file(html, nil)
        dlg.show()
    end
        
    def self.preferencesDialog
        pd = PreferencesDialog.new()
        pd.showDialog()
    end

    def self.runTest
        $SU2RAD_CONFIG = RunTimeConfig.new()
        sky = RadianceSky.new()
        sky.test()
    end

    def self.su2rad_reload
        ## reload all script files for debugging
        printf "reloading modules ...\n"
        load "export_modules.rb"
        load "exportbase.rb"
        load "filesystemproxy.rb"
        load "context.rb"
        load "numeric.rb"
        load "material.rb"
        load "radiance.rb"
        load "radiance_entities.rb"
        load "radiancescene.rb"
        load "webdialog.rb"
        load "webdialog_options.rb"
        load "webdialog_views.rb"
        load "scene_materials.rb"
        load "config_class.rb"
        # set debug flag and reload main file to start dialog
        $SU2RAD_DEBUG = true
        load "su2rad.rb"
    end

    def self.addRadianceMenu
        pmenu = UI.menu("Plugin")
        radmenu = pmenu.add_submenu("Radiance")
        radmenu.add_item("export (#{VERSION})") { startWebExport(0) }
        radmenu.add_separator()
        #radmenu.add_item("export scene") { startExport(0) }
        #radmenu.add_item("export selection") { startExport(1) }
        
        #matmenu = radmenu.add_submenu("Material")
        #matmenu.add_item("count conflicts") { countConflicts }
        #matmenu.add_item("resolve conflicts") { resolveConflicts }
        
        importmenu = radmenu.add_submenu("Import")
        importmenu.add_item("rtrace values") { startImport() }
        radmenu.add_separator()
        
        #radmenu.add_item("Preferences") { preferencesDialog() }
        radmenu.add_item("About") { aboutDialog() }
        radmenu.add_item("Acknowledgement") { acknowledgementDialog() }
        #radmenu.add_separator()
        #radmenu.add_item("reload") { su2rad_reload() }
    end

end #end module


if $SU2RAD_DEBUG
    printf "debug mode\n"
    startWebExport(0)
else
    ## create menu entry
    begin
        if (not file_loaded?("su2rad"))
            Su2rad::addRadianceMenu()
        end
    rescue => e
        msg = "%s\n\n%s" % [$!.message,e.backtrace.join("\n")]
        UI.messagebox msg
        printf "su2rad: entry to menu 'Plugin' failed:\n\n%s\n" % msg
    end
    file_loaded("su2rad")
end


