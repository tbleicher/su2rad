require 'sketchup.rb'
require 'export_modules.rb'
require 'modules/logger.rb'


class SketchupView
    
    attr_reader :name
    attr_reader :selected
    attr_reader :current
    attr_writer :selected
    
    include JSONUtils
    include InterfaceBase
    include Tbleicher::Su2Rad::Logger
    include RadiancePath
    
    def initialize (name, current=false)
        @name = name
        @current = current
        @_fitted = false
        @page = nil
        @pageChanged = false
        @selected = false
        if current == true
            @selected = true
        end
        @updatePageView = false
        @vt = "v"
        @vp = [0,0,1]
        @vd = [0,1,0]
        @vu = [0,0,1]
        @va = 0.0
        @vo = 0.0
        @vv = 60.0
        @vh = 60.0
    end

    def activate(force=false)
        ## update screen view
        if not @page
            return
        end
        if force || @updatePageView
            old_t = @page.transition_time
            @page.transition_time = 0.1
            Sketchup.active_model.pages.selected_page = @page
            @page.transition_time = old_t
            @updatePageView = false
        end
    end
    
    def applyToPage
        begin
            if @page
                camera = @page.camera
            else
                camera = Sketchup.active_model.active_view.camera
            end
            unit = getConfig('UNIT')
            eye = [@vp[0]/unit, @vp[1]/unit, @vp[2]/unit]
            target = [eye[0]+@vd[0],eye[1]+@vd[1],eye[2]+@vd[2]]
            camera.set(eye, target, @vu)
            fitFoV(camera)
            Sketchup.active_model.active_view.show_frame()
        rescue => e
            uimessage("Error in view.applyToPage(view='#{@name}'):\n%s\n\n%s\n" % [$!.message,e.backtrace.join("\n")],-2)
            return false
        end
    end
    
    def _compareSetting(k,v)
        begin
            oldValue = eval("@%s" % k)
        rescue => e
            uimessage("error getting attribute '%s': %s" % [k, $!.message], -2)
            return false
        end
        if k == 'vt'
            if oldValue == 'l' and v != 'l'
                return true
            elsif oldValue == 'v' and v == 'l'
                return true
            else
                return false
            end
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
    
    def fitFoV(camera)
        ## calculate page camera fov to fit view
        ## set flag to avoid export of modified fov 
        @_fitted = true
        imgW = Sketchup.active_model.active_view.vpwidth.to_f
        imgH = Sketchup.active_model.active_view.vpheight.to_f
        asp_c = imgW/imgH
        asp_v = @vh/@vv
        unit = getConfig('UNIT')
        
        if @vt == 'l'
            camera.perspective = false
            if asp_c > asp_v
                camera.height = @vv/unit
            else
                camera.height = (@vh/asp_c)/unit
            end
        else
            camera.perspective = true
            if asp_c > asp_v
                camera.fov = @vv
            elsif asp_c > 1.0
                camera.fov = _getFoVAngle(@vh, imgW, imgH)
            else
                camera.fov = @vh
            end
        end
    end
    
    def _getSettingsDict
        dict = {'name' => @name, 'selected' => @selected,
                'current' => @current, 'pageChanged' => @pageChanged,
                'vt' => @vt, 'vp' => @vp, 'vd' => @vd, 'vu' => @vu,
                'vo' => @vo, 'va' => @va}
        if not @_fitted
            dict['vv'] = @vv
            dict['vh'] = @vh
        end
        if @page
            overrides = @page.attribute_dictionary('SU2RAD_VIEW')
            if overrides
                dict['overrides'] = overrides.keys()
            end
        end
        return dict
    end
    
    def getViewLine
        text = "rvu -vt#{@vt}"
        text +=   " -vp %f %f %f" % @vp
        text +=   " -vd %f %f %f" % @vd
        text +=   " -vu %f %f %f" % @vu
        text +=  " -vv #{@vv} -vh #{@vh} -vo #{@vo} -va #{@va}"
        return text
    end 
    
    def removeOverride(name)
        if @page
            begin
                if name == 'all'
                    @page.delete_attribute('SU2RAD_VIEW')
                else
                    @page.delete_attribute('SU2RAD_VIEW', name)
                end
                setViewParameters(@page.camera)
                setPage(@page)
                return true
            rescue => e
                uimessage("Error deleting override '%s' from attribute_dict 'SU2RAD_VIEW':\n%s\n\n%s\n" % [name, $!.message,e.backtrace.join("\n")],2)
                return false
            end
        else
            return true
        end
    end
    
    def _setFloatValue(k, v)
        begin
            oldValue = eval("@%s" % k)
            if oldValue != v
                eval("@%s = %s" % [k,v])
                uimessage("view '%s': new value for '%s' = '%s'" % [@name,k,v], 1)
                if k == 'vv' || k == 'vh'
                    @updatePageView = true
                end
            end
            return true
        rescue
            uimessage("view '%s': value for '%s' not a float value [v='%s']" % [@name,k,v],-2)
            return false
        end
    end
    
    def setPage(page)
        ## update view from settings in page attribute_dict
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
            if @current
                dict['selected'] = true
            end
            update(dict, false)
            @pageChanged = false #XXX
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
            eval("@%s = %s" % [k,vect])
            uimessage("view '%s': new value for '%s' = '%s'" % [@name,k,vect], 1)
            @updatePageView = true
        end
        return true
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
            if k == 'vt'
                @updatePageView = true
            end
            if (v == 'true' || v == 'false')
                eval("@%s = %s" % [k,v])
            elsif (v.class == TrueClass || v.class == FalseClass)
                eval("@%s = %s" % [k,v])
            else
                eval("@%s = '%s'" % [k,v])
            end
        end
        return true
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
    
    def show
        s =  "view: '#{@name}'  type=#{@vt}\n"
        s += "  vp: %.3f  %.3f  %.3f\n" % @vp
        s += "  vd: %.3f  %.3f  %.3f\n" % @vd
        s += "  vu: %.3f  %.3f  %.3f\n" % @vu
        s += "  vv: %.3f   vh:  %.3f\n" % [@vv, @vh]
        s += "  vo: %.3f   va:  %.3f\n" % [@vo, @va]
        printf s    ## show()
    end
        
    def showAttributes
        overrides = @page.attribute_dictionary('SU2RAD_VIEW')
        if overrides
            printf "view '#{@name}' attributes:\n"
            overrides.each_pair { |k,v| printf "  '%s' = '%s'\n" % [k,v] }
        end
    end
    
    def showCamera(c)
        unit = getConfig('UNIT')
        s =  "camera: #{c}\n"
        s += "   eye: %.3f  %.3f  %.3f\n" % [c.eye.x*unit, c.eye.y*unit, c.eye.z*unit]
        s += "   z-a: %.3f  %.3f  %.3f\n" % [c.zaxis.x, c.zaxis.y, c.zaxis.z]
        s += "    up: %.3f  %.3f  %.3f\n" % [c.up.x, c.up.y, c.up.z]
        s += "   fov: %.3f\n" % c.fov
        printf s    ## showCamera()
    end
    
    def storeSettings(overrides={})
        if not @page
            return
        end
        begin
            @page.delete_attribute('SU2RAD_VIEW')
        rescue => e
            uimessage("Error deleting attribute_dict 'SU2RAD_VIEW':\n%s\n\n%s\n" % [$!.message,e.backtrace.join("\n")],2)
        end
        if overrides == {}
            overrides = {'selected'=>true,'vt'=>true, 'vo'=>true, 'va'=>true}
        end
        begin
            d = _getSettingsDict()
            d.each_pair { |k,v|
                if overrides.has_key?(k)
                    @page.set_attribute('SU2RAD_VIEW', k, v)
                end
            }
        rescue => e
            uimessage("Error setting attributes:\n%s\n\n%s\n" % [$!.message,e.backtrace.join("\n")],-2)
            return false
        end
        if $SU2RAD_DEBUG
            showAttributes()
        end
    end

    def _getFoVAngle(ang1, side1, side2)
        ang1_rad = ang1*Math::PI/180.0
        dist = side1 / (2.0*Math::tan(ang1_rad/2.0))
        ang2_rad = 2 * Math::atan2(side2/(2*dist), 1)
        ang2 = (ang2_rad*180.0)/Math::PI
        return ang2
    end

    def toJSON
        json = toStringJSON(_getSettingsDict())
        return json
    end
    
    def update(dict, store=true)
        overrides = {'vt'=>true, 'vo'=>true, 'va'=>true}
        if dict.has_key?('vt')
            if _setViewOption('vt', dict['vt']) == true
                overrides['vt'] = true
            end
            dict.delete('vt')
        end
        dict.each_pair { |k,v|
            begin
                if (k == 'vp' || k == 'vd' || k == 'vu')
                    if _setViewVector(k, v) == true 
                        overrides[k] = true
                    end
                elsif (k == 'vv' || k == 'vh' || k == 'vo' || k == 'va')
                    if _setFloatValue(k, v) == true 
                        overrides[k] = true
                    end
                else
                    _setViewOption(k, v)
                end
            rescue => e
                uimessage("view '%s' update(key='%s',v='%s'):\n%s" % [@name,k,v,$!.message], -2)
            end
        }
        applyToPage()
        if store == true
            overrides['selected'] = @selected
            storeSettings(overrides)
        end
    end
    
