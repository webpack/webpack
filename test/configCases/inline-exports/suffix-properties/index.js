import * as constants from "../basic/constants";
import * as constants1 from "./constants.js";
import * as reexported from "./reexport.js";


const fs = __non_webpack_require__("fs");
const generated = /** @type {string} */ (fs.readFileSync(__filename, "utf-8"));

it("should apply a property access on an inlined export exactly once", () => {
	// START:A
	expect(constants1.STR.length).toBe(6);
	expect(constants1.NUM.toString()).toBe("123456");
	// END:A
	const block = generated.match(/\/\/ START:A([\s\S]*?)\/\/ END:A/)[1];
	expect(block.includes("inlined export .STR")).toBe(true);
	expect(block.includes("inlined export .NUM")).toBe(true);
	// the inlined literal must carry its property access only once, never `...length.length`
	expect(block.includes(".length.length")).toBe(false);
	expect(block.includes(").toString().toString()")).toBe(false);
});

it("should render a reexported inlined export once when the source module is removed", () => {
	// START:B
	expect(reexported.STR).toBe("remove");
	expect(reexported.NUM).toBe(123456);
	// END:B
	const block = generated.match(/\/\/ START:B([\s\S]*?)\/\/ END:B/)[1];
	expect(block.includes("inlined export .STR")).toBe(true);
	expect(block.includes("inlined export .NUM")).toBe(true);
});

it("should generate correct code for inline value with properties access", () => {
	// START:A
	expect(constants.REMOVE_s.toUpperCase()).toBe("REMOVE");
	expect(constants.REMOVE_b.valueOf().toString()).toBe("true");
	expect(constants.REMOVE_i["toFixed"](1)).toBe("123456.0");
	// END:A
	const block = generated.match(/\/\/ START:A([\s\S]*)\/\/ END:A/)[1];
	expect(
		block.includes(`((/* inlined export .REMOVE_s */"remove").toUpperCase())`)
	).toBe(true);
	expect(
		block.includes(
			`((/* inlined export .REMOVE_b */true).valueOf().toString())`
		)
	).toBe(true);
	expect(
		block.includes(`((/* inlined export .REMOVE_i */123456)["toFixed"](1))`)
	).toBe(true);
});
