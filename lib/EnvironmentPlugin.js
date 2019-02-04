/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Authors Simen Brekken @simenbrekken, Einar Löve @einarlove
*/

"use strict";

/** @typedef {import("./Compiler")} Compiler */

const WebpackError = require("./WebpackError");
const ParserHelpers = require("./ParserHelpers");

const needsEnvVarFix =
	["8", "9"].indexOf(process.versions.node.split(".")[0]) >= 0 &&
	process.platform === "win32";

class EnvironmentPlugin {
	constructor(...keys) {
		if (keys.length === 1 && Array.isArray(keys[0])) {
			this.keys = keys[0];
			this.defaultValues = {};
		} else if (keys.length === 1 && keys[0] && typeof keys[0] === "object") {
			this.keys = Object.keys(keys[0]);
			this.defaultValues = keys[0];
		} else {
			this.keys = keys;
			this.defaultValues = {};
		}
	}

	/**
	 * @param {Compiler} compiler webpack compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const definitions = this.keys.map(key => {
			// TODO remove once the fix has made its way into Node 8.
			// Work around https://github.com/nodejs/node/pull/18463,
			// affecting Node 8 & 9 by performing an OS-level
			// operation that always succeeds before reading
			// environment variables:
			if (needsEnvVarFix) require("os").cpus();

			const value =
				process.env[key] !== undefined
					? process.env[key]
					: this.defaultValues[key];

			if (value === undefined) {
				compiler.hooks.thisCompilation.tap("EnvironmentPlugin", compilation => {
					const error = new WebpackError(
						`EnvironmentPlugin - ${key} environment variable is undefined.\n\n` +
							"You can pass an object with default values to suppress this warning.\n" +
							"See https://webpack.js.org/plugins/environment-plugin for example."
					);

					error.name = "EnvVariableNotDefinedError";
					compilation.warnings.push(error);
				});
			}
			const code = value === undefined ? "undefined" : JSON.stringify(value);
			return `process.env.${key}=${code}`;
		}, {});

		const envOverrideCode =
			definitions.reduce((defs, def) => defs + ";\n" + def) + ";\n";

		compiler.hooks.normalModuleFactory.tap("EnvironmentPlugin", factory => {
			var overridden = false;
			const handler = (parser, options) => {
				parser.hooks.expression
					.for("process")
					.tap("EnvironmentPlugin", expr => {
						if (overridden) return;
						overridden = true;
						expr.range = [0, 0];
						return ParserHelpers.toConstantDependency(parser, envOverrideCode)(
							expr
						);
					});
			};

			factory.hooks.parser
				.for("javascript/auto")
				.tap("EnvironmentPlugin", handler);
			factory.hooks.parser
				.for("javascript/dynamic")
				.tap("EnvironmentPlugin", handler);
			factory.hooks.parser
				.for("javascript/esm")
				.tap("EnvironmentPlugin", handler);
		});
	}
}

module.exports = EnvironmentPlugin;
