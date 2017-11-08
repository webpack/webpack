/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

// TODO can this be deleted?
module.exports = (collection, thing, action) => {
	const idx = this[collection].indexOf(thing);
	const hasThingInCollection = idx >= 0;
	if(hasThingInCollection) {
		this[collection].splice(idx, 1);
		thing[action](this);
	}
	return hasThingInCollection;
};
