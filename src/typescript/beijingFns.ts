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

// [V] Extras: GeoHash Dictionary and GeoHash Encode
// https://next.plnkr.co/edit/3pMCwuCLPLTvCg5g

// Other Previously implemented functions (turf/geojson):
// [V] GEOJSON getPropNames
// [V] GEOJSON setProperty
// [V] TURF contains/disjoint/equal/pointinPolygon/within
// [V] TURF buffer
// [V] TURF lineString - will need coord manipulation functions too: minimally center of polygon
// [V] ARRAY byRange

import * as turf from "@turf/turf";
import * as pp from "papaparse";

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
        csvColumns.forEach((i) => { // failed to find - set 0 to feat with same header name
            feat.properties[head[i]] = 0;
        });
    });
    return;
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
export function gridPoly(poly: turf.Feature<turf.Polygon>, size: number = 500, polyProp: string[],
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
 * @param srcfColl Source FeatureCollection
 * @param tarfColl Target FeatureCollection
 * @param srcProp Array of property names to extract and inject into each cell
 * @param rename Array of names to rename injected properties (1:1 to srcProp) - soure names will be used if undefined
 */
export function featFeatInjection(srcfColl: turf.FeatureCollection<turf.Point|turf.LineString|turf.Polygon>,
                                  tarfColl: turf.FeatureCollection<turf.Point|turf.LineString|turf.Polygon>,
                                  srcProp: string[], rename: string[] = []): void {
    if (srcfColl === undefined) {throw new Error("srcfColl is undefined");}
    if (tarfColl === undefined) {throw new Error("tarfColl is undefined");}
    if (srcProp === undefined) {throw new Error("srcProp is undefined");}
    if ((rename !== undefined) && (srcProp.length !== rename.length)) {
        throw new Error ("srcProp and rename arrays are not equal in length");
    }
    const srcGHashDict: IGeoHashDict = geoHashDictionary(srcfColl); // default precision 8
    const tarGHashDict: IGeoHashDict = geoHashDictionary(tarfColl);
    tarfColl.features.forEach((tarFeat) => {
        let geoHash = tarFeat.properties.geoHash;
        if (geoHash.length !== srcGHashDict.precision) { // prep GeoHash for search
            geoHash = geoHash.slice(0,srcGHashDict.precision+1);
        }
        const srcFeatArrInd: number[] = srcGHashDict[geoHash];
        let injected: boolean = false;
        if (srcFeatArrInd !== undefined) { // === undefined: no source near target - inject 0
            for (let i=0; i<srcFeatArrInd.length;i++) {
                const ind = srcFeatArrInd[i];
                const srcFeat = srcfColl.features[ind];
                const contain = turf.booleanContains(tarFeat,srcFeat);
                const within = turf.booleanWithin(srcFeat,tarFeat);
                if (contain||within) { // src is small enough to fit within tar - inject
                    propertyInjection(srcFeat,tarFeat,srcProp,rename);
                    injected = true;
                    break;
                }
                if (tarFeat.geometry.type === "Polygon") {
                    const tarFeat_poly = tarFeat as turf.Feature<turf.Polygon>; //TODO - what is going on here?
                    const srcFea = turf.pointOnFeature(srcfColl.features[ind]); // Gives a point that's 100% in feat
                    if(turf.booleanPointInPolygon(srcFea, tarFeat_poly) === true) {
                        propertyInjection(srcFea,tarFeat,srcProp,rename);
                        injected = true;
                        break;
                    }
                } else { // Line|Point - high chance of failing. Should they be blocked from function completely?
                    const srcFea = srcfColl.features[ind];
                    if(turf.booleanEqual(srcFea, tarFeat) === true) {
                        propertyInjection(srcFea,tarFeat,srcProp,rename);
                        injected = true;
                        break;
                    }
                }
            }
        }
        if (injected === false) {propertyInjection(undefined,tarFeat,srcProp,rename);}
    });
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
export function geoHashEncode(feature: turf.Feature<turf.LineString|turf.Polygon|turf.Point>, precision: number = 8):
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
            const secRes = geoHashArr[1].slice(0,geoHashRes.length+1-j);
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
 * Sets the property value for the property with the specified name.
 * If the property does not exist, it is created.
 *
 * @param feature The feature data.
 * @param name The name of the property, a string.
 * @param value The value of the property, any value.
 * @returns The name of the property. (This may differ from input name if input name is not valid.)
 */
export function setProperty(feature: turf.Feature, name: string, value: (string|number)): string {
    if (!feature.hasOwnProperty("properties")) {feature.properties = {};}
    const regexp = /^[a-zA-Z_]\w*(\.[a-zA-Z_]\w*)*$/;
    if (!regexp.test(name)) { name = "_" + name;}
    feature.properties[name] = value;
    return name;
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
                           srcProp: string[], rename: string[]): void {
    if (rename.length === 0) {rename = srcProp;}
    for (let i=0; i<srcProp.length; i++) {
        if (srcFeat === undefined) {
            tarFeat.properties[rename[i]] = 0;
        } else {
            tarFeat.properties[rename[i]] = srcFeat.properties[srcProp[i]];
        }
    }
}

function csvParse(str: string, delimiter: string): pp.ParseResult {
    if (str === undefined) {throw new Error("Invalid arg: str must be defined.");}
    if (delimiter === undefined) {return pp.parse(str);}
    return pp.parse(str, {delimiter});
}
