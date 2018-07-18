/**
 * Functions working with geojson.
 */

/**
 *
 */

import * as turf from "@turf/turf";

/*
 * Feature functions ***************************************************************************************************
 */

/**
 * Merge features into a single FeatureCollection
 * @param features1 Accepts Single Eeature or FeatureCollection
 * @param features2 Accepts Single Feature or FeatureCollection
 * @returns Merged FeatureCollection
 * @example
 * var firstPlot = turf.flatten(firstFile.file);// fcoll input
 * var firstFeat = firstPlot.features[0];// single feature input
 * var secondPlot = turf.flatten(secondFile.file);// fcoll input
 * var secondFeat = secondPlot.features[0];// single feature input
 *
 * var mergedFiles = featuresByMerge(firstPlot,secondFeat);
 */
export function featuresByMerge(features1: turf.Feature|turf.FeatureCollection,
                                features2: turf.Feature|turf.FeatureCollection): turf.FeatureCollection {
    let arr: turf.Feature[] = [];
    [features1,features2].forEach((inpt) => {
        if (inpt.type === "FeatureCollection") {
            inpt = inpt as turf.FeatureCollection;
            arr = arr.concat(inpt.features);
        } else if (inpt.type === "Feature") {
            inpt = inpt as turf.Feature;
            arr.push(inpt);
        } else {
            throw new Error ("Invalid input(s) to merge");
        }
    });
    return turf.featureCollection(arr);
}

/*
 * Drawing functions ******************************************
 */

/**
 * Draws a point using (x,y) coordinates in reference to an origin point
 * @param origin Accepts coordinates
 * @param xyCoords New target location, in meters, from origin.
 * @returns Point Feature
 * @example
 * var origin = [-97.522259, 35.4691];
 * var xyCoords = [5000,3000]
 *
 * var newPoint = pointByOriginCoords(origin,xyCoords);
 */
export function pointByOriginCoords(origin: number[], xyCoords: number[]): turf.Feature<turf.Point> {
    return turf.point(findNewCoord(origin,xyCoords));
}

/**
 * Draws a line using an array of (x,y) coordinates in reference to an origin point
 * @param origin Accepts coordinates
 * @param array Array of target coordinates, in meters, from origin.
 * @returns Line Feature
 * @example
 * var origin = [-97.522259, 35.4691];
 * var coordArray = [[5000,3000],[3000,2000],[-1000,6000]];
 *
 * var newLine = lineByOriginCoords(origin,coordArray);
 */
export function lineByOriginCoords(origin: number[], array: number[][]): turf.Feature<turf.LineString> {
    const coordArr = [];
    array.forEach((c) => {
        coordArr.push(findNewCoord(origin,c));
    });
    return turf.lineString(coordArr);
}

/**
 * Draws a polygon using an array of (x,y) coordinates in reference to an origin point
 * @param origin Accepts coordinates
 * @param array1 Array of target coordinates for overall polygon, in meters, from origin.
 * @param array2 Array of Array(s) of target coordinates for hole(s), in meters,
 * from origin: [[hole1coords],[hole2coords]]
 * @returns Polygon Feature
 * @example
 * var origin = [-97.522259, 35.4691];
 * var coordArray = [[5000,3000],[3000,2000],[-1000,6000],[5000,3000]];
 *
 * var newPoly = polygonByOriginCoords(origin,coordArray, undefined);
 */
export function polygonByOriginCoords(origin: number[], array1: number[][], array2: number[][][] = []):
                                      turf.Feature<turf.Polygon> {
    const coordArr = [];
    const outArr = [];
    array1.forEach((c) => {
        outArr.push(findNewCoord(origin,c));
    });
    coordArr.push(outArr);
    array2.forEach((hole) => {
        const holeCoordArr = [];
        hole.forEach((c) => {
            holeCoordArr.push(findNewCoord(origin,c));
        });
        coordArr.push(holeCoordArr);
    });
    return turf.polygon(coordArr);
}

/**
 * Draws a rectangle using height and width, centered to an origin point
 * @param origin Accepts coordinates
 * @param height height of rectangle, in meters
 * @param width width of rectange, in meters
 * @param rotation angle of rotation from North, in degrees.
 * @returns Rectangle Polygon Feature
 * @example
 * var origin = [-97.522259, 35.4691];
 *
 * var newPoly = polygonByOriginCoords(origin,3000,6000,45);
 */
export function polygonByOriginRect(origin: number[], width: number, height: number, rotation: number = 0):
                                    turf.Feature<turf.Polygon> {
    const firstPt = findNewCoord(origin, [width/2,height/2], rotation);
    const secondPt = findNewCoord(origin, [-width/2,height/2], rotation);
    const thirdPt = findNewCoord(origin, [-width/2,-height/2], rotation);
    const forthPt = findNewCoord(origin, [width/2,-height/2], rotation);
    return turf.polygon([[firstPt,secondPt,thirdPt,forthPt,firstPt]]);
}

