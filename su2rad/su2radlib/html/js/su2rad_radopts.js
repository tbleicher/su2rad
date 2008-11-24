

function RadOptsObject() {
    // Quality group
    this.Quality = "medium";
    this.Detail = "medium";
    this.Variability = "high";
    this.Indirect = 2;
    this.Penumbras = true;
    // Image group
    this.ImageSizeX = 512;  // XXX
    this.ImageSizeY = 512;  // XXX
    this.ImageType = "normal";
    // Zone group
    this.ZoneSize = 10.0;  // XXX
    this.ZoneType = "interior";
    // Report group
    this.Report = 0;
    this.ReportFile = 'scene.log';
    
    // hash for rpict options
    this._rpictOpts = {};
    // array to hold active overrides
    this._rpictOverrides = new Array();
}

RadOptsObject.prototype.getRenderLine = function () {
    // return rpict options for rad 'render' line
    text = ""
    // add -i switch
    if (this.ImageType != "normal") {
        text += "-i "
    }
    // other overrides
    for (var i=0; i<this._rpictOverrides.length; i++) {
        var opt = this._rpictOverrides[i][0];
        if (opt == 'av') {
            var v = this._rpictOverrides[i][1]; 
            text += "-" + opt + " " + v + " " + v + " " + v + " ";
        } else if (isInList(rpictBoolOptions, opt) == true) {
            var sign = "+";
            if (this._rpictOverrides[i][1] == false) {
                sign = "-";
            }
            text += "-" + opt + sign + " ";
        } else {
            text += "-" + opt + " " + this._rpictOverrides[i][1] + " ";
        }
    }
    return text;
}

RadOptsObject.prototype.getOption = function (opt) {
    return this.getRpictOverride(opt);
}

RadOptsObject.prototype.getRpictOverride = function (opt) {
    // return value of override or this._rpictOpts value
    for (var i=0; i<this._rpictOverrides.length; i++) {
        if (this._rpictOverrides[i][0] == opt) {
            return this._rpictOverrides[i][1];
        }
    }
    return this._rpictOpts[opt];
}

RadOptsObject.prototype.toString = function () {
    text  =  "Quality=" + this.Quality;
    text += "&Detail=" + this.Detail;
    text += "&Variability=" + this.Detail;
    text += "&Indirect=" + this.Indirect;
    text += "&Penumbras=" + this.Penumbras;
    text += "&ImageType=" + this.ImageType;
    text += "&ImageSizeX=" + this.ImageSizeX;
    text += "&ImageSizeY=" + this.ImageSizeY;
    text += "&ZoneSize=" + this.ZoneSize;
    text += "&ZoneType=" + this.ZoneType;
    text += "&Report=" + this.Report;
    text += "&ReportFile=" + this.ReportFile;
    text += "&render=" + this.getRenderLine();
    return text
}

RadOptsObject.prototype.setRpictDefaults = function () {
    // ambient
    this._rpictOpts.aa = 0.2;
    this._rpictOpts.ab = 0;
    this._rpictOpts.ad = 512;
    this._rpictOpts.ar = 64;
    this._rpictOpts.as = 128;
    this._rpictOpts.av = 0.0;
    // one value for r,g and b
    this._rpictOpts.aw = 0;
    // direct calc
    this._rpictOpts.dc = 0.5;
    this._rpictOpts.dj = 0.0;
    this._rpictOpts.dp = 512;
    this._rpictOpts.dr = 1;
    this._rpictOpts.ds = 0.25;
    this._rpictOpts.dt = 0.05;
    // reflections
    this._rpictOpts.lr = 7;
    this._rpictOpts.lw = 0.05;
    // pixel opts
    this._rpictOpts.pa = 1.0;
    this._rpictOpts.pd = 0.0;
    this._rpictOpts.pj = 0.67;
    this._rpictOpts.pm = 0.0;
    this._rpictOpts.ps = 1.0;
    this._rpictOpts.pt = 0.05;
    // specular
    this._rpictOpts.sj = 1.0;
    this._rpictOpts.st = 0.15;
    // bool options
    this._rpictOpts.bv = true;
    this._rpictOpts.dv = true;
    this._rpictOpts.u = false;
    this._rpictOpts.w = true;
}

