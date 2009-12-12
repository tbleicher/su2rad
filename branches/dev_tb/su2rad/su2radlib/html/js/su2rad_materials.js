
su2rad = su2rad ? su2rad : new Object()

su2rad.utils = su2rad.utils ? su2rad.utils : new Object()

su2rad.utils.UniqueArray = function () {
    this.values = []
    this.length = 0;
}

su2rad.utils.UniqueArray.prototype.getValues = function() {
    return this.values;
}

su2rad.utils.UniqueArray.prototype.push = function(v) {
    if (this[v] == null) {
        this[v] = v;
        this.values.push(v);
        this.length = this.values.length;
    }
}

su2rad.utils.UniqueArray.prototype.sort = function() {
    this.values.sort();
}

su2rad.utils.UniqueArray.prototype.sortByValue = function() {
    this.values.sort();
}




su2rad.materials = su2rad.materials ? su2rad.materials : new Object()

su2rad.materials.ListObject = function () {
    this.name = "matList";
    this._lookupTable = {};
    this._idArray = new Array();
    this._groups = new su2rad.utils.UniqueArray();
}

su2rad.materials.ListObject.prototype.update = function (list) {
    var redefined = 0;
    for (var i=0; i<list.length; i++) {
        var mat = list[i];
        mat.id = this.genId(mat);
        if (!this._lookupTable[mat.id]) {
            //log.debug(this.name + " DEBUG: new material '" + mat.nameHTML + "'");
            this._idArray.push(mat.id);
            this._lookupTable[mat.id] = mat;
            this._groups.push(mat.group)
        } else {
            log.debug(this.name + ": replacing material_id '" + mat.id + "' mat='" + mat.nameHTML + "'");
            this._lookupTable[mat.id] = mat;
            redefined += 1;
        }
    }
    log.debug(this.name + ".update(): materials total=" + this._idArray.length + " new=" + list.length + " redef=" + redefined)
}

su2rad.materials.ListObject.prototype.genId = function (mat) {
    return mat.id
}

su2rad.materials.ListObject.prototype.getList = function () {
    this._idArray.sort()
    list = new Array();
    try {
        for (var i=0; i<this._idArray.length; i++) {
            var id = this._idArray[i];
            if (!this._lookupTable[id]) {
                log.error(this.name + ".getList(): material id not found '" + id + "'");
            } else {
                list.push(this._lookupTable[id])
            }
        }
    } catch (e) {
        log.error(this.name + ".getList() " + e)
    }
    return list;   
}

su2rad.materials.ListObject.prototype.getMaterial = function (id, silent) {
    var mat = this._lookupTable[id]
    if (mat) {
        return mat;
    } else {
        if (silent != true) {
            log.error(this.name + ".getMaterial(): id not found '" + id + "'");
        }
        return false;
    }
}
    
su2rad.materials.ListObject.prototype.getMaterialGroups = function () {
   this._groups.sort()
   return this._groups.getValues();
}

su2rad.materials.ListObject.prototype.setMaterialPreview = function (id, path) {
    var mat = this._lookupTable[id]
    if (mat) {
        mat.preview = path;
        this._lookupTable[id] = mat;
    } else {
        log.error(this.name + ".setMaterialPreview(): id not found '" + id + "'");
    }
}

// mixin for SketchUp materials and layers
su2rad.materials.genSkmId = function(skm) {
    return skm.nameRad + '_id'
}

// mixin for Radiance materials
su2rad.materials.genMatId = function(mat) {
    return mat.nameRad
}



// create instances for skm, layer and Radiance material lists
su2rad.materials.skmList = new su2rad.materials.ListObject();
su2rad.materials.skmList.name = "skmList"
su2rad.materials.skmList.genId = su2rad.materials.genSkmId 

su2rad.materials.layersList = new su2rad.materials.ListObject();
su2rad.materials.layersList.name = "layerList"
su2rad.materials.layersList.genId = su2rad.materials.genSkmId 

su2rad.materials.radList = new su2rad.materials.ListObject();
su2rad.materials.radList.name = "radList"
su2rad.materials.radList.genId = su2rad.materials.genMatId


