import fs from "fs";
import path from "path";

it("should load the dynamically imported chunk with analyzableChunkImport: false", async () => {
	const { default: value } = await import(
		/* webpackChunkName: "dynamic" */ "./dynamic.js"
	);

	expect(value).toBe(42);
});

it("should not emit an analyzable literal import() when analyzableChunkImport is disabled", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	const directDynamicImport = `import(/*${"!"} import() | dynamic */ "./dynamic.mjs")`;

	expect(bundle).not.toContain(directDynamicImport);
	expect(bundle).not.toContain(`${"__webpack_require__"}.ei(`);
	expect(bundle).toContain(`${"__webpack_require__"}.e(`);
});
