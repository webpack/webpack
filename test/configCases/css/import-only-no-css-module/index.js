// Never awaited: the assertions are about what the runtime was built to load.
export const load = () => import("./lazy.js");

// The build has no css module at all, so `hasCssModules` is never required -- the
// loading runtime still has to exist, or the emitted stylesheet never loads.
it("should load a stylesheet no css module produced", () => {
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const { outputPath } = __STATS__;

	expect(
		fs.readFileSync(path.join(outputPath, "lazy_js.css"), "utf-8")
	).toContain('@import url("./ext.css");');

	const source = fs.readFileSync(path.join(outputPath, "bundle0.js"), "utf-8");
	const runtime = `webpack/runtime/css ${"loading"}`;

	expect(source).toContain(runtime);

	const condition = source
		.split(runtime)[1]
		.split("\n")
		.find((line) => line.includes("chunkId") && line.includes("if("));

	expect(condition.trim()).toMatchSnapshot();
});
