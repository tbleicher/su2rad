

var su2rad = su2rad ? su2rad : new Object()
su2rad.dialog = su2rad.dialog ? su2rad.dialog : new Object()
su2rad.dialog.exporter = su2rad.dialog.exporter ? su2rad.dialog.exporter : new Object()
    
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
    var pf = su2rad.utils.splitPath(path);
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


