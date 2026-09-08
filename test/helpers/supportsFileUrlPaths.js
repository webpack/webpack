"use strict";

const webpackOptionsSchemaCheck = require("../../schemas/WebpackOptions.check");

// A file URL where the schema asks for an absolute path needs a `schema-utils`
// that accepts one, and the pre-compiled schema regenerated against it.
module.exports = function supportsFileUrlPaths() {
	return Boolean(webpackOptionsSchemaCheck({ context: "file:///directory" }));
};
