// su2rad.gridImport.js
// . 
// functions used in importCanvas.html
// .
// Copyright (c) 2009 Thomas Bleicher

var su2rad = su2rad ? su2rad : new Object();
su2rad.dialog = su2rad.dialog ? su2rad.dialog : new Object()

su2rad.dialog.gridImport = function () {
    this.gCanvas = null;
    this.directory = "."
    this.filename = ""
}

su2rad.dialog.evaluateSketchup = function () {
    log.debug("su2rad.dialog.evaluateSketchup() su2rad.SKETCHUP='" + su2rad.SKETCHUP + "'")
    
    // show warning/simulate and hide file load buttons by default
    document.getElementById("loadFileWarning").style.display='';
    document.getElementById("loadFileSelectionDiv").style.display='none'; 
    document.getElementById("loadFileSUDiv").style.display='none';
    document.getElementById("graphOptions").style.display='none';
    document.getElementById("statsDiv").style.display='none';
    document.getElementById("importGraphToSketchupDiv").style.display='none';
    
    // show 'load file' button depending on browser and Sketchup
    if ( su2rad.SKETCHUP == false && su2rad.NSIDOM == false ) {
        log.warn("nsIDOMFileList and Sketchup not available - no functionality");
    
    } else if (su2rad.SKETCHUP == true) {
        // started within Sketchup
        log.info("Sketchup available");
        document.getElementById("loadFileWarning").style.display='none';
        document.getElementById("loadFileSelectionDiv").style.display='none'; 
        document.getElementById("loadFileSUDiv").style.display='';
        document.getElementById("importGraphToSketchupDiv").style.display='';
        document.getElementById("graphOptions").style.display='';
        document.getElementById("statsDiv").style.display='';
    
    } else if (su2rad.NSIDOM == true ) {
        // enable direct load of file text but no 'import' button
        log.info("nsIDOMFileList available");
        document.getElementById("loadFileWarning").style.display='none';
        document.getElementById("loadFileSelectionDiv").style.display=''; 
        document.getElementById("graphOptions").style.display='';
        document.getElementById("statsDiv").style.display='';
    }
}

su2rad.dialog.gridImport.initPage = function () {
    // set up canvas
    document.getElementById("messagearea").value = '';
    this.gCanvas = new su2rad.canvas.GridCanvas;
    this.gCanvas.setCanvasId('cv');
    su2rad.dialog.evaluateSketchup(); 
    this.updateUI();
    //log.debug("gCanvas=" + this.gCanvas)
}

su2rad.dialog.gridImport.makeConvex = function () {
    this.gCanvas.array.makeConvex();
    this.gCanvas.draw();
    this.updateUI();
}

su2rad.dialog.gridImport.importGraphToSketchup = function (allfiles) {
    log.debug("DEBUG: importGraphToSketchup")
    try {
        if (this.gCanvas.array == null || this.gCanvas.array.empty() == true) {
            log.info("nothing to import")
            return;
        }
        var opts = this.gCanvas.getLegendOptions();
        // disabled trianglesToText because it doesn't work better
        //var tritext = this.gCanvas.array.trianglesToText()
        //document.getElementById('trianglesjson').value = tritext
        //opts.triangles = 'trianglesjson';
        //log.debug("DEBUG: set triangles text: " + tritext.length + " bytes")
        opts.elementId = 'textfilecontent';
        txt  = 'maxValue='  + opts.maxValue.toFixed(2) + '&'
        txt += 'minValue='  + opts.minValue.toFixed(2) + '&'
        txt += 'steps='     + opts.steps.toFixed() + '&'
        txt += 'elementId=' + opts.elementId + '&' 
        // disabled trianglesToText because it doesn't work better
        //txt += 'triangles=' + opts.triangles + '&' 
        txt += 'filename='  + escape(this.filename) + '&'
        txt += 'allfiles='  + allfiles
        if (su2rad.SKETCHUP == true) {
            window.location = 'skp:importFromWebDialog@' + txt;
        }
    } catch (e) {
        log.error(e)
    }
}

su2rad.dialog.gridImport.loadFileIDOM = function () {
    log.debug("loadFileIDOM()")
    var text = ""
    var filename = ""
    try {
        // access file contents via nsIDOMFileList (FireFox, Mozilla)
        var files = document.getElementById("loadFileSelection").files;
        text = files.item(0).getAsText('UTF-8');
        filename = files.item(0).fileName
    } catch (e) {
        logError(e)
        alert("Sorry, your browser does not support this feature.\n\n" + e)
        document.getElementById("loadFileSelectionDiv").style.display='none'; 
        document.getElementById("loadFileWarning").style.display='';
    }
    if (text != "") {
        this.parseFileText(text, filename);
    }
}

su2rad.dialog.gridImport.loadFileSU = function () {
    // function to be called with encoded text from SU
    su2rad.dialog.loadFileCallback = this._loadFileSU
    // function to be called with fielpath in JS
    log.debug("DEBUG: laodFileSU")
    log.debug("this.directory='" + this.directory + "'")
    su2rad.dialog.fileSelector.callback = su2rad.dialog.loadTextFile; 
    try {
        su2rad.dialog.fileSelector.show(this.directory)
    } catch (e) {
        logError(e)
    }
}

su2rad.dialog.gridImport._loadFileSU = function (encText) {
    log.debug("DEBUG _loadFileSU: received " + encText.length + " bytes")
    //log.debug("DEBUG _loadFileSU: encText='" + encText + "'")
    // text received from
    try {
        var text = su2rad.utils.decodeText(encText);
        var filename = su2rad.dialog.fileSelector.getFilepath();
        // can't use 'this' because function is call in fileselector context
        su2rad.dialog.gridImport.parseFileText(text, filename);
    } catch(e) {
        logError(e)
    }
}

