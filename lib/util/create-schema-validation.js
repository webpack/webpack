/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const memoize = require("./memoize");

const getValidate = memoize(() => require("schema-utils").validate);

const createSchemaValidation = (check = v => false, getSchema, options) => {
	getSchema = memoize(getSchema);
	return value => {
		if (!check(value)) {
			getValidate()(getSchema(), value, options);
		}
	};
};

module.exports = createSchemaValidation;
