const fs = require("fs");
const path = require("path");

// Built here, since the plugin rewrites any old hash this bundle spells.
const named = (letter) => path.join(__dirname, `x-${letter.repeat(8)}.txt`);

it("should move a related asset off a name before another asset takes it", () => {
	expect(fs.readFileSync(named("b"), "utf8")).toBe("text");
	expect(fs.readFileSync(named("c"), "utf8")).toBe("map");
});
