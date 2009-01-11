
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
    json +=    ",{\"name\":\"SkyCommand\",\"value\":\"!gensky -u 03 21 12:34 -a 40.017 -o 105.283 -m 105.0 -g 0.22 -t 1.8 -B 55.877\"}]";
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
        //log.debug("applyExportOptions:<br/>" + param.replace(/&/g,"<br/>") );
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
        //log.debug("applyRenderOptions:<br/>" + param.replace(/&/g,"<br/>") );
        window.location = 'skp:applyRenderOptions@' + param;
    } else {
        log.debug("no options to apply");
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
    msg +=    ",{\"name\":\"parallel view\",\"selected\":\"true\",\"current\":\"false\",";
    msg +=      "\"vt\":\"l\",\"vp\":\"0 0   1\",\"vd\":\"  0  1  0 \",\"vu\":\"0 0 1\",";
    msg +=      "\"vo\":\"0.0\",\"va\":\"0.0\",\"vv\":\"30.0\",\"vh\":\"60.0\"}";
    msg +=    ",{\"name\":\"angular (2)\",\"selected\":\"true\",\"current\":\"false\",";
    msg +=      "\"vt\":\"a\",\"vp\":\"0 0 1  \",\"vd\":\" 0 1 0\",\"vu\":\"0 0 1\",";
    msg +=      "\"vo\":\"0.0\",\"va\":\"0.0\",\"vv\":\"30.0\",\"vh\":\"60.0\"}";
    msg +=    ",{\"name\":\"next to last\",\"selected\":\"false\",\"current\":\"false\",";
    msg +=      "\"vt\":\"v\",\"vp\":\"0 0 1\",\"vd\":\"0 1 0\",\"vu\":\"0 0 1\",";
    msg +=      "\"vo\":\"0.0\",\"va\":\"0.0\",\"vv\":\"30.0\",\"vh\":\"60.0\"}";
    msg +=    ",{\"name\":\"last\",\"selected\":\"false\",\"current\":\"false\",";
    msg +=      "\"vt\":\"v\",\"vp\":\"0 0 1\",\"vd\":\"0 1 0\",\"vu\":\"0 0 1\",";
    msg +=      "\"vo\":\"0.0\",\"va\":\"0.0\",\"vv\":\"30.0\",\"vh\":\"60.0\"}]";
    return msg;
}

function applyViewSettings(viewname) {
    //log.deubg('applyViewSettings(' + viewname + ')');
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
        log.debug("=> no action for applyViewSettings()"); 
    }
}

function setMaterialsListJSON(text, type) {
    var json = decodeJSON(text);
    //log.error("TEST: setMaterialsListJSON=<br/>json.length=" + json.length);
    var newMats = new Array();
    try {
        eval("newMats = " + json);
        log.info("materials found: " + newMats.length); 
    } catch (e) {
        log.error("setMaterialsListJSON: error in eval() '" + e.name + "'");
        log.error("json= " + json.replace(/,/g,',<br/>'));
    }
    if (type == 'skm') {
        skmMaterialsList.update(newMats);
    } else {
        radMaterialsList.update(newMats);
    }
}

function getMaterialsListsTest() {
    var rad = _getRadMaterialDataTest();
    setMaterialsListJSON(encodeJSON(rad),'rad');
    var skm = _getSkmMaterialDataTest();
    setMaterialsListJSON(encodeJSON(skm),'skm');
    // TODO: Radiance materials
}

function _getRadMaterialDataTest () {
    var json = "[{'name':'redMat','nameRad':'redMat','nameHTML':'redMat','alias':''";
    json += ",'preview':'','definition':'','requires':''},";                
    json += "{'name':'blueMat','nameRad':'blueMat','nameHTML':'blueMat','alias':''";
    json += ",'preview':'','definition':'','requires':''},";                
    json += "{'name':'green','nameRad':'green','nameHTML':'green','alias':''";
    json += ",'preview':'','definition':'','requires':''},";                
    json += "{'name':'brick','nameRad':'brick','nameHTML':'brick','alias':''";
    json += ",'preview':'','definition':'','requires':''},";                
    json += "{'name':'concrete','nameRad':'concrete','nameHTML':'concrete','alias':''";
    json += ",'preview':'','definition':'','requires':''},";                
    json += "{'name':'asphalt dark','nameRad':'asphalt_dark','nameHTML':'asphalt dark','alias':''";
    json += ",'preview':'','definition':'','requires':''},";                
    json += "{'name':'grass_green','nameRad':'grass_green','nameHTML':'grass_green','alias':''";
    json += ",'preview':'','definition':'','requires':''}]";
    return json
}

function _getSkmMaterialDataTest () {
    var json = "[{'name':'red','nameRad':'red','nameHTML':'red','alias':'redMat'},";
    json += "{'name':'blue','nameRad':'blue','nameHTML':'blue','alias':'blueMat'},";
    json += "{'name':'green','nameRad':'green','nameHTML':'green','alias':''},";
    json += "{'name':'brick','nameRad':'brick','nameHTML':'brick','alias':''},";
    json += "{'name':'concrete','nameRad':'concrete','nameHTML':'concrete','alias':''},";
    json += "{'name':'asphalt dark','nameRad':'asphalt_dark','nameHTML':'asphalt dark','alias':''},";
    json += "{'name':'grass_green','nameRad':'grass_green','nameHTML':'grass_green','alias':''},";
    json += "{'name':'grass_brown','nameRad':'grass_brown','nameHTML':'grass_brown','alias':''},";
    json += "{'name':'brick 2','nameRad':'brick_2','nameHTML':'brick 2','alias':''},";
    json += "{'name':'walls white','nameRad':'walls_white','nameHTML':'walls white','alias':''}]";
    return json;
}








