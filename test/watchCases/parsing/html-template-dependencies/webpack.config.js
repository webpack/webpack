"use strict";

const fs = require("fs");
const path = require("path");

/**
 * @param {string} file a path
 * @returns {string} its trimmed text
 */
const read = (file) => fs.readFileSync(file, "utf8").trim();

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	experiments: { html: true },
	module: {
		parser: {
			html: {
				// Reads three things only the template knows about, so only the
				// dependencies it registers can trigger the rebuilds the steps check.
				template(
					source,
					{
						resource,
						addDependency,
						addMissingDependency,
						addContextDependency,
						emitWarning,
						emitError
					}
				) {
					const directory = path.dirname(resource);
					const title = path.join(directory, "title.txt");
					const extra = path.join(directory, "extra.txt");
					const partials = path.join(directory, "partials");
					addDependency(title);
					addMissingDependency(extra);
					addContextDependency(partials);
					const hasExtra = fs.existsSync(extra);
					if (!hasExtra) {
						emitWarning("extra.txt is missing");
						emitWarning(new Error("extra.txt is still missing"));
						emitError("extra.txt is required");
						emitError(new Error("extra.txt is still required"));
					}
					return source
						.replace("{{title}}", read(title))
						.replace("{{extra}}", hasExtra ? read(extra) : "none")
						.replace("{{partials}}", fs.readdirSync(partials).sort().join(","));
				}
			}
		}
	}
};
