/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const util = require("util");

class StackedSetMap {
	constructor(defaultValue, parentStack) {
		this.defaultValue = defaultValue;
		this.stack = parentStack === undefined ? [] : parentStack.slice();
		this.map = new Map();
		this.stack.push(this.map);
	}

	add(item) {
		this.map.set(item, true);
	}

	set(item, value) {
		this.map.set(item, value);
	}

	delete(item) {
		this.map.set(item, false);
	}

	has(item) {
		return this.get(item, false);
	}

	get(item) {
		const topValue = this.map.get(item);
		if(typeof topValue !== "undefined")
			return topValue;
		for(var i = this.stack.length - 2; i >= 0; i--) {
			const value = this.stack[i].get(item);
			if(typeof value !== "undefined") {
				this.map.set(item, value);
				return value;
			}
		}
		this.map.set(item, this.defaultValue);
		return this.defaultValue;
	}

	_compress() {
		this.map = new Map();
		for(const data of this.stack) {
			for(const pair of data) {
				this.map.set(pair[0], pair[1]);
			}
		}
		this.stack = [this.map];
	}

	asSet() {
		this._compress();
		return new Set(Array.from(this.map.entries()).filter(pair => pair[1]).map(pair => pair[0]));
	}

	createChild() {
		return new StackedSetMap(this.defaultValue, this.stack);
	}

	get length() {
		throw new Error("This is no longer an Array");
	}

	set length(value) {
		throw new Error("This is no longer an Array");
	}
}

StackedSetMap.prototype.push = util.deprecate(function(item) {
	this.add(item);
}, "This is no longer an Array: Use add instead.");

module.exports = StackedSetMap;
