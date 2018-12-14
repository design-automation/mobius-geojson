/**
 * Reduced Functions from Beijing Workshop
 */

// EXPORTED FUNCTIONS:
// [V] csvFCollInjection(csvFile, fColl, propertyName,searchColumn,header, csvColumns)
//     propertyName: name of property within each feature collection. Check csv search column against value of property
//     to find row -> extract data from each column in array of csvColumns and inject with header name of each column
//     (needs to know which row header names are on)

// [V] gridPoly(poly, size, mask, properties)
// https://next.plnkr.co/edit/K1yHeNQXF7ntOdE8

// [V] featureFeatureInjection(srcfColl, tarfColl, property, rename)
// https://next.plnkr.co/edit/uZQPue1vLtPmm6vr

// [V] distanceInjection: distance to each other feature - save as an object key & distance (specific use case)

// [V] areaInjection: Calculate and inject Area of each feature into fColl (specific use case)

// [V] Mathematical Calculations on Attribs & Injection - calculations and counting of instances (general use case)

// [V] Extras: GeoHash Dictionary and GeoHash Encode - Needs refactor for large polygons that may land on >1 geoHash
// https://next.plnkr.co/edit/3pMCwuCLPLTvCg5g

// [V] Extras: nameInjection (custom naming of each feature)

// Other Previously implemented functions (turf/geojson):
// [V] GEOJSON getPropNames
// [V] GEOJSON setProperty
// [V] TURF contains/disjoint/equal/pointinPolygon/within
// [V] TURF buffer
// [V] TURF lineString - will need coord manipulation functions too: minimally center of polygon
// [V] ARRAY byRange

import * as turf from "@turf/turf";
import * as pp from "papaparse";
import * as math from "mathjs";
import { fColl } from "./create";

/**
 * Injects properties from source csv into target Feature
 * Each injected data will be accessible in: (Feature).properties.(injName).(csvHeaderRowName - based on headerRow)
 * Array of All HeaderRow names can be accessed from: (Feature).properties.(injName)
 * .allKeys
 * .allValues
 *
 * @param csvFile Source csv file
 * @param fColl Target FeatureCollection
 * @param property Source property name
 * @param injName Name for injection
 * @param searchColumn Column index number
 * @param headerRow Row index number
 * @param csvColumns Array of Column indices to extract
 */
// tslint:disable-next-line:no-shadowed-variable
export function csvFCollInjection(csvFile: string, fColl: turf.FeatureCollection, property: string, injName: string,
                                  searchColumn: number, headerRow: number, csvColumns: number[]): void {
    const csvData: string[][] = csvParse(csvFile,",").data;
    const head: string[] = csvData[headerRow]; // array of header names
    const skipArr: number[] = [];
    fColl.features.forEach((feat) => {
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
    });
    return;
}

/**
 * Calculates and injects area of each Polygon Feature within Feature Collection: Feature.properties.area
 *
 * @param polys FeatureCollection of Polygons
 */
export function areaInjection(polys: turf.FeatureCollection<turf.Polygon>): void {
     polys.features.forEach((polyFeat) => {
         polyFeat.properties.area = turf.area(polyFeat);
     });
     return;
} // Last Checked & Fixed: 13/12/2018 working

/**
 * Injects specified name into each Feature within Feature Collection: Feature.properties.featName
 *
 * @param fColl FeatureCollection
 * @param featName string with a number concat to its end will be injected into each Feature
 * @param startNum Defaults 0: number which will be concat to featName
 */
// tslint:disable-next-line:no-shadowed-variable
export function nameInjection(fColl: turf.FeatureCollection, featName: string, startNum: number = 0): void {
     let i = startNum;
     fColl.features.forEach((feat) => {
         feat.properties.featName = featName + i;
         i++;
     });
     return;
} // Last Checked & Fixed: 11/12/2018 working

