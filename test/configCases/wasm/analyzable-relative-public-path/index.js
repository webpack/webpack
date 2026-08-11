// Referenced but never called — the binary's reference is what is under test.
export const load = () => import(/* webpackChunkName: "lazy" */ "./lazy");

const fs = require("fs");
const path = require("path");

it("should reference the binary in the expected form", () => {
	// Only the wasm chunk — this file's own needles would satisfy the assertion.
	const source = fs.readFileSync(
		path.join(__STATS__.children[__INDEX__].outputPath, __CHUNK__),
		"utf8"
	);

	expect(source).toContain(__WASM_REF__);
});
