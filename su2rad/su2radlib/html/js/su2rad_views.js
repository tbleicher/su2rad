
function ViewObject() {
    this.name = 'unset';
    this.id = 'unset';
    this.selected = false;
    this.current = false;
    this.show_details = false;
    this.vt = "v";
    this.vp = "0 0 1";
    this.vd = "0 1 0";
    this.vu = "0 0 1";
    this.va = 0.0;
    this.vo = 0.0;
    this.vv = 60.0;
    this.vh = 60.0;
    this._verbose = true;
    this._bool_attributes   = ['selected','current','show_details']
    this._float_attributes  = ['vo','va','vv','vh'];
    this._vector_attributes = ['vp','vd','vu'];
    this._viewTypes = [ ['v','perspective'],
                        ['l','parallel'],
                        ['a','angular'],
                        ['c','cylindrical'],
                        ['h','horizontal'],
                        ['s','stereometric'] ]
}

ViewObject.prototype.getDetailsHTML = function () {
    text =  "<h3><span style=\"font-size:12px;float:right;\">"
    if (this.show_details == false) {
        text += "<a onclick=\"showViewDetails('" + this.name + "')\">show details</a>";
    } else {
        text += "<a onclick=\"hideViewDetails('" + this.name + "')\">hide details</a>";
    }
    text += "</span>" + this.name + "</h3>";
    if (this.show_details == false) {
        return text
    }
    text += "<div class=\"viewOptions\">"
    text += this._getViewTypeSelection();
    text += this._getVectorValueInput('vp', 'style="margin-top:10px"');
    text += this._getVectorValueInput('vd', 'style="margin-top:5px"');
    text += this._getVectorValueInput('vu', 'style="margin-top:5px"');
    text += this._getFloatValueGroup('vv','vh', 'style="float:left;"');
    text += this._getFloatValueGroup('vo','va', 'style="margin-left:113px"');
    text += "</div>"
    text += "<div class=\"previewPanel\">"
    text += "<input type=\"button\" value=\"TODO: preview\" onclick=\"onCreatePreview('" + this.name + "')\">"
    text += "</div>"
    return text
}



ViewObject.prototype.getElementId = function (opt) {
    return this.id + "_" + opt;
}

ViewObject.prototype._getViewTypeSelection = function () {
    var divtext = "<div><div class=\"gridLabel\">-vt:</div>"
    divtext += "<select id=\"" + this.getElementId('vt') + "\" onchange=\"onViewTypeChange('"+ this.name + "')\">"
    for (var i=0; i<this._viewTypes.length; i++) {
        vt = this._viewTypes[i]
        if (this.vt == vt[0]) {
            divtext += "<option value=\"" + vt[0] + "\" selected>" + vt[1] + "</option>"
        } else {
            divtext += "<option value=\"" + vt[0] + "\" >" + vt[1] + "</option>"
        }
    } 
    divtext += "</select></div>";
    return divtext
}

ViewObject.prototype._getVectorValueInput = function (opt, style) {
    var divtext = "<div " + style + " >"
    divtext += "<div class=\"gridLabel\">-" + opt + ":</div>"
    vect = this[opt]
    for (var i=0; i<3; i++) {
        divtext +=     "<input type=\"text\" class=\"viewOptionFloatValue\""
        divtext +=         "id=\"" + this.getElementId(opt) + "_" + i + "\" value=\"" + vect[i].toFixed(3) + "\""
        divtext +=         "onchange=\"onViewVectorOptionChange('" + this.name + "','" + opt + "')\" />"
    }
    divtext += "</div>";
    return divtext
}

ViewObject.prototype._getFloatValueGroup = function (opt1,opt2,style) {
    var gtext = "<div class=\"floatGroup\" " + style + " \">"
    gtext += this._getFloatValueInput(opt1)
    gtext += this._getFloatValueInput(opt2)
    gtext += "</div>"
    return gtext;
}

ViewObject.prototype._getFloatValueInput = function (opt) {
    var divtext = ''
    divtext += "<div class=\"gridLabel\">-" + opt + ":</div>"
    divtext +=     "<input type=\"text\" class=\"viewOptionFloatValue\""
    divtext +=         "id=\"" + this.getElementId(opt) + "\" value=\"" + this[opt].toFixed(3) + "\""
    divtext +=         "onchange=\"onViewFloatOptionChange('" + this.name + "','" + opt + "')\" />"
    return divtext
}

