// Direct re-exports of CSS named exports as local exports of this module.
// `__webpack_exports_info__.<localName>.canMangle` queries the JS export
// identifier's mangleability through this re-export chain — substituted at
// compile time as a literal boolean.
//
// We restrict the inspected names to identifiers webpack's
// expressionMemberChain parser recognises (i.e. dot-access; no bracket
// access for names with hyphens).
export { simple as asIsSimple, foo_bar as asIsFoo_bar, foo as asIsFoo } from "./style.module.css?as-is";
export {
	simple as camelCaseSimple,
	fooBar as camelCaseFooBar,
	btnInfoIsDisabled as camelCaseBtnInfoIsDisabled,
	myBtnInfoIsDisabled as camelCaseMyBtnInfoIsDisabled
} from "./style.module.css?camel-case";
export {
	simple as camelOnlySimple,
	fooBar as camelOnlyFooBar,
	btnInfoIsDisabled as camelOnlyBtnInfoIsDisabled
} from "./style.module.css?camel-case-only";
export {
	simple as dashesSimple,
	btnInfo_isDisabled as dashesBtnInfo_isDisabled
} from "./style.module.css?dashes";
export {
	simple as dashesOnlySimple,
	btnInfo_isDisabled as dashesOnlyBtnInfo_isDisabled
} from "./style.module.css?dashes-only";

export const mangleInfo = {
	asIs: {
		simple: __webpack_exports_info__.asIsSimple.canMangle,
		foo_bar: __webpack_exports_info__.asIsFoo_bar.canMangle,
		fromExportBlock: __webpack_exports_info__.asIsFoo.canMangle
	},
	camelCase: {
		alias: __webpack_exports_info__.camelCaseBtnInfoIsDisabled.canMangle,
		fooBar: __webpack_exports_info__.camelCaseFooBar.canMangle,
		simple: __webpack_exports_info__.camelCaseSimple.canMangle,
		fromExportBlock:
			__webpack_exports_info__.camelCaseMyBtnInfoIsDisabled.canMangle
	},
	camelCaseOnly: {
		alias: __webpack_exports_info__.camelOnlyBtnInfoIsDisabled.canMangle,
		fooBar: __webpack_exports_info__.camelOnlyFooBar.canMangle,
		simple: __webpack_exports_info__.camelOnlySimple.canMangle
	},
	dashes: {
		alias: __webpack_exports_info__.dashesBtnInfo_isDisabled.canMangle,
		simple: __webpack_exports_info__.dashesSimple.canMangle
	},
	dashesOnly: {
		alias: __webpack_exports_info__.dashesOnlyBtnInfo_isDisabled.canMangle,
		simple: __webpack_exports_info__.dashesOnlySimple.canMangle
	}
};
