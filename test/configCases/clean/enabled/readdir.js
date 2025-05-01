const fs = require('fs');
const path = require('path');

/**
 * @param {string} path path
 * @returns {string} path
 */
function handlePath(path) {
	return path.replace(/\\/g, "/");
}

/**
 * @param {string} from from
 * @returns {{ files: string[], directories: string[] }}
 */
module.exports = function readDir(from) {
	/** @type {string[]} */
	const collectedFiles = [];
	/** @type {string[]} */
	const collectedDirectories = [];
	const stack = [from];
	let cursor;

	while ((cursor = stack.pop())) {
		const stat = fs.statSync(cursor);

		if (stat.isDirectory()) {
			const items = fs.readdirSync(cursor);

			if (from !== cursor) {
				const relative = path.relative(from, cursor);
				collectedDirectories.push(handlePath(relative));
			}

			for (let i = 0; i < items.length; i++) {
				stack.push(path.join(cursor, items[i]));
			}
		} else {
			const relative = path.relative(from, cursor);
			collectedFiles.push(handlePath(relative));
		}
	}

	return {
		files: collectedFiles,
		directories: collectedDirectories
	};
}
