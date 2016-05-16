require 'stack.rb'

module Tbleicher

  module Su2Rad

    class MaterialStack < Tbleicher::Su2Rad::Stack

      def initialize
        super
        _init()
      end

      def clear
        super
        _init()
      end
      
      def _init    
        name = 'sketchup_default_material'
        m = Sketchup.active_model.materials[name]
        if m == nil
            m = Sketchup.active_model.materials.add(name)
            #m.display_name = name
            m.color = Sketchup::Color.new(0.4,0.4,0.4)
        end
        @default = m
        @stack.push(m)
        @namestack = [name]
        @hash = Hash.new()
        @hash[m] = name 
      end

      def push(material)
        if material == nil
          old = @stack[-1]
          @stack.push(old)
          @namestack.push(@hash[old])
        else
          @stack.push(material)
          name = getSaveName(material)
          @namestack.push(name)
          @hash[material] = name
        end
      end

      def getSaveName(material)
        if @hash.has_key?(material)
          return @hash[material]
        else
          name = remove_spaces(material.display_name)
          return name
        end
      end

    end # MaterialStack

  end # Su2Rad

end # Tbleicher

    
