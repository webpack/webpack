var fs = require("fs");
var path = require("path");

it("should complete", function(done) {
	require.ensure(["./a"], function(require) {
		require("./a").should.be.eql("a");
		done();
	});
});

it("should write the correct manifest", function() {
	var manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'bundle0-manifest.json'), "utf-8"));
	manifest.should.have.key("content", "name");
	manifest.content.should.not.have.property("./a.js");
	manifest.content.should.have.property("./index.js");
	manifest.content["./index.js"].should.have.property("id").eql(module.id);
});
