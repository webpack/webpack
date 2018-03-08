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
 * Replaces global imports by func imports
 * (which will return the globals at runtime)
 *
 * Also needs to update the calls instructions `get_global` and `set_global`
 * which become function calls.
 */
function rewriteGlobalImports(bin) {
	debug("rewriteGlobalImports");

	const ast = decode(bin, {
		ignoreCodeSection: true,
		ignoreDataSection: true
	});

	const funcType = t.typeInstructionFunc([], ["i32"]);

	// get next func index
	let nextFuncindex = 0;
	t.traverse(ast, {
		Func() {
			nextFuncindex++;
		},

		ModuleImport({ node }) {
			if (node.descr.type === "Func") {
				nextFuncindex++;
			}
		}
	});

	const funcTypeIndex = t.indexLiteral(nextFuncindex);

	bin = add(bin, [funcType]);

	let importedGlobalIndex = 0;
	const mapGlobalAndFuncIndex = {};

	bin = edit(bin, {
		ModuleImport(path) {
			const { node } = path;

			// is importing a global
			if (node.descr.type === "GlobalType") {
				node.name = "_global_get_" + node.name;

				node.descr = t.funcImportDescr(
					funcTypeIndex,
					funcType.functype.params,
					funcType.functype.results
				);

				mapGlobalAndFuncIndex[importedGlobalIndex] = funcTypeIndex;

				importedGlobalIndex++;
			}
		}
	});

	// Update accessers
	bin = edit(bin, {
		Instr(path) {
			const [firstArg] = path.node.args;
			const funcIndex = mapGlobalAndFuncIndex[firstArg.value];

			debug(`rename get_global ${firstArg.value} to call ${funcIndex.value}`);

			const newNode = t.callInstruction(funcIndex);
			path.replaceWith(newNode);
		}
	});

	return bin;
}

const transform = compose(
	rewriteGlobalImports,

	rewriteStartFunc
);

class WebAssemblyGenerator {
	generate(module) {
		const bin = module.originalSource().source();

		debug("__________________________________________________________");
		const newBin = transform(bin);
		debug("__________________________________________________________");

		// console.log(print(decode(newBin)))

		return new RawSource(newBin);
	}
}

module.exports = WebAssemblyGenerator;
