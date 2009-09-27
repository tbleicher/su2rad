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

var su2rad = su2rad ? su2rad : new Object();
su2rad.grid = su2rad.grid ? su2rad.grid : new Object();

su2rad.grid.UniqueArray = function () {
    this.values = []
    this.length = 0;
}

su2rad.grid.UniqueArray.prototype.getValues = function() {
    return this.values;
}

su2rad.grid.UniqueArray.prototype.push = function(v) {
    if (this[v] == null) {
        this[v] = v;
        this.values.push(v);
        this.length = this.values.length;
    }
}

su2rad.grid.UniqueArray.prototype.sort = function(sortFunc) {
    this.values.sort(sortFunc);
}


su2rad.grid.GridPoint = function ( x,y,z,v ) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.v = v;
}

su2rad.grid.GridPoint.prototype.toString = function () {
    var text = "[x=" + this.x.toFixed(2) + " y=" + this.y.toFixed(2);
    text += " v=" + this.v.toFixed(2) + "]";
    return text;
}



su2rad.grid.DataRecord = function (line) {
    this.fields = line.split(',')
}

su2rad.grid.DataRecord.prototype.evaluate = function () {
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

su2rad.grid.DataRecord.prototype._checkValues = function () {
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

su2rad.grid.DataRecord.prototype.getDataByIndex = function (idx) {
    this.v = this.valuesByIndex[idx]
    this.value = this.valuesByIndex[idx]
    return this.valuesByIndex[idx]
}

su2rad.grid.DataRecord.prototype.getJulianDay = function () {
    var ndays = [0,31,59,90,120,151,181,212,243,273,304,334,365];
    if ( this.leapyear == true  && this.month > 2) {
        return ndays[this.month-1] + this.day + 1
    } else {
        return ndays[this.month-1] + this.day
    }
}

su2rad.grid.DataRecord.prototype.toString = function () {
    return "M=" + this.month + " D=" + this.day + " H=" + this.hour + " v=" + this.v.toFixed(2)
}




su2rad.grid.GridArray = function () {
    this.init()
}

su2rad.grid.GridArray.prototype.init = function () {
    this.bbox = null;
    this.cols = new su2rad.grid.UniqueArray();
    this.commentLines = [];
    this.filename = "";
    this.gridByY = {};
    this.rows = [];
    this.stats = {};
    this.triangles = []
    this.units = "unit"
    this.values = [];
    this.vertices = [];
    this._contourCache = {};
}

su2rad.grid.GridArray.prototype.addPoint = function (p) {
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
    this.gridByY[y].push( new su2rad.grid.GridPoint(x,y,p[2],value) );
    this.values.push(value)
    this.vertices.push( new su2rad.geom.Delaunay.Vertex(x,y,value) );
}

su2rad.grid.GridArray.prototype.addMinMax = function (x,y,v) {
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

su2rad.grid.GridArray.prototype.addRecord = function (p) {
    this.addMinMax(p.x, p.y, p.value)
    this.cols.push(p.x);
    if (this.gridByY[p.y] == null) {
        this.gridByY[p.y] = [];
        this.rows.push(p.y);
    }
    this.gridByY[p.y].push( p );
    this.values.push(p.value)
}

su2rad.grid.GridArray.prototype.analyzeGrid = function () {
    log.debug("analyzeGrid: " + this.vertices.length + " vertices")
    try {
        this.triangles = su2rad.geom.Delaunay.Triangulate( this.vertices );
        log.debug("analyzeGrid: " + this.triangles.length + " triangles")
    } catch (e) {
        logError(e)
    }
    this.calcStats();
    this.fillRows();
    this.sortArray();
}

su2rad.grid.GridArray.prototype.makeConvex = function() {
    if (this.triangles.length == 0) {
        return
    }
    //log.debug("makeConvex: triangles start=" + this.triangles.length)
    newtris = []
    ltris = []
    r2 = 0.25*0.25
    for (var i=0; i<this.triangles.length; i+=1) {
        var tri = this.triangles[i];
        if (tri.radius_squared > r2) {
            ltris.push(tri)
        } else {
            newtris.push(tri)
        }
    }
    log.debug("makeConvex: removed " + ltris.length + " of " + this.triangles.length + " triangles")
    this.triangles = newtris;
}

su2rad.grid.GridArray.prototype.setDataTypeIndex = function (idx) {
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
    
    this.values.sort(this.sortByFloatValue);
    this.bbox[4] = this.values[0]
    this.bbox[5] = this.values[this.values.length-1]
    log.debug("new value range: " + this.bbox[4].toFixed(2) + " - " + this.bbox[5].toFixed(2))
    this.calcStats();
}

su2rad.grid.GridArray.prototype.calcStats = function () {
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

su2rad.grid.GridArray.prototype.getStatsAsText = function () {
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

su2rad.grid.GridArray.prototype.empty = function () {
    if (this.bbox == null) {
        return true;
    } else {
        return false;
    }
}

su2rad.grid.GridArray.prototype.fillRows = function () {
    // fill gaps in rows with points of value -1
    this.cols.sort(this.sortByFloatValue);
    this.rows.sort(this.sortByFloatValue);
    for (var i=0; i<this.rows.length; i++) {
        //row = this[this.rows[i]]
        row = this.gridByY[this.rows[i]]
        row.sort(this.sortPointsByX);
        if (row.length != this.cols.length) {
            var x_coords = this.cols.getValues();
            // create new row with -1 value points
            var newRow = [];
            var y = this.rows[i];
            var z = 0.75;
            for (var j=0; j<x_coords.length; j++) {
                var p = new su2rad.grid.GridPoint(x_coords[j], y, z, -1);
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
            newRow.sort(this.sortPointsByX);
            //this[this.rows[i]] = newRow;
            this.gridByY[this.rows[i]] = newRow;
        }
    }
}

su2rad.grid.GridArray.prototype.generate = function () {
    // create values to display by formula
    var minX =          Math.floor(Math.random()*11) * 0.25
    var maxX = minX*2 + Math.floor(Math.random()*44) * 0.25
    var minY =          Math.floor(Math.random()*11) * 0.25
    var maxY = minY*2 + Math.floor(Math.random()*44) * 0.25
    
    var mag  = Math.pow(Math.random()*10, 3)
    var dz   = Math.random()
    var grid = new Array();
    
    var x=minX;
    while ( x < maxX ) {
        var y=minY;
        while ( y < maxY ) {
            var z = mag * ( dz + 0.2 * ( 1+Math.sin(x*2) ) / ( 1.3+Math.cos(y+1) ) )
            grid.push( [x,y,0.75,0,0,1,z] );
            y = y + 0.25;
        }
        x = x + 0.25;
    }
    // now read in like file based grid
    this.readArray(grid);
    //this.printStats();
}

su2rad.grid.GridArray.prototype.getArrayIndex = function (a,v) {
    for (var i=0; i<a.length; i++) {
        if (a[i] == v) {
            return i;
        }
    }
    return -1;
}

su2rad.grid.GridArray.prototype.getCommentLines = function () {
    return this.commentLines;
}

su2rad.grid.GridArray.prototype.getContourLinesAt = function (level) {
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

su2rad.grid.GridArray.prototype.getRows = function () {
    return this.rows
}

su2rad.grid.GridArray.prototype.getRowAt = function (yPosition) {
    try {
        var row = this.gridByY[yPosition];
        return row;
    } catch (e) {
        logError(e)
        return null;
    }
} 

su2rad.grid.GridArray.prototype.getStats = function () {
    return this.stats
}

su2rad.grid.GridArray.prototype.sortArray = function () {
    this.rows.sort(this.sortByFloatValue);
    this.rows.reverse();
    for (var i=0; i<this.rows.length; i++) {
        //this[this.rows[i]].sort(this.sortPointsByX);
        this.gridByY[this.rows[i]].sort(this.sortPointsByX);
        //this.gridByY[this.rows[i]].reverse();
    }
}

su2rad.grid.GridArray.prototype.sortByFloatValue = function (a,b) {
    return parseFloat(a)-parseFloat(b);
}

su2rad.grid.GridArray.prototype.sortPointsByX = function (a,b) {
    if (a.x < b.x) {
        return -1;
    }
    if (a.x > b.x) {
        return 1;
    }
    return 0;
}

su2rad.grid.GridArray.prototype.sortPointsByY = function (a,b) {
    if (a.y < b.y) {
        return -1;
    }
    if (a.y > b.y) {
        return 1;
    }
    return 0;
}

su2rad.grid.GridArray.prototype.parseText = function (text) {
    log.debug("parseText(): received " + text.length + " bytes")
    var re_cr = /\r/g
    var re_sp = /\s+/
    text = text.replace(re_cr, '');
    var lines = text.split("\n")
    log.debug("parseText(): " + lines.length + " lines")
    for (i=0; i<lines.length; i++) {
        try {
            var line = lines[i];
            // only whitespace
            var trimmed = line.replace(/^\s+|\s+$/g, '') ;
            if ( trimmed == "" ) {
                continue
            }
            // comment lines
            var idx = line.indexOf('#');
            if (idx == 0) {
                this.commentLines.push(line);
                continue;
            } else if (idx > 0) {
                line = line.slice(0, idx);
            }
            // split and parse fields
            var values = [];
            var rawparts = line.split(re_sp);
            for (var j=0; j<rawparts.length; j++) {
                var v = parseFloat(rawparts[j]);
                if ( ! isNaN(v) ) {
                    values.push(v);
                }
            }
            // only accept format we know
            if (values.length == 4 || values.length == 7) {
                this.addPoint(values);
            } else {
                log.error("parseText: unknown format of record (line " + (i+1) + "):<br/>'" + lines[i] + "'")
            }
        } catch (e) {
            logError(e)
        }
    }
    // finally create stats etc.
    this.analyzeGrid()
}

su2rad.grid.GridArray.prototype.printStats = function () {
    var text = "";
    text += "minValue= " + this.bbox[4].toFixed(2) + "<br/>";
    text += "maxValue= " + this.bbox[5].toFixed(2) + "<br/>";
    text += "rows= " + this.rows.length + "<br/>";
    text += "rows[0]= " + this.rows[0] + "<br/>";
    text += "rows[-1]= " + this.rows[this.rows.length-1];
    log.debug(text);
}

su2rad.grid.GridArray.prototype.readArray = function (gridarray) {
    this.init()
    for (var i=0; i<gridarray.length; i++) {
        this.addPoint(gridarray[i]);
    }
    this.analyzeGrid()
}

su2rad.grid.GridArray.prototype.getTable = function (tableid) {
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



