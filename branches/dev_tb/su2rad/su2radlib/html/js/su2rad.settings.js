

var su2rad = su2rad ? su2rad : new Object()
su2rad.dialog = su2rad.dialog ? su2rad.dialog : new Object()
su2rad.dialog.exporter = su2rad.dialog.exporter ? su2rad.dialog.exporter : new Object()
    
function ExportSettingsObject() {
    this.scenePath = '.';
    this.sceneName = 'unnamed.rif';
    this.exportMode = 'by color';
    this.global_coords = true;
    this.textures = false;
    this.triangulate = false;
    this.radSunpath = false;
}

ExportSettingsObject.prototype._setBool = function(name,value) {
    if (value == true || value == 'true') {
        this[name] = true;
    } else {
        this[name] = false;
    }
}

ExportSettingsObject.prototype.setExportPath = function(path) {
    // extract project path and scene name from <path>
    // path = base directory for export
    // name = scene name with out '.rif' extension
    var pf = su2rad.utils.splitPath(path);
    this.scenePath = pf[0];
    
    if (pf[1].match(/\.rif$/i)) {               // log.debug("2 match for '*.rif'");
        this.sceneName = pf[1].slice(0,-4);
        
    } else if (pf[1].match(/\.skp$/i)) {        // log.debug("2 match for '*.skp'");
        // add directory to path? 
        this.scenePath += pf[1].slice(0,-4);
        // sceneName unchanged
        
    } else if (pf[1].match(/\.[a-z]{3}$/i)) {   // log.debug("2 match for any extension");
        this.sceneName = pf[1].slice(0,-4) ;
    
    } else {                                    // log.debug("2 no match");
        this.sceneName = pf[1];
    }
} 


ExportSettingsObject.prototype.setMode = function(val) {
    var value = val.replace(/_/g," ");
    this.exportMode = value;
    if (value == 'by group') {
        this.global_coords = document.getElementById('global_coords').checked;
    } else if (value == 'by color') {
        this.global_coords = true;
        su2rad.dialog.showExportOption('textures'); 
    } else {
        this.global_coords = true;
        this.textures = false;
        su2rad.dialog.hideExportOption('textures');
    }
}

ExportSettingsObject.prototype.setValue = function(name,value) {
    log.debug("setValue: '" + name + "' = '" + value + "'");
    switch (name) {
    case 'exportMode': 
        this.setMode(value);
        break;
    case 'triangulate':
        this._setBool(name,value);
        break;
    case 'global_coords':
        this._setBool(name,value);
        break;
    case 'textures':
        this._setBool(name,value);
        break;
    case 'radSunpath':
        this._setBool(name,value);
        break;
    default:
        this[name] = value;
        break;
    }
}

ExportSettingsObject.prototype.toString = function() {
    text  =  'scenePath='     + this.scenePath;
    text += '&sceneName='     + this.sceneName;
    text += '&triangulate='   + this.triangulate;
    text += '&textures='      + this.textures;
    text += '&exportMode='    + this.exportMode;
    text += '&global_coords=' + this.global_coords;
    text += '&radSunpath='    + this.radSunpath;
    return text
}

ExportSettingsObject.prototype.setOption = function (opt, val) {
    this.setValue(opt, val);
    applyExportOptions();
}

ExportSettingsObject.prototype.setOptionsFromArray = function (array) {
    var text = '<b>new export settings:</b><br/>';
    for(var j=0; j<array.length; j++) {
        var attrib = array[j];
        if(attrib != null) {
            this.setValue(attrib.name, attrib.value);
            var line = '&nbsp;&nbsp;<b>' + attrib.name + ':</b> ' + attrib.value + '<br/>';
            text += line;
        }
    }
    log.debug(text);
}



function SkyOptionsObject() {
    this.generator = "gensky";
    this.skytype = "-c";
    this.g = 0.2;
    this.t = 1.7;
    this.b = 1;
    this.B = 1;
    this.r = 1;
    this.R = 1;
    this._activeOptions = {};
    this._activeOptions.g = false;
    this._activeOptions.t = false;
    this._activeOptions.b = false;
    this._activeOptions.B = false;
    this._activeOptions.r = false;
    this._activeOptions.R = false;
    this.logging = true;
}

