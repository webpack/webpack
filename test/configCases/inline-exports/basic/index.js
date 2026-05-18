import * as constants from "./constants.js";
import * as reexported from "./re-export.js";
import * as destructing from "./constants.destructing.js";
import * as sideEffects from "./constants.side-effects.js";
import * as reexportedSideEffects from "./re-export.side-effects.js";
import * as reexportedBarrelSideEffects from "./re-export.barrel-side-effects.js";
import * as reexportedDestructingBarrelSideEffects from "./re-export.destructing-barrel-side-effects.js";
import * as constantsCjs from "./constants.cjs";
import * as constantsNoInline from "./constants.no-inline.js";

const fs = require("fs");
const generated = fs.readFileSync(__filename, "utf-8");

it("should inline constants", () => {
	// START:A
	expect(constants.REMOVE_n).toBe(null);
	expect(constants.REMOVE_u).toBe(undefined);
	expect(constants.REMOVE_b).toBe(true);
	expect(constants.REMOVE_i).toBe(123456);
	expect(constants.REMOVE_f).toBe(123.45);
	expect(constants.REMOVE_s).toBe("remove");
	expect(constants.REMOVE_m).toBe(13);
	// END:A
	const block = generated.match(/\/\/ START:A([\s\S]*)\/\/ END:A/)[1];
	expect(block).toContain("(/* inlined export .REMOVE_n */null)");
	expect(block).toContain("(/* inlined export .REMOVE_u */undefined)");
	expect(block).toContain("(/* inlined export .REMOVE_b */true)");
	expect(block).toContain("(/* inlined export .REMOVE_i */123456)");
	expect(block).toContain("(/* inlined export .REMOVE_f */123.45)");
	expect(block).toContain('(/* inlined export .REMOVE_s */"remove")');
	expect(block).toContain("(/* inlined export .REMOVE_m */13)");
});

it("should inline constants with re-export", () => {
	// START:B
	expect(reexported.REMOVE_n).toBe(null);
	expect(reexported.REMOVE_u).toBe(undefined);
	expect(reexported.REMOVE_b).toBe(true);
	expect(reexported.REMOVE_i).toBe(123456);
	expect(reexported.REMOVE_f).toBe(123.45);
	expect(reexported.REMOVE_s).toBe("remove");
	// END:B
	const block = generated.match(/\/\/ START:B([\s\S]*)\/\/ END:B/)[1];
	expect(block).toContain("(/* inlined export .REMOVE_n */null)");
	expect(block).toContain("(/* inlined export .REMOVE_u */undefined)");
	expect(block).toContain("(/* inlined export .REMOVE_b */true)");
	expect(block).toContain("(/* inlined export .REMOVE_i */123456)");
	expect(block).toContain("(/* inlined export .REMOVE_f */123.45)");
	expect(block).toContain('(/* inlined export .REMOVE_s */"remove")');
});

it("should not inline constants with destructing", () => {
	// START:C
	const { REMOVE_n, REMOVE_u, REMOVE_b } = destructing;
	expect(REMOVE_n).toBe(null);
	expect(REMOVE_u).toBe(undefined);
	expect(REMOVE_b).toBe(true);
	// END:C
	const block = generated.match(/\/\/ START:C([\s\S]*)\/\/ END:C/)[1];
	expect(block).not.toContain("inlined export");
});

it("should allow inline constants if the rest exports is not used with destructing", () => {
	// START:D
	expect(destructing.REMOVE_i).toBe(123456);
	expect(destructing.REMOVE_f).toBe(123.45);
	expect(destructing.REMOVE_s).toBe("remove");
	// END:D
	const block = generated.match(/\/\/ START:D([\s\S]*)\/\/ END:D/)[1];
	expect(block).toContain("(/* inlined export .REMOVE_i */123456)");
	expect(block).toContain("(/* inlined export .REMOVE_f */123.45)");
	expect(block).toContain('(/* inlined export .REMOVE_s */"remove")');
});

it("should respect side effects when inline constants", () => {
	// START:E
	expect(sideEffects.REMOVE_CONST).toBe(true);
	expect(globalThis.__sideEffects).toBe("constants.side-effects.js");
	// END:E
	const block = generated.match(/\/\/ START:E([\s\S]*)\/\/ END:E/)[1];
	expect(block).toContain("(/* inlined export .REMOVE_CONST */true)");
});

it("should reach the side effect on the re-export barrel", () => {
	// START:G
	expect(reexportedBarrelSideEffects.REMOVE_s).toBe("remove");
	// END:G
	expect(globalThis.__barrelSideEffects).toBe("re-export.barrel-side-effects.js");
});

it("should not inline destructing with re-export", () => {
	// START:H
	const { REMOVE_n, REMOVE_u, REMOVE_b } = reexportedDestructingBarrelSideEffects.m;
	expect(REMOVE_n).toBe(null);
	expect(REMOVE_u).toBe(undefined);
	expect(REMOVE_b).toBe(true);
	expect(reexportedDestructingBarrelSideEffects.m.REMOVE_i).toBe(123456);
	expect(reexportedDestructingBarrelSideEffects.m.REMOVE_f).toBe(123.45);
	expect(reexportedDestructingBarrelSideEffects.m.REMOVE_s).toBe("remove");
	// END:H
	expect(globalThis.__destructingBarrelSideEffects).toBe(
		"re-export.destructing-barrel-side-effects.js"
	);
});

/**
 * Whether the bundle contains a module entry for the given path.
 * ESM modules inside a concat block are marked with `;// <path>`,
 * everything else (externals, CJS, non-concat) uses `/***\/ "<path>"`.
 * @param {string} m module path
 * @returns {boolean} true when the bundle contains the module
 */
const hasModule = (m) =>
	generated.includes(`/***/ "${m}"`) || generated.includes(`;// ${m}`);

it("should not inline for cjs", () => {
	expect(constantsCjs.REMOVE_CONST).toBe(true);
	expect(hasModule("./constants.cjs")).toBe(true);
});

it("should remove the module if all exports are inlined and side effects free", () => {
	for (const m of ["./constants.js", "./re-export.js"]) {
		expect(hasModule(m)).toBe(false);
	}
});

it("should keep the module if all exports are inlined but have side effects", () => {
	for (const m of [
		"./constants.side-effects.js",
		"./re-export.side-effects.js"
	]) {
		expect(hasModule(m)).toBe(true);
	}
});

it("should keep the module if part of the exports is inlined and side effects free", () => {
	expect(hasModule("./constants.destructing.js")).toBe(true);
});

it("should not inline non-inlinable constants", () => {
	expect(constantsNoInline.INLINE_1).toEqual({});
});
