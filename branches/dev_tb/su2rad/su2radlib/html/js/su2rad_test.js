
function test_getViewsListTest() {
    // return dummy JSON string of SketchUp views
    // TODO: create default view object and update settings
    var msg = "[{\"name\":\"view_1\",\"selected\":\"false\",\"current\":\"false\",";
    msg +=      "\"vt\":\"v\",\"vp\":\"0 0 1\",\"vd\":\"0 1 0\",\"vu\":\"0 0 1\",";
    msg +=      "\"vo\":\"0.0\",\"va\":\"0.0\",\"vv\":\"30.0\",\"vh\":\"60.0\"}";
    msg +=    ",{\"name\":\"front (1)\",\"selected\":\"false\",\"current\":\"false\",";
    msg +=      "\"vt\":\"v\",\"vp\":\"0 0 1\",\"vd\":\"0 1 0\",\"vu\":\"0 0 1\",";
    msg +=      "\"vo\":\"0.0\",\"va\":\"0.0\",\"vv\":\"30.0\",\"vh\":\"60.0\"}";
    msg +=    ",{\"name\":\"current view\",\"selected\":\"false\",\"current\":\"true\",";
    msg +=      "\"vt\":\"v\",\"vp\":\"0 0 1\",\"vd\":\"0 1 0\",\"vu\":\"0 0 1\",";
    msg +=      "\"vo\":\"0.0\",\"va\":\"0.0\",\"vv\":\"30.0\",\"vh\":\"60.0\"}";
    msg +=    ",{\"name\":\"parallel view\",\"selected\":\"true\",\"current\":\"false\",";
    msg +=      "\"vt\":\"l\",\"vp\":\"0 0   1\",\"vd\":\"  0  1  0 \",\"vu\":\"0 0 1\",";
    msg +=      "\"vo\":\"0.0\",\"va\":\"0.0\",\"vv\":\"30.0\",\"vh\":\"60.0\"}";
    msg +=    ",{\"name\":\"testview (1)\",\"selected\":\"true\",\"current\":\"false\",";
    msg +=      "\"vt\":\"a\",\"vp\":\"0 0 1  \",\"vd\":\" 0 1 0\",\"vu\":\"0 0 1\",";
    msg +=      "\"vo\":\"0.0\",\"va\":\"0.0\",\"vv\":\"30.0\",\"vh\":\"60.0\"}";
    msg +=    ",{\"name\":\"long name for view for testing (2)\",\"selected\":\"true\",\"current\":\"false\",";
    msg +=      "\"vt\":\"a\",\"vp\":\"0 0 1  \",\"vd\":\" 0 1 0\",\"vu\":\"0 0 1\",";
    msg +=      "\"vo\":\"0.0\",\"va\":\"0.0\",\"vv\":\"30.0\",\"vh\":\"60.0\"}";
    msg +=    ",{\"name\":\"another\",\"selected\":\"true\",\"current\":\"false\",";
    msg +=      "\"vt\":\"a\",\"vp\":\"0 0 1  \",\"vd\":\" 0 1 0\",\"vu\":\"0 0 1\",";
    msg +=      "\"vo\":\"0.0\",\"va\":\"0.0\",\"vv\":\"30.0\",\"vh\":\"60.0\"}";
    msg +=    ",{\"name\":\"angular (2)\",\"selected\":\"true\",\"current\":\"false\",";
    msg +=      "\"vt\":\"a\",\"vp\":\"0 0 1  \",\"vd\":\" 0 1 0\",\"vu\":\"0 0 1\",";
    msg +=      "\"vo\":\"0.0\",\"va\":\"0.0\",\"vv\":\"30.0\",\"vh\":\"60.0\"}";
    msg +=    ",{\"name\":\"next to last\",\"selected\":\"false\",\"current\":\"false\",";
    msg +=      "\"vt\":\"v\",\"vp\":\"0 0 1\",\"vd\":\"0 1 0\",\"vu\":\"0 0 1\",";
    msg +=      "\"vo\":\"0.0\",\"va\":\"0.0\",\"vv\":\"30.0\",\"vh\":\"60.0\"}";
    msg +=    ",{\"name\":\"last\",\"selected\":\"false\",\"current\":\"false\",";
    msg +=      "\"vt\":\"v\",\"vp\":\"0 0 1\",\"vd\":\"0 1 0\",\"vu\":\"0 0 1\",";
    msg +=      "\"vo\":\"0.0\",\"va\":\"0.0\",\"vv\":\"30.0\",\"vh\":\"60.0\"}]";
    return msg;
}


