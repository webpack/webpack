"use strict";

/**
 * check the instance is a instance of the class, not strict
 * @param {Object} instance the instance to be checked
 * @param {Function} Creator the class to be checked
 * @returns {boolean}
 */

exports.isInstanceNotStrictly = (instance, Creator) => {
	if (instance instanceof Creator) {
		return true;
	}

	let proto = Object.getPrototypeOf(instance);
	while (proto !== null) {
		if (proto.constructor && proto.constructor.name === Creator.name) {
			return true;
		}
		proto = Object.getPrototypeOf(proto);
	}

	return false;
};
