import fs from "fs";
import path from "path";

const readFile = (filename) => {
	return fs.readFileSync(path.join(__dirname, filename), "utf-8");
};

const getSourceMap = (filename) => {
	return JSON.parse(readFile(filename));
};

it("should compile successfully and have dual sourcemap", async () => {
	import(/* webpackChunkName: "chunk-foo" */ "./foo").then(
		({ default: foo }) => {
			expect(foo).toBe("foo");
		}
	);

	let bundle2 = readFile("bundle2.js");
	let bundle2Map = getSourceMap("bundle2.js.test.map");
	// append: false
	expect(bundle2).not.toMatch(/\/\/ sourceMappingURL=/);
	// sourceRoot: "test"
	expect(bundle2Map.sourceRoot).toBe("test");
	// ignoreList: /entry3\.js/
	expect(bundle2Map.ignoreList[0]).toBe(
		bundle2Map.sources.findIndex((source) => /entry3\.js/.test(source))
	);
	// columns: false
	expect(bundle2Map.mappings).not.toContain(",");
	// namespace: "test"
	for (const source of bundle2Map.sources) {
		expect(source.startsWith("webpack://test")).toBe(true);
	}

	let chunkFoo = readFile("chunk-foo.js");
	let chunkFooMap = getSourceMap("chunk-foo.js.foo.map");
	// append fn + publicPath
	expect(chunkFoo).toMatch(
		"//# sourceMappingURL=http://localhost:8080/foo/sourcemaps/chunk-foo.js.foo.map"
	);
	// sourceRoot: "foo"
	expect(chunkFooMap.sourceRoot).toBe("foo");
	// columns: true
	expect(chunkFooMap.mappings).toContain(",");
	// noSources: true,
	expect(chunkFooMap.sourcesContent).toBeUndefined();
	// debugIds: true
	expect(
		/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i.test(
			chunkFooMap.debugId
		)
	).toBe(true);
	// namespace: "foo"
	for (const source of chunkFooMap.sources) {
		expect(source.startsWith("webpack://foo")).toBe(true);
	}
});
