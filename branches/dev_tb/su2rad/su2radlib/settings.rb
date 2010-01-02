require 'sketchup.rb'
require 'export_modules.rb'
require 'exportbase.rb'
require 'filesystemproxy.rb'


class SettingsDialog < ExportBase
    
    include JSONUtils
    include InterfaceBase
    
    def initialize()
        @tmp_dict = {}
    end

    def getDirectoryListing(dlg, dirpath)
        uimessage('getDirectoryListing()', 2)
        if dirpath
            dirpath,root = dirpath.split('&')
            uimessage("dirpath='" + dirpath + "'", 3)
            dirpath = decodeJSON(dirpath) 
            uimessage("dirpath='" + dirpath + "'", 3)
            uimessage("root='" + root + "'", 3)
            if root == 'true'
                dirs = FileSystemProxy.listFileSystemTree(dirpath)
            else
                dirs = FileSystemProxy.listDirectory(dirpath)
            end
            json = toStringJSON(dirs)
            json = escape_javascript(json)
            uimessage('setFileTreeJSON()', 2)
            dlg.execute_script("su2rad.dialog.fileSelector.setFileTreeJSON('%s', '%s')" % [json,root])
        else
            uimessage("no 'dirpath' for getDirectoryListing()", -2)
        end
    end
    
    def show(title="su2rad settings")
        ## create and show WebDialog
        if $SU2RAD_DIALOG_WINDOW
            $SU2RAD_DIALOG_WINDOW.bring_to_front()
            return
        end
        dlg = UI::WebDialog.new(title, true, nil, 650, 800, 50, 50, true);
            
        ## apply, close and close actions
        dlg.add_action_callback("applySettings") {|d,p|
            uimessage("applying settings ...", 2)
            applySettings(d,p)
        }
        
        dlg.add_action_callback("closeDialog") { |d,p|
            uimessage("closing settings dialog ...", 1)
            d.close();
            @tmp_dict = {}
            $SU2RAD_DIALOG_WINDOW = nil
        }

        dlg.set_on_close {
            uimessage("closing settings dialog ...", 2)
            @tmp_dict = {}
            $SU2RAD_DIALOG_WINDOW = nil
        }
        
        ## changed setting  callback
        dlg.add_action_callback("newSetting") {|d,p|
            newSetting(d,p)
        }
        dlg.add_action_callback("removeTempSetting") {|d,p|
            removeTempSetting(d,p)
        }
        
        ## file browser callback
        dlg.add_action_callback("getDirectoryListing") {|d,p|
            uimessage("callback('" + p + "')", 1)
            getDirectoryListing(d,p)
        }

        ## set contents
        html = File.join(File.dirname(__FILE__), "html","su2rad_settings.html")
        dlg.set_file(html, nil)
        
        ## show dialog
        $SU2RAD_DIALOG_WINDOW = dlg
        dlg.show {
            dlg.execute_script("su2rad.dialog.setSketchup()") 
            uimessage("su2rad.dialog.settings.show()", 2)
            setCurrentOptions(dlg)
        }
    end
        
    def applySettings(dlg,params)
        $SU2RAD_CONFIG.consolidate(@tmp_dict).each { |k,v|
            $SU2RAD_CONFIG.set(k,v)
        }
        printf("\n%s\n" % $SU2RAD_CONFIG.to_s())
        #TODO:
        #$SU2RAD_CONFIG.write() 
        #$SU2RAD_CONFIG.readConfig() 
        setCurrentOptions(dlg)
    end

    def newSetting(dlg, params)
        uimessage("newSetting: %s" % params, 1)
        key,value = params.split('&')
        dict = {key => value}
        $SU2RAD_CONFIG.consolidate(dict).each { |k,v|
            @tmp_dict[k] = v
        }
        if @tmp_dict.length != 0
            dlg.execute_script("su2rad.dialog.settings.setButtonState('apply')") 
        end
    end
    
    def removeTempSetting(dlg, param)
        uimessage("removeTempSetting: %s" % param, 1)
        if @tmp_dict.has_key?(param)
            @tmp_dict.delete(param)
        end
        if @tmp_dict.length == 0
            dlg.execute_script("su2rad.dialog.settings.setButtonState('apply', 'disabled')") 
        end
    end
    
    def setCurrentOptions(dlg)
        uimessage("su2rad.dialog.settings.setCurrentOptions()", 2)
        json = escape_javascript($SU2RAD_CONFIG.toJSON())
        dlg.execute_script("su2rad.dialog.settings.setCurrentOptions('%s')" % json) 
        dlg.execute_script("su2rad.dialog.settings.setButtonState('apply', 'disabled')") 
        @tmp_dict = {}
    end

end ## end class exportDialogWeb

 
