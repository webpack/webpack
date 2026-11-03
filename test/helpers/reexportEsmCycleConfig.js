"use strict";

// Generates CommonJS ⇄ ES module re-export cycles for the
// `cjs-tree-shaking/reexport-esm-cycle-*` config cases, one per build variant.

const webpack = require("../../");

const { VirtualUrlPlugin } = webpack.experiments.schemes;

/** @import { Compiler, Configuration } from "../../" */

/**
 * @typedef {object} CommonJsForm
 * @property {(esm: string) => string} source line re-exporting the ES module as `re`
 * @property {"namespace" | "function"} re what `re` holds: the namespace or its `value`
 */

/**
 * @typedef {object} EsmForm
 * @property {(cjs: string) => string} source how the ES module binds the CommonJS one
 * @property {string[]} keys the ES module's export names, sorted
 * @property {string=} cjs expression on `esm` giving the CommonJS exports object
 * @property {string=} cjsValue expression on `esm` calling the CommonJS `value`, unless shadowed
 * @property {string} cjsRe expression on `esm` reading the CommonJS `re`
 */

// Every CommonJS module also exports `value` and `getEsm`, every ES module
// exports `value`; each is a function, so a read during the cycle never sees
// an uninitialized binding.
/** @type {Record<string, CommonJsForm>} */
const commonJsForms = {
	member: {
		source: (esm) => `exports.re = require(${esm});`,
		re: "namespace"
	},
	binding: {
		source: (esm) => `const esm = require(${esm});\nexports.re = esm;`,
		re: "namespace"
	},
	"module-exports-member": {
		source: (esm) => `module.exports.re = require(${esm});`,
		re: "namespace"
	},
	"define-value": {
		source: (esm) =>
			`Object.defineProperty(exports, "re", { enumerable: true, value: require(${esm}) });`,
		re: "namespace"
	},
	"define-getter": {
		source: (esm) =>
			`Object.defineProperty(exports, "re", { enumerable: true, get: function () { return require(${esm}); } });`,
		re: "namespace"
	},
	"value-member": {
		source: (esm) => `exports.re = require(${esm}).value;`,
		re: "function"
	},
	"binding-member": {
		source: (esm) => `const esm = require(${esm});\nexports.re = esm.value;`,
		re: "function"
	}
};

/** @type {Record<string, EsmForm>} */
const esmForms = {
	"namespace-reexport": {
		source: (cjs) => `export * as cjs from ${cjs};`,
		keys: ["cjs", "value"],
		cjs: "esm.cjs",
		cjsValue: "esm.cjs.value()",
		cjsRe: "esm.cjs.re"
	},
	"namespace-binding": {
		source: (cjs) => `import * as ns from ${cjs};\nexport { ns as cjs };`,
		keys: ["cjs", "value"],
		cjs: "esm.cjs",
		cjsValue: "esm.cjs.value()",
		cjsRe: "esm.cjs.re"
	},
	"default-binding": {
		source: (cjs) => `import cjs from ${cjs};\nexport { cjs };`,
		keys: ["cjs", "value"],
		cjs: "esm.cjs",
		cjsValue: "esm.cjs.value()",
		cjsRe: "esm.cjs.re"
	},
	"require-binding": {
		source: (cjs) => `export const cjs = require(${cjs});`,
		keys: ["cjs", "value"],
		cjs: "esm.cjs",
		cjsValue: "esm.cjs.value()",
		cjsRe: "esm.cjs.re"
	},
	"lazy-require": {
		source: (cjs) => `export function getCjs() {\n\treturn require(${cjs});\n}`,
		keys: ["getCjs", "value"],
		cjs: "esm.getCjs()",
		cjsValue: "esm.getCjs().value()",
		cjsRe: "esm.getCjs().re"
	},
	"named-import": {
		source: (cjs) =>
			`import { re, value as cjsValue } from ${cjs};\nexport function readRe() {\n\treturn re;\n}\nexport function readValue() {\n\treturn cjsValue();\n}`,
		keys: ["readRe", "readValue", "value"],
		cjsValue: "esm.readValue()",
		cjsRe: "esm.readRe()"
	},
	"named-reexport": {
		source: (cjs) => `export { re, value as cjsValue, getEsm } from ${cjs};`,
		keys: ["cjsValue", "getEsm", "re", "value"],
		cjsValue: "esm.cjsValue()",
		cjsRe: "esm.re"
	},
	"star-reexport": {
		source: (cjs) => `export * from ${cjs};`,
		keys: ["getEsm", "re", "value"],
		cjsRe: "esm.re"
	}
};

