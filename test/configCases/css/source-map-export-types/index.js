import * as css from "STYLE_UNDER_TEST";

// Reference the import so it isn't tree-shaken away for value-returning
// exportTypes (text / css-style-sheet); side-effect-only imports would
// otherwise be optimized out and the CSS module would never be included
// in the JS bundle.
globalThis.__keepCssAlive = css;

const fs = __nodeFs;
const path = __nodePath;
const NodeBuffer = __NodeBuffer;

const CASES = [
	{ exportType: "link", useLess: false },
	{ exportType: "text", useLess: false },
	{ exportType: "style", useLess: false },
	{ exportType: "css-style-sheet", useLess: false },
	{ exportType: "link", useLess: true },
	{ exportType: "text", useLess: true },
	{ exportType: "style", useLess: true },
	{ exportType: "css-style-sheet", useLess: true }
];

const outputPath = __STATS__.children[__STATS_I__].outputPath;
const { exportType, useLess } = CASES[__STATS_I__];
const expectedSourceFile = useLess ? "style.less" : "style.css";
// less-loader compiles "@brand-color: rebeccapurple;" away, so the marker
// content differs depending on whether the source map carries the original
// .less text or just the .css text.
const expectedSourceMarker = useLess ? "@brand-color" : ".source-map-test-class";

const BASE64_CHARS =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

const escapeRegExp = (value) =>
	value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const decodeVlq = (str, pos) => {
	let result = 0;
	let shift = 0;
	let continuation;
	do {
		if (pos >= str.length) {
			throw new Error("Truncated VLQ");
		}
		const idx = BASE64_CHARS.indexOf(str[pos++]);
		if (idx < 0) {
			throw new Error(`Invalid base64 VLQ char ${JSON.stringify(str[pos - 1])}`);
		}
		continuation = idx & 0x20;
		result += (idx & 0x1f) << shift;
		shift += 5;
	} while (continuation);
	const sign = result & 1;
	const value = result >>> 1;
	return [sign ? -value : value, pos];
};

// Decodes every segment in `mappings`, asserting per-segment field counts
// (1, 4, or 5), and that all running counters stay non-negative and that
// every source/name index points to a real entry in `sources`/`names`.
// These are the same invariants that prevent Chrome DevTools from
// silently rejecting individual mappings.
const decodeAllMappings = (map) => {
	const mappings = map.mappings;
	const sourcesLen = map.sources.length;
	const namesLen = (map.names && map.names.length) || 0;

	let pos = 0;
	let line = 0;
	let prevCol = 0;
	let prevSrc = 0;
	let prevSrcLine = 0;
	let prevSrcCol = 0;
	let prevName = 0;
	let segments = 0;
	let segmentsWithSource = 0;
	const referencedSources = new Set();

	while (pos < mappings.length) {
		const ch = mappings[pos];
		if (ch === ";") {
			line++;
			prevCol = 0;
			pos++;
			continue;
		}
		if (ch === ",") {
			pos++;
			continue;
		}
		const fields = [];
		while (
			pos < mappings.length &&
			mappings[pos] !== "," &&
			mappings[pos] !== ";"
		) {
			const [val, next] = decodeVlq(mappings, pos);
			fields.push(val);
			pos = next;
		}
		if (fields.length !== 1 && fields.length !== 4 && fields.length !== 5) {
			throw new Error(
				`Invalid segment field count ${fields.length} at generated line ${line}`
			);
		}
		prevCol += fields[0];
		if (prevCol < 0) {
			throw new Error(`Negative generated column at line ${line}`);
		}
		if (fields.length >= 4) {
			prevSrc += fields[1];
			prevSrcLine += fields[2];
			prevSrcCol += fields[3];
			if (prevSrc < 0 || prevSrc >= sourcesLen) {
				throw new Error(
					`Source index ${prevSrc} out of range (sources: ${sourcesLen})`
				);
			}
			if (prevSrcLine < 0 || prevSrcCol < 0) {
				throw new Error(
					`Negative original line/column at generated line ${line}`
				);
			}
			referencedSources.add(prevSrc);
			segmentsWithSource++;
		}
		if (fields.length === 5) {
			prevName += fields[4];
			if (prevName < 0 || prevName >= namesLen) {
				throw new Error(
					`Name index ${prevName} out of range (names: ${namesLen})`
				);
			}
		}
		segments++;
	}
	return { segments, segmentsWithSource, referencedSources };
};

const validateMap = (map) => {
	expect(map.version).toBe(3);
	expect(Array.isArray(map.sources)).toBe(true);
	expect(map.sources.length).toBeGreaterThan(0);
	for (const source of map.sources) {
		expect(typeof source).toBe("string");
		expect(source.length).toBeGreaterThan(0);
	}
	expect(typeof map.mappings).toBe("string");
	expect(map.mappings.length).toBeGreaterThan(0);
	expect(Array.isArray(map.sourcesContent)).toBe(true);
	expect(map.sourcesContent.length).toBe(map.sources.length);
	for (const content of map.sourcesContent) {
		expect(typeof content).toBe("string");
	}
	if (map.names !== undefined) {
		expect(Array.isArray(map.names)).toBe(true);
		for (const name of map.names) {
			expect(typeof name).toBe("string");
		}
	}
	if (map.file !== undefined) {
		expect(typeof map.file).toBe("string");
	}

	const { segments, segmentsWithSource, referencedSources } =
		decodeAllMappings(map);
	expect(segments).toBeGreaterThan(0);
	expect(segmentsWithSource).toBeGreaterThan(0);
	expect(referencedSources.size).toBeGreaterThan(0);
};

