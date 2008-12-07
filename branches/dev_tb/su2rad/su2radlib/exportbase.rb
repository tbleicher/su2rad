require 'config_class.rb'
require 'export_modules.rb'
require 'context.rb'


class ExportBase

    include InterfaceBase
    include RadiancePath
    
    @@_config = RunTimeConfig.new()
    @@_log = []
    
    @@materialContext = nil
    
    @@materialstack = MaterialStack.new()
    @@layerstack = LayerStack.new()
    @@matrixstack = Stack.new()
    @@groupstack = Stack.new()

    @@components = []
    
    @@facecount = 0
    @@uniqueFileNames = Hash.new()
    @@componentNames = Hash.new()
        
    @@byColor = Hash.new()
    @@byLayer = Hash.new()
    @@meshStartIndex = Hash.new()
    @@visibleLayers = Hash.new()
   
    def resetState
        @@materialContext.clear()
        
        @@materialstack.clear()
        @@layerstack.clear()
        @@matrixstack.clear()
        @@groupstack.clear()

        @@components = []
        @@nameContext = []
        
        @@facecount = 0
        @@uniqueFileNames = Hash.new()
        @@componentNames = Hash.new()
        
        @@byColor = Hash.new()
        @@meshStartIndex = Hash.new()
        
        ## create hash of visible layers
        @@byLayer = Hash.new()
        @@visibleLayers = Hash.new()
        Sketchup.active_model.layers.each { |l|
            @@byLayer[remove_spaces(l.name)] = []
            if l.visible?
                @@visibleLayers[l] = 1
            end
        }
        
        $filecount = 0
        $createdFiles = Hash.new()
    end
    
    def getConfig(key)
        return @@_config.get(key)
    end

    def setConfig(key,value)
        @@_config.set(key,value)
    end
   
    def getNestingLevel
        return @@groupstack.length
    end
    
    def isVisible(e)
        if $inComponent[-1] == true and e.layer.name == 'Layer0'
            return true
        elsif e.hidden?
            return false
        elsif not @@visibleLayers.has_key?(e.layer)
            return false
        end
        return true
    end
    
    def exportByCL(entity_list, mat, globaltrans)
        ## unused?
        @@materialContext.push(mat)
        lines = []
        entity_list.each { |e|
            if not isVisible(e)
                next
            elsif e.class == Sketchup::Group
                gtrans = globaltrans * e.transformation
                lines += exportByCL(e.entities, e.material, gtrans)
            elsif e.class == Sketchup::ComponentInstance
                gtrans = globaltrans * e.transformation
                $inComponent.push(true)
                lines += exportByCL(e.definition.entities, e.material, gtrans)
                $inComponent.pop()
            elsif e.class == Sketchup::Face
                @@facecount += 1
                rp = RadiancePolygon.new(e, @@facecount)
                if rp.material == nil or rp.material.texture == nil
                    face = rp.getText(globaltrans)
                else
                    face = rp.getPolyMesh(globaltrans)
                end
                lines.push([rp.material, rp.layer.name, face])
            end
        }
        @@materialContext.pop()
        return lines
    end
        
    def exportByGroup(entity_list, parenttrans, instance=false)
        ## split scene in individual files
        references = []
        faces = []
        entity_list.each { |e|
            if e.class == Sketchup::Group
                if not isVisible(e)
                    next
                end
                rg = RadianceGroup.new(e)
                ref = rg.export(parenttrans)
                references.push(ref)
            elsif e.class == Sketchup::ComponentInstance
                if not isVisible(e)
                    next
                end
                rg = RadianceComponent.new(e)
                ref = rg.export(parenttrans)
                references.push(ref)
            elsif e.class == Sketchup::Face
                if instance == false
                    ## skip layer test if instance is exported
                    if not isVisible(e)
                        next
                    end
                end
                faces.push(e)
            elsif e.class == Sketchup::Edge
                next
            else
                uimessage("WARNING: Can't export entity of type '%s'!\n" % e.class)
                next
            end
        }
        faces_text = ''
        numpoints = []
        faces.each_index { |i|
            f = faces[i]
            rp = RadiancePolygon.new(f,i)
            if rp.isNumeric
                numpoints += rp.getNumericPoints()
            elsif $MAKEGLOBAL
                faces_text += rp.getText(parenttrans)
            else
                faces_text += rp.getText()
            end
        }
        
        ## if we have numeric points save to *.fld file
        if numpoints != []
            createNumericFile(numpoints)
        end
        
        ## stats message  
        uimessage("exported entities [refs=%d, faces=%d]" % [references.length, faces.length], 1)

        ## create 'by group' files or stop here
        if $MODE == 'by layer' or $MODE == 'by color'
            return "## mode = '#{$MODE}' -> no export"
        elsif @@nameContext.length <= 1
            return createMainScene(references, faces_text, parenttrans)
        else
            ref_text = references.join("\n")
            text = ref_text + "\n\n" + faces_text
            filename = getFilename()
            if not createFile(filename, text)
                msg = "\n## ERROR: error creating file '%s'\n" % filename
                uimessage(msg)
                return msg
            else
                xform = getXform(filename, parenttrans)
                return xform
            end
        end
    end
    
    def createMainScene(references, faces_text, parenttrans)
        ## only implemented by RadianceScene
        true
    end

    def push
        uimessage("begin export #{@entity.class} name='#{@entity.name}' id='#{@entity.object_id}'")
        @@materialstack.push(@entity.material)
        @@matrixstack.push(@entity.transformation)
        @@layerstack.push(@entity.layer)
        @@groupstack.push(@entity)
    end
    
    def pop
        @@materialstack.pop()
        @@matrixstack.pop()
        @@layerstack.pop()
        @@groupstack.pop()
        uimessage("end export #{@entity.class} name='#{@entity.name}'")
    end 
    
    def prepareSceneDir(scene_dir)
        ["octrees", "images", "logfiles", "ambfiles"].each { |subdir|
            createDirectory(File.join(scene_dir,subdir))
        }
    end 
    
    def isMirror(trans)
        ##TODO: identify mirror axes
        xa = point_to_vector(trans.xaxis)
        ya = point_to_vector(trans.yaxis)
        za = point_to_vector(trans.zaxis)
        xy = xa.cross(ya)
        xz = xa.cross(za)
        yz = ya.cross(za)
        if xy.dot(za) < 0
            return true
        end
        if xz.dot(ya) > 0
            return true
        end
        if yz.dot(xa) < 0
            return true
        end
        return false
    end
    
    def checkTransformation
        resetglobal = false
        if isMirror(@entity.transformation)
            if $MAKEGLOBAL == false
                $MAKEGLOBAL = true
                resetglobal = true
                if @entity.class == Sketchup::ComponentInstance
                    name = getUniqueName(@entity.name)
                    eclass = 'instance'
                else
                    name = @entity.name
                    eclass = 'group'
                end
                uimessage("#{eclass} '#{name}' is mirrored; using global coords")
            end
        end
        return resetglobal
    end
    
    def setTransformation(parenttrans, resetglobal)
        if $MAKEGLOBAL == true and not resetglobal == true
            parenttrans *= @entity.transformation
        else
            uimessage('parenttrans = entity.transformation')
            parenttrans = @entity.transformation
        end
        return parenttrans
    end
    
    def createNumericFile(points)
        ## write points to file in a save way; if file exists merge points
        name = @@nameContext[-1]
        filename = getFilename("numeric/#{name}.fld")
        if FileTest.exists?(filename)
            uimessage("updating field '%s'" % filename)
            f = File.new(filename)
            txt = f.read()
            f.close()
            oldpoints = txt.split("\n")
            points += oldpoints
        end
        points.uniq!
        points.sort!
        text = points.join("\n")
        if not createFile(filename, text)
            uimessage("Error: Could not create numeric file '#{filename}'")
        else
            uimessage("Created field '%s' (%d points)" % [filename, points.length])
        end
    end

    def doTextures(skm)
        if skm == nil
            return false
        elsif skm.texture == nil
            return false
        elsif $TEXTURES == false
            return false
        elsif $OBJ2MESH == ''
            return false
        else
            return true
        end
    end
    
    def getFilename(name=nil)
        if name == nil
            name = File.join("objects", remove_spaces(@@nameContext[-1]))
        end
        return File.join($export_dir, $scene_name, name)
    end
    
    def getMaterial(entity)
        return getEntityMaterial(entity)
    end
   
    def getEffectiveMaterial(entity)
        frontface = true
        if entity.class == Sketchup::Face
            if entity.material == entity.back_material
                if entity.material == nil
                    m = @@materialstack.get()
                else
                    m = entity.material
                end
            else
                f = entity.material
                b = entity.back_material
                if f and b
                    m = f
                    uimessage("WARNING: front vs. back material: '%s' - '%s'" % [f,b])
                elsif f
                    m = f
                else
                    m = b
                    frontface = false
                end
            end
        elsif entity.material != nil
            m = entity.material
        end 
        if not m
            m = @@materialstack.get()
        end
        if m != nil
            @@materialContext.addMaterial(m, entity, frontface)
        end
        return m
    end

    def getEntityMaterial(entity)
        begin
            material = entity.material
        rescue
            material = nil
        end
        frontface = true
        if entity.class == Sketchup::Face
            if material == nil
                material = entity.back_material
                frontface = false
            elsif entity.back_material != nil
                front = getMaterialName(entity.material)
                back = getMaterialName(entity.back_material)
                if front != back
                    uimessage("WARNING: front vs. back material: '%s' - '%s'" % [front, back])
                end
            end
        end
        if entity != nil and material != nil
            @@materialContext.addMaterial(material, entity, frontface)
        end
        return material
    end
    
    def getMaterialName(mat)
        if mat == nil
            return @@materialContext.getCurrentMaterialName()
        end
        if mat.class != Sketchup::Material
            mat = getEntityMaterial(mat)
        end
        return @@materialContext.getSaveMaterialName(mat)
    end
    
    def point_to_vector(p)
        Geom::Vector3d.new(p.x,p.y,p.z)
    end
        
    def getXform(filename, trans)
        if @@nameContext.length <= 2     #XXX ugly hack
            ## for main scene file
            path = "%s/%s/" % [$export_dir, $scene_name]
        else
            path = "%s/%s/objects/" % [$export_dir, $scene_name]
        end 
        filename.sub!(path, '')
        suffix = filename[filename.length-4,4].downcase()
        objname = @@nameContext[-1]
        if $MAKEGLOBAL
            xform = "!xform -n #{objname} #{filename}"
        else
            #TODO: mirror 
            mirror = ""
            
            ## scale is calculated by replmarks
            ## we just check for extrem values
            a = trans.to_a
            scale = Geom::Vector3d.new(a[0..2])
            if scale.length > 10000 or scale.length < 0.0001
                uimessage("Warning unusual scale (%.3f) for object '%s'" % [scale.length, objname]) 
            end
            
            ## transformation
            scaletrans = Geom::Transformation.new(1/@@_config.get('UNIT'))
            trans = trans * scaletrans
            a = trans.to_a
            o = a[12..14]
            vx = [o[0]+a[0], o[1]+a[1], o[2]+a[2]]
            vy = [o[0]+a[4]*0.5, o[1]+a[5]*0.5, o[2]+a[6]*0.5]
            marker = "replaceme polygon #{objname}\n0\n0\n9\n"
            marker += "%.6f %.6f %.6f\n" % o
            marker += "%.6f %.6f %.6f\n" % vx 
            marker += "%.6f %.6f %.6f\n" % vy
            
            if suffix == '.oct'
                cmd = "echo '#{marker}' | replmarks -s 1.0 -i #{filename} replaceme"
            elsif suffix == '.msh'
                cmd = "echo '#{marker}' | replmarks -s 1.0 -I #{filename} replaceme"
            else
                cmd = "echo '#{marker}' | replmarks -s 1.0 -x #{filename} replaceme"
            end
            f = IO.popen(cmd)
            lines = f.readlines
            f.close()
            begin
                xform = lines[2].strip()
                parts = xform.split()
                p1 = parts[0..2]
                p2 = parts[3..30]
                xform = p1.join(" ") + " #{mirror} " + p2.join(" ")
            rescue
                msg = "ERROR: could not generate '!xform' command for file '#{filename}'"
                uimessage("%s\n" % msg)
                xform = "## %s" % msg
            end
        end
        return xform
    end 
    
    def getUniqueName(pattern="")
        if pattern == "" or pattern == nil
            pattern = "group"
        end
        pattern = remove_spaces(pattern)
        if not @@uniqueFileNames.has_key?(pattern)
            @@uniqueFileNames[pattern] = nil
            return pattern
        else
            all = @@uniqueFileNames.keys
            count = 0
            all.each { |name|
                if name.index(pattern) == 0
                    count += 1
                end
            }
            newname = "%s%02d" % [pattern, count]
            @@uniqueFileNames[newname] = nil
            return newname
        end
    end
    
    def isRadianceTransform(trans)
        ## test if trans can be created with xform (uniform scale only)
        a = trans.to_a
        vx = Geom::Vector3d.new(a[0..2])
        vy = Geom::Vector3d.new(a[4..6])
        vz = Geom::Vector3d.new(a[8..10])
        lengths = [vx.length, vy.length, vz.length]
        sorted = lengths.sort
        diff = sorted[2] - sorted[0]
        if diff > 0.01
            uimessage("  scale not uniform: sx=%.2f sy=%.2f sz=%.2f\n" % lengths)
            return false
        end
        return true
    end
    
    def showTransformation(trans)
        a = trans.to_a
        printf "  %5.2f  %5.2f  %5.2f  %5.2f\n" % a[0..3]
        printf "  %5.2f  %5.2f  %5.2f  %5.2f\n" % a[4..7]
        printf "  %5.2f  %5.2f  %5.2f  %5.2f\n" % a[8..11]
        printf "  %5.2f  %5.2f  %5.2f  %5.2f\n" % [a[12]*$UNIT, a[13]*$UNIT, a[14]*$UNIT, a[15]]
    end

end 
