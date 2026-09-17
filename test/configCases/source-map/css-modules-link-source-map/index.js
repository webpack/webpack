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

	// The CSS module's generated JS export wrapper should appear in the
	// source map under the module's readable identifier.
	const cssSourceIndex = sourceMap.sources.findIndex(s =>
		/style\.module\.css$/.test(s)
	);
	expect(cssSourceIndex).toBeGreaterThanOrEqual(0);

	// The spec allows a null `sourcesContent` entry, to be fetched by URL instead;
	// this fixture requires the content embedded, so a missing or empty one fails
	// here. Whether it is the original CSS or the generated JS wrapper is not pinned.
	expect(Array.isArray(sourceMap.sourcesContent)).toBe(true);
	expect(typeof sourceMap.sourcesContent[cssSourceIndex]).toBe("string");
	expect(sourceMap.sourcesContent[cssSourceIndex].length).toBeGreaterThan(0);

	// The mapping must reference real generated JS positions, not be empty.
	expect(typeof sourceMap.mappings).toBe("string");
	expect(sourceMap.mappings.length).toBeGreaterThan(0);
});
