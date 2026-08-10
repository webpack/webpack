import fs from "fs";
import path from "path";

// Referenced but never called — the baked url is what is under test.
export const load = () => import(/* webpackChunkName: "lazy" */ "./lazy");
export const loadSource = () =>
	import(/* webpackChunkName: "lazySource" */ "./lazy-source");

// Only the wasm chunk — this file's own needles would satisfy the assertions.
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
