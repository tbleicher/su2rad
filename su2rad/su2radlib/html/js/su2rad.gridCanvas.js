/*

Copyright (c) 2008 Thomas Bleicher

exception:

| cell coloring code is copied from the jquery plugin 'heatcolor'         
| (www.jnathanson.com/blog/client/jquery/heatcolor/index.cfm) and is    
| Copyright (c) 2007 Josh Nathanson                                     
                                                                      
Redistribution and use in source and binary forms, with or without    
modification, are permitted provided that the following conditions    
are met:                                                              
                                                                      
o Redistributions of source code must retain the above copyright      
  notice, this list of conditions and the following disclaimer.       
o Redistributions in binary form must reproduce the above copyright   
  notice, this list of conditions and the following disclaimer in the 
  documentation and/or other materials provided with the distribution.
                                                                      
THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS   
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT     
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR 
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT  
OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, 
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT      
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, 
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY 
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT   
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.  

*/

function sortPointsByX (a,b) {
    if (a.x < b.x) {
        return -1;
    }
    if (a.x > b.x) {
        return 1;
    }
    return 0;
}

function sortPointsByY (a,b) {
    if (a.y < b.y) {
        return -1;
    }
    if (a.y > b.y) {
        return 1;
    }
    return 0;
}

function sortByFloatValue (a,b) {
    return parseFloat(a)-parseFloat(b);
}

function UniqueArray () {
    this.values = []
    this.length = 0;
}

UniqueArray.prototype.getValues = function() {
    return this.values;
}

UniqueArray.prototype.push = function(v) {
    if (this[v] == null) {
        this[v] = v;
        this.values.push(v);
        this.length = this.values.length;
    }
}

UniqueArray.prototype.sort = function(sortFunc) {
    this.values.sort(sortFunc);
}


function GridPoint(x,y,z,v) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.v = v;
}

GridPoint.prototype.toString = function () {
    var text = "[x=" + this.x.toFixed(2) + " y=" + this.y.toFixed(2);
    text += " v=" + this.v.toFixed(2) + "]";
    return text;
}



function DataRecord(line) {
    this.fields = line.split(',')
}

DataRecord.prototype.evaluate = function () {
    try {
        this.month = parseInt(this.fields[1])
        this.day = parseInt(this.fields[2])
        this.hour = parseInt(this.fields[3])
        this.minute = parseInt(this.fields[4])
        this.global_horizontal  = parseFloat(this.fields[13]) // Wh/m^2
        this.direct_normal      = parseFloat(this.fields[14]) // Wh/m^2
        this.diffuse_horizontal = parseFloat(this.fields[15]) // Wh/m^2
        this.global_hor_ill     = parseFloat(this.fields[16]) // lux
        this.direct_normal_ill  = parseFloat(this.fields[17]) // lux
        this.diffuse_hor_ill    = parseFloat(this.fields[18]) // lux 
        this.x = this.getJulianDay();
        this.y = this.hour
        this.z = 0
        this.valuesByIndex = []
        return this._checkValues()
    } catch(e) {
        log.error("Error evaluating data record:<br/>" + this.fields.join("'")) 
        logError(e)
        return false
    }
}

DataRecord.prototype._checkValues = function () {
    var values = [this.global_horizontal, this.direct_normal, this.diffuse_horizontal, this.global_hor_ill, this.direct_normal_ill, this.diffuse_hor_ill]    
    for (var i=0; i<values.length; i+=1) {
        if (isNaN(values[i]) ) {
            return false
            this.valuesByIndex.push(0)
        } else {
            this.valuesByIndex.push(values[i])
        }
    }
    this.v = this.valuesByIndex[0]
    this.value = this.valuesByIndex[0]
    if ( isNaN(this.x) || isNaN(this.y) ) {
        return false
    }
    return true
} 

DataRecord.prototype.getDataByIndex = function (idx) {
    this.v = this.valuesByIndex[idx]
    this.value = this.valuesByIndex[idx]
    return this.valuesByIndex[idx]
}

DataRecord.prototype.getJulianDay = function () {
    var ndays = [0,31,59,90,120,151,181,212,243,273,304,334,365];
    if ( this.leapyear == true  && this.month > 2) {
        return ndays[this.month-1] + this.day + 1
    } else {
        return ndays[this.month-1] + this.day
    }
}

DataRecord.prototype.toString = function () {
    return "M=" + this.month + " D=" + this.day + " H=" + this.hour + " v=" + this.v.toFixed(2)
}



function ColorGradient() {
    this.colorStyle = 'roygbiv';
    this.lightness = 0.4;
    this.maxValue = 1.0;
    this.minValue = 0.0;
}

ColorGradient.prototype.getColorByValue = function (value, lightness) {
    if (value < this.minValue) {
        value = this.minValue;
    } else if (value > this.maxValue) {
        value = this.maxValue;
    }
    // value between 1 and 0
    var position = (value - this.minValue) / (this.maxValue - this.minValue); 
    // this adds 0.5 at the top to get red, and limits the bottom at x= 1.7 to get purple
    var shft = this.colorStyle == 'roygbiv'
            ? 0.5*position + 1.7*(1-position)
            : position + 0.2 + 5.5*(1-position);
    // scale will be multiplied by the cos(x) + 1 
    // (value from 0 to 2) so it comes up to a max of 255
    var scale = 128;
    // period is 2Pi
    var period = 2*Math.PI;
    // x is place along x axis of cosine wave
    var x = shft + position * period;
    var r = this.process( Math.floor((Math.cos(x)           + 1) * scale), lightness );
    var g = this.process( Math.floor((Math.cos(x+Math.PI/2) + 1) * scale), lightness );
    var b = this.process( Math.floor((Math.cos(x+Math.PI)   + 1) * scale), lightness );
    return '#' + r + g + b;
}

