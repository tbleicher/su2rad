
function applySkySettings() {
    // send back location and sky settings
    var params = su2rad.settings.location.toParamString();
    if (su2rad.SKETCHUP == true) {
        // log.debug("applySkySettings():<br/>" + params.replace(/&/g,"<br/>"));
        window.location = 'skp:applySkySettings@' + params;
    } else {
        log.debug("using dummy backend.applySkySettings()");
    }
}

function onApplySkySettingsToModel() {
    // apply settings to Sketchup shadow_info
    if (su2rad.SKETCHUP == true) {
        log.info("applying settings to Sketchup model ...");
        window.location = 'skp:writeSkySettingsToShadowInfo@';
    } else {
        log.debug("using dummy backend.writeSkySettingsToShadowInfo() ...");
        su2rad.settings.location.changed = false;
        // TODO:
        // msg = su2rad.settings.location.toJSON();
        // setShadowInfoFromJSON(msg);
        clearTZWarning();
        su2rad.dialog.sky.update();
    }
}
    
function getExportOptions() {
    // collect and set export option values
    if (su2rad.SKETCHUP == true) {
        log.info("getting shadowInfo from SketchUp ...");
        window.location = 'skp:getExportOptions@';
        // su2rad.dialog.exporter.setExportOptionsJSON() called by Sketchup
    } else {
        var json = test_getExportOptions();
        su2rad.dialog.exporter.setExportOptionsJSON( su2rad.utils.encodeJSON(json) );
    }
}

function getSkySettings() {
    // get SketchUp shadow_info settings and apply to su2rad.settings.location
    if (su2rad.SKETCHUP == true) {
        log.info("getting shadowInfo from SketchUp ...");
        window.location = 'skp:getSkySettings@';
        // setShadowInfoJSON() called by Sketchup
    } else {
        log.debug("using dummy backend.getSkySettings()");
        var json = test_getSkySettings();
        su2rad.dialog.location.setShadowInfoJSON( su2rad.utils.encodeJSON(json) );
    }
}

function applyExportOptions() {
    var param = su2rad.settings.exporter.toString();
    if (su2rad.SKETCHUP == true) {
        // log.debug("applyExportOptions:<br/>" + param.replace(/&/g,"<br/>") );
        window.location = 'skp:applyExportOptions@' + param;
    } else {
        log.debug("using dummy backend.applyExportOptions()");
        param = param.replace(/&/g,"<br/>");
        su2rad.dialog.setStatusMsg("applyExportOptions:<br/>" + param);
    }
}

function applyRenderOptions() {
    param = su2rad.settings.radiance.toString();
    if (su2rad.SKETCHUP == true) {
        // log.debug("applyRenderOptions:<br/>" + param.replace(/&/g,"<br/>") );
        window.location = 'skp:applyRenderOptions@' + param;
    } else {
        log.debug("using dummy backend.applyRenderOptions()");
        param = param.replace(/&/g,"<br/>");
        su2rad.dialog.setStatusMsg("applyRenderOptions:<br/>" + param);
    }
}

function setViewJSON(name,text) {
    //log.error("DEBUG: setViewJSON: '" + name + "'<br/>" + text);
    var viewname = su2rad.utils.decodeJSON(name);
    var json = su2rad.utils.decodeJSON(text);
    var obj = {};
    try {
        eval("obj = " + json);
        su2rad.settings.views.setView(viewname, obj);
        return true;
    } catch (e) {
        log.error("setViewJSON: error in eval() '" + e.name + "'");
        log.error("json= " + json.replace(/,/g,',<br/>'));
        return false;
    }
}

function setViewsListJSON(text) {
    // eval JSON views string from SketchUp
    var json = su2rad.utils.decodeJSON(text);
    //log.debug("setViewsListJSON=<br/>" + json.replace(/,/g,',<br/>'));
    var newViews = new Array();
    try {
        eval("newViews = " + json);
        //log.debug("eval(): newViews.length=" + newViews.length); 
    } catch (e) {
        log.error("setViewsListJSON: error in eval() '" + e.name + "'");
        log.error("json= " + json.replace(/,/g,',<br/>'));
    }
    su2rad.settings.views.setViewsList(newViews);
    su2rad.dialog.views.updateSummary();
}

function getViewsList() {
    if (su2rad.SKETCHUP == true) {
        log.info("getting views from SketchUp ...");
        window.location = 'skp:setViewsList@'; 
        // setViewsListJSON() called by Sketchup
    } else {
        log.debug("using dummy backend.getViewsList()");
        var msg = test_getViewsListTest();
        setViewsListJSON( su2rad.utils.encodeJSON(msg) );
    }    
}

function applyViewSettings(viewname) {
    //log.debug('applyViewSettings(' + viewname + ')');
    try {
        var view = su2rad.settings.views[viewname];
    } catch(e) {
        log.error(e)
        return
    }
    //log.debug('applyViewSettings(view=' + view + ')');
    var text = view.toRubyString();
    var param = encodeURI(text);
    if (su2rad.SKETCHUP == true) {
        window.location = 'skp:applyViewSettings@' + param;
    } else {
        log.debug("using dummy backend.applyViewSettings()"); 
        su2rad.dialog.views.updateList();
    }
}

function removeViewOverride(viewname, override) {
    //log.debug("removeViewOverride('" + viewname + "','" + override + "')");
    var param = encodeURI(viewname) + "&" + encodeURI(override);
    if (su2rad.SKETCHUP == true) {
        window.location = 'skp:removeViewOverride@' + param;
    } else {
        log.debug("using dummy backend.removeViewOverride()"); 
        try {
            var view = su2rad.settings.views[viewname];
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
    if (su2rad.SKETCHUP == true) {
        window.location = 'skp:removeMaterialAlias@' + param;
    } else {
        log.debug("using dummy backend.skpSetMaterialAlias()"); 
    }
}

function skpSetMaterialAlias(skmname, radname, mtype) {
    var text = skmname + "&" + radname + "&" + mtype;
    var param = encodeURI(text);
    if (su2rad.SKETCHUP == true) {
        window.location = 'skp:setMaterialAlias@' + param;
    } else {
        log.debug("using dummy backend.skpSetMaterialAlias()"); 
    }
}

function setMaterialsListJSON(text, type) {
    try {
        var json = su2rad.utils.decodeJSON(text);
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
            su2rad.materials.skmList.update(newMats);
            su2rad.materials.buildMaterialListByType('skm')
        } else if (type == 'layer') {
            su2rad.materials.layersList.update(newMats);
            su2rad.materials.buildMaterialListByType('layer')
        } else if (type == 'rad') {
            su2rad.materials.radList.update(newMats);
            su2rad.materials.setGroupSelection()
            su2rad.materials.buildMaterialListRad()
        } else {
            log.warn("unknown material list type '" + type + "'");
        }
    } catch (err) {
        log.error("setMaterialsListJSON:'" + err.message + "'");
    }
}







