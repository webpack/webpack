import polyfilled from "core-js";
import regenerated from "regenerator-runtime";

it("should report polyfills a modern target does not need", () => {
	expect(polyfilled).toBe("polyfilled");
	expect(regenerated).toBe("regenerated");

	// core-js polyfills APIs, which `output.environment` says nothing about, so
	// its presence is not evidence and it must not be named.
	expect(__STATS__.warnings[0].message).not.toMatch(/core-js/);
});
