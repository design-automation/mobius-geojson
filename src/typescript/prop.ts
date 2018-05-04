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
export function get(feature: turf.Feature): turf.Properties {
	if (!feature.hasOwnProperty("properties")) {throw new Error("Feature does not contain properties");}
    return feature.properties;
}

/**
 * Returns an object of key-value pairs, the properties of this feature.
 *
 * @param feature The feature data.
 * @returns An array of property names
 */
export function getNames(feature: turf.Feature): string[] {
    if (!feature.hasOwnProperty("properties")) {throw new Error("Feature does not contain properties");}
    return Object.keys(feature.properties);
}

/**
 * Returns the number of properties in a feature.
 *
 * @param feature The feature data.
 * @returns The number of properties.
 */
export function numAttribs(feature: turf.Feature): number {
    if (!feature.hasOwnProperty("properties")) {throw new Error("Feature does not contain properties");}
    return Object.keys(feature.properties).length;
}

/**
 * Returns true if the  feature contains a property with the specified name.
 *
 * @param feature The feature data.
 * @returns True if the feature contains a property with the specified name.
 */
export function hasAttrib(feature: turf.Feature, name: string): boolean {
    if (!feature.hasOwnProperty("properties")) {throw new Error("Feature does not contain properties");}
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
export function getValue(feature: turf.Feature, name: string): any {
    if (!feature.hasOwnProperty("properties")) {throw new Error("Feature does not contain properties");}
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
export function setValue(feature: turf.Feature, name: string, value: any): void {
    if (!feature.hasOwnProperty("properties")) {throw new Error("Feature does not contain properties");}
    feature.properties[name] = value;
}
