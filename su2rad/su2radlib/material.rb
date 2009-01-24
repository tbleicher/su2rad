
require "exportbase.rb"
require "radiance.rb"


class MaterialDefinition < ExportBase
    
    attr_reader :comment, :is_valid, :name, :rest, :text, :type, :required
    attr_writer :comment
    
    def initialize(text=nil)
        @comment = nil
        @is_valid = false
        @name = nil
        @text = nil
        @type = nil
        @rest = nil
        @required = nil
        if text
            begin
                parseText(text)
            rescue => e
                printf "Error in text: '#{text}'\n"
                msg = "%s\n%s" % [$!.message,e.backtrace.join("\n")]
                #uimessage("Error in material text '#{text}':", -2)
                #uimessage(msg, -2)
                printf "\n#{msg}\n"
                @valid = false
            end
        end
    end
    
    def parseText(text)
        defparts = []
        parts = text.split()
        @required = parts[0]
        @type = parts[1]
        @name = parts[2]
        if @type == 'alias'
            @required = parts[3]
            @rest = parts[4..parts.length].join(' ')
            @text = "void alias #{@name} #{@required}"
            @is_valid = true
        else
            idx1 = 3
            step1 = parts[idx1].to_i
            idx2 = 4 + step1
            step2 = parts[idx2].to_i
            idx3 = 5 + step1 + step2
            nargs = parts[idx3].to_i
            n = idx3 + nargs
            line1 = parts[idx1..idx1].join(' ')
            line2 = parts[idx2..idx2].join(' ')
            line3 = parts[idx3..n].join(' ')
            @rest = parts[n+1..parts.length].join(' ')
            @text = ["#{@required} #{@type} #{@name}", line1, line2, line3].join("\n")
            @is_valid = true
        end
        @text.strip!
        if @rest.strip == ''
            @rest = nil
        end
    end
    
    def set(text,name,type=nil)
        @text = text
        @name = name
        if type
            @type = type
            @valid = true
        else
            parts = text.split()
            parts.reverse!
            parts.each_index { |i|
                if parts[i] == name
                    @type = parts[i+1]
                end
                break
            }
            if @type
                @valid = true
            end
        end
    end 
    
    def write(filename, replace=false)
        if not File.exists?(filename) or replace == true
            begin
                f = File.new(filename, 'w')
                f.write(getText)
                f.close()
            rescue
                uimessage("Error creating material file '#{filename}'")
            end
        end
    end

    def valid?
        return @valid
    end
end


class MaterialFile < ExportBase

    attr_reader :byName
    
    def initialize(filename)
        @comments = {}
        @filename = filename
        @materials = []
        @byName = {}
        @byType = {}
        @lines = readFile(filename)
        if @lines != []
            parseLines()
        end
    end

    def addMaterial(m)
        if @comments.has_key?(m.name)
            m.comment = @comments[m.name]
        end
        @materials.push(m)
        @byName[m.name] = m
        if not @byType.has_key?(m.type)
            @byType[m.type] = []
        end
        @byType[m.type].push(m)
    end
    
    def parseLines(lines=nil)
        if not lines
            lines = @lines
        else
            lines = purgeLines(lines)
        end
        text = lines.join(" ")
        parseWords(text.split())
        return
        #XXX
        ## start with basic definitions
        rest = []
        basics = text.split("void")
        basics.each { |chunk|
            if chunk != ''
                r = parseSingleLine("void " + chunk)
                rest.push(r)
            end
        }
        rest.compact!
        uimessage("#{@filename}: found #{@materials.length} materials", 2)
        #@materials[0..5].each { |m| printf "m='#{m.text}'\n" }
        if rest.length != 0:
            printf "rest.length = #{rest.length}\n"
            rest.each { |l|
                if l != ''
                    printf "r='#{l}'\n" 
                end
            }
        end
    end     
        
    def parseWords(words)
        if words == []
            return
        end
        definitions = []
        current_def = []
        old_word = words[0]
        idx_word = words[0]
        
    end 
    
    def parseSingleLine(line)
        if line == ''
            return
        else
            m = MaterialDefinition.new(line)
            if m.is_valid == true
                addMaterial(m)
                if m.rest != nil
                    parseSingleLine(m.rest)
                end
            else
                return line
            end
        end
    end
        
    def readFile(filename)
        text = ""
        begin
            f = File.new(@filename)
            text = f.read()
            f.close()
        rescue => e
            msg = "%s\n%s" % [$!.message,e.backtrace.join("\n")]
            #uimessage("Error reading file '#{filename}':", -2)
            #uimessage(msg, -2)
            printf "\n#{msg}\n"
        end
        return purgeLines(text.split("\n"))
    end
    
    def find_comments(lines)
        current_comment = ''
        newlines = []
        l = lines.shift()
        while l != nil
            l.strip!
            if l == ''
                #next
                #l = lines.shift()
            elsif l.slice(0,1) == '#'
                current_comment += "\n"
                current_comment += l
            else  
                ## assume this is the material definition
                parts = l.split()
                if parts.length >= 3
                    name = parts[2]
                    if current_comment != ''
                        if not @comments.has_key?(name)
                            @comments[name] = ''
                        end
                        @comments[name] = @comments[name] + current_comment
                    end
                end
                current_comment = ''
            end
            newlines.push(l)
            l = lines.shift()
        end
        return newlines
    end        
    
    def purgeLines(lines)
        lines = find_comments(lines)
        lines.collect! { |l| l.split('#')[0] }
        lines.compact!
        lines.collect! { |l| l.split().join(' ') }
        lines.collect! { |l| l if l != ''}
        lines.compact!
        return lines
    end

    def show(type='')
        if type == ''
            @byType.each_pair { |t,list|
                printf "%-12s - %3d\n" % [t,list.length]
            }
        elsif @byType.has_key?(type)
                list = @byType[type]
                list.each { |m|
                    printf "#{m.getText}\n"
                }
        else
            printf "%-12s - %3d\n" % [type,0]
        end    
    end
