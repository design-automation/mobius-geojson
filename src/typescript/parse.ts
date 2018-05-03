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
 */
export function shp(data: any): any {
    if (data === undefined) {throw new Error("Invalid arg: data must be defined.");}
    return sjs.parseZip(data);
}
