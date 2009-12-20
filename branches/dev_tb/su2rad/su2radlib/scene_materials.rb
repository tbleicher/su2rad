
require 'radiance.rb'
require 'export_modules.rb'
require 'exportbase.rb'

class ListMaterial
    
    include JSONUtils
    include RadianceUtils
   
    attr_reader :name, :alias
    attr_writer :alias
    
    def initialize(material, group='undef')
        @material = material
        @name = material.name
        @alias = ''
        @group = group
    end
    
    def getDict
        dict = {'name'     => '%s' % @material.name,
                'nameRad'  => '%s' % getRadianceIdentifier(@material.name),
                'nameHTML' => '%s' % JSONUtils::escapeHTML(@material.name),
                'alias'    => '%s' % @alias,
                'group'    => '%s' % @group}
        return dict
    end
    
    def setAlias(newAlias)
        @alias = newAlias
    end
    
    def toJSON
        return toStringJSON(getDict())
    end  

end


class SkmMaterial < ListMaterial
    
    def getDict
        d = super()
        d['radName'] = getRadianceIdentifier(@material.display_name)
        return d
    end
    
end


class RadMaterial < ListMaterial
    
    def initialize(material, group='undef')
        super(material, group)
        @defined = true
    end

    def getDict
        d = super()
        d['group']      = @material.getGroup()
        d['defType']    = @material.defType
        d['definition'] = @material.getText().gsub(/\n/, '<br/>')
        d['preview']    = @material.preview
        d['required']   = @material.required
        d['mType']      = @material.getType()
        d['defined']    = "%s" % @defined
        return d
    end

    def setUndefined
        @defined = false
    end
    
end



class MaterialLists < ExportBase
    
    ## creates SketchUp, Radiance and 'layer' materials
    
    include JSONUtils
    include InterfaceBase

    attr_reader :matLib
    
    def initialize
        path = File.join( File.dirname(__FILE__), 'ray')
        @matLib = Radiance::MaterialLibrary.new(path)
    end
        
    def createMaterialPreview(dlg, matname)
        path = @matLib.createMaterialPreview(matname)
        if path and path != ""
            dlg.execute_script("su2rad.materials.setPreviewImage('%s','%s')" % [matname,path])
        end
    end

    def setMaterialAlias(dlg, param)
        skmname, radname, mtype = param.split("&")
        uimessage("setting alias for %s '%s' to material '%s'" % [mtype,skmname,radname], 0)
        dictName = "SU2RAD_ALIAS_%s" % mtype.upcase()
        printf "DEBUG dictName=%s\n"  % dictName
        Sketchup.active_model.set_attribute(dictName, skmname, radname)
    end
    
    def removeMaterialAlias(dlg, param)
        skmname, mtype = param.split("&")
        dictName = "SU2RAD_ALIAS_%s" % mtype.upcase()
        if dictName != 'SU2RAD_ALIAS_SKM' && dictName != 'SU2RAD_ALIAS_LAYER'
            printf "\nWARNING ALIAS dictName='#{dictName}'\n"
        end
        radname = Sketchup.active_model.get_attribute(dictName, skmname)
        if radname
            attrDict = Sketchup.active_model.attribute_dictionary(dictName)
            oldalias = attrDict.delete_key(skmname)
            uimessage("removed alias for skm '%s' (was: '%s')" % [skmname,oldalias], 0)
        else
            uimessage("no alias set for %s '%s'" % [mtype, skmname]) 
        end
    end
   
    def setLists(dlg)
        setMaterialList(dlg, 'rad')
        setMaterialList(dlg, 'skm')
        setMaterialList(dlg, 'layer')
    end

    def setMaterialList(dlg, mtype)
        if mtype == 'rad'
            materials = @matLib.getMaterials()
            matList = materials.collect { |mat|
                rmat = RadMaterial.new(mat)
                if not @matLib.isDefined?(mat)
                    rmat.setUndefined()
                end
                rmat
            }
            _setMaterialListInChunks(matList, dlg, mtype)
        elsif mtype == 'layer'
            layers = Sketchup.active_model.layers
            layerList = layers.collect { |layer| ListMaterial.new(layer, 'layer') }
            attrDict = Sketchup.active_model.attribute_dictionary("SU2RAD_ALIAS_LAYER")
            if attrDict
                layerList.each { |m| m.alias = attrDict[m.name] || m.alias } 
            end
            _setMaterialListInChunks(layerList, dlg, mtype)
        else
            materials = Sketchup.active_model.materials
            skmList = materials.collect { |skm| SkmMaterial.new(skm, 'skm') }
            attrDict = Sketchup.active_model.attribute_dictionary("SU2RAD_ALIAS_SKM")
            if attrDict
                skmList.each { |m| m.alias = attrDict[m.name] || m.alias } 
            end
            _setMaterialListInChunks(skmList, dlg, 'skm')
        end
    end

    def _setMaterialListInChunks(mList, dlg, mtype)
        nChunk = 200
        startIdx = 0
        while startIdx < mList.length
            chunk = mList[startIdx...startIdx+nChunk]
            jsonList = chunk.collect { |m| m.toJSON() }
            json = encodeJSON( "[%s]" % jsonList.join(',') )
            uimessage("mList %s: setting materials %d to %d" % [mtype, startIdx, startIdx+chunk.length])
            dlg.execute_script("setMaterialsListJSON('%s','%s')" % [json,mtype])
            startIdx += nChunk
        end
    end

end 


