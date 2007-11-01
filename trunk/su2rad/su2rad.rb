# Sketchup To Radiance Exporter
#
# su2rad.rb - version 0.0b
#
# Written by Thomas Bleicher
# based on ogre_export by Kojack
#
# This program is free software; you can redistribute it and/or modify it under
# the terms of the GNU Lesser General Public License as published by the Free Software
# Foundation; either version 2 of the License, or (at your option) any later
# version.
# 
# This program is distributed in the hope that it will be useful, but WITHOUT
# ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
# FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
# 
# You should have received a copy of the GNU Lesser General Public License along with
# this program; if not, write to the Free Software Foundation, Inc., 59 Temple
# Place - Suite 330, Boston, MA 02111-1307, USA, or go to
# http://www.gnu.org/copyleft/lesser.txt.


# revisions:
# v 0.0  - 28/10/07  :  initial release
# v 0.0b - 29/10/07  :  fixed bug in replmarks warning
#                       fixed bug in clear directory recursion
#                       added north orientation to sky description
#                       added exception error display to export function
# v 0.0c - 31/10/07  :  fixed bug in export of multiple views


##### config options - change as required #######

## path to replmarks binary
#$replmarks = '/usr/local/bin/replmarks'
$replmarks = '' 

## keep local coordinates of groups and instances
$MAKEGLOBAL = false     ## true|false - no quotes!

## export faces as triangles (should always work)
$TRIANGULATE = false    ## true|false - no quotes!

## unit conversion 
$UNIT = 0.0254          ## use meters for Radiance scene

## show Radiance option dialog
$showRadOptions = true  ## true|false - no quotes!

## export all saved viewsg
$exportAllViews = false ## true|false - no quotes!

## preview doesn't work yet
$rad = ''   
$preview = false        ## true|false - no quotes!

#####   end of config options   #######



$SCALETRANS = Geom::Transformation.new(1/$UNIT)

$debug = 0
$verbose = false
$testdir = ""

$materialNames = {}
$materialDescriptions = {}
$usedMaterials = {}
$materialContext = []
$nameContext = []
$componentNames = {}
$uniqueFileNames = {}
$visibleLayers = {}
$skyfile = ''
$log = []
$filecount = 0
$createdFiles = Hash.new()



class UserDialog
    
    attr_reader :results

    def initialize
        @prompts = []
        @vars    = []
        @values  = []
        @choices = []
        @isbool  = []
        @results = []
    end

    def addOption(prompt, var, choice='')
        @prompts.push(prompt)
        @vars.push(var)
        if var.class == TrueClass
            @values.push("yes")
            @choices.push("yes|no")
            @isbool.push(true)
        elsif var.class == FalseClass
            @values.push("no")
            @choices.push("yes|no")
            @isbool.push(true)
        else
            @values.push(var)
            @choices.push(choice)
            @isbool.push(false)
        end
    end

    def show(title='options')
        ui = UI.inputbox(@prompts, @values, @choices, title)
        if not ui
            return false
        else
            ui.each_index { |i|
                if @isbool[i] == true
                    if ui[i] == 'yes'
                        @results.push(true)
                    else
                        @results.push(false)
                    end
                else
                    @results.push(ui[i])
                end
            }
        end
        return true
    end
end    



