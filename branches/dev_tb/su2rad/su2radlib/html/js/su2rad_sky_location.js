
function ModelLocationObject() {
    this.City = "Rock";
    this.Country = "Hardplace";
    this.NorthAngle = 0.0;
    this.TZOffset = 0;
    this.Latitude = 51.5030;
    this.Longitude = 0.0031;
    this.changed = false;
    this.logging = true;
    this.ShadowTime = '';
    this.ShadowTime_time_t = 0;
    this.SkyCommand = "";
}

ModelLocationObject.prototype.setValue = function (opt,val) {
    try {
        switch (opt) {
        case 'NorthAngle':
            val = parseFloat(val);
            break;
        case 'TZOffset':
            val = parseFloat(val);
            break;
        case 'Latitude':
            val = parseFloat(val);
            break;
        case 'Longitude':
            val = parseFloat(val);
            break;
        }
        if (this[opt] != val) {
            this.changed = true;
            if (this.logging == true) {
                log.info("new " + opt + ": " + val);
            }
        }
        this[opt] = val;
    }
    catch (e) {
        log.error(e.name + ": opt='" + opt + "' val='" + val + "'")
    }
}

ModelLocationObject.prototype.toString = function () {
    var text = 'City=' + locObj.City;
    text += '&Country=' + locObj.Country;
    text += '&Latitude=' + locObj.Latitude.toFixed(4);;
    text += '&Longitude=' + locObj.Longitude.toFixed(4);
    text += '&TZOffset=' + locObj.TZOffset.toFixed(1);
    text += '&NorthAngle=' + locObj.NorthAngle.toFixed(2);
    return text;
}

var modelLocation = new ModelLocationObject();

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

SkyOptionsObject.prototype.parseSkyCommand = function (cmdline) {
    // set sky options from sky command
    if (cmdline == '') {
        return
    }
    log.error("TODO: parseSkyCommand(): '" + cmdline + "'");
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
    log.debug("setActive o=" + opt + " checked=" + checked); 
    if (opt == 'g' || opt == 't') {
        this._activeOptions[opt] = checked;
    } else {
        this._activeOptions[opt.toLowerCase()] = false;
        this._activeOptions[opt.toUpperCase()] = false;
        this._activeOptions[opt] = checked;
    }
}

SkyOptionsObject.prototype.setGenerator = function(val) {
    if (val == 'gendaylit') {
        this.generator = 'gendaylit';
        // TODO enable gendaylit options
        alert("'gendaylit' not enabled yet\ndefault to 'gensky'")
        this.generator = 'gensky';
    } else if (val == 'hdr-image') {
        this.generator = 'hdr-image';
        // TODO enable hdr options
        alert("'hdr-image' not enabled yet\ndefault to 'gensky'")
        this.generator = 'gensky';
    } else {
        if val != 'gensky' {
            log.error("sky generator '" + val + "' unknown; using 'gensky'");
        }
        this.generator = 'gensky';
        // TODO enable gensky options
    }
}

SkyOptionsObject.prototype.setValue = function(opt, val) {
    log.error("setValue: opt='" + opt + "' val='" + val + "'")
    var v=parseFloat(val);
    if (isNaN(v)) {
        return false;
    } else {
        this[opt] = v;
        return true;
    }
}
    