/**
 * Draws a n-sided polygon, centered to an origin point
 * @param origin Accepts coordinates
 * @param radius Polygon is inscribed in circle of defined radius
 * @param sides Number of sides
 * @param rotation angle of rotation from North, in degrees.
 * @returns n-sided Polygon Feature
 * @example
 * var origin = [-97.522259, 35.4691];
 *
 * var newPoly = polygonByOriginCoords(origin,500,5,60);
 */
export function polygonByOriginSides(origin: number[], radius: number, sides: number, rotation: number = 0):
                                     turf.Feature<turf.Polygon> {
    return turf.transformRotate(turf.circle(origin,radius/1000,{steps:sides}),rotation,{pivot:origin});
}

/*
 * Coords **************************************************************************************************************
 */

/**
 * Shifts coordinates by the specified number
 * @param coordinates Array of coordinates
 * @param num Number to shift by
 * @returns An array of internal angles in degrees
 * @example
 * var coordArr = feature.geometry.coordinates;
 * var shiftedArr = coordsByShift(coordArr, 2);
 */
export function coordsByShift(coords: number[][], num: number) {
    for (let i = 0; i < num; i++) {
        coords.unshift(coords[coords.length - 1]);
        coords.pop();
    }
    return coords;
}

/*
 * Lines ***************************************************************************************************************
 */

/**
 * Divides line by the specified number
 * @param line Accepts a line feature
 * @param num Number to divide by
 * @returns FeatureCollection of lines
 * @example
 * var line = lineByCoords([[-97.522259, 35.4691],[-97.502754, 35.463455],[-97.508269, 35.463245]]);
 * var dividedLines = linesByDivide(line,4);
 */
export function linesByDivide(line: turf.Feature<turf.LineString>, num: number): turf.FeatureCollection {
    const len: number = turf.length(line);
    return turf.lineChunk(line,len/num);
}

/**
 * Explodes polygon into lines
 * @param poly Accepts a Polygon feature
 * @returns FeatureCollection of lines
 * @example
 * var poly = polygonByCoords(
 *    [[[-97.522259, 35.4691],[-97.502754, 35.463455],[-97.508269, 35.463245],[-97.522259, 35.4691]]]
 * );
 * var lines = linesByExplode(poly);
 */
export function linesByExplode(poly: turf.Feature<turf.Polygon>): turf.FeatureCollection<turf.LineString> {
    const lnArr: Array<turf.Feature<turf.LineString>> = [];
    const coordArr = ensureCoordArr(poly);
    for (let i = 0; i < coordArr.length-1; i++) {
        lnArr.push(turf.lineString([coordArr[i], coordArr[i+1]]));
    }
    return turf.featureCollection(lnArr);
}

/**
 * Extends line on either ends
 * @param line Accepts a line feature
 * @param distance Distance to extend line by (in meters)
 * @param reverse Boolean. True to reverse direction
 * @returns line feature
 * @example
 * var line = lineByCoords([[-97.522259, 35.4691],[-97.502754, 35.463455],[-97.508269, 35.463245]]);
 * var extendedLine = lineByExtend(line, 1000, false);
 */
export function lineByExtend(line: turf.Feature<turf.LineString>, distance: number, reverse: boolean):
                             turf.Feature<turf.LineString> {
    const coordArr: any = ensureCoordArr(line);
    let point1: number[];
    let point2: number[];
    if (reverse === false) {
        point1 = coordArr[1];
        point2 = coordArr[0];
    } else {
        point1 = coordArr[coordArr.length - 2];
        point2 = coordArr[coordArr.length - 1];
    }
    const bearing = turf.bearing(point1,point2);// direction from endpoint, pointing outwards
    const newPoint = turf.rhumbDestination(point2, distance/1000, bearing);// new endpoint using direction and distance
    const newCoords: number[] = newPoint.geometry.coordinates;// coords of new endpoint
    if (reverse === false) {// add to coordArr to draw new line
        coordArr.unshift(newCoords);
    } else {
        coordArr.push(newCoords);
    }
    return turf.lineString(coordArr);
}

/**
 * Rebuild line based on number of vertices
 * @param line Accepts a line feature
 * @param num target number of vertices
 * @returns line
 * @example
 * var line = lineByCoords([[-97.522259, 35.4691],[-97.502754, 35.463455],[-97.508269, 35.463245]]);
 * var rebuiltLine = lineByRebuild(line,4);
 */
