
// switches to call right functions for context
function setSketchup() {
    // switch to actions for Sketchup (skp:...)
    log.info('using Sketchup backend ...'); 
    log.debug('browser: ' + navigator.userAgent);
    SKETCHUP = true;
}

function setTest() {
    // set dummy actions
    try {
        log.info('using dummy backend ...'); 
        log.debug('browser: ' + navigator.userAgent);
    } catch (e) {
        // log might not be defined yet
    }
    SKETCHUP = false;
}

function applySkySettings() {
    // send back location and sky settings
    var params = modelLocation.toParamString();
    if (SKETCHUP == true) {
        // log.debug("applySkySettings():<br/>" + params.replace(/&/g,"<br/>"));
        window.location = 'skp:applySkySettings@' + params;
    } else {
        log.debug("using dummy backend.applySkySettings()");
    }
}

function onApplySkySettingsToModel() {
    // apply settings to Sketchup shadow_info
    if (SKETCHUP == true) {
        log.info("applying settings to Sketchup model ...");
        window.location = 'skp:writeSkySettingsToShadowInfo@';
    } else {
        log.debug("using dummy backend.writeSkySettingsToShadowInfo() ...");
        modelLocation.changed = false;
        // TODO:
        // msg = modelLocation.toJSON();
        // setShadowInfoFromJSON(msg);
        clearTZWarning();
        updateSkyPage();
    }
}
    
function getExportOptions() {
    // collect and set export option values
    if (SKETCHUP == true) {
        log.info("getting shadowInfo from SketchUp ...");
        window.location = 'skp:getExportOptions@';
        // setExportOptionsJSON() called by Sketchup
    } else {
        var json = test_getExportOptions();
        setExportOptionsJSON( encodeJSON(json) );
    }
}


function getSkySettings() {
    // get SketchUp shadow_info settings and apply to modelLocation
    if (SKETCHUP == true) {
        log.info("getting shadowInfo from SketchUp ...");
        window.location = 'skp:getSkySettings@';
        // setShadowInfoJSON() called by Sketchup
    } else {
        log.debug("using dummy backend.getSkySettings()");
        var json = test_getSkySettings();
        setShadowInfoJSON( encodeJSON(json) );
    }
}

function loadFileCallback(text) {
    //dummy function to be reasigned to real callback
}

function loadTextFile(fname) {
    log.debug("loadTextFile() fname='" + fname + "'");
    if (SKETCHUP == true) {
        window.location = 'skp:loadTextFile@' + fname;
    } else {
        log.warn("Warning: can't load file without backend! (fname='" + fname + "')");
        loadFileCallback('');
    }
}

function applyExportOptions() {
    var param = exportSettings.toString();
    if (SKETCHUP == true) {
        // log.debug("applyExportOptions:<br/>" + param.replace(/&/g,"<br/>") );
        window.location = 'skp:applyExportOptions@' + param;
    } else {
        log.debug("using dummy backend.applyExportOptions()");
        param = param.replace(/&/g,"<br/>");
        setStatusMsg("applyExportOptions:<br/>" + param);
    }
}

function applyRenderOptions() {
    param = radOpts.toString();
    if (SKETCHUP == true) {
        // log.debug("applyRenderOptions:<br/>" + param.replace(/&/g,"<br/>") );
        window.location = 'skp:applyRenderOptions@' + param;
    } else {
        log.debug("using dummy backend.applyRenderOptions()");
        param = param.replace(/&/g,"<br/>");
        setStatusMsg("applyRenderOptions:<br/>" + param);
    }
}

function decodeJSON(text) {
    var json = unescape(text)
    return json;
}

function decodeText(encText) {
    // text file is encoded via urlEncode - replace '+'
    var text = unescape(encText)
    text = text.replace(/\+/g,' ');
    return json;
}

function encodeJSON(json) {
    var text = escape(json);
    return text;
}

