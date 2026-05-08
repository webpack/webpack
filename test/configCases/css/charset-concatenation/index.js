import root from "./root.text.css";
import middle from "./middle.text.css";

it("should concatenate text exportType modules with @charset chain", () => {
	expect(typeof root).toBe("string");
	expect(typeof middle).toBe("string");

	expect(root.match(/@charset/g)).toEqual(["@charset"]);
	expect(root.startsWith('@charset "UTF-8";\n')).toBe(true);
	expect(root).toContain(".leaf");
	expect(root).toContain(".middle");
	expect(root).toContain(".root");

	expect(middle.match(/@charset/g)).toEqual(["@charset"]);
	expect(middle.startsWith('@charset "UTF-8";\n')).toBe(true);
});

it("should concatenate every text-export css module into the entry scope", () => {
	const concatModules = __STATS__.modules.filter((m) => m.modules);
	expect(concatModules.length).toBe(1);
	// index.js + root + middle + leaf = 4
	expect(concatModules[0].modules.length).toBeGreaterThanOrEqual(4);
});

it("should not include the __webpack_require__ runtime when fully concatenated", () => {
	const fs = __non_webpack_require__("fs");
	const source = fs.readFileSync(`${__dirname}/bundle0.js`, "utf-8");

	expect(source).not.toMatch(/function __webpack_require__\b/);
});
