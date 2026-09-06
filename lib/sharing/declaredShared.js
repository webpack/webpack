/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

/** @import Compilation from "../Compilation" */

/**
 * @typedef {object} SharedDeclaration
 * @property {string} name the config key, as the config spells it
 * @property {string} shareKey the key the modules created for it carry
 * @property {boolean} prefix whether it shares everything under the key
 */

/** @type {WeakMap<Compilation, SharedDeclaration[]>} */
const DECLARED_SHARED = new WeakMap();

/**
 * What this build declared as shared, one entry per config key, since several
 * may name one share key. `performance.unusedConfig` matches modules on the
 * share key and reports the config key.
 * @param {Compilation} compilation the compilation
 * @returns {SharedDeclaration[] | undefined} the declarations, when any were made
 */
const getDeclaredShared = (compilation) => DECLARED_SHARED.get(compilation);

/**
 * Records declarations, appending when a build applies the plugin more than
 * once, as `ModuleFederationPlugin` and `SharePlugin` do.
 * @param {Compilation} compilation the compilation
 * @param {SharedDeclaration[]} declarations what this application declared
 * @returns {void}
 */
const addDeclaredShared = (compilation, declarations) => {
	const declared = DECLARED_SHARED.get(compilation);

	if (declared === undefined) {
		DECLARED_SHARED.set(compilation, [...declarations]);
	} else {
		for (const declaration of declarations) declared.push(declaration);
	}
};

module.exports.addDeclaredShared = addDeclaredShared;
module.exports.getDeclaredShared = getDeclaredShared;
