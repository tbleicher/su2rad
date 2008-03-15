### config options for su2rad -- change as required ###

## system (not model!) time zone offset to UTC
## examples are given - add your timezone if missing
$UTC_OFFSET =  nil
#$UTC_OFFSET =   10  # Brisbane, Canberra, Sydney
#$UTC_OFFSET =    9  # Kyoto, Osaka, Tokyo
#$UTC_OFFSET =    8  # Beijing, Guangzhou, Shanghai, Hong Kong
#$UTC_OFFSET =  5.5  # Ahmadabad, Bangalore, Calcutta, New Delhi
#$UTC_OFFSET =    3  # Moscow
#$UTC_OFFSET =    1  # Paris, Berlin, Madrid, Amsterdam, Rome
#$UTC_OFFSET =    0  # London
#$UTC_OFFSET =   -3  # Buenos Aires
#$UTC_OFFSET =   -5  # New York
#$UTC_OFFSET =   -7  # Denver (CO), Boulder (CO)
#$UTC_OFFSET =   -9  # Anchorage (AK)


## level of report messages
$LOGLEVEL = 3

## path to replmarks binary
$REPLMARKS = '/usr/local/bin/replmarks'
#$REPLMARKS = '' 

## default mode for export: by group
$MODE = "by group"      ## "by group"|"by layer"|"by color"

## keep local coordinates of groups and instances
$MAKEGLOBAL = false     ## true|false - no quotes!

## export faces as triangles (should always work)
$TRIANGULATE = false    ## true|false - no quotes!

## unit conversion 
$UNIT = 0.0254          ## use meters for Radiance scene

## show Radiance option dialog
$SHOWRADOPTS = false     ## true|false - no quotes!

## export all saved views
$EXPORTALLVIEWS = false ## true|false - no quotes!

## create material library in file system
$BUILD_MATERIAL_LIB = false ## true|false - no quotes!

## sketchup directory that contains support files (materials etc.)
$SUPPORTDIR = '/Library/Application Support/Google Sketchup 6/Sketchup'
#TODO $SUPPORTDIR for Windows

## preview doesn't work yet
$RAD = ''   
$PREVIEW = false        ## true|false - no quotes!



## NUMERIC IMPORT

## z-offset for values - use nil to use z-coord average
$ZOFFSET = nil          ## nil or float eg. 0.0, 0.75 


###   end of config options   ###