class RadianceOptions

    attr_reader :skytype
    
    def initialize
        @model = Sketchup.active_model
        
        ## rad defaults 
        @quality  = "low"
        @detail   = "medium"  
        @varia    = "medium" 
        @penumbra = "true" 
        @indirect = "2" 
        @zonetype = "Exterior"
        @zonesize = getBBox
        @skytype  = getSkyType
    end

    def showDialog
        ud = UserDialog.new()
        ud.addOption("QUALITY",     @quality,  "low|medium|high")
        ud.addOption("DETAIL",      @detail,   "low|medium|high")
        ud.addOption("VARIABILITY", @varia,    "low|medium|high")
        ud.addOption("PENUMBRAS",   @penumbra, "true|false")
        ud.addOption("INDIRECT",    @indirect, "1|2|3|4|5")
        ud.addOption("ZONE type",   @zonetype, "Exterior|Interior")
        ud.addOption("ZONE size",   @zonesize, "")
        ud.addOption("sky type",    @skytype,  "-c|-i|+i|-s|+s")
        if ud.show("Radiance Options") == true
            @quality  = ud.results[0]
            @detail   = ud.results[1]
            @varia    = ud.results[2]
            @penumbra = ud.results[3]
            @indirect = ud.results[4]
            @zonetype = ud.results[5]
            zonesize  = ud.results[6]
            @skytype  = ud.results[7]
            begin
                zs = zonesize.split()
                x = zs[0].to_f
                y = zs[1].to_f
                z = zs[2].to_f
                @zonesize = "%.1f %.1f %.1f" % [x,y,z]
            rescue
                print "## ERROR: Wrong format for zonesize; input ignored.\n"
            end
        end
    end
    
    def getRadOptions
        text =  "QUALITY=      #{@quality}\n"
        text += "DETAIL=       #{@detail}\n"
        text += "VARIABILITY=  #{@varia}\n"
        text += "PENUMBRAS=    #{@penumbra}\n"
        text += "INDIRECT=     #{@indirect}\n"
        text += "UP=           Z\n"
        z = @zonesize.split()
        text += "ZONE=         #{@zonetype} 0 #{z[0]} 0 #{z[1]} 0 #{z[2]}\n"
        if @zonetype == "Exterior"
            text += "EXPOSURE=     -4\n"
        end
        return text
    end
    
    def getBBox
        begin
            bbox = @model.bounds
            max = bbox.max
            min = bbox.min
            x = max.x*$UNIT - min.x*$UNIT
            y = max.y*$UNIT - min.y*$UNIT 
            z = max.z*$UNIT - min.z*$UNIT
            return  "%.1f %.1f %1.f" % [x, y, z]
        rescue
            #uimessage("## Error generating bbox; using default values")
            return "10 10 10"
        end
    end
    
    def getSkyType
        sinfo = @model.shadow_info
        type = "i"
        if sinfo['UseSunForAllShading'] == true
            type = "s"
        end
        if sinfo['DisplayShadows'] == true
            type = "+" + type
        else
            type = "-" + type
        end
        return type
    end

end





