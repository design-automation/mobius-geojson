/**
 * Reduced Functions from Beijing Workshop (ver. 2): Feature scale
 */
// [V] Removed Area injection as existing area calculation fn can be used - no need to be injected at block coding level

import * as turf from "@turf/turf";
import * as pp from "papaparse";
import * as math from "mathjs";

/**
 * Injects properties from source csv into target Feature
 * Each injected data will be accessible in: (Feature).properties.(injName).(csvHeaderRowName - based on headerRow)
 * Array of All HeaderRow names can be accessed from: (Feature).properties.(injName)
 * .allKeys
 * .allValues
 *
 * @param csvFile Source csv file
 * @param feat Target Feature
 * @param property Source property name
 * @param injName Name for injection
 * @param searchColumn Column index number
 * @param headerRow Row index number
 * @param csvColumns Array of Column indices to extract
 */
export function csvFeatInjection(csvFile: string, feat: turf.Feature, property: string, injName: string,
                                 searchColumn: number, headerRow: number, csvColumns: number[]): void {
    const csvData: string[][] = csvParse(csvFile,",").data;
    const head: string[] = csvData[headerRow]; // array of header names
    const skipArr: number[] = [];
    for (let r =0; r < csvData.length; r++) {
        if (skipArr.indexOf(r) !== -1) {continue;} // row was already injected
        if (csvData[r][searchColumn] === feat.properties[property]) { // found row to extract data
            skipArr.push(r);
            csvColumns.forEach((i) => {
                feat.properties[injName][head[i]] = csvData[r][i];
                checkNInject(feat,injName+".allKeys",head[i],true);
                checkNInject(feat,injName+".allValues",csvData[r][i],true);
            });
            break; // go on to next feat
        }
    }
    csvColumns.forEach((i) => { // failed to find - set 0 to feat with same header name
        feat.properties[head[i]] = 0;
    });
    return;
}

/**
 * Gets Value of Property
 *
 * @param feat Feature
 * @param propName Child from (Feature).properties.(propName): Nested Child may be indicated with "."
 */
export function getPropValue(feat: turf.Feature, propName: string): any {
    return findChildValue(propName,feat);
}

/**
 * Sets Value of Property
 *
 * @param feat Feature
 * @param propName Child from (Feature).properties.(propName): Nested Child may be indicated with "."
 * @param injValue Value to be injected
 */
export function setPropValue(feat: turf.Feature, propName: string, injValue: any): void {
    checkNInject(feat,propName,injValue,false);
    return;
}

/**
 * Calculates and injects distance of target to feature: Feature.properties.(injName).(featName)
 * CenterPoints will be used for non-point Features.
 * Calculated Distance are all accessible in: (Feature).properties.(injName)
 *
 * @param feat Feature
 * @param nameProp1 property which will be used as key to tag distance on features in fColl: Defaults 'featName'
 * @param fColl FeatureCollection
 * @param nameProp2 property which will be used as key to tag distance on feature: Defaults 'featName'
 * @param injName Name of Injection
 * @param condition min|max|mean to be injected into Feature. Multiple may be separated by semi-colons ";"
 */
export function distanceInjection(feat: turf.Feature<turf.Polygon|turf.Point|turf.LineString>,
                                  nameProp1: string = "featName",
                                  fColl: turf.FeatureCollection<turf.Polygon|turf.Point|turf.LineString>,
                                  nameProp2: string = "featName", injName: string, condition: string = ""): void {
    const featCoords: number[][] = coordFrmFeatLoop(feat);
    featCoords.forEach((f1coord) => {
        fColl.features.forEach((feat2) => {
            const f2coords: number[][] = coordFrmFeatLoop(feat2);
            const distArr: number[] = [];
            f2coords.forEach((f2coord) => {
                distArr.push(turf.distance(f1coord,f2coord));
            });
            const minVal = math.min(distArr);
            const maxVal = math.max(distArr);
            const meanVal = math.mean(distArr);
            const calcObj = {min: minVal, max: maxVal, mean:meanVal};
            const strArr = removeEmpty(condition.replace(/\s/g,"@").split("@").join("").split(";"));
            strArr.forEach((cond) => {
                checkNInject(feat,injName+"."+nameProp2+cond,calcObj[cond],false);
                checkNInject(feat2,injName+"."+nameProp1+cond,calcObj[cond],false);
            });
        });
    });
}

