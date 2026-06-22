const fs = __non_webpack_require__("fs");

// Build-time only: creates an async chunk (hence chunk-loading runtime) without
// executing the import at runtime.
// eslint-disable-next-line no-unused-vars
function load() {
	return import("./chunk.js");
}

const bundle = __filename.split(/[\\/]/).pop();

it(`should emit logical assignment in the chunk-loading runtime (${bundle})`, () => {
	// The chunk-loading runtime lines that go through `runtimeTemplate.assignOr`:
	// the `installedChunks` HMR-state init and the `chunkLoadingGlobal` init.
	const lines = fs
		.readFileSync(__filename, "utf-8")
		.split("\n")
		.map(line => line.replace(/^\/\*+\/\s*/, "").trim())
		.filter(line => /^\w+ (installedChunks|chunkLoadingGlobal) =/.test(line));

	expect(lines).toMatchSnapshot();
});
