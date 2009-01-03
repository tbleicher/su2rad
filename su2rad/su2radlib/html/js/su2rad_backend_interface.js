
// switches to call right functions for context
function setSketchup() {
    // switch to actions for Sketchup (skp:...)
    log.error('DEBUG: switching to Sketchup functions ...'); 
    SKETCHUP = true;
}

function setTest() {
    // set dummy actions
    try {
        log.debug('switching to test functions ...');
    } catch (e) {
        // log might not be defined yet
    }
    SKETCHUP = false;
}


function applySkySettings() {
    // send back location and sky settings
    var params = modelLocation.toParamString();
    if (SKETCHUP == true) {
        log.debug("applySkySettings(): " + params);
        window.location = 'skp:applySkySettings@' + params;
    } else {
        log.debug("applySkySettings(): no need to set shadow_info");
    }
}


function onApplySkySettingsToModel() {
    // apply settings to Sketchup shadow_info
    if (SKETCHUP == true) {
        log.info("applying settings to Sketchup model ...");
        window.location = 'skp:writeSkySettingsToShadowInfo@';
    } else {
        log.debug("onApplySkySettingsToModel() ...");
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
        var json = _getExportOptionsTest();
        setExportOptionsJSON( encodeJSON(json) );
    }
}

function _getExportOptionsTest() {
    var json = "[{\"name\":\"sceneName\",\"value\":\"testscene_1\"}";
    json +=    ",{\"name\":\"scenePath\",\"value\":\"/home/user/tmp/testfile\"}";
    json +=    ",{\"name\":\"exportMode\",\"value\":\"by color\"}";
    json +=    ",{\"name\":\"triangulate\",\"value\":\"false\"}";
    json +=    ",{\"name\":\"textures\",\"value\":\"true\"}";
    json +=    ",{\"name\":\"global_coords\",\"value\":\"false\"},]";
    return json;
}

function getSkySettings() {
    // get SketchUp shadow_info settings and apply to modelLocation
    if (SKETCHUP == true) {
        log.info("getting shadowInfo from SketchUp ...");
        window.location = 'skp:getSkySettings@';
        // setShadowInfoJSON() called by Sketchup
    } else {
        log.debug("getSkySettings(): 'skp:' not available");
        var json = _getSkySettingsTest();
        setShadowInfoJSON( encodeJSON(json) );
    }
}

function _getSkySettingsTest() {
    // return dummy JSON string of SketchUp.shadow_info
    var json = "[{\"name\":\"City\",\"value\":\"Boulder (CO)\"}";
    json +=    ",{\"name\":\"Country\",\"value\":\"USA\"}";
    json +=    ",{\"name\":\"Latitude\",\"value\":\"40.017\"}";
    json +=    ",{\"name\":\"Longitude\",\"value\":\"-105.283\"}";
    json +=    ",{\"name\":\"TZOffset\",\"value\":\"-7.0\"}";
    json +=    ",{\"name\":\"NorthAngle\",\"value\":\"0.0\"}";
    json +=    ",{\"name\":\"DaylightSavings\",\"value\":\"false\"}";
    json +=    ",{\"name\":\"DisplayShadows\",\"value\":\"false\"}";
    json +=    ",{\"name\":\"ShadowTime\",\"value\":\"Fri Nov 08 13:30:00 +0000 2002\"}";
    json +=    ",{\"name\":\"ShadowTime_time_t\",\"value\":\"1036762200\"}";
    json +=    ",{\"name\":\"UseSunForAllShading\",\"value\":\"false\"}";
    json +=    ",{\"name\":\"SkyCommand\",\"value\":\"!gensky +i 03 21 12:34 -a 40.017 -o 105.283 -m 105.0 -g 0.22 -t 1.8\"}]";
    return json;
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
        window.location = 'skp:applyExportOptions@' + param;
    } else {
        log.debug("no options to apply");
        param = param.replace(/&/g,"<br/>");
        setStatusMsg("applyExportOptions:<br/>" + param);
    }
}

