
su2rad = su2rad ? su2rad : new Object()
su2rad.dialog = su2rad.dialog ? su2rad.dialog : new Object()
su2rad.dialog.geonames = su2rad.dialog.geonames ? su2rad.dialog.geonames : new Object()

su2rad.dialog.geonames.formatCity = function (city) {
    var cityLong = city.name + " (" + city.adminName1 + ")";
    var lat = parseFloat(city.lat).toFixed(4);
    var lng = parseFloat(city.lng).toFixed(4);
    var args = [city.name, city.countryName, lat, lng].join("','");
    var text = "<a onClick=\"su2rad.dialog.location.onClickCity('" + args + "')\"><b>" + cityLong + "</b></a>"
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

su2rad.dialog.geonames.jDataErrorMsg = function (jData, e) {
    try {
        var msg = "ERROR for 'jData.gmtOffset':</br> - " + e.name;
        msg += "</br>jData.status.message:</br> - " + jData.status.message;
        msg += "</br>jData.status.value:</br> - " + jData.status.value;
        log.error(msg)
        log.trace(e)
    } catch (err) {
        log.trace(err)
    }
}

su2rad.dialog.geonames.lookup = function (lat,long,zoom) {
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
    // geonames.org http request 
    log.info("sending JSONscriptRequest ...")
    request = "http://ws.geonames.org/findNearbyJSON?lat=" + lat + "&lng=" + long + "&radius=" + radius + feature + "&style=full&callback=geonamesCallback";
    var text = "<b>geonames request in progress ...</b><br/><span style=\"font-size: small;\">";
    text += request + "</span>";
    su2rad.dialog.setStatusMsg(text);
    //document.body.style.cursor='wait';
    // Create a new script object
    aObj = new JSONscriptRequest(request);
    // Build and execute ('add') the script tag
    aObj.buildScriptTag();
    aObj.addScriptTag();
}

su2rad.dialog.geonames.setLocationFromGeonames = function (geoLoc) {
    log.info("new location: " + this.formatCity(geoLoc))
    var offset = 0;
    try {
        offset = geoLoc.timezone.gmtOffset;
        // unset TZHighlight
        clearTZWarning();
    } catch (e) {
        log.warn("location has no timezone info (" + e.name + ")");
        offset = su2rad.dialog.location.calculateTZOffset(parseFloat(geoLoc.lng));
    }
    su2rad.settings.location.setValue('City', geoLoc.name);
    su2rad.settings.location.setValue('Country', geoLoc.countryName);
    su2rad.settings.location.setValue('TZOffset', offset);
    su2rad.dialog.location.setTZOffsetSelection(offset);
}

su2rad.dialog.geonames.timezone = function (lat,lng) {
    var request = "http://ws.geonames.org/timezoneJSON?lat=" + lat + "&lng=" + lng + "&callback=geonamesTimeZoneCallback";
    log.info("sending JSON time zone request ...")
    // Create a new script object
    //document.body.style.cursor='wait';
    aObj = new JSONscriptRequest(request);
    // Build and execute ('add') the script tag
    aObj.buildScriptTag();
    aObj.addScriptTag();
}



function geonamesCallback(jData) {
    // restore cursor
    //document.body.style.cursor='auto';
    // check if there was a problem parsing search results
    if (jData == null) {
        log.warn("geonames: no data object received");
        return false;
    }
    // test if 'jData.geonames' exists
    try {
        log.info("jData.geonames [length=" + jData.geonames.length + "]");
    }
    catch (e) {
        su2rad.dialog.geonames.jDataErrorMsg(jData,e);
        return false;
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
                text = text + su2rad.dialog.geonames.formatCity(city) + "<br />"
                if (parseFloat(city.distance) < minDist) {
                    minDist = parseFloat(city.distance);
                    minDistIdx = i;
                }
            }
        }
        // set closest city
        city = jData.geonames[minDistIdx];
        su2rad.dialog.geonames.setLocationFromGeonames(city);
        su2rad.dialog.sky.update()
        su2rad.dialog.setStatusMsg(text); 
    } else {
        log.info("geonames: no locations found");
    }
}

function geonamesTimeZoneCallback(jData) {
    // restore cursor
    //document.body.style.cursor='auto';
    // check if there was a problem parsing search results
    if (jData == null) {
        log.warn("no data returned")
        return false;
    }
    // Test if 'geonames' exists
    try {
        log.info("jData.gmtOffset: " + jData.gmtOffset);
        su2rad.settings.location.setValue('TZOffset', jData.gmtOffset);
        su2rad.dialog.location.setTZOffsetSelection(jData.gmtOffset);
        clearTZWarning();
    }
    catch (e) {
        su2rad.dialog.geonames.jDataErrorMsg(jData,e);
        return false;
    }
}
