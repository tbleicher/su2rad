##
## Tbleicher::Su2Rad::SessionState
##

require 'modules/logger.rb'
require 'modules/session.rb'

require 'config_class.rb'

module Tbleicher

  module Su2Rad

    class SessionState

      attr_accessor :config

      def initialize
        @config = Tbleicher::Su2Rad::RunTimeConfig.new()
      end
      
    end # end Session

  end # end Su2Rad

end # end Tbleicher





