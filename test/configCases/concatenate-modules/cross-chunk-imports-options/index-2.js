import "./effects.js";

it("should build a namespace object without Symbol where the environment has none", async () => {
	const page = await import(/* webpackChunkName: "page-1" */ "./page-1.js");
	await import(/* webpackChunkName: "page-2" */ "./page-2.js");
	expect(page.run()).toEqual(["a", ["x", "y"]]);
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const shared = fs.readFileSync(path.join(__dirname, "shared-2-2.mjs"), "utf-8");
	expect(shared).toContain("__esModule: { value: true }");
	expect(shared).not.toContain("Symbol");
});
