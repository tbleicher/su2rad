

var su2rad = su2rad ? su2rad : new Object()
su2rad.dialog = su2rad.dialog ? su2rad.dialog : new Object()
su2rad.dialog.radiance = su2rad.dialog.radiance ? su2rad.dialog.radiance : new Object()

// arrays to look up option types and defaults
su2rad.dialog.radiance.rpictBoolOptions  = ["bv", "dv", "u", "w"];
su2rad.dialog.radiance.rpictBoolComments = ["backface", "direct", "monte carlo", "warnings"];
su2rad.dialog.radiance.rpictBoolDefaults = [true, true, false, true];
su2rad.dialog.radiance.rpictIntOptions   = ["ab","ad","ar","as","aw","dp", "dr","lr","ps"];


su2rad.dialog.radiance.getRpictOptionSpan = function (opt) {
    // return text for option span (checkbox and textfield)
    var text = "<div class=\"gridRow\">";
    var selected = su2rad.settings.radiance.rpictOverrideSelected(opt);
    text += this.getCheckBoxLabel(opt, selected, '')
    // add text input or show default value
    if (opt == "av" && selected == true) { 
        // add 3 text input fields for 'av'
        text += this.getRpictOptionInputAV(opt);
        text += "</div>"
        return text;
    } else if (selected == true) {
        if (opt == "lr") {
            text += "<input type=\"text\" class=\"valueInputIntN\"";
        } else if (this.rpictIntOptions.indexOf(opt) >= 0) {
            text += "<input type=\"text\" class=\"valueInputInt\"";
        } else {
            text += "<input type=\"text\" class=\"valueInput\"";
        } 
        text += " id=\"valueInput" + opt + "\"";
        text += " value=\"" + su2rad.settings.radiance.getOption(opt) + "\" onchange=\"su2rad.dialog.radiance.validateRpictOverride('" + opt + "')\" />";
    } else {
    	text += "<span class=\"defaultValue\">" + su2rad.settings.radiance.getOption(opt) + "</span>";
    }
    text += "</div>"
    return text;
}

su2rad.dialog.radiance.getRpictOptionInputAV = function (opt,text) {
    var text = ""
    var colors = ['r', 'g', 'b'];
    for (var i=0; i<colors.length; i++) {
        var copt = opt + "_" + colors[i]
        text += "<input type=\"text\" class=\"valueInput\"";
        text += " id=\"valueInput" + copt + "\"";
        text += " value=\"" + su2rad.settings.radiance.getOption(opt)[i] + "\" onchange=\"su2rad.dialog.radiance.validateRpictOverride('" + opt + "')\" />";
    }
    return text;
}

su2rad.dialog.radiance.getCheckBoxLabel = function (opt, selected, label) {
    if (!label || label == '') {
        label = "-" + opt;
    }
    if (selected == true) {
        var action = " onClick=\"su2rad.dialog.radiance.disableRpictOverride('" + opt + "')\" "
        var text = '<input type="checkbox" ' + action + 'checked />';
    } else {
        var action = " onClick=\"su2rad.dialog.radiance.enableRpictOverride('" + opt + "')\" "
        var text = '<input type="checkbox" ' + action + ' />';
    }
    text += '<span class="gridLabel" ' + action + ' >' + label + ':';
    text += getToolTipHTML("rpict", opt);
    text += "</span>";
    return text;
}

su2rad.dialog.radiance.getRpictOptionSpansBool = function () {
    // return text for all bool option checkboxes
    // bool options are selected if current value != default value
    var text = "";
    for (var i=0; i<this.rpictBoolOptions.length; i++) {
        var opt = this.rpictBoolOptions[i];
        var bvalue = su2rad.settings.radiance.getOption(opt);
        var selected = (bvalue != this.rpictBoolDefaults[i])
        text += "<div class=\"gridRow\">";
        text += this.getCheckBoxLabel(opt, selected, '')
        // add comment and 'on'/'off' value
        text += "<span class=\"defaulValue\">";
        if (bvalue == true) {
            text += this.rpictBoolComments[i] + " on";
        } else {
            text += this.rpictBoolComments[i] + " off";
        } 
        text += "</span>";
        text += "</div>"
    }
    return text;
}

su2rad.dialog.radiance.setRenderOptionsJSON = function (text) {
    //log.debug("setRenderOptionsJSON()")
    var json = su2rad.utils.decodeJSON(text);
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
            su2rad.settings.radiance.setValue(attrib.name, attrib.value);
            var line = '&nbsp;&nbsp;<b>' + attrib.name + ':</b> ' + attrib.value + '<br/>';
            text = text + line;
        }
    }
    this.update();
    this.updateRpictValues();
    this.updateRenderLine();
    su2rad.dialog.setStatusMsg(text);
}

