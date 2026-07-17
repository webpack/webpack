"use strict";

exports.e = "escaped";
// the exports object escapes as a value
(function (obj) {
	obj.mutated = true;
})(exports);
