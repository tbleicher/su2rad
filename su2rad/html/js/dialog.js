
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
    log.debug("setBool()  n='" + name + "' v='" + value +  "' this.n='" + this[name] + "'");
}

ExportSettingsObject.prototype.setValue = function(name,value) {
    log.debug("setValue()  n='" + name + "' v='" + value +  "'");
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
    log.debug("triangulate=" + document.getElementById("triangulate").checked);
    log.debug("this.triangulate=" + this.triangulate);
    
    document.getElementById("textures").checked = this.textures;
    log.debug("textures=" + document.getElementById("textures").checked);
    log.debug("this.textures=" + this.textures);
    setExportMode(this.exportMode);
    // do not set global_coords, just hide it via onExportModeChange()
    onExportModeChange();
}

var exportSettings = new ExportSettingsObject();



function initPage() {
    log.toggle();
    window.statusbar.visible = true;
    window.resizeTo(640,800);
    //setExportOptionsTest();
}

function initExportPage() {
    log.debug("initExportPage() ...");
    updateExportPage();
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
        document.getElementById("climate_options").style.display='';
    }
    else {
        $('#tab-container').disableTab(5);
        document.getElementById("edit_climate").disabled=true;
        document.getElementById("climate_options").style.display='none';
    }
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


function onExportModeChange() {
    var val=document.getElementById("exportMode").value;
    exportSettings.setMode(val);
    log.debug("new export mode: '" + val + "'"  );
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


function onSelectExportPath() {
    var val=document.getElementById("fileselection").value;
    val=escape(val);
    var reversedsrc=reverseData(val);
    var nameEnd=reversedsrc.indexOf('/');
    // TODO: onSelectExportPath: path manipulation in Windows
    var name=reversedsrc.substring(nameEnd,reversedsrc.length)
    name=reverseData(name);
    name=unescape(name);
    var path=reversedsrc.substring(0,nameEnd);
    path=reverseData(path);
    path=unescape(path);
    // apply to exportSettings first
    exportSettings.scenePath = path;
    exportSettings.sceneName = name;
    exportSettings.updateDisplay();
    return name;
}



function setExportOptionsJSON(msg) {
    log.debug("setExportOptionsJSON() (" + msg.length + " bytes)");
    var json = msg.replace(/#COMMA#/g,",");
    log.debug("json='" + json + "'");
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
            log.debug("  name='" + attrib.name + "' value='" + attrib.value +  "'");
            exportSettings.setValue(attrib.name, attrib.value);
            text = text + '&nbsp;&nbsp;<b>' + attrib.name + ':</b> ' + attrib.value + '<br/>';
        }
    }
    exportSettings.updateDisplay();
    //text += "<br/>" + json;
    document.getElementById('statusMsg').innerHTML = text;
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
    setViewSelection(param);

    //if (SKETCHUP == true) {
    //    window.location = 'skp:setViewSelection@' + param;
    //}
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

function setViewsListJSON(msg) {
    // eval JSON views string from SketchUp
    var json = msg.replace(/#COMMA#/g,",");
    try {
        eval("var viewsList = " + json);
    } catch (e) {
        log.error(e.name);
        var viewsList = new Array();
    }
    var text = '<table><tr><td class="column_lable"></td>';
    var col = 0;
    for(var i=0; i<viewsList.length; i++) {
        var view = viewsList[i];
        if(view != null) {
            // log.info("view = '" + view.name + "'");
            text += _getViewTD(view);
            col += 1;
        }
        // reset column counter except for last row
        if (col == 3 && i != (viewsList.length-1)) {
            text += '</tr><tr><td class="column_lable"></td>';
            col = 0;
        }
    }
    // fill row with empty cells
    if (col != 0) {
        for(var i=0; i<(3-col); i++) {
            text += "<td></td>";
        }
    }
    text += "</tr></table>";
    document.getElementById("viewsSelection").innerHTML = text;
}


function onApplyLocation() {
    applyModelLocation(modelLocation)
    modelLocation.changed = false;
    updateSkyFormValues()
}


function initViews() {
    log.debug("initViews()");
    getViewsList();
}


function onTabClick(link,div_show,div_hide) {
    log.debug("switching to tab '" + div_show.id + "'");
    if (div_show.id == "tab-export") {
        updateExportPage();
    } else if  (div_show.id == "tab-render") {
        updateRenderPage();
    } else if (div_show.id == "tab-sky") {
        updateSkyPage();
    } else if (div_show.id == "tab-fields") {
        updateFieldsPage();
    } else if (div_show.id == "tab-climate") {
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
    updateSkyFormValues()
    // window.resizeBy(10,0);
}

function updateFieldsPage() {
    log.debug("updating 'Fields' page ...");
}

function updateClimatePage() {
    log.debug("updating 'Climate' page ...");
}


