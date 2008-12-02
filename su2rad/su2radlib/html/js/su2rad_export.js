
function ExportSettingsObject() {
    this.scenePath = '.';
    this.sceneName = 'unnamed';
    this.exportMode = 'by color';
    this.global_coords = true;
    this.textures = false;
    this.triangulate = false;
}

ExportSettingsObject.prototype._setBool = function(name,value) {
    if (value == true || value == 'true') {
        this[name] = true;
    } else {
        this[name] = false;
    }
}

ExportSettingsObject.prototype.setExportPath = function(path) {
    var pf = splitPath(path);
    this.scenePath = pf[0];
    this.sceneName = pf[1];
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

ExportSettingsObject.prototype.setValue = function(name,value) {
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
        this._setBool(name,value);
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
    applyExportOptions();
}

function _setGlobalCoordsDisplay(val) {
    // show or hide global_coords checkbox
    var val = exportSettings.exportMode;
    if (val == 'by group') {
        document.getElementById("global_coords_display").style.display='';
    }
    else {
        document.getElementById("global_coords_display").style.display='none';
    }
}


function _getExportPath() {
    var p = document.getElementById("scenePath").value;
    var f = document.getElementById("sceneName").value;
    if (p[p.length-1] == PATHSEP) {
        var path = p + f;
    } else {
        var path = p + PATHSEP + f;
    }
    return path;
}

function onSelectExportPath() {
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
    // text file is encoded via urlEncode - replace '+'
    text = unescape(text);
    text = text.replace(/\+/g,' ');
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
    var json = msg.replace(/#COMMA#/g,",");
    try {
        eval("var exportOpts = " + json);
    } catch (e) {
        log.error("setExportOptionsJSON:" + e.name);
        var exportOpts = new Array();
    }
    var text = '<b>render settings:</b><br/>';
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
    document.getElementById("sceneName").value = exportSettings.sceneName;
    document.getElementById("triangulate").checked = exportSettings.triangulate;
    document.getElementById("textures").checked = exportSettings.textures;
    setExportModeSelection();
}

