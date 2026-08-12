import fs from "fs";
import path from "path";

// Referenced but never loaded — the harness cannot fetch, and the emitted loader is
// what is under test.
export const load = () => import(/* webpackChunkName: "lazy" */ "./module");

it("should inline a public path that never changes", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);

	expect(bundle).toContain('fetch("https://cdn.test/" + ');
	// Nothing reads the global for a value that is already known.
	expect(bundle).not.toContain(`${"__webpack_require__"}.p`);
});