end



class MaterialContext < ExportBase
    
    include RadianceUtils

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
        @materialDescriptions = Hash.new()
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
        if material.texture
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
        text += getMaterialDescription(nil)
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
            uimessage("Error: conversion to *.pic failed\n\n#{msg}", -2)
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
            printf "%s\n%s\n" % [$!.message,e.backtrace.join("\n")]
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
            uimessage("WARNING: material '#{material} undefined; adding alias")
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
    
    def getMaterialDescription(material)
        if material == nil
            return defaultMaterial
        elsif material.class == String
            ## could be alias, layer name or undefined material
            if @aliasHash.has_key?(material)
                return getMaterialDescription(@aliasHash[material])
            else
                s  = "## undefined material #{material}"
                s += "\nvoid alias #{material} sketchup_default_material"
                return s
            end
        end
        
        ## search in library if available
        if @newMatLib
            text = _searchMaterialLibrary(material)
            if text
                return text
            end
        end
        
        ## finally convert SU material
        name = getSaveMaterialName(material)
        text = @materialDescriptions[name]
        if text != nil
            return text
        else
            text = convertSketchupMaterial(material, name)
            @materialDescriptions[name] = text
            return text
        end
    end
    
    def _searchMaterialLibrary(material)
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
        name = getRadianceIdentifier(material.name)
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
        if doTextures(skm)
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
        ## strip texture filename to basename
        if filename.index('\\')
            filename = filename.split('\\')[-1]
        end
        if filename.index('/')
            filename = filename.split('/')[-1]
        end
        filename.gsub!(' ', '_')    ## XXX better in path module
        ## TODO: check if first char is digit
        return filename
    end
    
    def getBaseMaterial(skm, name)
        ## TODO: proper conversion between color spaces
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
        ## use c.alpha to decide on material type (alpha between 0 and 1!) 
        elsif c.alpha >= 0.95
            text += "\nvoid plastic #{name}"
            text += "\n0\n0\n"
            text += "5 %.4f %.4f %.4f %.3f %.3f\n" % [r,g,b,spec,rough]
        elsif c.alpha >= 0.2     ## treshold to use glass or trans
            trans = c.alpha
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
        #return rgb2rgb_TEST(color)
        r = color.red/255.0
        g = color.green/255.0
        b = color.blue/255.0
        r *= 0.85
        g *= 0.85
        b *= 0.85
        return [r,g,b]
    end
    
end
    


module ColorSpace
        
    ## matrix for sRGB color space transformation
    red     = [0.412424, 0.212656, 0.0193324]
    green   = [0.357579, 0.715158,  0.119193]
    blue    = [0.180464, 0.0721856, 0.950444]
    sRGBMatrix = [red,green,blue]
    
    def rgb2rgb_TEST(color)
        printf "rgb2rgb: #{color}\n"
        xyz = sRGB2XYZ(color)
        printTriple(xyz, "sRGB2XYZ")
        xyy = _XYZ2xyY(xyz)
        printTriple(xyy, "_XYZ2xyY")
        rgb = xyY2rgb(xyy)
        printTriple(rgb,  "xyY2rgb")
        return rgb
    end

    def printTriple(rgb, comment='')
        r,g,b = rgb
        printf "%-10s= %.5f  %.5f  %.5f\n" % [comment, r,g,b]
    end
    
    def sRGB2XYZ(color)
        ## convert sketchup color to XYZ color triple
        r = sRGBcomp2XYZcomp(color.red/255.0)
        g = sRGBcomp2XYZcomp(color.green/255.0)
        b = sRGBcomp2XYZcomp(color.blue/255.0)
        x,y,z = applyMatrix(r,g,b)
        return [x,y,z]
    end

    def applyMatrix(r,g,b)
        ## apply colorspace conversion matrix 
        _a,_b,_c = ColorSpace::sRGBMatrix[0]
        _d,_e,_f = ColorSpace::sRGBMatrix[1]
        _h,_i,_j = ColorSpace::sRGBMatrix[2]
        x = _a*r + _b*g + _c*b
        y = _d*r + _e*g + _f*b
        z = _h*r + _i*g + _j*b
        return [x,y,z]
    end

    def _XYZ2xyY(xyz)
        x,y,z = xyz
        if x + y + z == 0.0:
            return [0.0, 0.0, 0.0]
        else
            x = x / (x + y + z)
            y = y / (x + y + z)
            _y = y
            return [x,y,_y]
        end
    end

    def xyY2rgb(xyy)
        x,y,myY = xyy
        myX = x / y*myY
        myZ = (1-x-y) / y*myY
        r = noneg( 2.565*myX - 1.167*myY - 0.398*myZ)
        g = noneg(-1.022*myX + 1.978*myY + 0.044*myZ)
        b = noneg( 0.075*myX - 0.252*myY + 1.177*myZ)
        return [r,g,b]
    end

    def noneg(val)
        if val > 0.0
            return val
        else
            return 0.0
        end
    end

    def sRGBcomp2XYZcomp(comp)
        ## convert sRGB component to XYZ component
        if comp < 1.0
            comp /= 255.0
        end
        if comp > 0.04045
            comp = ((comp + 0.055) / 1.055 )**2.4
        else
            comp = comp / 12.92
        end
        return comp
    end
end




#mf = MaterialFile.new('/usr/local/lib/ray/lib/material.rad')
#mf.show()
#mf.show('alias')
#mf.show('metal')
