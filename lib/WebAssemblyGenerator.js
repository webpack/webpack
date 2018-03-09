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
const isInstructionOfName = name => instr => instr.id === name;

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
 * Import the WebAssembly.Table used for interop with other modules managed by
 * Webpack.
 *
 * @param {ArrayBuffer} bin
 * @returns {ArrayBuffer} bin'
 *
 * FIXME(sven): I abrirary choose these names but that might cause conflicts with
 * the user's code, example if a module is called webpack?
 *
 * TODO(sven): what should be the TableDescriptor? We can infer the exact initial
 * value from the number of imports.
 */
function addImportInteropTable(bin) {
	return add(bin, [
		t.moduleImport("webpack", "interoptable", t.table("anyfunc", t.limits(10)))
	]);
}

/**
 * Remove the ModuleImport for globals because they will be reachable throught
 * the interoptable now.
 *
 * @param {ArrayBuffer} bin
 * @returns {ArrayBuffer} bin'
 *
 * FIXME(sven): breaks the non-exported globals because their offset will be
 * shifted by i-(number of import removed). We can either shift the index or
 * replace by stub ones (non-imported)?
 */
function removeImportedGlobals(bin) {
	return edit(bin, {
		ModuleImport(path) {
			if (isGlobalImport(path.node) === true) {
				debug("remove import", path.node.module, path.node.name);
				path.remove();
			}
		}
	});
}

/**
 * Adds the type definition and update every `get_global` to `call_indirect`.
 *
 * FIXME(sven): that also breaks the non-import global since they will be
 * rewriting to calls
 *
 * @param {ArrayBuffer} bin
 * @returns {ArrayBuffer} bin'
 */
function rewriteGlobalToInteroptable(bin) {
	const ast = decode(bin, {
		ignoreCodeSection: true,
		ignoreDataSection: true
	});

	/**
	 * Add the functypes corresponding to the global imported
	 */
	const functypes = [];

	t.traverse(ast, {
		/**
		 * import global of type t1
		 * type = () => t1
		 */
		ModuleImport(path) {
			if (isGlobalImport(path.node) === true) {
				const { valtype } = path.node.descr;
				const functype = t.typeInstructionFunc([], [valtype]);

				functypes.push(functype);
			}
		}
	});

	debug("add functypes", functypes.map(x => x.functype));

	bin = add(bin, functypes);

	/**
	 * Rewrite get_global
	 */
	const isGetGlobalInstruction = isInstructionOfName("get_global");

	bin = edit(bin, {
		Instr(path) {
			if (isGetGlobalInstruction(path.node) === true) {
				const [globalIndex] = path.node.args;
				const functypeIndex = functypes[globalIndex.value];

				if (typeof functypeIndex === "undefined") {
					throw new Error(
						"Internal failure: can not find the functype for global at index " +
							globalIndex.value
					);
				}

				const callIndirectInstruction = t.callIndirectInstructionIndex(
					t.indexLiteral(globalIndex.value)
				);

				path.replaceWith(callIndirectInstruction);
			}
		}
	});

	return bin;
}

const transform = compose(
	removeImportedGlobals,
	rewriteGlobalToInteroptable,
	addImportInteropTable,

	rewriteStartFunc
);

class WebAssemblyGenerator {
	generate(module) {
		const bin = module.originalSource().source();

		debug("__________________________________________________________");
		const newBin = transform(bin);
		debug("__________________________________________________________");

		// decode(newBin, { dump: true });
		// console.log(print(decode(newBin)));

		return new RawSource(newBin);
	}
}

module.exports = WebAssemblyGenerator;
