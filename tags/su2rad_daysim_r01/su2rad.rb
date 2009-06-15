# Sketchup To Radiance Exporter
#
# su2rad.rb 

$SU2RAD_VERSION = "daysim r01"

# Written by Thomas Bleicher
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


# revisions:
# ===========
#
# branch 1.0:
# -----------
# v 1.0alpha - 18/01/09  :  pre-releas for feedback (including Windows)
#                           new interface pages for views and materials
# Xmas_special_2008      :  pre-releas for feedback (Mac only)
#                           all new webdialog JavaScript interface
#
# branch 0.0:
# -----------
# v 0.0d - tbc       :  fixed bug in cleaning of colour names
#                         (thanks to Rob Guglielmetti for reporting)
#                       fixed export of hidden layers in components
#                       new 'by layer' and 'by color' options
#                       more options for .rif file
#                       split in separate files in su2radlib
# 
# v 0.0c - 31/10/07  :  fixed bug in export of multiple views
# v 0.0b - 29/10/07  :  fixed bug in replmarks warning
#                       fixed bug in clear directory recursion
#                       added north orientation to sky description
#                       added exception error display to export function
# v 0.0  - 28/10/07  :  initial release



if PLATFORM =~ /darwin/
    ##TODO add option for PPC
    $SU2RAD_PLATFORM = 'MAC'
else
    $SU2RAD_PLATFORM = 'WIN'
end

## extend search path to subdirectories
basedir = File.dirname(__FILE__)
$:.push(File.join(basedir, 'su2radlib'))
#$:.push(File.join(basedir, 'su2radlib', 'rubylib'))

require "sketchup.rb"
require "su2radlib/exportbase.rb"
require "su2radlib/context.rb"
require "su2radlib/numeric.rb"
require "su2radlib/material.rb"
require "su2radlib/radiance_entities.rb"
require "su2radlib/radiancescene.rb"
require "su2radlib/webdialog.rb"
require "su2radlib/config_class.rb"


## define defaults if config file is messed up
$SU2RAD_LOGLEVEL    = -1        #XXX report warnings and errors only

## load configuration from file
#loadPreferences()


def startExport(selected_only=0)
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


def startWebExport(selected_only=0)
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

def countConflicts
    $SU2RAD_CONFIG = RunTimeConfig.new()
    if $matConflicts == nil
        $matConflicts = MaterialConflicts.new()
    end
    $matConflicts.count()
end

def resolveConflicts
    $SU2RAD_CONFIG = RunTimeConfig.new()
    if $matConflicts == nil
        $matConflicts = MaterialConflicts.new()
    end
    $matConflicts.resolve()
end

def startImport(f='')
    $SU2RAD_CONFIG = RunTimeConfig.new()
    ni = NumericImport.new()
    if $SU2RAD_DEBUG
        ni.loadFile(f)
        ni.createMesh
        ni.addContourLines
        ni.addLabels
    else
        ni.loadFile
        ni.confirmDialog
    end
end

def aboutDialog
    msg = "su2rad.rb\nSketchUp to Radiance exporter\nversion:  #{$SU2RAD_VERSION}"
    msg += "\n(c) Thomas Bleicher, 2008\ntbleicher@gmail.com"
    UI.messagebox(msg, MB_OK, 'su2rad.rb')
end

def acknowledgementDialog
    dlg = UI::WebDialog.new("su2rad - acknowledgement", true, nil, 650, 800, 50, 50, true);
    html = File.join(File.dirname(__FILE__), "su2radlib", "html","acknowledgement.html")
    dlg.set_file(html, nil)
    dlg.show()
end
    
def preferencesDialog
    pd = PreferencesDialog.new()
    pd.showDialog()
end

def runTest
    $SU2RAD_CONFIG = RunTimeConfig.new()
    sky = RadianceSky.new()
    sky.test()
end

def su2rad_reload
    ## reload all script files for debugging
    printf "reloading modules ...\n"
    load "su2radlib/export_modules.rb"
    load "su2radlib/exportbase.rb"
    load "su2radlib/filesystemproxy.rb"
    load "su2radlib/context.rb"
    load "su2radlib/numeric.rb"
    load "su2radlib/material.rb"
    load "su2radlib/radiance.rb"
    load "su2radlib/radiance_entities.rb"
    load "su2radlib/radiancescene.rb"
    load "su2radlib/webdialog.rb"
    load "su2radlib/webdialog_options.rb"
    load "su2radlib/webdialog_views.rb"
    load "su2radlib/scene_materials.rb"
    load "su2radlib/config_class.rb"
    # set debug flag and reload main file to start dialog
    $SU2RAD_DEBUG = true
    load "su2rad.rb"
end


def addRadianceMenu
    pmenu = UI.menu("Plugin")
    radmenu = pmenu.add_submenu("Radiance")
    radmenu.add_item("export (#{$SU2RAD_VERSION})") { startWebExport(0) }
    radmenu.add_separator()
    #radmenu.add_item("export scene") { startExport(0) }
    #radmenu.add_item("export selection") { startExport(1) }
    
    #matmenu = radmenu.add_submenu("Material")
    #matmenu.add_item("count conflicts") { countConflicts }
    #matmenu.add_item("resolve conflicts") { resolveConflicts }
    
    #importmenu = radmenu.add_submenu("Import")
    #importmenu.add_item("numeric results") { startImport }
    
    #radmenu.add_item("Preferences") { preferencesDialog() }
    radmenu.add_item("About") { aboutDialog() }
    radmenu.add_item("Acknowledgement") { acknowledgementDialog() }
    radmenu.add_separator()
    radmenu.add_item("reload") { su2rad_reload() }
end


if $SU2RAD_DEBUG
    printf "debug mode\n"
    startWebExport(0)
else
    ## create menu entry
    begin
        if (not file_loaded?("su2rad.rb"))
            addRadianceMenu()
        end
    rescue => e
        msg = "%s\n\n%s" % [$!.message,e.backtrace.join("\n")]
        UI.messagebox msg
        printf "su2rad: entry to menu 'Plugin' failed:\n\n%s\n" % msg
    end
    file_loaded("su2rad.rb")
end


