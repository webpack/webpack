/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

const Dependency = require("../../graph/Dependency");
const makeSerializable = require("../../util/makeSerializable");
const ESMImportSideEffectDependency = require("./ESMImportSideEffectDependency");

/** @import { LazyUntil } from "../../graph/Dependency" */

/**
 * The evaluation of an `export … from "..."` statement's module. It is a separate
 * class rather than a flag so a lazy barrel defers it with the re-export, while an
 * import declaration's evaluation stays tied to the barrel's own code.
 */
class ESMExportImportedSideEffectDependency extends ESMImportSideEffectDependency {
	/**
	 * Returns how this dependency may be deferred when its parent module is side-effect-free (lazy barrel optimization).
	 * @returns {LazyUntil | null} lazy classification, null when it must be processed eagerly
	 */
	getLazyUntil() {
		return Dependency.LAZY_UNTIL_REQUEST;
	}
}

makeSerializable(
	ESMExportImportedSideEffectDependency,
	"webpack/lib/dependencies/esm/ESMExportImportedSideEffectDependency"
);

ESMExportImportedSideEffectDependency.Template =
	ESMImportSideEffectDependency.Template;

module.exports = ESMExportImportedSideEffectDependency;
