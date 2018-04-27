/**
 * Functions for working with geojson models.
 */

/**
 * Models contain features.
 */

import * as turf from "@turf/turf";
import * as file from "./libs/filesys/file"


//  ===============================================================================================================
//  Model Constructors ===========================================================================================
//  ===============================================================================================================

/**
 * Get points from geojson featureColl.
 * @param featureColl The geojson featureColl..
 * @returns An array of features
 */
export function getPoints(featureColl: turf.FeatureCollection): Array<turf.Feature<turf.Point>> {
    const points: Array<turf.Feature<turf.Point>> = [];
    // loop through all features
    for (const feature of featureColl.features) {
        if (feature.geometry.type === "Point") {
            points.push(feature as turf.Feature<turf.Point>);
        }
    }
    // return featureColl
    return points;
}

/**
 * Get Linestrings from geojson featureColl.
 * @param featureColl The geojson featureColl..
 * @returns An array of features
 */
export function getLinestrings(featureColl: turf.FeatureCollection): Array<turf.Feature<turf.LineString>> {
    const linestrings: Array<turf.Feature<turf.LineString>> = [];
    // loop through all features
    for (const feature of featureColl.features) {
        if (feature.geometry.type === "LineString") {
            linestrings.push(feature as turf.Feature<turf.LineString>);
        }
    }
    // return featureColl
    return linestrings;
}

/**
 * Get Polygons from geojson featureColl.
 * @param featureColl The geojson featureColl..
 * @returns An array of features
 */
export function getPolygons(featureColl: turf.FeatureCollection): Array<turf.Feature<turf.Polygon>> {
    const polygons: Array<turf.Feature<turf.Polygon>> = [];
    // loop through all features
    for (const feature of featureColl.features) {
        if (feature.geometry.type === "Polygon") {
            polygons.push(feature as turf.Feature<turf.Polygon>);
        }
    }
    // return featureColl
    return polygons;
}

/**
 * Get Polygons with holes from geojson featureColl.
 * @param featureColl The geojson featureColl.
 * @returns An array of features
 */
export function getPolygonsWithHoles(featureColl: turf.FeatureCollection): Array<turf.Feature<turf.Polygon>> {
    const polygons_holes: Array<turf.Feature<turf.Polygon>> = [];
    // loop through all features
    for (const feature of featureColl.features) {
        if (feature.geometry.type === "Polygon") {
            const geometry: turf.Geometry = feature.geometry as turf.Geometry;
            if (geometry.coordinates.length > 1) {
                polygons_holes.push(feature as turf.Feature<turf.Polygon>);
            }
        }
    }
    // TODO handle GeometryCollection
    // return featureColl
    return polygons_holes;
}

/**
 * Get MultiPoints from geojson featureColl.
 * @param featureColl The geojson featureColl..
 * @returns An array of features
 */
export function getMultiPoints(featureColl: turf.FeatureCollection): Array<turf.Feature<turf.MultiPoint>> {
    const multipoints: Array<turf.Feature<turf.MultiPoint>> = [];
    // loop through all features
    for (const feature of featureColl.features) {
        if (feature.geometry.type === "MultiPoint") {
            multipoints.push(feature as turf.Feature<turf.MultiPoint>);
        }
    }
    // return featureColl
    return multipoints;
}

/**
 * Get MultiLinestrings from geojson featureColl.
 * @param featureColl The geojson featureColl..
 * @returns An array of features
 */
export function getMultiLineStrings(featureColl: turf.FeatureCollection): Array<turf.Feature<turf.MultiLineString>> {
    const multilinestrings: Array<turf.Feature<turf.MultiLineString>> = [];
    // loop through all features
    for (const feature of featureColl.features) {
        if (feature.geometry.type === "MultiLineString") {
            multilinestrings.push(feature as turf.Feature<turf.MultiLineString>);
        }
    }
    // return featureColl
    return multilinestrings;
}

/**
 * Get MultiPolygons from geojson featureColl.
 * @param featureColl The geojson featureColl..
 * @returns An array of features
 */
export function getMultiPolygons(featureColl: turf.FeatureCollection): Array<turf.Feature<turf.MultiPolygon>> {
    const multipolygons: Array<turf.Feature<turf.MultiPolygon>> = [];
    // loop through all features
    for (const feature of featureColl.features) {
        if (feature.geometry.type === "MultiPolygon") {
            multipolygons.push(feature as turf.Feature<turf.MultiPolygon>);
        }
    }
    // return featureColl
    return multipolygons;
}

/**
 * Get MultiPolygons with holes from geojson featureColl.
 * @param featureColl The geojson featureColl..
 * @returns An array of features
 */
export function getMultiPolygonsWithHoles(featureColl: turf.FeatureCollection): Array<turf.Feature<turf.MultiPolygon>> {
    const multipolygons_holes: Array<turf.Feature<turf.MultiPolygon>> = [];
    // loop through all features
    for (const feature of featureColl.features) {
        if (feature.geometry.type === "MultiPolygon") {
            const geometry: turf.Geometry = feature.geometry as turf.Geometry;
            let has_holes: boolean = false;
            for (const face of geometry.coordinates) {
                const face_coords = face as number[][];
                if (face_coords.length > 1) {has_holes = true; break;}
            }
            if (has_holes) {
                multipolygons_holes.push(feature as turf.Feature<turf.MultiPolygon>);
            }
        }
    }
    // return featureColl
    return multipolygons_holes;
}

/**
 * Get property names and types
 * @param featureColl The geojson featureColl.
 * @returns A map of property names -> property types
 */
export function getPropertyTypes(featureColl: turf.FeatureCollection): Map<string, string> {
    const properties: Map<string, string> = new Map();
    // loop through all features
    for (const feature of featureColl.features) {
        const propos: any = feature.properties;
        for (const key of Object.keys(propos)) {
            if (!properties.has(key)) {
                if (isNaN(propos[key])) {
                    properties.set(key, "string"); // TODO what about objs
                } else {
                    properties.set(key, "number");
                }
            }
        }
    }
    // return featureColl
    return properties;
}

/**
 * Add a feature to the model.
 * @param featureColl The geojson featureColl..
 * @param feature The feature to add.
 */
export function addFeature(featureColl: turf.FeatureCollection, feature: turf.Feature): void {
    featureColl.features.push(feature);
}

/**
 * Delete a feature in the model.
 * @param featureColl The geojson featureColl.
 * @param feature The feature to delete.
 * @returns Ture if the feature was deleted, false if the ID was not found.
 */
export function delFeature(featureColl: turf.FeatureCollection, feature: turf.Feature): boolean {
    let counter: number = 0;
    for (const feature2 of featureColl.features) {
        if (feature.id === feature2.id) {
            featureColl.features.splice(counter, 1);
            // delete featureColl.features[counter]; //TODO not sure which is better
            return true;
        }
        counter++;
    }
    return false;
}

/**
 * Save featureColl as geojson file.
 *
 * @param featureColl The collection to save.
 * @param filepath The path to the geojson file.
 * @returns True if successful.
 */
export function save(featureColl: turf.FeatureCollection, filename: string): boolean {
    return file.save(JSON.stringify(featureColl), filename);
}