ColorGradient.prototype.process = function (num, lightness) {
        if (lightness ==  null) {
            lightness = this.lightness;
        }
        // adjust lightness
        var n = Math.floor( num + lightness * (256 - num));
        // turn to hex
        var s = n.toString(16);
        // if no first char, prepend 0
        s = s.length == 1 ? '0' + s : s;
        return s;		
}

ColorGradient.prototype.setLightness = function (v) {
    this.lightness = v;
}

ColorGradient.prototype.setMaxValue = function (v) {
    this.maxValue = v;
}

ColorGradient.prototype.setMinValue = function (v) {
    this.minValue = v;
}



function GridArray() {
    this.init()
}

GridArray.prototype.init = function () {
    this.bbox = null;
    this.cols = new UniqueArray();
    this.gridByY = {};
    this.rows = [];
    this.stats = {};
    this.triangles = []
    this.units = "unit"
    this.values = [];
    this.vertices = [];
    this.commentLines = [];
    this._contourCache = {};
}

GridArray.prototype.addPoint = function (p) {
    if (p.length == 4) {
        var value = p[3];
    } else if (p.length == 7) {
        var value = p[6];
    } else if (p.length == 0) {
        return;
    } else {
        log.error("unknown format: '[" + p.join("][") + "]'");
        return;
    }
    var x = p[0];
    var y = p[1];
    this.addMinMax(x, y, value)
    this.cols.push(x);
    if (this.gridByY[y] == null) {
        this.gridByY[y] = [];
        this.rows.push(y);
    }
    this.gridByY[y].push( new GridPoint(x,y,p[2],value) );
    this.values.push(value)
    this.vertices.push( new DelaunayVertex(x,y,value) );
}

GridArray.prototype.addMinMax = function (x,y,v) {
    if (this.bbox == null) {
        this.bbox = [x,x,y,y,v,v]
    } else {
        if ( x < this.bbox[0] ) { this.bbox[0] = x };
        if ( x > this.bbox[1] ) { this.bbox[1] = x };
        if ( y < this.bbox[2] ) { this.bbox[2] = y };
        if ( y > this.bbox[3] ) { this.bbox[3] = y };
        if ( v < this.bbox[4] ) { this.bbox[4] = v };
        if ( v > this.bbox[5] ) { this.bbox[5] = v };
    }
}


GridArray.prototype.addRecord = function (p) {
    this.addMinMax(p.x, p.y, p.value)
    this.cols.push(p.x);
    if (this.gridByY[p.y] == null) {
        this.gridByY[p.y] = [];
        this.rows.push(p.y);
    }
    this.gridByY[p.y].push( p );
    this.values.push(p.value)
}

GridArray.prototype.analyzeGrid = function () {
    this.triangles = DelaunayTriangulate( this.vertices );
    log.debug("triangles.length=" + this.triangles.length)
    this.calcStats();
    this.fillRows();
    this.sortArray();
}

GridArray.prototype.setDataTypeIndex = function (idx) {
    this.values = [];
    for (var i=0; i<this.rows.length; i+=1) {
        var y = this.rows[i];
        var row = this.gridByY[y];
        for (j=0; j<row.length; j+=1) {
            var p = row[j]
            this.values.push(p.getDataByIndex(idx))
        }
    }
    if (idx < 3) {
        this.units = "kWh/m^2"
    } else {
        this.units = "lux"
    }
    
    this.values.sort(sortByFloatValue);
    this.bbox[4] = this.values[0]
    this.bbox[5] = this.values[this.values.length-1]
    log.debug("new value range: " + this.bbox[4].toFixed(2) + " - " + this.bbox[5].toFixed(2))
    this.calcStats();
}

GridArray.prototype.calcStats = function () {
    this.stats.minValue = this.bbox[4]
    this.stats.maxValue = this.bbox[5]
    this.stats.values = this.values.length
    if (this.values.length > 0 ) {
        var sum = 0;
        for (i=0; i<this.values.length; i++) {
            sum += this.values[i];
        }
        this.stats.average = sum / this.values.length
        this.stats.uniform = this.stats.minValue / this.stats.average
        this.stats.median  = this.values[parseInt(this.values.length/2)]
    } else {
        this.stats.average = 0
        this.stats.uniform = 0
        this.stats.median  = 0
    }
}

GridArray.prototype.getStatsAsText = function () {
    var lines = new Array();
    var stats = this.getStats();
    var keys = ['average', 'minValue', 'maxValue', 'values', 'median'];
    for (i=0; i<keys.length; i++) {
        var k = keys[i];
        var v = stats[keys[i]];
        if ( keys[i] == "values" ) {
            v = v.toFixed()
        } else {
            v = v.toFixed(2)
        }
        lines.push( k + " " + v );
    }
    return lines
}

GridArray.prototype.empty = function () {
    if (this.bbox == null) {
        return true;
    } else {
        return false;
    }
}

