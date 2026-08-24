import polyfilled from "core-js";
import regenerated from "regenerator-runtime";

it("should report through the stats channel", () => {
	expect(polyfilled).toBe("polyfilled");
	expect(regenerated).toBe("regenerated");
	expect(__STATS__.hints).toHaveLength(1);
	expect(__STATS__.hints[0].message).toMatch(/legacy javascript: /);
	expect(__STATS__.warnings).toHaveLength(0);
});
