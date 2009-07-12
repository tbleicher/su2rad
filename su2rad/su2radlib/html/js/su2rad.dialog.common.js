// switches to call right functions for context
function setSketchup() {
    // switch to actions for Sketchup (skp:...)
    log.info('using Sketchup backend ...'); 
    log.debug('browser: ' + navigator.userAgent);
    SKETCHUP = true;
}

function setTest() {
    // set dummy actions
    try {
        log.info('using dummy backend ...'); 
        log.debug('browser: ' + navigator.userAgent);
    } catch (e) {
        // log might not be defined yet
    }
    SKETCHUP = false;
}

function decodeJSON(text) {
    var json = unescape(text)
    return json;
}

function decodeText(encText) {
    // text file is encoded via urlEncode - replace '+'
    var text = unescape(encText)
    text = text.replace(/\+/g,' ');
    return json;
}

function encodeJSON(json) {
    var text = escape(json);
    return text;
}

function loadFileCallback(text) {
    //dummy function to be reasigned to real callback
}

function loadTextFile(fname) {
    log.debug("loadTextFile() fname='" + fname + "'");
    if (SKETCHUP == true) {
        window.location = 'skp:loadTextFile@' + fname;
    } else {
        log.warn("Warning: can't load file without backend! (fname='" + fname + "')");
        loadFileCallback('');
    }
}

