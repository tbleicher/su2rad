
require 'radiance.rb'
require 'exportbase.rb'
require 'scene_materials.rb'

require 'modules/jsonutils.rb'
require 'modules/session.rb'


module Tbleicher

  module Su2Rad

    class MaterialLists < ExportBase
      
      ## creates SketchUp, Radiance and 'layer' materials
      
      include Tbleicher::Su2Rad::JSONUtils
      include Tbleicher::Su2Rad::Session

      attr_reader :matLib
      
      def initialize
        path = File.join( File.dirname(__FILE__), 'ray')
        @matLib = Radiance::MaterialLibrary.new(path)
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
          matList = materials.collect { |mat| Tbleicher::Su2Rad::RadMaterial.new(mat) }
          _setMaterialListInChunks(matList, dlg, mtype)

        elsif mtype == 'layer'
          layers = Sketchup.active_model.layers
          layerList = layers.collect { |layer| Tbleicher::Su2Rad::ListMaterial.new(layer, 'layer') }
          attrDict = Sketchup.active_model.attribute_dictionary("SU2RAD_ALIAS_LAYER")
          if attrDict
            layerList.each { |m| m.alias = attrDict[m.name] || m.alias } 
          end
          _setMaterialListInChunks(layerList, dlg, mtype)
        
        else
          materials = Sketchup.active_model.materials
          skmList = materials.collect { |skm| Tbleicher::Su2Rad::SkmMaterial.new(skm, 'skm') }
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

    end # MaterialLists

  end # Su2Rad

end # Tbleicher 


