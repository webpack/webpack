import "./style-root.style.css";

const STATS = __STATS__.children[__STATS_I__];

it("should fold every style-export module into a single concatenated module", () => {
	const concatModules = STATS.modules.filter((m) => m.modules);
	expect(concatModules.length).toBe(1);
	// index-style.js + style-root + style-leaf = 3
	expect(concatModules[0].modules.length).toBeGreaterThanOrEqual(3);
});

it("should not include the require runtime in the style bundle", () => {
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const source = fs.readFileSync(
		path.join(STATS.outputPath, `bundle${__STATS_I__}.js`),
		"utf-8"
	);

	// The webpack require runtime template defines a private cache variable, so that
	// name detects whether the runtime was pulled in. Assembled at runtime so this
	// file's own source does not match itself once inlined.
	const marker = `__webpack_${"module"}_cache__`;
	expect(source).not.toContain(marker);
});
