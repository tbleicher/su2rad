
function SkmMaterialsListObject() {
    this._lookupTable = {};
    this._idArray = new Array();
}

SkmMaterialsListObject.prototype.update = function (list) {
    var replaced = 0;
    for (var i=0; i<list.length; i++) {
        var skm = list[i];
        skm.id = this.genId(skm);
        if (!this._lookupTable[skm.id]) {
            log.debug("DEBUG: new material '" + skm.nameHTML + "'");
            this._idArray.push(skm.id);
            this._lookupTable[skm.id] = skm;
        } else {
            log.info("replacing material_id '" + skm.id + "' mat='" + skm.nameHTML + "'");
            this._lookupTable[skm.id] = skm;
        }
    }   
}

SkmMaterialsListObject.prototype.genId = function (skm) {
    return skm.nameRad + '_id'
}

SkmMaterialsListObject.prototype.getMaterials = function () {
    this._idArray.sort()
    list = new Array();
    try {
        for (var i=0; i<this._idArray.length; i++) {
            var id = this._idArray[i];
            if (!this._lookupTable[id]) {
                log.error("material id not found '" + id + "'");
            } else {
                list.push(this._lookupTable[id])
            }
        }
    } catch (e) [
        log.error("getMaterials() " + e)
    }
    return list;   
}




var draggedElement = null;
var skmMaterialsList = new SkmMaterialsListObject();
var radMaterialsList = new Array();


function setSkmMaterialsListJSON(text) {
    var json = decodeJSON(text);
    //log.debug("setSkmMaterialsListJSON=<br/>" + json.replace(/,/g,',<br/>'));
    //log.error("TEST: setSkmMaterialsListJSON=<br/>json.length=" + json.length);
    var newMats = new Array();
    try {
        eval("newMats = " + json);
        log.info("SketchUp materials in model: " + newMats.length); 
    } catch (e) {
        log.error("setSkmMaterialsListJSON: error in eval() '" + e.name + "'");
        log.error("json= " + json.replace(/,/g,',<br/>'));
    }
    skmMaterialsList.update(newMats);
}

function getSkmMaterialsList () {
    var text = "";
    skmList = skmMaterialsList.getMaterials();
    for (var i=0; i<skmList.length; i++) {
        var skm = skmList[i]
        text += "<div class=\"skm\" id=\"" + skm.id + "\">" + skm.nameHTML + "</div>"
    }
    return text;
}

function getRadMaterialsList () {
    var rad_mats = ['green', 'red', 'blue', 'grass_green', 
                    'dark_red_brick', 'blue_paint', 'oxidised_aluminium', 'concrete']
    var text = "";
    for (var i=0; i<rad_mats.length; i++) {
        var mdev = rad_mats[i]
        text += "<div class=\"mdev\" id=\"" + mdev + "\">" + mdev + "</div>"
    }
    return text;
}

function updateMaterialsList() {
    // list containers
    var text ="<div class=\"listPanel\" id=\"skmListPanel\">"
    text += getSkmMaterialsList()
    text += "</div>"
    text += "<div class=\"listPanel\" id=\"matListPanel\">"
    text += getRadMaterialsList()
    text += "</div>"
    // details
    text += "<div class=\"detailsPanel\" id=\"containerDetails\">"
    text += "<div class=\"detailsPanel\" id=\"panelPreview\">preview</div>" 
    text += "<div class=\"detailsPanel\" id=\"panelText\">text</div>" 
    text += "</div>" 
    document.getElementById('MaterialsDetails').innerHTML = text;
    activateDraggables();
}


function activateDraggables() {
    $(".mdev").draggable({helper:'clone'});
        //ghosting: true,
        //start: function(e, ui) {
        //    var dragId = $(ui.draggable.element).attr('id');
        //}
    $(".skm").droppable({
        accept: ".mdev",
        activeClass: 'droppable-active',
        hoverClass: 'droppable-hover',
        drop: function(ev, ui) {
            var dragClone = $(ui.draggable).clone();
            dragClone.draggable({helper:'clone'});
            var skmId = $(this).attr('id');
            var radId = $(ui.draggable).attr('id');
            setAlias(skmId, radId);
            
        }
    });
}

function clearAlias(skmId) {
    log.info("clearing alias for '" + skmId + "'");
    document.getElementById(skmId).innerHTML = skmId;
}

function setAlias(skmId, radId) {
    // update <div>
    log.error("TEST: setAlias('" + skmId + "', '" + radId + "')";
    try {
        document.getElementById(skmId).innerHTML = '';
        $(this).append("<a class=\"alias_clear\" onclick=\"clearAlias('" + skmId + "')\">[clear]</a>") 
        $(this).append("again: " + skmId);
        $(this).append(dragClone);
        // show log and status
        var msg = "material '" + skmId + "' aliased to '" + radId + "'";
        log.info(msg);
        document.getElementById('status_tab-materials').innerHTML = msg;
    } catch (e) {
        log.error("Error setAlias(): '" + e + "'");
    }
}


function _getMaterialTestDataSkm () {
    var json = "[{'name':'red','nameRad':'red','nameHTML':'red','alias':''},";
    json += "{'name':'blue','nameRad':'blue','nameHTML':'blue','alias':''},";
    json += "{'name':'green','nameRad':'green','nameHTML':'green','alias':''},";
    json += "{'name':'brick','nameRad':'brick','nameHTML':'brick','alias':''},";
    json += "{'name':'concrete','nameRad':'concrete','nameHTML':'concrete','alias':''},";
    json += "{'name':'asphalt dark','nameRad':'asphalt_dark','nameHTML':'asphalt dark','alias':''},";
    json += "{'name':'grass_green','nameRad':'grass_green','nameHTML':'grass_green','alias':''},";
    json += "{'name':'grass_brown','nameRad':'grass_brown','nameHTML':'grass_brown','alias':''},";
    json += "{'name':'brick 2','nameRad':'brick_2','nameHTML':'brick 2','alias':''},";
    json += "{'name':'walls white','nameRad':'walls_white','nameHTML':'walls white','alias':''}]";
    return encodeJSON(json);
}


