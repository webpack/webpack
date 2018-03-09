/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const { RawSource } = require("webpack-sources");

const { edit, add } = require("@webassemblyjs/wasm-edit");
const { decode } = require("@webassemblyjs/wasm-parser");
// const { print } = require("@webassemblyjs/wast-printer");
const t = require("@webassemblyjs/ast");

// FIXME(sven): remove this once we're ready to merge
function debug(...msg) {
	if (false) console.log(...msg);
}

function compose(...fns) {
	return fns.reverse().reduce((prevFn, nextFn) => {
		return value => nextFn(prevFn(value));
	}, value => value);
}

/**
 * Utility functions
 */
const isGlobalImport = moduleImport => moduleImport.descr.type === "GlobalType";

/**
 * Export the start function and removes the start instruction
 */
function rewriteStartFunc(bin) {
	debug("rewriteStartFunc");

	let startAtFuncIndex;

	bin = edit(bin, {
		Start(path) {
			startAtFuncIndex = path.node.index;

			path.remove();
		}
	});

	// No start func, abort here
	if (startAtFuncIndex === undefined) {
		return bin;
	}

	debug("found start at func index", startAtFuncIndex.value);

	bin = add(bin, [t.moduleExport("start", "Func", startAtFuncIndex)]);

	return bin;
}

/**
 * Remove the ModuleImport for globals but keep the global declaration
 *
 * @param {ArrayBuffer} bin
 * @returns {ArrayBuffer} bin'
 */
function removeImportedGlobals(bin) {
	const newGlobals = [];

	bin = edit(bin, {
		ModuleImport(path) {
			if (isGlobalImport(path.node) === true) {
				debug("remove import", path.node.module, path.node.name);

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

	return add(bin, newGlobals);
}

/**
 * Add our init function.
 *
 * @param {ArrayBuffer} bin
 * @returns {ArrayBuffer} bin'
 */
function addInitFunction(bin) {
	// get next func index
	const ast = decode(bin, {
		ignoreDataSection: true
	});

	const section = t.getSectionMetadata(ast, "func");
	const nextTypeIndex = section.vectorOfSize;

	const func = t.func(
		null,
		[t.funcParam("i32")],
		[],
		[
			t.instruction("get_local", [t.indexLiteral(0)]),
			t.instruction("set_global", [t.indexLiteral(0)])
		]
	);

	const functype = t.typeInstructionFunc(func.params, func.result);
	const funcindex = t.indexInFuncSection(t.indexLiteral(nextTypeIndex));

	const moduleExport = t.moduleExport(
		"__init__",
		"Func",
		t.indexLiteral(nextTypeIndex + 1)
	);

	return add(bin, [func, moduleExport, funcindex, functype]);
}

const transform = compose(
	removeImportedGlobals,
	addInitFunction

	// rewriteStartFunc
);

class WebAssemblyGenerator {
	generate(module) {
		const bin = module.originalSource().source();

		debug("__________________________________________________________");
		const newBin = transform(bin);
		debug("__________________________________________________________");

		// console.log(print(decode(newBin)));

		return new RawSource(newBin);
	}
}

module.exports = WebAssemblyGenerator;
