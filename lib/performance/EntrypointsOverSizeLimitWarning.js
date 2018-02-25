/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sean Larkin @thelarkinn
*/
"use strict";

const WebpackError = require("../WebpackError");
const SizeFormatHelpers = require("../SizeFormatHelpers");

module.exports = class EntrypointsOverSizeLimitWarning extends WebpackError {
	constructor(entrypoints, entrypointLimit) {
		super();

		this.name = "EntrypointsOverSizeLimitWarning";
		this.entrypoints = entrypoints;
		const entrypointList = this.entrypoints
			.map(
				entrypoint =>
					`\n  ${entrypoint.name} (${SizeFormatHelpers.formatSize(
						entrypoint.size
					)})\n${entrypoint.files.map(asset => `      ${asset}`).join("\n")}`
			)
			.join("");
		this.message = `entrypoint size limit: The following entrypoint(s) combined asset size exceeds the recommended limit (${SizeFormatHelpers.formatSize(
			entrypointLimit
		)}). This can impact web performance.
Entrypoints:${entrypointList}\n`;

		Error.captureStackTrace(this, this.constructor);
	}
};
