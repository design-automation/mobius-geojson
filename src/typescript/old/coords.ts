/**
 * Functions working with coordinates in geojson files.
 */

/**
 *
 */

import * as turf from "@turf/turf";

/**
 * Shifts coordinates by the specified number
 * @param coordinates Array of coordinates
 * @param num Number to shift by
 * @returns An array of internal angles in degrees
 */
export function shift(coordinates: number[], num: number) {
	for (let i = 0; i < num; i++) {
		coordinates.unshift(coordinates[coordinates.length - 1]);
		coordinates.pop();
	}
	return coordinates;
}
