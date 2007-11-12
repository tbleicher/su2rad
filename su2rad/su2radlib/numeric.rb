require "su2radlib/exportbase.rb"
require "su2radlib/delauney_mod.rb"

class NumericImport < ExportBase
    include Delauney
    def initialize(filename='')
        @lines = []
        @index_value = 6
        @filename = ''
        @maxvalue = 0.0
        @scalevalue = 1
        if filename != ''
            loadFile(filename)
        end
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
        if @lines.length == 0
            return
        else
            msg =  "import mesh of #{@lines.length} values?"
            msg += "\nmax = %.2f" % @maxvalue
            msg += "\nscale = %.2f/m" % @scalevalue
            result = UI.messagebox msg, MB_OKCANCEL, "confirm import"
            if result == 1
                createMesh()
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
        values = @lines.collect { |l| l[@index_value].to_f }
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
        @scalevalue = divider.to_f / step
    end
    
    def createMesh
        if @lines.length == 0
            return
        end
        uimessage("processing %d values" % @lines.length) 
        points = []
        @lines.each { |l|
            x = l[0].to_f
            y = l[1].to_f
            z = l[2].to_f
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
        ents = Sketchup.active_model.entities
        ents.add_faces_from_mesh(mesh)
        uimessage("added mesh to scene") 
    end
end
