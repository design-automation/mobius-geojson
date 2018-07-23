/**
 * Reduced Functions from Beijing Workshop
 */

// EXPORTED FUNCTIONS:
// [V] gridPoly(poly, size, mask, properties)

// [V] featureFeatureInjection(srcfColl, tarfColl, property, rename)

// [V] csvFCollInjection(csvFile, fColl, propertyName,searchColumn,header, csvColumns)
//     propertyName: name of property within each feature collection. Check csv search column against value of property
//     to find row -> extract data from each column in array of csvColumns and inject with header name of each column
//     (needs to know which row header names are on)

// Extras: GeoHash Dictionary and GeoHash Encode

// Other Previously implemented functions (turf/geojson):
// [ ] contains/crosses/disjoint/equal/pointinPolygon/within
// [ ] setProperty(feature, name, value)
// [ ] buffer(feature, distance)
// [ ] lineString(coords) - will need coord manipulation functions too: minimally center of polygon
// [ ] byRange(min, max)

import * as turf from "@turf/turf";
import * as pp from "papaparse";

/**
 * Grids Polygon
 * @param poly Accepts Single Polygon Feature
 * @param size Dimension of each square gird, in meters
 * @param polyProp Array of property names to extract and inject into each cell
 * @param mask Function will only return cells that fall within mask
 * @param masProp Array of property names to extract and inject into each cell
 * @returns Merged FeatureCollection
 */
export function gridPoly(poly: turf.Feature<turf.Polygon>, size: number = 500, polyProp: string[],
                         mask?: turf.FeatureCollection <turf.Point|turf.Polygon>, maskProp: string[] = []):
turf.FeatureCollection<turf.Polygon> {
    if (poly === undefined) {throw new Error("poly is undefined");}
    if (maskProp.length !== 0 && mask !== undefined) {throw new Error("mask is undefined");}
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
        let cent: turf.Feature<turf.Point> = turf.center(cell);
        let pGon: turf.Feature<turf.Polygon> = cell;
        mask.features.forEach((maskFeat) => {
            switch (maskFeat.geometry.type) {
                case "Polygon":
                    maskFeat = maskFeat as turf.Feature<turf.Polygon>;
                    pGon = maskFeat;
                    break;
                case "Point":
                    cent = maskFeat;
                    break;
            }
            if (turf.booleanPointInPolygon(cent,pGon)) {
                maskProp.forEach((propName) => { // set mask properties to cell
                    cell.properties[propName] = maskFeat.properties[name];
                });
                arr.push(cell);
            }
        });
    });
    return turf.featureCollection(arr); // return grids masked to features
}

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
 * Injects properties from source FeatureCollection into target FeatureCollection if target falls within the source.
 *
 * @param srcfColl Source FeatureCollection
 * @param tarfColl Target FeatureCollection
 * @param srcProp Array of property names to extract and inject into each cell
 * @param rename Array of names to rename injected properties (1:1 to srcProp) - soure names will be used if undefined
 */
export function featFeatInjection(srcfColl: turf.FeatureCollection<turf.Point|turf.LineString|turf.Polygon>,
                                  tarfColl: turf.FeatureCollection<turf.Point|turf.LineString|turf.Polygon>,
                                  srcProp: string[], rename: string[]): void {
    if ((typeof(rename) !== undefined) && (srcProp.length !== rename.length)) {
        throw new Error ("srcProp and rename arrays are not equal in length");
    }
    const srcGHashDict: IGeoHashDict = geoHashDictionary(srcfColl); // default precision 5
    const tarGHashDict: IGeoHashDict = geoHashDictionary(srcfColl);
    tarfColl.features.forEach((tarFeat) => {
        let geoHash = tarFeat.properties.geoHash;
        if (geoHash.length !== srcGHashDict.precision) { // prep GeoHash for search
            geoHash = geoHash.slice(0,srcGHashDict.precision+1);
        }
        const srcFeatArrInd: number[] = srcGHashDict[geoHash];
        let injected: boolean = false;
        if (srcFeatArrInd !== undefined) { // === undefined: no source near target (throw error or not?)
            for (let i=0; i<srcFeatArrInd.length;i++) {
                const ind = srcFeatArrInd[i];
                if (tarFeat.geometry.type === "Polygon") {
                    const srcFeat = turf.center(srcfColl.features[ind]);
                    if(turf.booleanPointInPolygon(srcFeat, tarFeat) === true) {
                        propertyInjection(srcFeat,tarFeat,srcProp,rename);
                        injected = true;
                        break;
                    }
                } else { // Line|Point
                    const srcFeat = srcfColl.features[ind];
                    if(turf.booleanEqual(srcFeat, tarFeat) === true) {
                        propertyInjection(srcFeat,tarFeat,srcProp,rename);
                        injected = true;
                        break;
                    }
                }
            }
        }
        if (injected === false) {propertyInjection(undefined,tarFeat,srcProp,rename);}
    });
}

