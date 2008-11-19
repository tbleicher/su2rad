

var radOpts = {};
// Quality group
radOpts.Quality = "medium";
radOpts.Detail = "medium";
radOpts.Variability = "high";
radOpts.Indirect = 2;
radOpts.Penumbras = true;
// Image group
radOpts.ImageSizeX = 512;  // XXX
radOpts.ImageSizeY = 512;  // XXX
radOpts.ImageType = "normal";
// Zone group
radOpts.ZoneSize = 10.0;  // XXX
radOpts.ZoneType = "interior";
// Report group
radOpts.Report = 0;
radOpts.ReportFile = 'scene.log';


var rpictOpts = {};

function setRpictDefaults() {
    log.debug("DEBUG setRpictDefaults()")
    // ambient
    rpictOpts.aa = 0.2;
    rpictOpts.ab = 0;
    rpictOpts.ad = 512;
    rpictOpts.ar = 64;
    rpictOpts.as = 128;
    rpictOpts.av = 0.0;
    // one value for r,g and b
    rpictOpts.aw = 0;
    // direct calc
    rpictOpts.dc = 0.5;
    rpictOpts.dj = 0.0;
    rpictOpts.dp = 512;
    rpictOpts.dr = 1;
    rpictOpts.ds = 0.25;
    rpictOpts.dt = 0.05;
    // reflections
    rpictOpts.lr = 7;
    rpictOpts.lw = 0.05;
    // pixel opts
    rpictOpts.pa = 1.0;
    rpictOpts.pd = 0.0;
    rpictOpts.pj = 0.67;
    rpictOpts.pm = 0.0;
    rpictOpts.ps = 1.0;
    rpictOpts.pt = 0.05;
    // specular
    rpictOpts.sj = 1.0;
    rpictOpts.st = 0.15;
    // bool options
    rpictOpts.bv = true;
    rpictOpts.dv = true;
    rpictOpts.u = false;
    rpictOpts.w = true;
}

// arrays to look up option types and defaults
var rpictBoolOptions = ["bv", "dv", "u", "w"];
var rpictBoolComments = ["backface", "direct", "monte carlo", "warnings"];
var rpictBoolDefaults = [true, true, false, true];

var rpictIntOptions   = ["ab","ad","ar","as","aw","dp", "dr","lr","ps"];


// array to hold active overrides
var rpictOverrides = new Array();;


function isInList(list, element) {
    // return true if element is in list
    for (var i=0; i<list.length; i++) {
        if (list[i] == element) {
            return true;
        }
    }
    return false;
}


function getRpictOptionSpan(opt) {
    // return text for option span (checkbox and textfield)
    var style = "rpictOverride";
    var state = "";
    var selected = rpictOverrideSelected(opt);
    if (selected == true) {
        style = "rpictOverrideSelected";
        state = "checked";
    }
    var text = "<span class=\"" + style + "\">";
    text += "<input type=\"checkbox\" class=\"rpictCB\" id=\"rpictOverrideCB" + opt + "\"";
    text += " onchange=\"onRpictOverride('" + opt + "')\" " + state + "/> -" + opt + ": ";
    if (selected == true) {
        if (opt == "lr") {
            text += "<input type=\"text\" class=\"rpictOverrideInputIntN\"";
        } else if (isInList(rpictIntOptions, opt) == true) {
            text += "<input type=\"text\" class=\"rpictOverrideInputInt\"";
        } else {
            text += "<input type=\"text\" class=\"rpictOverrideInput\"";
        } 
        text += " id=\"rpictOverrideInput" + opt + "\"";
        text += " value=\"" + rpictOpts[opt] + "\" onchange=\"validateRpictOverride('" + opt + "')\" />";
    } else {
        text += rpictOpts[opt]
    }
    text += "</span><br/>"
    return text;
}

