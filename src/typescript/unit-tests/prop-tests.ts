// import * as tm from "../_export";
// import * as td from "../test_data";
// import * as turf from "@turf/turf";
// import {} from "jasmine";

// describe("Tests for prop module", () => {
//     it("test_prop_setValues", () => {
//         expect( test_prop_setValues() ).toBe(true);
//     });
// });

// export function test_prop_setValues(): boolean {
//     const coll: turf.FeatureCollection = td.testData1();
//     const polys: Array<turf.Feature<turf.Polygon>> = tm.fcoll.getPolygons(coll);
//     const result1: number = tm.prop.setValues(polys[0], ["A", "B", "C"], [11,22,33]);
//     if (result1 !== 3) {return false;}
//     if (tm.prop.getValue(polys[0], "B") !== 22) {return false;}
//     const result2: number = tm.prop.setValues(polys[0], ["1",, "3"], [11,22,33]);
//     if (result2 !== 2) {return false;}
//     if (tm.prop.getValue(polys[0], "_3") !== 33) {return false;}
//     delete polys[0].properties;
//     const result3: number = tm.prop.setValues(polys[0], ["A", "B", "C"], [11,22,33]);
//     if (tm.prop.getValue(polys[0], "B") !== 22) {return false;}
//     return true;
// }