class ExportBase
    
    def remove_spaces(s)
        ## remove spaces and other funny chars from names
        for i in (0..s.length)
            if s[i,1] == " " 
                s[i] = "_" 
            end 
        end
        return s.gsub(/\W/, '')
    end

    def append_paths(p,f)
        if p[-1,1] == "\\" or p[-1,1] == "/"
            p+f
        else
            p+"\\"+f
        end
    end
   
    def isVisible(e)
        if e.hidden?
            return false
        elsif not $visibleLayers.has_key?(e.layer)
            return false
        end
        return true
    end
            
    def exportGeometry(entity_list, parenttrans, instance=false)
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
                #@texturewriter.load(e,true)
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
        
        if $verbose == true
            uimessage("exported entities [refs=%d, faces=%d]" % [references.length, faces.length])
        end
        if $nameContext.length <= 1
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
        ## top level scene file split in '*.rad' and 'objects/*_faces.rad'
        ref_filename = getFilename()    ## ref file without './objects/'
        dir, basename = File.split(ref_filename)
        ## add 'objects/' to references in scene file
        ref_text = references.join("\n")
        if faces_text != ''
            faces_filename = dir + '/objects/' + basename.gsub('.rad', '_faces.rad')
            if createFile(faces_filename, faces_text)
                xform = getXform(faces_filename, parenttrans)
            else
                xform = "## ERROR creating file '%s'" % faces_filename
                uimessage(xform)
            end
            ref_text = ref_text + "\n" + xform
        end
        references = ref_text.split("\n")
        references.collect! { |line|
            if line[0..5] == '!xform'
                parts = line.split()
                parts[-1] = "objects/" + parts[-1]
                line = parts.join(" ")
            else
                line
            end
        }
        ref_text = references.join("\n")
        ref_text = "!xform ./materials.rad\n" + ref_text
        if $skyfile != ''
            ref_text = "!xform #{$skyfile} \n" + ref_text
        end
        dir, basename = File.split(ref_filename)
        if not createFile(ref_filename, ref_text)
            msg = "\n## ERROR: error creating file '%s'\n" % filename
            uimessage(msg)
            return msg
        end
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
    
    def createDirectory(path)
        if File.exists?(path) and FileTest.directory?(path)
            return true
        else
            uimessage("Creating directory '%s'" % path)
        end
        dirs = []
        while not File.exists?(path)
            dirs.push(path)
            path = File.dirname(path)
        end
        dirs.reverse!
        dirs.each { |p|
            begin 
                uimessage("creating '%s'" % p)
                Dir.mkdir(p)
            rescue
                uimessage("ERROR creating directory '%s'" %  p)
                return false
            end
        }
    end
   
    def createFile(filename, text)
        path = File.dirname(filename)
        createDirectory(path)
        if not FileTest.directory?(path)
            return false
        end
        f = File.new(filename, 'w')
        f.write(text)
        f.close()
        $createdFiles[filename] = 1
        #$createdFiles.each_pair { |k,v| print "#{k} -> #{v}\n" }
        
        if $verbose == true
            uimessage("created file '%s'" % filename)
        end
        $filecount += 1
        Sketchup.set_status_text "files:", SB_VCB_LABEL
        Sketchup.set_status_text "%d" % $filecount, SB_VCB_VALUE
        return true
    end 
    
    def createNumericFile(points)
        ## save to file
        name = $nameContext[-1]
        filename = getFilename("#{name}.fld")
        filename = filename.sub("/objects/", "/numeric/")
        if FileTest.exists?(filename)
            uimessage("updateing field '%s'" % filename)
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

    def getFilename(name=nil)
        if name == nil
            name = remove_spaces($nameContext[-1]) + '.rad'
        end
        if $nameContext.length <= 1
            path = "#{$export_dir}/#{$scene_name}/#{name}"
        else
            path = "#{$export_dir}/#{$scene_name}/objects/#{name}"
        end
        return path
    end
    
    def getMaterial(entity)
        material = nil
        if entity.class == Sketchup::Face
            if entity.material != nil
                material = entity.material
                if entity.back_material != nil and entity.back_material != material
                    front = getMaterialName(entity.material)
                    back = getMaterialName(entity.back_material)
                    uimessage("WARNING: front and back material: '%s' - '%s'" % [front, back])
                end
            elsif entity.back_material != nil
                material = entity.back_material
            end
        elsif entity.material != nil
            material = entity.material
        end
        if material == nil
            name = $materialContext[-1]
            $materialNames.each { |m,n|
                if n == name
                    material = m
                    break
                end
            }
        end
        $usedMaterials[material] = 1
        return material
    end
    
    def getMaterialName(mat)
        if mat == nil
            return $materialContext[-1]
        end
        if mat.class != Sketchup::Material
            mat = getMaterial(mat)
        end
        if $materialNames.has_key?(mat)
            return $materialNames[mat]
        else
            name = remove_spaces(mat.display_name)
            if (name =~ /\d/) == 0
                name = 'sketchup_' + name
            end
            #TODO search Radiance definition
            $materialNames[mat] = name
            return name
        end
    end
    
    def getMaterialDescription(material)
        if material == nil
            return "\n## default material\nvoid plastic sketchup_default_material\n0\n0\n5 0.4 0.4 0.4 0 0\n"
        end
        name = getMaterialName(material)
        text = $materialDescriptions[name]
        if text != nil
            return text
        end
        text = "\n## material conversion from Sketchup rgb color"
        c = material.color
        r = c.red/300.0         #XXX
        g = c.green/300.0       #XXX
        b = c.blue/300.0        #XXX
        spec = 0.0
        rough = 0.0
        if c.alpha >= 250
            text += "\nvoid plastic #{name}"
            text += "\n0\n0\n5"
            text += "  %.4f %.4f %.4f %.3f %.3f\n" % [r,g,b,spec,rough]
        elsif c.alpha >= 55     ## treshold to use glass or trans
            trans = c.alpha/255.0 #XXX
            transspec = 0.2
            text += "\nvoid trans #{name}"
            text += "\n0\n0\n9"
            text += "  %.4f %.4f %.4f %.3f %.3f %.3f %.3f\n" % [r,g,b,spec,rough,trans,transspec]
        else
            text += "\nvoid glass #{name}"
            text += "\n0\n0\n3"
            text += "  %.4f %.4f %.4f\n" % [r,g,b]
        end
        return text
    end
    
    def point_to_vector(p)
        Geom::Vector3d.new(p.x,p.y,p.z)
    end
        
    def getXform(filename, trans)
        path = "%s/%s/objects/" % [$export_dir, $scene_name]
        filename.sub!(path, '')
        objname = $nameContext[-1]
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
            #scale = "-s %.3f" % scale.length
            
            ## transformation
            trans = trans * $SCALETRANS
            a = trans.to_a
            o = a[12..14]
            vx = [o[0]+a[0], o[1]+a[1], o[2]+a[2]]
            vy = [o[0]+a[4]*0.5, o[1]+a[5]*0.5, o[2]+a[6]*0.5]
            marker = "replaceme polygon #{objname}\n0\n0\n9\n"
            marker += "%.6f %.6f %.6f\n" % o
            marker += "%.6f %.6f %.6f\n" % vx 
            marker += "%.6f %.6f %.6f\n" % vy
            
            cmd = "echo '#{marker}' | replmarks -s 1.0 -x #{filename} replaceme"
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
        if not $uniqueFileNames.has_key?(pattern)
            $uniqueFileNames[pattern] = nil
            return pattern
        else
            all = $uniqueFileNames.keys
            count = 0
            all.each { |name|
                if name.index(pattern) == 0
                    count += 1
                end
            }
            newname = "%s%02d" % [pattern, count]
            $uniqueFileNames[newname] = nil
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
            printf "  scale not uniform: sx=%.2f sy=%.2f sz=%.2f\n" % lengths
            return false
        end
        return true
    end
    
    def showTransformation(trans)
        a = trans.to_a
        printf "  %5.2f  %5.2f  %5.2f  %5.2f\n" % a[0..3]
        printf "  %5.2f  %5.2f  %5.2f  %5.2f\n" % a[4..7]
        printf "  %5.2f  %5.2f  %5.2f  %5.2f\n" % a[8..11]
        printf "  %5.2f  %5.2f  %5.2f  %5.2f\n" % a[12..15]
    end

    def uimessage(msg)
        n = $nameContext.length
        prefix = "    " * n
        line = "%s [%d] %s" % [prefix, n, msg]
        Sketchup.set_status_text(line)
        printf "%s\n" % line
        $log.push(line)
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
        $materialContext.push(getMaterialName(getMaterial(@entity)))
        oldglobal = $globaltrans
        $globaltrans *= @entity.transformation
        ref = exportGeometry(entities, parenttrans)
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
        matname = getMaterialName(getMaterial(@entity))
        alias_name = "%s_material" % defname
        resetglobal = false
        if isMirror(@entity.transformation) and not $MAKEGLOBAL
            resetglobal = true
            $MAKEGLOBAL = true
            uimessage("instance '#{iname}' is mirrored; using global coords")
        end
        skip_export = false
        if $MAKEGLOBAL == false
            filename = getFilename("#{defname}.rad")
            #if FileTest.exists?(filename)  ## doesn't work! Caching?
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
        $materialContext.push(alias_name)
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
            ref = exportGeometry(entities, parenttrans, true)
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

    def initialize(face, index=0)
        @face = face
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
    
    def getText(trans=nil)
        if $TRIANGULATE == true
            if @triangles.length == 0
                uimessage("WARNING: no triangles found for polygon")
                return ""
            end
            count = 0
            text = ''
            @triangles.each { |points|
                text += "\n%s polygon t_%s_%d\n" % [getMaterialName(@material), @index, count]
                text += "0\n0\n9\n"
                points.each { |p|
                    if trans != nil
                        p.transform!(trans)
                    end
                    text += "    %f  %f  %f\n" % [p.x*$UNIT,p.y*$UNIT,p.z*$UNIT]
                }
                count += 1
            }
            return text       
        else
            text = "\n%s polygon f_%s\n" % [getMaterialName(@material), @index]
            text += "0\n0\n%d\n" % [@verts.length*3]
            @verts.each { |v|
                if trans == nil
                    p = v.position
                else
                    p = v.position.transform(trans)
                end
                text += "    %f  %f  %f\n" % [p.x*$UNIT,p.y*$UNIT,p.z*$UNIT]
            }
            return text
        end
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


