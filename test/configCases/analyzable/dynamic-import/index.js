import fs from "fs";
import path from "path";

it("should load the dynamically imported chunk", async () => {
	const { default: value } = await import(
		/* webpackChunkName: "dynamic" */ "./dynamic.js"
	);

	expect(value).toBe(42);
});

it("should emit an analyzable literal import() for module output", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	// A statically-named specifier a foreign bundler can follow, wrapped in the
	// analyzable-import helper instead of the runtime `ensureChunk(id)` call.
	const ensureChunkCall = `${"__webpack_require__"}.e(`;

	expect(bundle).toContain('import(/*! import() | dynamic */ "./dynamic.mjs")');
	expect(bundle).toContain(`${"__webpack_require__"}.ei(`);
	expect(bundle).not.toContain(ensureChunkCall);
});