// define alias for rebuilding of lists
su2rad.materials._currentList = su2rad.materials.skmList;

// timeout flag for su2rad.materials.applyAlias
su2rad.materials._timeoutMaterialAlias = false;




su2rad.materials.activateDrag = function () {
    $(".mdev").draggable({
        helper:'clone',
        start: function (ev,ui) {
            su2rad.materials.showDetails( $(ui.helper).attr('id') );
        }
    });
}

su2rad.materials.activateDrop = function () {
    $(".skm").droppable({
        accept: ".mdev",
        activeClass: 'droppable-active',
        hoverClass: 'droppable-hover',
        drop: su2rad.materials._dropAction
    });
    $(".skm_with_alias").droppable({
        accept: ".mdev",
        activeClass: 'droppable-active',
        hoverClass: 'droppable-hover',
        drop: su2rad.materials._dropAction
    });
    $(".skm_defined").droppable({
        accept: ".mdev",
        activeClass: 'droppable-active',
        hoverClass: 'droppable-hover-defined',
        drop: su2rad.materials._dropAction
    });
}

su2rad.materials._dropAction = function (ev, ui) {
    // BUG: su2rad.materials._dropAction is triggered multiple times
    //      apparently old 'droppables' persist after rebuild of
    //      materials list.
    // workaround: set timer (first event) and stop execution
    //             if timer is present;
    if (su2rad.materials._timeoutMaterialAlias) {
        return
    }
    var skmId = $(this).attr('id');
    var radId = $(ui.draggable).attr('id');
    var dragClone = $(ui.draggable).clone();
    su2rad.materials.setAlias(skmId, radId);
    
    // repeated dragging messes up div content on Windows
    if (su2rad.PLATFORM != "Windows") {
        dragClone.draggable({
            helper:'clone',
            start: function (ev,ui) {
                su2rad.materials.showDetails( $(ui.helper).attr('id') );
            }
        });
    }
    $(this).append(dragClone);
    
    // set timeout for callback to SU
    su2rad.materials._timeoutMaterialAlias = setTimeout("su2rad.materials.applyAlias('" + skmId + "','" + radId + "')", 100);
}

su2rad.materials.applyAlias = function (skmId, radId) {
    //log.debug("su2rad.materials.applyAlias() " + skmId + ", " + radId)
    var skm = su2rad.materials._currentList.getMaterial(skmId);
    var rad = su2rad.materials.radList.getMaterial(radId);
    su2rad.materials._timeoutMaterialAlias = false;
    skpSetMaterialAlias(skm.name, rad.name, skm.group);
}

su2rad.materials._filterMaterials = function (mat, showAlias, showType) {
    if (mat.defType == 'alias' && showType == 'alias') {
        return true
    } else if (!showAlias && mat.defType == 'alias') {
        return false
    } else if (showType == 'all') {
        return true
    } else if (showType == mat.group) {
        return true
    } else {
        return false
    }
}

su2rad.materials.buildMaterialListByType = function (type) {
    if (type == 'layer' && su2rad.exportSettings.exportMode.match(/layer/i) ) {
        su2rad.materials.buildMaterialListSU();
    } else if (type == 'skm' && !su2rad.exportSettings.exportMode.match(/layer/i) ) {
        su2rad.materials.buildMaterialListSU();
    }
}

su2rad.materials.buildMaterialListRad = function () {
    var text = "";
    var matList = su2rad.materials.radList.getList();
    for (var i=0; i<matList.length; i++) {
        var showAlias = document.getElementById('showDefTypeAlias').checked;
        var showType = document.getElementById('showMaterialGroup').value;
        var mat = matList[i]
        if (su2rad.materials._filterMaterials(mat, showAlias, showType) == true) {
            text += su2rad.materials.getDragHTML(mat.nameRad)
        }
    }
    document.getElementById("radListPanel").innerHTML = text;
    su2rad.materials.activateDrag();
}

su2rad.materials.buildMaterialListSU = function () {
    try {
        $(".skm").droppable("disable");
        $(".skm_with_alias").remove();
        $(".skm_defined").remove();
        su2rad.materials.buildMaterialListContent();
        su2rad.materials.activateDrag();
        su2rad.materials.activateDrop();
    } catch (e) {
        log.error("error building list content:<br/>" + e.name + "<br/>" + e.message)
    }
}