GridArray.prototype.fillRows = function () {
    // fill gaps in rows with points of value -1
    this.cols.sort(sortByFloatValue);
    this.rows.sort(sortByFloatValue);
    for (var i=0; i<this.rows.length; i++) {
        //row = this[this.rows[i]]
        row = this.gridByY[this.rows[i]]
        row.sort(sortPointsByX);
        if (row.length != this.cols.length) {
            var x_coords = this.cols.getValues();
            // create new row with -1 value points
            var newRow = [];
            var y = this.rows[i];
            var z = 0.75;
            for (var j=0; j<x_coords.length; j++) {
                var p = new GridPoint(x_coords[j], y, z, -1);
                newRow.push(p);
            }
            // move points that exist in row to newRew
            for (var j=0; j<newRow.length; j++) {
                for (var u=0; u<row.length; u++) {
                    if (row[u].x == newRow[j].x) {
                        newRow[j] = row[u];
                        break;
                    }
                }
            }
            newRow.sort(sortPointsByX);
            //this[this.rows[i]] = newRow;
            this.gridByY[this.rows[i]] = newRow;
        }
    }
}

GridArray.prototype.generate = function () {
    // create values to display by formula
    var minX =          Math.floor(Math.random()*11) * 0.25
    var maxX = minX*2 + Math.floor(Math.random()*44) * 0.25
    var minY =          Math.floor(Math.random()*11) * 0.25
    var maxY = minY*2 + Math.floor(Math.random()*44) * 0.25
    var mag  = Math.pow(Math.random()*10, 3)
    var dz   = Math.random()
    var grid = new Array();
    for (var x=minX; x<maxX; x+=0.25) {
        for (var y=minY; y<maxY; y+=0.25) {
            z = mag * ( dz + 0.2 * ( 1+Math.sin(x*2) ) / ( 1.3+Math.cos(y+1) ) )
            grid.push( [x,y,0.75,0,0,1,z] );
        }
    }
    // now read in like file based grid
    this.readArray(grid);
    //this.printStats();
}

GridArray.prototype.getArrayIndex = function (a,v) {
    for (var i=0; i<a.length; i++) {
        if (a[i] == v) {
            return i;
        }
    }
    return -1;
}

GridArray.prototype.getCommentLines = function () {
    return this.commentLines;
}

GridArray.prototype.getContourLinesAt = function (level) {
    // return array of contour line segments 
    
    // log.debug("getContourLinesAt(level=" + level.toFixed(2) + ")") 
    // check cache first
    if (this._contourCache[level] != null) {
        return this._contourCache[level]
    }
    
    var lines = []
    // some checks to avoid useless loops later
    if (this.empty() || this.rows.length < 3) {
        log.warn("not enough rows for contour line calculation")
        return lines;
    }
    
    // start loop over rows
    for (var i=0; i<this.rows.length-1; i++) {
        var row1 = this.getRowAt(this.rows[i]);
        var row2 = this.getRowAt(this.rows[i+1]);
        for (var ix=0; ix<row1.length-1; ix++) {
            var points = [];
            var ll = row2[ix];
            var lr = row2[ix+1];
            var ur = row1[ix+1];
            var ul = row1[ix];
            if (ll.v == -1 || lr.v == -1 || ur.v == -1 || ul.v == -1) {
                continue
            }
            
            // skip tiles where on corner was 'filled in'
            var values = [ll.v, lr.v, ur.v, ul.v]
            values.sort();
            if (values[0] == -1 || values[0] > level || values[-1] < level) {
                continue;
            }
            
            // case contour line goes through point
            if (ll.v == level) { points.push([ll.x,ll.y]) };
            if (lr.v == level) { points.push([lr.x,ll.y]) };
            if (ur.v == level) { points.push([ur.x,ur.y]) };
            if (ul.v == level) { points.push([ul.x,ul.y]) };
            
            var edges = [[ll,lr],[lr,ur],[ur,ul],[ul,ll]];
            for (var e=0; e<edges.length; e++) {
                var p1 = edges[e][0]
                var p2 = edges[e][1]
                if (p1.v > level && p2.v < level) {
                    var DV = p1.v-p2.v
                } else if (p1.v < level && p2.v > level) {
                    var DV = p1.v-p2.v
                } else {
                    continue
                }
                var DX = p2.x-p1.x
                var DY = p2.y-p1.y
                var dx = DX*(p1.v-level) / DV
                var dy = DY*(p1.v-level) / DV
                points.push( [p1.x+dx,p1.y+dy] );
            }
            
            // append line segment to array
            if (points.length == 2) {
                lines.push( [points[0], points[1]] )
            }
            
        } // end ix loop (points in rows)
    
    } // end i loop (rows)
    
    // add lines to cache and return array
    this._contourCache[level] = lines;
    return lines;
}

GridArray.prototype.getRows = function () {
    return this.rows
}

GridArray.prototype.getRowAt = function (yPosition) {
    try {
        var row = this.gridByY[yPosition];
        return row;
    } catch (e) {
        logError(e)
        return null;
    }
} 

GridArray.prototype.getStats = function () {
    return this.stats
}

GridArray.prototype.sortArray = function () {
    this.rows.sort(sortByFloatValue);
    this.rows.reverse();
    for (var i=0; i<this.rows.length; i++) {
        //this[this.rows[i]].sort(sortPointsByX);
        this.gridByY[this.rows[i]].sort(sortPointsByX);
        //this.gridByY[this.rows[i]].reverse();
    }
}

