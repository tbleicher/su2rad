
function materialsListObject() {
    this.name = "MLIST";
    this._lookupTable = {};
    this._idArray = new Array();
}

materialsListObject.prototype.update = function (list) {
    var replaced = 0;
    for (var i=0; i<list.length; i++) {
        var mat = list[i];
        mat.id = this.genId(mat);
        if (!this._lookupTable[mat.id]) {
            //log.debug(this.name + " DEBUG: new material '" + mat.nameHTML + "'");
            this._idArray.push(mat.id);
            this._lookupTable[mat.id] = mat;
        } else {
            log.info("replacing material_id '" + mat.id + "' mat='" + mat.nameHTML + "'");
            this._lookupTable[mat.id] = mat;
        }
    }   
}

materialsListObject.prototype.genId = function (mat) {
    return mat.id
}

materialsListObject.prototype.getList = function () {
    this._idArray.sort()
    list = new Array();
    try {
        for (var i=0; i<this._idArray.length; i++) {
            var id = this._idArray[i];
            if (!this._lookupTable[id]) {
                log.error(this.name + ": material id not found '" + id + "'");
            } else {
                list.push(this._lookupTable[id])
            }
        }
    } catch (e) {
        log.error("getList() " + e)
    }
    return list;   
}

materialsListObject.prototype.getMaterial = function (id) {
    var mat = this._lookupTable[id]
    if (mat) {
        return mat;
    } else {
        log.error("getMaterial(): id not found '" + id + "'");
        return false;
    }
}
    
// mixin for SketchUp materials
function genSkmId(skm) {
    return skm.nameRad + '_id'
}

// mixin for Radiance materials
function genMatId(mat) {
    return mat.nameRad
}


var skmMaterialsList = new materialsListObject();
skmMaterialsList.name = "SKM"
skmMaterialsList.genId = genSkmId 

var radMaterialsList = new materialsListObject();
radMaterialsList.name = "RAD"
radMaterialsList.genId = genMatId


function activateDragDrop () {
    $(".mdev").draggable({
        helper:'clone',
        start: function (ev,ui) {
            showMaterialDetails( $(ui.helper).attr('id') );
        }
    });
    $(".skm").droppable({
        accept: ".mdev",
        activeClass: 'droppable-active',
        hoverClass: 'droppable-hover',
        drop: _dropAction
    });
    $(".skm_with_alias").droppable({
        accept: ".mdev",
        activeClass: 'droppable-active',
        hoverClass: 'droppable-hover',
        drop: _dropAction
    });
    $(".skm_defined").droppable({
        accept: ".mdev",
        activeClass: 'droppable-active',
        hoverClass: 'droppable-hover-defined',
        drop: _dropAction
    });
}

function _dropAction (ev, ui) {
    var skmId = $(this).attr('id');
    var radId = $(ui.draggable).attr('id');
    setAlias(skmId, radId);
    var dragClone = $(ui.draggable).clone();
    dragClone.draggable({
        helper:'clone',
        start: function (ev,ui) {
            showMaterialDetails( $(ui.helper).attr('id') );
        }
    });
    $(this).append(dragClone);
}

function buildMatList () {
    var text = "";
    matList = radMaterialsList.getList();
    log.error("DEBUG: matList=" + matList.length);
    for (var i=0; i<matList.length; i++) {
        var mat = matList[i]
        text += getMatDragHTML(mat.nameRad)
    }
    return text;
}

function buildSkmList () {
    var text = "";
    skmList = skmMaterialsList.getList();
    log.error("DEBUG: skmList=" + skmList.length);
    for (var i=0; i<skmList.length; i++) {
        var skm = skmList[i]
        if (skm.alias != '') {
            // material has alias set
            text += "<div class=\"skm_with_alias\" id=\"" + skm.id + "\">";
            text += getSkmInnerHTML(skm);
            //TODO: if verify_materials == true
            text += getMatDragHTML(skm.alias);
            text += "</div>";
        } else if (radMaterialsList.getMaterial(skm.nameRad)) {
            // defined material
            text += "<div class=\"skm_defined\" id=\"" + skm.id + "\">" + skm.nameHTML + "</div>";
        } else {
            text += "<div class=\"skm\" id=\"" + skm.id + "\">" + skm.nameHTML + "</div>"
        }
    }
    return text;
}

function clearAlias(skmId) {
    log.info("clearing alias for '" + skmId + "'");
    try {
        var skm = skmMaterialsList.getMaterial(skmId);
        skm.alias = '';
        document.getElementById(skmId).innerHTML = skm.nameHTML
        if (radMaterialsList.getMaterial(skm.nameRad)) {
            document.getElementById(skmId).className = 'skm_defined';
        } else {
            document.getElementById(skmId).className = 'skm';
        }
    } catch (e) {
        log.error("Error clearAlias(): '" + e + "'");
    }
}

function getMatDragHTML(matname) {
    var text = "<div class=\"mdev\" id=\"" + matname + "\">"
    text += "<a onClick=\"showMaterialDetails('" + matname + "')\">" 
    text += matname + "</a></div>"
    return text
}

function showMaterialDetails(matname) {
    var mat = radMaterialsList.getMaterial(matname)
    if (mat) {
        var text = "<b>" + matname + "</b><br/>"
        text += "definition=<br/>" + mat.definition;
        document.getElementById('panelText').innerHTML = text;
        if (mat.preview != '') {
            document.getElementById('panelPreview').innerHTML = mat.preview;
        } else {
            document.getElementById('panelPreview').innerHTML = "no preview for " + matname;
        }
        return true;
    }
}

function getSkmInnerHTML(skm) {
    var html = '';
    html += "<a class=\"alias_clear\" onclick=\"clearAlias('" + skm.id + "')\""
    html += "title=\"remove alias\">&nbsp;</a>";
    html += skm.nameHTML + "<br/>";
    return html
}

function setAlias(skmId, radId) {
    try {
        // update <div>
        var skm = skmMaterialsList.getMaterial(skmId);
        skm.alias = radId;
        document.getElementById(skmId).className = 'skm_with_alias';
        document.getElementById(skmId).innerHTML = getSkmInnerHTML(skm);
        // show log and status
        var msg = "material '" + skmId + "' aliased to '" + radId + "'";
        log.info(msg);
        document.getElementById('status_tab-materials').innerHTML = msg;
    } catch (e) {
        log.error("Error setAlias(): '" + e + "'");
    }
}

function updateMaterialsList () {
    // list containers
    var text ="<div class=\"listPanel\" id=\"skmListPanel\">"
    text += buildSkmList()
    text += "</div>"
    text += "<div class=\"listPanel\" id=\"matListPanel\">"
    text += buildMatList()
    text += "</div>"
    // details
    text += "<div class=\"detailsPanel\" id=\"containerDetails\">"
    text += "<div class=\"detailsPanel\" id=\"panelPreview\">preview</div>" 
    text += "<div class=\"detailsPanel\" id=\"panelText\">text</div>" 
    text += "</div>" 
    document.getElementById('MaterialsDetails').innerHTML = text;
    activateDragDrop();
}




