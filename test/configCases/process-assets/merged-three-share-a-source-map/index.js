const fs = require("fs");

it("should let the source maps of three assets that came out the same share a name", () => {
	const files = fs.readdirSync(__dirname).filter((name) => name.endsWith(".js.map"));
	expect(files).toEqual([`${"d".repeat(8)}.js.map`]);
});