ViewObject.prototype.getToolTip = function () {
    return this.toViewString();
}

ViewObject.prototype._evalFloat = function (val) {
    return this.toViewString();
}

ViewObject.prototype._checkVector = function (vector) {
    if (vector.constructor.toString().match(/Array/i) ) {
        // vector is array
    } else if (vector.constructor.toString().match(/String/i) ) {
        if (vector.indexOf(',') > 0) {
            vector = vector.split(',');
        } else {
            var a = vector.split(' ');
            vector = new Array();
            for (var i=0; i<a.length; i++) {
                if (a[i] != '') {
                    vector.push(a[i])
                }
            }
        }
    } else {
        log.error('vector not of type array or string (type=' + vector.constructor + ')');
        return false;
    }
    if (vector.length != 3) {
        log.error('vector: array of wrong length (' + vector.toString() + ')');
        return false;
    }
    x = parseFloat(vector[0]);
    y = parseFloat(vector[1]);
    z = parseFloat(vector[2]);
    if ( isNaN(x) || isNaN(y) || isNaN(z) ) {
        log.error('vector: component not float value (' + vector.toString() + ')');
        return false;
    }
    return [x,y,z]
}

ViewObject.prototype._checkViewType = function (vtype) {
    for (i=0; i<this._viewTypes.length; i++) {
        if (vtype == this._viewTypes[i][0] || vtype == this._viewTypes[i][1]) {
            return this._viewTypes[i][0]
        }
    }
    return false;
}

ViewObject.prototype.setValue = function (attr, newval) {
    if (this._setValue(attr, newval) == true) {
        if (this._verbose == true) {
            log.info("'" + this.name + "': new value for '" + attr + "': " + this[attr]);
        }
    } else {
        log.warn("new value for '" + attr + "' rejected ('" + newval + "')");
    }
}

ViewObject.prototype._setValue = function (attr, newval) {
    //log.debug('view.setValue(' + attr + ',' + newval + ')');
    if (attr == 'name') {
        this.name = newval
        this.id = replaceChars(this.name);
        return true
    }
    if (attr == 'vt') {
        this.vt = this._checkViewType(newval) || this.vt;
        return true
    }
    for (var i=0; i<this._bool_attributes.length; i++) {
        if (attr == this._bool_attributes[i]) {
            //log.error("DEBUG: bool attr=" + attr + " newval=" + newval)
            if (newval == 'false' || newval == false || newval == 0 || newval == '0') {
                this[attr] = false;
            } else {
                this[attr] = true;
            }
            return true
        }
    }
    for (var i=0; i<this._float_attributes.length; i++) {
        if (attr == this._float_attributes[i]) {
            var val = parseFloat(newval);
            if (!isNaN(val)) {
                this[attr] = val;
            }
            return true
        }
    }
    for (var i=0; i<this._vector_attributes.length; i++) {
        if (attr == this._vector_attributes[i]) {
            this[attr] = this._checkVector(newval) || this[attr];
            return true
        }
    }
    return false
}

