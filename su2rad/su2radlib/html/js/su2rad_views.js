
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

ViewObject.prototype.setSelection = function (selected) {
    this.selected = selected;
    if (selected == true) {
        log.info("view '" + this.name + "' selected");
    } else {
        log.info("view '" + this.name + "' deselected");
    }
}

ViewObject.prototype.toRubyString = function () {
    var text = "{\"name\" => \"" + this.name + "\",";
    text +=    " \"selected\" => \"" + this.selected + "\",";
    text +=    " \"options\" => \"" + this.toViewString() + "\"}"
    return text;
}

ViewObject.prototype.toViewString = function () {
    log.error("TODO: view.toViewString()");
    var text = "rvu -vtv -vp 0 0 1 -vd 0 -1 0 -vo 0 -va 0 -vv 60 -vh 60";
    return text;
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
                this[view.name] = view;
                this.views.push(view.name);
            }
        }
    }
    log.info("viewsList: " + this.views.length + " views");
    updateViews();
}

ViewsListObject.prototype.toString = function () {
    // return views as object notation string
    var text = "["
    for(var i=0; i<this.views.length; i++) {
        var vname = this.views[i];
        text += this[vname].toRubyString() + ",";
    }
    text = text.substr(0,text.length-1);
    text += "]";
    return text;
}

function onViewSelectionChange(viewname) {
    // callback for views checkboxes
    var id = replaceChars(viewname);
    if (document.getElementById(id).checked == true) {
        viewsList[viewname].setSelection(true); 
    } else {
        viewsList[viewname].setSelection(false); 
    }
    applyViews();
}


function updateViews() {
    var text = '<div class="gridRow">';
    var col = 0;
    for(var i=0; i<viewsList.views.length; i++) {
        var view = viewsList[viewsList.views[i]];
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
    if (view.selected == "true") {
        text += ' checked'
    }
    text += '/> ' + view.name + '</div>';
    return text;
}



