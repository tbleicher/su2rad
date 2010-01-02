
// requires su2rad.dialog.common.js to be loaded

// create new namespace for main export functions


// set environment
var _currentStatusDiv = "status_tab-export"

var map, marker, lastPoint;

// object instances
try {
    su2rad.exportSettings = new ExportSettingsObject();
    var skyOptions     = new SkyOptionsObject();      // required by ModelLocationObject
    var skyDateTime    = new SkyDateTimeObject();
    var modelLocation  = new ModelLocationObject();
    var radOpts        = new RadOptsObject();
    var viewsList      = new ViewsListObject();
} catch (e) {
    logError(e)
}

function loadTestData() {
    su2rad.dialog.setTest();
    if (su2rad.SKETCHUP == false) {
        // fill dialog with test data
        getExportOptions();
        getViewsList();
        getSkySettings();
        updateViewsPage();
        test_getMaterialsLists();
        updateMaterialsPage()
    } else {
        alert("no testdata within Sketchup!")
    }
}

su2rad.dialog.hideExportOption = function (opt) {
    log.debug("disableExportOption('" + opt + "')")
    try {
        document.getElementById(opt).checked = false;
        document.getElementById(opt).style.display='none';
        var opt_label = opt.toString() + "_label";
        document.getElementById("textures_label").className = 'optionLabelDisabled';
        document.getElementById(opt_label).innerHTML = '<i>' + opt.toString() + ' disabled</i>';
    } catch (e) {
        log.error("Error in disableExportOption('" + opt + "')")
        logError(e)
    }
}

su2rad.dialog.hideProgressWindow = function () {
    try {
        $('#progressWindow').jqmHide();
    } catch (e) {
        logError(e)
    }
}

su2rad.dialog.showExportOption = function (opt) {
    log.debug("su2rad.dialog.showExportOption('" + opt + "')")
    try {
        document.getElementById(opt).style.display='';
        var opt_label = opt.toString() + "_label";
        document.getElementById(opt_label).className = '';
        document.getElementById(opt_label).innerHTML = ' ' + opt.toString();
    } catch (e) {
        log.error("Error in su2rad.dialog.showExportOption('" + opt + "')")
        logError(e)
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
    su2rad.exportSettings.setMode('by color');
    document.getElementById("global_coords_display").style.display='none';
}


function disableTextureOption() {
    document.getElementById("textures").checked = false;
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

function setProgressMsg (msg) {
    log.debug("progress: " + msg);
    document.getElementById("progressStatus").innerHTML = msg;
}

su2rad.dialog.setStatusMsg = function (msg) {
    document.getElementById(_currentStatusDiv).innerHTML = msg;
}

function showProgressWindow() {
    try {
        $('#progressWindow').jqmShow();
    } catch (e) {
        logError(e)
    }
}

function switch_to_tab(id) {
    return
    $('#tab-container').triggerTab(id);
    //updatePageById(id);
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

    
su2rad.dialog.showBusy = function () {
    log.error("TODO: showBusy()")
    showProgressWindow()
}

su2rad.utils.JSON2HTML = function (obj, title, level) {
    // show JSON object with HTML markup
    if (level == null) {
        level = 3;
    }
    var text = "<H"+level+">" + title + "</H"+level+">";
    if (obj.constructor.toString().match(/Array/i)) { 
        for (var i=0; i<obj.length; i++) {
            text += su2rad.utils.JSON2HTML(obj[i], "element "+i, level+1);
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

su2rad.dialog.showResults = function (msg) {
    log.debug("TEST: showResults()")
    json = su2rad.utils.decodeJSON(msg)
    var obj = new Array();
    try { 
        eval("obj = " + json)
        //hideProgressWindow()
        //showResultsWindow()
    } catch (e) {
        logError(e)
    }
    html = su2rad.utils.JSON2HTML(obj, 'export results')
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

