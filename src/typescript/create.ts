/**
 * Functions working with coordinates in geojson files.
 */

/**
 *
 */

import * as turf from "@turf/turf";

/*

Drawing functions ******************************************************************************************************************************

*/

/**
 * Draws a point using (x,y) coordinates in reference to an origin point
 * @param origin Accepts coordinates
 * @param xyCoords New target location, in meters, from origin.
 * @returns Point Feature
 */
 export function pointByOriginCoords(origin: number[], xyCoords: number[]): turf.Feature<turf.Point> {
 	return turf.point(findNewCoord(origin,xyCoord));
 }

/**
 * Draws a line using an array of (x,y) coordinates in reference to an origin point
 * @param origin Accepts coordinates
 * @param array Array of target coordinates, in meters, from origin.
 * @returns Line Feature
 */
 export function lineByOriginCoords(origin: number[], array: number[][]): turf.Feature<turf.LineString> {
 	let coordArr = [];
 	array.forEach(function(c) {
 		coordArr.push(findNewCoord(origin,c));
 	});
 	return turf.lineString(coordArr);
 }

/**
 * Draws a polygon using an array of (x,y) coordinates in reference to an origin point
 * @param origin Accepts coordinates
 * @param array1 Array of target coordinates for overall polygon, in meters, from origin.
 * @param array2 Array of Array(s) of target coordinates for hole(s), in meters, from origin: [[hole1coords],[hole2coords]]
 * @returns Polygon Feature
 */
 export function polygonByOriginCoords(origin: number[], array1: number[][], array2: number[][][] = []): turf.Feature<turf.Polygon> {
 	let coordArr = [];
  	let outArr = [];
 	array1.forEach(function(c) {
 		outArr.push(findNewCoord(origin,c));
 	});
  	coordArr.push(outArr);
 	array2.forEach(function(hole) {
 		let holeCoordArr = [];
 		hole.forEach(function(c) {
 			holeCoordArr.push(findNewCoord(origin,c));
 		});
 		coordArr.push(holeCoordArr);
 	});
 	return turf.polygon(coordArr);
 }

/*

Coords *******************************************************************************************************************************************

*/

/**
 * Shifts coordinates by the specified number
 * @param coordinates Array of coordinates
 * @param num Number to shift by
 * @returns An array of internal angles in degrees
 */
export function coordsByShift(coords: number[], num: number) {
	for (let i = 0; i < num; i++) {
		coords.unshift(coords[coords.length - 1]);
		coords.pop();
	}
	return coords;
}

/*

Lines *******************************************************************************************************************************************

*/

/**
 * Divides line by the specified number
 * @param line Accepts a line feature
 * @param num Number to divide by
 * @returns FeatureCollection of lines
 */
export function linesByDivide(line: turf.Feature<turf.LineString>, num: number): turf.FeatureCollection {
	let len: number = turf.length(line);
	return turf.lineChunk(line,len/num);
}

/**
 *Explodes polygon into lines
 * @param poly Accepts a Polygon feature
 * @returns FeatureCollection of lines
 */
export function linesByExplode(poly: turf.Feature<turf.Polygon>): turf.FeatureCollection<turf.LineString> {
	let lnArr: turf.LineString[] = [];
	let coordArr = ensureCoordArr(poly);
	for (let i = 0; i < coordArr.length; i++) {
		lnArr.push(turf.lineString([coordArr[i], coordArr[i+1]]));
	}
	return turf.featureCollection(lnArr);
}

/**
 * Extends line on either ends
 * @param line Accepts a line feature
 * @param distance Distance to extend line by (in meters)
 * @param reverse Boolean. True to reverse direction
 * @returns line
 */
export function lineByExtend(line: turf.Feature<turf.LineString>, distance: number, reverse: boolean): turf.Feature<turf.LineString> {
	let coordArr: any = ensureCoordArr(line);
	let point1: number[];
	let point2: number[];
	if (reverse === false) {
		point1 = coordArr[1];
		point2 = coordArr[0];
	} else {
		point1 = coordArr[coordArr.length - 2];
		point2 = coordArr[coordArr.length - 1];
	}
	let bearing = turf.bearing(point1,point2);// direction from endpoint, pointing outwards
	let newPoint = turf.rhumbDestination(point2, distance/1000, bearing);// new endpoint using direction and distance set
	let newCoords: number[] = newPoint.geometry.coordinates;// coords of new endpoint
	if (reverse === false) {// add to coordArr to draw new line
		coordArr.unshift(newCoords);
	} else {
		coordArr.push(newCoords);
	}
	return turf.lineString(coordArr);
}

