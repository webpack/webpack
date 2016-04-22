/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
module.exports = function isES6DefaultExportedFunc(thing) {
	return(
		typeof thing === "object" &&
		thing !== null &&
		(typeof thing.default === "function" || thing.__esModule == true)
	);
};
