require 'modules/session.rb'

module Tbleicher

  module Su2Rad

    class StatusPage 
     
      include Tbleicher::Su2Rad::Session

      attr_reader :tmplpath, :htmlpath
      attr_writer :tmplpath, :htmlpath
      
      def initialize(htmlpath)
        @htmlpath = htmlpath
        @tmplpath = File.join(File.dirname(__FILE__), "html", "exportStatsProgress.html")
        @statusHash = {"status" => "initializing"}
        @statusHash.default = 0
        @timeStart = Time.now()
        @csspath = "file://" + File.join(File.dirname(__FILE__), "html", "css") + File::SEPARATOR
        if RUBY_PLATFORM !~ /darwin/
          @csspath.gsub!(File::SEPARATOR, '/')
        end
        @shortnames = { 
          "Sketchup::ComponentInstance" => "components",
          "Sketchup::Group"    => "groups",
          "Sketchup::Material" => "materials",
          "Sketchup::Texture"  => "textures"
        }
      end
    
      def showFinal()
        if @statusHash['errors'] != 0
          @statusHash.update({"status" => "finished (errors)"})
        elsif @statusHash['warnings'] != 0
          @statusHash.update({"status" => "finished (warnings)"})
        else
          @statusHash.update({"status" => "finished"})
        end

        begin
          newtmpl = File.join(File.dirname(@tmplpath), 'exportStatsFinal.html')
          t = File.open(newtmpl, 'r')
          template = t.read()
          t.close()
          @template = template.gsub(/\.\/css\//, @csspath)
        
        rescue
          @template = @template.sub('onload="updateTimeStamp()"', '')
        end
        update()
      end
    
      def create
        begin
          t = File.open(@tmplpath, 'r')
          template = t.read()
          t.close()
          @template = template.gsub(/\.\/css\//, @csspath)
          html = @template.sub(/--STATUS--/, "initializing ...")
          h = File.open(@htmlpath, 'w')
          h.write(html)
          h.close()
          update()
          return true
        rescue => e
          puts $!.message, e.backtrace.join("\n")
          @template = ''
          return false
        end
      end

      def getStatusHTML(dict=nil)
        if dict != nil
            @statusHash.update(dict)
        end
        v = @statusHash['status']
        if v =~ /warn/i
          style = "highlightWarn"
        elsif v =~ /err/i
          style = "highlightError"
        else
          style = "highlight"
        end
        html = "<div class=\"gridLabel\"><span class=\"%s\">status:</span></div>" % style
        html += "<div class=\"gridCell\"><span class=\"%s\">%s</span></div>" % [style,v]
        a = @statusHash.to_a 
        a = a.sort()
        a.each { |k,v|
          if k != "status"
            k = @shortnames[k] if @shortnames.has_key?(k)
            html += "<div class=\"gridLabel\">%s</div><div class=\"gridCell\">%s</div>" % [v,k]
          end
        }
        html += "<div class=\"gridLabel\"><span class=\"highlight\">time:</span></div>"
        html += "<div class=\"gridCell\"><span class=\"highlight\">%d sec</span></div>" % getTimeDiff()
        return html
      end

      def getTimeDiff
        return Integer(Time.now() - @timeStart)
      end

      def show
        @timeStart = Time.now()
        if RUBY_PLATFORM =~ /darwin/
          browser = "open"
          htmlpath = @htmlpath
        else 
          browser = "\"C:\\Program Files\\Internet Explorer\\iexplore.exe\""
          htmlpath = @htmlpath.gsub(/\//, '\\')
          ## separate browser thread does not work in windows ...
          return
	      end
      	Thread.new do
          system(`#{browser} "#{htmlpath}"`)
      	end
      end
    
      def update(dict=nil)
	      if @template == ''
          return false
        end
        begin
          html = @template.sub(/--STATUS--/, getStatusHTML(dict))
          h = File.open(@htmlpath, 'w')
          h.write(html)
          h.close()
          return true
        rescue => e
          puts $!.message, e.backtrace.join("\n")
          return false
        end
      end 

    end # StatusPage

  end # Su2Rad

end # Tbleicher
