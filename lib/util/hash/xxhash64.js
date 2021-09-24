/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

//#region wasm code: xxhash64 (../../../assembly/hash/xxhash64.asm.ts) --initialMemory 1
const xxhash64 = new WebAssembly.Module(
	Buffer.from(
		// 1180 bytes
		"AGFzbQEAAAABCAJgAX8AYAAAAwQDAQAABQMBAAEGGgV+AUIAC34BQgALfgFCAAt+AUIAC34BQgALByIEBGluaXQAAAZ1cGRhdGUAAQVmaW5hbAACBm1lbW9yeQIACrwIAzAAQtbrgu7q/Yn14AAkAELP1tO+0ser2UIkAUIAJAJC+erQ0OfJoeThACQDQgAkBAvUAQIBfwR+IABFBEAPCyMEIACtfCQEIwAhAiMBIQMjAiEEIwMhBQNAIAIgASkDAELP1tO+0ser2UJ+fEIfiUKHla+vmLbem55/fiECIAMgASkDCELP1tO+0ser2UJ+fEIfiUKHla+vmLbem55/fiEDIAQgASkDEELP1tO+0ser2UJ+fEIfiUKHla+vmLbem55/fiEEIAUgASkDGELP1tO+0ser2UJ+fEIfiUKHla+vmLbem55/fiEFIAAgAUEgaiIBSw0ACyACJAAgAyQBIAQkAiAFJAMLsgYCAX8EfiMEQgBSBH4jACICQgGJIwEiA0IHiXwjAiIEQgyJfCMDIgVCEol8IAJCz9bTvtLHq9lCfkIfiUKHla+vmLbem55/foVCh5Wvr5i23puef35CnaO16oOxjYr6AH0gA0LP1tO+0ser2UJ+Qh+JQoeVr6+Ytt6bnn9+hUKHla+vmLbem55/fkKdo7Xqg7GNivoAfSAEQs/W077Sx6vZQn5CH4lCh5Wvr5i23puef36FQoeVr6+Ytt6bnn9+Qp2jteqDsY2K+gB9IAVCz9bTvtLHq9lCfkIfiUKHla+vmLbem55/foVCh5Wvr5i23puef35CnaO16oOxjYr6AH0FQsXP2bLx5brqJwsjBCAArXx8IQIDQCABQQhqIABNBEAgAiABKQMAQs/W077Sx6vZQn5CH4lCh5Wvr5i23puef36FQhuJQoeVr6+Ytt6bnn9+Qp2jteqDsY2K+gB9IQIgAUEIaiEBDAELCyABQQRqIABNBEACfyACIAE1AgBCh5Wvr5i23puef36FQheJQs/W077Sx6vZQn5C+fPd8Zn2masWfCECIAFBBGoLIQELA0AgACABRwRAIAIgATEAAELFz9my8eW66id+hUILiUKHla+vmLbem55/fiECIAFBAWohAQwBCwtBACACIAJCIYiFQs/W077Sx6vZQn4iAiACQh2IhUL5893xmfaZqxZ+IgIgAkIgiIUiAjcDAEEAIAJCIIgiA0L//wODQiCGIANCgID8/w+DQhCIhCIDQv+BgIDwH4NCEIYgA0KA/oOAgOA/g0IIiIQiA0KPgLyA8IHAB4NCCIYgA0LwgcCHgJ6A+ACDQgSIhCIDQoaMmLDgwIGDBnxCBIhCgYKEiJCgwIABg0InfiADQrDgwIGDhoyYMIR8NwMAQQggAkL/////D4MiAkL//wODQiCGIAJCgID8/w+DQhCIhCICQv+BgIDwH4NCEIYgAkKA/oOAgOA/g0IIiIQiAkKPgLyA8IHAB4NCCIYgAkLwgcCHgJ6A+ACDQgSIhCICQoaMmLDgwIGDBnxCBIhCgYKEiJCgwIABg0InfiACQrDgwIGDhoyYMIR8NwMACw==",
		"base64"
	)
);
//#endregion

