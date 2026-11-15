const fs = require("fs");
const path = require("path");

it("should preserve an explicit prefix and default only an omitted prefix", () => {
	const manifest = JSON.parse(
		fs.readFileSync(path.join(__dirname, EXPECTED_MANIFEST), "utf-8")
	);

	expect(manifest.assets["main.js"].file).toBe(EXPECTED_FILE);
	expect(manifest.entrypoints.main.imports).toEqual(["main.js"]);
});
