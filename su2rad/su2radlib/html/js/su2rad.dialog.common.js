// switches to call right functions for context

var su2rad = new Object();

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


su2rad.dialog = new Object();

function setSketchup() {
    // switch to actions for Sketchup (skp:...)
    log.info('using Sketchup backend ...'); 
    log.debug('browser: ' + navigator.userAgent);
    su2rad.SKETCHUP = true;
    evaluateSketchup();
}

function setTest() {
    // set dummy actions
    try {
        log.info('using dummy backend ...'); 
        log.debug('browser: ' + navigator.userAgent);
    } catch (e) {
        // log might not be defined yet
    }
    su2rad.SKETCHUP = false;
    evaluateSketchup();
}

function evaluateSketchup() {
}

function decodeJSON(text) {
    var json = unescape(text)
    return json;
}

function decodeText(encText) {
    // text file is encoded via urlEncode - replace '+'
    var text = unescape(encText)
    text = text.replace(/\+/g,' ');
    return text;
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
    if (su2rad.SKETCHUP == true) {
        window.location = 'skp:loadTextFile@' + fname;
    } else {
        log.warn("Warning: can't load file without backend! (fname='" + fname + "')");
        loadFileCallback('');
    }
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
    setStatusMsg(text);
    val = val.replace(/\\/g, "/");   
    val=encodeURI(val);
    var reversedsrc=reverseData(val);
    setStatusMsg(text);
    var nameEnd=reversedsrc.indexOf(su2rad.PATHSEP);
    var name=reversedsrc.substring(0,nameEnd);
    name=reverseData(name);
    name=decodeURI(name);
    text += "name: '" + name + "'<br/>";
    setStatusMsg(text);
    var path=reversedsrc.substring(nameEnd, reversedsrc.length);
    path=reverseData(path);
    path=decodeURI(path);
    text += "path: '" + path + "'<br/>";
    setStatusMsg(text);
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