export function lineByRebuild(line: turf.Feature<turf.LineString>, num: number): turf.Feature<turf.LineString> {
    if (num < 2) {throw new Error("Number of vertices cannot be less than two");}
    let coordArr: any = ensureCoordArr(line);
    if (coordArr.length === num) {return line;}// line has target number of vertices. No rebuild required
    while (coordArr.length !== num) {
        const cArrLen: number = coordArr.length;
        if (cArrLen > num) { // reduce
            const index = findShortest(coordArr);
            coordArr.splice(index,1);
        }
        if (cArrLen < num) { // add vertices
            const index = findlongest(coordArr);
            coordArr = addPoint(coordArr,index);
        }
    }
    return turf.lineString(coordArr);
}

/**
 * Reverse line
 * @param line Accepts a line
 * @returns line feature
 * @example
 * var line = lineByCoords([[-97.522259, 35.4691],[-97.502754, 35.463455],[-97.508269, 35.463245]]);
 * var reversedLine = lineByReverse(line);
 */
export function lineByReverse(line: turf.Feature<turf.LineString>): turf.Feature<turf.LineString> {
    if (line === undefined) {throw new Error ("line must be defined");}
    const coordArr: any = ensureCoordArr(line);// get coords
    coordArr.reverse();// reverse coordArray
    return turf.lineString(coordArr);// draw and return new curve
}

/**
 * Adds vertices to each line segment
 * @param line Accepts a line
 * @param num Number of segments in each existing segment
 * @returns line feature
 * @example
 * var line = lineByCoords([[-97.522259, 35.4691],[-97.502754, 35.463455],[-97.508269, 35.463245]]);
 * var newLine = lineBySegDivide(line,3);
 */
export function lineBySegDivide(line: turf.Feature<turf.LineString>, num: number):turf.Feature<turf.LineString> {
    const coordArr = ensureCoordArr(line);
    let range: number[] = rangeFromNumberNStep(0,num,1/num);
    const arr: number[][] = [];
    for (let i = 0; i<coordArr.length-1; i++) {
        if (i === coordArr.length-2) {range = rangeFromNumberNStep(0,num+1,1/num);}// to include endpoint
        const ln = turf.lineString([coordArr[i],coordArr[i+1]]);
        const len: number = turf.length(ln);
        range.forEach((ind) => {
            arr.push(turf.along(ln,ind*len).geometry.coordinates);
        });
    }
    return turf.lineString(arr);
}
/*

** Polygon functions ******************************************************************************************************************************

*/

/**
 * Loft FeatureCollection of lines and returns a FeatureCollection of Polygons. Curves will be rebuilt based on the
 * maximum number of coordinates of either extreme curve
 * @param lines FeatureCollection of lines
 * @param array Array of indices to flip, if applicable.
 * @returns FeatureCollection of polygons, with "polygonNumber" property. User may use this to verify direction of loft
 * and input lines to flip in array
 * @example
 * var line1 = lineByCoords([[-97.522259, 35.4691],[-97.502754, 35.463455],[-97.508269, 35.463245]]);
 * var line2 = lineByCoords([[-87.522259, 35.4691],[-87.502754, 35.463455],[-87.508269, 35.463245]]);
 * var line 3 = lineByCoords([[-57.522259, 35.4691],[-57.502754, 35.463455],[-57.508269, 35.463245]]);
 * var lineColl = turf.featureCollection([line1,line2,line3]);
 * var polygonsByLoft(lineColl, undefined);
 */
export function polygonsByLoft(lines: turf.FeatureCollection<turf.LineString>, array: number[] = []):
                               turf.FeatureCollection<turf.Polygon> {
    const feats = lines.features;
    if (feats.length < 2) {throw new Error("Insufficient lines to loft");} // check for sufficient lines
    for (let i=0; i<feats.length-1; i++) {// flip curves according to array
        if (array.indexOf(i) === -1) {
            feats[i] = lineByReverse(feats[i]);
        }
    }
    const extremes = [feats[0],feats[feats.length-1]];
    const extremesLenArr: number[] = [];
    extremes.forEach((ln) => { // find number of coords of extreme lines
        extremesLenArr.push(ensureCoordArr(ln).length);
    });
    const rebuildNo: number = Math.max(extremesLenArr[0],extremesLenArr[1]); // rebuild lines based on the max
                                                                             // of extreme lines
    const polygonArr: Array<turf.Feature<turf.Polygon>> = [];
    for (let i=0; i<feats.length-1; i++) {
        const line1 = lineByRebuild(feats[i],rebuildNo);// rebuild first line
        const line2 = lineByRebuild(feats[i+1],rebuildNo);// rebuild next line
        const lnPair = [line1,line2];
        const coordsPair = [];
        lnPair.forEach((ln) => {// break down pair into coords
            coordsPair.push(ensureCoordArr(ln));
        });
        for (let j=0; j<rebuildNo-1; j++) {// create polygon
            const polyCArr = [coordsPair[0][j],coordsPair[1][j],coordsPair[1][j+1],coordsPair[0][j+1],coordsPair[0][j]];
            const partialPlot = turf.polygon([polyCArr]);
            partialPlot.properties.polygonNumber = (i*(rebuildNo-1)+j);// assign number for easy loft direction and
                                                                       // line verification later
            polygonArr.push(partialPlot);
        }
    }
    return turf.featureCollection(polygonArr);
}

