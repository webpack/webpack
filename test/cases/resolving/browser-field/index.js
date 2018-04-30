it("should replace a module with a module", function() {
	require("replacing-module1").should.be.eql("new-module");
});
it("should replace a module with a file in a module", function() {
	require("replacing-module2").should.be.eql("new-module/inner");
});
it("should replace a module with file in the same module", function() {
	require("replacing-module3").should.be.eql("new-module/inner");
});
it("should replace a module with a file in the current module", function() {
	require("replacing-module4").should.be.eql("replacing-module4/module");
});

it("should replace a file with another file", function() {
	require("replacing-file1").should.be.eql("new-file");
});
it("should replace a file with a module", function() {
	require("replacing-file2").should.be.eql("new-module");
});
it("should replace a file with a file in a module", function() {
	require("replacing-file3").should.be.eql("new-module/inner");
});
it("should replace a file in a directory with another file", function() {
	require("replacing-file4").should.be.eql("new-file");
});

it("should ignore recursive module mappings", function() {
	require("recursive-module").should.be.eql("new-module");
});

it("should use empty modules for ignored modules", function() {
	require("ignoring-module").module.should.be.eql({});
	require("ignoring-module").file.should.be.eql({});
	require("ignoring-module").module.should.not.be.equal(require("ignoring-module").file);
});

// Errors
require.include("recursive-file/a");
require.include("recursive-file/b");
require.include("recursive-file/c");
require.include("recursive-file/d");
