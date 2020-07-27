/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

class TupleIdentityScope {
	constructor() {
		this._map = new Map();
	}

	get(...args) {
		let map = this._map;
		for (let i = 0; i < args.length - 1; i++) {
			const arg = args[i];
			const innerMap = map.get(arg);
			if (innerMap === undefined) {
				map.set(arg, (map = new Map()));
			} else {
				map = innerMap;
			}
		}
		const last = args[args.length - 1];
		const tuple = map.get(last);
		if (tuple === undefined) {
			map.set(last, args);
			return args;
		} else {
			return tuple;
		}
	}
}

module.exports = TupleIdentityScope;
