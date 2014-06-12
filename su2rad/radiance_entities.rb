require "exportbase.rb"

module Su2rad

    class RadianceGroup < ExportBase
       
        def initialize(entity)
            @entity = entity
            uimessage("group: '%s'" % entity.name, 1)
        end
           
        def export(parenttrans)
            push()
            entities = @entity.entities
            name = getUniqueName(@entity.name)
            resetglobal = checkTransformation()
            parenttrans = setTransformation(parenttrans, resetglobal)
            
            @@nameContext.push(name)
            @@materialContext.push(getMaterial(@entity))
            
            oldglobal = $globaltrans
            $globaltrans *= @entity.transformation
            ref = exportByGroup(entities, parenttrans)
            $globaltrans = oldglobal
            
            @@materialContext.pop()
            @@nameContext.pop()
            
            if resetglobal == true
                setConfig('MAKEGLOBAL', false)
            end
            pop()
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
            if getConfig('REPLMARKS') != ''
                searchReplFile()
            end
        end
                
        def copyDataFile(transformation)
            ## copy existing .dat file to './luminaires' directory
            cpath = @entity.path
            if cpath == nil or cpath == false
                return
            end
            datapath = cpath.sub(/\.skp\z/i, '.dat')
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
                    uimessage("Error creating data file '#{datafilename}'", -2)
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
            defname = getComponentName(@entity)
            filename = getFilename("objects/#{defname}#{suffix}")
            
            f = File.new(@replacement)
            radtext = f.read()
            f.close()
            
            if $createdFiles[filename] != 1 and createFile(filename, radtext) != true
                msg = "Error creating replacement file '#{filename}'"
                uimessage(msg, -2)
                return "\n## #{msg}\n"
            else
                ref = getXform(filename, transformation)
            end
            cpdata = copyDataFile(transformation)
            if cpdata == false
                msg = "Error: could not copy data file for '#{filename}'"
                uimessage(msg, -2)
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
            if FileTest.exists?(cpath.sub(/\.skp\z/i, '.ies'))
                @iesdata = cpath.sub(/\.skp\z/i, '.ies')
                uimessage("ies data file '#{@iesdata}' found", 1)
            end
            if FileTest.exists?(cpath.sub(/\.skp\z/i, '.oct'))
                @replacement = cpath.sub(/\.skp\z/i, '.oct')
                uimessage("replacement file '#{@replacement}' found", 1)
            elsif FileTest.exists?(cpath.sub(/\.skp\z/i, '.rad'))
                @replacement = cpath.sub(/\.skp\z/i, '.rad')
                uimessage("replacement file '#{@replacement}' found", 1)
            end
        end
       
        def export(parenttrans)
            push()
            entities = @entity.definition.entities
            defname = getComponentName(@entity)
            iname = getUniqueName(@entity.name)
            
            mat = getMaterial(@entity)
            matname = getMaterialName(mat)
            alias_name = "%s_material" % defname
            @@materialContext.setAlias(mat, alias_name)
            @@materialContext.push(alias_name)
            
            ## force export to global coords if transformation
            ## can't be reproduced with xform
            resetglobal = checkTransformation()
            
            skip_export = false
            if makeGlobal?() == false
                filename = getFilename("objects/#{defname}.rad")
                if $createdFiles[filename] == 1
                    skip_export = true
                    uimessage("file 'objects/#{defname}.rad' exists -> skipping export")
                    uimessage("creating new ref for instance '#{iname}'")
                end
                @@nameContext.push(defname)  ## use definition name for file
            else
                filename = getFilename("objects/#{iname}.rad")
                @@nameContext.push(iname)    ## use instance name for file
            end
            
            parenttrans = setTransformation(parenttrans, resetglobal)
            if @iesdata != ''
                ## luminaire from IES data
                ref = copyIESLuminaire(parenttrans)
            elsif @replacement != ''
                ## any other replacement file
                ref = copyReplFile(filename, parenttrans)
            elsif skip_export == true 
                ref = getXform(filename, @entity.transformation)
            else
                oldglobal = $globaltrans
                $globaltrans *= @entity.transformation
                $inComponent.push(true)
                ref = exportByGroup(entities, parenttrans, false)
                $inComponent.pop()
                $globaltrans = oldglobal
            end
            
            @@materialContext.pop()
            @@nameContext.pop()
            pop()
            if resetglobal == true
                setConfig('MAKEGLOBAL', false)
            end
            if @replacement != '' or @iesdata != ''
                ## no alias for replacement files
                ## add to scene level components list
                @@components.push(ref)
                return ref
            else
                ref = ref.sub(defname, iname)
                return "\nvoid alias %s %s\n%s" % [alias_name, matname, ref]
            end
        end
        
        def getComponentName(e)
            ## find name for component instance
            d = e.definition
            if @@componentNames.has_key?(d)
                return @@componentNames[d]
            elsif d.name != '' and d.name != nil
                name = remove_spaces(d.name)
                @@componentNames[d] = name
                return name
            else
                name = getUniqueName('component')
                @@componentNames[d] = name
                return name
            end
        end
    end


    class RadiancePolygon < ExportBase

        attr_reader :material, :layer
        
        def initialize(face)
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
    end 


    class RadianceSky < ExportBase
        
        attr_reader :filename
        attr_reader :skytype
        attr_writer :skytype 
        
        def initialize
            @skytype = getSkyType()
            @filename = ''
            @comments = ''
            @sinfo = nil
        end
        
        def getDaysimSiteInfo
            ## return site/sky information for Daysim *.hea file
            if @sinfo == nil
                sinfo = Sketchup.active_model.shadow_info
            else
                sinfo = @sinfo
            end
            city = sinfo['City'].gsub(/\s/, '_').gsub(/\W/, '')
            text =  ""
            text += "########################\n"
            text += "### site information ###\n"
            text += "########################\n"
            text += "place %s\n"       % city
            text += "latitude %.3f\n"  % sinfo['Latitude']
            text += "longitude %.3f\n" % (sinfo['Longitude']*-1)
            text += "time_zone %d\n"   % (sinfo['TZOffset']*-15.0)
            text += "site_elevation 0.0\n"       
            text += "ground_reflectance 0.2\n"       
            text += "scene_rotation_angle %.2d\n" % sinfo['NorthAngle']
            text += "time_step 60\n"              
            text += "#wea_data_file_short C:\\DAYSIM\\wea\\CAN_ON_Ottawa_CWEC_5min.wea"
            return text
        end

        def getSkyType
            sinfo = Sketchup.active_model.shadow_info
            type = "-c"
            if sinfo['DisplayShadows'] == true
                type = "+i"
                if sinfo['UseSunForAllShading'] == true
                    type = "+s" + type
                end
            end
            return type
        end
        
        def export
            if @sinfo == nil
                sinfo = Sketchup.active_model.shadow_info
                skycmd = "!%s" % getGenSkyOptions(sinfo)
                skycmd += " | xform -rz %.1f\n\n" % (-1*sinfo['NorthAngle']) #XXX
            else
                sinfo = @sinfo
                skycmd = "!%s\n\n" % sinfo['SkyCommand']
            end
            
            text =  "## sky description for %s, %s\n" % [sinfo['City'], sinfo['Country']]
            text += "##   latitude:  %.3f\n" % sinfo['Latitude']
            text += "##   longitude: %.3f\n" % sinfo['Longitude']
            text += "\n"
            text += skycmd
            text += "skyfunc glow skyglow\n0\n0\n4 1.000 1.000 1.000 0\n"
            text += "skyglow source sky\n0\n0\n4 0 0 1 180\n\n"
            text += "skyfunc glow groundglow\n0\n0\n4 1.000 1.000 1.000 0\n"
            text += "groundglow source ground\n0\n0\n4 0 0 -1 180\n"

            city = remove_spaces(sinfo['City'])
            if sinfo['ShadowTime'].class == Time
                timestamp = sinfo['ShadowTime'].strftime("%m%d_%H%M")
            else
                skytime = Time.at(sinfo['ShadowTime_time_t'])
                if skytime.isdst == true
                    skytime -= 3600
                end
                skytime.utc             ## time zone of ShadowTime is UTC
                timestamp = skytime.strftime("%m%d_%H%M")
            end
            rpath = File.join("skies","%s_%s.sky" % [city, timestamp])
            filename = getFilename(rpath)
            filetext = @comments + "\n" + text
            if not createFile(filename, filetext)
                uimessage("Error: Could not create sky file '#{filename}'")
                @filename = ''
            else
                @filename = rpath
            end
            return @filename
        end
        
        def getGenSkyOptions(sinfo=nil)
            if sinfo == nil
                sinfo = Sketchup.active_model.shadow_info
            end
            skytime = sinfo['ShadowTime']
            if skytime.isdst == true
                skytime -= 3600
            end
            skytime.utc                 ## time zone of ShadowTime is UTC
            lat = sinfo['Latitude']
            lng = sinfo['Longitude']
            mer = "%.1f" % (sinfo['TZOffset']*-15.0)
            text = "gensky %s #{@skytype}" % skytime.strftime("%m %d %H:%M")
            text += " -a %.3f -o %.3f -m %1.f" % [lat, -1*lng, mer]
            text += " -g 0.2 -t 1.7"
            return text
        end
       
        def setSkyOptions(sinfo)
            @sinfo = sinfo
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

end # end module Su2rad