GridArray.prototype.parseText = function (text) {
    var re_cr = /\r/g
    var re_sp = /\s+/
    text = text.replace(re_cr, '');
    var lines = text.split("\n")
    for (i=0; i<lines.length; i++) {
        try {
            var line = lines[i];
            var idx = line.indexOf('#');
            if (idx == 0) {
                this.commentLines.push(line);
            } else if (idx > 0) {
                line = line.slice(0, idx);
            }
            var values = [];
            var rawparts = line.split(re_sp);
            for (var j=0; j<rawparts.length; j++) {
                var v = parseFloat(rawparts[j]);
                if ( ! isNaN(v) ) {
                    values.push(v);
                }
            }
            this.addPoint(values); 
        } catch (e) {
            logError(e)
        }
    }
    // finally create stats etc.
    this.analyzeGrid()
}

GridArray.prototype.printStats = function () {
    var text = "";
    text += "minValue= " + this.bbox[4].toFixed(2) + "<br/>";
    text += "maxValue= " + this.bbox[5].toFixed(2) + "<br/>";
    text += "rows= " + this.rows.length + "<br/>";
    text += "rows[0]= " + this.rows[0] + "<br/>";
    text += "rows[-1]= " + this.rows[this.rows.length-1];
    log.debug(text);
}

GridArray.prototype.readArray = function (gridarray) {
    this.init()
    for (var i=0; i<gridarray.length; i++) {
        this.addPoint(gridarray[i]);
    }
    this.analyzeGrid()
}

GridArray.prototype.getTable = function (tableid) {
    var text = "<table class=\"datagrid\" id=\"" + tableid + "\"><thead><tr><th></th>";
    if (this.rows.length == 0 || this.gridByY[this.rows[0]].length == 0) {  
        text += "</tr></thead><tbody></tbody><tr><td>no data</td></tr></table>";
        return text;
    }
    var cols = this.cols.getValues();
    for (var i=0; i<cols.length; i++) {
        //text += "<th>" + cols[i].toFixed(2) + "</th>";
        text += "<th>.</th>";
    }
    text += "</tr></thead><tbody>";
    for (var i=0; i<this.rows.length; i++) {
        points = this.getRowAt(this.rows[i]);
        if ( points != null ) {
            text += "<tr>";
            for (var j=0; j<points.length; j++) {
                if (j == 0) {
                    //text += "<th>" + this.rows[i] + "</th>";
                    text += "<th>.</th>";
                }
                if (points[j].v == -1) {
                    text += "<td></td>";
                } else {
                    var color = this.getColorByValue(points[j].v);
                    //text += "<td style=\"background-color: " +  color + "\">" + points[j].toString() + "</td>";
                    //text += "<td style=\"background-color: " +  color + "\">" + points[j].v.toFixed(2) + "</td>";
                    text += "<td title=\"" + points[j].v.toFixed(2) + "\" style=\"background-color: " +  color + "\">.</td>";
                }
            }
            text += "</tr>";
        }
    }
    text += "</tbody></table>";
    return text;
}



function GridCanvas() {
    this.array = null;
    this.canvas = null;
    this.canvasscale = 1;   // will be changed in setScale()
    this.gridstep = 0.0;   // TODO: evaluate grid data
    this.legend = false;
    this.legendSteps = 10
    this.lightness = 0.4;
    this.legendLabel = '';

    this.bgcolor = '#ffffff'
    this.fgcolor = '#333333'
    
    this.fontNormal = "12px 'arial'";
    this.fontSuperscript = "8px 'arial'";
    
    this.gradient = new ColorGradient()
    this.gradient.setLightness(this.lightness)
    
    this.ruler = {};
    this.ruler.left = 15;
    this.ruler.right = 40;
    this.ruler.bottom = 15;      
    this.ruler.top = 0;      
    
    this.margin = {};
    this.margin.left = 2;
    this.margin.right = 2;
    this.margin.bottom = 2;      
    this.margin.top = 7;
    
    this.margin.left = 5;
    this.margin.right = 5;
    this.margin.bottom = 5;      
    this.margin.top = 5;

    this.padding = 15;
}

GridCanvas.prototype.draw = function () {
    // nothing to draw?
    if (this.canvas == null || this.array == null || this.array.empty() == true) {
        return;
    }
    // get canvas context
    var ctx = this.canvas.getContext('2d');
    if (ctx) {
        ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
        if (this.bgcolor != "#ffffff") {
            ctx.fillStyle = this.bgcolor;
            ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
        }
        this.setRulerWidth(ctx) // adjust width of left ruler
        this.setScale()         // work out scale based on available graph area
        //this.drawOutlines(ctx)
        this.drawGrid(ctx)  
        this.drawRulers(ctx)
        if (this.legend == true) {
            this.drawLegend(ctx)
        }
    }
}

