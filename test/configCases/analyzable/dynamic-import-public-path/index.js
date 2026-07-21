import fs from "fs";
import path from "path";

// Reference the dynamic chunk statically so webpack emits the split chunk, but
// never execute it — the harness can't fetch the absolute CDN publicPath URL.
const load = () => import(/* webpackChunkName: "dynamic" */ "./dynamic.js");

it("should emit an analyzable literal import() with an absolute publicPath", () => {
	expect(typeof load).toBe("function");

	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	// A non-`auto` publicPath prefixes an absolute URL specifier a foreign bundler
	// can follow, wrapped in the analyzable-import helper instead of `ensureChunk(id)`.
	const ensureChunkCall = `${"__webpack_require__"}.e(`;

	expect(bundle).toContain(
		'import(/*! import() | dynamic */ "https://cdn.example.com/assets/dynamic.mjs")'
	);
	expect(bundle).toContain(`${"__webpack_require__"}.ei(`);
	expect(bundle).not.toContain(ensureChunkCall);
});
