const fs = require("fs");

it("should let the source maps of assets that came out the same share a name", () => {
	const files = fs.readdirSync(__dirname).sort();
	const c = "c".repeat(8);
	expect(files.filter((name) => name.endsWith(".js.map"))).toEqual([`${c}.js.map`]);
	expect(files.some((name) => name.startsWith("a".repeat(8)))).toBe(false);
});
