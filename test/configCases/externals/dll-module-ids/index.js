const external = require("dll/alias.js");

it("should preserve external request keys in a scoped DLL", () => {
	expect(typeof external.join).toBe("function");
	expect(external).toBe(require("path"));
});

it("should preserve single-request external module ids in DLL manifests", () => {
	const manifest = __non_webpack_require__("./manifest.json");
	expect(manifest.content["./alias.js"].id).toBe("./alias.js");
});
