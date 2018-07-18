/**
 * Functions for parsing zipped shape files.
 * https://github.com/calvinmetcalf/shapefile-js
 */

/**
 *
 */

import * as sjs from "shpjs";

/**
 * Parse a shapefile
 * https://github.com/calvinmetcalf/shapefile-js
 *
 * @param data Shapfile data.
 * @returns Parsed data.
 */
export function shp(data: any): any {
    if (data === undefined) {throw new Error("Invalid arg: data must be defined.");}
    return sjs.parseZip(data);
}
