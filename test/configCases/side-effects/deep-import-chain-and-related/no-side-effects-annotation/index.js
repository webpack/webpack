import "./pure";

it("no-side-effects-annotation: should not include unused assets", () => {
	expect(__webpack_modules__["./pure.js"]).not.toBeDefined();
});
