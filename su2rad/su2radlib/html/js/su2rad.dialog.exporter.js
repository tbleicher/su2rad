
var su2rad = su2rad ? su2rad : new Object()
su2rad.dialog = su2rad.dialog ? su2rad.dialog : new Object()
su2rad.dialog.exporter = su2rad.dialog.exporter ? su2rad.dialog.exporter : new Object()

su2rad.dialog.exporter.onLoadSceneFile = function () {
    // open scene file
    try {
        // access file contents via nsIDOMFileList (FireFox, Mozilla)
        var files = document.getElementById("fileselection").files;
        var text = files.item(0).getAsText('UTF-8');
        this._loadSceneFile(text);
    } catch (e) {
        // asigne callback for file access via Sketchup
        loadFileCallback = su2rad.dialog.exporter.loadSceneFile;
        var path = su2rad.dialog.exporter._getExportPath();
        loadTextFile(path);
    }
}

su2rad.dialog.exporter.loadSceneFile = function (text) {
    // loadTextFile callback to read scene (*.rif) files
    text = su2rad.utils.decodeText(text);
    su2rad.dialog.setStatusMsg("<b>file contents:</b><br/><code>" + text.replace(/\n/g,'<br/>') + "</code>");
    su2rad.dialog.exporter._loadSceneFile(text);
}

su2rad.dialog.exporter._loadSceneFile = function (text) {
    if (su2rad.settings.radiance.getOptionsFromFileText(text)) {
        document.getElementById("loadSceneButton").value='reload';
        su2rad.settings.radiance.loadedFile = su2rad.dialog.exporter._getExportPath();
    }
    //document.getElementById("loadSceneButton").style.display='none';
}

su2rad.dialog.exporter.enableLoadSceneFile = function (path) {
    document.getElementById("loadSceneButton").style.display='';
    if (su2rad.settings.radiance.loadedFile == path) {
        document.getElementById("loadSceneButton").value='reload';
    }
}

su2rad.dialog.exporter.setExportModeSelection = function () {
    setSelectionValue('exportMode', su2rad.settings.exporter.exportMode);
    // set visibility of global_coords checkbox
    this.setGlobalCoordsDisplay();
}

su2rad.dialog.exporter.setExportOptionsJSON = function (msg) {
    var json = su2rad.utils.decodeJSON(msg);
    var opts = su2rad.utils.arrayFromJSON(json)
    su2rad.settings.exporter.setOptionsFromArray(opts);
    this.update();
}

su2rad.dialog.exporter.update = function () {
    document.getElementById("scenePath").value = su2rad.settings.exporter.scenePath;
    document.getElementById("sceneName").value = su2rad.settings.exporter.sceneName + ".rif";
    document.getElementById("triangulate").checked = su2rad.settings.exporter.triangulate;
    document.getElementById("textures").checked = su2rad.settings.exporter.textures;
    document.getElementById("radSunpath").checked = su2rad.settings.exporter.radSunpath;
    this.setExportModeSelection();
}


su2rad.dialog.exporter._getExportPath = function () {
    var p = document.getElementById("scenePath").value;
    var f = document.getElementById("sceneName").value;
    p = p.replace(/\\/g, "/");   
    if (p.charAt(p.length-1) == su2rad.PATHSEP) {
        var path = p + f;
    } else {
        var path = p + su2rad.PATHSEP + f;
    }
    return path;
}

su2rad.dialog.exporter.onCancel = function() {
    try {
        if (su2rad.SKETCHUP != false) {
                //log.info("export canceled by user")
                window.location = 'skp:onCancel@';
        } else {
            su2rad.dialog.hideProgressWindow();
            document.body.innerHTML = "";
            //window.opener='x';
            window.close();
        }
    } catch (e) {
        logError(e)
    }
}

su2rad.dialog.exporter.onExport = function() {
    log.debug("onExportButton()...")
    if (su2rad.SKETCHUP != false) {
        try {
            log.info("starting export ...")
            window.location = 'skp:onExport@';
        } catch (e) {
            logError(e)
            alert(e.toString())
        }
    } else {
        su2rad.dialog.showBusy()
        log.warn('Sketchup not available; no export action');
        msg  = '{"status"  :"success"';
        msg += ',"messages":"0"';
        msg += ',"files"   :"31"';
        msg += ',"groups"  :"345"';
        msg += ',"faces"   :"45678"}';
        su2rad.dialog.showResults(su2rad.utils.encodeJSON(msg));
    }
}

su2rad.dialog.exporter.onExportModeChange = function () {
    // apply new value for exportMode
    var val=document.getElementById("exportMode").value;
    //log.debug("new export mode: '" + val + "'"  );
    su2rad.settings.exporter.setMode(val);
    this.setGlobalCoordsDisplay();
    this.update();
    su2rad.materials.setCurrentMaterialList(val);
    applyExportOptions();
}

su2rad.dialog.exporter.setGlobalCoordsDisplay = function (val) {
    // show or hide global_coords checkbox
    var val = su2rad.settings.exporter.exportMode;
    if (val == 'by group') {
        document.getElementById("global_coords_display").style.display='';
    } else {
        document.getElementById("global_coords_display").style.display='none';
    }
    if (val == 'by color') {
        document.getElementById("textures_display").style.display='';
    } else {
        document.getElementById("textures_display").style.display='none';
    }
}

su2rad.dialog.exporter.setOption = function (optname, optvalue) {
    log.debug("DEBUG: export.setOption(optname='" + optname + "' optvalue='" + optvalue + "')")
}

su2rad.dialog.exporter.setExportPath = function (path) {
    // callback for fileSelector
    if (!path) {
        path = this._getExportPath()
    }
    var lastchar = path.charAt(path.length-1);
    if (lastchar == su2rad.PATHSEP) {
        // apply only directory path
        log.debug("new directory: '" + path + "'");
        document.getElementById("scenePath").value = path;
        path = this._getExportPath()
    } 
    log.debug("new path: '" + path + "'");
    su2rad.settings.exporter.setExportPath(path);
    this.update();
    applyExportOptions();
}

su2rad.dialog.exporter.showFileSelector = function() {
    su2rad.dialog.fileSelector.callback = su2rad.dialog.exporter.setExportPath
    var scenepath = document.getElementById('scenePath').value
    su2rad.dialog.fileSelector.show(scenepath)
}

    
