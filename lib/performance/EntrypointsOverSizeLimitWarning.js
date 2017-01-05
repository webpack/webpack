/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sean Larkin @thelarkinn
*/
"use strict";
const SizeFormatHelpers = require("../SizeFormatHelpers");

module.exports = class EntrypointsOverSizeLimitWarning extends Error {
	constructor(entrypoints, entrypointLimit) {
		super();
		Error.captureStackTrace(this, this.constructor);
		this.name = "EntrypointsOverSizeLimitWarning";
		this.entrypoints = entrypoints;
		const entrypointList = this.entrypoints.map(entrypoint => `\n  ${
			entrypoint.name
		} (${
			SizeFormatHelpers.formatSize(entrypoint.size)
		})\n${
			entrypoint.files.map(asset => `      ${asset}\n`).join()
		}`).join();
		this.message = `entrypoint size limit: The following entrypoint(s) combined asset size exceeds the recommended limit (${SizeFormatHelpers.formatSize(entrypointLimit)}). This can impact web performance.
Entrypoints:${entrypointList}`;
	}
};