class RadianceExport < ExportBase

    def initialize
        
        $filecount = 0
        @model = Sketchup.active_model
        
        $visibleLayers = {}
        @model.layers.each { |l|
            if l.visible?
                $visibleLayers[l] = 1
            end
        }
        
        @radOpts = RadianceOptions.new()
        $scene_name = "unnamed_scene"
        $export_dir = Dir.pwd()
        setExportDirectory()
        
        line1 = "###  RadianceExport (#{$scene_name})  ###"
        line2 = "###  %s  ###" % Time.now.asctime
        $log = [line1,line2]
        printf "%s\n" % line1
        Sketchup.set_status_text(line1)
        
        @copy_textures = true
        #@texturewriter = Sketchup.create_texture_writer
    end
    
    def setExportDirectory
        ## get name of subdir for Radiance file structure
        page = @model.pages.selected_page
        if page != nil
            $scene_name = remove_spaces(page.name)
        end
        path = Sketchup.active_model.path
        if path != '' and path.length > 5:
            $export_dir = path[0..-5]
        end
    end
   
    def confirmExportDirectory
        ## show user dialog for export options
        ud = UserDialog.new()
        ud.addOption("export path", $export_dir)
        ud.addOption("scene name", $scene_name)
        ud.addOption("show options", $showRadOptions) 
        ud.addOption("all views", $exportAllViews) 
        ud.addOption("triangulate", $TRIANGULATE)
        if $replmarks != '' and File.exists?($replmarks)
            ud.addOption("global coords", $MAKEGLOBAL) 
        end
        #if $rad != ''
        #    ud.addOption("run preview", $preview)
        #end
        if ud.show('export options') == true
            $export_dir = ud.results[0] 
            $scene_name = ud.results[1] 
            $showRadOptions = ud.results[2] 
            $exportAllViews = ud.results[3] 
            $TRIANGULATE = ud.results[4]
            if $replmarks != '' and File.exists?($replmarks)
                $MAKEGLOBAL = ud.results[5]
            end
            #if $rad != ''
            #    $preview = ud.result[6]
            #end
        else
            uimessage('export canceled')
            return false
        end
        
        ## use test directory in debug mode
        if $debug != 0 and  $testdir != ''
            $export_dir = $testdir
            scene_dir = "#{$export_dir}/#{$scene_name}"
            if FileTest.exists?(scene_dir)
                system("rm -rf #{scene_dir}")
            end
        end
        if $export_dir[-1,1] == '/'
            $export_dir = $export_dir[0,$export_dir.length-1]
        end
        return true
    end
    
    def removeExisting
        scene_dir = "#{$export_dir}/#{$scene_name}"
        if FileTest.exists?(scene_dir)
            ui_result = (UI.messagebox "Remove existing directory\n'#{$scene_name}'?", MB_OKCANCEL, "Remove directory?")
            if ui_result == 1
                uimessage('removing directories')
                clearDirectory(scene_dir)
                ["octrees", "images", "logfiles"].each { |subdir|
                    createDirectory("#{scene_dir}/#{subdir}")
                }
                return true
            else
                uimessage('export canceled')
                return false
            end
        end
        return true
    end

    def clearDirectory(scene_dir)
        Dir.foreach(scene_dir) { |f|
	    if f == '.' or f == '..'
		next
            elsif FileTest.directory?(f)
                clearDirectory(f)
            elsif FileTest.file?(f)
		File.delete(f)
            end
        }
    end
    
    def export(selected_only=0)
        
        if not confirmExportDirectory or not removeExisting
            return
        end
        if $showRadOptions == true
            @radOpts.showDialog
        end
        
        createRifFile()
        
        ## check if global coord system is required
        if $replmarks == '' or not File.exists?($replmarks)
            if $MAKEGLOBAL == false
                uimessage("WARNING: replmarks not found.")
                uimessage("=> global coordinates will be used in files")
                $MAKEGLOBAL = true
            end
        end
        
        exportSky()
        
        parenttrans = Geom::Transformation.new
        ## export geometry
        $materialContext.push("sketchup_default_material") 
        if selected_only != 0
            entities = []
            Sketchup.active_model.selection.each{|e| entities = entities + [e]}
        else
            entities = Sketchup.active_model.entities
        end
        $nameContext.push($scene_name) 
        $globaltrans = Geom::Transformation.new
        exportGeometry(entities, parenttrans)
        $materialContext.pop() 
        $nameContext.pop()

        exportMaterials()
        
        #if @copy_textures == true
        #    @texturewriter.write_all @path_textures,false
        #end
        #@texturewriter=nil
        runPreview()
        writeLogFile
    end

    def runPreview
        #TODO
        if $rad == '' or $preview != true
            return
        end
        dir, riffile = File.split(getFilename("%s.rif" % $scene_name))
        #Dir.chdir("#{$export_dir}/#{$scene_name}")
        #cmd = "%s -o x11 %s" % [$rad, riffile]
        #printf "cmd = %s\n" % cmd
    end

    def getTimeZone(country, city, long)
        meridian = ''
	puts "getTimeZone"
	puts Sketchup.find_support_file("locations.dat")
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
    
    def exportSky()
        
        sinfo = @model.shadow_info
        text =  "!gensky %s " % sinfo['ShadowTime'].strftime("%m %d +%H:%M")
        text += "-a %.2f -o %.2f " % [sinfo['Latitude'], -1*sinfo['Longitude']]
        text += "-m %.1f " % getTimeZone(sinfo['Country'], sinfo['City'], sinfo['Longitude'])
        text += "#{@radOpts.skytype} -g 0.2 -t 1.7"
        text += "| xform -rz %.1f\n\n" % (-1*sinfo['NorthAngle']) 
        text += "skyfunc glow skyglow\n0\n0\n4 1.000 1.000 1.000 0\n"
        text += "skyglow source sky\n0\n0\n4 0 0 1 180\n\n"
        text += "skyfunc glow groundglow\n0\n0\n4 1.000 1.000 1.000 0\n"
        text += "groundglow source ground\n0\n0\n4 0 0 -1 180\n"

        city = remove_spaces(sinfo['City'])
        timestamp = sinfo['ShadowTime'].strftime("%m%d_%H%M")
        filename = getFilename("skies/%s_%s.sky" % [city, timestamp])
        if not createFile(filename, text)
            uimessage("Error: Could not create sky file '#{filename}'")
            $skyfile = ''
        else
            $skyfile = "skies/%s_%s.sky" % [city, timestamp]
        end
    end
    
    def writeLogFile
        line = "###  finished: %s  ###" % Time.new()
        $log.push(line)
        line2 = "### success: #{$export_dir}/#{$scene_name})  ###"
        $log.push(line2)
        logname = getFilename("%s.log" % $scene_name)
        if not createFile(logname, $log.join("\n"))
            uimessage("Error: Could not create log file '#{logname}'")
            line = "### export failed: %s  ###" % Time.new()
            printf "%s\n" % line
            Sketchup.set_status_text(line)
        else
            printf "%s\n" % line
            Sketchup.set_status_text(line)
            printf "%s\n" % line2
            Sketchup.set_status_text(line2)
        end
    end
    
    def createRifFile
        text =  "# scene input file for rad\n"
        text += @radOpts.getRadOptions
        text += "\n"
        text += "scene=        #{$scene_name}.rad #{$skyfile}\n"
        text += "materials=  materials.rad\n\n"
        text += "%s\n\n" % exportViews()
        
        filename = getFilename("%s.rif" % $scene_name)
        if not createFile(filename, text)
            uimessage("Error: Could not create rif file '#{filename}'")
        end
    end
        
    def exportMaterials
        text = ""
        materials = $usedMaterials.keys
        materials.each { |m|
            text += getMaterialDescription(m)
        }
        filename = getFilename("materials.rad")
        if not createFile(filename, text)
            uimessage("ERROR creating material file '#{filename}'")
        end
    end

    def exportViews
        views = []
        views.push(createViewFile(@model.active_view.camera, $scene_name))
        if $exportAllViews == true
            pages = @model.pages
            pages.each { |page|
                if page == @model.pages.selected_page
                    next
                elsif page.use_camera? == true
                    name = remove_spaces(page.name)
                    views.push(createViewFile(page.camera, name))
                end
            }
        end
        return views.join('\n')
    end

    def createViewFile(c, viewname)
        text =  "-vp %.3f %.3f %.3f  " % [c.eye.x*$UNIT,c.eye.y*$UNIT,c.eye.z*$UNIT]
        text += "-vd %.3f %.3f %.3f  " % [c.zaxis.x,c.zaxis.y,c.zaxis.z]
        text += "-vu %.3f %.3f %.3f  " % [c.up.x,c.up.y,c.up.z]
        imgW = @model.active_view.vpwidth.to_f
        imgH = @model.active_view.vpheight.to_f
        aspect = imgW/imgH
        if c.perspective?
            type = '-vtv'
            if aspect > 1.0
                vv = c.fov
                vh = getFoVAngle(vv, imgH, imgW)
            else
                vh = c.fov
                vv = getFoVAngle(vh, imgW, imgH)
            end
        else
            type = '-vtl'
            vv = c.height*$UNIT
            vh = vv*aspect
        end
        text += "-vv %.3f -vh %.3f" % [vv, vh]
        text = "rvu #{type} " + text
        
        filename = getFilename("views/%s.vf" % viewname)
        if not createFile(filename, text)
            msg = "## Error: Could not create view file '#{filename}'"
            uimessage(msg)
            return msg
        else
            return "view=   #{viewname} -vf views/#{viewname}.vf" 
        end
    end
    
    def getFoVAngle(ang1, side1, side2)
        ang1_rad = ang1*Math::PI/180
        dist = side1 / (2.0*Math::tan(ang1_rad/2.0))
        ang2_rad = 2 * Math::atan2(side2/(2*dist), 1)
        ang2 = (ang2_rad*180.0)/Math::PI
        return ang2
    end