su2rad.dialog.radiance.syncRadOption = function (id) {
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
        this.updateImageSizeDisplay();
    } else {
        setSelectionValue(other, su2rad.settings.radiance[opt]);
    }
}

su2rad.dialog.radiance.onRadOptionChange = function (id) {
    var opt=id.slice(3);    
    //log.debug("onRadOptionChange() opt='" + opt + "'");
    if (opt == "Penumbras") {
        su2rad.settings.radiance[opt] = document.getElementById(id).checked;
    } else if (opt == "ZoneSize") {
        su2rad.settings.radiance[opt] = parseFloat(document.getElementById(id).value);
    } else if (opt == "Indirect") {
        su2rad.settings.radiance[opt] = parseInt(document.getElementById(id).value);
    } else {
        var suffix = id.slice(-2);
        if (suffix == "_1" || suffix == "_2") {
            opt = opt.slice(0,-2)
        }
        su2rad.settings.radiance.setValue(opt, document.getElementById(id).value);
        if (suffix == "_1" || suffix == "_2") {
            this.syncRadOption(id);
        }
    }
    this.onRpictOverrideUpdate();
}

su2rad.dialog.radiance.onRenderLineChange = function (inText) {
    this.parseRenderLine(inText)
    this.updateRpictOptionDisplay();
    this.updateRenderLine();
    applyRenderOptions();
}

su2rad.dialog.radiance.enableRpictOverride = function (opt) {
    this.setOverride(opt, su2rad.settings.radiance.getOption(opt));
    this.onRpictOverrideUpdate();
}

su2rad.dialog.radiance.disableRpictOverride = function (opt) {
    this.removeOverride(opt);
    this.onRpictOverrideUpdate();
}

su2rad.dialog.radiance.onRpictOverrideUpdate = function () {
    this.updateRpictValues();
    this.updateRenderLine();
    applyRenderOptions();
}

su2rad.dialog.radiance.parseRenderLine = function (inText) {
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
        su2rad.settings.radiance.removeAllOverrides();
        this.setImageType('normal')
        this.updateRpictValues();
    }
    var removeIrr = false;
    if (su2rad.settings.radiance.ImageType != "normal") {
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
            if (su2rad.settings.radiance.ImageType == "normal") {
                this.setImageType('irridiance')
            }
        } else if (this.rpictBoolOptions.indexOf(opt.slice(0,-1)) >= 0) {
            this.parseBoolOverride(opt)
        } else if (this.rpictBoolOptions.indexOf(opt) >= 0) {
            this.parseBoolOverride(opt + "+")
        } else {
            var value = this.validateRpictOverrideValue(opt, parts[i+1]) 
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
                this.setOverride('av', [r,g,b])
            } else if (isNaN(value) == false) {
                this.setOverride(opt, value);
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
        this.setImageType('normal')
    }

}

su2rad.dialog.radiance.setImageType = function (imgType) {
    // set new image type and sync select boxes
    su2rad.settings.radiance.ImageType = imgType;
    this.syncRadOption('radImageType_1');
    this.syncRadOption('radImageType_2');
}

