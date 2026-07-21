import fs from "fs";
import path from "path";

it("should load a nested (async→async) dynamic import", async () => {
	const mid = await import(/* webpackChunkName: "mid" */ "./mid.js");
	const { default: value } = await mid.loadDeep();

	expect(value).toBe(7);
});

it("should keep the runtime form for the async→async (nested) import", () => {
	const dir = __STATS__.outputPath;
	const bundle = fs.readFileSync(path.join(dir, "bundle0.mjs"), "utf8");
	// entry → mid is ordering-safe (mid is async, hashed before the entry), so it is
	// analyzable.
	expect(bundle).toContain(`${"__webpack_require__"}.ei(`);

	// mid → deep is async→async: both hash in the same pass, so the referenced hash may
	// not be available to the consumer's hash. It keeps the runtime `ensureChunk` form.
	const midName = fs.readdirSync(dir).find((f) => /^mid\..+\.mjs$/.test(f));
	expect(midName).toBeDefined();
	const midChunk = fs.readFileSync(path.join(dir, midName), "utf8");
	expect(midChunk).toContain(`${"__webpack_require__"}.e(`);
	expect(midChunk).not.toContain('import("./deep');
});
