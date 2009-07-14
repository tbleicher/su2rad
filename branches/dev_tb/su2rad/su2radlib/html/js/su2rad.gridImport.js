// su2rad.gridImport.js
// . 
// functions used in importCanvas.html
// .
// Copyright (c) 2009 Thomas Bleicher


function evaluateSketchup() {
    log.debug("evaluateSketchup() SKETCHUP='" + SKETCHUP + "'")
    
    document.getElementById("loadFileWarning").style.display='';
    document.getElementById("loadFileSUDiv").style.display='none';
    document.getElementById("graphOptions").style.display='none';
    document.getElementById("statsDiv").style.display='none';
    // show 'load file' button depending on browser and Sketchup
    var idomFileList = document.getElementById("loadFileSelection").files;
    if (idomFileList == null && SKETCHUP == false) {
        // this is not Firefox/Mozilla
        log.warn("nsIDOMFileList and Sketchup not available - no functionality");
        log.debug("broser: " + navigator.userAgent);
    } else if (SKETCHUP == true) {
        log.info("Sketchup available");
        document.getElementById("loadFileWarning").style.display='none';
        document.getElementById("loadFileSUDiv").style.display='';
        document.getElementById("importGraphToSketchupDiv").style.display='';
        document.getElementById("graphOptions").style.display='';
        document.getElementById("statsDiv").style.display='';
    } else {
        // this is Firefox -> enable direct load of file text
        log.info("nsIDOMFileList available");
        log.debug("broser: " + navigator.userAgent);
        NSIDOM = true;
        document.getElementById("loadFileWarning").style.display='none';
        document.getElementById("loadFileSelectionDiv").style.display=''; 
        document.getElementById("graphOptions").style.display='';
        document.getElementById("statsDiv").style.display='';
    }
}

function importGraphToSketchup () {
    log.debug("DEBUG: importGraphToSketchup")
    if (gCanvas.array == null || gCanvas.array.empty() == true) {
        log.info("nothing to import")
        return;
    }
    opts = gCanvas.getLegendOptions();
    opts.elementId = 'messagearea';
    txt  = 'maxValue='  + opts.maxValue.toFixed(2) + '&'
    txt += 'minValue='  + opts.minValue.toFixed(2) + '&'
    txt += 'steps='     + opts.steps.toFixed() + '&'
    txt += 'elementId=' + opts.elementId 
    if (SKETCHUP == true) {
        window.location = 'skp:importFromWebDialog@' + txt;
    }
}

function loadFileIDOM() {
    try {
        // access file contents via nsIDOMFileList (FireFox, Mozilla)
        var files = document.getElementById("loadFileSelection").files;
        var text = files.item(0).getAsText('UTF-8');
        var filename = files.item(0).fileName
        parseFileText(text, filename)
    } catch (e) {
        logError(e)
        alert(e)
    }
}

function loadFileSU() {
    // function to be called with encoded text from SU
    loadFileCallback = _loadFileSU
    // function to be called with fielpath in JS
    fileSelector.callback = loadTextFile; 
    try {
        fileSelector.show()
    } catch (e) {
        logError(e)
    }
}

function _loadFileSU(encText) {
    log.debug("DEBUG _loadFileSU: received " + encText.length + " bytes")
    // text received from 
    var text = decodeText(encText);
    var filename = fileSelector.getFilepath();
    parseFileText(text, filename);
}

function logError(e) {
    log.error(e.toString())
    log.error("e.name " + e.name)
    log.error("e.message " + e.message)
    log.error("e.fileName " + e.fileName)
    log.error("e.lineNumber " + e.lineNumber)
}

function parseFileText(text, filename) {
    log.debug("DEBUG parseFileText(): received " + text.length + " bytes")
    document.getElementById('messagearea').value = text;
    gArray = new GridArray();
    gArray.parseText(text);
    if (gArray.empty() == false) {
        setGridArray(gArray);
        if (filename != null) {
            // set new title
            var title = document.getElementById("pageTitle")
            while (title.hasChildNodes() == true) {
                title.removeChild(title.firstChild)
            }
            var txt = document.createTextNode("file: " + filename);
            title.appendChild(txt);
        }
    }
}

function simulateGrid() {
    document.getElementById('messagearea').value = '';
    document.getElementById("graphOptions").style.display='';
    document.getElementById("statsDiv").style.display='';
    gArray = new GridArray();
    gArray.generate();
    setGridArray(gArray)
}

function setGridArray(gArray) {
    gCanvas.setArray(gArray);
    gCanvas.setLegend('right');
    gCanvas.draw();
    updateUI();
    showStats();
}

function setLegendMax(v) {
    var value = parseFloat(v)
    if ( ! isNaN(value) ) {
        gCanvas.setLegendMax(value)
    }
    updateUI()
}

function setLegendMin(v) {
    var value = parseFloat(v)
    if ( ! isNaN(value) ) {
        gCanvas.setLegendMin(value)
    }
    updateUI()
}

function setLegendSteps(v) {
    var value = parseFloat(v)
    if ( ! isNaN(value) ) {
        gCanvas.setLegendSteps(value)
    }
    updateUI()
}

function showStats() {
    statsDiv = document.getElementById('statsTable');
    while (statsDiv.hasChildNodes() == true) {
        statsDiv.removeChild(statsDiv.firstChild)
    }
    var stats = gArray.getStats();
    var keys = ['average', 'uniform', 'minValue', 'maxValue', 'values', 'median'];
    for (i=0; i<keys.length; i++) {
        var k = "stats_" + keys[i];
        var row = document.createElement('div');
        row.setAttribute('class', "gridRow")
        var label = document.createElement('span');
        // TODO: add span style
        label.setAttribute('class', "gridLabel")
        var ltxt = document.createTextNode(keys[i]);
        label.appendChild(ltxt);
        row.appendChild(label);
        var value = document.createElement('span');
        // TODO: add span style
        var v = stats[keys[i]];
        if ( keys[i] == "values" ) {
            v = v.toFixed()
        } else {
            v = v.toFixed(2)
        }
        var vtxt = document.createTextNode(v);
        value.appendChild(vtxt);
        row.appendChild(value);
        statsDiv.appendChild(row);
    }
}

function updateUI() {
    log.debug("updateUI()")
    var opts = gCanvas.getLegendOptions();
    document.getElementById("legendMinInput").value = opts.minValue.toFixed(2);
    document.getElementById("legendMaxInput").value = opts.maxValue.toFixed(2);
    document.getElementById("legendStepsInput").value = opts.steps.toFixed();
}
