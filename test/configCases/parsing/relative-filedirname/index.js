it("should define __dirname and __filename", function() {
	expect(__dirname).toBe("");
	expect(__filename).toBe("index.js");
	expect(require("./dir/file").dirname).toBe("dir");
	require("./dir/file").filename.should.match(/^dir[\\\/]file.js$/);
});