SkyOptionsObject.prototype.isActive = function (opt) {
    try {
        var active = this._activeOptions[opt];
    } catch (e) {
        var active = false;
    }
    return active;
}

SkyOptionsObject.prototype.setSkyType = function (stype) {
    if (stype.length != 2) {
        return false;
    }
    var s = stype.charAt(1);
    if ( s == 'u' || s == 'c' || s == 'i' || s == 's' ) {
        if (stype.charAt(0) == '+' || stype.charAt(0) == '-') {
            if (stype != this.skytype) {
                log.debug("new skytype: '" + stype + "'");
            }
            this.skytype = stype;
            return true;
        }
    }
    return false;
}

SkyOptionsObject.prototype.parseSkyCommand = function (cmdline) {
    // set sky options from sky command
    if (cmdline == '') {
        return
    }
    log.debug("parsing '" + cmdline + "'");
    this.logging = false; // stop info level logging
    if (cmdline.charAt(0) == '!') {
        cmdline = cmdline.substring(1,cmdline.length);
    }
    var parts = cmdline.split(' ');
    this.setGenerator(parts[0])
    //TODO: move option parsing to generator 
    for (i=1; i<parts.length; i++) {
        var opt = parts[i];
        if (this.setSkyType(opt) == true) {
            // log.debug("new skytype: '" + opt + "'");
        } else if (opt == '-ang') {
            log.warn("sky option '-ang' ignored")
            if (i < parts.length-2) {
                var alt = parts[i+1];
                var azi = parts[i+2];
                if ( isNaN(parseFloat(alt)) ) {
                    log.error("value for altitude is not a number: '" + alt + "'" );
                } 
                if ( isNaN(parseFloat(alt)) ) {
                    log.error("value for azimuth is not a number: '" + azi + "'" );
                } 
                // TODO check next two args
            } else {
                log.error("incomplete option '" + opt + "' ignored");
            }
        } else if (isNaN(parseFloat(opt)) == false) {
            // skip argument to previous option
        } else if (opt.length == 2 && opt.charAt(0) == '-') {
            if (i < parts.length-1) {
                var arg = parts[i+1];
                if (this.setValue(opt, arg) == true) {
                    i += 1;
                } else {
                    log.error("value for option '" + opt + "' is not a number: '" + arg + "'" );
                }
            } else {
                log.error("incomplete option '" + opt + "' ignored");
            }
        }
    }
    this.logging = true; // resume info level logging
    // show sky options?
}

SkyOptionsObject.prototype.removeOption = function (opt) {
    if (opt == 'g') {
        this.g = 0.2;
    } else if (opt == 't') {
        this.t = 1.7;
    } else {
        this[opt] = '';
    }
}

SkyOptionsObject.prototype.setActive = function (opt, checked) {
    //log.debug("setActive('" + opt + "', '" + checked + "'");
    if (opt == 'g' || opt == 't') {
        this._activeOptions[opt] = checked;
    } else {
        this._activeOptions[opt.toLowerCase()] = false;
        this._activeOptions[opt.toUpperCase()] = false;
        this._activeOptions[opt] = checked;
    }
    if (this.logging) {
        if (checked) {
            log.info("new active option '" + opt + "' (value='" + this[opt] + "')");
        } else {
            log.info("option '" + opt + "' disabled");
        }
    }       
}

SkyOptionsObject.prototype.setGenerator = function(val) {
    log.debug("SkyOptionsObject.setGenerator('" + val + "')")
    var oldGen = this.generator;
    if (su2rad.dialog.sky.hasGenerator(val)) {
        this.generator = val
    } else if ( val.charAt(0) == "-" ) {
        // sky command option; return false for parseSkyCommand 
        return false
    } else {
        log.error("'unknown sky generator '" + val + "'; generator unchanged")
        return false;
    }
    if (oldGen != this.generator) {
        log.debug("new generator: '" + this.generator + "'");
    }
    return true;
}

