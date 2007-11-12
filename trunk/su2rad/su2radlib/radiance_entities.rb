require "su2radlib/exportbase.rb"

class ObjMesh < ExportBase

    def getObjText(polymeshes)
        verts = []
        norms = []
        texuv = []
        tris  = []
        offset = 0
        polymeshes.each { |p|
            nverts = p.count_points
            i = 1
            while i <= nverts
                verts.push(p.point_at(i))
                norms.push(p.normal_at(i))
                texuv.push(p.uv_at(i))
            end
            p.polygons.each { |poly|
                v1 = poly[0] > 0 ? poly[0] : poly[0]*-1
                v2 = poly[1] > 0 ? poly[1] : poly[1]*-1
                v3 = poly[2] > 0 ? poly[2] : poly[2]*-1
                f = [v1+offset, v2+offset, v3=offset]
                ## if there are more than 3 vertices
                if poly.length == 4
                    v4 = poly[3] > 0 ? poly[3] : poly[3]*-1
                    f.push(v4+offset)
                end
                tris.push(f)
            }
            offset += nverts
        }
        lines = []
        verts.each { |v|
            lines.push("v  %.f %.f %.f" % v.to_a)
        }
        norms.each { |vn|
            lines.push("vn %.f %.f %.f" % vn.to_a)
        }
        texuv.each { |vt|
            lines.push("vt %.f %.f %.f" % vt.to_a)
        }
        tris.each { |t|
            line = "f %d/%d/%d %d/%d/%d %d/%d/%d" % [t[0],t[0],t[0],t[1],t[1],t[1],t[2],t[2],t[2]]
            if t.length == 4
                line += " %d/%d/%d" % [t[3],t[3],t[3]]
            end
            lines.push(line)
        }
        return lines.join("\n")
    end
end


class RadianceGroup < ExportBase
   
    def initialize(entity)
        @entity = entity
        uimessage("RadGroup: '%s'" % entity.name)
    end
       
    def export(parenttrans)
        entities = @entity.entities
        name = getUniqueName(@entity.name)
        resetglobal = false
        if isMirror(@entity.transformation) and not $MAKEGLOBAL
            resetglobal = true
            $MAKEGLOBAL = true
            uimessage("group '#{name}' is mirrored; using global coords")
        end
        if $MAKEGLOBAL == true
            parenttrans *= @entity.transformation
        else
            parenttrans = @entity.transformation
        end
        
        $nameContext.push(name)
        $materialContext.push(getMaterial(@entity))
        oldglobal = $globaltrans
        $globaltrans *= @entity.transformation
        ref = exportByGroup(entities, parenttrans)
        $globaltrans = oldglobal
        $materialContext.pop()
        $nameContext.pop()
        if resetglobal == true
            $MAKEGLOBAL = false
        end
        return ref
    end
    
end 


class RadianceComponent < ExportBase

    def initialize(entity)
        @entity = entity
        uimessage("RadComponent: '%s' [def='%s']" % [entity.name, entity.definition.name])
    end
        
    def export(parenttrans) 
        entities = @entity.definition.entities
        defname = getComponentName(@entity)
        iname = getUniqueName(@entity.name)
        
        mat = getMaterial(@entity)
        matname = getMaterialName(mat)
        alias_name = "%s_material" % defname
        $materialContext.setAlias(mat, alias_name)
        $materialContext.push(mat)
        
        resetglobal = false
        if isMirror(@entity.transformation) and not $MAKEGLOBAL
            resetglobal = true
            $MAKEGLOBAL = true
            uimessage("instance '#{iname}' is mirrored; using global coords")
        end
        skip_export = false
        if $MAKEGLOBAL == false
            filename = getFilename("objects/#{defname}.rad")
            if $createdFiles[filename] == 1
                skip_export = true
                uimessage("file 'objects/#{defname}.rad' exists -> skipping export")
                uimessage("creating new ref for instance '#{iname}'")
            end
            $nameContext.push(defname)  ## use definition name for file
        else
            filename = getFilename("objects/#{iname}.rad")
            $nameContext.push(iname)    ## use instance name for file
        end
        if skip_export == true 
            ref = getXform(filename, @entity.transformation)
        else
            if $MAKEGLOBAL == true
                parenttrans *= @entity.transformation
            else
                parenttrans = @entity.transformation
            end
            oldglobal = $globaltrans
            $globaltrans *= @entity.transformation
            $inComponent = true
            ref = exportByGroup(entities, parenttrans, false)
            $inComponent = false
            $globaltrans = oldglobal
        end
        $materialContext.pop()
        $nameContext.pop()
        if resetglobal == true
            $MAKEGLOBAL = false
        end
        ref = ref.sub(defname, iname)
        return "\nvoid alias %s %s\n%s" % [alias_name, matname, ref]
    end
    
    def getComponentName(e)
        ## find name for component instance
        d = e.definition
        if $componentNames.has_key?(d)
            return $componentNames[d]
        elsif d.name != '' and d.name != nil
            name = remove_spaces(d.name)
            $componentNames[d] = name
            return name
        else
            name = getUniqueName('component')
            $componentNames[d] = name
            return name
        end
    end
end


