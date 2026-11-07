import asset from "./asset.jpg";

it("should use global publicPathFunction for entry b", () => {
	expect(asset).toBe("/global/asset.jpg");
});

it("should have __webpack_require__.P as function in entry b", () => {
	expect(__webpack_require__.P).toBeTypeOf("function");
	expect(__webpack_require__.P("test.js", "/base/")).toBe("/global/test.js");
});