/**
 * Loops through FeatureCollection and returns an Array of features that are inside/outside target Feature
 * @param feat target feature
 * @param fColl FeatureCollection to loop throuh
 * @param inOut Accepted strings: "in"|"out"
 * @return Array of Features from input FeatureCollection which are either inside|outside the input Feature
 */
export function featFCollInt(feat: turf.Feature, fColl: turf.FeatureCollection, inOut: string = "in"):
turf.Feature[] {
    if (inOut !== "in") {
        if (inOut !== "out") {
            throw new Error("Invalid inOut rule");
        }
    }
    const retArr = [];
    fColl.features.forEach((fCollFeat) => {
        const olap = turf.booleanOverlap(feat,fCollFeat);
        const contain = turf.booleanContains(feat,fCollFeat);
        const within = turf.booleanWithin(fCollFeat,feat);
        if (olap||contain||within) {
            if (inOut === "in") {retArr.push(fCollFeat);}
        } else {
            if (inOut === "out") {retArr.push(fCollFeat);}
        }

    });
    return retArr;
}

/**
 * Uses set attributes to calculate and inject a numerical|boolean result based on user-defined expression.
 * User may filter out features that returns a boolean result in the expression
 *
 * @param fColl FeatureCollection
 * @param propName Array<string> result of expression will be set in location, with newAttribName as key
 * Allows child definition with "."
 * More than one name (1:1 to number of solutions) may be defined by user in the array
 * @param varDef Define variables used in expression by equating to child of 'properties' in feature
 * @param expression: expressions should be separated with semi-colons (;) and solutions to be returned should be in
 * square brackets "[]". Multiple solutions should be separated by semi-colons.
 * (white space is optional)
 * e.g "var1 = var1/1000; [var1/var2;var1+var2]" NOTE: Semi-colon serves as a separator in the solution brackets
 * @param filter ""|"true"|"false": returns a FeatureCollection if expression returns a boolean: extract none|true|false
 * @return FeatureCollection
 */
export function attribMath(fColl: turf.FeatureCollection, propName: string[] = [], varDef: string,
                           expression: string, filter: string = ""): turf.FeatureCollection {
// use mathjs eval for expressions handling: but requires replacement of attributes in expression first
    if (solnLength(expression)!== propName.length) {
        throw new Error("Number of propNames defined !== Number of Solutions");
    }
    const retFeatArr: turf.Feature[] = [];
    fColl.features.forEach((feat) => {
        let res = mathJSResult(feat,varDef,expression);
        if (res !== Array) {res = [res];}
        for (let i=0; i<propName.length; i++) {
            checkNInject(feat, propName[i], res[i],false);
            if (typeof res[i] === "boolean") {
                if (res[i] === true && filter === "true") {
                    retFeatArr.push(feat);
                } else if (res[i] === false && filter === "false") {
                    retFeatArr.push(feat);
                }
            }
        }
    });
    if (filter === "") {
        return fColl;
    } else {return turf.featureCollection(retFeatArr);}
}

/**
 * Loops through array of features and returns min|max|mean value of specified property
 * @param featArr Array of Features
 * @param prop String: nested property may be separated with a "." (parent).(child)
 * note: property search begins from (Feature).properties - do not include
 * @param calc "min"|"max"|"mean"
 * @return min|max|mean value
 */
export function featArrMinMaxMean(featArr: turf.Feature[], prop: string, calc: string): number {
    const propArr: number[] = [];
    featArr.forEach((feat) => {
        const retVal = findChildValue(prop,feat);
        if (typeof retVal !== "number") {throw new Error ("Target Property is not a number");}
        propArr.push(retVal);
    });
    switch (calc) {
        case "min":
            return math.min(propArr);
            break;
        case "max":
            return math.max(propArr);
            break;
        case "mean":
            return math.mean(propArr);
            break;
    }
}

/**
 *
 * ARRAY - CREATE functions ********************************************************************************************
 *
 */