end



class MaterialConflicts < ExportBase

    def initialize
        @model = Sketchup.active_model
        @faces = [] 
        getVisibleLayers
    end

    def getVisibleLayers
        $visibleLayers = {}
        @model.layers.each { |l|
            if l.visible?
                $visibleLayers[l] = 1
            end
        }
    end
        
    def findConflicts(entities=nil)
        if entities == nil
            entities = @model.entities
        end
        entities.each { |e|
            if e.class == Sketchup::Group
                if not isVisible(e)
                    next
                end
                findConflicts(e.entities)
            elsif e.class == Sketchup::ComponentInstance
                if not isVisible(e)
                    next
                end
                cdef = e.definition
                findConflicts(cdef.entities)
            elsif e.class == Sketchup::Face
                if not isVisible(e)
                    next
                end
                if e.material != e.back_material
                    @faces.push(e)
                end
            end
        }
    end

    def count
        @faces = []
        findConflicts()
        if @faces.length == 1
            msg = "1 conflict found." 
        else
            msg = "%d conflicts found." % @faces.length
        end
        UI.messagebox msg, MB_OK, 'material conflicts'
    end
    
    def resolve
        if @faces.length == 0
            findConflicts()
        end
        if @faces.length == 0
            UI.messagebox "No conflicts found.", MB_OK, 'material conflicts'
        else
            @faces.each { |e|
                if e.material
                    e.back_material = e.material
                elsif e.back_material
                    e.material = e.back_material
                end
            }
            msg = "%d materials changed." % @faces.length
            UI.messagebox msg, MB_OK, 'material conflicts'
        end
    end    