// Exports are analyzed in post-order from `index.js`, so the side a test
// imports is analyzed after the other one: both orders get covered.
const ENTERED_FROM = ["esm", "cjs"];
const USAGES = ["namespace", "chain", "minimal"];
const COMMONJS_TYPES = [".cjs", ".js"];

/**
 * Writes the test module reading one cycle the way `usage` says.
 * @param {string} title test title
 * @param {CommonJsForm} commonJs CommonJS form
 * @param {EsmForm} esmForm ES module form
 * @param {string} enteredFrom "esm" or "cjs": the side the test imports
 * @param {string} usage "namespace", "chain" or "minimal"
 * @param {{ esm: string, cjs: string }} requests requests of both sides
 * @returns {string} source of the test module
 */
const testSource = (title, commonJs, esmForm, enteredFrom, usage, requests) => {
	/**
	 * Checks what `re` holds; a static chain skips `__esModule`, no declared export.
	 * @param {string} re expression reading `re`
	 * @param {boolean=} chain whether `re` is read through a static chain
	 * @returns {string} the assertions
	 */
	const reCheck = (re, chain) =>
		commonJs.re === "namespace"
			? chain
				? `expect(${re}.value()).toBe("esm");`
				: `{\n\t\tconst re = ${re};\n\t\texpect(re.value()).toBe("esm");\n\t\texpect(re.__esModule).toBe(true);\n\t}`
			: `expect(${re}()).toBe("esm");`;
	if (usage === "minimal") {
		return enteredFrom === "esm"
			? `import { value } from ${requests.esm};\nit(${title}, () => {\n\texpect(value()).toBe("esm");\n});`
			: `import { value } from ${requests.cjs};\nit(${title}, () => {\n\texpect(value()).toBe("cjs");\n});`;
	}
	if (usage === "chain") {
		// static property chains only, so nested usage is tracked per name
		const head =
			enteredFrom === "esm"
				? `import * as esm from ${requests.esm};`
				: `import * as cjs from ${requests.cjs};\nconst esm = cjs.getEsm();`;
		return `${head}\nit(${title}, () => {\n\texpect(esm.value()).toBe("esm");${esmForm.cjsValue ? `\n\texpect(${esmForm.cjsValue}).toBe("cjs");` : ""}\n\t${reCheck(esmForm.cjsRe, true)}\n});`;
	}
	const head =
		enteredFrom === "esm"
			? `import * as esm from ${requests.esm};`
			: `import cjsExports from ${requests.cjs};\nconst esm = cjsExports.getEsm();`;
	const lines = [
		`expect(Object.keys(esm).sort()).toEqual(${JSON.stringify(esmForm.keys)});`,
		'expect(esm.value()).toBe("esm");',
		reCheck(esmForm.cjsRe)
	];
	if (esmForm.cjsValue) lines.push(`expect(${esmForm.cjsValue}).toBe("cjs");`);
	if (esmForm.cjs) {
		lines.push(
			`const cjs = ${esmForm.cjs};`,
			"expect(cjs.getEsm()).toBe(esm);",
			reCheck("cjs.re")
		);
		if (commonJs.re === "namespace") lines.push("expect(cjs.re).toBe(esm);");
	}
	if (enteredFrom === "cjs") {
		lines.push(
			'expect(cjsExports.value()).toBe("cjs");',
			reCheck("cjsExports.re")
		);
	}
	return `${head}\nit(${title}, () => {\n\t${lines.join("\n\t")}\n});`;
};

/**
 * Generates every scenario as virtual modules plus one module importing them.
 * @returns {Record<string, { type: string, source: () => string }>} virtual modules
 */
