
require 'sketchupview.rb'

require 'modules/jsonutils.rb'
require 'modules/session.rb'

module Tbleicher

  module Su2Rad

    class SketchupViewsList
      
      include Tbleicher::Su2Rad::JSONUtils
      include Tbleicher::Su2Rad::Session

      attr_accessor :state

      def initialize(state={})
        @state = state
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
          view = Tbleicher::Su2Rad::SketchupView.new("unnamed_view", true, @state)
          view.setViewParameters(Sketchup.active_model.active_view.camera)
          @_views[view.name] = view
        else
          pages.each { |page|
            viewname = replaceChars(page.name)
            if page == pages.selected_page
              view = Tbleicher::Su2Rad::SketchupView.new(viewname, true, @state)
              view.setViewParameters(page.camera)
              view.setPage(page)
              @_views[view.name] = view
            elsif page.use_camera? == true
              view = Tbleicher::Su2Rad::SketchupView.new(viewname, false, @state)
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
      
    end # SketchupViewsList
  
  end # Su2Rad

end # Tbleicher


