function SkyController () {
    this.name = "SkyController"
    this.generator = "gensky"
}

SkyController.prototype.createDateControlls = function() {
    var div3 = document.createElement("DIV")
    div3.className = "optionsRow"
    var span3_1 = document.createElement("SPAN")
    span3_1.className = "gridLabel"
    span3_1.appendChild(document.createTextNode("date:"))
    div3.appendChild(span3_1)

    var input3_1 = document.createElement("INPUT")
    input3_1.className = "timeOptionInput"
    input3_1.type = "text"
    input3_1.id = "skyDateMonth"
    input3_1.setAttribute("value", "03")
    input3_1.onchange = function () { su2rad.dialog.sky.setDateTime('skyDateMonth') }
    div3.appendChild(input3_1)
    
    var span3_2 = document.createElement("SPAN")
    span3_2.className = "skyOption"
    span3_2.appendChild(document.createTextNode("/"))
    span3_2.setAttribute("style", "width:12px;")
    div3.appendChild(span3_2)
    
    var input3_2 = document.createElement("INPUT")
    input3_2.className = "timeOptionInput"
    input3_2.type = "text"
    input3_2.id = "skyDateDay"
    input3_2.setAttribute("value", "21")
    input3_2.onchange = function () { su2rad.dialog.sky.setDateTime('skyDateDay') }
    div3.appendChild(input3_2)
    return div3
}
   
SkyController.prototype.createGeneratorControl = function() {
    var div1 = document.createElement("DIV")
    div1.className = "optionsHeader"
    var span = document.createElement("SPAN")
    span.className = "gridLabel"
    span.appendChild(document.createTextNode("generator:"))
    div1.appendChild(span)
    var select = document.createElement("SELECT")
    select.id = "skyGenerator"
    select.onchange = function () { su2rad.dialog.sky.setGenerator(this.value) }
    var generators = ["gensky", "gendaylit", "climat data", "hdr-image"]
    for (var i=0; i< generators.length; i++) {
        var g = generators[i]
        var selected = false
        if (g == su2rad.settings.sky.generator) {
            selected = true
        }
        var gOpt = new Option(g, g, selected, selected)
        try {
            select.add(gOpt, null)
        } catch (e) {
            select.add(gOpt)
        }
    }
    div1.appendChild(select)
    return div1
}

SkyController.prototype.createTimeControlls = function () {
    var div4 = document.createElement("DIV")
    div4.className = "optionsRow"
    var span4_1 = document.createElement("SPAN")
    span4_1.className = "gridLabel"
    span4_1.appendChild(document.createTextNode("time:"))
    div4.appendChild(span4_1)

    var input4_1 = document.createElement("INPUT")
    input4_1.className = "timeOptionInput"
    input4_1.type = "text"
    input4_1.id = "skyTimeHour"
    input4_1.setAttribute("value", "12")
    input4_1.onchange = function () { su2rad.dialog.sky.setDateTime('skyTimeHour') }
    div4.appendChild(input4_1)
    
    var span4_2 = document.createElement("SPAN")
    span4_2.className = "skyOption"
    span4_2.appendChild(document.createTextNode(":"))
    span4_2.setAttribute("style", "width:12px;")
    div4.appendChild(span4_2)
    
    var input4_2 = document.createElement("INPUT")
    input4_2.className = "timeOptionInput"
    input4_2.type = "text"
    input4_2.id = "skyTimeMinute"
    input4_2.setAttribute("value", "00")
    input4_2.onchange = function () { su2rad.dialog.sky.setDateTime('skyTimeMinute') }
    div4.appendChild(input4_2)
    return div4
}

SkyController.prototype.setGenerator = function(generator) {
    log.debug("setGenerator('" + generator + "')")
    //var generator = document.getElementById('skyGenerator').value;
    su2rad.settings.sky.setGenerator(generator);
    this.updateOptionsDisplay()
    this.update()
    applySkySettings();
}