su2rad.materials.buildMaterialListContent = function () {
    //log.debug("building SU material list content");
    var skmList = su2rad.materials._currentList.getList();
    var listPanel = document.getElementById("skmListPanel");
    listPanel.innerHTML = "";
    for (var i=0; i<skmList.length; i++) {
        try {
            var skm = skmList[i]
            var div = document.createElement("div");
            div.setAttribute("id", skm.id);
            if (skm.alias != '' && su2rad.materials.radList.getMaterial(skm.alias)) {
                // material has alias set
                div.className = "skm_with_alias";
                div.innerHTML = su2rad.materials.getSkmInnerHTML(skm) + su2rad.materials.getDragHTML(skm.alias);
            } else if (su2rad.materials.radList.getMaterial(skm.nameRad, true)) {
                div.className = "skm_defined";
                div.innerHTML = su2rad.materials._getSkmLabel(skm)
            } else {
                div.className = "skm";
                div.innerHTML = su2rad.materials._getSkmLabel(skm)
            }
            listPanel.appendChild(div);
        } catch (e) {
            log.error(e.name + e.message)
        }
    }
}

su2rad.materials.clearAlias = function (skmId) {
    log.info("clearing alias for '" + skmId + "'");
    try {
        su2rad.materials._clearAliasSkm(skmId)
    } catch (e) {
        log.error("Error su2rad.materials.clearAlias(): '" + e + "'");
    }
}

su2rad.materials._clearAliasSkm = function (listId) {
    var element = su2rad.materials._currentList.getMaterial(listId);
    var msg = "removing alias for material '" + element.nameHTML + "' ('" + element.alias + ")";
    log.info(msg);
    su2rad.dialog.setStatusMsg(msg);
    element.alias = '';
    document.getElementById(listId).innerHTML = element.nameHTML
    if (su2rad.materials.radList.getMaterial(element.nameRad, true)) {
        document.getElementById(listId).className = 'skm_defined';
    } else {
        document.getElementById(listId).className = 'skm';
    }
    skpRemoveMaterialAlias(element.name, element.group);
}
        
su2rad.materials.getDragHTML = function (matname) {
    var text = "<div class=\"mdev\" id=\"" + matname + "\">"
    text += "<a title=\"" + matname + "\" onClick=\"su2rad.materials.showDetails('" + matname + "')\">" 
    text += matname + "</a></div>"
    return text
}

su2rad.materials.setGroupSelection = function () {
    var classes = su2rad.materials.radList.getMaterialGroups()
    var select = document.getElementById('showMaterialGroup');
    select.options.length = 0;
    select.options[0] = new Option("all", "all", true, true);
    for (var i=0; i<classes.length; i++) {
        select.options[i+1] = new Option(classes[i], classes[i])
    }
}

su2rad.materials.createPreview = function (matname) {
    log.debug("TEST: createPreview('" + matname + "')")
    var mat = su2rad.materials.radList.getMaterial(matname)
    log.debug("TEST: material = '" + mat + "'")
    window.location = 'skp:createMaterialPreview@' + matname
}    
    
su2rad.materials.setPreviewImage = function (matname, path) {
    log.debug("TEST: setPreviewImage('" + matname + "', '" + path + "')")
    this.radList.setMaterialPreview(matname, path)
    this.showDetails(matname) 
}

