"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const ConcatSource = require("webpack-sources").ConcatSource;
const Tapable = require("tapable");
const START_LOWERCASE_ALPHABET_CODE = "a".charCodeAt(0);
const START_UPPERCASE_ALPHABET_CODE = "A".charCodeAt(0);
const DELTA_A_TO_Z = "z".charCodeAt(0) - START_LOWERCASE_ALPHABET_CODE + 1;
function moduleIdIsNumber(module) {
	return typeof module.id === "number";
}
class Template extends Tapable {
	constructor(outputOptions) {
		super();
		this.outputOptions = outputOptions || {};
	}

	static getFunctionContent(fn) {
		return fn.toString().replace(/^function\s?\(\)\s?\{\n?|\n?\}$/g, "").replace(/^\t/mg, "");
	}

	static toIdentifier(str) {
		if(typeof str !== "string") {
			return "";
		}
		return str.replace(/^[^a-zA-Z$_]/, "_").replace(/[^a-zA-Z0-9$_]/g, "_");
	}

	// map number to a single character a-z, A-Z or <_ + number> if number is too big
	static numberToIdentifer(n) {
		// lower case
		if(n < DELTA_A_TO_Z) {
			return String.fromCharCode(START_LOWERCASE_ALPHABET_CODE + n);
		}
		// upper case
		n -= DELTA_A_TO_Z;
		if(n < DELTA_A_TO_Z) {
			return String.fromCharCode(START_UPPERCASE_ALPHABET_CODE + n);
		}
		// fall back to _ + number
		n -= DELTA_A_TO_Z;
		return `_${n}`;
	}

	indent(str) {
		if(Array.isArray(str)) {
			return str.map(this.indent.bind(this)).join("\n");
		} else {
			str = str.trimRight();
			if(!str) {
				return "";
			}
			const ind = str[0] === "\n" ? "" : "\t";
			return ind + str.replace(/\n([^\n])/g, "\n\t$1");
		}
	}

	prefix(str, prefix) {
		if(Array.isArray(str)) {
			str = str.join("\n");
		}
		str = str.trim();
		if(!str) {
			return "";
		}
		const ind = str[0] === "\n" ? "" : prefix;
		return ind + str.replace(/\n([^\n])/g, "\n" + prefix + "$1");
	}

	asString(str) {
		if(Array.isArray(str)) {
			return str.join("\n");
		}
		return str;
	}

	renderChunkModules(chunk, moduleTemplate, dependencyTemplates, prefix) {
		prefix = prefix || ""
		const source = new ConcatSource();
		if(chunk.modules.length === 0) {
			source.add("[]");
			return source;
		}
		const removedModules = chunk.removedModules;
		const allModules = chunk.modules.map(module => ({
			id: module.id,
			source: moduleTemplate.render(module, dependencyTemplates, chunk)
		}));
		if(removedModules && removedModules.length > 0) {
			removedModules.forEach(id => {
				allModules.push({
					id,
					source: "false"
				});
			});
		}
		const bounds = this.getModulesArrayBounds(chunk.modules);
		if(bounds) {
			// Render a spare array
			const minId = bounds[0];
			const maxId = bounds[1];
			if(minId !== 0) {
				source.add(`Array(${minId}).concat(`);
			}
			source.add("[\n");
			const modules = {};
			allModules.forEach(module => {
				modules[module.id] = module;
			});
			for(let idx = minId; idx <= maxId; idx++) {
				const module = modules[idx];
				if(idx !== minId) {
					source.add(",\n");
				}
				source.add(`/* ${idx} */`);
				if(module) {
					source.add("\n");
					source.add(module.source);
				}
			}
			source.add(`\n${prefix}]`);
			if(minId !== 0) {
				source.add(")");
			}
		} else {
			// Render an object
			source.add("{\n");
			allModules.sort((a, b) => {
				const aId = `${a.id}`;
				const bId = `${b.id}`;
				if(aId < bId) {
					return -1;
				}
				if(aId > bId) {
					return 1;
				}
				return 0;
			}).forEach((module, idx) => {
				if(idx !== 0) {
					source.add(",\n");
				}
				source.add(`\n/***/ ${JSON.stringify(module.id)}:\n`);
				source.add(module.source);
			});
			source.add(`\n\n${prefix}}`);
		}
		return source;
	}

	getModulesArrayBounds(modules) {
		if(!modules.every(moduleIdIsNumber)) {
			return false;
		}
		let maxId = -Infinity;
		let minId = Infinity;
		modules.forEach(module => {
			if(maxId < module.id) {
				maxId = module.id;
			}
			if(minId > module.id) {
				minId = module.id;
			}
		});
		if(minId < 16 + ("" + minId).length) {
			// add minId x ',' instead of 'Array(minId).concat(...)'
			minId = 0;
		}
		const objectOverhead = modules.map(module => {
			const idLength = (`${module.id}`).length;
			return idLength + 2;
		}).reduce((a, b) => a + b, -1);
		const arrayOverhead = minId === 0 ? maxId : 16 + ("" + minId).length + maxId;
		return arrayOverhead < objectOverhead ? [minId, maxId] : false;
	}
}
module.exports = Template;
