
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


function centerCity(city, country, lat, lng) {
    // center map on lat/lng of city from geonames
    log.info("new city selected: " + city);
    modelLocation.setValue('City', city);
    modelLocation.setValue('Country',country);
    modelLocation.setValue('Latitude', lat);
    modelLocation.setValue('Longitude', lng);
    googleMapSetCenter(parseFloat(lat),parseFloat(lng),11);
    setStatusMsg('');
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


function setShadowInfoJSON(msg) {
    // parse and apply shadow_info settings in JSON string 'msg'
    log.debug("setShadowInfoJSON() (" + msg.length + " bytes)");
    var json = msg.replace(/#COMMA#/g,",");
    try {
        eval("var shadowinfo = " + json);
    } catch (e) {
        log.error(e.name);
        setStatusMsg("error in shadow_info array: " + e.name + "<br/>" + json);
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
    setStatusMsg(text);
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