su2rad.materials.showDetails = function (matname) {
    // display material definition and preview image of <matname>
    var mat = su2rad.materials.radList.getMaterial(matname)
    var text = "";
    if (mat) {
        document.getElementById('panelDetailsTitle').innerHTML = matname;
        var detailsCB = document.getElementById('showDetailsRequired')
        detailsCB.setAttribute("onclick", "su2rad.materials.showDetails('" + matname + "')");
        if (mat.required != 'void' && detailsCB.checked) {
            var req = su2rad.materials.radList.getMaterial(mat.required)
            if (!req) {
                text += "<span style=\"color:#cc0000;\">## required modifier '" + mat.required + "' unknown</span><br/>"
            } else {
                text += "<span style=\"color:#999999;\">" + req.definition + "</span><br/>"
            }
        }
        text += mat.definition;
        document.getElementById('panelDetailsText').innerHTML = text;
        
        log.debug("mat.defined='" + mat.defined + "'") 
        log.debug("mat.preview='" + mat.preview + "'") 
        // set preview image or 'create preview' button
        var pPreview = document.getElementById('panelPreview');
        while (pPreview.childNodes[0]) {
            pPreview.removeChild(pPreview.childNodes[0])
        }
        if (mat.preview && mat.preview != '' && mat.preview != 'undefined') {
            pPreview.innerHTML = "<img class=\"materialPreviewImage\" src=\"file://" + mat.preview + "\" />";
        } else if (mat.defined == 'true') {
            // if ra_ppm and convert are available show 'create preview' button
            // document.getElementById('panelPreview').innerHTML = "no preview for " + matname;
            var button = document.createElement('BUTTON');
            button.onclick = function () { su2rad.materials.createPreview(matname) }
            button.className = "materialPreviewButton"
            var b_text = document.createTextNode('create preview');
            button.appendChild(b_text);
            pPreview.appendChild(button);
        } else {
            document.getElementById('panelPreview').innerHTML = "no preview for " + matname;
        }
        return true;
    } else {
        text += "<span style=\"color:#cc0000;\">## material '" + matname + "' could not be found</span><br/>"
    }
}

su2rad.materials.getSkmInnerHTML = function (skm) {
    var html = "";
    if (su2rad.PLATFORM == "Windows") {
        html += "<div style=\"float:right;font-size:12px;cursor:pointer;\"><a onclick=\"su2rad.materials.clearAlias('" + skm.id + "')\""
        html += "title=\"remove alias\">[X]</a></div>";
    } else {
        html += "<a class=\"alias_clear\" onclick=\"su2rad.materials.clearAlias('" + skm.id + "')\""
        html += "title=\"remove alias\">&nbsp;</a>";
    }
    html += su2rad.materials._getSkmLabel(skm)
    return html
}

su2rad.materials._getSkmLabel = function (skm) {
    if (document.getElementById("showRadianceName").checked == true) {
        return "<div id=\"" + skm.id + "_label\">" + skm.nameRad + "</div>";
    } else { 
        return "<div id=\"" + skm.id + "_label\">" + skm.nameHTML + "</div>";
    }
}

su2rad.materials.onChangeSkmLabel = function () {
    var skmList = su2rad.materials._currentList.getList();
    for (var i=0; i<skmList.length; i++) {
        try {
            var skm = skmList[i]
            id = skm.id + "_label"
            if (document.getElementById("showRadianceName").checked == true) {
                document.getElementById(id).innerHTML = skm.nameRad;
            } else {
                document.getElementById(id).innerHTML = skm.nameHTML;
            }
        } catch (e) {
            log.error("error in su2rad.materials.onChangeSkmLabel(): " + e.name + "<br/>" + e.message)
        }
    }
}

su2rad.materials.setAlias = function (skmId, radId) {
    try {
        var skm = su2rad.materials._currentList.getMaterial(skmId);
        skm.alias = radId;
        document.getElementById(skmId).className = 'skm_with_alias';
        document.getElementById(skmId).innerHTML = su2rad.materials.getSkmInnerHTML(skm);
        // show log and status
        var rad = su2rad.materials.radList.getMaterial(radId);
        var msg = "material '" + skm.nameHTML + "' aliased to '" + rad.nameHTML + "'";
        log.info(msg);
        su2rad.dialog.setStatusMsg(msg);
    } catch (e) {
        log.error("Error su2rad.materials.setAlias(): '" + e + "'");
    }
}

su2rad.materials.setCurrentMaterialList = function (mode) {
    if (mode.match(/layer/i)) {
        su2rad.materials._currentList = su2rad.materials.layersList
    } else {
        su2rad.materials._currentList = su2rad.materials.skmList
    }
    su2rad.materials.buildMaterialListSU();
}
