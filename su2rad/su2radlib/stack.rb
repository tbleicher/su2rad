require 'modules/radiancepath.rb'

module Tbleicher

  module Su2Rad

    class Stack

      include Tbleicher::Su2Rad::RadiancePath

      def initialize(default=nil)
        @stack = []
        @default = default
        if default != nil
          @stack.push(default)
        end
      end

      def clear
        @stack = []
      end

      def get
        if @stack.length > 0
          return @stack[-1]
        else
          return @default
        end
      end
      
      def getName
        if @stack.length > 0
          return remove_spaces(@stack[-1].name)
        else
          return @default
        end
      end
      
      def length
        return @stack.length
      end 
      
      def pop
        @stack.pop()
      end
      
      def push(element)
        @stack.push(element)
      end

      def show(name='stack')
        names = @stack.collect { |e| e.name }
        printf "#{name}: #{names.join(' - ')}\n"
      end

    end # Stack

  end # Su2Rad

end # Tbleicher

