import * as tm from "../_export";
import * as td from "../test_data";
import * as turf from "@turf/turf";
import {} from "jasmine";

describe("Tests for crs module", () => {
    it("test_crs_wgs2gcjXform", () => {
        expect( test_crs_wgs2gcjXform() ).toBe(true);
    });
});

export function test_crs_wgs2gcjXform(): boolean {
    const coll: turf.FeatureCollection = td.testDataChina();
    tm.crs.wgs2gcjXform(coll);
    console.log(coll.features[0]);
    return true;
}


