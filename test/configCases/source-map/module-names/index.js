function getSourceMap(filename) {
	var fs = require("fs");
	var source = fs.readFileSync(__dirname + "/" + filename + ".map", "utf-8");
	var map = JSON.parse(source);
	return map;
}

it("should include test.js in SourceMap", function() {
	var map = getSourceMap("bundle0.js");
	expect(map.sources).toMatch("module");
	expect(map.sources).toMatch("fallback");
	expect(map.sources).toMatch("fallback**");
	map = getSourceMap("chunk-a.js");
	expect(map.sources).toMatch("fallback*");
	map = getSourceMap("chunk-b.js");
	expect(map.sources).toMatch("fallback*");
	expect(map.sources).toMatch("fallback***");
});

require.ensure(["./test.js"], function(require) {}, "chunk-a");
require.ensure(["./test.js", "./test.js?1"], function(require) {}, "chunk-b");
