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
            var minx = min3( triangle.v0.z, triangle.v1.z, triangle.v2.z );
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
    
    // Internal: create a triangle that bounds the given vertices, with room to spare
    function CreateBoundingTriangle( vertices ) {

        // NOTE: There's a bit of a heuristic here. If the bounding triangle 
        // is too large and you see overflow/underflow errors. If it is too small 
        // you end up with a non-convex hull.
        
        var minx, miny, maxx, maxy;
        for( var i in vertices )
        {
            var vertex = vertices[i];
            if( minx === undefined || vertex.x < minx ) { minx = vertex.x; }
            if( miny === undefined || vertex.y < miny ) { miny = vertex.y; }
            if( maxx === undefined || vertex.x > maxx ) { maxx = vertex.x; }
            if( maxy === undefined || vertex.y > maxy ) { maxy = vertex.y; }
        }

        var dx = ( maxx - minx ) * 10;
        var dy = ( maxy - miny ) * 10;
        
        var stv0 = _Vertex( minx - dx,   miny - dy*3 , 0 );
        var stv1 = _Vertex( minx - dx,   maxy + dy   , 0 );
        var stv2 = _Vertex( maxx + dx*3, maxy + dy   , 0 );

        return Triangle( stv0, stv1, stv2 );
            
    } // CreateBoundingTriangle
    
    // Edge Class
    function Edge ( v0, v1 ) {
        return {
            'v0' : v0,
            'v1' : v1
        }	
    }

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
    } // UniqueEdges

    // Triangle Class
    function Triangle ( v0, v1, v2 ) {
        var triangle = {
            'v0' : v0,
            'v1' : v1,
            'v2' : v2,
            'z'  : (v0.z + v1.z + v2.z) / 3.0,
            'toString' : function() {
                var s = "tri [" + this.v0.x.toFixed(2) + "," + this.v0.y.toFixed(2) + "]"
                s += " [" + this.v1.x.toFixed(2) + "," + this.v1.y.toFixed(2) + "]"
                s += " [" + this.v2.x.toFixed(2) + "," + this.v2.y.toFixed(2) + "]"
                return s
            }
        }
        return CalcCircumcircle(triangle);
    };

    // Vertex Class
    function _Vertex (x,y,z) {
        return {
            'x' : x,
            'y' : y,
            'z' : z
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
        Triangulate : function ( vertices ) {
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

    } // end return
    
}();

