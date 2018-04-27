/**
 * Functions for working with geojson properties.
 */

/**
 * Features contain properties.
 */

import * as turf from "@turf/turf";

//  ===============================================================================================================
//  Model Constructors ===========================================================================================
//  ===============================================================================================================

/**
 * Returns an object of key-value pairs, the properties of this feature.
 *
 * @param feature The feature data.
 * @returns New model empty.
 */
export function getProperties(feature: turf.Feature): turf.Properties {
    return feature.properties;
}

/**
 * Returns an object of key-value pairs, the properties of this feature.
 *
 * @param feature The feature data.
 * @returns An array of property names
 */
export function getPropertyNames(feature: turf.Feature): string[] {
    return feature.properties.keys();
}

/**
 * Returns the number of properties in a feature.
 *
 * @param feature The feature data.
 * @returns The number of properties.
 */
export function numProperties(feature: turf.Feature): number {
    return feature.properties.length;
}

/**
 * Returns true if the  feature contains a property with the specified name.
 *
 * @param feature The feature data.
 * @returns True if the feature contains a property with the specified name.
 */
export function hasProperty(feature: turf.Feature, name: string): boolean {
    return feature.properties.hasOwnProperty(name);
}

/**
 * Returns the property value for the property with the specified name.
 * If the property does not exist, throws an error.
 *
 * @param feature The feature data.
 * @param name The name of the property, a string.
 * @returns The property value
 */
export function getProperty(feature: turf.Feature, name: string): any {
    const result: any = feature.properties[name];
    if (result === undefined) {throw new Error("Property " + name + " not found.");}
    return result;
}

/**
 * Returns the property value for the property with the specified name.
 * If the property does not exist, returns undefined.
 *
 * @param feature The feature data.
 * @param name The name of the property, a string.
 * @param value The value of the property, any value.
 */
export function setProperty(feature: turf.Feature, name: string, value: any): void {
    feature.properties[name] = value;
}
