
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

ModelLocationObject.prototype.parseSkyCmd = function () {
    if (this.SkyCommand == "") {
        return true;
    }
    var parts = this.SkyCommand.split(' ');
    for (var i=0; i<parts.length; i++) {
        if (parts[i] == '-rz' && i<parts.length-1) {
            var north = parseFloat(parts[i+1]);
            if (isNaN(north) == false) {
                this.NorthAngle = north*-1;
            }
        } else if (parts[i] == '-m' && i<parts.length-1) {
            var mer = parseInt(parts[i+1]);
            if (isNaN(mer) == false) {
                this.TZOffset = mer/-15.0;
            }
        }
    }
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

ModelLocationObject.prototype.toGenskyString = function () {
    var lat = this.Latitude * 1.0;
    var lng = this.Longitude * -1.0;
    var mer = this.TZOffset * -15.0;
    var loc = " -a " + lat.toFixed(4) + " -o " + lng.toFixed(4) + " -m " + mer.toFixed(1);
    if (this.NorthAngle != 0.0) {
        var north = this.NorthAngle*-1;
        loc += " | xform -rz " + north.toFixed(2);
    }
    var sky = skyOptions.toString() + loc;
    return sky;
}

ModelLocationObject.prototype.toParamString = function () {
    // return params string for SU
    var text = 'City=' + this.City;
    text += '&Country=' + this.Country;
    text += '&Latitude=' + this.Latitude.toFixed(4);;
    text += '&Longitude=' + this.Longitude.toFixed(4);
    text += '&TZOffset=' + this.TZOffset.toFixed(1);
    text += '&NorthAngle=' + this.NorthAngle.toFixed(4);
    text += '&ShadowTime_time_t=' + this.ShadowTime_time_t;
    text += '&SkyCommand=' + this.toGenskyString();
    return text;
}



function calculateTZOffset(long) {
    //log.debug("calculateTZOffset(" + long + ")");
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
    setTZHighlight(true); 
    return offset;
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


function clearTZWarning() {
    // reset warning message 
    setTZHighlight(false);
    setLocationWarning("");
}


function onClickCity(city, country, lat, lng) {
    // center map on lat/lng of city from geonames
    log.info("new city selected: " + city);
    modelLocation.setValue('City', city);
    modelLocation.setValue('Country',country);
    modelLocation.setValue('Latitude', lat);
    modelLocation.setValue('Longitude', lng);
    googleMapSetCenter(parseFloat(lat),parseFloat(lng),11);
    setStatusMsg('');
    updateSkyPage();
    applySkySettings();
}


function formatCity(city) {
    var cityLong = city.name + " (" + city.adminName1 + ")";
    var lat = parseFloat(city.lat).toFixed(4);
    var lng = parseFloat(city.lng).toFixed(4);
    var args = [city.name, city.countryName, lat, lng].join("','");
    var text = "<a onClick=\"onClickCity('" + args + "')\"><b>" + cityLong + "</b></a>"
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
        modelLocation.setValue('City', city);
        document.getElementById("googleMapLookup").disabled = false;
    }
    var country = document.getElementById("Country").value;
    if (country != modelLocation.Country) {
        modelLocation.setValue('Country', country);
        document.getElementById("googleMapLookup").disabled = false;
    }
    updateSkyPage()
    applySkySettings();
}

function onNorthAngleChange() {
    if (checkValueLatLong("NorthAngle", 360) == false) {
        return;
    }
    var north = parseFloat(document.getElementById("NorthAngle").value);
    modelLocation.setValue('NorthAngle', north);
    updateSkyPage();
    applySkySettings();
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
    updateSkyPage();
    if (document.getElementById("useGoogleMap").checked == true) {
        googleMapSetCenter(lat,lng);
        geonamesTimeZone(lat,lng);
        geonamesLookup(parseFloat(lat), parseFloat(lng), map.getZoom());
    }
    applySkySettings();
}


function resetCityCountry() {
    // unused?
    log.info("resetting city and country names ...");
    modelLocation.setValue('City', "no city");
    modelLocation.setValue('Country', "no country");
    modelLocation.changed = true;
}


function onSelectTZ() {
    var offset = document.getElementById('TZOffset').value;
    modelLocation.setValue('TZOffset', offset);
    setTZHighlight(false);
    setLocationWarning("");
    setTZWarning(parseFloat(offset));
    updateSkyPage();
    applySkySettings();
}


function setLatLong(lat,lng) {
    modelLocation.setValue('Latitude', lat);
    if (modelLocation.Longitude != parseFloat(lng)) {
        modelLocation.setValue('Longitude', lng);
        var offset = calculateTZOffset(lng);
        modelLocation.setValue('TZOffset', offset);
        setTZOffsetSelection(offset);
        setLocationWarning("<input type=\"button\" value=\"confirm TZ\" onclick=\"javascript:clearTZWarning()\" />");
    }
}


function setLocationWarning(msg) {
    document.getElementById("meridianWarning").innerHTML = msg;
}


function _getShadowInfoArrayFromJSON(text) {
    // convert JSON response string into javascript array
    var json = decodeJSON(text);
    try {
        eval("var array = " + json);
    } catch (e) {
        logError(e);
        setStatusMsg("error in shadow_info array: " + e.name + "<br/>" + json);
        return
        var array = new Array();
    }
    return array;
}
    

function setShadowInfoJSON(msg) {
    // parse and apply shadow_info settings in JSON string 'msg'
    //log.debug("setShadowInfoJSON()")
    shadowinfo = _getShadowInfoArrayFromJSON(msg);
    var text = '<b>shadow info settings:</b><br/>';
    modelLocation.logging = false;
    for(var j=0; j<shadowinfo.length; j++) {
        var attrib = shadowinfo[j];
        if(attrib != null) {
            modelLocation.setValue(attrib.name, attrib.value);
            text = text + '&nbsp;&nbsp;<b>' + attrib.name + ':</b> ' + attrib.value + '<br/>';
        }
    }
    modelLocation.parseSkyCmd();
    modelLocation.changed = false;
    modelLocation.logging = true;
    clearTZWarning();
    setStatusMsg(text);
    skyOptions.parseSkyCommand(modelLocation.SkyCommand);
    skyDateTime.setFromShadowTime_time_t(modelLocation.ShadowTime_time_t);
    googleMapInitialize(modelLocation.Latitude, modelLocation.Longitude);
    updateSkyPage();
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
    //log.debug("setTZOffsetSelection(offset=" + offset + ")");
    offset = parseFloat(offset);
    var tz = document.getElementById('TZOffset');
    for (var i=0; i < tz.length; i++) {
        if (parseFloat(tz[i].value) == offset) {
            tz[i].selected = true;
        }
    }
    setTZWarning(offset);
}

function setTZWarning(offset) {
    var mer = offset*15.0;
    var diff = parseFloat(document.getElementById('Longitude').value) - mer;
    if (diff > 25 || diff < -25) {
        setLocationWarning("diff to meridian: " + diff.toFixed(1));
    }
}

function updateLocationFormValues() {
    document.getElementById('City').value       = modelLocation.City;
    document.getElementById('Country').value    = modelLocation.Country;
    document.getElementById('Latitude').value   = modelLocation.Latitude.toFixed(4);
    document.getElementById('Longitude').value  = modelLocation.Longitude.toFixed(4);
    document.getElementById('NorthAngle').value = modelLocation.NorthAngle.toFixed(2);
    var radLng = modelLocation.Longitude*-1
    document.getElementById('radianceLongitude').innerHTML = "-o " + radLng.toFixed(4);
    setTZOffsetSelection(modelLocation.TZOffset);
    // set meridian display
    var mer = parseFloat(document.getElementById('TZOffset').value)*-15.0;
    document.getElementById('meridianDisplay').innerHTML = "-m " + mer.toFixed(1);
    // check values
    //checkValueLatLong("Latitude", 90);
    //checkValueLatLong("Longitude", 190);
    //checkValueLatLong("NorthAngle", 360);
    setSkyCmdLine();
}

