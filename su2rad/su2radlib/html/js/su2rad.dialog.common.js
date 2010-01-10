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



su2rad.dialog.expFunc = su2rad.dialog.expFunc ? su2rad.dialog.expFunc : new Object()

su2rad.dialog.expFunc.onCancel = function() {
    try {
        if (su2rad.SKETCHUP != false) {
                //log.info("export canceled by user")
                window.location = 'skp:onCancel@';
        } else {
            su2rad.dialog.hideProgressWindow();
            document.body.innerHTML = "";
            //window.opener='x';
            window.close();
        }
    } catch (e) {
        logError(e)
    }
}

su2rad.dialog.expFunc.onExport = function() {
    log.debug("onExportButton()...")
    if (su2rad.SKETCHUP != false) {
        try {
            log.info("starting export ...")
            window.location = 'skp:onExport@';
        } catch (e) {
            logError(e)
            alert(e.toString())
        }
    } else {
        su2rad.dialog.showBusy()
        log.warn('Sketchup not available; no export action');
        msg  = '{"status"  :"success"';
        msg += ',"messages":"0"';
        msg += ',"files"   :"31"';
        msg += ',"groups"  :"345"';
        msg += ',"faces"   :"45678"}';
        su2rad.dialog.showResults(su2rad.utils.encodeJSON(msg));
    }
}

su2rad.dialog.expFunc.setOption = function (optname, optvalue) {
    log.debug("DEBUG: export.setOption(optname='" + optname + "' optvalue='" + optvalue + "')")
}

su2rad.dialog.expFunc.showFileSelector = function() {
    su2rad.dialog.fileSelector.callback = setExportPath
    var scenepath = document.getElementById('scenePath').value
    su2rad.dialog.fileSelector.show(scenepath)
}

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

su2rad.utils.objectFromJSON = function(json) {
    try {
        eval("var obj = " + json);
    } catch (e) {
        logError(e);
        var obj = new Object();
    }
    return obj
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

