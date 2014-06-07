
var tooltips = {}

tooltips.gensky = {}
tooltips.gensky.g = "average ground reflectance";
tooltips.gensky.t = "turbidity factor (1=clear atmosphere)";
tooltips.gensky.b = "zenith brightness (in watts/steradian/meter2)";
tooltips.gensky.B = "horizontal diffuse irradiance (in watts/meter2)";
tooltips.gensky.r = "direct solar radiance (in watts/steradian/meter2)";
tooltips.gensky.R = "horizontal direct irradiance (in watts/meter2)";


tooltips.rpict = {}
tooltips.rpict.vt = "view type"
tooltips.rpict.vp = "view point"
tooltips.rpict.vd = "view direction vector"
tooltips.rpict.vu = "view up vector"
tooltips.rpict.vv = "vertical view dimension"
tooltips.rpict.vh = "horizontal view dimension"
tooltips.rpict.vo = "distance to front clipping plane"
tooltips.rpict.va = "distance to back clipping plane"

tooltips.rpict.aa = "ambient accuaracy"
tooltips.rpict.ab = "ambient bounces"
tooltips.rpict.ad = "ambient divisions"
tooltips.rpict.ar = "ambient resolution density"
tooltips.rpict.as = "ambient super-samples"

tooltips.rpict.av = "ambient value"
tooltips.rpict.aw = "relative weight of ambient value"

tooltips.rpict.dc = "direct certainty"
tooltips.rpict.dj = "direct jittering"
tooltips.rpict.dp = "secondary source presampling density "
tooltips.rpict.dr = "secondary source relays"
tooltips.rpict.ds = "direct sampling ratio"
tooltips.rpict.dt = "direct threshold"
tooltips.rpict.dv = "light source visibility"

tooltips.rpict.lr = "maximum reflections limit"
tooltips.rpict.lw = "ray weight minimum"

tooltips.rpict.pa = "pixel aspect ratio"
tooltips.rpict.pd = "pixel depth-of-field aperture size"
tooltips.rpict.pj = "pixel sample jitter"
tooltips.rpict.ps = "pixel sample spacing"
tooltips.rpict.pt = "pixel sample tolerance"
tooltips.rpict.pm = "pixel motion blur"

tooltips.rpict.sj = "specular sampling jitter"
tooltips.rpict.st = "specular sampling threshold"

tooltips.rpict.bv = "backface visibility"
tooltips.rpict.dv = "light source visibility"
tooltips.rpict.u  = "uncorrelated random sampling"
tooltips.rpict.w  = "suppress warning messages"


function getToolTip(app, opt) {
    var text = "";
    if (false && PLATFORM == "Windows") {
        return text;
    } else {
        var s = tooltips[app][opt];
        if (s) {
            text += "<span class=\"tooltip\">" + htmlEncode(s) + "</span>";
        } else {
            log.warn("no tooltip defined for app '" + app + "', option '" + opt + "'");
            setToolTip(app, opt, "TODO: tooltip for app '" + app + "', option '" + opt + "'")
            text += "<span class=\"tooltip\">TODO: tooltip for option '" + opt + "'</span>";
        }
        return text
    }
}
 
 
function setToolTip(app, opt, s) {
    if (!tooltips[app]) {
        tooltips[app] = {}
    }
    tooltips[app][opt] = s;
}


function htmlEncode(s) {
    return s.replace(/&(?!\w+([;\s]|$))/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}


