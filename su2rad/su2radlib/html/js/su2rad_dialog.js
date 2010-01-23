
// requires su2rad.dialog.common.js to be loaded

// create new namespace for main export functions

var su2rad = su2rad ? su2rad : new Object()
su2rad.dialog = su2rad.dialog ? su2rad.dialog : new Object()

// set environment
su2rad.dialog.currentStatusDiv = "status_tab-export"

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

    

su2rad.dialog.loadTestData = function () {
    su2rad.dialog.setTest();
    if (su2rad.SKETCHUP == false) {
        // fill dialog with test data
        getExportOptions();
        getViewsList();
        getSkySettings();
        this.updateViewsPage();
        test_getMaterialsLists();
        this.updateMaterialsPage()
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

su2rad.dialog.disableGlobalOption = function () {
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


su2rad.dialog.disableTextureOption = function () {
    document.getElementById("textures").checked = false;
    document.getElementById("global_coords_display").style.display='none';
}

su2rad.dialog.toggleClimateTab = function () {
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

su2rad.dialog.setStatusMsg = function (msg) {
    document.getElementById(su2rad.dialog.currentStatusDiv).innerHTML = msg;
}

su2rad.dialog.showProgressWindow = function () {
    try {
        $('#progressWindow').jqmShow();
    } catch (e) {
        logError(e)
    }
}

su2rad.dialog.switchToTab = function (id) {
    return
    $('#tab-container').triggerTab(id);
    //updatePageById(id);
}

su2rad.dialog.showBusy = function () {
    log.error("TODO: showBusy()")
    this.showProgressWindow()
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

su2rad.dialog.onTabClick = function (link,div_show,div_hide) {
    su2rad.dialog.currentStatusDiv = "status_" + div_show.id;
    this.updatePageById(div_show.id);
    return true;
}

su2rad.dialog.updatePageById = function (id) {
    if (id == "tab-export") {
        return this.updateExportPage();
    } else if  (id == "tab-render") {
        return this.updateRenderPage();
    } else if (id == "tab-sky") {
        return this.sky.update();
    } else if (id == "tab-views") {
        return this.updateViewsPage();
    } else if (id == "tab-materials") {
        return this.updateMaterialsPage();
    } else if (id == "tab-fields") {
        return this.updateFieldsPage();
    } else if (id == "tab-climate") {
        return this.updateClimatePage();
    } else {
        log.warn("unexpected tab id '" + id + "'");
        return false;
    }
}

su2rad.dialog.onTabHide = function (link,div_show,div_hide) {
    // log.debug("onTabHide:" + link + " show:" + div_show.id + " hide:" + div_hide.id);
}

su2rad.dialog.onTabShow = function (link,div_show,div_hide) {
    // log.debug("onTabShow:" + link + " show:" + div_show.id + " hide:" + div_hide.id);
}

su2rad.dialog.updateExportPage = function () {
    log.debug("updating 'Export' page ...");
    this.sky.setSkyCmdLine();
}

su2rad.dialog.updateRenderPage = function () {
    log.debug("updating 'Render' page ...");
    // setRpictOptions();
    updateRenderFormValues();
    updateRpictValues();
    updateRenderLine();
}

su2rad.dialog.updateViewsPage = function () {
    log.debug("updating 'Views' page ...");
    updateViewDetailsList();
}

su2rad.dialog.updateMaterialsPage = function () {
    log.debug("updating 'Materials' page ...");
}

su2rad.dialog.updateFieldsPage = function () {
    log.debug("updating 'Fields' page ...");
}

su2rad.dialog.updateClimatePage = function () {
    log.debug("updating 'Climate' page ...");
}

