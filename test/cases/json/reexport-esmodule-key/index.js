import value from "./cjs.js";

it("should read the default export of an ES module re-exported from CommonJS", () => {
	expect(value).toBe("esm default");
});