/**
 * Creates a new array of integer numbers between two bounds.
 * Lower bound is inclusive and upper bound is exclusive.
 *
 * @param min Lower bound integer.
 * @param max Upper bound integer.
 * @returns New array.
 * @example array = Array.range(0,5)
 *
 * Expected value of array is [0,1,2,3,4].
 */
export function byRange(min: number, max: number): number[] {
    if (min === undefined) {throw new Error("Invalid arg: min must be defined.");}
    if (max === undefined) {throw new Error("Invalid arg: max must be defined.");}
    const len: number = max - min;
    if (len <= 0) {return [];}
    return Array.apply(0, new Array(len)).map((v, i) => i + min);
}

/**
 *
 * GEOJSON - PROP functions ********************************************************************************************
 *
 */

/**
 * Returns an array of all the property names for this feature.
 *
 * @param feature The feature data.
 * @returns An array of property names
 */
export function getPropNames(feature: turf.Feature): string[] {
    if (!feature.hasOwnProperty("properties")) {return [];}
    return Object.keys(feature.properties);
}

/**
 *
 * TURF - CALC functions ***********************************************************************************************
 *
 */

/**
 * Returns True if the second geometry is completely contained by the first geometry.
 * The interiors of both geometries must intersect and, the interior and boundary of the secondary (geometry b)
 * must not intersect the exterior of the primary (geometry a).
 * (Opposite result of within.)
 *
 * @param {Geometry|Feature<any>} feature1 GeoJSON Feature or Geometry
 * @param {Geometry|Feature<any>} feature2 GeoJSON Feature or Geometry
 * @returns {boolean} true/false
 * @example
 * var line = geo.create.lineString([[1, 1], [1, 2], [1, 3], [1, 4]]);
 * var point = geo.create.point([1, 2]);
 *
 * geo.compare.contains(line, point);
 * //=true
 */
export function isContained(feature1: turf.Feature, feature2: turf.Feature): boolean {
    return turf.booleanContains(feature1, feature2);
}

/**
 * Returns true if the intersection of the two geometries is an empty set.
 *
 * @param {Geometry|Feature<any>} feature1 GeoJSON Feature or Geometry
 * @param {Geometry|Feature<any>} feature2 GeoJSON Feature or Geometry
 * @returns {boolean} true/false
 * @example
 * var point = geo.create.point([2, 2]);
 * var line = geo.create.lineString([[1, 1], [1, 2], [1, 3], [1, 4]]);
 *
 * geo.compare.disjoint(line, point);
 * //=true
 */
export function isDisjoint(feature1: turf.Feature, feature2: turf.Feature): boolean {
    return turf.booleanDisjoint(feature1, feature2);
}

/**
 * Determine whether two geometries of the same type have identical X,Y coordinate values.
 * See http://edndoc.esri.com/arcsde/9.0/general_topics/understand_spatial_relations.htm
 *
 * @param {Geometry|Feature} feature1 GeoJSON input
 * @param {Geometry|Feature} feature2 GeoJSON input
 * @returns {boolean} true if the objects are equal, false otherwise
 * @example
 * var pt1 = geo.create.point([0, 0]);
 * var pt2 = geo.create.point([0, 0]);
 * var pt3 = geo.create.point([1, 1]);
 *
 * geo.compare.equal(pt1, pt2);
 * //= true
 * geo.compare.equal(pt2, pt3);
 * //= false
 */
export function isEqual(feature1: turf.Feature, feature2: turf.Feature): boolean {
    return turf.booleanEqual(feature1, feature2);
}

/**
 * Takes a Point and a Polygon or MultiPolygon and determines if the point resides inside the polygon. The polygon can
 * be convex or concave. The function accounts for holes.
 *
 * @param {Coord} point input point
 * @param {Feature<Polygon|MultiPolygon>} polygon input polygon or multipolygon
 * @param {Object} options Optional parameters
 * (ignoreBoundary: True if polygon boundary should be ignored when determining
 * if the point is inside the polygon otherwise false.)
 * @param {boolean} ignoreBoundary
 * True if polygon boundary should be ignored when determining if the point is inside the polygon otherwise false.
 * @returns {boolean} `true` if the Point is inside the Polygon; `false` if the Point is not inside the Polygon
 * @example
 * var pt = geo.create.point([-77, 44]);
 * var poly = geo.create.polygon([[
 *   [-81, 41],
 *   [-81, 47],
 *   [-72, 47],
 *   [-72, 41],
 *   [-81, 41]
 * ]]);
 *
 * geo.compare.pointInPolygon(pt, poly);
 * //= true
 */
