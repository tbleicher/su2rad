// switches to call right functions for context

//var su2rad = new Object();
var su2rad = su2rad ? su2rad : new Object()

if (navigator.userAgent.indexOf("Windows") != -1) {
    su2rad.PATHSEP = "/";    // helps with file handling in Ruby
    su2rad.PLATFORM = "Windows";
} else {
    su2rad.PATHSEP = "/";
    su2rad.PLATFORM = "Mac";
}

// flag for backend 
su2rad.SKETCHUP = false;
su2rad.NSIDOM = false;
su2rad.BROWSER = "";
su2rad.NSIDOM = false;



su2rad.dialog = su2rad.dialog ? su2rad.dialog : new Object()
su2rad.dialog.expFunc = su2rad.dialog.expFunc ? su2rad.dialog.expFunc : new Object()

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
    //dummy function to be reasigned to real callback
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

// set BROWSER var 
var userAgent = navigator.userAgent;
log.debug("userAgent: " + userAgent);
var engine = "";
var engine = userAgent.match(/AppleWebKit/i)
if ( engine == "AppleWebKit" ) {
    su2rad.BROWSER = "Safari";
} else {
    var engine = userAgent.match(/Gecko/i)
    if ( engine == "Gecko" ) {
        su2rad.BROWSER = "Gecko";
        su2rad.NSIDOM = true;
    }
}
log.debug("browser: " + su2rad.BROWSER);


su2rad.utils = su2rad.utils ? su2rad.utils : new Object()

su2rad.utils.arrayFromJSON = function(json) {
    try {
        eval("var array = " + json);
    } catch (e) {
        logError(e);
        var array = new Array();
    }
    return array
}

su2rad.utils.decodeJSON = function(text) {
    var json = unescape(text)
    return json;
}

su2rad.utils.decodeText = function (encText) {
    // text file is encoded via urlEncode - replace '+'
    var text = unescape(encText)
    text = text.replace(/\+/g,' ');
    return text;
}

su2rad.utils.encodeJSON = function (json) {
    var text = escape(json);
    return text;
}


function logError(e) {
    log.error(e.toString())
    log.error("e.name " + e.name)
    log.error("e.message " + e.message)
    log.error("e.fileName " + e.fileName)
    log.error("e.lineNumber " + e.lineNumber)
}

function reverseData(val) {
    var d="";
    var temp="";
    for (var x=val.length; x>0; x--) {
        d+=val.substring(x,eval(x-1));
    }
    return d;
}

function splitPath(val) {
    var text="fileselection: '" + val + "'<br/>";
    su2rad.dialog.setStatusMsg(text);
    val = val.replace(/\\/g, "/");   
    val=encodeURI(val);
    var reversedsrc=reverseData(val);
    su2rad.dialog.setStatusMsg(text);
    var nameEnd=reversedsrc.indexOf(su2rad.PATHSEP);
    var name=reversedsrc.substring(0,nameEnd);
    name=reverseData(name);
    name=decodeURI(name);
    text += "name: '" + name + "'<br/>";
    su2rad.dialog.setStatusMsg(text);
    var path=reversedsrc.substring(nameEnd, reversedsrc.length);
    path=reverseData(path);
    path=decodeURI(path);
    text += "path: '" + path + "'<br/>";
    su2rad.dialog.setStatusMsg(text);
    return [path,name];
    //text += "reversedsrc: " + reversedsrc + "<br/>";
    //text += "name rev: '" + name + "'<br/>";
    //text += "name esc: '" + name + "'<br/>";
    //text += "path rev: '" + path + "'<br/>";
    //text += "path esc: '" + path + "'<br/>";
}

function replaceChars(text) {
    text = text.replace(/"/g,"");
    text = text.replace(/'/g,"");
    text = text.replace(/\(/g,"");
    text = text.replace(/\)/g,"");
    text = text.replace(/ /g,"_");
    text = text.replace(/</g,"");
    text = text.replace(/>/g,"");
    return text;
}

