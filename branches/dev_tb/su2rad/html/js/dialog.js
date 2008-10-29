
var map, marker, lastPoint;

function initPage() {
    // log.toggle();
    // getShadowInfo();
    initViews();
    updateExportPage();
    window.resizeTo(640,800);
    //document.getElementById("statusMsg").innerHTML = "modelLocation=" + modelLocation;
    
}

function toggleClimateTab() {
    if (document.getElementById("climate_checkbox").checked == true) {
        $('#tab-container').enableTab(5);
        document.getElementById("edit_climate").disabled=false;
        document.getElementById("climate_options").style.display='';
    }
    else {
        $('#tab-container').disableTab(5);
        document.getElementById("edit_climate").disabled=true;
        document.getElementById("climate_options").style.display='none';
    }
}




function setExportMode() {
    var val=document.getElementById("export_mode").value;
    window.status = "export mode=" + val; 
    if (val == 'by_group') {
        document.getElementById("global_coords_display").style.display='';
    }
    else {
        document.getElementById("global_coords_display").style.display='none';
    }
    return true;
}

function switch_to_tab(pos) {
    $('#tab-container').triggerTab(pos);
}

function reverseData(val) {
    var d="";
    var temp="";
    for (var x=val.length; x>0; x--) {
        d+=val.substring(x,eval(x-1));
    }
    return d;
}

function setExportPath() {
    var val=document.getElementById("fileselection").value;
    val=escape(val);
    var reversedsrc=reverseData(val);
    var nameEnd=reversedsrc.indexOf('/');
    //var name=reversedsrc.substring(nameEnd,reversedsrc.length)
    var path=reversedsrc.substring(0,nameEnd);
    // name=reverseData(name);
    // name=unescape(name);
    var name = 'skpname/current_scene.rif'
    path=reverseData(path);
    path=unescape(path);
    document.getElementById("scene_path").value = path;
    document.getElementById("scene_name").value = name;
    return name;
}

function setValue(id, val) {
    // set initial variable values
    document.getElementById(id).value=val;
}


function getViewsList() {
    log.debug("getViewsList(SKETCHUP='"+SKETCHUP+"')");
    if (SKETCHUP == true) {
        log.info("getting views from SketchUp ...");
        window.location = 'skp:getViewsList@'; 
    } else {
        log.debug("getViewsList(): 'skp:' not available");
        var msg =   "[{\"name\":\"view_1\"#COMMA#\"selected\":\"false\"#COMMA#\"current\":\"false\"}";
        msg += "#COMMA#{\"name\":\"front (1)\"#COMMA#\"selected\":\"false\"#COMMA#\"current\":\"false\"}";
        msg += "#COMMA#{\"name\":\"current view\"#COMMA#\"selected\":\"false\"#COMMA#\"current\":\"true\"}";
        msg += "#COMMA#{\"name\":\"sel_view\"#COMMA#\"selected\":\"true\"#COMMA#\"current\":\"false\"}";
        msg += "#COMMA#{\"name\":\"scene (2)\"#COMMA#\"selected\":\"true\"#COMMA#\"current\":\"false\"}";
        msg += "#COMMA#{\"name\":\"next to last\"#COMMA#\"selected\":\"false\"#COMMA#\"current\":\"false\"}";
        msg += "#COMMA#{\"name\":\"last\"#COMMA#\"selected\":\"false\"#COMMA#\"current\":\"false\"}";
        msg += "]";
        log.info("setting shadowInfo from text (" + msg.length + " bytes)");
        setViewsListJSON(msg);
    }
}

function replaceChars(text) {
    text = text.replace(/\(/g,"");
    text = text.replace(/\)/g,"");
    text = text.replace(/ /g,"_");
    text = text.replace(/</g,"");
    text = text.replace(/>/g,"");
    return text;
}

function onViewSelectionChange(viewname) {
    // callback for views checkboxes
    var id = replaceChars(viewname);
    var msg = "view '" + viewname + "'";
    var param = viewname+"&";
    if (document.getElementById(id).checked == true) {
        msg += " selected";
        param += "selected";
    } else {
        msg += " deselected";
        param += "deselected";
    }
    log.info(msg);
    if (SKETCHUP == true) {
        window.location = 'skp:setViewSelection@' + param;
    }
}

