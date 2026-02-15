"use strict";

require("./helpers/warmup-webpack");

const fs = require("fs");
const path = require("path");
const url = require("url");
const vm = require("vm");
const webpack = require("..");

const needDebug = typeof process.env.DEBUG !== "undefined";

const outputFileSystem = needDebug
	? require("fs")
	: (() => {
			const { Volume, createFsFromVolume } = require("memfs");

			return createFsFromVolume(new Volume());
		})();

const test262Dir = path.resolve(__dirname, "./test262-cases/");
const test262HarnessDir = path.resolve(test262Dir, "./harness");

/* cspell:disable */
const edgeCases = [
	// eval test cases require to be in global scope
	"eval-code/indirect/non-definable-global-var.js",
	"eval-code/indirect/this-value-func.js",
	"eval-code/indirect/this-value-global.js",
	"eval-code/indirect/var-env-func-init-global-new.js",
	"eval-code/indirect/var-env-func-init-global-update-non-configurable.js",
	"eval-code/indirect/var-env-var-init-global-new.js",
	"eval-code/direct/non-definable-global-var.js",
	"eval-code/direct/this-value-func-non-strict.js",
	"eval-code/direct/this-value-func-strict-source.js",
	"eval-code/direct/var-env-func-init-global-new.js",
	"eval-code/direct/var-env-var-init-global-new.js",

	// with and global `this` require to be in global scope
	"statements/with/S12.10_A1.10_T1.js",
	"statements/with/S12.10_A1.10_T2.js",
	"statements/with/S12.10_A1.10_T3.js",
	"statements/with/S12.10_A1.10_T4.js",
	"statements/with/S12.10_A1.10_T5.js",
	"statements/with/S12.10_A1.11_T1.js",
	"statements/with/S12.10_A1.11_T2.js",
	"statements/with/S12.10_A1.11_T3.js",
	"statements/with/S12.10_A1.11_T4.js",
	"statements/with/S12.10_A1.11_T5.js",
	"statements/with/S12.10_A1.12_T1.js",
	"statements/with/S12.10_A1.12_T2.js",
	"statements/with/S12.10_A1.12_T3.js",
	"statements/with/S12.10_A1.12_T4.js",
	"statements/with/S12.10_A1.12_T5.js",
	"statements/with/S12.10_A1.1_T1.js",
	"statements/with/S12.10_A1.1_T2.js",
	"statements/with/S12.10_A1.1_T3.js",
	"statements/with/S12.10_A1.2_T1.js",
	"statements/with/S12.10_A1.2_T2.js",
	"statements/with/S12.10_A1.2_T3.js",
	"statements/with/S12.10_A1.2_T4.js",
	"statements/with/S12.10_A1.2_T5.js",
	"statements/with/S12.10_A1.3_T1.js",
	"statements/with/S12.10_A1.3_T2.js",
	"statements/with/S12.10_A1.3_T3.js",
	"statements/with/S12.10_A1.3_T4.js",
	"statements/with/S12.10_A1.3_T5.js",
	"statements/with/S12.10_A1.4_T1.js",
	"statements/with/S12.10_A1.4_T2.js",
	"statements/with/S12.10_A1.4_T3.js",
	"statements/with/S12.10_A1.4_T4.js",
	"statements/with/S12.10_A1.4_T5.js",
	"statements/with/S12.10_A1.5_T1.js",
	"statements/with/S12.10_A1.5_T2.js",
	"statements/with/S12.10_A1.5_T3.js",
	"statements/with/S12.10_A1.5_T4.js",
	"statements/with/S12.10_A1.5_T5.js",
	"statements/with/S12.10_A1.6_T1.js",
	"statements/with/S12.10_A1.6_T2.js",
	"statements/with/S12.10_A1.6_T3.js",
	"statements/with/S12.10_A1.7_T1.js",
	"statements/with/S12.10_A1.7_T2.js",
	"statements/with/S12.10_A1.7_T3.js",
	"statements/with/S12.10_A1.7_T4.js",
	"statements/with/S12.10_A1.7_T5.js",
	"statements/with/S12.10_A1.8_T1.js",
	"statements/with/S12.10_A1.8_T2.js",
	"statements/with/S12.10_A1.8_T3.js",
	"statements/with/S12.10_A1.8_T4.js",
	"statements/with/S12.10_A1.8_T5.js",
	"statements/with/S12.10_A1.9_T1.js",
	"statements/with/S12.10_A1.9_T2.js",
	"statements/with/S12.10_A1.9_T3.js",
	"statements/with/S12.10_A3.10_T1.js",
	"statements/with/S12.10_A3.10_T2.js",
	"statements/with/S12.10_A3.10_T3.js",
	"statements/with/S12.10_A3.10_T4.js",
	"statements/with/S12.10_A3.10_T5.js",
	"statements/with/S12.10_A3.11_T3.js",
	"statements/with/S12.10_A3.11_T5.js",
	"statements/with/S12.10_A3.12_T1.js",
	"statements/with/S12.10_A3.12_T2.js",
	"statements/with/S12.10_A3.12_T3.js",
	"statements/with/S12.10_A3.12_T4.js",
	"statements/with/S12.10_A3.12_T5.js",
	"statements/with/S12.10_A3.1_T1.js",
	"statements/with/S12.10_A3.1_T2.js",
	"statements/with/S12.10_A3.1_T3.js",
	"statements/with/S12.10_A3.2_T1.js",
	"statements/with/S12.10_A3.2_T2.js",
	"statements/with/S12.10_A3.2_T3.js",
	"statements/with/S12.10_A3.2_T4.js",
	"statements/with/S12.10_A3.2_T5.js",
	"statements/with/S12.10_A3.3_T1.js",
	"statements/with/S12.10_A3.3_T2.js",
	"statements/with/S12.10_A3.3_T3.js",
	"statements/with/S12.10_A3.3_T4.js",
	"statements/with/S12.10_A3.4_T1.js",
	"statements/with/S12.10_A3.4_T2.js",
	"statements/with/S12.10_A3.4_T3.js",
	"statements/with/S12.10_A3.4_T4.js",
	"statements/with/S12.10_A3.4_T5.js",
	"statements/with/S12.10_A3.5_T1.js",
	"statements/with/S12.10_A3.5_T2.js",
	"statements/with/S12.10_A3.5_T3.js",
	"statements/with/S12.10_A3.5_T4.js",
	"statements/with/S12.10_A3.5_T5.js",
	"statements/with/S12.10_A3.6_T1.js",
	"statements/with/S12.10_A3.6_T2.js",
	"statements/with/S12.10_A3.6_T3.js",
	"statements/with/S12.10_A3.7_T1.js",
	"statements/with/S12.10_A3.7_T2.js",
	"statements/with/S12.10_A3.7_T3.js",
	"statements/with/S12.10_A3.7_T4.js",
	"statements/with/S12.10_A3.7_T5.js",
	"statements/with/S12.10_A3.8_T1.js",
	"statements/with/S12.10_A3.8_T2.js",
	"statements/with/S12.10_A3.8_T3.js",
	"statements/with/S12.10_A3.8_T4.js",
	"statements/with/S12.10_A3.8_T5.js",
	"statements/with/S12.10_A3.9_T1.js",
	"statements/with/S12.10_A3.9_T2.js",
	"statements/with/S12.10_A3.9_T3.js",
	"statements/variable/S12.2_A11.js",
	"statements/variable/S12.2_A11.js",
	"statements/variable/S12.2_A2.js",
	"statements/variable/S12.2_A9.js",
	"statements/variable/S12.2_A9.js",

	"statements/function/S13.2.2_A17_T2.js",
	"statements/function/S13.2.2_A17_T3.js",
	"statements/function/S13.2.2_A18_T1.js",
	"statements/function/S13.2.2_A18_T2.js",
	"statements/function/S13.2.2_A19_T7.js",

	// Using global `this`
	"types/reference/S8.7.2_A3.js",

	// Using eval and global `this`
	"expressions/arrow-function/arrow/binding-tests-1.js",
	"expressions/arrow-function/arrow/binding-tests-2.js",
	"expressions/arrow-function/arrow/binding-tests-3.js",

	// Using global `this`
	"expressions/typeof/get-value.js",

	// Using global `this`
	"types/object/S8.6.2_A5_T1.js",
	"types/object/S8.6.2_A5_T1.js",
	"types/object/S8.6.2_A5_T2.js",
	"types/object/S8.6.2_A5_T2.js",
	"types/object/S8.6.2_A5_T3.js",
	"types/object/S8.6.2_A5_T3.js",
	"types/object/S8.6.2_A5_T4.js",
	"types/object/S8.6.2_A5_T4.js",

	// Using global `this`
	"statements/try/12.14-14.js",
	"statements/try/12.14-15.js",
	"statements/try/12.14-16.js",

	"statements/let/syntax/escaped-let.js",

	// Using global `this`
	"function-code/10.4.3-1-101-s.js",
	"function-code/10.4.3-1-101gs.js",
	"function-code/10.4.3-1-19-s.js",
	"function-code/10.4.3-1-19gs.js",
	"function-code/10.4.3-1-20gs.js",
	"function-code/10.4.3-1-45-s.js",
	"function-code/10.4.3-1-45gs.js",
	"function-code/10.4.3-1-46-s.js",
	"function-code/10.4.3-1-46gs.js",
	"function-code/10.4.3-1-47-s.js",
	"function-code/10.4.3-1-47gs.js",
	"function-code/10.4.3-1-48-s.js",
	"function-code/10.4.3-1-48gs.js",
	"function-code/10.4.3-1-49-s.js",
	"function-code/10.4.3-1-49gs.js",
	"function-code/10.4.3-1-50-s.js",
	"function-code/10.4.3-1-50gs.js",
	"function-code/10.4.3-1-51-s.js",
	"function-code/10.4.3-1-51gs.js",
	"function-code/10.4.3-1-52-s.js",
	"function-code/10.4.3-1-52gs.js",
	"function-code/10.4.3-1-53-s.js",
	"function-code/10.4.3-1-53gs.js",
	"function-code/10.4.3-1-64-s.js",
	"function-code/10.4.3-1-65-s.js",
	"function-code/10.4.3-1-83-s.js",
	"function-code/10.4.3-1-84-s.js",
	"function-code/10.4.3-1-86-s.js",
	"function-code/10.4.3-1-86gs.js",
	"function-code/10.4.3-1-87-s.js",
	"function-code/10.4.3-1-87gs.js",
	"function-code/10.4.3-1-90-s.js",
	"function-code/10.4.3-1-90gs.js",
	"function-code/10.4.3-1-91-s.js",
	"function-code/10.4.3-1-91gs.js",
	"function-code/10.4.3-1-92-s.js",
	"function-code/10.4.3-1-92gs.js",
	"function-code/10.4.3-1-95-s.js",
	"function-code/10.4.3-1-95gs.js",
	"function-code/10.4.3-1-96-s.js",
	"function-code/10.4.3-1-96gs.js",
	"function-code/10.4.3-1-97-s.js",
	"function-code/10.4.3-1-97gs.js",

	// Using global this
	"identifier-resolution/S11.1.2_A1_T1.js",

	// Using global this in `return`
	"expressions/this/S11.1.1_A3.1.js",
	"expressions/this/S11.1.1_A4.1.js",

	// Using this
	"expressions/tagged-template/call-expression-context-no-strict.js",

	// Using this
	"expressions/property-accessors/S11.2.1_A4_T1.js",

	// Using this
	"statements/async-function/evaluation-this-value-global.js",

	// Using global this
	"global-code/S10.4.1_A1_T1.js",
	"global-code/S10.4.1_A1_T2.js",
	"global-code/decl-var.js",
	"global-code/decl-lex-configurable-global.js",
	"global-code/script-decl-lex-deletion.js",
	"global-code/script-decl-lex-lex.js",
	"global-code/script-decl-lex-restricted-global.js",
	"global-code/script-decl-lex-var.js",

	"expressions/delete/S11.4.1_A3.1.js",

	"expressions/assignment/11.13.1-4-1.js",
	"expressions/assignment/11.13.1-4-27-s.js",
	"expressions/assignment/11.13.1-4-3-s.js"
];
/* cspell:enable */
const edgeCasesRegExp = new RegExp(
	edgeCases
		.map((s) => `(?:${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$)`)
		.join("|")
);

