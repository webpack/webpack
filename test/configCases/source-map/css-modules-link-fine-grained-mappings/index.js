import * as styles from "./style.module.css";

it("should map each generated CSS-module export line back to its selector in the original CSS", () => {
	const fs = require("fs");
	const path = require("path");
	const { SourceMapConsumer } = require("source-map");

	expect(typeof styles.btn).toBe("string");
	expect(typeof styles.card).toBe("string");
	expect(typeof styles.alert).toBe("string");

	const bundlePath = path.join(__dirname, "bundle0.js");
	const mapPath = path.join(__dirname, "bundle0.js.map");
	const bundleSource = fs.readFileSync(bundlePath, "utf-8");
	const sourceMap = JSON.parse(fs.readFileSync(mapPath, "utf-8"));

	expect(sourceMap.sources).toEqual(
		expect.arrayContaining([expect.stringMatching(/style\.module\.css$/)])
	);

	const cssIndex = sourceMap.sources.findIndex(s =>
		/style\.module\.css$/.test(s)
	);
	expect(cssIndex).toBeGreaterThanOrEqual(0);

	// The CSS source content should be embedded — i.e. the original CSS, not the generated JS wrapper.
	const cssContent = sourceMap.sourcesContent[cssIndex];
	expect(cssContent).toMatch(/\.btn\s*\{/);
	expect(cssContent).toMatch(/\.card\s*\{/);
	expect(cssContent).toMatch(/\.alert\s*\{/);

	const cssLines = cssContent.split("\n");
	const findCssLine = selector => {
		for (let i = 0; i < cssLines.length; i++) {
			if (cssLines[i].includes(selector)) return i + 1; // 1-based for source-map consumer
		}
		throw new Error(`selector ${selector} not found in CSS`);
	};

	const bundleLines = bundleSource.split("\n");
	const findBundleLine = needle => {
		for (let i = 0; i < bundleLines.length; i++) {
			if (bundleLines[i].includes(needle)) return i + 1;
		}
		throw new Error(`needle ${needle} not found in bundle`);
	};

	const consumer = new SourceMapConsumer(sourceMap);
	try {
		const expectations = [
			{ exportName: "btn", selector: ".btn" },
			{ exportName: "card", selector: ".card" },
			{ exportName: "alert", selector: ".alert" }
		];
		for (const { exportName, selector } of expectations) {
			const generatedLine = findBundleLine(`"${exportName}":`);
			const original = consumer.originalPositionFor({
				line: generatedLine,
				column: 0
			});
			expect(original.source).toBeDefined();
			expect(original.source).toMatch(/style\.module\.css$/);
			const expectedLine = findCssLine(selector);
			expect(original.line).toBe(expectedLine);
		}
	} finally {
		consumer.destroy && consumer.destroy();
	}
});