SkyOptionsObject.prototype.setValue = function(opt, val) {
    //log.debug("setValue(opt='" + opt + "', val='" + val + "'");
    if (opt.length == 2 && opt.charAt(0) == '-') {
        opt = opt.charAt(1);
    }
    var v = parseFloat(val);
    if (isNaN(v)) {
        return false;
    } else {
        this.setActive(opt, true);
        if (this[opt] != v) {
            log.debug("new value for option '" + opt + "': '" + v + "'");
        }
        this[opt] = v;
    }
    if (opt == 'g' && v == 0.2) {
        this.setActive('g', false);
    } else if (opt == 't' && v == 1.7) {
        this.setActive('t', false);
    }
    return true;
}
    
SkyOptionsObject.prototype.toString = function() {
    var text = this.generator;
    text += " " + su2rad.settings.skytime.toGenskyString();
    text += " " + this.skytype;
    var opts = ['g', 't', 'b', 'B', 'r', 'R'];
    for(var i=0; i<opts.length; i++) {
        var opt = opts[i];
        if (this._activeOptions[opt] == true) {
            text += " -" + opt + " " + this[opt].toFixed(3);
        }
    }
    return text;
}



function SkyDateTimeObject() {
    this.skyDateMonth = 3;
    this.skyDateDay = 21;
    this.skyTimeHour = 12;
    this.skyTimeMinute = 00;
    this._maxDays = [31,28,31,30,31,30,31,31,30,31,30,31];
    this._time_t = 0; //XXX should be correct for 12:00 Mar 21st
    this.changed = false;
}

SkyDateTimeObject.prototype.getValueString = function (id) {
    var s = this[id].toString();
    if (s.length == 1) {
        s = '0' + s;
    }
    return s;
}

SkyDateTimeObject.prototype.setValue = function (id,val) {
    if (this._checkLimit(id,val) == false) {
        log.warn("value out of range: id='" + id + "' val='" + val + "'");
        return false;
    }
    this[id] = val;
    this.changed = true;
    if (id == 'skyDateMonth') {
        var maxdays = this._maxDays[val-1];
        if (this.skyDateDay > maxdays) {
            this.skyDateDay = maxdays;
        }
    }
    return true;
}

SkyDateTimeObject.prototype.setFromShadowTime_time_t = function (time_t) {
    this._time_t = time_t;
    var sdate = new Date(time_t*1000);
    this.skyDateMonth  = sdate.getUTCMonth()+1;
    this.skyDateDay    = sdate.getUTCDate();
    this.skyTimeHour   = sdate.getUTCHours();
    this.skyTimeMinute = sdate.getUTCMinutes();
    this.changed = false;
    /*XXX
    var text = "stime='" + stime + "'<br/> ";
    text += "msec=" + msec + "<br/>";
    text += "sdate=" + sdate + "<br/>";
    text += "GMTstring=" + sdate.toGMTString() + "<br/>";
    text += "UTCstring=" + sdate.toUTCString() + "<br/>";
    text += "gensky=" + this.toGenskyString() + "<br/>";
    su2rad.dialog.setStatusMsg(text);
    */
}

SkyDateTimeObject.prototype.getShadowTime = function () {
    var newDate = new Date();
    newDate.setUTCFullYear(2002);
    newDate.setUTCMonth(this.skyDateMonth-1);
    newDate.setUTCDate(this.skyDateDay);
    newDate.setUTCHours(this.skyTimeHour);
    newDate.setUTCMinutes(this.skyTimeMinute);
    newDate.setUTCSeconds(0);
    newDate.setUTCMilliseconds(0);
    //var text = "new_t: " + Date.parse(newDate.toUTCString())/1000 + "<br/>";
    return Date.parse(newDate.toUTCString()) / 1000
}

SkyDateTimeObject.prototype._checkLimit = function (id,val) {
    // check value of input field against allowed limits
    if (id.indexOf('Date') > 0 && val == 0) {
        return false;
    }
    var max = 12;
    if (id == 'skyDateMonth') {
        max = 12;
    } else if (id == 'skyDateDay') {
        max = this._maxDays[this.skyDateMonth-1];
    } else if (id == 'skyTimeHour') {
        max = 23;
    } else if (id == 'skyTimeMinute') {
        max = 59;
    }
    // return true or false
    if (max >= val) {
        return true;
    } else {
        return false;
    }
}

SkyDateTimeObject.prototype.toGenskyString = function () {
    var text = this.skyDateMonth + " " + this.skyDateDay + " ";
    text += this.skyTimeHour + ":" + this.skyTimeMinute;
    return text;
}




