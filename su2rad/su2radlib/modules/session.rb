##
## Tbleicher::Su2Rad::Session
##

module Tbleicher

  module Su2Rad

    module Session
       
      # method to access config values in the shared runtime config
      #
      # * *Args*    :
      #   - +key+ -> the key to look up in the config as a string
      # * *Returns* :
      #   - the value of the config option 
      # * *Raises* :
      #   - ++ ->
      #
      def getConfig(key)
        return @state.config[key]
      end
      
      # method to set or update values in the shared runtime config
      #
      # * *Args*    :
      #   - +key+ -> the key for the config option as a string
      #   - +value+ -> the (new) value for the config option 
      # * *Returns* :
      #   - the value of the config option 
      # * *Raises* :
      #   - ++ ->
      #
      def setConfig(key,value)
        @state.config[key] = value
      end

      # A convenience method to create log messages via the
      # Su2Rad::Logger module. All messages created with this
      # method are stored in a shared list and can be saved to
      # a central log file later.
      #
      # * *Args*    :
      #   - +message+ -> the text of the logging message as string
      #   - +level+ -> the severity of the message as integer (-2..4)
      #     default is 0 ("info")
      #   - +sketchup+ -> optional; default is the global Sketchup global
      #     object; this is only used for dependency injection during testing
      #   - +counter+ -> optional counter object (unused)
      #     
      def uimessage(message, level=0, sketchup=Sketchup, counter=nil)
        Su2Rad::Logger.log(message, level, sketchup, counter)
      end

    end # end Session

  end # end Su2Rad

end # end Tbleicher





