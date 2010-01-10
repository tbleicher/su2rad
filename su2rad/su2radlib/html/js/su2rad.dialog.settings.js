// js functions for settings dialog
var su2rad = su2rad ? su2rad : new Object()
su2rad.dialog = su2rad.dialog ? su2rad.dialog : new Object()
su2rad.dialog.settings = su2rad.dialog.settings ? su2rad.dialog.settings : new Object()


su2rad.dialog.settings._currentPathKey = ""

su2rad.dialog.settings.setButtonState = function (state) {
    var button = document.getElementById("apply_button")
    if (state == "disabled") {
        button.disabled = true
        document.getElementById("cancel_button").value = "close"
    } else {
        button.disabled = false
        document.getElementById("cancel_button").value = "cancel"
    }
}

su2rad.dialog.settings.getBrowseButton = function (setting) {
    var button = document.createElement("input")
    button.setAttribute("type", "button")
    button.setAttribute("value", "...")
    button.className = "pathButton"
    button.onclick = (function(n,p){return function(){su2rad.dialog.settings.showFileBrowser(n,p);}})(setting.name, setting.value);
    return button
}

su2rad.dialog.settings.getChoiceValue = function (name) {
    var value = document.getElementById(name + "_select").value
    var bgdiv = document.getElementById(name + "_div")
    if (value != this._savedValues[name].value) {
        var msg = "new value for setting '" + name + "': " + value
        log.info(msg)
        //humanMsg.displayMsg(msg)
        // set background color if value has changed
        bgdiv.style.background = 'skyblue'
        window.location = 'skp:newSetting@' + encodeURI(name + '&' + value)
    } else {
        bgdiv.style.background = '#cbe6f4';
        window.location = 'skp:removeTempSetting@' + name
    }
}

su2rad.dialog.settings.getHelpDiv = function (setting) {
    var helpDiv = document.createElement("div")
    helpDiv.className = "setting_help"
    helpDiv.id = setting.name + "_help"
    helpDiv.appendChild(document.createTextNode(setting.help + " "));
    var hidehelp = document.createElement('a');
    hidehelp.href = "#";
    hidehelp.onclick = (function(n){return function(){su2rad.dialog.settings.hideHelp(n);}})(setting.name);
    hidehelp.appendChild(document.createTextNode("[hide help]"));
    helpDiv.appendChild(hidehelp)
    return helpDiv
}

su2rad.dialog.settings.getInputElement = function (setting) {
    var input;
    if (setting.type == "choice") {
        // create choice input element
        input = document.createElement("select")
        input.setAttribute('id', setting.name + "_select")
        // input.onchange = (function(n){return function(){su2rad.dialog.settings.getChoiceValue(n);}})(setting.name);
        // create options
        input.options.length = 0
        var opts = setting.options.split("|")
        for (var i=0;i<opts.length;i++) {
            var o = new Option(opts[i], opts[i])
            if (opts[i] == setting.value) {
                o.selected = true;
            }
            if (document.createEventObject) {
                // this is IE
                input.add(o,i)
            } else {
                input.add(o,null)
            }
        }
    } else {
        input = document.createElement("input")
        input.setAttribute("type", "text")
        input.setAttribute("value", setting.value)
        if (setting.type == "path") {
            input.className = "pathInput"
        } else if (setting.type == "number") {
            input.className = "numberInput"
        }
    }
    input.setAttribute('id', setting.name + "_select")
    input.onchange = (function(n){return function(){su2rad.dialog.settings.getChoiceValue(n);}})(setting.name);
    return input
}

su2rad.dialog.settings.getNameDiv = function(setting) {
    var optName = document.createElement("span")
    optName.className = "setting_name"
    // link
    var showhelp = document.createElement('a');
    showhelp.href = "#";
    showhelp.id = setting.name + "_showhelp"
    // this seems to be necessary for IE instead of setAttribute('onclick', ...)
    showhelp.onclick = (function(n){return function(){su2rad.dialog.settings.showHelp(n);}})(setting.name);
    showhelp.appendChild(document.createTextNode(setting.name));
    optName.appendChild(showhelp)
    return optName
}

