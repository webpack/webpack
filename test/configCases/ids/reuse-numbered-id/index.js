const mod = require("./mod.js");
const other = require("./other.js");

it("does not reuse a numbered id reserved for another module", () => {
	// The config pins `other` to `./mod.js0` and reserves the base name
	// `./mod.js`, forcing `mod` onto a numbered id. `mod` must skip the
	// already-used `./mod.js0` instead of colliding onto it.
	expect(mod).toBe("mod-value");
	expect(other).toBe("other-value");
});