RadOptsObject.prototype.setRpictOptions = function () {
    // calculate and set rpict options from quality settings
    log.debug("this.setRpictOptions(" + this.Quality + ")");
    this.setRpictDefaults()
    if (this.Quality == "low") {
        this._setRpictOptsLow();
    } else if (this.Quality == "medium") {
        this._setRpictOptsMedium();
    } else if (this.Quality == "high") {
        this._setRpictOptsHigh();
    } else {
        log.error("unexpected value for 'quality': '" + this.Quality + "'")
        log.error("  --> returning 'medium' options")
        this.Quality = "medium";
        this._setRpictOptsMedium();
    } 
    // todo: ambient file, overture
    if (this.ZoneType == "interior") {
        this._rpictOpts.av = 0.1;
    } else {
        this._rpictOpts.av = 10.0;
    }
    // apply overrides
    for (var i=0; i<this._rpictOverrides.length; i++) {
        var opt = this._rpictOverrides[i][0]; 
        this._rpictOpts[opt] = this._rpictOverrides[i][1];
    }
}

RadOptsObject.prototype._setRpictOptsHigh = function () {
    this._rpictOpts.ab = this.Indirect + 1;
    // this._rpictOpts.as = 0;
    this._rpictOpts.dc = 0.75;
    this._rpictOpts.dt = 0.05;
    this._rpictOpts.dr = 3;
    this._rpictOpts.lr = 12;
    this._rpictOpts.lw = 0.0005;
    this._rpictOpts.pt = 0.04;
    this._rpictOpts.sj = 1.0;
    this._rpictOpts.st = 0.01;
    if (this.Detail == "high") {
        this._rpictOpts.ar = 128 * parseInt(this.ZoneSize);
        this._rpictOpts.dp = 4096;
        this._rpictOpts.ps = 3;
    } else if (this.Detail == "medium") {
        this._rpictOpts.ar = 32 * parseInt(this.ZoneSize);
        this._rpictOpts.dp = 2048;
        this._rpictOpts.ps = 5;
    } else {
        this._rpictOpts.ar = 16 * parseInt(this.ZoneSize);
        this._rpictOpts.dp = 1024;
        this._rpictOpts.ps = 8;
    }
    if (this.Penumbras == true) {
        this._rpictOpts.dj = 0.65;
        this._rpictOpts.ds = 0.1;
        this._rpictOpts.ps = 1;
    } else {
        this._rpictOpts.ds = 2;
    }
    if (this.Variability == "high") {
        this._rpictOpts.aa = 0.075;
        this._rpictOpts.ad = 4096;
        this._rpictOpts.as = 2048;
    } else if (this.Variability == "medium") {
        this._rpictOpts.aa = 0.1;
        this._rpictOpts.ad = 1536;
        this._rpictOpts.as = 768;
    } else {
        this._rpictOpts.aa = 0.125;
        this._rpictOpts.ad = 512;
        this._rpictOpts.as = 64;
    }
}

