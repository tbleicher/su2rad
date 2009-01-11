
var draggedElement = null;


function updateMaterialsList() {
    
    // list containers
    var text ="<div class=\"container\" id=\"su_materials\">"
    var su_mats = ['mat1', 'mat2', 'mat3', 'mat4', 'mat5', 'mat1b', 'mat2b',
                   'mat3b', 'mat4b', 'mat5b', 'pink', 'aquamarin', 'yellow-red']
    var rad_mats = ['green', 'red', 'blue', 'grass_green', 
                    'dark_red_brick', 'blue_paint', 'oxidised_aluminium', 'concrete']
    for (var i=0; i<su_mats.length; i++) {
        var mat = su_mats[i]
        text += "<div class=\"drop\" id=\"" + mat + "\">" + mat + "</div>"
    }
    text += "</div>"
    text += "<div class=\"container\">"
    for (var i=0; i<rad_mats.length; i++) {
        var mat = rad_mats[i]
        text += "<div class=\"block\" id=\"" + mat + "\">" + mat + "</div>"
    }
    text += "</div>"

    // details
    text += "<div class=\"container\" id=\"containerDetails\">"
    text += "<div class=\"container\" id=\"containerPreview\">preview</div>" 
    text += "<div id=\"containerText\">text</div>" 
    text += "</div>" 
    document.getElementById('MaterialsDetails').innerHTML = text;
    activateDraggables();
}


function activateDraggables() {
    $(".block").draggable({helper:'clone'});
        //ghosting: true,
        //start: function(e, ui) {
        //    var dragId = $(ui.draggable.element).attr('id');
        //}
    $(".drop").droppable({
        accept: ".block",
        activeClass: 'droppable-active',
        hoverClass: 'droppable-hover',
        drop: function(ev, ui) {
            var dragClone = $(ui.draggable).clone();
            var dropId = $(this).attr('id');
            document.getElementById(dropId).innerHTML = '';
            $(this).append("<a class=\"drop_clear\" onclick=\"clearAlias('" + dropId + "')\">[clear]</a>") 
            $(this).append("again: " + dropId);
            $(this).append(dragClone);
            dragClone.draggable({helper:'clone'});
            var dragId = $(ui.draggable).attr('id');
            setAlias(dropId, dragId);
        }
    });
}

function clearAlias(dropId) {
    log.info("clearing alias for '" + dropId + "'");
    document.getElementById(dropId).innerHTML = dropId;
}

function setAlias(dropId, dragId) {
    var msg = "material '" + dropId + "' aliased to '" + dragId + "'";
    log.info(msg);
    document.getElementById('status_tab-materials').innerHTML = msg;
}



