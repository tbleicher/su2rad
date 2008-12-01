
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



// object instances
var exportSettings = new ExportSettingsObject();
var modelLocation = new ModelLocationObject();
var radOpts = new RadOptsObject();
var skyOptions = new SkyOptionsObject();
var skyDateTime = new SkyDateTimeObject();
var viewsList = new ViewsListObject();


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
        getSkySettings();
    }
}
    
function disableGlobalOption() {
    // remove 'by group' option from selection
    select = document.getElementById('exportMode'); 
    for (i=0; i<select.options.length; i++) {
        if (select.options[i].value == 'by group') {
            select.options[i] = null;
        }
    }
    exportSettings.setMode('by color');
    document.getElementById("global_coords_display").style.display='none';
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

function setValue(id, val) {
    // set initial variable values
    document.getElementById(id).value=val;
}

function setSelectionValue(id, value) {
    // set selection <id> to option <value>
    var select = document.getElementById(id); 
    for (i=0; i<select.options.length; i++) {
        if (select.options[i].value == value) {
            select.selectedIndex = i;
            return true;
        }
    }
    log.error("selection '" + id + "' has no value '" + value + "'");
    return false;
}

function replaceChars(text) {
    text = text.replace(/"/g,"");
    text = text.replace(/'/g,"");
    text = text.replace(/\(/g,"");
    text = text.replace(/\)/g,"");
    text = text.replace(/ /g,"_");
    text = text.replace(/</g,"");
    text = text.replace(/>/g,"");
    return text;
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
    setSkyCmdLine();
}

function updateRenderPage() {
    log.debug("updating 'Render' page ...");
    // setRpictOptions();
    updateRpictValues();
    updateRenderLine();
}

function updateSkyPage() {
    log.debug("updating 'Sky' page ...");
    updateLocationFormValues();
    updateSkyFormValues();
    updateGoogleMapLocation();
    // enable 'apply' if location or time has changed
    if (modelLocation.changed == true || skyDateTime.changed == true) {
        document.getElementById("applyLocationValues").disabled=false;
        document.getElementById("reloadShadowInfo").disabled=false;
    } else {
        document.getElementById("applyLocationValues").disabled=true;
        document.getElementById("reloadShadowInfo").disabled=true;
    }
    setSkyCmdLine();
    skyDateTime.getShadowTime();
}

function updateFieldsPage() {
    log.debug("updating 'Fields' page ...");
}

function updateClimatePage() {
    log.debug("updating 'Climate' page ...");
}


