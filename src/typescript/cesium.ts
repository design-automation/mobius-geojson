/**
 * Functions for adding UI components to Cesium.
 */

import * as turf from "@turf/turf";

interface CesiumExtrudeProp {
    name: string;
    min: number;
    max: number;
    invert: boolean;
    scale: number;
    line: boolean;
}

interface CesiumColourProp {
    name: string;
    min: number;
    max: number;
    invert: boolean;
}


interface CesiumFilter {
    descr: string;
    name: string;
    relation: number;
    value: (string|number);
}

interface CesiumFeatureCollection extends turf.FeatureCollection {
    cesium?: {
        select?: Array<string>;
        extrude?: {
            descr: string;
            attribs: Array<CesiumExtrudeProp>;
        };
        colour?: {
            descr: string;
            attribs: Array<CesiumColourProp>;
        };
        filters?: Array<CesiumFilter>;
    }
}

/**
 * Add a property display option.
 * @param featureColl FeatureCollection to add property display option to
 * @param name The name of the property to display.
 * @returns FeatureCollection with added display properties.
 */
export function addPropDisplay(featureColl: CesiumFeatureCollection, name:string):
                           CesiumFeatureCollection {
    if (!featureColl.hasOwnProperty("cesium")) {
        featureColl.cesium = {};
    }
    if (!featureColl.cesium.hasOwnProperty("select")) {
        featureColl.cesium.select = [];
    }
    featureColl.cesium.select.push(name);
    return featureColl;
}

/**
 * Add an extrude dropdown to the Cesium Viewer.
 * @param featureColl FeatureCollection to add extrude dropdown to
 * @param descr A description for the dropdown.
 * @returns FeatureCollection with added extrude dropdown property.
 */
export function addExtrude(featureColl: CesiumFeatureCollection, descr: string):
                           CesiumFeatureCollection {
    if (!featureColl.hasOwnProperty("cesium")) {
        featureColl.cesium = {};
    }
    featureColl.cesium.extrude = {descr, attribs: []};
    return featureColl;
}

/**
 * Add an entry to the extrude dropdown in the Cesium Viewer.
 * @param featureColl FeatureCollection to add entry to
 * @param name The name of the property to add as entry.
 * @param min Minimum value in data to extrude.
 * @param max Maximum value in data to extrude.
 * @param invert Inverts the extrusion if true (larger values are extruded less).
 * @param scale Scale factor of extrusion (if scale = 1, extrusion distance = value).
 * @param line Displays FeatureCollection as lines if true.
 * @returns FeatureCollection with added extrude dropdown property.
 */
export function addExtrudeEntry(featureColl: CesiumFeatureCollection,
                                name: string, min: number, max: number, invert: boolean,
                                scale: number, line: boolean):
                                CesiumFeatureCollection {

    if (!featureColl.hasOwnProperty("cesium")) {
        featureColl.cesium = {};
    }
    if (!featureColl.cesium.hasOwnProperty("extrude")) {
        featureColl.cesium.extrude = {descr: "", attribs: []};
    }
    featureColl.cesium.extrude.attribs.push({name, min, max, invert, scale, line});
    return featureColl;
}

/**
 * Add a colour dropdown to the Cesium Viewer.
 * @param featureColl FeatureCollection to add extrude dropdown to
 * @param descr A description for the dropdown.
 * @returns FeatureCollection with added colour dropdown property.
 */
export function addColour(featureColl: CesiumFeatureCollection, descr: string):
                          CesiumFeatureCollection {
    if (!featureColl.hasOwnProperty("cesium")) {
        featureColl.cesium = {};
    }
    featureColl.cesium.colour = {descr, attribs: []};
    return featureColl;
}

/**
 * Add an entry to the colour dropdown in the Cesium Viewer.
 * @param featureColl FeatureCollection to add entry to
 * @param name The name of the property to add as entry.
 * @param min Minimum value in data to colour (blue).
 * @param max Maximum value in data to colour (red).
 * @param invert Inverts the colours if true (larger values are coloured blue).
 * @returns FeatureCollection with added colour dropdown property.
 */
export function addColourEntry(featureColl: CesiumFeatureCollection,
                               name: string, min: number, max: number, invert: boolean):
                               CesiumFeatureCollection {

    if (!featureColl.hasOwnProperty("cesium")) {
        featureColl.cesium = {};
    }
    if (!featureColl.cesium.hasOwnProperty("colour")) {
        featureColl.cesium.colour = {descr: "", attribs: []};
    }
    featureColl.cesium.colour.attribs.push({name, min, max, invert});
    return featureColl;
}

/**
 * Add a category filter to the Cesium Viewer.
 * @param featureColl FeatureCollection to add entry to
 * @param name The name of the property to add as filter.
 * @param relation Relation between data to filter and value. (no relation: "none", equal: "==", not equal: "!=")
 * @param value Value used to filter data.
 * @returns FeatureCollection with added filter property.
 */
export function addFilterCat(featureColl: CesiumFeatureCollection,
                             descr: string, name: string, relation: string, value: string):
                             CesiumFeatureCollection {
    if (!featureColl.hasOwnProperty("cesium")) {
        featureColl.cesium = {};
    }
    if (!featureColl.cesium.hasOwnProperty("filters")) {
        featureColl.cesium.filters = [];
    }
    const relations_cat: Map<string, number> = new Map([["none", 0], ["==", 1], ["!=", 2]]);
    const relation_id: number = relations_cat.get(relation);
    featureColl.cesium.filters.push({descr, name, relation: relation_id, value});
    return featureColl;
}

/**
 * Add a numeric filter.
 * @param featureColl FeatureCollection to add entry to
 * @param name The name of the property to add as filter.
 * @param relation Relation between data to filter and value. (more than: ">", less than: "<", equal: "==")
 * @param value Value used to filter data.
 * @returns FeatureCollection with added filter property.
 */
export function addFilterNum(featureColl: CesiumFeatureCollection,
                             descr: string, name: string, relation: string, value: number):
                             CesiumFeatureCollection {
    if (!featureColl.hasOwnProperty("cesium")) {
        featureColl.cesium = {};
    }
    if (!featureColl.cesium.hasOwnProperty("filters")) {
        featureColl.cesium.filters = [];
    }
    const relations_num: Map<string, number> = new Map([[">", 0], ["<", 1], ["==", 2]]);
    const relation_id: number = relations_num.get(relation);
    featureColl.cesium.filters.push({descr, name, relation: relation_id, value});
    return featureColl;
}
