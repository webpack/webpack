import fs from "fs";
import path from "path";

it("should load the chunk through the baked specifier", async () => {
	const { value } = await import(/* webpackChunkName: "dynamic" */ "./dynamic");

	expect(value).toBe("dynamic");
});

it("should describe the substituted bundle in the source map", () => {
	const dir = __STATS__.outputPath;
	const code = fs.readFileSync(path.join(dir, "bundle0.mjs"), "utf8");
	const map = JSON.parse(
		fs.readFileSync(path.join(dir, "bundle0.mjs.map"), "utf8")
	);
	const specifier = code.match(
		/import\((?:\/\*[^*]*\*\/\s*)?"(\.\/dynamic\.[0-9a-f]+\.mjs)"\)/
	);

	// The name reached the bundle and the file it names reached disk.
	expect(specifier).not.toBe(null);
	expect(fs.existsSync(path.join(dir, specifier[1].slice(2)))).toBe(true);
	// A map generated before substitution would describe a longer file.
	expect(map.mappings.length).toBeGreaterThan(0);
	expect(code.split("\n").length).toBeGreaterThanOrEqual(
		map.mappings.split(";").length - 1
	);
});