function getRpictOptionSpansBool() {
    // return text for all bool option checkboxes
    var text = "";
    for (var i=0; i<rpictBoolOptions.length; i++) {
        var opt = rpictBoolOptions[i];
        var bvalue = rpictOpts[opt];
        var style = "rpictOverride";
        var state = "";
        var textvalue = "on";
        var flagvalue = "+";
        var id = "rpictOverrideCB" + opt;
        if (bvalue != rpictBoolDefaults[i]) {
            state = "checked";
            style = "rpictOverrideSelected";
        }
        try {
            if (document.getElementById(id).checked == true) {
                state = "checked";
                style = "rpictOverrideSelected";
            } 
        } catch (e) {
            // log.warn("error at rpict checkbox '-" + opt + "': " + e.name);
        }
        if (bvalue == false) {
            textvalue = "off";
            flagvalue = "-";
        }
        text += "<span class=\"" + style + "\">";
        text += "<input type=\"checkbox\" class=\"rpictCB\"";
        text += " id=\"rpictOverrideCB" + opt + "\"";
        text += " onchange=\"onRpictOverride('" + opt + "')\" " + state + "/> ";
        text += "-" + opt + flagvalue;
        text += ": " + rpictBoolComments[i] + " " + textvalue;
        text += "</span><br/>";
    }
    return text;
}


function getRpictOverride(opt) {
    // return value of override or rpictOpts value
    for (var i=0; i<rpictOverrides.length; i++) {
        if (rpictOverrides[i][0] == opt) {
            return rpictOverrides[i][1];
        }
    }
    return rpictOpts[opt];
}


function syncRadOption(id) {
    log.debug("sync(), id='" + id + "'");
    var suffix = id.slice(-2);
    var other = "";
    if (suffix == "_1") {
        other = id.slice(0,-2) + "_2";
    } else if (suffix == "_2") {
        other = id.slice(0,-2) + "_1";
    } else {
        log.warn("sync of wrong option, id='" + id + "'");
        return;
    }
    // set selection for 'other' element
    var opt = id.slice(3,-2);
    select = document.getElementById(other); 
    for (i=0; i<select.options.length; i++) {
        if (select.options[i].text == radOpts[opt]) {
            select.selectedIndex = i;
            log.debug("found index for value '" + radOpts[opt] + "'");
        }
    }
}


function onRadOptionChange(id) {
    var opt=id.slice(3);    
    log.debug("onRadOptionChange() opt='" + opt + "'");
    if (opt == "Penumbras") {
        radOpts[opt] = document.getElementById(id).checked;
    } else if (opt == "ZoneSize") {
        radOpts[opt] = parseFloat(document.getElementById(id).value);
    } else if (opt == "Indirect" || opt == "ImageSizeX" || opt == "ImageSizeY") {
        radOpts[opt] = parseInt(document.getElementById(id).value);
    } else {
        var suffix = id.slice(-2);
        log.debug("suffix='" +  suffix + "'");
        if (suffix == "_1" || suffix == "_2") {
            opt = opt.slice(0,-2)
        }
        radOpts[opt] = document.getElementById(id).value;
        log.debug("DEBUG: value=" + document.getElementById(id).value);
        if (suffix == "_1" || suffix == "_2") {
            syncRadOption(id);
        }
    }
    // check if option needs sync
    /* var suffix = id.slice(-2);
    log.debug("suffix='" +  suffix + "'");
    if (suffix == "_1" || suffix == "_2") {
        syncRadOption(id);
    } */
    updateRpictValues();
    updateRenderLine();
}


function onRadOptionImageSize(id) {
    var opt=id.slice(3,-2);    
    var newVal=parseInt(document.getElementById(id).value);
    if (isNaN(newVal)) {
        alert("ImageSize: Please enter a number!");
        document.getElementById(id).value = radOpts[opt];
    } else {
        radOpts[opt] = newVal;
        document.getElementById("rad" + opt + "_1").value = radOpts[opt];
        document.getElementById("rad" + opt + "_2").value = radOpts[opt];
    }
}

