// Never awaited: the assertions are about what the runtime was built to load.
export const load = () => [import("./real-lazy.js"), import("./lazy.js")];

// `lazy_js`'s only css is an `@import` external, so it has no `CSS_TYPE` module --
// but a stylesheet is emitted for it, so the loader has to name it too.
it("should cover a chunk whose only css is an external import", () => {
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const { outputPath } = __STATS__;

	expect(
		fs.readFileSync(path.join(outputPath, "lazy_js.css"), "utf-8")
	).toContain("@import");

	const source = fs.readFileSync(path.join(outputPath, "bundle0.js"), "utf-8");
	const condition = source
		.split(`webpack/runtime/css ${"loading"}`)[1]
		.split("\n")
		.find((line) => line.includes("chunkId") && line.includes("if("));

	expect(condition.trim()).toMatchSnapshot();
});
