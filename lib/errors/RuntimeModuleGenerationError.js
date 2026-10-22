/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const PathVariableError = require("./PathVariableError");
const WebpackError = require("./WebpackError");
const deriveStackFromNestedError = require("./deriveStackFromNestedError");

/** @import RuntimeModule from "../runtime/RuntimeModule" */

/**
 * Names the runtime module that failed and, for a placeholder that only the
 * hashing pass lacks a value for, what to ask instead.
 * @param {RuntimeModule} module the runtime module whose `generate()` threw
 * @param {Error} error the error it threw
 * @returns {string} the message
 */
const buildMessage = (module, error) => {
	const message = `Generating the runtime module ${module.identifier()} (${
		module.constructor.name
	}) for hashing failed: ${error.message}`;
	if (!(error instanceof PathVariableError)) return message;
	return `${message}
A runtime module is generated to be hashed, before the chunk it belongs to has a hash, so ${error.variable} has no value there. Where the path from the chunk's own asset back to the output root is what is needed, ask compilation.runtimeTemplate.chunkRootOutputDir(chunk, enforceRelative), which neutralizes the hash placeholders first.`;
};

class RuntimeModuleGenerationError extends WebpackError {
	/**
	 * Creates an instance of RuntimeModuleGenerationError.
	 * @param {RuntimeModule} module the runtime module whose `generate()` threw
	 * @param {Error} error the error it threw
	 */
	constructor(module, error) {
		super(buildMessage(module, error));

		/** @type {string} */
		this.name = "RuntimeModuleGenerationError";
		/** @type {Error} */
		this.error = error;
		/** @type {RuntimeModule} */
		this.module = module;

		deriveStackFromNestedError(this, error);
	}
}

/** @type {typeof RuntimeModuleGenerationError} */
module.exports = RuntimeModuleGenerationError;
