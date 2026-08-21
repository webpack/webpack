import fs from "fs";
import path from "path";

it("should still hint with the hot handler present", async () => {
	const a = await import(
		/* webpackChunkName: "a", webpackPrefetch: true */ "./a.js"
	);

	expect(a.default).toBe("a");
});

it("should keep the runtime url form for a runtime that can be updated", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.children[__INDEX__].outputPath, `${__NAME__}.mjs`),
		"utf8"
	);

	// An update hints at ids this map knows nothing about, so nothing is written out.
	expect(bundle).not.toContain(`new URL("./${__NAME__}-a.mjs"`);
	expect(bundle).toContain(
		`link.href = ${"__webpack_require__"}.p + ${"__webpack_require__"}.u(chunkId);`
	);
});
