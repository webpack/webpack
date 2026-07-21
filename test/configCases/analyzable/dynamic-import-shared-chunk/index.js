import fs from "fs";
import path from "path";

it("should load two dynamic imports that share a vendor chunk", async () => {
	const [a, b] = await Promise.all([
		import(/* webpackChunkName: "a" */ "./a.js"),
		import(/* webpackChunkName: "b" */ "./b.js")
	]);
	// Both share the vendor chunk; the analyzable `.ei` helper must dedup it.
	expect(a.default).toBe(101);
	expect(b.default).toBe(102);
});

it("should emit an analyzable literal for the shared vendor chunk", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	// The vendor chunk is shared by both dynamic imports; each site emits the same
	// literal `import("./vendor.mjs")`, deduped at runtime by the `.ei` helper.
	expect(bundle).toContain('import("./vendor.mjs")');
	expect(bundle).toContain(`${"__webpack_require__"}.ei(`);
	expect(bundle).not.toContain(`${"__webpack_require__"}.e(`);
});
