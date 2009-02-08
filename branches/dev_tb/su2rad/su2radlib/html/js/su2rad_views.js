
function ViewObject() {
    this.name = 'unset';
    this.id = 'unset';
    this.selected = false;
    this.current = false;
    this.pageChanged = false;
    this.show_details = false;
    this.vt = "v";
    this.vp = [0,0,1.5];
    this.vd = [0,1,0];
    this.vu = [0,0,1];
    this.va = 0.0;
    this.vo = 0.0;
    this.vv = 60.0;
    this.vh = 60.0;
    this._overrides = {};
    this._overrides.vt = true;
    this._overrides.vp = false;
    this._overrides.vd = false;
    this._overrides.vu = false;
    this._overrides.vv = false;
    this._overrides.vh = false;
    this._overrides.vo = true;
    this._overrides.va = true;
    this._verbose = true;
    this._bool_attributes   = ['selected','current','show_details','pageChanged']
    this._float_attributes  = ['vo','va','vv','vh'];
    this._vector_attributes = ['vp','vd','vu'];
    this._viewTypes = [ ['v','perspective'],
                        ['l','parallel'],
                        ['a','angular'],
                        ['c','cylindrical'],
                        ['h','horizontal'],
                        ['s','stereometric'] ]
}

ViewObject.prototype.calculateFoV = function (attr) {
    if (attr == 'vv') {
        var wanted = 'vh';
    } else {
        var wanted = 'vv';
    }
    if (this._overrides[wanted] || this._verbose == false) {
        return
    } else {
        var val = this._calculateFoV(wanted);
        if (val != false) {
            log.debug("calculated FoV for '" + wanted + "': " + val.toFixed(3) )
            this[wanted] = val;
        }
    }
}

ViewObject.prototype._calculateFoV = function(wanted) {
    var imgHor = parseFloat(radOpts.ImageSizeX); 
    var imgVert = parseFloat(radOpts.ImageSizeY);
    if (this.vt == 'l' || this.vt == 'a') {
        // parallel and angular fisheye: linear
        if (wanted == 'vh') {
            return this.vv * (imgHor/imgVert)
        } else if (wanted == 'vv') {
            return this.vh * (imgVert/imgHor) 
        }
    } else if (this.vt == 'v') {
        // perspective: tan/atan
        if (wanted == 'vh') {
            return this._calculateFoVPerspective(this.vv, imgVert, imgHor);
        } else if (wanted == 'vv') {
            return this._calculateFoVPerspective(this.vh, imgHor, imgVert);
        }
    } else {
        log.info("can't calculate " + wanted + " for view type '" + this.vt + "'");
        return false;
    }
}

ViewObject.prototype._calculateFoVPerspective = function(ang1, side1, side2) {
    var ang1_rad = ang1*Math.PI/180.0;
    var dist = side1 / ( 2.0*Math.tan(ang1_rad/2.0) );
    var ang2_rad = 2* Math.atan( side2/(2*dist) );
    var ang2 = (ang2_rad*180.0) / Math.PI;
    return ang2;
}

ViewObject.prototype.calculateUpVector = function(attr) {
    if (this._overrides.vu || this._verbose) {
        return
    }
    log.info("TODO: calculate up vector")
}

ViewObject.prototype.fitViewToImage = function () {
    var vh = this._calculateFoV('vh');
    var vv = this._calculateFoV('vv');
    if (vh && vh > this.vh) {
        this.vh = vh;
    } else if (vv && vv > this.vv) {
        this.vv = vv;
    }
}

ViewObject.prototype.getCheckBoxLabel = function(opt) {
    if (this._overrides[opt] == true) {
        var action = " onClick=\"disableViewOverride('" + this.name + "','" + opt + "')\" "
        var text = "<input type=\"checkbox\"" + action + "checked />";
    } else {
        var action = " onClick=\"enableViewOverride('" + this.name + "','" + opt + "')\" "
        var text = "<input type=\"checkbox\"" + action + " />";
    }
    text += "<a class=\"gridLabel\"" + action + ">-" + opt + ":";
    text += getToolTip('rpict', opt);
    text += "</a>";
    return text;
}

