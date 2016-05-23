require "exportbase.rb"

module Tbleicher

  module Su2Rad

    class RadiancePolygon < Tbleicher::Su2Rad::ExportBase

      attr_reader :material, :layer
    
      def initialize(face, state)
        @state = state
        $SU2RAD_COUNTER.add("faces")
        @face = face
        @layer = face.layer
        @material = getMaterial(face)
        @index = $SU2RAD_COUNTER.getCount("faces")
        @verts = []
        @triangles = []
        if getConfig('TRIANGULATE') == true
          polymesh = @face.mesh 7 
          polymesh.polygons.each { |p|
            verts = []
            [0,1,2].each { |i|
              idx = p[i]
              if idx < 0
                  idx *= -1
              end
              verts.push(polymesh.point_at(idx))
            }
            @triangles.push(verts)
          }
        else
          face.loops.each { |l|
            if l.outer? == true
              @verts = l.vertices
            end
          }
          face.loops.each { |l|
            if l.outer? == false
              addLoop(l)
            end
          }
        end
      end
              
      def addLoop(l)
        ## create hole in polygon
        ## find centre of new loop
        c = getCentre(l)
        ## find closest point and split outer loop
        idx_out  = getNearestPointIndex(c, @verts)
        near_out = @verts[idx_out].position
        verts1 = @verts[0..idx_out]
        verts2 = @verts[idx_out, @verts.length] 
        ## insert vertices of loop in reverse order to create hole
        idx_in = getNearestPointIndex(near_out, l.vertices)
        verts_h = getHoleVertices(l, idx_in)
        @verts = verts1 + verts_h + verts2
      end

      def getHoleVertices(l, idx_in)
        ## create array of vertices for inner loop
        verts = l.vertices
        ## get normal for loop via cross product
        p0 = verts[idx_in].position
        if idx_in < (verts.length-1)
            p1 = verts[idx_in+1].position
        else
            p1 = verts[0].position
        end
        p2 = verts[idx_in-1].position
        v1 = Geom::Vector3d.new(p1-p0)
        v2 = Geom::Vector3d.new(p2-p0)
        normal = v2 * v1
        normal.normalize!
        ## if normal of face and hole point in same direction
        ## hole vertices must be reversed
        if normal == @face.normal
            reverse = true
        else
            dot = normal % @face.normal
        end
        ## rearrange verts to start at vertex closest to outer face
        verts1 = verts[0..idx_in]
        verts2 = verts[idx_in, verts.length]
        verts = verts2 + verts1
        if reverse == true
            verts = verts.reverse
        end
        return verts
      end

      def getCenter(l)
        return getCentre(l)
      end 
      
      def getCentre(l)
        verts = l.vertices
        x_sum = 0
        y_sum = 0
        z_sum = 0
        verts.each { |v|
          x_sum += v.position.x
          y_sum += v.position.y
          z_sum += v.position.z
        }
        n = verts.length
        if n > 0
          return Geom::Point3d.new(x_sum/n, y_sum/n, z_sum/n)
        else 
          return nil
        end
      end

      def getNearestPointIndex(p, verts)
        dists = verts.collect { |v| p.distance(v.position) }
        min = dists.sort[0]
        idx = 0
        verts.each_index { |i|
          v = verts[i]
          if p.distance(v) == min
            idx = i
            break
          end
        }
        return idx
      end
     
      def getPolyMesh(trans=nil)
        polymesh = @face.mesh 7 
        if trans != nil
            polymesh.transform! trans
        end
        return polymesh
      end
          
      def getText(trans=nil)
        if @face.area == 0
          uimessage("face.area == 0! skipping face", 1)
          return ''
        end 
        if getConfig('TRIANGULATE') == true
          if @triangles.length == 0
            uimessage("WARNING: no triangles found for polygon")
            return ""
          end
          text = ''
          count = 0
          @triangles.each { |points|
            text += getPolygonText(points, count, trans)
            count += 1
          }
        else
          points = @verts.collect { |v| v.position }
          text = getPolygonText(points, 0, trans)
        end
        return text       
      end

      def getEffectiveLayer(entity)
        layer = entity.layer
        if layer.name == 'Layer0'
            ## use layer of parent group (on stack)
            layer_s = @@layerstack.get()
            if layer_s != nil
                layer = layer_s
            else
                ## safety catch if no group on stack
                layer = Sketchup.active_model.layers["Layer0"]
            end
        end
        return layer
      end
      
      def getEffectiveLayerName(entity)
        layer = getEffectiveLayer(entity)
        return getLayerName(layer)
      end
      
      def getLayerName(layer=nil)
        if not layer
            layer = getEffectiveLayer(@face)
        end
        begin
  			  layername = remove_spaces(layer.name)
    		rescue => ex
    			uimessage("ERROR: no layer.name (%s)" % ex.message, -2)
    			layername = 'Layer0'
    		end

        layername = remove_spaces(layer.name)
        if isRadianceKeyword?(layername)
          layername = "layer_" + layername
        end
        if not @@byLayer.has_key?(layername)
          @@byLayer[layername] = []
        end
        return layername
      end
        
      def getPolygonText(points, count, trans)
        ## return chunk of text to describe face in global/local space
        skm = getEffectiveMaterial(@face)
        if skm == nil
          printf "## no material\n"
        end
        matname = getMaterialName(skm)
        
        ## create text of polygon in world coords for byColor/byLayer
        scale = getConfig('UNIT')
        worldpoints = points.collect { |p| p.transform($globaltrans) }
        wpoly = "\n%s polygon f_%d_%d\n" % [matname, @index, count]
        wpoly += "0\n0\n%d\n" % [worldpoints.length*3]
        worldpoints.each { |wp|
          wpoly += "    %f  %f  %f\n" % [wp.x*scale,wp.y*scale,wp.z*scale]
        }

        ## 'by layer': replace material in text name with layer name
        layername = getEffectiveLayerName(@face) 
        if not @@byLayer.has_key?(layername)
          @@byLayer[layername] = []
        end
        @@byLayer[layername].push(wpoly.sub(matname, layername))
            
        ## 'by color' export: if material has texture create obj format
        if not @@byColor.has_key?(matname)
          @@byColor[matname] = []
        end
        if doTextures(skm) == true
          #XXX $globaltrans or trans?
          @@byColor[matname].push(getTexturePolygon($globaltrans, matname,skm))
        else
          @@byColor[matname].push(wpoly)
        end
        
        ## 'by group': create polygon text with coords in local space
        text = "\n%s polygon t_%d_%d\n" % [getMaterialName(@material), @index, count]
        text += "0\n0\n%d\n" % [points.length*3]
        points.each { |p|
          if trans != nil
            p.transform!(trans)
          end
          text += "    %f  %f  %f\n" % [p.x*scale,p.y*scale,p.z*scale]
        }
        return text
      end

      def getTexturePolygon(trans, matname, skm)
        ## create '.obj' format description of face with uv-coordinates
        if not @@meshStartIndex.has_key?(matname)
          @@meshStartIndex[matname] = 1
        end
        imgx = skm.texture.width
        imgy = skm.texture.height
        m = getPolyMesh(trans)
        si = @@meshStartIndex[matname]
        unit = getConfig('UNIT')
        text = ''
        
        m.polygons.each { |p|
          [0,1,2].each { |i|
            idx = p[i]
            if idx < 0
              idx *= -1
            end
            v = m.point_at(idx)

            if @face.material == skm || @face.back_material == skm
              ## textures applied to face need UVHelper
              if @face.material == skm
                uvHelp = @face.get_UVHelper(true, false, @@materialContext.texturewriter)
              else
                uvHelp = @face.get_UVHelper(false, true, @@materialContext.texturewriter)
              end 
              uvq = uvHelp.get_back_UVQ(v)
              tx = uvq.x
              ty = uvq.y
              if (tx > 10 || ty > 10)
                ## something's probably not working right
                ## TODO: find better criterium for use of uv_at
                t = m.uv_at(idx,1)
                tx = t.x
                ty = t.y
              end

            else
              ## textures applied to group have to be scaled
              t = m.uv_at(idx,1)
              tx = t.x/imgx
              ty = t.y/imgy
            end

            text += "v    %f  %f  %f\n" % [v.x*unit, v.y*unit, v.z*unit]
            text += "vt   %f  %f\n"     % [tx,ty]
          }
          text += "f   %d/%d  %d/%d  %d/%d\n" % [si,si, si+1,si+1, si+2,si+2]
          si += 3
        }
        @@meshStartIndex[matname] = si
        return text
      end
    
      def isNumeric?
        if @face.layer.name.downcase == 'numeric'
          return true
        end
        return false
      end
      
      def getNumericPoints
        polymesh = @face.mesh 7 
        polymesh.transform!($globaltrans)
        points = []
        unit = getConfig('UNIT')
        polymesh.polygons.each { |p|
          verts = []
          [0,1,2].each { |i|
            idx = p[i]
            if idx < 0
              idx *= -1
            end
            verts.push(polymesh.point_at(idx))
          }
          bbox = getbbox(*verts)
          z = (verts[0].z + verts[1].z + verts[2].z) / 3.0
          d = 0.25/unit 
          x = bbox[0]
          while x <= bbox[2]
            y = bbox[1] 
            while y <= bbox[3]
              p = Geom::Point3d.new(x,y,z)
              if Geom::point_in_polygon_2D p, verts, true
                points.push("%.2f %.2f %.2f 0 0 1" % [p.x*unit, p.y*unit, p.z*unit])
              end
              y += d
            end
            x += d
          end
        }
        return points
      end
      
      def getbbox(p1,p2,p3)
        ## return bbox for 0.25m grid
        xs = [p1.x,p2.x,p3.x]
        ys = [p1.y,p2.y,p3.y]
        xs.sort!
        ys.sort!
        d = 0.25
        unit = getConfig('UNIT')
        xmin = xs[0]*unit - d
        xmin = ((xmin/d).to_i-1) * d
        xmax = xs[2]*unit + d
        xmax = ((xmax/d).to_i+1) * d
        ymin = ys[0]*unit - d
        ymin = ((ymin/d).to_i-1) * d
        ymax = ys[2]*unit + d
        ymax = ((ymax/d).to_i+1) * d
        return [xmin/unit, ymin/unit, xmax/unit, ymax/unit]
      end

    end # RadiancePolygon

  end # Su2Rad

end # Tbleicher

