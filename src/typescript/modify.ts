/**
 * Functions working with coordinates in geojson files.
 */

/**
 *
 */

import * as turf from "@turf/turf";

/**
 * Removes Property from all FeatureCollectiom
 * @param features Feature or FeatureCollection
 * @param name Name of property to remove
 */
export function removeProp(features: turf.FeatureCollection|turf.Feature, name: string): void {
    let featuresArr: turf.Feature[];
    if (features.type === "Feature") {
        features = features as turf.Feature;
        featuresArr = [features];
    } else {
        features = features as turf.FeatureCollection;
        featuresArr = features.features;
    }
    featuresArr.forEach((feat) => {
        delete feat.properties[name];
    });
    return;
}

/**
 * Add Property to all Features
 * @param features Feature or FeatureCollection
 * @param name Name of property to add
 * @param value Value of property to add
 */
export function addProp(features: turf.FeatureCollection|turf.Feature, name: string, value: any): void {
    let featuresArr: turf.Feature[];
    if (features.type === "Feature") {
        features = features as turf.Feature;
        featuresArr = [features];
    } else {
        features = features as turf.FeatureCollection;
        featuresArr = features.features;
    }
    featuresArr.forEach((feat) => {
        feat.properties[name] = value;
    });
    return;
}
