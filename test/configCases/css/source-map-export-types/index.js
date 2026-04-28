import * as css from "STYLE_UNDER_TEST";

// Reference the import so it isn't tree-shaken away for value-returning
// exportTypes (text / css-style-sheet); side-effect-only imports would
// otherwise be optimized out and the CSS module would never be included
// in the JS bundle's source map.
globalThis.__keepCssAlive = css;

const fs = __nodeFs;
const path = __nodePath;
const NodeSourceMap = __NodeSourceMap;

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
// This is the same set of invariants that prevent Chrome DevTools from
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

const readMap = (relativeMapFile) => {
	const mapFile = path.resolve(outputPath, relativeMapFile);
	expect(fs.existsSync(mapFile)).toBe(true);
	const raw = fs.readFileSync(mapFile, "utf-8");
	const map = JSON.parse(raw);

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
		// Every source must carry inline content so DevTools can show the
		// original text without needing to re-fetch from disk.
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

	// Hand it to Node's built-in source map consumer (the same machinery
	// used by V8 / DevTools for stack-trace decoding) and confirm it can
	// resolve a real entry — this catches structurally invalid maps that
	// Chrome DevTools would silently fail on.
	const consumer = new NodeSourceMap(map);
	const firstEntry = consumer.findEntry(0, 0);
	expect(firstEntry).toBeDefined();

	const { segments, segmentsWithSource, referencedSources } =
		decodeAllMappings(map);
	expect(segments).toBeGreaterThan(0);
	expect(segmentsWithSource).toBeGreaterThan(0);
	expect(referencedSources.size).toBeGreaterThan(0);

	return map;
};

const expectSourceMappingComment = (relativeBundleFile, mapFileName) => {
	const bundleFile = path.resolve(outputPath, relativeBundleFile);
	expect(fs.existsSync(bundleFile)).toBe(true);
	const content = fs.readFileSync(bundleFile, "utf-8");
	// DevTools discovers the map via this trailing annotation; its absence
	// means no map is loaded even if the .map file exists on disk.
	expect(content).toMatch(
		new RegExp(`sourceMappingURL=${escapeRegExp(mapFileName)}`)
	);
};

const expectSourceInMap = (map) => {
	const sourceIndex = map.sources.findIndex((s) =>
		s.includes(expectedSourceFile)
	);
	expect(sourceIndex).toBeGreaterThanOrEqual(0);
	expect(typeof map.sourcesContent[sourceIndex]).toBe("string");
	expect(map.sourcesContent[sourceIndex]).toContain(expectedSourceMarker);
};

const label = `exportType="${exportType}"${useLess ? " through less-loader" : ""}`;

it(`should generate a valid source map for ${label}`, () => {
	if (exportType === "link") {
		const mapName = `bundle${__STATS_I__}.css.map`;
		const map = readMap(mapName);
		expectSourceMappingComment(`bundle${__STATS_I__}.css`, mapName);
		expectSourceInMap(map);
	} else {
		const mapName = `bundle${__STATS_I__}.js.map`;
		const map = readMap(mapName);
		expectSourceMappingComment(`bundle${__STATS_I__}.js`, mapName);
		expectSourceInMap(map);
	}
});
