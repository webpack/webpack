const bundled = (name) => `./${name}.js` in __webpack_modules__;

it("should pass a pure module to an AMD require callback", (done) => {
	require(["./amd-used"], (module) => {
		expect(module.a).toBe(1);
		expect(module.f()).toBe("amd-used");
		done();
	});
});

it("should run an AMD require callback that takes no arguments", (done) => {
	require(["./amd-no-arguments"], () => {
		done();
	});
});

it("should load an AMD require without a callback", () => {
	require(["./amd-no-callback"]);
});

it("should resolve a dynamic import whose namespace is unused", () =>
	import("./dynamic-bare").then(() => {}));

it("should read a pure module through a dynamic import", () =>
	import("./dynamic-used").then((namespace) => {
		expect(namespace.a).toBe(1);
		expect(namespace.default.f()).toBe("dynamic-used");
	}));

it("should keep a pure module reached through require.resolve", () => {
	const id = require.resolve("./resolved");
	require("./resolved");
	expect(typeof __webpack_require__(id)).toBe("object");
	expect(bundled("resolved")).toBe(true);
});

it("should keep a pure module required inside a function", () => {
	const read = () => require("./in-function").f();
	expect(read()).toBe("in-function");
	expect(bundled("in-function")).toBe(true);
});

it("should drop a pure module required bare more than once", () => {
	require("./required-bare-twice");
	require("./required-bare-twice");
	expect(bundled("required-bare-twice")).toBe(false);
});

it("should read every pure module of a require.context", () => {
	const context = require.context("./context", false, /\.js$/);
	expect(context.keys().sort()).toEqual(["./one.js", "./two.js"]);
	expect(context("./one.js")).toBe(1);
	expect(context("./two.js").two).toBe(2);
});
