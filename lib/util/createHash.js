/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const BULK_SIZE = 1000;

class BulkUpdateDecorator {
	constructor(hash) {
		this.hash = hash;
		this.buffer = "";
	}

	update(data, inputEncoding) {
		if(inputEncoding !== undefined || typeof data !== "string" || data.length > BULK_SIZE) {
			if(this.buffer.length > 0) {
				this.hash.update(this.buffer);
				this.buffer = "";
			}
			this.hash.update(data, inputEncoding);
		} else {
			this.buffer += data;
			if(this.buffer.length > BULK_SIZE) {
				this.hash.update(this.buffer);
				this.buffer = "";
			}
		}
		return this;
	}

	digest(encoding) {
		if(this.buffer.length > 0) {
			this.hash.update(this.buffer);
		}
		return this.hash.digest(encoding);
	}
}

module.exports = algorithm => {
	switch(algorithm) {
		// TODO add non-cryptographic algorithm here
		default: return new BulkUpdateDecorator(require("crypto").createHash(algorithm));
	}
};
