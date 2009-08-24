
var fileSelector = {};

fileSelector._filePath = "";    // full path of selected file or dir 

fileSelector.callback = function (path) {
    // this should be overriden for each occasion
    log.error("fileSelector.callback() path='" + path + "'");
}

fileSelector.applyPath = function () {
    this.callback(this._filePath);
}

fileSelector.getFilepath = function () {
    return this._filePath
}

fileSelector.close = function () {
    log.info("file selction canceled");
    $('#fileSelectorWindow').jqmHide();
}            

fileSelector.select = function () {
    log.debug("fileSelectorWindow.select() ...");
    $('#fileSelectorWindow').jqmHide();
    if (fileSelector._filePath != "") {
        fileSelector.applyPath();
    }
}            

fileSelector.show = function(ftRoot) {
    try {
        log.debug("fileSelectorWindow.show() ...");
        fileSelector._filePath = "";    // reset to empty string
        
        //log.debug("fileSelector root='" + ftRoot + "'");
        $('#fileSelectorNote').text(ftRoot);
        $('#fileSelectorWindow').jqmShow();
        $('#fileSelectorTree').fileTree({ root: ftRoot, script: 'foo.php' }, function(file) { 
            
            $('#fileSelectorNote').text(file.toString());
            
            fileSelector._filePath = file.toString();   // store current selection
            log.debug('TEST: ' + file.toString())
            document.getElementById("fileSelectorButtonSelect").disabled=false;
            document.getElementById("fileSelectorButtonSelect").value="select file";
        });
    } catch (e) {
        logError(e)
    }
}


fileSelector.setFileTreeJSON = function (tree, setPosition) {
    // eval JSON views string from SketchUp
    var json = decodeJSON(tree);
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
    var listing = this.formatTree(entries); 
    this._callback( listing );
    if (setPosition == 'true') {
        try {
            log.debug("setting scroll position ...");
            var entry = document.getElementById('requestedPath')
            if (entry) {
                document.getElementById('fileSelectorTree').scrollTop = entry.offsetTop-25;
            } else {
                log.error("setPosition: element with id 'requestedPath' not found");
            }
        } catch (e) {
            logError(e)
        }
    }
}

fileSelector.formatTree = function (tree) {
    var d = "<ul class=\"jqueryFileTree\" style=\"display: none;\">"
    try {
    for (var i=0; i<tree.length; i++) {
        var e = tree[i];
        if (e.access == false) {
            d = d + "<li class=\"" + e.type + " no_access\">" + e.name + "</li>"
            //log.debug("no access for: " + e.path)
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


fileSelector.listDirectory = function (dir, root) {
    if (su2rad.SKETCHUP == true) {
        log.info("listing directory '" + dir + "' (root=" + root + ") ...");
        window.location = 'skp:getDirectoryListing@' + dir + "&" + root.toString(); 
        // setViewsListJSON() called by Sketchup
    } else {
        log.debug("using dummy backend.getViewsList()");
        var listing = this.dummy(dir);
        this.setFileTreeJSON( encodeJSON(listing), root );
    }    
}


fileSelector.dummy = function (dir) {
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

