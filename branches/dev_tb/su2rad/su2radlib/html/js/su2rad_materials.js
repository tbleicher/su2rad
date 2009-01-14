
function materialsListObject() {
    this.name = "matList";
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
            log.info(this.name + ": replacing material_id '" + mat.id + "' mat='" + mat.nameHTML + "'");
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

materialsListObject.prototype.getMaterial = function (id, silent) {
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
    
// mixin for SketchUp materials
function genSkmId(skm) {
    return skm.nameRad + '_id'
}

// mixin for Radiance materials
function genMatId(mat) {
    return mat.nameRad
}


var skmMaterialsList = new materialsListObject();
skmMaterialsList.name = "skmList"
skmMaterialsList.genId = genSkmId 

var radMaterialsList = new materialsListObject();
radMaterialsList.name = "radList"
radMaterialsList.genId = genMatId



function activateDrag () {
    $(".mdev").draggable({
        helper:'clone',
        start: function (ev,ui) {
            showMaterialDetails( $(ui.helper).attr('id') );
        }
    });
}

function activateDrop () {
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
    // repeated dragging messes up div content on Windows
    if (PLATFORM != "Windows") {
        dragClone.draggable({
            helper:'clone',
            start: function (ev,ui) {
                showMaterialDetails( $(ui.helper).attr('id') );
            }
        });
    }
    $(this).append(dragClone);
}

function buildMaterialListRad () {
    var text = "";
    matList = radMaterialsList.getList();
    for (var i=0; i<matList.length; i++) {
        var mat = matList[i]
        if (_materialFilter(mat) == true) {
            text += getMatDragHTML(mat.nameRad)
        }
    }
    log.debug("Radiance materials total: " + radMaterialsList.length)
    document.getElementById("radListPanel").innerHTML = text;
    activateDrag();
}

function _materialFilter(mat) {
    try {
        if (mat.defType == 'material') {
            return true
        } else {
            var id = 'showDefType_' + mat.defType
            return document.getElementById(id).checked
        }
    } catch (e) {
        log.error(e.message)
        return true
    }
}

function buildMaterialListSkm () {
    log.debug("buildMaterialListSkm()")
    var text = "";
    skmList = skmMaterialsList.getList();
    for (var i=0; i<skmList.length; i++) {
        var skm = skmList[i]
        if (skm.alias != '') {
            // material has alias set
            text += "<div class=\"skm_with_alias\" id=\"" + skm.id + "\">";
            text += getSkmInnerHTML(skm);
            //TODO: if verify_materials == true
            text += getMatDragHTML(skm.alias);
            text += "</div>";
        } else {
            if (radMaterialsList.getMaterial(skm.nameRad, true)) {
                var style = "class=\"skm_defined\" ";
            } else {
                var style = "class=\"skm\" ";
            }
            if (document.getElementById("showRadianceName").checked == true) {
                displayName = skm.nameRad;
            } else {
                displayName = skm.nameHTML;
            }
            text += "<div " + style + "id=\"" + skm.id + "\">" + displayName + "</div>"
        }
    }
    document.getElementById("skmListPanel").innerHTML = text;
    activateDrag();
    activateDrop();
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
    text += "<a title=\"" + matname + "\" onClick=\"showMaterialDetails('" + matname + "')\">" 
    text += matname + "</a></div>"
    return text
}

function showMaterialDetails(matname) {
    var mat = radMaterialsList.getMaterial(matname)
    var text = "";
    if (mat) {
        document.getElementById('panelDetailsTitle').innerHTML = matname;
        var detailsCB = document.getElementById('showDetailsRequired')
        detailsCB.setAttribute("onclick", "showMaterialDetails('" + matname + "')");
        if (mat.required != 'void' && detailsCB.checked) {
            var req = radMaterialsList.getMaterial(mat.required)
            if (!req) {
                text += "<span style=\"color:#cc0000;\">## required modifier '" + mat.required + "' unknown</span><br/>"
            } else {
                text += "<span style=\"color:#999999;\">" + req.definition + "</span><br/>"
            }
        }
        text += mat.definition;
        document.getElementById('panelDetailsText').innerHTML = text;
        if (mat.preview != '') {
            document.getElementById('panelPreview').innerHTML = mat.preview;
        } else {
            document.getElementById('panelPreview').innerHTML = "no preview for " + matname;
        }
        return true;
    } else {
        text += "<span style=\"color:#cc0000;\">## material '" + matname + "' could not be found</span><br/>"
    }
}

function getSkmInnerHTML(skm) {
    var html = "";
    if (PLATFORM == "Windows") {
        html += "<div style=\"float:right;font-size:12px;cursor:pointer;\"><a onclick=\"clearAlias('" + skm.id + "')\""
        html += "title=\"remove alias\">[X]</a></div>";
    } else {
        html += "<a class=\"alias_clear\" onclick=\"clearAlias('" + skm.id + "')\""
        html += "title=\"remove alias\">&nbsp;</a>";
    }
    if (document.getElementById("showRadianceName").checked == true) {
        html += skm.nameRad + "<br/>";
    } else {
        html += skm.nameHTML + "<br/>";
    }
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


