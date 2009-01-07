# Copyright: © 2007, Thomas Bleicher

# This file is based on scripts by John Wehby (www.smustard.com)
# and Remi Goux.

# Permission to use, copy, modify, and distribute this software for 
# any purpose and without fee is hereby granted, provided that the above
# copyright notice appear in all copies.

# THIS SOFTWARE IS PROVIDED "AS IS" AND WITHOUT ANY EXPRESS OR
# IMPLIED WARRANTIES, INCLUDING, WITHOUT LIMITATION, THE IMPLIED
# WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.


=begin 
    
    Name:               shadowsequence.rb
    
    Version:            0.1
    
    Install:            1) Copy 'shadowsequence.rb' and 'shadowsequence.html'
                           into your 'Plugins' directory.
                        2) Restart SketchUp.

    Description:        creates a sequence of images with changing shadows

    Usage:              set display style for the desired output
                        select from menu "Camera -> Shadow -> ShadowSequence"
                    
    Features:           free selection of image size
                        variable step between images
                        1|2|4 days a month and 1|3|7|12 months a year
                        annotating, coloring and mounting of individual images
                            if ImageMagick and Ghostscript are installed

    Issues:             stopping the script is messy

    TODO:               testing
                        add title to layout
                        
    History:            0.0 -- 2007, Aug -- first release
                        0.1 -- 2009, Jan -- removed globals,
                                            removed label option
                                            added 'fan' layout
                                            fixed file path handling

=end


require 'sketchup.rb'