end

###########################################################################
##############                  delauney2.rb                 ##############
# Credit to Paul Bourke (pbourke@swin.edu.au) for original Fortran 77
# Program :))
# August 2004 - Conversion and adaptation to Ruby by Carlos Falé
# (carlosfale@sapo.pt)
# September 2004 - Updated by Carlos Falé
#
# You can use this code, for non commercial purposes, however you like,
# providing the above credits remain in tact

# Return two logical values, first is TRUE if the point (xp, yp) lies
# inside the circumcircle made up by points (x1, y1), (x2, y2) and (x3, y3)
# and FALSE if not, second is TRUE if xc + r < xp and FALSE if not
# NOTE: A point on the edge is inside the circumcircle


def incircum(xp, yp, x1, y1, x2, y2, x3, y3)

  eps = 0.000001
  res = [FALSE, FALSE]

  if (y1 - y2).abs >= eps || (y2 - y3).abs >= eps
    if (y2 - y1).abs < eps
      m2 = -(x3 - x2) / (y3 - y2)
      mx2 = (x2 + x3) / 2
      my2 = (y2 + y3) / 2
      xc = (x1 + x2) / 2
      yc = m2 * (xc - mx2) + my2
    elsif (y3 - y2).abs < eps
      m1 = -(x2 - x1) / (y2 - y1)
      mx1 = (x1 + x2) / 2
      my1 = (y1 + y2) / 2
      xc = (x2 + x3) / 2
      yc = m1 * (xc - mx1) + my1
    else
      m1 = -(x2 - x1) / (y2 - y1)
      m2 = -(x3 - x2) / (y3 - y2)
      mx1 = (x1 + x2) / 2
      mx2 = (x2 + x3) / 2
      my1 = (y1 + y2) / 2
      my2 = (y2 + y3) / 2
      if (m1 - m2) == 0
        xc = (x1 + x2 + x3) / 3
        yc = (y1 + y2 + y3) / 3
      else
        xc = (m1 * mx1 - m2 * mx2 + my2 - my1) / (m1 - m2)
        yc = m1 * (xc - mx1) + my1
      end
    end

    dx = x2 - xc
    dy = y2 - yc
    rsqr = dx * dx + dy * dy
    r = Math.sqrt(rsqr)

    dx = xp - xc
    dy = yp - yc
    drsqr = dx * dx + dy * dy
    if drsqr < rsqr
      res[0] = TRUE
    end
    
    if xc + r < xp
      res[1] = TRUE
    end

  end

  return res