/**
 * Extends polygon in perpendicular direction of set line edge
 * @param poly Polygon Feature
 * @param index index of line edge to extend from
 * @param distance distance to extend, in meters
 * @param reverse reverse perpendicular direction (note: may result in kinks)
 * @returns Extended polygon Feature
 * @example
 * var poly = polygonByCoords([[[-97.522259, 35.4691],[-97.502754, 35.463455],[-97.508269, 35.463245],[-97.522259, 35.4691]]]);
 * var extendedPoly = polygonByExtend(poly, 1, 500, false);
 */
export function polygonByExtend(poly: turf.Feature<turf.Polygon>, index: number, distance: number, reverse: boolean = false): turf.Feature<turf.Polygon> {
    distance/= 1000;
    let lnArr = linesByExplode(poly).features;
    if (index > lnArr.length-1 || index < 0) {throw new Error("Index to extend is invalid");}
    // create coord arr that does not include coords of index: coordArr[index] & coordArr[index+1] (anti-clockwise)
    let coordArr: number[][] = ensureCoordArr(poly);
    coordArr.pop();// removes duplicate
    let indexChk = indexCheck([index+1], coordArr.length);
    coordArr = coordsByShift(coordArr,indexChk[0]);// shifts target coords to extremes of coordArr for easy change
    // move and replace extreme coords by distance&direction. Duplicate first coord to end to complete polygon
    let direction = perpenDir(coordArr[0],coordArr[coordArr.length-1],reverse);
    coordArr[0] = turf.rhumbDestination(coordArr[0],distance,direction).geometry.coordinates;
    coordArr[coordArr.length-1] = turf.rhumbDestination(coordArr[coordArr.length-1],distance,direction).geometry.coordinates;
    coordArr.push(coordArr[0]);
    return turf.polygon([coordArr]);
}

/**
 * Divides a polygon using voronoi partitioning with points
 * @param points Points Feature Collection
 * @param poly Polygon Feature
 * @returns FeatureCollection of Voronoi divided polygons
 * @example
 * var poly = polygonByCoords([[[-97.522259, 35.4691],[-97.502754, 35.463455],[-97.508269, 35.463245],[-97.522259, 35.4691]]]);
 * var point1 = pointByCoords([-97.513675,35.4635]);
 * var point2 = pointByCoords([-97.525674, 35.4534]);
 * var pointColl = turf.featureCollection([point1,point2]);
 * var voronoiPoly = polygonsByVoronoi(pointColl,poly);
 */
export function polygonsByVoronoi(points: turf.FeatureCollection<turf.Point>, poly: turf.Feature<turf.Polygon>): turf.FeatureCollection<turf.Polygon> {
    const bbox: turf.BBox = turf.bbox(poly);
    let voronoi: turf.FeatureCollection<turf.Polygon> = turf.voronoi(points, bbox);
    let polyArr: turf.Feature<turf.Polygon>[] = [];
    voronoi.features.forEach(function(feat) {
        let intersection = turf.intersect(feat,poly);
        if (intersection !== null && intersection.geometry.type === "Polygon") {
            polyArr.push(intersection);
        }
    });
    return turf.featureCollection(polyArr);
}

/*
** Divide Functions *********************************************************************************************************************************************
*/

/**
 * Divides any sized polygon into Quads. Does not take polygons with Reflex points
 * @param poly Polygon Feature to divide
 * @returns FeatureCollection of divided polygons
 * @example
 * var poly = turf.polygon([[[-97.522259, 35.4691],[-97.502754, 35.463455],[-97.508269, 35.463245],[-97.522259, 35.4691]]]);
 * var quadsByRadialSplit(poly);
 */

 // ideas to refactor: internally deals with reflex? Check for reflex first? Or assume passed in polygon was already checked?
 // use lineAlong instead of midpoint - tried, may allow user to pass in ratio which the cutting point is made from each edge
export function quadsByRadialSplit(poly: turf.Feature<turf.Polygon>/*, reflex: boolean = false*/): turf.FeatureCollection<turf.Polygon> {
    let coordArr = ensureCoordArr(poly);
    coordArr.pop();// remove duplicate or looping back will give two same coords
    let cen = turf.center(poly); // center will 100% be in polygon since this does not look at reflex cases, also, center works better than centroid.
    let polyArr: turf.Feature<turf.Polygon> [] = [];
    for (let i = 0; i<coordArr.length; i++) {
        let indices = [i-1,i,i+1];
        let subCArr: number[][] = [coordArr[i]];
        if (i === 0||i === coordArr.length-1) {indices = indexCheck(indices, coordArr.length);}// loop back cases
        for (let j = 0; j<indices.length - 1; j++) {// should only run twice
            let midPoint = turf.midpoint(coordArr[indices[j]],coordArr[indices[j+1]]);
            subCArr.push(midPoint.geometry.coordinates);
        }
        subCArr = coordsByShift(subCArr,1);
        subCArr.unshift(cen.geometry.coordinates);
        subCArr.push(cen.geometry.coordinates);
        polyArr.push(turf.polygon([subCArr]));
    }
    return turf.featureCollection(polyArr);
}

