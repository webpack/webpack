/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function NullFactory() {}
module.exports = NullFactory;

NullFactory.prototype.create = function(data, callback) {
	return callback();
};
