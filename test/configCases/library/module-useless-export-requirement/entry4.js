import concat from "./concat";
import "./style.css";

const getFile = () => {
	const fs = __non_webpack_require__("fs");
	return fs.readFileSync(__filename, "utf-8");
};

const stripModuleMarkers = (content) =>
	content.split(/^;\/\/ /m)[0];

const RuntimeGlobals_Exports = "__webpack_exports__";
const RuntimeGlobals_Require = "__webpack_require__";
const exportsReg = new RegExp(
	"(?:var|let|const)\\s+" + RuntimeGlobals_Exports + "\\s*="
);
const definePropertyGettersReg = new RegExp(
	RuntimeGlobals_Require + "\\.d\\s*="
);
const hasOwnPropertyReg = new RegExp(
	RuntimeGlobals_Require + "\\.o\\s*="
);
const requireScopeReg = new RegExp(
	"(?:var|let|const)\\s+" + RuntimeGlobals_Require + "\\s*=\\s*\\{"
);
const isNoConcat = /-no-concat\.mjs$/.test(__filename);

it("should not emit __webpack_require__ helpers with CSS modules", () => {
	const content = stripModuleMarkers(getFile());
	expect(concat).toEqual({});

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
