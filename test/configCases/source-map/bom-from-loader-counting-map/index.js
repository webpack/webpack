import chained from "./chained.js";
import direct from "./direct.js";

it("should run modules whose loader produced a BOM its map counted", () => {
	expect(chained).toBe("BOM_CHAINED_TOKEN");
	expect(direct).toBe("BOM_DIRECT_TOKEN");
});
