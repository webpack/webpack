import styles from "./styles.module.css";

export { styles };

/**
 * Default import re-exported without member access: only `default` is marked
 * used on the CSS module, so strict per-export filtering can emit `{}`.
 */
it("should not emit an empty module.exports for default-only re-export", () => {
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const js = fs.readFileSync(
		path.join(__dirname, `bundle${__STATS_I__}.js`),
		"utf-8"
	);

	const marker = "css ./styles.module.css";
	const start = js.indexOf(marker);
	expect(start).not.toBe(-1);
	const slice = js.slice(start);
	const match = slice.match(/module\.exports = \{([\s\S]*?)\};/);
	expect(match).not.toBeNull();
	expect(match[0]).not.toBe("module.exports = {\n\n};");
	expect(match[0]).toMatch(/"used":/);
	expect(match[0]).toMatch(/"usedVar":/);
});
