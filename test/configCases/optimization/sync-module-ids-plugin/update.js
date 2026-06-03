const a = require("./a");

const expectModuleIdInSource = (source, id) => {
	expect(source).toMatch(new RegExp("/\\*\\*\\*/ " + id + "\\n"));
};

if (__STATS_I__ === 5) {
	it("should update module ids by pruning unused records", () => {
		expect(a).toBe("a");

		const fs = __non_webpack_require__("fs");
		const path = __non_webpack_require__("path");
		const ids = JSON.parse(
			fs.readFileSync(path.join(__dirname, "update-module-ids.json"), "utf-8")
		);

		expect(typeof ids["./a.js"]).toBe("number");
		expect(typeof ids["./update.js"]).toBe("number");
		expect(ids).not.toHaveProperty("./b.js");
		expect(ids).not.toHaveProperty("./c.js");

		const source = fs.readFileSync(
			path.join(__dirname, "bundle" + __STATS_I__ + ".js"),
			"utf-8"
		);

		expectModuleIdInSource(source, ids["./a.js"]);
	});
} else {
	it("should create records for update", () => {
		expect(a).toBe("a");
	});
}
