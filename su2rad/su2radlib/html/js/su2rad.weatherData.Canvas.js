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
        this.v = this.global_horizontal
        this.value = this.global_horizontal
        if ( isNaN(this.x) || isNaN(this.y) || isNaN(this.v) ) {
            return false
        }
        return true
    } catch(e) {
        log.error("Error evaluating data record:<br/>" + this.fields.join("'")) 
        logError(e)
        return false
    }
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
    this.values = [];
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
    this.calcStats();
    //this.fillRows();
    this.sortArray();
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
    this.printStats();
}

GridArray.prototype.getArrayIndex = function (a,v) {
    for (var i=0; i<a.length; i++) {
        if (a[i] == v) {
            return i;
        }
    }
    return -1;
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
    log.debug("records: " + lines[7])
    for (i=8; i<lines.length; i++) {
        try {
            var record = new DataRecord(lines[i]);
            if ( record.evaluate() == true ) {
                this.addRecord(record);
            } else {
                log.info("wrong record: '" + lines[i] + "'")
            }
        } catch (e) {
            logError(e)
        }
    }
    log.debug("this.values.length=" + this.values.length)
    // finally create stats etc.
    this.analyzeGrid()
}

GridArray.prototype.parseTextOLD = function (text) {
    var re_cr = /\r/g
    var re_sp = /\s+/
    text = text.replace(re_cr, '');
    var lines = text.split("\n")
    for (i=0; i<lines.length; i++) {
        try {
            var line = lines[i];
            var idx = line.indexOf('#');
            if (idx == 0) {
                log.info('comment: ' + line);
                continue;
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
    this.canvasscale = 1;  // scale for 20px per 0.25m 
    this.gridstep = 0.25;   // TODO: evaluate grid data
    this.legend = false;
    this.legendSteps = 10
    this.lightness = 0.4;
    this.legendLabel = '';
    
    this.gradient = new ColorGradient()
    this.gradient.setLightness(this.lightness)
    
    this.ruler = {};
    this.ruler.left = 40;
    this.ruler.right = 0;
    this.ruler.bottom = 33;      
    this.ruler.top = 0;      
    
    this.margin = {};
    this.margin.left = 2;
    this.margin.right = 2;
    this.margin.bottom = 2;      
    this.margin.top = 7;      
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
        this.setRulerWidth(ctx) // adjust width of left ruler
        //this.setScale()         // work out scale based on available graph area
        ctx.save()
        this.setOrigin(ctx)
        this.drawGrid(ctx)  
        this.drawRulers(ctx)
        if (this.legend == true) {
            this.drawLegend(ctx)
        }
        ctx.restore()
    }
}

GridCanvas.prototype.drawContourLines = function (ctx) {
    var dValue = (this.gradient.maxValue - this.gradient.minValue) / this.legendSteps
    ctx.save()
    ctx.lineWidth = 2/this.canvasscale;;
    ctx.strokeStyle = '#000000'
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
    // draw grey background
    ctx.scale(1.5,1.0)
    //ctx.fillStyle = '#bbbbbb'
    //ctx.fillRect(0,0,365,-340);
    ctx.lineWidth=1;  
    var cnt = 0;
    var rows = this.array.getRows()
    for (var i=0; i<rows.length; i++) {
        var row = this.array.getRowAt(rows[i]);
        if ( row != null ) {
            for (var j=0; j<row.length; j++) {
                var point = row[j]
                if (point.v != 0.0) {
                    var color = this.gradient.getColorByValue(point.v, 0.0);
                    try {
                        cnt += 1;
                        ctx.strokeStyle = color;
                        ctx.beginPath()
                        ctx.moveTo(point.x, point.y*-15);
                        ctx.lineTo(point.x, (point.y+1)*-15);
                        ctx.stroke()
                    } catch (e) {
                        log.error("point.x=" + point.x + " point.y=" + point.y)
                        logError(e)
                    }
                }
            }
        }
    }
    //this.drawContourLines(ctx)
    ctx.restore()
}

GridCanvas.prototype.drawLegend = function (ctx) {
    var dValue = (this.gradient.maxValue - this.gradient.minValue) / this.legendSteps
    var xmax = 540;
    var ymax = 360;
    var x = xmax + 20;
    var w = this.ruler.right - 20
    var h = 200;
    (ymax > 200) ? h = ymax : h = 200;
    var dH = h/this.legendSteps
    
    // start at bottom (y=0 or >0)
    var y = -1*ymax + h
    
    ctx.save() 
    for (var i=0; i<this.legendSteps; i++) {
        y -= h/this.legendSteps;    // y values decrease to go up
        var value = (i+0.5) * dValue + this.gradient.minValue
        var color = this.gradient.getColorByValue(value);
        ctx.fillStyle = color;
        try {
            ctx.fillRect(x,y,w,dH);
            var ltext = this.getLegendText(dValue*i + this.gradient.minValue);
            ctx.fillStyle = '#000000';
            ctx.fillText(ltext, x+4, y+dH-4);
            // draw line in dark shade at <value> level
            var color = this.gradient.getColorByValue(value, 0.0);
            ctx.strokeStyle = color;
            ctx.beginPath()
            ctx.moveTo(x, y);
            ctx.lineTo(x+w, y);
            ctx.stroke()
        } catch (e) {
            log.debug("x,y=" + x + " " + y)
            logError(e)
        }
    }
    ctx.restore()
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
    
    // draw rulers along x and y 
    ctx.lineWidth = 1.5;
    // var xmax = (this.array.bbox[1]-this.array.bbox[0] + this.gridstep) * this.canvasscale
    // var ymax = (this.array.bbox[3]-this.array.bbox[2] + this.gridstep) * this.canvasscale
    var xmax = 365*1.5;      // days of year * x-scale 
    var ymax = 360;
    var xoffset = -15;       // 15px distance to graph
    var yoffset =  15;       // 15px distance to graph
    ctx.beginPath()
    ctx.moveTo(   0, yoffset);
    ctx.lineTo(xmax, yoffset);
    ctx.moveTo(xoffset,    0);
    ctx.lineTo(xoffset, -1*ymax);
    ctx.stroke()

    var labels = new Array();   // stores [label,x,y] for ctx.fillText() loop
    
    // draw tick marks and store pixel positions for lables
    ctx.lineWidth = 1.0;
    
    // x-axis
    var months = ['Jan','Feb','Mar','Apr','May','June','July','Aug','Sep','Oct','Nov','Dec']
    var ndays =  [0,31,59,90,120,151,181,212,243,273,304,334,365];
    ctx.beginPath()
    for (var x=0; x<=12; x++) {
        var xtick = ndays[x]*1.5;
        ctx.moveTo(xtick, yoffset);
        ctx.lineTo(xtick, yoffset+5 );                     // 10 px for ticks
        if ( x<12 ) {
            labels.push([months[x], xtick+10, yoffset+15]);   // 15 px down for text
        }
    }
    ctx.stroke()
    //ctx.textAlign('center');
    for (var i=0; i<labels.length; i++) {
        var p=labels[i]
        ctx.fillText(p[0], p[1], p[2]);
    }
    
    // y-axis
    labels = [];
    ctx.beginPath()
    var ybase = this.array.bbox[2] - this.gridstep/2;
    //for (var y=Math.round(this.array.bbox[2]+0.4); y<=Math.floor(this.array.bbox[3]); y++) {
    for (var y=0; y<25; y++) {
        var ytick = y*-15;
        ctx.moveTo(xoffset-5, ytick);                      // 10 px for ticks
        ctx.lineTo(xoffset,ytick);
        var xlabel = -1*this.ruler.left+5;                 // lable starts at 
        labels.push([y.toFixed(), xlabel, ytick+4]);
    }
    ctx.stroke()
    //ctx.textAlign('right');
    for (var i=0; i<labels.length; i++) {
        var p=labels[i]
        ctx.fillText(p[0], p[1], p[2]);
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
        this.gradient.setMinValue(this.array.bbox[4])
        this.gradient.setMaxValue(this.array.bbox[5])
    }
}

GridCanvas.prototype.setCanvas = function (canvas) {
    this.canvas = canvas;
}

GridCanvas.prototype.setCanvasId = function (canvasid) {
    this.canvas = document.getElementById(canvasid);
}

GridCanvas.prototype.setLegend = function (position) {
    this.ruler.right = 0;
    this.ruler.bottom = 38;
    this.legend = false;
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

GridCanvas.prototype.setOrigin = function (ctx) {
    // translate to lower left corner off graph area 
    if ( this.array.bbox == null ) {
        return
    } 
    var graphHeight = 360; // 24*15px
    
    var frameY = this.ruler.top + this.ruler.bottom + this.margin.top + this.margin.bottom
    var maxGraphHeight = this.canvas.height-frameY
    log.debug("graphHeight=" + graphHeight + " maxGraphHeight=" + maxGraphHeight) 
    try {
        ctx.translate(this.margin.left, this.margin.top)
        if (graphHeight < maxGraphHeight) {
            ctx.translate(this.ruler.left, graphHeight + this.margin.top)
        } else {
            ctx.translate(this.ruler.left, maxGraphHeight + this.margin.top)
        }
    } catch (e) {
        logError(e)
    }
    log.debug("end setOrigin()")
}

GridCanvas.prototype.setRulerFont = function (ctx) {
    ctx.strokeStyle = "#000000";
    ctx.fillStyle = "#000000";
    ctx.font = "12px 'arial'";
}

GridCanvas.prototype.setRulerWidth = function (ctx) {
    ctx.save()
    this.setRulerFont(ctx)
    var maxW = 0;
    for (var i=Math.floor(this.array.bbox[2]); i<this.array.bbox[3]; i++) {
        var label=i.toFixed(1);
        var dim = ctx.measureText(label);
        if (dim.width > maxW) {
            maxW = dim.width;
        }
    }
    maxW = maxW + 20 + 5;
    if (this.ruler.left < maxW) {
        this.ruler.left = Math.floor(maxW);
    }
    ctx.restore()
}

GridCanvas.prototype.setScale = function () {    
    var dimX = this.array.bbox[1] - this.array.bbox[0] + this.gridstep;
    var dimY = this.array.bbox[3] - this.array.bbox[2] + this.gridstep;
    var frameX = this.ruler.left + this.ruler.right + this.margin.left + this.margin.right
    var frameY = this.ruler.top + this.ruler.bottom + this.margin.top + this.margin.bottom
    var scaleX = (this.canvas.width-frameX) / dimX
    var scaleY = (this.canvas.height-frameY) / dimY
    if ( scaleX < scaleY) {
        this.canvasscale = scaleX
    } else {
        this.canvasscale = scaleY
    }
    this.canvasscale = 1
}


