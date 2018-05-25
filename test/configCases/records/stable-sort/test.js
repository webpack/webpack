require.ensure([], function(require) {
	require('./split.js')
})

require.ensure([], function(require) {
	require('./split-2.js')
}, "split")

it("sorts the usedIds array to prevent churn", function() {
	var fs = require("fs");
	var path = require("path");
	var records = JSON.parse(fs.readFileSync(path.join(__dirname, "records.json"), "utf-8"));
	expect(records.chunks.usedIds).toEqual([0, 1, 2]);
});
