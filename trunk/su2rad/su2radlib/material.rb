require "su2radlib/exportbase.rb"



class MaterialContext < ExportBase

    def initialize
        @nameStack = ['sketchup_default_material']
        @materialHash = Hash[nil => 'sketchup_default_material']
        @aliasHash = {}
    end
    
    def export(filename='')
        if filename == ''
            filename = getFilename("materials.rad")
        end
        text = "## materials.rad\n"
        if $MODE == 'by layer'
            default = getMaterialDescription(nil)
            $byLayer.each_pair { |lname,lines|
                if lines.length == 0
                    next
                end
                if $RADPRIMITIVES.has_key?(lname)
                    lname = "layer_" + lname
                end
                text += default.sub('sketchup_default_material', lname)
            }
        else
            @materialHash.each_pair { |mat,name|
                text += getMaterialDescription(mat)
            }
        end
        if not createFile(filename, text)
            uimessage("ERROR creating material file '#{filename}'")
        end
        #$texturewriter.write_all
        #$texturewriter = nil
    end

    def setAlias(material, alias_name)
        return
        if @aliasHash.has_key?(alias_name)
            m = @aliasHash[alias_name]
            if m != material
                old = _getName(m)
                new = _getName(material)
                uimessage("WARNING: changing alias '#{alias_name}' from '#{old}' to '#{new}'")
            end
        else
            uimessage("new alias name '#{alias_name}' for material '#{_getName(material)}'")
        end
        @aliasHash[alias_name] = material
    end

    def getCurrentMaterialName
        if @nameStack.length > 0
            return @nameStack[-1]
        else
            return 'sketchup_default_material'  #XXX
        end
    end

    def pop
        return @nameStack.pop()
    end

    def push(mat)
        if mat != nil
            name = _getName(mat)
            @nameStack.push(name)
        else
            @nameStack.push(@nameStack[-1])
        end
    end

    def getEntityMaterial(entity)
        begin
            material = entity.material
        rescue
            material = nil
        end
        if entity.class == Sketchup::Face
            if material == nil
                material = entity.back_material
            elsif entity.back_material != nil
                front = getMaterialName(entity.material)
                back = getMaterialName(entity.back_material)
                if front != back
                    uimessage("WARNING: front vs. back material: '%s' - '%s'" % [front, back])
                end 
            end
        end
        if material != nil
            @materialHash[material] = _getName(material)
        end
        return material
    end
    
    def getMaterialName(mat)
        if mat == nil
            return getCurrentMaterialName()
        end
        if mat.class != Sketchup::Material
            mat = getEntityMaterial(mat)
        end
        return _getName(mat)
    end
    
    def _getName(mat)
        ## generate a name that's save to use in Radiance
        if @materialHash.has_key?(mat)
            return @materialHash[mat]
        elsif mat.display_name == ''
            name = mat.name
            if name == ''
                name = "material_id%s" % mat.id
                mat.name = name
            end
            mat.display_name = name
        else
            name = mat.display_name
        end
        if (name =~ /\d/) == 0
            ## names starting with numbers can't be used in Radiance
            name = 'sketchup_' + name
        end
        name = remove_spaces(name)
        @materialHash[mat] = name
        return name
    end
    
    def getMaterialDescription(material)
        if material == nil
            s  = "\n## default material"
            s += "\nvoid plastic sketchup_default_material"
            s += "\n0\n0\n5 0.4 0.4 0.4 0 0\n"
            return s
        end
        name = _getName(material)
        text = $materialDescriptions[name]
        if text != nil
            return text
        end
        text = "\n## material conversion from Sketchup rgb color"
        c = material.color
        r = c.red/300.0         #XXX
        g = c.green/300.0       #XXX
        b = c.blue/300.0        #XXX
        spec = 0.0
        rough = 0.0
        #XXX color.alpha does not work in SketchUp
        if c.alpha >= 250
            text += "\nvoid plastic #{name}"
            text += "\n0\n0\n5"
            text += "  %.4f %.4f %.4f %.3f %.3f\n" % [r,g,b,spec,rough]
        elsif c.alpha >= 55     ## treshold to use glass or trans
            trans = c.alpha/255.0 #XXX
            transspec = 0.2
            text += "\nvoid trans #{name}"
            text += "\n0\n0\n7"
            text += "  %.4f %.4f %.4f %.3f %.3f %.3f %.3f\n" % [r,g,b,spec,rough,trans,transspec]
        else
            text += "\nvoid glass #{name}"
            text += "\n0\n0\n3"
            text += "  %.4f %.4f %.4f\n" % [r,g,b]
        end
        return text
    end
end






class MaterialConflicts < ExportBase

    def initialize
        @model = Sketchup.active_model
        @faces = [] 
        getVisibleLayers
    end

    def getVisibleLayers
        $visibleLayers = {}
        @model.layers.each { |l|
            if l.visible?
                $visibleLayers[l] = 1
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
                $inComponent = true
                findConflicts(cdef.entities)
                $inComponent = false
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



