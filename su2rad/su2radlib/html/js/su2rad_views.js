
function ViewObject() {
    this.name = 'unset';
    this.id = 'unset';
    this.selected = false;
    this.current = false;
    this.vt = "v";
    this.vp = "0 0 1";
    this.vd = "0 1 0";
    this.vu = "0 0 1";
    this.va = 0.0;
    this.vo = 0.0;
    this.vv = 60.0;
    this.vh = 60.0;
}

ViewObject.prototype.getToolTip = function () {
    return this.toViewString();
}

ViewObject.prototype.setFromJSONObject = function (obj) {
    var attributes = ['name','selected','current','vt','vp','vd','vu'];
    var f_attributes = ['vo','va','vv','vh'];
    try {
        for (i=0; i<attributes.length; i++) {
            var attr = attributes[i];
            this[attr] = obj[attr];
        }
        for (i=0; i<f_attributes.length; i++) {
            var attr = f_attributes[i];
            this[attr] = parseFloat(obj[attr]);
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
    //log.error("DEBUG: view.toRubyString()")
    var text = "{\"name\" => \""     + this.name     + "\",";
    text +=    " \"selected\" => \"" + this.selected + "\",";
    text +=    " \"vt\" => \"" + this.vt             + "\",";
    text +=    " \"vp\" => \"" + this.vp             + "\",";
    text +=    " \"vd\" => \"" + this.vd             + "\",";
    text +=    " \"vu\" => \"" + this.vu             + "\",";
    text +=    " \"vo\" => \"" + this.vo.toFixed(3)  + "\",";
    text +=    " \"va\" => \"" + this.va.toFixed(3)  + "\",";
    text +=    " \"vv\" => \"" + this.vv.toFixed(3)  + "\",";
    text +=    " \"vh\" => \"" + this.vh.toFixed(3)  + "\"";
    text += "}"
    return text;
}

ViewObject.prototype.toViewString = function () {
    var text = "rvu -vt" + this.vt;
    text += " -vp " + this.vp;
    text += " -vd " + this.vd;
    text += " -vu " + this.vu;
    text += " -vh " + this.vh.toFixed(3)
    text += " -vv " + this.vv.toFixed(3)
    text += " -vo " + this.vo.toFixed(3)
    text += " -va " + this.va.toFixed(3)
    return text;
}



function ViewsListObject() {
    this.views = new Array();
}

ViewsListObject.prototype.setViewsList = function (newViews) {
    // create new view objects from array <newViews>
    log.debug("setViewsList()")
    this.views = new Array();
    for(var i=0; i<newViews.length; i++) {
        if (newViews[i] != null) {
            var view = new ViewObject();
            if (view.setFromJSONObject(newViews[i]) == true) {
                this[view.name] = view;
                this.views.push(view.name);
            }
        }
    }
    log.info("viewsList: " + this.views.length + " views");
    updateViewsSummary();
}

ViewsListObject.prototype.toString = function () {
    // return views as object notation string
    //log.error("DEBUG: viewsList.toString()")
    var text = "["
    for(var i=0; i<this.views.length; i++) {
        var vname = this.views[i];
        try {
            text += this[vname].toRubyString() + ",";
        } catch (e) {
            log.error(vname + ".toRubyString(): " + e.name)
        }
    }
    //text = text.substr(0,text.length-1);
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


function updateViewsSummary() {
    var text = '<div class="gridRow">';
    var col = 0;
    for(var i=0; i<viewsList.views.length; i++) {
        var view = viewsList[viewsList.views[i]];
        if(view != null) {
            log.debug("view = '" + view.name + "'");
            text += _getViewSummaryDiv(view);
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

function _getViewSummaryDiv(view) {
    // return <td> for view line (lable and checkbox)
    var text = '<div class="gridCell">';
    text += '<input id="' + view.id + '"' 
    text += 'type="checkbox" onchange="onViewSelectionChange(\'' + view.name + '\')"'
    if (view.selected == "true") {
        text += ' checked'
    }
    text += '/> <a title="' + view.getToolTip() + '">' + view.name + '</a></div>';
    return text;
}



