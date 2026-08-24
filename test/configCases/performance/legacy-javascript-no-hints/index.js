import polyfilled from "core-js";
import regenerated from "regenerator-runtime";

it("should stay quiet when hints are off", () => {
	expect(polyfilled).toBe("polyfilled");
	expect(regenerated).toBe("regenerated");
	expect(__STATS__.hints).toHaveLength(0);
});