function test_getMaterialsLists () {
    var rad = test_getRadMaterialData();
    setMaterialsListJSON(su2rad.utils.encodeJSON(rad),'rad');
    var skm = test_getSkmMaterialData();
    setMaterialsListJSON(su2rad.utils.encodeJSON(skm),'skm');
    // TODO: Layers
}

function test_getRadMaterialData () {
    var json = "[" 
    json += "{\"name\":\"redMat\",\"nameRad\":\"redMat\",\"nameHTML\":\"redMat\",";
    json += "\"alias\":\"\",\"preview\":\"\",\"group\":\"plastic\",\"defType\":\"material\",";
    json += "\"definition\":\"void plastic redMat<br/>0<br/>0<br/>5 0.6 0.1 0.1 0 0\",";
    json += "\"required\":\"\"},";
    
    json += "{\"name\":\"blueMat\",\"nameRad\":\"blueMat\",\"nameHTML\":\"blueMat\","
    json += "\"alias\":\"\",\"preview\":\"\",\"group\":\"plastic\",\"defType\":\"material\",";
    json += "\"definition\":\"void plastic blueMat<br/>0<br/>0<br/>5 0.1 0.1 0.6 0 0\","
    json += "\"required\":\"\"},";                

    json += "{\"name\":\"green\",\"nameRad\":\"green\",\"nameHTML\":\"green\",";
    json += "\"alias\":\"\",\"preview\":\"\",\"group\":\"plastic\",\"defType\":\"material\",";
    json += "\"definition\":\"void plastic green<br/>0<br/>0<br/>5 0.13 0.48 0.02 0 0\","
    json += "\"required\":\"\"},";                
    
    json += "{\"name\":\"grass_green\",\"nameRad\":\"grass_green\",\"nameHTML\":\"grass_green\", ";
    json += "\"alias\":\"\",\"preview\":\"\",\"group\":\"plastic\",\"defType\":\"alias\", ";
    json += "\"definition\":\"void alias grass_green green\", ";
    json += "\"required\":\"green\"}, ";                
    
    json += "{\"name\":\"brick_pat\",\"nameRad\":\"brick_pat\",\"nameHTML\":\"brick_pat\",";
    json += "\"alias\":\"\",\"preview\":\"\",\"group\":\"texfunc\",\"defType\":\"pattern\",";
    json += "\"definition\":\"void texfunc brick_pat<br/>4 gran_dx gran_dy gran_dz brick.cal<br/>0<br/>0\","
    json += "\"required\":\"brick.cal\"},";                
    
    json += "{\"name\":\"brick\",\"nameRad\":\"brick\",\"nameHTML\":\"brick\",";
    json += "\"alias\":\"\",\"preview\":\"\",\"group\":\"plastic\",\"defType\":\"material\",";
    json += "\"definition\":\"brick_pat plastic brick<br/>0<br/>0<br/>5 0.4 0.25 0.1 0 0\","
    json += "\"required\":\"brick_pat\"},";                
    
    json += "{\"name\":\"grey15\",\"nameRad\":\"grey15\",\"nameHTML\":\"grey15\",";
    json += "\"alias\":\"\",\"preview\":\"\",\"group\":\"plastic\",\"defType\":\"material\",";
    json += "\"definition\":\"void plastic grey15<br/>0<br/>0<br/>5 0.15 0.15 0.15 0 0\","
    json += "\"required\":\"\"},";                
    
    json += "{\"name\":\"grey40\",\"nameRad\":\"grey40\",\"nameHTML\":\"grey40\",";
    json += "\"alias\":\"\",\"preview\":\"\",\"group\":\"plastic\",\"defType\":\"material\",";
    json += "\"definition\":\"void plastic grey40<br/>0<br/>0<br/>5 0.4 0.4 0.4 0 0\","
    json += "\"required\":\"\"},";                
    
    json += "{\"name\":\"concrete\",\"nameRad\":\"concrete\",\"nameHTML\":\"concrete\",";
    json += "\"alias\":\"\",\"preview\":\"\",\"group\":\"plastic\",\"defType\":\"alias\",";
    json += "\"definition\":\"void alias concrete grey40\","
    json += "\"required\":\"grey40\"},";                
    
    json += "{\"name\":\"asphalt_dark\",\"nameRad\":\"asphalt_dark\",\"nameHTML\":\"asphalt_dark\",";
    json += "\"alias\":\"\",\"preview\":\"\",\"group\":\"plastic\",\"defType\":\"alias\",";
    json += "\"definition\":\"void alias asphalt_dark grey15\","
    json += "\"required\":\"grey15\"},";                
    
    json += "{\"name\":\"gran_tex\",\"nameRad\":\"gran_tex\",\"nameHTML\":\"gran_tex\",";
    json += "\"alias\":\"\",\"preview\":\"\",\"group\":\"pattern\",\"defType\":\"texfunc\",";
    json += "\"definition\":\"void texfunc gran_tex<br/>4 gran_dx gran_dy gran_dz plink.cal<br/>0<br/>0\","
    json += "\"required\":\"plink.cal\"},";                
    
    json += "{\"name\":\"granular_glass\",\"nameRad\":\"granular_glass\",\"nameHTML\":\"granular_glass\",";
    json += "\"alias\":\"\",\"preview\":\"\",\"group\":\"glass\",\"defType\":\"material\",";
    json += "\"definition\":\"gran_tex glass granular_glass<br/>0<br/>0<br/>3 0.982293 1.0 0.097719\","
    json += "\"required\":\"gran_tex\"}]";                
    return json
}

