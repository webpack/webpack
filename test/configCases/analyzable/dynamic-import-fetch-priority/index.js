import fs from "fs";
import path from "path";

// Reference the chunk statically so it is emitted, but don't execute the load —
// the assertion only inspects the generated source.
const load = () => import(/* webpackFetchPriority: "high" */ "./dynamic.js");

it("should still emit the analyzable form when a fetchPriority hint is set", () => {
	expect(typeof load).toBe("function");

	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	// `fetchPriority` is not supported for ESM module output: a native `import()`
	// can't carry the hint, and the ESM chunk-loading runtime ignores the priority
	// argument too. So the hint must not degrade the output — the analyzable literal
	// is still emitted and no priority-aware runtime is pulled in.
	expect(bundle).toContain(`${"__webpack_require__"}.ei(`);
	expect(bundle).not.toContain(`${"__webpack_require__"}.e(`);
	expect(bundle).not.toContain(`${'"hi'}${'gh"'}`);
});
