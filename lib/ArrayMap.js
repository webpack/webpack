/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

class ArrayMap {
	constructor() {
		this.keys = [];
		this.values = [];
	}

	get(key) {
		for(let i = 0; i < this.keys.length; i++) {
			if(this.keys[i] === key) {
				return this.values[i];
			}
		}
		return;
	}

	set(key, value) {
		for(let i = 0; i < this.keys.length; i++) {
			if(this.keys[i] === key) {
				this.values[i] = value;
				return this;
			}
		}
		this.keys.push(key);
		this.values.push(value);
		return this;
	}

	remove(key) {
		for(let i = 0; i < this.keys.length; i++) {
			if(this.keys[i] === key) {
				this.keys.splice(i, 1);
				this.values.splice(i, 1);
				return true;
			}
		}
		return false;
	}

	clone() {
		const newMap = new ArrayMap();

		for(let i = 0; i < this.keys.length; i++) {
			newMap.keys.push(this.keys[i]);
			newMap.values.push(this.values[i]);
		}
		return newMap;
	}
}

module.exports = ArrayMap;
