"use strict";

const webpackOptionsSchemaCheck = require("../../schemas/WebpackOptions.check");

// A file URL where the schema asks for an absolute path needs a `schema-utils`
// that accepts one, and the pre-compiled schema regenerated against a `tooling`
// that does too — `precompile-schemas` hoists its own copy of the regexp.
module.exports = function supportsFileUrlPaths() {
	return Boolean(webpackOptionsSchemaCheck({ context: "file:///directory" }));
};
