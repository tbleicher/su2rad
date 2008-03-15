class UserDialog
    
    attr_reader :results

    def initialize
        @prompts = []
        @vars    = []
        @values  = []
        @choices = []
        @isbool  = []
        @results = []
    end

    def addOption(prompt, var, choice='')
        @prompts.push(prompt)
        @vars.push(var)
        if var.class == TrueClass
            @values.push("yes")
            @choices.push("yes|no")
            @isbool.push(true)
        elsif var.class == FalseClass
            @values.push("no")
            @choices.push("yes|no")
            @isbool.push(true)
        else
            @values.push(var)
            @choices.push(choice)
            @isbool.push(false)
        end
    end

    def show(title='options')
        ui = UI.inputbox(@prompts, @values, @choices, title)
        if not ui
            return false
        else
            ui.each_index { |i|
                if @isbool[i] == true
                    if ui[i] == 'yes'
                        @results.push(true)
                    else
                        @results.push(false)
                    end
                else
                    @results.push(ui[i])
                end
            }
        end
        return true
    end
end    



class RadianceOptions

    attr_reader :skytype
    
    def initialize
        @model = Sketchup.active_model
        
        ## rad defaults 
        @quality  = "low"
        @detail   = "medium"  
        @varia    = "medium" 
        @penumbra = "true" 
        @indirect = "2" 
        @zonetype = "Exterior"
        @zonesize = getBBox
        @skytype  = getSkyType
        @imgsize  = "768"
        @render   = ""
        
    end

    def showDialog
        ud = UserDialog.new()
        ud.addOption("QUALITY",     @quality,  "low|medium|high")
        ud.addOption("DETAIL",      @detail,   "low|medium|high")
        ud.addOption("VARIABILITY", @varia,    "low|medium|high")
        ud.addOption("PENUMBRAS",   @penumbra, "true|false")
        ud.addOption("INDIRECT",    @indirect, "1|2|3|4|5")
        ud.addOption("ZONE type",   @zonetype, "Exterior|Interior")
        ud.addOption("ZONE size",   @zonesize, "")
        ud.addOption("sky type",    @skytype,  "-c|-i|+i|-s|+s")
        ud.addOption("image size",  @imgsize,  "")
        ud.addOption("render",      @render,   "")
        if ud.show("Radiance Options") == true
            @quality  = ud.results[0]
            @detail   = ud.results[1]
            @varia    = ud.results[2]
            @penumbra = ud.results[3]
            @indirect = ud.results[4]
            @zonetype = ud.results[5]
            zonesize  = ud.results[6]
            @skytype  = ud.results[7]
            imgsize   = ud.results[8]
            @render   = ud.results[9]
            begin
                zs = zonesize.split()
                x = zs[0].to_f
                y = zs[1].to_f
                z = zs[2].to_f
                @zonesize = "%.1f %.1f %.1f" % [x,y,z]
            rescue
                print "## ERROR: Wrong format for zonesize; input ignored.\n"
            end
            begin
                i = imgsize.to_i
                @imgsize = imgsize
            rescue
                print "## ERROR: image size is not a number; input ignored.\n"
            end
        end
    end
    
    def getRadOptions
        text =  "\nRESOLUTION=   #{@imgsize}\n"
        text += "\nQUALITY=      #{@quality}\n"
        text += "DETAIL=       #{@detail}\n"
        text += "VARIABILITY=  #{@varia}\n"
        text += "PENUMBRAS=    #{@penumbra}\n"
        text += "INDIRECT=     #{@indirect}\n"
        z = @zonesize.split()
        text += "\nZONE=         #{@zonetype} 0 #{z[0]} 0 #{z[1]} 0 #{z[2]}\n"
        if @zonetype == "Exterior"
            text += "EXPOSURE=     -4\n"
        end
        text += "\nUP=           Z\n"
        if @render != ''
            text += "\nrender=     #{@render}\n"
        end
        return text
    end
    
    def getBBox
        begin
            bbox = @model.bounds
            max = bbox.max
            min = bbox.min
            x = max.x*$UNIT - min.x*$UNIT
            y = max.y*$UNIT - min.y*$UNIT 
            z = max.z*$UNIT - min.z*$UNIT
            return  "%.1f %.1f %1.f" % [x, y, z]
        rescue
            #uimessage("## Error generating bbox; using default values")
            return "10 10 10"
        end
    end
    
    def getSkyType
        sinfo = @model.shadow_info
        type = "i"
        if sinfo['UseSunForAllShading'] == true
            type = "s"
        end
        if sinfo['DisplayShadows'] == true
            type = "+" + type
        else
            type = "-" + type
        end
        return type
    end

end
