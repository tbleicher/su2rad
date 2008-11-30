
// use online map and geonames
var onlineLookup = true;


function checkGoogleMap() {
    // check if google map API could be loaded ('ReferenceError' if not)
    if (onlineLookup == false) {
        return false;
    }
    try {
        var isCompatible = GBrowserIsCompatible();
        return true;
    } catch (e) {
        if (e.name == "ReferenceError") {
            log.debug("checkGoogleMap(): map API not available ('" + e.name + "')");
        } else {
            log.warn("google map API: " + e);
        }
        googleMapDisable();
        onlineLookup = false;
        return false;
    }
}

function toggleGoogleMap() {
    // now set visibility
    if (checkGoogleMap() == false) {
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
        googleMapInitialize(lat,long);
    }
    else {
        GUnload();
        document.getElementById("googleMapPanel").style.display='none';
    }
}

/* this map canvas code is taken from the google examples */
function googleMapCenterMarker() { 
    map.panTo(marker.getPoint());
}

function googleMapDrag() {
    // provide feedback via lat/lng display
    var point = marker.getPoint();
    document.getElementById('Latitude').value   = point.lat().toFixed(4);
    document.getElementById('Longitude').value  = point.lng().toFixed(4);
    //var loc = "loc=(" + point.lat().toFixed(4) + "," + point.lng().toFixed(4) + ")"
    //document.getElementById("message").innerHTML = loc;
}

function googleMapDragend() {
    googleMapCenterMarker();
    var point = marker.getPoint();
    setLatLong(point.lat(), point.lng());
    var zoom = map.getZoom(); 
    updateSkyPage();
    geonamesLookup(point.lat(), point.lng(), zoom);
}

function googleMapSetCenter(lat,long,zoom) {
    if (checkGoogleMap() == false) {
        log.warn("googleMapSetCentre: map API not available");
        return;
    }
    var latlong = new GLatLng(lat, long);
    marker.setLatLng(latlong);
    if (zoom == null) {
        zoom = map.getZoom();
    }
    map.setCenter(latlong, zoom);
}

function googleMapInitialize(lat,long) {
    if (checkGoogleMap() == false) {
        return;
    }
    log.debug("googleMapInitialize");
    /* initialize map stuff */
    try {
        var isCompatible = GBrowserIsCompatible()
    } catch (e) {
        if (e.name == "ReferenceError") {
            log.info("google map API not available ('" + e.name + "': not online?)")
        } else {
            log.error("google map API not available ('" + e.name + "')")
        }
        googleMapDisable();
        return;
    }
    if (GBrowserIsCompatible()) {
        var latlong = new GLatLng(lat, long);
        map = new GMap2(document.getElementById("map_canvas"));
        map.addControl(new GLargeMapControl());
        map.addControl(new GMapTypeControl());
        map.setCenter(latlong, 7);
        
        /* dragable marker icon */
        var icon = new GIcon();
        icon.image = "./css/mm_20_yellow.png";
        icon.shadow = "./css/mm_20_shadow.png";
        icon.iconSize = new GSize(12, 20);
        icon.shadowSize = new GSize(22, 20);
        icon.iconAnchor = new GPoint(6, 20);

        marker = new GMarker(latlong, {icon:icon, draggable:true});
        map.addOverlay(marker);
        marker.enableDragging();
        
        GEvent.addListener(marker, "drag", googleMapDrag);
        GEvent.addListener(marker, "dragend", googleMapDragend);
        // GEvent.addListener(map, "zoomend", function() {
        //     document.getElementById("zoom").value=map.getZoom();
        //     googleMapDrag();
        // });
        // GEvent.addListener(map, "moveend", function() {
        //     var center = map.getCenter();
        //     document.getElementById("message").innerHTML = "loc=" + center.toString();
        // });
        // GEvent.addListener(marker, "dragend", googleMapCenterMarker);
        googleMapCenterMarker();

        /* set marker on mouse click events */
        GEvent.addListener(map, "mousemove", function(currentPoint) {
            // store coords in global var lastPoint
            lastPoint = currentPoint;
        });
        GEvent.addListener(map, "click", function() {
            // now access coords stored in lastPoint
            marker.setLatLng(lastPoint);    
            var zoomlevel = map.getZoom();
            map.setCenter(lastPoint, zoomlevel+2);
            //googleMapCenterMarker();
        });
        /* set centre to current location coords */
        // window.resizeBy(10,0);
    }
}  

function googleMapDisable() {
    googleMapEnable(false);
}

function googleMapEnable(enable) {
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


function googleMapLookup() {
    var city = document.getElementById("City").value;
    var country = document.getElementById("Country").value;
    var location = city + ', ' + country;
    _googleMapLookupLocation(location);
}


function _googleMapLookupLocation(location) {
    log.info("googleMapLookup(): '" + location + "'");
    var geocoder = new GClientGeocoder();
    geocoder.getLatLng(location, function(point) {
        if (!point) {
            var msg = "'" + location + "' could not be found!";
            log.warn(msg);
            alert(msg);
        } else {
            setStatusMsg('');  // clear near by cities list
            setLatLong(point.lat(),point.lng());
            googleMapEnable();
            googleMapInitialize(point.lat(),point.lng());
            geonamesTimeZone(point.lat(),point.lng()); 
        }
    });
}

function updateGoogleMapLocation() {
    // google map initiation
    if (checkGoogleMap() == false) {
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
    // googleMapInitialize(lat,lng);
}