/**
 * Rebuild line based on number of vertices
 * @param line Accepts a line feature
 * @param num target number of vertices
 * @returns line
 */
export function lineByRebuild(line: turf.Feature<turf.LineString>, num: number): turf.Feature<turf.LineString> {
	if (num < 2) {throw new Error("Number of vertices cannot be less than two");}
	let coordArr: any = ensureCoordArr(line);
	if (coordArr.length === num) {return line;}// line has target number of vertices. No rebuild required
	while (coordArr.length !== num) {
		let cArrLen: number = coordArr.length;
		if (cArrLen > num) { // reduce
			let index = findShortest(coordArr);
			coordArr.splice(index,1);
		}
		if (cArrLen < num) { // add vertices
			let index = findlongest(coordArr);
			coordArr = addPoint(coordArr,index);
		}
	}
	return turf.lineString(coordArr);
}

/**
 * Reverse line
 * @param line Accepts a line
 * @returns line feature
 */
export function lineByReverse(line: turf.Feature<turf.LineString>): turf.Feature<turf.LineString> {
	if (line === undefined) {throw new Error ("line must be defined");}
	let coordArr: any = ensureCoordArr(line);// get coords
	coordArr.reverse();// reverse coordArray
	return turf.lineString(coordArr);// draw and return new curve
}

/*

Polygon functions ******************************************************************************************************************************

*/

/**
 * Loft FeatureCollection of lines and returns a FeatureCollection of Polygons. Curves will be rebuilt based on the maximum number of coordinates of either extreme curve
 * @param lines FeatureCollection of lines
 * @param array Array of indices to flip, if applicable.
 * @returns FeatureCollection of polygons, with "polygonNumber" property. User may use this to verify direction of loft and input lines to flip in array
 */
export function polygonsByLoft(lines: turf.FeatureCollection<turf.LineString>, array: number[] = []): turf.FeatureCollection<turf.Polygon> {
	let feats = lines.features;
	if (feats.length < 2) {throw new Error("Insufficient lines to loft");} // check for sufficient lines
	for (let i=0; i<feats.length-1; i++) {// flip curves according to array
		if (array.includes(i)) {
			feats[i] = lineByReverse(feats[i]);
		}
	}
	let extremes = [feats[0],feats[feats.length-1]];
	let extremesLenArr: number[] = [];
	extremes.forEach(function(ln) { // find number of coords of extreme lines
		extremesLenArr.push(ensureCoordArr(ln).length);
	}); 
	let rebuildNo: number = Math.max(extremesLenArr[0],extremesLenArr[1]); // rebuild lines based on the max of extreme lines
	let polygonArr: turf.Feature<turf.Polygon>[] = [];
	for (let i=0; i<feats.length-1; i++) {
		let line1 = lineByRebuild(feats[i],rebuildNo);// rebuild first line
		let line2 = lineByRebuild(feats[i+1],rebuildNo);// rebuild next line
		let lnPair = [line1,line2];
		let coordsPair = [];
		lnPair.forEach(function(ln) {// break down pair into coords
			coordsPair.push(ensureCoordArr(ln));
		});
		for (let j=0; j<rebuildNo-1; j++) {// create polygon
			let polyCArr = [coordsPair[0][j],coordsPair[1][j],coordsPair[1][j+1],coordsPair[0][j+1],coordsPair[0][j]];
			let partialPlot = turf.polygon([polyCArr]);
			partialPlot.properties["polygonNumber"] = (i*(rebuildNo-1)+j);// assign number for easy loft direction and line verification later
			polygonArr.push(partialPlot);
		}
	}
	return turf.featureCollection(polygonArr);
}

/*

util functions *********************************************************************************************************************************

*/

function ensureCoordArr(feature: turf.Feature<turf.LineString|turf.Point|turf.Polygon>): number[][] {
	let coordArr: any = feature.geometry.coordinates;
	while (coordArr.length === 1) {coordArr = coordArr[0];}
	return coordArr;
}

