require 'export_modules.rb'
require "exportbase.rb"
require "delauney_mod.rb"
require 'filesystemproxy.rb'


class WeatherDataImportDialog < ExportBase

    include JSONUtils
    include InterfaceBase

    def initialize()

    end

    def show() 
        if $SU2RAD_DIALOG_WINDOW
            $SU2RAD_DIALOG_WINDOW.bring_to_front()
            return
        end
        dlg = UI::WebDialog.new("su2rad - weather data import", true, nil, 900, 700, 50, 50, true);
        
        dlg.add_action_callback("onCancel") { |d,p|
            uimessage("closing dialog ...")
            d.close();
            $SU2RAD_DIALOG_WINDOW = nil
        }
        dlg.add_action_callback("getDirectoryListing") {|d,p|
            getDirectoryListing(d,p);
        }
        dlg.add_action_callback("setEPWFilePathFromDialog") {|d,p|
            setEPWFilePathFromDialog(d,p);
        }
        dlg.add_action_callback("loadTextFile") {|d,p|
            uimessage("loadTextFile() ...")
            loadTextFile(d,p);
        }
        
        ## clean up actions
        dlg.set_on_close {
            uimessage("TODO: webdialog closed", 1)
            $SU2RAD_DIALOG_WINDOW = nil
        }
        
        ## load html file and show dialog
        html = File.join(File.dirname(__FILE__), "html","importWeatherData.html")
        uimessage("DEBUG: html path='%s'" % html, 2)
        dlg.set_file(html, nil)
        $SU2RAD_DIALOG_WINDOW = dlg
        epwpath, epwdata = getEPWPathFromAttribute()
        dlg.show {
            printf("DEBUG: su2rad.dialog.setSketchup()\n")
            dlg.execute_script("su2rad.dialog.setSketchup()")
            dlg.execute_script("su2rad.dialog.evaluateSketchup()")
            dlg.execute_script("su2rad.dialog.weatherdata.evaluateSketchup()")
            epwpath, epwdata = getEPWPathFromAttribute()
            if epwpath != ""
                path = urlEncode(epwpath)
                data = urlEncode(epwdata)
                uimessage("setting file path '#{epwpath}'", 2)
                dlg.execute_script("su2rad.dialog.weatherdata.setFileFromSketchup('#{data}', '#{path}')")
            else
                path = '/Users/ble/tmp/svn/Ruby/sketchup/branches/cleanup/su2rad/su2radlib/html/testdata' 
                uimessage("starting file selector ... (path='#{path}')", 2)
                dlg.execute_script("su2rad.dialog.weatherdata.loadFileSU('#{path}')")
            end 
        }
    end

    def getDirectoryListing(dlg, dirpath)
        dirpath,root = dirpath.split('&')
        if root == 'true'
            dirs = FileSystemProxy.listFileSystemTree(dirpath)
        else
            dirs = FileSystemProxy.listDirectory(dirpath)
        end
        json = toStringJSON(dirs)
        dlg.execute_script("su2rad.dialog.fileSelector.setFileTreeJSON('%s', '%s')" % [escape_javascript(json),root])
    end
    
    def getEPWPathFromAttribute
        path = ""
        data = ""
        attr_dict = Sketchup.active_model.attribute_dictionaries['SU2RAD_WEATHERDATA']
        if attr_dict != nil && attr_dict['filepath'] != nil
            if File.exists?(attr_dict['filepath'])
                path = attr_dict['filepath']
                data = File.open(path).read()
            else
                printf "WARNING: path '#{path}' does not exist\n"
            end
        else
            printf "WARNING: SU2RAD_WEATHERDATA does not exist\n"
        end
        return path, data
    end
    
    def setEPWFilePathFromDialog(dlg, opt)
        ## get EPW file path from URL string
        filepath = urlDecode(opt)
        uimessage("received filepath '#{filepath}'", 2)
        if File.exists?(filepath)
            Sketchup.active_model.set_attribute('SU2RAD_WEATHERDATA', 'filepath', filepath)
            dicts = Sketchup.active_model.attribute_dictionaries['SU2RAD_WEATHERDATA']
            uimessage("set attribute SU2RAD_WEATHERDATA['filepath'] ('#{dicts['filepath']}')", 2)
            
        end
    end
    
    def loadTextFile(dlg, filepath)
        uimessage("loadTextFile(filepath='#{filepath}')")
        text = ''
        if File.exists?(filepath)
            f = File.open(filepath, 'r')
            text = f.read()
            text = escape_javascript(text)
            uimessage("TEST: text=%d bytes" % text.length , 3)
        end
        dlg.execute_script("su2rad.dialog.weatherdata._loadFileSU('%s')" % text)
    end

end 
    

