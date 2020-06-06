it("should bailout when reading whole exports object from this", () => {
	var test = require("./reading-this").test;
	expect(test().abc).toBe("abc");
});

it("should bailout when reading whole exports object from exports", () => {
	var test = require("./reading-exports").test;
	expect(test().abc).toBe("abc");
});

it("should bailout when reading whole exports object from module.exports", () => {
	var test = require("./reading-module-exports").test;
	expect(test().abc).toBe("abc");
});

it("should reassigning exports (assign values)", () => {
	expect(require("./assign-exports-assign?1").abc).toBe("abc");
	expect(require("./assign-exports-assign?2").def).toBe(undefined);
});

it("should reassigning exports (define values)", () => {
	expect(require("./assign-exports-define").abc).toBe("abc");
	expect(require("./assign-exports-define").def).toBe(undefined);
});

it("should not mangle or remove nested properties", () => {
	expect(require("./nested-property").abc).toBe("abc");
});

it("should be able to access the exports via call context", () => {
	expect(require("./accessing-call-context?1").func().abc).toBe("abc");
	var cc = require("./accessing-call-context?2");
	expect(cc.func().abc).toBe("abc");
	var func = require("./accessing-call-context?3").func;
	expect(func()).toBe(undefined);
});

it("should be able to define an exports property on module (property)", () => {
	expect(require("./define-module-property?2").abc).toBe("abc");
	expect(require("./define-module-property?1").def).toBe("def");
});

it("should be able to define an exports property on module (properties)", () => {
	expect(require("./define-module-properties?2").abc).toBe("abc");
	expect(require("./define-module-properties?1").def).toBe("def");
});

it("should be able to do stuff with the module object", () => {
	expect(require("./accessing-module?2").abc).toBe("abc");
	expect(require("./accessing-module?1").def).toBe("def");
});

it("should be able to use AMD to define exports", () => {
	expect(require("./using-amd?2").abc).toBe("abc");
	expect(require("./using-amd?1").def).toBe("def");
});
