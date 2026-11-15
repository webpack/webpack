const fs = require("fs");
const path = require("path");

it("should make file URL sources relative and decode their paths", () => {
	const mapFile = fs.readdirSync(__dirname).find(file => file.endsWith(".map"));
	const map = JSON.parse(fs.readFileSync(path.join(__dirname, mapFile), "utf8"));
	expect(map.sources).toContain("webpack:///./entry file.js");
});

it("should emit identical hashes and assets from different directories", () => {
	const [first, second] = __STATS__.children;
	expect(first.hash).toBe(second.hash);
	const firstDirectory = path.join(__dirname, "..", "a");
	const secondDirectory = path.join(__dirname, "..", "b");
	const files = fs.readdirSync(firstDirectory).sort();
	expect(files).toEqual(fs.readdirSync(secondDirectory).sort());
	for (const file of files) {
		expect(fs.readFileSync(path.join(firstDirectory, file), "utf8")).toBe(
			fs.readFileSync(path.join(secondDirectory, file), "utf8")
		);
	}
});