function applyRenderOptions() {
    param = radOpts.toString();
    if (SKETCHUP == true) {
        log.debug("param=" + param);
        window.location = 'skp:applyRenderOptions@' + param;
    } else {
        log.debug("no options to apply");
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


function setViewsListJSON(text) {
    // eval JSON views string from SketchUp
    var json = decodeJSON(text);
    var newViews = new Array();
    try {
        eval("newViews = " + json);
        //log.debug("eval(): newViews.length=" + newViews.length); 
    } catch (e) {
        log.error("setViewsListJSON: error in eval() '" + e.name + "'");
        log.error("json= " + json.replace(/,/g,',<br/>'));
    }
    viewsList.setViewsList(newViews);
}

function getViewsList() {
    if (SKETCHUP == true) {
        log.info("getting views from SketchUp ...");
        window.location = 'skp:setViewsList@'; 
        // setViewsListJSON() called by Sketchup
    } else {
        log.debug("getViewsList(): 'skp:' not available");
        var msg = _getViewsListTest();
        setViewsListJSON( encodeJSON(msg) );
    }    
}

function _getViewsListTest() {
    // return dummy JSON string of SketchUp views
    var msg = "[{\"name\":\"view_1\",\"selected\":\"false\",\"current\":\"false\",";
    msg +=      "\"vt\":\"v\",\"vp\":\"0 0 1\",\"vd\":\"0 1 0\",\"vu\":\"0 0 1\",";
    msg +=      "\"vo\":\"0.0\",\"va\":\"0.0\",\"vv\":\"30.0\",\"vh\":\"60.0\"}";
    msg +=    ",{\"name\":\"front (1)\",\"selected\":\"false\",\"current\":\"false\",";
    msg +=      "\"vt\":\"v\",\"vp\":\"0 0 1\",\"vd\":\"0 1 0\",\"vu\":\"0 0 1\",";
    msg +=      "\"vo\":\"0.0\",\"va\":\"0.0\",\"vv\":\"30.0\",\"vh\":\"60.0\"}";
    msg +=    ",{\"name\":\"current view\",\"selected\":\"false\",\"current\":\"true\",";
    msg +=      "\"vt\":\"v\",\"vp\":\"0 0 1\",\"vd\":\"0 1 0\",\"vu\":\"0 0 1\",";
    msg +=      "\"vo\":\"0.0\",\"va\":\"0.0\",\"vv\":\"30.0\",\"vh\":\"60.0\"}";
    msg +=    ",{\"name\":\"sel_view\",\"selected\":\"true\",\"current\":\"false\",";
    msg +=      "\"vt\":\"v\",\"vp\":\"0 0 1\",\"vd\":\"0 1 0\",\"vu\":\"0 0 1\",";
    msg +=      "\"vo\":\"0.0\",\"va\":\"0.0\",\"vv\":\"30.0\",\"vh\":\"60.0\"}";
    msg +=    ",{\"name\":\"scene (2)\",\"selected\":\"true\",\"current\":\"false\",";
    msg +=      "\"vt\":\"v\",\"vp\":\"0 0 1\",\"vd\":\"0 1 0\",\"vu\":\"0 0 1\",";
    msg +=      "\"vo\":\"0.0\",\"va\":\"0.0\",\"vv\":\"30.0\",\"vh\":\"60.0\"}";
    msg +=    ",{\"name\":\"next to last\",\"selected\":\"false\",\"current\":\"false\",";
    msg +=      "\"vt\":\"v\",\"vp\":\"0 0 1\",\"vd\":\"0 1 0\",\"vu\":\"0 0 1\",";
    msg +=      "\"vo\":\"0.0\",\"va\":\"0.0\",\"vv\":\"30.0\",\"vh\":\"60.0\"}";
    msg +=    ",{\"name\":\"last\",\"selected\":\"false\",\"current\":\"false\",";
    msg +=      "\"vt\":\"v\",\"vp\":\"0 0 1\",\"vd\":\"0 1 0\",\"vu\":\"0 0 1\",";
    msg +=      "\"vo\":\"0.0\",\"va\":\"0.0\",\"vv\":\"30.0\",\"vh\":\"60.0\"}]";
    return msg;
}

function applyViews() {
    var selection_only = true;
    var text = viewsList.toString(selection_only);
    var param = encodeURI(text);
    if (SKETCHUP == true) {
	log.debug('applyViews() param.length=' + param.length);
        window.location = 'skp:applyViews@' + param;
    } else {
        log.debug("no action for applyViews()"); 
    }
}








