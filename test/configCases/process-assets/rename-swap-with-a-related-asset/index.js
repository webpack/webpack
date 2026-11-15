const fs = require("fs");
const path = require("path");

// Built here, since the plugin rewrites any old hash this bundle spells.
const read = (letter) =>
	fs.readFileSync(path.join(__dirname, `x-${letter.repeat(8)}.txt`), "utf8");

it("should swap the names of an asset and a related asset", () => {
	expect(read("b")).toBe("text");
	expect(read("a")).toBe("map");
});
