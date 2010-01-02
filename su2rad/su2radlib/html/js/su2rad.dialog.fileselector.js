
su2rad = su2rad ? su2rad : new Object()
su2rad.dialog = su2rad.dialog ? su2rad.dialog : new Object()
su2rad.dialog.fileSelector = su2rad.dialog.fileSelector ? su2rad.dialog.fileSelector : new Object()

su2rad.dialog.fileSelector._filePath = "";    // full path of selected file or dir 
su2rad.dialog.fileSelector.writeaccess = true // require files and directories to be writeable

su2rad.dialog.fileSelector.callback = function (path) {
    // this should be overriden for each occasion
    log.warn("su2rad.dialog.fileSelector.callback() path='" + path + "'");
}

su2rad.dialog.fileSelector.applyPath = function () {
    log.debug("applyPath()")
    try {
        this.callback(this._filePath);
    } catch (e) {
        logError(e)
    }
}

su2rad.dialog.fileSelector.getFilepath = function () {
    return this._filePath
}

su2rad.dialog.fileSelector.close = function () {
    log.info("file selection canceled");
    $('#fileSelectorWindow').jqmHide();
}            

su2rad.dialog.fileSelector.createWindow = function () {
    // create html elements for file selector window
    log.debug("su2rad.dialog.fileSelector.createWindow()");
    var fsw = document.createElement("div");
    fsw.className = "jqmWindow2"
    fsw.id = "fileSelectorWindow"
    var title = document.createElement("h3")
    title.appendChild(document.createTextNode("Select file ..."))
    fsw.appendChild(title)
    var tree = document.createElement("div");
    tree.className = "fileSelector"
    tree.id = "fileSelectorTree"
    fsw.appendChild(tree)
    var note = document.createElement("div");
    note.id = "fileSelectorNote"
    note.appendChild(document.createTextNode("selected: "))
    fsw.appendChild(note)
    var select = document.createElement("input")
    select.id = "fileSelectorButtonSelect"
    select.setAttribute("type", "button")
    select.setAttribute("value", "select file")
    select.className = "exportbutton"
    select.onclick = (function(){return function(){su2rad.dialog.fileSelector.select();}})();
    select.disabled = true;
    fsw.appendChild(select);
    var cancel = document.createElement("input")
    cancel.id = "fileSelectorButtonCancelt"
    cancel.setAttribute("type", "button")
    cancel.setAttribute("value", "cancel")
    cancel.className = "exportbutton"
    cancel.onclick = (function(){return function(){su2rad.dialog.fileSelector.close();}})();
    fsw.appendChild(cancel);
    document.body.appendChild(fsw);
    // add jqModal properties to file selector div
    $('#fileSelectorWindow').jqm();
}

su2rad.dialog.fileSelector.select = function () {
    log.debug("fileSelectorWindow.select() ...");
    $('#fileSelectorWindow').jqmHide();
    if (this._filePath != "") {
       this.applyPath();
    }
}            

su2rad.dialog.fileSelector.show = function(ftRoot) {
    log.debug("su2rad.dialog.fileSelector.show(ftRoot='" + ftRoot + "')");
    var fsw = document.getElementById("fileSelectorWindow");
    if (fsw == null) {
        this.createWindow();
    }
    try {
        //if ( ! ftRoot ) {
        //    ftRoot = su2rad.dialog.getDefaultDirectory();
        //}
        log.debug("fileSelectorWindow.show(ftRoot='" + ftRoot + "')");
        this._filePath = "";    // reset to empty string
        
        //log.debug("fileSelector root='" + ftRoot + "'");
        $('#fileSelectorNote').text(ftRoot);
        $('#fileSelectorWindow').jqmShow();
        $('#fileSelectorTree').fileTree({ root: ftRoot, script: 'foo.php' }, function(file) { 
            
            $('#fileSelectorNote').text(file.toString());
            
            su2rad.dialog.fileSelector._filePath = file.toString();   // store current selection
            log.debug('TEST: ' + file.toString())
            document.getElementById("fileSelectorButtonSelect").disabled=false;
            document.getElementById("fileSelectorButtonSelect").value="select file";
        });
    } catch (e) {
        logError(e)
    }
}

su2rad.dialog.fileSelector.setFileTreeJSON = function (tree, setPosition) {
    // eval JSON views string from SketchUp
    log.debug("TEST: setFileTreeJSON")
    var json = su2rad.utils.decodeJSON(tree);
    var entries = new Array();
    try {
        eval("entries = " + json);
        log.debug("eval(): entries=" + entries.length); 
        document.getElementById("fileSelectorButtonSelect").value = "select dir";
    } catch (e) {
        log.error("setFileTreeJSON: error in eval() '" + e.name + "'");
        log.error("json= " + json.replace(/,/g,',<br/>'));
        logError(e);
    }
    log.debug("TEST: setFileTreeJSON entries.length=" + entries.length)
    var listing = this.formatTree(entries); 
    this._callback( listing );
    if (setPosition == 'true') {
        try {
            log.debug("setting scroll position ...");
            var entry = document.getElementById('requestedPath')
            if (entry) {
                document.getElementById('fileSelectorTree').scrollTop = entry.offsetTop-25;
            } else {
                log.warn("setPosition: element with id 'requestedPath' not found");
            }
        } catch (e) {
            logError(e)
        }
    }
}