const generateModules = () => {
	/** @type {Record<string, { type: string, source: () => string }>} */
	const modules = {};
	/** @type {string[]} */
	const tests = [];
	for (const commonJsName of Object.keys(commonJsForms)) {
		const commonJs = commonJsForms[commonJsName];
		for (const esmName of Object.keys(esmForms)) {
			const esmForm = esmForms[esmName];
			for (const commonJsType of COMMONJS_TYPES) {
				for (const enteredFrom of ENTERED_FROM) {
					for (const usage of USAGES) {
						const id = `cycle/${commonJsName}/${esmName}/${commonJsType.slice(1)}/${enteredFrom}/${usage}`;
						const requests = {
							esm: JSON.stringify(`virtual:${id}/esm`),
							cjs: JSON.stringify(`virtual:${id}/cjs`)
						};
						modules[`${id}/esm`] = {
							type: ".js",
							source: () =>
								`${esmForm.source(requests.cjs)}\nexport function value() {\n\treturn "esm";\n}\n`
						};
						modules[`${id}/cjs`] = {
							type: commonJsType,
							source: () =>
								`${commonJs.source(requests.esm)}\nexports.value = function () {\n\treturn "cjs";\n};\nexports.getEsm = function () {\n\treturn require(${requests.esm});\n};\n`
						};
						const title = JSON.stringify(
							`${commonJsName} (${commonJsType}) × ${esmName}, entered from ${enteredFrom}, ${usage} usage`
						);
						modules[`${id}/test`] = {
							type: ".js",
							source: () =>
								testSource(
									`\`[\${VARIANT}] \` + ${title}`,
									commonJs,
									esmForm,
									enteredFrom,
									usage,
									requests
								)
						};
						tests.push(`import ${JSON.stringify(`virtual:${id}/test`)};`);
					}
				}
			}
		}
	}
	modules.tests = { type: ".js", source: () => tests.join("\n") };
	return modules;
};

/**
 * Fails the build when an ES module ends up providing `__esModule`, which only a
 * nested exports info merged through a redirect into another module can cause.
 * @param {Compiler} compiler compiler
 */
const checkEsModuleFlag = (compiler) => {
	compiler.hooks.compilation.tap("checkEsModuleFlag", (compilation) => {
		compilation.hooks.finishModules.tap(
			{ name: "checkEsModuleFlag", stage: 100 },
			(modules) => {
				for (const module of modules) {
					if (
						!module.buildMeta ||
						module.buildMeta.exportsType !== "namespace"
					) {
						continue;
					}
					const exportInfo = compilation.moduleGraph
						.getExportsInfo(module)
						.getReadOnlyExportInfo("__esModule");
					if (exportInfo.provided === true) {
						compilation.errors.push(
							new webpack.WebpackError(
								`${module.readableIdentifier(compilation.requestShortener)} provides __esModule`
							)
						);
					}
				}
			}
		);
	});
};

/** @type {Record<string, Configuration>} */
const variants = {
	plain: {
		mode: "production",
		optimization: {
			concatenateModules: false,
			mangleExports: false,
			minimize: false,
			moduleIds: "named"
		}
	},
	concatenated: {
		mode: "production",
		optimization: {
			concatenateModules: { commonjs: true },
			mangleExports: "deterministic",
			minimize: false
		}
	},
	minimized: {
		mode: "production",
		optimization: {
			concatenateModules: { commonjs: true },
			mangleExports: "size",
			minimize: true
		}
	},
	development: { mode: "development" }
};

/**
 * Creates the configuration building every cycle under one variant.
 * @param {keyof typeof variants} name variant name the tests read
 * @returns {Configuration} configuration
 */
const createReexportEsmCycleConfig = (name) => ({
	devtool: false,
	...variants[name],
	plugins: [
		new VirtualUrlPlugin(generateModules()),
		new webpack.DefinePlugin({ VARIANT: JSON.stringify(name) }),
		checkEsModuleFlag
	]
});

module.exports = createReexportEsmCycleConfig;
