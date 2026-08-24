import polyfilled from "core-js";
import regenerated from "regenerator-runtime";

it("should report through the error channel", () => {
	expect(polyfilled).toBe("polyfilled");
	expect(regenerated).toBe("regenerated");
});
