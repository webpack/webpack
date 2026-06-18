"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle(i, options) {
		const outputPath = options.output.path;
		const files = fs.readdirSync(outputPath);
		const cssFiles = files.filter((f) => f.endsWith(".css"));
		// Each config produces 3 CSS files (style.css entry + named.css
		// entry + link chunk). Both configs share the output directory,
		// so link chunk filenames may collide.
		const expectedMin = (i + 1) * 3 - i;
		if (cssFiles.length < expectedMin) {
			throw new Error(
				`Expected at least ${expectedMin} CSS files after config ${i}, got ${cssFiles.length}: ${cssFiles.join(", ")}`
			);
		}
		const allCss = cssFiles
			.map((f) => fs.readFileSync(path.join(outputPath, f), "utf8"))
			.join("\n");
		if (!allCss.includes(".hello")) {
			throw new Error("CSS files missing .hello class from style.css");
		}
		if (!allCss.includes(".imported")) {
			throw new Error(
				"CSS files missing .imported class from @import in style.css"
			);
		}
		if (!allCss.includes(".named")) {
			throw new Error("CSS files missing .named class from named.css");
		}
		return [`bundle${i}.js`];
	}
};
