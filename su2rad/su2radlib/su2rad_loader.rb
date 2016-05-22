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
require "modules/logger.rb"

require "config_class.rb"
require "exportbase.rb"
require "exportscene.rb"
require "materialcontext.rb"
require "numeric.rb"
require "progresscounter.rb"
require 'radiancecomponent.rb'
require 'radiancegroup.rb'
require 'radiancepolygon.rb'
require 'radiancesky.rb'
require "sessionstate.rb"
require "webdialog.rb"


module Tbleicher

  module Su2Rad

    Tbleicher::Su2Rad::Logger.level=3 #XXX report warnings and errors only

    ## load stateuration from file
    #loadPreferences()
    module_function

    def startExport(selected_only=0)
      begin
        state = Tbleicher::Su2Rad::SessionState.new()
        $SU2RAD_COUNTER = Tbleiher::Su2Rad::ProgressCounter.new()
        scene = Tbleicher::Su2Rad::ExportScene.new(state)
        scene.startExport(selected_only)
      rescue => e 
        msg = "%s\n\n%s" % [$!.message,e.backtrace.join("\n")]
        UI.messagebox msg            
      end 
    end


    def startWebExport(selected_only=0)
      SKETCHUP_CONSOLE.show()
      begin
        if $SU2RAD_DIALOG_WINDOW
          $SU2RAD_DIALOG_WINDOW.bring_to_front()
        else
          $SU2RAD_COUNTER = Tbleicher::Su2Rad::ProgressCounter.new() 
          state = Tbleicher::Su2Rad::SessionState.new()
          scene = Tbleicher::Su2Rad::ExportScene.new(state)
          edw = ExportDialogWeb.new(scene)
          edw.show()
        end
      rescue => e 
        msg = "%s\n\n%s" % [$!.message,e.backtrace.join("\n")]
        UI.messagebox msg            
      end 
    end

    $matConflicts = nil

    def countConflicts
      state = Tbleicher::Su2Rad::SessionState.new()
      if $matConflicts == nil
        $matConflicts = MaterialConflicts.new(state)
      end
      $matConflicts.count()
    end

    def resolveConflicts
      state = Tbleicher::Su2Rad::SessionState.new()
      if $matConflicts == nil
        $matConflicts = MaterialConflicts.new(state)
      end
      $matConflicts.resolve()
    end

    def startImport()
      state = Tbleicher::Su2Rad::SessionState.new()
      ni = NumericImport.new(state)
      if $DEBUG
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

    def aboutDialog
      msg = "su2rad\nSketchUp to Radiance exporter\nversion:  #{VERSION}"
      msg += "\n#{COPYRIGHT}\ntbleicher@gmail.com"
      UI.messagebox(msg, MB_OK, 'About su2rad')
    end

    def acknowledgementDialog
      dlg = UI::WebDialog.new("su2rad - acknowledgement", true, nil, 650, 800, 50, 50, true);
      html = File.join(File.dirname(__FILE__), "html","acknowledgement.html")
      dlg.set_file(html, nil)
      dlg.show()
    end
        
    def preferencesDialog
      pd = PreferencesDialog.new()
      pd.showDialog()
    end

    def su2rad_reload
      ## reload all script files for debugging
      printf "reloading modules ...\n"
      load "modules/logger.rb"
      load "modules/jsonutils.rb"
      load "modules/radiancepath.rb"
      load "modules/session.rb"
      load "modules/filesystemproxy.rb"
      
      load "exportbase.rb"
      load "exportscene.rb"
      load "numeric.rb"
      load "materialcontext.rb"
      load "radiance.rb"
      load "radiancecomponent.rb"
      load 'radiancegroup.rb'
      load 'radiancepolygon.rb'
      load 'radiancesky.rb'
      
      load "webdialog.rb"
      load 'weboptionsexport.rb'
      load 'weboptionsrender.rb'
      load 'weboptionssky.rb'
      
      load "sketchupview.rb"
      load "sketchupviewslist.rb"
      load "scene_materials.rb"
      load "config_class.rb"
      # set debug flag
      Tbleicher::Su2Rad::Logger.level=4
    end

    def addRadianceMenu
      pmenu = UI.menu("Plugin")
      radmenu = pmenu.add_submenu("Radiance")
      radmenu.add_item("export") { Tbleicher::Su2Rad::startWebExport(0) }
      radmenu.add_separator()
      #radmenu.add_item("export scene") { Tbleicher::Su2Rad::startExport(0) }
      #radmenu.add_item("export selection") { Tbleicher::Su2Rad::startExport(1) }
      
      #matmenu = radmenu.add_submenu("Material")
      #matmenu.add_item("count conflicts") { Tbleicher::Su2Rad::countConflicts }
      #matmenu.add_item("resolve conflicts") { Tbleicher::Su2Rad::resolveConflicts }
      
      importmenu = radmenu.add_submenu("Import")
      importmenu.add_item("rtrace values") { Tbleicher::Su2Rad::startImport() }
      radmenu.add_separator()
      
      #radmenu.add_item("Preferences") { Tbleicher::Su2Rad::preferencesDialog() }
      radmenu.add_item("About (#{VERSION})") { Tbleicher::Su2Rad::aboutDialog() }
      radmenu.add_item("Acknowledgement") { Tbleicher::Su2Rad::acknowledgementDialog() }
      radmenu.add_separator()
      radmenu.add_item("reload") { Tbleicher::Su2Rad::su2rad_reload() }
    end

  end # Su2Rad

end # Tbleicher

if $DEBUG
  printf "debug mode\n"
  startWebExport(0)
else
  ## create menu entry
  begin
    if (not file_loaded?("tbleicher_su2rad"))
      Tbleicher::Su2Rad::addRadianceMenu()
    end
  rescue => e
    msg = "%s\n\n%s" % [$!.message,e.backtrace.join("\n")]
    UI.messagebox msg
    printf "su2rad: entry to menu 'Plugin' failed:\n\n%s\n" % msg
  end
  file_loaded("tbleicher_su2rad")
end