GridCanvas.prototype.getFrameCoords = function (position) {
    if (position == "left") {
        var x = this.margin.left
        var y = this.margin.top
        if (this.ruler.top != 0) {  y = y + this.ruler.top  + this.padding }
        var w = this.ruler.left
        var h = this.canvas.height - (y + this.margin.bottom)
        if (this.ruler.bottom != 0) { h = h - (this.ruler.bottom + this.padding) }
        
    } else if (position == "right") {
        var x = this.canvas.width - this.margin.right - this.ruler.right
        var y = this.margin.top
        if (this.ruler.top != 0) {  y = y + this.ruler.top  + this.padding }
        var w = this.ruler.right
        var h = this.canvas.height - (y + this.margin.bottom)
        if (this.ruler.bottom != 0) { h = h - (this.ruler.bottom + this.padding) }
    
    } else if (position == "top") {
        var x = this.margin.left
        var y = this.margin.top
        var w = this.canvas.width - this.margin.left - this.margin.right
        var h = this.ruler.top
    
    } else if (position == "bottom") {
        var x = this.margin.left
        var y = this.canvas.height - this.margin.bottom - this.ruler.bottom
        var w = this.canvas.width - this.margin.left - this.margin.right
        var h = this.ruler.bottom
    
    } else {
        // center
        var x = this.margin.left
        if (this.ruler.left != 0) { x = x + this.ruler.left + this.padding }
        
        var y = this.margin.top
        if (this.ruler.top != 0) {  y = y + this.ruler.top  + this.padding }
        
        var w = this.canvas.width - (x+this.margin.right)
        if (this.ruler.right != 0) { w = w - (this.ruler.right+this.padding) }
        
        var h = this.canvas.height - (y+this.margin.bottom)
        if (this.ruler.bottom != 0) { h = h - (this.ruler.bottom+this.padding) }
    }
    return [x,y,w,h]
}

GridCanvas.prototype.drawOutlines = function (ctx) {
    ctx.save()
    ctx.strokeStyle = "#FF00FF"
    ctx.lineWidth = 1;
    ctx.strokeRect(0,0,this.canvas.width, this.canvas.height);
    var frames = ["left", "right", "top", "bottom"];
    for (var i=0; i<frames.length; i+=1) {
        var side = frames[i];
        if (this.ruler[side] != 0) {
            var f = this.getFrameCoords(side);
            //log.debug("drawOutline() pos=" + side + " x=" + f[0] + " y=" + f[1] + " w=" + f[2] + " h=" + f[3])
            ctx.strokeRect(f[0],f[1],f[2],f[3]);
        }
    }
    var center = this.getFrameCoords("center");
    //log.debug("drawOutline() pos=center" + " x=" + center[0] + " y=" + center[1] + "w=" + center[2] + " h=" + center[3])
    ctx.strokeRect(center[0],center[1],center[2],center[3]);
    ctx.restore()
}

GridCanvas.prototype.drawContourLines = function (ctx) {
    var dValue = (this.gradient.maxValue - this.gradient.minValue) / this.legendSteps
    ctx.save()
    ctx.lineWidth = 2/this.canvasscale;
    ctx.strokeStyle = this.fgcolor
    for (var n=1; n<=Math.floor(this.gradient.maxValue/dValue); n++) {
        try {
            var lines = this.array.getContourLinesAt(n*dValue);
        } catch(e) {
            logError(e)
            continue
        }
        if (lines.length > 0) {
            var color = this.gradient.getColorByValue(n*dValue, 0.0);
            ctx.strokeStyle = color;
            ctx.beginPath()
            for (var i=0; i<lines.length; i++) {
                ctx.moveTo(lines[i][0][0], lines[i][0][1]);
                ctx.lineTo(lines[i][1][0], lines[i][1][1]);
            }
            ctx.stroke()
        }
    }
    ctx.restore()
}

GridCanvas.prototype.drawGrid = function (ctx) {
    if ( this.array.bbox == null ) {
        return
    }

    ctx.save()
    this.setOrigin(ctx)
    ctx.scale(this.canvasscale, -1*this.canvasscale);               // scale to size and mirror y (up=positive)
    ctx.translate(this.gridstep/2,this.gridstep/2)                  // translate by half a tile
    ctx.translate(-1*this.array.bbox[0],-1*this.array.bbox[2]);     // set origin to match first tile at lower left
                                                                    // of graph area
    ctx.lineWidth = 1.0/this.canvasscale;
    ctx.strokeStyle = '#000000' // this.fgcolor
    var triangles = this.array.triangles;
    for (var i=0; i<triangles.length; i++) {
        var t = triangles[i];
        var color = this.gradient.getColorByValue(t.z);
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.beginPath()
        ctx.moveTo(t.v0.x, t.v0.y);
        ctx.lineTo(t.v1.x, t.v1.y);
        ctx.lineTo(t.v2.x, t.v2.y);
        ctx.fill()
        ctx.stroke()
        ctx.closePath();
    }
    
    this.drawContourLines(ctx)
    ctx.restore()
}

GridCanvas.prototype.drawGrid_OLD = function (ctx) {
    if ( this.array.bbox == null ) {
        return
    }

    ctx.save()
    this.setOrigin(ctx)
    ctx.scale(this.canvasscale, -1*this.canvasscale);               // scale to size and mirror y (up=positive)
    ctx.translate(this.gridstep/2,this.gridstep/2)                  // translate by half a tile
    ctx.translate(-1*this.array.bbox[0],-1*this.array.bbox[2]);     // set origin to match first tile at lower left
                                                                    // of graph area
    ctx.lineWidth=1.0/this.canvasscale;                             // set line width according to scale
    
    var gs = this.gridstep;
    var gs2 = this.gridstep/2
    var rows = this.array.getRows()
    for (var i=0; i<rows.length; i++) {
        var row = this.array.getRowAt(rows[i]);
        if ( row != null ) {
            for (var j=0; j<row.length; j++) {
                var point = row[j]
                if (point.v != -1) {
                    var color = this.gradient.getColorByValue(point.v);
                    //ctx.fillStyle = color;
                    //ctx.fillRect(point.x-gs2, point.y-gs2, gs, gs);
                }
            }
        }
    }
    this.drawTriangles(ctx)
    this.drawContourLines(ctx)
    ctx.restore()
}

