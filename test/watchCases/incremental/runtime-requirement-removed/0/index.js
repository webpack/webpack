const usesGlobal = global;

it("should emit the global runtime module while it is used", () => {
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const content = fs.readFileSync(path.resolve(__dirname, "bundle.js"), "utf8");
	expect(typeof usesGlobal).toBe("object");
	// split so this test source never matches itself inside the bundle
	expect(content).toContain(`webpack/runtime/${"global"}`);
});