export function isPointInPolygon(point: turf.Point, polygon: turf.Polygon, ignoreBoundary: boolean): boolean {
    return turf.booleanPointInPolygon(point, polygon, {ignoreBoundary});
}

/**
 * Returns true if the first geometry is completely within the second geometry.
 * The interiors of both geometries must intersect and, the interior and boundary of the primary (geometry a)
 * must not intersect the exterior of the secondary (geometry b).
 * (Opposite result of the contains.)
 *
 * @param {Geometry|Feature<any>} feature1 GeoJSON Feature or Geometry
 * @param {Geometry|Feature<any>} feature2 GeoJSON Feature or Geometry
 * @returns {boolean} true/false
 * @example
 * var line = geo.create.lineString([[1, 1], [1, 2], [1, 3], [1, 4]]);
 * var point = geo.create.point([1, 2]);
 *
 * geo.compare.within(point, line);
 * //=true
 */
export function isWithin(feature1: turf.Feature, feature2: turf.Feature): boolean {
    return turf.booleanWithin(feature1, feature2);
}

/**
 *
 * TURF - CALC Functions ***********************************************************************************************
 *
 */

/**
 * Takes one or more features and returns their area in square meters.
 *
 * @param {GeoJSON} features input GeoJSON feature(s)
 * @returns {number} area in square meters
 * @example
 * var polygon = geo.create.polygon([[[125, -15], [113, -22], [154, -27], [144, -15], [125, -15]]]);
 *
 * var area = geo.calc.area(polygon);
 */
export function areaPolygon(features: turf.AllGeoJSON): number {
    return turf.area(features);
}

/**
 * Calculates the distance between two points in degrees, radians,
 * miles, or kilometers. This uses the
 * [Haversine formula](http://en.wikipedia.org/wiki/Haversine_formula)
 * to account for global curvature.
 *
 * @param {Coord} point1 origin point
 * @param {Coord} point2 destination point
 * @param {Object} options Optional parameters
 * (units: "miles", "kilometers", "degrees", or "radians")
 * @returns {number} distance between the two points
 * @example
 * var from = geo.create.point([-75.343, 39.984]);
 * var to = geo.create.point([-75.534, 39.123]);
 * var options = {units: 'miles'};
 *
 * var distance = geo.calc.distance(from, to, options);
 */
export function distancePointToPoint(point1: turf.Point, point2: turf.Point/*, options: {units: turf.Units}*/): number {
    return (turf.distance(point1, point2/*, options*/))*1000;
}

/**
 *
 * TURF - CREATE Functions *********************************************************************************************
 *
 */

/**
 * Calculates a buffer for input features for a given radius. Units supported are miles, kilometers, and degrees.
 *
 * When using a negative radius, the resulting geometry may be invalid if
 * it's too small compared to the radius magnitude. If the input is a
 * FeatureCollection, only valid members will be returned in the output
 * FeatureCollection - i.e., the output collection may have fewer members than
 * the input, or even be empty.
 *
 * @param {FeatureCollection|Geometry|Feature<any>} features input to be buffered
 * @param {number} radius distance to draw the buffer (in meters, negative values are allowed)
 * @param {Object} options Optional parameters
 * (units: "miles", "nauticalmiles", "degrees", "radians", "inches", "yards", "meters", "kilometers",
 * steps: number of steps)
 * @param {number} steps number of steps
 * @returns {FeatureCollection|Feature<Polygon|MultiPolygon>|undefined} buffered features
 * @example
 * var point = geo.create.point([-90.548630, 14.616599]);
 * var buffered = geo.feature.buffer(point, 500, {units: 'miles'});
 */
export function polygonByBuffer(features: turf.GeometryObject|turf.Feature,radius: number,steps: number): turf.Feature {
    return turf.buffer(features,radius/1000,{steps});
}

