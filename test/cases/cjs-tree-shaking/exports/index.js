it("should allow to export via exports", () => {
	expect(require("./assign-exports-property?1").abc).toBe("abc");
	expect(require("./assign-exports-property?2")).toEqual({
		abc: "abc",
		def: "def"
	});
});

it("should allow to export via module.exports", () => {
	expect(require("./assign-module-exports-property?1").abc).toBe("abc");
	expect(require("./assign-module-exports-property?2")).toEqual({
		abc: "abc",
		def: "def"
	});
});

it("should allow to export via this", () => {
	expect(require("./assign-this-property?1").abc).toBe("abc");
	expect(require("./assign-this-property?2")).toEqual({
		abc: "abc",
		def: "def"
	});
});

it("should allow to export via define property on exports", () => {
	expect(require("./define-exports-property?1").abc).toBe("abc");
	expect(require("./define-exports-property?2")).toEqual({
		abc: "abc",
		def: "def"
	});
});

it("should allow to export via define property on module.exports", () => {
	expect(require("./define-module-exports-property?1").abc).toBe("abc");
	expect(require("./define-module-exports-property?2")).toEqual({
		abc: "abc",
		def: "def"
	});
});

it("should allow to export via define property on this", () => {
	expect(require("./define-this-property?1").abc).toBe("abc");
	expect(require("./define-this-property?2")).toEqual({
		abc: "abc",
		def: "def"
	});
});

it("should allow to read own exports via exports", () => {
	var test = require("./reading-self-from-exports").test;
	expect(test()).toBe("abc");
});

it("should allow to read own exports via module.exports", () => {
	var test = require("./reading-self-from-module-exports").test;
	expect(test()).toBe("abc");
});

it("should allow to read own exports via this", () => {
	var test = require("./reading-self-from-this").test;
	expect(test()).toBe("abc");
});

it("should allow to attach exports to object", () => {
	expect(require("./attach-to-object?1").abc).toBe("abc");
	expect(require("./attach-to-object?2").def).toBe("def");
	expect(require("./attach-to-object?3").abc).toBe("abc");
	expect(require("./attach-to-object?3").def).toBe("def");
});

it("should allow to attach exports to function", () => {
	expect(require("./attach-to-function?1")()).toBe("abc");
	expect(require("./attach-to-function?2").def).toBe("def");
	expect(require("./attach-to-function?3")()).toBe("abc");
	expect(require("./attach-to-function?3").def).toBe("def");
});

it("should allow to attach exports to arrow function", () => {
	expect(require("./attach-to-arrow-function?1")()).toBe("abc");
	expect(require("./attach-to-arrow-function?2").def).toBe("def");
	expect(require("./attach-to-arrow-function?3")()).toBe("abc");
	expect(require("./attach-to-arrow-function?3").def).toBe("def");
});

it("should properly handle export / require `default`", () => {
	expect(require("./require-default").moduleExportsDefault).toBe("hello");
	expect(require("./require-default").hello1).toBe("hello");
	expect(require("./require-default").hello2).toBe("hello");
	expect(require("./require-default").hello3).toBe("hello");
	expect(require("./require-default").hello4).toBe("hello");
	expect(require("./require-default").hello5).toBe("hello");
	expect(require("./require-default").hello6).toBe("hello");
	expect(require("./require-default").hello7).toBe("hello");
	expect(require("./require-default").hello8).toBe("hello");
});
