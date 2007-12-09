### config options for su2rad -- change as required ###

## path to replmarks binary
#$REPLMARKS = '/usr/local/bin/replmarks'
$REPLMARKS = '' 

## default mode for export: by group
$MODE = "by color"      ## "by group"|"by layer"|"by color"

## keep local coordinates of groups and instances
$MAKEGLOBAL = false     ## true|false - no quotes!

## export faces as triangles (should always work)
$TRIANGULATE = false    ## true|false - no quotes!

## unit conversion 
$UNIT = 0.0254          ## use meters for Radiance scene

## show Radiance option dialog
$SHOWRADOPTS = true     ## true|false - no quotes!

## export all saved viewsg
$EXPORTALLVIEWS = false ## true|false - no quotes!

## create material library in file system
$BUILD_MATERIAL_LIB = false ## true|false - no quotes!

## sketchup directory that contains support files (materials etc.)
#TODO $SUPPORTDIR for Windows

## preview doesn't work yet
$RAD = ''   
$PREVIEW = false        ## true|false - no quotes!



## NUMERIC IMPORT

## z-offset for values - use nil to use z-coord average
$ZOFFSET = nil          ## nil or float eg. 0.0, 0.75 


###   end of config options   ###