function propertyInjection(srcFeat: turf.Feature<turf.LineString|turf.Polygon|turf.Point>,
                           tarFeat: turf.Feature<turf.LineString|turf.Polygon|turf.Point>,
                           srcProp: string[], rename: string[]): void {
    for (let i=0; i<srcProp.length; i++) {
        if (srcFeat === undefined) {
            tarFeat.properties[rename[i]] = 0;
        } else {
            tarFeat.properties[rename[i]] = srcFeat.properties[srcProp[i]];
        }
    }
}

/**
 * Injects properties from source FeatureCollection into target FeatureCollection if target falls within the source.
 *
 * @param csvFile Source csv file
 * @param fColl Target FeatureCollection
 * @param propertyName Source property name
 * @param searchColumn Column index number
 * @param headerRow Row index number
 * @param csvColumns Array of Column indices to extract
 */
export function csvFCollInjection(csvFile: string, fColl: turf.FeatureCollection, property: string,
                                  searchColumn: number, headerRow: number, csvColumns: number[]): void {
    const csvData: string[][] = csvParse(csvFile,",").data;
    const head: string[] = csvData[headerRow]; // array of header names
    const skipArr: number[] = [];
    fColl.features.forEach((feat) => {
        for (let r =0; r < csvData.length; r++) {
            if (csvData[r][searchColumn] === feat.properties[property]) { // found row to extract data
                skipArr.push(r);
                csvColumns.forEach((i) => {
                    feat.properties[head[i]] = csvData[r][i];
                });
                break; // go on to next feat
            }
        }
        csvColumns.forEach((i) => { // set 0 to feat with same header name
            feat.properties[head[i]] = 0;
        });
    });
    return;
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
                                  precision: number = 5): IGeoHashDict { //
    const dict: IGeoHashDict = {precision};
    const fCollFeats = fColl.features;
    for (let i = 0; i<fCollFeats.length; i++) {
        const feat = fCollFeats[i];
        const geoHashObj = geoHashEncode(feat,precision);
        const geoHashRes = geoHashObj.geoHash;
        precision = geoHashObj.precision;
        for (let j = 0; j<geoHashRes.length; j++) { // each dictionary key entry will have an array of indices
            if (dict.hasOwnProperty(geoHashRes.slice(0,j+1))) {
                dict[geoHashRes.slice(0,j+1)] = dict[geoHashRes.slice(0,j+1)].concat([i]);
            } else {
                dict[geoHashRes.slice(0,j+1)] = [i];
            }
        }
    }
    // remove dictionary keys that have length > precision
    Object.keys(dict).forEach((key) => {
        if (key.length > precision) {
            delete dict[key];
        }
    });
    dict.precision = precision;
    return dict;
}

/**
 * Injects feature with a geoHash, and returns a geoHash string
 *
 * @param feature LineString, Point, or Polygon
 * @param precision Max number of letters in encoded GeoHash
 * @return Object containing GeoHash and Precision values
 */
export function geoHashEncode(feature: turf.Feature<turf.LineString|turf.Polygon|turf.Point>, precision: number = 5):
IGeoHashObj {
    let coordArr: number[][];
    const geomType = feature.geometry.type;
    if (geomType === "Polygon"||geomType === "LineString") {
    // needs to ensure that boundaries of polygon/line falls within bbox of a geoHash
    // means geoHash precision needs to be low enough for diagonal boundary points to have same hash value
        coordArr = ensureCoordArr(turf.bboxPolygon(turf.bbox(feature)));
        coordArr = [coordArr[0],coordArr[2]];
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
            const firstRes = geoHashArr[0].slice(0,geoHashRes.length+1-j);
            const secRes = geoHashArr[0].slice(0,geoHashRes.length+1-j);
            if (firstRes === secRes) {
                geoHashRes = firstRes;
                break;
            }
            precision--;
        }
    }
    feature.properties.geoHash = geoHashRes;
    return {geoHash: geoHashRes, precision};
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

/**
 * Parse a csv file.
 *
 * If the delimeter is undefined, then the delimiting character will be
 * auto-detected from a list of common delimeters, including "," and tab.
 *
 * Returns a parse result object.
 * The parse result object always contains 1) a data array, 2) an errors array, and 3) a meta object.
 * The data array is an array of rows from teh csv.
 * The errors array is an array of errors generated during the process of parsing the csv.
 * The meta object contains extra information about the parse, such as delimiter used,
 * the newline sequence, whether the process was aborted, etc.
 *
 * The rows in the data array will contain strings.
 * If numeric data is required, strings will need to be converted to numbers
 * using a string conversion function.
 *
 * See [https://www.papaparse.com/docs](https://www.papaparse.com/docs).
 *
 * @param str The text from the csv file, as a string.
 * @param delimeter The delimeter used in the csv file.
 * @example
 * result = io.csv.parse(my_data)
 * parse_data = result.data
 * errors = result.errors
 * meta = result.meta
 *
 * first_row = parsed_data[0]
 * second_row = parsed.data[1]
 */
function csvParse(str: string, delimiter: string): pp.ParseResult {
    if (str === undefined) {throw new Error("Invalid arg: str must be defined.");}
    if (delimiter === undefined) {return pp.parse(str);}
    return pp.parse(str, {delimiter});
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
