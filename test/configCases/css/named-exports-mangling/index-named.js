// Entry for `parser.namedExports: true` configs. Pure named imports
// keep every CSS export mangleable — a namespace import would mark
// them all as observed-by-name and disable mangling.

import {
	simple as asIsSimple,
	foo_bar as asIsFooBar,
	foo as asIsFoo
} from "./style.module.css?as-is";
import {
	simple as camelCaseSimple,
	fooBar as camelCaseFooBar,
	btnInfoIsDisabled as camelCaseBtnInfoIsDisabled,
	myBtnInfoIsDisabled as camelCaseMyBtnInfoIsDisabled
} from "./style.module.css?camel-case";
import {
	simple as camelOnlySimple,
	fooBar as camelOnlyFooBar,
	btnInfoIsDisabled as camelOnlyBtnInfoIsDisabled,
	btnInfoIsDisabled1 as camelOnlyBtnInfoIsDisabled1
} from "./style.module.css?camel-case-only";
import {
	simple as dashesSimple,
	btnInfo_isDisabled as dashesBtnInfo_isDisabled
} from "./style.module.css?dashes";
import {
	simple as dashesOnlySimple,
	btnInfo_isDisabled as dashesOnlyBtnInfo_isDisabled
} from "./style.module.css?dashes-only";

const matrixTitle = `output.module=${process.env.OUTPUT_MODULE}, namedExports=true`;

it(`should resolve every named import per convention (${matrixTitle})`, () => {
	expect(typeof asIsSimple).toBe("string");
	expect(typeof asIsFooBar).toBe("string");
	expect(asIsFoo).toBe("bar");

	expect(typeof camelCaseSimple).toBe("string");
	expect(typeof camelCaseFooBar).toBe("string");
	expect(typeof camelCaseBtnInfoIsDisabled).toBe("string");
	expect(camelCaseMyBtnInfoIsDisabled).toBe("value");

	expect(typeof camelOnlySimple).toBe("string");
	expect(typeof camelOnlyFooBar).toBe("string");
	expect(typeof camelOnlyBtnInfoIsDisabled).toBe("string");
	expect(typeof camelOnlyBtnInfoIsDisabled1).toBe("string");

	expect(typeof dashesSimple).toBe("string");
	expect(typeof dashesBtnInfo_isDisabled).toBe("string");

	expect(typeof dashesOnlySimple).toBe("string");
	expect(typeof dashesOnlyBtnInfo_isDisabled).toBe("string");
});

it(`should concatenate every CSS module out of __webpack_modules__ (${matrixTitle})`, () => {
	// `concatenateModules: true` plus only-static imports must inline
	// every CSS variant into the entry scope, so none of them remain
	// as their own runtime modules.
	const cssModuleKeys = Object.keys(__webpack_modules__).filter((k) =>
		k.startsWith("./style.module.css")
	);
	expect(cssModuleKeys).toEqual([]);
});

it(`should not leave EXTERNAL MODULE markers for CSS in the bundle (${matrixTitle})`, () => {
	const fs = __non_webpack_require__("fs");
	const source = fs.readFileSync(`${__dirname}/bundle0.js`, "utf-8");

	for (const convention of [
		"as-is",
		"camel-case",
		"camel-case-only",
		"dashes",
		"dashes-only"
	]) {
		expect(source).not.toContain(
			`EXTERNAL MODULE: css ./style.module.css?${convention}`
		);
		expect(source).not.toContain(
			`__webpack_require__("./style.module.css?${convention}")`
		);
	}
});

it(`should mangle JS export identifiers in production (${matrixTitle})`, () => {
	const fs = __non_webpack_require__("fs");
	const source = fs.readFileSync(`${__dirname}/bundle0.js`, "utf-8");

	// When CSS modules are concatenated, every named export becomes a
	// `const <identifier> = <value>;` declaration in the entry scope
	// (CssGenerator.js#L472–497). With
	// `mangleExports: "deterministic"`, that identifier is the mangled
	// used-name, so the original long names must NOT appear as
	// const/let/var bindings.
	const longCssExportNames = [
		"btnInfoIsDisabled",
		"btnInfoIsDisabled1",
		"btnInfo_isDisabled",
		"myBtnInfoIsDisabled",
		"fooBar"
	];
	for (const name of longCssExportNames) {
		const declRegex = new RegExp(`(?:const|let|var)\\s+${name}\\b`);
		expect(source).not.toMatch(declRegex);
	}
});
