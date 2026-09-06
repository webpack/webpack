/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

/** @import Compilation from "../Compilation" */

/** @type {WeakMap<Compilation, Set<string>>} */
const DECLARED_REMOTES = new WeakMap();

/**
 * The remote names this build declared, in declaration order, which is the
 * order `factorize` resolves a request against them in.
 * @param {Compilation} compilation the compilation
 * @returns {Set<string> | undefined} the declared names, when any were declared
 */
const getDeclaredRemotes = (compilation) => DECLARED_REMOTES.get(compilation);

/**
 * Records declared names, adding to any a previous application made.
 * @param {Compilation} compilation the compilation
 * @param {Iterable<string>} names what this application declared
 * @returns {void}
 */
const addDeclaredRemotes = (compilation, names) => {
	let declared = DECLARED_REMOTES.get(compilation);

	if (declared === undefined) {
		declared = new Set();
		DECLARED_REMOTES.set(compilation, declared);
	}

	for (const name of names) declared.add(name);
};

module.exports.addDeclaredRemotes = addDeclaredRemotes;
module.exports.getDeclaredRemotes = getDeclaredRemotes;
