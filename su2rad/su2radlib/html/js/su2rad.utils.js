
var su2rad = su2rad ? su2rad : new Object()
su2rad.utils = su2rad.utils ? su2rad.utils : new Object()

su2rad.utils.HEXMAP = '0123456789ABCDEF'
su2rad.utils.CHARMAP = " !\"#$%&amp;'()*+'-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~"

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

su2rad.utils.encodeHEX = function (s) {
    var hex = ""
    for (var i=0; i<s.length; i++) {
        var p = this.CHARMAP.indexOf(s[i]);
        var d = (p <= -1) ? 0 : (p + 32);
        hex = hex + this.HEXMAP.charAt((d - d % 16)/16) + this.HEXMAP.charAt(d % 16)
    }
    return hex;
}

su2rad.utils.encodeJSON = function (json) {
    var text = escape(json);
    return text;
}

su2rad.utils.JSON2HTML = function (obj, title, level) {
    // show JSON object with HTML markup
    if (level == null) {
        level = 3;
    }
    var text = "<H"+level+">" + title + "</H"+level+">";
    if (obj.constructor.toString().match(/Array/i)) { 
        for (var i=0; i<obj.length; i++) {
            text += this.JSON2HTML(obj[i], "element "+i, level+1);
        }
    } else {
        log.debug("obj=" + obj);
        for (var property in obj) {
            try {
                text += "<b>" + property.toString() + "</b> = " + obj[property] + "<br/>";
                log.debug(property.toString() + "=" + obj[property]);
            } catch (e) {
                logError(e)
            }
        }
    }
    return text;
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

su2rad.utils.replaceChars = function (text) {
    text = text.replace(/"/g,"");
    text = text.replace(/'/g,"");
    text = text.replace(/\(/g,"");
    text = text.replace(/\)/g,"");
    text = text.replace(/ /g,"_");
    text = text.replace(/</g,"");
    text = text.replace(/>/g,"");
    return text;
}

su2rad.utils.reverseData = function (val) {
    var d="";
    var temp="";
    for (var x=val.length; x>0; x--) {
        d+=val.substring(x,eval(x-1));
    }
    return d;
}

su2rad.utils.splitPath = function (val) {
    val = val.replace(/\\/g, "/");   
    val = encodeURI(val);
    var reversedsrc = this.reverseData(val);
    var nameEnd = reversedsrc.indexOf(su2rad.PATHSEP);
    var name = reversedsrc.substring(0,nameEnd);
    name = this.reverseData(name);
    name = decodeURI(name);
    var path = reversedsrc.substring(nameEnd, reversedsrc.length);
    path = this.reverseData(path);
    path = decodeURI(path);
    return [path,name];
}

