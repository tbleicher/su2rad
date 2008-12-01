
function ViewObject() {
    this.name = 'unset';
    this.id = 'unset';
    this.selected = false;
    this.current = false;
}

ViewObject.prototype.setFromObject = function (obj) {
    var attributes = ['name', 'selected', 'current'];
    try {
        for (i=0; i<attributes.length; i++) {
            var attr = attributes[i];
            this[attr] = obj[attr];
        }
    } catch (e) {
        log.error("view '" + this.name + "': error setting attribute '" + attr + "' [" + e.name + "]");
        return false;
    }
    this.id = replaceChars(this.name);
    return true;
}


function ViewsListObject() {
    this.views = new Array();
}

ViewsListObject.prototype.setViewsList = function (newViews) {
    // create new view objects from array <newViews>
    this.views = new Array();
    for(var i=0; i<newViews.length; i++) {
        if (newViews[i] != null) {
            var view = new ViewObject();
            if (view.setFromObject(newViews[i]) == true) {
                this.views.push(view);
            }
        }
    }
    log.info("viewsList: " + this.views.length + " views");
    updateViews();
}



function onViewSelectionChange(viewname) {
    // callback for views checkboxes
    var id = replaceChars(viewname);
    var msg = "view '" + viewname + "'";
    var param = viewname + "&";
     
    if (document.getElementById(id).checked == true) {
        msg += " selected";
        param += "selected";
    } else {
        msg += " deselected";
        param += "deselected";
    }
    log.info(msg);
    applyViewSelection(param);
}


function updateViews() {
    var text = '<div class="gridRow">';
    var col = 0;
    for(var i=0; i<viewsList.views.length; i++) {
        var view = viewsList.views[i];
        if(view != null) {
            log.debug("view = '" + view.name + "'");
            text += _getViewDiv(view);
            col += 1;
        }
        // start new row after 3 views (except for end)
        if (col == 3 && i != (viewsList.length-1)) {
            text += '</div><div class="gridRow">';
            col = 0;
        }
    }
    text += "</div>";
    document.getElementById("viewsSelection").innerHTML = text;
}

function _getViewDiv(view) {
    // return <td> for view line (lable and checkbox)
    var text = '<div class="gridCell">';
    text += '<input id="' + view.id + '"' 
    text += 'type="checkbox" onchange="onViewSelectionChange(\'' + view.name + '\')"'
    if (view.current == "true" || view.selected == "true") {
        text += ' checked'
    }
    text += '/> ' + view.name + '</div>';
    return text;
}



