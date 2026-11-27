"use strict";

const supportsNullishCoalescing = require("../../../helpers/supportsNullishCoalescing");
const supportsOptionalChaining = require("../../../helpers/supportsOptionalChaining");

// The fixture's callees use `??` and `?.`, which the harness then executes.
module.exports = () =>
	supportsNullishCoalescing() && supportsOptionalChaining();
