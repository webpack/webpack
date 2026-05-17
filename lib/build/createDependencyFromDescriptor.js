/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

/** @typedef {import("../Dependency")} Dependency */

/**
 * Registry of Dependency constructors by name.
 * Populated lazily on first use.
 * @type {Map<string, { new (...args: EXPECTED_ANY[]): Dependency }> | undefined}
 */
let registry;

/**
 * Build the registry mapping constructor names to classes.
 * @returns {Map<string, { new (...args: EXPECTED_ANY[]): Dependency }>} registry
 */
function getRegistry() {
	if (registry) return registry;
	registry = new Map();
	const classes = [
		require("../dependencies/HarmonyImportSideEffectDependency"),
		require("../dependencies/HarmonyImportSpecifierDependency"),
		require("../dependencies/HarmonyExportSpecifierDependency"),
		require("../dependencies/HarmonyExportExpressionDependency"),
		require("../dependencies/HarmonyExportHeaderDependency"),
		require("../dependencies/HarmonyExportImportedSpecifierDependency"),
		require("../dependencies/HarmonyCompatibilityDependency"),
		require("../dependencies/ConstDependency")
	];
	for (const cls of classes) {
		registry.set(cls.name, cls);
	}
	return registry;
}

/**
 * Create a Dependency instance from a plain descriptor object.
 * @param {object} desc plain descriptor with _type and properties
 * @returns {Dependency | undefined} dependency instance, or undefined if type unknown
 */
module.exports = function createDependencyFromDescriptor(desc) {
	const reg = getRegistry();
	const Ctor = reg.get(desc._type);
	if (!Ctor) return undefined;

	// Create instance — use empty constructor then copy properties.
	// All webpack Dependency constructors accept optional args and
	// set defaults, so an empty instance + property copy is safe.
	/** @type {Dependency} */
	let dep;
	try {
		dep = new Ctor();
	} catch {
		// Some constructors require args — try common patterns
		try {
			dep = new (/** @type {EXPECTED_ANY} */ (Ctor))(
				desc.request || "",
				desc.sourceOrder || 0
			);
		} catch {
			return undefined;
		}
	}

	// Copy properties from descriptor
	for (const key of Object.keys(desc)) {
		if (key === "_type") continue;
		try {
			/** @type {EXPECTED_ANY} */ (dep)[key] = desc[key];
		} catch {
			// Some properties may be read-only
		}
	}

	return dep;
};
