require 'modules/radiancepath.rb'

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
end


require 'stack.rb'

class LayerStack < Stack

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
end 


require 'stack.rb'

class MaterialStack < Stack

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
end

    
