const mod = require("./mod.js");
const other = require("./other.js");
const third = require("./third.js");

it("does not reuse a numbered id reserved for another module", () => {
	// `third` is pinned to `./mod.js` (forcing `mod` onto a numbered id) and
	// `other` is pinned to `./mod.js0`; `mod` must skip the already-used
	// `./mod.js0` instead of colliding onto it.
	expect(mod).toBe("mod-value");
	expect(other).toBe("other-value");
	expect(third).toBe("third-value");
});
