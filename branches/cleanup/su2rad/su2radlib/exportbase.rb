require 'config_class.rb'
require 'export_modules.rb'
require 'context.rb'
require 'radiance.rb'


class ExportContext
    
    include InterfaceBase
   
    attr_reader :toplevel
    attr_writer :toplevel

    def initialize
        #TODO: build UniqueNames dict
        init()
    end 
   
    def init
        @byColor = Hash.new()
        @byLayer = Hash.new()
        
        @components = []
        @componentNames = Hash.new()
        
        @globalTransformation = Geom::Transformation.new()
        @groupstack = Stack.new()
        @layerstack = LayerStack.new()
        @materialContext = Stack.new()
        @materialstack = MaterialStack.new()
        @matrixstack = Stack.new( Geom::Transformation.new() )
        @meshStartIndex = Hash.new()
        @namestack = Stack.new()
        @uniqueFileNames = Hash.new()
        @visibleLayers = Hash.new()
        
        @definitionNames = initNamesDict()
        @tmpNameCounter = 1
        @toplevel = true
    end
    
    def initNamesDict
        names = {}
        Sketchup.active_model.definitions.each { |d|
            d.instances.each { |i|
                printf "names: #{i.name} => #{i.object_id}\n"
                names[i.name] = i.object_id
            }
        }        
        return names
    end
    
    def getLayer
        return @layerstack.get()
    end
    
    def getName
        return @namestack.get()    
    end
    
    def getUniqueName(entity)
        print "getUniqueName('#{entity.name}')\n"
        if entity.name != ""
            if @definitionNames[entity.name] == entity.object_id
                return entity.name
            else
                printf "names: #{entity.name} => #{entity.object_id} found: #{@definitionNames[entity.name]}\n"
                name = createUniqueName(entity.name)
            end
        else
            name = createUniqueName()
        end
        entity.name = name
        @definitionNames[name] = entity.object_id
        print " ... result:'#{name}'\n"
        return name
    end 
    
    def createUniqueName(basename)
        ## create new name with basename and numbers
        m = basename.match(/(\w[^\d])(\d+$)/)
        if m != nil and m.length == 3
            ## basename has numbers at end
            basename = m[1]
            counter = Int(m[2])
        else
            counter = 1
        end
        tmpname = "%s%04d" % [basename, counter]
        while @definitionNames[tmpname] != nil
            printf "found tmpname '#{tmpname}'\n"
            counter += 1
            tmpname = "%s%04d" % [basename, counter]
        end
        printf "final tmpname '#{tmpname}'\n"
        return tmpname
    end
    
    def globalTransformation
        return @matrixstack.get()
    end
    
    def pop
        @materialContext.pop()
        @materialstack.pop()
        @matrixstack.pop()
        @layerstack.pop()
        @groupstack.pop()
    end 
    
    def popMaterial
        @materialContext.pop()
        @materialstack.pop()
    end
    
    def popName
        @namestack.pop()
    end
    
    def push(entity)
        uimessage("begin export #{entity.class} name='#{entity.name}' id='#{entity.object_id}'")
        @namestack.push(getUniqueName(entity))
        pushMaterial(entity.material)
        @materialstack.push(entity.material)
        @matrixstack.push( globalTransformation()*entity.transformation )
        @layerstack.push(entity.layer)
        @groupstack.push(entity)
        #XXX $SU2RAD_COUNTER.add("%s" % entity.class)
    end
    
    def pushMaterial(material)
        @materialContext.push(material)
        @materialstack.push(material)
    end
    
    def pushName(name)
        @namestack.push(name)
    end
    
    def resetContext
        init()
    end
    
    def show(prefix="")
        return
        printf "%smaterialContext: %d\n" % [prefix,@materialContext.length] 
        printf "%smaterialstack:   %d\n" % [prefix,@materialstack.length]
        printf "%smatrixstack:     %d\n" % [prefix,@matrixstack.length]
        printf "%slayerstack:      %d\n" % [prefix,@layerstack.length]
        printf "%sgroupstack:      %d\n" % [prefix,@groupstack.length]
    end

    def level
        return @groupstack.length 
    end
    
end 

class ProgressDialogDummy
    
    def initialize(msg, status, cancel=false)
        print "ProgressDialogDummy.new()"
    end
    def destroy
    end
    def hide
    end
    def update_progress(percent, status="stat", status2="stat2")
        return true
    end