RadOptsObject.prototype._setRpictOptsLow = function () {
    this._rpictOpts.as = 0;
    this._rpictOpts.dc = 0.25;
    this._rpictOpts.dt = 0.2;
    this._rpictOpts.dr = 0;
    this._rpictOpts.lr = 6;
    this._rpictOpts.lw = 0.01;
    this._rpictOpts.pt = 0.16;
    this._rpictOpts.sj = 0;
    this._rpictOpts.st = 0.5;
    if (this.Detail == "high") {
        this._rpictOpts.ar = 32 * parseInt(this.ZoneSize);
        this._rpictOpts.dp = 256;
        this._rpictOpts.ps = 4;
    } else if (this.Detail == "medium") {
        this._rpictOpts.ar = 16 * parseInt(this.ZoneSize);
        this._rpictOpts.dp = 128;
        this._rpictOpts.ps = 8;
    } else {
        this._rpictOpts.ar = 8 * parseInt(this.ZoneSize);
        this._rpictOpts.dp = 64;
        this._rpictOpts.ps = 16;
    }
    if (this.Penumbras == true) {
        this._rpictOpts.ds = 0.4;
    } else {
        this._rpictOpts.ds = 0;
    }
    if (this.Variability == "high") {
        this._rpictOpts.aa = 0.2;
        this._rpictOpts.ad = 1024;
    } else if (this.Variability == "medium") {
        this._rpictOpts.aa = 0.25;
        this._rpictOpts.ad = 512;
    } else {
        this._rpictOpts.aa = 0.3;
        this._rpictOpts.ad = 256;
    }
}

RadOptsObject.prototype._setRpictOptsMedium = function () {
    this._rpictOpts.ab = this.Indirect;
    // this._rpictOpts.as = 0;
    this._rpictOpts.dc = 0.5;
    this._rpictOpts.dt = 0.1;
    this._rpictOpts.dr = 1;
    this._rpictOpts.lr = 8;
    this._rpictOpts.lw = 0.002;
    this._rpictOpts.pt = 0.08;
    this._rpictOpts.sj = 0.7;
    this._rpictOpts.st = 0.1;
    if (this.Detail == "high") {
        this._rpictOpts.ar = 64 * parseInt(this.ZoneSize);
        this._rpictOpts.dp = 1024;
        this._rpictOpts.ps = 4;
    } else if (this.Detail == "medium") {
        this._rpictOpts.ar = 32 * parseInt(this.ZoneSize);
        this._rpictOpts.dp = 512;
        this._rpictOpts.ps = 6;
    } else {
        this._rpictOpts.ar = 16 * parseInt(this.ZoneSize);
        this._rpictOpts.dp = 256;
        this._rpictOpts.ps = 8;
    }
    if (this.Penumbras == true) {
        this._rpictOpts.dj = 0.5;
        this._rpictOpts.ds = 0.2;
        this._rpictOpts.ps /= 2;;
    } else {
        this._rpictOpts.ds = 0.3;
    }
    if (this.Variability == "high") {
        this._rpictOpts.aa = 0.1;
        this._rpictOpts.ad = 1024;
        this._rpictOpts.as = 392;
    } else if (this.Variability == "medium") {
        this._rpictOpts.aa = 0.15;
        this._rpictOpts.ad = 800;
        this._rpictOpts.as = 128;
    } else {
        this._rpictOpts.aa = 0.2;
        this._rpictOpts.ad = 329;
        this._rpictOpts.as = 42;
    }
}

RadOptsObject.prototype.setRpictOverride = function (opt, newValue) {
    // update or set override value for 'opt' 
    if (isInList(rpictBoolOptions, opt) == true) {
        this._setRpictOverrideBool(opt);
        newValue = this._rpictOpts[opt]
    } 
    var found = false;
    for (var i=0; i<this._rpictOverrides.length; i++) {
        if (this._rpictOverrides[i][0] == opt) {
            this._rpictOverrides[i][1] = newValue;
            log.info("new value for override: '-" + opt + "' " + newValue);
            found = true;
            break;
        }
    }
    if (found == false) {
        this._rpictOverrides.push([opt, newValue]);
        log.info("new override: '-" + opt + "': " + newValue);
    }
    this._rpictOpts[opt] = newValue;
    this._rpictOverrides.sort(_sortOverrides);
}

RadOptsObject.prototype._setRpictOverrideBool = function (opt) {
    // change this._rpictOpts value to non-default
    for (var idx=0; idx<rpictBoolOptions.length; idx++) {
        if (rpictBoolOptions[idx] == opt) {
            this._rpictOpts[opt] = !rpictBoolDefaults[idx];
        }
    }
}

