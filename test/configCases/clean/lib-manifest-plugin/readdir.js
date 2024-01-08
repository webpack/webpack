const fs = require('fs');
const path = require('path');

function handlePath(path) {
	return path.replace(/\\/g, "/");
}

module.exports = function readDir(from) {
	const collectedFiles = [];
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