ViewObject.prototype.getDetailsHTML = function () {
    // title (clickable)
    if (this.show_details == false) {
        text  = "<a class=\"clickable\" onclick=\"showViewDetails('" + this.name + "')\">";
        lable = "[show details]";
    } else {
        text  = "<a class=\"clickable\" onclick=\"hideViewDetails('" + this.name + "')\">";
        lable = "[hide details]";
    }
    if (this.pageChanged) {
        text += "<h3 class=\"highlightWarn\">"
    } else {
        text += "<h3>"
    } 
    text += "<span style=\"font-size:12px;float:right;\">" + lable + "</span>"
    text += this.name + "</h3></a>";
    
    // stop here in overview
    if (this.show_details == false) {
        return text
    }
    
    // reset camera button
    if (this.pageChanged == true) {
        text += "<div class=\"highlightWarn\" style=\"padding-left:5px;\">"
        text += "page view has changed! "
        text += "<input type=\"button\" value=\"apply to view\" onclick=\"onResetCamera('" + this.name + "')\">"
        text += "<input type=\"button\" value=\"remove settings\" onclick=\"onRemoveSettings('" + this.name + "')\">"
        text += "</div>"
    }
    
    // view details
    text += "<div class=\"viewPanel\">"
    text += "<div class=\"viewOptions\">"
    text += this._getViewTypeSelection();
    text += this._getVectorValueInput('vp', 'style="margin-top:10px"');
    text += this._getVectorValueInput('vd', 'style="margin-top:5px"');
    text += this._getVectorValueInput('vu', 'style="margin-top:5px"');
    text += this._getFloatValueGroup('vv','vo', 'style="margin-top:10px"');
    text += this._getFloatValueGroup('vh','va', '');
    text += "</div>"

    // preview
    text += "<div class=\"previewPanel\">"
    text += "<div class=\"imageSizeFrame\" " + this._getStyle(this._getImageSizeFrame()) + " >"
    text += "<div class=\"imageSizeView\" " +  this._getStyle(this._getImageSizeView()) + " >"
    text += "<input type=\"button\" value=\"TODO: preview\" onclick=\"onCreatePreview('" + this.name + "')\">"
    text += "</div></div></div>"
    text += "</div>"
    return text
}

ViewObject.prototype._getStyle = function (frame) {
    text = "style=\"";
    text += "width:"  + frame.width.toFixed(0) + "px;"
    text += "height:" + frame.height.toFixed(0) + "px;";
    text += "margin-top:" + frame.m_top.toFixed(0) + "px;"; 
    text += "margin-left:" + frame.m_left.toFixed(0) + "px\"";
    return text;
}

ViewObject.prototype._getImageSizeView = function () {
    var outer = this._getImageSizeFrame();
    var maxW = outer.width-2;
    var maxH = outer.height-2;
    if (this.vt == 'l' || this.vt == 'a') {
        var imgW = this.vh;
        var imgH = this.vv;
    } else {
        var imgW = Math.tan((this.vh*Math.PI/180.0)/2.0);
        var imgH = Math.tan((this.vv*Math.PI/180.0)/2.0);
    }
    return this._fitFrame(maxW,maxH,imgW,imgH);
}

ViewObject.prototype._getImageSizeFrame = function () {
    // return style override for imageSizeFrame div
    // max w/h = 300/150 (defined in css)
    var maxW = 300.0;
    var maxH = 170.0;
    var imgW = parseFloat(radOpts.ImageSizeX); 
    var imgH = parseFloat(radOpts.ImageSizeY);
    var frame = this._fitFrame(maxW,maxH,imgW,imgH);
    frame.m_left = 0;
    return frame;
}

ViewObject.prototype._fitFrame = function (maxW,maxH,imgW,imgH) {
    var frame = {};
    frame.width = maxW;
    frame.height = maxH;
    frame.m_top = 0;
    frame.m_left = 0;
    if ( (imgW/imgH) > (maxW/maxH) ) {
        // padding at top
        frame.height = imgH * (maxW/imgW);
        frame.m_top = (maxH-frame.height) / 2.0
    } else {
        // padding at sides
        frame.width = imgW * (maxH/imgH);
        frame.m_left = (maxW-frame.width) / 2.0
    }
    return frame;
}

ViewObject.prototype.getElementId = function (opt) {
    return this.id + "_" + opt;
}