function getViewTD(view) {
    // return <td> for view line (lable and checkbox)
    var text = '<td class="column">';
    var id = replaceChars(view.name);
    text += '<input id="' + id + '"' 
    text += 'type="checkbox" onchange="onViewSelectionChange(\'' + view.name + '\')"'
    if (view.current == "true" || view.selected == "true") {
        text += ' checked'
    }
    text += '/> ' + view.name + '</td>';
    return text;
}

function setViewsListJSON(msg) {
    // eval JSON views string from SketchUp
    var json = msg.replace(/#COMMA#/g,",");
    eval("var viewsList = " + json);
    var text = '<table><tr><td class="column_lable"></td>';
    var col = 0;
    for(var i=0; i<viewsList.length; i++) {
        var view = viewsList[i];
        if(view != null) {
            // log.info("view = '" + view.name + "'");
            text += getViewTD(view);
            col += 1;
        }
        // reset column counter except for last row
        if (col == 3 && i != (viewsList.length-1)) {
            text += '</tr><tr><td class="column_lable"></td>';
            col = 0;
        }
    }
    // fill row with empty cells
    if (col != 0) {
        for(var i=0; i<(3-col); i++) {
            text += "<td></td>";
        }
    }
    text += "</tr></table>";
    document.getElementById("viewsSelection").innerHTML = text;
}


function onApplyLocation() {
    log.error("TODO: onApplyValues")
    if (SKETCHUP == true) {
        log.info("setting shadowInfo ...");
        params = 'City=' + modelLocation.City;
        params = params + ';Country=' + modelLocation.Country;
        params = params + ';Latitude=' + modelLocation.Latitude;
        params = params + ';Longitude=' + modelLocation.Longitude;
        params = params + ';TZOffset=' + modelLocation.TZOffset;
        params = params + ';NorthAngle=' + modelLocation.NorthAngle;
        setShadowInfoSketchup(params);
    }
    modelLocation.changed = false;
    updateSkyFormValues()
    log.error("after onApplyValues()")
    
}


function initViews() {
    log.debug("initViews()");
    getViewsList();
}


function onTabClick(link,div_show,div_hide) {
    log.debug("switching to tab '" + div_show.id + "'");
    if (div_show.id == "tab-export") {
        updateExportPage();
    } else if  (div_show.id == "tab-render") {
        updateRenderPage();
    } else if (div_show.id == "tab-sky") {
        updateSkyPage();
    } else if (div_show.id == "tab-fields") {
        updateFieldsPage();
    } else if (div_show.id == "tab-climate") {
        updateClimatePage();
    } else {
        log.warn("unexpected tab id '" + div_show.id + "'"); 
    }
    return true;
}

function onTabHide(link,div_show,div_hide) {
    // log.debug("onTabHide:" + link + " show:" + div_show.id + " hide:" + div_hide.id);
}

function onTabShow(link,div_show,div_hide) {
    // log.debug("onTabShow:" + link + " show:" + div_show.id + " hide:" + div_hide.id);
}

function updateExportPage() {
    log.debug("updating 'Export' page ...");
    setSkySummary();
}

function updateRenderPage() {
    log.debug("updating 'Render' page ...");
    // setRpictOptions();
    updateRpictValues();
    updateRenderLine();
}

function updateSkyPage() {
    log.debug("updateSkyPage()");
    if (checkGoogleMap() == true) {
        log.debug("  updating map ...");
        var lat = parseFloat(modelLocation.Latitude);
        var lng = parseFloat(modelLocation.Longitude); 
        try {
            var latlng = new GLatLng(lat, lng);
            map.setCenter(latlng, map.getZoom());
        } catch (e) {
            // there may not be a map yet
            if (e.name == "TypeError") {
                log.debug(e);
            } else {
                log.error(e);
            }
        }
        // googleMapInitialize(lat,lng);
    }
    // window.resizeBy(-10,0);
    updateSkyFormValues()
    // window.resizeBy(10,0);
}

function updateFieldsPage() {
    log.debug("updating 'Fields' page ...");
}

function updateClimatePage() {
    log.debug("updating 'Climate' page ...");
}


