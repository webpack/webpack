import fs from "fs";
import path from "path";

// Reference the chunk statically so it is emitted, but don't execute the load —
// the assertion only inspects the generated source.
const load = () =>
	import(/* webpackFetchPriority: "high" */ "./dynamic.js");

it("should keep the runtime ensureChunk form when a fetchPriority hint is set", () => {
	expect(typeof load).toBe("function");

	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	// The analyzable literal `import()` can't carry the fetchPriority hint, so the
	// runtime `ensureChunk(id, "high")` form is kept instead of `.ei(...)`.
	expect(bundle).toContain(`${"__webpack_require__"}.e(`);
	expect(bundle).not.toContain(`${"__webpack_require__"}.ei(`);
});
