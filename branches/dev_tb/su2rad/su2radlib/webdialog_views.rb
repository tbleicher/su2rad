require 'sketchup.rb'
require 'export_modules.rb'


class SketchupView
    
    attr_reader :name
    attr_reader :selected
    attr_reader :current
    attr_writer :selected
    
    include JSONUtils
    include InterfaceBase
    include RadiancePath
    
    ## TODO:
    ## parse and format vectors
    
    def initialize (name, current=false)
        @name = name
        @current = current
        @page = nil
        @pageChanged = false
        @selected = false
        if current == true
            @selected = true
        end
        @vt = "v";
        @vp = [0,0,1];
        @vd = [0,1,0];
        @vu = [0,0,1];
        @va = 0.0;
        @vo = 0.0;
        @vv = 60.0;
        @vh = 60.0;
    end

    def createViewFile
        name = remove_spaces(@name)
        viewpath = File.join("views", "%s.vf" % name)
        filename = getFilename(viewpath)
        if not createFile(filename, getViewLine())
            msg = "Error: could not create view file '#{filename}'"
            uimessage(msg)
            return "## %s" % msg
        elsif @selected == true
            return "view=  #{name} -vf #{viewpath}"
        else
            return "# view=  #{name} -vf #{viewpath}"
        end
    end
    
    def getViewLine
        text = "rvu -vt#{@vt} -vp #{@vp} -vd #{@vd} -vu #{@vu}"
        text +=  " -vv #{@vv} -vh #{@vh} -vo #{@vo} -va #{@va}"
        return text
    end 
    
    def getOptions
        printf "\nERROR: use of view.getOptions!\n\n"
        return getViewLine()
    end
    
    def _getSettingsDict
        dict = {'name' => @name, 'selected' => @selected,
                'current' => @current, 'pageChanged' => @pageChanged,
                'vt' => @vt, 'vp' => @vp, 'vd' => @vd, 'vu' => @vu,
                'vo' => @vo, 'va' => @va, 'vv' => @vv, 'vh' => @vh}
        return dict
    end
    
    def toJSON
        json = toStringJSON(_getSettingsDict())
        return json
    end
    
    def _setFloatValue(k, v)
        begin
            oldValue = eval("@%s" % k)
            if oldValue != v
                eval("@%s = %s" % [k,v])
                uimessage("view '%s': new value for '%s' = '%s'" % [@name,k,v], 1)
            end
        rescue
            uimessage("view '%s': value for '%s' not a float value [v='%s']" % [@name,k,v],-2)
        end
    end
    
    def _setViewVector(k, value)
        ## parse v as x,y,z tripple
        if value.class == Array
            if value.length != 3
                uimessage("view '%s': value for '%s' not a vector [v='%s']" % [@name,k,v.to_s], -2)
                return false
            else
                vect = "[%.3f,%.3f,%.3f]" % value
            end
        else
            begin
                if value.index(',') != nil
                    x,y,z = value.split(',').collect { |v| v.to_f }
                else
                    x,y,z = value.split().collect { |v| v.to_f }
                end
                vect = "[%.3f,%.3f,%.3f]" % [x,y,z]
            rescue
                uimessage("view '%s': value for '%s' not a vector [v='%s']" % [@name,k,v],-2)
                return false
            end
        end
        oldVect = "[%.3f,%.3f,%.3f]" % eval("@%s" % k)
        if oldVect != vect
            uimessage("view '%s': new value for '%s' = '%s'" % [@name,k,vect], 1)
            eval("@%s = %s" % [k,vect])
        end
    end
   
    def _setViewOption(k,v)
        ## set bool or string value
        if v == 'true'
            v = true
        elsif v == 'false'
            v = false
        end
        oldValue = eval("@%s" % k)
        if v != oldValue
            uimessage("view '%s': new value for '%s' = '%s'" % [@name,k,v], 1)
            if (v == 'true' || v == 'false')
                eval("@%s = %s" % [k,v])
            elsif (v.class == TrueClass || v.class == FalseClass)
                eval("@%s = %s" % [k,v])
            else
                eval("@%s = '%s'" % [k,v])
            end
        end
    end
    
    def update(dict, store=true)
        dict.each_pair { |k,v|
            begin
                if (k == 'vp' || k == 'vd' || k == 'vu')
                    _setViewVector(k, v)
                elsif (k == 'vo' || k == 'va' || k == 'vv' || k == 'vh')
                    _setFloatValue(k, v)
                else
                    _setViewOption(k,v)
                end
            rescue => e
                uimessage("view '%s' update(key='%s',v='%s'):\n%s" % [@name,k,v,$!.message], -2)
            end
        }
        if store
            storeSettings()
        end
    end
    
    def storeSettings
        if not @page
            return
        end
        begin
            d = _getSettingsDict()
            d.delete('current')
            d.delete('pageChanged')
            d.each_pair { |k,v|
                @page.set_attribute('SU2RAD_VIEW', k, v)
            }
        rescue => e
            uimessage("Error setting attributes:\n%s\n\n%s\n" % [$!.message,e.backtrace.join("\n")],-2)
        end
    end
    
    def setViewParameters(camera)
        ## set params from camera
        unit = getConfig('UNIT')
        @vp = [camera.eye.x*unit, camera.eye.y*unit, camera.eye.z*unit]
        @vd = [camera.zaxis.x, camera.zaxis.y, camera.zaxis.z]
        @vu = [camera.up.x, camera.up.y, camera.up.z]
        imgW = Sketchup.active_model.active_view.vpwidth.to_f
        imgH = Sketchup.active_model.active_view.vpheight.to_f
        aspect = imgW/imgH
        if camera.perspective?
            @vt = 'v'
            if aspect > 1.0
                @vv = camera.fov
                @vh = _getFoVAngle(@vv, imgH, imgW)
            else
                @vh = camera.fov
                @vv = _getFoVAngle(@vh, imgW, imgH)
            end
        else
            @vt = 'v'
            @vv = camera.height*unit
            @vh = @vv*aspect
        end
    end
    
    def setPage(page)
        @page = page
        begin
            d = @page.attribute_dictionary('SU2RAD_VIEW')
        rescue => e
            uimessage("Error getting attributes:\n%s\n\n%s\n" % [$!.message,e.backtrace.join("\n")],-2)
        end
        if d != nil
            dict = Hash.new()
            d.each_pair { |k,v|
                dict[k] = v
                @pageChanged = _compareSetting(k,v) || @pageChanged
            }
            if dict.has_key?('name')
                dict.delete('name')
            end
            update(dict, false)
        end
    end

    def _compareSetting(k,v)
        begin
            oldValue = eval("@%s" % k)
        rescue => e
            uimessage("error getting attribute '%s': %s" % [k, $!.message], -2)
            return false
        end
        if k == 'vt' and (v == 'v' || v == 'l')
            ## check only perspective and parallel
            return (oldValue != v)
        elsif (k == 'vp' || k == 'vd' || k == 'vu')
            begin
                oldVect = "%.3f %.3f %.3f" % oldValue
                newVect = "%.3f %.3f %.3f" % v
                return (oldVect != newVect)
            rescue => e
                msg = "\nError while converting to vector: %s\n%s\n\n" % [$!.message, e.backtrace.join("\n")]
                uimessage(msg, -2)
                return false
            end
        else
            ## all other setting are not comparable
            return false
        end
    end
    
    def _getFoVAngle(ang1, side1, side2)
        ang1_rad = ang1*Math::PI/180.0
        dist = side1 / (2.0*Math::tan(ang1_rad/2.0))
        ang2_rad = 2 * Math::atan2(side2/(2*dist), 1)
        ang2 = (ang2_rad*180.0)/Math::PI
        return ang2
    end