SkyController.prototype.setDateTime = function(id) {
    log.debug("setDateTime(id='" + id + "'");
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

SkyController.prototype.update = function () {
    log.debug("SkyController.update() ...");
    this.updateDialog()
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

SkyController.prototype.updateDialog = function () {
    log.debug(this.name + ".updateDialog() ...");
    su2rad.dialog.location.update();
    su2rad.dialog.googleMap.updateLocation();
}



function SkyControllerGensky () {
    this.name = "SkyControllerGensky"
}
SkyControllerGensky.prototype = new SkyController()

SkyControllerGensky.prototype.onGenskyInputChanged = function(opt) {
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

SkyControllerGensky.prototype.onSkyTypeChange = function() {
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

SkyControllerGensky.prototype.updateOptionsDisplay = function() {
    log.debug("gensky.updateOptionsDisplay()")
    setSelectionValue('skyGenerator', su2rad.settings.sky.generator);
    if (su2rad.settings.sky.generator == 'gensky') {
        this.updateTypeAndTime();
        this._updateGenskyOptions();
        this.updateSkyTypeDisplay();
    }
    this.setOptionsVisibility(su2rad.settings.sky.generator); 
}

SkyControllerGensky.prototype.updateTypeAndTime = function() {
    log.debug("updateTypeAndTime()")
    var container = document.getElementById("skyControllerOptions")
    while (container.hasChildNodes() == true) {
        container.removeChild(container.firstChild)
    }

    container.appendChild(this.createGeneratorControl())

    var div2 = document.createElement("DIV")
    div2.className = "optionsRow"
    div2.id = "genskyTypeOptions"
    div2.setAttribute("style", "width:210px;")
    
    var div2_1 = document.createElement("DIV")
    div2_1.className = "optionsRow"
    div2_1.setAttribute("style", "width:160px;")
    var span2_1 = document.createElement("SPAN")
    span2_1.className = "gridLabel"
    span2_1.appendChild(document.createTextNode("type:"))
    div2_1.appendChild(span2_1)
    
    var select2_1 = document.createElement("SELECT")
    select2_1.id = "genskySkyType"
    select2_1.onchange = function () { su2rad.dialog.sky.onSkyTypeChange() }
    select2_1.setAttribute("style", "width:80px;")
    var skies = new Array()
    skies[0] = new Option("uniform",  "u", false, false)
    skies[1] = new Option("overcast", "c",  true,  true)
    skies[2] = new Option("interm.",  "i", false, false)
    skies[3] = new Option("sunny",    "s", false, false)
    for (var i=0; i<skies.length; i++) {
        var s = skies[i]
        try {
            select2_1.add(s, null) 
        } catch (e) {
            select2_1.add(s)
        }
    }
    div2_1.appendChild(select2_1)
    div2.appendChild(div2_1)
    
    var div2_2 = document.createElement("DIV")
    div2_2.id = "genskySunOption"
    div2_2.setAttribute("style", "display:none;width:45px;")
    var cbSun = document.createElement("INPUT")
    cbSun.id = "sunOptionCB"
    cbSun.type = "checkbox"
    cbSun.setAttribute("value", "sunOption")
    cbSun.onclick = function () { su2rad.dialog.sky.onSkyTypeChange() } 
    div2_2.appendChild(cbSun)
    var span2_2 = document.createElement("SPAN")
    div2_2.setAttribute("style", "font-size:12px;")
    span2_2.appendChild(document.createTextNode("sun"))
    div2_2.appendChild(span2_2)
    div2.appendChild(div2_2)
    container.appendChild(div2)

    container.appendChild(this.createDateControlls())
    container.appendChild(this.createTimeControlls())
 
    var div5 = document.createElement("DIV")
    div5.className = "optionsRow"
    div5.id = "dateTimeOptions"
    container.appendChild(div5)
}

SkyControllerGensky.prototype.setOptionsVisibility = function(generator) {
    return
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

SkyControllerGensky.prototype.setSkyCmdLine = function () {
    // update command line showing sky generator options
    var loc = su2rad.settings.location.City + ", "+ su2rad.settings.location.Country;
    document.getElementById("skySummaryLocation").innerHTML = loc;
    document.getElementById("skySummaryNorth").innerHTML = su2rad.settings.location.NorthAngle.toFixed(2);
    var sky = su2rad.settings.location.toGenskyString();
    document.getElementById("skySummaryOptions").innerHTML = sky;
    document.getElementById("skyCommandLine").innerHTML = '<b>cmd:</b> ' + sky;
    su2rad.dialog.setStatusMsg(sky);
}

SkyControllerGensky.prototype.updateSkyDateTimeDisplay = function () {
    document.getElementById('skyDateMonth').value = su2rad.settings.skytime.getValueString('skyDateMonth');
    document.getElementById('skyDateDay').value = su2rad.settings.skytime.getValueString('skyDateDay');
    document.getElementById('skyTimeHour').value = su2rad.settings.skytime.getValueString('skyTimeHour');
    document.getElementById('skyTimeMinute').value = su2rad.settings.skytime.getValueString('skyTimeMinute');
}

SkyControllerGensky.prototype.updateSkyTypeDisplay = function () {
    log.debug("SkyControllerGensky._updateSkyTypeDisplay()")
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
    
SkyControllerGensky.prototype._updateGenskyOptions = function () {
    log.debug("SkyControllerGensky._updateGenskyOptions()")
    var skyOptsDiv = document.getElementById("skyOptsGensky")
    while (skyOptsDiv.hasChildNodes() == true) {
        skyOptsDiv.removeChild(skyOptsDiv.firstChild)
    }
    
    var div1 = document.createElement("DIV")
    div1.className = "optionsHeader"
    div1.setAttribute("style", "width:330px;")
    var span1 = document.createElement("SPAN")
    span1.className = "gridLabel"
    span1.setAttribute("style", "width:240px;")
    span1.appendChild(document.createTextNode("gensky options:"))
    div1.appendChild(span1) 
    skyOptsDiv.appendChild(div1)

    var div2 = document.createElement("DIV")
    div2.className = "genskyOptions"
    div2.setAttribute("style", "width:100px;")
    var div3 = document.createElement("DIV")
    div3.className = "rpictOverrideHeader"
    div3.setAttribute("style", "width:80px;")
    div3.appendChild(document.createTextNode("general"))
    div2.appendChild(div3)
    div2.appendChild(this._updateGenskyOptionsDiv("g"))
    div2.appendChild(this._updateGenskyOptionsDiv("t"))
    skyOptsDiv.appendChild(div1)
    
    var div4 = document.createElement("DIV")
    div4.className = "genskyOptions"
    var opts = ["sky radiance","-b","-B","solar radiance","-r","-R"];
    for (var i=0; i<opts.length; i++) {
        opt = opts[i];
        if (opt.charAt(0) != '-') {
            var div = document.createElement("DIV")
            div.className = "rpictOverrideHeader"
            div.appendChild(document.createTextNode(opt))
            div4.appendChild(div)
        } else {
            div4.appendChild( this._updateGenskyOptionsDiv(opt.charAt(1)) )
        }
    }
    skyOptsDiv.appendChild(div4)
    $('.skyOptionInput').numeric({allow:"."});
}

SkyControllerGensky.prototype._updateGenskyOptionsDiv = function(opt) {
    //log.debug("_updateskyOptionsDiv(opt='" + opt + "')");
    var state = "";
    if (su2rad.settings.sky.isActive(opt) == true) {
        state = "checked";
    }
    var div = document.createElement("DIV")
    div.className = "gridRow"
    if (opt == 'g' || opt == 't') {
        div.setAttribute("style", "width:85px;")
        var span = document.createElement("SPAN")
        span.className = "gridLabel"
        span.setAttribute("style", "width:25px;")
        span.appendChild(document.createTextNode("-" + opt + ":"))
        span.appendChild(getToolTip('gensky', opt))
        div.appendChild(span)
        div.appendChild(this.getTextInputElement(opt))
    } else {
        this.createCheckBoxLabel(div,opt)
        if (su2rad.settings.sky.isActive(opt) == true) {
            div.appendChild(this.getTextInputElement(opt))
        } else { 
            var span1 = document.createElement("SPAN")
            span1.className = "defaultValue"
            span1.appendChild(document.createTextNode("[not set]"))
            div.appendChild(span1)
        }
    }
    return div
}

SkyControllerGensky.prototype.getTextInputElement = function(opt) {
    var tInput = document.createElement("INPUT")
    tInput.className = "valueInput"
    tInput.type = "text"
    tInput.id = "genskyOptionInput" + opt
    tInput.setAttribute("value", su2rad.settings.sky[opt])
    // text += " onChange=\"su2rad.dialog.sky.onGenskyInputChanged('" + opt + "')\" />";
    tInput.onchange = function () { su2rad.dialog.sky.onGenskyInputChanged(opt) }
    return tInput
}

SkyControllerGensky.prototype.createCheckBoxLabel = function(div,opt) {
    // return label and checkbox with onclick action set 
    var labels = {};
    labels.b = "diffuse normal"
    labels.B = "diffuse horizontal"
    labels.r = "direct normal" 
    labels.R = "direct horizontal" 
    var label = labels[opt]
    if (!label || label == '') {
        label = "-" + opt;
    }

    var cbInput = document.createElement("INPUT")
    cbInput.type = "checkbox"
    cbInput.setAttribute("value", su2rad.settings.sky[opt])
    cbInput.onclick = function () { su2rad.dialog.sky.enableGenskyOption(opt) } 
    if (su2rad.settings.sky.isActive(opt) == true) {
        cbInput.setAttribute("checked", true)
        cbInput.setAttribute("defaultChecked", true)
    }
    div.appendChild(cbInput)
    
    var link = document.createElement("A")
    link.className = "gridLabel"
    link.onclick = function () { su2rad.dialog.sky.enableGenskyOption(opt) } 
    link.appendChild(document.createTextNode(label+":"))
    link.appendChild(getToolTip("gensky", opt))
    div.appendChild(link)
}

SkyControllerGensky.prototype.enableGenskyOption = function(opt,enable) {
    log.debug("enableGenskyOption(opt='" + opt + "' enable='" + enable + "'");
    if (enable == undefined ) {
        enable = true
        if (su2rad.settings.sky.isActive(opt) == true) {
            enable = false
        }
    } else if (enable == "false") {
        enable = false
    } else {
        enable = true
    }
    log.debug("enableGenskyOption(opt='" + opt + "' enable='" + enable + "'");
    su2rad.settings.sky.setActive(opt, enable);
    this._updateGenskyOptions();
    this.update();
    applySkySettings();
}


SkyControllerGensky.prototype.updateDialog = function () {
    log.debug(this.name + ".update() ...");
    // update sky related dialog elements
    this.updateOptionsDisplay();        //XXX
    this.updateSkyDateTimeDisplay();    //XXX
    this.setSkyCmdLine()                //XXX
}


var su2rad = su2rad ? su2rad : new Object()
su2rad.dialog = su2rad.dialog ? su2rad.dialog : new Object()
su2rad.dialog.sky = new SkyControllerGensky()



