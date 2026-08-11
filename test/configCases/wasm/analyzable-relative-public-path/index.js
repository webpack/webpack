import fs from "fs";
import path from "path";

export const load = () => import(/* webpackChunkName: "lazy" */ "./lazy");

if (__RUNS__) {
	it("should reach the binary through the baked relative url", async () => {
		expect((await load()).run()).toBe(42);
	});
}

it("should reference the binary in the expected form", () => {
	// Only the wasm chunk — this file's own needles would satisfy the assertion.
	const source = fs.readFileSync(
		path.join(__STATS__.children[__INDEX__].outputPath, __CHUNK__),
		"utf8"
	);

	expect(source).toContain(__WASM_REF__);
});
