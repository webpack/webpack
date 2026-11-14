const fs = require("fs");
const path = require("path");

// Built here, since the plugin rewrites any old hash this bundle spells.
const named = (letter) => path.join(__dirname, `${letter.repeat(8)}.txt`);

it("should keep one asset and report the other instead of writing over it", () => {
	expect(fs.readFileSync(named("c"), "utf8")).toBe("first");
	expect(fs.readFileSync(named("b"), "utf8")).toBe("second");
});
