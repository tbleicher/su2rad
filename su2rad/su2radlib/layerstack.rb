require 'stack.rb'

module Tbleicher

  module Su2Rad

    class LayerStack < Tbleicher::Su2Rad::Stack

      def initialize
        super
        @default = Sketchup.active_model.layers['Layer0']
        @stack.push(@default)
      end

      def push(layer)
        if layer.name == 'Layer0'
          old = @stack[-1]
            @stack.push(old)
        else
            @stack.push(layer)
        end
      end

    end # layerStack

  end # Su2Rad

end # Tbleicher


