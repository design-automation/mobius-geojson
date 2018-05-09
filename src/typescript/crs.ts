/**
 * Functions for adding UI components to Cesium.

/**
 *
 */

import * as turf from "@turf/turf";
import * as evil from "eviltransform";

/**
 * Transform coordinate between earth(WGS-84) and mars in china(GCJ-02).
 * https://www.npmjs.com/package/eviltransform
 *
 * Input WGS-84 coordinate(wgsLat, wgsLng) and convert to GCJ-02 coordinate(gcjLat, gcjLng).
 *
 * @param wgsLatLng An array, [wgsLat, wgsLng].
 * @returns An array, [gcjLat, gcjLng]
 */
export function wgs2gcj(wgsLatLng: [number, number]): [number, number] {
    const result: {lat: number, lng: number} = evil.wgs2gcj(...wgsLatLng);
    return [result.lat, result.lng];
}

/**
 * Transform coordinate between earth(WGS-84) and mars in china(GCJ-02).
 * https://www.npmjs.com/package/eviltransform
 *
 * Input GCJ-02 coordinate(gcjLat, gcjLng) and convert to WGS-84 coordinate(wgsLat, wgsLng).
 *
 * @param gcjLatLng An array, [gcjLat, gcjLng].
 * @returns An array, [wgsLat, wgsLng]
 */
export function gcj2wgs(gcjLatLng: [number, number]): [number, number] {
    const result: {lat: number, lng: number} = evil.gcj2wgs(...gcjLatLng);
    return [result.lat, result.lng];
}

/**
 * Transform coordinate between earth(WGS-84) and mars in china(GCJ-02).
 * https://www.npmjs.com/package/eviltransform
 *
 * Input GCJ-02 coordinate(gcjLat, gcjLng) and convert to WGS-84 coordinate(wgsLat, wgsLng).
 *
 * The output WGS-84 coordinate's accuracy is less than 0.5m,
 * but much slower than the gcj2wgs function.
 *
 * @param gcjLatLng An array, [gcjLat, gcjLng].
 * @returns An array, [wgsLat, wgsLng]
 */
export function gcj2wgsExact(gcjLatLng: [number, number]): [number, number] {
    const result: {lat: number, lng: number} = evil.gcj2wgs_exact(...gcjLatLng);
    return [result.lat, result.lng];
}

/**
 * Transform coordinate between earth(WGS-84) and mars in china(BD).
 * https://www.npmjs.com/package/eviltransform
 *
 * Input WGS-84 coordinate(wgsLat, wgsLng) and convert to BD coordinate(bdLat, bdLng).
 *
 * @param wgsLatLng An array, [wgsLat, wgsLng].
 * @returns An array, [gcjLat, gcjLng]
 */
export function wgs2bd(wgsLatLng: [number, number]): [number, number] {
    const result: {lat: number, lng: number} = evil.wgs2bd(...wgsLatLng);
    return [result.lat, result.lng];
}

/**
 * Transform coordinate between earth(WGS-84) and mars in china(BD).
 * https://www.npmjs.com/package/eviltransform
 *
 * Input BD coordinate(bdLat, bdLng) and convert to WGS-84 coordinate(wgsLat, wgsLng).
 *
 * @param bdLatLng An array, [bdLat, bdLng].
 * @returns An array, [wgsLat, wgsLng]
 */
export function bd2wgs(bdLatLng: [number, number]): [number, number] {
    const result: {lat: number, lng: number} = evil.bd2wgs(...bdLatLng);
    return [result.lat, result.lng];
}

/**
 * Transform all the points in a feature collection
 * from WGS-84 coordinates to GCJ-02 coordinates.
 * https://www.npmjs.com/package/eviltransform
 * (Changes original input.)
 *
 * @param featureColl A feature collection.
 * @returns The number of points that were converted.
 */
export function wgs2gcjXform(featureColl: turf.FeatureCollection): number {
    let counter: number = 0;
    for (const feature of featureColl.features) {
        const latLngs: [number, number][][] = turf.getCoords(feature)
        for (let i = 0;i<latLngs.length; i++) {
            for (let j = 0;j<latLngs[i].length; j++) {
                latLngs[i][j] = wgs2gcj(latLngs[i][j]);
                counter++;
            }
        }
    }
    return counter;
}

/**
 * Transform all the points in a feature collection
 * from GCJ-02 coordinates to WGS-84  coordinates.
 * https://www.npmjs.com/package/eviltransform
 * (Changes original input.)
 *
 * @param featureColl A feature collection.
 * @returns The number of points that were converted.
 */
export function gcj2wgsXform(featureColl: turf.FeatureCollection): number {
    let counter: number = 0;
    for (const feature of featureColl.features) {
        const latLngs: [number, number][][] = turf.getCoords(feature)
        for (let i = 0;i<latLngs.length; i++) {
            for (let j = 0;j<latLngs[i].length; j++) {
                latLngs[i][j] = gcj2wgs(latLngs[i][j]);
                counter++;
            }
        }
    }
    return counter;
}

/**
 * Transform all the points in a feature collection
 * from WGS-84 coordinates to BD coordinates.
 * https://www.npmjs.com/package/eviltransform
 * (Changes original input.)
 *
 * @param featureColl A feature collection.
 * @returns The number of points that were converted.
 */
export function wgs2bdXform(featureColl: turf.FeatureCollection): number {
    let counter: number = 0;
    for (const feature of featureColl.features) {
        const latLngs: [number, number][][] = turf.getCoords(feature)
        for (let i = 0;i<latLngs.length; i++) {
            for (let j = 0;j<latLngs[i].length; j++) {
                latLngs[i][j] = wgs2bd(latLngs[i][j]);
                counter++;
            }
        }
    }
    return counter;
}

/**
 * Transform all the points in a feature collection
 * from BD coordinates to WGS-84  coordinates.
 * https://www.npmjs.com/package/eviltransform
 * (Changes original input.)
 *
 * @param featureColl A feature collection.
 * @returns The number of points that were converted.
 */
export function bd2wgsXform(featureColl: turf.FeatureCollection): number {
    let counter: number = 0;
    for (const feature of featureColl.features) {
        const latLngs: [number, number][][] = turf.getCoords(feature)
        for (let i = 0;i<latLngs.length; i++) {
            for (let j = 0;j<latLngs[i].length; j++) {
                latLngs[i][j] = bd2wgs(latLngs[i][j]);
                counter++;
            }
        }
    }
    return counter;
}
