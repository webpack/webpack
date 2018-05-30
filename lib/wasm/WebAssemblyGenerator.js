/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Generator = require("../Generator");
const Template = require("../Template");
const WebAssemblyUtils = require("./WebAssemblyUtils");
const { RawSource } = require("webpack-sources");

const { shrinkPaddedLEB128 } = require("@webassemblyjs/wasm-opt");
const { editWithAST, addWithAST } = require("@webassemblyjs/wasm-edit");
const { decode } = require("@webassemblyjs/wasm-parser");
const t = require("@webassemblyjs/ast");

/** @typedef {import("../Module")} Module */
/** @typedef {import("./WebAssemblyUtils").UsedWasmDependency} UsedWasmDependency */

/**
 * @typedef {(ArrayBuffer) => ArrayBuffer} ArrayBufferTransform
 */

/**
 * Run some preprocessing on the binary before wasm-edit
 *
 * @param {ArrayBuffer} ab - original binary
 * @returns {ArrayBufferTransform} transform
 */
function preprocess(ab) {
	const optBin = shrinkPaddedLEB128(new Uint8Array(ab));
	return optBin.buffer;
}

/**
 * @template T
 * @param {Function[]} fns transforms
 * @returns {Function} composed transform
 */
function compose(...fns) {
	return fns.reduce((prevFn, nextFn) => {
		return value => nextFn(prevFn(value));
	}, value => value);
}

// Utility functions

/**
 * @param {t.ModuleImport} n the import
 * @returns {boolean} true, if a global was imported
 */
const isGlobalImport = n => n.descr.type === "GlobalType";

/**
 * @param {t.ModuleImport} n the import
 * @returns {boolean} true, if a func was imported
 */
const isFuncImport = n => n.descr.type === "FuncImportDescr";

// TODO replace with @callback

/**
 * Removes the start instruction
 *
 * @param {Object} state - unused state
 * @returns {ArrayBufferTransform} transform
 */
const removeStartFunc = state => bin => {
	return editWithAST(state.ast, bin, {
		Start(path) {
			path.remove();
		}
	});
};

/**
 * Retrieve the start function
 *
 * @param {Object} ast - Module's AST
 * @returns {t.Identifier | undefined} - node if any
 */
function getStartFuncIndex(ast) {
	let startAtFuncIndex;

	t.traverse(ast, {
		Start({ node }) {
			startAtFuncIndex = node.index;
		}
	});

	return startAtFuncIndex;
}

/**
 * Get imported globals
 *
 * @param {Object} ast - Module's AST
 * @returns {Array<t.ModuleImport>} - nodes
 */
function getImportedGlobals(ast) {
	const importedGlobals = [];

	t.traverse(ast, {
		ModuleImport({ node }) {
			if (isGlobalImport(node) === true) {
				importedGlobals.push(node);
			}
		}
	});

	return importedGlobals;
}

function getCountImportedFunc(ast) {
	let count = 0;

	t.traverse(ast, {
		ModuleImport({ node }) {
			if (isFuncImport(node) === true) {
				count++;
			}
		}
	});

	return count;
}

/**
 * Get next type index
 *
 * @param {Object} ast - Module's AST
 * @returns {t.IndexLiteral} - index
 */
function getNextTypeIndex(ast) {
	const typeSectionMetadata = t.getSectionMetadata(ast, "type");

	if (typeof typeSectionMetadata === "undefined") {
		return t.indexLiteral(0);
	}

	return t.indexLiteral(typeSectionMetadata.vectorOfSize.value);
}

/**
 * Get next func index
 *
 * The Func section metadata provide informations for implemented funcs
 * in order to have the correct index we shift the index by number of external
 * functions.
 *
 * @param {Object} ast - Module's AST
 * @param {Number} countImportedFunc - number of imported funcs
 * @returns {t.IndexLiteral} - index
 */
function getNextFuncIndex(ast, countImportedFunc) {
	const funcSectionMetadata = t.getSectionMetadata(ast, "func");

	if (typeof funcSectionMetadata === "undefined") {
		return t.indexLiteral(0 + countImportedFunc);
	}

	const vectorOfSize = funcSectionMetadata.vectorOfSize.value;

	return t.indexLiteral(vectorOfSize + countImportedFunc);
}

/**
 * Rewrite the import globals:
 * - removes the ModuleImport instruction
 * - injects at the same offset a mutable global of the same time
 *
 * Since the imported globals are before the other global declarations, our
 * indices will be preserved.
 *
 * Note that globals will become mutable.
 *
 * @param {Object} state - unused state
 * @returns {ArrayBufferTransform} transform
 */
const rewriteImportedGlobals = state => bin => {
	const newGlobals = [];

	bin = editWithAST(state.ast, bin, {
		ModuleImport(path) {
			if (isGlobalImport(path.node) === true) {
				const globalType = path.node.descr;

				globalType.mutability = "var";

				let init;

				if (globalType.valtype[0] === "i") {
					// create NumberLiteral global initializer
					init = t.objectInstruction("const", globalType.valtype, [
						t.numberLiteralFromRaw(0)
					]);
				} else if (globalType.valtype[0] === "f") {
					// create FloatLiteral global initializer
					init = t.objectInstruction("const", globalType.valtype, [
						t.floatLiteral(0, false, false, "0")
					]);
				} else {
					throw new Error("unknown type: " + globalType.valtype);
				}

				newGlobals.push(t.global(globalType, [init]));

				path.remove();
			}
		},

		// in order to preserve non-imported global's order we need to re-inject
		// those as well
		Global(path) {
			newGlobals.push(path.node);
			path.remove();
		}
	});

	// Add global declaration instructions
	return addWithAST(state.ast, bin, newGlobals);
};