function setViewJSON(name,text) {
    //log.error("DEBUG: setViewJSON: '" + name + "'<br/>" + text);
    var viewname = decodeJSON(name);
    var json = decodeJSON(text);
    var obj = {};
    try {
        eval("obj = " + json);
        viewsList.setView(viewname, obj);
        return true;
    } catch (e) {
        log.error("setViewJSON: error in eval() '" + e.name + "'");
        log.error("json= " + json.replace(/,/g,',<br/>'));
        return false;
    }
}

function setViewsListJSON(text) {
    // eval JSON views string from SketchUp
    var json = decodeJSON(text);
    //log.debug("setViewsListJSON=<br/>" + json.replace(/,/g,',<br/>'));
    var newViews = new Array();
    try {
        eval("newViews = " + json);
        //log.debug("eval(): newViews.length=" + newViews.length); 
    } catch (e) {
        log.error("setViewsListJSON: error in eval() '" + e.name + "'");
        log.error("json= " + json.replace(/,/g,',<br/>'));
    }
    viewsList.setViewsList(newViews);
    updateViewsSummary();
}

function getViewsList() {
    if (SKETCHUP == true) {
        log.info("getting views from SketchUp ...");
        window.location = 'skp:setViewsList@'; 
        // setViewsListJSON() called by Sketchup
    } else {
        log.debug("using dummy backend.getViewsList()");
        var msg = test_getViewsListTest();
        setViewsListJSON( encodeJSON(msg) );
    }    
}

function applyViewSettings(viewname) {
    //log.debug('applyViewSettings(' + viewname + ')');
    try {
        var view = viewsList[viewname];
    } catch(e) {
        log.error(e)
        return
    }
    //log.debug('applyViewSettings(view=' + view + ')');
    var text = view.toRubyString();
    var param = encodeURI(text);
    if (SKETCHUP == true) {
        window.location = 'skp:applyViewSettings@' + param;
    } else {
        log.debug("using dummy backend.applyViewSettings()"); 
        updateViewDetailsList();
    }
}

function removeViewOverride(viewname, override) {
    //log.debug("removeViewOverride('" + viewname + "','" + override + "')");
    var param = encodeURI(viewname) + "&" + encodeURI(override);
    if (SKETCHUP == true) {
        window.location = 'skp:removeViewOverride@' + param;
    } else {
        log.debug("using dummy backend.removeViewOverride()"); 
        try {
            var view = viewsList[viewname];
            var json = view.toJSON();
            setViewJSON(viewname, json);
        } catch (err) {
            log.error("removeViewOverride: '" + e.name + "'");
        }
    }
}





function skpRemoveMaterialAlias(skmname, skmgroup) {
    var text = skmname + "&" + skmgroup;
    var param = encodeURI(text);
    if (SKETCHUP == true) {
        window.location = 'skp:removeMaterialAlias@' + param;
    } else {
        log.debug("using dummy backend.skpSetMaterialAlias()"); 
    }
}

function skpSetMaterialAlias(skmname, radname, mtype) {
    var text = skmname + "&" + radname + "&" + mtype;
    var param = encodeURI(text);
    if (SKETCHUP == true) {
        window.location = 'skp:setMaterialAlias@' + param;
    } else {
        log.debug("using dummy backend.skpSetMaterialAlias()"); 
    }
}

function setMaterialsListJSON(text, type) {
    try {
        var json = decodeJSON(text);
        //log.error("TEST: setMaterialsListJSON=<br/>json.length=" + json.length);
        var newMats = new Array();
        try {
            eval("newMats = " + json);
            //log.debug("materials found: " + newMats.length); 
        } catch (e) {
            log.error("setMaterialsListJSON: error in eval() '" + e.name + "'");
            log.error("json= " + json.replace(/,/g,',<br/>'));
        }
        if (type == 'skm') {
            skmMaterialsList.update(newMats);
            buildMaterialListByType('skm')
        } else if (type == 'layer') {
            layerMaterialsList.update(newMats);
            buildMaterialListByType('layer')
        } else if (type == 'rad') {
            radMaterialsList.update(newMats);
            setGroupSelection()
            buildMaterialListRad()
        } else {
            log.warn("unknown material list type '" + type + "'");
        }
    } catch (err) {
        log.error("setMaterialsListJSON:'" + err.message + "'");
    }
}