module ShadowSequenceUtils

    def getOS()
        if PLATFORM =~ /darwin/i
            return 'Mac'
        else
            return 'Win'
        end
    end

    def copyImage(old,new)
        if getOS() == 'Mac'
            copy = "cp \"%s\" \"%s\"" % [old,new]
        else
            copy = "copy \"%s\" \"%s\"" % [old,new]
        end
        return systemcmd(copy)
    end
    
    def findAppPath(appname)
        app = appname.downcase()
        if getOS() == 'Win'
            app += '.exe'
        end
        uimessage("  searching '#{app}' ...", 1)
        if getOS() == 'Mac'
            p = IO.popen('which %s' % app)
            lines = p.readlines()
            p.close()
            if lines != []
                path = lines[0].strip()
                if File.exists?(path)
                    return path
                    uimessage("  => found '#{app}' in '#{path}'")
                end
            end
        elsif ENV.has_key?('Path')
            ENV['Path'].split(File::PATH_SEPARATOR).each { |p|
                if p =~ /system/i
                    uimessage("  ... skipping system folder '#{p}'", 2)
                    next ## skip system folder on Windows
                end
                path = File.join(p, app)
                if File.exists?(path)
                    uimessage("  => found '#{app}' in '#{path}'")
                    return path
                end
            }
        end
        return ''
    end
    
    def systemcmd(cmd)
        if getOS() == 'Win'
            cmd.gsub!(/\//, '\\')
        end
        uimessage("  => system command: '%s'" % cmd )
        result = system(cmd)
        printf "   => result: %s\n" % result
        if (result == true)
            return true
        else
            msg = "Error in system command:\n'%s'\nERROR=%s\n" % [cmd, $?] 
            uimessage(msg)
            return false
        end
    end  
    
    def uimessage(msg, level=0)
        @msglog.push(msg)
        #Sketchup.set_status_text msg
        printf "%s\n" % msg
    end    
    
end


class Layout

    include ShadowSequenceUtils
    
    def initialize(path, log=[])
        @imgDir = path
        @images = []
        @image_array = []
        @layout = [3,3]
        @titleLines = []
        @msglog = log
    end
   
    def addTitleLine(line)
        @titleLines.push(line)
    end
    
    def createLayout(output='', space=10)
        ## picking up from gridlayout we process the list of images
        ## in @image_array with 'montage' to create the layout
        if @image_array == []
            gridlayout()
        end
        if @image_array == []
            printf "  ERROR: no images to process!\n"
            return
        end
        ## cmdline
        if output == ''
            output = "layout_%dx%d.jpg" % [@layout[0], @layout[1]]
            output = File.join(@imgDir, output)
        end
        montage = findAppPath('montage')
        if montage == ''
            uimessage("ERROR: 'montage' not found", -2)
            return
        end
        opts = "-tile %dx%d -geometry +%d+%d" % [@layout[0], @layout[1], space, space]
        cmd = "\"%s\" \"%s\" %s \"%s\"" % [montage, @image_array.join('" "'), opts, output]
        result = systemcmd(cmd)
        if result != true
            printf "ERROR in 'montage' command:\n"
            printf "  %s\n\n" % $?
        end
    end
    
    def doFanLayout(filepath, format='jpg')
        ## combine all images into one 
        @image_array = @images.collect { |img| expandImagePath(img) }
        if @image_array.length <= 1
            return
        end
        @image_array.each { |i|
            printf "\nimg: %s\n" % i
        }
        composite = findAppPath('composite')
        if composite == ''
            uimessage("Error: 'composite' not found", -2)
            return
        end
        tmpComp = File.join(File.dirname(filepath), 'tmp.' + format)
        @image_array.each { |img|
            File.rename(filepath, tmpComp)
            cmd = "\"#{composite}\" -compose Multiply \"#{tmpComp}\" \"#{img}\" \"#{filepath}\""
            result = systemcmd(cmd)
            if result != true
                return false
            end
        }
        File.delete(tmpComp)
        return true
    end
    
    def gridlayout(ncols=3,nrows=3)
        ## Sort images into array suitable for 'montage' command
        ## i. e. flat list representing consecutive rows of the layout
        ## The number of images is reduced to fit into the grid and
        ## centre cells are filled with 'null:' (IM placeholder for
        ## 'no image').
        if @images == []
            printf "  ERROR: no images to process!\n"
            return
        end
        @layout = [ncols,nrows]
        if ncols == 1 and nrows == 1
            ## fan layout
            printf "DEBUG: @images=%d\n" % @images.length
            @image_array = @images.collect { |img| expandImagePath(img) }
            printf "DEBUG: @image_array=%d\n" % @image_array.length
            return doFanLayout()
        end 
        ## reduce number of images
        nImages = 2*nrows + ncols-2 ## left and right column, bottom row
        step = 1
        while (@images.length / step) > nImages
            printf "step %d\n" % step
            step += 1
        end
        images_sheet = []
        i = ( @images.length % step ) / 2
        while i < @images.length
            images_sheet.push(@images[i])
            i += step
        end
        if images_sheet.length > nImages:
            ## still too many images; discard last images
            uimessage("Warning: images/sheet (%d) > nImages (%d)\n" % [images_sheet.length, nImages], -1)
            while images_sheet.length > nImages:
                images_sheet.pop()
            end
        end
        while (images_sheet.length < nImages)
            ## not quite enough images; pad with 'null:'
            images_sheet = ['null:'] + images_sheet
            if images_sheet.length < nImages
                images_sheet = images_sheet + ['null:']
            end
        end
        ## arrange to suite 'montage' command line
        images_sheet = images_sheet.reverse()   ## first date is last in row
        sheet = Array.new(ncols*nrows, 'null:')
        i = 0
        while i < nrows-1
            sheet[ncols*i]         = images_sheet[i]
            sheet[ncols*i+ncols-1] = images_sheet[-i-1]
            i += 1
        end
        sheet[ncols*(nrows-1),ncols*nrows] = images_sheet.slice(i..i+ncols)
        iarray = []
        row = 0
        while row < nrows:
            names = sheet.slice(ncols*row..ncols*row+ncols-1)
            iarray.push(names)
            row += 1
        end
        iarray = iarray.flatten ## flat list for 'montage'
        @image_array = iarray.collect { |img| expandImagePath(img) }
    end 
    
    def expandImagePath(f)
        ## restore full path
        if f == 'null:'
            return f
        elsif f.index(@imgDir) == 0
            return f
        else
            return File.join(@imgDir, f)
        end 
    end 
    
    def setImages(imgList)
        ## remove path from image names in 'imgList' (for easy handling)
        if imgList[0].index(@imgDir) == 0
            @images = imgList.collect { |f| File.basename(f) }
        else
            @images = imgList
        end
    end
    
    def setImagePattern(prefix, path='')
        ## TODO: read filename from image selector
        ## match filename agains 'mm_dd' or 'HH_MM' and work out prefix
        ## filter files in directory
        @images = []
        if path != ''
            @imgDir = path
        end
        Dir.foreach(@imgDir) { |f|
        #re = Regexp.new("%s(\\d){4}_(\\d){4}_(sun|dst)" % prefix)
        re = Regexp.new("%s(\\d){4}_(\\d){4}" % prefix)
            if re.match(f)
                @images.push(f)
            end
        }
        @images.sort()
        uimessage("  prefix '%s': found %d images\n" % [prefix, @images.length],2)
    end
end



class ShadowSequence
    
    include ShadowSequenceUtils

    def initialize(mode = "time of day")
        ## set initial values
        @mode  = mode
        @model = Sketchup.active_model
        @view  = @model.active_view

        @imgWidth  = @view.vpwidth
        @imgHeight = @view.vpheight
        @imgFormat = 'jpg'
        @imgPrefix = "shadow_"
        if @model.title != ''
            @imgPrefix = @model.title + "_"
        end
        @imgDir = ''

        shTime = @model.shadow_info["ShadowTime"]
        shTime.utc
        @minStep    = 60                           # one image per hour
        @days       = [shTime.strftime("%d"),]     # current day
        @months     = [shTime.strftime("%m"),]     # current month
        #@months     = [6,9,12]  # Jun, Sep, Dec
        @dayStep    = 21                           # used for time_of_day
        @startMonth = 6
        @startDay   = 21
        @endMonth   = 12
        @endDay     = 21
        @todHour    = 12
        @todMinute  = 0
        @use_solar  = false
        @msglog     = []
        @STOPSCRIPT = false
        
        @timelist    = []
        @_layoutImages = []
        @_currentImg = ''
        @_tmpImages  = []
        
        @onlyShadows = true
        @removeTmp   = true
        @shadowColor = 'none'
        #@timeStamp   = 'NorthEast'
        @timeStamp   = 'none'
        @layoutSize  = [1, 1]
        
        @namedColors = Hash.new([80,0,0])
        @namedColors["red"]    = [80,0,0]
        @namedColors["green"]  = [0,80,0]
        @namedColors["blue"]   = [0,0,80]
        @namedColors["orange"] = [100,50,0]
        @namedColors["violet"] = [30,0,80]
        @namedColors["pink"]   = [90,0,90]
        
        @imconvert = findAppPath('convert')
        @identify = findAppPath('identify')
        @imlabelfont = ''
        #if getOS() == 'Win'
        #    @imlabelfont = 'Arial'
        #end

        ## check shadow settings and apply changes if needed
        checkShadowSettings()
        
    end # def initialize

    
    def annotate()
        if (@STOPSCRIPT == true)
            return
        end
        if @imlabelfont == ''
            uimessage("label font not set - skipping label")
            return false
        end
        if @imconvert == ''
            uimessage("'convert' not found!")
            return false
        end
        ## add labels to image
        if @timeStamp == 'none'
            return
        end
        ## fontsize from image size
        fsize = 25
        if @identify != ''
            cmd = "\"%s\" -format %s \"%s\"" % [@identify, '%%h', @_currentImg]
            if getOS() == 'Win'
                cmd.gsub!(/\//, '\\')
            end
            begin
                imageheight = IO.popen(cmd).readlines[0].to_i
                fsize = imageheight / 16
            rescue => e 
                msg = "%s\n\n%s" % [$!.message,e.backtrace.join("\n")]
                uimessage("Error reading image height:\n\n%s" % msg)
            end
        end
        text = getTimeStamp(label=true)
        f_label = getFilename('label')
        @_tmpImages.push(f_label)
        font_opts = "-font \"%s\" -pointsize %d -gravity %s" % [@imlabelfont,fsize,@timeStamp]
        cmd = "\"%s\" \"%s\" %s -annotate +10+10 \"%s\" \"%s\"" %  [@imconvert,@_currentImg,font_opts,text,f_label]
        if systemcmd(cmd) == true
            @_currentImg = f_label
            return true
        else
            uimessage("Error creating annotated image.")
            return false
        end
    end

    
    def checkDirectory
        ## check for existing files in directory @imgDir
        if (@STOPSCRIPT == true)
            return
        end
        uimessage("checkDirectory(@imgDir='%s')" % @imgDir)
        if Dir.entries(@imgDir).index(File.basename(getFilename))
            ## if filename exists in dir, the user has been shown a replace
            ## dialog by Sketchup already - no need to show it again
            uimessage("replace confirmed -> skipping message" % @imgDir)
            @msglog.push('')
            return
        end
        ## check files according to regex
        matches = false
        re = Regexp.new("%s(\\d){4}_(\\d){4}\\.%s" % [@imgPrefix, @imgFormat])
        Dir.foreach(@imgDir) { |f|
            if re.match(f)
                matches = true
                break
            end
        }
        ## show warning dialog
        if matches
            uimessage("file name pattern found in directory '%s'" % @imgDir)
            msg = "Warning: files might be overwritten! Select\n"
            msg += "'YES'     to continue\n"
            msg += "'NO'      to change file or directory\n"
            msg += "'CANCEL'  to exit script."
            result = UI.messagebox msg, MB_YESNOCANCEL, "Warning: files exist"
            if result == 7    ## no
                getPath
            elsif result == 2 ## cancel
                quit("script cancelled by user")
            end
            @msglog.push('')
        end
    end ## end checkDirectory
   
        
    def checkFilename(filename)
        ## update prefix and imgformat if filename was changed
        if (@STOPSCRIPT == true)
            return
        end
        uimessage("checkFilename('%s')" % filename, 2)
        uimessage("    old prefix: '%s'\n" % @imgPrefix, 2)
        uimessage("    old format: '%s'\n" % @imgFormat, 2)
        re = /(\d){4}_(\d){4}\./
        m = re.match(filename)
        if m
            uimessage("match: %s <> %s" % [m, filename])
            prefix = m.pre_match
            if prefix != @imgPrefix
                @imgPrefix = prefix
                uimessage("new prefix: '%s'" % @imgPrefix)
            end
            format = m.post_match
            if format != '' and format != @imgFormat
                if format =~ /png/
                    @imgFormat = 'png'
                elsif format =~ /tif/
                    @imgFormat = 'tif'
                end
                uimessage("new format: '%s'" % @imgFormat.upcase)
            end
        else
            uimessage("NO match! %s <> %s" % [re, filename], 2)
            results = UI.inputbox ["new prefix "], [@imgPrefix], "change prefix"
            if results
                prefix = results[0]
                if prefix != @imgPrefix
                    @imgPrefix = prefix
                    uimessage("new prefix: '%s'" % @imgPrefix)
                end
            else
                uimessage("prefix change cancelled by user")
                quit("prefix change cancelled by user -> exiting script ...")
            end
        end
    end ## end checkFilename
    
    
    def checkShadowSettings
        ## store shadow settings and change where necessary
        sinfo   = @model.shadow_info
        display = sinfo['DisplayShadows']
        ground  = sinfo['DisplayOnGroundPlane']
        use_sun = sinfo['UseSunForAllShading'] 
        allf  = sinfo['DisplayOnAllFaces']
        edges = sinfo['EdgesCastShadows'] 
        settings = ["\tDisplayShadows        %s" % display,
                    "\tUseSunForAllShading   %s" % use_sun,
                    "\tDisplayOnAllFaces     %s" % allf,
                    "\tDisplayOnGroundPlane  %s" % ground,
                    "\tEdgesCastShadows      %s" % edges]
        uimessage("\n%s\n" % settings.join("\n"),2)
        ## make essential changes
        if display == false
            sinfo['DisplayShadows'] = true
        end
        if ground == false
            msg = "Ground shadows are off.\nSwitch on?"
            result = UI.messagebox msg, MB_YESNO, 'Change settings'
            if result == 6
                sinfo['DisplayOnGroundPlane'] = true
                ## change ground so this setting is kept
                ground = true
            end
        end
        ## store settings in instance vars for restoreSettings
        @mopts = [display, use_sun, ground] 
        @mdate = sinfo["ShadowTime"]
        @mdate.utc
    end ## end def checkShadowSettings


    def colorize()
        ## creates image with colored shadows
        if (@STOPSCRIPT == true)
            return
        end
        if @imconvert == ''
            uimessage("'convert' not found!")
            return false
        end
        diff = difference()
        if diff == false
            return false
        end
        f_base = getFilename('base')
        f_color = getFilename('color')
        @_tmpImages.push(f_color)
        cmd = "%s \"%s\" \"%s\" -compose multiply -composite \"%s\"" %  [@imconvert,f_base,@_currentImg,f_color]
        if systemcmd(cmd) == true
            @_currentImg = f_color
            return true
        else
            uimessage("Error creating color shadow image.")
            return false
        end
    end 
    
    
    def difference()
        ## creates colored shadow only image from getFilename and baseimage
        if (@STOPSCRIPT == true)
            return
        end
        if @imconvert == ''
            uimessage("'convert' not found!")
            return false
        end
        if @shadowColor != 'none'
            ## lookup r,g,b by color name
            color = @namedColors[@shadowColor]
            col_opt = "-colorize %d,%d,%d" % color
        else
            col_opt = ''
        end
        f_base = getFilename('base')
        f_diff = getFilename('diff')
        @_tmpImages.push(f_base)
        @_tmpImages.push(f_diff)
        cmd = "\"%s\" \"%s\" \"%s\" -compose difference -composite %s -negate \"%s\"" % [@imconvert,@_currentImg,f_base,col_opt,f_diff]
        if systemcmd(cmd) == true
            @_currentImg = f_diff
            return true
        else
            uimessage("Error creating shadow only image.")
            return false
        end
    end
    
    
    def doSequence()
        begin
            showOptions
            createImages
        rescue SystemExit
            printf "ShadowSequence exit\n"
        rescue => e 
            printf "\nEXCEPTION:\n"
            msg = "\n%s\n\n%s" % [$!.message,e.backtrace.join("\n")]
            uimessage(msg)
            UI.messagebox msg, MB_MULTILINE          
        end
        restoreSettings
    end ## end def doSequence
   
        
    def stop 
        restoreSettings
        uimessage("program finished successfully\n")
        writeLog
    end 

    
    def nextFrame(view)
        ## create images from list of shadow times in sec
        if (@STOPSCRIPT == true)
            return false
        end
        sec = @timelist.shift
        if (sec == nil)
            ## new day to come
            doLayout
            if (@timelist.length == 0)
                return false    ## stop animation loop
            end
            sec = @timelist.shift
        end
        @date_tmp = Time.at(sec)
        uimessage("  current image: %s" % getFilename)
        @model.shadow_info['ShadowTime'] = @date_tmp
        view.show_frame
        saveImage
        if @imconvert != ''
            imagePostProcess
        end
        @_layoutImages.push(getFilename())
        return true
    end 

    
    def doLayout
        begin
            _doLayout
        rescue => e
            printf "Error: %s\n%s\n" % [$!.message,e.backtrace.join("\n")]
        end
    end

    def _doLayout
        if @imconvert == ''
            uimessage("\nError: ImageMagick not found!\n", -2)
            return
        end
        uimessage("\nnew layout: %d images" % @_layoutImages.length)
        layout = Layout.new(@imgDir, @msglog)
        layout.setImages(@_layoutImages)
        layout.addTitleLine(@imgPrefix.gsub("_", ""))

        if @layoutSize[0] == 1 and @layoutSize[1] == 1
            if @MODE == 'time of day'
                filepath = getFilename('', "comp_%s" % @date_tmp.strftime("%b_%d"))
            else
                filepath = getFilename('', "comp_%02d%02dh" % [@todHour, @todMinute])
            end
            saveImageBG(filepath)
            layout.doFanLayout(filepath, @imgFormat) 
        elsif @MODE == 'time of day'
            layout.gridlayout(@layoutSize[0], @layoutSize[1])
            layout.addTitleLine("time of day sequence")
            layout.addTitleLine("date: %s"    % @date_tmp.strftime("%b %d"))
            layout.addTitleLine("sunrise: %s" % @model.shadow_info['SunRise'].strftime("%H:%M"))
            layout.addTitleLine("sunset: %s"  % @model.shadow_info['SunSet'].strftime("%H:%M"))
            filename = getFilename('', "tod_%s" % @date_tmp.strftime("%b_%d"))
            uimessage("time of day sequence:")
            uimessage("    filename: %s" % filename)
            uimessage("    date:     %s" % @date_tmp.strftime("%b %d"))
            uimessage("    sunrise:  %s" % @model.shadow_info['SunRise'].strftime("%H:%M"))
            uimessage("    sunset:   %s" % @model.shadow_info['SunSet'].strftime("%H:%M"))
            layout.createLayout(filename)
        else
            layout.gridlayout(@layoutSize[0], @layoutSize[1])
            layout.addTitleLine("day of year sequence")
            filename = getFilename('', "doy_%02d_%02d" % [@todHour, @todMinute])
            uimessage("day of year sequence: '%s'" % filename)
            layout.createLayout(filename)
        end
        uimessage("")
        @_layoutImages = []
    end 

    def saveImageBG(bgname)
        @model.shadow_info['UseSunForAllShading'] = true
        @model.shadow_info['DisplayShadows'] = false
        saveImage(bgname)
        @model.shadow_info['DisplayShadows'] = true
    end
    
    def imagePostProcess()
        ## create image without shadows for diff process
        if (@STOPSCRIPT == true)
            return
        end
        saveImageBG(getFilename('base'))    
        @_tmpImages = []
        File.rename(getFilename(), getFilename('su'))
        @_tmpImages.push(getFilename('su'))
        @_currentImg = getFilename('su') 
        
        if @onlyShadows == true
            difference
        elsif @shadowColor != 'none'
            colorize
        end
        if @imlabelfont != ''
            annotate ## gs is installed
        end
        if copyImage(@_currentImg, getFilename()) == true
            if @removeTmp == true
                @_tmpImages.each { |f| File.delete(f) }
            end
        else
            uimessage("Error copying image. Temporary files are kept.")
        end
    end
        
    def getFilename(subdir='', suffix='')
        ## create filename from @imgPrefix, timestamp and @imgFormat
        if suffix == ''
            filename = @imgPrefix + getTimeStamp() + '.' + @imgFormat
        elsif @imgPrefix.slice(-1, 1) == '_'
            filename = @imgPrefix + suffix + '.' + @imgFormat
        else
            filename = @imgPrefix + '_' + suffix + '.' + @imgFormat
        end
        if subdir == ''
            filepath = File.join(@imgDir, filename)
        else
            ## check if subdir exists
            subdirpath = File.join(@imgDir, subdir)
            if not FileTest.exist?(subdirpath)
                begin
                    Dir.mkdir(subdirpath)
                    filepath = File.join(@imgDir, subdir, filename)
                    uimessage("created new subdir: '%s'" % subdirpath)
                rescue => e 
                    msg = "%s\n\n%s" % [$!.message,e.backtrace.join("\n")]
                    uimessage("Error creating directory '%s':\n\n%s" % [subdir, msg])
                    filepath = File.join(@imgDir, "%s_%s" % [subdir, filename])
                end
            else
                filepath = File.join(@imgDir, subdir, filename)
            end
        end 
        return filepath
    end
    
    def getTimeStamp(label=false)
        if label == false
            format = "%m%d_%H%M"
        else
            format = "%m/%d %H:%Mh"
        end 
        filename = @date_tmp.strftime(format)
        if @use_solar and @date_tmp.isdst
            filename = (@date_tmp-3600).strftime(format)
        end
        #if label == false
        #    if @use_solar
        #        filename += "_sun"
        #    else
        #        filename += "_dst"
        #    end
        #end
        return filename
    end
    
    def webDialog()
        dlg = UI::WebDialog.new("%s sequence options" % @MODE,true,nil, 520, 505, 150, 150, true);
        
        dlg.add_action_callback("on_close") { |d,p| d.close(); }
        ## would be called when dialog is loaded
        ## dlg.add_action_callback("onload") {|d,p| 
        ## }
        dlg.add_action_callback("small_window") {|d,p| 
            d.set_size(520,505);
            dlg.execute_script("window.location.reload()");
        }
        dlg.add_action_callback("large_window") {|d,p| 
            d.set_size(520,700);
            dlg.execute_script("window.location.reload()");
        }
        dlg.add_action_callback("on_selection_changed") {|d,p|
            _setNewValue(d,p)
        }
        dlg.add_action_callback("on_number_changed") {|d,p|
            key, value = p.split(',')
            value = value.to_i
            eval "@%s = %d" % [key, value]
            uimessage("new value: '%s' = %d" % [key, value])
        }
        dlg.add_action_callback("on_checkbox_changed") {|d,p|
            key, value = p.split(',')
            eval "@%s = %s" % [key, value]
            uimessage("new value: '%s' = %s" % [key, value])
        }
        dlg.add_action_callback("on_cancel") {|d,p|
            d.close();
            restoreSettings
            uimessage("User cancelled options dialog. Script stopped.")
        }
        dlg.add_action_callback("on_ok") {|d,p|
            #XXX read all text input variables to get latest changes
            #d.execute_script("getFinalValues()")
            d.close();
            doSequence()
        }
        #dlg.set_on_close {
        #}
        dlg.set_background_color("f3f0f0");
        html = File.dirname(__FILE__) + "/shadowsequence.html";
        dlg.set_file(html, nil)
        ## show dialog 
        dlg.show_modal {
            if @MODE == 'day of year'
                dlg.execute_script("show_optionset_day_of_year()")
            else
                dlg.execute_script("show_optionset_time_of_day()")
            end            
            if $imagemagickconvert != ''
                dlg.execute_script("show_postprocess()")
            end
            dlg.execute_script("setValue('imgWidth','%d')"  % @imgWidth);
            dlg.execute_script("setValue('imgHeight','%d')" % @imgHeight);
            dlg.execute_script("setValue('imgPrefix','%s')" % @imgPrefix);
        }
    end ## end def webDialog
  
    def _setNewValue(d,p)
        parts = p.split(',')
        key = parts[0]
        value = parts.slice(1..100).join(',')
        if key == 'layoutSize'
            a = value.split(',')
            @layoutSize = [a[0].to_i, a[1].to_i]
            if @layoutSize[0] == 1 and @layoutSize[1] == 1
                @onlyShadows = true
            end
            uimessage("new value: 'layoutSize' = [%d,%d]" % @layoutSize)
        elsif key == 'monthsSelect'
            if value == "current"
                uimessage("using current month: '%s'" % @mdate.strftime("%B"))
                @months = [@mdate.month]
            elsif value == "Jun - Dec"
                @months = (6..12).to_a
            elsif value == "Jan - Dec"
                @months = (1..12).to_a
            else ## default:  months == "Jun - Sep - Dec"
                @months = [6,9,12]
            end
            uimessage("new value: 'months' = %s" % @months.to_s)
        elsif key == 'daysSelect'
            if value == "current"
                uimessage("using current day:   '%s'" % @mdate.strftime("%d"))
                @days = [@mdate.day]
            else
                @days.clear
                value.split('|').each { |c| @days.push(c.to_i) }
                uimessage("new value: 'days' = %s" % @days.to_s)
            end
        else
            ## set instance attribute via 'eval ...' 
            eval "@%s = '%s'" % [key, value]
            uimessage("new value: '%s' = %s" % [key, value])
        end
    end
    
    def getPath
        ## show 'UI.savepanel' to get image directory and final prefix
        if (@STOPSCRIPT == true)
            return
        end
        if @imgDir == '' 
            @imgDir = Dir.getwd
        end
        ##XXX can't show UI.savepanel with filepath on Windows
        if (getOS() == 'Win')
            printf "filepath fix for windows\n" #XXX
            #imgDir = @imgDir.split('/').join("\\\\")
            imgDir = ''
        else
            imgDir = @imgDir
        end
        filepath = UI.savepanel "save images to ... ", imgDir, File.basename(getFilename)
        if (filepath)
            imgDir,newname = File.split(filepath)
            if (getOS() == "Win")
                imgDir = imgDir.split('\\').join('/')
            end
            if imgDir != @imgDir
                @imgDir = imgDir
                uimessage("new directory: '%s'" % @imgDir)
            end
            checkFilename(newname)
            checkDirectory()
        else
            quit("ShadowSequence: User cancelled path selection.")
        end
    end ## end def getPath

    
    def quit(msg)
        ## show final message and end script
        uimessage(msg)
        uimessage("program terminating ...\n")
        @STOPSCRIPT = true
    end
    
    
    def restoreSettings
        ## apply shadow settings from beginning of script
        uimessage("restoring previous settings")
        display, use_sun, ground = @mopts
        sinfo = @model.shadow_info
        sinfo['DisplayShadows'] = display
        sinfo['UseSunForAllShading'] = use_sun
        sinfo['DisplayOnGroundPlane'] = ground
        sinfo['ShadowTime'] = @mdate
    end

    
    def saveImage(filename='')
        ## save image to file
        if (@STOPSCRIPT == true)
            return
        end
        if filename == ''
            filename = getFilename()
        end
        uimessage("creating image: %s ..." % filename)
        @view.write_image(filename, @imgWidth, @imgHeight)
        uimessage("   saved as '%s'" % filename)
    end 
    
    
    def showOptions
        msg  = "\nsummary:\n"
        msg += "image size: %d x %d\n"   % [@imgWidth,@imgHeight]
        msg += "    format: '%s'\n"      % @imgFormat.upcase
        msg += "    prefix: '%s'\n"      % @imgPrefix
        msg += "    folder: '%s'\n\n"    % @imgDir
        msg += getSequenceOptions
        if $imagemagickconvert != ''
            msg += "\n\npostprocess options\n"
            msg += "      show only shadows: %s\n" % @onlyShadows
            msg += "  show shadows in color: %s\n" % @shadowColor
            msg += "    timestamp in corner: %s\n" % @timeStamp
            msg += "        mounting layout: %d x %d" % @layoutSize
        end 
        uimessage(msg, 2)
    end ## end def showOptions
    
    
    
    def writeLog
        ## create logfile if @imgDir is set
        uimessage("writeLog()", 2)
        uimessage("  @imgDir='%s'" % @imgDir, 2)
        if @imgDir != '' && File.stat(@imgDir).directory?
            @msglog.push('')
            logfile = "%slog.txt" % @prefix
            printf "writing log file '%s/%s'\n" % [@imgDir,logfile]
            f = open( [@imgDir, logfile].join('/'), 'w' )
            f.puts( @msglog.join("\n") )
            f.close
        else
            printf "Could not create log file '%s'.\n" % logfile
        end
    end
            
end ## class ShadowSequence



class DayOfYearSequence < ShadowSequence

    def initialize
        super
        @MODE = "day of year"
    end

    
    def createImages
        sec,min,hour,d,m,y,wday,yday,dst,tz = @mdate.to_a
        start_day = Time.gm(00,@todMinute,@todHour,@startDay,@startMonth,y,wday,yday,dst,tz)
        @date_tmp = Time.gm(00,@todMinute,@todHour,@startDay,@startMonth,y,wday,yday,dst,tz)
        end_day   = Time.gm(59, 59, 23, @endDay,@endMonth,y,wday,yday,dst,tz)
        @timelist = []
        while start_day < end_day
            @timelist.push(start_day.to_i)
            if start_day.isdst and @use_solar
                uimessage("DST changed: %s" % start_day, 2)
            end
            start_day += ( @dayStep*3600*24 )
        end
        @timelist.push(nil) ## create layout at end of list
        uimessage("\n%d images to create" % @timelist.nitems)
        if @imgDir == ''
            ## find path for the first image
            @imgDir = @model.path        
            getPath
        end
        uimessage("starting animation ...")
        @model.active_view.animation = self
    end 
   
    
    def getSequenceOptions
        msg = ""
        msg += "   day step: %-2d\n" % @dayStep
        msg += "start month: %-2d\n" % @startMonth
        msg += "  start day: %-2d\n" % @startDay
        msg += "  end month: %-2d\n" % @endMonth
        msg += "    end day: %-2d\n" % @endDay
        msg += "time of day: %02d:%02d" % [@todHour,@todMinute]
        return msg
    end
end 


    
class TimeOfDaySequence < ShadowSequence

    
    def initialize
        super
        @MODE = "time of day"
    end
    
    
    def createImages
        ## set shadow time for each image and save view to file
        @timelist = []
        ss,mi,hr,dd,mm,yy,wday,yday,dst,tz = @mdate.to_a
        @months.each { |month| @days.each { |day|
            @date_tmp = Time.gm(yy,month,day,12,00)
            @model.shadow_info['ShadowTime'] = @date_tmp
            sunrise = @model.shadow_info['SunRise']
            sunset  = @model.shadow_info['SunSet']
            daylist = getTimesOfDay(sunrise, sunset)
            daylist.push(nil)
            @timelist.concat(daylist)
        }}
        uimessage("\n%d images to create" % @timelist.nitems)
        if @imgDir == ''
            ## find path for the first image
            @imgDir = @model.path        
            getPath
        end
        uimessage("starting animation ...")
        @model.active_view.animation = self
    end 

    
    def getTimesOfDay(sunrise, sunset)
        ## return list of sec since epoch between sunrise and sunset
        ## start at first multiple of minStep after sunrise
        ## to get the same minutes in time stamp every day
        sec,min,h,d,m,y,wday,yday,dst,tz = sunrise.to_a
        sunriseMin = h*60 + min
        start_min = (sunriseMin/@minStep + 1 ) * @minStep
        h = start_min / 60
        min = start_min % 60
        start_time = Time.gm(00,00,h,d,m,y,wday,yday,dst,tz)
        shadow_times = []
        while start_time <= sunset
            shadow_times.push(start_time.to_i)
            start_time += ( @minStep * 60 )
        end
        return shadow_times
    end ## end def getTimesOfDay


    def getSequenceOptions
        msg = ""
        msg += "  min step: %d\n" % @minStep
        msg += "    months: %s\n" % @months.join(' | ')
        msg += "      days: %s\n" % @days.join(' | ')
        msg += "solar time: %s" % @use_solar
        return msg
    end
end


## functions for menu entries
def doToD
    ss = TimeOfDaySequence.new()
    ss.webDialog()
end 
def doDoY
    ss = DayOfYearSequence.new()
    ss.webDialog()
end 


if $DEBUG
    ## when debugging start a test run if loaded _manually_
    ## (at SU startup there is no 'active_model')
    if Sketchup.active_model
        doToD
    end
else
    ## create menu entry
    begin 
        if (not file_loaded?("shadowsequence.rb"))
            pmenu = UI.menu("Plugins")
            smenu = pmenu.add_submenu("Shadow Sequence")
            smenu.add_item("time of day") { doToD }
            smenu.add_item("day of year") { doDoY }
        end
    rescue => e 
        msg = "%s\n\n%s" % [$!.message,e.backtrace.join("\n")]
        UI.messagebox msg            
        printf "ShadowSequence: entry to menu 'Plugins' failed:\n\n%s\n" % msg
    end 
    file_loaded("shadowsequence.rb")
end