GridCanvas.prototype.drawTriangles = function (ctx) {
}

GridCanvas.prototype.drawLegend = function (ctx) {
    var frame = this.getFrameCoords("right");
    var dValue = (this.gradient.maxValue - this.gradient.minValue) / this.legendSteps
    var xmax = (this.array.bbox[1]-this.array.bbox[0] + this.gridstep) * this.canvasscale
    var ymax = (this.array.bbox[3]-this.array.bbox[2] + this.gridstep) * this.canvasscale
    var x = frame[0]
    var y = frame[1]+frame[3]
    var w = frame[2]
    var h = frame[3]
    var graphH = this.getGraphHeight()
    if (h > graphH) {
        // reduce height of legend but keep it readable
        var minHeight = this.legendSteps * 20
        if (graphH < this.legendSteps*20) {
            h = this.legendSteps*20
        } else {
            h = graphH
        }   
    } 
    var dH = h/this.legendSteps
    
    // start at bottom (y=0)
    ctx.save()
    ctx.lineWidth = 2;
    for (var i=0; i<this.legendSteps; i++) {
        y -= dH;    // y values decrease to go up
        var value = (i+0.5) * dValue + this.gradient.minValue
        var color = this.gradient.getColorByValue(value);
        ctx.fillStyle = color;
        ctx.fillRect(x,y,w,dH);
        var ltext = this.getLegendText(dValue*(i+1) + this.gradient.minValue);
        ctx.fillStyle = this.fgcolor;
        this.labelText(ctx,ltext,"right",x+5,y+14,w-10,12);
        // draw dark line at <value> level
        if (this.gradient.lightness >= 0.2) {
            var lineValue = (i+1) * dValue + this.gradient.minValue
            var color = this.gradient.getColorByValue(lineValue, 0.0);
        } else {
            var color = this.fgcolor;
        }
        ctx.strokeStyle = color;
        ctx.beginPath()
        ctx.moveTo(x, y+1);    // offset 0.5*linewidth (down) to avoid
        ctx.lineTo(x+w, y+1);  // overlap by following rectangle
        ctx.stroke()
    }
    ctx.restore()
}

GridCanvas.prototype.labelText = function (ctx,text,pos,x,y,w,h) {
    //log.debug("labelText(): text=" + text + " x=" + x + " y=" + y + " w=" + w + " h=" + h)
    var width = this.getLabelWidth(ctx,text);
    if (pos == "right") {
        x = x + w - width
    } else if (pos == "center") {
        x = x + w/2.0 - width/2.0
    }
    var nText = this._splitSuperscript(text);
    try {
        ctx.fillText(nText[0], x, y);
    } catch (e) {
        log.error("ERROR: text=" + nText[0] + " x=" + x + " y=" + y)
    }
    if (nText[1] != "") {
        var newX = x + ctx.measureText(nText[0]).width;
        var newY = y - 4;
        ctx.font = this.fontSuperscript;
        ctx.fillText(nText[1], newX, newY);
        ctx.font = this.fontNormal;
    }
}

GridCanvas.prototype._splitSuperscript = function (text) {
    var superscript = "";
    var exp = text.slice(-2,text.length)
    if (exp == "^2" || exp == "^3" || exp == "^4") {
        superscript = text.slice(-1,text.length);
        text = text.slice(0,-2); 
    }
    return [text,superscript];
}

GridCanvas.prototype.getLabelWidth = function (ctx, text) {
    var nText = this._splitSuperscript(text);
    var width = ctx.measureText(nText[0]).width;
    if (nText[1] != "") {
        ctx.font = this.fontSuperscript;
        width += ctx.measureText(nText[1]).width;
        ctx.font = this.fontNormal;
    }
    return width;
}

GridCanvas.prototype.getLegendText = function (value) {
    if ( this.gradient.maxValue > 100 ) {
        var text = value.toFixed();
    } else {
        var text = value.toFixed(2);
    }
    if ( this.legendLabel != '' ) {
        text += " " + this.legendLabel
    }
    return text;
}

GridCanvas.prototype.drawRulers = function (ctx) {
    // draw ruler, tick marks and labels in canvas space (pixels!)
    ctx.save()
    this.setRulerFont(ctx)
    this._drawRulerX(ctx)
    this._drawRulerY(ctx)
    ctx.restore()    
}
    
