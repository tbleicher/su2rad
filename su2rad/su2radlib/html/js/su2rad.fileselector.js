//XXX
var fileSelector = {};

fileSelector._filePath = "";    // full path of selected file or dir 

fileSelector.applyPath = function () {
    log.debug("selected file: " + this._filePath);
    var lastchar = this._filePath.charAt(this._filePath.length-1);
    if (lastchar == PATHSEP) {
        // apply only directory path
        log.debug("directory: '" + this._filePath + "'");
        document.getElementById("scenePath").value = this._filePath;
        setExportPath()
    } else {
        setExportPath(this._filePath)
    }
        
}

fileSelector.close = function (cancel) {
    log.debug("fileSelectorWindow.close() ...");
    $('#fileSelectorWindow').jqmHide();
    if (cancel != 1 && fileSelector._filePath != "") {
        fileSelector.applyPath();
    }
}            

fileSelector.show = function () {
    try {
        log.debug("fileSelectorWindow.show() ...");
        fileSelector._filePath = "";    // reset to empty string
        var ftRoot = document.getElementById('scenePath').value;
        
        $('#fileSelectorNote').text(ftRoot);
        
        log.debug("ftRoot='" + ftRoot + "'");
        $('#fileSelectorWindow').jqmShow();
        $('#fileSelectorTree').fileTree({ root: ftRoot, script: 'foo.php' }, function(file) { 
            
            $('#fileSelectorNote').text(file.toString());
            
            fileSelector._filePath = file.toString();   // store current selection
            document.getElementById("fileSelectorButtonSelect").disabled=false;
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
    } catch (e) {
        log.error("setFileTreeJSON: error in eval() '" + e.name + "'");
        log.error("json= " + json.replace(/,/g,',<br/>'));
        logError(e);
    }
    var listing = this.formatTree(entries); 
    this._callback( listing );
    log.debug("setPostition='" + setPosition + "'")
    if (setPosition == 'true') {
        log.debug('setting position');
        try {
            var entry = document.getElementById('requestedPath')
            entry.scrollTop = entry.offsetTop;
        } catch (e) {
            logError(e)
        }
    }
}


fileSelector.formatTree = function (tree) {
    var d = "<ul class=\"jqueryFileTree\" style=\"display: none;\">"
    for (var i=0; i<tree.length; i++) {
        if (tree[i].access == false) {
            d = d + "<li class=\"" + tree[i].type + " no_access\">" + tree[i].name + "</li>"
            log.debug("no access for: " + tree[i].path)
        } else {
            d = d + "<li "
            if (tree[i].id) {
                d = d + "id=\"" + tree[i].id + "\" "
                log.debug("id=" + tree[i].id)
            }
            if (tree[i].children) {
                //log.debug("found children=" + tree[i].children.length())
                d = d + "class=\"directory expanded\"><a href=\"#\" rel=\"" + tree[i].path + "/\">" + tree[i].name + "</a>"
                d = d + this.formatTree(tree[i].children)
            } else if (tree[i].type == "directory") {
                //log.debug("dir=" + tree[i].name + " path=" + tree[i].path)
                d = d + "class=\"directory collapsed\"><a href=\"#\" rel=\"" + tree[i].path + "/\">" + tree[i].name + "</a>"
            } else if (tree[i].type == "file") {
                d = d + "class=\"file " + tree[i].ext + "\"><a href=\"#\" rel=\"" + tree[i].path + "\">" + tree[i].name + "</a>"
            }
            d = d + "</li>"
        }
    }
    d += "</ul>"
    return d
}


fileSelector.listDirectory = function (dir, root) {
    if (SKETCHUP == true) {
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
    if (dir.charAt(dir.length-1) != PATHSEP) {
        dir += PATHSEP;
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
