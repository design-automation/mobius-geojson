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
 * Injects specified name into each Feature within Feature Collection: Feature.properties.featName
 *
 * @param fColl FeatureCollection
 * @param featName string with a number concat to its end will be injected into each Feature
 * @param startNum Defaults 0: number which will be concat to featName
 */
export function nameInjection(fColl: turf.FeatureCollection, featName: string, startNum: number = 0): void {
     let i = startNum;
     fColl.features.forEach((feat) => {
         feat.properties.featName = featName + i.toString;
         i++;
     });
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
 * Grids Polygon
 * @param poly Accepts Single Polygon Feature
 * @param size Dimension of each square gird, in meters
 * @param polyProp Array of property names to extract and inject into each cell
 * @param mask Function will only return cells that fall within mask
 * @param masProp Array of property names to extract and inject into each cell
 * @returns Merged FeatureCollection
 */
export function gridPoly(poly: turf.Feature<turf.Polygon>, size: number = 500, polyProp: string[] = [],
                         mask?: turf.FeatureCollection <turf.Point|turf.Polygon>, maskProp: string[] = []):
turf.FeatureCollection<turf.Polygon> {
    if (poly === undefined) {throw new Error("poly is undefined");}
    if (maskProp.length !== 0 && mask === undefined) {throw new Error("mask is undefined");}
    const toPassProp = {};
    polyProp.forEach((prop) => {
        if (!poly.properties.hasOwnProperty(prop)) {
            throw new Error("poly does not contain property");
        } else {
            toPassProp[prop] = poly.properties[prop];
        }
    });
    const gridfColl = turf.squareGrid(turf.bbox(poly), size/1000, {mask: poly, properties: toPassProp});
    if (mask === undefined) {return gridfColl;}
    // poly into grid, with injected properties
    const arr: Array<turf.Feature<turf.Polygon>> = [];
    gridfColl.features.forEach((cell) => {
        mask.features.forEach((maskFeat) => {
            const olap = turf.booleanOverlap(cell,maskFeat);
            const contain = turf.booleanContains(maskFeat,cell);
            const within = turf.booleanWithin(cell,maskFeat);
            if (olap||contain||within) {
                maskProp.forEach((propName) => { // set mask properties to cell
                    cell.properties[propName] = maskFeat.properties[propName];
                });
                arr.push(cell);
            }
        });
    });
    return turf.featureCollection(arr); // return grids masked to features
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

/*
 *
 * GeoHash Functions ***************************************************************************************************
 *
*/

interface IGeoHashObj {
    geoHash: string;
    precision: number;
}

interface IGeoHashDict {
    precision: number;
}

/**
 * Injects each feature with a GeoHash, and returns a GeoHash dictionary
 *
 * @param fColl FeatureCollection
 * @param precision Max number of letters in encoded GeoHash
 * @return GeoHash dictionary with array of featureIndex as values
 */
export function geoHashDictionary(fColl: turf.FeatureCollection<turf.Point|turf.LineString|turf.Polygon>,
                                  precision: number = 8): IGeoHashDict { //
    const dict: IGeoHashDict = {precision};
    const fCollFeats = fColl.features;
    for (let i = 0; i<fCollFeats.length; i++) {
        const feat = fCollFeats[i];
        const geoHashObj = geoHashEncode(feat,precision);
        const geoHashRes = geoHashObj.geoHash;
        // precision = geoHashObj.precision;
        dict.precision = geoHashObj.precision;
        for (let j = 0; j<geoHashRes.length; j++) { // each dictionary key entry will have an array of indices
            if (dict.hasOwnProperty(geoHashRes.slice(0,j+1))) {
                dict[geoHashRes.slice(0,j+1)] = dict[geoHashRes.slice(0,j+1)].concat([i]);
            } else {
                dict[geoHashRes.slice(0,j+1)] = [i];
            }
        }
    }
    // remove dictionary keys that have length > precision
    // Object.keys(dict).forEach((key) => {
    //     if (key.length > precision) {
    //         delete dict[key];
    //     }
    // });
    // dict.precision = precision;
    return dict;
}

/**
 * Injects feature with a geoHash, and returns a geoHash string
 *
 * @param feature LineString, Point, or Polygon
 * @param precision Max number of letters in encoded GeoHash
 * @return Object containing GeoHash and Precision values
 */
export function geoHashEncode(feature: turf.Feature<turf.LineString|turf.Polygon|turf.Point>, precision: number = 8):
IGeoHashObj {
    let coordArr: number[][];
    const geomType = feature.geometry.type;
    let dictPrecision = precision;
    if (geomType === "Polygon"||geomType === "LineString") {
    // needs to ensure that boundaries of polygon/line falls within bbox of a geoHash
    // means geoHash precision needs to be low enough for diagonal boundary points to have same hash value
        coordArr = ensureCoordArr(turf.bboxPolygon(turf.bbox(feature)));
        coordArr = [coordArr[0],coordArr[2]]; // line|Polygon will have four geoHash values
    } else if (geomType === "Point") {
        coordArr = ensureCoordArr(feature);
    }
    const geoHashArr: string[] = []; // check for polygon | line
    let geoHashRes: string;
    coordArr.forEach((coord) => { // line|Polygon will have two geoHash values - one for each diagonal bBox point
        let minLat = -90;
        let maxLat = 90;
        let minLon = -180;
        let maxLon = 180;
        const lat: number = coord[0];
        const lon: number = coord[1];
        let binConv: string = "";
        for (let j = 0; j<precision*5; j++) {
            if (j%2===0) { // even are longitude
                const mid = (maxLon+ minLon)/2;
                if (lon<mid) {
                    binConv += "0";
                    maxLon = mid;
                } else {
                    binConv += "1";
                    minLon = mid;
                }
            }
            if (j%2===1) { // odd are latitude
                const mid = (maxLat + minLat)/2;
                if (lat<mid) {
                    binConv += "0";
                    maxLat = mid;
                } else {
                    binConv += "1";
                    minLat = mid;
                }
            }
        }
        geoHashRes = decToBase32(binToDec(binConv));
        geoHashArr.push(geoHashRes);
    });
    if (geoHashArr.length>1) { // Line|Polygon: change precision value for subsequent loops & change geoHassRes
        for (let j = 0; j<geoHashRes.length; j++) { // check from RTL
        // do not reduce precision: keep all Hash?
        // during search: if can't find at current precision - reduce level of precision -> search again w/o repeat
        // needs to maintain a list of checked keys
        // keep going until reach precision stated by dictionary
            const firstRes = geoHashArr[0].slice(0,geoHashRes.length-j);
            const secRes = geoHashArr[1].slice(0,geoHashRes.length-j);
            if (firstRes === secRes) { // opposite corner have the same geoHash: Entire bbox falls within geoHash
                geoHashRes = firstRes;
                break;
            }
            dictPrecision--;
        }
    }
    feature.properties.geoHash = geoHashRes;
    feature.properties.geoHashPrecision = dictPrecision;
    return {geoHash: geoHashRes, precision: dictPrecision};
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

function binToDec(str: string): number[] {
    const strArr: string[] = [];
    for (let i=0; i<str.length; i+=5) {// slice into segments of 5
        strArr.push(str.slice(i,i+5));
    }
    const retArr: number[] = [];
    strArr.forEach((binValue: string) => {// Binary segment to Decimal
        let pwr = 5;
        retArr.push(
            Array.from(binValue).reduce((sum: number, binDigit: string) => {
            pwr--;
            return sum + Math.pow(2,pwr)*Number(binDigit);
            },0),
        );
    });
    return retArr; // Array of Decimal numbers for conversion
}

function decToBase32(arr: number[]): string {// takes in array of decimal numbers from previous function/step
    const base32 = "0123456789bcdefghjkmnpqrstuvwxyz";
    let retStr = "";
    arr.forEach((num) => {
        retStr += base32.charAt(num);
    });
    return retStr;
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

// function typeToSingleCoord(feat1: turf.Feature<turf.LineString|turf.Point|turf.Polygon>,
//                            feat2: turf.Feature<turf.LineString|turf.Point|turf.Polygon>): number[][] {
//      const retArr = [];
//      [feat1,feat2].forEach((feat) => {
//          switch (feat.geometry.type) {
//              case "Point":
//                  retArr.push(feat.geometry.coordinates);
//                  break;
//              case "Polygon":
//                  retArr.push(turf.center(feat).geometry.coordinates);
//                  break;
//              case "LineString":
//                  retArr.push(turf.center(turf.bboxPolygon(turf.bbox(feat))).geometry.coordinates);
//                  break;
//          }
//      });
//      return retArr;
// }

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
