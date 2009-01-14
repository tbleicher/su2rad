
// set environment
if (navigator.userAgent.indexOf("Windows") != -1) {
    var PATHSEP = "/";    // helps with file handling in Ruby
    var PLATFORM = "Windows";
} else {
    var PATHSEP = "/";
    var PLATFORM = "Mac";
}


// flag for backend 
var SKETCHUP = false;
var _currentStatusDiv = "status_tab-export"

var map, marker, lastPoint;



// object instances
try {
var exportSettings = new ExportSettingsObject();
var skyOptions = new SkyOptionsObject(); // required by ModelLocationObject
var skyDateTime = new SkyDateTimeObject();
var modelLocation = new ModelLocationObject();
var radOpts = new RadOptsObject();
var viewsList = new ViewsListObject();
} catch (e) {
    log.error(e.message)
}

function initPage() {
    //log.toggle();
    //window.resizeTo(640,800);
    // hide file selectors if FF3
    if (navigator.userAgent.indexOf('Firefox/3') != -1) {
        document.getElementById("sceneFileSelection").style.display='none';
    }
}

function loadTestData() {
    setTest();
    if (SKETCHUP == false) {
        // fill dialog with test data
        getExportOptions();
        getViewsList();
        getSkySettings();
        updateViewsPage();
        getMaterialsListsTest();
        updateMaterialsPage()
    } else {
        alert("no testdata within Sketchup!")
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

function disableTextureOption() {
    document.getElementById("textures").checked = false;
    document.getElementById("textures").style.display='none';
    document.getElementById("textures_label").className = 'controlValue';
    document.getElementById("textures_label").innerHTML = '<i>textures disabled</i>';
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

function setProgressMsg (msg) {
    log.debug("progress: " + msg);
    document.getElementById("progressStatus").innerHTML = msg;
}

function setStatusMsg (msg) {
    document.getElementById(_currentStatusDiv).innerHTML = msg;
}

function logError(e) {
    log.error(e.toString())
    log.error("e.name " + e.name)
    log.error("e.message " + e.message)
    log.error("e.fileName " + e.fileName)
    log.error("e.lineNumber " + e.lineNumber)
}

function showProgressWindow() {
    try {
        $('#progressWindow').jqmShow();
    } catch (e) {
        logError(e)
    }
}

function hideProgressWindow() {
    try {
        $('#progressWindow').jqmHide();
    } catch (e) {
        log.error(e.toString())
        log.error("e.name " + e.name)
        log.error("e.message " + e.message)
        log.error("e.fileName " + e.fileName)
        log.error("e.lineNumber " + e.lineNumber)
    }
}

function onExportButton() {
    log.debug("onExportButton()...")
    if (SKETCHUP != false) {
        try {
            log.info("starting export ...")
            window.location = 'skp:onExport@';
        } catch (e) {
            log.error(e.toString())
            alert(e.toString())
        }
    } else {
        showBusy()
        log.warn('Sketchup not available; no export action');
        msg  = '{"status"  :"success"';
        msg += ',"messages":"0"';
        msg += ',"files"   :"31"';
        msg += ',"groups"  :"345"';
        msg += ',"faces"   :"45678"}';
        showResults(encodeJSON(msg));
    }
}

function onCancelButton() {
    try {
        if (SKETCHUP != false) {
                //log.info("export canceled by user")
                window.location = 'skp:onCancel@';
        } else {
            hideProgressWindow();
            document.body.innerHTML = "";
            //window.opener='x';
            window.close();
        }
    } catch (e) {
        logError(e)
    }
}

function switch_to_tab(id) {
    return
    $('#tab-container').triggerTab(id);
    //updatePageById(id);
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
    val = val.replace(/\\/g, "/");   
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
    try {
        var select = document.getElementById(id); 
        for (i=0; i<select.options.length; i++) {
            if (select.options[i].value == value) {
                select.selectedIndex = i;
                return true;
            }
        }
    } catch (e) {
        log.error("setSelectionValue('" + id + "'): " + e.name)
        return false;
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

function JSON2HTML (obj, title, level) {
    // show JSON object with HTML markup
    if (level == null) {
        level = 3;
    }
    var text = "<H"+level+">" + title + "</H"+level+">";
    if (obj.constructor.toString().match(/Array/i)) { 
        for (var i=0; i<obj.length; i++) {
            text += JSON2HTML(obj[i], "element "+i, level+1);
        }
    } else {
        log.debug("obj=" + obj);
        for (var property in obj) {
            try {
                text += "<b>" + property.toString() + "</b> = " + obj[property] + "<br/>";
                log.debug(property.toString() + "=" + obj[property]);
            } catch (e) {
                logError(e)
            }
        }
    }
    return text;
}
    
function showBusy() {
    log.error("TODO: showBusy()")
    showProgressWindow()
}

function showResults(msg) {
    log.error("TODO: showResult()")
    log.error("TEST: msg=" + msg)
    json = decodeJSON(msg)
    var obj = new Array();
    try { 
        eval("obj = " + json)
        //hideProgressWindow()
        //showResultsWindow()
    } catch (e) {
        logError(e)
    }
    html = JSON2HTML(obj, 'export results')
    html += '<div><input class="exportbutton" type="button" value="close" onclick="onCancelButton()"></div>';
    document.getElementById("progressStatus").innerHTML = html;
}

function onTabClick(link,div_show,div_hide) {
    _currentStatusDiv = "status_" + div_show.id;
    updatePageById(div_show.id);
    return true;
}

function updatePageById(id) {
    if (id == "tab-export") {
        return updateExportPage();
    } else if  (id == "tab-render") {
        return updateRenderPage();
    } else if (id == "tab-sky") {
        return updateSkyPage();
    } else if (id == "tab-views") {
        return updateViewsPage();
    } else if (id == "tab-materials") {
        return updateMaterialsPage();
    } else if (id == "tab-fields") {
        return updateFieldsPage();
    } else if (id == "tab-climate") {
        return updateClimatePage();
    } else {
        log.warn("unexpected tab id '" + id + "'");
        return false;
    }
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
    updateRenderFormValues();
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
    skyDateTime.getShadowTime();
}

function updateViewsPage() {
    log.debug("updating 'Views' page ...");
    updateViewDetailsList();
}

function updateMaterialsPage() {
    log.debug("updating 'Materials' page ...");
}

function updateFieldsPage() {
    log.debug("updating 'Fields' page ...");
}

function updateClimatePage() {
    log.debug("updating 'Climate' page ...");
}


