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

	// `__webpack_exports__` will be rendered when entry module is inlined and not wrapped in IIFE,
	// because we added it in `ConcatenatedModule`,
	// but we can optimize this later since it’s mostly unused in this case
	expect(content).toMatch(reg);
});

export { concat };
export default "foo";
