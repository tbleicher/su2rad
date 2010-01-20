
def hitTest(point, mesh)
    mesh.polygons.each { |poly|
        verts = []
        [0,1,2].each { |i|
            idx = poly[i]
            verts.push(mesh.point_at(idx.abs()))
        }
        if Geom::point_in_polygon_2D(point, verts, true)
            return true
        end
    }
end

def getOffsetPoints(f)
    zVector = Geom::Vector3d.new(0,0,0.75/0.0254)
    offsetDistance = 0.5 / 0.0254
    mesh = f.mesh(0)
    lines = []
    f.edges.each { |edge|
        p1 = edge.start.position
        p2 = edge.end.position
        vector = Geom::Vector3d.new(p2.x-p1.x, p2.y-p1.y, p2.z-p1.z)
        #printf("vector.length=%3.1f\n" % vector.length)
        vector.length*=0.5
        center = p1.offset(vector)
        offset_vector = vector.cross(zVector)
        p = center.offset(offset_vector, offsetDistance)
        if hitTest(p, mesh) == true
            lines.push([p, vector])
        else
            offset_vector.reverse!()
            p = center.offset(offset_vector, offsetDistance)
            if hitTest(p, mesh) == true
                lines.push([p, vector])
            else
                ## fallback if offset is too big for shape
                lines.push([center, vector])
            end
        end
    }
    points = []
    lines.each_index { |lidx|
        points.push( Geom.intersect_line_line(lines[lidx],lines[lidx-1]) )
    }
    return points.collect { |p| p.offset(zVector) }
end
        
def addWorkplane(name="workplane")
    faces = []
    Sketchup.active_model.selection.each { |e|
        if e.class == Sketchup::Face
            faces.push(e)
        end
    }
    if faces.length != 0
        grp = faces[0].parent.entities.add_group()
        faces.each { |f|
            points = getOffsetPoints(f)
            #points.each { |p| printf("p = %s\n" % p.to_s) }
            newf = grp.entities.add_face(points)
        }
        grp.name = name
        grp.set_attribute("SU2RAD_NUMERIC", "type", "workplane")
    end
end

def addWorkplaneCmd()
    Sketchup.active_model.start_operation("addWorkplane")
    begin
        addWorkplane()
        Sketchup.active_model.commit_operation()
    rescue => e
        Sketchup.active_model.abort_operation()
        msg = "Error creating workplane:\n%s\n%s" % [$!.message,e.backtrace.join("\n")]
        printf("%s\n" % msg)
    end
end






