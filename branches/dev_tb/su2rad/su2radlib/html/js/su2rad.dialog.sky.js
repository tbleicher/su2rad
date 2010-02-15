
var su2rad = su2rad ? su2rad : new Object()
su2rad.dialog = su2rad.dialog ? su2rad.dialog : new Object()

su2rad.dialog.sky = su2rad.dialog.sky ? su2rad.dialog.sky : new Object()



su2rad.dialog.sky.onGenskyInputChanged = function(opt) {
    log.debug("onGenskyInputChanged(opt='" + opt + "')");
    var id = "genskyOptionInput" + opt;
    var val = document.getElementById(id).value;
    var v = parseFloat(val);
    if (isNaN(v)) {
        alert("value is not a number: '" + val + "'");
        document.getElementById(id).value = su2rad.settings.sky[opt];
    } else {
        su2rad.settings.sky.setValue(opt, v);
    }
    // document.getElementById('skyCommandLine').innerHTML = su2rad.settings.sky.toString();
    this.update();
    applySkySettings();
}

su2rad.dialog.sky.setDateTime = function(id) {
    log.debug("onSkyDateTimeChange(id='" + id + "'");
    var val = document.getElementById(id).value;
    if (val.indexOf('0') == 0 && val.length == 2) {
        val = val.substring(1,2);
    }
    val = parseInt(val);
    if (su2rad.settings.skytime.setValue(id, val) == true) {
        log.info("new value for '" + id + "': '" + val + "'");
    } else {
        alert("value out of range:\nid='" + id + "'\nvalue='" + val + "'");
    }
    document.getElementById(id).value = su2rad.settings.skytime.getValueString(id);
    if (id == 'skyDateMonth') {
        document.getElementById('skyDateDay').value = su2rad.settings.skytime.getValueString('skyDateDay');
    }
    su2rad.settings.location.setValue('ShadowTime_time_t', su2rad.settings.skytime.getShadowTime()); 
    this.update()
    applySkySettings();
}

su2rad.dialog.sky.setGenerator = function(generator) {
    //var generator = document.getElementById('skyGenerator').value;
    su2rad.settings.sky.setGenerator(generator);
    this.updateOptionsDisplay()
    this.update()
    applySkySettings();
}

su2rad.dialog.sky.onSkyTypeChange = function() {
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
    stype = sun+stype;
    if (su2rad.settings.sky.setSkyType(stype)) {
        log.info("new sky type: '" + stype + "'");
    } else {
        log.error("onSkyTypeChange(): error setting sky type '" + stype + "'");
    }
    //document.getElementById('skyCommandLine').innerHTML = su2rad.settings.sky.toString();
    this.update()
    applySkySettings();
}

su2rad.dialog.sky.updateOptionsDisplay = function() {
    setSelectionValue('skyGenerator', su2rad.settings.sky.generator);
    if (su2rad.settings.sky.generator == 'gensky') {
        this._updateGenskyOptions();
        this.updateSkyTypeDisplay();
    }
    this.setOptionsVisibility(su2rad.settings.sky.generator); 
}

