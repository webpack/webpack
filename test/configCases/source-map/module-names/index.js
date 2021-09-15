function getSourceMap(filename) {
	var fs = require("fs");
	var source = fs.readFileSync(__dirname + "/" + filename + ".map", "utf-8");
	var map = JSON.parse(source);
	return map;
}

it("should include test.js in SourceMap", function () {
	var allSources = new Set();
	var map = getSourceMap("bundle0.js");
	for (var source of map.sources) allSources.add(source);
	map = getSourceMap("chunk-a.js");
	for (var source of map.sources) allSources.add(source);
	map = getSourceMap("chunk-b.js");
	for (var source of map.sources) allSources.add(source);
	expect(allSources).toContain("module");
	allSources.delete("module");
	expect(allSources).toContain("fallback");
	for (const source of allSources) {
		expect(source).toMatch(/^fallback\**$/);
	}
});

if (Math.random() < 0) {
	require.ensure(["./test.js"], function (require) {}, "chunk-a");
	require.ensure(
		["./test.js", "./test.js?1"],
		function (require) {},
		"chunk-b"
	);
}