ViewObject.prototype._getViewTypeSelection = function () {
    var divtext = "<div><div class=\"checkBoxDummy\"></div>";
    divtext += "<div class=\"gridLabel\">-vt:</div>";
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
    divtext += this.getCheckBoxLabel(opt)
    vect = this[opt]
    for (var i=0; i<3; i++) {
        if (this._overrides[opt] == true) {
            divtext += "<input type=\"text\" class=\"viewOptionFloatValue\""
            divtext += " id=\"" + this.getElementId(opt) + "_" + i + "\" value=\"" + vect[i].toFixed(3) + "\""
            divtext += " onchange=\"onViewVectorOptionChange('" + this.name + "','" + opt + "')\" />"
        } else {
            divtext += "<span class=\"defaultValue\">"
            divtext += vect[i].toFixed(3)
            divtext += "</span>"
        }
    }
    divtext += "</div>";
    return divtext
}

ViewObject.prototype._getFloatValueGroup = function (opt1, opt2, style) {
    var divtext = "<div " + style + " >";
    divtext += this.getCheckBoxLabel(opt1)
    divtext += this._getFloatValueInput(opt1)
    divtext += "<div class=\"gridLabel\" style=\"margin-left:21px;\" >-" + opt2 + ":</div>"
    divtext += this._getFloatValueInput(opt2)
    divtext += "</div>";
    return divtext
}

ViewObject.prototype._getFloatValueInput = function (opt) {
    var divtext = ''
    if (this._overrides[opt] == true) {
        divtext += "<input type=\"text\" class=\"viewOptionFloatValue\""
        divtext += " id=\"" + this.getElementId(opt) + "\" value=\"" + this[opt].toFixed(3) + "\""
        divtext += " onchange=\"onViewFloatOptionChange('" + this.name + "','" + opt + "')\" />"
    } else {
        divtext += "<span class=\"defaultValue\">"
        divtext += this[opt].toFixed(3)
        divtext += "</span>"
    }
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
    //log.debug(this.name + '.setValue(' + attr + ',' + newval + ')');
    if (this._setValue(attr, newval) == true) {
        if (this._verbose == true) {
            log.info("'" + this.name + "': new value for '" + attr + "': " + this[attr]);
        }
    } else {
        log.warn("new value for '" + attr + "' rejected ('" + newval + "')");
    }
}

ViewObject.prototype._setValue = function (attr, newval) {
    if (attr == 'name') {
        this.name = newval
        this.id = replaceChars(this.name);
        return true
    }
    if (attr == 'vt') {
        this.vt = this._checkViewType(newval) || this.vt;
        return true
    }
    if (attr == 'overrides') {
        for (var i=0; i<newval.length; i++) {
            this._overrides[newval[i]] = true;
        }
        return true
    }
    for (var i=0; i<this._bool_attributes.length; i++) {
        if (attr == this._bool_attributes[i]) {
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
                if (attr == 'vv' || attr == 'vh') {
                    this.calculateFoV(attr)
                }
            }
            return true
        }
    }
    for (var i=0; i<this._vector_attributes.length; i++) {
        if (attr == this._vector_attributes[i]) {
            vect = this._checkVector(newval);
            if (vect != false) {
                this[attr] = vect;
                if (attr == 'vd') {
                    this.calculateUpVector(attr)
                }
            }
            return true
        }
    }
    return false
}

ViewObject.prototype.setFromJSONObject = function (obj) {
    //log.debug('view.setFromJSONObject(obj=' + obj.name + ')');
    var opts = ['name','vt','overrides'];
    opts = opts.concat(this._bool_attributes);   
    opts = opts.concat(this._float_attributes);
    opts = opts.concat(this._vector_attributes);
    this._verbose = false;
    for (var i=0; i<opts.length; i++) {
        var attr = opts[i];
        if (obj[attr]) {
            this.setValue(attr, obj[attr]);
        }
    }
    this._verbose = true;
    // adjust vv and vh to image aspect
    this.fitViewToImage()
    return true;
}

