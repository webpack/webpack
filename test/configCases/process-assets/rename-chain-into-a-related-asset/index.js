const fs = require("fs");
const path = require("path");

// Built here, since the plugin rewrites any old hash this bundle spells.
const read = (letter) =>
	fs.readFileSync(path.join(__dirname, `x-${letter.repeat(8)}.txt`), "utf8");

it("should move a chain of renames that ends at a related asset", () => {
	expect(read("b")).toBe("first");
	expect(read("c")).toBe("second");
	expect(read("d")).toBe("map");
});
