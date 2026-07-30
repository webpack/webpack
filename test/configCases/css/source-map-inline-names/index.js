import css from "./main.css";

const fs = __nodeFs;
const path = __nodePath;
const NodeBuffer = __NodeBuffer;

// Referencing the export keeps the value-returning `text` module in the bundle.
if (typeof css !== "string") throw new Error("expected the css text export");

const { outputPath } = __STATS__.children[__STATS_I__];

const readInlineMaps = () => {
	const bundle = fs.readFileSync(
		path.join(outputPath, `bundle${__STATS_I__}.js`),
		"utf-8"
	);
	const regexp =
		/sourceMappingURL=data:application\/json;charset=utf-8;base64,([\w+/=]+)/g;
	const maps = [];
	let match = regexp.exec(bundle);
	while (match) {
		maps.push(
			JSON.parse(NodeBuffer.from(match[1], "base64").toString("utf-8"))
		);
		match = regexp.exec(bundle);
	}
	return maps;
};

// `Array.prototype.flat`/`flatMap` are not available on the oldest supported node
const readInlineMapSources = () => {
	const sources = [];
	for (const map of readInlineMaps()) sources.push(...map.sources);
	return sources;
};

it("should keep module identifier decorations out of inline css map sources", () => {
	const maps = readInlineMaps();
	expect(maps.length).toBeGreaterThan(0);
	for (const map of maps) {
		for (const source of map.sources) {
			expect(source).not.toMatch(/css\/(auto|module|global)\|/);
			expect(source).not.toMatch(/\|text/);
		}
	}
});

if (__STATS_I__ === 2) {
	it("should template sources a loader reported for non-modules", () => {
		expect(readInlineMapSources()).toContain(
			"webpack:///./virtual-partial.css"
		);
	});
} else if (__STATS_I__ === 3) {
	it("should keep absolute urls a loader reported as they are", () => {
		expect(readInlineMapSources()).toContain(
			"https://example.com/remote.css"
		);
	});
} else if (__STATS_I__ === 0) {
	it("should name inline css map sources like emitted asset maps do", () => {
		const merged = readInlineMaps().find((map) => map.sources.length > 1);
		expect(merged.sources).toContain("webpack:///./main.css");
		expect(merged.sources).toContain("webpack:///./shared.css");
		// `shared.css` is imported under two layers, so it is two modules
		expect(
			merged.sources.filter((source) =>
				/^webpack:\/\/\/\.\/shared\.css\?\w+$/.test(source)
			)
		).toHaveLength(1);
	});
} else {
	it("should apply output.devtoolModuleFilenameTemplate to inline css maps", () => {
		const merged = readInlineMaps().find((map) => map.sources.length > 1);
		expect(merged.sources).toContain("webpack://custom/./main.css");
		expect(merged.sources).toContain("webpack://custom/./shared.css");
	});
}