/**
 * Calculates and injects distance of target to feature: Feature.properties.(injName).(featName)
 * CenterPoints will be used for non-point Features.
 * Calculated Distance are all accessible in: (Feature).properties.(injName)
 * .allKeys: Array of (featName) which distance of feature was measured to
 * .allValues: Array of all distances
 * .minValue: minimum distance
 * .minKey: First Key(featName) with minDist
 * .maxValue: maximum distance
 * .maxKey: First Key(featName) with maxDist
 * .meanValue: Average distance to every other feature
 * .(featName): distance to specified feature
 * .(conditionNUMBER): .smallerThanNUMBER | .largerThanNUMBER | .equalsNUMBER -ARRAY<featName> which satisfies condition
 * .(conditionNUMBERCnt): .smallerThanNUMBERCnt | .largerThanNUMBERCnt | .equalsNUMBERCnt
 *
 * @param fColl1 FeatureCollection
 * @param nameProp1 property which will be used as key to tag distance on features in fColl2: Defaults 'featName'
 * @param fColl2 FeatureCollection
 * @param nameProp2 property which will be used as key to tag distance on features in fColl1: Defaults 'featName'
 * @param injName Name for injection
 * @param condition Increments and injects featName and count if condition is met
 */

export function distanceInjection(fColl1: turf.FeatureCollection<turf.Polygon|turf.Point|turf.LineString>,
                                  nameProp1: string = "featName",
                                  fColl2: turf.FeatureCollection<turf.Polygon|turf.Point|turf.LineString>,
                                  nameProp2: string = "featName", injName: string, condition: string = ""): void {
    injPropertyName(fColl1,injName);
    injPropertyName(fColl2,injName);
    fColl1.features.forEach((feat1) => {
        const allK: string[] = [];
        const allVal: number[] = [];
        fColl2.features.forEach((feat2) => {
            const coords: number[][] = typeToSingleCoord(feat1,feat2);
            const dist: number = turf.distance(coords[0],coords[1]) * 1000;
            if (feat1.properties[nameProp1] === undefined||feat2.properties[nameProp2] === undefined) {
                throw new Error ("Feature does not contain specified name property");
            }
            if (condition.length !== 0) { // !default empty string
                const conditionChk = math.eval(dist + condition);
                const cleaned: number = parseFloat(removeSymbols(condition));
                let newPropName: string;
                switch (condition.slice(0,1)) {
                    case ">":
                        newPropName = "largerThan"+cleaned;
                        break;
                    case "<":
                        newPropName = "smallerThan"+cleaned;
                        break;
                    case "=":
                        newPropName = "equals"+cleaned;
                        break;
                }
                feat1.properties[injName].condName = newPropName;
                // for easy retrieval in calculating count

                if (typeof conditionChk !== "boolean") {throw new Error ("Invalid Condition");}
                if (conditionChk) {
                    checkNInject(feat1,injName+"."+newPropName,feat2.properties[nameProp2],true);
                    // injects feat2's nameID into an array in feat1
                    checkNInject(feat2,injName+"."+newPropName,feat1.properties[nameProp1],true);
                    // injects feat1's nameID into an array in feat2
                }
            }
            allVal.push(dist); // push dist into arr which will be added to feat1
            allK.push(feat2.properties[nameProp2]); // push feat2 namekey into arr which will be added to feat1
            checkNInject(feat2,injName+".allValues",dist,true); // add dist into allValues of feat2
            checkNInject(feat2,injName+".allKeys",feat1.properties[nameProp1],true);
            // add feat1 name key into allKeys of feat2
            feat1.properties[injName][feat2.properties[nameProp1]] = dist; // sets dist to feat1
            feat2.properties[injName][feat1.properties[nameProp2]] = dist; // sets dist to feat2
        });
        feat1.properties[injName].allValues = allVal;
        feat1.properties[injName].allKeys = allK;
        minMaxMean(feat1,injName); // sets min max mean to each feat1
        const feat1condName = feat1.properties[injName].condName;
        if (feat1.properties[injName][feat1condName] === undefined) {
            feat1.properties[injName][feat1condName + "Cnt"] = 0;
            (feat1.properties[injName][feat1condName] = []);
        } else {
            feat1.properties[injName][feat1condName + "Cnt"] = feat1.properties[injName][feat1condName].length;
        }
        // conditionCount to feat1
    });
    fColl2.features.forEach((feat2) => {
        minMaxMean(feat2,injName);  // sets min max mean to each feat2
        const feat2condName = feat2.properties[injName].condName;
        if (feat2.properties[injName][feat2condName] === undefined) {
            feat2.properties[injName][feat2condName + "Cnt"] = 0;
            feat2.properties[injName][feat2condName] = [];
        } else {
            feat2.properties[injName][feat2condName + "Cnt"] = feat2.properties[injName][feat2condName].length;
        }
        // conditionCount to feat2
    });
    return;
} // Last Checked & Fixed: 13/12/2018 working

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
// tslint:disable-next-line:no-shadowed-variable
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
 * Injects properties from source FeatureCollection into target FeatureCollection if target falls within the source.
 *
 * @param injName Name for injection
 * @param srcfColl Source FeatureCollection
 * @param tarfColl Target FeatureCollection
 * @param srcProp Array of property names to extract and inject into each cell
 * @param rename Array of names to rename injected properties (1:1 to srcProp) - soure names will be used if undefined
 */