/**
 * Checks and splits polygon at first reflex point
 * @param poly Polygon Feature
 * @returns FeatureCollection of polygon(s)
 * @example
 * var poly = polygonByCoords([[[-97.522259, 35.4691],[-97.502754, 35.463455],[-97.513642,35.463765],[-97.508269, 35.463245],[-97.522259, 35.4691]]]);
 * var polygonsByReflexSplit(poly);
 */
export function polygonsByReflexSplit(poly: turf.Feature<turf.Polygon>): turf.FeatureCollection<turf.Polygon> {
    let chkResult = findAllReflexPt(poly);
    if (chkResult.length !== 0) {
        return reflexSplitHandler(poly,chkResult);
    } else {
        return turf.featureCollection([poly]);
    // let toCheck = [poly];
    // let finalFArr = [];
    // while (true) {
    //  let next = [];
    //  toCheck.forEach(function(pGon) {
    //      let chkResult = findAllReflexPt(poly);
    //      let splitCnt = chkResult.length;
    //      if (splitCnt === 0) {
    //          finalFArr.push(pGon);
    //      } else {
    //          next = next.concat(reflexSplitHandler(pGon,chkResult).features);
    //      }
    //  });
    //  if (next.length === 0 || split_all === false) {
    //      finalFArr = finalFArr.concat(next);
    //      break;
    //  }
    //  toCheck = next;
    // }
    // return turf.featureCollection(finalFArr);
    }
}

/**
 * Divides a Quad into smaller quads along the longest side
 * @param poly Polygon Feature
 * @param num target number of polygons
 * @param split_reflex Throws an error if set to false and quad has a reflex point. Reflex quad will be split into three, regardless of number if set to True.
 * @returns FeatureCollection of polygon(s)
 * @example
 * var poly = polygonByCoords([[[-97.522259, 35.4691],[-97.502754, 35.463455],[-97.513642,35.463765],[-97.508269, 35.463245],[-97.522259, 35.4691]]]);
 * var quadByNumberSplit(poly, 4, false);
 */
export function quadsByNumberSplit(poly: turf.Feature<turf.Polygon>, num: number, split_reflex: boolean = false): turf.FeatureCollection<turf.Polygon> {
    let coordArr = ensureCoordArr(poly);
    if (coordArr.length !== 5) {throw new Error("Poly is not a Quad");}
    let refChk = findAllReflexPt(poly);
    let lnArr = linesByExplode(poly).features;
    if (refChk.length !== 0) {
        if (split_reflex === false) {// checks whether user allows division of polygon from where the reflex angle is (if it exists)
            throw new Error("Quad contains a reflex angle");
        } else {return quadReflexSplit(lnArr,coordArr,refChk[0].coordIndex);}// polygon split into two polygons from reflex point,split line is the last line // return three quads from a reflex quad.
    }
    let splitCnt: number = num - 1;// num is the target number of polygons. Number of times to split = num-1
    return quads2longestSplit(lnArr,splitCnt);
}

/*

** util functions *********************************************************************************************************************************

*/

function ensureCoordArr(feature: turf.Feature<turf.LineString|turf.Point|turf.Polygon>): number[][] {
    let coordArr: any = feature.geometry.coordinates;
    while (coordArr.length === 1) {coordArr = coordArr[0];}
    return coordArr;
}

function findlongest(coordArr: turf.Coord[]): number {
    let maxDist: number = -Infinity;
    let index: number = 0;
    for (let i = 0; i < coordArr.length-1; i++) {
        let dist: number = turf.distance(coordArr[i],coordArr[i+1]);
        if (dist>maxDist) {
            maxDist = dist;
            index = i;
        }
    }
    return index;
}

function addPoint(coordArr: turf.Coord[],index: number) {
    let newPoint = turf.midpoint(coordArr[index], coordArr[index + 1]);
    let firstHalf = coordArr.slice(0, index + 1);
    let secondHalf = coordArr.slice(index + 1, coordArr.length);
    firstHalf.push(newPoint.geometry.coordinates);
    return firstHalf.concat(secondHalf);
}

function findShortest(coordArr: turf.Coord[]): number {
    let minDist: number = Infinity;
    let index: number = 0;
    for (let i = 0; i < coordArr.length-2; i++) {
        let dist: number = turf.distance(coordArr[i],coordArr[i+1]);
        if (dist<minDist) {
            minDist = dist;
            index = i + 1;
            if (index === coordArr.length-1) {
                index = i;
            }
        }
    }
    return index;
}