su2rad.dialog.settings.getOptionDiv = function(setting) {
    var optDiv = document.createElement("div")
    optDiv.id = setting.name + "_div"
    optDiv.appendChild(this.getNameDiv(setting))
    // input elements
    if (setting.type == "path") {
        optDiv.appendChild(this.getBrowseButton(setting))
    }
    optDiv.appendChild(this.getInputElement(setting))
    optDiv.appendChild(this.getHelpDiv(setting))
    return optDiv
}

su2rad.dialog.settings.hideHelp = function (name) {
    var el = document.getElementById(name + "_help").style.display = "none";
    var anchor = document.getElementById(name + "_showhelp")
    anchor.onclick = (function(n){return function(){su2rad.dialog.settings.showHelp(n);}})(name);
    return false;
}

su2rad.dialog.settings.onApply = function () {
    window.location = 'skp:applySettings@'
}

su2rad.dialog.settings.onClose = function () {
    window.location = 'skp:closeDialog@'
}

su2rad.dialog.settings.setCurrentOptions = function (text) {
    json = unescape(text)
    try {
        eval("var settings = " + json);
    } catch (e) {
        log.error("error = " + e)
        var settings = new Array();
    }
    
    // keep values in file for comparison
    this._savedValues = {}
    for (var i=0; i<settings.length; i++) {
        var setting = settings[i]
        this._savedValues[setting.name] = setting
    }
    
    // fill container div
    var container = document.getElementById("settings_container")
    while (container.childNodes[0]) {
        container.removeChild(container.childNodes[0])
    }
    for (var i=0; i<settings.length; i++) {
        var setting = settings[i];
        // start with div containing option
        if (setting.type == 'title') {
            var title = document.createElement("h3")
            title.appendChild(document.createTextNode(setting.name));
            container.appendChild(title)
        } else {
            var optDiv = this.getOptionDiv(setting)
            container.appendChild(optDiv)
        }
    }
    $(".numberInput").numeric({allow:"."})
}

su2rad.dialog.settings.newPath = function (path) {
    var name = su2rad.dialog.settings._currentPathKey
    if (name != "") {
        su2rad.dialog.settings._currentPathKey = ""
        var input = document.getElementById(name + "_select")
        input.value = path
        su2rad.dialog.settings.getChoiceValue(name)
    } else {
        log.error("no '_currentPathKey'")
        su2rad.dialog.settings._currentPathKey = ""
    }
}

su2rad.dialog.settings.showFileBrowser = function (name,path) {
    try {
        $('#fileSelectorWindow').jqm();
        log.debug("starting file browser for key '" + name + "'")
        this._currentPathKey = name
        su2rad.dialog.settings._currentPathKey = name
        su2rad.dialog.fileSelector.callback = su2rad.dialog.settings.newPath
        su2rad.dialog.fileSelector.writeaccess = false
        su2rad.dialog.fileSelector.show(path)
    } catch (e) {
        log.error(e)
    }
}

su2rad.dialog.settings.showHelp = function (name) { 
    var el = document.getElementById(name + "_help").style.display = "block";
    var anchor = document.getElementById(name + "_showhelp")
    anchor.onclick = (function(n){return function(){su2rad.dialog.settings.hideHelp(n);}})(name);
    return false;
}

su2rad.dialog.settings.test = function () {
    log.debug("TEST: setting test values")
    var json =   "[{name: 'SU2RAD_FOO_1', value: 'true',   help: 'help for foo1', options: 'true|false', type: 'choice'},"
    json = json + "{name: 'SU2RAD_FOO_2', value: 'false',  help: 'help for foo2', options: 'true|false', type: 'choice'},"
    json = json + "{name: 'SU2RAD_FOO_3', value: 'value3', help: 'help for foo3', options: ''          , type: 'string'},"
    json = json + "{name: 'LOG_LEVEL', value: '0', help: 'help for log level', options: '-2|-1|0|1|2|3', type: 'choice'},"
    json = json + "{name: 'SU2RAD_FOO_4', value: '/usr/local/bin/replmarks', help: 'help for replmarks', type: 'path', options: ''}]"
    su2rad.dialog.settings.setCurrentOptions(json)
}


