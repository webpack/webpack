/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const memoize = require("./memoize");

const getValidate = memoize(() => require("schema-utils").validate);

const createSchemaValidation = (check, getSchema, options) => {
	getSchema = memoize(getSchema);
	return value => {
		if (check && !check(value)) {
			getValidate()(getSchema(), value, options);
			if (check) {
				require("util").deprecate(
					() => {},
					"webpack bug: Pre-compiled schema reports error while real schema is happy. This has performance drawbacks.",
					"DEP_WEBPACK_PRE_COMPILED_SCHEMA_INVALID"
				)();
			}
		}
	};
};

module.exports = createSchemaValidation;
