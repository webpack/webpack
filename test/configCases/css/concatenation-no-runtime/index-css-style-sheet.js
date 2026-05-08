import sheet from "./sheet-only.sheet.css";

const STATS = __STATS__.children[__STATS_I__];

it("should concatenate a css-style-sheet-export css module", () => {
	expect(sheet).toBeInstanceOf(CSSStyleSheet);
	expect(sheet._cssText).toContain(".sheet-only");
	// @charset prepended at byte 0.
	expect(sheet._cssText.match(/@charset/g)).toEqual(["@charset"]);
	expect(sheet._cssText.startsWith('@charset "UTF-8";\n')).toBe(true);
});

it("should fold the css-style-sheet module into a single concatenated module", () => {
	const concatModules = STATS.modules.filter((m) => m.modules);
	expect(concatModules.length).toBe(1);
	// index-css-style-sheet.js + sheet-only = 2
	expect(concatModules[0].modules.length).toBeGreaterThanOrEqual(2);
});

it("should not include the require runtime in the css-style-sheet bundle", () => {
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const source = fs.readFileSync(
		path.join(STATS.outputPath, `bundle${__STATS_I__}.js`),
		"utf-8"
	);

	// The webpack require runtime template defines a private cache
	// variable; checking for that name detects whether the runtime was
	// pulled in. Assembled at runtime so the literal in this file's
	// source doesn't match itself once inlined into the bundle.
	const marker = `__webpack_${"module"}_cache__`;
	expect(source).not.toContain(marker);
});
