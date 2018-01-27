it("should have a relative url to the source-map", function() {
	var fs = require("fs");
	var source = fs.readFileSync(__filename, "utf-8");
	var match = /sourceMappingURL\s*=\s*(.*)/.exec(source);
	expect(match[1]).toBe("bundle0.js.map");
});

it("should have a relative url to the source-map with prefix", function(done) {
	require.ensure([], function(require) {
		global.expect = expect;
		require("./test.js");
		done();
	});
});