ViewObject.prototype.toJSON = function () {
    var text = "{"
    text += "'name':'" + this.name + "',";
    text += "'vt':'" + this.vt + "',";
    var opts = [];
    opts = opts.concat(this._bool_attributes);   
    opts = opts.concat(this._float_attributes);
    for (var i=0; i<opts.length; i++) {
        var attr = opts[i];
        text += "'" + attr + "':" + this[attr] + ",";
    }
    opts = this._vector_attributes;
    for (var i=0; i<opts.length; i++) {
        var attr = opts[i];
        var vect = this[attr]
        text += "'" + attr + "':[" + vect[0] + "," + vect[1] + "," + vect[2] + "],";
    }
    text += "'overrides':["
    opts = ['vt','vp','vd','vu','vv','vh','vo','va'];
    for (var i=0; i<opts.length; i++) {
        var attr = opts[i];
        if (this._overrides[attr] == true) {
            text += "'" + attr + "',";
        }
    }
    text = text.slice(0,-1); 
    text += "]}";
    return text
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
    var text = "{\"name\" => \""     + this.name     + "\",";
    text +=    " \"selected\" => \"" + this.selected + "\"";
    if (selection_only == true) {
	return text + "}";
    }
    var opts = ['vt','vp', 'vd', 'vu', 'vv', 'vh', 'vo', 'va'];
    for (var i=0; i<opts.length; i++) {
        var o = opts[i];
        if (this._overrides[o] == true) {
            if (o == 'vo' || o == 'va' || o == 'vv' || o == 'vh') {
                text += ",\"" + o + "\" => \"" + this[o].toFixed(4) + "\"";
            } else {
                text += ",\"" + o + "\" => \"" + this[o] + "\"";
            }
        }
    }
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

ViewsListObject.prototype.setView = function (viewname, obj) {
    var view = this[viewname]
    if (view) {
        if (view.setFromJSONObject(obj) == true) {
            log.debug("view '" + viewname + "' updated successfully")
            updateViewDetailsList();
        }
    } else {
        log.error("view '" + viewname + "' not found")
    }
}

ViewsListObject.prototype.setViewsList = function (newViews) {
    // create new view objects from array <newViews>
    //log.debug("setViewsList()")
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
    var text = "["
    for(var i=0; i<this.views.length; i++) {
        var vname = this.views[i];
        try {
            text += this[vname].toRubyString(selection_only) + ",";
        } catch (e) {
            log.error(vname + ".toRubyString(): " + e.name)
        }
    }
    text += "]";
    return text;
}






function deselectAllViews() {
    selectAllViews(false); 
}

function selectAllViews(selected) {
    if (selected == false) {
        log.info('deselecting all views');
        document.getElementById('selectAllViews').innerHTML = "<a class=\"clickable\" onclick=\"selectAllViews()\">[select all]</a>" 
    } else {
        log.info('selecting all views');
        selected = true;
        document.getElementById('selectAllViews').innerHTML = "<a class=\"clickable\" onclick=\"deselectAllViews()\">[deselect all]</a>" 
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

function onRemoveSettings(viewname) {
    //log.debug("onRemoveSettings('" + viewname + "')");
    if (viewsList[viewname]) {
        log.info("removing all settings of view '" + viewname + "'");
        removeViewOverride(viewname, 'all');
    } else {
        log.error("view '" + viewname + "' not found in viewsList!");
    }
}

function onResetCamera(viewname) {
    //XXX
    if (viewsList[viewname]) {
        var view = viewsList[viewname];
        log.error("TEST: onResetCamera('" + viewname + "')");
    } else {
        log.error("view '" + viewname + "' not found in viewsList!");
    }
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

function disableViewOverride(viewname, opt) {
    //log.debug("disableViewOverride('" + viewname + "','" + opt + "')");
    if (viewsList[viewname]) {
        var view = viewsList[viewname];
        view._overrides[opt] = false;
        removeViewOverride(viewname, opt);
    } else {
        log.error("view '" + viewname + "' not found in viewsList!");
    }
}

function enableViewOverride(viewname, opt) {
    //log.debug("enableViewOverride('" + viewname + "','" + opt + "')");
    if (viewsList[viewname]) {
        var view = viewsList[viewname];
        view._overrides[opt] = true;
        // TODO: apply settings from text field  
        updateViewDetailsList();
        applyViewSettings(viewname);
    } else {
        log.error("view '" + viewname + "' not found in viewsList!");
    }
}