function test_getSkmMaterialData () {
    var json = "[{\"name\":\"red\",\"nameRad\":\"red\",\"nameHTML\":\"red\",\"alias\":\"redMat\",\"group\":\"undef\"},";
    json += "{\"name\":\"blue\",\"nameRad\":\"blue\",\"nameHTML\":\"blue\",\"alias\":\"blueMat\",\"group\":\"undef\"},";
    json += "{\"name\":\"green\",\"nameRad\":\"green\",\"nameHTML\":\"green\",\"alias\":\"\",\"group\":\"undef\"},";
    json += "{\"name\":\"brick\",\"nameRad\":\"brick\",\"nameHTML\":\"brick\",\"alias\":\"\",\"group\":\"undef\"},";
    json += "{\"name\":\"concrete\",\"nameRad\":\"concrete\",\"nameHTML\":\"concrete\",\"alias\":\"\",\"group\":\"undef\"},";
    json += "{\"name\":\"asphalt dark\",\"nameRad\":\"asphalt_dark\",\"nameHTML\":\"asphalt dark\",\"alias\":\"\",\"group\":\"undef\"},";
    json += "{\"name\":\"grass_green\",\"nameRad\":\"grass_green\",\"nameHTML\":\"grass_green\",\"alias\":\"\",\"group\":\"undef\"},";
    json += "{\"name\":\"grass_brown\",\"nameRad\":\"grass_brown\",\"nameHTML\":\"grass_brown\",\"alias\":\"\",\"group\":\"undef\"},";
    json += "{\"name\":\"brick 2\",\"nameRad\":\"brick_2\",\"nameHTML\":\"brick 2\",\"alias\":\"\",\"group\":\"undef\"},";
    json += "{\"name\":\"walls white\",\"nameRad\":\"walls_white\",\"nameHTML\":\"walls white\",\"alias\":\"\",\"group\":\"undef\"}]";
    return json;
}

function test_getSkySettings() {
    // return dummy JSON string of SketchUp.shadow_info
    var json = "[{\"name\":\"City\",\"value\":\"Boulder (CO)\"}";
    json +=    ",{\"name\":\"Country\",\"value\":\"USA\"}";
    json +=    ",{\"name\":\"Latitude\",\"value\":\"40.017\"}";
    json +=    ",{\"name\":\"Longitude\",\"value\":\"-105.283\"}";
    json +=    ",{\"name\":\"TZOffset\",\"value\":\"-7.0\"}";
    json +=    ",{\"name\":\"NorthAngle\",\"value\":\"0.0\"}";
    json +=    ",{\"name\":\"DaylightSavings\",\"value\":\"false\"}";
    json +=    ",{\"name\":\"DisplayShadows\",\"value\":\"false\"}";
    json +=    ",{\"name\":\"ShadowTime\",\"value\":\"Fri Nov 08 13:30:00 +0000 2002\"}";
    json +=    ",{\"name\":\"ShadowTime_time_t\",\"value\":\"1036762200\"}";
    json +=    ",{\"name\":\"UseSunForAllShading\",\"value\":\"false\"}";
    json +=    ",{\"name\":\"SkyCommand\",\"value\":\"!gensky -u 03 21 12:34 -a 40.017 -o 105.283 -m 105.0 -g 0.22 -t 1.8 -B 55.877\"}]";
    return json;
}

function test_getExportOptions() {
    var json = "[{\"name\":\"sceneName\",\"value\":\"testscene_1\"}";
    json +=    ",{\"name\":\"scenePath\",\"value\":\"/home/user/tmp/testfile\"}";
    json +=    ",{\"name\":\"exportMode\",\"value\":\"by color\"}";
    json +=    ",{\"name\":\"triangulate\",\"value\":\"false\"}";
    json +=    ",{\"name\":\"textures\",\"value\":\"true\"}";
    json +=    ",{\"name\":\"global_coords\",\"value\":\"false\"},]";
    return json;
}



