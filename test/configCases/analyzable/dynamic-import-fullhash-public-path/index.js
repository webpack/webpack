import fs from "fs";
import path from "path";

// Reference the dynamic chunk statically so webpack emits the split chunk, but never
// execute it — the harness can't fetch the absolute CDN publicPath URL.
const load = () => import(/* webpackChunkName: "dynamic" */ "./dynamic.js");

it("should bake the full hash into the analyzable import specifier", () => {
	expect(typeof load).toBe("function");

	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	// The `[fullhash]` publicPath is resolved to the build's full hash and baked into
	// a literal specifier a foreign bundler can follow — the full-hash marker module
	// emits no runtime helper.
	expect(bundle).toContain(
		`import(/*! import() | dynamic */ "https://cdn.example.com/${__STATS__.hash}/dynamic.mjs")`
	);
	expect(bundle).toContain(`${"__webpack_require__"}.ei(`);
	// No `getFullHash` runtime helper is emitted (the marker is no-emit).
	expect(bundle).not.toContain(`${"__webpack_require__"}${".h"}`);
	expect(bundle).not.toContain(`${"__webpack_require__"}.e(`);
});