end



class SketchupViewsList
    
    include JSONUtils
    include InterfaceBase

    def initialize
        @_views = {}
        initViews()
    end

    def getViewLines
        lines = @_views.values.collect { |v| v.createViewFile() }
        return lines.join("\n")
    end
    
    def initViews
        pages = Sketchup.active_model.pages
        if pages.count == 0
            view = SketchupView.new("unnamed_view", true)
            view.setViewParameters(Sketchup.active_model.active_view.camera)
            @_views[view.name] = view
        else
            pages.each { |page|
                viewname = replaceChars(page.name)
                if page == pages.selected_page
                    view = SketchupView.new(viewname, true)
                    view.setViewParameters(page.camera)
                    view.setPage(page)
                    @_views[view.name] = view
                elsif page.use_camera? == true
                    view = SketchupView.new(viewname)
                    view.setViewParameters(page.camera)
                    view.setPage(page)
                    @_views[view.name] = view
                end
            }
        end
    end
    
    def selectAllViews(dlg, p=true)
        if not p or p == 'false' 
            p = false
        else
            p = true
        end
        @_views.each_value { |v|
            v.selected = p
        }
        if p
            uimessage("%d views selected" % @_views.length, 0)
        else
            uimessage("%d views deselected" % @_views.length, 0)
        end
    end
    
    def setViewsList(dlg,p='')
        ## build and return JSON string of views (scenes)
        uimessage("SketchupViewsList: setting views list ...", 2)
        json = "["
        @_views.each_value { |v|
            json += "%s," % v.toJSON()
        }
        json += "]"
        dlg.execute_script("setViewsListJSON('%s')" % encodeJSON(json) )
    end

    def showViews(indent="",loglevel=1)
        @_views.each_value { |v|
            uimessage("%sname='%s' - selected=%s\n" % [indent, v.name, v.selected], loglevel)
        }
    end

    def updateFromString(d,p)
        ## convert param to Ruby array and update view
        begin
            vDict = eval(p)
            return updateView(vDict)
        rescue => e 
            uimessage("Error updateFromString(): %s\n\n%s\n" % [$!.message,e.backtrace.join("\n")], -2)
            return false
        end
    end
 
    def updateView(d)
        if not d.has_key?('name')
            uimessage("SketchupViewsList error: no 'name' for view", -2)
            return false
        end
        viewname = d['name']
        if @_views.has_key?(viewname)
            view = @_views[viewname]
            begin
                view.update(d)
                uimessage("updated view '#{view.name}'", 2)
                return true
            rescue => e
                msg = "SketchupViewsList error:\n%s\n%s\n" % [$!.message, e.backtrace.join("\n")]
                uimessage(msg,-2)
                return false 
            end
        else
            uimessage("SketchupViewsList error: unknown view '%s'" % viewname, -2)
            #showViews("   ", -2)
            return false
        end
    end
    
end

