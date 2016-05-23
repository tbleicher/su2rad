require 'stack.rb'
require 'layerstack.rb'
require 'materialstack.rb'
require 'radiance.rb'

require 'modules/logger.rb'
require 'modules/radiancepath.rb'
require 'modules/session.rb'

module Tbleicher

  module Su2Rad

    class ExportBase

      include Tbleicher::Su2Rad::Session
      include Tbleicher::Su2Rad::RadiancePath
      include RadianceUtils
        
      @@materialContext = nil
      
      @@materialstack = Tbleicher::Su2Rad::MaterialStack.new()
      @@layerstack = Tbleicher::Su2Rad::LayerStack.new()
      @@matrixstack = Tbleicher::Su2Rad::Stack.new()
      @@groupstack = Tbleicher::Su2Rad::Stack.new()

      @@components = []
      
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
        $createdFiles = Hash.new()
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
            rp = Tbleicher::Su2Rad::RadiancePolygon.new(e, @state)
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
            rg = Tbleicher::Su2Rad::RadianceGroup.new(e, @state)
            ref = rg.export(parenttrans)
            references.push(ref)

          elsif e.class == Sketchup::ComponentInstance
            if not isVisible(e)
              next
            end
            rg = Tbleicher::Su2Rad::RadianceComponent.new(e, @state)
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
          rp = Tbleicher::Su2Rad::RadiancePolygon.new(f, @state)
          if rp.isNumeric?
            numpoints += rp.getNumericPoints()
          elsif makeGlobal?()
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
        if getConfig('MODE') != 'by group'
          return "## mode = '%s' -> no export" % getConfig('MODE')
        elsif @@nameContext.length <= 1
          return createMainScene(references, faces_text, parenttrans)
        else
          ref_text = references.join("\n")
          text = ref_text + "\n\n" + faces_text
          filename = getFilename( File.join('objects', getNameContext()+".rad") )
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
        $SU2RAD_COUNTER.add("%s" % @entity.class)
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
          if makeGlobal?() == false
            setConfig('MAKEGLOBAL', true)
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
        if makeGlobal?() == true and not resetglobal == true
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
        if getConfig('TEXTURES') == false
          return false
        elsif skm == nil
          return false
        elsif skm.texture == nil
          return false
        else
          return true
        end
      end
      
      def getMaterial(entity)
        return getEntityMaterial(entity)
      end
   
      def getNameContext
        return remove_spaces(@@nameContext[-1])
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
              uimessage("WARNING: front vs. back material: '%s' - '%s'" % [f,b], 2)
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
              uimessage("WARNING: front vs. back material: '%s' - '%s'" % [front, back], 2)
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
     
      def makeGlobal?
        return getConfig('MAKEGLOBAL')
      end
      
      def point_to_vector(p)
        Geom::Vector3d.new(p.x,p.y,p.z)
      end
          
      def getXform(filename, trans)
        if @@nameContext.length <= 2     #XXX ugly hack
          ## for main scene file
          path = File.join(getConfig('SCENEPATH'),getConfig('SCENENAME'),"")
        else
          path = File.join(getConfig('SCENEPATH'),getConfig('SCENENAME'),"objects","")
        end 
        filename.sub!(path, '')
        objname = @@nameContext[-1]
        if makeGlobal?()
          xform = "!xform -n #{objname} #{filename}"
        else
          xform = xformFromReplmarks(trans, filename, objname, getConfig('UNIT')) 
          if xform =~ /error/i
            uimessage("%s\n" % xform)
          end
        end
        return xform
      end 
      
      def getUniqueName(pattern="")
        if pattern == "" or pattern == nil
          pattern = "group"
        end
        pattern = getRadianceIdentifier(pattern)
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
      
      def showTransformation(trans)
        s = getConfig('UNIT')
        a = trans.to_a
        printf "  %5.2f  %5.2f  %5.2f  %5.2f\n" % a[0..3]
        printf "  %5.2f  %5.2f  %5.2f  %5.2f\n" % a[4..7]
        printf "  %5.2f  %5.2f  %5.2f  %5.2f\n" % a[8..11]
        printf "  %5.2f  %5.2f  %5.2f  %5.2f\n" % [a[12]*s, a[13]*s, a[14]*s, a[15]]
      end

    end # ExportBase

  end # Su2Rad

end # Tbleicher
