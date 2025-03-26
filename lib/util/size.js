/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

module.exports.sizeof = data => {
	if (Buffer.isBuffer(data)) return data.length;
	if (typeof data === "string") return Buffer.byteLength(data, "utf8");
	if (data && typeof data === "object")
		return Buffer.byteLength(JSON.stringify(data), "utf8");
	return 0; // Fallback for unknown types
};
