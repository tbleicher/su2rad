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



// replace GridArray methods
GridArray.prototype.analyzeGrid = function () {
    log.debug("GridArray.weatherData.analyzeGrid()")
    this.calcStats();
    this.sortArray();
}

GridArray.prototype.parseText = function (text) {
    log.debug("GridArray.weatherData.parseText()")
    var re_cr = /\r/g
    text = text.replace(re_cr, '');
    var lines = text.split("\n")
    //log.debug("records: " + lines[7])
    for (var i=0; i<8; i++) {
        this.commentLines.push(lines[i]);
    }
    log.debug(this.commentLines.join("\n"))
    for (var i=8; i<lines.length; i++) {
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
    // finally create stats etc.
    this.analyzeGrid()
}



// modified draw methods for weather data plots
GridCanvas.prototype.drawGrid = function (ctx) {
    if ( this.array.bbox == null ) {
        return
    }

    ctx.save()
    // move to lower left corner of center frame
    this.setOrigin(ctx)
    var frame = this.getFrameCoords("center")
    var scaleX = frame[2]/(1+this.array.bbox[1]-this.array.bbox[0])
    var scaleY = frame[3]/24.0;
    ctx.scale(scaleX,-1*scaleY)
    ctx.lineWidth=1.1;
    var cnt = 0;
    var rows = this.array.getRows()
    for (var i=0; i<rows.length; i++) {
        var row = this.array.getRowAt(rows[i]);
        if ( row != null ) {
            for (var j=0; j<row.length; j++) {
                var point = row[j]
                if (point.v != 0.0) {
                    var color = this.gradient.getColorByValue(point.v);
                    try {
                        cnt += 1;
                        ctx.strokeStyle = color;
                        ctx.beginPath()
                        ctx.moveTo(point.x-0.5, point.y);
                        ctx.lineTo(point.x-0.5, point.y+1);
                        ctx.stroke()
                    } catch (e) {
                        log.error("point.x=" + point.x + " point.y=" + point.y)
                        logError(e)
                    }
                }
            }
        }
    }
    ctx.restore()
}

GridCanvas.prototype._drawRulerX = function (ctx) {
    ctx.save()
    var frame = this.getFrameCoords("bottom") 
    var cFrame = this.getFrameCoords("center")
    ctx.translate(cFrame[0],frame[1]);
    var scaleX = cFrame[2]/this.array.bbox[1]

    // draw ruler along x  
    var ticksize = 5;
    var labels = new Array();   // stores [label,x,y] for ctx.fillText() loop
    
    // draw tick marks and store pixel positions for lables
    var xmax = this.array.bbox[1]
    var xbase = this.array.bbox[0] - this.gridstep/2;
    ctx.lineWidth = 1.5;
    ctx.beginPath()
    ctx.moveTo(0, 0);
    ctx.lineTo(xmax*scaleX, 0);
    ctx.stroke()
    this.labelText(ctx,"[days]","right",xmax*scaleX-40,-6,38,12);
    
    ctx.lineWidth = 1.0;
    var months = ['Jan','Feb','Mar','Apr','May','June','July','Aug','Sep','Oct','Nov','Dec']
    var ndays =  [0,31,59,90,120,151,181,212,243,273,304,334,365];
    ctx.beginPath()
    for (var x=0; x<=12; x++) {
        var xtick = ndays[x]*scaleX;
        ctx.moveTo(xtick, 0);
        ctx.lineTo(xtick, ticksize);                     
        if ( x<12 ) {
            var wLabel = ctx.measureText(months[x]).width;
            var dDays = (ndays[x+1]-ndays[x]) / 2.0
            labels.push([months[x], xtick+dDays*scaleX-wLabel/2, frame[3]]);
        }
    }
    ctx.stroke()
    
    // add labels
    for (var i=0; i<labels.length; i++) {
        var p=labels[i]
        ctx.fillText(p[0], p[1], p[2]);
    }
    ctx.restore()    
}

GridCanvas.prototype._drawRulerY = function (ctx) {
    ctx.save()
    var frame = this.getFrameCoords("left") 
    ctx.translate(frame[0]+frame[2],frame[1]+frame[3]);

    var ticksize = 5;
    var labels = new Array();   // stores [label,x,y] for ctx.fillText() loop
    
    // draw ruler along y
    var ymax = (this.array.bbox[3]-this.array.bbox[2] + this.gridstep) * this.canvasscale
    var ybase = this.array.bbox[2] - this.gridstep/2;
    ctx.lineWidth = 1.5;
    ctx.beginPath()
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -1*frame[3]);
    ctx.stroke()
    ctx.lineWidth = 1.0;
    this.labelText(ctx,"[hours]","left",4,-1*frame[3]+10,40,12);
    
    ctx.beginPath()
    var xlabel = -1*this.ruler.left+2;
    for (var i=1; i<24; i+=1) {
        var ytick = -1*i*frame[3]/24;
        ctx.moveTo(-1*ticksize, ytick);          
        ctx.lineTo(0,ytick);
        labels.push([i.toFixed(), xlabel, ytick+3]);
    }
    ctx.stroke()
    
    // add labels
    for (var i=0; i<labels.length; i++) {
        var p=labels[i]
        ctx.fillText(p[0], p[1], p[2]);
    }
    ctx.restore()    
}

GridCanvas.prototype.drawRulersOLD = function (ctx) {
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
    
    for (var i=0; i<labels.length; i++) {
        var p=labels[i]
        ctx.fillText(p[0], p[1], p[2]);
    }
    ctx.restore()    
}

// return available height for graph
GridCanvas.prototype.getGraphHeight = function () {    
    var maxHeight = this.canvas.height - this.margin.top - this.margin.bottom
    if (this.ruler.top != 0) { maxHeight = maxHeight - this.ruler.top - this.padding }
    if (this.ruler.bottom != 0) { maxHeight = maxHeight - this.ruler.bottom - this.padding }
    return maxHeight;
}

// return fixed scale
GridCanvas.prototype.setScale = function () {    
    this.canvasscale = 1.0;
}