const compile = async (entry, scenario, options = {}) =>
	new Promise((resolve, reject) => {
		const compiler = webpack({
			...options,
			entry,
			context: path.dirname(entry),
			output: {
				...options.output,
				...(scenario === "module" ? { module: true } : { iife: false })
			},
			mode: "development",
			target: "node",
			devtool: false,
			stats: "errors-warnings",
			performance: false,
			experiments: {
				outputModule: scenario === "module",
				deferImport: true
			},
			module: {
				parser: {
					javascript: {
						// For dynamic import test cases
						exprContextRegExp: /.*_FIXTURE\.js$/,
						exprContextRequest: path.dirname(entry),
						exprContextCritical: false,
						// For testing purposes, where the `export` is tested that it is not defined
						exportsPresence: false,
						reexportExportsPresence: false
					}
				},
				rules:
					// For top level await, maybe we can improve our parser to detect and switch to module
					scenario === "module"
						? [
								{
									test: /\.js$/,
									type: "javascript/esm"
								}
							]
						: [
								// TODO do we need to use just `javascript/dynamic`?
								{
									test: edgeCasesRegExp,
									parser: {
										commonjs: false,
										amd: false,
										harmony: false,
										requireJs: false,
										system: false
									}
								}
							]
			}
		});

		compiler.outputFileSystem = outputFileSystem;
		compiler.run((err, stats) => {
			if (err) {
				reject(err);
				return;
			}

			compiler.close((err) => {
				if (err) {
					reject(err);
					return;
				}

				resolve(stats);
			});
		});
	});

