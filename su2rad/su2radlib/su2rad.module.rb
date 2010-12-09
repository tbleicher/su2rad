
# Sketchup To Radiance Exporter
#
# su2rad.module.rb - module for public access to SU2RAD variables
#
# written by Thomas Bleicher (tbleicher@gmail.com)
#
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


module Su2Rad

    def Su2Rad.getLatestExportPath
        return Sketchup.active_model.get_attribute('SU2RAD_EXPORTOPTIONS', 'latestExportPath')
    end

end
