import concat from "./concat";

const getFile = () => {
	const fs = __non_webpack_require__("fs");
	return fs.readFileSync(__filename, "utf-8");
};

const RuntimeGlobals_Exports = "__webpack_exports__";
const reg = new RegExp("var\\s" + RuntimeGlobals_Exports + "\\s=");
const isNoConcat = /-no-concat\.mjs$/.test(__filename);

it("should compile and run", () => {
	const content = getFile();
	expect(concat).toBe("concat");

	if (isNoConcat) {
		expect(content).toMatch(reg);
	} else {
		expect(content).not.toMatch(reg);
	}
});

export { concat };
export default "foo";
