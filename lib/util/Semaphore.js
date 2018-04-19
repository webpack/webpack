/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class Semaphore {
	constructor(available) {
		this.available = available;
		this.waiters = [];
		this._continue = this._continue.bind(this);
	}

	acquire(callback) {
		if (this.available > 0) {
			this.available--;
			callback();
		} else {
			this.waiters.push(callback);
		}
	}

	release() {
		this.available++;
		if (this.waiters.length > 0) {
			process.nextTick(this._continue);
		}
	}

	_continue() {
		if (this.available > 0) {
			if (this.waiters.length > 0) {
				this.available--;
				const callback = this.waiters.pop();
				callback();
			}
		}
	}
}

module.exports = Semaphore;