GridCanvas.prototype._drawRulerX = function (ctx) {
    ctx.save()
    var frame = this.getFrameCoords("bottom") 
    var x = this.getFrameCoords("center")[0] 
    ctx.translate(x,frame[1]);

    // draw ruler along x  
    var ticksize = 8;
    var labels = new Array();   // stores [label,x,y] for ctx.fillText() loop
    
    // draw tick marks and store pixel positions for lables
    var xmax = (this.array.bbox[1]-this.array.bbox[0] + this.gridstep) * this.canvasscale
    var xbase = this.array.bbox[0] - this.gridstep/2;
    ctx.lineWidth = 1.5;
    ctx.beginPath()
    ctx.moveTo(   0, 0);
    ctx.lineTo(xmax, 0);
    ctx.stroke()
    
    ctx.lineWidth = 1.0;
    ctx.beginPath()
    var cnt=0;
    for (var x=Math.round(this.array.bbox[0]+0.4); x<=Math.floor(this.array.bbox[1]); x++) {
        var xtick = (x-xbase)*this.canvasscale;
        if (((xmax - xtick) < 20) && (cnt > 4)) {
            cnt += 1; 
        } else {
            ctx.moveTo(xtick, 0);
            ctx.lineTo(xtick, ticksize );
            if ((xmax - xtick) > 35) {
                labels.push([x.toFixed(1), xtick+4, frame[3]]);
            }
            cnt += 1;
        }
    }
    ctx.stroke()
    
    // add labels
    var xUnit = xmax - 20;
    for (var i=0; i<labels.length; i++) {
        var p=labels[i]
        ctx.fillText(p[0], p[1], p[2]);
        //log.debug("TEST xtick=" + p[1] + " xmax=" + xmax)
        var wText = this.getLabelWidth(ctx,p[0])
        if ((p[1] + wText) > xUnit) {
            xUnit = p[1] + wText;
        }
    }
    this.labelText(ctx,"[m]","right",xUnit,frame[3]-2,20,12);
    ctx.restore()    
}

   
GridCanvas.prototype._drawRulerY = function (ctx) {
    ctx.save()
    var frame = this.getFrameCoords("left") 
    ctx.translate(frame[0]+frame[2],frame[1]+frame[3]);

    var ticksize = 8;
    var labels = new Array();   // stores [label,x,y] for ctx.fillText() loop
    
    // draw ruler along y
    var ymax = (this.array.bbox[3] - this.array.bbox[2] + this.gridstep) * this.canvasscale
    var ybase = this.array.bbox[2] - this.gridstep/2;
    ctx.lineWidth = 1.5;
    ctx.beginPath()
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -1*ymax);
    ctx.stroke()
    ctx.lineWidth = 1.0;
    
    ctx.beginPath()
    var xlabel = -1*this.ruler.left;
    for (var y=Math.round(this.array.bbox[2]+0.4); y<=Math.floor(this.array.bbox[3]); y++) {
        var ytick = (y-ybase)*this.canvasscale*-1;
        if ( (ytick+ymax) > 12 ) {   // p[2] is negative, ymax positive (height) 
            ctx.moveTo(-1*ticksize, ytick);          
            ctx.lineTo(0,ytick);
            if ( (ytick+ymax) > 28 ) {   // p[2] is negative, ymax positive (height) 
                labels.push([y.toFixed(1), xlabel, ytick-4]);
            }
        }
    }
    ctx.stroke()
    
    // add labels
    var lwidth = this.ruler.left - 3;
    this.labelText(ctx,"[m]","right",xlabel,-1*ymax+10,lwidth,12);
    for (var i=0; i<labels.length; i++) {
        var p=labels[i]
        this.labelText(ctx,p[0],"right",p[1],p[2],lwidth,12);
    }
    ctx.restore()    
}

GridCanvas.prototype.getLegendOptions = function () {
    try {
    var opts = {}
    opts.maxValue = this.gradient.maxValue;
    opts.minValue = this.gradient.minValue;
    opts.steps = this.legendSteps;
    opts.label = this.legendLabel;
    opts.lightness = this.gradient.lightness;
    return opts
    } catch (e) {
        logError(e)
    }
}

GridCanvas.prototype.setArray = function (array) {
    this.array = array;
    if ( this.array.empty() == false ) {
        this.setDataRange()
    }
}

GridCanvas.prototype.setCanvas = function (canvas) {
    this.canvas = canvas;
}

GridCanvas.prototype.setCanvasId = function (canvasid) {
    this.canvas = document.getElementById(canvasid);
}

GridCanvas.prototype.setDataTypeIndex = function (idx) {
    this.array.setDataTypeIndex(idx)
    this.setLegendLabel(this.array.units)
    if ( this.array.empty() == false ) {
        this.setDataRange()
    }
}

GridCanvas.prototype.setDataRange = function () {
    var minValue = this.array.bbox[4]
    var maxValue = this.array.bbox[5]
    var delta = maxValue - minValue;
    var steps = this._setDataStep(delta)
    var stepsize = steps[0]
    var nSteps = steps[1]
    if (minValue != 0) {
        minValue = minValue - (minValue % stepsize)
    }
    var tmpMax = minValue + stepsize*nSteps
    if (tmpMax < maxValue) {
        nSteps += 1
    }
    maxValue = minValue + stepsize*nSteps
    this.gradient.setMinValue(minValue)
    this.gradient.setMaxValue(maxValue)
    this.legendSteps = nSteps;
}

GridCanvas.prototype._setDataStep = function (delta) {
    var sizes = [1,2,2.5,5]
    for (var m=1; m<1000000; m*=10) {
        for (var i=0; i<sizes.length; i+=1) {
            for (var steps=5; steps<=15; steps+=1) {
                var stepsize = sizes[i]
                if (stepsize*steps*m > delta) {
                    return [stepsize*m, steps]
                }
            }
        }
    }
    return [stepsize*m, steps]
}

