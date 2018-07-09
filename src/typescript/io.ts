/**
 * Turf HELPER functions.
 * http://turfjs.org/docs/
 */

/**
 *
 */
 import * as turf from "@turf/turf";

 /**
 * Save the FeatureCollection as a geojson file.
 *
 * @param featureColl The collection to save.
 * @param filename The name of the geojson file.
 * @returns True if successful.
 */
export function save(featureColl: turf.FeatureCollection, filename: string): boolean {
    return file.save(JSON.stringify(featureColl), filename);
}
