import * as turf from "@turf/turf";
// I have a dictionary of busstops which maps array of buses that passes through busstop
// I have a feature collection of busstops with bustop id as line
// objective:
// 1) loop through dictionary, create another dictionary for each bus route that maps to bus stop
//    (each has a property called busstop with an array of busstops)
// 2) create dictionary of busstops
// 3) go through each dictionary (1), extract element in array, use it to call busstop point feature in (2). Draw line

function busRouteDict(jsonFile) { // dictionary of bus number as keys: array of bus stop numbers
    const busRouteObj = {};
    Object.keys(jsonFile).forEach((busstopnum) => {
        jsonFile[busstopnum].forEach((busNum) => {
            if (busRouteObj.hasOwnProperty(busNum)) {
                busRouteObj[busNum].push(busstopnum);
            } else {
                busRouteObj[busNum] = [busstopnum];
            }
        });
    });
    return busRouteObj;
}

function busStopDict(fColl: turf.FeatureCollection<turf.Point>) {// dictionary of busstop numbers as keys: point
    const busStopObj = {};
    fColl.features.forEach((busStopFeat) => {
        const busStopNum = "BUS_STOP_N";
        busStopObj[busStopFeat.properties[busStopNum]] = busStopFeat;
    });
    return busStopObj;
}

function injectNumBuses(fColl, jsonFile) {
    fColl.features.forEach((busStopFeat) => {
        const val = "BUS_STOP_N";
        const busStopNum = busStopFeat.properties[val];
        busStopFeat.properties.noBusStops = jsonFile[busStopNum].length;
    });
}

function drawBusRoutes(busRouteDict, busStopDict): turf.FeatureCollection<turf.LineString> {
    const retArr = [];
    Object.keys(busRouteDict).forEach((busNum) => {
        const pointArr = [];
        const busstoparr = busRouteDict[busNum];
        for (let i=0; i<busstoparr.length;i++) {
            const busstopnum = busstoparr[i];
            if (busStopDict[busstopnum] === undefined) {
                continue;
            }
            const coord = busStopDict[busstopnum].geometry.coordinates;
            pointArr.push(coord);
        }
        if (pointArr.length >=2) {retArr.push(turf.lineString(pointArr));}
    });
    return turf.featureCollection(retArr);
}

function busNumArr(fColl: turf.FeatureCollection<turf.Point>) {
    const retSet = new Set();
    fColl.features.forEach((busStopFeat) => {
        const busStopNum = "BUS_STOP_N";
        retSet.add(busStopFeat.properties[busStopNum]);
    });
    const retArr = Array.from(retSet);
    return retArr;
}

function drawBusLines(jsonFile, busNumArr) {
    const arr = [];
    busNumArr.forEach((busNum) => {
        const coordArr = [];
        jsonFile[busNum].forEach((coord) => {
            coordArr.push(coord.split(","));
        });
        if (coordArr.length>=2) {
            arr.push(turf.lineString(coordArr));
        }
    });
    return turf.featureCollection(arr);
}
