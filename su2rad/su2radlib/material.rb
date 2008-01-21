require "su2radlib/exportbase.rb"


class MaterialLibrary < ExportBase

    def initialize
        @sketchup_materials = {}        ## map name to path
        @radiance_descriptions = {}     ## map name to description
        
        initLibrary()
    end

    def initLibrary
        initLog()
        if $verbose == true
            uimessage("init material library ...")
        end
        if $SUPPORTDIR == '' or $SUPPORTDIR == nil
            uimessage("Warning: '$SUPPORTDIR' is not set. No materials available.")
            return
        end
        mdir = File.join($SUPPORTDIR, 'Materials')
        if not FileTest.directory?(mdir)
            uimessage("Warning: directory 'Materials' not found. No materials available.")
            return
        end
        lst = getSKMFiles(mdir)
        if $verbose == true
            uimessage("=> %d materials found" % lst.length)
        end
        lst.each { |path|
            filename = File.split(path)[1]
            matname = filename[0,filename.length-4]
            @sketchup_materials[matname] = path
            radname = path.sub('.skm', '.rad')
            if File.exists?(radname)
                if $verbose == true
                    uimessage("  material file '%s' found" % radname)
                end
                begin
                    f = File.new(radname, 'r')
                    text = f.read()
                    f.close()
                    text = text.strip()
                    text = "## material def from file: '%s'\n%s" % [radname, text]
                    @radiance_descriptions[matname] = text
                rescue
                    uimessage("Error reading Radiance material description from '#{radname}'")
                end
            end
        }
        if $verbose == true
            uimessage("=> %d material descriptions found" % @radiance_descriptions.length)
        end
    end
    
    def getSKMFiles(mdir)
        if $verbose == true
            uimessage("searching for materials in '#{mdir}'")
        end
        paths = []
        Dir.foreach(mdir) { |p|
            path = File.join(mdir, p)
            if p[0,1] == '.'[0,1]
                next
            elsif FileTest.directory?(path) == true
                lst = getSKMFiles(path)
                lst.each { |f| paths.push(f) }
            elsif p.downcase[-4,4] == '.skm'
                paths.push(path)
            end
        }
        return paths
    end
    
    def addMaterial(material, text)
        ## store material description in file if it doesn't exist
        matname = remove_spaces(material.display_name)
        @radiance_descriptions[matname] = text
        if $BUILD_MATERIAL_LIB == false
            return
        end
        skmfile = @sketchup_materials[matname]
        if skmfile == nil
            return
        end
        filename = skmfile.sub('.skm', '.rad')
        if not File.exists?(filename)
            begin
                f = File.new(filename, 'w')
                f.write(text)
                f.close()
            rescue
                uimessage("Error creating material description '#{filename}'!")
            end
        end
    end
    
    def getMaterialDescription(material)
        name = remove_spaces(material.display_name)
        return @radiance_descriptions[name]
    end
end




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
                old = getSaveMaterialName(m)
                new = getSaveMaterialName(material)
                uimessage("WARNING: changing alias '#{alias_name}' from '#{old}' to '#{new}'")
            end
        else
            uimessage("new alias name '#{alias_name}' for material '#{getSaveMaterialName(material)}'")
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
    
    def get(mat)
        return @materialHash[mat]
    end
    
    def has_key?(mat)
        return @materialHash.has_key?(mat)
    end
    
    def pop
        return @nameStack.pop()
    end

    def push(mat)
        if mat != nil
            name = getSaveMaterialName(mat)
            @nameStack.push(name)
        else
            @nameStack.push(@nameStack[-1])
        end
    end
    
    def set(material, name)
        @materialHash[material] = name
    end
    
    def getMaterialDescription(material)
        if material == nil
            s  = "\n## default material"
            s += "\nvoid plastic sketchup_default_material"
            s += "\n0\n0\n5 0.4 0.4 0.4 0 0\n"
            return s
        end
        name = getSaveMaterialName(material)
        text = $materialDescriptions[name]
        if text != nil
            return text
        end
        text = $MatLib.getMaterialDescription(material)
        if text == nil
            text = convertRGBColor(material, name)
            $MatLib.addMaterial(material, text)
        end
        $materialDescriptions[name] = text
        return text
    end
    
    def convertRGBColor(material, name) 
        text = "\n## material conversion from Sketchup rgb color"
        c = material.color
        r = c.red/300.0         #XXX
        g = c.green/300.0       #XXX
        b = c.blue/300.0        #XXX
        spec = 0.0
        rough = 0.0
        ## XXX color.alpha does not work in SketchUp
        ## hack: search for 'glass' in the name
        if (name.downcase() =~ /glass/) != nil
            text += "\nvoid glass #{name}"
            text += "\n0\n0\n3"
            text += "  %.4f %.4f %.4f\n" % [r,g,b]
        elsif c.alpha >= 250
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



