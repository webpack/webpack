import * as constants from "./constants.js";
import * as reexported from "./re-export.js";
import * as destructing from "./constants.destructing.js";
import * as sideEffects from "./constants.side-effects.js";
import * as reexportedSideEffects from "./re-export.side-effects.js";
import * as reexportedBarrelSideEffects from "./re-export.barrel-side-effects.js";
import * as reexportedDestructingBarrelSideEffects from "./re-export.destructing-barrel-side-effects.js";
import * as constantsCjs from "./constants.cjs";
import * as constantsNoInline from "./constants.no-inline.js";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");
const generated = /** @type {string} */ (fs.readFileSync(__filename, "utf-8"));

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
	expect(
		block.includes(`((/* inlined export .REMOVE_n */null)).toBe(null)`)
	).toBe(true);
	expect(
		block.includes(
			`((/* inlined export .REMOVE_u */undefined)).toBe(undefined)`
		)
	).toBe(true);
	expect(
		block.includes(`((/* inlined export .REMOVE_b */true)).toBe(true)`)
	).toBe(true);
	expect(
		block.includes(`((/* inlined export .REMOVE_i */123456)).toBe(123456)`)
	).toBe(true);
	expect(
		block.includes(`((/* inlined export .REMOVE_f */123.45)).toBe(123.45)`)
	).toBe(true);
	expect(
		block.includes(`((/* inlined export .REMOVE_s */"remove")).toBe("remove")`)
	).toBe(true);
	expect(block.includes(`((/* inlined export .REMOVE_m */13)).toBe(13)`)).toBe(
		true
	);
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
	expect(
		block.includes(`((/* inlined export .REMOVE_n */null)).toBe(null)`)
	).toBe(true);
	expect(
		block.includes(
			`((/* inlined export .REMOVE_u */undefined)).toBe(undefined)`
		)
	).toBe(true);
	expect(
		block.includes(`((/* inlined export .REMOVE_b */true)).toBe(true)`)
	).toBe(true);
	expect(
		block.includes(`((/* inlined export .REMOVE_i */123456)).toBe(123456)`)
	).toBe(true);
	expect(
		block.includes(`((/* inlined export .REMOVE_f */123.45)).toBe(123.45)`)
	).toBe(true);
	expect(
		block.includes(`((/* inlined export .REMOVE_s */"remove")).toBe("remove")`)
	).toBe(true);
});

it("should not inline constants with destructing", () => {
	// START:C
	const { REMOVE_n, REMOVE_u, REMOVE_b } = destructing;
	expect(REMOVE_n).toBe(null);
	expect(REMOVE_u).toBe(undefined);
	expect(REMOVE_b).toBe(true);
	// END:C
	const block = generated.match(/\/\/ START:C([\s\S]*)\/\/ END:C/)[1];
	expect(block.includes(`(REMOVE_n).toBe(null)`)).toBe(true);
	expect(block.includes(`(REMOVE_u).toBe(undefined)`)).toBe(true);
	expect(block.includes(`(REMOVE_b).toBe(true)`)).toBe(true);
	expect(block.includes("inlined export")).toBe(false);
});

it("should allow inline constants if the rest exports is not used with destructing", () => {
	// START:D
	expect(destructing.REMOVE_i).toBe(123456);
	expect(destructing.REMOVE_f).toBe(123.45);
	expect(destructing.REMOVE_s).toBe("remove");
	// END:D
	const block = generated.match(/\/\/ START:D([\s\S]*)\/\/ END:D/)[1];
	expect(
		block.includes(`((/* inlined export .REMOVE_i */123456)).toBe(123456)`)
	).toBe(true);
	expect(
		block.includes(`((/* inlined export .REMOVE_f */123.45)).toBe(123.45)`)
	).toBe(true);
	expect(
		block.includes(`((/* inlined export .REMOVE_s */"remove")).toBe("remove")`)
	).toBe(true);
});

it("should respect side effects when inline constants", () => {
	// START:E
	expect(sideEffects.REMOVE_CONST).toBe(true);
	expect(globalThis.__sideEffects).toBe("constants.side-effects.js");
	// END:E
	const block = generated.match(/\/\/ START:E([\s\S]*)\/\/ END:E/)[1];
	expect(
		block.includes(`((/* inlined export .REMOVE_CONST */true)).toBe(true)`)
	).toBe(true);
});

