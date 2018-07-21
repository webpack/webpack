it("should define __dirname and __filename", function() {
	__dirname.should.be.eql("");
	__filename.should.be.eql("index.js");
	require("./dir/file").dirname.should.be.eql("dir");
	require("./dir/file").filename.should.match(/^dir[\\\/]file.js$/);
});