end


class ProgressCounter
    
    include InterfaceBase
    
    def initialize
        @progressDialog = nil
        @stats = {'status' => 'running'}
        @stats.default = 0
        @statusPage = nil
        @timeStart = Time.now()
        @totalFaces = 10000
        @updateInterval = 1000
    end

    def add(key)
        if key.class != String
            key = key.class.to_s
        end
        key.strip!()
        @stats[key] += 1
        val = @stats[key]
        if key == 'faces' && val.divmod(@updateInterval)[1] == 0
            updateStatus()
        elsif val.divmod(10)[1] == 0
            updateStatus()
        end
    end
    
    def countEntities(entities)
        if @progressDialog == nil
            if getConfig('USEWX') == true
                begin
                    load 'ProgressDialog.rb'
                    #XXX enable cancel option after it's implemented in the export loop
                    #@progressDialog = ProgressDialog.new("export progress", "preparing export", true)
                    @progressDialog = ProgressDialog.new("export progress", "preparing export", false)
                rescue LoadError
                    @progressDialog = ProgressDialogDummy.new("export progress", "preparing export", false)
                    printf "could not load progress dialog"
                end
            else
                @progressDialog = ProgressDialogDummy.new("export progress", "preparing export", false)
            end
        else
            @progressDialog.update_progress(1, "export progress", "preparing export")
        end
        $SU2RAD_EXPORT_CANCELED = false;
        @totalFaces = _countFaces(entities)
    end
    
    def _countFaces(entities)
        cnt = 0
        entities.each { |e| 
            if e.class == Sketchup::Face
                cnt += 1
            elsif e.class == Sketchup::Group
                cnt += _countFaces(e.entities)
            elsif e.class == Sketchup::ComponentInstance
                cnt += _countFaces(e.definition.entities)
            end
        }
        return cnt       
    end
    
    def getCount(key)
        return @stats[key]
    end
    
    def setStartTime
        @timeStart = Time.now()
        @progressDialog.update_progress(1, "starting export")
    end
    
    def setStatusPage(page)
        @statusPage = page
    end
    
    def getStatusLine
        status = @stats['status']
        groups = @stats['Sketchup::Group'] + @stats['Sketchup::ComponentInstance']
        faces  = @stats['Sketchup::Faces'] + @stats['faces'] 
        return "status: %s (groups=%d, faces=%d)" % [status, groups, faces]
    end
    
    def setStatusText
        Sketchup.set_status_text(getStatusLine(), SB_PROMPT)
        Sketchup.set_status_text("time", SB_VCB_LABEL)
        sec = Time.now() - @timeStart
        Sketchup.set_status_text("%.1f sec" % sec, SB_VCB_VALUE)
    end
    
    def updateFinal
        updateStatus()
        if @statusPage != nil
            @statusPage.showFinal()
        end
        if @progressDialog != nil
            @progressDialog.update_progress(101, "export finished", "--")
            @progressDialog.hide
            @progressDialog.destroy
        end
        
    end
    
    def updateProgressDialog
        if @progressDialog == nil
            return
        end
        faces = @stats['Sketchup::Faces'] + @stats['faces'] 
        facecnt = "exported #{faces} of #{@totalFaces}"
        summary = ""
        if @stats.has_key?('errors')
            summary += "#{@stats['errors']} errors - "
        end
        if @stats.has_key?('warnings')
            summary += "#{@stats['warnings']} warnings"
        end
        percent = faces*100 / @totalFaces
        $SU2RAD_EXPORT_CANCELED = @progressDialog.update_progress(percent.to_i, facecnt, summary)
    end
    
    def updateStatus
        if @stats.has_key?('errors')
            @stats['status'] = 'running (errors)'
        elsif @stats.has_key?('warnings')
            @stats['status'] = 'running (warnings)'
        end
        
        if @statusPage != nil
            @statusPage.update(@stats)
        end
        updateProgressDialog
        setStatusText()
    end
    
    def pprint()
        printf "progress:\n"
        @stats.each_pair { |k,v|
            printf "%15s - %d\n" %  [k,v]
        }
    end
end