it("should not inline and link to re-export module when have side effects", () => {
	// START:F
	expect(reexportedSideEffects.REMOVE_CONST).toBe(true);
	// END:F
	const block = generated.match(/\/\/ START:F([\s\S]*)\/\/ END:F/)[1];
	if (CONCATENATED) {
		expect(block.includes(`inlined export`)).toBe(true);
	} else {
		expect(block.includes(`inlined export`)).toBe(false);
	}
});

it("should not inline and link to re-export module when have barrel side effects", () => {
	// START:G
	expect(reexportedBarrelSideEffects.REMOVE_s).toBe("remove");
	// END:G
	expect(globalThis.__barrelSideEffects).toBe(
		"re-export.barrel-side-effects.js"
	);
	const block = generated.match(/\/\/ START:G([\s\S]*)\/\/ END:G/)[1];
	if (CONCATENATED) {
		expect(block.includes(`inlined export`)).toBe(true);
	} else {
		const code = generated.match(
			/"\.\/re-export\.barrel-side-effects\.js"\n\(.*{([\s\S]*?)},/
		)[1];
		expect(code.includes(`__webpack_require__("./constants.js")`)).toBe(false);
		expect(block.includes(`inlined export`)).toBe(false);
	}
});

it("should not inline destructing with re-export", () => {
	// START:H
	const { REMOVE_n, REMOVE_u, REMOVE_b } =
		reexportedDestructingBarrelSideEffects.m;
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
	const block = generated.match(/\/\/ START:H([\s\S]*)\/\/ END:H/)[1];
	expect(block.includes(`(REMOVE_n).toBe(null)`)).toBe(true);
	expect(block.includes(`(REMOVE_u).toBe(undefined)`)).toBe(true);
	expect(block.includes(`(REMOVE_b).toBe(true)`)).toBe(true);
	expect(block.includes(`.REMOVE_i */123456)).toBe(123456)`)).toBe(true);
	expect(block.includes(`.REMOVE_f */123.45)).toBe(123.45)`)).toBe(true);
	expect(block.includes(`.REMOVE_s */"remove")).toBe("remove")`)).toBe(true);
});

it("should not inline for cjs", () => {
	expect(constantsCjs.REMOVE_CONST).toBe(true);
	const cjsModuleIds = ["./constants.cjs"];
	cjsModuleIds.forEach((m) => {
		expect(generated.includes(`"${m}"\n(`)).toBe(true);
	});
});

it("should remove the module if all exports is inlined and side effects free", () => {
	const inlinedSideEffectsFreeModuleIds = ["./constants.js", "./re-export.js"];
	if (CONCATENATED) {
		inlinedSideEffectsFreeModuleIds.forEach((m) => {
			expect(generated.includes(`;// ${m}`)).toBe(false);
		});
	} else {
		inlinedSideEffectsFreeModuleIds.forEach((m) => {
			expect(generated.includes(`"${m}"\n(`)).toBe(false);
		});
	}
});

it("should keep the module if all exports is inlined but have side effects", () => {
	const inlinedSideEffectsNotFreeModuleIds = [
		"./constants.side-effects.js",
		"./re-export.side-effects.js"
	];
	if (CONCATENATED) {
		inlinedSideEffectsNotFreeModuleIds.forEach((m) => {
			expect(generated.includes(`;// ${m}`)).toBe(true);
		});
	} else {
		inlinedSideEffectsNotFreeModuleIds.forEach((m) => {
			expect(generated.includes(`"${m}"\n(`)).toBe(true);
		});
	}
});

it("should keep the module if part of the exports is inlined and side effects free", () => {
	const partialInlinedSideEffectsFreeModuleIds = ["./constants.destructing.js"];
	if (CONCATENATED) {
		partialInlinedSideEffectsFreeModuleIds.forEach((m) => {
			expect(generated.includes(`;// ${m}`)).toBe(true);
		});
	} else {
		partialInlinedSideEffectsFreeModuleIds.forEach((m) => {
			expect(generated.includes(`"${m}"\n(`)).toBe(true);
		});
	}
});

it("should not inline no-inlinable constants", () => {
	expect(constantsNoInline.INLINE_1).toEqual({});
});
