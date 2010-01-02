
var su2rad = su2rad ? su2rad : new Object()

    
    
function ExportSettingsObject() {
    this.scenePath = '.';
    this.sceneName = 'unnamed.rif';
    this.exportMode = 'by color';
    this.global_coords = true;
    this.textures = false;
    this.triangulate = false;
    this.radSunpath = false;
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
    } else if (value == 'by color') {
        this.global_coords = true;
        su2rad.dialog.showExportOption('textures'); 
    } else {
        this.global_coords = true;
        this.textures = false;
        su2rad.dialog.hideExportOption('textures');
    }
}

ExportSettingsObject.prototype.setValue = function(name,value) {
    log.debug("setValue: '" + name + "' = '" + value + "'");
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
    case 'radSunpath':
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
    text += '&radSunpath='    + this.radSunpath;
    return text
}

ExportSettingsObject.prototype.setOption = function (opt, val) {
    this.setValue(opt, val);
    applyExportOptions();
}

ExportSettingsObject.prototype.setOptionsFromArray = function (array) {
    var text = '<b>new export settings:</b><br/>';
    for(var j=0; j<array.length; j++) {
        var attrib = array[j];
        if(attrib != null) {
            this.setValue(attrib.name, attrib.value);
            var line = '&nbsp;&nbsp;<b>' + attrib.name + ':</b> ' + attrib.value + '<br/>';
            text += line;
        }
    }
    log.debug(text);
}

function onExportModeChange() {
    // apply new value for exportMode
    var val=document.getElementById("exportMode").value;
    //log.debug("new export mode: '" + val + "'"  );
    su2rad.exportSettings.setMode(val);
    _setGlobalCoordsDisplay();
    updateExportFormValues();
    su2rad.materials.setCurrentMaterialList(val);
    applyExportOptions();
}

function _setGlobalCoordsDisplay(val) {
    // show or hide global_coords checkbox
    var val = su2rad.exportSettings.exportMode;
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
    // callback for fileSelector
    var lastchar = path.charAt(path.length-1);
    if (lastchar == su2rad.PATHSEP) {
        // apply only directory path
        log.debug("new directory: '" + path + "'");
        document.getElementById("scenePath").value = path;
        path = _getExportPath()
    } 
    log.debug("new path: '" + path + "'");
    su2rad.exportSettings.setExportPath(path);
    updateExportFormValues();
    applyExportOptions();
}

function _getExportPath() {
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

function onSelectExportPath() {
    //XXX unused
    if (navigator.userAgent.indexOf('Firefox/3') != -1) {
        // FireFox 3 does not provide full path
        log.error('Firefox 3 can not be used to set export path. Sorry');
        alert('Firefox 3 can not be used to set export path. Sorry');
        // TODO: hide file selection
        path = _getExportPath();
        su2rad.exportSettings.setExportPath(path);
    } else {
        var val=document.getElementById("fileselection").value;
        su2rad.exportSettings.setExportPath(val);
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
    text = su2rad.utils.decodeText(text);
    su2rad.dialog.setStatusMsg("<b>file contents:</b><br/><code>" + text.replace(/\n/g,'<br/>') + "</code>");
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
    setSelectionValue('exportMode', su2rad.exportSettings.exportMode);
    // set visibility of global_coords checkbox
    _setGlobalCoordsDisplay();
}

function setExportOptionsJSON(msg) {
    var json = su2rad.utils.decodeJSON(msg);
    var opts = su2rad.utils.arrayFromJSON(json)
    su2rad.exportSettings.setOptionsFromArray(opts);
    updateExportFormValues();
}

function updateExportFormValues() {
    document.getElementById("scenePath").value = su2rad.exportSettings.scenePath;
    document.getElementById("sceneName").value = su2rad.exportSettings.sceneName + ".rif";
    document.getElementById("triangulate").checked = su2rad.exportSettings.triangulate;
    document.getElementById("textures").checked = su2rad.exportSettings.textures;
    document.getElementById("radSunpath").checked = su2rad.exportSettings.radSunpath;
    setExportModeSelection();
}

