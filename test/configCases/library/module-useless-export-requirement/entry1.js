const getFile = (filename) => {
	const path = __non_webpack_require__("path");
	const fs = __non_webpack_require__("fs");
	return fs.readFileSync(path.resolve(__dirname, filename), "utf-8");
};

const RuntimeGlobals_Exports = "__webpack_exports__";
const reg = new RegExp("var\\s" + RuntimeGlobals_Exports + "\\s=");

it("should compile and run", () => {
	const content = getFile("bundle0.mjs");
	// When CJS (self reference) bundle to esm, entry module won't be inlined,
	// also `__webpack_exports__` should be rendered because we will generate default export of `__webpack_exports__`
	expect(content).toMatch(reg);
});

module.exports = {
	name: "foo"
};