function findAngleBtwVec(vector1: number[], vector2: number[]): number {
    let vec1mag = findMagnitude(vector1);
    let vec2mag = findMagnitude(vector2);
    let cosAngle = findDotProduct(vector1,vector2)/(vec1mag*vec2mag);
    return Math.acos(cosAngle)/Math.PI*180;
}

function findDotProduct(vector1: number[], vector2: number[]): number {
    if (vector1.length !== vector2.length) {throw new Error("Vectors are of unequal length");}
    let sum: number = 0;
    for (let i=0; i<=vector1.length-1; i++) {
        sum += vector1[i]*vector2[i];
    }
    return sum;
}

function findMagnitude(vector: number[]): number {
    let sum: number = 0;
    vector.forEach(function(c) {
        sum += Math.pow(c,2);
    });
    return Math.sqrt(sum);
}

function find2DDeterminant(vector1: number[], vector2: number[]): number {
    return (vector1[0]*vector2[1] - vector1[1]*vector2[0]);
}

function perpenDir(coord1: number[], coord2: number[], reverse) {
    if (reverse === true) {
        return -90 + turf.bearingToAzimuth(turf.bearing(coord1,coord2));
    } else {
        return 90 + turf.bearingToAzimuth(turf.bearing(coord1,coord2));
    }
}

function indexCheck(array: number[], max: number): number[] {// loops back array if index <0 || >max
    for (let i=0; i<array.length; i++) {
        if (array[i]<0) {array[i]+=max;}
        if (array[i]>max-1) {array[i]-=max;}
    }
    return array;
}

interface ReflexAngle {
    coordIndex: number;
    firstVec: [number, number];
    secVec: [number, number];
}

function findAllReflexPt(poly: turf.Feature<turf.Polygon>): Array<ReflexAngle> {
    let coordArr = ensureCoordArr(poly);
    let arr = [];
    for (let j = 0; j<coordArr.length; j++) {// split polygon at first vertex that is larger than 180deg, and Break
        let i = j - 1;
        let k = j + 1;
        if (j === 0) {i = coordArr.length - 1;}
        if (j === coordArr.length - 1) {k = 0;}
        let vec1 = [coordArr[i][0] - coordArr[j][0], coordArr[i][1] - coordArr[j][1]];
        let vec2 = [coordArr[k][0] - coordArr[j][0], coordArr[k][1] - coordArr[j][1]];
        let det = find2DDeterminant(vec1,vec2);
        if (det < 0) {// j is a reflex point
            let retObj = {
                coordIndex: j,
                firstVec: vec1,
                secVec: vec2
            };
            arr.push(retObj);
        }
    }
    return arr;
}

/*
** Reflex Quad: Reflex point to centroid, non-adjacent edges to centroid ** centroid not a good way as it can be outside the polygon? (-more specific. Midpoint between reflexpt and opposite pt will work)
** Reflex Poly: VecAdd split (crude, but handles weird shaped n-polygons: does not deal with specific target nodes/edges; more generic)
*/

function reflexSplitHandler(poly: turf.Feature<turf.Polygon>, chkResult: Array<ReflexAngle>): turf.FeatureCollection<turf.Polygon> {
    let coordArr = ensureCoordArr(poly);// coordArr
    let lnArr = linesByExplode(poly).features;// lnArr
    if (lnArr.length === 4) {
        return quadReflexSplit(lnArr,coordArr,chkResult[0].coordIndex);
    } else {
        return splitByVecAdd(lnArr,coordArr,chkResult);
    }
}

function quadReflexSplit(lnArr:turf.Feature<turf.LineString>[], coordArr: number[][], reflIndex: number): turf.FeatureCollection<turf.Polygon> {// will have one and only one reflex angle: reflex point to centroid, and centroid to non adjacent edges to get three quads.
    let oppPoint = coordArr[indexCheck([Math.ceil(reflIndex+coordArr.length/2)],coordArr.length)[0]];
    let centroid = turf.midpoint(oppPoint,coordArr[reflIndex]);
    let cenCoord = centroid.geometry.coordinates;
    let adjPoints = indexCheck([reflIndex-1,reflIndex+1],coordArr.length);
    let newPtArr = [];
    adjPoints.forEach(function(pIndex) {
        newPtArr.push(turf.nearestPointOnLine(turf.lineString([coordArr[pIndex],oppPoint]), cenCoord).geometry.coordinates); // nearestPointOnLine gave wrong result?!
    });
    let poly1 = turf.polygon([[cenCoord, newPtArr[0], coordArr[adjPoints[0]], coordArr[reflIndex], cenCoord]]);
    let poly2 = turf.polygon([[cenCoord, coordArr[reflIndex], coordArr[adjPoints[1]], newPtArr[1], cenCoord]]);
    let poly3 = turf.polygon([[cenCoord, newPtArr[0], oppPoint, newPtArr[1], cenCoord]]);
    return turf.featureCollection([poly1,poly2,poly3]);
}