function removeAllOverrides() {
    while (rpictOverrides.length > 0) {
        var opt = rpictOverrides[0][0];
        removeRpictOverride(opt);
    }
    // reset ImageType to 'normal'
    radOpts.ImageType = "normal";
    syncRadOption('radImageType_1');
    syncRadOption('radImageType_2');
    updateRpictValues();
}



function onRpictOverride(opt) {
    // callback for option checkboxes 
    var id = "rpictOverrideCB" + opt;
    if (document.getElementById(id).checked == true) {
        setRpictOverride(opt, rpictOpts[opt]);
    } else {
        removeRpictOverride(opt);
    }
    updateRpictValues();
    updateRenderLine();
}


function parseRenderLine(suffix) {
    // validate render line input and set overrides
    log.debug("+++")
    log.debug("parseRenderLine(" + suffix + ")");
    var id="radRenderLine_2" 
    var inText = document.getElementById(id).value;
    var tokens = inText.split(" ");
    var parts = new Array();
    for (var i=0; i<tokens.length; i++) {
        if (tokens[i] != "") {
            parts.push(tokens[i])
        }
    }
    if (parts.length == 0) {
        removeAllOverrides();
    }
    i = 0;
    while (i<parts.length) {
        var opt = parts[i]
        log.debug("  -> parsing '" + opt + "' ...");
        if (opt[0] == "-") {
            opt = opt.slice(1);
        }
        if (opt == "i") {
            if (radOpts.ImageType == "normal") {
                radOpts.ImageType = "irridiance";
                syncRadOption('radImageType_1');
                syncRadOption('radImageType_2');
            }
        } else if (isInList(rpictBoolOptions, opt.slice(0,-1) )) {
            parseBoolOverride(opt)
        } else if (isInList(rpictBoolOptions, opt)) {
            parseBoolOverride(opt + "+")
        } else {
            var value = _validateRpictOverrideValue(opt, parts[i+1]) 
            if (isNaN(value) == false) {
                setRpictOverride(opt, value);
                i += 1;
            } else {
                log.error("'" + opt + "' argument is not a number: '" + parts[i] + "'");
                log.error(" => option ignored");
            }
            if (opt == "av") {
                // check for green and blue values (which are ignored ...)
                if (isNaN(parseFloat(parts[i+1])) == false) {
                    log.warn("'-av' value for green ignored: " + parts[i+1])
                    i += 1;
                    if (isNaN(parseFloat(parts[i+1])) == false) {
                        log.warn("'-av' value for blue ignored: " + parts[i+1])
                        i += 1;
                    }
                }
            } // end of if '-av'
        } 
        // dont forget to increase counter!
        i += 1;
    }
    _updateRpictOptionDisplay();
    updateRenderLine();
}


function parseBoolOverride(txt) {
    var opt = txt.slice(1,-1);
    var idx;
    for (var i=0; i<rpictBoolOptions.length; i++) {
        if (rpictBoolOptions[i] == opt) {
            idx = i;
            break;
        }
    }
    if (idx == null) {
        log.error("not a bool option: '" + opt + "'")
        return;
    }
    // change +/- to true/false
    var flag = true;
    if (txt.slice(-1) == "-") {
        var flag = false;
    }
    if (flag == rpictBoolDefaults[idx]) {
        removeRpictOverride(opt);   
    } else {
        setRpictOverride(opt);   
    }
}


function removeRpictOverride(opt) {
    if (isInList(rpictBoolOptions, opt) == true) {
        removeRpictOverrideBool(opt);
    }
    for (var idx=0; idx<rpictOverrides.length; idx++) {
        if (rpictOverrides[idx][0] == opt) {
            try {
                var deletedOpt = rpictOverrides.splice(idx,1);
                log.info("override removed for option '" + opt + "'");
            } catch(e) {
                log.warn("error removing override for '" + opt + "'(" + e.name + ")");
            }
            break;
        }
    }
    try {
        document.getElementById("rpictOverrideCB" + opt).checked = false;
    } catch(e) {
        log.error("check box for '-" + opt + "' not found");
    }
}


