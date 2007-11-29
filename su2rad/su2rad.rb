# Sketchup To Radiance Exporter
#
# su2rad.rb - version 0.0b
#
# Written by Thomas Bleicher
# based on ogre_export by Kojack
#
# This program is free software; you can redistribute it and/or modify it under
# the terms of the GNU Lesser General Public License as published by the Free Software
# Foundation; either version 2 of the License, or (at your option) any later
# version.
# 
# This program is distributed in the hope that it will be useful, but WITHOUT
# ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
# FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
# 
# You should have received a copy of the GNU Lesser General Public License along with
# this program; if not, write to the Free Software Foundation, Inc., 59 Temple
# Place - Suite 330, Boston, MA 02111-1307, USA, or go to
# http://www.gnu.org/copyleft/lesser.txt.


# revisions:
# v 0.0d - tbc       :  fixed bug in cleaning of colour names
#                         (thanks to Rob Guglielmetti for reporting)
#                       fixed export of hidden layers in components
#                       new 'by layer' and 'by color' options
#                       more options for .rif file
#                       split in separate file in su2radlib
# 
# v 0.0c - 31/10/07  :  fixed bug in export of multiple views
# v 0.0b - 29/10/07  :  fixed bug in replmarks warning
#                       fixed bug in clear directory recursion
#                       added north orientation to sky description
#                       added exception error display to export function
# v 0.0  - 28/10/07  :  initial release

require "su2radlib/exportbase.rb"
require "su2radlib/interface.rb"
require "su2radlib/numeric.rb"
require "su2radlib/material.rb"
require "su2radlib/radiance_entities.rb"
require "su2radlib/radiancescene.rb"

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

$debug = 0
$verbose = true
$testdir = ""

if $debug > 0
    load "su2radlib/exportbase.rb"
    load "su2radlib/interface.rb"
    load "su2radlib/numeric.rb"
    load "su2radlib/material.rb"
    load "su2radlib/radiance_entities.rb"
    load "su2radlib/radiancescene.rb"
end



if (load "su2radlib/config.rb") == true
    printf "config loaded successfully\n"    
else
    printf "ERROR loading config => builtin defaults used\n"    
    $REPLMARKS = '' 
    $MODE = "by group"      ## "by group"|"by layer"|"by color"
    $MAKEGLOBAL = false     
    $TRIANGULATE = false    
    $UNIT = 0.0254          ## use meters for Radiance scene
    $SHOWRADOPTS = false
    $EXPORTALLVIEWS = false 
    $RAD = ''   
    $PREVIEW = false        
    $ZOFFSET = nil     
end
$SCALETRANS = Geom::Transformation.new(1/$UNIT)



def startExport(selected_only=0)
    begin
        rs = RadianceScene.new()
        rs.export(selected_only)
    rescue => e 
        msg = "%s\n\n%s" % [$!.message,e.backtrace.join("\n")]
        #printf "script failed:\n %s \n" % msg
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
    if $debug == 1
        ni.loadFile(f)
        ni.createMesh
        ni.addContourLines
        ni.addLabels
    else
        ni.loadFile
        ni.confirmDialog
    end
end





if $debug == 0
    ## create menu entry
    begin
        if (not file_loaded?("su2rad.rb"))
            pmenu = UI.menu("Plugin")
            radmenu = pmenu.add_submenu("Radiance")
            radmenu.add_item("export scene") { startExport(0) }
            radmenu.add_item("export selection") { startExport(1) }
            matmenu = radmenu.add_submenu("Material")
            matmenu.add_item("count conflicts") { countConflicts }
            matmenu.add_item("resolve conflicts") { resolveConflicts }
            importmenu = radmenu.add_submenu("Import")
            importmenu.add_item("numeric results") { startImport }
        end
    rescue => e
        msg = "%s\n\n%s" % [$!.message,e.backtrace.join("\n")]
        UI.messagebox msg
        printf "RadianceScene: entry to menu 'Export' failed:\n\n%s\n" % msg
    end
    file_loaded("su2rad.rb")
else
    startImport('/Users/ble/Desktop/ADF_medium.lux')
end