su2rad.dialog.radiance.parseBoolOverride = function (txt) {
    var lastChar = txt.charAt(txt.length-1)
    if (lastChar == '-' || lastChar == '+') {
        var opt = txt.slice(0,txt.length-1);
    } else {
        var opt = txt
    }
    var idx;
    for (var i=0; i<this.rpictBoolOptions.length; i++) {
        if (this.rpictBoolOptions[i] == opt) {
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
    if (flag == this.rpictBoolDefaults[idx]) {
        this.removeOverride(opt);   
    } else {
        this.setOverride(opt);   
    }
}

su2rad.dialog.radiance.removeOverride = function (opt) {
    // remove override from su2rad.settings.radiance and clear checkbox
    su2rad.settings.radiance.removeRpictOverride(opt);
}
    
su2rad.dialog.radiance.selectImageType = function (id) {
    // set new value and sync radImageType select element
    var opt = id.slice(3,-2)
    log.info("new image type: " + document.getElementById(id));
    su2rad.settings.radiance[opt] = document.getElementById(id).value;
    this.syncRadOption(id); 
    this.updateRenderLine();
    applyRenderOptions();
}

su2rad.dialog.radiance.setOverride = function (opt, newValue) {
    // add override value and set checkbox.checked = true
    su2rad.settings.radiance.setRpictOverride(opt, newValue);
}

su2rad.dialog.radiance.update = function () {
    // set dialog options to values of su2rad.settings.radiance
    setSelectionValue('radQuality_1', su2rad.settings.radiance.Quality);
    setSelectionValue('radQuality_2', su2rad.settings.radiance.Quality);
    setSelectionValue('radDetail_1', su2rad.settings.radiance.Detail);
    setSelectionValue('radDetail_2', su2rad.settings.radiance.Detail);
    setSelectionValue('radVariability_1', su2rad.settings.radiance.Variability);
    setSelectionValue('radVariability_2', su2rad.settings.radiance.Variability);
    
    setSelectionValue('radImageType_1',  su2rad.settings.radiance.ImageType);
    setSelectionValue('radImageType_2',  su2rad.settings.radiance.ImageType);
    
    document.getElementById('radImageSizeX_1').value = su2rad.settings.radiance.ImageSizeX;
    document.getElementById('radImageSizeX_2').value = su2rad.settings.radiance.ImageSizeX;
    document.getElementById('radImageSizeY_1').value = su2rad.settings.radiance.ImageSizeY;
    document.getElementById('radImageSizeY_2').value = su2rad.settings.radiance.ImageSizeY;
    
    document.getElementById('radPenumbras').checked = su2rad.settings.radiance.Penumbras;
    setSelectionValue('radReport', su2rad.settings.radiance.Report);
    document.getElementById('radZoneSize').value = su2rad.settings.radiance.ZoneSize; 
    setSelectionValue('radZoneType', su2rad.settings.radiance.ZoneType);
    document.getElementById('radReportFile').value = su2rad.settings.radiance.ReportFile;
}

su2rad.dialog.radiance.updateRenderLine = function () {
    var text = su2rad.settings.radiance.getRenderLine();
    document.getElementById("radRenderLine_1").innerHTML = text;
    document.getElementById("radRenderLine_2").value = text;
}

su2rad.dialog.radiance.updateRpictOptionDisplay = function () {
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
            text += this.getRpictOptionSpan(opt)
        }
    }
    text += "</div>"
    
    // wider column for -av and bool options
    text += "<div class=\"rpictOptions\" id=\"rpictOptionsRight\">";
    // -av option (3 text inputs)
    text += "<div class=\"rpictOverrideHeader\">ambient value</div>";
    text += this.getRpictOptionSpan("av")
    // bool options
    text += "<div class=\"rpictOverrideHeader\">bool options</div>";
    text += this.getRpictOptionSpansBool();
    text += "</div>";
    
    // add to document
    document.getElementById("rpictOptionsDisplay").innerHTML = text;
    // set restrictions on text input fields
    $('.valueInput').numeric({allow:"."});
    $('.valueInputInt').numeric({allow:""});
    $('.valueInputIntN').numeric({allow:"-"});
}

su2rad.dialog.radiance.updateRpictValues = function () {
    //log.debug("updateRpictValues()");
    su2rad.settings.radiance.setRpictOptions();
    this.updateImageSizeDisplay();
    this.updateRpictOptionDisplay();
}

su2rad.dialog.radiance.updateImageSizeDisplay = function () {
    var opt = "ImageSizeX";
    document.getElementById("rad" + opt + "_1").value = su2rad.settings.radiance[opt];
    document.getElementById("rad" + opt + "_2").value = su2rad.settings.radiance[opt];
    var opt = "ImageSizeY";
    document.getElementById("rad" + opt + "_1").value = su2rad.settings.radiance[opt];
    document.getElementById("rad" + opt + "_2").value = su2rad.settings.radiance[opt];
}

su2rad.dialog.radiance.validateRpictOverride = function (opt) {
    // validate rpict arg against int or float;
    try {
        if (opt == "av") {
            //log.debug("validateRpictOverride('av')");
            var colors = ['r', 'g', 'b'];
            var newValue = su2rad.settings.radiance.getRpictOverride(opt);
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
            this.setOverride(opt, newValue);
        } else {
            var id = "valueInput" + opt;
            var value = document.getElementById(id).value;
            var newValue = this.validateRpictOverrideValue(opt, value);
            // check if return value is a valid number and apply
            if (isNaN(newValue)) {
                // NaN: revert to old value
                document.getElementById(id).value = su2rad.settings.radiance.getRpictOverride(opt);
                return
            } else {
                document.getElementById(id).value = newValue;
                this.setOverride(opt, newValue);
            }
        }
        this.updateRenderLine();
        applyRenderOptions();
    } catch(e) {
        log.error(e.message)
    }
}

su2rad.dialog.radiance.validateRpictOverrideValue = function (opt, value) {
    // find correct validator: parseInt() or parseFloat()
    var integer = false;
    if (this.rpictIntOptions.indexOf(opt) >= 0) {
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

