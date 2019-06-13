global.XMLHttpRequest = function() {};
global.XMLHttpRequest.prototype.open = function() {};

it("should provide a global Buffer constructor", function() {
	expect(Buffer).toBeInstanceOf(Function);
});

it("should provide a global console shim", function () {
	expect(console).toBeTypeOf("object");
	expect(console.time).toBeTypeOf("function");
});

it("should provide a global process shim", function () {
	expect(process).toBeInstanceOf(Object);
});

it("should provide a global setImmediate shim", function () {
	expect(setImmediate).toBeInstanceOf(Function);
});

it("should provide a global clearImmediate shim", function () {
	expect(clearImmediate).toBeInstanceOf(Function);
});

it("should provide an assert shim", function () {
	expect(require("assert")).toBeInstanceOf(Function);
});

it("should provide a util shim", function () {
	expect(require("util")).toBeInstanceOf(Object);
});

it("should provide a buffer shim", function () {
	expect(require("buffer")).toBeInstanceOf(Object);
});

it("should provide a crypto shim", function () {
	expect(require("crypto")).toBeInstanceOf(Object);
});

it("should provide a domain shim", function () {
	expect(require("domain")).toBeInstanceOf(Object);
});

it("should provide an events shim", function () {
	expect(require("events")).toBeInstanceOf(Function);
});

it("should provide an http shim", function () {
	expect(require("http")).toBeInstanceOf(Object);
});

it("should provide an https shim", function () {
	expect(require("https")).toBeInstanceOf(Object);
});

it("should provide an os shim", function () {
	expect(require("os")).toBeInstanceOf(Object);
});

it("should provide a path shim", function () {
	expect(require("path")).toBeInstanceOf(Object);
});

it("should provide a punycode shim", function () {
	expect(require("punycode")).toBeInstanceOf(Object);
});

it("should provide a stream shim", function () {
	expect(require("stream")).toBeInstanceOf(Function);
});

it("should provide a tty shim", function () {
	expect(require("tty")).toBeInstanceOf(Object);
});

it("should provide a url shim", function () {
	expect(require("url")).toBeInstanceOf(Object);
});

it("should provide a util shim", function () {
	expect(require("util")).toBeInstanceOf(Object);
});

it("should provide a vm shim", function () {
	expect(require("vm")).toBeInstanceOf(Object);
});

it("should provide a zlib shim", function () {
	expect(require("zlib")).toBeInstanceOf(Object);
});

it("should provide a shim for a path in a build-in module", function () {
	expect(require("process/in.js")).toBe("in process");
});

it("should allow to load a chunk", () => {
	__webpack_public_path__ = "./";
	return import("./module").then(module => {
		expect(module.default).toBe("ok");
	});
});