ViewObject.prototype.setFromJSONObject = function (obj) {
    //log.error('DEBUG: view.setFromJSONObject(obj=' + obj.name + ')');
    var opts = ['name','vt','selected','current','show_details', 'vo','va','vv','vh','vp','vd','vu'];
    this._verbose = false;
    for (var i=0; i<opts.length; i++) {
        //log.debug('i=' + i + ' opts[i]=' + opts[i]);
        var attr = opts[i];
        if (obj[attr]) {
            this.setValue(attr, obj[attr]);
        }
    }
    this._verbose = true;
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

ViewObject.prototype.toRubyString = function (selection_only) {
    //log.error("DEBUG: view.toRubyString()")
    var text = "{\"name\" => \""     + this.name     + "\",";
    text +=    " \"selected\" => \"" + this.selected + "\",";
    if (selection_only == true) {
	return text + "}";
    }
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
}

ViewsListObject.prototype.selectAllViews = function (selected) {
    for(var i=0; i<this.views.length; i++) {
        var vname = this.views[i];
        this[vname].setSelection(selected);
    }
}

ViewsListObject.prototype.toString = function (selection_only) {
    // return views as object notation string
    //log.error("DEBUG: viewsList.toString()")
    var text = "["
    for(var i=0; i<this.views.length; i++) {
        var vname = this.views[i];
        try {
            text += this[vname].toRubyString(selection_only) + ",";
        } catch (e) {
            log.error(vname + ".toRubyString(): " + e.name)
        }
    }
    //text = text.substr(0,text.length-1);
    text += "]";
    return text;
}

function deselectAllViews() {
    selectAllViews(false); 
}

function selectAllViews(selected) {
    if (selected == false) {
        log.info('deselecting all views');
        document.getElementById('selectAllViews').innerHTML = "<a onclick=\"selectAllViews()\">[select all]</a>" 
    } else {
        log.info('selecting all views');
        selected = true;
        document.getElementById('selectAllViews').innerHTML = "<a onclick=\"deselectAllViews()\">[deselect all]</a>" 
    }
    viewsList.selectAllViews(selected);
    updateViewsSummary();
    if (SKETCHUP == true) {
        window.location = 'skp:selectAllViews@' + selected;
    } else {
        log.debug("no action for selectAllViews(" + selected + ")"); 
    }
}


function hideViewDetails(viewname) {
    viewsList[viewname].show_details = false;
    updateViewDetailsList();
}

function onCreatePreview(viewname) {
    if (viewsList[viewname]) {
        var view = viewsList[viewname];
        log.error("TEST: onCreatePreview('" + viewname + "')");
    } else {
        log.error("view '" + viewname + "' not found in viewsList!");
    }
}

function onViewFloatOptionChange(viewname, opt) {
    // callback for single value text fields
    if (viewsList[viewname]) {
        var view = viewsList[viewname];
        var id = view.getElementId(opt);
        view.setValue(opt, document.getElementById(id).value);
        applyViewSettings(viewname);
    } else {
        log.error("view '" + viewname + "' not found in viewsList!");
    }
}

function onViewSelectionChange(viewname) {
    // callback for views checkboxes
    if (viewsList[viewname]) {
        var view = viewsList[viewname];
        var id = view.getElementId('cb');
        if (document.getElementById(id).checked == true) {
            view.setSelection(true); 
        } else {
            view.setSelection(false); 
        }
        applyViewSettings(viewname);
    } else {
        log.error("view '" + viewname + "' not found in viewsList!");
    }
}

function onViewTypeChange(viewname) {
    if (viewsList[viewname]) {
        var view = viewsList[viewname];
        var id = view.getElementId('vt');
        view.setValue('vt', document.getElementById(id).value);
        applyViewSettings(viewname);
    } else {
        log.error("view '" + viewname + "' not found in viewsList!");
    }
}

function onViewVectorOptionChange(viewname, opt) {
    if (viewsList[viewname]) {
        var view = viewsList[viewname];
        var id = view.getElementId(opt);
        x = document.getElementById(id + '_0').value;
        y = document.getElementById(id + '_1').value;
        z = document.getElementById(id + '_2').value;
        view.setValue(opt, [x,y,z]);
        applyViewSettings(viewname);
    } else {
        log.error("view '" + viewname + "' not found in viewsList!");
    }
}

function showViewDetails(viewname) {
    viewsList[viewname].show_details = true;
    updateViewDetailsList();
}


function updateViewDetailsList() {
    var text = "";
    for(var i=0; i<viewsList.views.length; i++) {
        var view = viewsList[viewsList.views[i]];
        text += view.getDetailsHTML();
    }
    document.getElementById("viewDetails").innerHTML = text;
    $('.viewOptionFloatValue').numeric({allow:".-"});
}

function updateViewsSummary() {
    var text = '<div class="gridRow">';
    var col = 0;
    for(var i=0; i<viewsList.views.length; i++) {
        var view = viewsList[viewsList.views[i]];
        if(view != null) {
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
    text += '<input id="' + view.getElementId('cb') + '"' 
    text += 'type="checkbox" onClick="onViewSelectionChange(\'' + view.name + '\')"'
    if (view.selected == true || view.current == true) {
        text += ' checked'
    }
    text += '/> <a title="' + view.getToolTip() + '">'
    if (view.current == true) {
        text += '<i>' + view.name + '</i></a></div>';
    } else {
        text += view.name + '</a></div>';
    }
    return text;
}