function removeRpictOverrideBool(opt) {
    // set default option for bool value 
    for (var idx=0; idx<rpictBoolOptions.length; idx++) {
        if (rpictBoolOptions[idx] == opt) {
            rpictOpts[opt] = rpictBoolDefaults[idx];
            var id = "rpictOverrideCB" + opt;
            document.getElementById(id).checked = false;
        }
    }
}


function rpictOverrideSelected(opt) {
    // return true if override for rpict opt id is set
    var selected = false;
    id = "rpictOverrideCB" + opt;
    try {
        selected = document.getElementById(id).checked;
    } catch (e) {
        // may not exist yet
        // log.warn("error at rpict checkbox '-" + opt + "': " + e.name)
    }
    return selected;
}


function _setRpictOptions() {
    // calculate and set rpict options from quality settings
    log.debug("_setRpictOptions(" + radOpts.Quality + ")");
    setRpictDefaults()
    if (radOpts.Quality == "low") {
        _setRpictOptsLow();
    } else if (radOpts.Quality == "medium") {
        _setRpictOptsMedium();
    } else if (radOpts.Quality == "high") {
        _setRpictOptsHigh();
    } else {
        log.error("unexpected value for 'quality': '" + radOpts.Quality + "'")
        log.error("  --> returning 'medium' options")
        radOpts.Quality = "medium";
        _setRpictOptsMedium();
    } 
    // todo: ambient file, overture
    if (radOpts.ZoneType == "interior") {
        rpictOpts.av = 0.1;
    } else {
        rpictOpts.av = 10.0;
    }
}


function _setRpictOptsHigh() {
    rpictOpts.ab = radOpts.Indirect + 1;
    // rpictOpts.as = 0;
    rpictOpts.dc = 0.75;
    rpictOpts.dt = 0.05;
    rpictOpts.dr = 3;
    rpictOpts.lr = 12;
    rpictOpts.lw = 0.0005;
    rpictOpts.pt = 0.04;
    rpictOpts.sj = 1.0;
    rpictOpts.st = 0.01;
    if (radOpts.Detail == "high") {
        rpictOpts.ar = 128 * parseInt(radOpts.ZoneSize);
        rpictOpts.dp = 4096;
        rpictOpts.ps = 3;
    } else if (radOpts.Detail == "medium") {
        rpictOpts.ar = 32 * parseInt(radOpts.ZoneSize);
        rpictOpts.dp = 2048;
        rpictOpts.ps = 5;
    } else {
        rpictOpts.ar = 16 * parseInt(radOpts.ZoneSize);
        rpictOpts.dp = 1024;
        rpictOpts.ps = 8;
    }
    if (radOpts.Penumbras == true) {
        rpictOpts.dj = 0.65;
        rpictOpts.ds = 0.1;
        rpictOpts.ps = 1;
    } else {
        rpictOpts.ds = 2;
    }
    if (radOpts.Variability == "high") {
        rpictOpts.aa = 0.075;
        rpictOpts.ad = 4096;
        rpictOpts.as = 2048;
    } else if (radOpts.Variability == "medium") {
        rpictOpts.aa = 0.1;
        rpictOpts.ad = 1536;
        rpictOpts.as = 768;
    } else {
        rpictOpts.aa = 0.125;
        rpictOpts.ad = 512;
        rpictOpts.as = 64;
    }
}


