const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

/**
 * @param {string} name emitted name
 * @returns {string} its contents
 */
function emitted(name) {
	return fs.readFileSync(path.join(__dirname, name), "utf-8");
}

const url = require("./photo.jpg");

it("should emit the renamed asset across a hot update", (done) => {
	expect(url).toMatch(/photo\.webp$/);
	expect(emitted("assets/photo.webp")).toContain("photo-v1");
	expect(() => emitted("assets/photo.jpg")).toThrow();

	module.hot.accept("./photo.jpg", () => {
		expect(require("./photo.jpg")).toMatch(/photo\.webp$/);
		expect(emitted("assets/photo.webp")).toContain("photo-v2");
		done();
	});

	NEXT(require("../../update")(done));
});
