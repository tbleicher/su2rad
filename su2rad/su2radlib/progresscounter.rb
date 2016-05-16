
module Tbleicher

  module Su2Rad

    class ProgressCounter

      def initialize
        @stats = {'status' => 'running'}
        @stats.default = 0
        @statusPage = nil
        @timeStart = Time.now()
      end

      def add(key)
        if key.class != String
          key = key.class.to_s
        end
        key.strip!()
        @stats[key] += 1
        val = @stats[key]
        if key == 'faces' && val.divmod(1000)[1] == 0
          updateStatus()
        elsif val.divmod(10)[1] == 0
          updateStatus()
        end
      end

      def getCount(key)
        return @stats[key]
      end

      def setStartTime
        @timeStart = Time.now()
      end

      def setStatusPage(page)
        @statusPage = page
      end

      def getStatusLine
        status = @stats['status']
        groups = @stats['Sketchup::Group'] + @stats['Sketchup::ComponentInstance']
        faces  = @stats['Sketchup::Faces'] + @stats['faces'] 
        return "status: %s (groups=%d, faces=%d)" % [status, groups, faces]
      end

      def setStatusText
        Sketchup.set_status_text(getStatusLine(), SB_PROMPT)
        Sketchup.set_status_text("time", SB_VCB_LABEL)
        sec = Time.now() - @timeStart
        Sketchup.set_status_text("%.1f sec" % sec, SB_VCB_VALUE)
      end

      def updateStatus
        if @stats.has_key?('errors')
          @stats['status'] = 'running (errors)'
        elsif @stats.has_key?('warnings')
          @stats['status'] = 'running (warnings)'
        end
        if @statusPage != nil
          @statusPage.update(@stats)
        end
        setStatusText()
      end

      def pprint()
        printf "progress:\n"
        @stats.each_pair { |k,v|
          printf "%15s - %d\n" %  [k,v]
        }
      end

    end # ProgressCounter

  end # Su2Rad

end # Tbleicher