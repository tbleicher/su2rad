require 'sketchup.rb'
require 'exportbase.rb'
require 'radiance.rb'

require 'radiancecomponent.rb'
require 'radiancegroup.rb'
require 'radiancepolygon.rb'
require 'radiancesky.rb'
require 'exportscene.rb'

#require 'webdialog_views.rb'

require 'modules/filesystemproxy.rb'
require 'modules/jsonutils.rb'
require 'modules/session.rb'



class ExportDialogWeb < ExportBase
    
    include Tbleicher::Su2Rad::JSONUtils
    include Tbleicher::Su2Rad::Session
    
    def initialize(scene)

        @scene = scene
        
        @exportOptions = @scene.exportOptions
        @renderOptions = @scene.renderOptions
        @skyOptions    = @scene.skyOptions
        @viewsList     = @scene.viewsList
        @materialLists = @scene.materialLists
    end

    def applyExportOptions(dlg, params='')
        @exportOptions.applyExportOptions(dlg,params)
        ## allow load of existing rif files
        filepath = File.join(@exportOptions.scenePath,@exportOptions.sceneName)
        if File.exists?(filepath) && (@renderOptions.loaded?(filepath) == false)
            dlg.execute_script("enableLoadSceneFile('%s')" % filepath)
        end
    end

    def getDirectoryListing(dlg, dirpath)
        dirpath,root = dirpath.split('&')
        if root == 'true'
            dirs = Tbleicher::Su2Rad::FileSystemProxy.listDirectoryTree(dirpath)
        else
            dirs = Tbleicher::Su2Rad::FileSystemProxy.listDirectory(dirpath)
        end
        json = toStringJSON(dirs)
        dlg.execute_script( "fileSelector.setFileTreeJSON('%s', '%s')" % [encodeJSON(json),root])
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
    
    def show(title="su2rad export")
        ## create and show WebDialog
        if $SU2RAD_DIALOG_WINDOW
            $SU2RAD_DIALOG_WINDOW.bring_to_front()
            return
        end
        dlg = UI::WebDialog.new(title, true, nil, 650, 800, 50, 50, true);
        #dlg.set_background_color("0000ff")
            
        ## export and cancel actions
        dlg.add_action_callback("onCancel") { |d,p|
            uimessage("closing dialog ...")
            d.close();
            $SU2RAD_DIALOG_WINDOW = nil
        }
        dlg.add_action_callback("onExport") {|d,p|
            startExport(d,p)
        }
        
        dlg.add_action_callback("loadTextFile") {|d,p|
            loadTextFile(d,p);
        }
        
        dlg.add_action_callback("getDirectoryListing") {|d,p|
            getDirectoryListing(d,p);
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
            @viewsList.applyViewSettings(d,p)
        }
        dlg.add_action_callback("removeViewOverride") { |d,p|
            @viewsList.removeViewOverride(d,p)
        }
        dlg.add_action_callback("selectAllViews") { |d,p|
            @viewsList.selectAllViews(d,p)
        }
        dlg.add_action_callback("setViewsList") { |d,p|
            @viewsList.setViewsList(d,p)
        }
        dlg.add_action_callback("activateView") { |d,p|
            @viewsList.activateView(p)
        }
        
        ## materials
        dlg.add_action_callback("setMaterialAlias") { |d,p|
            @materialLists.setMaterialAlias(d,p)
        }
        dlg.add_action_callback("removeMaterialAlias") { |d,p|
            @materialLists.removeMaterialAlias(d,p)
        }
        
        ## final actions
        dlg.set_on_close {
            uimessage("TODO: webdialog closed", 1)
            $SU2RAD_DIALOG_WINDOW = nil
        }
        
        ## set contents
        html = File.join(File.dirname(__FILE__), "html","su2rad_export.html")
        dlg.set_file(html, nil)
        
        ## show dialog
        $SU2RAD_DIALOG_WINDOW = dlg
        dlg.show {
            uimessage("setSketchup()", 2)
            dlg.execute_script("setSketchup()")
            @exportOptions.setExportOptions(dlg, '')
            @renderOptions.setRenderOptions(dlg, '')
            @viewsList.setViewsList(dlg, '')
            @skyOptions.setSkyOptions(dlg, '')
            @materialLists.setLists(dlg)
            dlg.execute_script("updateExportPage()")
        }
    end ## end def show
        
    def startExport(dlg,params)
        #XXX @scene.setOptionsFromDialog(@exportOptions,@renderOptions,@skyOptions,@viewsList)
        @scene.prepareExport()
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

