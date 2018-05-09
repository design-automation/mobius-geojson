/**
 * Some test data
 */
 import * as turf from "@turf/turf";

export function testData1(): turf.FeatureCollection {
    return {
        type: "FeatureCollection",
        // crs: {
        //     type: "name",
        //     properties: {
        //         name: "EPSG:4326",
        //     },
        // },
        features: [{
            type: "Feature",
            id: 0,
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            103.71529692200005,
                            1.3132188960000235,
                        ],
                        [
                            103.71408074100003,
                            1.3132458120000479,
                        ],
                        [
                            103.71408060628971,
                            1.3132402809624908,
                        ],
                        [
                            103.71407583807854,
                            1.3130169760481405,
                        ],
                        [
                            103.71407520600008,
                            1.3129801550000479,
                        ],
                        [
                            103.71408286900004,
                            1.3129739370000379,
                        ],
                        [
                            103.71413070000006,
                            1.3129237150000677,
                        ],
                    ],
                ],
            },
            properties: {
                FID: 0,
                objectid_1: "4",
                LANDUSE: "BUSINESS 2",
                LAND_TYPE: "SC_Generic",
                PDT_OWNER: "Unknown",
                Status_Cat: "Test Data",
                DIST_EWL: 2927.46,
                DIST_FEED: 3778.194,
                DIST_TRUNK: 111.151,
                GPR: "2.5",
                HB_LIMIT: "92",
                AGG_POT: 0.66000000000000003,
                HB_AMSL: 89,
                AVAILABLE: "COMMITTED",
                AREA: "4245",
                TRANSPAREN: 1,
                objectid_2: "\n",
                DEFAULT: "\n",
                OBJECTID: 1,
            },
        }],
    }
}


export function testDataChina(): turf.FeatureCollection {
    return {
        type: "FeatureCollection",
        features: [{
            type: "Feature",
            id: 0,
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            116.0,
                            39.0,

                        ],
                        [
                            116.0,
                            39.2,

                        ],
                        [
                            116.2,
                            39.2,

                        ],
                        [
                            116.2,
                            39.0,
                        ],
                    ],
                ],
            },
            properties: {
                FID: 0,
            },
        }],
    }
}
