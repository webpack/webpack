const fs = require("fs");
const path = require("path");

it("should not let a group replace a file that took a name the group left", () => {
	const maps = fs
		.readdirSync(__dirname)
		.filter((name) => name.endsWith(".map"))
		.map((name) => fs.readFileSync(path.join(__dirname, name), "utf8"));
	expect(maps).toContain("map x");
	expect(maps).toContain("map n");
});
