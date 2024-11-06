function loadDependency(dep) {
	require("./dependencies/" + dep);
}

it("should write relative dynamic-require paths to records", function() {
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
				"./dependencies/bar.js": 666,
				"./dependencies/foo.js": 147,
				'./dependencies|sync|/^\\.\\/.*$/': 239,
				"./test.js": 329,
				'external node-commonjs "fs"': 896,
				'external node-commonjs "path"': 928
			},
			usedIds: [147, 239, 329, 666, 896, 928]
		}
	});
});
