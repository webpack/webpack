import concat from "./concat";

const getFile = () => {
	const fs = __non_webpack_require__("fs");
	return fs.readFileSync(__filename, "utf-8");
};

const stripModuleMarkers = (content) =>
	content.split(/^;\/\/ /m)[0];

const RuntimeGlobals_Exports = "__webpack_exports__";
const RuntimeGlobals_Require = "__webpack_require__";
const exportsReg = new RegExp(
	"var\\s+" + RuntimeGlobals_Exports + "\\s*="
);
const definePropertyGettersReg = new RegExp(
	RuntimeGlobals_Require + "\\.d\\s*="
);
const hasOwnPropertyReg = new RegExp(
	RuntimeGlobals_Require + "\\.o\\s*="
);
const requireScopeReg = new RegExp(
	"var\\s+" + RuntimeGlobals_Require + "\\s*=\\s*\\{"
);
const isNoConcat = /-no-concat\.mjs$/.test(__filename);

it("should compile and run", () => {
	// Only inspect the prelude - the runtime helpers always appear before
	// the first emitted module (`;// path/to/module.js`). This avoids
	// matching this test's own source, which is concatenated into the bundle.
	const content = stripModuleMarkers(getFile());
	expect(concat).toBe("concat");

	if (isNoConcat) {
		expect(content).toMatch(exportsReg);
	} else {
		expect(content).not.toMatch(exportsReg);
		expect(content).not.toMatch(definePropertyGettersReg);
		expect(content).not.toMatch(hasOwnPropertyReg);
		expect(content).not.toMatch(requireScopeReg);
	}
});

export { concat };
export default "foo";
