var su2rad = su2rad ? su2rad : new Object()
su2rad.dialog = su2rad.dialog ? su2rad.dialog : new Object()
su2rad.dialog.googleMap = su2rad.dialog.googleMap ? su2rad.dialog.googleMap : new Object()

// use online map and geonames
su2rad.dialog.googleMap.onlineLookup = true;
su2rad.dialog.googleMap.gMapLoaded = false;



function resetCityCountry() {
    // unused?
    log.info("resetting city and country names ...");
    modelLocation.setValue('City', "no city");
    modelLocation.setValue('Country', "no country");
    modelLocation.changed = true;
}


function loadGoogleMap_BROKEN(url, callback) {
    log.warn("loadGoogleMap ...")
    // TODO: load Google Maps API on demand
    var script = document.createElement("script");
    script.type = "text/javascript";
    if (script.readyState) {
        // IE
        script.onreadystatechange = function() {
            if (script.readyState == "loaded" || script.readyState == "complete") {
                script.onreadystatechange = null;
                callback();
            }
        }
    } else {
        // others
        script.onload = function() {
            callback();
        }
    }
    script.src = url
    document.getElementsByTagName("head")[0].appendChild(script);
}

function googleMapLoadCallback() {
    log.debug("googleMapLoadCallback()")
    su2rad.dialog.googleMap.gMapLoaded = true;
    su2rad.dialog.googleMap.toggleGoogleMap()
}

su2rad.dialog.googleMap.loadGoogleMap = function () {
    log.info("loadGoogleMap()")
    $.getScript("http://maps.google.com/maps?file=api&v=2&async=2&callback=googleMapLoadCallback&key=ABQIAAAAVkCvvMxWS6sy1KKSLvN3URTDis0fJxnS-wzgwKhlyWVJxXLRhxQq9kdL_d2nO8XPOQO2xIrAWCmccw")
}

su2rad.dialog.googleMap.checkGoogleMap = function () {
    // check if google map API could be loaded ('ReferenceError' if not)
    log.info("checkGoogleMap()");
    if (su2rad.dialog.googleMap.onlineLookup == false) {
        return false;
    }
    try {
        // load google map API on demand 
        var isCompatible = GBrowserIsCompatible();
        return true;
    } catch (e) {
        if (e.name == "ReferenceError") {
            log.debug("checkGoogleMap(): map API not available ('" + e.name + "')");
        } else {
            log.warn("google map API: " + e);
        }
        su2rad.dialog.googleMap.disable();
        su2rad.dialog.googleMap.onlineLookup = false;
        return false;
    }
}

su2rad.dialog.googleMap.toggleGoogleMap = function() {
    log.info("toggleGoogleMap()")
    if (this.gMapLoaded == false) {
        su2rad.dialog.googleMap.loadGoogleMap()
    } else {
        this.toggleGoogleMap2()
    }
}

su2rad.dialog.googleMap.toggleGoogleMap2 = function() {
    log.debug("toggleGoogleMap2()")
    // now set visibility
    if (this.checkGoogleMap() == false) {
        return;
    }
    if (document.getElementById("useGoogleMap").checked == true) {
        document.getElementById("googleMapPanel").style.display='';
        var lat  = modelLocation.Latitude;
        var long = modelLocation.Longitude; 
        // check values of input boxes
        var newLat = parseFloat(document.getElementById("Latitude").value);
        if (!isNaN(newLat)) { 
            lat = newLat;
        } else {
            log.warn("Latitude.value isNaN(): '" + newLat + ", " + isNaN(newLat) + ")");
            document.getElementById("Latitude").value = lat;
            resetCityCountry();
        }
        var newLong = parseFloat(document.getElementById("Longitude").value);
        if (!isNaN(newLong)) { 
            long = newLong;
        } else {
            log.warn("Longitude.value isNaN(): '" + newLong + ", " + isNaN(newLong) + ")");
            document.getElementById("Longitude").value = long;
            resetCityCountry();
        }
        // set google map location
        su2rad.dialog.googleMap.initialize(lat,long);
    }
    else {
        GUnload();
        document.getElementById("googleMapPanel").style.display='none';
    }
}


/* this map canvas code is taken from the google examples */
su2rad.dialog.googleMap.centerMarker = function () { 
    map.panTo(marker.getPoint());
}

su2rad.dialog.googleMap.Drag = function () {
    // provide feedback via lat/lng display
    var point = marker.getPoint();
    document.getElementById('Latitude').value   = point.lat().toFixed(4);
    document.getElementById('Longitude').value  = point.lng().toFixed(4);
    //var loc = "loc=(" + point.lat().toFixed(4) + "," + point.lng().toFixed(4) + ")"
    //document.getElementById("message").innerHTML = loc;
}

su2rad.dialog.googleMap.Dragend = function () {
    su2rad.dialog.googleMap.centerMarker();
    var point = marker.getPoint();
    su2rad.dialog.location.setLatLong(point.lat(), point.lng());
    var zoom = map.getZoom(); 
    su2rad.dialog.sky.update();
    geonamesLookup(point.lat(), point.lng(), zoom);
}

su2rad.dialog.googleMap.setCenter = function (lat,long,zoom) {
    log.debug("setCenter")
    if (this.checkGoogleMap() == false) {
        log.warn("googleMap.SetCentre: map API not available");
        return;
    }
    var latlong = new GLatLng(lat, long);
    marker.setLatLng(latlong);
    if (zoom == null) {
        zoom = map.getZoom();
    }
    map.setCenter(latlong, zoom);
}