RadOptsObject.prototype.removeAllOverrides = function () {
    while (this._rpictOverrides.length > 0) {
        var opt = this._rpictOverrides[0][0];
        this.removeRpictOverride(opt);
    }
    // reset ImageType to 'normal'
    this.ImageType = "normal";
}

RadOptsObject.prototype.removeRpictOverride = function (opt) {
    if (isInList(rpictBoolOptions, opt) == true) {
        this._removeRpictOverrideBool(opt);
    }
    for (var idx=0; idx<this._rpictOverrides.length; idx++) {
        if (this._rpictOverrides[idx][0] == opt) {
            try {
                var deletedOpt = this._rpictOverrides.splice(idx,1);
                log.info("override removed for option '" + opt + "'");
            } catch(e) {
                log.warn("error removing override for '" + opt + "'(" + e.name + ")");
            }
            break;
        }
    }
}

RadOptsObject.prototype._removeRpictOverrideBool = function (opt) {
    // set default option for bool value 
    for (var idx=0; idx<rpictBoolOptions.length; idx++) {
        if (rpictBoolOptions[idx] == opt) {
            this._rpictOpts[opt] = rpictBoolDefaults[idx];
        }
    }
}

function _sortOverrides(a,b) {
    if (a[0] < b[0])
        return -1;
    if (b[0] < a[0])
        return 1;
    return 0;
}



// object instances
var radOpts = new RadOptsObject();

// arrays to look up option types and defaults
var rpictBoolOptions  = ["bv", "dv", "u", "w"];
var rpictBoolComments = ["backface", "direct", "monte carlo", "warnings"];
var rpictBoolDefaults = [true, true, false, true];
var rpictIntOptions   = ["ab","ad","ar","as","aw","dp", "dr","lr","ps"];



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
    var text = "<div class=\"" + style + "\">";
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
        text += " value=\"" + radOpts.getOption(opt) + "\" onchange=\"validateRpictOverride('" + opt + "')\" />";
    } else {
        text += radOpts.getOption(opt);
    }
    text += "</div>"
    return text;
}

function getRpictOptionSpansBool() {
    // return text for all bool option checkboxes
    var text = "";
    for (var i=0; i<rpictBoolOptions.length; i++) {
        var opt = rpictBoolOptions[i];
        var bvalue = radOpts.getOption(opt);
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
        text += "<div class=\"" + style + "\">";
        text += "<input type=\"checkbox\" class=\"rpictCB\"";
        text += " id=\"rpictOverrideCB" + opt + "\"";
        text += " onchange=\"onRpictOverride('" + opt + "')\" " + state + "/> ";
        text += "-" + opt + flagvalue;
        text += ": " + rpictBoolComments[i] + " " + textvalue;
        text += "</div>";
    }
    return text;
}


function syncRadOption(id) {
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
        if (suffix == "_1" || suffix == "_2") {
            opt = opt.slice(0,-2)
        }
        radOpts[opt] = document.getElementById(id).value;
        if (suffix == "_1" || suffix == "_2") {
            syncRadOption(id);
        }
    }
    updateRpictValues();
    updateRenderLine();
    applyRenderOptions();
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
        applyRenderOptions();
    }
}

