/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const MODULE_REFERENCE_REGEXP = /^__WEBPACK_MODULE_REFERENCE__(\d+)_([\da-f]+|ns)(_call)?(_directImport)?(_strict)?(?:_asiSafe(\d))?__$/;

class ConcatenationScope {
	constructor(modulesWithInfo, currentModule) {
		this._currentModule = currentModule;
		this._modulesWithInfo = modulesWithInfo;
		this._modulesMap = new Map();
		for (const info of modulesWithInfo) {
			this._modulesMap.set(info.module, info);
		}
	}

	isModuleInScope(module) {
		return this._modulesMap.has(module);
	}

	createModuleReference(
		module,
		{
			ids = undefined,
			call = false,
			directImport = false,
			strict = false,
			asiSafe = false
		}
	) {
		const info = this._modulesMap.get(module);
		const callFlag = call ? "_call" : "";
		const directImportFlag = directImport ? "_directImport" : "";
		const strictFlag = strict ? "_strict" : "";
		const asiSafeFlag = asiSafe
			? "_asiSafe1"
			: asiSafe === false
			? "_asiSafe0"
			: "";
		const exportData = ids
			? Buffer.from(JSON.stringify(ids), "utf-8").toString("hex")
			: "ns";
		return `__WEBPACK_MODULE_REFERENCE__${info.index}_${exportData}${callFlag}${directImportFlag}${strictFlag}${asiSafeFlag}__`;
	}

	static isModuleReference(name) {
		return MODULE_REFERENCE_REGEXP.test(name);
	}

	static matchModuleReference(name, modulesWithInfo) {
		const match = MODULE_REFERENCE_REGEXP.exec(name);
		if (!match) return null;
		const index = +match[1];
		const asiSafe = match[6];
		return {
			index,
			info: modulesWithInfo[index],
			ids:
				match[2] === "ns"
					? []
					: JSON.parse(Buffer.from(match[2], "hex").toString("utf-8")),
			call: !!match[3],
			directImport: !!match[4],
			strict: !!match[5],
			asiSafe: asiSafe ? asiSafe === "1" : undefined
		};
	}
}

module.exports = ConcatenationScope;
