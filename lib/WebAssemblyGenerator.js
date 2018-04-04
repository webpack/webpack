/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const { RawSource } = require("webpack-sources");

const { edit, add } = require("@webassemblyjs/wasm-edit");
const { decode } = require("@webassemblyjs/wasm-parser");
const t = require("@webassemblyjs/ast");

function compose(...fns) {
	return fns.reverse().reduce((prevFn, nextFn) => {
		return value => nextFn(prevFn(value));
	}, value => value);
}

// Utility functions
const isGlobalImport = moduleImport => moduleImport.descr.type === "GlobalType";
const initFuncId = t.identifier("__webpack_init__");

/**
 * Removes the start instruction
 *
 * @param {Object} state - unused state
 * @returns {ArrayBuffer} bin'
 */
const removeStartFunc = state => bin => {
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
 * Funcs are referenced by their index in the type section, we just return the
 * next index.
 *
 * @param {Object} ast - Module's AST
 * @returns {t.indexLiteral} - index
 */
function getNextFuncIndex(ast) {
	const typeSectionMetadata = t.getSectionMetadata(ast, "type");

	if (typeof typeSectionMetadata === "undefined") {
		return t.indexLiteral(0);
	}

	return t.indexLiteral(typeSectionMetadata.vectorOfSize);
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

		const newBin = transform(bin);

		return new RawSource(newBin);
	}
}

module.exports = WebAssemblyGenerator;
