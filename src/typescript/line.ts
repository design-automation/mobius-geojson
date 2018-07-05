/**
 * Functions working with line features.
 */

/**
 *
 */

import * as turf from "@turf/turf";

/**
 * Divides line by the specified number
 * @param line Accepts a line feature
 * @param num Number to divide by
 * @returns FeatureCollection of lines
 */
export function divide(line: turf.Feature<turf.LineString>, num: number): turf.FeatureCollection {
	let len: number = turf.length(line);
	return turf.lineChunk(line,len/num);
}

/**
 * Extends line on either ends
 * @param line Accepts a line feature
 * @param distance Distance to extend line by (in kilometers)
 * @param flip Boolean. True to flip direction
 * @returns FeatureCollection of lines
 */
export function extend(line: turf.Feature<turf.LineString>, distance: number, flip: boolean): turf.Feature<turf.LineString> {
	let coordArr: any = line.geometry.coordinates;
	while (coordArr.length === 1) {coordArr = coordArr[0];}
	let point1: number[];
	let point2: number[];
	if (flip === false) {
		point1 = coordArr[1];
		point2 = coordArr[0];
	} else {
		point1 = coordArr[coordArr.length - 2];
		point2 = coordArr[coordArr.length - 1];
	}
	let bearing = turf.bearing(point1,point2);
	let newPoint = turf.rhumbDestination(point2, distance, bearing);
	let newCoords: number[] = newPoint.geometry.coordinates;
	if (flip === false) {
		coordArr.unshift(newCoords);
	} else {
		coordArr.push(newCoords);
	}
	return turf.lineString(coordArr);
}