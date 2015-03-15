This repository hosts the _su2rad.rb_ exporter script for Radiance and other daylight related scripts for _SketchUp_.


## su2rad.rb ##

This script exports your scene and perspective to a Radiance scene description.
It is still under heavy development but the download link to the right ('featured')
provides a snapshot with the most embarrassing bugs removed.

If you want the bleeding edge try the svn repository.

**version 1.0.alpha**

You can find the download package in the "Featured" list to the right. Documentation can be found on my [sites.google.com pages](http://sites.google.com/site/tbleicher/su2rad/1-0-alpha).

## shadowsequence.rb ##

This script creates images of an animated time sequence. It is intended for shadow
studies of building sites.

Advanced features allow you to color and arrange images automatically. For this you need ImageMagick and Ghostscript on you machine.
I have updated this script recently to handle file paths better and had to remove the label feature temporarily. A major update with interactive JavaScript interface is planned but I have not time frame yet.

## location.rb ##

This little script replaces the 'location' dialog in the poor man version of Sketchup. It does not offer a selection of countries and cities but at least you can easily set the longitude and latitude of your scene. This functionality is also included in the su2rad package.

I have not prepared a download package for this script. It is a single file download available [here via SVN download](http://su2rad.googlecode.com/svn/trunk/location/location.rb). Right click the link and save the file as Ruby source text (.rb), then copy the file into the 'Plugins' folder of your Sketchup installation.

## others ##

Other scripts for Sketchup may follow. Stay tuned.