su2rad.dialog.sky.setOptionsVisibility = function(generator) {
    //log.debug("setOptbionsVisibility('" + generator + "')");
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

su2rad.dialog.sky.setSkyCmdLine = function () {
    // update command line showing sky generator options
    var loc = su2rad.settings.location.City + ", "+ su2rad.settings.location.Country;
    document.getElementById("skySummaryLocation").innerHTML = loc;
    document.getElementById("skySummaryNorth").innerHTML = su2rad.settings.location.NorthAngle.toFixed(2);
    var sky = su2rad.settings.location.toGenskyString();
    document.getElementById("skySummaryOptions").innerHTML = sky;
    document.getElementById("skyCommandLine").innerHTML = '<b>cmd:</b> ' + sky;
    su2rad.dialog.setStatusMsg(sky);
}

su2rad.dialog.sky.updateSkyDateTimeDisplay = function () {
    document.getElementById('skyDateMonth').value = su2rad.settings.skytime.getValueString('skyDateMonth');
    document.getElementById('skyDateDay').value = su2rad.settings.skytime.getValueString('skyDateDay');
    document.getElementById('skyTimeHour').value = su2rad.settings.skytime.getValueString('skyTimeHour');
    document.getElementById('skyTimeMinute').value = su2rad.settings.skytime.getValueString('skyTimeMinute');
}

su2rad.dialog.sky.updateDialog = function () {
    // update sky related dialog elements
    this.updateOptionsDisplay();
    this.updateSkyDateTimeDisplay();
    this.setSkyCmdLine()
}

su2rad.dialog.sky.updateSkyTypeDisplay = function () {
    // set sky type selector and sun check box
    if (su2rad.settings.sky.generator == 'gensky') {
        if (su2rad.settings.sky.skytype.charAt(0) == "+") {
            document.getElementById('sunOptionCB').checked = true;
        } else {
            document.getElementById('sunOptionCB').checked = false;
        }
        setSelectionValue('genskySkyType', su2rad.settings.sky.skytype.charAt(1));
        if (su2rad.settings.sky.skytype.charAt(1) == 'i' || su2rad.settings.sky.skytype.charAt(1) == 's') {
            document.getElementById('genskySunOption').style.display = '';
        } else {
            document.getElementById('genskySunOption').style.display = 'none';
        }
    }
}
    
su2rad.dialog.sky._updateGenskyOptions = function () {
    var text = "<div class=\"optionsHeader\" style=\"width:330px;\">";
    text += "<span class=\"gridLabel\" style=\"width:240px;\">gensky options:</span>";
    text += "</div>";
    text += "<div class=\"genskyOptions\" style=\"width:100px;\">";
    text += "<div class=\"rpictOverrideHeader\" style=\"width:80px;\">general</div>";
    text += this._updateGenskyOptionsDiv("g");
    text += this._updateGenskyOptionsDiv("t");
    text += "</div>";
    text += "<div class=\"genskyOptions\">";
    var opts = ["sky radiance","-b","-B","solar radiance","-r","-R"];
    for (var i=0; i<opts.length; i++) {
        opt = opts[i];
        if (opt.charAt(0) != '-') {
            text += "<div class=\"rpictOverrideHeader\">" + opt + "</div>";
        } else {
            text += this._updateGenskyOptionsDiv(opt.charAt(1));
        }
    }
    text += "</div>";
    document.getElementById("skyOptsGensky").innerHTML = text;
    $('.skyOptionInput').numeric({allow:"."});
}

su2rad.dialog.sky._updateGenskyOptionsDiv = function(opt) {
    //log.debug("_updateskyOptionsDiv(opt='" + opt + "')");
    var text = "";
    var state = "";
    if (su2rad.settings.sky.isActive(opt) == true) {
        state = "checked";
    }
    if (opt == 'g' || opt == 't') {
        var text = "<div class=\"gridRow\" style=\"width:85px;\">";
        text += "<a class=\"gridLabel\" style=\"width:25px;\">-" + opt + ":";
        text += getToolTip('gensky', opt)
        text += "</a>";
        text += "<input type=\"text\" class=\"valueInput\"";
        text += " id=\"genskyOptionInput" + opt + "\"";
        text += " value=\"" + su2rad.settings.sky[opt] + "\"";
        text += " onChange=\"su2rad.dialog.sky.onGenskyInputChanged('" + opt + "')\" />";
        text += "</div>"
        return text;
    } else {
        var labels = {};
        labels.b = "diffuse normal"
        labels.B = "diffuse horizontal"
        labels.r = "direct normal" 
        labels.R = "direct horizontal" 
        var text = "<div class=\"gridRow\">";
        text += this.getCheckBoxLabel(opt, labels[opt]);
        if (su2rad.settings.sky.isActive(opt) == true) {
            text += "<input type=\"text\" class=\"valueInput\"";
            text += " id=\"genskyOptionInput" + opt + "\"";
            text += " value=\"" + su2rad.settings.sky[opt] + "\"";
            text += " onChange=\"su2rad.dialog.sky.onGenskyInputChanged('" + opt + "')\" />";
        } else {
            text += "<span class=\"defaultValue\">[not set]</span>";
        }
        text += "</div>"
        return text;
    }
}

su2rad.dialog.sky.getCheckBoxLabel = function(opt, label) {
    // return label and checkbox with onclick action set 
    // TODO: change to DOM elements with closure function
    if (!label || label == '') {
        label = "-" + opt;
    }
    if (su2rad.settings.sky.isActive(opt) == true) {
        var action = " onClick=\"su2rad.dialog.sky.enableGenskyOption('" + opt + "','false')\" "
        var text = '<input type="checkbox" ' + action + 'checked />';
    } else {
        var action = " onClick=\"su2rad.dialog.sky.enableGenskyOption('" + opt + "','true')\" "
        var text = '<input type="checkbox" ' + action + ' />';
    }
    text += '<a class="gridLabel" ' + action + ' >' + label + ':';
    text += getToolTip("gensky", opt);
    text += "</a>";
    return text;
}

su2rad.dialog.sky.enableGenskyOption = function(opt,enable) {
    if (enable == "false") {
        enable = false
    } else if ( enable == "true") {
        enable = true
    }
    log.debug("enableGenskyOption(opt='" + opt + "'");
    su2rad.settings.sky.setActive(opt, enable);
    this._updateGenskyOptions();
    this.update();
    applySkySettings();
}

su2rad.dialog.sky.update = function () {
    log.debug("updating 'Sky' page ...");
    su2rad.dialog.location.update();
    this.updateDialog()
    su2rad.dialog.googleMap.updateLocation();
    // enable 'apply' if location or time has changed
    if (su2rad.settings.location.changed == true || su2rad.settings.skytime.changed == true) {
        document.getElementById("applyLocationValues").disabled=false;
        document.getElementById("reloadShadowInfo").disabled=false;
    } else {
        document.getElementById("applyLocationValues").disabled=true;
        document.getElementById("reloadShadowInfo").disabled=true;
    }
    su2rad.settings.skytime.getShadowTime();
}


