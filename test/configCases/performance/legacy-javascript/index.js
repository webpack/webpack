import polyfilled from "core-js";
import regenerated from "regenerator-runtime";

it("should report polyfills a modern target does not need", () => {
	expect(polyfilled).toBe("polyfilled");
	expect(regenerated).toBe("regenerated");
});
