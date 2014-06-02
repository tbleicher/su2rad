# Sketchup To Radiance Exporter
#
# su2rad.rb 

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
# 2014.0.0:
# ---------
# 2014 - 02-Jun-2014  :  giving up previous revision scheme to follow SU versions
#			 updating script to work with new Ruby version  
#                        packaging script as extension (*.rbz)
#
# branch 1.0:
# -----------
# daysim r03 - 28/07/10  :  fix in material export for layer mode (untested)
#                           support of IE8
# daysim r02 - 28/06/09  :  basic features for DAYSIM support
#                           creation of DAYSIM scene description files
#                           import of rtrace values as colored contour plot
#                           for presentation by C. Reinhart only
# daysim r01 - 15/06/09  :  non-public - for feedback from C. Reinhart only
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

module Su2rad

    COPYRIGHT = "(c) 2014 by Thomas Bleicher"
    CREATOR = "Thomas Bleicher"
    VERSION = "2014.0.0"

end


require "sketchup.rb"
require "extensions.rb"

su2rad_extension = SketchupExtension.new('su2rad', 'su2radlib/su2rad_loader.rb')
su2rad_extension.copyright = Su2rad::COPYRIGHT
su2rad_extension.creator = Su2rad::CREATOR
su2rad_extension.description = "SketchUp to Radiance exporter; " +
    "creates new entry in \"Plugins\" menu when loaded"
su2rad_extension.version = Su2rad::VERSION

Sketchup.register_extension(su2rad_extension, true)