export function fCollfCollInjection(injName: string,
                                    srcfColl: turf.FeatureCollection<turf.Point|turf.LineString|turf.Polygon>,
                                    tarfColl: turf.FeatureCollection<turf.Point|turf.LineString|turf.Polygon>,
                                    srcProp: string[] = [], rename: string[] = []): void {
    if (injName === undefined) {throw new Error("injName is undefined");}
    injectChildren_fColl([injName],tarfColl);
    if (srcfColl === undefined) {throw new Error("srcfColl is undefined");}
    if (tarfColl === undefined) {throw new Error("tarfColl is undefined");}
    if (srcProp === undefined) {throw new Error("srcProp is undefined");}
    if ((rename !== undefined) && (srcProp.length !== rename.length)) {
        throw new Error ("srcProp and rename arrays are not equal in length");
    }

    tarfColl.features.forEach((tarFeat) => {
        let injected = false;
        // tslint:disable-next-line:prefer-for-of
        for (let i=0; i<srcfColl.features.length; i++) {
            const srcFeat = srcfColl.features[i];
            const contain = turf.booleanContains(tarFeat,turf.center(srcFeat));
            const within = turf.booleanWithin(turf.center(srcFeat),tarFeat);
            if (contain||within) {
                propertyInjection(srcFeat,tarFeat,srcProp,injName,rename);
                injected = true;
                break;
            }
        }
        if (injected === false) {
            propertyInjection(undefined,tarFeat,srcProp,injName,rename);
        }
    });
    return;
} // geohash dictionary buggy. Removed and replaced with full search. Will be slow for big fColls.
// Last Checked & Fixed: 13/12/2018 working

// /**
//  * Injects properties from source FeatureCollection into target FeatureCollection if target falls within the source.
//  *
//  * @param injName Name for injection
//  * @param srcfColl Source FeatureCollection
//  * @param tarfColl Target FeatureCollection
//  * @param srcProp Array of property names to extract and inject into each cell
//  * @param rename Array of names to rename injected properties (1:1 to srcProp) - soure names will be used if
// undefined
//  */
// export function fCollfCollInjection(injName: string,
//                                     srcfColl: turf.FeatureCollection<turf.Point|turf.LineString|turf.Polygon>,
//                                     tarfColl: turf.FeatureCollection<turf.Point|turf.LineString|turf.Polygon>,
//                                     srcProp: string[] = [], rename: string[] = []): void {
//     if (injName === undefined) {throw new Error("injName is undefined");}
//     injectChildren_fColl([injName],tarfColl);
//     if (srcfColl === undefined) {throw new Error("srcfColl is undefined");}
//     if (tarfColl === undefined) {throw new Error("tarfColl is undefined");}
//     if (srcProp === undefined) {throw new Error("srcProp is undefined");}
//     if ((rename !== undefined) && (srcProp.length !== rename.length)) {
//         throw new Error ("srcProp and rename arrays are not equal in length");
//     }

