// Entry for `parser.namedExports: false` configs. The CSS modules
// expose only `default`, so a default import is the only valid form.
// Mangling does not apply here — there are no JS named exports for
// CSS classes — but concatenation still does.

import asIsDefault from "./style.module.css?as-is";
import camelCaseDefault from "./style.module.css?camel-case";
import camelOnlyDefault from "./style.module.css?camel-case-only";
import dashesDefault from "./style.module.css?dashes";
import dashesOnlyDefault from "./style.module.css?dashes-only";

const matrixTitle = `output.module=${process.env.OUTPUT_MODULE}, namedExports=false`;

it(`should expose the right default-export shape per convention (${matrixTitle})`, () => {
	// "as-is": original CSS class names are exported, no aliases
	expect(asIsDefault["btn-info_is-disabled"]).toBeDefined();
	expect(asIsDefault["btn--info_is-disabled_1"]).toBeDefined();
	expect(asIsDefault.foo_bar).toBeDefined();
	expect(asIsDefault.simple).toBeDefined();
	expect(asIsDefault.class).toBeDefined();
	expect(asIsDefault["my-btn-info_is-disabled"]).toBe("value");
	expect(asIsDefault.foo).toBe("bar");
	expect(asIsDefault.btnInfoIsDisabled).toBeUndefined();
	expect(asIsDefault.fooBar).toBeUndefined();

	// "camel-case": original AND camelCase aliases share the same value
	expect(camelCaseDefault["btn-info_is-disabled"]).toBe(
		camelCaseDefault.btnInfoIsDisabled
	);
	expect(camelCaseDefault["btn--info_is-disabled_1"]).toBe(
		camelCaseDefault.btnInfoIsDisabled1
	);
	expect(camelCaseDefault.foo_bar).toBe(camelCaseDefault.fooBar);
	expect(camelCaseDefault.foo).toBe("bar");
	expect(camelCaseDefault["my-btn-info_is-disabled"]).toBe("value");
	expect(camelCaseDefault.myBtnInfoIsDisabled).toBe("value");

	// "camel-case-only": only the camelCase form exists
	expect(camelOnlyDefault.btnInfoIsDisabled).toBeDefined();
	expect(camelOnlyDefault.btnInfoIsDisabled1).toBeDefined();
	expect(camelOnlyDefault.fooBar).toBeDefined();
	expect(camelOnlyDefault["btn-info_is-disabled"]).toBeUndefined();
	expect(camelOnlyDefault["btn--info_is-disabled_1"]).toBeUndefined();
	expect(camelOnlyDefault.foo_bar).toBeUndefined();
	expect(camelOnlyDefault.myBtnInfoIsDisabled).toBe("value");
	expect(camelOnlyDefault["my-btn-info_is-disabled"]).toBeUndefined();

	// "dashes": dashes -> camelCase, underscores preserved, original kept
	expect(dashesDefault["btn-info_is-disabled"]).toBe(
		dashesDefault.btnInfo_isDisabled
	);
	expect(dashesDefault.foo_bar).toBeDefined();
	expect(dashesDefault["my-btn-info_is-disabled"]).toBe("value");
	expect(dashesDefault.myBtnInfo_isDisabled).toBe("value");

	// "dashes-only": only the dashes-converted form is exported
	expect(dashesOnlyDefault.btnInfo_isDisabled).toBeDefined();
	expect(dashesOnlyDefault["btn-info_is-disabled"]).toBeUndefined();
	expect(dashesOnlyDefault.myBtnInfo_isDisabled).toBe("value");
	expect(dashesOnlyDefault["my-btn-info_is-disabled"]).toBeUndefined();
});

it(`should concatenate every CSS module out of __webpack_modules__ (${matrixTitle})`, () => {
	const cssModuleKeys = Object.keys(__webpack_modules__).filter((k) =>
		k.startsWith("./style.module.css")
	);
	expect(cssModuleKeys).toEqual([]);
});