end

# Takes as input a array with NVERT lines, each line is a array with
# three values x, y, and z (vertex[j][0] = x value of j + 1 component)
# and return a array with NTRI lines, each line is a array with three
# values i, j, and k (each value is the index of a point in the input
# array (vertex array))
# i is the index of the first point, j is the index of the second point
# and k is the index of the third point,

def triangulate(vert)

  # Sort the input array in x values
  vert.sort!
  
  nvert = vert.length

  triang = Array.new
  edges = Array.new
  complete = Array.new

  # Verbose
  Sketchup.set_status_text("Starting triangulation of %d Points" % nvert)

  # Find the minimum and maximum vertex bounds. This is to allow
  # calculation of the bounding triagle
  xmin = vert[0][0]
  ymin = vert[0][1]
  xmax = xmin
  ymax = ymin

  for i in (2..nvert)
    x1 = vert[i - 1][0]
    y1 = vert[i - 1][1]
    xmin = [x1, xmin].min
    xmax = [x1, xmax].max
    ymin = [y1, ymin].min
    ymax = [y1, ymax].max
  end

  dx = xmax - xmin
  dy = ymax - ymin
  dmax = [dx, dy].max
  xmid = (xmin + xmax) / 2
  ymid = (ymin + ymax) / 2

  # Set up the supertriangle. This is a triangle which encompasses all
  # the sample points. The supertriangle coordinates are added to the
  # end of the vertex list. The supertriangle is the first triangle in
  # the triangles list.
  p1 = nvert + 1
  p2 = nvert + 2
  p3 = nvert + 3
  vert[p1 - 1] = [xmid - 2 * dmax, ymid - dmax, 0]
  vert[p2 - 1] = [xmid, ymid + 2 * dmax, 0]
  vert[p3 - 1] = [xmid + 2 * dmax, ymid - dmax, 0]
  triang[0] = [p1 - 1, p2 - 1, p3 - 1]
  complete[0] = FALSE
  ntri = 1

  # Include each point one at a time into the exixsting mesh
  for i in (1..nvert)
    xp = vert[i - 1][0]
    yp = vert[i - 1][1]
    nedge = 0
    
    # Verbose  
    Sketchup.set_status_text("Triangulating point %d/%d" % [i,nvert])
  
    # Set up the edge buffer. If the point (xp, yp) lies inside the
    # circumcircle then the three edges of that triangle are added to
    # the edge buffer.
    j = 0
    while j < ntri
      j = j +1
      if complete[j - 1] != TRUE
        p1 = triang[j - 1][0]
	p2 = triang[j - 1][1]
	p3 = triang[j - 1][2]
	x1 = vert[p1][0]
	y1 = vert[p1][1]
	x2 = vert[p2][0]
	y2 = vert[p2][1]
	x3 = vert[p3][0]
	y3 = vert[p3][1]
	inc = incircum(xp, yp, x1, y1, x2, y2, x3, y3)
	if inc[1] == TRUE
	  complete[j - 1] = TRUE
	else
	  if inc[0] == TRUE
	    edges[nedge] = [p1, p2]
	    edges[nedge + 1] = [p2, p3]
	    edges[nedge + 2] = [p3, p1]
	    nedge = nedge + 3
	    triang[j - 1] = triang[ntri - 1]
	    complete[j - 1] = complete[ntri - 1]
	    j = j - 1
	    ntri = ntri - 1
	  end
	end
      end
    end

    # Tag multiple edges
    # NOTE: if all triangles are specified anticlockwise then all
    # interior edges are pointing in direction.
    for j in (1..nedge - 1)
      if edges[j - 1][0] != -1 || edges[j - 1][1] != -1
        for k in ((j + 1)..nedge)
          if edges[k - 1][0] != -1 || edges[k - 1][1] != -1
	    if edges[j - 1][0] == edges[k - 1][1]
	      if edges[j - 1][1] == edges[k - 1][0]
	        edges[j - 1] = [-1, -1]
		edges[k - 1] = [-1, -1]
	      end
	    end
	  end
        end
      end
    end

    # Form new triangles for the current point. Skipping over any
    # tagged adges. All edges are arranged in clockwise order.
    for j in (1..nedge)
      if edges[j - 1][0] != -1 || edges[j - 1][1] != -1
        ntri = ntri + 1
	triang[ntri - 1] = [edges[j - 1][0], edges[j - 1][1], i - 1]
	complete[ntri - 1] = FALSE
      end
    end
  end

  # Remove triangles with supertriangle vertices. These are triangles
  # which have a vertex number greater than NVERT.
  i = 0
  while i < ntri
    i = i + 1
    if triang[i - 1][0] > nvert - 1 || triang[i - 1][1] > nvert - 1 || triang[i - 1][2] > nvert - 1
      triang[i - 1] = triang[ntri - 1]
      i = i - 1
      ntri = ntri - 1
    end
  end
  
  # Verbose
  Sketchup.set_status_text("Triangulation completed: %d triangles" % ntri)

  return triang[0..ntri - 1]