class XxHash64 {
	/**
	 * @param {WebAssembly.Instance} instance wasm instance
	 */
	constructor(instance) {
		const exports = /** @type {any} */ (instance.exports);
		exports.init();
		this.exports = exports;
		this.mem = Buffer.from(exports.memory.buffer, 0, 65536);
		this.buffered = 0;
	}

	reset() {
		this.buffered = 0;
		this.exports.init();
	}

	/**
	 * @param {Buffer | string} data data
	 * @param {BufferEncoding=} encoding encoding
	 * @returns {this} itself
	 */
	update(data, encoding) {
		if (typeof data === "string") {
			if (data.length < 21845) {
				this._updateWithShortString(data, encoding);
				return this;
			} else {
				data = Buffer.from(data, encoding);
			}
		}
		this._updateWithBuffer(data);
		return this;
	}

	/**
	 * @param {string} data data
	 * @param {BufferEncoding=} encoding encoding
	 * @returns {void}
	 */
	_updateWithShortString(data, encoding) {
		const { exports, buffered, mem } = this;
		let endPos;
		if (data.length < 70) {
			if (!encoding || encoding === "utf-8" || encoding === "utf8") {
				endPos = buffered;
				for (let i = 0; i < data.length; i++) {
					const cc = data.charCodeAt(i);
					if (cc < 0x80) mem[endPos++] = cc;
					else if (cc < 0x800) {
						mem[endPos] = (cc >> 6) | 0xc0;
						mem[endPos + 1] = (cc & 0x3f) | 0x80;
						endPos += 2;
					} else {
						// bail-out for weird chars
						endPos += mem.write(data.slice(endPos), endPos, encoding);
						break;
					}
				}
			} else if (encoding === "latin1") {
				endPos = buffered;
				for (let i = 0; i < data.length; i++) {
					const cc = data.charCodeAt(i);
					mem[endPos++] = cc;
				}
			} else {
				endPos = buffered + mem.write(data, buffered, encoding);
			}
		} else {
			endPos = buffered + mem.write(data, buffered, encoding);
		}
		if (endPos < 32) {
			this.buffered = endPos;
		} else {
			const l = (endPos >> 5) << 5;
			exports.update(l);
			const newBuffered = endPos - l;
			this.buffered = newBuffered;
			if (newBuffered > 0) mem.copyWithin(0, l, endPos);
		}
	}

	/**
	 * @param {Buffer} data data
	 * @returns {void}
	 */
	_updateWithBuffer(data) {
		const { exports, buffered, mem } = this;
		const length = data.length;
		if (buffered + length < 32) {
			data.copy(mem, buffered, 0, length);
			this.buffered += length;
		} else {
			const l = ((buffered + length) >> 5) << 5;
			if (l > 65536) {
				let i = 65536 - buffered;
				data.copy(mem, buffered, 0, i);
				exports.update(65536);
				const stop = l - buffered - 65536;
				while (i < stop) {
					data.copy(mem, 0, i, i + 65536);
					exports.update(65536);
					i += 65536;
				}
				data.copy(mem, 0, i, l - buffered);
				exports.update(l - buffered - i);
			} else {
				data.copy(mem, buffered, 0, l - buffered);
				exports.update(l);
			}
			const newBuffered = length + buffered - l;
			this.buffered = newBuffered;
			if (newBuffered > 0) data.copy(mem, 0, length - newBuffered, length);
		}
	}

	digest(type) {
		const { exports, buffered, mem } = this;
		exports.final(buffered);
		instancesPool.push(this);
		return mem.toString("latin1", 0, 16);
	}
}

const instancesPool = [];

const create = () => {
	if (instancesPool.length > 0) {
		const old = instancesPool.pop();
		old.reset();
		return old;
	} else {
		return new XxHash64(new WebAssembly.Instance(xxhash64));
	}
};

module.exports = create;