//     const srcGHashDict: IGeoHashDict = geoHashDictionary(srcfColl); // default precision 8
//     const tarGHashDict: IGeoHashDict = geoHashDictionary(tarfColl);
//     tarfColl.features.forEach((tarFeat) => {
//         let geoHash = tarFeat.properties.geoHash;
//         // if (geoHash.length !== srcGHashDict.precision) { // prep GeoHash for search
//         //     geoHash = geoHash.slice(0,srcGHashDict.precision+1);
//         // }
//         geoHash = geoHash.slice(0,tarFeat.properties.geoHashPrecision+1);
//         // this will search src dictionary based on target's own size - larger/less precise geoHash it encapsulate,
//         // the more it needs to search
//         const srcFeatArrInd: number[] = srcGHashDict[geoHash];
//         // find srcGHash dictionary for array of srcFeat indices that share the same GeoHash
//         let injected: boolean = false;
//         if (srcFeatArrInd !== undefined) { // === undefined: no source near target - inject 0
//             for (let i=0; i<srcFeatArrInd.length;i++) {
//                 const ind = srcFeatArrInd[i];
//                 const srcFeat = srcfColl.features[ind];
//                 const contain = turf.booleanContains(tarFeat,srcFeat);
//                 const within = turf.booleanWithin(srcFeat,tarFeat);
//                 if (contain||within) { // src is small enough to fit within tar - inject
//                     propertyInjection(srcFeat,tarFeat,srcProp,injName,rename);
//                     injected = true;
//                     break;
//                 }
//                 if (tarFeat.geometry.type === "Polygon") {
//                     const srcFea = turf.pointOnFeature(srcfColl.features[ind]); // Gives a point that's 100% in feat
//                     const tarFeat_poly = tarFeat as turf.Feature<turf.Polygon>;
//                     if(turf.booleanPointInPolygon(srcFea, tarFeat_poly) === true) {
//                         propertyInjection(srcFea,tarFeat,srcProp,injName,rename);
//                         injected = true;
//                         break;
//                     }
//                 } else { // Line|Point - high chance of failing. Should they be blocked from function completely?
//                     const srcFea = srcfColl.features[ind];
//                     if(turf.booleanEqual(srcFea, tarFeat) === true) {
//                         propertyInjection(srcFea,tarFeat,srcProp,injName,rename);
//                         injected = true;
//                         break;
//                     }
//                 }
//             }
//         }
//         if (injected === false) {propertyInjection(undefined,tarFeat,srcProp,injName,rename);}
//     });
//     return;
// }

/*
 *
 * GeoHash Functions ***************************************************************************************************
 *
*/

// function polygonsBySquGrid(cellSide: number, mask: turf.Feature<turf.Polygon|turf.MultiPolygon>):
// turf.FeatureCollection<turf.Polygon> {
//     return turf.squareGrid(turf.bbox(mask),cellSide/1000,{mask});
// }

// function idAdd(fColl: turf.FeatureCollection): void {
//     for (let i=0; i<fColl.features.length; i++) {
//         fColl.features[i].properties.objId = i;
//     }
//     return;
// }

// interface Idict {
//     name: string;
// }

// function dictCreate(fColl: turf.FeatureCollection, dictName: string = "default"): Idict {
//     const dict: Idict = {name: dictName};
//     fColl.features.forEach((feat) => {
//         dict[feat.properties.objId] = [];
//     });
//     return dict;
// }

