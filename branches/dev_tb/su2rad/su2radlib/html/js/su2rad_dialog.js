
// set environment
if (navigator.userAgent.indexOf("Windows") != -1) {
    // this is Windows
    var PATHSEP = "\\";
    var PLATFORM = "Windows";
} else {
    var PATHSEP = "/";
    var PLATFORM = "Mac";
}


// flag for backend 
var SKETCHUP = false;
var _currentStatusDiv = "statusTabExport"

var map, marker, lastPoint;


function ExportSettingsObject() {
    this.scenePath = '.';
    this.sceneName = 'unnamed';
    this.exportMode = 'by color';
    this.global_coords = true;
    this.textures = false;
    this.triangulate = false;
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

ExportSettingsObject.prototype.setBool = function(name,value) {
    if (value == 'true' || value == true) {
        this[name] = true;
    } else {
        this[name] = false;
    }
}

ExportSettingsObject.prototype.setValue = function(name,value) {
    switch (name) {
    case 'exportMode': 
        this.setMode(value);
        break;
    case 'triangulate':
        this.setBool(name,value);
        break;
    case 'global_coords':
        this.setBool(name,value);
        break;
    case 'textures':
        this.setBool(name,value);
        break;
    default:
        this[name] = value;
        break;
    }
}

ExportSettingsObject.prototype.updateDisplay = function() {
    document.getElementById("scenePath").value = this.scenePath;
    document.getElementById("sceneName").value = this.sceneName;
    document.getElementById("triangulate").checked = this.triangulate;
    document.getElementById("textures").checked = this.textures;
    setExportMode(this.exportMode);
    // set visibility of global_coords checkbox
    _setGlobalCoordsDisplay(this.exportMode);
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

var exportSettings = new ExportSettingsObject();


function initPage() {
    log.toggle();
    window.resizeTo(640,800);
    // hide file selectors if FF3
    if (navigator.userAgent.indexOf('Firefox/3') != -1) {
        document.getElementById("sceneFileSelection").style.display='none';
    }
    if (SKETCHUP == false) {
        // fill dialog with test data
        getExportOptions();
        getViewsList();
        getShadowInfo();
    }
}
    
function disableGlobalOption() {
    // remove 'by group' option from selection
    select = document.getElementById('exportMode'); 
    for (i=0; i<select.options.length; i++) {
        if (select.options[i].text == 'by group') {
            select.options[i] = null;
        }
    }
    setExportMode('by color');
    document.getElementById("global_coords_display").style.display='none';
}

function enableGlobalOption() {
    // make global_coords check box visible
    document.getElementById("global_coords_display").style.display='';
}


function toggleClimateTab() {
    if (document.getElementById("climate_checkbox").checked == true) {
        $('#tab-container').enableTab(5);
        document.getElementById("edit_climate").disabled=false;
        document.getElementById("climateSummary").style.display='';
    }
    else {
        $('#tab-container').disableTab(5);
        document.getElementById("edit_climate").disabled=true;
        document.getElementById("climateSummary").style.display='none';
    }
}

function setStatusMsg (msg) {
    document.getElementById(_currentStatusDiv).innerHTML = msg;
}

function setExportMode(mode) {
    exportSettings.setMode(mode);
    select = document.getElementById('exportMode'); 
    for (i=0; i<select.options.length; i++) {
        if (select.options[i].text == mode) {
            select.selectedIndex = i;
        }
    }
}


function onExportButton() {
    try {
        //log.info("export canceled by user")
        window.location = 'skp:onExport@';
    } catch (e) {
        // do something
    }
}

function onCancelButton() {
    try {
        //log.info("export canceled by user")
        window.location = 'skp:onCancel@';
    } catch (e) {
        window.opener='x';
        window.close();
    }
}


function onExportModeChange() {
    // apply new value for exportMode
    var val=document.getElementById("exportMode").value;
    log.debug("new export mode: '" + val + "'"  );
    exportSettings.setMode(val);
    _setGlobalCoordsDisplay(val);
    applyExportOptions();
}

function _setGlobalCoordsDisplay(val) {
    // show or hide global_coords checkbox
    if (val == 'by_group') {
        enableGlobalOption()
    }
    else {
        document.getElementById("global_coords_display").style.display='none';
    }
}


function onToggleOption(opt) {
    var val = document.getElementById(opt).checked;
    log.debug("onToggleOption: " + opt + "=" + val );
    exportSettings[opt] = val;
    applyExportOptions();
}


function switch_to_tab(pos) {
    $('#tab-container').triggerTab(pos);
}


function reverseData(val) {
    var d="";
    var temp="";
    for (var x=val.length; x>0; x--) {
        d+=val.substring(x,eval(x-1));
    }
    return d;
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

function setExportPath(path) {
    if (path == null) {
        path = _getExportPath();
    }
    var pf = splitPath(path);
    // apply to exportSettings first
    exportSettings.scenePath = pf[0];
    exportSettings.sceneName = pf[1];
    exportSettings.updateDisplay();
    applyExportOptions();
} 

function onSelectExportPath() {
    if (navigator.userAgent.indexOf('Firefox/3') != -1) {
        // FireFox 3 does not provide full path
        log.error('Firefox 3 can not be used to set export path. Sorry');
        alert('Firefox 3 can not be used to set export path. Sorry');
        // TODO: hide file selection
        setExportPath();
    } else {
        var val=document.getElementById("fileselection").value;
        setExportPath(val);
    }
}

function splitPath(val) {
    var text="fileselection: '" + val + "'<br/>";
    setStatusMsg(text);
    val=encodeURI(val);
    var reversedsrc=reverseData(val);
    text += "reversedsrc: " + reversedsrc + "<br/>";
    setStatusMsg(text);
    var nameEnd=reversedsrc.indexOf(PATHSEP);
    var name=reversedsrc.substring(0,nameEnd);
    text += "name rev: '" + name + "'<br/>";
    name=reverseData(name);
    text += "name esc: '" + name + "'<br/>";
    name=decodeURI(name);
    text += "name: '" + name + "'<br/>";
    setStatusMsg(text);
    var path=reversedsrc.substring(nameEnd, reversedsrc.length);
    text += "path rev: '" + path + "'<br/>";
    path=reverseData(path);
    text += "path esc: '" + path + "'<br/>";
    path=decodeURI(path);
    text += "path: '" + path + "'<br/>";
    setStatusMsg(text);
    return [path,name];
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
    text = text.replace(/\+/g," ");
    text = unescape(text);
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
    exportSettings.updateDisplay();
    setStatusMsg(text);
}


function setValue(id, val) {
    // set initial variable values
    document.getElementById(id).value=val;
}


function replaceChars(text) {
    text = text.replace(/\(/g,"");
    text = text.replace(/\)/g,"");
    text = text.replace(/ /g,"_");
    text = text.replace(/</g,"");
    text = text.replace(/>/g,"");
    return text;
}


function onViewSelectionChange(viewname) {
    // callback for views checkboxes
    var id = replaceChars(viewname);
    var msg = "view '" + viewname + "'";
    var param = viewname+"&";
    if (document.getElementById(id).checked == true) {
        msg += " selected";
        param += "selected";
    } else {
        msg += " deselected";
        param += "deselected";
    }
    log.info(msg);
    setViewsSelection(param);
}




function _getViewTD(view) {
    // return <td> for view line (lable and checkbox)
    var text = '<td class="column">';
    var id = replaceChars(view.name);
    text += '<input id="' + id + '"' 
    text += 'type="checkbox" onchange="onViewSelectionChange(\'' + view.name + '\')"'
    if (view.current == "true" || view.selected == "true") {
        text += ' checked'
    }
    text += '/> ' + view.name + '</td>';
    return text;
}
function _getViewDiv(view) {
    // return <td> for view line (lable and checkbox)
    var text = '<div class="gridCell">';
    var id = replaceChars(view.name);
    text += '<input id="' + id + '"' 
    text += 'type="checkbox" onchange="onViewSelectionChange(\'' + view.name + '\')"'
    if (view.current == "true" || view.selected == "true") {
        text += ' checked'
    }
    text += '/> ' + view.name + '</div>';
    return text;
}

function setViewsListJSON(msg) {
    // eval JSON views string from SketchUp
    log.info('setViewsListJSON()');
    var json = msg.replace(/#COMMA#/g,",");
    try {
        eval("var viewsList = " + json);
    } catch (e) {
        log.error(e.name);
        var viewsList = new Array();
    }
    //var text = '<table><tr><td class="column_lable"></td>';
    var text = '<div class="gridRow">';
    var col = 0;
    for(var i=0; i<viewsList.length; i++) {
        var view = viewsList[i];
        if(view != null) {
            log.info("view = '" + view.name + "'");
            //text += _getViewTD(view);
            text += _getViewDiv(view);
            col += 1;
        }
        // reset column counter except for last row
        if (col == 3 && i != (viewsList.length-1)) {
            //text += '</tr><tr><td class="column_lable"></td>';
            text += '</div><div class="gridRow">';
            col = 0;
        }
    }
    // fill row with empty cells
    //if (col != 0) {
    //    for(var i=0; i<(3-col); i++) {
    //        text += "<td></td>";
    //    }
    //}
    //text += "</tr></table>";
    text += "</div>";
    document.getElementById("viewsSelection").innerHTML = text;
}


function onApplyLocation() {
    var params = modelLocation.toParamString();
    applyModelLocation(params);
    modelLocation.changed = false;
    updateSkyLocFormValues()
}


function onTabClick(link,div_show,div_hide) {
    log.debug("switching to tab '" + div_show.id + "'");
    if (div_show.id == "tab-export") {
        _currentStatusDiv = "statusTabExport"
        updateExportPage();
    } else if  (div_show.id == "tab-render") {
        _currentStatusDiv = "statusTabRender"
        updateRenderPage();
    } else if (div_show.id == "tab-sky") {
        _currentStatusDiv = "statusTabSky"
        updateSkyPage();
    } else if (div_show.id == "tab-fields") {
        _currentStatusDiv = "statusTabFields"
        updateFieldsPage();
    } else if (div_show.id == "tab-climate") {
        _currentStatusDiv = "statusTabClimate"
        updateClimatePage();
    } else {
        log.warn("unexpected tab id '" + div_show.id + "'");
        return false;
    }
    return true;
}

function onTabHide(link,div_show,div_hide) {
    // log.debug("onTabHide:" + link + " show:" + div_show.id + " hide:" + div_hide.id);
}

function onTabShow(link,div_show,div_hide) {
    // log.debug("onTabShow:" + link + " show:" + div_show.id + " hide:" + div_hide.id);
}

function updateExportPage() {
    log.debug("updating 'Export' page ...");
    setSkySummary();
}

function updateRenderPage() {
    log.debug("updating 'Render' page ...");
    // setRpictOptions();
    updateRpictValues();
    updateRenderLine();
}

function updateSkyPage() {
    log.debug("updateSkyPage()");
    onSkyTypeChange(); // triggers update of sky command line; 
    // google map initiation
    if (checkGoogleMap() == true) {
        log.debug("  updating map ...");
        var lat = modelLocation.Latitude;
        var lng = modelLocation.Longitude; 
        try {
            var latlng = new GLatLng(lat, lng);
            map.setCenter(latlng, map.getZoom());
        } catch (e) {
            // there may not be a map yet
            if (e.name == "TypeError") {
                log.debug(e);
            } else {
                log.error(e);
            }
        }
        // googleMapInitialize(lat,lng);
    }
    // window.resizeBy(-10,0);
    updateSkyLocFormValues()
    // window.resizeBy(10,0);
}

function updateFieldsPage() {
    log.debug("updating 'Fields' page ...");
}

function updateClimatePage() {
    log.debug("updating 'Climate' page ...");
}


