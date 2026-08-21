import fs from "fs";
import path from "path";

it("should hint at every child and load them", async () => {
	const a = await import(
		/* webpackChunkName: "a", webpackPrefetch: true */ "./a.js"
	);

	expect(a.default).toBe("a");
});

it("should fill the reserved names in once the hashes exist", () => {
	const outputPath = __STATS__.children[__INDEX__].outputPath;
	const bundle = fs.readFileSync(
		path.join(outputPath, `${__NAME__}.mjs`),
		"utf8"
	);
	const emitted = fs.readdirSync(outputPath);

	expect(bundle).toContain("link.href = chunkUrls[chunkId]();");

	// Every config shares this directory, so each name has to be this one's shape as
	// well as a file that exists — a stand-in never filled in is neither.
	const baked = bundle.match(/new URL\("\.\/([^"]+\.mjs)"/g) || [];

	expect(baked).toHaveLength(3);

	for (const match of baked) {
		const name = match.slice('new URL("./'.length, -1);

		expect(name).toMatch(/^hashed-(?:a|b|shared)\.[\da-f]+\.mjs$/);
		expect(emitted).toContain(name);
	}
});
