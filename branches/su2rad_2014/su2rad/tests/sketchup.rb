class Model
    def materials
        { 'sketchup_default_material' => {} }
    end

    def layers
        {}
    end
end

class SketchupClass
    def active_model
        Model.new()
    end
end

class Menu
    def add_submenu(m)
        Menu.new()
    end
    def add_item(i, &block)
    end
    def add_separator
    end
end

class UIClass
    def messagebox(arg)
    end
    def menu(menuname)
        Menu.new()
    end
end

def file_loaded?(filename)
end
def file_loaded(filename)
end

UI = UIClass.new()
Sketchup = SketchupClass.new()
