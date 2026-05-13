import parent from "./parent.css";

// Reference the import so it isn't tree-shaken away — text and
// css-style-sheet are value-returning exportTypes whose CSS payload would
// otherwise be optimized out.
globalThis.__keepCssAlive = parent;

const fs = __nodeFs;
const path = __nodePath;
const NodeBuffer = __NodeBuffer;

const EXPORT_TYPES = ["text", "css-style-sheet"];
const { outputPath } = __STATS__.children[__STATS_I__];
const exportType = EXPORT_TYPES[__STATS_I__];

const BASE64_CHARS =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

const decodeVlq = (str, pos) => {
	let result = 0;
	let shift = 0;
	let continuation;
	do {
		const idx = BASE64_CHARS.indexOf(str[pos++]);
		continuation = idx & 0x20;
		result += (idx & 0x1f) << shift;
		shift += 5;
	} while (continuation);
	const sign = result & 1;
	const value = result >>> 1;
	return [sign ? -value : value, pos];
};

// Walk every VLQ segment in `mappings` and count, per source index, how many
// generated lines map to it. Returns a Map<sourceIndex, Set<generatedLine>>.
const sourceLinesByIndex = (map) => {
	const mappings = map.mappings;
	/** @type {Map<number, Set<number>>} */
	const byIndex = new Map();
	let pos = 0;
	let line = 0;
	let prevSrc = 0;
	while (pos < mappings.length) {
		const ch = mappings[pos];
		if (ch === ";") {
			line++;
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
		if (fields.length >= 4) {
			prevSrc += fields[1];
			let set = byIndex.get(prevSrc);
			if (!set) {
				set = new Set();
				byIndex.set(prevSrc, set);
			}
			set.add(line);
		}
	}
	return byIndex;
};

const SOURCE_MAPPING_DATA_URI =
	/sourceMappingURL=data:application\/json(?:;charset=[^;,]+)?;base64,([A-Za-z0-9+/=]+)/g;

// Pulls every inline CSS source map out of `bundle.js`. After this fix
// each css module's JS literal carries exactly one map covering both the
// module's own CSS and all of its transitively `@import`ed content; there
// should never be more than one map per module.
const extractAllInlineMaps = (bundle) => {
	const matches = [...bundle.matchAll(SOURCE_MAPPING_DATA_URI)];
	return matches.map((m) =>
		JSON.parse(NodeBuffer.from(m[1], "base64").toString("utf-8"))
	);
};

const readBundle = () => {
	const file = path.resolve(outputPath, `bundle${__STATS_I__}.js`);
	expect(fs.existsSync(file)).toBe(true);
	return fs.readFileSync(file, "utf-8");
};

it(`should emit a single merged source map covering every @imported file for exportType="${exportType}"`, () => {
	const bundle = readBundle();
	const maps = extractAllInlineMaps(bundle);

	// Each of the three CSS modules (parent / mid / leaf) gets its own
	// merged literal, so we expect exactly three inline maps in the bundle.
	expect(maps.length).toBe(3);

	const parentMap = maps.find((m) =>
		m.sources.some((s) => s.includes("parent.css"))
	);
	expect(parentMap).toBeDefined();

	// Parent's merged map MUST reference all three files in source order
	// (leaf → mid → parent, because that's the order the @imports are
	// resolved and concatenated into the parent's literal).
	const order = parentMap.sources.map((s) => {
		if (s.includes("leaf.css")) return "leaf";
		if (s.includes("mid.css")) return "mid";
		if (s.includes("parent.css")) return "parent";
		return "other";
	});
	expect(order).toEqual(["leaf", "mid", "parent"]);

	// And sourcesContent must carry every original file's text so DevTools
	// can render the un-bundled selectors.
	const contentFor = (file) => {
		const idx = parentMap.sources.findIndex((s) => s.includes(file));
		return parentMap.sourcesContent[idx];
	};
	expect(contentFor("leaf.css")).toContain(".imported-leaf");
	expect(contentFor("mid.css")).toContain(".imported-mid");
	expect(contentFor("parent.css")).toContain(".parent-rule");

	// Mappings must cover all three files — that's the bug we're guarding
	// against (previously only the parent's own CSS had mappings, the
	// imported content was unmapped).
	const linesPerSource = sourceLinesByIndex(parentMap);
	expect(linesPerSource.size).toBe(3);
	for (const lines of linesPerSource.values()) {
		expect(lines.size).toBeGreaterThan(0);
	}
});

it(`should keep no runtime merge helper for exportType="${exportType}"`, () => {
	const bundle = readBundle();
	// Old code path generated a runtime helper at <require>.<mcs> and added
	// a runtime module whose header announces it as merging the imported
	// sheets. Static merging makes both unnecessary. The needles are split
	// so they don't appear verbatim in the bundled test source itself.
	const mcsCall = `${"__webpack" + "_require__"}.${"m" + "cs"}(`;
	const runtimeHeader = `${"css " + "merge"} ${"stylesheets"}`;
	expect(bundle.includes(mcsCall)).toBe(false);
	expect(bundle.includes(runtimeHeader)).toBe(false);
});

it(`should evaluate the merged CSS at runtime for exportType="${exportType}"`, () => {
	if (exportType === "text") {
		expect(typeof parent).toBe("string");
		expect(parent).toContain(".imported-leaf");
		expect(parent).toContain(".imported-mid");
		expect(parent).toContain(".parent-rule");
		// Order: leaf comes before mid, mid before parent.
		const leafIdx = parent.indexOf(".imported-leaf");
		const midIdx = parent.indexOf(".imported-mid");
		const parentIdx = parent.indexOf(".parent-rule");
		expect(leafIdx).toBeLessThan(midIdx);
		expect(midIdx).toBeLessThan(parentIdx);
	} else {
		expect(parent).toBeInstanceOf(CSSStyleSheet);
		const rules = Array.from(parent.cssRules);
		const selectors = rules.map((r) => r.selectorText);
		expect(selectors).toContain(".imported-leaf");
		expect(selectors).toContain(".imported-mid");
		expect(selectors).toContain(".parent-rule");
	}
});
