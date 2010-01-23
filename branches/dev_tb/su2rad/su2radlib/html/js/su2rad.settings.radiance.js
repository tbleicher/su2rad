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
        } else if (su2rad.dialog.radiance.rpictBoolOptions.indexOf(opt) >= 0) {
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
    if (su2rad.dialog.radiance.rpictBoolOptions.indexOf(opt) >= 0) {
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
    for (var idx=0; idx<su2rad.dialog.radiance.rpictBoolOptions.length; idx++) {
        if (su2rad.dialog.radiance.rpictBoolOptions[idx] == opt) {
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
    if (su2rad.dialog.radiance.rpictBoolOptions.indexOf(opt) >= 0) {
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
    for (var idx=0; idx<su2rad.dialog.radiance.rpictBoolOptions.length; idx++) {
        if (su2rad.dialog.radiance.rpictBoolOptions[idx] == opt) {
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

