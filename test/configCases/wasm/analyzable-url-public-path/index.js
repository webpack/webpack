import fs from "fs";
import path from "path";

// Referenced but never called: the binary would be loaded from the public path, and
// what is under test is the URL webpack bakes for it.
export const load = () => import(/* webpackChunkName: "lazy" */ "./lazy");

// Only the chunk holding the wasm module: the entry bundle carries this file's own
// needles, which would satisfy the assertions on their own.
const chunk = () =>
	fs.readFileSync(
		path.join(__STATS__.children[0].outputPath, __WASM_CHUNK__),
		"utf8"
	);

it("should bake the binary's url in the expected form", () => {
	expect(chunk()).toContain(__WASM_REF__);
});

it("should not assemble the binary's url at runtime", () => {
	// Needle built at runtime so it is not a source string literal here.
	expect(chunk()).not.toContain(`new URL(${"__webpack_require__"}.p + `);
});
