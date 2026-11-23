it("should link modules when linking them saves bytes", async () => {
	const page = await import(/* webpackChunkName: "many-page" */ "./many-page.js");
	const page2 = await import(/* webpackChunkName: "many-page-2" */ "./many-page-2.js");
	expect(page.run()).toBe(45);
	expect(page2.run()).toBe(45);
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const shared = fs.readFileSync(path.join(__dirname, "shared-4-4.mjs"), "utf-8");
	expect(shared).toContain("__webpack_esm_modules__ = {};");
});
