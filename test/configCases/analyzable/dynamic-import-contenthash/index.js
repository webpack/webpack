import fs from "fs";
import path from "path";

it("should load a chunk whose filename uses a digest-suffixed content hash", async () => {
	const { default: value } = await import(
		/* webpackChunkName: "dynamic" */ "./dynamic.js"
	);

	expect(value).toBe(42);
});

it("should fall back to the runtime form for a hashed chunk filename", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	// The content hash isn't known at code generation, so the analyzable literal
	// can't be baked — the runtime `ensureChunk` form is kept instead of `.ei`.
	expect(bundle).toContain(`${"__webpack_require__"}.e(`);
	expect(bundle).not.toContain(`${"__webpack_require__"}.ei(`);
});
