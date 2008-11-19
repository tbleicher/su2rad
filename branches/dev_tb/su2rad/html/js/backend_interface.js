
function applyModelLocationSketchup(locObj) {
    // apply modelLocation settings to Sketchup.shadow_info
    log.info("setting Sketchup.shadow_info ...");
    params = 'City=' + locObj.City;
    params = params + ';Country=' + locObj.Country;
    params = params + ';Latitude=' + locObj.Latitude;
    params = params + ';Longitude=' + locObj.Longitude;
    params = params + ';TZOffset=' + locObj.TZOffset;
    params = params + ';NorthAngle=' + locObj.NorthAngle;
    window.location = 'skp:setShadowInfo@' + params;
}

function applyModelLocationTest(locObj) {
    // do nothing if SketchUp is not present
    log.debug("applyModelLocationTest(): no need to set shadow_info");
}


function setExportOptionsTest() {
   var s =    "[{\"name\":\"sceneName\"#COMMA#\"value\":\"Scene_Dummy1\"}";
   s += "#COMMA#{\"name\":\"scenePath\"#COMMA#\"value\":\"/home/user/tmp/testfile\"}";
   s += "#COMMA#{\"name\":\"exportMode\"#COMMA#\"value\":\"by color\"}";
   s += "#COMMA#{\"name\":\"triangulate\"#COMMA#\"value\":\"false\"}";
   s += "#COMMA#{\"name\":\"textures\"#COMMA#\"value\":\"true\"}";
   s += "#COMMA#{\"name\":\"global_coords\"#COMMA#\"value\":\"false\"}#COMMA#]";
   setExportOptionsJSON(s);
}


function getShadowInfoSketchup() {
    // get SketchUp shadow_info settings and apply to modelLocation
    log.info("getting shadowInfo from SketchUp ...");
    window.location = 'skp:getShadowInfo@';
    // setShadowInfoJSON() called by Sketchup
}

function getShadowInfoTest() {
    // return dummy JSON string of SketchUp.shadow_info
    log.debug("getShadowInfo(): 'skp:' not available");
    var msg =     "{\"name\":\"shadowinfo\"#COMMA#\"attributes\":[";
    msg +=        "{\"name\":\"City\"#COMMA#\"value\":\"foo_Boulder (CO)\"}";
    msg += "#COMMA#{\"name\":\"Country\"#COMMA#\"value\":\"foo_USA\"}";
    msg += "#COMMA#{\"name\":\"Latitude\"#COMMA#\"value\":\"40.017\"}";
    msg += "#COMMA#{\"name\":\"Longitude\"#COMMA#\"value\":\"-105.283\"}";
    msg += "#COMMA#{\"name\":\"TZOffset\"#COMMA#\"value\":\"-7.0\"}";
    msg += "#COMMA#{\"name\":\"NorthAngle\"#COMMA#\"value\":\"0.0\"}";
    msg += "#COMMA#{\"name\":\"DaylightSavings\"#COMMA#\"value\":\"false\"}";
    msg += "#COMMA#{\"name\":\"DisplayShadows\"#COMMA#\"value\":\"false\"}";
    msg += "#COMMA#{\"name\":\"UseSunForAllShading\"#COMMA#\"value\":\"false\"}";
    msg += "#COMMA#]}";
    setShadowInfoJSON(msg);
}



function getViewsListSketchup() {
    try {
        log.info("getting views from SketchUp ...");
        window.location = 'skp:getViewsList@'; 
        // setViewsListJSON() called by Sketchup
    } catch (e) {
        log.error("getViewsListSU: " + e.name);
    }
}

function getViewsListTest() {
    // return dummy JSON string of SketchUp views
    log.debug("getViewsList(): 'skp:' not available");
    var msg =   "[{\"name\":\"view_1\"#COMMA#\"selected\":\"false\"#COMMA#\"current\":\"false\"}";
    msg += "#COMMA#{\"name\":\"front (1)\"#COMMA#\"selected\":\"false\"#COMMA#\"current\":\"false\"}";
    msg += "#COMMA#{\"name\":\"current view\"#COMMA#\"selected\":\"false\"#COMMA#\"current\":\"true\"}";
    msg += "#COMMA#{\"name\":\"sel_view\"#COMMA#\"selected\":\"true\"#COMMA#\"current\":\"false\"}";
    msg += "#COMMA#{\"name\":\"scene (2)\"#COMMA#\"selected\":\"true\"#COMMA#\"current\":\"false\"}";
    msg += "#COMMA#{\"name\":\"next to last\"#COMMA#\"selected\":\"false\"#COMMA#\"current\":\"false\"}";
    msg += "#COMMA#{\"name\":\"last\"#COMMA#\"selected\":\"false\"#COMMA#\"current\":\"false\"}";
    msg += "]";
    setViewsListJSON(msg);
}

function setViewSelectionSketchup(param) {
    log.debug("setViewSelectionSketchup(param='" + param + "')"); 
    window.location = 'skp:setViewSelection@' + param;
}

function setViewSelectionTest(param) {
    log.debug("no action for setViewSelection() [" + param + "]"); 
}


// switches to call right functions for context

function setSketchup() {
    log.debug('switching to Sketchup functions ...') 
    applyModelLocation = applyModelLocationSkechup;
    getShadowInfo = getShadowInfoSketchup;
    getViewsList = getViewsListSketchup;
    setViewSelection = setViewSelectionSketchup;
}

function setTest() {
    //log.debug('switching to test functions ...') 
    applyModelLocation = applyModelLocationTest;
    getShadowInfo = getShadowInfoTest;
    getViewsList = getViewsListTest;
    setViewSelection = setViewSelectionTest;
}
// set default actions
setTest();







