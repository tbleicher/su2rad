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

function addDebugText(txt) {
    var text = document.getElementById('messagearea').value;
    document.getElementById('messagearea').value = text + "\n" + txt;
} 

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



function ColorGradient() {
    this.colorStyle = 'roygbiv';
    this.lightness = 0.4;
    this.maxValue = 1.0;
    this.minValue = 0.0;
}

ColorGradient.prototype.getColorByValue = function (value) {
    if (value == 0.0) {
        return "#ffffff";
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
    var r = this.process( Math.floor((Math.cos(x) + 1) * scale) );
    var g = this.process( Math.floor((Math.cos(x+Math.PI/2) + 1) * scale) );
    var b = this.process( Math.floor((Math.cos(x+Math.PI) + 1) * scale) );
    return '#' + r + g + b;
}

ColorGradient.prototype.process = function (num) {
        // adjust lightness
        var n = Math.floor( num + this.lightness * (256 - num));
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
    log.debug("GridArray.init()")
    this.bbox = null;
    this.cols = new UniqueArray();
    this.gridByY = {};
    this.rows = [];
    this.stats = {};
    this.values = [];
}

GridArray.prototype.addPoint = function (p) {
    if (p.length == 4) {
        var value = p[3];
    } else if (p.length == 7) {
        var value = p[6];
    } else {
        log.error("line too short: '" + p.toString() + "'");
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

GridArray.prototype.readArray = function (gridarray) {
    this.init()
    for (var i=0; i<gridarray.length; i++) {
        this.addPoint(gridarray[i]);
    }
    this.calcStats();
    this.fillRows();
    this.sortArray();
}

GridArray.prototype.printStats = function () {
    var text = "";
    text += "minValue= " + this.bbox[4].toFixed(2) + "\n";
    text += "maxValue= " + this.bbox[5].toFixed(2) + "\n";
    text += "rows= " + this.rows.length + "\n";
    text += "rows[0]= " + this.rows[0] + "\n";
    text += "rows[-1]= " + this.rows[this.rows.length-1] + "\n";
    //text += "this[this.rows[0]]= " + this[this.rows[0]];
    addDebugText(text);
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
    this.canvasscale = 80;  // scale for 20px per 0.25m 
    this.gridstep = 0.25;   // TODO: evaluate grid data
    this.legend = false;
    this.legendSteps = 10
    this.lightness = 0.4;
    
    this.gradient = new ColorGradient()
    this.gradient.setLightness(this.lightness)
    
    this.ruler = {};
    this.ruler.left = 40;
    this.ruler.right = 0;
    this.ruler.bottom = 38;      
    this.ruler.top = 0;      
    
    this.margin = {};
    this.margin.left = 2;
    this.margin.right = 2;
    this.margin.bottom = 2;      
    this.margin.top = 2;      
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
        this.setScale()         // work out scale based on available graph area
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

GridCanvas.prototype.drawGrid = function (ctx) {
    if ( this.array.bbox == null ) {
        return
    }

    ctx.save()
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
                    ctx.fillStyle = color;
                    ctx.fillRect(point.x-gs2, point.y-gs2, gs, gs);
                }
            }
        }
    }
    ctx.restore()
}

GridCanvas.prototype.drawLegend = function (ctx) {
    var dValue = (this.gradient.maxValue - this.gradient.minValue) / this.legendSteps
    var xmax = (this.array.bbox[1]-this.array.bbox[0] + this.gridstep) * this.canvasscale
    var ymax = (this.array.bbox[3]-this.array.bbox[2] + this.gridstep) * this.canvasscale
    var x = xmax + 20
    var w = this.ruler.right - 20
    var h = 200;
    (ymax > 200) ? h = ymax : h = 200;
    var dH = h/this.legendSteps
    
    var y = -1*ymax + h             // start at bottom (y=0 or >0)
    
    ctx.save() 
    
    for (var i=0; i<this.legendSteps; i++) {
        y -= h/this.legendSteps;    // y values decrease to go up
        var value = (i+0.5) * dValue + this.gradient.minValue
        var color = this.gradient.getColorByValue(value);
        ctx.fillStyle = color;
        ctx.fillRect(x,y,w,dH);
        var label = dValue*i + this.gradient.minValue
        ctx.fillStyle = '#000000';
        ctx.fillText(label.toFixed(2), x+4,y+dH-4)
    }
    ctx.restore()
}

