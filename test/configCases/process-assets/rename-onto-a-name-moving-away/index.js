const fs = require("fs");
const path = require("path");

// Built here, since the plugin rewrites any old hash this bundle spells.
const named = (letter) => path.join(__dirname, `${letter.repeat(8)}.txt`);

it("should keep every asset when one takes the name another moves away from", () => {
	expect(fs.readFileSync(named("b"), "utf8")).toBe("first");
	expect(fs.readFileSync(named("c"), "utf8")).toBe("second");
	expect(fs.existsSync(named("a"))).toBe(false);
});
