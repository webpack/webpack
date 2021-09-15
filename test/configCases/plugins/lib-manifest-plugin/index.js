var fs = require("fs");
var path = require("path");

it("should complete", function(done) {
	require.ensure(["./a"], function(require) {
		expect(require("./a")).toBe("a");
		done();
	});
});

it("should write the correct manifest", function() {
	var manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'bundle0-manifest.json'), "utf-8"));
	expect(manifest).toHaveProperty("content");
	expect(manifest).toHaveProperty("name");
	expect(manifest.content).not.toHaveProperty(["./a.js"]);
	expect(manifest.content).toHaveProperty(["./index.js"]);
	expect(manifest.content["./index.js"]).toHaveProperty("id", module.id);
});