// function dictInsert(fColl: turf.FeatureCollection, dictRef: turf.FeatureCollection, dict: Idict): void {
//     for (let j=0; j<fColl.features.length; j++) {
//         const orifeat = fColl.features[j];
//         if (orifeat.geometry === null) {continue;}
//         const feat = convertPoint(orifeat);
//         for (let i=0; i<dictRef.features.length; i++) {
//             const dictRefFeat = dictRef.features[i];
//             const contain = turf.booleanContains(dictRefFeat,feat);
//             if (contain) {
//                 feat.properties.dictId = dictRefFeat.properties.objId;
//                 dict[dictRefFeat.properties.objId].push(feat);
//                 break;
//             }
//         }
//     }
//     return;
// }

// function convertPoint(feat: turf.Feature): turf.Feature<turf.Point> {
//     let retFeat;
//     switch (feat.geometry.type) {
//         case "Point":
//             retFeat = feat;
//             break;
//         case "Polygon":
//             retFeat = turf.center(feat);
//             break;
//         case "MultiPolygon":
//             retFeat = turf.center(feat);
//             break;
//         case "LineString":
//             retFeat = turf.along(feat,turf.length(feat)/2);
//             retFeat.properties.objId = feat.properties.objId;
//             break;
//         case "MultiLineString":
//             retFeat = turf.along(feat,turf.length(feat)/2);
//             retFeat.properties.objId = feat.properties.objId;
//             break;
//     }
//     return retFeat;
// }

// interface IGeoHashObj {
//     geoHash: string;
//     precision: number;
// }

// interface IGeoHashDict {
//     precision: number;
// }

// /**
//  * Injects each feature with a GeoHash, and returns a GeoHash dictionary
//  *
//  * @param fColl FeatureCollection
//  * @param precision Max number of letters in encoded GeoHash
//  * @return GeoHash dictionary with array of featureIndex as values
//  */
// export function geoHashDictionary(fColl: turf.FeatureCollection<turf.Point|turf.LineString|turf.Polygon>,
//                                   precision: number = 8): IGeoHashDict { //
//     const dict: IGeoHashDict = {precision};
//     const fCollFeats = fColl.features;
//     for (let i = 0; i<fCollFeats.length; i++) {
//         const feat = fCollFeats[i];
//         const geoHashObj = geoHashEncode(feat,precision);
//         const geoHashRes = geoHashObj.geoHash;
//         // precision = geoHashObj.precision;
//         dict.precision = geoHashObj.precision;
//         for (let j = 0; j<geoHashRes.length; j++) { // each dictionary key entry will have an array of indices
//             if (dict.hasOwnProperty(geoHashRes.slice(0,j+1))) {
//                 dict[geoHashRes.slice(0,j+1)] = dict[geoHashRes.slice(0,j+1)].concat([i]);
//             } else {
//                 dict[geoHashRes.slice(0,j+1)] = [i];
//             }
//         }
//     }
//     // remove dictionary keys that have length > precision
//     // Object.keys(dict).forEach((key) => {
//     //     if (key.length > precision) {
//     //         delete dict[key];
//     //     }
//     // });
//     // dict.precision = precision;
//     return dict;
// }

