import * as tm from "../_export";
import * as td from "../test_data";
import * as turf from "@turf/turf";
import {} from "jasmine";

describe("Tests for crs module", () => {
    it("test_crs_wgs2gcjXform", () => {
        expect( test_crs_wgs2gcjXform() ).toBe(true);
    });
    it("test_crs_wgs2gcj", () => {
        expect( test_crs_wgs2gcj() ).toBe(true);
    });
    it("test_crs_wgs2bd", () => {
        expect( test_crs_wgs2bd() ).toBe(true);
    });
    it("test_crs_bd2wgs", () => {
        expect( test_crs_bd2wgs() ).toBe(true);
    });
    it("test_crs_gcj2wgs", () => {
        expect( test_crs_gcj2wgs() ).toBe(true);
    });
});

export function test_crs_wgs2gcjXform(): boolean {
    const coll: turf.FeatureCollection = td.testDataChina();
    tm.crs.wgs2gcjXform(coll);
    console.log(coll.features[0]);
    return true;
}

export function test_crs_wgs2gcj(): boolean {
    const result: [number, number] = tm.crs.wgs2gcj([116, 39]);
    console.log(result);
    return true;
}

export function test_crs_wgs2bd(): boolean {
    const result: [number, number] = tm.crs.wgs2bd([116, 39]);
    console.log(result);
    return true;
}

export function test_crs_bd2wgs(): boolean {
    const result: [number, number] = tm.crs.bd2wgs([116, 39]);
    console.log(result);
    return true;
}

export function test_crs_gcj2wgs(): boolean {
    const result: [number, number] = tm.crs.gcj2wgs([116, 39]);
    console.log(result);
    return true;
}
