
function ModelLocationObject() {
    this.City = "Rock";
    this.Country = "Hardplace";
    this.NorthAngle = 0.0;
    this.TZOffset = 0;
    this.Latitude = 51.5030;
    this.Longitude = 0.0031;
    this.changed = false;
    this.logging = true;
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
    this.b = '';
    this.B = '';
    this.r = '';
    this.R = '';
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

SkyOptionsObject.prototype.setValue = function(opt, val) {
    log.error("setValue: opt='" + opt + "' val='" + val + "'")
    if (isNaN(parseFloat(val))) {
        return false;
    } else {
        this[opt] = val;
        return true;
    }
}
    
SkyOptionsObject.prototype.toString = function() {
        var text = this.generator;
        text += " " + this.skytype;
        text += " -g " + this.g;
        text += " -t " + this.t;
        var opts = ['b', 'B', 'r', 'R'];
        for(var i=0; i<opts.length; i++) {
            var opt = opts[i];
            if (this[opt] != '') {
                text += " -" + opt + " " + this[opt];
            }
        }
        return text;
    }

var skyOptions = new SkyOptionsObject();


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
    num = parseFloat(vNum);
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
    updateSkyFormValues()
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
    updateSkyFormValues()
}

function onGenskyOptionChanged(opt) {
    var id = "gensky_" + opt;
    var value = document.getElementById(id).value;
    if (value == '') {
        skyOptions.removeOption(opt);
        document.getElementById(id).value = skyOptions[opt];
    } else {
        skyOptions.setValue(opt, value);
    }
    document.getElementById('skyCommandLine').innerHTML = skyOptions.toString();
}

function onNorthAngleChange() {
    if (checkValueLatLong("NorthAngle", 360) == false) {
        return;
    }
    var north = parseFloat(document.getElementById("NorthAngle").value);
    modelLocation.setValue('NorthAngle', north);
    updateSkyFormValues()
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
    updateSkyFormValues();
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
    updateSkyFormValues()
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
    updateSkyFormValues()
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
    updateSkyFormValues();
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
    try {
        var loc = modelLocation.City + ", "+ modelLocation.Country;
        document.getElementById("skySummaryLocation").innerHTML = loc;
        document.getElementById("skySummaryNorth").innerHTML = modelLocation.NorthAngle.toFixed(2);
        var lat = modelLocation.Latitude * 1.0;
        var lng = modelLocation.Longitude * -1.0;
        var mer = modelLocation.TZOffset * -15.0;
        latlng = " -a " + lat.toFixed(4) + " -o " + lng.toFixed(4) + " -m " + mer.toFixed(1);
        log.debug("...skySummaryOptions");
        document.getElementById("skySummaryOptions").innerHTML = skyOptions.toString() + " " + latlng;
    }
    catch (e) {
        log.error(e.name)
    }
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
    document.getElementById('skyCommandLine').innerHTML = skyOptions.toString();
}


function updateSkyFormValues() {
    log.debug("updateSkyFormValues");
    document.getElementById('City').value       = modelLocation.City;
    document.getElementById('Country').value    = modelLocation.Country;
    document.getElementById('Latitude').value   = modelLocation.Latitude.toFixed(4);
    document.getElementById('Longitude').value  = modelLocation.Longitude.toFixed(4);
    document.getElementById('NorthAngle').value = modelLocation.NorthAngle.toFixed(2);
    setTZOffsetSelection(modelLocation.TZOffset);
    // make 'apply' button visible if values have changed
    if (modelLocation.changed == true) {
        document.getElementById("applyLocationValues").disabled=false;
        document.getElementById("reloadShadowInfo").disabled=false;
    } else {
        document.getElementById("applyLocationValues").disabled=true;
        document.getElementById("reloadShadowInfo").disabled=true;
    }
    // check values
    checkValueLatLong("Latitude", 90);
    checkValueLatLong("Longitude", 190);
    checkValueLatLong("NorthAngle", 360);
    // set meridian display
    var mer = parseFloat(document.getElementById('TZOffset').value)*15.0;
    document.getElementById('meridianDisplay').innerHTML = "-m " + mer.toFixed(1);
}
