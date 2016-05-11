
require "exportbase.rb"


class MaterialConflicts < ExportBase

    def initialize(state)
        @state = state
        @model = Sketchup.active_model
        @faces = [] 
        getVisibleLayers
    end

    def getVisibleLayers
        @@visibleLayers = {}
        @model.layers.each { |l|
            if l.visible?
                @@visibleLayers[l] = 1
            end
        }
    end
        
    def findConflicts(entities=nil)
        if entities == nil
            entities = @model.entities
        end
        entities.each { |e|
            if e.class == Sketchup::Group
                if not isVisible(e)
                    next
                end
                findConflicts(e.entities)
            elsif e.class == Sketchup::ComponentInstance
                if not isVisible(e)
                    next
                end
                cdef = e.definition
                #XXX $inComponent !
                $inComponent.push(true)
                findConflicts(cdef.entities)
                $inComponent.pop()
            elsif e.class == Sketchup::Face
                if not isVisible(e)
                    next
                end
                if e.material != e.back_material
                    @faces.push(e)
                end
            end
        }
    end

    def count
        @faces = []
        findConflicts()
        if @faces.length == 1
            msg = "1 conflict found." 
        else
            msg = "%d conflicts found." % @faces.length
        end
        UI.messagebox msg, MB_OK, 'material conflicts'
    end
    
    def resolve
        if @faces.length == 0
            findConflicts()
        end
        if @faces.length == 0
            UI.messagebox "No conflicts found.", MB_OK, 'material conflicts'
        else
            @faces.each { |e|
                if e.material
                    e.back_material = e.material
                elsif e.back_material
                    e.material = e.back_material
                end
            }
            msg = "%d materials changed." % @faces.length
            UI.messagebox msg, MB_OK, 'material conflicts'
        end
    end    
end


