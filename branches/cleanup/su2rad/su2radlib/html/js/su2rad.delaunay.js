////////////////////////////////////////////////////////////////////////////////
//
// Delaunay Triangulation Code, by Joshua Bell
//
// Inspired by: http://www.codeguru.com/cpp/data/mfc_database/misc/article.php/c8901/
//
// This work is hereby released into the Public Domain. To view a copy of the public 
// domain dedication, visit http://creativecommons.org/licenses/publicdomain/ or send 
// a letter to Creative Commons, 171 Second Street, Suite 300, San Francisco, 
// California, 94105, USA.
//
// modified Aug 2009 by Thomas Bleicher to create Delaunay namespace
//
////////////////////////////////////////////////////////////////////////////////


su2rad.geom = su2rad.geom ? su2rad.geom : new Object();

su2rad.geom.Delaunay = function() {
    
    var EPSILON = 1.0e-6;

    function AddVertex( vertex, triangles ) {
        
        var edges = [];
        // Remove triangles with circumcircles containing the vertex
        for( var i=0; i<triangles.length; i++) {
            var triangle = triangles[i];
            if ( triangle ) {
                if ( InCircumcircle( triangle, vertex ) ) {
                    edges.push( Edge( triangle.v0, triangle.v1 ) );
                    edges.push( Edge( triangle.v1, triangle.v2 ) );
                    edges.push( Edge( triangle.v2, triangle.v0 ) );
                    delete triangles[i];
                }
            } else {
                delete triangles[i];
            }
        }
        
        var before = edges.length;
        edges = UniqueEdges( edges );
        
        // Create new triangles from the unique edges and new vertex
        for( var i=0; i<edges.length; i++ ) {
                var edge = edges[i];
                triangles.push( Triangle( edge.v0, edge.v1, vertex ) )
        }
            
        // return clean triangle array
        var newTriangles = []
        for( var i=0; i<triangles.length; i++) {
            if (triangles[i]) {
                newTriangles.push(triangles[i])
            }
        }
        return newTriangles;
        // AddVertex
    };
            
    // bounding box class
    function BBox2D ( xmin, xmax, ymin, ymax ) {
        return {
            'xmin' : xmin,
            'xmax' : xmax ? xmax : xmin,
            'ymin' : ymin,
            'ymax' : ymax ? ymax : ymin,
            'fit' : function ( o ) {
                if ( this.xmin <= o.xmin && this.xmax >= o.xmax && this.ymin <= o.ymin && this.ymax >= o.ymax ) {
                    return true
                }
                return false;
            },
            'hit' : function ( p ) {
                if ( this.xmin <= p.x && p.x <= this.xmax && this.ymin <= p.y && p.y <= this.ymax ) {
                    return true
                }
                return false;
            }
        }
    };

    function CalcCircumcircle(triangle) {   
	// From: http://www.exaflop.org/docs/cgafaq/cga1.html

	var A = triangle.v1.x - triangle.v0.x; 
	var B = triangle.v1.y - triangle.v0.y; 
	var C = triangle.v2.x - triangle.v0.x; 
	var D = triangle.v2.y - triangle.v0.y; 

	var E = A*(triangle.v0.x + triangle.v1.x) + B*(triangle.v0.y + triangle.v1.y); 
	var F = C*(triangle.v0.x + triangle.v2.x) + D*(triangle.v0.y + triangle.v2.y); 

	var G = 2.0*(A*(triangle.v2.y - triangle.v1.y)-B*(triangle.v2.x - triangle.v1.x)); 
	
	var dx, dy;
	
	if( Math.abs(G) < EPSILON ) {
            // Collinear - find extremes and use the midpoint

            var minx = min3( triangle.v0.x, triangle.v1.x, triangle.v2.x );
            var maxx = max3( triangle.v0.x, triangle.v1.x, triangle.v2.x );
            var miny = min3( triangle.v0.y, triangle.v1.y, triangle.v2.y );
            var maxy = max3( triangle.v0.y, triangle.v1.y, triangle.v2.y );
            var minz = min3( triangle.v0.z, triangle.v1.z, triangle.v2.z );
            var maxz = max3( triangle.v0.z, triangle.v1.z, triangle.v2.z );

            triangle.center = _Vertex( ( minx + maxx ) / 2, ( miny + maxy ) / 2, (minz+maxz)/2 );

            dx = triangle.center.x - minx;
            dy = triangle.center.y - miny;
                
	} else {
            var cx = (D*E - B*F) / G; 
            var cy = (A*F - C*E) / G;
            var cz = (triangle.v0.z + triangle.v1.z + triangle.v2.z) / 3;

            triangle.center = new _Vertex( cx, cy, cz );

            dx = triangle.center.x - triangle.v0.x;
            dy = triangle.center.y - triangle.v0.y;
	}

	triangle.radius_squared = dx * dx + dy * dy;
	triangle.radius = Math.sqrt( triangle.radius_squared );
        return triangle 
    };
    
    // Internal: create a triangle that bounds the given vertices,
    function CreateBoundingTriangle( vertices ) {
        
        var minx, miny, maxx, maxy;
        for( var i in vertices )
        {
            var vertex = vertices[i];
            if( minx === undefined || vertex.x < minx ) { minx = vertex.x; }
            if( miny === undefined || vertex.y < miny ) { miny = vertex.y; }
            if( maxx === undefined || vertex.x > maxx ) { maxx = vertex.x; }
            if( maxy === undefined || vertex.y > maxy ) { maxy = vertex.y; }
        }

        var dx = ( maxx - minx );
        var dy = ( maxy - miny );
        
        var stv0 = _Vertex( minx - 1,      maxy + 1,      0 );
        var stv1 = _Vertex( minx - 1,      miny - dy - 1, 0 );
        var stv2 = _Vertex( maxx + dx + 1, maxy + 1 ,     0 );

        return Triangle( stv0, stv1, stv2 );
            
    } // CreateBoundingTriangle
    
    // edge class
    function Edge ( v0, v1 ) {
        return {
            'v0' : v0,
            'v1' : v1,
            'getBBox' : function () {
                var xmin = (v0.x < v1.x) ? v0.x : v1.x 
                var xmax = (v0.x > v1.x) ? v0.x : v1.x 
                var ymin = (v0.y < v1.y) ? v0.y : v1.y 
                var ymax = (v0.y > v1.y) ? v0.y : v1.y 
                return new BBox2D( xmin,xmax,ymin,ymax )
            },
            'intersectsEdge' : function ( edge ) {
                // this is taken from Kevin Lindsey's Intersection.js 
                var a1 = this.v0;
                var a2 = this.v1;
                var b1 = edge.v0;
                var b2 = edge.v1;
                
                var ua_t = (b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x);
                var ub_t = (a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x);
                var u_b  = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y);

                if ( u_b != 0 ) {
                    var ua = ua_t / u_b;
                    var ub = ub_t / u_b;
                    if ( 0 <= ua && ua <= 1 && 0 <= ub && ub <= 1 ) {
                        return true;   
                    }
                }
                return false;
            },
            'onEdge' : function ( v ) {
                var xmin = (this.v0.x < this.v1.x) ? this.v0.x : this.v1.x
                var xmax = (this.v0.x > this.v1.x) ? this.v0.x : this.v1.x
                if ( xmin <= v.x && v.x <= xmax ) {
                    var ymin = (this.v0.y < this.v1.y) ? this.v0.y : this.v1.y
                    var ymax = (this.v0.y > this.v1.y) ? this.v0.y : this.v1.y
                    if ( ymin <= v.y && v.y <= ymax ) {
                        return true;
                    }
                }
                return false;
            },
            'toString' : function () {
                var s = "E [" + this.v0.x.toFixed(2) + "," + this.v0.y.toFixed(2) + "]"
                s += " - [" + this.v1.x.toFixed(2) + "," + this.v1.y.toFixed(2) + "]"
                return s
            }
        }	
    };

    // simplified "hit test"
    function InCircumcircle( triangle, v ) {
        var dx = triangle.center.x - v.x;
        var dy = triangle.center.y - v.y;
        var dist_squared = dx * dx + dy * dy;
        return ( dist_squared <= triangle.radius_squared );    
    }; 
    
    function max3( a, b, c ) {
        return ( a >= b && a >= c ) ? a : ( b >= a && b >= c ) ? b : c;
    };
    
    function min3( a, b, c ) { 
        return ( a <= b && a <= c ) ? a : ( b <= a && b <= c ) ? b : c; 
    };
        
    function RemoveBoundingTriangle(triangles, st) {
        // Remove triangles that share edges with "supertriangle"
        var newTriangles = [];
        for( var j=0; j<triangles.length; j++ ) {
            var triangle = triangles[j];

            if ( triangle.v0 == st.v0 || triangle.v0 == st.v1 || triangle.v0 == st.v2 ||
                    triangle.v1 == st.v0 || triangle.v1 == st.v1 || triangle.v1 == st.v2 ||
                    triangle.v2 == st.v0 || triangle.v2 == st.v1 || triangle.v2 == st.v2 ) {
                delete triangles[j];
            } else {
                newTriangles.push(triangles[j])
            }
        }
        return newTriangles;
    } 

    // eliminate double edges from list
    function UniqueEdges( edges ) {
        // TODO: This is O(n^2), make it O(n) with a hash or some such
        var uniqueEdges = [];
        for( var i=0; i<edges.length; i++ ) {
            var edge1 = edges[i];
            var unique = true;
            for( var j=0; j<edges.length; j++ ) {
                if ( i != j ) {
                    var edge2 = edges[j];
                    if (( edge1.v0 == edge2.v0 && edge1.v1 == edge2.v1 ) ||
                        ( edge1.v0 == edge2.v1 && edge1.v1 == edge2.v0 ) ) {
                        unique = false;
                        break;
                    }
                }
            }
            if ( unique ) {
                uniqueEdges.push( edge1 );
            }
        }
        return uniqueEdges;
    } 
    
    // create bounding box for triangle
    function TriangleBBox2D( t ) {
        var xmin = t.v0.x < t.v1.x ? t.v0.x : t.v1.x;
        xmin = xmin < t.v2.x ? xmin : t.v2.x;
        var xmax = t.v0.x > t.v1.x ? t.v0.x : t.v1.x;
        xmax = xmax > t.v2.x ? xmax : t.v2.x;
        var ymin = t.v0.y < t.v1.y ? t.v0.y : t.v1.y;
        ymin = ymin < t.v2.y ? ymin : t.v2.y;
        var ymax = t.v0.y > t.v1.y ? t.v0.y : t.v1.y;
        ymax = ymax > t.v2.y ? ymax : t.v2.y;
        return new BBox2D ( xmin, xmax, ymin, ymax );
    }

    // QuatTree node class
    function QuatTreeNode ( xmin, xmax, ymin, ymax, nodeid ) {
        return {
            'bbox' : new BBox2D ( xmin, xmax, ymin, ymax ),
            'nodeid': nodeid,
            'triangles' : [],
            'leaves': false,
            // add new subnodes to this node
            'addLeaves' : function () {
                if ( this.leaves === false ) {
                    var bbox = this.bbox;
                    var x1 = (bbox.xmin + bbox.xmax) / 2.0;
                    var y1 = (bbox.ymin + bbox.ymax) / 2.0;
                    this.leaves = [];
                    this.leaves.push( new QuatTreeNode( bbox.xmin, x1, bbox.ymin, y1, this.nodeid+"A") );
                    this.leaves.push( new QuatTreeNode( x1, bbox.xmax, bbox.ymin, y1, this.nodeid+"B") );
                    this.leaves.push( new QuatTreeNode( bbox.xmin, x1, y1, bbox.ymax, this.nodeid+"C") );
                    this.leaves.push( new QuatTreeNode( x1, bbox.xmax, y1, bbox.ymax, this.nodeid+"D") );
                }
                // check existing triangles against new nodes
                var oldTriangles = this.triangles;
                this.triangles = [];
                for (var i=0; i<oldTriangles.length; i++) {
                    var triangle = oldTriangles[i];
                    this.addTriangle(triangle);
                }
            },

            // add triangle to this node or subnodes based on bbox size
            'addTriangle' : function( triangle ) {
                if ( !triangle.bbox ) {
                    triangle.bbox = TriangleBBox2D( triangle )
                }
                if ( !this.bbox.fit(triangle.bbox) ) {
                    // does not fit in this box!
                    return false
                }
                if ( this.leaves ) {
                    for (var i=0; i<4; i++) {
                        if ( this.leaves[i].addTriangle(triangle) === true ) {
                            return true
                        }
                    }
                }
                // set parentNode property to this node (for remove() later)
                triangle.parentNode = this;
                this.triangles.push(triangle);
                // subdivide if there are more than 4 triangles
                if ( this.leaves === false && this.triangles.length > 4) {
                    this.addLeaves()
                }
                return true
            },

            // delete triangle from node list when it's subdivided
            'removeTriangle' : function( triangle ) {
                for (var j=0; j<this.triangles.length; j++) {
                    if ( triangle === this.triangles[j] ) {
                        this.triangles.splice(j,1)
                    }
                }
            },
            
            // accurate hit test for triangle
            'pointInTriangle' : function ( t, v ) {
                var e1 = new Edge( new _Vertex(t.bbox.xmin-1, v.y), v )
                var edges = [];
                edges.push( Edge( t.v0, t.v1 ) );
                edges.push( Edge( t.v1, t.v2 ) );
                edges.push( Edge( t.v2, t.v0 ) );
                var intersections = 0;
                for (var i=0; i<3; i++) {
                    if ( e1.intersectsEdge(edges[i]) === true ) {
                        intersections += 1;
                    }
                }
                if ( intersections === 1 ) {
                    return true;
                }
            },

            // add new vertex by dividing existing triangles
            'addVertex' : function( vertex ) {
                var edges = [];
                var triangles = this.getTrianglesAt( vertex );
                // split triangles with bbox overlapping the vertex
                for( var i=0; i<triangles.length; i++) {
                    var triangle = triangles[i];
                    if ( triangle ) {
                        if ( this.pointInTriangle( triangle, vertex ) ) {
                            edges.push( Edge( triangle.v0, triangle.v1 ) );
                            edges.push( Edge( triangle.v1, triangle.v2 ) );
                            edges.push( Edge( triangle.v2, triangle.v0 ) );
                            // remove triangle from parentNode.triangles
                            triangle.parentNode.removeTriangle(triangle);
                        }
                    }
                }
                // there should be only one triangle that overlaps with vertex;
                // if ( edges.length > 3 ) {
                //     log.warn("more than 3 edges");
                // }
                // Create new triangles from the unique edges and new vertex
                for( var i=0; i<edges.length; i++ ) {
                    var edge = edges[i];
                    var t = new Triangle( edge.v0, edge.v1, vertex );
                    this.addTriangle( t )
                }
            },
            
            // return all triangles in quattree
            'getTriangles' : function () {
                var triangles = []
                if ( this.leaves ) {
                    for (var i=0; i<4; i++) {
                        var leaf = this.leaves[i]
                        triangles = triangles.concat( leaf.getTriangles() );
                    }
                }
                triangles = triangles.concat( this.triangles );
                return triangles
            },

            // return triangles with bbox overlapping point
            'getTrianglesAt' : function( point ) {
                if ( !this.bbox.hit(point) ) {
                    return []
                }
                var triangles = []
                if ( this.leaves ) {
                    for (var i=0; i<4; i++) {
                        var leaf = this.leaves[i]
                        triangles = triangles.concat( leaf.getTrianglesAt(point) );
                    }
                }
                for ( var j=0; j<this.triangles.length; j++ ) {
                    var t = this.triangles[j];
                    if ( t.bbox.hit(point) ) {
                        triangles.push( t );
                    }
                }
                return triangles
            }
        }
    } // QuatTreeNode


    // Triangle Class
    function Triangle ( v0, v1, v2 ) {
        var triangle = {
            'v0' : v0,
            'v1' : v1,
            'v2' : v2,
            'z'  : (v0.z + v1.z + v2.z) / 3.0,
            'displayTriangles' : [],
            'draw' : function(ctx, colorgradient, indent) {
                if (this.displayTriangles.length == 0) {
                    color = colorgradient.getColorByValue(this.z)
                    ctx.fillStyle = color;
                    ctx.strokeStyle = color;
                    ctx.beginPath()
                    ctx.moveTo(this.v0.x, this.v0.y);
                    ctx.lineTo(this.v1.x, this.v1.y);
                    ctx.lineTo(this.v2.x, this.v2.y);
                    ctx.fill()
                    ctx.stroke()
                    ctx.closePath();
                } else {
                    indent = indent + "+"
                    for (var i=0; i<this.displayTriangles.length; i++) {
                        var dtri = this.displayTriangles[i];
                        dtri.draw(ctx, colorgradient, indent)
                    }
                }
            },
            'toString' : function() {
                var s = "T [" + this.v0.x.toFixed(2) + "," + this.v0.y.toFixed(2) + "]"
                s += " [" + this.v1.x.toFixed(2) + "," + this.v1.y.toFixed(2) + "]"
                s += " [" + this.v2.x.toFixed(2) + "," + this.v2.y.toFixed(2) + "]"
                return s
            },
            'getPointOnEdge' : function(v1,v2,level) {
                // get point between v1 and v2 where z==level
                var dz = v2.z - v1.z;
                var delta = (level-v1.z) / dz
                var x = v1.x + (v2.x-v1.x)*delta;
                var y = v1.y + (v2.y-v1.y)*delta;
                return [x,y,level]
            },
            'intersectAt' : function(level) {
                // get point of intersection at <level>
                var points = []
                try {
                    if (this.v0.z == level) {
                        points.push( [this.v0.x,this.v0.y,this.v0.z] )
                    }
                    if (this.v1.z == level) {
                        points.push( [this.v1.x,this.v1.y,this.v1.z] )
                    }
                    if (this.v2.z == level) {
                        points.push( [this.v2.x,this.v2.y,this.v2.z] )
                    }
                    if (this.v0.z < level && this.v1.z > level) {
                        points.push(this.getPointOnEdge(this.v0,this.v1,level))
                    }
                    if (this.v0.z < level && this.v2.z > level) {
                        points.push(this.getPointOnEdge(this.v0,this.v2,level))
                    }
                    if (this.v1.z < level && this.v0.z > level) {
                        points.push(this.getPointOnEdge(this.v1,this.v0,level))
                    }
                    if (this.v1.z < level && this.v2.z > level) {
                        points.push(this.getPointOnEdge(this.v1,this.v2,level))
                    }
                    if (this.v2.z < level && this.v0.z > level) {
                        points.push(this.getPointOnEdge(this.v2,this.v0,level))
                    }
                    if (this.v2.z < level && this.v1.z > level) {
                        points.push(this.getPointOnEdge(this.v2,this.v1,level))
                    }
                } catch (e) {
                    log.error(e)
                    return false
                }
                return points
            },
            'splitAt' : function(level) {
                try {
                    if (this.v0.z < level && this.v1.z < level) {
                        var p1 = this.getPointOnEdge(this.v0, this.v2, level)
                        p1 = _Vertex(p1[0],p1[1],p1[2])
                        var p2 = this.getPointOnEdge(this.v1, this.v2, level)
                        p2 = _Vertex(p2[0],p2[1],p2[2])
                        var tri1 = Triangle(this.v0, p1, this.v1)
                        var tri2 = Triangle(p1, p2, this.v1)
                        var tri3 = Triangle(this.v2, p2, p1)
                    } else if (this.v0.z < level && this.v2.z < level) {
                        var p1 = this.getPointOnEdge(this.v0, this.v1, level)
                        p1 = _Vertex(p1[0],p1[1],p1[2])
                        var p2 = this.getPointOnEdge(this.v2, this.v1, level)
                        p2 = _Vertex(p2[0],p2[1],p2[2])
                        var tri1 = Triangle(this.v0, p1, this.v2)
                        var tri2 = Triangle(p1, p2, this.v2)
                        var tri3 = Triangle(this.v1, p2, p1)
                    } else { 
                        // (this.v1.z < level && this.v2.z < level)
                        var p1 = this.getPointOnEdge(this.v1, this.v0, level)
                        p1 = _Vertex(p1[0],p1[1],p1[2])
                        var p2 = this.getPointOnEdge(this.v2, this.v0, level)
                        p2 = _Vertex(p2[0],p2[1],p2[2])
                        var tri1 = Triangle(this.v1, p1, this.v2)
                        var tri2 = Triangle(p1, p2, this.v2)
                        var tri3 = Triangle(this.v0, p2, p1)
                    }
                    this.displayTriangles = [tri1,tri2,tri3]
                } catch (e) {
                    logError(e)
                }
            }
        }
        return CalcCircumcircle(triangle);
    }
    
    
    // triangulation based on triangle arrays
    function TriangulateArray ( vertices ) {
        var triangles = [];
        
        // First, create a "supertriangle" that bounds all vertices
        var st = CreateBoundingTriangle( vertices );
        triangles.push( st );
        
        // Next, begin the triangulation one vertex at a time
        for( var i=0; i<vertices.length; i++ ) {
            // NOTE: This is O(n^2) - can be optimized by sorting vertices
            // along the x-axis and only considering triangles that have 
            // potentially overlapping circumcircles
            var vertex = vertices[i];
            triangles = AddVertex( vertex, triangles );
        }

        // return triangle without bounding triangles
        return RemoveBoundingTriangle(triangles, st)
    }
    
    
    // triangulation based on quattree 
    function TriangulateQuatTree ( vertices ) {
        
        // First, create a "supertriangle" that bounds all vertices
        var st = CreateBoundingTriangle( vertices );
        var bb = TriangleBBox2D( st );
        
        // create quattree root and add super triangle
        var qtree = QuatTreeNode( bb.xmin,bb.xmax,bb.ymin,bb.ymax, "0");
        qtree.addTriangle(st)

        // Next, begin the triangulation one vertex at a time
        for( var i=0; i<vertices.length; i++ ) {
            var vertex = vertices[i];
            qtree.addVertex( vertex );
        }

        // return triangle without bounding triangles
        var triangles = qtree.getTriangles();
        return RemoveBoundingTriangle(triangles, st)
    }


    // Vertex Class
    function _Vertex (x,y,z) {
        return {
            'x' : x,
            'y' : y,
            'z' : z,
            'toString' : function() {
                return "V [" + this.x.toFixed(2) + "," + this.y.toFixed(2) + "]"
            }
        }
    }; 

    // public methods
    return {
        
        //------------------------------------------------------------
        // Delaunay.Vertex
        // representation of 3D point as Delaunay object
        //------------------------------------------------------------
        Vertex : _Vertex,

        //------------------------------------------------------------
        // Delaunay.Triangulate
        // Perform the Delaunay Triangulation of a set of vertices.
        // vertices : Array of DelaunayVertex objects
        // returns  : Array of DelaunayTriangles
        //------------------------------------------------------------
        Triangulate : function (vertices) {
            var triangulate = TriangulateArray;
            if ( this.USEQUATTREE != 0 && vertices.length >= this.USEQUATTREE ) {
                triangulate = TriangulateQuatTree
            }
            return triangulate( vertices );
        },

        //------------------------------------------------------------
        // Delaunay.Triangulate
        // min vertices to start quattree triangulation (0=never)
        //------------------------------------------------------------
        'USEQUATTREE' : 0

    } // end return
    
}();

