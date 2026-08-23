import polyfilled from "core-js";
import regenerated from "regenerator-runtime";

it("should stay quiet when the target lacks a feature", () => {
	expect(polyfilled).toBe("polyfilled");
	expect(regenerated).toBe("regenerated");
	expect(__STATS__.warnings).toHaveLength(0);
});