function splitByVecAdd(lnArr: turf.Feature<turf.LineString>[], coordArr: number[][], chkResult: Array<ReflexAngle>): turf.FeatureCollection<turf.Polygon> {// splits polygon into TWO using the FIRST reflex point
    let vec1: number[] = chkResult[0].firstVec;
    let vec2: number[] = chkResult[0].secVec;
    let dirVec: number[] = [vec1[0]+vec2[0], vec1[1]+vec2[1]];
    let dirVecMag = findMagnitude(dirVec);
    let basis: number[] = [dirVec[0]/dirVecMag,dirVec[1]/dirVecMag];
    let index = chkResult[0].coordIndex;
    let pt: number[] = coordArr[index];
    let maxDist = -Infinity;
    let intersect: number[];
    let rangeArr: number[][];
    for (let i=0; i<coordArr.length; i++) {// find max dist to every other point
        let dist = turf.distance(coordArr[index],coordArr[i]);
        if (dist > maxDist) {maxDist = dist;}
    }
    let newCoord1 = [pt[0]+basis[0]*maxDist,pt[1]+basis[1]*maxDist];
    let newCoord2 = [pt[0]+basis[0]*-maxDist,pt[1]+basis[1]*-maxDist]; // ensure new line will be long enough to intersect with lines
    let newLn = turf.lineString([newCoord1,newCoord2]);
    for (let i=0; i<lnArr.length; i++) {// check for intersection against all other lines
        if (i === index || i === index-1) {continue;}// skip adjacent lines
        let intChk = turf.lineIntersect(lnArr[i],newLn).features;
        if (intChk.length === 1) {// exists an intersection
            intersect = intChk[0].geometry.coordinates;
            switch (index-i) {// ensure division will not result in triangle (unless polygon is a quad - use other method to handle reflex)
                case 1:
                    i--; break;
                case -1:
                    i++; break;
            }
            i = indexCheck([i],lnArr.length)[0];
            rangeArr = rangeFromIndices(coordArr.length, index, i);
            break; // now have two range of coordIndices to create polygons(not indcluding intersect - added next)
        }
    }
    return turf.featureCollection(polygonsFromCArrArr(cArrFromRangeNInt(coordArr,rangeArr,intersect)));
}

function rangeFromIndices(coordArrLen: number, oriIndex: number, searchedInd: number): number[][] {
    let rangeArr: number[][] = [[],[]];
        // note here: lines and coords are numbered anticlockwise, hence the following
    if(searchedInd<oriIndex) {
        rangeArr[0] = byRange(searchedInd+1,oriIndex+1);
        rangeArr[1] = byRange(oriIndex,coordArrLen-1);
        let rng2Add = byRange(0,searchedInd+1);
        rangeArr[1] = rangeArr[1].concat(rng2Add);
    } else {// i>index, index is skipped. i will never == index
        rangeArr[0] = byRange(searchedInd+1,coordArrLen-1);
        let rng1Add = byRange(0,oriIndex+1);
        rangeArr[0] = rangeArr[0].concat(rng1Add);
        rangeArr[1] = byRange(oriIndex,searchedInd+1);
    }
    return rangeArr;
}

function cArrFromRangeNInt(coordArr: number[][], rangeArr: number[][], intersect: number[]) {
    let newCArr: number [][][] = [];
    rangeArr.forEach(function(rng) {
        let arr: number[][] = [];
        rng.forEach(function(ind) {
            arr.push(coordArr[ind]);
        });
        arr.push(intersect); // add intersect coord to front and back
        arr.unshift(intersect);
        newCArr.push(arr);
    });
    return newCArr;
}

function polygonsFromCArrArr(cArrArr: number[][][]): turf.Feature<turf.Polygon>[] {
    let polyArr: turf.Feature<turf.Polygon>[] = [];
    cArrArr.forEach(function(cArr) {
        polyArr.push(turf.polygon([cArr]));
    });
    return polyArr;
}

