/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
module.exports = function removeAndDo(collection, thing, action) {
	var idx = this[collection].indexOf(thing);
	if(idx >= 0) {
		this[collection].splice(idx, 1);
		thing[action](this);
		return true;
	}
	return false;
};
