/**
 * Functions working with coordinates in geojson files.
 */

/**
 *
 */

import * as turf from "@turf/turf";

/*

Coords *******************************************************************************************************************************************

*/

/**
 * Shifts coordinates by the specified number
 * @param coordinates Array of coordinates
 * @param num Number to shift by
 * @returns An array of internal angles in degrees
 */
export function coordsShift(coords: number[], num: number) {
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
export function linesDivide(line: turf.Feature<turf.LineString>, num: number): turf.FeatureCollection {
	let len: number = turf.length(line);
	return turf.lineChunk(line,len/num);
}

/**
 * Extends line on either ends
 * @param line Accepts a line feature
 * @param distance Distance to extend line by (in meters)
 * @param reverse Boolean. True to reverse direction
 * @returns line
 */
export function lineExtend(line: turf.Feature<turf.LineString>, distance: number, reverse: boolean): turf.Feature<turf.LineString> {
	let coordArr: any = line.geometry.coordinates;
	while (coordArr.length === 1) {coordArr = coordArr[0];}
	let point1: number[];
	let point2: number[];
	if (reverse === false) {
		point1 = coordArr[1];
		point2 = coordArr[0];
	} else {
		point1 = coordArr[coordArr.length - 2];
		point2 = coordArr[coordArr.length - 1];
	}
	let bearing = turf.bearing(point1,point2);
	let newPoint = turf.rhumbDestination(point2, distance/1000, bearing);
	let newCoords: number[] = newPoint.geometry.coordinates;
	if (reverse === false) {
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
export function lineRebuild(line: turf.Feature<turf.LineString>, num: number): turf.Feature<turf.LineString> {
	if (num < 2) {throw new Error("Number of vertices cannot be less than two");}
	let coordArr: any = line.geometry.coordinates;
	while (coordArr.length === 1) {coordArr = coordArr[0];}
	if (coordArr.length === num) {return line;}
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

/*

Polygon functions ******************************************************************************************************************************

*/

/**
 * Loft FeatureCollection of lines and returns a FeatureCollection of Polygons. Curves will be rebuilt based on the maximum number of coordinates of either extreme curve
 * @param lines FeatureCollection of lines
 * @returns line
 */
export function loft(lines: turf.FeatureCollection<turf.LineString>): turf.FeatureCollection<turf.Polygon> {
	let feats = lines.features;
	if (feats.length < 2) {throw new Error("Insufficient lines to loft");} // check for sufficient lines
	let extremes = [feats[0],feats[feats.length-1]];
	let extremesLenArr: number[] = [];
	extremes.forEach(function(ln) {
		extremesLenArr.push(ensureCoordArr(ln).length);
	}); // find number of coords of extreme lines
	let rebuildNo: number = Math.min(extremesLenArr[0],extremesLenArr[1]);
	let polygonArr: turf.Feature<turf.Polygon>[] = [];
	for (let i=0; i<feats.length-2; i++) {
		let line1 = rebuild(feats[i],rebuildNo);
		let line2 = rebuild(feats[i+1],rebuildNo);
		let lnPair = [line1,line2];
		let coordsPair = [];
		lnPair.forEach(function(ln) {
			coordsPair.push(ensureCoordArr(ln));
		});
		for (let j=0; j<rebuildNo-2) {
			let polyCArr = [coordsPair[0][j],coordsPair[1][j],coordsPair[1][j+1],coordsPair[0][j+1]];
			polygonArr.push(turf.polygon([polyCArr]));
		}
	}
	return {features: polygonArr};
	
}

/*

Nested functions *********************************************************************************************************************************

*/

function ensureCoordArr(feature: turf.Feature<turf.LineString|turf.Point|turf.Polygon>): number[] {
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