SkyOptionsObject.prototype.toString = function() {
    var text = this.generator;
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
    //XXX
    var text = "stime='" + stime + "'<br/> ";
    var msec = Date.parse(stime);
    var sdate = new Date(msec);
    text += "msec=" + msec + "<br/>";
    text += "sdate=" + sdate + "<br/>";
    text += "GMTstring=" + sdate.toGMTString() + "<br/>";
    text += "UTCstring=" + sdate.toUTCString() + "<br/>";
    
    this.skyDateMonth = sdate.getUTCMonth()+1;
    this.skyDateDay = sdate.getUTCDate();
    this.skyTimeHour = sdate.getUTCHours();
    this.skyTimeMinute = sdate.getUTCMinutes();
    
    text += "gensky=" + this.toGenskyString() + "<br/>";
    setNearByCities(text);
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


function calculateTZOffset(long) {
    log.debug("calculateTZOffset(" + long + ")");
    var west = false;
    var offset = +1.0;
    var mer = 0.0;
    if (long < 0.0) {
        west = true;
        long *= -1;
    }
    if (long < 15) {    // Western Europe 
        offset = +1.0;
        mer = 0.0;
        west = false;
    } else {
        var offset = Math.floor((long+7.5)/15.0);
        var mer = offset*15.0;
    }
    if (west == true) {
        long *= -1;
        mer *= -1;
        offset *= -1;
    }
    log.debug("long=" + long + " mer=" + mer + " offset=" + offset);
    setTZHighlight(true); 
    return offset;
}

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
    try {
        var cbid = "genskyOptionCB_" + opt;
        var selected = document.getElementById(cbid).checked;
    } catch (e) {
        if (e.name != 'TypeError') {
            // 'TypeError' if element does not exist yet => ignored
            log.error(e.name);
        }
        var selected = false;
    }
    if (selected == true) {
        style = "rpictOverrideSelected";
        state = "checked";
    }
    var text = "<div class=\"" + style + "\" style=\"width:85px;\">";
    text += "<input type=\"checkbox\" class=\"rpictCB\" id=\"genskyOptionCB_" + opt + "\"";
    text += " onchange=\"onGenskyOptionCB('" + opt + "')\" " + state + "/>"
    text += "<span class=\"gridLabel\" style=\"width:20px;padding-left:5px;\">-" + opt + ":</span>";
    if (selected == true) {
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

function checkValueLatLong(id, minmax) {
    var vNum = document.getElementById(id).value;
    var num = parseFloat(vNum);
    if (isNaN(num)) {
        alert(id + " is not a number: '" + vNum + "'");
        document.getElementById(id).value = modelLocation[id].toFixed(4);
        document.getElementById(id).focus;
        return false;
    } else if (num < (-1*minmax) || num > minmax) {
        alert(id + " not between -" + minmax + "and +" + minmax +": " + num.toFixed(4));
        document.getElementById(id).value = modelLocation[id].toFixed(4);
        document.getElementById(id).focus;
        return false;
    }
    return true;
}

function geonamesCallback(jData) {
    // restore cursor
    document.body.style.cursor='auto';
    log.debug("geonamesCallback() jData=" + jData);
    // check if there was a problem parsing search results
    if (jData == null) {
        return;
    }
    // test if 'jData.geonames' exists
    try {
        log.info("jData.geonames.length: " + jData.geonames.length);
    }
    catch (e) {
        log.error("ERROR for 'jData.geonames.length': " + e.name);
        log.debug("jData.status.message: " + jData.status.message);
        log.debug("jData.status.value: " + jData.status.value);
        return;
    }
    
    // now select closest location
    if (jData.geonames.length > 0) {
        var text = "";
        var minDist = 500;
        var minDistIdx = 0;
        for(var i=0; i<jData.geonames.length; i++) {
            var city = jData.geonames[i];
            if(city != null) {
                // log.debug(city.name + " (" + city.distance + ")");
                text = text + formatCity(city) + "<br />"
                if (parseFloat(city.distance) < minDist) {
                    minDist = parseFloat(city.distance);
                    minDistIdx = i;
                }
            }
        }
        setNearByCities(text); 
        // set closest city
        city = jData.geonames[minDistIdx];
        setLocationFromGeonames(city);
    } else {
        log.info("no location found");
    }
}

function setNearByCities(text) {
    document.getElementById('nearByCities').innerHTML=text;
}
    

function geonamesLookup(lat,long,zoom) {
    log.debug("geonamesLookup() zoom=" + zoom);
    // set search radius and location features
    var radius = 5.0;
    var feature = "&featureClass=P&featureCode=PPLA&featureCode=PPL&featureCode=PPLC";
    if (zoom < 6) {
        // country level: increase radius to max, limit to administrative locations
        radius = 300.0;
        feature = "&featureClass=P&featureCode=PPLA&featureCode=PPLC";
    } else if (zoom < 12) {
        radius = 50.0;
    }
    log.debug("  search radius: " + radius + "km");
    
    // geonames.org http request 
    request = "http://ws.geonames.org/findNearbyJSON?lat=" + lat + "&lng=" + long + "&radius=" + radius + feature + "&style=full&callback=geonamesCallback";
    log.info("sending JSONscriptRequest ...")
    var text = "<b>geonames request in progress ...</b><br/><span style=\"font-size: small;\">";
    text += request + "</span>";
    setNearByCities(text);
    document.body.style.cursor='wait';
    // Create a new script object
    aObj = new JSONscriptRequest(request);
    // Build and execute ('add') the script tag
    aObj.buildScriptTag();
    aObj.addScriptTag();
    log.debug("JSONscriptRequest=" + aObj)
}


function geonamesTimeZone(lat,lng) {
    request = "http://ws.geonames.org/timezoneJSON?lat=" + lat + "&lng=" + lng + "&callback=geonamesTimeZoneCallback";
    log.info("sending JSON time zone request ...")
    log.debug("  " + request);
    // Create a new script object
    document.body.style.cursor='wait';
    aObj = new JSONscriptRequest(request);
    // Build and execute ('add') the script tag
    aObj.buildScriptTag();
    aObj.addScriptTag();
    log.debug("  JSONscriptRequest=" + aObj)
}

function geonamesTimeZoneCallback(jData) {
    // restore cursor
    document.body.style.cursor='auto';
    // check if there was a problem parsing search results
    if (jData == null) {
        log.warn("no data returned")
        return;
    }
    // Test if 'geonames' exists
    try {
        log.info("jData.gmtOffset: " + jData.gmtOffset);
        modelLocation.setValue('TZOffset', jData.gmtOffset);
        setTZOffsetSelection(jData.gmtOffset);
        setTZHighlight(false);
    }
    catch (e) {
        log.error("ERROR for 'jData.gmtOffset': " + e.name);
        log.debug("jData.status.message: " + jData.status.message);
        log.debug("jData.status.value: " + jData.status.value);
        return;
    }
}


function centerCity(city, country, lat, lng) {
    // center map on lat/lng of city from geonames
    log.info("new city selected: " + city);
    modelLocation.setValue('City', city);
    modelLocation.setValue('Country',country);
    modelLocation.setValue('Latitude', lat);
    modelLocation.setValue('Longitude', lng);
    googleMapSetCenter(parseFloat(lat),parseFloat(lng),11);
    clearNearByCities();
    updateSkyLocFormValues()
}


function formatCity(city) {
    var cityLong = city.name + " (" + city.adminName1 + ")";
    var lat = parseFloat(city.lat).toFixed(4);
    var lng = parseFloat(city.lng).toFixed(4);
    var args = [city.name, city.countryName, lat, lng].join("','");
    var text = "<a onClick=\"centerCity('" + args + "')\"><b>" + cityLong + "</b></a>"
    text += " [lat=" + lat + ", lng=" + lng;
    try {
        text += ", tzone=" + city.timezone.gmtOffset;
    } catch (e) {
        text += ", tzone=none";
    }
    text += ", dist=" + city.distance; 
    text += ", pop=" + city.population; 
    text += "]";
    return text
}


function onCityCountryChanged() {
    var city = document.getElementById("City").value;
    if (city != modelLocation.City) {
        log.info("new city: " + city);
        modelLocation.setValue('City', city);
        document.getElementById("googleMapLookup").disabled = false;
    }
    var country = document.getElementById("Country").value;
    if (country != modelLocation.Country) {
        modelLocation.setValue('Country', country);
        document.getElementById("googleMapLookup").disabled = false;
    }
    updateSkyLocFormValues()
}

function onNorthAngleChange() {
    if (checkValueLatLong("NorthAngle", 360) == false) {
        return;
    }
    var north = parseFloat(document.getElementById("NorthAngle").value);
    modelLocation.setValue('NorthAngle', north);
    updateSkyLocFormValues()
} 

function onLatLongChange() {
    if (checkValueLatLong("Latitude", 90) == false) {
        return;
    }
    if (checkValueLatLong("Longitude", 190) == false) {
        return;
    }
    var lat = parseFloat(document.getElementById("Latitude").value);
    var lng = parseFloat(document.getElementById("Longitude").value);
    setLatLong(lat,lng);
    if (document.getElementById("useGoogleMap").checked == true) {
        geonamesTimeZone(lat,lng);
        geonamesLookup(parseFloat(lat), parseFloat(lng), map.getZoom());
        googleMapSetCenter(lat,lng);
    }
}


function resetCityCountry() {
    // unused?
    log.info("resetting city and country names ...");
    modelLocation.setValue('City', "no city");
    modelLocation.setValue('Country', "no country");
    modelLocation.changed = true;
}


function selectTZ() {
    var offset = document.getElementById('TZOffset').value;
    log.debug("selectTZ(" + offset + ")");
    modelLocation.setValue('TZOffset', offset);
    setTZHighlight(false);
    setTZWarning(parseFloat(offset));
    updateSkyLocFormValues();
}


function setLatLong(lat,lng) {
    log.debug("setLatLong(lat=" + lat.toFixed(4) + ", lng=" + lng.toFixed(4));
    modelLocation.setValue('Latitude', lat);
    if (modelLocation.Longitude != parseFloat(lng)) {
        modelLocation.setValue('Longitude', lng);
        var offset = calculateTZOffset(lng);
        modelLocation.setValue('TZOffset', offset);
        setTZOffsetSelection(offset);
    }
    updateSkyLocFormValues()
}


function setLocationFromGeonames(geoLoc) {
    log.info("new location: " + formatCity(geoLoc))
    var offset = 0;
    try {
        offset = geoLoc.timezone.gmtOffset;
        // unset TZHighlight
        setTZHighlight(false);
    } catch (e) {
        log.warn("location has no timezone info (" + e.name + ")");
        offset = calculateTZOffset(parseFloat(geoLoc.lng));
    }
    
    modelLocation.setValue('City', geoLoc.name);
    modelLocation.setValue('Country', geoLoc.countryName);
    modelLocation.setValue('TZOffset', offset);
    setTZOffsetSelection(offset);
    // if (document.getElementById("jumpToNearestLocation").checked == true) { 
    //    log.debug("jump=true");
    //    modelLocation.Latitude   = parseFloat(geoLoc.lat);
    //    modelLocation.Longitude  = parseFloat(geoLoc.lng);
    //    googleMapSetCenter(modelLocation.Latitude, modelLocation.Longitude);
    // }
    updateSkyLocFormValues()
}


function setShadowInfoJSON(msg) {
    // parse and apply shadow_info settings in JSON string 'msg'
    log.debug("setShadowInfoJSON() (" + msg.length + " bytes)");
    var json = msg.replace(/#COMMA#/g,",");
    try {
        eval("var shadowinfo = " + json);
    } catch (e) {
        log.error(e.name);
        setNearByCities("error: " + e.name + "<br/>" + json);
        return
        var shadowinfo = new Array();
    }
    var text = '<b>shadow info settings:</b><br/>';
    modelLocation.logging = false;
    for(var j=0; j<shadowinfo.length; j++) {
        var attrib = shadowinfo[j];
        if(attrib != null) {
            modelLocation.setValue(attrib.name, attrib.value);
            text = text + '&nbsp;&nbsp;<b>' + attrib.name + ':</b> ' + attrib.value + '<br/>';
        }
    }
    modelLocation.changed = false;
    modelLocation.logging = true;
    setTZHighlight(false);
    setNearByCities(text);
    skyOptions.parseSkyCommand(modelLocation.SkyCommand);
    skyDateTime.setFromShadowTime(modelLocation.ShadowTime);
    updateSkyDateTimeDisplay();
    updateSkyLocFormValues();
    googleMapInitialize(modelLocation.Latitude, modelLocation.Longitude);
}


function setTZHighlight(set) {
    if (set == true) {
        // set highlight
        document.getElementById("TZOffset").style.color="#cc0000";
        document.getElementById("TZOffsetLable").style.color="#cc0000";
    } else {
        // unset highlight
        document.getElementById("TZOffset").style.color="";
        document.getElementById("TZOffsetLable").style.color="";
    }
}


function setTZOffsetSelection(offset) {    
    log.debug("setTZOffsetSelection(offset=" + offset + ")");
    offset = parseFloat(offset);
    var tz = document.getElementById('TZOffset');
    for (var i=0; i < tz.length; i++) {
        if (parseFloat(tz[i].value) == offset) {
            tz[i].selected = true;
            log.debug("   selection=" + tz[i].text);
        }
    }
    setTZWarning(offset);
}


function setTZWarning(offset) {
    var mer = offset*15.0;
    var diff = parseFloat(document.getElementById('Longitude').value) - mer;
    if (diff > 25 || diff < -25) {
        document.getElementById("meridianWarning").innerHTML="diff to meridian: " + diff.toFixed(1);
    } else {
        document.getElementById("meridianWarning").innerHTML="";
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
    document.getElementById("nearByCities").innerHTML = sky;
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
    skyOptions.skytype = sun + stype;
    setSkySummary()
    //document.getElementById('skyCommandLine').innerHTML = skyOptions.toString();
}

function updateSkyLocFormValues() {
    _updateLocationFormValues();
    _updateSkyFormValues();
    setSkySummary()
    // make 'apply' button visible if values have changed
    if (modelLocation.changed == true) {
        document.getElementById("applyLocationValues").disabled=false;
        document.getElementById("reloadShadowInfo").disabled=false;
    } else {
        document.getElementById("applyLocationValues").disabled=true;
        document.getElementById("reloadShadowInfo").disabled=true;
    }
    updateSkyOptionsDisplay()
}

function _updateLocationFormValues() {
    log.debug("_updateLocationFormValues");
    document.getElementById('City').value       = modelLocation.City;
    document.getElementById('Country').value    = modelLocation.Country;
    document.getElementById('Latitude').value   = modelLocation.Latitude.toFixed(4);
    document.getElementById('Longitude').value  = modelLocation.Longitude.toFixed(4);
    document.getElementById('NorthAngle').value = modelLocation.NorthAngle.toFixed(2);
    setTZOffsetSelection(modelLocation.TZOffset);
    // set meridian display
    var mer = parseFloat(document.getElementById('TZOffset').value)*15.0;
    document.getElementById('meridianDisplay').innerHTML = "-m " + mer.toFixed(1);
    // check values
    //checkValueLatLong("Latitude", 90);
    //checkValueLatLong("Longitude", 190);
    //checkValueLatLong("NorthAngle", 360);
}

function _updateSkyFormValues () {
    
}
