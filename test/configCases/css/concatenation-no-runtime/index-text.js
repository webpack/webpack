import root from "./text-root.text.css";
import leaf from "./text-leaf.text.css";

const STATS = __STATS__.children[__STATS_I__];

it("should concatenate text-export css modules", () => {
	expect(typeof root).toBe("string");
	expect(typeof leaf).toBe("string");

	// Single @charset at byte 0 even after concatenating a chain.
	expect(root.match(/@charset/g)).toEqual(["@charset"]);
	expect(root.startsWith('@charset "UTF-8";\n')).toBe(true);
	expect(root).toContain(".text-leaf");
	expect(root).toContain(".text-root");

	expect(leaf.match(/@charset/g)).toEqual(["@charset"]);
});

it("should fold every text module into a single concatenated module", () => {
	const concatModules = STATS.modules.filter((m) => m.modules);
	expect(concatModules.length).toBe(1);
	// index-text.js + text-root + text-leaf = 3
	expect(concatModules[0].modules.length).toBeGreaterThanOrEqual(3);
});

it("should not include the require runtime in the text-export bundle", () => {
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
