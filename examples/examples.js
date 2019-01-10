"use strict";

const fs = require("fs");
const path = require("path");

function findInFolder(folder, depth) {
	if(fs.existsSync(path.join(folder, "template.md"))) {
		return [folder];
	} else if(depth > 0) {
		const files = fs.readdirSync(folder);
		const results = [];
		for(const file of files) {
			const innerPath = path.join(folder, file);
			if(fs.statSync(innerPath).isDirectory()) {
				const innerResult = findInFolder(innerPath, depth - 1);
				for(const item of innerResult)
					results.push(item);
			}
		}
		return results;
	} else {
		return [];
	}
}

module.exports = findInFolder(__dirname, 2).sort();
