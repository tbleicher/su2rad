// switches to call right functions for context

//var su2rad = new Object();
var su2rad = su2rad ? su2rad : new Object()
su2rad.dialog = su2rad.dialog ? su2rad.dialog : new Object()

// flag for backend 
su2rad.SKETCHUP = false;

su2rad.dialog.setEnvironment = function () {
    // BROWSER
    su2rad.BROWSER = "";
    su2rad.NSIDOM = false;
    if ( jQuery.browser.mozilla) {
        su2rad.BROWSER = "mozilla";
        su2rad.NSIDOM = true;
    } else if ( jQuery.browser.safari) {
        su2rad.BROWSER = "safari";
    } else if ( jQuery.browser.msie) {
        su2rad.BROWSER = "msie";
    } else if ( jQuery.browser.opera) {
        su2rad.BROWSER = "opera";
    }
    if (su2rad.BROWSER == "") {
        log.warning("Browser could not be identified!")
    } else {
        log.info("browser: " + su2rad.BROWSER);
    }
    log.debug("userAgent: " + navigator.userAgent);

    // PLATFORM 
    if (navigator.userAgent.indexOf("Windows") != -1) {
        su2rad.PATHSEP = "/";    // helps with file handling in Ruby
        su2rad.PLATFORM = "Windows";
    } else {
        su2rad.PATHSEP = "/";
        su2rad.PLATFORM = "Mac";
    }
}
su2rad.dialog.setEnvironment()




su2rad.dialog.setSketchup = function() {
    // switch to actions for Sketchup (skp:...)
    log.info('using Sketchup backend ...'); 
    log.debug('browser: ' + navigator.userAgent);
    su2rad.SKETCHUP = true;
    su2rad.dialog.evaluateSketchup();
}

su2rad.dialog.setTest = function() {
    // set dummy actions
    try {
        log.info('using dummy backend ...'); 
        log.debug('browser: ' + navigator.userAgent);
    } catch (e) {
        // log might not be defined yet
    }
    su2rad.SKETCHUP = false;
    su2rad.dialog.evaluateSketchup();
}

su2rad.dialog.evaluateSketchup = function() {

}

su2rad.dialog.loadFileCallback = function (text) {
    // dummy function to be reasigned to real callback
}

su2rad.dialog.loadTextFile = function (fname) {
    log.debug("loadTextFile() fname='" + fname + "'");
    if (su2rad.SKETCHUP == true) {
        log.debug("skp:loadTextFile@" + fname);
        window.location = 'skp:loadTextFile@' + fname;
    } else {
        log.warn("Warning: can't load file without backend! (fname='" + fname + "')");
        loadFileCallback('');
    }
}

su2rad.dialog.getDefaultDirectory = function () {
    log.debug("XXX getDefaultDirectory()")
    return "/Users/ble/Desktop/testex"
}


function logError(e) {
    log.trace(e)
    // log.error(e.toString())
    // log.error("e.name " + e.name)
    // log.error("e.message " + e.message)
    // log.error("e.fileName " + e.fileName)
    // log.error("e.lineNumber " + e.lineNumber)
}

