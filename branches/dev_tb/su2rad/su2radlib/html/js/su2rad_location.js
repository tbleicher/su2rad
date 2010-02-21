
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
    var sky = su2rad.settings.sky.toString() + loc;
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




var su2rad = su2rad ? su2rad : new Object()
su2rad.dialog = su2rad.dialog ? su2rad.dialog : new Object()
su2rad.dialog.location = su2rad.dialog.location ? su2rad.dialog.location : new Object()

su2rad.dialog.location.calculateTZOffset = function (long) {
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
    su2rad.dialog.location.setTZHighlight(true); 
    return offset;
}

su2rad.dialog.location.checkValueLatLong = function (id, minmax) {
    var vNum = document.getElementById(id).value;
    var num = parseFloat(vNum);
    if (isNaN(num)) {
        alert(id + " is not a number: '" + vNum + "'");
        document.getElementById(id).value = su2rad.settings.location[id].toFixed(4);
        document.getElementById(id).focus;
        return false;
    } else if (num < (-1*minmax) || num > minmax) {
        alert(id + " not between -" + minmax + "and +" + minmax +": " + num.toFixed(4));
        document.getElementById(id).value = su2rad.settings.location[id].toFixed(4);
        document.getElementById(id).focus;
        return false;
    }
    return true;
}

su2rad.dialog.location.clearTZWarning = function () {
    // reset warning message 
    su2rad.dialog.location.setTZHighlight(false);
    this.setLocationWarning("");
}

su2rad.dialog.location.onCityCountryChanged = function () {
    var city = document.getElementById("City").value;
    if (city != su2rad.settings.location.City) {
        su2rad.settings.location.setValue('City', city);
        document.getElementById("googleMapLookup").disabled = false;
    }
    var country = document.getElementById("Country").value;
    if (country != su2rad.settings.location.Country) {
        su2rad.settings.location.setValue('Country', country);
        document.getElementById("googleMapLookup").disabled = false;
    }
    su2rad.dialog.sky.update()
    applySkySettings();
}

su2rad.dialog.location.onClickCity = function (city, country, lat, lng) {
    // center map on lat/lng of city from geonames
    log.info("new city selected: " + city);
    su2rad.settings.location.setValue('City', city);
    su2rad.settings.location.setValue('Country',country);
    su2rad.settings.location.setValue('Latitude', lat);
    su2rad.settings.location.setValue('Longitude', lng);
    su2rad.dialog.googleMap.setCenter(parseFloat(lat),parseFloat(lng),11);
    su2rad.dialog.setStatusMsg('');
    su2rad.dialog.sky.update();
    applySkySettings();
}

su2rad.dialog.location.onLatLongChange = function () {
    if (this.checkValueLatLong("Latitude", 90) == false) {
        return;
    }
    if (this.checkValueLatLong("Longitude", 190) == false) {
        return;
    }
    var lat = parseFloat(document.getElementById("Latitude").value);
    var lng = parseFloat(document.getElementById("Longitude").value);
    this.setLatLong(lat,lng);
    su2rad.dialog.sky.update();
    if (document.getElementById("useGoogleMap").checked == true) {
        su2rad.dialog.googleMap.setCenter(lat,lng);
        su2rad.dialog.geonames.timezone(lat,lng);
        su2rad.dialog.geonames.lookup(parseFloat(lat), parseFloat(lng), map.getZoom());
    }
    applySkySettings();
}

su2rad.dialog.location.onNorthAngleChange = function () {
    if (this.checkValueLatLong("NorthAngle", 360) == false) {
        return;
    }
    var north = parseFloat(document.getElementById("NorthAngle").value);
    su2rad.settings.location.setValue('NorthAngle', north);
    su2rad.dialog.sky.update();
    applySkySettings();
} 

su2rad.dialog.location.onSelectTZ = function () {
    var offset = document.getElementById('TZOffset').value;
    su2rad.settings.location.setValue('TZOffset', offset);
    this.setTZHighlight(false);
    this.setLocationWarning("");
    this.setTZWarning(parseFloat(offset));
    su2rad.dialog.sky.update();
    applySkySettings();
}