const extractYamlArray = (meta, key) => {
	const regex = new RegExp(`${key}:\\s*\\[?([^\\]\\n]+)\\]?`);
	const match = meta.match(regex);
	if (!match) return [];

	return match[1]
		.split(",")
		.map((s) => s.trim().replace(/['"]/g, ""))
		.filter(Boolean);
};

const getTest262Meta = (content) => {
	const metaMatch = content.match(/\/\*---([\s\S]*?)---\*\//);
	if (!metaMatch) {
		return { flags: [], features: [], includes: [], negative: null };
	}

	const meta = metaMatch[1];

	const features = extractYamlArray(meta, "features");
	const flags = extractYamlArray(meta, "flags");

	const includes = extractYamlArray(meta, "includes");

	const negativeMatch = meta.match(
		/negative:[\s\S]*?phase:\s*(\w+)[\s\S]*?type:\s*(\w+)/
	);
	const negative = negativeMatch
		? { phase: negativeMatch[1], type: negativeMatch[2] }
		: null;

	return { features, flags, includes, negative };
};

const createRequire = (currentDir, context) =>
	function require(modulePath) {
		const resolvedPath = path.resolve(
			currentDir,
			modulePath.endsWith(".js") ? modulePath : `${modulePath}.js`
		);

		const code = outputFileSystem.readFileSync(resolvedPath, "utf8");

		const module = { exports: {} };
		const exports = module.exports;

		const wrapper = vm.runInNewContext(
			`(function(exports, require, module, __filename, __dirname) { ${code} \n})`,
			context
		);

		wrapper(
			exports,
			createRequire(path.dirname(resolvedPath)),
			module,
			resolvedPath,
			path.dirname(resolvedPath)
		);

		return module.exports;
	};

const create262Host = () => {
	const sandbox = vm.runInNewContext("this");
	const context = vm.createContext(sandbox);

	const host = {
		global: context,
		evalScript(code, options = {}) {
			return vm.runInContext(code, context, options);
		},
		createRealm() {
			return create262Host();
		}
	};

	context.global = context;
	context.globalThis = context;
	context.$262 = host;

	return host;
};

const createImportModuleDynamically =
	(context, testFile, moduleCache) => async (specifier, referencing) => {
		const identifier = referencing.identifier
			? path.resolve(path.dirname(referencing.identifier), specifier)
			: path.resolve(path.dirname(testFile), specifier);

		if (moduleCache.has(identifier)) {
			return moduleCache.get(identifier);
		}

		const code = await outputFileSystem.promises.readFile(identifier, "utf8");
		const module = new vm.SourceTextModule(code, {
			context,
			identifier,
			importModuleDynamically: createImportModuleDynamically(
				context,
				testFile,
				moduleCache
			)
		});

		moduleCache.set(identifier, module);

		await module.link(
			createImportModuleDynamically(context, testFile, moduleCache)
		);

		return module;
	};

const runModule = async (context, code, identifier, testFile, moduleCache) => {
	const module = new vm.SourceTextModule(code, {
		context,
		identifier,
		importModuleDynamically: createImportModuleDynamically(
			context,
			testFile,
			moduleCache
		),
		initializeImportMeta: (meta) => {
			meta.url = url.pathToFileURL(identifier).toString();
		}
	});

	await module.link(async () => {});
	await module.evaluate();

	return module;
};

const runScript = (
	context,
	code,
	identifier,
	testFile,
	moduleCache,
	options = {}
) => {
	const script = new vm.Script(code, {
		filename: identifier,
		lineOffset: options.lineOffset || 0,
		columnOffset: options.columnOffset || 0,
		importModuleDynamically: createImportModuleDynamically(
			context,
			testFile,
			moduleCache
		)
	});

	script.runInContext(context, {
		displayErrors: true
	});
};

const baseDir = path.posix.resolve(test262Dir, "./test/language/");

/* cspell:disable */
const knownBugs = [
	// Node.js problems and bugs
	// Optimizations bugs with `--` and `++`
	"expressions/postfix-decrement/S11.3.2_A6_T3.js",
	"expressions/postfix-decrement/S11.3.2_A5_T3.js",
	"expressions/postfix-decrement/S11.3.2_A5_T2.js",
	"expressions/postfix-decrement/S11.3.2_A5_T1.js",
	"expressions/postfix-increment/S11.3.1_A6_T3.js",
	"expressions/postfix-increment/S11.3.1_A5_T3.js",
	"expressions/postfix-increment/S11.3.1_A5_T2.js",
	"expressions/postfix-increment/S11.3.1_A5_T1.js",
	"expressions/prefix-decrement/S11.4.5_A6_T3.js",
	"expressions/prefix-decrement/S11.4.5_A6_T3.js",
	"expressions/prefix-decrement/S11.4.5_A5_T3.js",
	"expressions/prefix-decrement/S11.4.5_A5_T2.js",
	"expressions/prefix-decrement/S11.4.5_A5_T1.js",
	"expressions/prefix-increment/S11.4.4_A6_T3.js",
	"expressions/prefix-increment/S11.4.4_A6_T3.js",
	"expressions/prefix-increment/S11.4.4_A5_T3.js",
	"expressions/prefix-increment/S11.4.4_A5_T2.js",
	"expressions/prefix-increment/S11.4.4_A5_T1.js",
	// Eval and spread
	"expressions/call/eval-spread.js",
	// Doesn't work
	"destructuring/binding/keyed-destructuring-property-reference-target-evaluation-order-with-bindings.js",
	// Proxy and `with` incompatibility
	"statements/with/get-binding-value-call-with-proxy-env.js",
	"statements/with/get-binding-value-idref-with-proxy-env.js",
	// await using bugs
	"statements/await-using/syntax/await-using-invalid-assignment-statement-body-for-of.js",
	// Bug with `Object.preventExtensions` and classes
	"statements/class/subclass/private-class-field-on-nonextensible-return-override.js",
	"statements/class/elements/private-class-field-on-nonextensible-objects.js",
	// Bug in `g.prototype` on V8 side
	"statements/async-generator/generator-created-after-decl-inst.js",
	// V8 optimization bug
	"statements/variable/binding-resolution.js",
	// Different V8 bugs with `with`
	"expressions/compound-assignment/S11.13.2_A5.10_T1.js",
	"expressions/compound-assignment/S11.13.2_A5.10_T2.js",
	"expressions/compound-assignment/S11.13.2_A5.10_T3.js",
	"expressions/compound-assignment/S11.13.2_A5.11_T1.js",
	"expressions/compound-assignment/S11.13.2_A5.11_T2.js",
	"expressions/compound-assignment/S11.13.2_A5.11_T3.js",
	"expressions/compound-assignment/S11.13.2_A5.1_T1.js",
	"expressions/compound-assignment/S11.13.2_A5.1_T2.js",
	"expressions/compound-assignment/S11.13.2_A5.1_T3.js",
	"expressions/compound-assignment/S11.13.2_A5.2_T1.js",
	"expressions/compound-assignment/S11.13.2_A5.2_T2.js",
	"expressions/compound-assignment/S11.13.2_A5.2_T3.js",
	"expressions/compound-assignment/S11.13.2_A5.3_T1.js",
	"expressions/compound-assignment/S11.13.2_A5.3_T2.js",
	"expressions/compound-assignment/S11.13.2_A5.3_T3.js",
	"expressions/compound-assignment/S11.13.2_A5.4_T1.js",
	"expressions/compound-assignment/S11.13.2_A5.4_T2.js",
	"expressions/compound-assignment/S11.13.2_A5.4_T3.js",
	"expressions/compound-assignment/S11.13.2_A5.5_T1.js",
	"expressions/compound-assignment/S11.13.2_A5.5_T2.js",
	"expressions/compound-assignment/S11.13.2_A5.5_T3.js",
	"expressions/compound-assignment/S11.13.2_A5.6_T1.js",
	"expressions/compound-assignment/S11.13.2_A5.6_T2.js",
	"expressions/compound-assignment/S11.13.2_A5.6_T3.js",
	"expressions/compound-assignment/S11.13.2_A5.7_T1.js",
	"expressions/compound-assignment/S11.13.2_A5.7_T2.js",
	"expressions/compound-assignment/S11.13.2_A5.7_T3.js",
	"expressions/compound-assignment/S11.13.2_A5.8_T1.js",
	"expressions/compound-assignment/S11.13.2_A5.8_T2.js",
	"expressions/compound-assignment/S11.13.2_A5.8_T3.js",
	"expressions/compound-assignment/S11.13.2_A5.9_T1.js",
	"expressions/compound-assignment/S11.13.2_A5.9_T2.js",
	"expressions/compound-assignment/S11.13.2_A5.9_T3.js",
	"expressions/compound-assignment/S11.13.2_A6.10_T1.js",
	"expressions/compound-assignment/S11.13.2_A6.11_T1.js",
	"expressions/compound-assignment/S11.13.2_A6.1_T1.js",
	"expressions/compound-assignment/S11.13.2_A6.2_T1.js",
	"expressions/compound-assignment/S11.13.2_A6.3_T1.js",
	"expressions/compound-assignment/S11.13.2_A6.4_T1.js",
	"expressions/compound-assignment/S11.13.2_A6.5_T1.js",
	"expressions/compound-assignment/S11.13.2_A6.6_T1.js",
	"expressions/compound-assignment/S11.13.2_A6.7_T1.js",
	"expressions/compound-assignment/S11.13.2_A6.8_T1.js",
	"expressions/compound-assignment/S11.13.2_A6.9_T1.js",
	"expressions/compound-assignment/S11.13.2_A7.10_T4.js",
	"expressions/compound-assignment/S11.13.2_A7.10_T4.js",
	"expressions/compound-assignment/S11.13.2_A7.11_T4.js",
	"expressions/compound-assignment/S11.13.2_A7.11_T4.js",
	"expressions/compound-assignment/S11.13.2_A7.1_T4.js",
	"expressions/compound-assignment/S11.13.2_A7.2_T4.js",
	"expressions/compound-assignment/S11.13.2_A7.3_T4.js",
	"expressions/compound-assignment/S11.13.2_A7.4_T4.js",
	"expressions/compound-assignment/S11.13.2_A7.5_T4.js",
	"expressions/compound-assignment/S11.13.2_A7.6_T4.js",
	"expressions/compound-assignment/S11.13.2_A7.7_T4.js",
	"expressions/compound-assignment/S11.13.2_A7.8_T4.js",
	"expressions/compound-assignment/S11.13.2_A7.9_T4.js",

	// V8 bugs with `eval` and global `this`
	"eval-code/direct/var-env-func-init-global-update-configurable.js",
	"eval-code/direct/var-env-var-init-global-exstng.js",

	// acorn bugs
	"identifiers/part-unicode-17.0.0-class-escaped.js",
	"identifiers/part-unicode-17.0.0-class.js",
	"identifiers/part-unicode-17.0.0-escaped.js",
	"identifiers/part-unicode-17.0.0.js",
	"identifiers/start-unicode-17.0.0-class-escaped.js",
	"identifiers/start-unicode-17.0.0-class.js",
	"identifiers/start-unicode-17.0.0-escaped.js",
	"identifiers/start-unicode-17.0.0.js",
	"statements/using/syntax/using-for-statement.js",
	"statements/await-using/syntax/await-using-invalid-arraybindingpattern-does-not-break-element-access.js",

	// Expected error because we use `Promise` to load modules, but this test overrides global `Promise`
	"expressions/dynamic-import/returns-promise.js",

	// webpack bugs and improvements
	// With namespace import we export and value and `default`, by spec we should export only `default`
	"import/import-attributes/json-via-namespace.js",
	// When we have the second argument we need to generate code (pseudo): ((v) => __webpack_require__.e(/*! import() */ "2nd-param_FIXTURE_js").then(__webpack_require__.bind(__webpack_require__, /*! ./2nd-param_FIXTURE.js */ "./2nd-param_FIXTURE.js")))(yield)
	"expressions/dynamic-import/import-attributes/2nd-param-yield-ident-invalid.js",
	"expressions/dynamic-import/import-attributes/2nd-param-yield-expr.js",
	"expressions/dynamic-import/import-attributes/2nd-param-evaluation-abrupt-return.js",
	"expressions/dynamic-import/import-attributes/2nd-param-evaluation-abrupt-throw.js",
	"expressions/dynamic-import/import-attributes/2nd-param-evaluation-sequence.js",
	"expressions/dynamic-import/import-attributes/2nd-param-get-with-error.js",
	"expressions/dynamic-import/import-attributes/2nd-param-non-object.js",
	"expressions/dynamic-import/import-attributes/2nd-param-with-enumeration-abrupt.js",
	"expressions/dynamic-import/import-attributes/2nd-param-with-enumeration-enumerable.js",
	"expressions/dynamic-import/import-attributes/2nd-param-with-non-object.js",
	"expressions/dynamic-import/import-attributes/2nd-param-with-value-abrupt.js",
	"expressions/dynamic-import/import-attributes/2nd-param-with-value-non-string.js",
	"expressions/dynamic-import/import-attributes/2nd-param-evaluation-abrupt-return.js",
	"expressions/dynamic-import/import-attributes/2nd-param-evaluation-abrupt-throw.js",
	"expressions/dynamic-import/import-attributes/2nd-param-evaluation-sequence.js",
	// Bugs with defer
	"import/import-defer/evaluation-triggers/ignore-exported-then-defineOwnProperty.js",
	"import/import-defer/evaluation-triggers/ignore-exported-then-super-property-define.js",
	"import/import-defer/evaluation-triggers/ignore-not-exported-then-defineOwnProperty.js",
	"import/import-defer/evaluation-triggers/ignore-not-exported-then-super-property-define.js",
	"import/import-defer/evaluation-triggers/ignore-private-name-access.js",
	"import/import-defer/evaluation-triggers/ignore-set-string-exported.js",
	"import/import-defer/evaluation-triggers/ignore-set-string-not-exported.js",
	"import/import-defer/evaluation-triggers/ignore-super-property-set-exported.js",
	"import/import-defer/evaluation-triggers/ignore-super-property-set-not-exported.js",
	"import/import-defer/evaluation-triggers/ignore-symbol-other-defineOwnProperty.js",
	"import/import-defer/evaluation-triggers/ignore-symbol-other-get-in-prototype.js",
	"import/import-defer/evaluation-triggers/ignore-symbol-other-get.js",
	"import/import-defer/evaluation-triggers/ignore-symbol-other-getOwnProperty.js",
	"import/import-defer/evaluation-triggers/ignore-symbol-other-hasProperty-in-prototype.js",
	"import/import-defer/evaluation-triggers/ignore-symbol-other-hasProperty.js",
	"import/import-defer/evaluation-triggers/ignore-symbol-other-super-get.js",
	"import/import-defer/evaluation-triggers/ignore-symbol-other-super-property-define.js",
	"import/import-defer/evaluation-triggers/ignore-symbol-toStringTag-defineOwnProperty.js",
	"import/import-defer/evaluation-triggers/ignore-symbol-toStringTag-getOwnProperty.js",
	"import/import-defer/evaluation-triggers/ignore-symbol-toStringTag-super-property-define.js",
	"import/import-defer/evaluation-triggers/trigger-exported-string-delete.js",
	"import/import-defer/evaluation-triggers/trigger-not-exported-string-delete.js",
	// Bugs with defer and evaluation
	"import/import-defer/deferred-namespace-object/identity.js",
	"import/import-defer/deferred-namespace-object/to-string-tag.js",
	"import/import-defer/errors/resolution-error/import-defer-of-missing-module-fails.js",
	"import/import-defer/errors/get-self-while-evaluating-async/main.js",
	"import/import-defer/evaluation-top-level-await/flattening-order/main.js",
	// Bugs with using the same module require with defer and without - should we generate two modules here?
	"import/import-defer/errors/module-throws/defer-import-after-evaluation.js",
	"import/import-defer/errors/module-throws/third-party-evaluation-after-defer-import.js",
	"import/import-defer/errors/module-throws/trigger-evaluation.js",
	// Complex examples, need to think how to resolve it
	"import/import-defer/errors/get-self-while-defer-evaluating/main.js",
	"import/import-defer/errors/get-other-while-evaluating-async/main.js",
	"import/import-defer/errors/get-other-while-evaluating/main.js",
	"import/import-defer/errors/get-other-while-dep-evaluating-async/main.js",
	"import/import-defer/errors/get-other-while-dep-evaluating/main.js",
	// Just bugs, need to fix
	"import/import-defer/deferred-namespace-object/exotic-object-behavior.js",
	// Bug when import itself
	"import/import-defer/errors/get-self-while-evaluating.js",
	// Bug with place of `__webpack_require__`, it hoists, but should not
	"module-code/instn-star-binding.js",
	// Improvement- bug with `delete` and `ns[0] = something` when using `import * as ns from "...";`
	"module-code/export-expname-binding-index.js",
	// When two `export * from "one"; export * from "two";` re-exports the same export, it should be false for `in`
	"module-code/ambiguous-export-bindings/omitted-from-namespace.js",
	// Bug when you export `valueOf` and use `Number`
	"expressions/dynamic-import/custom-primitive.js",
	// Bug with using `var a = import.meta;`, ideally we need to hoist this and using the same object in any usage
	"expressions/import.meta/same-object-returned.js",
	// Potential improvement to keep `import.meta` as is
	"expressions/import.meta/syntax/goal-module-nested-function.js",
	"expressions/import.meta/syntax/goal-module.js",
	"expressions/import.meta/syntax/goal-script.js",
	"expressions/import.meta/import-meta-is-an-ordinary-object.js",
	"expressions/import.meta/distinct-for-each-module.js",
	// We should throw `SyntaxError` here instead `Can't resolve`
	"expressions/dynamic-import/syntax/invalid/nested-arrow-assignment-expression-import-defer-no-new-call-expression.js",
	"expressions/dynamic-import/syntax/invalid/nested-arrow-import-defer-no-new-call-expression.js",
	"expressions/dynamic-import/syntax/invalid/nested-async-arrow-function-await-import-defer-no-new-call-expression.js",
	"expressions/dynamic-import/syntax/invalid/nested-async-arrow-function-return-await-import-defer-no-new-call-expression.js",
	"expressions/dynamic-import/syntax/invalid/nested-async-function-await-import-defer-no-new-call-expression.js",
	"expressions/dynamic-import/syntax/invalid/nested-async-function-import-defer-no-new-call-expression.js",
	"expressions/dynamic-import/syntax/invalid/nested-async-function-return-await-import-defer-no-new-call-expression.js",
	"expressions/dynamic-import/syntax/invalid/nested-async-gen-await-import-defer-no-new-call-expression.js",
	"expressions/dynamic-import/syntax/invalid/nested-block-import-defer-no-new-call-expression.js",
	"expressions/dynamic-import/syntax/invalid/nested-block-labeled-import-defer-no-new-call-expression.js",
	"expressions/dynamic-import/syntax/invalid/nested-do-while-import-defer-no-new-call-expression.js",
	"expressions/dynamic-import/syntax/invalid/nested-else-braceless-import-defer-no-new-call-expression.js",
	"expressions/dynamic-import/syntax/invalid/nested-else-import-defer-no-new-call-expression.js",
	"expressions/dynamic-import/syntax/invalid/nested-function-import-defer-no-new-call-expression.js",
	"expressions/dynamic-import/syntax/invalid/nested-function-return-import-defer-no-new-call-expression.js",
	"expressions/dynamic-import/syntax/invalid/nested-if-braceless-import-defer-no-new-call-expression.js",
	"expressions/dynamic-import/syntax/invalid/nested-if-import-defer-no-new-call-expression.js",
	"expressions/dynamic-import/syntax/invalid/nested-while-import-defer-no-new-call-expression.js",
	"expressions/dynamic-import/syntax/invalid/nested-with-expression-import-defer-no-new-call-expression.js",

	// Not a bug, we are adding the `__esModule` property, so we need to think how fix tests
	"module-code/namespace/internals/own-property-keys-binding-types.js",
	"module-code/namespace/internals/own-property-keys-sort.js",

	// Potential improvement for enumerate
	"module-code/namespace/internals/enumerate-binding-uninit.js",

	// Replacing `export default` will remove `default` name by spec, need to `static name = "default";` if doesn't exist
	"expressions/class/elements/class-name-static-initializer-default-export.js",
	"module-code/eval-export-dflt-cls-anon.js",
	"module-code/eval-export-dflt-expr-cls-anon.js",
	"module-code/eval-export-dflt-expr-fn-anon.js",
	"module-code/eval-export-dflt-expr-gen-anon.js",

	// V8 bugs
	"expressions/compound-assignment/compound-assignment-operator-calls-putvalue-lref--v--19.js",
	"expressions/compound-assignment/compound-assignment-operator-calls-putvalue-lref--v--21.js",
	"expressions/compound-assignment/compound-assignment-operator-calls-putvalue-lref--v--3.js",
	"expressions/compound-assignment/compound-assignment-operator-calls-putvalue-lref--v--5.js",
	"expressions/compound-assignment/compound-assignment-operator-calls-putvalue-lref--v--7.js",
	"expressions/compound-assignment/compound-assignment-operator-calls-putvalue-lref--v--9.js",
	"expressions/compound-assignment/compound-assignment-operator-calls-putvalue-lref--v--1.js",
	"expressions/compound-assignment/compound-assignment-operator-calls-putvalue-lref--v--11.js",
	"expressions/compound-assignment/compound-assignment-operator-calls-putvalue-lref--v--13.js",
	"expressions/compound-assignment/compound-assignment-operator-calls-putvalue-lref--v--15.js",
	"expressions/compound-assignment/compound-assignment-operator-calls-putvalue-lref--v--17.js",

	// improve test runner to keep dynamic import for such case
	"expressions/dynamic-import/assign-expr-get-value-abrupt-throws.js",

	// evals, we need to think how tests them in the right way
	"eval-code/direct/async-gen-func-decl-fn-body-cntns-arguments-func-decl-declare-arguments-and-assign.js",
	"eval-code/direct/async-gen-func-decl-fn-body-cntns-arguments-func-decl-declare-arguments.js",
	"eval-code/direct/async-gen-func-decl-fn-body-cntns-arguments-lex-bind-declare-arguments-and-assign.js",
	"eval-code/direct/async-gen-func-decl-fn-body-cntns-arguments-lex-bind-declare-arguments.js",
	"eval-code/direct/async-gen-func-decl-fn-body-cntns-arguments-var-bind-declare-arguments-and-assign.js",
	"eval-code/direct/async-gen-func-decl-fn-body-cntns-arguments-var-bind-declare-arguments.js",
	"eval-code/direct/async-gen-named-func-expr-fn-body-cntns-arguments-lex-bind-declare-arguments.js",
	"eval-code/direct/async-gen-named-func-expr-fn-body-cntns-arguments-var-bind-declare-arguments-and-assign.js",
	"eval-code/direct/async-gen-named-func-expr-fn-body-cntns-arguments-var-bind-declare-arguments.js",
	"eval-code/direct/func-decl-fn-body-cntns-arguments-func-decl-declare-arguments-and-assign.js",
	"eval-code/direct/func-decl-fn-body-cntns-arguments-func-decl-declare-arguments.js",
	"eval-code/direct/func-decl-fn-body-cntns-arguments-lex-bind-declare-arguments-and-assign.js",
	"eval-code/direct/func-decl-fn-body-cntns-arguments-lex-bind-declare-arguments.js",
	"eval-code/direct/func-decl-fn-body-cntns-arguments-var-bind-declare-arguments-and-assign.js",
	"eval-code/direct/func-decl-fn-body-cntns-arguments-var-bind-declare-arguments.js",
	"eval-code/direct/func-decl-no-pre-existing-arguments-bindings-are-present-declare-arguments-and-assign.js",
	"eval-code/direct/func-decl-no-pre-existing-arguments-bindings-are-present-declare-arguments.js",
	"eval-code/direct/func-expr-fn-body-cntns-arguments-func-decl-declare-arguments-and-assign.js",
	"eval-code/direct/func-expr-fn-body-cntns-arguments-func-decl-declare-arguments.js",
	"eval-code/direct/func-expr-fn-body-cntns-arguments-lex-bind-declare-arguments-and-assign.js",
	"eval-code/direct/func-expr-fn-body-cntns-arguments-lex-bind-declare-arguments.js",
	"eval-code/direct/func-expr-fn-body-cntns-arguments-var-bind-declare-arguments-and-assign.js",
	"eval-code/direct/func-expr-fn-body-cntns-arguments-var-bind-declare-arguments.js",
	"eval-code/direct/func-expr-no-pre-existing-arguments-bindings-are-present-declare-arguments-and-assign.js",
	"eval-code/direct/func-expr-no-pre-existing-arguments-bindings-are-present-declare-arguments.js",
	"eval-code/direct/gen-func-decl-fn-body-cntns-arguments-func-decl-declare-arguments-and-assign.js",
	"eval-code/direct/gen-func-decl-fn-body-cntns-arguments-func-decl-declare-arguments.js",
	"eval-code/direct/gen-func-decl-fn-body-cntns-arguments-lex-bind-declare-arguments-and-assign.js",
	"eval-code/direct/gen-func-decl-fn-body-cntns-arguments-lex-bind-declare-arguments.js",
	"eval-code/direct/gen-func-decl-fn-body-cntns-arguments-var-bind-declare-arguments-and-assign.js",
	"eval-code/direct/gen-func-decl-fn-body-cntns-arguments-var-bind-declare-arguments.js",
	"eval-code/direct/gen-func-decl-no-pre-existing-arguments-bindings-are-present-declare-arguments-and-assign.js",
	"eval-code/direct/gen-func-decl-no-pre-existing-arguments-bindings-are-present-declare-arguments.js",
	"eval-code/direct/gen-func-expr-named-fn-body-cntns-arguments-func-decl-declare-arguments-and-assign.js",
	"eval-code/direct/gen-func-expr-named-fn-body-cntns-arguments-func-decl-declare-arguments.js",
	"eval-code/direct/gen-func-expr-named-fn-body-cntns-arguments-lex-bind-declare-arguments-and-assign.js",
	"eval-code/direct/gen-func-expr-named-fn-body-cntns-arguments-lex-bind-declare-arguments.js",
	"eval-code/direct/gen-func-expr-named-fn-body-cntns-arguments-var-bind-declare-arguments-and-assign.js",
	"eval-code/direct/gen-func-expr-named-fn-body-cntns-arguments-var-bind-declare-arguments.js",
	"eval-code/direct/gen-func-expr-named-no-pre-existing-arguments-bindings-are-present-declare-arguments-and-assign.js",
	"eval-code/direct/gen-func-expr-named-no-pre-existing-arguments-bindings-are-present-declare-arguments.js",
	"eval-code/direct/gen-func-expr-nameless-fn-body-cntns-arguments-func-decl-declare-arguments-and-assign.js",
	"eval-code/direct/gen-func-expr-nameless-fn-body-cntns-arguments-func-decl-declare-arguments.js",
	"eval-code/direct/gen-func-expr-nameless-fn-body-cntns-arguments-lex-bind-declare-arguments-and-assign.js",
	"eval-code/direct/gen-func-expr-nameless-fn-body-cntns-arguments-lex-bind-declare-arguments.js",
	"eval-code/direct/gen-func-expr-nameless-fn-body-cntns-arguments-var-bind-declare-arguments-and-assign.js",
	"eval-code/direct/gen-func-expr-nameless-fn-body-cntns-arguments-var-bind-declare-arguments.js",
	"eval-code/direct/gen-func-expr-nameless-no-pre-existing-arguments-bindings-are-present-declare-arguments-and-assign.js",
	"eval-code/direct/gen-func-expr-nameless-no-pre-existing-arguments-bindings-are-present-declare-arguments.js",
	"eval-code/direct/gen-meth-fn-body-cntns-arguments-func-decl-declare-arguments-and-assign.js",
	"eval-code/direct/gen-meth-fn-body-cntns-arguments-func-decl-declare-arguments.js",
	"eval-code/direct/gen-meth-fn-body-cntns-arguments-lex-bind-declare-arguments-and-assign.js",
	"eval-code/direct/gen-meth-fn-body-cntns-arguments-lex-bind-declare-arguments.js",
	"eval-code/direct/gen-meth-fn-body-cntns-arguments-var-bind-declare-arguments-and-assign.js",
	"eval-code/direct/gen-meth-fn-body-cntns-arguments-var-bind-declare-arguments.js",
	"eval-code/direct/gen-meth-no-pre-existing-arguments-bindings-are-present-declare-arguments-and-assign.js",
	"eval-code/direct/gen-meth-no-pre-existing-arguments-bindings-are-present-declare-arguments.js",
	"eval-code/direct/meth-fn-body-cntns-arguments-func-decl-declare-arguments-and-assign.js",
	"eval-code/direct/meth-fn-body-cntns-arguments-func-decl-declare-arguments.js",
	"eval-code/direct/meth-fn-body-cntns-arguments-lex-bind-declare-arguments-and-assign.js",
	"eval-code/direct/meth-fn-body-cntns-arguments-lex-bind-declare-arguments.js",
	"eval-code/direct/meth-fn-body-cntns-arguments-var-bind-declare-arguments-and-assign.js",
	"eval-code/direct/meth-fn-body-cntns-arguments-var-bind-declare-arguments.js",
	"eval-code/direct/meth-no-pre-existing-arguments-bindings-are-present-declare-arguments-and-assign.js",
	"eval-code/direct/meth-no-pre-existing-arguments-bindings-are-present-declare-arguments.js",
	"eval-code/direct/async-gen-func-decl-no-pre-existing-arguments-bindings-are-present-declare-arguments.js",
	"eval-code/direct/async-gen-func-decl-no-pre-existing-arguments-bindings-are-present-declare-arguments-and-assign.js",
	"eval-code/direct/async-gen-func-expr-fn-body-cntns-arguments-var-bind-declare-arguments.js",
	"eval-code/direct/async-gen-func-expr-fn-body-cntns-arguments-var-bind-declare-arguments-and-assign.js",
	"eval-code/direct/async-gen-func-expr-fn-body-cntns-arguments-lex-bind-declare-arguments.js",
	"eval-code/direct/async-gen-func-expr-fn-body-cntns-arguments-lex-bind-declare-arguments-and-assign.js",
	"eval-code/direct/async-gen-func-expr-fn-body-cntns-arguments-func-decl-declare-arguments.js",
	"eval-code/direct/async-gen-func-expr-fn-body-cntns-arguments-func-decl-declare-arguments-and-assign.js",
	"eval-code/direct/async-gen-func-expr-no-pre-existing-arguments-bindings-are-present-declare-arguments-and-assign.js",
	"eval-code/direct/async-gen-meth-fn-body-cntns-arguments-var-bind-declare-arguments-and-assign.js",
	"eval-code/direct/async-gen-meth-fn-body-cntns-arguments-lex-bind-declare-arguments.js",
	"eval-code/direct/async-gen-meth-fn-body-cntns-arguments-lex-bind-declare-arguments-and-assign.js",
	"eval-code/direct/async-gen-meth-fn-body-cntns-arguments-func-decl-declare-arguments.js",
	"eval-code/direct/async-gen-meth-fn-body-cntns-arguments-func-decl-declare-arguments-and-assign.js",
	"eval-code/direct/async-gen-func-expr-no-pre-existing-arguments-bindings-are-present-declare-arguments.js",
	"eval-code/direct/async-gen-named-func-expr-fn-body-cntns-arguments-lex-bind-declare-arguments-and-assign.js",
	"eval-code/direct/async-gen-named-func-expr-fn-body-cntns-arguments-func-decl-declare-arguments.js",
	"eval-code/direct/async-gen-named-func-expr-fn-body-cntns-arguments-func-decl-declare-arguments-and-assign.js",
	"eval-code/direct/async-gen-meth-no-pre-existing-arguments-bindings-are-present-declare-arguments.js",
	"eval-code/direct/async-gen-meth-no-pre-existing-arguments-bindings-are-present-declare-arguments-and-assign.js",
	"eval-code/direct/async-gen-meth-fn-body-cntns-arguments-var-bind-declare-arguments.js",
	"eval-code/direct/async-gen-named-func-expr-no-pre-existing-arguments-bindings-are-present-declare-arguments-and-assign.js",
	"eval-code/direct/async-gen-named-func-expr-no-pre-existing-arguments-bindings-are-present-declare-arguments.js",
	"eval-code/indirect/var-env-func-init-global-update-configurable.js",
	"eval-code/indirect/var-env-var-init-global-exstng.js",

	// `with` problems
	"statements/with/set-mutable-binding-binding-deleted-with-typed-array-in-proto-chain-strict-mode.js",
	"statements/with/set-mutable-binding-idref-compound-assign-with-proxy-env.js",
	"statements/with/set-mutable-binding-idref-with-proxy-env.js",

	"global-code/decl-func.js",
	"global-code/script-decl-func-err-non-configurable.js",
	"global-code/script-decl-func-err-non-extensible.js",
	"global-code/script-decl-func.js",
	"global-code/script-decl-lex-deletion.js",
	"global-code/script-decl-lex.js",
	"global-code/script-decl-var-collision.js",
	"global-code/script-decl-var-err.js",
	"global-code/script-decl-var.js",

	"expressions/postfix-decrement/operator-x-postfix-decrement-calls-putvalue-lhs-newvalue--1.js",
	"expressions/postfix-increment/operator-x-postfix-increment-calls-putvalue-lhs-newvalue--1.js",

	"expressions/assignment/S11.13.1_A5_T1.js",
	"expressions/assignment/S11.13.1_A5_T2.js",
	"expressions/assignment/S11.13.1_A5_T3.js",
	"expressions/assignment/S11.13.1_A6_T1.js",
	"expressions/assignment/S11.13.1_A6_T2.js",
	"expressions/assignment/S11.13.1_A6_T3.js",

	"expressions/delete/11.4.1-4.a-8-s.js",
	"expressions/delete/super-property-uninitialized-this.js",

	// Not a bug, we need to improve our test runner
	"statements/async-function/evaluation-body.js",

	"module-code/top-level-await/module-import-rejection-body.js",
	"module-code/top-level-await/module-import-rejection-tick.js",
	"module-code/top-level-await/module-import-rejection.js",

	"module-code/instn-named-bndng-dflt-gen-anon.js",
	"module-code/instn-named-bndng-dflt-fun-anon.js",

	"module-code/namespace/internals/get-own-property-str-found-init.js",
	"module-code/namespace/internals/get-own-property-str-found-uninit.js",
	"module-code/namespace/internals/get-prototype-of.js",
	"module-code/namespace/internals/get-str-not-found.js",
	"module-code/namespace/internals/has-property-str-not-found.js",
	"module-code/namespace/internals/is-extensible.js",
	"module-code/namespace/internals/object-hasOwnProperty-binding-uninit.js",
	"module-code/namespace/internals/object-keys-binding-uninit.js",
	"module-code/namespace/internals/object-propertyIsEnumerable-binding-uninit.js",
	"module-code/namespace/internals/set-prototype-of.js",
	"module-code/namespace/internals/set.js",
	"module-code/namespace/internals/define-own-property.js",

	"expressions/optional-chaining/member-expression-async-identifier.js",

	"expressions/dynamic-import/syntax/valid/nested-arrow-assignment-expression-empty-str-is-valid-assign-expr.js",
	"expressions/dynamic-import/syntax/valid/nested-arrow-empty-str-is-valid-assign-expr.js",
	"expressions/dynamic-import/syntax/valid/nested-async-arrow-function-await-empty-str-is-valid-assign-expr.js",
	"expressions/dynamic-import/syntax/valid/nested-async-arrow-function-return-await-empty-str-is-valid-assign-expr.js",
	"expressions/dynamic-import/syntax/valid/nested-async-function-await-empty-str-is-valid-assign-expr.js",
	"expressions/dynamic-import/syntax/valid/nested-async-function-empty-str-is-valid-assign-expr.js",
	"expressions/dynamic-import/syntax/valid/nested-async-function-return-await-empty-str-is-valid-assign-expr.js",
	"expressions/dynamic-import/syntax/valid/nested-async-gen-await-empty-str-is-valid-assign-expr.js",
	"expressions/dynamic-import/syntax/valid/nested-block-empty-str-is-valid-assign-expr.js",
	"expressions/dynamic-import/syntax/valid/nested-block-labeled-empty-str-is-valid-assign-expr.js",
	"expressions/dynamic-import/syntax/valid/nested-block-labeled-nested-imports.js",
	"expressions/dynamic-import/syntax/valid/nested-block-nested-imports.js",
	"expressions/dynamic-import/syntax/valid/nested-do-while-empty-str-is-valid-assign-expr.js",
	"expressions/dynamic-import/syntax/valid/nested-do-while-nested-imports.js",
	"expressions/dynamic-import/syntax/valid/nested-else-braceless-empty-str-is-valid-assign-expr.js",
	"expressions/dynamic-import/syntax/valid/nested-else-braceless-nested-imports.js",
	"expressions/dynamic-import/syntax/valid/nested-else-empty-str-is-valid-assign-expr.js",
	"expressions/dynamic-import/syntax/valid/nested-else-nested-imports.js",
	"expressions/dynamic-import/syntax/valid/nested-function-empty-str-is-valid-assign-expr.js",
	"expressions/dynamic-import/syntax/valid/nested-function-return-empty-str-is-valid-assign-expr.js",
	"expressions/dynamic-import/syntax/valid/nested-if-braceless-empty-str-is-valid-assign-expr.js",
	"expressions/dynamic-import/syntax/valid/nested-if-braceless-nested-imports.js",
	"expressions/dynamic-import/syntax/valid/nested-if-empty-str-is-valid-assign-expr.js",
	"expressions/dynamic-import/syntax/valid/nested-if-nested-imports.js",
	"expressions/dynamic-import/syntax/valid/nested-while-empty-str-is-valid-assign-expr.js",
	"expressions/dynamic-import/syntax/valid/nested-while-nested-imports.js",
	"expressions/dynamic-import/syntax/valid/nested-with-empty-str-is-valid-assign-expr.js",
	"expressions/dynamic-import/syntax/valid/nested-with-expression-empty-str-is-valid-assign-expr.js",
	"expressions/dynamic-import/syntax/valid/nested-with-expression-nested-imports.js",
	"expressions/dynamic-import/syntax/valid/nested-with-expression-script-code-valid.js",
	"expressions/dynamic-import/syntax/valid/new-covered-expression-is-valid.js",
	"expressions/dynamic-import/syntax/valid/top-level-empty-str-is-valid-assign-expr.js",
	"expressions/dynamic-import/syntax/valid/top-level-nested-imports.js",
	"expressions/dynamic-import/namespace/await-ns-define-own-property.js",
	"expressions/dynamic-import/namespace/await-ns-delete-non-exported-no-strict.js",
	"expressions/dynamic-import/namespace/await-ns-delete-non-exported-strict.js",
	"expressions/dynamic-import/namespace/await-ns-extensible.js",
	"expressions/dynamic-import/namespace/await-ns-get-nested-namespace-dflt-direct.js",
	"expressions/dynamic-import/namespace/await-ns-get-nested-namespace-dflt-indirect.js",
	"expressions/dynamic-import/namespace/await-ns-get-own-property-str-found-init.js",
	"expressions/dynamic-import/namespace/await-ns-get-str-not-found.js",
	"expressions/dynamic-import/namespace/await-ns-has-property-str-not-found.js",
	"expressions/dynamic-import/namespace/await-ns-own-property-keys-sort.js",
	"expressions/dynamic-import/namespace/await-ns-prop-descs.js",
	"expressions/dynamic-import/namespace/await-ns-prototype.js",
	"expressions/dynamic-import/namespace/await-ns-set-no-strict.js",
	"expressions/dynamic-import/namespace/await-ns-set-prototype-of.js",
	"expressions/dynamic-import/namespace/await-ns-set-strict.js",
	"expressions/dynamic-import/namespace/default-property-not-set-own.js",
	"expressions/dynamic-import/namespace/promise-then-ns-define-own-property.js",
	"expressions/dynamic-import/namespace/promise-then-ns-delete-non-exported-no-strict.js",
	"expressions/dynamic-import/namespace/promise-then-ns-delete-non-exported-strict.js",
	"expressions/dynamic-import/namespace/promise-then-ns-extensible.js",
	"expressions/dynamic-import/namespace/promise-then-ns-get-nested-namespace-dflt-direct.js",
	"expressions/dynamic-import/namespace/promise-then-ns-get-nested-namespace-dflt-indirect.js",
	"expressions/dynamic-import/namespace/promise-then-ns-get-own-property-str-found-init.js",
	"expressions/dynamic-import/namespace/promise-then-ns-get-str-not-found.js",
	"expressions/dynamic-import/namespace/promise-then-ns-has-property-str-not-found.js",
	"expressions/dynamic-import/namespace/promise-then-ns-own-property-keys-sort.js",
	"expressions/dynamic-import/namespace/promise-then-ns-prop-descs.js",
	"expressions/dynamic-import/namespace/promise-then-ns-prototype.js",
	"expressions/dynamic-import/namespace/promise-then-ns-set-no-strict.js",
	"expressions/dynamic-import/namespace/promise-then-ns-set-prototype-of.js",
	"expressions/dynamic-import/namespace/promise-then-ns-set-strict.js",

	"expressions/dynamic-import/catch/nested-arrow-import-catch-eval-script-code-target.js",
	"expressions/dynamic-import/catch/nested-arrow-import-catch-instn-iee-err-ambiguous-import.js",
	"expressions/dynamic-import/catch/nested-arrow-import-catch-instn-iee-err-circular.js",
	"expressions/dynamic-import/catch/nested-async-arrow-function-await-eval-script-code-target.js",
	"expressions/dynamic-import/catch/nested-async-arrow-function-return-await-eval-script-code-target.js",
	"expressions/dynamic-import/catch/nested-async-arrow-function-return-await-instn-iee-err-ambiguous-import.js",
	"expressions/dynamic-import/catch/nested-async-arrow-function-return-await-instn-iee-err-circular.js",
	"expressions/dynamic-import/catch/nested-async-function-await-eval-script-code-target.js",
	"expressions/dynamic-import/catch/nested-async-function-await-instn-iee-err-ambiguous-import.js",
	"expressions/dynamic-import/catch/nested-async-function-await-instn-iee-err-circular.js",
	"expressions/dynamic-import/catch/nested-async-function-eval-script-code-target.js",
	"expressions/dynamic-import/catch/nested-async-function-instn-iee-err-ambiguous-import.js",
	"expressions/dynamic-import/catch/nested-async-function-instn-iee-err-circular.js",
	"expressions/dynamic-import/catch/nested-async-function-return-await-eval-script-code-target.js",
	"expressions/dynamic-import/catch/nested-async-function-return-await-instn-iee-err-ambiguous-import.js",
	"expressions/dynamic-import/catch/nested-async-function-return-await-instn-iee-err-circular.js",
	"expressions/dynamic-import/catch/nested-async-gen-await-eval-script-code-target.js",
	"expressions/dynamic-import/catch/nested-async-gen-await-instn-iee-err-ambiguous-import.js",
	"expressions/dynamic-import/catch/nested-async-gen-await-instn-iee-err-circular.js",
	"expressions/dynamic-import/catch/nested-async-gen-return-await-eval-script-code-target.js",
	"expressions/dynamic-import/catch/nested-async-gen-return-await-instn-iee-err-ambiguous-import.js",
	"expressions/dynamic-import/catch/nested-async-gen-return-await-instn-iee-err-circular.js",
	"expressions/dynamic-import/catch/nested-block-import-catch-eval-script-code-target.js",
	"expressions/dynamic-import/catch/nested-block-import-catch-instn-iee-err-ambiguous-import.js",
	"expressions/dynamic-import/catch/nested-block-import-catch-instn-iee-err-circular.js",
	"expressions/dynamic-import/catch/nested-block-labeled-eval-script-code-target.js",
	"expressions/dynamic-import/catch/nested-block-labeled-instn-iee-err-ambiguous-import.js",
	"expressions/dynamic-import/catch/nested-block-labeled-instn-iee-err-circular.js",
	"expressions/dynamic-import/catch/nested-do-while-eval-script-code-target.js",
	"expressions/dynamic-import/catch/nested-do-while-instn-iee-err-ambiguous-import.js",
	"expressions/dynamic-import/catch/nested-do-while-instn-iee-err-circular.js",
	"expressions/dynamic-import/catch/nested-else-import-catch-eval-script-code-target.js",
	"expressions/dynamic-import/catch/nested-else-import-catch-instn-iee-err-ambiguous-import.js",
	"expressions/dynamic-import/catch/nested-else-import-catch-instn-iee-err-circular.js",
	"expressions/dynamic-import/catch/nested-function-import-catch-eval-script-code-target.js",
	"expressions/dynamic-import/catch/nested-function-import-catch-instn-iee-err-ambiguous-import.js",
	"expressions/dynamic-import/catch/nested-function-import-catch-instn-iee-err-circular.js",
	"expressions/dynamic-import/catch/nested-if-import-catch-eval-script-code-target.js",
	"expressions/dynamic-import/catch/nested-if-import-catch-instn-iee-err-ambiguous-import.js",
	"expressions/dynamic-import/catch/nested-if-import-catch-instn-iee-err-circular.js",
	"expressions/dynamic-import/catch/nested-while-import-catch-eval-script-code-target.js",
	"expressions/dynamic-import/catch/nested-while-import-catch-instn-iee-err-ambiguous-import.js",
	"expressions/dynamic-import/catch/nested-while-import-catch-instn-iee-err-circular.js",
	"expressions/dynamic-import/catch/top-level-import-catch-eval-script-code-target.js",
	"expressions/dynamic-import/catch/top-level-import-catch-instn-iee-err-ambiguous-import.js",
	"expressions/dynamic-import/catch/top-level-import-catch-instn-iee-err-circular.js",

	"expressions/dynamic-import/syntax/invalid/nested-with-import-defer-no-new-call-expression.js",
	"expressions/dynamic-import/syntax/invalid/top-level-import-defer-no-new-call-expression.js",

	"expressions/dynamic-import/eval-export-dflt-cls-anon.js",
	"expressions/dynamic-import/eval-export-dflt-expr-cls-anon.js",
	"expressions/dynamic-import/eval-export-dflt-expr-fn-anon.js",
	"expressions/dynamic-import/eval-export-dflt-expr-gen-anon.js",
	"expressions/dynamic-import/eval-self-once-script.js",
	"expressions/dynamic-import/for-await-resolution-and-error-agen-yield.js",
	"expressions/dynamic-import/import-errored-module.js",
	"expressions/dynamic-import/reuse-namespace-object-from-script.js",
	"expressions/dynamic-import/usage-from-eval.js",
	"expressions/dynamic-import/assignment-expression/unary-expr.js",
	"expressions/dynamic-import/import-defer/sync/main.js",
	"expressions/dynamic-import/import-defer/import-defer-transitive-async-module/main.js",
	"expressions/dynamic-import/import-defer/import-defer-async-module/main.js",
	"expressions/dynamic-import/import-defer/sync-dependency-of-deferred-async-module/main.js",

	"module-code/top-level-await/unobservable-global-async-evaluation-count-reset.js",
	"module-code/top-level-await/dynamic-import-resolution.js",
	"module-code/top-level-await/rejection-order.js",
	"module-code/top-level-await/await-dynamic-import-resolution.js",
	"module-code/top-level-await/fulfillment-order.js",
	"module-code/top-level-await/module-graphs-does-not-hang.js",

	"global-code/script-decl-func-dups.js",
	"global-code/script-decl-lex-lex.js",
	"global-code/script-decl-lex-restricted-global.js",
	"global-code/script-decl-lex-var.js",
	"global-code/script-decl-lex-var-declared-via-eval.js",

	"expressions/prefix-increment/operator-prefix-increment-x-calls-putvalue-lhs-newvalue--1.js",
	"expressions/prefix-decrement/operator-prefix-decrement-x-calls-putvalue-lhs-newvalue--1.js",

	// Weird test
	"expressions/dynamic-import/syntax/valid/nested-with-nested-imports.js",

	// We need to handle `import.meta` in `import`
	"expressions/dynamic-import/assignment-expression/import-meta.js",

	// Bug in parser
	"expressions/dynamic-import/assignment-expression/cover-parenthesized-expr.js",

	// Looks like a bug in webpack
	"module-code/top-level-await/dynamic-import-rejection.js"
];
/* cspell:enable */

const testFiles = fs
	.globSync(`${baseDir}/**/*.js`)
	.filter((name) => !/_FIXTURE\.js$/i.test(name));

describe("test262", () => {
	for (const testFile of testFiles) {
		const name = path.posix.relative(baseDir, testFile);
		const content = fs.readFileSync(testFile, "utf8");
		const meta = getTest262Meta(content);

		if (
			// Decorators are not supported
			meta.features.includes("decorators") ||
			// V8 optimization bugs
			meta.features.includes("Symbol.unscopables") ||
			// TODO Not implemented
			meta.features.includes("source-phase-imports") ||
			meta.features.includes("source-phase-imports-module-source") ||
			// TODO improve in our test runner
			(meta.negative && meta.negative.phase === "resolution") ||
			knownBugs.includes(name)
		) {
			// eslint-disable-next-line jest/no-disabled-tests
			it.skip(name, () => {});

			continue;
		}

		const outputPath = path.resolve(
			__dirname,
			"./js/test262-cases",
			path.join(path.dirname(name), path.basename(name, path.extname(name)))
		);
		const outputFile = path.resolve(outputPath, "./main.js");

		let scenarios;

		if (meta.flags.includes("module")) {
			scenarios = ["module"];
		} else if (meta.flags.includes("raw")) {
			scenarios = ["sloppy"];
		} else if (meta.flags.includes("onlyStrict")) {
			scenarios = ["strict"];
		} else if (meta.flags.includes("noStrict")) {
			scenarios = ["sloppy"];
		} else {
			scenarios = ["sloppy", "strict"];
		}

		for (const scenario of scenarios) {
			it(`${name} ("${scenario}")`, async () => {
				if (needDebug) {
					process.stdout.write(`Running ${name} ("${scenario}")\n`);
				}

				const stats = await compile(testFile, scenario, {
					output: {
						path: outputPath,
						filename: path.relative(outputPath, outputFile)
					}
				});

				const includes = meta.flags.includes("raw")
					? []
					: [
							"sta.js",
							"assert.js",
							// We override `$MAX_ITERATIONS` above
							...meta.includes.filter((item) => item !== "tcoHelper.js")
						];
				const includesCode = await Promise.all(
					includes.map((include) =>
						fs.promises.readFile(
							path.resolve(test262HarnessDir, include),
							"utf8"
						)
					)
				);

				const bundledCode = await outputFileSystem.promises.readFile(
					outputFile,
					"utf8"
				);
				const codeBefore = [
					scenario === "strict" ? "'use strict';" : "",
					...includesCode
				].join("\n");
				const code = [codeBefore, bundledCode].join("\n");

				const isAsync = meta.flags.includes("async");

				const moduleCache = new Map();
				const sandbox = Object.create(null);

				sandbox.$MAX_ITERATIONS = 1;

				let resolve;
				let reject;
				let asyncPromise;

				if (isAsync) {
					asyncPromise = new Promise((res, rej) => {
						resolve = res;
						reject = rej;
					});

					sandbox.$DONE = (err) => {
						if (err) reject(err);
						else resolve();
					};
				}

				sandbox.globalThis = sandbox;
				sandbox.$262 = create262Host();
				// For debug
				sandbox.console = console;

				const context = vm.createContext(sandbox, {
					microtaskMode: "afterEvaluate"
				});

				if (scenario !== "module") {
					sandbox.require = createRequire(outputPath, context);
				}

				let errored = false;

				try {
					if (scenario === "module") {
						await runModule(context, code, outputFile, testFile, moduleCache);
					} else {
						const lineOffset = -codeBefore.split("\n").length;

						runScript(context, code, outputFile, testFile, moduleCache, {
							lineOffset
						});
					}

					if (isAsync) {
						await asyncPromise;
					}

					if (meta.negative && meta.negative.phase === "runtime") {
						throw new Error(
							`Error in test file "${outputFile}" ("${testFile}"), expected runtime error`
						);
					}
				} catch (err) {
					errored = true;

					if (meta.negative) {
						if (
							!["parse", "runtime", "resolution"].includes(meta.negative.phase)
						) {
							throw new Error(
								`Error in test file "${outputFile}" ("${testFile}"), unknown "${meta.negative.phase}" negative phase`,
								{
									cause: err
								}
							);
						}

						if (
							meta.negative.phase === "runtime" &&
							err.constructor.name === meta.negative.type
						) {
							context.executed = true;
						}
					} else {
						throw new Error(
							`Error in test file "${outputFile}" ("${testFile}")`,
							{
								cause: err
							}
						);
					}
				}

				const { warnings, errors } = stats.compilation;

				if (
					warnings.length > 0 &&
					// Just syntax test
					name !== "module-code/top-level-await/syntax/await-expr-dyn-import.js"
				) {
					throw new Error(
						`Warnings in test file "${outputFile}" ("${testFile}")`,
						{
							cause: new Error(`Errors:\n\n${warnings.join("\n")}`)
						}
					);
				}

				if (
					errored &&
					meta.negative &&
					meta.negative.phase === "parse" &&
					errors.every((item) => item.name === "ModuleParseError")
				) {
					context.executed = true;
				} else if (
					// By spec `THIS_FILE_DOES_NOT_EXIST.js` file doesn't exist
					errors.some(
						(item) =>
							!/Can't resolve '\.\/THIS_FILE_DOES_NOT_EXIST\.js'/.test(item)
					)
				) {
					throw new Error(
						`Errors in test file "${outputFile}" ("${testFile}")`,
						{
							cause: new Error(`Errors:\n\n${errors.join("\n")}`)
						}
					);
				}

				if (needDebug) {
					process.stdout.write(`Finished ${name} ("${scenario}")\n`);
				}
			});
		}
	}
});