function onRpictOverride(opt) {
    // set or remove override when checkbox is ticked
    var id = "rpictOverrideCB" + opt;
    if (document.getElementById(id).checked == true) {
        setOverride(opt, radOpts.getOption(opt));
    } else {
        removeOverride(opt);
    }
    updateRpictValues();
    updateRenderLine();
    applyRenderOptions();
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
        radOpts.removeAllOverrides();
        setImageType('normal')
        updateRpictValues();
    }
    var removeIrr = false;
    if (radOpts.ImageType != "normal") {
        removeIrr = true;
    }
    i = 0;
    while (i<parts.length) {
        var opt = parts[i]
        log.debug("  -> parsing '" + opt + "' ...");
        if (opt[0] == "-") {
            opt = opt.slice(1);
        }
        if (opt == "i") {
            removeIrr = false;
            if (radOpts.ImageType == "normal") {
                setImageType('irridiance')
            }
        } else if (isInList(rpictBoolOptions, opt.slice(0,-1) )) {
            parseBoolOverride(opt)
        } else if (isInList(rpictBoolOptions, opt)) {
            parseBoolOverride(opt + "+")
        } else {
            var value = _validateRpictOverrideValue(opt, parts[i+1]) 
            if (isNaN(value) == false) {
                setOverride(opt, value);
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
    // if '-i' was removed reset image type
    if (removeIrr == true) {
        setImageType('normal')
    }
    _updateRpictOptionDisplay();
    updateRenderLine();
    applyRenderOptions();
}

function setImageType(imgType) {
    // set new image type and sync select boxes
    radOpts.ImageType = imgType;
    syncRadOption('radImageType_1');
    syncRadOption('radImageType_2');
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
        removeOverride(opt);   
    } else {
        setOverride(opt);   
    }
}

function removeOverride(opt) {
    // remove override from radOpts and clear checkbox
    radOpts.removeRpictOverride(opt);   
    try {
        document.getElementById("rpictOverrideCB" + opt).checked = false;
    } catch(e) {
        log.error("check box for '-" + opt + "' not found");
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

function selectImageType(id) {
    // set new value and sync radImageType select element
    var opt = id.slice(3,-2)
    log.info("new image type: " + document.getElementById(id));
    radOpts[opt] = document.getElementById(id).value;
    syncRadOption(id); 
    updateRenderLine();
    applyRenderOptions();
}

function setOverride(opt, newValue) {
    // add override value and set checkbox.checked = true
    radOpts.setRpictOverride(opt, newValue);
    try {
        document.getElementById("rpictOverrideCB" + opt).checked = true;
    } catch(e) {
        log.error("check box for '-" + opt + "' not found");
    }
}

function updateRenderLine() {
    var text = radOpts.getRenderLine();
    document.getElementById("radRenderLine_1").innerHTML = text;
    document.getElementById("radRenderLine_2").value = text;
}

function _updateRpictOptionDisplay() {
    // return HTML code for rpict option overrides
    //log.debug("_updateRpictOptionDisplay()");
    var options = ["ambient",    "aa", "ab", "ad", "ar", "as", "aw",
                   "amb. value", "av",
                   "NEWCOL", 
                   "direct",     "dc", "dj", "dp", "dr", "ds", "dt",
                   "limits",     "lr", "lw",
                   "NEWCOL",
                   "pixel",      "pa", "pd", "pj", "pm", "ps", "pt",
                   "specular",   "sj", "st"]

    text = "<div id=\"rpictOptionsLeft\">"
    for (var i=0; i<options.length; i++) {
        var opt = options[i];
        if (opt == "") {
            text += "&nbsp;<br />";
        } else if (opt == "NEWCOL") {
            text += "</div>";
            text += '<div id="rpictOptionsMiddle">';
        } else if (opt.length > 2) {
            //text += "<span class=\"rpictOverrideHeader\">" + opt + "</span><br/>";
            text += "<div class=\"rpictOverrideHeader\">" + opt + "</div>";
        } else {
            text += getRpictOptionSpan(opt)
        }
    }
    text += "</div><div id=\"rpictOptionsRight\">";
    //text += "<span class=\"rpictOverrideHeader\">bool options</span><br/>";
    text += "<div class=\"rpictOverrideHeader\">bool options</div>";
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
    radOpts.setRpictOptions()
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
        document.getElementById(id).value = radOpts.getRpictOverride(opt);
        return
    } else {
        document.getElementById(id).value = newValue;
        setOverride(opt, newValue);
    }
    updateRenderLine();
    applyRenderOptions();
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

