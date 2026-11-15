import { readReexport, value } from "./module";

// Exports are analyzed in post-order from `index.js`, the first module by name,
// which puts the CommonJS re-export before the ES module it re-exports.
it("concatenates an ES module that a CommonJS module in its cycle re-exports", () => {
	expect(value).toBe(1);
	expect(readReexport()).toBe("1:true");
});