// /**
//  * Injects feature with a geoHash, and returns a geoHash string
//  *
//  * @param feature LineString, Point, or Polygon
//  * @param precision Max number of letters in encoded GeoHash
//  * @return Object containing GeoHash and Precision values
//  */
// export function geoHashEncode(feature: turf.Feature<turf.LineString|turf.Polygon|turf.Point>, precision: number = 8):
// IGeoHashObj {
//     let coordArr: number[][];
//     const geomType = feature.geometry.type;
//     let dictPrecision = precision;
//     if (geomType === "Polygon"||geomType === "LineString") {
//     // needs to ensure that boundaries of polygon/line falls within bbox of a geoHash
//     // means geoHash precision needs to be low enough for diagonal boundary points to have same hash value
//         coordArr = ensureCoordArr(turf.bboxPolygon(turf.bbox(feature)));
//         coordArr = [coordArr[0],coordArr[2]]; // line|Polygon will have four geoHash values
//     } else if (geomType === "Point") {
//         coordArr = ensureCoordArr(feature);
//     }
//     const geoHashArr: string[] = []; // check for polygon | line
//     let geoHashRes: string;
//     coordArr.forEach((coord) => { // line|Polygon will have two geoHash values - one for each diagonal bBox point
//         let minLat = -90;
//         let maxLat = 90;
//         let minLon = -180;
//         let maxLon = 180;
//         const lat: number = coord[0];
//         const lon: number = coord[1];
//         let binConv: string = "";
//         for (let j = 0; j<precision*5; j++) {
//             if (j%2===0) { // even are longitude
//                 const mid = (maxLon+ minLon)/2;
//                 if (lon<mid) {
//                     binConv += "0";
//                     maxLon = mid;
//                 } else {
//                     binConv += "1";
//                     minLon = mid;
//                 }
//             }
//             if (j%2===1) { // odd are latitude
//                 const mid = (maxLat + minLat)/2;
//                 if (lat<mid) {
//                     binConv += "0";
//                     maxLat = mid;
//                 } else {
//                     binConv += "1";
//                     minLat = mid;
//                 }
//             }
//         }
//         geoHashRes = decToBase32(binToDec(binConv));
//         geoHashArr.push(geoHashRes);
//     });
//     if (geoHashArr.length>1) { // Line|Polygon: change precision value for subsequent loops & change geoHassRes
//         for (let j = 0; j<geoHashRes.length; j++) { // check from RTL
//         // do not reduce precision: keep all Hash?
//         // during search: if can't find at current precision - reduce level of precision -> search again w/o repeat
//         // needs to maintain a list of checked keys
//         // keep going until reach precision stated by dictionary
//             const firstRes = geoHashArr[0].slice(0,geoHashRes.length-j);
//             const secRes = geoHashArr[1].slice(0,geoHashRes.length-j);
//             if (firstRes === secRes) { // opposite corner have the same geoHash: Entire bbox falls within geoHash
//                 geoHashRes = firstRes;
//                 break;
//             }
//             dictPrecision--;
//         }
//     }
//     feature.properties.geoHash = geoHashRes;
//     feature.properties.geoHashPrecision = dictPrecision;
//     return {geoHash: geoHashRes, precision: dictPrecision};
// }

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

function typeToSingleCoord(feat1: turf.Feature<turf.LineString|turf.Point|turf.Polygon>,
                           feat2: turf.Feature<turf.LineString|turf.Point|turf.Polygon>): number[][] {
     const retArr = [];
     [feat1,feat2].forEach((feat) => {
         switch (feat.geometry.type) {
             case "Point":
                 retArr.push(feat.geometry.coordinates);
                 break;
             case "Polygon":
                 retArr.push(turf.center(feat).geometry.coordinates);
                 break;
             case "LineString":
                 retArr.push(turf.center(turf.bboxPolygon(turf.bbox(feat))).geometry.coordinates);
                 break;
         }
     });
     return retArr;
}

function checkNInject(feat: turf.Feature, propName: string,
                      injValue, injArr: boolean): void {
    findChildInject(removeEmpty(propName.split(".")),feat,undefined,injValue, injArr);
    return;
} // Checked and fixed. Working as of: 11/12/2018

