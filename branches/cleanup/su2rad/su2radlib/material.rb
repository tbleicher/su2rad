
require "exportbase.rb"


class MaterialContext < ExportBase
    
    attr_reader :texturewriter
    
    def initialize
        @texturewriter = Sketchup.create_texture_writer
        @newMatLib = nil
        clear()
    end

    def clear
        @nameStack = ['sketchup_default_material']
        @materialsByName = Hash.new()
        @materialHash = Hash[nil => 'sketchup_default_material']
        @materialConversions = Hash.new()
        @usedMaterials = Hash.new()
        @aliasHash = Hash.new()
        @textureHash = Hash.new()
    end

    def addMaterial(material, entity, frontface)
        if @usedMaterials.has_key?(material)
            return
        end
        @usedMaterials[material] = 1
        $SU2RAD_COUNTER.add(material.class.to_s)
        if material.texture && getConfig('TEXTURES') == true
            loadTexture(material, entity, frontface)
        end
    end 
    
    def export(mlib, filename='')
        @newMatLib = mlib
        if filename == ''
            filename = getFilename("materials.rad")
        end
        defined = {}
        if getConfig('MODE') == 'by layer'
            ## 'by layer' creates alias to default material if no
            ## definition is provided in library (TODO)
            @@byLayer.each_pair { |lname,lines|
                if lines.length == 0
                    ## empty layer
                    next
                end
                if isRadianceKeyword?(lname)
                    lname = "layer_" + lname
                end
                defined[lname] = getMaterialDescription(lname)
            }
        else
            #@materialHash.each_pair { |mat,mname|
            #    defined[mname] = getMaterialDescription(mat)
            #}
            @usedMaterials.each_pair { |mat,foo|
                mname = getMaterialName(mat)
                defined[mname] = getMaterialDescription(mat)
            }
        end
        
        text = "## materials.rad\n\n"
        text += defaultMaterial()
        text += "\n\n"
        marray = defined.sort()
        marray.each { |a|
            text += a[1] + "\n\n"
        }
        if getConfig('MODE') != 'by group'
            text += checkObjFiles(defined)
        end
        if not createFile(filename, text)
            uimessage("ERROR creating material file '#{filename}'")
        end
        #printf "\n\n#{text}\n" #XXX
        @texturewriter = nil
        @textureHash = {}
    end
    
    def checkObjFiles(defined)
        ## check against list of files in 'objects' directory
        txt = ""
        reg_obj = Regexp.new('objects')
        $createdFiles.each_pair { |fpath, value|
            if reg_obj.match(fpath)
                ofilename = File.basename(fpath, '.rad')
                if fpath[-4..-1] != '.obj'
                    if not defined.has_key?(ofilename)
                        uimessage("material #{ofilename} undefined; adding alias", -1)
                        txt += getAliasDescription(ofilename)
                    end
                end
            end
        }
        return txt
    end
    
    def convertTextureDir(texdir)
        filelist = Dir.entries(texdir)
        filelist.collect! { |p| p.slice(0,1) != '.' }
        uimessage("converting textures %d ..." % filelist.length, 1)
        converted = {}
        filelist.each { |p|
            img = File.join(texdir, p)
            pic = convertTexture(img)
            if pic != false
                converted[img] = pic
            end
        }
        uimessage("%d textures converted successfully" % converted.length, 1)
        return converted
    end     
    
    def convertTexture(filepath)
        ## convert sketchup textures to *.pic
        if getConfig('CONVERT') == '' or getConfig('RA_PPM') == ''
            uimessage("texture converters not available; no conversion", -1)
            return false
        end
        uimessage("converting texture '%s' ..." % File.split(filepath)[1],2)
        
        idx = filepath.rindex('.')
        ppm = filepath.slice(0..idx-1) + '.ppm'
        pic = filepath.slice(0..idx-1) + '.pic'
        begin
            if File.exists?(pic)
                uimessage("using existing texture ('#{pic}')", 1)
                return pic
            else
                if ppm != filepath
                    cmd = "\"#{getConfig('CONVERT')}\" \"#{filepath}\" \"#{ppm}\""
                    result = runSystemCmd(cmd)
		    if result == true
                        uimessage("texture converted to *.ppm ('#{ppm}')", 2)
                    else
                        uimessage("error converting texture #{filepath} to *.ppm", -2)
                        return false
                    end 
                end 
                cmd = "\"#{getConfig('RA_PPM')}\" -r \"#{ppm}\" \"#{pic}\""
                result = runSystemCmd(cmd)
		if result == true
                    uimessage("texture converted to *.pic (path='#{pic}')", 2)
                    return pic
                else
                    uimessage("error converting texture '#{ppm}' to *.pic", -2)
                    return false
                end
            end 
        rescue => e
            msg = "%s\n%s" % [$!.message,e.backtrace.join("\n")]
            uimessage("Conversion to *.pic failed.\n#{msg}", -2)
            return false
        end
    end

    def loadTexture(skm, entity, frontface)
        if @textureHash.has_key?(skm)
            return
        end
        handle = @texturewriter.load(entity, frontface)
        ## write image to texture file
        texdir = getFilename('textures')
        if createDirectory(texdir) == false
            @textureHash[skm] = ''
            return
        end
        filename = _cleanTextureFilename(skm.texture.filename)
        if entity.class == Sketchup::Face
            @texturewriter.write(entity, frontface, File.join(texdir, filename)) 
        else
            @texturewriter.write(entity, File.join(texdir, filename)) 
        end
        texfile = convertTexture(File.join(texdir, filename))
        begin
            if texfile
                $SU2RAD_COUNTER.add(skm.texture.class.to_s)
                @textureHash[skm] = File.basename(texfile)
            else
                @textureHash[skm] = ''
            end
        rescue => e
            uimessage("%s\n%s\n" % [$!.message,e.backtrace.join("\n"), -2])
        end
    end
    
    def setAlias(material, alias_name)
        if @aliasHash.has_key?(alias_name)
            m = @aliasHash[alias_name]
            if m != material
                old = getSaveMaterialName(m)
                new = getSaveMaterialName(material)
                uimessage("changing alias '#{alias_name}' from '#{old}' to '#{new}'", 4)
            end
        else
            uimessage("new alias name '#{alias_name}' for material '#{getSaveMaterialName(material)}'")
        end
        @aliasHash[alias_name] = material
        @materialHash[alias_name] = getSaveMaterialName(material)
        @materialsByName[alias_name] = material
    end

    def getCurrentMaterialName
        if @nameStack.length > 0
            return @nameStack[-1]
        else
            return 'sketchup_default_material'
        end
    end
    
    def get(mat)
        return @materialHash[mat]
    end
   
    def getByName(name)
        if @materialsByName.has_key?(name)
            return @materialsByName[name]
        else
            return nil
        end
    end
    
    def has_key?(mat)
        return @materialHash.has_key?(mat)
    end
    
    def pop
        return @nameStack.pop()
    end

    def push(mat)
        if mat != nil
            name = getSaveMaterialName(mat)
            @nameStack.push(name)
        else
            @nameStack.push(@nameStack[-1])
        end
    end
    
    def set(material, name)
        @materialHash[material] = name
        @materialsByName[name] = material
    end
   
    def getAliasDescription(material)
        if @aliasHash.has_key?(material)
            name = @materialHash[material]
            return "void alias #{material} #{name}"
        else
            uimessage("material '#{material} undefined; adding alias", -1)
            s  = "## undefined material #{material}"
            s += "\nvoid alias #{material} sketchup_default_material"
            return s
        end
    end 
   
    def defaultMaterial
        s  = "## default material"
        s += "\nvoid plastic sketchup_default_material"
        s += "\n0\n0\n5 0.4 0.4 0.4 0 0"
        return s
    end
    
    def getAliasFromAttribute(material)
        ['SKM', 'LAYER'].each { |adict|
            mAlias = Sketchup.active_model.get_attribute("SU2RAD_ALIAS_#{adict}", material)
            if mAlias
                uimessage("#{adict.downcase()} alias from attribute: '#{material}' => '#{mAlias}'", 2)
                radname = getRadianceIdentifier(material)
                txt = getMaterialDescription(mAlias)
                txt += "\nvoid alias #{radname} #{mAlias}"
                return txt
            end
        }
        return nil
    end
    
    def getMaterialDescription(material)
        ## always return a Radiance definition for <material>
        if material == nil
            return defaultMaterial()
        elsif _getMaterialDescription(material)
            return _getMaterialDescription(material)
        else
            radname = getRadianceIdentifier(material)
            s  = "## undefined material #{material}"
            s += "\nvoid alias #{radname} sketchup_default_material"
            return s
        end
    end
    
    def _getMaterialDescription(material)
        ## search definition for <material>
        if material.class == String
            ## could be alias, layer name or undefined material
            if @aliasHash.has_key?(material)
                return _getMaterialDescription(@aliasHash[material])
            elsif getAliasFromAttribute(material)
                txt = getAliasFromAttribute(material)
                return txt
            elsif @newMatLib.get(material)
                txt = @newMatLib.getMaterialWithDependencies(material)
                return txt
            end
            
        elsif material.class == Sketchup::Material
            txt = _getMaterialDescription(material.name)
            if txt
                return txt
            else
                ## last option: convert SU material
                name = getSaveMaterialName(material)
                if @materialConversions.has_key?(name)
                    return @materialConversions[name]
                else
                    text = convertSketchupMaterial(material, name)
                    @materialConversions[name] = text
                    return text
                end
            end
        
        else 
            uimessage("unknown object type for _getMaterialDescription(): '#{material.class}'", -2)
        end
    end
    
    def _searchMaterialLibrary(material)
        ## unused!
        if not @newMatLib
            return
        end
        ## first search alias in attribute_dictionary
        skmAlias = Sketchup.active_model.get_attribute("SU2RAD_ALIAS_SKM", material.name)
        layerAlias = Sketchup.active_model.get_attribute("SU2RAD_ALIAS_LAYER", material.name)
        mAlias = skmAlias || layerAlias
        if mAlias
            radMat = @newMatLib.getMaterialWithDependencies(mAlias)
            if radMat
                mdef = "## defined alias for material '%s'" % material.name
                mdef += "\n%s" % radMat
                mdef += "\nvoid alias %s %s" % [getRadianceIdentifier(material.name), mAlias]
                #TODO define alias?
                return mdef
            end
        end 
        ## or search for material name
        name = getRadianceIdentifier(material)
        return @newMatLib.getMaterialWithDependencies(name)
    end
    
    def getSaveMaterialName(mat)
        ## generate a name that's save to use in Radiance
        if @aliasHash.has_key?(mat)
            return mat
        end
        if @materialHash.has_key?(mat)
            return @materialHash[mat]
        end
        name = getRadianceIdentifier(mat.name)
        set(mat, name)
        return name
    end

    def convertSketchupMaterial(skm, name)
        text = "## material conversion from Sketchup rgb color"
        text += getBaseMaterial(skm, name)
        if doTextures(skm) == true
            uimessage("creating texture material for '#{skm}'", 2)
            if @textureHash.has_key?(skm) && @textureHash[skm] != ''
                pic = @textureHash[skm]
                tex = [ "void colorpict #{name}_tex",
                        "7 red green blue textures/#{pic} . frac(Lu) frac(Lv)",
                        "0\n0",
                        "#{name}_tex"]
                text.sub!("void", tex.join("\n"))
            else
                uimessage("texture image for material '#{skm}' not available", -1)
            end
        end
        return text 
    end
   
    def _cleanTextureFilename(filename)
        ## strip texture filename from file path
        if filename.index('\\')
            filename = filename.split('\\')[-1]
        end
        if filename.index('/')
            filename = filename.split('/')[-1]
        end
        ## TODO: check if first char is digit
        return filename.gsub(/\s+/, '_')    ## XXX better in path module
    end
    
    def getBaseMaterial(skm, name)
        ## fixed conversion of alpha (bug found by Anthony Rowlands) 
        text = ""
        c = skm.color
        r,g,b = rgb2rgb(c)
        spec = 0.0
        rough = 0.0
        ## hack: search for 'glass' in the name
        if name =~ /glass/i
            text += "\nvoid glass #{name}"
            text += "\n0\n0\n3"
            text += "  %.4f %.4f %.4f\n" % [r,g,b]
        ## use color.alpha to decide on material type (alpha between 0 and 255!)
        elsif c.alpha >= 245
            text += "\nvoid plastic #{name}"
            text += "\n0\n0\n"
            text += "5 %.4f %.4f %.4f %.3f %.3f\n" % [r,g,b,spec,rough]
        elsif c.alpha >= 50     ## treshold to use glass or trans
            trans = c.alpha / 255.0
            transspec = 0.2
            text += "\nvoid trans #{name}"
            text += "\n0\n0\n"
            text += "7 %.4f %.4f %.4f %.3f %.3f %.3f %.3f\n" % [r,g,b,spec,rough,trans,transspec]
        else
            text += "\nvoid glass #{name}"
            text += "\n0\n0\n"
            text += "3 %.4f %.4f %.4f\n" % [r,g,b]
        end
        return text
    end
    
    def rgb2rgb(color)
        ## simple conversion from RGB to RGB
        ## TODO: proper conversion between color spaces
        r = color.red/255.0
        g = color.green/255.0
        b = color.blue/255.0
        r *= 0.85
        g *= 0.85
        b *= 0.85
        return [r,g,b]
    end
    
end
    
