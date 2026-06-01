const a = require("./a");
const b = require("./b");

const expectModuleIdInSource = (source, id) => {
	expect(source).toMatch(new RegExp("/\\*\\*\\*/ " + id + "\\n"));
};

it("should sync module ids across compilers", () => {
	expect(a + b).toBe("ab");

	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const ids = JSON.parse(
		fs.readFileSync(path.join(__dirname, "read-module-ids.json"), "utf-8")
	);

	expect(typeof ids["./a.js"]).toBe("number");
	expect(typeof ids["./b.js"]).toBe("number");

	const source = fs.readFileSync(
		path.join(__dirname, "bundle" + __STATS_I__ + ".js"),
		"utf-8"
	);

	expectModuleIdInSource(source, ids["./a.js"]);
	expectModuleIdInSource(source, ids["./b.js"]);
});
