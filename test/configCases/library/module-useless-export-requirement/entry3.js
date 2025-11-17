import concat from "./concat";

const getFile = (filename) => {
	const path = __non_webpack_require__("path");
	const fs = __non_webpack_require__("fs");
	return fs.readFileSync(path.resolve(__dirname, filename), "utf-8");
};

const RuntimeGlobals_Exports = "__webpack_exports__";
const reg = new RegExp("var\\s" + RuntimeGlobals_Exports + "\\s=");

it("should compile and run", () => {
	const content = getFile("bundle1.mjs");
	expect(concat).toBe("concat");

	// `__webpack_exports__` must be rendered when the entry module is inlined and wrapped in an IIFE,
	// because the entry module’s exports are registered on the top-level `__webpack_exports__`,
	// and the bundle’s final exports also depend on it.
	expect(content).toMatch(reg);
});

export { concat };
export default "foo";