function findChildInject(arr: string[], feat: turf.Feature, nxt: any, injVal, injArr: boolean): void {
// recursively find target child and injects value
// https://codepen.io/derekpung/pen/bOdvMa?editors=0010
    let retObj;
    if (arr.length > 1) {
        if (nxt === undefined) {
            injectChildren(arr.slice(), feat); // Inject children required into specified path
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
                if (nxt[arr[0]] === undefined) {
                    nxt[arr[0]] = [injVal];
                } else {
                    nxt[arr[0]] = nxt[arr[0]].concat([injVal]);
                }
                break;
            case false: // simple injection (allows override)
                nxt[arr[0]] = injVal;
        }
    }
} // Checked and fixed. Working as of: 13/12/2018

function injectChildren_fColl(arr: string[],f_Coll: turf.FeatureCollection): void {
    f_Coll.features.forEach((element) => {
        injectChildren(arr.slice(),element);
    });
    return;
} // Added 13/12/2018 - working

function injectChildren(arr: string[],feat: turf.Feature): void {
    const res = recursiveChild_Create(arr, feat, undefined, undefined);
    const parent_saved = res[0].slice();
    const child_saved = res[1].slice();

    try {
        let res1_firstChild = res[1][0];
        res[1].shift();
        if (typeof recursiveChild(res[0],feat,undefined) === "object") {
            res[0] = parent_saved.slice();
            recursiveChild(res[0],feat,undefined)[res1_firstChild] = createChild(res[1]);
        } else {
            res[0] = parent_saved.slice();
            res[1] = child_saved.slice();
            res1_firstChild = res[0].pop();
            recursiveChild(res[0],feat,undefined)[res1_firstChild] = createChild(res[1]);
        }
    } catch(err) {
        feat.properties[parent_saved] = createChild(child_saved);
    }
    return;
}// Added 13/12/2018 - working

function createChild(arr: string[],nxt?) {
    let retObj;
    if (nxt === undefined) {
        retObj = {};
    } else {
        retObj = nxt;
    }
    const newRetObj = {};
    newRetObj[arr[arr.length-1]] = retObj;
    arr.pop();
    if (arr.length > 0) {
        return createChild(arr,newRetObj);
    } else {
        return newRetObj;
    }
}// Added 13/12/2018 - working

function recursiveChild_Create(arr: string[], feat: turf.Feature, nxt, rem_arr: string[]) {
    let retObj;
    let retArr;

    if (nxt === undefined) {
        retObj = feat.properties[arr[0]]; // retrieval starts from properties
    } else {
        retObj = nxt[arr[0]];
    }

    if (rem_arr === undefined) {
        retArr = [];
    } else {
        retArr = rem_arr;
    }
    retArr.push(arr[0]);
    arr.shift();
    if (retObj === undefined) {
        if (retArr.length > 1) {
            arr.unshift(retArr[retArr.length-1]);
            retArr.pop();
        }
        return [retArr,arr];
    }
    if (arr.length !== 0) {
        return recursiveChild_Create(arr,feat,retObj,retArr);
    } else {
        return [retArr,arr];
        // throw new Error("All children exists")
    }
} // Added 13/12/2018 - working

function minMaxMean(feat: turf.Feature, injName: string): void {
    const injObj = feat.properties[injName];
    injObj.minValue = math.min(injObj.allValues); // calc minDist and inject
    injObj.maxValue = math.max(injObj.allValues); // calc maxDist and inject
    injObj.meanValue = math.mean(injObj.allValues); // calc meanDist and inject
    injObj.minKey = injObj.allKeys[injObj.allValues.indexOf(injObj.minDist)]; // logs key with minDist
    injObj.maxKey = injObj.allKeys[injObj.allValues.indexOf(injObj.maxDist)]; // logs key with maxDist
} // Checked and fixed. Working as of: 11/12/2018

/*
* MathJS Prep Functions ************************************************************************************************
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

function injPropertyName(f_Coll: turf.FeatureCollection<turf.Polygon|turf.Point|turf.LineString>,
                         injName: string): void {
    f_Coll.features.forEach((feat) => {
        feat.properties[injName] = {};
    });
    return;
}
