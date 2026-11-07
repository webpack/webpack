it("should drop the global runtime module when no module needs it", () => {
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const content = fs.readFileSync(path.resolve(__dirname, "bundle.js"), "utf8");
	// split so this test source never matches itself inside the bundle
	expect(content).not.toContain(`webpack/runtime/${"global"}`);
});
