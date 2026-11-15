/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const Dependency = require("../../graph/Dependency");

/** @import ExportsInfo from "../../graph/ExportsInfo" */
/** @import { ReferencedCall, ReferencedExports, ReferencedSpecifiers } from "../../graph/Dependency" */
/** @import { ExportsType } from "../../module/Module" */

/**
 * Whether an unresolved method may observe the receiver's data through its prototype.
 * @param {string[]} names member path
 * @param {ExportsType} exportsType imported module exports type
 * @param {ExportsInfo} exportsInfo imported module exports info
 * @returns {boolean} whether to reference the whole receiver
 */
const shouldReferenceCallReceiver = (names, exportsType, exportsInfo) =>
	(names.length > 1 || exportsType !== "namespace") &&
	exportsInfo.isExportProvided(names) !== true;

/**
 * Resolve imported member reads and calls after provided exports are known.
 * @param {ReferencedSpecifiers} specifiers member reads and calls
 * @param {ExportsType} exportsType imported module exports type
 * @param {ExportsInfo} exportsInfo imported module exports info
 * @param {boolean=} defaultInterop whether default accesses unwrap the module value
 * @returns {ReferencedExports} referenced exports
 */
const getReferencedExports = (
	specifiers,
	exportsType,
	exportsInfo,
	defaultInterop = true
) => {
	/** @type {ReferencedExports} */
	const references = [];
	for (const specifier of specifiers) {
		const call = !Array.isArray(specifier);
		let names = call ? specifier.names : specifier;
		if (names.length === 0) return Dependency.EXPORTS_OBJECT_REFERENCED;
		if (defaultInterop && names[0] === "default") {
			switch (exportsType) {
				case "default-only":
				case "default-with-named":
					names = names.slice(1);
					if (names.length === 0) return Dependency.EXPORTS_OBJECT_REFERENCED;
					break;
				case "dynamic":
					return Dependency.EXPORTS_OBJECT_REFERENCED;
			}
		}
		if (
			call &&
			(specifier.namespaceObjectAsContext ||
				names.length > 1 ||
				shouldReferenceCallReceiver(names, exportsType, exportsInfo))
		) {
			names = names.slice(0, -1);
			if (names.length === 0) return Dependency.EXPORTS_OBJECT_REFERENCED;
		}
		references.push({ name: names, canMangle: false, canInline: false });
	}
	return references;
};

/**
 * Distinguish member reads from calls in readable context identifiers.
 * @param {string[] | ReferencedCall} specifier member read or call
 * @returns {string} readable identifier
 */
const stringifyReferencedSpecifier = (specifier) =>
	Array.isArray(specifier)
		? specifier.join(".")
		: `${specifier.namespaceObjectAsContext ? "*." : ""}${specifier.names.join(
				"."
			)}()`;

module.exports = {
	getReferencedExports,
	shouldReferenceCallReceiver,
	stringifyReferencedSpecifier
};