function _setRpictOptsLow() {
    rpictOpts.as = 0;
    rpictOpts.dc = 0.25;
    rpictOpts.dt = 0.2;
    rpictOpts.dr = 0;
    rpictOpts.lr = 6;
    rpictOpts.lw = 0.01;
    rpictOpts.pt = 0.16;
    rpictOpts.sj = 0;
    rpictOpts.st = 0.5;
    if (radOpts.Detail == "high") {
        rpictOpts.ar = 32 * parseInt(radOpts.ZoneSize);
        rpictOpts.dp = 256;
        rpictOpts.ps = 4;
    } else if (radOpts.Detail == "medium") {
        rpictOpts.ar = 16 * parseInt(radOpts.ZoneSize);
        rpictOpts.dp = 128;
        rpictOpts.ps = 8;
    } else {
        rpictOpts.ar = 8 * parseInt(radOpts.ZoneSize);
        rpictOpts.dp = 64;
        rpictOpts.ps = 16;
    }
    if (radOpts.Penumbras == true) {
        rpictOpts.ds = 0.4;
    } else {
        rpictOpts.ds = 0;
    }
    if (radOpts.Variability == "high") {
        rpictOpts.aa = 0.2;
        rpictOpts.ad = 1024;
    } else if (radOpts.Variability == "medium") {
        rpictOpts.aa = 0.25;
        rpictOpts.ad = 512;
    } else {
        rpictOpts.aa = 0.3;
        rpictOpts.ad = 256;
    }
}

function _setRpictOptsMedium() {
    rpictOpts.ab = radOpts.Indirect;
    // rpictOpts.as = 0;
    rpictOpts.dc = 0.5;
    rpictOpts.dt = 0.1;
    rpictOpts.dr = 1;
    rpictOpts.lr = 8;
    rpictOpts.lw = 0.002;
    rpictOpts.pt = 0.08;
    rpictOpts.sj = 0.7;
    rpictOpts.st = 0.1;
    if (radOpts.Detail == "high") {
        rpictOpts.ar = 64 * parseInt(radOpts.ZoneSize);
        rpictOpts.dp = 1024;
        rpictOpts.ps = 4;
    } else if (radOpts.Detail == "medium") {
        rpictOpts.ar = 32 * parseInt(radOpts.ZoneSize);
        rpictOpts.dp = 512;
        rpictOpts.ps = 6;
    } else {
        rpictOpts.ar = 16 * parseInt(radOpts.ZoneSize);
        rpictOpts.dp = 256;
        rpictOpts.ps = 8;
    }
    if (radOpts.Penumbras == true) {
        rpictOpts.dj = 0.5;
        rpictOpts.ds = 0.2;
        rpictOpts.ps /= 2;;
    } else {
        rpictOpts.ds = 0.3;
    }
    if (radOpts.Variability == "high") {
        rpictOpts.aa = 0.1;
        rpictOpts.ad = 1024;
        rpictOpts.as = 392;
    } else if (radOpts.Variability == "medium") {
        rpictOpts.aa = 0.15;
        rpictOpts.ad = 800;
        rpictOpts.as = 128;
    } else {
        rpictOpts.aa = 0.2;
        rpictOpts.ad = 329;
        rpictOpts.as = 42;
    }
}


function selectImageType(id) {
    // set new value and sync radImageType select element
    var opt = id.slice(3,-2)
    log.info("new image type: " + document.getElementById(id));
    radOpts[opt] = document.getElementById(id).value;
    syncRadOption(id); 
    updateRenderLine();
}


function setRpictOverride(opt, newValue) {
    // update or set override value for 'opt' 
    if (isInList(rpictBoolOptions, opt) == true) {
        setRpictOverrideBool(opt);
        newValue = rpictOpts[opt]
    } 
    var found = false;
    for (var i=0; i<rpictOverrides.length; i++) {
        if (rpictOverrides[i][0] == opt) {
            rpictOverrides[i][1] = newValue;
            log.info("new value for override: '-" + opt + "' " + newValue);
            found = true;
            break;
        }
    }
    if (found == false) {
        rpictOverrides.push([opt, newValue]);
        log.info("new override: '-" + opt + "': " + newValue);
    }
    rpictOpts[opt] = newValue;
    try {
        document.getElementById("rpictOverrideCB" + opt).checked = true;
    } catch(e) {
        log.error("check box for '-" + opt + "' not found");
    }
    rpictOverrides.sort(_sortOverrides);
}

function _sortOverrides(a,b) {
    if (a[0] < b[0])
        return -1;
    if (b[0] < a[0])
        return 1;
    return 0;
}


