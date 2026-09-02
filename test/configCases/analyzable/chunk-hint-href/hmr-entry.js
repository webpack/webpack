import fs from "fs";
import path from "path";

it("should still hint with the hot handler present", async () => {
	const a = await import(
		/* webpackChunkName: "a", webpackPrefetch: true */ "./a.js"
	);

	expect(a.default).toBe("a");
});

it("should write the hint urls out for a runtime that can be updated", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.children[__INDEX__].outputPath, `${__NAME__}.mjs`),
		"utf8"
	);

	// Every url here is settled at build time, so an update that changes the map
	// re-ships the runtime module holding it, and the hint reads the map.
	expect(bundle).toContain(`new URL("./${__NAME__}-a.mjs"`);
	expect(bundle).toContain("link.href = chunkUrls[chunkId]();");
	// The hot handler still builds the update's url from the id.
	expect(bundle).toContain(`${"__webpack_require__"}.hu = `);
});