GridCanvas.prototype.setLegend = function (position) {
    this.legend = true;
    return

    this.ruler.right = 0;
    this.ruler.bottom = 15;
    if (position == "right") {
        this.ruler.right = 100;
        this.legend = true;
    } else if (position == "bottom") {
        this.ruler.bottom = 138;
        this.legend = true;
    }
}

GridCanvas.prototype.setLegendLabel = function (label) {
    this.legendLabel = label;
    log.info("legend: label set to '" + this.legendLabel + "'");
    this.draw();
}

GridCanvas.prototype.setLegendLightness = function (value) {
    var v = parseFloat(value);
    if ( ! isNaN(v) ) {
        if ( v < 0 ) {
            v = 0;
        } else if ( v >= 1.0 ) {
            v = 0.99;
        }
        this.lightness = v;
        this.gradient.setLightness(v);
        log.info("gradient: lightness set to '" + this.gradient.lightness.toFixed(2) + "'" );
        this.draw();
    }
}

GridCanvas.prototype.setLegendMax = function (value) {
    var v = parseFloat(value);
    if ( ! isNaN(v) ) {
        this.gradient.maxValue = v;
        log.info("legend: max value set to '" + this.gradient.maxValue.toFixed(2) + "'");
        this.draw();
    }
}

GridCanvas.prototype.setLegendMin = function (value) {
    var v = parseFloat(value);
    if ( ! isNaN(v) ) {
        this.gradient.minValue = v;
        log.info("legend: min value set to '" + this.gradient.minValue.toFixed(2) + "'");
        this.draw();
    }
}

GridCanvas.prototype.setLegendSteps = function (value) {
    var v = parseFloat(value);
    if ( ! isNaN(v) ) {
        this.legendSteps = v;
        log.info("legend: steps set to '" + this.legendSteps + "'");
        this.draw();
    }
}

GridCanvas.prototype.getGraphHeight = function () {
    if ( this.array.bbox == null ) {
        return 0.0;
    }
    // actual size based on bbox and scale
    var dy = this.array.bbox[3] - this.array.bbox[2] + this.gridstep
    var graphHeight = dy * this.canvasscale
    
    // maximum based on canvas height
    var maxHeight = this.canvas.height - this.margin.top - this.margin.bottom
    if (this.ruler.top != 0) { maxHeight = maxHeight - this.ruler.top - this.padding }
    if (this.ruler.bottom != 0) { maxHeight = maxHeight - this.ruler.bottom - this.padding }
    
    // return smaller of the two
    if (graphHeight < maxHeight) {
        return graphHeight
    } else {
        return maxHeight
    }
    
}

GridCanvas.prototype.setOrigin = function (ctx) {
    // translate to lower left corner off graph area 
    var frame = this.getFrameCoords("center");
    ctx.translate(frame[0], frame[1]+frame[3]);
}

GridCanvas.prototype.setRulerFont = function (ctx) {
    ctx.strokeStyle = this.fgcolor;
    ctx.fillStyle = this.fgcolor;
    ctx.font = this.fontNormal 
}

GridCanvas.prototype.setRulerWidth = function (ctx) {
    ctx.save()
    this.setRulerFont(ctx)
    
    // ruler left
    var maxW = 0;
    for (var i=Math.floor(this.array.bbox[2]); i<this.array.bbox[3]; i++) {
        var label=i.toFixed(1);
        var width = this.getLabelWidth(ctx,label);
        if (width > maxW) {
            maxW = width;
        }
    }
    this.ruler.left = Math.floor(maxW+3);
    log.debug("new width for ruler.left: " + this.ruler.left) 
    
    // legend width
    maxW = 0;
    var dValue = (this.gradient.maxValue - this.gradient.minValue) / this.legendSteps
    for (var i=1; i<=this.legendSteps; i++) {
        var label = this.getLegendText(dValue*i + this.gradient.minValue);
        var width = this.getLabelWidth(ctx,label);
        //log.debug("label='" + label + "' width=" + width.toFixed(1))
        if (width > maxW) {
            maxW = width;
        }
    }
    this.ruler.right = Math.floor(maxW+10);
    log.debug("new width for legend: " + this.ruler.right) 
    
    ctx.restore()
}

GridCanvas.prototype.setScale = function () {    
    var dimX = this.array.bbox[1] - this.array.bbox[0] + this.gridstep;
    var dimY = this.array.bbox[3] - this.array.bbox[2] + this.gridstep;
    
    var frameX = this.margin.left + this.margin.right
    if (this.ruler.left != 0) { frameX = frameX + this.ruler.left + this.padding }
    if (this.ruler.right != 0) { frameX = frameX + this.ruler.right + this.padding }
    var frameY = this.margin.top + this.margin.bottom
    if (this.ruler.top != 0) { frameY = frameY + this.ruler.top + this.padding }
    if (this.ruler.bottom != 0) { frameY = frameY + this.ruler.bottom + this.padding }
    
    var scaleX = (this.canvas.width-frameX) / dimX
    var scaleY = (this.canvas.height-frameY) / dimY
    if ( scaleX < scaleY) {
        this.canvasscale = scaleX
    } else {
        this.canvasscale = scaleY
    }
}