/**
 * Creates a LineString Feature from an Array of Positions.
 *
 * @param {Array<Array<number>>} coords an array of Positions
 * @param {Object} properties Optional object of key-value pairs to add as properties
 * @param {Object} options Optional Parameters
 * (bbox: Bounding Box Array [west, south, east, north] associated with the Feature,
 * id: Identifier associated with the Feature)
 * @returns {Feature<LineString>} LineString Feature
 * @example
 * var linestring1 = geo.create.lineString([[-24, 63], [-23, 60], [-25, 65], [-20, 69]], {name: 'line 1'});
 * var linestring2 = geo.create.lineString([[-14, 43], [-13, 40], [-15, 45], [-10, 49]], {name: 'line 2'});
 *
 * //=linestring1
 * //=linestring2
 */
export function lineByCoords(coords: number[][]): turf.Feature<turf.LineString> {
    return turf.lineString(coords);
}

/**
 * Takes a Feature or FeatureCollection and returns the absolute center point of all features.
 *
 * @param {GeoJSON} features GeoJSON to be centered
 * @param {Object} options Optional parameters
 * (properties: an Object that is used as the Feature's properties)
 * @returns {Feature<Point>} a Point feature at the absolute center point of all input features
 * @example
 * var features = geo.create.featureCollection([
 *   geo.create.point( [-97.522259, 35.4691]),
 *   geo.create.point( [-97.502754, 35.463455]),
 *   geo.create.point( [-97.508269, 35.463245])
 * ]);
 *
 * var center = geo.calc.center(features);
 */
export function pointByCenter(features: turf.AllGeoJSON, options: {properties: object}): turf.Feature<turf.Point> {
    return turf.center(features, options);
}

/**
 *
 * Util Function *******************************************************************************************************
 *
 */

function ensureCoordArr(feature: turf.Feature<turf.LineString|turf.Point|turf.Polygon>): number[][] {
    let coordArr: any = feature.geometry.coordinates;
    while (coordArr.length === 1) {coordArr = coordArr[0];}
    return coordArr;
}

function pointCoordinArr(pt: turf.Feature<turf.Point>): number[][] {
    let retCoord: any = ensureCoordArr(pt);
    if(retCoord.length !== 1) {
        retCoord = [retCoord];
    }
    return retCoord;
}

function coordFrmFeatLoop(feat: turf.Feature<turf.Point|turf.LineString|turf.Polygon>): number[][] {
    if (feat.geometry.type === "Point") {
        const ptFeat = feat as turf.Feature<turf.Point>;
        return pointCoordinArr(ptFeat);
    } else {return ensureCoordArr(feat);}
}

function propertyInjection(srcFeat: turf.Feature<turf.LineString|turf.Polygon|turf.Point>,
                           tarFeat: turf.Feature<turf.LineString|turf.Polygon|turf.Point>,
                           srcProp: string[], injName: string, rename: string[]): void {
    if (rename.length === 0) {rename = srcProp;}
    for (let i=0; i<srcProp.length; i++) {
        if (srcFeat === undefined) {
            tarFeat.properties[injName][rename[i]] = 0;
            checkNInject(tarFeat,injName+".allValues",0,true); // inject allValues (0s)
        } else {
            tarFeat.properties[injName][rename[i]] = srcFeat.properties[srcProp[i]];
            checkNInject(tarFeat,injName+".allValues",srcFeat.properties[srcProp[i]],true); // inject allValues
        }
    }
    tarFeat.properties[injName].allKeys = rename; // inject allKeys
    return;
}

function csvParse(str: string, delimiter: string): pp.ParseResult {
    if (str === undefined) {throw new Error("Invalid arg: str must be defined.");}
    if (delimiter === undefined) {return pp.parse(str);}
    return pp.parse(str, {delimiter});
}

function coordPrepDistClac(feat: turf.Feature<turf.Polygon|turf.LineString|turf.Point>): number[]|number[][] {
     switch (feat.geometry.type) {
         case "Point":
             return feat.geometry.coordinates;
             break;
         case "Polygon":
             return turf.center(feat).geometry.coordinates;
             break;
         case "LineString":
             return feat.geometry.coordinates;
             break;
     }
}

function checkNInject(feat: turf.Feature, propName: string,
                      injValue, injArr: boolean): void {
    findChildInject(removeEmpty(propName.split(".")),feat,undefined,injValue, injArr);
    return;
}