su2rad.dialog.googleMap.initialize = function (lat,long) {
    log.debug("googleMap.initialize");
    if (this.checkGoogleMap() == false) {
        return;
    }
    // initialize map stuff 
    try {
        var isCompatible = GBrowserIsCompatible()
    } catch (e) {
        if (e.name == "ReferenceError") {
            log.info("google map API not available ('" + e.name + "': not online?)")
        } else {
            log.error("google map API not available ('" + e.name + "')")
        }
        this.disable();
        return;
    }
    if (GBrowserIsCompatible()) {
        log.debug("GBrowserIsCompatible == true")
        var latlong = new GLatLng(lat, long);
        map = new GMap2(document.getElementById("map_canvas"));
        map.addControl(new GLargeMapControl());
        map.addControl(new GMapTypeControl());
        map.setCenter(latlong, 7);
        
        // dragable marker icon 
        var icon = new GIcon();
        icon.image = "./css/mm_20_yellow.png";
        icon.shadow = "./css/mm_20_shadow.png";
        icon.iconSize = new GSize(12, 20);
        icon.shadowSize = new GSize(22, 20);
        icon.iconAnchor = new GPoint(6, 20);

        marker = new GMarker(latlong, {icon:icon, draggable:true});
        map.addOverlay(marker);
        marker.enableDragging();
        
        GEvent.addListener(marker, "drag", su2rad.dialog.googleMap.Drag);
        GEvent.addListener(marker, "dragend", su2rad.dialog.googleMap.Dragend);
        // GEvent.addListener(map, "zoomend", function() {
        //     document.getElementById("zoom").value=map.getZoom();
        //     su2rad.dialog.googleMap.Drag();
        // });
        // GEvent.addListener(map, "moveend", function() {
        //     var center = map.getCenter();
        //     document.getElementById("message").innerHTML = "loc=" + center.toString();
        // });
        // GEvent.addListener(marker, "dragend", su2rad.dialog.googleMap.centerMarker);
        su2rad.dialog.googleMap.centerMarker();

        // set marker on mouse click events 
        GEvent.addListener(map, "mousemove", function(currentPoint) {
            // store coords in global var lastPoint
            lastPoint = currentPoint;
        });
        GEvent.addListener(map, "click", function() {
            // now access coords stored in lastPoint
            marker.setLatLng(lastPoint);    
            var zoomlevel = map.getZoom();
            map.setCenter(lastPoint, zoomlevel+2);
            // su2rad.dialog.googleMap.centerMarker();
        });
        // set centre to current location coords 
        // window.resizeBy(10,0);
    }
}  

su2rad.dialog.googleMap.disable = function () {
    this.enable(false);
}

su2rad.dialog.googleMap.enable = function (enable) {
    if (enable == false) {
        log.info("disabling Google Map");
        document.getElementById("useGoogleMap").checked = false; 
        document.getElementById("useGoogleMap").style.display = 'none'; 
        document.getElementById("googleMapPanel").style.display='none';
        document.getElementById("googleMapHeader").innerHTML='<i>Google Map not available</i>';
    } else {
        log.info("enabling Google Map");
        document.getElementById("useGoogleMap").checked = true;
        document.getElementById("useGoogleMap").style.display = ''; 
        document.getElementById("googleMapPanel").style.display = '';
        document.getElementById("googleMapHeader").innerHTML = ' use Google Map';
    }
}

su2rad.dialog.googleMap.lookup = function () {
    var city = document.getElementById("City").value;
    var country = document.getElementById("Country").value;
    var location = city + ', ' + country;
    this.lookupLocation(location);
}

su2rad.dialog.googleMap.lookupLocation = function (location) {
    // log.info("su2rad.dialog.googleMap.Lookup(): '" + location + "'");
    var geocoder = new GClientGeocoder();
    geocoder.getLatLng(location, function(point) {
        if (!point) {
            var msg = "'" + location + "' could not be found!";
            log.warn(msg);
            alert(msg);
        } else {
            su2rad.dialog.setStatusMsg('');  // clear near by cities list
            su2rad.dialog.location.setLatLong(point.lat(),point.lng());
            this.enable();
            this.initialize(point.lat(),point.lng());
            geonamesTimeZone(point.lat(),point.lng()); 
        }
    });
}

su2rad.dialog.googleMap.updateLocation = function () {
    // google map initiation
    log.debug("updateLocation()")
    if (this.gMapLoaded == false) {
        return;
    }
    if (this.checkGoogleMap() == false) {
        return;
    }
    var lat = modelLocation.Latitude;
    var lng = modelLocation.Longitude; 
    var mLat = marker.getPoint().lat()
    var mLng = marker.getPoint().lng()
    if (lat.toFixed(4) != mLat.toFixed(4) || lng.toFixed(4) != mLng.toFixed(4)) {
        log.debug("updating map: lat='" + lat.toFixed(4) + "' mLat='" + mLat.toFixed(4) + "' lng='" + lng.toFixed(4) + "' mLng='" + mLng.toFixed(4) + "'")
        try {
            var latlng = new GLatLng(lat, lng);
            map.setCenter(latlng, map.getZoom());
        } catch (e) {
            // there may not be a map yet
            if (e.name == "TypeError") {
                log.debug(e + " - no map yet?");
            } else {
                log.error(e);
            }
        }
    }
    // su2rad.dialog.googleMap.initialize(lat,lng);
}


