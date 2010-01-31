require 'export_modules.rb'

class Workplane
    
    attr_accessor :parentName, :WALLZONE, :Z_OFFSET 

    def initialize
        @UNIT = 0.0254
        @WALLZONE = 0.5
        @Z_OFFSET = 0.85
        @faces = []
        Sketchup.active_model.selection.each { |e|
            if e.is_a?(Sketchup::Face)
                @faces.push(e)
            end
        }
        if @faces.length != 0
            compDef = @faces[0].parent
            if compDef.is_a?(Sketchup::ComponentDefinition)
                parentInstance = compDef.instances[0]
                if parentInstance.name == ""
                    parentInstance.name = "room_" + (0..3).map{65.+(rand(25)).chr}.join 
                end
                @parentName = parentInstance.name.gsub("#", "_")
                @entities = compDef.entities
            else
                @parentName = "room_" + (0..3).map{65.+(rand(25)).chr}.join 
                @entities = Sketchup.active_model.entities
            end
        end
    end

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

    def getOffsetPoints(floop, mesh, zVector)
        offsetDistance = @WALLZONE / @UNIT
        lines = []
        floop.edges.each { |edge|
            p1 = edge.start.position
            p2 = edge.end.position
            vector = Geom::Vector3d.new(p2.x-p1.x, p2.y-p1.y, p2.z-p1.z)
            vector.length *= 0.5
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
        ## get corner points by intersecting lines
        points = []
        lines.each_index { |lidx|
            p = Geom.intersect_line_line(lines[lidx],lines[lidx-1]) 
            if p != nil
                points.push(p)
            end
        }
        return points
    end

    def getOffsetLoop(floop, entities, zVector)
        ## create array of edges from lines for each loop
        points = getOffsetPoints(floop, @mesh, zVector)
        points.collect! { |p| p.offset(zVector) }
        loopedges = []
        points.each_index { |pidx|
            loopedges.push( entities.add_line(points[pidx-1], points[pidx]) )
        }
        printf("  loopedges.length=%d\n" % loopedges.length)
        return loopedges
    end

    def getOffsetLoops(f, entities)
        zVector = Geom::Vector3d.new(0,0,@Z_OFFSET/@UNIT)
        @mesh = f.mesh(0)
        edges = []
        ## add edges from outer_loop first, then others
        edges.push( getOffsetLoop(f.outer_loop, entities, zVector) )
        f.loops.each { |floop|
            if !floop.outer?
                printf("  adding inner loop ...\n")
                edges.push( getOffsetLoop(floop, entities, zVector) )
            end
        }
        return edges
    end

    def addWorkplane(name="")
        printf("addWorkplane name='%s'\n" % name)
        if name != ""
            @parentName = name
        end
        if @faces.length != 0
            grp = @entities.add_group()
            grp.name = @parentName + "_workplane"
            @faces.each { |f|
                edges = getOffsetLoops(f, grp.entities)
                edges.each_index { |eidx|
                    loopedges = edges[eidx]
                    newf = grp.entities.add_face(loopedges)
                    if eidx > 0
                        grp.entities.erase_entities(newf)
                    else
                        newf.set_attribute("SU2RAD_NUMERIC", "type", "workplane")
                    end
                }
            }
            grp.set_attribute("SU2RAD_NUMERIC", "type", "workplanegroup")
        end
    end

    def addWorkplaneCmd(name="")
        Sketchup.active_model.start_operation("addWorkplane")
        begin
            addWorkplane(name)
            Sketchup.active_model.commit_operation()
        rescue => e
            Sketchup.active_model.abort_operation()
            msg = "Error creating workplane:\n%s\n%s" % [$!.message,e.backtrace.join("\n")]
            printf("%s\n" % msg)
        end
    end

end



class WorkplaneTool
    
    include JSONUtils

    def initialize
        super
        @UNIT = 0.0254
        @workplane = Workplane.new()
    end

    def activate
        printf("WorkplaneTool.activate()\n")
        @dlg = nil
        @faces = []
        Sketchup.active_model.selection.each { |e|
            if e.is_a?(Sketchup::Face) && horizontal?(e)
                @faces.push(e)
            end
        }
        if @faces.length == 0
            r = UI.messagebox("Please select at least one horizontal polygon.", MB_OK)
            deactivate(Sketchup.active_model.active_view)
            return
        end
        printf("WorkplaneTool: found %d\n" % @faces.length)
        ## create bbox for getExtents
        @bbox = Geom::BoundingBox.new()
        @faces.each { |f|
            f.vertices.each { |v|
                @bbox.add(v.position)
            }
        }
        printf("bbox.min=%s\n" % @bbox.min.to_s) 
        printf("bbox.max=%s\n" % @bbox.max.to_s) 
        ## create lines array for draw
        @drawLines = getDrawLines()
        showWebDialog()
    end
    
    def deactivate(view)
        @bbox = nil
        @dlg = nil
        Sketchup.active_model.select_tool(nil)
        Sketchup.active_model.active_view.invalidate()
        printf("WorkplaneTool deactivated\n")
    end
   
    def draw(view)
        printf("WorkplaneTool.draw()\n")
        view.drawing_color='red'
        view.line_width=1.5
        view.draw_lines(@drawLines)
    end

    def getDrawLines
        zVector = Geom::Vector3d.new(0,0,@workplane.Z_OFFSET/@UNIT)
        edges = []
        @faces.each { |f|
            mesh = f.mesh(0)
            f.loops.each { |floop|
                points = @workplane.getOffsetPoints(floop, mesh, zVector) 
                points.collect! { |p| p.offset(zVector) }
                points.each_index { |pidx|
                    edges.push( [points[pidx-1], points[pidx]] ) 
                }
            }
        }
        return edges.flatten()
    end

    def getExtents
        return @bbox
    end

    def getJSON
        opts = [@workplane.parentName,@workplane.WALLZONE,@workplane.Z_OFFSET]
        return "{'roomname':'%s','wallzone':'%6.4f','wpheight':'%6.4f'}" % opts
    end

    def horizontal?(face)
        zCoords = face.vertices.collect { |v| v.position.z }
        zCoords.sort!()
        diff = zCoords[-1] - zCoords[0]
        if diff > 0.01
            printf("face is not horizontal\n")
            return false
        else
            return true
        end
    end

    def onCancel(reason, view)
        printf("WorkplaneTool canceled (reason=#{reason.to_s})\n")
        deactivate(view)
    end

    def resume(view)
        printf("WorkplaneTool resumed\n")
        view.refresh()
    end

    def showWebDialog
        @dlg = UI::WebDialog.new("workplane settings", true, nil, 300, 280, 250, 150, true);
            
        ## apply, cancel and on_close actions
        @dlg.add_action_callback("createWorkplane") { |d,p|
            uimessage("creating workplane (name='%s')" % @roomname, 2)
            @workplane.addWorkplaneCmd(@roomname)
            d.close()
            deactivate(Sketchup.active_model.active_view)
        }
        @dlg.add_action_callback("cancelTool") { |d,p|
            uimessage("closing room attributes dialog ...", 1)
            d.close();
            deactivate(Sketchup.active_model.active_view)
        }
        @dlg.set_on_close {
            uimessage("closing room attributes dialog ...", 2)
            deactivate(Sketchup.active_model.active_view)
        }
        
        ## changed setting callback
        @dlg.add_action_callback("updateSettings") { |d,p|
            updateSettings(d,p)
        }
        
        ## set contents
        html = File.join(File.dirname(__FILE__), "html","su2rad_attributes_room.html")
        @dlg.set_file(html, nil)
        
        ## show dialog
        @dlg.show {
            @dlg.execute_script( "dialog.setValues('%s')" % escape_javascript(getJSON()) )
            uimessage("room attributes dialog show()", 2)
        }
    end

    def suspend(view)
        printf("WorkplaneTool suspended\n")
    end

    def uimessage(msg, level=0)
        printf(msg + "\n")
    end

    def updateSettings(dlg, params)
        printf("params='%s'\n" % params)
        pairs = params.split('&')
        pairs.each { |s|
            pair = s.split('=')
            printf("k=%s v=%s\n" % pair)
            if pair[0] == "roomname"
                @roomname = pair[1]
            elsif pair[0] == "wallzone"
                @workplane.WALLZONE = pair[1].to_f
            elsif pair[0] == "wpheight"
                @workplane.Z_OFFSET = pair[1].to_f
            end
        }
        @drawLines = getDrawLines()
        Sketchup.active_model.active_view.invalidate()
    end

end


def startWorkplaneTool
    wt = WorkplaneTool.new()
    Sketchup.active_model.select_tool(wt)
    Sketchup.active_model.active_view.invalidate()
end
