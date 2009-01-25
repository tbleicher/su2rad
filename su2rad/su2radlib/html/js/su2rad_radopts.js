function RadOptsObject() {
    // Quality group
    this.Quality = "medium";
    this.Detail = "medium";
    this.Variability = "high";
    this.Indirect = 2;
    this.Penumbras = true;
    // Image group
    this.ImageAspect = 1.0;  // XXX
    this.ImageSizeX = 512;   // XXX
    this.ImageSizeY = 512;   // XXX
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

    this.loadedFile = ''
}

RadOptsObject.prototype.getOptionsFromFileText = function (text) {
    log.debug("TODO: getOptionsFromFileText()")
    return true;
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
            text += "-" + opt + " " + v[0] + " " + v[1] + " " + v[2] + " ";
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

RadOptsObject.prototype.rpictOverrideSelected = function (opt) {
    for (var i=0; i<this._rpictOverrides.length; i++) {
        if (this._rpictOverrides[i][0] == opt) {
            return true;
        }
    }
    return false;
}

RadOptsObject.prototype.toString = function () {
    text  =  "Quality=" + this.Quality;
    text += "&Detail=" + this.Detail;
    text += "&Variability=" + this.Variability;
    text += "&Indirect=" + this.Indirect;
    text += "&Penumbras=" + this.Penumbras;
    text += "&ImageType=" + this.ImageType;
    text += "&ImageAspect=" + this.ImageAspect;
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
    this._rpictOpts.av = [0.0,0.0,0.0];
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
    //log.debug("setRpictOptions(" + this.Quality + ")");
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
        this._rpictOpts.av = [0.1,0.1,0.1];
    } else {
        this._rpictOpts.av = [10.0,10.0,10.0];
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

RadOptsObject.prototype.setValue = function (name, value) {
    if (name == 'render' && value != '') {
        parseRenderLine(value)
    } else if (name == 'ImageSizeX') {
        var val = parseInt(value);
        if (val == 0) {
            alert(name + " can not be 0!");
        } else {
            this[name] = val;
            this.ImageSizeY = parseInt(this.ImageSizeX/this.ImageAspect);
        }
    } else if (name == 'ImageSizeY') {
        var val = parseInt(value);
        if (val == 0) {
            alert(name + " can not be 0!");
        } else {
            this[name] = val;
            this.ImageAspect = parseFloat(this.ImageSizeX) / parseFloat(this.ImageSizeY);
        }
    } else if (name == 'Indirect' || name == 'Report') {
        this[name] = parseInt(value);
    } else if (name == 'ZoneSize') {
        this[name] = parseFloat(value);
    } else if (name == 'Penumbras') {
        if (value == 'false' || value == false) {
            this[name] = false;
        } else {
            this[name] = true;
        }
    } else {
        this[name] = value;
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
    var text = "<div class=\"gridRow\">";
    var selected = radOpts.rpictOverrideSelected(opt);
    text += getCheckBoxLabel(opt, "Rpict", selected)
    // add text input or show default value
    if (opt == "av" && selected == true) { 
        // add 3 text input fields for 'av'
        text += _getRpictOptionInputAV(opt);
        text += "</div>"
        return text;
    } else if (selected == true) {
        if (opt == "lr") {
            text += "<input type=\"text\" class=\"valueInputIntN\"";
        } else if (isInList(rpictIntOptions, opt) == true) {
            text += "<input type=\"text\" class=\"valueInputInt\"";
        } else {
            text += "<input type=\"text\" class=\"valueInput\"";
        } 
        text += " id=\"valueInput" + opt + "\"";
        text += " value=\"" + radOpts.getOption(opt) + "\" onchange=\"validateRpictOverride('" + opt + "')\" />";
    } else {
    	text += "<span class=\"defaultValue\">" + radOpts.getOption(opt) + "</span>";
    }
    text += "</div>"
    return text;
}

function _getRpictOptionInputAV(opt,text) {
    var text = ""
    var colors = ['r', 'g', 'b'];
    for (var i=0; i<colors.length; i++) {
        var copt = opt + "_" + colors[i]
        text += "<input type=\"text\" class=\"valueInput\"";
        text += " id=\"valueInput" + copt + "\"";
        text += " value=\"" + radOpts.getOption(opt)[i] + "\" onchange=\"validateRpictOverride('" + opt + "')\" />";
    }
    return text;
}

function getCheckBoxLabel(opt, group, selected, label) {
    if (!label) {
        label = "-" + opt;
    }
    if (selected == true) {
        var action = " onClick=\"disable" + group + "Override('" + opt + "')\" "
        var text = "<input type=\"checkbox\"" + action + "checked />";
    } else {
        var action = " onClick=\"enable" + group + "Override('" + opt + "')\" "
        var text = "<input type=\"checkbox\"" + action + " />";
    }
    text += "<a class=\"gridLabel\"" + action + "\">" + label + ":";
    text += getToolTip(group.toLowerCase(), opt);
    text += "</a>";
    return text;
}

function getRpictOptionSpansBool() {
    // return text for all bool option checkboxes
    // bool options are selected if current value != default value
    var text = "";
    for (var i=0; i<rpictBoolOptions.length; i++) {
        var opt = rpictBoolOptions[i];
        var bvalue = radOpts.getOption(opt);
        var selected = (bvalue != rpictBoolDefaults[i])
        text += "<div class=\"gridRow\">";
        text += getCheckBoxLabel(opt, "Rpict", selected)
        // add comment and 'on'/'off' value
        text += "<span class=\"defaulValue\">";
        if (bvalue == true) {
            text += rpictBoolComments[i] + " on";
        } else {
            text += rpictBoolComments[i] + " off";
        } 
        text += "</span>";
        text += "</div>"
    }
    return text;
}

function setRenderOptionsJSON(text) {
    //log.debug("setRenderOptionsJSON()")
    var json = decodeJSON(text);
    try {
        eval("var renderOpts = " + json);
    } catch (e) {
        logError(e)
        var renderOpts = new Array();
    }
    var text = '<b>render settings:</b><br/>';
    for(var j=0; j<renderOpts.length; j++) {
        var attrib = renderOpts[j];
        if(attrib != null) {
            radOpts.setValue(attrib.name, attrib.value);
            var line = '&nbsp;&nbsp;<b>' + attrib.name + ':</b> ' + attrib.value + '<br/>';
            text = text + line;
        }
    }
    updateRenderFormValues();
    updateRpictValues();
    updateRenderLine();
    setStatusMsg(text);
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
    if (opt.match(/ImageSize/)) {
        updateImageSizeDisplay();
    } else {
        setSelectionValue(other, radOpts[opt]);
    }
}

function onRadOptionChange(id) {
    var opt=id.slice(3);    
    //log.debug("onRadOptionChange() opt='" + opt + "'");
    if (opt == "Penumbras") {
        radOpts[opt] = document.getElementById(id).checked;
    } else if (opt == "ZoneSize") {
        radOpts[opt] = parseFloat(document.getElementById(id).value);
    } else if (opt == "Indirect") {
        radOpts[opt] = parseInt(document.getElementById(id).value);
    } else {
        var suffix = id.slice(-2);
        if (suffix == "_1" || suffix == "_2") {
            opt = opt.slice(0,-2)
        }
        radOpts.setValue(opt, document.getElementById(id).value);
        if (suffix == "_1" || suffix == "_2") {
            syncRadOption(id);
        }
    }
    _onRpictOverrideUpdate();
}

function onRenderLineChange(inText) {
    parseRenderLine(inText)
    _updateRpictOptionDisplay();
    updateRenderLine();
    applyRenderOptions();
}

function enableRpictOverride(opt) {
    setOverride(opt, radOpts.getOption(opt));
    _onRpictOverrideUpdate();
}

function disableRpictOverride(opt) {
    removeOverride(opt);
    _onRpictOverrideUpdate();
}

function _onRpictOverrideUpdate() {
    updateRpictValues();
    updateRenderLine();
    applyRenderOptions();
}

function parseRenderLine(inText) {
    // validate render line input and set overrides
    if (inText == '') {
        inText = document.getElementById('radRenderLine_2').value;
    }
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
        if (opt.charAt(0) == "-") {
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
            if (opt == "av" && isNaN(value) == false) {
                // check for green and blue values (which are ignored ...)
                var r = value;
                var g = value;
                var b = value;
                i += 1;
                g = parseFloat(parts[i+1]);
                if (isNaN(g) == false) {
                    log.info("'-av' value for green=" + g)
                    i += 1;
                    b = parseFloat(parts[i+1]);
                    if (isNaN(b) == false) {
                        log.info("'-av' value for blue=" + b)
                        i += 1;
                    } else {
                        log.error("'-av' value for blue not a number: " + parts[i+1] )
                        g = value;
                        b = value;
                    }
                } else {
                    log.error("'-av' value for green not a number: " + parts[i+1] )
                    g = value;
                }
                setOverride('av', [r,g,b])
            } else if (isNaN(value) == false) {
                setOverride(opt, value);
                i += 1;
            } else {
                log.error("'" + opt + "' argument is not a number: '" + parts[i] + "'");
                log.error(" => option ignored");
            }
        } 
        // dont forget to increase counter!
        i += 1;
    }
    // if '-i' was removed reset image type
    if (removeIrr == true) {
        setImageType('normal')
    }

}

function setImageType(imgType) {
    // set new image type and sync select boxes
    radOpts.ImageType = imgType;
    syncRadOption('radImageType_1');
    syncRadOption('radImageType_2');
}

function parseBoolOverride(txt) {
    var lastChar = txt.charAt(txt.length-1)
    if (lastChar == '-' || lastChar == '+') {
        var opt = txt.slice(0,txt.length-1);
    } else {
        var opt = txt
    }
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
}

function updateRenderFormValues() {
    // set dialog options to values of radOpts
    setSelectionValue('radQuality_1', radOpts.Quality);
    setSelectionValue('radQuality_2', radOpts.Quality);
    setSelectionValue('radDetail_1', radOpts.Detail);
    setSelectionValue('radDetail_2', radOpts.Detail);
    setSelectionValue('radVariability_1', radOpts.Variability);
    setSelectionValue('radVariability_2', radOpts.Variability);
    
    setSelectionValue('radImageType_1',  radOpts.ImageType);
    setSelectionValue('radImageType_2',  radOpts.ImageType);
    
    document.getElementById('radImageSizeX_1').value = radOpts.ImageSizeX;
    document.getElementById('radImageSizeX_2').value = radOpts.ImageSizeX;
    document.getElementById('radImageSizeY_1').value = radOpts.ImageSizeY;
    document.getElementById('radImageSizeY_2').value = radOpts.ImageSizeY;
    
    document.getElementById('radPenumbras').checked = radOpts.Penumbras;
    setSelectionValue('radReport', radOpts.Report);
    document.getElementById('radZoneSize').value = radOpts.ZoneSize; 
    setSelectionValue('radZoneType', radOpts.ZoneType);
    document.getElementById('radReportFile').value = radOpts.ReportFile;
}

function updateRenderLine() {
    var text = radOpts.getRenderLine();
    document.getElementById("radRenderLine_1").innerHTML = text;
    document.getElementById("radRenderLine_2").value = text;
}

function _updateRpictOptionDisplay() {
    // return HTML code for rpict option overrides
    var options = ["ambient",    "aa", "ab", "ad", "ar", "as", "aw",
                   "NEWCOL", 
                   "direct",     "dc", "dj", "dp", "dr", "ds", "dt",
                   "limits",     "lr", "lw",
                   "NEWCOL",
                   "pixel",      "pa", "pd", "pj", "pm", "ps", "pt",
                   "specular",   "sj", "st"]
    
    // start with 'rpictOptions' column
    text = "<div class=\"rpictOptions\">"
    for (var i=0; i<options.length; i++) {
        var opt = options[i];
        if (opt == "") {
            text += "&nbsp;<br />";
        } else if (opt == "NEWCOL") {
            text += "</div>";
            text += "<div class=\"rpictOptions\">";
        } else if (opt.length > 2) {
            //text += "<span class=\"rpictOverrideHeader\">" + opt + "</span><br/>";
            text += "<div class=\"rpictOverrideHeader\">" + opt + "</div>";
        } else {
            text += getRpictOptionSpan(opt)
        }
    }
    text += "</div>"
    
    // wider column for -av and bool options
    text += "<div class=\"rpictOptions\" id=\"rpictOptionsRight\">";
    // -av option (3 text inputs)
    text += "<div class=\"rpictOverrideHeader\">ambient value</div>";
    text += getRpictOptionSpan("av")
    // bool options
    text += "<div class=\"rpictOverrideHeader\">bool options</div>";
    text += getRpictOptionSpansBool();
    text += "</div>";
    
    // add to document
    document.getElementById("rpictOptionsDisplay").innerHTML = text;
    // set restrictions on text input fields
    $('.valueInput').numeric({allow:"."});
    $('.valueInputInt').numeric({allow:""});
    $('.valueInputIntN').numeric({allow:"-"});
}

function updateRpictValues() {
    //log.debug("updateRpictValues()");
    radOpts.setRpictOptions();
    updateImageSizeDisplay();
    _updateRpictOptionDisplay();
}

function updateImageSizeDisplay() {
    var opt = "ImageSizeX";
    document.getElementById("rad" + opt + "_1").value = radOpts[opt];
    document.getElementById("rad" + opt + "_2").value = radOpts[opt];
    var opt = "ImageSizeY";
    document.getElementById("rad" + opt + "_1").value = radOpts[opt];
    document.getElementById("rad" + opt + "_2").value = radOpts[opt];
}

function validateRpictOverride(opt) {
    // validate rpict arg against int or float;
    try {
        if (opt == "av") {
            //log.debug("validateRpictOverride('av')");
            var colors = ['r', 'g', 'b'];
            var newValue = radOpts.getRpictOverride(opt);
            for (var i=0; i<colors.length; i++) {
                var c = colors[i];
                var id = "valueInput" + opt + "_" + c;
                var value = document.getElementById(id).value;
                //log.debug(id + ": " + value)
                if (isNaN(parseFloat(value))) {
                    log.error("validateRpictOverride('av')" + c + " is not a color ('" + value + "')");
                    document.getElementById(id).value = newValue[i].toFixed(3);
                    return;
                } else {
                    newValue[i] = parseFloat(value);
                }
            }
            setOverride(opt, newValue);
        } else {
            var id = "valueInput" + opt;
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
        }
        updateRenderLine();
        applyRenderOptions();
    } catch(e) {
        log.error(e.message)
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