end



class SketchupViewsList
    
    include JSONUtils
    include InterfaceBase
    include Tbleicher::Su2Rad::Logger

    def initialize
        @_views = {}
        initViews()
    end

    def activateView(viewname)
        if @_views.has_key?(viewname)
            view = @_views[viewname]
            view.activate(true)
        else
            uimessage("SketchupViewsList error: unknown view '%s'" % viewname, -2)
            return false
        end
    end
    
    def applyViewSettings(dlg,p)
        ## convert param to Ruby Hash object and update view
        begin
            vDict = eval(p)
            updateView(vDict)
        rescue => e 
            uimessage("Error updateFromString(): %s\n\n%s\n" % [$!.message,e.backtrace.join("\n")], -2)
            return false
        end
        dlg.execute_script("updateViewDetailsList()")
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
    
    def removeViewOverride(dlg, params)
        viewname, name = params.split('&')
        if @_views.has_key?(viewname)
            view = @_views[viewname]
            begin
                view.activate(true)
                if view.removeOverride(name) == true
                    json = "%s" % view.toJSON()
                    dlg.execute_script("setViewJSON('%s','%s')" % [encodeJSON(viewname),encodeJSON(json)])
                    uimessage("removed override '#{name}' from view '#{view.name}'", 2)
                    return true
                else
                    return false
                end
            rescue => e
                msg = "SketchupViewsList error:\n%s\n%s\n" % [$!.message, e.backtrace.join("\n")]
                uimessage(msg,-2)
                return false 
            end
        else
            uimessage("SketchupViewsList error: unknown view '%s'" % viewname, -2)
            return false
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

    def updateView(d)
        if not d.has_key?('name')
            uimessage("SketchupViewsList error: no 'name' for view", -2)
            return false
        end
        viewname = d['name']
        if @_views.has_key?(viewname)
            view = @_views[viewname]
            begin
                uimessage("updating view '#{view.name}'", 2)
                old_selected = view.selected
                view.update(d)
                view.activate()
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

