/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const WebpackError = require("./WebpackError");

class ImportedBindingAssignmentError extends WebpackError {
	/**
	 * Creates an instance of ImportedBindingAssignmentError.
	 * @param {string} name the local name of the namespace binding
	 */
	constructor(name) {
		super(
			`Assignment to the imported binding '${name}'. A namespace import is immutable, so this throws a TypeError where the module is a real ES module.`
		);

		this.name = "ImportedBindingAssignmentError";
	}
}

makeSerializable(
	ImportedBindingAssignmentError,
	"webpack/lib/errors/ImportedBindingAssignmentError"
);

module.exports = ImportedBindingAssignmentError;
