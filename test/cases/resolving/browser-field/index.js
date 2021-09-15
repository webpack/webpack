it("should replace a module with a module", function() {
	expect(require("replacing-module1")).toBe("new-module");
});
it("should replace a module with a file in a module", function() {
	expect(require("replacing-module2")).toBe("new-module/inner");
});
it("should replace a module with file in the same module", function() {
	expect(require("replacing-module3")).toBe("new-module/inner");
});
it("should replace a module with a file in the current module", function() {
	expect(require("replacing-module4")).toBe("replacing-module4/module");
});

it("should replace a file with another file", function() {
	expect(require("replacing-file1")).toBe("new-file");
});
it("should replace a file with a module", function() {
	expect(require("replacing-file2")).toBe("new-module");
});
it("should replace a file with a file in a module", function() {
	expect(require("replacing-file3")).toBe("new-module/inner");
});
it("should replace a file in a directory with another file", function() {
	expect(require("replacing-file4")).toBe("new-file");
});

it("should ignore recursive module mappings", function() {
	expect(require("recursive-module")).toBe("new-module");
});

it("should use empty modules for ignored modules", function() {
	expect(require("ignoring-module").module).toEqual({});
	expect(require("ignoring-module").file).toEqual({});
	expect(require("ignoring-module").module).not.toBe(
		require("ignoring-module").file
	);
});

// Errors
if (Math.random() < 0) require("recursive-file/a");
if (Math.random() < 0) require("recursive-file/b");
if (Math.random() < 0) require("recursive-file/c");
if (Math.random() < 0) require("recursive-file/d");
