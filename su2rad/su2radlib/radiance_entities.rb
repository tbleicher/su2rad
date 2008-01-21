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

    attr_reader :replacement, :iesdata, :lampMF, :lampType
    
    def initialize(entity)
        @entity = entity
        uimessage("RadComponent: '%s' [def='%s']" % [entity.name, entity.definition.name])
        @replacement = ''
        @iesdata = ''
        @lampMF = 0.8
        @lampType = 'default'
        if $REPLMARKS != ''
            searchReplFile()
        end
    end
            
    def copyDataFile(transformation)
        ## copy existing .dat file to './luminaires' directory
        cpath = @entity.path
        if cpath == nil or cpath == false
            return
        end
        datapath = cpath.sub('.skp', '.dat')
        if FileTest.exists?(datapath)
            uimessage("distribution data file '#{datapath}' found", 1)
        else
            return
        end
        datafilename = getFilename("luminaires/#{defname}.dat")
        if $createdFiles[datafilename] != 1
            f = File.new(@iesdata)
            datatext = f.read()
            f.close()
            if createFile(datafilename, datatext) != true
                uimessage("## error creating data file '#{datafilename}'")
                return false
            end
        end
    end
    
    def setLampMF(mf=0.8)
        #TODO: get setting from property
        @lampMF = mf
    end
    
    def setLampType(ltype='default')
        #TODO: check option?
        @lampType = ltype
    end
    
    def copyIESLuminaire(transformation)
        ies2rad = "!ies2rad -s -m %f -t %s" % [@lampMF, @lampType]
        ## add filename options
        defname = getComponentName(@entity)
        ies2rad = ies2rad + " -o luminaires/#{defname} luminaires/#{defname}.ies"
        
        ## copy IES file if it's not in 'luminaires/'
        iesfilename = getFilename("luminaires/#{defname}.ies")
        if $createdFiles[iesfilename] != 1
            f = File.new(@iesdata)
            iestext = f.read()
            f.close()
            if createFile(iesfilename, iestext) != true
                return "## error creating IES file '#{iesfilename}'\n"
            end
        end

        ## combine ies2rad and transformation 
        xform = getXform(iesfilename, transformation)
        xform.sub!("!xform", "| xform")
        xform.sub!(iesfilename, "")
        return ies2rad + " " + xform + "\n"
    end
    
    def copyReplFile(filename, transformation)
        #XXX
        suffix = @replacement[@replacement.length-4,4]
        printf "SUFFIX: #{suffix}\n"
        defname = getComponentName(@entity)
        filename = getFilename("objects/#{defname}#{suffix}")
        
        f = File.new(@replacement)
        radtext = f.read()
        f.close()
        
        if $createdFiles[filename] != 1 and createFile(filename, radtext) != true
            msg = "Error creating replacement file '#{filename}'"
            uimessage(msg)
            return "\n## #{msg}\n"
        else
            ref = getXform(filename, transformation)
        end
        cpdata = copyDataFile(transformation)
        if cpdata == false
            msg = "Error: could not copy data file for '#{filename}'"
            uimessage(msg)
            return "\n## #{msg}\n"
        else
            return "\n" + ref
        end
    end
    
    def searchReplFile
        cpath = @entity.definition.path
        if cpath == nil or cpath == false
            return
        end
        if FileTest.exists?(cpath.sub('.skp', '.ies'))
            @iesdata = cpath.sub('.skp', '.ies')
            uimessage("ies data file '#{@iesdata}' found", 1)
        end
        if FileTest.exists?(cpath.sub('.skp', '.oct'))
            @replacement = cpath.sub('.skp', '.oct')
            uimessage("replacement file '#{@replacement}' found", 1)
        elsif FileTest.exists?(cpath.sub('.skp', '.rad'))
            @replacement = cpath.sub('.skp', '.rad')
            uimessage("replacement file '#{@replacement}' found", 1)
        end
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
        
        ## force export to global coords if transformation
        ## can't be reproduced with xform
        resetglobal = false
        if isMirror(@entity.transformation)
            if $MAKEGLOBAL == false
                $MAKEGLOBAL = true
                resetglobal = true
                uimessage("instance '#{iname}' is mirrored; using global coords")
            end
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
        
        if $MAKEGLOBAL == true
            parenttrans *= @entity.transformation
        else
            parenttrans = @entity.transformation
        end
        
        if @iesdata != ''
            ## luminaire from IES data
            ref = copyIESLuminaire(parenttrans) ## empty text string as arg1
        elsif @replacement != ''
            ## any other replacement file
            ref = copyReplFile(filename, parenttrans)
        elsif skip_export == true 
            ref = getXform(filename, @entity.transformation)
        else
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
        if @replacement != '' or @iesdata != ''
            ## no alias for replacement files
            ## add to scene level components list
            $components.push(ref)
            return ref
        else
            ref = ref.sub(defname, iname)
            return "\nvoid alias %s %s\n%s" % [alias_name, matname, ref]
        end
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
        @comments = ''
    end
    
    def export
        sinfo = Sketchup.active_model.shadow_info
        
        text = getGenSkyOptions(sinfo)
        text += " #{@skytype} -g 0.2 -t 1.7"
        text += " | xform -rz %.1f\n\n" % (-1*sinfo['NorthAngle']) 
        text += "skyfunc glow skyglow\n0\n0\n4 1.000 1.000 1.000 0\n"
        text += "skyglow source sky\n0\n0\n4 0 0 1 180\n\n"
        text += "skyfunc glow groundglow\n0\n0\n4 1.000 1.000 1.000 0\n"
        text += "groundglow source ground\n0\n0\n4 0 0 -1 180\n"

        city = remove_spaces(sinfo['City'])
        timestamp = sinfo['ShadowTime'].strftime("%m%d_%H%M")
        filename = getFilename("skies/%s_%s.sky" % [city, timestamp])
        filetext = @comments + "\n" + text
        if not createFile(filename, filetext)
            uimessage("Error: Could not create sky file '#{filename}'")
            return ''
        else
            return "skies/%s_%s.sky" % [city, timestamp]
        end
    end
    
    def getGenSkyOptions(sinfo)
        ## Time zone of ShadowTime is UTC. When strftime is used
        ## local tz is applied which shifts the time string for gensky.
        ## $UTC_OFFSET has to be defined to compensate this.
        if $UTC_OFFSET != nil
            ## if offset is defined change time before strftime
            skytime = sinfo['ShadowTime']
            skytime -= $UTC_OFFSET*3600
            if skytime.isdst == true
                skytime -= 3600
            end
            lat = sinfo['Latitude']
            long = sinfo['Longitude']
            mer = getTimeZone(sinfo['Country'], sinfo['City'], long)
            text = "!gensky %s " % skytime.strftime("%m %d %H:%M")
            text += " -a %.2f -o %.2f -m %1.f" % [lat, -1*long, mer]
        else
            ## use gensky with angles derieved from sun direction
            text = "## set $UTC_OFFSET to allow gensky spec with daytime\n"
            d = sinfo['SunDirection']
            dXY = Geom::Vector3d.new(d.x, d.y, 0)
            south = Geom::Vector3d.new(0, -1, 0)
            alti = d.angle_between(dXY) * 180 / 3.141592654
            if d.z < 0.0
                alti *= -1
            end
            azi  = dXY.angle_between(south) * 180 / 3.141592654
            if d.x > 0.0
                azi *= -1
            end
            text += "!gensky -ang %.3f %.3f " % [alti, azi]
        end
        return text
    end
    
    def getTimeZone(country, city, long)
        meridian = ''
        ## location data file depends on platform
        if $OS == 'MAC'
            locationdata = 'locations.dat'
        else
            locationdata = 'SketchUp.tzl'
        end
        files = Sketchup.find_support_file(locationdata)
        if files == nil
            uimessage("support file '#{locationdata}' not found")
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
                        @comments += "## location data: %s '#{l}'\n"
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
            msg = "meridian not found in location data -> calculating from long"
            uimessage(msg)
            @comments += "## %s\n" % msg
            delta = long.to_f / 15.0
            delta = delta.to_i
            meridian = "%.1f" % (delta*-15.0)
        end
        return meridian
    end

    def test
        sinfo = Sketchup.active_model.shadow_info
        lat = sinfo['Latitude']
        long = sinfo['Longitude']
        s,m,hour,day,month,y,wday,yday,isdst,zone = sinfo['ShadowTime'].to_a
        (6..12).each { |month|
            (4..20).each { |hour|
            t = Time.utc(y,month,21,hour,0,0)
            sinfo['ShadowTime'] = t
            angs = getGenSkyOptions(sinfo)
            alt = angs.split()[-2]
            azi = angs.split()[-1]
            alt = alt.to_f
            azi = azi.to_f
            gensky = "/usr/local/bin/gensky %d 21 %02d:00 -o %.2f -m -105 -a %.2f | grep alti" % [month,hour,long,lat]
            f = IO.popen(gensky)
            lines = f.readlines()
            f.close()
            begin
                parts = lines[0].split()
                galti = parts[-2].to_f
                gazim = parts[-1].to_f
                dalt = galti - alt
                dazi = gazim - azi
                if dalt.abs > 1.0 or dazi.abs > 1.0
                    print "==> %d 21 %02d:00  ->  dalt=%.2f  dazi=%.2f\n" % [month,hour,dalt, dazi]
                end
            rescue
                print "Error\n"
            end
        }}
    end
        
end    