function setRpictOverrideBool(opt) {
    // change rpictOpts value to non-default
    for (var idx=0; idx<rpictBoolOptions.length; idx++) {
        if (rpictBoolOptions[idx] == opt) {
            rpictOpts[opt] = !rpictBoolDefaults[idx];
            var id = "rpictOverrideCB" + opt;
            document.getElementById(id).checked = true;
        }
    }
}


function updateRenderLine() {
    text = ""
    // add -i switch
    if (radOpts.ImageType != "normal") {
        text += "-i"
    }
    for (var i=0; i<rpictOverrides.length; i++) {
        var opt = rpictOverrides[i][0];
        if (isInList(rpictBoolOptions, opt) == true) {
            var sign = "+";
            if (rpictOverrides[i][1] == false) {
                sign = "-";
            }
            text += " -" + opt + sign;
        } else {
            text += " -" + opt + " " + rpictOverrides[i][1];
        }
    }
    document.getElementById("radRenderLine_1").innerHTML = text;
    document.getElementById("radRenderLine_2").value = text;
}


function _updateRpictOptionDisplay() {
    log.debug("_updateRpictOptionDisplay()");
    var options = [                      "ambient", "aa", "ab", "ad", "ar", "as", "aw", "amb. value", "av",
                   "rpictOptionsMiddle", "direct",  "dc", "dj", "dp", "dr", "ds", "dt", "limits",     "lr", "lw",
                   "rpictOptionsMiddle", "pixel",   "pa", "pd", "pj", "pm", "ps", "pt", "specular",   "sj", "st"]

    text = "<div id=\"rpictOptionsLeft\">"
    for (var i=0; i<options.length; i++) {
        var opt = options[i];
        if (opt == "") {
            text += "&nbsp;<br />";
        } else if (opt[0] == "r") {
            text += "</div>";
            text += '<div id="' + opt + '">';
        } else if (opt.length > 2) {
            text += "<span class=\"rpictOverrideHeader\">" + opt + "</span><br/>";
        } else {
            text += getRpictOptionSpan(opt)
        }
    }
    text += "</div><div id=\"rpictOptionsRight\">";
    text += "<span class=\"rpictOverrideHeader\">bool options</span><br/>";
    // add bool options
    text += getRpictOptionSpansBool();
    text += "</div>";
    document.getElementById("rpictOptionsDisplay").innerHTML = text;
    // set restrictions on text input fields
    $('.rpictOverrideInput').numeric({allow:"."});
    $('.rpictOverrideInputInt').numeric({allow:""});
    $('.rpictOverrideInputIntN').numeric({allow:"-"});
}


function updateRpictValues() {
    log.debug("updateRpictValues()");
    _setRpictOptions()
    // apply values from overrides
    for (var i=0; i<rpictOverrides.length; i++) {
        var opt = rpictOverrides[i][0]; 
        rpictOpts[opt] = rpictOverrides[i][1];
    }
    _updateRpictOptionDisplay();
}


function validateRpictOverride(opt) {
    // validate rpict arg against int or float;
    var id = "rpictOverrideInput" + opt;
    var value = document.getElementById(id).value;
    var newValue = _validateRpictOverrideValue(opt, value);
    // check if return value is a valid number and apply
    if (isNaN(newValue)) {
        // NaN: revert to old value
        document.getElementById(id).value = getRpictOverride(opt);
    } else {
        document.getElementById(id).value = newValue;
        setRpictOverride(opt, newValue);
        updateRenderLine();
    }
}


function _validateRpictOverrideValue(opt, value) {
    // find correct validator: parseInt() or parseFloat()
    var integer = false;
    if (isInList(rpictIntOptions, opt) == true) {
        integer = true;
    }
    var newValue = NaN;
    if (integer == true) {
        newValue = parseInt(value);
    } else {
        newValue = parseFloat(value);
    }
    // check for NaN
    if (isNaN(newValue)) {
        alert("value for '-" + id + "' is not a number!\n" + "value=" + value + ", integer=" + integer);
    }
    return newValue;
}