/**
 * Rewrite the export names
 * @param {Object} state state
 * @param {Object} state.ast Module's ast
 * @param {Object} state.module Module
 * @returns {ArrayBufferTransform} transform
 */
const rewriteExportNames = ({ ast, module }) => bin => {
	return editWithAST(ast, bin, {
		ModuleExport(path) {
			const usedName = module.isUsed(path.node.name);
			if (usedName) {
				path.node.name = usedName;
			} else {
				path.remove();
			}
		}
	});
};

/**
 * Mangle import names and modules
 * @param {Object} state state
 * @param {Object} state.ast Module's ast
 * @param {Map<string, UsedWasmDependency>} state.usedDependencyMap mappings to mangle names
 * @returns {ArrayBufferTransform} transform
 */
const rewriteImports = ({ ast, usedDependencyMap }) => bin => {
	return editWithAST(ast, bin, {
		ModuleImport(path) {
			const result = usedDependencyMap.get(
				path.node.module + ":" + path.node.name
			);
			if (result === undefined) {
				path.remove();
			} else {
				path.node.module = WebAssemblyUtils.MANGLED_MODULE;
				path.node.name = result.name;
			}
		}
	});
};

/**
 * Add an init function.
 *
 * The init function fills the globals given input arguments.
 *
 * @param {Object} state transformation state
 * @param {Object} state.ast - Module's ast
 * @param {t.Identifier} state.initFuncId identifier of the init function
 * @param {t.IndexLiteral} state.startAtFuncIndex index of the start function
 * @param {t.ModuleImport[]} state.importedGlobals list of imported globals
 * @param {t.IndexLiteral} state.nextFuncIndex index of the next function
 * @param {t.IndexLiteral} state.nextTypeIndex index of the next type
 * @returns {ArrayBufferTransform} transform
 */
const addInitFunction = ({
	ast,
	initFuncId,
	startAtFuncIndex,
	importedGlobals,
	nextFuncIndex,
	nextTypeIndex
}) => bin => {
	const funcParams = importedGlobals.map(importedGlobal => {
		// used for debugging
		const id = t.identifier(`${importedGlobal.module}.${importedGlobal.name}`);

		return t.funcParam(importedGlobal.descr.valtype, id);
	});

	const funcBody = importedGlobals.reduce((acc, importedGlobal, index) => {
		const args = [t.indexLiteral(index)];
		const body = [
			t.instruction("get_local", args),
			t.instruction("set_global", args)
		];

		return [...acc, ...body];
	}, []);

	if (typeof startAtFuncIndex !== "undefined") {
		funcBody.push(t.callInstruction(startAtFuncIndex));
	}

	const funcResults = [];

	// Code section
	const funcSignature = t.signature(funcParams, funcResults);
	const func = t.func(initFuncId, funcSignature, funcBody);

	// Type section
	const functype = t.typeInstruction(undefined, funcSignature);

	// Func section
	const funcindex = t.indexInFuncSection(nextTypeIndex);

	// Export section
	const moduleExport = t.moduleExport(
		initFuncId.value,
		t.moduleExportDescr("Func", nextFuncIndex)
	);

	return addWithAST(ast, bin, [func, moduleExport, funcindex, functype]);
};

/**
 * Extract mangle mappings from module
 * @param {Module} module current module
 * @returns {Map<string, UsedWasmDependency>} mappings to mangled names
 */
const getUsedDependencyMap = module => {
	/** @type {Map<string, UsedWasmDependency>} */
	const map = new Map();
	for (const usedDep of WebAssemblyUtils.getUsedDependencies(module)) {
		const dep = usedDep.dependency;
		const request = dep.request;
		const exportName = dep.name;
		map.set(request + ":" + exportName, usedDep);
	}
	return map;
};

class WebAssemblyGenerator extends Generator {
	generate(module) {
		let bin = module.originalSource().source();
		bin = preprocess(bin);

		const initFuncId = t.identifier(
			Array.isArray(module.usedExports)
				? Template.numberToIdentifer(module.usedExports.length)
				: "__webpack_init__"
		);

		const ast = decode(bin, {
			ignoreDataSection: true,
			ignoreCodeSection: true,
			ignoreCustomNameSection: true
		});

		const importedGlobals = getImportedGlobals(ast);
		const countImportedFunc = getCountImportedFunc(ast);
		const startAtFuncIndex = getStartFuncIndex(ast);
		const nextFuncIndex = getNextFuncIndex(ast, countImportedFunc);
		const nextTypeIndex = getNextTypeIndex(ast);

		const usedDependencyMap = getUsedDependencyMap(module);

		const transform = compose(
			rewriteExportNames({
				ast,
				module
			}),

			removeStartFunc({ ast }),

			rewriteImportedGlobals({ ast }),

			rewriteImports({
				ast,
				usedDependencyMap
			}),

			addInitFunction({
				ast,
				initFuncId,
				importedGlobals,
				startAtFuncIndex,
				nextFuncIndex,
				nextTypeIndex
			})
		);

		const newBin = transform(bin);

		return new RawSource(newBin);
	}
}

module.exports = WebAssemblyGenerator;
