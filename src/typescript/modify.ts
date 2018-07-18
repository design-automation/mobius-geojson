/**
 * Functions working with coordinates in geojson files.
 */

/**
 *
 */

import * as turf from "@turf/turf";

/**
 * Removes Property from all Features within a FeatureCollectiom
 * @param fcoll FeatureCollection
 * @param name Name of property to remove
 */
 export function featuresRemProp(fColl: turf.FeatureCollection, name: string): void {
 	fColl.features.forEach(function(feat) {
 		if (!feat.properties.hasOwnProperty(name)) {throw new Error("Feature does not contain properties");}
 		delete feat.properties[name];
 	});
 	return;
 }