su2rad.dialog.gridImport.onResizeCanvas = function () {
    var newW = document.getElementById("canvasContainer").clientWidth;
    var newH = document.getElementById("canvasContainer").clientHeight;
    document.getElementById("cv").width = newW;
    document.getElementById("cv").height = newH;
    this.gCanvas.draw()
}
                
su2rad.dialog.gridImport._setTitleFromFilename = function (filename) {
    // set new title
    var title = document.getElementById("pageTitle")
    while (title.hasChildNodes() == true) {
        title.removeChild(title.firstChild)
    }
    var txt = document.createTextNode("file: " + filename);
    title.appendChild(txt);
    // extract extension for label
    var ridx = filename.lastIndexOf('.');
    if (ridx != -1) {
        var ext = filename.slice(ridx+1, filename.length);
        if ( ext != '') {
            ext = ext.toUpperCase();
            if ( ext == 'DA') {
                var comments = gArray.getCommentLines();
                if (comments != []) {
                    try {
                        var line1 = comments[0]
                        ext = line1.split(' ')[4];
                        ext = ext.replace(/_/g, " ");
                        ext = ext.replace(/,/g, "");
                    } catch(e) {
                        logError(e)
                    }
                }
                ext = "% " + ext; 
            } else if (ext == 'ADF' || ext == 'DF' ) {
                ext = "% " + ext;
            }
            document.getElementById("legendLabelInput").value = ext;
            this.gCanvas.setLegendLabel(ext);
        }
    } else {
        this.gCanvas.setLegendLabel('');
    }
}

su2rad.dialog.gridImport.parseFileText = function (text, filename) {
    log.debug("parseFileText(filename='" + filename + "')")
    var gArray = new su2rad.grid.GridArray();
    gArray.parseText(text);
    if (gArray.empty() == false) {
        // import successfull; set filetext
        document.getElementById('textfilecontent').value = text;
        this.setGridArray(gArray);
        if (filename != null) {
            this._setTitleFromFilename(filename)
            this.filename = filename
        }
    } else {
        // TODO: disable import button
    }
}

su2rad.dialog.gridImport.simulateGrid = function () {
    document.getElementById('messagearea').value = '';
    document.getElementById("graphOptions").style.display='';
    document.getElementById("statsDiv").style.display='';
    var gArray = new su2rad.grid.GridArray();
    gArray.generate();
    this.setGridArray(gArray)
}

su2rad.dialog.gridImport.setGridArray = function (gArray) {
    this.gCanvas.setArray(gArray);
    this.gCanvas.setLegend('right');
    this.gCanvas.draw();
    this.updateUI();
    this.updateStats();
}

su2rad.dialog.gridImport.setLegendLabel = function (label) {
    this.gCanvas.setLegendLabel(label)
    this.updateUI()
}

su2rad.dialog.gridImport.setLegendLightness = function (lightness) {
    var value = parseFloat(lightness)
    if ( ! isNaN(value) ) {
        this.gCanvas.setLegendLightness(value)
    }
    this.updateUI()
}

su2rad.dialog.gridImport.setLegendMax = function (v) {
    var value = parseFloat(v)
    if ( ! isNaN(value) ) {
        this.gCanvas.setLegendMax(value)
    }
    this.updateUI()
}

su2rad.dialog.gridImport.setLegendMin = function (v) {
    var value = parseFloat(v)
    if ( ! isNaN(value) ) {
        this.gCanvas.setLegendMin(value)
    }
    this.updateUI()
}

su2rad.dialog.gridImport.setLegendSteps = function (v) {
    var value = parseFloat(v)
    if ( ! isNaN(value) ) {
        this.gCanvas.setLegendSteps(value)
    }
    this.updateUI();
}

su2rad.dialog.gridImport.updateStats = function () {
    var statsDiv = document.getElementById('statsTable');
    while (statsDiv.hasChildNodes() == true) {
        statsDiv.removeChild(statsDiv.firstChild)
    }
    var gArray = this.gCanvas.array;
    var stats = gArray.getStats();
    var keys = ['average', 'uniform', 'minValue', 'maxValue', 'values', 'median'];
    for (i=0; i<keys.length; i++) {
        var k = "stats_" + keys[i];
        var v = stats[keys[i]];
        if ( keys[i] == "values" ) {
            v = v.toFixed()
        } else {
            v = v.toFixed(2)
        }
        var label = document.createElement('span');
        var ltxt = document.createTextNode(keys[i]);
        label.appendChild(ltxt);
        var value = document.createElement('span');
        var vtxt = document.createTextNode(v);
        value.appendChild(vtxt);
        var row = document.createElement('div');
        row.appendChild(label);
        row.appendChild(value);
        statsDiv.appendChild(row);
    }
    try {
        $("#statsTable > div").attr("class", "gridRow")
        $("#statsTable > div > span:first-child").attr("class", "gridLabel")
    } catch (e) {
        log.error(e);
    }
    document.getElementById('messagearea').value = gArray.commentLines.join("\n");
}

su2rad.dialog.gridImport.updateUI = function () {
    log.debug("updateUI()")
    var opts = this.gCanvas.getLegendOptions();
    document.getElementById("legendMinInput").value = opts.minValue.toFixed(2);
    document.getElementById("legendMaxInput").value = opts.maxValue.toFixed(2);
    document.getElementById("legendStepsInput").value = opts.steps.toFixed();
    document.getElementById("legendLabelInput").value = opts.label;
    document.getElementById("legendLightnessInput").value = opts.lightness.toFixed(2);
}
