try {
	require("pkgs/somepackage/foo");
} catch (e) {}

it("should write relative paths to records", function() {
	var fs = require("fs");
	var path = require("path");
	var content = fs.readFileSync(path.join(__dirname, "records.json"), "utf-8");

	expect(JSON.parse(content)).toMatchObject({
		chunks: {
			byName: {
				main: 792
			},
			bySource: {
				"0 main": 792
			},
			usedIds: [792]
		},
		modules: {
			byIdentifier: {
				"./test.js": 329,
				'external node-commonjs "fs"': 896,
				'external node-commonjs "path"': 928,
				"ignored|./.|pkgs/somepackage/foo": 835
			},
			usedIds: [329, 835, 896, 928]
		}
	});
});
