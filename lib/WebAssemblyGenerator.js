/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const { RawSource } = require("webpack-sources");

const { edit, add } = require("@webassemblyjs/wasm-edit");
const { decode } = require("@webassemblyjs/wasm-parser");
const t = require("@webassemblyjs/ast");

// FIXME(sven): remove this once we're ready to merge
function debug(...msg) {
	// console.log(...msg);
}

function compose(...fns) {
	return fns.reverse().reduce((prevFn, nextFn) => {
		return value => nextFn(prevFn(value));
	}, value => value);
}

// Utility functions
const isGlobalImport = moduleImport => moduleImport.descr.type === "GlobalType";
const isFuncImport = moduleImport =>
	moduleImport.descr.type === "FuncImportDescr";
const initFuncId = t.identifier("__init__");

/**
 * Removes the start instruction
 *
 * @param {Object} state - unused state
 * @returns {ArrayBuffer} bin'
 */
const removeStartFunc = state => bin => {
	debug("removeStartFunc");

	return edit(bin, {
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
		Start(path) {
			startAtFuncIndex = path.node.index;
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

/**
 * Get next func index
 *
 * We need to respect the instantation order, first count the number of imported
 * func and func declared in the module.
 *
 * @param {Object} ast - Module's AST
 * @returns {t.indexLiteral} - index
 */
function getNextFuncIndex(ast) {
	let count = 0;

	t.traverse(ast, {
		ModuleImport({ node }) {
			if (isFuncImport(node) === true) {
				count++;
			}
		},

		Func({ node }) {
			count++;
		}
	});

	return t.indexLiteral(count);
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
 * @returns {ArrayBuffer} bin'
 */
const rewriteImportedGlobals = state => bin => {
	debug("rewriteImportedGlobals");

	const newGlobals = [];

	bin = edit(bin, {
		ModuleImport(path) {
			if (isGlobalImport(path.node) === true) {
				const globalType = path.node.descr;

				globalType.mutability = "var";

				newGlobals.push(
					t.global(globalType, [
						t.objectInstruction("const", "i32", [t.numberLiteral(0)])
					])
				);

				debug("remove import", path.node.module, path.node.name);
				path.remove();
			}
		}
	});

	// Add global declaration instructions
	return add(bin, newGlobals);
};

/**
 * Add an init function.
 *
 * The init function fills the globals given input arguments.
 *
 * @param {Object} state - transformation state
 * @returns {ArrayBuffer} bin'
 */
const addInitFunction = ({
	startAtFuncIndex,
	importedGlobals,
	funcSectionMetadata,
	nextFuncIndex
}) => bin => {
	debug("addInitFunction");

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
		debug("call start func", startAtFuncIndex.value);

		funcBody.push(t.callInstruction(startAtFuncIndex));
	}

	const funcResults = [];

	const func = t.func(initFuncId, funcParams, funcResults, funcBody);

	const functype = t.typeInstructionFunc(func.params, func.result);
	const funcindex = t.indexInFuncSection(nextFuncIndex);

	const moduleExport = t.moduleExport(initFuncId.value, "Func", nextFuncIndex);

	return add(bin, [func, moduleExport, funcindex, functype]);
};

class WebAssemblyGenerator {
	generate(module) {
		const bin = module.originalSource().source();

		const ast = decode(bin, {
			ignoreDataSection: true
		});

		const importedGlobals = getImportedGlobals(ast);
		const funcSectionMetadata = t.getSectionMetadata(ast, "func");
		const startAtFuncIndex = getStartFuncIndex(ast);
		const nextFuncIndex = getNextFuncIndex(ast);

		const transform = compose(
			removeStartFunc(),

			rewriteImportedGlobals(),

			addInitFunction({
				importedGlobals,
				funcSectionMetadata,
				startAtFuncIndex,
				nextFuncIndex
			})
		);

		debug("__________________________________________________________");
		const newBin = transform(bin);
		debug("__________________________________________________________");

		// console.log(require("@webassemblyjs/wast-printer").print(decode(newBin)));

		return new RawSource(newBin);
	}
}

module.exports = WebAssemblyGenerator;