su2rad.dialog.fileSelector.formatTree = function (tree) {
    log.debug("fileSelectorWindow.formatTree()");
    var d = "<ul class=\"jqueryFileTree\" style=\"display: none;\">"
    try {
        for (var i=0; i<tree.length; i++) {
            var e = tree[i];

            if ((e.type == "directory") && (e.access == false)) {
                d = d + "<li class=\"" + e.type + " no_access\">" + e.name + "</li>"
                //log.debug("no access for: " + e.path)
            } else if ((e.type == "file") && (this.writeaccess == true) && (e.access == false))  {
                d = d + "<li class=\"" + e.type + " no_access\">" + e.name + "</li>"
            } else {
                d = d + "<li "
                if (e.id) {
                    d = d + "id=\"" + e.id + "\" "
                }
                if (e.children) {
                    d = d + "class=\"directory expanded\"><a href=\"#\" rel=\"" + e.path + "/\">" + e.name + "</a>"
                    d = d + this.formatTree(e.children)
                } else if (e.type == "directory") {
                    d = d + "class=\"directory collapsed\"><a href=\"#\" rel=\"" + e.path + "/\">" + e.name + "</a>"
                } else if (e.type == "file") {
                    d = d + "class=\"file " + e.ext + "\"><a href=\"#\" rel=\"" + e.path + "\">" + e.name + "</a>"
                }
                d = d + "</li>"
            }
        }
    } catch (e) {
        logError(e)
    }
    d += "</ul>"
    return d
}


su2rad.dialog.fileSelector.listDirectory = function (dir, root) {
    if (su2rad.SKETCHUP == true) {
        log.info("listing directory '" + dir + "' (root=" + root + ") ...");
        var params = dir + "&" + root.toString(); 
        log.info("params='" + params + "'");
        window.location = 'skp:getDirectoryListing@' + params;
    } else {
        log.debug("using dummy backend.getViewsList()");
        var listing = this.dummy(dir);
        this.setFileTreeJSON( su2rad.utils.encodeJSON(listing), root );
    }    
}


su2rad.dialog.fileSelector.dummy = function (dir) {
    //alert('fileTreeDummy(\''+dir+'\')');
    dir = dir.replace(/\\/g, '/');
    if (dir.charAt(dir.length-1) != su2rad.PATHSEP) {
        dir += su2rad.PATHSEP;
    }
    var json = "[{\"name\":\"directoryA\",\"type\":\"directory\",\"path\":\"" + dir + "directoryA\"},"
    json += "{\"name\":\"directoryB\",\"type\":\"directory\",\"path\":\"" + dir + "directoryB\",children:["
    json += "{\"name\":\"fileBA.txt\",\"type\":\"file\",\"path\":\"" + dir + "directoryB/fileBA.txt\",\"ext\":\"ext_txt\"},"
    json += "{\"name\":\"fileBB.bak\",\"type\":\"file\",\"path\":\"" + dir + "directoryB/fileBB.bak\",\"ext\":\"ext_bak\"},"
    json += "{\"name\":\"fileBC.bak\",\"type\":\"file\",\"path\":\"" + dir + "directoryB/fileBC.bak\",\"ext\":\"ext_bak\"}]},"
    json += "{\"name\":\"directoryC\",\"type\":\"directory\",\"path\":\"" + dir + "directoryC\"},"
    json += "{\"name\":\"fileA.txt\",\"type\":\"file\",\"path\":\"" + dir + "fileA.txt\",\"ext\":\"ext_txt\"},"
    json += "{\"name\":\"fileB.bak\",\"type\":\"file\",\"path\":\"" + dir + "fileB.bak\",\"ext\":\"ext_bak\"},"
    json += "{\"name\":\"fileB.skp\",\"type\":\"file\",\"path\":\"" + dir + "fileB.skp\",\"ext\":\"ext_skp\"},"
    json += "{\"name\":\"fileC.rif\",\"type\":\"file\",\"path\":\"" + dir + "fileC.rif\",\"ext\":\"ext_rif\"},"
    json += "{\"name\":\"fileD.jpg\",\"type\":\"file\",\"path\":\"" + dir + "fileD.jpg\",\"ext\":\"ext_jpg\"}]"
    return json;
}

