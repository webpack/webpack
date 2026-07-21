import fs from "fs";
import path from "path";

it("should load the chunk through the analyzable import", async () => {
	const { default: value } = await import(
		/* webpackChunkName: "dynamic" */ "./dynamic.js"
	);

	expect(value).toBe(42);
});

it("should bake the final (real content hash) chunk filename into the literal", () => {
	const files = fs.readdirSync(__STATS__.outputPath);
	const entry = files.find((f) => /^main\..+\.mjs$/.test(f));
	expect(entry).toBeDefined();
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, entry),
		"utf8"
	);
	// realContentHash renames the chunk after substitution and rewrites the
	// embedded hash — the literal must name a file that actually exists.
	const match = /"\.\/(dynamic\.[^"]+\.mjs)"\)/.exec(bundle);
	expect(match).not.toBe(null);
	expect(files).toContain(match[1]);
});
