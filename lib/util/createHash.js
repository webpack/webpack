/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const BULK_SIZE = 10000;

class BulkUpdateDecorator {
	constructor(hash) {
		this.hash = hash;
		this.buffer = "";
	}

	update(data, inputEncoding) {
		if(inputEncoding !== undefined || typeof data !== "string" || data.length > BULK_SIZE) {
			if(this.buffer.length > 0)
				this._flush();
			this.hash.update(data, inputEncoding);
		} else {
			this.buffer += data;
			if(this.buffer.length > BULK_SIZE) {
				this._flush();
			}
		}
		return this;
	}

	_flush() {
		this.hash.update(this.buffer);
		this.buffer = "";
	}

	digest(encoding) {
		if(this.buffer.length > 0)
			this._flush();
		return this.hash.digest(encoding);
	}
}

module.exports = algorithm => {
	switch(algorithm) {
		// TODO add non-cryptographic algorithm here
		default:
			return new BulkUpdateDecorator(require("crypto").createHash(algorithm));
	}
};
