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
 * Returns an object of key-value pairs for all the properties of this feature.
 *
 * @param feature The feature data.
 * @returns An object of key-value pairs.
 */
export function get(feature: turf.Feature): turf.Properties {
    if (!feature.hasOwnProperty("properties")) {throw new Error("Feature does not contain properties");}
    return feature.properties;
}

/**
 * Returns an array of all the property names for this feature.
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
export function numProps(feature: turf.Feature): number {
    if (!feature.hasOwnProperty("properties")) {throw new Error("Feature does not contain properties");}
    return Object.keys(feature.properties).length;
}

/**
 * Returns true if the feature contains a property with the specified name.
 *
 * @param feature The feature data.
 * @param name The name of the property, a string.
 * @returns True if the feature contains a property with the specified name.
 */
export function hasProp(feature: turf.Feature, name: string): boolean {
    if (!feature.hasOwnProperty("properties")) {throw new Error("Feature does not contain properties");}
    return feature.properties.hasOwnProperty(name);
}

/**
 * Returns the property value for the property with the specified name.
 * If the property does not exist, throws an error.
 *
 * @param feature The feature data.
 * @param name The name of the property, a string.
 * @returns The property value.
 */
export function getValue(feature: turf.Feature, name: string): any {
    if (!feature.hasOwnProperty("properties")) {throw new Error("Feature does not contain properties");}
    const result: any = feature.properties[name];
    if (result === undefined) {throw new Error("Property " + name + " not found.");}
    return result;
}

/**
 * Sets the property value for the property with the specified name.
 * If the property does not exist, it is created.
 *
 * @param feature The feature data.
 * @param name The name of the property, a string.
 * @param value The value of the property, any value.
 * @returns The name of the property. (This may differ from input name if input name is not valid.)
 */
export function setValue(feature: turf.Feature, name: string, value: (string|number)): string {
    if (!feature.hasOwnProperty("properties")) {throw new Error("Feature does not contain properties");}
    const regexp = /^[a-zA-Z_]\w*(\.[a-zA-Z_]\w*)*$/;
    if (!regexp.test(name)) { name = "_" + name}
    feature.properties[name] = value;
    return name;
}

/**
 * Sets the property values for the properties with the specified names.
 * If the properties do not exist, they are created.
 *
 * @param feature The feature data.
 * @param names An array of names of the properties.
 * @param values An array of values of the properties.
 * @returns The number of properties that were set.
 */
export function setValues(feature: turf.Feature, names: string[], values: (string|number)[]): number {
    if (names.length !== values.length) {throw new Error("Arrays must be of equal length.");}
    let counter = 0;
    for(let i = 0; i< names.length; i++) {
        const name: string = names[i];
        let value: (string|number) =  values[i];
        if (name !== undefined) {
            //if (value === undefined) {value = ???} /// TODO string or number
            counter++;
            setValue(feature, name, value);
        }
    }
    return counter;
}