su2rad.dialog.location.setLatLong = function (lat,lng) {
    su2rad.settings.location.setValue('Latitude', lat);
    if (su2rad.settings.location.Longitude != parseFloat(lng)) {
        su2rad.settings.location.setValue('Longitude', lng);
        var offset = this.calculateTZOffset(lng);
        su2rad.settings.location.setValue('TZOffset', offset);
        this.setTZOffsetSelection(offset);
        this.setLocationWarning("<input type=\"button\" value=\"confirm TZ\" onclick=\"su2rad.dialog.location.clearTZWarning()\" />");
    }
}

su2rad.dialog.location.setLocationWarning = function (msg) {
    document.getElementById("meridianWarning").innerHTML = msg;
}

su2rad.dialog.location.arrayFromJSON = function (text) {
    // convert JSON response string into javascript array
    var json = su2rad.utils.decodeJSON(text);
    try {
        eval("var array = " + json);
    } catch (e) {
        logError(e);
        su2rad.dialog.setStatusMsg("error in shadow_info array: " + e.name + "<br/>" + json);
        var array = new Array();
    }
    return array;
} 

su2rad.dialog.location.setShadowInfoJSON = function (msg) {
    // parse and apply shadow_info settings in JSON string 'msg'
    //log.debug("setShadowInfoJSON()")
    shadowinfo = this.arrayFromJSON(msg);
    var text = '<b>shadow info settings:</b><br/>';
    su2rad.settings.location.logging = false;
    for(var j=0; j<shadowinfo.length; j++) {
        var attrib = shadowinfo[j];
        if(attrib != null) {
            su2rad.settings.location.setValue(attrib.name, attrib.value);
            text = text + '&nbsp;&nbsp;<b>' + attrib.name + ':</b> ' + attrib.value + '<br/>';
        }
    }
    su2rad.settings.location.parseSkyCmd();
    su2rad.settings.location.changed = false;
    su2rad.settings.location.logging = true;
    this.clearTZWarning();
    su2rad.dialog.setStatusMsg(text);
    su2rad.settings.sky.parseSkyCommand(su2rad.settings.location.SkyCommand);
    su2rad.settings.skytime.setFromShadowTime_time_t(su2rad.settings.location.ShadowTime_time_t);
    //su2rad.dialog.googleMap.initialize(su2rad.settings.location.Latitude, su2rad.settings.location.Longitude);
    su2rad.dialog.sky.update();
}

su2rad.dialog.location.setTZHighlight = function(set) {
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

su2rad.dialog.location.setTZOffsetSelection = function (offset) {    
    //log.debug("setTZOffsetSelection(offset=" + offset + ")");
    offset = parseFloat(offset);
    var tz = document.getElementById('TZOffset');
    for (var i=0; i < tz.length; i++) {
        if (parseFloat(tz[i].value) == offset) {
            tz[i].selected = true;
        }
    }
    this.setTZWarning(offset);
}

su2rad.dialog.location.setTZWarning = function (offset) {
    var mer = offset*15.0;
    var diff = parseFloat(document.getElementById('Longitude').value) - mer;
    if (diff > 25 || diff < -25) {
        setLocationWarning("diff to meridian: " + diff.toFixed(1));
    }
}

su2rad.dialog.location.update = function () {
    document.getElementById('City').value       = su2rad.settings.location.City;
    document.getElementById('Country').value    = su2rad.settings.location.Country;
    document.getElementById('Latitude').value   = su2rad.settings.location.Latitude.toFixed(4);
    document.getElementById('Longitude').value  = su2rad.settings.location.Longitude.toFixed(4);
    document.getElementById('NorthAngle').value = su2rad.settings.location.NorthAngle.toFixed(2);
    var radLng = su2rad.settings.location.Longitude*-1
    document.getElementById('radianceLongitude').innerHTML = "-o " + radLng.toFixed(4);
    this.setTZOffsetSelection(su2rad.settings.location.TZOffset);
    // set meridian display
    var mer = parseFloat(document.getElementById('TZOffset').value)*-15.0;
    document.getElementById('meridianDisplay').innerHTML = "-m " + mer.toFixed(1);
    // check values
    //this.checkValueLatLong("Latitude", 90);
    //this.checkValueLatLong("Longitude", 190);
    //this.checkValueLatLong("NorthAngle", 360);
    su2rad.dialog.sky.controller.setSkyCmdLine();
}

