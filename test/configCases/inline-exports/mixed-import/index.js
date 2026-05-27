import * as esm from "./shared";
import * as reexported from "./reexport";

const fs = __non_webpack_require__("fs");
const generated = /** @type {string} */ (fs.readFileSync(__filename, "utf-8"));

it("should not inline when the module is also required via cjs", () => {
	const cjs = require("./shared");
	// START:A
	expect(esm.VALUE).toBe(42);
	// END:A
	expect(cjs.VALUE).toBe(42);
	const block = generated.match(/\/\/ START:A([\s\S]*)\/\/ END:A/)[1];
	expect(block.includes("inlined export")).toBe(false);
});

it("should not inline when the module is also dynamically imported", async () => {
	const dyn = await import("./shared");
	expect(dyn.NAME).toBe("shared");
	// START:B
	expect(esm.NAME).toBe("shared");
	// END:B
	const block = generated.match(/\/\/ START:B([\s\S]*)\/\/ END:B/)[1];
	expect(block.includes("inlined export")).toBe(false);
});

it("should not inline a re-export of a module consumed via cjs and dynamic import", () => {
	// START:C
	expect(reexported.VALUE).toBe(42);
	// END:C
	const block = generated.match(/\/\/ START:C([\s\S]*)\/\/ END:C/)[1];
	expect(block.includes("inlined export")).toBe(false);
});

it("should keep the module since exports are not inlined", () => {
	expect(generated.includes(`"./shared.js"\n(`)).toBe(true);
});
