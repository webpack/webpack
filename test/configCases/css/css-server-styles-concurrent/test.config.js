"use strict";

const fs = require("fs");
const path = require("path");

/** @type {Map<string, () => void>} */
const pending = new Map();

module.exports = {
	/**
	 * @param {number} index configuration index
	 * @returns {string[]} entries sharing the server style registry
	 */
	findBundle(index) {
		return [`bundle${index}-a.mjs`, `bundle${index}-b.mjs`];
	},
	modules: {
		fs: {
			/**
			 * @param {import("fs").PathLike} filename stylesheet path
			 * @param {BufferEncoding} encoding file encoding
			 * @param {(error: NodeJS.ErrnoException | null, content: string) => void} callback read callback
			 * @returns {void}
			 */
			readFile(filename, encoding, callback) {
				fs.readFile(filename, encoding, (error, content) => {
					pending.set(path.basename(String(filename)), () =>
						callback(error, content)
					);
					if (pending.size !== 2) return;
					const first = pending.get("first.css");
					const second = pending.get("second.css");
					pending.clear();
					second();
					first();
				});
			}
		}
	}
};
