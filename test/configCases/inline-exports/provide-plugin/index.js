const fs = __non_webpack_require__("fs");
const generated = /** @type {string} */ (fs.readFileSync(__filename, "utf-8"));

it("should provide inlined const exports", () => {
	expect(value).toBe(1);
	expect("./provide.js" in __webpack_modules__).toBe(true);
});
