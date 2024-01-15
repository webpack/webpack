/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Gengkun He @ahabhgk
*/

"use strict";

const WebpackError = require("./WebpackError");
const makeSerializable = require("./util/makeSerializable");

/** @typedef {import("./Module")} Module */
/** @typedef {import("./serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("./serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */

class EnvironmentNotSupportAsyncWarning extends WebpackError {
	/**
	 * Creates an instance of EnvironmentNotSupportAsyncWarning.
	 * @param {Module} module module
	 * @param {string} moduleName module name
	 * @param {"asyncWebAssembly" | "topLevelAwait"} feature feature
	 */
	constructor(module, moduleName, feature) {
		const message = `The generated code contains 'async/await' because '${moduleName}' is using ${feature}.
However, your target environment does not appear to support 'async/await'.
As a result, the code may not run as expected or may cause runtime errors.`;
		super(message);

		this.name = "EnvironmentNotSupportAsyncWarning";
		this.module = module;
	}
}

makeSerializable(
	EnvironmentNotSupportAsyncWarning,
	"webpack/lib/EnvironmentNotSupportAsyncWarning"
);

module.exports = EnvironmentNotSupportAsyncWarning;
