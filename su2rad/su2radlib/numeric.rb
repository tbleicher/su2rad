require "exportbase.rb"
require "delauney_mod.rb"

class NumericImport < ExportBase
    
    include Delauney
    
    def initialize(filename='')
        @bbox = [0,0,1,1]   ## [xmin,ymin,xmax,ymax]
        @clevels = []       ## list of contour level heights
        @filename = ''      ## values file to be read
        @index_value = 6    ## index of column of df/lux values
        @labelSide = '+x'   ## display labels to the left (-x) or right (+x)
        @labelLeaderLength = 4
        @lines = []         ## raw lines in values file
        @maxvalue = 0.0     ## max in values
        @scalevalue = 1     ## scale of surface 'height' (e.g. 500lx/m)
        @surface = nil      ## replaced with Sketchup group
        @zOffset = $ZOFFSET ## config for offset of value scale
        if filename != ''
            loadFile(filename)
        end
    end

    def addContourLines()
        if @surface == nil
            return
        end
        steps = [0.1,0.2,0.5,1.0,2.0,5.0,10,20,50,100,200,500,1000,2000,5000,10000]
        step = 100.0
        steps.each { |step|
            if @maxvalue / step < 10
                uimessage("step value: '%.2f'" % step)
                break
            end
        }
        @clevels = []
        v = 0
        while v < @maxvalue
            v += step
            z = v/@scalevalue + @zOffset
            @clevels.push([z,v])
        end
        s_ents = @surface.entities
        ents = Sketchup.active_model.entities
        cl = ents.add_group
        @clevels.each { |z,v|
            p1 = [@bbox[0], @bbox[1], z/$UNIT]
            p2 = [@bbox[2], @bbox[1], z/$UNIT]
            p3 = [@bbox[2], @bbox[3], z/$UNIT]
            p4 = [@bbox[0], @bbox[3], z/$UNIT]
            face = cl.entities.add_face [p1,p2,p3,p4]
        }
        polys = []
        @surface.entities.each { |e|
            if e.class == Sketchup::Face
                polys.push(e)
            end
        }
        cl.entities.intersect_with(true, cl.transformation, @surface, @surface.transformation, true, polys)
        ents.erase_entities(cl)
    end

    def addLabels
        if @surface == nil
            return
        end
        points = {}
        values = {}
        @clevels.each { |z,v|
            key = "%.2f" % z
            points[key] = []
            values[key] = v
        }
        @surface.entities.each { |e|
            if e.class == Sketchup::Edge
                [e.start.position, e.end.position].each { |p|
                    z = "%.2f" % (p.z*$UNIT)
                    if points.has_key?(z)
                        points[z].push([p.x,p.y,p.z])
                    end
                }
            end
        }
        if @labelSide == '+x'
            dy = @labelLeaderLength
        else
            dy = -1*@labelLeaderLength
        end
        vector = Geom::Vector3d.new(0,dy,@labelLeaderLength)
        points.each_pair { |z,verts|
            if verts.length != 0
                verts.sort!
                if @labelSide == '+x'
                    p = verts[-1]
                else
                    p = verts[0]
                end
                begin
                    point = Geom::Point3d.new(p[0], p[1], p[2])
                    text = @surface.entities.add_text("%d lux" % values[z], point)
                    text.vector = vector
                    text.leader_type = 1
                    text.display_leader = true
                    text.arrow_type = 0
                rescue
                    uimessage("could not create label for contour line at '#{z}'")
                end
            end
        }
    end
    
    def loadFile(filename='')
        if filename == ''
            filename = UI.openpanel("import numeric results", '', '')
        end
        if not filename
            uimessage("import canceled")
            return
        end
        f = File.new(filename)
        text = f.read()
        @lines = text.split("\n")
        f.close()
        @filename = filename
        cleanLines()
        getMaxValue()
    end
    
    def confirmDialog
        #TODO extend dialog for contour lines and lables
        if @lines.length == 0
            return
        else
            msg =  "import mesh of #{@lines.length} values?"
            msg += "\nmax = %.2f" % @maxvalue
            msg += "\nscale = %.2f/m" % @scalevalue
            result = UI.messagebox msg, MB_OKCANCEL, "confirm import"
            if result == 1
                createMesh()
                addContourLines()
                addLabels()
            else
                uimessage("import canceled")
            end
        end
    end
    
    def cleanLines
        newlines = []
        @lines.each { |l|
            parts = l.split()
            begin
                parts.collect! { |p| p.to_f }
                newlines.push(parts)
            rescue
                uimessage("line ignored: '#{l}'")
            end
        }
        ## find index of column with illum values (4 or 7)
        h = Hash.new(0)
        newlines.each { |l|
            h[l.length] = h[l.length] + 1
        }
        if h[4] > h[7]
            @index_value = 3
        end
        uimessage("values found at column index %d" % @index_value) 
        @lines = newlines
    end
    
    def getMaxValue
        if @lines.length == 0
            return
        end
        xs = @lines.collect { |l| l[0] }
        ys = @lines.collect { |l| l[1] }
        xs.sort!
        ys.sort!
        @bbox = [xs[0]/$UNIT, ys[0]/$UNIT, xs[-1]/$UNIT, ys[-1]/$UNIT]
        zs = @lines.collect { |l| l[2] }
        if @zOffset == nil
            n = 0
            zs.each { |z| n += z }
            @zOffset = n / zs.length.to_f
            uimessage("z offset set to '%.2f'" % @zOffset) 
        else
            uimessage("z offset = '#{@zOffset}'")
        end
        values = @lines.collect { |l| l[@index_value] }
        values.sort!
        @maxvalue = values[-1]
        uimessage("maximum value: %.2f" % @maxvalue) 
        max = values[-1]
        divider = 1
        while max > 10:
            max = max / 10.0
            divider *= 10
        end
        if max > 5
            step = 0.2
        elsif max > 2
            step = 0.4
        elsif max > 1
            step = 1.0
        end
        @delta = step
        @scalevalue = divider.to_f / step
    end
    
    def createMesh
        if @lines.length == 0
            return
        end
        uimessage("processing %d values" % @lines.length) 
        points = []
        @lines.each { |l|
            x = l[0]
            y = l[1]
            z = @zOffset
            v = l[@index_value]
            dz = v / @scalevalue
            points.push([x,y,z+dz])
        }
        tris = triangulate(points)
        suPoints = points.collect { |p| Geom::Point3d.new(p[0], p[1], p[2]) }
        mesh = Geom::PolygonMesh.new(points.length, tris.length)
        tris.each { |v|
            mesh.add_polygon(suPoints[v[0]], suPoints[v[1]], suPoints[v[2]])
        }
        mesh.transform!($SCALETRANS)
        uimessage("created mesh") 
        @surface = Sketchup.active_model.entities.add_group
        @surface.entities.add_faces_from_mesh(mesh)
        name = remove_spaces(File.basename(@filename))
        @surface.name = name
        uimessage("added surface group '#{name}' to scene") 
    end
        
end






