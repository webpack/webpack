import * as styles from "./style.module.css";

it("should map link-type CSS module class exports in the JS source map", () => {
	const fs = require("fs");
	const path = require("path");

	expect(typeof styles.btn).toBe("string");
	expect(typeof styles.card).toBe("string");

	const sourceMap = JSON.parse(
		fs.readFileSync(path.join(__dirname, "bundle0.js.map"), "utf-8")
	);

	expect(sourceMap).toHaveProperty("version", 3);
	expect(Array.isArray(sourceMap.sources)).toBe(true);

	// The CSS module's generated JS (`module.exports = { btn: "...", card: "..." }`)
	// should be wrapped as an OriginalSource and appear in the source map under
	// the module's readable identifier.
	const cssSource = sourceMap.sources.find(s =>
		/style\.module\.css$/.test(s)
	);
	expect(cssSource).toBeDefined();

	// The mapping must reference real generated JS positions, not be empty.
	expect(typeof sourceMap.mappings).toBe("string");
	expect(sourceMap.mappings.length).toBeGreaterThan(0);
});
