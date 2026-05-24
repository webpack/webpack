import * as constants from "../basic/constants";

const generated = /** @type {string} */ (
	__non_webpack_require__("fs").readFileSync(__filename, "utf-8")
);

it("should generate correct code for inline value with properties access", () => {
	// START:A
	expect(constants.REMOVE_s.toUpperCase()).toBe("REMOVE");
	expect(constants.REMOVE_b.valueOf().toString()).toBe("true");
	expect(constants.REMOVE_i["toFixed"](1)).toBe("123456.0");
	// END:A
	const block = generated.match(/\/\/ START:A([\s\S]*)\/\/ END:A/)[1];
	expect(
		block.includes(
			`((/* inlined export .REMOVE_s */"remove").toUpperCase())`
		)
	).toBe(true);
	expect(
		block.includes(
			`((/* inlined export .REMOVE_b */true).valueOf().toString())`
		)
	).toBe(true);
	expect(
		block.includes(
			`((/* inlined export .REMOVE_i */123456)["toFixed"](1))`
		)
	).toBe(true);
});