function findChildInject(arr: string[], feat: turf.Feature, nxt: any, injVal, injArr: boolean): void {
// recursively find target child and injects value
    let retObj;
    if (arr.length > 1) {
        if (nxt === undefined) {
            if (!feat.hasOwnProperty("properties")) {feat.properties = {};}
            retObj = feat.properties[arr[0]]; // retrieval starts from properties
        } else {
            retObj = nxt[arr[0]];
        }
        arr.shift();
        if (retObj === undefined) {throw new Error("Invalid child definition");}
        return findChildInject(arr,feat,retObj,injVal,injArr);
    } else { // child injection
        switch (injArr) {
            case true: // inject into an array
                if (retObj[arr[0]] === undefined) {
                    retObj[arr[0]] = [injVal];
                } else {
                    retObj[arr[0]] = retObj[arr[0]].concat([injVal]);
                }
                break;
            case false: // simple injection (allows override)
                retObj[arr[0]] = injVal;
        }
    }
}

function minMaxMean(feat: turf.Feature, injName: string): void {
    const injObj = feat.properties[injName];
    injObj.minValue = math.min(injObj.allValues); // calc minDist and inject
    injObj.maxValue = math.max(injObj.allValues); // calc maxDist and inject
    injObj.meanValue = math.mean(injObj.allValues); // calc meanDist and inject
    injObj.minKey = findKey(injObj,injObj.minDist); // logs key with minDist
    injObj.maxKey = findKey(injObj,injObj.maxDist); // logs key with maxDist
}

function findKey(obj, value): string {
    return Object.keys(obj).find((key) => obj[key] === value);
}

/*
* MathJS Prep Functions **********************************************************************************************
* mathjs takes in variable definitions separated by semi-colons before expression.
* this will parse and return a concated string that can be appended to front of expression before passing into mathjs
* https://codepen.io/derekpung/pen/EpXvpd?editors=0010
*/

function solnLength(exp) {
    const step1 = exp.replace(/\s/g,"@").split("@").join("");
    const check = removeEmpty(step1.split("[")).length;
    const step2 = removeEmpty(step1.replace(/\[|\]/g, "@").split("@"));
    let final: string;
    if (check === 1) {
        final = step2[0];
    } else {final = step2[1];}
    return removeEmpty(final.split(";")).length;
}

function mathJSResult(feat: turf.Feature, varDef: string, expression: string) {
    const mathjsPrep = variableDef(feat, varDef);
    expression = mathjsPrep + expression; // append variable definitions to front
    return math.compile(expression).eval();
 }

function variableDef(feat: turf.Feature, str: string): string {
    str = str.replace(/\s/g,"@").split("@").join(""); // removes white space
    const arr = removeEmpty(str.split(";")); // split into separate variable definitions
    let retStr: string = "";
    arr.forEach((defStr) => { // each definition string needs to split at "="
        const defArr = removeEmpty(defStr.split("=")); // should only have two parts
        if (defArr.length !== 2) {throw new Error("varDef is invalid");}
        const retValue = findChildValue(defArr[1], feat);// extracts value from feature
        if (typeof retValue !== "number") {throw new Error("target value is not a number");}
        retStr = retStr.concat(defArr[0] + "=" + retValue.toString + ";");
    });
    return retStr;
}

function removeSymbols(str: string): string {
    return removeEmpty(str.replace(/\<|\>|\=/g, "@").split("@"))[0];
}

function removeEmpty(arr: string[]): string[] {
    return arr.filter((item) => item.length>0);
}

function recursiveChild(arr: string[], feat: turf.Feature, nxt: any): any { // recursively find child value
    let retObj;
    if (nxt === undefined) {
        retObj = feat.properties[arr[0]]; // retrieval starts from properties
    } else {
        retObj = nxt[arr[0]];
    }
    arr.shift();
    if (retObj === undefined) {throw new Error("Invalid child definition");}
    if (arr.length !== 0) {
        return recursiveChild(arr,feat,retObj);
    } else {
        return retObj;
    }
}

function findChildValue(str: string, feat: turf.Feature): any {
    const cleanedStr = str.replace(/\s/g,"@").split("@").join(""); // removes white space
    return recursiveChild(removeEmpty(cleanedStr.split(".")),feat,undefined);
}
