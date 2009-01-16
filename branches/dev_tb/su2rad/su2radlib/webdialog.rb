require 'sketchup.rb'
require 'export_modules.rb'
require 'exportbase.rb'
require 'radiance.rb'
require 'radiance_entities.rb'
require 'radiancescene.rb'
require 'webdialog_options.rb'
require 'webdialog_views.rb'


module RadianceUtils

    def getRadianceIdentifier(name)
        name = name.gsub(/[\[(}\]<>]/, '')
        name = name.gsub(/\s+/, '_')
        return name
    end

end 


class ListMaterial
    
    include JSONUtils
    include RadianceUtils
    
    def initialize(material, group='undef')
        @material = material
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
    
    def getDict
        d = super()
        d['group']      = @material.getGroup()
        d['defType']    = @material.defType
        d['definition'] = @material.getText().gsub(/\n/, '<br/>')
        d['required']   = @material.required
        d['mType']      = @material.getType()
        return d
    end
    
end


class ExportDialogWeb < ExportBase
    
    include JSONUtils
    include InterfaceBase
    
    def initialize()
        @scene = RadianceScene.new()
        @exportOptions = ExportOptions.new()
        @renderOptions = RenderOptions.new()
        @skyOptions = SkyOptions.new()
        @viewsList = SketchupViewsList.new()
    end

    def applyExportOptions(dlg, params='')
        @exportOptions.applyExportOptions(dlg,params)
        filepath = File.join(@exportOptions.scenePath,@exportOptions.sceneName)
        if File.exists?(filepath) && (@renderOptions.loaded?(filepath) == false)
            printf "DEBUG: enabling 'load' ...\n"
            dlg.execute_script("enableLoadSceneFile('%s')" % filepath)
        end
    end

    def loadTextFile(dlg, filepath)
        text = ''
        if File.exists?(filepath)
            f = File.open(filepath, 'r')
            text = f.read()
            text = urlEncode(text)
        end
        dlg.execute_script("loadFileCallback('%s')" % text)
    end
    
    def setMaterialAlias(dlg, param)
        skmname, radname, mtype = param.split("&")
        uimessage("TODO: setting alias for %s '%s' to material '%s'" % [mtype,skmname,radname], 0)
        #TODO
    end
    
    def removeMaterialAlias(dlg, skmname)
        radname = "TODO"
        uimessage("TODO: removing alias for skm '%s' (was: '%s')" % [skmname,radname], 0)
        #TODO
    end
    
    def setMaterialList(dlg, mtype)
        if mtype == 'rad'
            path = File.join( File.dirname(__FILE__), 'ray')
            mLib = Radiance::MaterialLibrary.new(path)
            materials = mLib.getMaterials()
            matList = materials.collect { |mat| RadMaterial.new(mat) }
            _setMaterialListInChunks(matList, dlg, mtype)
        elsif mtype == 'layer'
            layerList = []
            Sketchup.active_model.layers.each { |layer| 
                layerList.push( ListMaterial.new(layer, 'layer') )
            }
            _setMaterialListInChunks(layerList, dlg, mtype)
        else
            mtype = 'skm'
            skmList = []
            Sketchup.active_model.materials.each { |skm| 
                skmList.push( SkmMaterial.new(skm, 'skm') )
            }
            _setMaterialListInChunks(skmList, dlg, mtype)
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
    
    def updateViewFromString(d,p)
        ## convert param to Ruby array and update view
        begin
            vDict = eval(p)
            return @viewsList.updateView(vDict)
        rescue => e 
            uimessage("Error updateViewFromString(): %s\n\n%s\n" % [$!.message,e.backtrace.join("\n")], -2)
            return false
        end
    end
 
    def show(title="su2rad")
        ## create and show WebDialog
        dlg = UI::WebDialog.new(title, true, nil, 650, 800, 50, 50, true);
        #dlg.set_background_color("0000ff")
            
        ## export and cancel actions
        dlg.add_action_callback("onCancel") { |d,p|
            uimessage("closing dialog ...")
            d.close();
        }
        dlg.add_action_callback("onExport") {|d,p|
            startExport(d,p)
        }
        
        dlg.add_action_callback("loadTextFile") {|d,p|
            loadTextFile(d,p);
        }
        
        ## update of ...Options objects
        dlg.add_action_callback("applyExportOptions") { |d,p|
            applyExportOptions(d,p)
        }
        dlg.add_action_callback("applyRenderOptions") { |d,p|
            @renderOptions.applyRenderOptions(d,p)
        }
        
        ## shadow_info (location and sky)
        dlg.add_action_callback("getSkySettinge") { |d,p|
            ## get shadow_info dict and apply to dialog
            d.execute_script("setShadowInfoJSON('%s')" % encodeJSON(@skyOptions.toJSON()) )
        }
        dlg.add_action_callback("applySkySettings") { |d,p|
            ## set shadow_info values from dialog
            @skyOptions.applySkySettings(d,p)
        }
        dlg.add_action_callback("writeSkySettingsToShadowInfo") { |d,p|
            ## set shadow_info values from dialog
            @skyOptions.writeSkySettingsToShadowInfo(d,p) 
        }
        
        ## views
        dlg.add_action_callback("applyViewSettings") { |d,p|
            updateViewFromString(d,p)
        }
        dlg.add_action_callback("selectAllViews") { |d,p|
            @viewsList.selectAllViews(d,p)
        }
        dlg.add_action_callback("setViewsList") { |d,p|
            @viewsList.setViewsList(d,p)
        }
        
        ## materials
        dlg.add_action_callback("setMaterialAlias") { |d,p|
            setMaterialAlias(d,p)
        }
        dlg.add_action_callback("removeMaterialAlias") { |d,p|
            removeMaterialAlias(d,p)
        }
        #dlg.set_on_close {
        #}
        
        html = File.join(File.dirname(__FILE__), "html","su2rad_export.html")
        dlg.set_file(html, nil)
        
        ## show dialog
        dlg.show {
            uimessage("setSketchup()", 2)
            dlg.execute_script("setSketchup()")
            @exportOptions.setExportOptions(dlg, '')
            @renderOptions.setRenderOptions(dlg, '')
            @viewsList.setViewsList(dlg, '')
            @skyOptions.setSkyOptions(dlg, '')
            setMaterialList(dlg, 'rad')
            setMaterialList(dlg, 'skm')
            setMaterialList(dlg, 'layer')
            dlg.execute_script("updateExportPage()")
        }
    end ## end def show
        
    def startExport(dlg,params)
        @scene.setOptionsFromDialog(@exportOptions,@renderOptions,@skyOptions,@viewsList)
        dlg.close()
        status = @scene.startExportWeb()
        if status 
            showFinalStatus(status)
        end
    end

    def showFinalStatus(status)
        return
        tmplpath = File.join(File.dirname(__FILE__), "html", "final.html")
        abspath = "file://" + File.join(File.dirname(__FILE__), "html", "css") + File::SEPARATOR
        t = File.open(tmplpath, 'r')
        template = t.read()
        t.close()
        template = template.gsub(/\.\/css\//, abspath)
        html = template.sub(/--STATUS--/, status)
        printf "\n\n%s\n\n" % html
        dlg = UI::WebDialog.new("export summary", true, nil, 300, 200, 150, 150, true);
        dlg.set_html(html)
        dlg.show_modal { dlg.bring_to_front() }
    end

end ## end class exportDialogWeb

 
def test_showWebDialog()
    edw = ExportDialogWeb.new()
    edw.show()
end