class RadiancePolygon < ExportBase

    attr_reader :material, :layer
    
    def initialize(face, index=0)
        @face = face
        @layer = face.layer
        @material = getMaterial(face)
        @index = index
        @verts = []
        @triangles = []
        if $TRIANGULATE == true
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
        if $TRIANGULATE == true
            if @triangles.length == 0
                uimessage("WARNING: no triangles found for polygon")
                return ""
            end
            text = ''
            count = 0
            @triangles.each { |points|
                text += getPolygon(points, count, trans)
                count += 1
            }
        else
            points = @verts.collect { |v| v.position }
            text = getPolygon(points, 0, trans)
        end
        return text       
    end

    def getPolygon(points,count, trans)
        ## store text for byColor/byLayer export
        worldpoints = points.collect { |p| p.transform($globaltrans) }
        matname = getMaterialName(@material)
        poly = "\n%s polygon f_%d_%d\n" % [matname, @index, count]
        poly += "0\n0\n%d\n" % [worldpoints.length*3]
        worldpoints.each { |wp|
            poly += "    %f  %f  %f\n" % [wp.x*$UNIT,wp.y*$UNIT,wp.z*$UNIT]
        }
        if not $byColor.has_key?(matname)
            $byColor[matname] = []
            uimessage("new material for 'by Color': '#{matname}'")
        end
        $byColor[matname].push(poly)
        
        layername = remove_spaces(@layer.name)
        if $RADPRIMITIVES.has_key?(layername)
            layername = "layer_" + layername
        end
        if not $byLayer.has_key?(layername)
            $byLayer[layername] = []
        end
        $byLayer[layername].push(poly.sub(matname, layername))
            
        ## return text for byGroup export
        text = "\n%s polygon t_%d_%d\n" % [getMaterialName(@material), @index, count]
        text += "0\n0\n%d\n" % [points.length*3]
        points.each { |p|
            if trans != nil
                p.transform!(trans)
            end
            text += "    %f  %f  %f\n" % [p.x*$UNIT,p.y*$UNIT,p.z*$UNIT]
        }
        return text
    end

    def isNumeric 
        if @face.layer.name.downcase == 'numeric'
            return true
        end
        return false
    end
    
    def getNumericPoints
        polymesh = @face.mesh 7 
        polymesh.transform!($globaltrans)
        points = []
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
            d = 0.25/$UNIT 
            x = bbox[0]
            while x <= bbox[2]
                y = bbox[1] 
                while y <= bbox[3]
                    p = Geom::Point3d.new(x,y,z)
                    if Geom::point_in_polygon_2D p, verts, true
                        points.push("%.2f %.2f %.2f 0 0 1" % [p.x*$UNIT, p.y*$UNIT, p.z*$UNIT])
                    end
                    y += d
                end
                x += d
            end
        }
        return points
    end
    
    def getbbox(p1,p2,p3)
        xs = [p1.x,p2.x,p3.x]
        ys = [p1.y,p2.y,p3.y]
        xs.sort!
        ys.sort!
        d = 0.25
        xmin = xs[0]*$UNIT - d
        xmin = ((xmin*4).to_i-1) / 4.0
        xmax = xs[2]*$UNIT + d
        xmax = ((xmax*4).to_i+1) / 4.0
        ymin = ys[0]*$UNIT - d
        ymin = ((ymin*4).to_i-1) / 4.0
        ymax = ys[2]*$UNIT + d
        ymax = ((ymax*4).to_i+1) / 4.0
        return [xmin/$UNIT, ymin/$UNIT, xmax/$UNIT, ymax/$UNIT]
    end
end 


class RadianceSky < ExportBase
    
    attr_reader :skytype
    attr_writer :skytype 
    
    def initialize
        @skytype = "-c"
    end
    
    def export
        sinfo = Sketchup.active_model.shadow_info
        lat = sinfo['Latitude']
        long = sinfo['Longitude']
        mer = getTimeZone(sinfo['Country'], sinfo['City'], long)
        
        text =  "!gensky %s " % sinfo['ShadowTime'].strftime("%m %d +%H:%M")
        text += " -a %.2f -o %.2f -m %1.f" % [lat, -1*long, mer]
        text += " #{@skytype} -g 0.2 -t 1.7"
        text += " | xform -rz %.1f\n\n" % (-1*sinfo['NorthAngle']) 
        text += "skyfunc glow skyglow\n0\n0\n4 1.000 1.000 1.000 0\n"
        text += "skyglow source sky\n0\n0\n4 0 0 1 180\n\n"
        text += "skyfunc glow groundglow\n0\n0\n4 1.000 1.000 1.000 0\n"
        text += "groundglow source ground\n0\n0\n4 0 0 -1 180\n"

        city = remove_spaces(sinfo['City'])
        timestamp = sinfo['ShadowTime'].strftime("%m%d_%H%M")
        filename = getFilename("skies/%s_%s.sky" % [city, timestamp])
        if not createFile(filename, text)
            uimessage("Error: Could not create sky file '#{filename}'")
            return ''
        else
            return "skies/%s_%s.sky" % [city, timestamp]
        end
    end
    
    def getTimeZone(country, city, long)
        meridian = ''
        files = Sketchup.find_support_file("locations.dat")
        if files == nil
            files = []
        end
        locations = []
        files.each { |f|
            begin
                uimessage("using locations file '#{f}'")
                fd = File.new(f, 'r')
                locations = fd.readlines()
                fd.close()
                break
            rescue
                uimessage("could not use location file: '#{f}'")
            end
        }
        re_country = Regexp.new(country)
        re_city = Regexp.new(city)
        locations.each { |l|
            l = l.strip()
            begin
                a = l.split(",")
                co = a[0].gsub('"','')
                ci = a[1].gsub('"','')
                if country == co 
                    if city == ci
                        uimessage("found location: '#{l}'")
                        delta = a[-1].to_f
                        meridian = "%.1f" % (delta*-15.0)
                        break
                    end
                end
            rescue
                uimessage("Could not use location line '#{l}'")
            end
        }
        if meridian == ''
            ## not found in locations
            delta = long.to_f / 15.0
            delta = delta.to_i
            meridian = "%.1f" % (delta*-15.0)
        end
        return meridian
    end
end    
