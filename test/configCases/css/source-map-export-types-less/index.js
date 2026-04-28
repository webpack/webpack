import * as css from "./style.less";

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

const expectLessSourceInMap = (map) => {
	const sourceIndex = map.sources.findIndex((s) => s.includes("style.less"));
	expect(sourceIndex).toBeGreaterThanOrEqual(0);
	expect(typeof map.sourcesContent[sourceIndex]).toBe("string");
	// The original .less source (not its compiled CSS) must be embedded so that
	// devtools can map back through less-loader to the .less file.
	expect(map.sourcesContent[sourceIndex]).toContain("@brand-color");
	expect(map.sourcesContent[sourceIndex]).toContain(".source-map-test-class");
};

const exportType = EXPORT_TYPES[__STATS_I__];

it(`should generate a valid source map for exportType "${exportType}" through less-loader`, () => {
	if (exportType === "link") {
		const map = readMap(`bundle${__STATS_I__}.css.map`);
		expectLessSourceInMap(map);
	} else {
		const map = readMap(`bundle${__STATS_I__}.js.map`);
		expectLessSourceInMap(map);
	}
});
