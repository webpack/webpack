import fs from "fs";
import path from "path";

// Reassigned here, so where a chunk sits is only known once this runs.
__webpack_public_path__ = "./";

it("should still hint through the runtime form", async () => {
	const a = await import(
		/* webpackChunkName: "a", webpackPrefetch: true */ "./a.js"
	);

	expect(a.default).toBe("a");
});

it("should keep what builds the url when no literal can name it", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.children[__INDEX__].outputPath, `${__NAME__}.mjs`),
		"utf8"
	);

	expect(bundle).not.toContain(`new URL("./${__NAME__}-a.mjs"`);
	// The hint still reaches for both, so both have to ship.
	expect(bundle).toContain(
		`link.href = ${"__webpack_require__"}.p + ${"__webpack_require__"}.u(chunkId);`
	);
});
