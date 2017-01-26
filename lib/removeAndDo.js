/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
module.exports = function removeAndDo(collection, thing, action, argument) {
	var idx = collection.indexOf(thing);
	if(idx >= 0) {
		collection.splice(idx, 1);
		thing[action](argument);
		return true;
	}
	return false;
};
