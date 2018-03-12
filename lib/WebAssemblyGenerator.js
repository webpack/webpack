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
const initFuncId = t.identifier("__init__");

/**
 * Removes the start instruction
 *
 * @param {ArrayBuffer} state - unused state
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

function getStartFuncIndex(ast) {
	let startAtFuncIndex;

	t.traverse(ast, {
		Start(path) {
			startAtFuncIndex = path.node.index;
		}
	});

	return startAtFuncIndex;
}

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
 * Rewrite the import globals:
 * - removes the ModuleImport instruction
 * - injects at the same offset a mutable global of the same time
 *
 * Since the imported globals are before the other global declarations, our
 * indices will be preserved.
 *
 * Note that globals will become mutable.
 *
 * FIXME(sven): issue in webassemblyjs/wasm-edit, when we update a path
 * we need to make sure that the change is visible to everyone. Currently
 * removing an import doesn't update the location of the following imports (which
 * have been shifted). The work arround is to reparse the binary each time.
 *
 * @param {ArrayBuffer} bin - the input wasm binary
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
 * @param {ArrayBuffer} bin - the input wasm binary
 * @returns {ArrayBuffer} bin'
 */
const addInitFunction = ({
	startAtFuncIndex,
	importedGlobals,
	funcSectionMetadata
}) => bin => {
	debug("addInitFunction");

	const nextTypeIndex = funcSectionMetadata.vectorOfSize;

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
	const funcindex = t.indexInFuncSection(t.indexLiteral(nextTypeIndex));

	const moduleExport = t.moduleExport(
		initFuncId.value,
		"Func",
		t.indexLiteral(nextTypeIndex)
	);

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

		const transform = compose(
			removeStartFunc(),

			rewriteImportedGlobals(),

			addInitFunction({
				importedGlobals,
				funcSectionMetadata,
				startAtFuncIndex
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
