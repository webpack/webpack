import "./pure";

it("should not include unused assets", () => {
	expect(__webpack_modules__["./pure.js"]).not.toBeDefined();
});