class ExportBase

    include InterfaceBase
    include RadiancePath
    include RadianceUtils
    
    if not $SU2RAD_LOG
        $SU2RAD_LOG = [] #XXX make singleton class instance
    end
    @@materialContext = nil
    
    @@materialstack = MaterialStack.new()
    @@layerstack = LayerStack.new()
    @@matrixstack = Stack.new()
    @@groupstack = Stack.new()

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
                rp = RadiancePolygon.new(e)
                if rp.material == nil or rp.material.texture == nil
                    face = rp.getText(globaltrans)
                else
                    face = rp.getPolyMesh(e, globaltrans)
                end
                lines.push([rp.material, rp.layer.name, face])
            end
        }
        @@materialContext.pop()
        return lines
    end
    
    def exportEntityList (entity_list, parenttrans, instance)
        ref = ''
        references = []
        faces = []
        entity_list.each { |e|
            if e.class == Sketchup::Group
                if not isVisible(e)
                    next
                end
                rg = RadianceGroup.new(e)
                if rg.isNumeric?(e)
                    printf("NUMERIC GROUP %s\n" % e.name)
                end
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
            elsif e.class == Sketchup::Edge
                next
            else
                uimessage("WARNING: Can't export entity of type '%s'!\n" % e.class)
                next
            end
        }
        return ref, references, faces
    end
    
    def exportByGroup(entity_list, parenttrans, instance=false)
        ## split scene in individual files
        ref, references, faces = exportEntityList(entity_list, parenttrans, instance)
        faces_text = ''
        numpoints = []
        faces.each_index { |i|
            f = faces[i]
            rp = RadiancePolygon.new(f)
            if rp.isNumeric?(f)
                numpoints += rp.getNumericPoints(f)
            elsif makeGlobal?()
                faces_text += rp.getText(parenttrans)
            else
                faces_text += rp.getText()
            end
        }
        
        ## if we have numeric points save to *.fld file
        if numpoints != []
            #name = $SU2RAD_CONTEXT.getName()
            name = @@nameContext[-1]
            filename = getFilename("numeric/#{name}.fld")
            createNumericFile(numpoints, filename)
        end
        uimessage("exported entities [refs=%d, faces=%d]" % [references.length, faces.length], 1)

        ## create 'by group' files or stop here
        if getConfig('MODE') != 'by group'
            return "## mode = '%s' -> no export" % getConfig('MODE')
        elsif @@nameContext.length <= 1
        #elsif $SU2RAD_CONTEXT.level == 0
        #    printf("SU2RAD_CONTEXT.toplevel==true\n")
            printf "DEBUG: createMainScene\n"
            @@nameContext.each { |n|
                printf " -> #{n}"
            }
            printf "\n"
            return createMainScene(references, faces_text, parenttrans)
        else
            ref_text = references.join("\n")
            text = ref_text + "\n\n" + faces_text
            filename = getFilename( File.join('objects', getNameContext() + ".rad") )
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
        #$SU2RAD_CONTEXT.push(@entity)
        uimessage("begin export #{@entity.class} name='#{@entity.name}' id='#{@entity.object_id}'")
        @@materialstack.push(@entity.material)
        @@matrixstack.push(@entity.transformation)
        @@layerstack.push(@entity.layer)
        @@groupstack.push(@entity)
        $SU2RAD_COUNTER.add("%s" % @entity.class)
    end
    
    def pop
        #$SU2RAD_CONTEXT.pop()
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
        scriptsdir = File.join(File.dirname(__FILE__), "scripts")
        if File.directory?(scriptsdir)
            cmd = "cp -r '#{scriptsdir}' '#{scene_dir}'"
            printf "scriptsdir cmd='#{cmd}'\n"
            if not system(cmd)
                printf "Error: '#{$?}'\n"
            end
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
    
    def createNumericFile(points, filename)
        ## write points to file in a save way; if file exists merge points
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
        #return remove_spaces($SU2RAD_CONTEXT.getName())
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
        #if $SU2RAD_CONTEXT.toplevel == true
        if @@nameContext.length <= 2     #XXX ugly hack
            ## for main scene file
            path = File.join(getConfig('SCENEPATH'),getConfig('SCENENAME'),"")
        else
            path = File.join(getConfig('SCENEPATH'),getConfig('SCENENAME'),"objects","")
        end 
        filename.sub!(path, '')
        objname = @@nameContext[-1]
        #objname = $SU2RAD_CONTEXT.getName()
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

end 
