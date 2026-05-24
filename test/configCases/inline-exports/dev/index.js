const path = require("path");

const generated = /** @type {string} */ (
	__non_webpack_require__("fs").readFileSync(
		path.resolve(__dirname, "constants.bundle0.js"),
		"utf-8"
	)
);

it("should have correct exports in development mode", async () => {
	await import(/* webpackChunkName: "constants" */ "../basic/constants").then(
		exports => {
			expect(exports.REMOVE_i).toBe(123456);
			expect(exports.REMOVE_s).toBe("remove");
		}
	);
});

it("should keep the module for dynamic import", () => {
	const noInlinedModuleIds = ["../basic/constants.js"];
	noInlinedModuleIds.forEach(m => {
		expect(generated.includes(`"${m}"\n(`)).toBe(true);
	});
});
