
import { describe, it, expect } from "vitest";

describe("FireWatch - First tests", () => {
    it("should calculate the number of fires", () => {
        const fires = ["QC-001", "QC-002", "ON-001"];

        expect(fires.length).toBe(3);
    });

    it("should filter fires by province", () => {
        const fires = [
            { id: "1", province: "QC" },
            { id: "2", province: "ON" },
            { id: "3", province: "QC" }
        ];

        const quebecFires = fires.filter(
            (fire) => fire.province === "QC"
        );

        expect(quebecFires).toHaveLength(2);
    });
});
