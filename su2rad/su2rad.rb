# Sketchup To Radiance Exporter
#
# su2rad.rb - version 0.0d
#
# Written by Thomas Bleicher
# based on ogre_export by Kojack
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
    $OS = 'MAC'
else
    $OS = 'WIN'
end

## extend search path to subdirectories
basedir = File.dirname(__FILE__)
$:.push(File.join(basedir, 'su2radlib'))
$:.push(File.join(basedir, 'su2radlib', 'rubylib'))

require "sketchup.rb"
require "su2radlib/preferences.rb"
require "su2radlib/exportbase.rb"
require "su2radlib/context.rb"
require "su2radlib/interface.rb"
require "su2radlib/numeric.rb"
require "su2radlib/material.rb"
require "su2radlib/radiance_entities.rb"
require "su2radlib/radiancescene.rb"
require "su2radlib/webdialog.rb"

$RADPRIMITIVES = {  "plastic"    => 1,
                    "glass"      => 1,
                    "trans"      => 1, "trans2" => 1,
                    "metal"      => 1, "metal2" => 1,
                    "glow"       => 1,
                    "light"      => 1,
                    "source"     => 1,
                    "mirror"     => 1,
                    "dielectric" => 1, "dielectric2" => 1,
                    "void"       => 1}

$testdir = ""

## reload all script files for debugging
if $DEBUG
    printf "reloading modules ...\n"
    load "su2radlib/preferences.rb"
    load "su2radlib/exportbase.rb"
    load "su2radlib/context.rb"
    load "su2radlib/interface.rb"
    load "su2radlib/numeric.rb"
    load "su2radlib/material.rb"
    load "su2radlib/radiance_entities.rb"
    load "su2radlib/radiancescene.rb"
    load "su2radlib/webdialog.rb"
end


## define defaults if config file is messed up
$BUILD_MATERIAL_LIB = false
$EXPORTALLVIEWS     = false 
$MAKEGLOBAL         = false     
$LOGLEVEL           = 0                ## don't report details
$MODE               = 'by group'       ## "by group"|"by layer"|"by color"
$RAD                = ''
$REPLMARKS          = '/usr/local/bin/replmarks' 
$PREVIEW            = false        
$SHOWRADOPTS        = true
$SUPPORTDIR         = '/Library/Application Support/Google Sketchup 6/Sketchup'
$MATERIALLIB        = '/usr/local/lib/ray/lib/material.rad'
$TRIANGULATE        = false    
$UNIT               = 0.0254           ## inch (SU native unit) to meters (Radiance)
$UTC_OFFSET         = nil
$ZOFFSET            = nil     

$CONFIRM_REPLACE    = true

$TEXTURES           = true
$RA_TIFF            = '/usr/local/bin/ra_tiff'
$CONVERT            = '/usr/local/bin/convert'


## load configuration from file
loadPreferences()

## define scale matrix for unit conversion
$SCALETRANS = Geom::Transformation.new(1/$UNIT)


def startExport(selected_only=0)
    begin
        $MatLib = MaterialLibrary.new()
        rs = RadianceScene.new()
        rs.export(selected_only)
    rescue => e 
        msg = "%s\n\n%s" % [$!.message,e.backtrace.join("\n")]
        UI.messagebox msg            
    end 
end


def startWebExport(selected_only=0)
    begin
        $MatLib = MaterialLibrary.new()
        rs = RadianceScene.new()
        rs.showWebDialog(selected_only)
    rescue => e 
        msg = "%s\n\n%s" % [$!.message,e.backtrace.join("\n")]
        UI.messagebox msg            
    end 
end



$matConflicts = nil

def countConflicts
    if $matConflicts == nil
        $matConflicts = MaterialConflicts.new()
    end
    $matConflicts.count()
end

def resolveConflicts
    if $matConflicts == nil
        $matConflicts = MaterialConflicts.new()
    end
    $matConflicts.resolve()
end



def startImport(f='')
    ni = NumericImport.new()
    if $DEBUG
        ni.loadFile(f)
        ni.createMesh
        ni.addContourLines
        ni.addLabels
    else
        ni.loadFile
        ni.confirmDialog
    end
end



def preferencesDialog
    pd = PreferencesDialog.new()
    pd.showDialog()
end



def runTest
    sky = RadianceSky.new()
    sky.test()
end



if $DEBUG
    printf "debug mode\n"
    startWebExport(0)
else
    ## create menu entry
    begin
        if (not file_loaded?("su2rad.rb"))
            pmenu = UI.menu("Plugin")
            radmenu = pmenu.add_submenu("Radiance")
            radmenu.add_item("web dialog (test)") { startWebExport(0) }
            radmenu.add_item("export scene") { startExport(0) }
            radmenu.add_item("export selection") { startExport(1) }
            matmenu = radmenu.add_submenu("Material")
            matmenu.add_item("count conflicts") { countConflicts }
            matmenu.add_item("resolve conflicts") { resolveConflicts }
            importmenu = radmenu.add_submenu("Import")
            importmenu.add_item("numeric results") { startImport }
            radmenu.add_item("Preferences") { preferencesDialog() }
        end
    rescue => e
        msg = "%s\n\n%s" % [$!.message,e.backtrace.join("\n")]
        UI.messagebox msg
        printf "su2rad: entry to menu 'Plugin' failed:\n\n%s\n" % msg
    end
    file_loaded("su2rad.rb")
end


