/**
 * Functions working with coordinates in geojson files.
 */

/**
 *
 */

import * as turf from "@turf/turf";

/*
** Feature functions ******************************************************************************************************************************
*/

/**
 * Merge features into a single FeatureCollection
 * @param features1 Accepts Eeature or FeatureCollection
 * @param features2 Accepts Feature or FeatureCollection
 * @returns Merged FeatureCollection
 */
 export function featuresByMerge(features1: turf.Feature|turf.FeatureCollection, features2: turf.Feature|turf.FeatureCollection): turf.FeatureCollection {
 	let arr: turf.Feature[] = [];
 	[features1,features2].forEach(function(inpt) {
 		if (inpt.type === "FeatureCollection") {
 			arr = arr.concat(inpt.features);
 		} else if (inpt.type === "Feature") {
 			arr.push(inpt);
 		} else {
 			throw new Error ("Invalid input(s) to merge");
 		}
 	});
 	return turf.featureCollection(arr);
 }

/*

** Drawing functions ******************************************************************************************************************************

*/

/**
 * Draws a point using (x,y) coordinates in reference to an origin point
 * @param origin Accepts coordinates
 * @param xyCoords New target location, in meters, from origin.
 * @returns Point Feature
 */
 export function pointByOriginCoords(origin: number[], xyCoords: number[]): turf.Feature<turf.Point> {
 	return turf.point(findNewCoord(origin,xyCoords));
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

/**
 * Draws a rectangle using height and width, centered to an origin point
 * @param origin Accepts coordinates
 * @param height height of rectangle, in meters
 * @param width width of rectange, in meters
 * @param rotation angle of rotation from North, in degrees.
 * @returns Rectangle Polygon Feature
 */
export function polygonByOriginRect(origin: number[], width: number, height: number, rotation: number): turf.Feature<turf.Polygon> {
	let firstPt = findNewCoord(origin, [width/2,height/2], rotation);
	let secondPt = findNewCoord(origin, [-width/2,height/2], rotation);
	let thirdPt = findNewCoord(origin, [-width/2,-height/2], rotation);
	let forthPt = findNewCoord(origin, [width/2,-height/2], rotation);
	return turf.polygon([[firstPt,secondPt,thirdPt,forthPt,firstPt]]);
}

/**
 * Draws a n-sided polygon, centered to an origin point
 * @param origin Accepts coordinates
 * @param radius Polygon is inscribed in circle of defined radius
 * @param sides Number of sides
 * @param rotation angle of rotation from North, in degrees.
 * @returns n-sided Polygon Feature
 */
export function polygonByOriginSides(origin: number[], radius: number, sides: number, rotation: number = 0): turf.Feature<turf.Polygon> {
	return turf.transformRotate(turf.circle(origin,radius,{steps:sides}),rotation,{pivot:origin});
}
/*

** Coords *******************************************************************************************************************************************

*/

/**
 * Shifts coordinates by the specified number
 * @param coordinates Array of coordinates
 * @param num Number to shift by
 * @returns An array of internal angles in degrees
 */
export function coordsByShift(coords: number[][], num: number) {
	for (let i = 0; i < num; i++) {
		coords.unshift(coords[coords.length - 1]);
		coords.pop();
	}
	return coords;
}

/*

** Lines *******************************************************************************************************************************************

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
	for (let i = 0; i < coordArr.length-1; i++) {
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

** Polygon functions ******************************************************************************************************************************

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

/**
 * Extends polygon in perpendicular direction of set line edge
 * @param poly Polygon Feature
 * @param index index of line edge to extend from
 * @param distance distance to extend, in meters
 * @param reverse reverse perpendicular direction (note: may result in kinks)
 * @returns Extended polygon Feature
 */
export function polygonByExtend(poly: turf.Feature<turf.Polygon>, index: number, distance: number, reverse: boolean = false): turf.Feature<turf.Polygon> {
	distance/= 1000;
	let lnArr = linesByExplode(poly).features;
	if (index > lnArr.length-1 || index < 0) {throw new Error("Index to extend is invalid");}
	// create coord arr that does not include coords of index: coordArr[index] & coordArr[index+1] (anti-clockwise)
	let coordArr: number[][] = ensureCoordArr(poly);
	coordArr.pop();// removes duplicate
	let indexChk = indexCheck([index+1], coordArr.length);
	coordArr = coordsByShift(coordArr,indexChk[0]);// shifts target coords to extremes of coordArr for easy change
	// move and replace extreme coords by distance&direction. Duplicate first coord to end to complete polygon
	let direction = perpenDir(coordArr[0],coordArr[coordArr.length-1],reverse);
	coordArr[0] = turf.rhumbDestination(coordArr[0],distance,direction).geometry.coordinates;
	coordArr[coordArr.length-1] = turf.rhumbDestination(coordArr[coordArr.length-1],distance,direction).geometry.coordinates;
	coordArr.push(coordArr[0]);
	return turf.polygon([coordArr]);
}

/**
 * Divides a polygon using voronoi partitioning with points
 * @param points Points Feature Collection
 * @param poly Polygon Feature
 * @returns FeatureCollection of Voronoi divided polygons
 */
export function polygonsByvoronoi(points: turf.FeatureCollection<turf.Point>, poly: turf.Feature<turf.Polygon>): turf.FeatureCollection<turf.Polygon> {
	let voronoi: turf.FeatureCollection<turf.Polygon> = turf.voronoi(points,{bbox: turf.bbox(poly)});
	let polyArr: turf.Feature<turf.Polygon>[] = [];
	voronoi.features.forEach(function(feat) {
		let intersection = turf.intersect(feat,poly);
		if (intersection !== null && intersection.geometry.type === "Polygon") {
			polyArr.push(intersection);
		}
	});
	return turf.featureCollection(polyArr);
}
/*

** util functions *********************************************************************************************************************************

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

function perpenDir(coord1: number[], coord2: number[], reverse) {
	if (reverse === true) {
		return -90 + turf.bearingToAzimuth(turf.bearing(coord1,coord2));
	} else {
		return 90 + turf.bearingToAzimuth(turf.bearing(coord1,coord2));
	}
}

function indexCheck(array: number[], max: number): number[] {// loops back array if index <0 || >max
	for (let i=0; i<array.length; i++) {
		if (array[i]<0) {array[i]+=max;}
		if (array[i]>3) {array[1]-=max;}
	}
	return array;
}

/*
** util function - for drawing only *******************************************************************************************************
*/

function findNewCoord(origin: number[], target: number[], rotation: number = 0): number[] {
	// treat target as vector: find angle between target vector and 'north' vector == [0,1] acos returns in RAD - change to deg
	let northVec = [0,1];
	let tarMag = findMagnitude(target);// magnitude of vector == diagonal distance from origin to target location, still in meters.
	let angle = findAngleBtwVec(target,northVec); // returns absolute angle, regardless of direction. Between 0 and 180
	let det = find2DDeterminant(target,northVec); // use determinant to fix direction
	if (det < 0) {angle = 360 - angle;}
	angle += rotation; // for rotation of pre-defined geometry, around the origin
	let newPoint = turf.rhumbDestination(origin, tarMag/1000, angle);// new endpoint using direction and distance set
	return newPoint.geometry.coordinates;// retrieve and return coords from created point
}

/*

** WIP ***********************************************************************************************************************************

*/

// note! All functions should ignore check for reflex until a kink is detected in resulting divide!***************************************
function kinkCheck(poly: turf.Feature<turf.Polygon>): boolean { // put resulting polygons from a division into this function
	if (turf.kinks(poly).features.length !== 0) {return true;} // division using this check should revert if returns true
}

function quadsByRadial(poly: turf.Feature<turf.Polygon>, reflex: boolean = false): turf.FeatureCollection<turf.Polygon> {
	let coordArr = ensureCoordArr(poly);
	if (coordArr.length!==5) {throw new Error("Poly is not a Quad");}
	coordArr.pop();// remove duplicate or looping back will give two same coords
	let cen = turf.centroid(poly); // centroid will 100% be in polygon since this does not look at reflex cases
	let polyArr: turf.Feature<turf.Polygon> [] = [];
	for (let i = 0; i<coordArr.length; i++) {
		let indices = [i-1,i,i+1];
		let subCArr: number[][] = [coordArr[i]];
		if (i === 0||i === coordArr.length-1) {indices = indexCheck(indices, coordArr.length);}// loop back cases
		for (let j = 0; j<indices.length - 1; j++) {// should only run twice
			let midPoint = turf.midpoint(coordArr[indices[j]],coordArr[indices[j+1]])
			subCArr.push(midPoint.geometry.coordinates);
		}
		subCArr = coordsByShift(subCArr,1);
		subCArr.unshift(cen.geometry.coordinates);
		subCArr.push(cen.geometry.coordinates);
		polyArr.push(turf.polygon([subCArr]));
	}
	return turf.featureCollection(polyArr);
}

/*
** Reflex Quad: Reflex point to centroid, non-adjacent edges to centroid ** centroid not a good way as it can be outside the polygon? (-more specific. Midpoint between reflexpt and opposite pt will work)
** Reflex Poly: VecAdd split (crude, but handles weird shaped n-polygons: does not deal with specific target nodes/edges; more generic)
*/

function filterReflex(fcoll: turf.FeatureCollection<turf.Polygon>): object { 
// so there is no need to re-check every polygon for reflex. Functions can deal 100% with quads with no reflex - division functions will have a boolean to indicate which "case" it is dealing with.
	let retObj = {
		reflexPolys: [],
		polys: []
	}
	fcoll.features.forEach(function(feat) {
		let refResArr = findAllReflexPt(feat);
		if (refResArr.length === 0) {
			retObj.polys.push(feat);
		} else {// has at least one reflex point
			feat["reflexObjArr"] = refResArr; // store reflex information into feature so there is no need to recalculate later
			retObj.reflexPolys.push(feat);
		}
	});
	return retObj;
}

function findAllReflexPt(poly: turf.Feature<turf.Polygon>): object[] {
	let coordArr = ensureCoordArr(poly);
	let arr = [];
	for (let j = 0; j<coordArr.length; j++) {// split polygon at first vertex that is larger than 180deg, and Break
		let i = j - 1;
		let k = j + 1;
		if (j === 0) {i = coordArr.length - 1;}
		if (j === coordArr.length - 1) {k = 0;}
		let vec1 = [coordArr[i][0] - coordArr[j][0], coordArr[i][1] - coordArr[j][1]];
		let vec2 = [coordArr[k][0] - coordArr[j][0], coordArr[k][1] - coordArr[j][1]];
		let det = find2DDeterminant(vec1,vec2);
		if (det > 0) {// j is a reflex point
			let retObj = {
				coordIndex: j,
				firstVec: vec1,
				secVec: vec2
			};
			arr.push(retObj);
		}
	}
	return arr;
}

function splitByVecAdd(lnArr: turf.Feature<turf.LineString>[], coordArr: number[][], chkResult: object[]): turf.FeatureCollection<turf.Polygon> {// splits polygon into TWO using the FIRST reflex point
	let vec1: number[] = chkResult[0].firstVec;
	let vec2: number[] = chkResult[0].secVec;
	let dirVec: number[] = [vec1[0]+vec2[0], vec1[1]+vec2[1]];
	let dirVecMag = findMagnitude(dirVec);
	let basis: number[] = [dirVec[0]/dirVecMag,dirVec[1]/dirVecMag];
	let index = chkResult[0].coordIndex;
	let pt: number[] = coordArr[index];
	let maxDist = -Infinity;
	let intersect: number[];
	let rangeArr: number[][];
	for (let i=0; i<coordArr.length; i++) {// find max dist to every other point
		if (i === index) {continue;}
		let dist = turf.distance(coordArr[index],coordArr[i]);
		if (dist > maxDist) {maxDist = dist;}
	}
	let newCoord = [pt[0]+basis[0]*maxDist,pt[1]+basis[1]*maxDist]; // ensure new line will be long enough to intersect with lines
	let newLn = turf.lineString([pt,newCoord]);
	for (let i=0; i<lnArr.length; i++) {// check for intersection against all other lines
		let intChk = turf.lineIntersect(lnArr[i],newLn).features;
		if (intChk.length === 1) {// exists an intersection
			intersect = intChk[0].geometry.coordinates;
			switch (index-i) {// ensure division will not result in triangle (unless polygon is a quad - use other method to handle reflex)
				case 1:
					i--; break;
				case -1:
					i++; break;
			}
			i = indexCheck([i],lnArr.length)[0];
			rangeArr = rangeFromIndices(lnArr.length, index, i);
			break; // now have two range of coordIndices to create polygons(not indcluding intersect - added next)
		}
	}
	return turf.featureCollection(polygonsFromCArrArr(cArrFromRangeNInt(coordArr,rangeArr,intersect)));
}

function rangeFromIndices(lnArrlen: number, oriIndex: number, searchedInd: number): number[][] {
	let rangeArr: number[][];
		// note here: lines and coords are numbered anticlockwise, hence the following
	if(searchedInd<oriIndex) {
		rangeArr[0] = byRange(searchedInd+1,oriIndex+1);
		rangeArr[1] = byRange(oriIndex,lnArrlen-1);
		let rng2Add = byRange(0,searchedInd);
		rangeArr[1] = rangeArr[1].concat(rangeArr[1],rng2Add);
	} else {// i>index, index is skipped. i will never == index
		rangeArr[0] = byRange(searchedInd+1,lnArrlen-1);
		let rng1Add = byRange(0,oriIndex+1);
		rangeArr[0] = rangeArr[0].concat(rangeArr[0],rng1Add);
		rangeArr[1] = byRange(oriIndex,searchedInd+1);
	}
	return rangeArr;
}

function cArrFromRangeNInt(coordArr: number[][], rangeArr: number[][], intersect: number[]) {
	let newCArr: number [][][];
	rangeArr.forEach(function(rng) {
		let arr: number[][] = [];
		rng.forEach(function(ind) {
			arr.push(coordArr[ind]);
		});
		arr.push(intersect); // add intersect coord to front and back
		arr.unshift(intersect);
		newCArr.push(arr);
	});
	return newCArr;
}

function polygonsFromCArrArr(cArrArr: number[][][]): turf.Feature<turf.Polygon>[] {
	let polyArr: turf.Feature<turf.Polygon>[] = [];
	cArrArr.forEach(function(cArr) {
		polyArr.push(turf.polygon([cArr]));
	});
	return polyArr;
}

/*
	n-gon polygon split cases:
	n % 2 == 0 : edge to edge split
	n % 2 == 1 && n !== 3 : point to edge split
	n == 3: radial split
*/

/*
** Edge to Point Split
*/

function splitByEdge2Point() {} // used to divide odd-poly into quads - not needed for dividing quads


/*
** Edge to Edge splits
*/

function splitByFan() {
// find longest line
// divide longest line and remaining lines(joined) into target number
// return feature collection of polygons
// note: will result in triangles on two ends
}

function splitBy2Longest() {
// find longest two lines
// divide two lines according to number/distance

}

function quadsNoCheckSplit(lnArr: turf.Feature<turf.LineString>[], splitCnt: number, reflexSplit: boolean): object {// input polygon is 100% a non-reflex quad
	let lnLenObj: object = findLongestLine(lnArr);
	let longIndex: number = lnLenObj.longestInd;
	let longestLine: turf.Feature<turf.LineString> = lnArr[longIndex];	// find longest. Check total length of longest & opposite >= sum of two other length
	let oppIndex: number = longIndex+2;
	if (oppIndex>3) {oppIndex-=4;}
	let otherIndices = [longIndex-1,longIndex+1];
	indexCheck(otherIndices, lnArr.length); // loops back indices if index <0 || >max
	let divideIndices = [longIndex,oppIndex];
	if (reflexSplit === false) { // for over-ride - if reflexSplit is true (means polygon was divided due to reflex) strictly divide the last line
		let sum:number = -Infinity;
		[divideIndices,otherIndices].forEach(function(indices) {
			let checkSum = indices.reduce(function(total,next) {return total + lnLenObj.lenArr[next];});
			if (sum>=checkSum) {divideIndices = indices;}
		});// divideIndices should now hold the indices of the two lines we should cut
	}	

}

function findLongestLine(lnArr: turf.Feature<turf.LineString>[]): object {
	let lnLenObj = {
		longestLen: -Infinity,
		longestInd: null,
		lenArr: []
	};
	for (let i=0; i<lnArr.length; i++) {
		let len = turf.length(lnArr[i]);
		lnLenObj.lenArr.push(len);
		if (len > lnLenObj.longestLen) {
			lnLenObj.longestLen = len;
			lnLenObj.longestInd = i;
		}
	}
	return lnLenObj;
}

function quadReflexSplit(reflPoly:turf.Feature<turf.Polygon>, lnArr:turf.Feature<turf.LineString>[], coordArr: number[][], reflIndex: number): turf.FeatureCollection<turf.Polygon> {//will have one and only one reflex angle: reflex point to centroid, and centroid to non adjacent edges to get three quads.
	let centroid = turf.centroid(reflPoly);
	let cenCoord = centroid.geometry.coordinates;
	let adjIndices = indexCheck([reflIndex-1,reflIndex+1],lnArr.length);
	let nonAdjLnInd = indexCheck([reflIndex-2,reflIndex+1],lnArr.length);// anti-clockwise numbering. 
	//find mid-point of adjLines and insert into coordArr
	nonAdjLnInd.forEach(function(ind){
		let midPoint = turf.along(lnArr[ind],0.5*turf.length(lnArr[ind]));
		coordArr.
	});
}


function quadsSplitByNumber(poly: turf.Feature<turf.Polygon>, num: number, split_reflex: boolean = false): turf.FeatureCollection<turf.Polygon> {
	let coordArr = ensureCoordArr(poly);
	if (coordArr.length !== 5) {throw new Error("Poly is not a Quad");}
	let refChk = findAllReflexPt(poly);
	let polyArr: turf.Feature<turf.Polygon>[] = [poly];
	let lnArr = linesByExplode(poly).features;
	if (refChk.length !== 0) {
		if (split_reflex === false) {// checks whether user allows division of polygon from where the reflex angle is (if it exists)
			throw new Error("Quad contains a reflex angle");
		}
		polyArr = splitByVecAdd(lnArr,coordArr,refChk).features;// polygon split into two polygons from reflex point,split line is the last line
		if (num === 2) {return turf.featureCollection(polyArr);}// target number reached
	}
	for (let i=0; i<polyArr.length; i++) {
		coordArr = ensureCoordArr(polyArr[i]);
		let splitCnt: number = num - 1;// num is the target number of polygons. Number of times to split = num-1
		let reflexSplit: boolean = false;
		if (refChk.length !== 0) {// polygon was already split into two, we need to compensate for that: split parallel to split line & ensure area of each poly approx same
			let currArea = turf.area(polyArr[1]);
			let idealArea = turf.area(poly)/num;
			splitCnt = Math.floor(currArea/idealArea);
			splitCnt--; // check proportional area to determine how many times should this polygon (of possible 2), should split
			reflexSplit = true;// poly which will split should use last line index, without need to check for longest line (so cut will be parallel)
		}
		// split functions
		if (splitCnt <= 0) {continue;}// area of polygon is less than or equal to ideal size, no split required.
		quadsNoCheckSplit(lnArr, splitCnt, reflexSplit);// note: a QUAD with reflex, will always result in a triangle after split. *************************************************************
	}
}

function quadsSplitByDistance() {

}

// from mobius-array/create.ts
function byRange(min: number, max: number): number[] {
    if (min === undefined) {throw new Error("Invalid arg: min must be defined.");}
    if (max === undefined) {throw new Error("Invalid arg: max must be defined.");}
    const len:number = max - min;
    if (len <= 0) {return [];}
    return Array.apply(0, new Array(len)).map((v, i) => i + min);
}
