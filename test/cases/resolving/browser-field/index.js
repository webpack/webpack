it("should replace a module with a module", function() {
	expect(require("replacing-module1")).toEqual("new-module");
});
it("should replace a module with a file in a module", function() {
	expect(require("replacing-module2")).toEqual("new-module/inner");
});
it("should replace a module with file in the same module", function() {
	expect(require("replacing-module3")).toEqual("new-module/inner");
});
it("should replace a module with a file in the current module", function() {
	expect(require("replacing-module4")).toEqual("replacing-module4/module");
});

it("should replace a file with another file", function() {
	expect(require("replacing-file1")).toEqual("new-file");
});
it("should replace a file with a module", function() {
	expect(require("replacing-file2")).toEqual("new-module");
});
it("should replace a file with a file in a module", function() {
	expect(require("replacing-file3")).toEqual("new-module/inner");
});
it("should replace a file in a directory with another file", function() {
	expect(require("replacing-file4")).toEqual("new-file");
});

it("should ignore recursive module mappings", function() {
	expect(require("recursive-module")).toEqual("new-module");
});

it("should use empty modules for ignored modules", function() {
	expect(require("ignoring-module").module).toEqual({});
	expect(require("ignoring-module").file).toEqual({});
	expect(require("ignoring-module").module).not.toEqual(require("ignoring-module").file);
});

// Errors
require.include("recursive-file/a");
require.include("recursive-file/b");
require.include("recursive-file/c");
require.include("recursive-file/d");