GridCanvas.prototype.drawRulers = function (ctx) {
    
    // draw ruler, tick marks and labels in canvas space (pixels!)
    ctx.save()
    this.setRulerFont(ctx)
    
    // draw rulers along x and y 
    ctx.lineWidth = 1.5;
    var xmax = (this.array.bbox[1]-this.array.bbox[0] + this.gridstep) * this.canvasscale
    var ymax = (this.array.bbox[3]-this.array.bbox[2] + this.gridstep) * this.canvasscale
    var xoffset = -20;       // 20px distance to graph
    var yoffset =  20;       // 20px distance to graph
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
    var xbase = this.array.bbox[0] - this.gridstep/2;
    ctx.beginPath()
    for (var x=Math.round(this.array.bbox[0]+0.4); x<=Math.floor(this.array.bbox[1]); x++) {
        var xtick = (x-xbase)*this.canvasscale;
        ctx.moveTo(xtick, yoffset);
        ctx.lineTo(xtick, yoffset+10 );                     // 10 px for ticks
        labels.push([x.toFixed(1), xtick+4, yoffset+15]);   // 15 px down for text
    }
    
    // y-axis
    var ybase = this.array.bbox[2] - this.gridstep/2;
    for (var y=Math.round(this.array.bbox[2]+0.4); y<=Math.floor(this.array.bbox[3]); y++) {
        var ytick = (y-ybase)*this.canvasscale*-1;
        ctx.moveTo(xoffset-10, ytick);                      // 10 px for ticks
        ctx.lineTo(xoffset,ytick);
        var xlabel = -1*this.ruler.left;                      // lable starts at 
        labels.push([y.toFixed(1), xlabel, ytick-4]);
    }
    ctx.stroke()
    
    for (var i=0; i<labels.length; i++) {
        var p=labels[i]
        ctx.fillText(p[0], p[1], p[2]);
    }
    ctx.restore()    
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

GridCanvas.prototype.getLegendOptions = function () {
    var opts = {}
    opts.maxValue = this.gradient.maxValue;
    opts.minValue = this.gradient.minValue;
    opts.steps = this.legendSteps;
    return opts
}

GridCanvas.prototype.setLegendMax = function (value) {
    var v = parseFloat(value);
    if ( ! isNaN(v) ) {
        this.gradient.maxValue = v;
        log.info("legend: max value set to " + this.gradient.maxValue.toFixed(2));
        this.draw();
    }
}

GridCanvas.prototype.setLegendMin = function (value) {
    var v = parseFloat(value);
    if ( ! isNaN(v) ) {
        this.gradient.minValue = v;
        log.info("legend: min value set to " + this.gradient.minValue.toFixed(2));
        this.draw();
    }
}

GridCanvas.prototype.setLegendSteps = function (value) {
    var v = parseFloat(value);
    if ( ! isNaN(v) ) {
        this.legendSteps = v;
        log.info("legend: steps set to " + this.legendSteps);
        this.draw();
    }
}

GridCanvas.prototype.setOrigin = function (ctx) {
    // translate to lower left corner off graph area 
    if ( this.array.bbox == null ) {
        return
    } 
    var dy = this.array.bbox[3] - this.array.bbox[2] + this.gridstep
    var graphHeight = dy * this.canvasscale
    
    var frameY = this.ruler.top + this.ruler.bottom + this.margin.top + this.margin.bottom
    var maxGraphHeight = this.canvas.height-frameY
    
    ctx.translate(this.margin.left, this.margin.top)
    if (graphHeight < maxGraphHeight) {
        ctx.translate(this.ruler.left, graphHeight)
    } else {
        ctx.translate(this.ruler.left, maxGraphHeight)
    } 
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
    
    var txt = document.getElementById('messagearea').value;
    txt += "scaleX=" + scaleX.toFixed(3) + " scaleY=" + scaleY.toFixed(3) + "\n"
    txt += 'this.array.bbox=' + this.array.bbox[0] + ' ' + this.array.bbox[1] + ' ' + this.array.bbox[2] + ' ' + this.array.bbox[3] + "\n"
    document.getElementById('messagearea').value = txt;
}




var grid_df = [[-2.25, 0.75, 0.75, -0.00, -0.00, 1.00, 3.47],
    [-2.25, 1.00, 0.75, -0.00, -0.00, 1.00, 3.84],
    [-2.25, 1.25, 0.75, -0.00, -0.00, 1.00, 4.10],
    [-2.25, 1.50, 0.75, -0.00, -0.00, 1.00, 4.18],
    [-2.25, 1.75, 0.75, -0.00, -0.00, 1.00, 3.92],
    [-2.25, 2.00, 0.75, -0.00, -0.00, 1.00, 3.77],
    [-2.25, 2.25, 0.75, -0.00, -0.00, 1.00, 3.53],
    [-2.25, 2.50, 0.75, -0.00, -0.00, 1.00, 3.31],
    [-2.25, 2.75, 0.75, -0.00, -0.00, 1.00, 3.09],
    [-2.25, 3.00, 0.75, -0.00, -0.00, 1.00, 2.89],
    [-2.25, 3.25, 0.75, -0.00, -0.00, 1.00, 2.65],
    [-2.25, 3.50, 0.75, -0.00, -0.00, 1.00, 2.46],
    [-2.25, 3.75, 0.75, -0.00, -0.00, 1.00, 2.28],
    [-2.25, 4.00, 0.75, -0.00, -0.00, 1.00, 2.12],
    [-2.25, 4.25, 0.75, -0.00, -0.00, 1.00, 1.94],
    [-2.25, 4.50, 0.75, -0.00, -0.00, 1.00, 1.82],
    [-2.25, 4.75, 0.75, -0.00, -0.00, 1.00, 1.74],
    [-2.25, 5.00, 0.75, -0.00, -0.00, 1.00, 1.65],
    [-2.25, 5.25, 0.75, -0.00, -0.00, 1.00, 1.58],
    [-2.25, 5.50, 0.75, -0.00, -0.00, 1.00, 1.53],
    [-2.00, 0.75, 0.75, -0.00, -0.00, 1.00, 4.50],
    [-2.00, 1.00, 0.75, -0.00, -0.00, 1.00, 4.79],
    [-2.00, 1.25, 0.75, -0.00, -0.00, 1.00, 4.67],
    [-2.00, 1.50, 0.75, -0.00, -0.00, 1.00, 4.36],
    [-2.00, 1.75, 0.75, -0.00, -0.00, 1.00, 4.22],
    [-2.00, 2.00, 0.75, -0.00, -0.00, 1.00, 4.01],
    [-2.00, 2.25, 0.75, -0.00, -0.00, 1.00, 3.70],
    [-2.00, 2.50, 0.75, -0.00, -0.00, 1.00, 3.40],
    [-2.00, 2.75, 0.75, -0.00, -0.00, 1.00, 3.18],
    [-2.00, 3.00, 0.75, -0.00, -0.00, 1.00, 2.94],
    [-2.00, 3.25, 0.75, -0.00, -0.00, 1.00, 2.70],
    [-2.00, 3.50, 0.75, -0.00, -0.00, 1.00, 2.49],
    [-2.00, 3.75, 0.75, -0.00, -0.00, 1.00, 2.31],
    [-2.00, 4.00, 0.75, -0.00, -0.00, 1.00, 2.10],
    [-2.00, 4.25, 0.75, -0.00, -0.00, 1.00, 1.97],
    [-2.00, 4.50, 0.75, -0.00, -0.00, 1.00, 1.86],
    [-2.00, 4.75, 0.75, -0.00, -0.00, 1.00, 1.78],
    [-2.00, 5.00, 0.75, -0.00, -0.00, 1.00, 1.69],
    [-2.00, 5.25, 0.75, -0.00, -0.00, 1.00, 1.63],
    [-2.00, 5.50, 0.75, -0.00, -0.00, 1.00, 1.61],
    [-1.75, 0.75, 0.75, -0.00, -0.00, 1.00, 6.62],
    [-1.75, 1.00, 0.75, -0.00, -0.00, 1.00, 6.50],
    [-1.75, 1.25, 0.75, -0.00, -0.00, 1.00, 5.97],
    [-1.75, 1.50, 0.75, -0.00, -0.00, 1.00, 5.17],
    [-1.75, 1.75, 0.75, -0.00, -0.00, 1.00, 4.70],
    [-1.75, 2.00, 0.75, -0.00, -0.00, 1.00, 4.36],
    [-1.75, 2.25, 0.75, -0.00, -0.00, 1.00, 4.10],
    [-1.75, 2.50, 0.75, -0.00, -0.00, 1.00, 3.63],
    [-1.75, 2.75, 0.75, -0.00, -0.00, 1.00, 3.33],
    [-1.75, 3.00, 0.75, -0.00, -0.00, 1.00, 3.05],
    [-1.75, 3.25, 0.75, -0.00, -0.00, 1.00, 2.82],
    [-1.75, 3.50, 0.75, -0.00, -0.00, 1.00, 2.66],
    [-1.75, 3.75, 0.75, -0.00, -0.00, 1.00, 2.45],
    [-1.75, 4.00, 0.75, -0.00, -0.00, 1.00, 2.20],
    [-1.75, 4.25, 0.75, -0.00, -0.00, 1.00, 2.06],
    [-1.75, 4.50, 0.75, -0.00, -0.00, 1.00, 1.95],
    [-1.75, 4.75, 0.75, -0.00, -0.00, 1.00, 1.83],
    [-1.75, 5.00, 0.75, -0.00, -0.00, 1.00, 1.73],
    [-1.75, 5.25, 0.75, -0.00, -0.00, 1.00, 1.67],
    [-1.75, 5.50, 0.75, -0.00, -0.00, 1.00, 1.65],
    [-1.50, 0.75, 0.75, -0.00, -0.00, 1.00, 37.38],
    [-1.50, 1.00, 0.75, -0.00, -0.00, 1.00, 8.37],
    [-1.50, 1.25, 0.75, -0.00, -0.00, 1.00, 7.21],
    [-1.50, 1.50, 0.75, -0.00, -0.00, 1.00, 6.33],
    [-1.50, 1.75, 0.75, -0.00, -0.00, 1.00, 5.51],
    [-1.50, 2.00, 0.75, -0.00, -0.00, 1.00, 4.79],
    [-1.50, 2.25, 0.75, -0.00, -0.00, 1.00, 4.21],
    [-1.50, 2.50, 0.75, -0.00, -0.00, 1.00, 3.83],
    [-1.50, 2.75, 0.75, -0.00, -0.00, 1.00, 3.45],
    [-1.50, 3.00, 0.75, -0.00, -0.00, 1.00, 3.15],
    [-1.50, 3.25, 0.75, -0.00, -0.00, 1.00, 2.93],
    [-1.50, 3.50, 0.75, -0.00, -0.00, 1.00, 2.72],
    [-1.50, 3.75, 0.75, -0.00, -0.00, 1.00, 2.45],
    [-1.50, 4.00, 0.75, -0.00, -0.00, 1.00, 2.24],
    [-1.50, 4.25, 0.75, -0.00, -0.00, 1.00, 2.09],
    [-1.50, 4.50, 0.75, -0.00, -0.00, 1.00, 1.98],
    [-1.50, 4.75, 0.75, -0.00, -0.00, 1.00, 1.85],
    [-1.50, 5.00, 0.75, -0.00, -0.00, 1.00, 1.77],
    [-1.50, 5.25, 0.75, -0.00, -0.00, 1.00, 1.71],
    [-1.50, 5.50, 0.75, -0.00, -0.00, 1.00, 1.70],
    [-1.25, 0.75, 0.75, -0.00, -0.00, 1.00, 40.24],
    [-1.25, 1.00, 0.75, -0.00, -0.00, 1.00, 10.32],
    [-1.25, 1.25, 0.75, -0.00, -0.00, 1.00, 8.49],
    [-1.25, 1.50, 0.75, -0.00, -0.00, 1.00, 7.06],
    [-1.25, 1.75, 0.75, -0.00, -0.00, 1.00, 5.97],
    [-1.25, 2.00, 0.75, -0.00, -0.00, 1.00, 5.10],
    [-1.25, 2.25, 0.75, -0.00, -0.00, 1.00, 4.57],
    [-1.25, 2.50, 0.75, -0.00, -0.00, 1.00, 4.09],
    [-1.25, 2.75, 0.75, -0.00, -0.00, 1.00, 3.62],
    [-1.25, 3.00, 0.75, -0.00, -0.00, 1.00, 3.27],
    [-1.25, 3.25, 0.75, -0.00, -0.00, 1.00, 3.01],
    [-1.25, 3.50, 0.75, -0.00, -0.00, 1.00, 2.76],
    [-1.25, 3.75, 0.75, -0.00, -0.00, 1.00, 2.54],
    [-1.25, 4.00, 0.75, -0.00, -0.00, 1.00, 2.35],
    [-1.25, 4.25, 0.75, -0.00, -0.00, 1.00, 2.16],
    [-1.25, 4.50, 0.75, -0.00, -0.00, 1.00, 2.00],
    [-1.25, 4.75, 0.75, -0.00, -0.00, 1.00, 1.89],
    [-1.25, 5.00, 0.75, -0.00, -0.00, 1.00, 1.81],
    [-1.25, 5.25, 0.75, -0.00, -0.00, 1.00, 1.74],
    [-1.25, 5.50, 0.75, -0.00, -0.00, 1.00, 1.74],
    [-1.00, 0.75, 0.75, -0.00, -0.00, 1.00, 42.06],
    [-1.00, 1.00, 0.75, -0.00, -0.00, 1.00, 11.56],
    [-1.00, 1.25, 0.75, -0.00, -0.00, 1.00, 9.28],
    [-1.00, 1.50, 0.75, -0.00, -0.00, 1.00, 7.80],
    [-1.00, 1.75, 0.75, -0.00, -0.00, 1.00, 6.44],
    [-1.00, 2.00, 0.75, -0.00, -0.00, 1.00, 5.52],
    [-1.00, 2.25, 0.75, -0.00, -0.00, 1.00, 4.80],
    [-1.00, 2.50, 0.75, -0.00, -0.00, 1.00, 4.23],
    [-1.00, 2.75, 0.75, -0.00, -0.00, 1.00, 3.76],
    [-1.00, 3.00, 0.75, -0.00, -0.00, 1.00, 3.34],
    [-1.00, 3.25, 0.75, -0.00, -0.00, 1.00, 3.09],
    [-1.00, 3.50, 0.75, -0.00, -0.00, 1.00, 2.80],
    [-1.00, 3.75, 0.75, -0.00, -0.00, 1.00, 2.58],
    [-1.00, 4.00, 0.75, -0.00, -0.00, 1.00, 2.39],
    [-1.00, 4.25, 0.75, -0.00, -0.00, 1.00, 2.16],
    [-1.00, 4.50, 0.75, -0.00, -0.00, 1.00, 2.04],
    [-1.00, 4.75, 0.75, -0.00, -0.00, 1.00, 1.92],
    [-1.00, 5.00, 0.75, -0.00, -0.00, 1.00, 1.84],
    [-1.00, 5.25, 0.75, -0.00, -0.00, 1.00, 1.77],
    [-1.00, 5.50, 0.75, -0.00, -0.00, 1.00, 1.73],
    [-0.75, 0.75, 0.75, -0.00, -0.00, 1.00, 43.11],
    [-0.75, 1.00, 0.75, -0.00, -0.00, 1.00, 12.29],
    [-0.75, 1.25, 0.75, -0.00, -0.00, 1.00, 10.02],
    [-0.75, 1.50, 0.75, -0.00, -0.00, 1.00, 8.27],
    [-0.75, 1.75, 0.75, -0.00, -0.00, 1.00, 6.87],
    [-0.75, 2.00, 0.75, -0.00, -0.00, 1.00, 5.81],
    [-0.75, 2.25, 0.75, -0.00, -0.00, 1.00, 5.01],
    [-0.75, 2.50, 0.75, -0.00, -0.00, 1.00, 4.39],
    [-0.75, 2.75, 0.75, -0.00, -0.00, 1.00, 3.97],
    [-0.75, 3.00, 0.75, -0.00, -0.00, 1.00, 3.55],
    [-0.75, 3.25, 0.75, -0.00, -0.00, 1.00, 3.15],
    [-0.75, 3.50, 0.75, -0.00, -0.00, 1.00, 2.86],
    [-0.75, 3.75, 0.75, -0.00, -0.00, 1.00, 2.63],
    [-0.75, 4.00, 0.75, -0.00, -0.00, 1.00, 2.39],
    [-0.75, 4.25, 0.75, -0.00, -0.00, 1.00, 2.22],
    [-0.75, 4.50, 0.75, -0.00, -0.00, 1.00, 2.05],
    [-0.75, 4.75, 0.75, -0.00, -0.00, 1.00, 1.94],
    [-0.75, 5.00, 0.75, -0.00, -0.00, 1.00, 1.84],
    [-0.75, 5.25, 0.75, -0.00, -0.00, 1.00, 1.74],
    [-0.75, 5.50, 0.75, -0.00, -0.00, 1.00, 1.74],
    [-0.50, 0.75, 0.75, -0.00, -0.00, 1.00, 43.65],
    [-0.50, 1.00, 0.75, -0.00, -0.00, 1.00, 12.90],
    [-0.50, 1.25, 0.75, -0.00, -0.00, 1.00, 10.35],
    [-0.50, 1.50, 0.75, -0.00, -0.00, 1.00, 8.57],
    [-0.50, 1.75, 0.75, -0.00, -0.00, 1.00, 7.06],
    [-0.50, 2.00, 0.75, -0.00, -0.00, 1.00, 5.95],
    [-0.50, 2.25, 0.75, -0.00, -0.00, 1.00, 5.11],
    [-0.50, 2.50, 0.75, -0.00, -0.00, 1.00, 4.45],
    [-0.50, 2.75, 0.75, -0.00, -0.00, 1.00, 3.99],
    [-0.50, 3.00, 0.75, -0.00, -0.00, 1.00, 3.47],
    [-0.50, 3.25, 0.75, -0.00, -0.00, 1.00, 3.18],
    [-0.50, 3.50, 0.75, -0.00, -0.00, 1.00, 2.89],
    [-0.50, 3.75, 0.75, -0.00, -0.00, 1.00, 2.59],
    [-0.50, 4.00, 0.75, -0.00, -0.00, 1.00, 2.42],
    [-0.50, 4.25, 0.75, -0.00, -0.00, 1.00, 2.25],
    [-0.50, 4.50, 0.75, -0.00, -0.00, 1.00, 2.05],
    [-0.50, 4.75, 0.75, -0.00, -0.00, 1.00, 1.95],
    [-0.50, 5.00, 0.75, -0.00, -0.00, 1.00, 1.85],
    [-0.50, 5.25, 0.75, -0.00, -0.00, 1.00, 1.81],
    [-0.50, 5.50, 0.75, -0.00, -0.00, 1.00, 1.76],
    [-0.25, 0.75, 0.75, -0.00, -0.00, 1.00, 43.76],
    [-0.25, 1.00, 0.75, -0.00, -0.00, 1.00, 13.22],
    [-0.25, 1.25, 0.75, -0.00, -0.00, 1.00, 10.55],
    [-0.25, 1.50, 0.75, -0.00, -0.00, 1.00, 8.67],
    [-0.25, 1.75, 0.75, -0.00, -0.00, 1.00, 7.23],
    [-0.25, 2.00, 0.75, -0.00, -0.00, 1.00, 6.02],
    [-0.25, 2.25, 0.75, -0.00, -0.00, 1.00, 5.18],
    [-0.25, 2.50, 0.75, -0.00, -0.00, 1.00, 4.53],
    [-0.25, 2.75, 0.75, -0.00, -0.00, 1.00, 4.04],
    [-0.25, 3.00, 0.75, -0.00, -0.00, 1.00, 3.60],
    [-0.25, 3.25, 0.75, -0.00, -0.00, 1.00, 3.18],
    [-0.25, 3.50, 0.75, -0.00, -0.00, 1.00, 2.87],
    [-0.25, 3.75, 0.75, -0.00, -0.00, 1.00, 2.66],
    [-0.25, 4.00, 0.75, -0.00, -0.00, 1.00, 2.45],
    [-0.25, 4.25, 0.75, -0.00, -0.00, 1.00, 2.23],
    [-0.25, 4.50, 0.75, -0.00, -0.00, 1.00, 2.08],
    [-0.25, 4.75, 0.75, -0.00, -0.00, 1.00, 1.94],
    [-0.25, 5.00, 0.75, -0.00, -0.00, 1.00, 1.87],
    [-0.25, 5.25, 0.75, -0.00, -0.00, 1.00, 1.82],
    [-0.25, 5.50, 0.75, -0.00, -0.00, 1.00, 1.77],
    [0.00, 0.75, 0.75, -0.00, -0.00, 1.00, 43.81],
    [0.00, 1.00, 0.75, -0.00, -0.00, 1.00, 13.13],
    [0.00, 1.25, 0.75, -0.00, -0.00, 1.00, 10.64],
    [0.00, 1.50, 0.75, -0.00, -0.00, 1.00, 8.69],
    [0.00, 1.75, 0.75, -0.00, -0.00, 1.00, 7.28],
    [0.00, 2.00, 0.75, -0.00, -0.00, 1.00, 6.03],
    [0.00, 2.25, 0.75, -0.00, -0.00, 1.00, 5.15],
    [0.00, 2.50, 0.75, -0.00, -0.00, 1.00, 4.54],
    [0.00, 2.75, 0.75, -0.00, -0.00, 1.00, 4.02],
    [0.00, 3.00, 0.75, -0.00, -0.00, 1.00, 3.48],
    [0.00, 3.25, 0.75, -0.00, -0.00, 1.00, 3.17],
    [0.00, 3.50, 0.75, -0.00, -0.00, 1.00, 2.87],
    [0.00, 3.75, 0.75, -0.00, -0.00, 1.00, 2.61],
    [0.00, 4.00, 0.75, -0.00, -0.00, 1.00, 2.41],
    [0.00, 4.25, 0.75, -0.00, -0.00, 1.00, 2.23],
    [0.00, 4.50, 0.75, -0.00, -0.00, 1.00, 2.08],
    [0.00, 4.75, 0.75, -0.00, -0.00, 1.00, 1.93],
    [0.00, 5.00, 0.75, -0.00, -0.00, 1.00, 1.87],
    [0.00, 5.25, 0.75, -0.00, -0.00, 1.00, 1.79],
    [0.00, 5.50, 0.75, -0.00, -0.00, 1.00, 1.71],
    [0.25, 0.75, 0.75, -0.00, -0.00, 1.00, 43.65],
    [0.25, 1.00, 0.75, -0.00, -0.00, 1.00, 13.05],
    [0.25, 1.25, 0.75, -0.00, -0.00, 1.00, 10.54],
    [0.25, 1.50, 0.75, -0.00, -0.00, 1.00, 8.62],
    [0.25, 1.75, 0.75, -0.00, -0.00, 1.00, 7.08],
    [0.25, 2.00, 0.75, -0.00, -0.00, 1.00, 5.93],
    [0.25, 2.25, 0.75, -0.00, -0.00, 1.00, 5.10],
    [0.25, 2.50, 0.75, -0.00, -0.00, 1.00, 4.50],
    [0.25, 2.75, 0.75, -0.00, -0.00, 1.00, 4.02],
    [0.25, 3.00, 0.75, -0.00, -0.00, 1.00, 3.58],
    [0.25, 3.25, 0.75, -0.00, -0.00, 1.00, 3.14],
    [0.25, 3.50, 0.75, -0.00, -0.00, 1.00, 2.84],
    [0.25, 3.75, 0.75, -0.00, -0.00, 1.00, 2.63],
    [0.25, 4.00, 0.75, -0.00, -0.00, 1.00, 2.42],
    [0.25, 4.25, 0.75, -0.00, -0.00, 1.00, 2.23],
    [0.25, 4.50, 0.75, -0.00, -0.00, 1.00, 2.05],
    [0.25, 4.75, 0.75, -0.00, -0.00, 1.00, 1.93],
    [0.25, 5.00, 0.75, -0.00, -0.00, 1.00, 1.85],
    [0.25, 5.25, 0.75, -0.00, -0.00, 1.00, 1.77],
    [0.25, 5.50, 0.75, -0.00, -0.00, 1.00, 1.74],
    [0.50, 0.75, 0.75, -0.00, -0.00, 1.00, 43.34],
    [0.50, 1.00, 0.75, -0.00, -0.00, 1.00, 12.63],
    [0.50, 1.25, 0.75, -0.00, -0.00, 1.00, 10.13],
    [0.50, 1.50, 0.75, -0.00, -0.00, 1.00, 8.24],
    [0.50, 1.75, 0.75, -0.00, -0.00, 1.00, 6.87],
    [0.50, 2.00, 0.75, -0.00, -0.00, 1.00, 5.78],
    [0.50, 2.25, 0.75, -0.00, -0.00, 1.00, 4.95],
    [0.50, 2.50, 0.75, -0.00, -0.00, 1.00, 4.35],
    [0.50, 2.75, 0.75, -0.00, -0.00, 1.00, 3.89],
    [0.50, 3.00, 0.75, -0.00, -0.00, 1.00, 3.40],
    [0.50, 3.25, 0.75, -0.00, -0.00, 1.00, 3.10],
    [0.50, 3.50, 0.75, -0.00, -0.00, 1.00, 2.80],
    [0.50, 3.75, 0.75, -0.00, -0.00, 1.00, 2.58],
    [0.50, 4.00, 0.75, -0.00, -0.00, 1.00, 2.37],
    [0.50, 4.25, 0.75, -0.00, -0.00, 1.00, 2.14],
    [0.50, 4.50, 0.75, -0.00, -0.00, 1.00, 2.02],
    [0.50, 4.75, 0.75, -0.00, -0.00, 1.00, 1.90],
    [0.50, 5.00, 0.75, -0.00, -0.00, 1.00, 1.85],
    [0.50, 5.25, 0.75, -0.00, -0.00, 1.00, 1.76],
    [0.50, 5.50, 0.75, -0.00, -0.00, 1.00, 1.72],
    [0.75, 0.75, 0.75, -0.00, -0.00, 1.00, 42.56],
    [0.75, 1.00, 0.75, -0.00, -0.00, 1.00, 12.04],
    [0.75, 1.25, 0.75, -0.00, -0.00, 1.00, 9.62],
    [0.75, 1.50, 0.75, -0.00, -0.00, 1.00, 7.83],
    [0.75, 1.75, 0.75, -0.00, -0.00, 1.00, 6.53],
    [0.75, 2.00, 0.75, -0.00, -0.00, 1.00, 5.49],
    [0.75, 2.25, 0.75, -0.00, -0.00, 1.00, 4.77],
    [0.75, 2.50, 0.75, -0.00, -0.00, 1.00, 4.22],
    [0.75, 2.75, 0.75, -0.00, -0.00, 1.00, 3.75],
    [0.75, 3.00, 0.75, -0.00, -0.00, 1.00, 3.36],
    [0.75, 3.25, 0.75, -0.00, -0.00, 1.00, 3.01],
    [0.75, 3.50, 0.75, -0.00, -0.00, 1.00, 2.74],
    [0.75, 3.75, 0.75, -0.00, -0.00, 1.00, 2.56],
    [0.75, 4.00, 0.75, -0.00, -0.00, 1.00, 2.36],
    [0.75, 4.25, 0.75, -0.00, -0.00, 1.00, 2.15],
    [0.75, 4.50, 0.75, -0.00, -0.00, 1.00, 2.01],
    [0.75, 4.75, 0.75, -0.00, -0.00, 1.00, 1.89],
    [0.75, 5.00, 0.75, -0.00, -0.00, 1.00, 1.83],
    [0.75, 5.25, 0.75, -0.00, -0.00, 1.00, 1.75],
    [0.75, 5.50, 0.75, -0.00, -0.00, 1.00, 1.70],
    [1.00, 0.75, 0.75, -0.00, -0.00, 1.00, 41.36],
    [1.00, 1.00, 0.75, -0.00, -0.00, 1.00, 10.90],
    [1.00, 1.25, 0.75, -0.00, -0.00, 1.00, 8.78],
    [1.00, 1.50, 0.75, -0.00, -0.00, 1.00, 7.23],
    [1.00, 1.75, 0.75, -0.00, -0.00, 1.00, 5.95],
    [1.00, 2.00, 0.75, -0.00, -0.00, 1.00, 5.16],
    [1.00, 2.25, 0.75, -0.00, -0.00, 1.00, 4.49],
    [1.00, 2.50, 0.75, -0.00, -0.00, 1.00, 3.97],
    [1.00, 2.75, 0.75, -0.00, -0.00, 1.00, 3.57],
    [1.00, 3.00, 0.75, -0.00, -0.00, 1.00, 3.19],
    [1.00, 3.25, 0.75, -0.00, -0.00, 1.00, 2.92],
    [1.00, 3.50, 0.75, -0.00, -0.00, 1.00, 2.68],
    [1.00, 3.75, 0.75, -0.00, -0.00, 1.00, 2.50],
    [1.00, 4.00, 0.75, -0.00, -0.00, 1.00, 2.27],
    [1.00, 4.25, 0.75, -0.00, -0.00, 1.00, 2.11],
    [1.00, 4.50, 0.75, -0.00, -0.00, 1.00, 1.97],
    [1.00, 4.75, 0.75, -0.00, -0.00, 1.00, 1.86],
    [1.00, 5.00, 0.75, -0.00, -0.00, 1.00, 1.77],
    [1.00, 5.25, 0.75, -0.00, -0.00, 1.00, 1.68],
    [1.00, 5.50, 0.75, -0.00, -0.00, 1.00, 1.67],
    [1.25, 0.75, 0.75, -0.00, -0.00, 1.00, 11.79],
    [1.25, 1.00, 0.75, -0.00, -0.00, 1.00, 9.42],
    [1.25, 1.25, 0.75, -0.00, -0.00, 1.00, 7.63],
    [1.25, 1.50, 0.75, -0.00, -0.00, 1.00, 6.37],
    [1.25, 1.75, 0.75, -0.00, -0.00, 1.00, 5.53],
    [1.25, 2.00, 0.75, -0.00, -0.00, 1.00, 4.73],
    [1.25, 2.25, 0.75, -0.00, -0.00, 1.00, 4.18],
    [1.25, 2.50, 0.75, -0.00, -0.00, 1.00, 3.78],
    [1.25, 2.75, 0.75, -0.00, -0.00, 1.00, 3.37],
    [1.25, 3.00, 0.75, -0.00, -0.00, 1.00, 3.07],
    [1.25, 3.25, 0.75, -0.00, -0.00, 1.00, 2.83],
    [1.25, 3.50, 0.75, -0.00, -0.00, 1.00, 2.60],
    [1.25, 3.75, 0.75, -0.00, -0.00, 1.00, 2.43],
    [1.25, 4.00, 0.75, -0.00, -0.00, 1.00, 2.25],
    [1.25, 4.25, 0.75, -0.00, -0.00, 1.00, 2.07],
    [1.25, 4.50, 0.75, -0.00, -0.00, 1.00, 1.92],
    [1.25, 4.75, 0.75, -0.00, -0.00, 1.00, 1.82],
    [1.25, 5.00, 0.75, -0.00, -0.00, 1.00, 1.73],
    [1.25, 5.25, 0.75, -0.00, -0.00, 1.00, 1.68],
    [1.25, 5.50, 0.75, -0.00, -0.00, 1.00, 1.64],
    [1.50, 0.75, 0.75, -0.00, -0.00, 1.00, 9.02],
    [1.50, 1.00, 0.75, -0.00, -0.00, 1.00, 7.78],
    [1.50, 1.25, 0.75, -0.00, -0.00, 1.00, 6.52],
    [1.50, 1.50, 0.75, -0.00, -0.00, 1.00, 5.54],
    [1.50, 1.75, 0.75, -0.00, -0.00, 1.00, 4.88],
    [1.50, 2.00, 0.75, -0.00, -0.00, 1.00, 4.29],
    [1.50, 2.25, 0.75, -0.00, -0.00, 1.00, 3.85],
    [1.50, 2.50, 0.75, -0.00, -0.00, 1.00, 3.53],
    [1.50, 2.75, 0.75, -0.00, -0.00, 1.00, 3.21],
    [1.50, 3.00, 0.75, -0.00, -0.00, 1.00, 2.94],
    [1.50, 3.25, 0.75, -0.00, -0.00, 1.00, 2.71],
    [1.50, 3.50, 0.75, -0.00, -0.00, 1.00, 2.52],
    [1.50, 3.75, 0.75, -0.00, -0.00, 1.00, 2.36],
    [1.50, 4.00, 0.75, -0.00, -0.00, 1.00, 2.18],
    [1.50, 4.25, 0.75, -0.00, -0.00, 1.00, 1.98],
    [1.50, 4.50, 0.75, -0.00, -0.00, 1.00, 1.86],
    [1.50, 4.75, 0.75, -0.00, -0.00, 1.00, 1.77],
    [1.50, 5.00, 0.75, -0.00, -0.00, 1.00, 1.69],
    [1.50, 5.25, 0.75, -0.00, -0.00, 1.00, 1.64],
    [1.50, 5.50, 0.75, -0.00, -0.00, 1.00, 1.60],
    [1.75, 0.75, 0.75, -0.00, -0.00, 1.00, 6.14],
    [1.75, 1.00, 0.75, -0.00, -0.00, 1.00, 5.83],
    [1.75, 1.25, 0.75, -0.00, -0.00, 1.00, 5.18],
    [1.75, 1.50, 0.75, -0.00, -0.00, 1.00, 4.78],
    [1.75, 1.75, 0.75, -0.00, -0.00, 1.00, 4.38],
    [1.75, 2.00, 0.75, -0.00, -0.00, 1.00, 3.89],
    [1.75, 2.25, 0.75, -0.00, -0.00, 1.00, 3.58],
    [1.75, 2.50, 0.75, -0.00, -0.00, 1.00, 3.31],
    [1.75, 2.75, 0.75, -0.00, -0.00, 1.00, 3.00],
    [1.75, 3.00, 0.75, -0.00, -0.00, 1.00, 2.78],
    [1.75, 3.25, 0.75, -0.00, -0.00, 1.00, 2.58],
    [1.75, 3.50, 0.75, -0.00, -0.00, 1.00, 2.39],
    [1.75, 3.75, 0.75, -0.00, -0.00, 1.00, 2.22],
    [1.75, 4.00, 0.75, -0.00, -0.00, 1.00, 2.06],
    [1.75, 4.25, 0.75, -0.00, -0.00, 1.00, 1.92],
    [1.75, 4.50, 0.75, -0.00, -0.00, 1.00, 1.80],
    [1.75, 4.75, 0.75, -0.00, -0.00, 1.00, 1.74],
    [1.75, 5.00, 0.75, -0.00, -0.00, 1.00, 1.66],
    [1.75, 5.25, 0.75, -0.00, -0.00, 1.00, 1.58],
    [1.75, 5.50, 0.75, -0.00, -0.00, 1.00, 1.57],
    [2.00, 0.75, 0.75, -0.00, -0.00, 1.00, 4.21],
    [2.00, 1.00, 0.75, -0.00, -0.00, 1.00, 4.28],
    [2.00, 1.25, 0.75, -0.00, -0.00, 1.00, 4.29],
    [2.00, 1.50, 0.75, -0.00, -0.00, 1.00, 4.00],
    [2.00, 1.75, 0.75, -0.00, -0.00, 1.00, 3.81],
    [2.00, 2.00, 0.75, -0.00, -0.00, 1.00, 3.56],
    [2.00, 2.25, 0.75, -0.00, -0.00, 1.00, 3.28],
    [2.00, 2.50, 0.75, -0.00, -0.00, 1.00, 3.07],
    [2.00, 2.75, 0.75, -0.00, -0.00, 1.00, 2.85],
    [2.00, 3.00, 0.75, -0.00, -0.00, 1.00, 2.64],
    [2.00, 3.25, 0.75, -0.00, -0.00, 1.00, 2.46],
    [2.00, 3.50, 0.75, -0.00, -0.00, 1.00, 2.29],
    [2.00, 3.75, 0.75, -0.00, -0.00, 1.00, 2.14],
    [2.00, 4.00, 0.75, -0.00, -0.00, 1.00, 2.00],
    [2.00, 4.25, 0.75, -0.00, -0.00, 1.00, 1.86],
    [2.00, 4.50, 0.75, -0.00, -0.00, 1.00, 1.78],
    [2.00, 4.75, 0.75, -0.00, -0.00, 1.00, 1.69],
    [2.00, 5.00, 0.75, -0.00, -0.00, 1.00, 1.61],
    [2.00, 5.25, 0.75, -0.00, -0.00, 1.00, 1.53],
    [2.00, 5.50, 0.75, -0.00, -0.00, 1.00, 1.52],
    [2.25, 0.75, 0.75, -0.00, -0.00, 1.00, 3.19],
    [2.25, 1.00, 0.75, -0.00, -0.00, 1.00, 3.46],
    [2.25, 1.25, 0.75, -0.00, -0.00, 1.00, 3.53],
    [2.25, 1.50, 0.75, -0.00, -0.00, 1.00, 3.48],
    [2.25, 1.75, 0.75, -0.00, -0.00, 1.00, 3.34],
    [2.25, 2.00, 0.75, -0.00, -0.00, 1.00, 3.19],
    [2.25, 2.25, 0.75, -0.00, -0.00, 1.00, 3.04],
    [2.25, 2.50, 0.75, -0.00, -0.00, 1.00, 2.82],
    [2.25, 2.75, 0.75, -0.00, -0.00, 1.00, 2.65],
    [2.25, 3.00, 0.75, -0.00, -0.00, 1.00, 2.49],
    [2.25, 3.25, 0.75, -0.00, -0.00, 1.00, 2.34],
    [2.25, 3.50, 0.75, -0.00, -0.00, 1.00, 2.19],
    [2.25, 3.75, 0.75, -0.00, -0.00, 1.00, 2.07],
    [2.25, 4.00, 0.75, -0.00, -0.00, 1.00, 1.93],
    [2.25, 4.25, 0.75, -0.00, -0.00, 1.00, 1.82],
    [2.25, 4.50, 0.75, -0.00, -0.00, 1.00, 1.72],
    [2.25, 4.75, 0.75, -0.00, -0.00, 1.00, 1.63],
    [2.25, 5.00, 0.75, -0.00, -0.00, 1.00, 1.56],
    [2.25, 5.25, 0.75, -0.00, -0.00, 1.00, 1.50],
    [2.25, 5.50, 0.75, -0.00, -0.00, 1.00, 1.45],
    [2.50, 0.75, 0.75, -0.00, -0.00, 1.00, 2.70],
    [2.50, 1.00, 0.75, -0.00, -0.00, 1.00, 2.96],
    [2.50, 1.25, 0.75, -0.00, -0.00, 1.00, 3.12],
    [2.50, 1.50, 0.75, -0.00, -0.00, 1.00, 3.21],
    [2.50, 1.75, 0.75, -0.00, -0.00, 1.00, 3.06],
    [2.50, 2.00, 0.75, -0.00, -0.00, 1.00, 2.93],
    [2.50, 2.25, 0.75, -0.00, -0.00, 1.00, 2.83],
    [2.50, 2.50, 0.75, -0.00, -0.00, 1.00, 2.70],
    [2.50, 2.75, 0.75, -0.00, -0.00, 1.00, 2.54],
    [2.50, 3.00, 0.75, -0.00, -0.00, 1.00, 2.39],
    [2.50, 3.25, 0.75, -0.00, -0.00, 1.00, 2.25],
    [2.50, 3.50, 0.75, -0.00, -0.00, 1.00, 2.10],
    [2.50, 3.75, 0.75, -0.00, -0.00, 1.00, 1.98],
    [2.50, 4.00, 0.75, -0.00, -0.00, 1.00, 1.87],
    [2.50, 4.25, 0.75, -0.00, -0.00, 1.00, 1.76],
    [2.50, 4.50, 0.75, -0.00, -0.00, 1.00, 1.67],
    [2.50, 4.75, 0.75, -0.00, -0.00, 1.00, 1.58],
    [2.50, 5.00, 0.75, -0.00, -0.00, 1.00, 1.51],
    [2.50, 5.25, 0.75, -0.00, -0.00, 1.00, 1.44],
    [2.50, 5.50, 0.75, -0.00, -0.00, 1.00, 1.40]];


var grid_lux = [[-2.25, 0.75, 0.75, -0.00, -0.00, 1.00, 688.03],
    [-2.25, 1.00, 0.75, -0.00, -0.00, 1.00, 761.58],
    [-2.25, 1.25, 0.75, -0.00, -0.00, 1.00, 813.15],
    [-2.25, 1.50, 0.75, -0.00, -0.00, 1.00, 828.34],
    [-2.25, 1.75, 0.75, -0.00, -0.00, 1.00, 776.51],
    [-2.25, 2.00, 0.75, -0.00, -0.00, 1.00, 747.63],
    [-2.25, 2.25, 0.75, -0.00, -0.00, 1.00, 700.26],
    [-2.25, 2.50, 0.75, -0.00, -0.00, 1.00, 656.25],
    [-2.25, 2.75, 0.75, -0.00, -0.00, 1.00, 612.78],
    [-2.25, 3.00, 0.75, -0.00, -0.00, 1.00, 572.76],
    [-2.25, 3.25, 0.75, -0.00, -0.00, 1.00, 526.29],
    [-2.25, 3.50, 0.75, -0.00, -0.00, 1.00, 487.69],
    [-2.25, 3.75, 0.75, -0.00, -0.00, 1.00, 452.10],
    [-2.25, 4.00, 0.75, -0.00, -0.00, 1.00, 420.08],
    [-2.25, 4.25, 0.75, -0.00, -0.00, 1.00, 385.37],
    [-2.25, 4.50, 0.75, -0.00, -0.00, 1.00, 360.22],
    [-2.25, 4.75, 0.75, -0.00, -0.00, 1.00, 345.09],
    [-2.25, 5.00, 0.75, -0.00, -0.00, 1.00, 326.33],
    [-2.25, 5.25, 0.75, -0.00, -0.00, 1.00, 313.62],
    [-2.25, 5.50, 0.75, -0.00, -0.00, 1.00, 304.31],
    [-2.00, 0.75, 0.75, -0.00, -0.00, 1.00, 891.49],
    [-2.00, 1.00, 0.75, -0.00, -0.00, 1.00, 950.39],
    [-2.00, 1.25, 0.75, -0.00, -0.00, 1.00, 925.56],
    [-2.00, 1.50, 0.75, -0.00, -0.00, 1.00, 865.29],
    [-2.00, 1.75, 0.75, -0.00, -0.00, 1.00, 836.41],
    [-2.00, 2.00, 0.75, -0.00, -0.00, 1.00, 796.07],
    [-2.00, 2.25, 0.75, -0.00, -0.00, 1.00, 733.67],
    [-2.00, 2.50, 0.75, -0.00, -0.00, 1.00, 674.29],
    [-2.00, 2.75, 0.75, -0.00, -0.00, 1.00, 629.75],
    [-2.00, 3.00, 0.75, -0.00, -0.00, 1.00, 582.13],
    [-2.00, 3.25, 0.75, -0.00, -0.00, 1.00, 536.06],
    [-2.00, 3.50, 0.75, -0.00, -0.00, 1.00, 493.89],
    [-2.00, 3.75, 0.75, -0.00, -0.00, 1.00, 458.26],
    [-2.00, 4.00, 0.75, -0.00, -0.00, 1.00, 416.26],
    [-2.00, 4.25, 0.75, -0.00, -0.00, 1.00, 391.11],
    [-2.00, 4.50, 0.75, -0.00, -0.00, 1.00, 369.06],
    [-2.00, 4.75, 0.75, -0.00, -0.00, 1.00, 353.44],
    [-2.00, 5.00, 0.75, -0.00, -0.00, 1.00, 334.65],
    [-2.00, 5.25, 0.75, -0.00, -0.00, 1.00, 322.67],
    [-2.00, 5.50, 0.75, -0.00, -0.00, 1.00, 319.28],
    [-1.75, 0.75, 0.75, -0.00, -0.00, 1.00, 1313.46],
    [-1.75, 1.00, 0.75, -0.00, -0.00, 1.00, 1289.92],
    [-1.75, 1.25, 0.75, -0.00, -0.00, 1.00, 1184.26],
    [-1.75, 1.50, 0.75, -0.00, -0.00, 1.00, 1025.55],
    [-1.75, 1.75, 0.75, -0.00, -0.00, 1.00, 931.18],
    [-1.75, 2.00, 0.75, -0.00, -0.00, 1.00, 863.96],
    [-1.75, 2.25, 0.75, -0.00, -0.00, 1.00, 812.98],
    [-1.75, 2.50, 0.75, -0.00, -0.00, 1.00, 719.26],
    [-1.75, 2.75, 0.75, -0.00, -0.00, 1.00, 659.91],
    [-1.75, 3.00, 0.75, -0.00, -0.00, 1.00, 603.96],
    [-1.75, 3.25, 0.75, -0.00, -0.00, 1.00, 558.97],
    [-1.75, 3.50, 0.75, -0.00, -0.00, 1.00, 527.40],
    [-1.75, 3.75, 0.75, -0.00, -0.00, 1.00, 486.53],
    [-1.75, 4.00, 0.75, -0.00, -0.00, 1.00, 436.43],
    [-1.75, 4.25, 0.75, -0.00, -0.00, 1.00, 407.66],
    [-1.75, 4.50, 0.75, -0.00, -0.00, 1.00, 385.87],
    [-1.75, 4.75, 0.75, -0.00, -0.00, 1.00, 363.02],
    [-1.75, 5.00, 0.75, -0.00, -0.00, 1.00, 344.01],
    [-1.75, 5.25, 0.75, -0.00, -0.00, 1.00, 330.70],
    [-1.75, 5.50, 0.75, -0.00, -0.00, 1.00, 327.72],
    [-1.50, 0.75, 0.75, -0.00, -0.00, 1.00, 7413.82],
    [-1.50, 1.00, 0.75, -0.00, -0.00, 1.00, 1659.30],
    [-1.50, 1.25, 0.75, -0.00, -0.00, 1.00, 1430.67],
    [-1.50, 1.50, 0.75, -0.00, -0.00, 1.00, 1255.10],
    [-1.50, 1.75, 0.75, -0.00, -0.00, 1.00, 1092.78],
    [-1.50, 2.00, 0.75, -0.00, -0.00, 1.00, 949.66],
    [-1.50, 2.25, 0.75, -0.00, -0.00, 1.00, 835.45],
    [-1.50, 2.50, 0.75, -0.00, -0.00, 1.00, 759.98],
    [-1.50, 2.75, 0.75, -0.00, -0.00, 1.00, 683.78],
    [-1.50, 3.00, 0.75, -0.00, -0.00, 1.00, 624.92],
    [-1.50, 3.25, 0.75, -0.00, -0.00, 1.00, 580.58],
    [-1.50, 3.50, 0.75, -0.00, -0.00, 1.00, 540.19],
    [-1.50, 3.75, 0.75, -0.00, -0.00, 1.00, 485.97],
    [-1.50, 4.00, 0.75, -0.00, -0.00, 1.00, 444.47],
    [-1.50, 4.25, 0.75, -0.00, -0.00, 1.00, 415.30],
    [-1.50, 4.50, 0.75, -0.00, -0.00, 1.00, 392.02],
    [-1.50, 4.75, 0.75, -0.00, -0.00, 1.00, 366.86],
    [-1.50, 5.00, 0.75, -0.00, -0.00, 1.00, 351.33],
    [-1.50, 5.25, 0.75, -0.00, -0.00, 1.00, 338.18],
    [-1.50, 5.50, 0.75, -0.00, -0.00, 1.00, 337.81],
    [-1.25, 0.75, 0.75, -0.00, -0.00, 1.00, 7980.03],
    [-1.25, 1.00, 0.75, -0.00, -0.00, 1.00, 2047.50],
    [-1.25, 1.25, 0.75, -0.00, -0.00, 1.00, 1684.31],
    [-1.25, 1.50, 0.75, -0.00, -0.00, 1.00, 1400.21],
    [-1.25, 1.75, 0.75, -0.00, -0.00, 1.00, 1184.31],
    [-1.25, 2.00, 0.75, -0.00, -0.00, 1.00, 1011.91],
    [-1.25, 2.25, 0.75, -0.00, -0.00, 1.00, 907.19],
    [-1.25, 2.50, 0.75, -0.00, -0.00, 1.00, 810.85],
    [-1.25, 2.75, 0.75, -0.00, -0.00, 1.00, 717.88],
    [-1.25, 3.00, 0.75, -0.00, -0.00, 1.00, 648.94],
    [-1.25, 3.25, 0.75, -0.00, -0.00, 1.00, 597.83],
    [-1.25, 3.50, 0.75, -0.00, -0.00, 1.00, 547.26],
    [-1.25, 3.75, 0.75, -0.00, -0.00, 1.00, 503.11],
    [-1.25, 4.00, 0.75, -0.00, -0.00, 1.00, 465.34],
    [-1.25, 4.25, 0.75, -0.00, -0.00, 1.00, 427.57],
    [-1.25, 4.50, 0.75, -0.00, -0.00, 1.00, 397.52],
    [-1.25, 4.75, 0.75, -0.00, -0.00, 1.00, 374.46],
    [-1.25, 5.00, 0.75, -0.00, -0.00, 1.00, 359.72],
    [-1.25, 5.25, 0.75, -0.00, -0.00, 1.00, 345.19],
    [-1.25, 5.50, 0.75, -0.00, -0.00, 1.00, 344.33],
    [-1.00, 0.75, 0.75, -0.00, -0.00, 1.00, 8342.24],
    [-1.00, 1.00, 0.75, -0.00, -0.00, 1.00, 2293.05],
    [-1.00, 1.25, 0.75, -0.00, -0.00, 1.00, 1840.16],
    [-1.00, 1.50, 0.75, -0.00, -0.00, 1.00, 1546.61],
    [-1.00, 1.75, 0.75, -0.00, -0.00, 1.00, 1276.54],
    [-1.00, 2.00, 0.75, -0.00, -0.00, 1.00, 1095.25],
    [-1.00, 2.25, 0.75, -0.00, -0.00, 1.00, 951.48],
    [-1.00, 2.50, 0.75, -0.00, -0.00, 1.00, 839.55],
    [-1.00, 2.75, 0.75, -0.00, -0.00, 1.00, 745.94],
    [-1.00, 3.00, 0.75, -0.00, -0.00, 1.00, 662.90],
    [-1.00, 3.25, 0.75, -0.00, -0.00, 1.00, 612.32],
    [-1.00, 3.50, 0.75, -0.00, -0.00, 1.00, 555.35],
    [-1.00, 3.75, 0.75, -0.00, -0.00, 1.00, 512.00],
    [-1.00, 4.00, 0.75, -0.00, -0.00, 1.00, 474.29],
    [-1.00, 4.25, 0.75, -0.00, -0.00, 1.00, 427.71],
    [-1.00, 4.50, 0.75, -0.00, -0.00, 1.00, 404.59],
    [-1.00, 4.75, 0.75, -0.00, -0.00, 1.00, 380.17],
    [-1.00, 5.00, 0.75, -0.00, -0.00, 1.00, 364.90],
    [-1.00, 5.25, 0.75, -0.00, -0.00, 1.00, 351.01],
    [-1.00, 5.50, 0.75, -0.00, -0.00, 1.00, 343.36],
    [-0.75, 0.75, 0.75, -0.00, -0.00, 1.00, 8549.52],
    [-0.75, 1.00, 0.75, -0.00, -0.00, 1.00, 2436.97],
    [-0.75, 1.25, 0.75, -0.00, -0.00, 1.00, 1986.37],
    [-0.75, 1.50, 0.75, -0.00, -0.00, 1.00, 1640.71],
    [-0.75, 1.75, 0.75, -0.00, -0.00, 1.00, 1363.00],
    [-0.75, 2.00, 0.75, -0.00, -0.00, 1.00, 1152.82],
    [-0.75, 2.25, 0.75, -0.00, -0.00, 1.00, 993.33],
    [-0.75, 2.50, 0.75, -0.00, -0.00, 1.00, 870.57],
    [-0.75, 2.75, 0.75, -0.00, -0.00, 1.00, 788.13],
    [-0.75, 3.00, 0.75, -0.00, -0.00, 1.00, 704.75],
    [-0.75, 3.25, 0.75, -0.00, -0.00, 1.00, 624.44],
    [-0.75, 3.50, 0.75, -0.00, -0.00, 1.00, 566.72],
    [-0.75, 3.75, 0.75, -0.00, -0.00, 1.00, 521.67],
    [-0.75, 4.00, 0.75, -0.00, -0.00, 1.00, 474.03],
    [-0.75, 4.25, 0.75, -0.00, -0.00, 1.00, 440.16],
    [-0.75, 4.50, 0.75, -0.00, -0.00, 1.00, 406.29],
    [-0.75, 4.75, 0.75, -0.00, -0.00, 1.00, 385.03],
    [-0.75, 5.00, 0.75, -0.00, -0.00, 1.00, 364.75],
    [-0.75, 5.25, 0.75, -0.00, -0.00, 1.00, 345.56],
    [-0.75, 5.50, 0.75, -0.00, -0.00, 1.00, 345.87],
    [-0.50, 0.75, 0.75, -0.00, -0.00, 1.00, 8656.37],
    [-0.50, 1.00, 0.75, -0.00, -0.00, 1.00, 2558.37],
    [-0.50, 1.25, 0.75, -0.00, -0.00, 1.00, 2052.64],
    [-0.50, 1.50, 0.75, -0.00, -0.00, 1.00, 1699.36],
    [-0.50, 1.75, 0.75, -0.00, -0.00, 1.00, 1400.84],
    [-0.50, 2.00, 0.75, -0.00, -0.00, 1.00, 1179.49],
    [-0.50, 2.25, 0.75, -0.00, -0.00, 1.00, 1013.67],
    [-0.50, 2.50, 0.75, -0.00, -0.00, 1.00, 881.74],
    [-0.50, 2.75, 0.75, -0.00, -0.00, 1.00, 792.02],
    [-0.50, 3.00, 0.75, -0.00, -0.00, 1.00, 688.63],
    [-0.50, 3.25, 0.75, -0.00, -0.00, 1.00, 630.93],
    [-0.50, 3.50, 0.75, -0.00, -0.00, 1.00, 573.23],
    [-0.50, 3.75, 0.75, -0.00, -0.00, 1.00, 513.69],
    [-0.50, 4.00, 0.75, -0.00, -0.00, 1.00, 479.85],
    [-0.50, 4.25, 0.75, -0.00, -0.00, 1.00, 446.00],
    [-0.50, 4.50, 0.75, -0.00, -0.00, 1.00, 407.01],
    [-0.50, 4.75, 0.75, -0.00, -0.00, 1.00, 386.74],
    [-0.50, 5.00, 0.75, -0.00, -0.00, 1.00, 366.47],
    [-0.50, 5.25, 0.75, -0.00, -0.00, 1.00, 359.72],
    [-0.50, 5.50, 0.75, -0.00, -0.00, 1.00, 349.71],
    [-0.25, 0.75, 0.75, -0.00, -0.00, 1.00, 8677.85],
    [-0.25, 1.00, 0.75, -0.00, -0.00, 1.00, 2620.80],
    [-0.25, 1.25, 0.75, -0.00, -0.00, 1.00, 2092.29],
    [-0.25, 1.50, 0.75, -0.00, -0.00, 1.00, 1720.06],
    [-0.25, 1.75, 0.75, -0.00, -0.00, 1.00, 1434.46],
    [-0.25, 2.00, 0.75, -0.00, -0.00, 1.00, 1193.80],
    [-0.25, 2.25, 0.75, -0.00, -0.00, 1.00, 1026.43],
    [-0.25, 2.50, 0.75, -0.00, -0.00, 1.00, 898.35],
    [-0.25, 2.75, 0.75, -0.00, -0.00, 1.00, 800.28],
    [-0.25, 3.00, 0.75, -0.00, -0.00, 1.00, 713.90],
    [-0.25, 3.25, 0.75, -0.00, -0.00, 1.00, 630.06],
    [-0.25, 3.50, 0.75, -0.00, -0.00, 1.00, 569.40],
    [-0.25, 3.75, 0.75, -0.00, -0.00, 1.00, 528.45],
    [-0.25, 4.00, 0.75, -0.00, -0.00, 1.00, 485.54],
    [-0.25, 4.25, 0.75, -0.00, -0.00, 1.00, 441.39],
    [-0.25, 4.50, 0.75, -0.00, -0.00, 1.00, 411.83],
    [-0.25, 4.75, 0.75, -0.00, -0.00, 1.00, 385.32],
    [-0.25, 5.00, 0.75, -0.00, -0.00, 1.00, 370.78],
    [-0.25, 5.25, 0.75, -0.00, -0.00, 1.00, 360.77],
    [-0.25, 5.50, 0.75, -0.00, -0.00, 1.00, 350.76],
    [0.00, 0.75, 0.75, -0.00, -0.00, 1.00, 8688.07],
    [0.00, 1.00, 0.75, -0.00, -0.00, 1.00, 2603.16],
    [0.00, 1.25, 0.75, -0.00, -0.00, 1.00, 2110.87],
    [0.00, 1.50, 0.75, -0.00, -0.00, 1.00, 1723.66],
    [0.00, 1.75, 0.75, -0.00, -0.00, 1.00, 1443.55],
    [0.00, 2.00, 0.75, -0.00, -0.00, 1.00, 1195.18],
    [0.00, 2.25, 0.75, -0.00, -0.00, 1.00, 1021.65],
    [0.00, 2.50, 0.75, -0.00, -0.00, 1.00, 900.37],
    [0.00, 2.75, 0.75, -0.00, -0.00, 1.00, 796.83],
    [0.00, 3.00, 0.75, -0.00, -0.00, 1.00, 690.01],
    [0.00, 3.25, 0.75, -0.00, -0.00, 1.00, 629.50],
    [0.00, 3.50, 0.75, -0.00, -0.00, 1.00, 570.06],
    [0.00, 3.75, 0.75, -0.00, -0.00, 1.00, 518.57],
    [0.00, 4.00, 0.75, -0.00, -0.00, 1.00, 477.62],
    [0.00, 4.25, 0.75, -0.00, -0.00, 1.00, 441.76],
    [0.00, 4.50, 0.75, -0.00, -0.00, 1.00, 412.17],
    [0.00, 4.75, 0.75, -0.00, -0.00, 1.00, 382.57],
    [0.00, 5.00, 0.75, -0.00, -0.00, 1.00, 370.49],
    [0.00, 5.25, 0.75, -0.00, -0.00, 1.00, 354.51],
    [0.00, 5.50, 0.75, -0.00, -0.00, 1.00, 338.53],
    [0.25, 0.75, 0.75, -0.00, -0.00, 1.00, 8656.12],
    [0.25, 1.00, 0.75, -0.00, -0.00, 1.00, 2588.66],
    [0.25, 1.25, 0.75, -0.00, -0.00, 1.00, 2089.79],
    [0.25, 1.50, 0.75, -0.00, -0.00, 1.00, 1709.72],
    [0.25, 1.75, 0.75, -0.00, -0.00, 1.00, 1404.03],
    [0.25, 2.00, 0.75, -0.00, -0.00, 1.00, 1175.89],
    [0.25, 2.25, 0.75, -0.00, -0.00, 1.00, 1011.67],
    [0.25, 2.50, 0.75, -0.00, -0.00, 1.00, 892.26],
    [0.25, 2.75, 0.75, -0.00, -0.00, 1.00, 797.82],
    [0.25, 3.00, 0.75, -0.00, -0.00, 1.00, 710.73],
    [0.25, 3.25, 0.75, -0.00, -0.00, 1.00, 622.73],
    [0.25, 3.50, 0.75, -0.00, -0.00, 1.00, 563.92],
    [0.25, 3.75, 0.75, -0.00, -0.00, 1.00, 520.92],
    [0.25, 4.00, 0.75, -0.00, -0.00, 1.00, 479.56],
    [0.25, 4.25, 0.75, -0.00, -0.00, 1.00, 441.73],
    [0.25, 4.50, 0.75, -0.00, -0.00, 1.00, 405.70],
    [0.25, 4.75, 0.75, -0.00, -0.00, 1.00, 382.57],
    [0.25, 5.00, 0.75, -0.00, -0.00, 1.00, 367.85],
    [0.25, 5.25, 0.75, -0.00, -0.00, 1.00, 351.85],
    [0.25, 5.50, 0.75, -0.00, -0.00, 1.00, 344.90],
    [0.50, 0.75, 0.75, -0.00, -0.00, 1.00, 8596.13],
    [0.50, 1.00, 0.75, -0.00, -0.00, 1.00, 2505.12],
    [0.50, 1.25, 0.75, -0.00, -0.00, 1.00, 2008.73],
    [0.50, 1.50, 0.75, -0.00, -0.00, 1.00, 1634.87],
    [0.50, 1.75, 0.75, -0.00, -0.00, 1.00, 1362.32],
    [0.50, 2.00, 0.75, -0.00, -0.00, 1.00, 1146.21],
    [0.50, 2.25, 0.75, -0.00, -0.00, 1.00, 982.60],
    [0.50, 2.50, 0.75, -0.00, -0.00, 1.00, 862.91],
    [0.50, 2.75, 0.75, -0.00, -0.00, 1.00, 771.20],
    [0.50, 3.00, 0.75, -0.00, -0.00, 1.00, 673.81],
    [0.50, 3.25, 0.75, -0.00, -0.00, 1.00, 615.00],
    [0.50, 3.50, 0.75, -0.00, -0.00, 1.00, 554.32],
    [0.50, 3.75, 0.75, -0.00, -0.00, 1.00, 511.46],
    [0.50, 4.00, 0.75, -0.00, -0.00, 1.00, 470.19],
    [0.50, 4.25, 0.75, -0.00, -0.00, 1.00, 425.05],
    [0.50, 4.50, 0.75, -0.00, -0.00, 1.00, 401.05],
    [0.50, 4.75, 0.75, -0.00, -0.00, 1.00, 377.05],
    [0.50, 5.00, 0.75, -0.00, -0.00, 1.00, 366.00],
    [0.50, 5.25, 0.75, -0.00, -0.00, 1.00, 348.30],
    [0.50, 5.50, 0.75, -0.00, -0.00, 1.00, 341.47],
    [0.75, 0.75, 0.75, -0.00, -0.00, 1.00, 8441.36],
    [0.75, 1.00, 0.75, -0.00, -0.00, 1.00, 2387.85],
    [0.75, 1.25, 0.75, -0.00, -0.00, 1.00, 1908.23],
    [0.75, 1.50, 0.75, -0.00, -0.00, 1.00, 1552.32],
    [0.75, 1.75, 0.75, -0.00, -0.00, 1.00, 1295.36],
    [0.75, 2.00, 0.75, -0.00, -0.00, 1.00, 1089.18],
    [0.75, 2.25, 0.75, -0.00, -0.00, 1.00, 945.68],
    [0.75, 2.50, 0.75, -0.00, -0.00, 1.00, 837.40],
    [0.75, 2.75, 0.75, -0.00, -0.00, 1.00, 742.89],
    [0.75, 3.00, 0.75, -0.00, -0.00, 1.00, 666.66],
    [0.75, 3.25, 0.75, -0.00, -0.00, 1.00, 597.42],
    [0.75, 3.50, 0.75, -0.00, -0.00, 1.00, 544.03],
    [0.75, 3.75, 0.75, -0.00, -0.00, 1.00, 506.95],
    [0.75, 4.00, 0.75, -0.00, -0.00, 1.00, 467.94],
    [0.75, 4.25, 0.75, -0.00, -0.00, 1.00, 425.85],
    [0.75, 4.50, 0.75, -0.00, -0.00, 1.00, 397.85],
    [0.75, 4.75, 0.75, -0.00, -0.00, 1.00, 374.83],
    [0.75, 5.00, 0.75, -0.00, -0.00, 1.00, 362.22],
    [0.75, 5.25, 0.75, -0.00, -0.00, 1.00, 346.78],
    [0.75, 5.50, 0.75, -0.00, -0.00, 1.00, 336.62],
    [1.00, 0.75, 0.75, -0.00, -0.00, 1.00, 8202.43],
    [1.00, 1.00, 0.75, -0.00, -0.00, 1.00, 2161.35],
    [1.00, 1.25, 0.75, -0.00, -0.00, 1.00, 1741.27],
    [1.00, 1.50, 0.75, -0.00, -0.00, 1.00, 1433.93],
    [1.00, 1.75, 0.75, -0.00, -0.00, 1.00, 1180.60],
    [1.00, 2.00, 0.75, -0.00, -0.00, 1.00, 1023.09],
    [1.00, 2.25, 0.75, -0.00, -0.00, 1.00, 890.67],
    [1.00, 2.50, 0.75, -0.00, -0.00, 1.00, 786.67],
    [1.00, 2.75, 0.75, -0.00, -0.00, 1.00, 707.48],
    [1.00, 3.00, 0.75, -0.00, -0.00, 1.00, 632.90],
    [1.00, 3.25, 0.75, -0.00, -0.00, 1.00, 579.57],
    [1.00, 3.50, 0.75, -0.00, -0.00, 1.00, 530.85],
    [1.00, 3.75, 0.75, -0.00, -0.00, 1.00, 495.77],
    [1.00, 4.00, 0.75, -0.00, -0.00, 1.00, 450.76],
    [1.00, 4.25, 0.75, -0.00, -0.00, 1.00, 418.15],
    [1.00, 4.50, 0.75, -0.00, -0.00, 1.00, 390.83],
    [1.00, 4.75, 0.75, -0.00, -0.00, 1.00, 368.98],
    [1.00, 5.00, 0.75, -0.00, -0.00, 1.00, 350.54],
    [1.00, 5.25, 0.75, -0.00, -0.00, 1.00, 333.62],
    [1.00, 5.50, 0.75, -0.00, -0.00, 1.00, 331.25],
    [1.25, 0.75, 0.75, -0.00, -0.00, 1.00, 2338.32],
    [1.25, 1.00, 0.75, -0.00, -0.00, 1.00, 1868.54],
    [1.25, 1.25, 0.75, -0.00, -0.00, 1.00, 1513.21],
    [1.25, 1.50, 0.75, -0.00, -0.00, 1.00, 1263.45],
    [1.25, 1.75, 0.75, -0.00, -0.00, 1.00, 1096.59],
    [1.25, 2.00, 0.75, -0.00, -0.00, 1.00, 938.12],
    [1.25, 2.25, 0.75, -0.00, -0.00, 1.00, 829.60],
    [1.25, 2.50, 0.75, -0.00, -0.00, 1.00, 750.38],
    [1.25, 2.75, 0.75, -0.00, -0.00, 1.00, 669.12],
    [1.25, 3.00, 0.75, -0.00, -0.00, 1.00, 609.05],
    [1.25, 3.25, 0.75, -0.00, -0.00, 1.00, 561.09],
    [1.25, 3.50, 0.75, -0.00, -0.00, 1.00, 515.90],
    [1.25, 3.75, 0.75, -0.00, -0.00, 1.00, 482.56],
    [1.25, 4.00, 0.75, -0.00, -0.00, 1.00, 446.60],
    [1.25, 4.25, 0.75, -0.00, -0.00, 1.00, 410.46],
    [1.25, 4.50, 0.75, -0.00, -0.00, 1.00, 380.27],
    [1.25, 4.75, 0.75, -0.00, -0.00, 1.00, 361.84],
    [1.25, 5.00, 0.75, -0.00, -0.00, 1.00, 343.41],
    [1.25, 5.25, 0.75, -0.00, -0.00, 1.00, 333.31],
    [1.25, 5.50, 0.75, -0.00, -0.00, 1.00, 324.51],
    [1.50, 0.75, 0.75, -0.00, -0.00, 1.00, 1788.79],
    [1.50, 1.00, 0.75, -0.00, -0.00, 1.00, 1543.38],
    [1.50, 1.25, 0.75, -0.00, -0.00, 1.00, 1293.94],
    [1.50, 1.50, 0.75, -0.00, -0.00, 1.00, 1098.50],
    [1.50, 1.75, 0.75, -0.00, -0.00, 1.00, 968.24],
    [1.50, 2.00, 0.75, -0.00, -0.00, 1.00, 850.19],
    [1.50, 2.25, 0.75, -0.00, -0.00, 1.00, 764.10],
    [1.50, 2.50, 0.75, -0.00, -0.00, 1.00, 700.87],
    [1.50, 2.75, 0.75, -0.00, -0.00, 1.00, 637.08],
    [1.50, 3.00, 0.75, -0.00, -0.00, 1.00, 583.15],
    [1.50, 3.25, 0.75, -0.00, -0.00, 1.00, 538.02],
    [1.50, 3.50, 0.75, -0.00, -0.00, 1.00, 499.01],
    [1.50, 3.75, 0.75, -0.00, -0.00, 1.00, 468.50],
    [1.50, 4.00, 0.75, -0.00, -0.00, 1.00, 432.55],
    [1.50, 4.25, 0.75, -0.00, -0.00, 1.00, 392.36],
    [1.50, 4.50, 0.75, -0.00, -0.00, 1.00, 369.04],
    [1.50, 4.75, 0.75, -0.00, -0.00, 1.00, 350.27],
    [1.50, 5.00, 0.75, -0.00, -0.00, 1.00, 334.87],
    [1.50, 5.25, 0.75, -0.00, -0.00, 1.00, 326.09],
    [1.50, 5.50, 0.75, -0.00, -0.00, 1.00, 317.31],
    [1.75, 0.75, 0.75, -0.00, -0.00, 1.00, 1218.33],
    [1.75, 1.00, 0.75, -0.00, -0.00, 1.00, 1156.43],
    [1.75, 1.25, 0.75, -0.00, -0.00, 1.00, 1026.53],
    [1.75, 1.50, 0.75, -0.00, -0.00, 1.00, 948.32],
    [1.75, 1.75, 0.75, -0.00, -0.00, 1.00, 868.63],
    [1.75, 2.00, 0.75, -0.00, -0.00, 1.00, 771.58],
    [1.75, 2.25, 0.75, -0.00, -0.00, 1.00, 710.54],
    [1.75, 2.50, 0.75, -0.00, -0.00, 1.00, 655.57],
    [1.75, 2.75, 0.75, -0.00, -0.00, 1.00, 595.25],
    [1.75, 3.00, 0.75, -0.00, -0.00, 1.00, 550.83],
    [1.75, 3.25, 0.75, -0.00, -0.00, 1.00, 511.94],
    [1.75, 3.50, 0.75, -0.00, -0.00, 1.00, 474.70],
    [1.75, 3.75, 0.75, -0.00, -0.00, 1.00, 439.81],
    [1.75, 4.00, 0.75, -0.00, -0.00, 1.00, 407.94],
    [1.75, 4.25, 0.75, -0.00, -0.00, 1.00, 380.86],
    [1.75, 4.50, 0.75, -0.00, -0.00, 1.00, 356.67],
    [1.75, 4.75, 0.75, -0.00, -0.00, 1.00, 345.82],
    [1.75, 5.00, 0.75, -0.00, -0.00, 1.00, 329.76],
    [1.75, 5.25, 0.75, -0.00, -0.00, 1.00, 313.69],
    [1.75, 5.50, 0.75, -0.00, -0.00, 1.00, 310.44],
    [2.00, 0.75, 0.75, -0.00, -0.00, 1.00, 834.58],
    [2.00, 1.00, 0.75, -0.00, -0.00, 1.00, 848.78],
    [2.00, 1.25, 0.75, -0.00, -0.00, 1.00, 850.95],
    [2.00, 1.50, 0.75, -0.00, -0.00, 1.00, 793.80],
    [2.00, 1.75, 0.75, -0.00, -0.00, 1.00, 755.45],
    [2.00, 2.00, 0.75, -0.00, -0.00, 1.00, 706.11],
    [2.00, 2.25, 0.75, -0.00, -0.00, 1.00, 651.16],
    [2.00, 2.50, 0.75, -0.00, -0.00, 1.00, 609.30],
    [2.00, 2.75, 0.75, -0.00, -0.00, 1.00, 565.91],
    [2.00, 3.00, 0.75, -0.00, -0.00, 1.00, 524.36],
    [2.00, 3.25, 0.75, -0.00, -0.00, 1.00, 487.40],
    [2.00, 3.50, 0.75, -0.00, -0.00, 1.00, 453.34],
    [2.00, 3.75, 0.75, -0.00, -0.00, 1.00, 425.24],
    [2.00, 4.00, 0.75, -0.00, -0.00, 1.00, 396.63],
    [2.00, 4.25, 0.75, -0.00, -0.00, 1.00, 368.07],
    [2.00, 4.50, 0.75, -0.00, -0.00, 1.00, 352.21],
    [2.00, 4.75, 0.75, -0.00, -0.00, 1.00, 336.15],
    [2.00, 5.00, 0.75, -0.00, -0.00, 1.00, 320.08],
    [2.00, 5.25, 0.75, -0.00, -0.00, 1.00, 304.21],
    [2.00, 5.50, 0.75, -0.00, -0.00, 1.00, 301.32],
    [2.25, 0.75, 0.75, -0.00, -0.00, 1.00, 632.94],
    [2.25, 1.00, 0.75, -0.00, -0.00, 1.00, 686.12],
    [2.25, 1.25, 0.75, -0.00, -0.00, 1.00, 700.00],
    [2.25, 1.50, 0.75, -0.00, -0.00, 1.00, 689.79],
    [2.25, 1.75, 0.75, -0.00, -0.00, 1.00, 661.66],
    [2.25, 2.00, 0.75, -0.00, -0.00, 1.00, 631.72],
    [2.25, 2.25, 0.75, -0.00, -0.00, 1.00, 602.62],
    [2.25, 2.50, 0.75, -0.00, -0.00, 1.00, 559.87],
    [2.25, 2.75, 0.75, -0.00, -0.00, 1.00, 525.52],
    [2.25, 3.00, 0.75, -0.00, -0.00, 1.00, 494.14],
    [2.25, 3.25, 0.75, -0.00, -0.00, 1.00, 463.17],
    [2.25, 3.50, 0.75, -0.00, -0.00, 1.00, 433.72],
    [2.25, 3.75, 0.75, -0.00, -0.00, 1.00, 410.30],
    [2.25, 4.00, 0.75, -0.00, -0.00, 1.00, 381.93],
    [2.25, 4.25, 0.75, -0.00, -0.00, 1.00, 359.96],
    [2.25, 4.50, 0.75, -0.00, -0.00, 1.00, 341.27],
    [2.25, 4.75, 0.75, -0.00, -0.00, 1.00, 323.80],
    [2.25, 5.00, 0.75, -0.00, -0.00, 1.00, 309.32],
    [2.25, 5.25, 0.75, -0.00, -0.00, 1.00, 297.08],
    [2.25, 5.50, 0.75, -0.00, -0.00, 1.00, 288.12],
    [2.50, 0.75, 0.75, -0.00, -0.00, 1.00, 535.58],
    [2.50, 1.00, 0.75, -0.00, -0.00, 1.00, 587.26],
    [2.50, 1.25, 0.75, -0.00, -0.00, 1.00, 618.57],
    [2.50, 1.50, 0.75, -0.00, -0.00, 1.00, 636.99],
    [2.50, 1.75, 0.75, -0.00, -0.00, 1.00, 607.08],
    [2.50, 2.00, 0.75, -0.00, -0.00, 1.00, 580.55],
    [2.50, 2.25, 0.75, -0.00, -0.00, 1.00, 561.98],
    [2.50, 2.50, 0.75, -0.00, -0.00, 1.00, 536.05],
    [2.50, 2.75, 0.75, -0.00, -0.00, 1.00, 504.61],
    [2.50, 3.00, 0.75, -0.00, -0.00, 1.00, 474.60],
    [2.50, 3.25, 0.75, -0.00, -0.00, 1.00, 446.50],
    [2.50, 3.50, 0.75, -0.00, -0.00, 1.00, 417.05],
    [2.50, 3.75, 0.75, -0.00, -0.00, 1.00, 392.24],
    [2.50, 4.00, 0.75, -0.00, -0.00, 1.00, 370.30],
    [2.50, 4.25, 0.75, -0.00, -0.00, 1.00, 348.82],
    [2.50, 4.50, 0.75, -0.00, -0.00, 1.00, 331.81],
    [2.50, 4.75, 0.75, -0.00, -0.00, 1.00, 313.39],
    [2.50, 5.00, 0.75, -0.00, -0.00, 1.00, 300.18],
    [2.50, 5.25, 0.75, -0.00, -0.00, 1.00, 284.93],
    [2.50, 5.50, 0.75, -0.00, -0.00, 1.00, 278.19]]



var grid_gaps = [[-2.25, 0.75, 0.75, -0.00, -0.00, 1.00, 688.03],
    [-2.25, 1.00, 0.75, -0.00, -0.00, 1.00, 761.58],
    [-2.25, 1.25, 0.75, -0.00, -0.00, 1.00, 813.15],
    [-2.25, 1.50, 0.75, -0.00, -0.00, 1.00, 828.34],
    [-2.25, 1.75, 0.75, -0.00, -0.00, 1.00, 776.51],
    [-2.25, 2.00, 0.75, -0.00, -0.00, 1.00, 747.63],
    [-2.25, 2.25, 0.75, -0.00, -0.00, 1.00, 700.26],
    [-2.25, 2.50, 0.75, -0.00, -0.00, 1.00, 656.25],
    [-2.25, 2.75, 0.75, -0.00, -0.00, 1.00, 612.78],
    [-2.25, 3.00, 0.75, -0.00, -0.00, 1.00, 572.76],
    [-2.25, 3.25, 0.75, -0.00, -0.00, 1.00, 526.29],
    [-2.25, 3.50, 0.75, -0.00, -0.00, 1.00, 487.69],
    [-2.25, 3.75, 0.75, -0.00, -0.00, 1.00, 452.10],
    [-2.25, 4.50, 0.75, -0.00, -0.00, 1.00, 360.22],
    [-2.25, 4.75, 0.75, -0.00, -0.00, 1.00, 345.09],
    [-2.25, 5.00, 0.75, -0.00, -0.00, 1.00, 326.33],
    [-2.25, 5.25, 0.75, -0.00, -0.00, 1.00, 313.62],
    [-2.25, 5.50, 0.75, -0.00, -0.00, 1.00, 304.31],
    [-2.00, 0.75, 0.75, -0.00, -0.00, 1.00, 891.49],
    [-2.00, 1.00, 0.75, -0.00, -0.00, 1.00, 950.39],
    [-2.00, 1.25, 0.75, -0.00, -0.00, 1.00, 925.56],
    [-2.00, 1.50, 0.75, -0.00, -0.00, 1.00, 865.29],
    [-2.00, 1.75, 0.75, -0.00, -0.00, 1.00, 836.41],
    [-2.00, 2.00, 0.75, -0.00, -0.00, 1.00, 796.07],
    [-2.00, 2.25, 0.75, -0.00, -0.00, 1.00, 733.67],
    [-2.00, 2.50, 0.75, -0.00, -0.00, 1.00, 674.29],
    [-2.00, 2.75, 0.75, -0.00, -0.00, 1.00, 629.75],
    [-2.00, 3.00, 0.75, -0.00, -0.00, 1.00, 582.13],
    [-2.00, 3.25, 0.75, -0.00, -0.00, 1.00, 536.06],
    [-2.00, 3.50, 0.75, -0.00, -0.00, 1.00, 493.89],
    [-2.00, 3.75, 0.75, -0.00, -0.00, 1.00, 458.26],
    [-2.00, 4.00, 0.75, -0.00, -0.00, 1.00, 416.26],
    [-2.00, 4.25, 0.75, -0.00, -0.00, 1.00, 391.11],
    [-2.00, 4.50, 0.75, -0.00, -0.00, 1.00, 369.06],
    [-2.00, 5.50, 0.75, -0.00, -0.00, 1.00, 319.28],
    [-1.75, 0.75, 0.75, -0.00, -0.00, 1.00, 1313.46],
    [-1.75, 1.00, 0.75, -0.00, -0.00, 1.00, 1289.92],
    [-1.75, 1.25, 0.75, -0.00, -0.00, 1.00, 1184.26],
    [-1.75, 1.50, 0.75, -0.00, -0.00, 1.00, 1025.55],
    [-1.75, 1.75, 0.75, -0.00, -0.00, 1.00, 931.18],
    [-1.75, 2.00, 0.75, -0.00, -0.00, 1.00, 863.96],
    [-1.75, 2.25, 0.75, -0.00, -0.00, 1.00, 812.98],
    [-1.75, 2.50, 0.75, -0.00, -0.00, 1.00, 719.26],
    [-1.75, 3.75, 0.75, -0.00, -0.00, 1.00, 486.53],
    [-1.75, 4.00, 0.75, -0.00, -0.00, 1.00, 436.43],
    [-1.75, 4.25, 0.75, -0.00, -0.00, 1.00, 407.66],
    [-1.75, 4.50, 0.75, -0.00, -0.00, 1.00, 385.87],
    [-1.75, 4.75, 0.75, -0.00, -0.00, 1.00, 363.02],
    [-1.75, 5.00, 0.75, -0.00, -0.00, 1.00, 344.01],
    [-1.75, 5.25, 0.75, -0.00, -0.00, 1.00, 330.70],
    [-1.75, 5.50, 0.75, -0.00, -0.00, 1.00, 327.72],
    [-1.50, 0.75, 0.75, -0.00, -0.00, 1.00, 7413.82],
    [-1.50, 1.00, 0.75, -0.00, -0.00, 1.00, 1659.30],
    [-1.50, 1.25, 0.75, -0.00, -0.00, 1.00, 1430.67],
    [-1.50, 1.50, 0.75, -0.00, -0.00, 1.00, 1255.10],
    [-1.50, 1.75, 0.75, -0.00, -0.00, 1.00, 1092.78],
    [-1.50, 2.00, 0.75, -0.00, -0.00, 1.00, 949.66],
    [-1.50, 2.25, 0.75, -0.00, -0.00, 1.00, 835.45],
    [-1.50, 2.50, 0.75, -0.00, -0.00, 1.00, 759.98],
    [-1.50, 2.75, 0.75, -0.00, -0.00, 1.00, 683.78],
    [-1.50, 3.00, 0.75, -0.00, -0.00, 1.00, 624.92],
    [-1.50, 3.25, 0.75, -0.00, -0.00, 1.00, 580.58],
    [-1.50, 3.50, 0.75, -0.00, -0.00, 1.00, 540.19],
    [-1.50, 3.75, 0.75, -0.00, -0.00, 1.00, 485.97],
    [-1.50, 4.00, 0.75, -0.00, -0.00, 1.00, 444.47],
    [-1.50, 4.25, 0.75, -0.00, -0.00, 1.00, 415.30],
    [-1.25, 2.25, 0.75, -0.00, -0.00, 1.00, 907.19],
    [-1.25, 2.50, 0.75, -0.00, -0.00, 1.00, 810.85],
    [-1.25, 2.75, 0.75, -0.00, -0.00, 1.00, 717.88],
    [-1.25, 3.00, 0.75, -0.00, -0.00, 1.00, 648.94],
    [-1.25, 3.25, 0.75, -0.00, -0.00, 1.00, 597.83],
    [-1.25, 3.50, 0.75, -0.00, -0.00, 1.00, 547.26],
    [-1.25, 3.75, 0.75, -0.00, -0.00, 1.00, 503.11],
    [-1.25, 4.00, 0.75, -0.00, -0.00, 1.00, 465.34],
    [-1.25, 4.25, 0.75, -0.00, -0.00, 1.00, 427.57],
    [-1.25, 4.50, 0.75, -0.00, -0.00, 1.00, 397.52],
    [-1.25, 4.75, 0.75, -0.00, -0.00, 1.00, 374.46],
    [-1.25, 5.00, 0.75, -0.00, -0.00, 1.00, 359.72],
    [-1.25, 5.25, 0.75, -0.00, -0.00, 1.00, 345.19],
    [-1.25, 5.50, 0.75, -0.00, -0.00, 1.00, 344.33],
    [-1.00, 0.75, 0.75, -0.00, -0.00, 1.00, 8342.24],
    [-1.00, 1.00, 0.75, -0.00, -0.00, 1.00, 2293.05],
    [-1.00, 1.25, 0.75, -0.00, -0.00, 1.00, 1840.16],
    [-1.00, 1.50, 0.75, -0.00, -0.00, 1.00, 1546.61],
    [-1.00, 1.75, 0.75, -0.00, -0.00, 1.00, 1276.54],
    [-1.00, 5.25, 0.75, -0.00, -0.00, 1.00, 351.01],
    [-1.00, 5.50, 0.75, -0.00, -0.00, 1.00, 343.36],
    [-0.75, 0.75, 0.75, -0.00, -0.00, 1.00, 8549.52],
    [-0.75, 1.00, 0.75, -0.00, -0.00, 1.00, 2436.97],
    [-0.75, 1.25, 0.75, -0.00, -0.00, 1.00, 1986.37],
    [-0.75, 1.50, 0.75, -0.00, -0.00, 1.00, 1640.71],
    [-0.75, 1.75, 0.75, -0.00, -0.00, 1.00, 1363.00],
    [-0.75, 2.00, 0.75, -0.00, -0.00, 1.00, 1152.82],
    [-0.75, 2.25, 0.75, -0.00, -0.00, 1.00, 993.33],
    [-0.75, 2.50, 0.75, -0.00, -0.00, 1.00, 870.57],
    [-0.75, 2.75, 0.75, -0.00, -0.00, 1.00, 788.13],
    [-0.75, 3.00, 0.75, -0.00, -0.00, 1.00, 704.75],
    [-0.75, 3.25, 0.75, -0.00, -0.00, 1.00, 624.44],
    [-0.75, 3.50, 0.75, -0.00, -0.00, 1.00, 566.72],
    [-0.75, 3.75, 0.75, -0.00, -0.00, 1.00, 521.67],
    [-0.75, 4.00, 0.75, -0.00, -0.00, 1.00, 474.03],
    [-0.75, 4.25, 0.75, -0.00, -0.00, 1.00, 440.16],
    [-0.75, 4.50, 0.75, -0.00, -0.00, 1.00, 406.29],
    [-0.75, 4.75, 0.75, -0.00, -0.00, 1.00, 385.03],
    [-0.75, 5.00, 0.75, -0.00, -0.00, 1.00, 364.75],
    [-0.75, 5.25, 0.75, -0.00, -0.00, 1.00, 345.56],
    [-0.75, 5.50, 0.75, -0.00, -0.00, 1.00, 345.87],
    [-0.50, 0.75, 0.75, -0.00, -0.00, 1.00, 8656.37],
    [-0.50, 1.00, 0.75, -0.00, -0.00, 1.00, 2558.37],
    [-0.50, 1.25, 0.75, -0.00, -0.00, 1.00, 2052.64],
    [-0.50, 1.50, 0.75, -0.00, -0.00, 1.00, 1699.36],
    [-0.50, 1.75, 0.75, -0.00, -0.00, 1.00, 1400.84],
    [-0.25, 3.50, 0.75, -0.00, -0.00, 1.00, 569.40],
    [-0.25, 3.75, 0.75, -0.00, -0.00, 1.00, 528.45],
    [-0.25, 4.00, 0.75, -0.00, -0.00, 1.00, 485.54],
    [-0.25, 4.25, 0.75, -0.00, -0.00, 1.00, 441.39],
    [-0.25, 4.50, 0.75, -0.00, -0.00, 1.00, 411.83],
    [-0.25, 4.75, 0.75, -0.00, -0.00, 1.00, 385.32],
    [-0.25, 5.00, 0.75, -0.00, -0.00, 1.00, 370.78],
    [-0.25, 5.25, 0.75, -0.00, -0.00, 1.00, 360.77],
    [-0.25, 5.50, 0.75, -0.00, -0.00, 1.00, 350.76],
    [0.00, 0.75, 0.75, -0.00, -0.00, 1.00, 8688.07],
    [0.00, 1.00, 0.75, -0.00, -0.00, 1.00, 2603.16],
    [0.00, 1.25, 0.75, -0.00, -0.00, 1.00, 2110.87],
    [0.00, 1.50, 0.75, -0.00, -0.00, 1.00, 1723.66],
    [0.00, 1.75, 0.75, -0.00, -0.00, 1.00, 1443.55],
    [0.00, 2.00, 0.75, -0.00, -0.00, 1.00, 1195.18],
    [0.00, 2.25, 0.75, -0.00, -0.00, 1.00, 1021.65],
    [0.00, 2.50, 0.75, -0.00, -0.00, 1.00, 900.37],
    [0.00, 2.75, 0.75, -0.00, -0.00, 1.00, 796.83],
    [0.00, 3.00, 0.75, -0.00, -0.00, 1.00, 690.01],
    [0.00, 3.25, 0.75, -0.00, -0.00, 1.00, 629.50],
    [0.00, 3.50, 0.75, -0.00, -0.00, 1.00, 570.06],
    [0.00, 3.75, 0.75, -0.00, -0.00, 1.00, 518.57],
    [0.00, 4.00, 0.75, -0.00, -0.00, 1.00, 477.62],
    [0.00, 4.25, 0.75, -0.00, -0.00, 1.00, 441.76],
    [0.00, 4.50, 0.75, -0.00, -0.00, 1.00, 412.17],
    [0.00, 4.75, 0.75, -0.00, -0.00, 1.00, 382.57],
    [0.00, 5.00, 0.75, -0.00, -0.00, 1.00, 370.49],
    [0.00, 5.25, 0.75, -0.00, -0.00, 1.00, 354.51],
    [0.00, 5.50, 0.75, -0.00, -0.00, 1.00, 338.53],
    [0.25, 0.75, 0.75, -0.00, -0.00, 1.00, 8656.12],
    [0.25, 1.00, 0.75, -0.00, -0.00, 1.00, 2588.66],
    [0.25, 1.25, 0.75, -0.00, -0.00, 1.00, 2089.79],
    [0.25, 1.50, 0.75, -0.00, -0.00, 1.00, 1709.72],
    [0.25, 1.75, 0.75, -0.00, -0.00, 1.00, 1404.03],
    [0.25, 2.00, 0.75, -0.00, -0.00, 1.00, 1175.89],
    [0.25, 2.25, 0.75, -0.00, -0.00, 1.00, 1011.67],
    [0.25, 2.50, 0.75, -0.00, -0.00, 1.00, 892.26],
    [0.25, 2.75, 0.75, -0.00, -0.00, 1.00, 797.82],
    [0.25, 3.00, 0.75, -0.00, -0.00, 1.00, 710.73],
    [0.25, 3.25, 0.75, -0.00, -0.00, 1.00, 622.73],
    [0.25, 3.50, 0.75, -0.00, -0.00, 1.00, 563.92],
    [0.25, 3.75, 0.75, -0.00, -0.00, 1.00, 520.92],
    [0.25, 4.00, 0.75, -0.00, -0.00, 1.00, 479.56],
    [0.25, 4.25, 0.75, -0.00, -0.00, 1.00, 441.73],
    [0.25, 4.50, 0.75, -0.00, -0.00, 1.00, 405.70],
    [0.25, 4.75, 0.75, -0.00, -0.00, 1.00, 382.57],
    [0.25, 5.00, 0.75, -0.00, -0.00, 1.00, 367.85],
    [0.25, 5.25, 0.75, -0.00, -0.00, 1.00, 351.85],
    [0.25, 5.50, 0.75, -0.00, -0.00, 1.00, 344.90],
    [0.50, 0.75, 0.75, -0.00, -0.00, 1.00, 8596.13],
    [0.50, 1.00, 0.75, -0.00, -0.00, 1.00, 2505.12],
    [0.50, 1.25, 0.75, -0.00, -0.00, 1.00, 2008.73],
    [0.50, 1.50, 0.75, -0.00, -0.00, 1.00, 1634.87],
    [0.50, 1.75, 0.75, -0.00, -0.00, 1.00, 1362.32],
    [0.50, 2.00, 0.75, -0.00, -0.00, 1.00, 1146.21],
    [0.50, 2.25, 0.75, -0.00, -0.00, 1.00, 982.60],
    [0.50, 2.50, 0.75, -0.00, -0.00, 1.00, 862.91],
    [0.50, 2.75, 0.75, -0.00, -0.00, 1.00, 771.20],
    [0.50, 3.00, 0.75, -0.00, -0.00, 1.00, 673.81],
    [0.50, 3.25, 0.75, -0.00, -0.00, 1.00, 615.00],
    [0.50, 3.50, 0.75, -0.00, -0.00, 1.00, 554.32],
    [0.50, 3.75, 0.75, -0.00, -0.00, 1.00, 511.46],
    [0.50, 4.00, 0.75, -0.00, -0.00, 1.00, 470.19],
    [0.50, 4.25, 0.75, -0.00, -0.00, 1.00, 425.05],
    [0.50, 4.50, 0.75, -0.00, -0.00, 1.00, 401.05],
    [0.50, 4.75, 0.75, -0.00, -0.00, 1.00, 377.05],
    [0.50, 5.00, 0.75, -0.00, -0.00, 1.00, 366.00],
    [0.50, 5.25, 0.75, -0.00, -0.00, 1.00, 348.30],
    [0.50, 5.50, 0.75, -0.00, -0.00, 1.00, 341.47],
    [0.75, 0.75, 0.75, -0.00, -0.00, 1.00, 8441.36],
    [0.75, 1.00, 0.75, -0.00, -0.00, 1.00, 2387.85],
    [0.75, 1.25, 0.75, -0.00, -0.00, 1.00, 1908.23],
    [0.75, 1.50, 0.75, -0.00, -0.00, 1.00, 1552.32],
    [0.75, 1.75, 0.75, -0.00, -0.00, 1.00, 1295.36],
    [0.75, 2.00, 0.75, -0.00, -0.00, 1.00, 1089.18],
    [0.75, 2.25, 0.75, -0.00, -0.00, 1.00, 945.68],
    [0.75, 2.50, 0.75, -0.00, -0.00, 1.00, 837.40],
    [0.75, 2.75, 0.75, -0.00, -0.00, 1.00, 742.89],
    [0.75, 3.00, 0.75, -0.00, -0.00, 1.00, 666.66],
    [0.75, 3.25, 0.75, -0.00, -0.00, 1.00, 597.42],
    [0.75, 3.50, 0.75, -0.00, -0.00, 1.00, 544.03],
    [0.75, 3.75, 0.75, -0.00, -0.00, 1.00, 506.95],
    [0.75, 4.00, 0.75, -0.00, -0.00, 1.00, 467.94],
    [0.75, 4.25, 0.75, -0.00, -0.00, 1.00, 425.85],
    [0.75, 4.50, 0.75, -0.00, -0.00, 1.00, 397.85],
    [0.75, 4.75, 0.75, -0.00, -0.00, 1.00, 374.83],
    [0.75, 5.00, 0.75, -0.00, -0.00, 1.00, 362.22],
    [0.75, 5.25, 0.75, -0.00, -0.00, 1.00, 346.78],
    [0.75, 5.50, 0.75, -0.00, -0.00, 1.00, 336.62],
    [1.75, 0.75, 0.75, -0.00, -0.00, 1.00, 1218.33],
    [1.75, 1.00, 0.75, -0.00, -0.00, 1.00, 1156.43],
    [1.75, 1.25, 0.75, -0.00, -0.00, 1.00, 1026.53],
    [1.75, 1.50, 0.75, -0.00, -0.00, 1.00, 948.32],
    [1.75, 1.75, 0.75, -0.00, -0.00, 1.00, 868.63],
    [1.75, 2.00, 0.75, -0.00, -0.00, 1.00, 771.58],
    [1.75, 2.25, 0.75, -0.00, -0.00, 1.00, 710.54],
    [1.75, 2.50, 0.75, -0.00, -0.00, 1.00, 655.57],
    [1.75, 2.75, 0.75, -0.00, -0.00, 1.00, 595.25],
    [1.75, 3.00, 0.75, -0.00, -0.00, 1.00, 550.83],
    [1.75, 3.25, 0.75, -0.00, -0.00, 1.00, 511.94],
    [1.75, 3.50, 0.75, -0.00, -0.00, 1.00, 474.70],
    [1.75, 3.75, 0.75, -0.00, -0.00, 1.00, 439.81],
    [1.75, 4.00, 0.75, -0.00, -0.00, 1.00, 407.94],
    [1.75, 4.25, 0.75, -0.00, -0.00, 1.00, 380.86],
    [1.75, 4.50, 0.75, -0.00, -0.00, 1.00, 356.67],
    [1.75, 4.75, 0.75, -0.00, -0.00, 1.00, 345.82],
    [2.00, 2.00, 0.75, -0.00, -0.00, 1.00, 706.11],
    [2.00, 2.25, 0.75, -0.00, -0.00, 1.00, 651.16],
    [2.00, 2.50, 0.75, -0.00, -0.00, 1.00, 609.30],
    [2.00, 2.75, 0.75, -0.00, -0.00, 1.00, 565.91],
    [2.00, 3.00, 0.75, -0.00, -0.00, 1.00, 524.36],
    [2.00, 3.25, 0.75, -0.00, -0.00, 1.00, 487.40],
    [2.00, 3.50, 0.75, -0.00, -0.00, 1.00, 453.34],
    [2.00, 3.75, 0.75, -0.00, -0.00, 1.00, 425.24],
    [2.00, 4.00, 0.75, -0.00, -0.00, 1.00, 396.63],
    [2.00, 4.25, 0.75, -0.00, -0.00, 1.00, 368.07],
    [2.25, 0.75, 0.75, -0.00, -0.00, 1.00, 632.94],
    [2.25, 1.00, 0.75, -0.00, -0.00, 1.00, 686.12],
    [2.25, 1.25, 0.75, -0.00, -0.00, 1.00, 700.00],
    [2.25, 1.50, 0.75, -0.00, -0.00, 1.00, 689.79],
    [2.25, 1.75, 0.75, -0.00, -0.00, 1.00, 661.66],
    [2.25, 2.00, 0.75, -0.00, -0.00, 1.00, 631.72],
    [2.25, 2.25, 0.75, -0.00, -0.00, 1.00, 602.62],
    [2.25, 2.50, 0.75, -0.00, -0.00, 1.00, 559.87],
    [2.25, 2.75, 0.75, -0.00, -0.00, 1.00, 525.52],
    [2.25, 3.00, 0.75, -0.00, -0.00, 1.00, 494.14],
    [2.25, 3.25, 0.75, -0.00, -0.00, 1.00, 463.17],
    [2.25, 3.50, 0.75, -0.00, -0.00, 1.00, 433.72],
    [2.25, 3.75, 0.75, -0.00, -0.00, 1.00, 410.30],
    [2.25, 4.00, 0.75, -0.00, -0.00, 1.00, 381.93],
    [2.25, 4.25, 0.75, -0.00, -0.00, 1.00, 359.96],
    [2.50, 0.75, 0.75, -0.00, -0.00, 1.00, 535.58],
    [2.50, 1.00, 0.75, -0.00, -0.00, 1.00, 587.26],
    [2.50, 1.25, 0.75, -0.00, -0.00, 1.00, 618.57],
    [2.50, 1.50, 0.75, -0.00, -0.00, 1.00, 636.99],
    [2.50, 1.75, 0.75, -0.00, -0.00, 1.00, 607.08],
    [2.50, 2.00, 0.75, -0.00, -0.00, 1.00, 580.55],
    [2.50, 2.25, 0.75, -0.00, -0.00, 1.00, 561.98],
    [2.50, 2.50, 0.75, -0.00, -0.00, 1.00, 536.05],
    [2.50, 2.75, 0.75, -0.00, -0.00, 1.00, 504.61],
    [2.50, 3.00, 0.75, -0.00, -0.00, 1.00, 474.60],
    [2.50, 3.25, 0.75, -0.00, -0.00, 1.00, 446.50],
    [2.50, 3.50, 0.75, -0.00, -0.00, 1.00, 417.05],
    [2.50, 3.75, 0.75, -0.00, -0.00, 1.00, 392.24],
    [2.50, 4.00, 0.75, -0.00, -0.00, 1.00, 370.30],
    [2.50, 4.25, 0.75, -0.00, -0.00, 1.00, 348.82]]