const expectExpectedSourceInMap = (map) => {
	const sourceIndex = map.sources.findIndex((s) =>
		s.includes(expectedSourceFile)
	);
	expect(sourceIndex).toBeGreaterThanOrEqual(0);
	expect(map.sourcesContent[sourceIndex]).toContain(expectedSourceMarker);
};

const readExternalMap = (relativeMapFile) => {
	const mapFile = path.resolve(outputPath, relativeMapFile);
	expect(fs.existsSync(mapFile)).toBe(true);
	return JSON.parse(fs.readFileSync(mapFile, "utf-8"));
};

const expectExternalMappingURL = (relativeFile, mapFileName) => {
	const file = path.resolve(outputPath, relativeFile);
	expect(fs.existsSync(file)).toBe(true);
	const content = fs.readFileSync(file, "utf-8");
	expect(content).toMatch(
		new RegExp(`sourceMappingURL=${escapeRegExp(mapFileName)}`)
	);
};

// For text/style/css-style-sheet the CSS is embedded as a JS string literal
// with an inline `sourceMappingURL=data:application/json;base64,...` comment
// inside the CSS text itself. That comment is what DevTools uses to map
// the applied stylesheet back to its original sources.
const SOURCE_MAPPING_DATA_URI =
	/sourceMappingURL=data:application\/json(?:;charset=[^;,]+)?;base64,([A-Za-z0-9+/=]+)/;

const extractInlineCssMap = (relativeBundleFile) => {
	const bundleFile = path.resolve(outputPath, relativeBundleFile);
	expect(fs.existsSync(bundleFile)).toBe(true);
	const bundle = fs.readFileSync(bundleFile, "utf-8");
	const match = bundle.match(SOURCE_MAPPING_DATA_URI);
	expect(match).not.toBeNull();
	const decoded = NodeBuffer.from(match[1], "base64").toString("utf-8");
	return JSON.parse(decoded);
};

const label = `exportType="${exportType}"${useLess ? " through less-loader" : ""}`;

it(`should generate a valid source map for ${label}`, () => {
	if (exportType === "link") {
		const mapName = `bundle${__STATS_I__}.css.map`;
		expectExternalMappingURL(`bundle${__STATS_I__}.css`, mapName);
		const map = readExternalMap(mapName);
		validateMap(map);
		expectExpectedSourceInMap(map);
		return;
	}

	// JS bundle still gets its own external source map for the JS code.
	const jsMapName = `bundle${__STATS_I__}.js.map`;
	expectExternalMappingURL(`bundle${__STATS_I__}.js`, jsMapName);
	const jsMap = readExternalMap(jsMapName);
	validateMap(jsMap);
	// The full generated JS wrapper for the CSS module must show up in
	// the bundle's JS source map under the module's identifier — same
	// shape css-loader produces for CSS modules consumed in JS. That
	// means sourcesContent here is the emitted runtime call (e.g.
	// `__webpack_require__.r(module.exports = { "default": "…" });` for
	// `text`, `__webpack_require__.is(<id>, "…");` for `style`, or the
	// `new CSSStyleSheet(); sheet.replaceSync(cssText)` IIFE for
	// `css-style-sheet`), not the raw CSS or just its JS literal form.
	const cssModuleSourceIdx = jsMap.sources.findIndex((s) =>
		s.includes(expectedSourceFile)
	);
	expect(cssModuleSourceIdx).toBeGreaterThanOrEqual(0);
	const cssModuleSourcesContent = jsMap.sourcesContent[cssModuleSourceIdx];
	expect(cssModuleSourcesContent).toContain("__webpack_require__");
	// The bug we are guarding against was exposing only the bare JSON
	// literal (which would start with `"` and have nothing else around it);
	// the full wrapper has webpack runtime calls before the literal.
	expect(cssModuleSourcesContent.startsWith('"')).toBe(false);
	if (exportType === "text") {
		expect(cssModuleSourcesContent).toContain("module.exports");
		expect(cssModuleSourcesContent).toContain('"default":');
	} else if (exportType === "css-style-sheet") {
		expect(cssModuleSourcesContent).toContain("new CSSStyleSheet()");
		expect(cssModuleSourcesContent).toContain("replaceSync");
	}
	// CSS payload still has to be reachable from sourcesContent so DevTools
	// can search across module sources.
	expect(cssModuleSourcesContent).toContain(".source-map-test-class");

	// And the CSS embedded in the JS string literal carries an inline
	// data URI source map that DevTools can resolve.
	const cssMap = extractInlineCssMap(`bundle${__STATS_I__}.js`);
	validateMap(cssMap);
	expectExpectedSourceInMap(cssMap);
});
