import * as css from "./style.css";

// Reference the import so it isn't tree-shaken away for value-returning
// exportTypes (text / css-style-sheet); side-effect-only imports would
// otherwise be optimized out and the CSS module would never be included
// in the JS bundle's source map.
globalThis.__keepCssAlive = css;

const fs = __nodeFs;
const path = __nodePath;

const EXPORT_TYPES = ["link", "text", "style", "css-style-sheet"];

const outputPath = __STATS__.children[__STATS_I__].outputPath;

// VLQ base64 chars + segment / line separators.
const VALID_MAPPING_CHARS = /^[A-Za-z0-9+/,;]*$/;

const readMap = (relativeMapFile) => {
	const mapFile = path.resolve(outputPath, relativeMapFile);
	expect(fs.existsSync(mapFile)).toBe(true);
	const map = JSON.parse(fs.readFileSync(mapFile, "utf-8"));
	expect(map.version).toBe(3);
	expect(Array.isArray(map.sources)).toBe(true);
	expect(map.sources.length).toBeGreaterThan(0);
	expect(typeof map.mappings).toBe("string");
	expect(map.mappings.length).toBeGreaterThan(0);
	expect(VALID_MAPPING_CHARS.test(map.mappings)).toBe(true);
	expect(Array.isArray(map.sourcesContent)).toBe(true);
	expect(map.sourcesContent.length).toBe(map.sources.length);
	return map;
};

const expectCssSourceInMap = (map, sourceFileName, expectedContent) => {
	const sourceIndex = map.sources.findIndex((s) => s.includes(sourceFileName));
	expect(sourceIndex).toBeGreaterThanOrEqual(0);
	expect(typeof map.sourcesContent[sourceIndex]).toBe("string");
	expect(map.sourcesContent[sourceIndex]).toContain(expectedContent);
};

const exportType = EXPORT_TYPES[__STATS_I__];

it(`should generate a valid source map for exportType "${exportType}"`, () => {
	if (exportType === "link") {
		// CSS is emitted as a separate file with its own .css.map sidecar.
		const map = readMap(`bundle${__STATS_I__}.css.map`);
		expectCssSourceInMap(map, "style.css", ".source-map-test-class");
	} else {
		// CSS content is embedded into the JS source map (text / style / css-style-sheet).
		const map = readMap(`bundle${__STATS_I__}.js.map`);
		expectCssSourceInMap(map, "style.css", ".source-map-test-class");
	}
});