function findlongest(coordArr: turf.Coord[]): number {
	let maxDist: number = -Infinity;
	let index: number = 0;
	for (let i = 0; i < coordArr.length-1; i++) {
		let dist: number = turf.distance(coordArr[i],coordArr[i+1]);
		if (dist>maxDist) {
			maxDist = dist;
			index = i;
		}
	}
	return index;
}

function addPoint(coordArr: turf.Coord[],index: number) {
	let newPoint = turf.midpoint(coordArr[index], coordArr[index + 1]);
	let firstHalf = coordArr.slice(0, index + 1);
	let secondHalf = coordArr.slice(index + 1, coordArr.length);
	firstHalf.push(newPoint.geometry.coordinates);
	return firstHalf.concat(secondHalf);
}

function findShortest(coordArr: turf.Coord[]): number {
	let minDist: number = Infinity;
	let index: number = 0;
	for (let i = 0; i < coordArr.length-2; i++) {
		let dist: number = turf.distance(coordArr[i],coordArr[i+1]);
		if (dist<minDist) {
			minDist = dist;
			index = i + 1;
			if (index === coordArr.length-1) {
				index = i;
			}
		}
	}
	return index;
}

function findAngleBtwVec(vector1: number[], vector2: number[]): number {
	let vec1mag = findMagnitude(vector1);
	let vec2mag = findMagnitude(vector2);
	let cosAngle = findDotProduct(vector1,vector2)/(vec1mag*vec2mag);
	return Math.acos(cosAngle)/Math.PI*180;
}

function findDotProduct(vector1: number[], vector2: number[]): number {
	if (vector1.length !== vector2.length) {throw new Error("Vectors are of unequal length");}
	let sum: number = 0;
	for (let i=0; i<=vector1.length-1; i++) {
		sum += vector1[i]*vector2[i];
	}
	return sum;
}

function findMagnitude(vector: number[]): number {
	let sum: number = 0;
	vector.forEach(function(c) {
		sum += Math.pow(c,2);
	});
	return Math.sqrt(sum);
}

function find2DDeterminant(vector1: number[], vector2: number[]): number {
	return (vector1[0]*vector2[1] - vector1[1]*vector2[0]);
}


/*
util function - for drawing only *******************************************************************************************************
*/

function findNewCoord(origin: number[], target: number[]): number[] {
	// treat target as vector: find angle between target vector and 'north' vector == [0,1] acos returns in RAD - change to deg
	let northVec = [0,1];
	let tarMag = findMagnitude(target);// magnitude of vector == diagonal distance from origin to target location, still in meters.
	let angle = findAngleBtwVec(target,northVec); // returns absolute angle, regardless of direction. Between 0 and 180
	let det = find2DDeterminant(target,northVec); // use determinant to fix direction issue
	if (det < 0) {angle = 360 - angle;}
	let newPoint = turf.rhumbDestination(origin, tarMag/1000, angle);// new endpoint using direction and distance set
	return newPoint.geometry.coordinates;// retrieve and return coords from created point
}

/*

WIP ***********************************************************************************************************************************

*/

// function polygonsByDivide(poly: turf.Feature<turf.Polygon>, num: number): turf.FeatureCollection<turf.Polygon> {
// 	let firstDivide = checkNSplit(poly);

// }

// function checkNSplit(poly: turf.Feature<turf.Polygon> ): turf.FeatureCollection<turf.Polygon> {
// 	// check for internal angles that are larger than 180deg
// 	let coordArr = ensureCoordArr(poly);
// 	for (let j = 0; j<coordArr.length; j++) {
// 		let i = j - 1;
// 		let k = j + 1;
// 		if (j === 0) {i = coordArr.length - 1;}
// 		if (j === coordArr.length - 1) {k = 0;}
// 		let vec1 = [coordArr[i][0] - coordArr[j][0], coordArr[i][1] - coordArr[j][1]];
// 		let vec2 = [coordArr[k][0] - coordArr[j][0], coordArr[k][1] - coordArr[j][1]];
// 		let det = find2DDeterminant(vec1,vec2);
// 		if (det > 0) {	
// 			// split polygon at vertices larger than 180deg, and Break
// 			// new line will be the first line of new polygons
// 			//vector sum & flip, reduce to basis, multiply by max dist to every other point, check for intersection against all other lines
// 		}
// 	} return turf.featureCollection([poly]); // no vertex >180 deg, return original in FeatureCollection
// }

// function splitPoly() {}
