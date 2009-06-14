
function ExportSettingsObject() {
    this.scenePath = '.';
    this.sceneName = 'unnamed.rif';
    this.exportMode = 'by color';
    this.global_coords = true;
    this.textures = false;
    this.triangulate = false;
    this.daysim = false;
}

ExportSettingsObject.prototype._setBool = function(name,value) {
    if (value == true || value == 'true') {
        this[name] = true;
    } else {
        this[name] = false;
    }
}

ExportSettingsObject.prototype.setExportPath = function(path) {
    // extract project path and scene name from <path>
    // path = base directory for export
    // name = scene name with out '.rif' extension
    var pf = splitPath(path);
    this.scenePath = pf[0];
    
    if (pf[1].match(/\.rif$/i)) {               // log.debug("2 match for '*.rif'");
        this.sceneName = pf[1].slice(0,-4);
        
    } else if (pf[1].match(/\.skp$/i)) {        // log.debug("2 match for '*.skp'");
        // add directory to path? 
        this.scenePath += pf[1].slice(0,-4);
        // sceneName unchanged
        
    } else if (pf[1].match(/\.[a-z]{3}$/i)) {   // log.debug("2 match for any extension");
        this.sceneName = pf[1].slice(0,-4) ;
    
    } else {                                    // log.debug("2 no match");
        this.sceneName = pf[1];
    }
} 


ExportSettingsObject.prototype.setMode = function(val) {
    var value = val.replace(/_/g," ");
    this.exportMode = value;
    if (value == 'by group') {
        this.global_coords = document.getElementById('global_coords').checked;
    } else {
        this.global_coords = true;
    }
}

ExportSettingsObject.prototype._setDaysim = function(value) {
    if (value == true || value == 'true') {
        this.daysim = true;
        this.textures = false;
        hideExportOption('textures');
    } else {
        this.daysim = false;
        showExportOption('textures');
    }
}

ExportSettingsObject.prototype._setTextures = function(value) {
    if (value == true || value == 'true') {
        this.textures = true;
        this.daysim = false;
        hideExportOption('daysim');
    } else {
        this.textures = false;
        showExportOption('daysim');
    }
}

ExportSettingsObject.prototype.setValue = function(name,value) {
    //log.debug("setValue: '" + name + "' = '" + value + "'");
    switch (name) {
    case 'exportMode': 
        this.setMode(value);
        break;
    case 'triangulate':
        this._setBool(name,value);
        break;
    case 'global_coords':
        this._setBool(name,value);
        break;
    case 'textures':
        this._setTextures(value);
        break;
    case 'daysim':
        this._setDaysim(value);
        break;
    default:
        this[name] = value;
        break;
    }
}

ExportSettingsObject.prototype.toString = function() {
    text  =  'scenePath='     + this.scenePath;
    text += '&sceneName='     + this.sceneName;
    text += '&triangulate='   + this.triangulate;
    text += '&textures='      + this.textures;
    text += '&exportMode='    + this.exportMode;
    text += '&global_coords=' + this.global_coords;
    text += '&daysim='        + this.daysim;
    return text
}



function onExportBoolOption(opt) {
    var val = document.getElementById(opt).checked;
    exportSettings.setValue(opt, val);
    applyExportOptions();
}

function onExportModeChange() {
    // apply new value for exportMode
    var val=document.getElementById("exportMode").value;
    //log.debug("new export mode: '" + val + "'"  );
    exportSettings.setMode(val);
    _setGlobalCoordsDisplay();
    updateExportFormValues();
    setCurrentMaterialList(val);
    applyExportOptions();
}

function _setGlobalCoordsDisplay(val) {
    // show or hide global_coords checkbox
    var val = exportSettings.exportMode;
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

function setExportPath(path) {
    if (path == null) {
        path = _getExportPath()
    }
    log.debug("new path: '" + path + "'");
    exportSettings.setExportPath(path);
    updateExportFormValues();
    applyExportOptions();
}

function _getExportPath() {
    var p = document.getElementById("scenePath").value;
    var f = document.getElementById("sceneName").value;
    p = p.replace(/\\/g, "/");   
    if (p.charAt(p.length-1) == PATHSEP) {
        var path = p + f;
    } else {
        var path = p + PATHSEP + f;
    }
    return path;
}

function onSelectExportPath() {
    //XXX unused
    if (navigator.userAgent.indexOf('Firefox/3') != -1) {
        // FireFox 3 does not provide full path
        log.error('Firefox 3 can not be used to set export path. Sorry');
        alert('Firefox 3 can not be used to set export path. Sorry');
        // TODO: hide file selection
        path = _getExportPath();
        exportSettings.setExportPath(path);
    } else {
        var val=document.getElementById("fileselection").value;
        exportSettings.setExportPath(val);
    }
    updateExportFormValues();
    applyExportOptions();
}




function onLoadSceneFile() {
    // open scene file
    try {
        // access file contents via nsIDOMFileList (FireFox, Mozilla)
        var files = document.getElementById("fileselection").files;
        var text = files.item(0).getAsText('UTF-8');
        _loadSceneFile(text);
    } catch (e) {
        // asigne callback for file access via Sketchup
        loadFileCallback = loadSceneFile;
        var path = _getExportPath();
        loadTextFile(path);
    }
}

function loadSceneFile(text) {
    // loadTextFile callback to read scene (*.rif) files
    text = decodeText(text);
    setStatusMsg("<b>file contents:</b><br/><code>" + text.replace(/\n/g,'<br/>') + "</code>");
    _loadSceneFile(text);
}

function _loadSceneFile(text) {
    if (radOpts.getOptionsFromFileText(text)) {
        document.getElementById("loadSceneButton").value='reload';
        radOpts.loadedFile = _getExportPath();
    }
    //document.getElementById("loadSceneButton").style.display='none';
}

function enableLoadSceneFile(path) {
    document.getElementById("loadSceneButton").style.display='';
    if (radOpts.loadedFile == path) {
        document.getElementById("loadSceneButton").value='reload';
    }
}

function setExportModeSelection() {
    setSelectionValue('exportMode', exportSettings.exportMode);
    // set visibility of global_coords checkbox
    _setGlobalCoordsDisplay();
}

function setExportOptionsJSON(msg) {
    var json = decodeJSON(msg);
    try {
        eval("var exportOpts = " + json);
    } catch (e) {
        logError(e);
        var exportOpts = new Array();
    }
    var text = '<b>export settings:</b><br/>';
    for(var j=0; j<exportOpts.length; j++) {
        var attrib = exportOpts[j];
        if(attrib != null) {
            exportSettings.setValue(attrib.name, attrib.value);
            var line = '&nbsp;&nbsp;<b>' + attrib.name + ':</b> ' + attrib.value + '<br/>';
            //log.debug(line);
            text = text + line;
        }
    }
    updateExportFormValues();
    setStatusMsg(text);
}

function updateExportFormValues() {
    document.getElementById("scenePath").value = exportSettings.scenePath;
    document.getElementById("sceneName").value = exportSettings.sceneName + ".rif";
    document.getElementById("triangulate").checked = exportSettings.triangulate;
    document.getElementById("textures").checked = exportSettings.textures;
    document.getElementById("daysim").checked = exportSettings.daysim;
    setExportModeSelection();
}

