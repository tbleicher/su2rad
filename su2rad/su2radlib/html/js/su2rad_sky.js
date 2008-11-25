

function SkyOptionsObject() {
    this.generator = "gensky";
    this.skytype = "-c";
    this.g = 0.2;
    this.t = 1.7;
    this.b = -1;
    this.B = -1;
    this.r = -1;
    this.R = -1;
    this._activeOptions = {};
    this._activeOptions.b = false;
    this._activeOptions.B = false;
    this._activeOptions.r = false;
    this._activeOptions.R = false;
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
    var s = stype[1];
    if ( s == 'u' || s == 'c' || s == 'i' || s == 's' ) {
        if (stype[0] == '+' || stype[0] != '-') {
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
    if (cmdline[0] == '!') {
        cmdline = cmdline.substring(1,cmdline.length);
    }
    var parts = cmdline.split(' ');
    for (i=0; i<parts.length; i++) {
        var opt = parts[i];
        if (this.setGenerator(opt) == true) {
            log.info("new generator: '" + opt + "'");
        } else if (this.setSkyType(opt) == true) {
            log.info("new skytype: '" + opt + "'");
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
        } else if (opt.length == 2 && opt[0] == '-') {
            if (i < parts.length-1) {
                var arg = parts[i+1];
                if (this.setValue(opt, arg) == true) {
                    log.info("new value for option '" + opt + "': '" + arg + "'");
                    i += 1;
                } else {
                    log.error("value for option '" + opt + "' is not a number: '" + arg + "'" );
                }
            } else {
                log.error("incomplete option '" + opt + "' ignored");
            }
        }
    }
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
    //log.debug("setActive o=" + opt + " checked=" + checked); 
    if (opt == 'g' || opt == 't') {
        this._activeOptions[opt] = checked;
    } else {
        this._activeOptions[opt.toLowerCase()] = false;
        this._activeOptions[opt.toUpperCase()] = false;
        this._activeOptions[opt] = checked;
    }
}

SkyOptionsObject.prototype.setGenerator = function(val) {
    if (val == 'gensky') {
        this.generator = 'gensky';
        // TODO enable gensky options
        return true;
    } else if (val == 'gendaylit') {
        this.generator = 'gendaylit';
        // TODO enable gendaylit options
        alert("'gendaylit' not enabled yet\ndefault to 'gensky'")
        this.generator = 'gensky';
        return true;
    } else if (val == 'hdr-image') {
        this.generator = 'hdr-image';
        // TODO enable hdr options
        alert("'hdr-image' not enabled yet\ndefault to 'gensky'")
        this.generator = 'gensky';
        return true;
    }
    return false;
}

SkyOptionsObject.prototype.setValue = function(opt, val) {
    if (opt.length == 2 && opt[0] == '-') {
        opt = opt[1];
    }
    var v = parseFloat(val);
    if (isNaN(v)) {
        return false;
    } else {
        this[opt] = v;
        this.setActive(opt, true);
        return true;
    }
}
    
SkyOptionsObject.prototype.toString = function() {
    var text = this.generator;
    text += " " + skyDateTime.toGenskyString();
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

var skyOptions = new SkyOptionsObject();

function SkyDateTimeObject() {
    this.skyDateMonth = 3;
    this.skyDateDay = 21;
    this.skyTimeHour = 12;
    this.skyTimeMinute = 00;
    this._maxDays = [31,28,31,30,31,30,31,31,30,31,30,31];
}

SkyDateTimeObject.prototype.getValueString = function (id) {
    var s = this[id].toString();
    if (s.length == 1) {
        s = '0' + s;
    }
    return s;
}

SkyDateTimeObject.prototype.set = function (id,val) {
    if (this._checkLimit(id,val) == false) {
        return false;
    }
    this[id] = val;
    if (id == 'skyDateMonth') {
        var maxdays = this._maxDays[val-1];
        if (this.skyDateDay > maxdays) {
            this.skyDateDay = maxdays;
        }
    } 
}

SkyDateTimeObject.prototype.setFromShadowTime = function (stime) {
    var msec = Date.parse(stime);
    var sdate = new Date(msec);
    this.skyDateMonth  = sdate.getUTCMonth()+1;
    this.skyDateDay    = sdate.getUTCDate();
    this.skyTimeHour   = sdate.getUTCHours();
    this.skyTimeMinute = sdate.getUTCMinutes();
    /*XXX
    var text = "stime='" + stime + "'<br/> ";
    text += "msec=" + msec + "<br/>";
    text += "sdate=" + sdate + "<br/>";
    text += "GMTstring=" + sdate.toGMTString() + "<br/>";
    text += "UTCstring=" + sdate.toUTCString() + "<br/>";
    text += "gensky=" + this.toGenskyString() + "<br/>";
    setStatusMsg(text);
    */
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

var skyDateTime = new SkyDateTimeObject();

function onSkyGenChange() {
    var sel = document.getElementById('skyGenerator');
    skyOptions.setGenerator(sel.value);
    for (i=0; i<sel.options.length; i++) {
        if (sel.options[i].value == skyOptions.generator) {
            sel.selectedIndex = i;
        }
    }
    updateSkyOptionsDisplay()
}

function onSkyDateTimeChange(id) {
    var val = document.getElementById(id).value;
    if (val.indexOf('0') == 0 && val.length == 2) {
        val = val.substring(1,2);
    }
    val = parseInt(val);
    skyDateTime.set(id, val);
    document.getElementById(id).value = skyDateTime.getValueString(id);
    if (id == 'skyDateMonth') {
        document.getElementById('skyDateDay').value = skyDateTime.getValueString('skyDateDay');
    }
}

function updateSkyDateTimeDisplay() {
    document.getElementById('skyDateMonth').value = skyDateTime.getValueString('skyDateMonth');
    document.getElementById('skyDateDay').value = skyDateTime.getValueString('skyDateDay');
    document.getElementById('skyTimeHour').value = skyDateTime.getValueString('skyTimeHour');
    document.getElementById('skyTimeMinute').value = skyDateTime.getValueString('skyTimeMinute');
}

function updateGenskyOptions() {
    var opts = ["general","-g","-t","zenith","-b","-B","solar","-r","-R"];
    var text = "<div class=\"optionsHeader\" style=\"width:280px;\">";
    text += "<span class=\"gridLabel\" style=\"width:240px;\">gensky options:</span>";
    for (var i=0; i<opts.length; i++) {
        opt = opts[i];
        if (opt[0] != '-') {
            text += "</div><div class=\"optionsColumn\">";
            text += "<div class=\"rpictOverrideHeader\">" + opt + "</div>";
        } else {
            text += _getGenskyOptionDiv(opt[1]);
        }
    }
    text += "</div>";
    document.getElementById("skyOptsGensky").innerHTML = text;
    $('.skyOptionInput').numeric({allow:"."});
}

function _getGenskyOptionDiv(opt) {
    var text = "";
    var style = "rpictOverride";
    var state = "";
    if (skyOptions.isActive(opt) == true) {
        style = "rpictOverrideSelected";
        state = "checked";
    }
    var text = "<div class=\"" + style + "\" style=\"width:85px;\">";
    text += "<input type=\"checkbox\" class=\"rpictCB\" id=\"genskyOptionCB_" + opt + "\"";
    text += " onchange=\"onGenskyOptionCB('" + opt + "')\" " + state + "/>"
    text += "<span class=\"gridLabel\" style=\"width:20px;padding-left:5px;\">-" + opt + ":</span>";
    if (skyOptions.isActive(opt) == true) {
        text += "<input type=\"text\" class=\"skyOptionInput\"";
        text += " id=\"genskyOptionInput" + opt + "\"";
        text += " value=\"" + skyOptions[opt] + "\"";
        text += " onchange=\"onGenskyInputChanged('" + opt + "')\" />";
    } else if (opt == 'g' || opt == 't') {
        text += "<span class=\"gridLabel\" style=\"width:40px\">" + skyOptions[opt] + "</span>";
    }
    text += "</div>"
    return text;
}

function onGenskyOptionCB(opt) {
    var other = '';
    if (opt == "b" || opt == "r") {
        other = opt.toUpperCase();
    } else if (opt == "B" || opt == "R") {
        other = opt.toLowerCase();
    }
    if (other != '') {
        var otherid = "genskyOptionCB_" + other;
        document.getElementById(otherid).checked = false;
        if (skyOptions[opt] == -1) {
            skyOptions[opt] = 1;
        }
    }
    var checked = false;
    try {
        var cbid = "genskyOptionCB_" + opt;
        checked = document.getElementById(cbid).checked;
    } catch (e) {
        log.error(e.name + " opt=" + opt + " cbid=" + cbid);
    }
    skyOptions.setActive(opt, checked);
    updateGenskyOptions();
    setSkySummary();
}

function onGenskyInputChanged(opt) {
    var id = "genskyOptionInput" + opt;
    var val = document.getElementById(id).value;
    var v = parseFloat(val);
    if (isNaN(v)) {
        alert("value is not a number: '" + val + "'");
        document.getElementById(id).value = skyOptions[opt];;
    } else {
        skyOptions[opt] = v;
    }
    //document.getElementById('skyCommandLine').innerHTML = skyOptions.toString();
    setSkySummary();
}

function updateSkyOptionsDisplay() {
    if (skyOptions.generator == 'gensky') {
        updateGenskyOptions();
    }
    setOptionsVisibility(skyOptions.generator); 
}

function setOptionsVisibility(generator) {
    if (generator == 'gendaylit') {
        document.getElementById('genskyTypeOptions').style.display='none';
        document.getElementById('gendaylitTypeOptions').style.display='';
        document.getElementById('skyOptsGensky').style.display='none';
        document.getElementById('skyOptsGendaylit').style.display='';
        document.getElementById('skyOptsHDRImage').style.display='none';
    } else if (generator == 'hdr-image') {
        document.getElementById('genskyTypeOptions').style.display='none';
        document.getElementById('gendaylitTypeOptions').style.display='none';
        document.getElementById('skyOptsGensky').style.display='none';
        document.getElementById('skyOptsGendaylit').style.display='none';
        document.getElementById('skyOptsHDRImage').style.display='';
    } else {
        document.getElementById('genskyTypeOptions').style.display='';
        document.getElementById('gendaylitTypeOptions').style.display='none';
        document.getElementById('skyOptsGensky').style.display='';
        document.getElementById('skyOptsGendaylit').style.display='none';
        document.getElementById('skyOptsHDRImage').style.display='none';
    }
}

function setSkySummary() {
    var loc = modelLocation.City + ", "+ modelLocation.Country;
    document.getElementById("skySummaryLocation").innerHTML = loc;
    document.getElementById("skySummaryNorth").innerHTML = modelLocation.NorthAngle.toFixed(2);
    var rot = '';
    if (modelLocation.NorthAngle != 0.0) {
        rot = " | xform -rz " + modelLocation.NorthAngle.toFixed(2);
    }
    var lat = modelLocation.Latitude * 1.0;
    var lng = modelLocation.Longitude * -1.0;
    var mer = modelLocation.TZOffset * -15.0;
    latlng = " -a " + lat.toFixed(4) + " -o " + lng.toFixed(4) + " -m " + mer.toFixed(1);
    var sky = skyOptions.toString() + " " + latlng + rot;
    setStatusMsg(sky);
    document.getElementById("skySummaryOptions").innerHTML = sky;
}

function onSkyTypeChange() {
    var stype = document.getElementById('genskySkyType').value;
    if (stype == 'c' || stype == 'u') {
        document.getElementById('sunOptionCB').checked = false;
        document.getElementById('genskySunOption').style.display='none';
    } else {
        document.getElementById('genskySunOption').style.display='';
    }
    var sun = '-';
    if (document.getElementById('sunOptionCB').checked == true) {
        sun = '+';
    }
    skyOptions.setSkyType(sun + stype);
    setSkySummary()
    //document.getElementById('skyCommandLine').innerHTML = skyOptions.toString();
}

function _updateSkyFormValues () {
    
}
