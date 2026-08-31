"use strict";

module.exports = function identity(value) {
	return value.raw ? value.raw[0] : value;
};