end

##############           end of delauney2.rb                 ##############
###########################################################################




class NumericImport < ExportBase

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
            msg = "import mesh of %d values?\nmax = %.f\nscale = %.2f/m" % [@lines.length, @maxvalue, @scalevalue]
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







def startExport(selected_only=0)
    begin
        re = RadianceExport.new()
        re.export(selected_only)
    rescue => e 
        msg = "%s\n\n%s" % [$!.message,e.backtrace.join("\n")]
        #printf "script failed:\n %s \n" % msg
        UI.messagebox msg            
    end 
end

$matConflicts = nil

def countConflicts
    if $matConflicts == nil
        $matConflicts = MaterialConflicts.new()
    end
    $matConflicts.count()
end

def resolveConflicts
    if $matConflicts == nil
        $matConflicts = MaterialConflicts.new()
    end
    $matConflicts.resolve()
end


def startImport
    ni = NumericImport.new()
    ni.loadFile
    ni.confirmDialog
end





if $debug == 0
    ## create menu entry
    begin
        if (not file_loaded?("su2rad.rb"))
            pmenu = UI.menu("Plugin")
            radmenu = pmenu.add_submenu("Radiance")
            radmenu.add_item("export scene") { startExport(0) }
            radmenu.add_item("export selection") { startExport(1) }
            matmenu = radmenu.add_submenu("Material")
            matmenu.add_item("count conflicts") { countConflicts }
            matmenu.add_item("resolve conflicts") { resolveConflicts }
            importmenu = radmenu.add_submenu("Import")
            importmenu.add_item("numeric results") { startImport }
        end
    rescue => e
        msg = "%s\n\n%s" % [$!.message,e.backtrace.join("\n")]
        UI.messagebox msg
        printf "RadianceExport: entry to menu 'Export' failed:\n\n%s\n" % msg
    end
    file_loaded("su2rad.rb")
else
    trace_error(startExport(0))
end