/*
*   Splitting Quads *****************************************************************************************************************************************************
*/
function quads2longestSplit(lnArr: turf.Feature<turf.LineString>[], splitCnt: number): turf.FeatureCollection<turf.Polygon> {// input polygon is 100% a non-reflex quad
    let lnLenObj: LongestLine = findLongestLine(lnArr);
    let longIndex: number = lnLenObj.longestInd;
    let longestLine: turf.Feature<turf.LineString> = lnArr[longIndex];  // find longest. Check total length of longest & opposite >= sum of two other length
    let oppIndex: number = longIndex+2;
    if (oppIndex>3) {oppIndex-=4;}
    let otherIndices = [longIndex-1,longIndex+1];
    indexCheck(otherIndices, lnArr.length); // loops back indices if index <0 || >max
    let divideIndices = [longIndex,oppIndex];
    let sum:number = -Infinity;
    [divideIndices,otherIndices].forEach(function(indices) {
        let checkSum = indices.reduce(function(total,next) {return total + lnLenObj.lenArr[next];});
        if (sum>=checkSum) {divideIndices = indices;}
    });// divideIndices should now hold the indices of the two lines we should cut
    let newCoordArr = [];
    let range = rangeFromNumberNStep(0,splitCnt+2,1/(splitCnt+1)); // splitCnt +2 : includes endpoints. 1/numOfPolygons == 1/(splitCnt+1)
    divideIndices.forEach(function(index) {
        let len: number = turf.length(lnArr[index]);
        let arr: number[][] = [];
        range.forEach(function(step) {
            arr.push(turf.along(lnArr[index],step*len).geometry.coordinates);
        });
        newCoordArr.push(arr);
        range.reverse();
    });
    let polyArr: turf.Feature<turf.Polygon>[] = [];
    for (let i = 0; i<newCoordArr[0].length; i++) {
        let coords: number[][] = [newCoordArr[0][i],newCoordArr[0][i+1],newCoordArr[1][i+1],newCoordArr[1][i],newCoordArr[0][i]];
        polyArr.push(turf.polygon([coords]));
    }
    return turf.featureCollection(polyArr);
}

function rangeFromNumberNStep(min: number, num: number, step: number): number [] {
    let arr = [];
    for (let i = 0; i<num; i++) {
        arr.push(i*step);
    }
    return arr;
}

interface LongestLine {
    longestLen: number;
    longestInd: number;
    lenArr: number[];
}

function findLongestLine(lnArr: turf.Feature<turf.LineString>[]): LongestLine {
    let lnLenObj = {
        longestLen: -Infinity,
        longestInd: null,
        lenArr: [],
    };
    for (let i=0; i<lnArr.length; i++) {
        let len = turf.length(lnArr[i]);
        lnLenObj.lenArr.push(len);
        if (len > lnLenObj.longestLen) {
            lnLenObj.longestLen = len;
            lnLenObj.longestInd = i;
        }
    }
    return lnLenObj;
}

/*
** util function - for drawing only *******************************************************************************************************
*/

function findNewCoord(origin: number[], target: number[], rotation: number = 0): number[] {
    // treat target as vector: find angle between target vector and 'north' vector == [0,1] acos returns in RAD - change to deg
    let northVec = [0,1];
    let tarMag = findMagnitude(target);// magnitude of vector == diagonal distance from origin to target location, still in meters.
    let angle = findAngleBtwVec(target,northVec); // returns absolute angle, regardless of direction. Between 0 and 180
    let det = find2DDeterminant(target,northVec); // use determinant to fix direction
    if (det < 0) {angle = 360 - angle;}
    angle += rotation; // for rotation of pre-defined geometry, around the origin
    let newPoint = turf.rhumbDestination(origin, tarMag/1000, angle);// new endpoint using direction and distance set
    return newPoint.geometry.coordinates;// retrieve and return coords from created point
}


// from mobius-array/create.ts
function byRange(min: number, max: number): number[] {
    if (min === undefined) {throw new Error("Invalid arg: min must be defined.");}
    if (max === undefined) {throw new Error("Invalid arg: max must be defined.");}
    const len:number = max - min;
    if (len <= 0) {return [];}
    return Array.apply(0, new Array(len)).map((v, i) => i + min);
}

/*

** WIP ***********************************************************************************************************************************

*/

/*
    n-gon polygon split cases:
    n % 2 == 0 : edge to edge split
    n % 2 == 1 && n !== 3 : point to edge split
    n == 3: radial split
*/

// function quadsFromPolygon (poly: turf.Feature<turf.Polygon>): turf.FeatureCollection {
//     let polyArr = checkAndSplit(poly).features;
//     polyArr.forEach(function(pGon){
//         let coordArr = ensureCoordArr(pGon);
//         let lnArr = linesByExplode(pGon).features;
//         if (lnArr.length ===3) {return quadsByRadial(pGon);}
//         if (lnArr.length %2 === 0) {return splitByFan(pGon);}
//         if (lnArr.length %2 === 1) {return splitByPoint2Edge(pGon);}
//     });
// }

/*
** Edge to Point Split
*/

// function splitByEdge2Point() {} // used to divide odd-poly into quads - not needed for dividing quads

/*
** Edge to Edge splits
*/

// function splitByFan() {
// find longest line
// divide longest line and remaining lines(joined) into target number
// return feature collection of polygons
// note: will result in triangles on two ends
// }

// function splitBy2Longest() { //suitable for recursive split
// find longest two lines
// divide two lines according to number/distance

// }

// function quadsSplitByDistance() {

// }


