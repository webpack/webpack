/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const ModuleDependency = require("./ModuleDependency");
const Template = require("../Template");

class HarmonyImportDependency extends ModuleDependency {
	constructor(request, originModule, sourceOrder, parserScope) {
		super(request);
		this.originModule = originModule;
		this.sourceOrder = sourceOrder;
		this.parserScope = parserScope;
	}

	getReference() {
		if(!this.module) return null;

		return {
			module: this.module,
			importedNames: false,
			weak: this.weak
		};
	}

	getImportVar() {
		let importVarMap = this.parserScope.importVarMap;
		if(!importVarMap) this.parserScope.importVarMap = importVarMap = new Map();
		let importVar = importVarMap.get(this.module);
		if(importVar) return importVar;
		importVar = `${Template.toIdentifier(`${this.userRequest}`)}__WEBPACK_IMPORTED_MODULE_${importVarMap.size}__`;
		importVarMap.set(this.module, importVar);
		return importVar;
	}

	getImportStatement(declare, runtime) {
		const module = this.module;
		const comment = runtime.outputOptions.pathinfo ? Template.toComment(runtime.requestShortener.shorten(this.request)) : "";
		const optDeclaration = declare ? "var " : "";
		const optNewline = declare ? "\n" : " ";

		if(!module) {
			const stringifiedError = JSON.stringify(`Cannot find module "${this.request}"`);
			return `throw new Error(${stringifiedError});${optNewline}`;
		}

		const importVar = this.getImportVar();

		if(importVar) {
			const isHarmonyModule = module.meta && module.meta.harmonyModule;
			const content = `/* harmony import */ ${optDeclaration}${importVar} = __webpack_require__(${comment}${JSON.stringify(module.id)});${optNewline}`;
			if(isHarmonyModule || this.originModule.meta.strictHarmonyModule) {
				return content;
			}
			return `${content}/* harmony import */ ${optDeclaration}${importVar}_default = /*#__PURE__*/__webpack_require__.n(${importVar});${optNewline}`;
		}

		return "";
	}

	updateHash(hash) {
		super.updateHash(hash);
		const importedModule = this.module;
		hash.update((importedModule && (!importedModule.meta || importedModule.meta.harmonyModule)) + "");
		hash.update((importedModule && importedModule.id) + "");
	}
}

module.exports = HarmonyImportDependency;

const importEmittedMap = new WeakMap();

HarmonyImportDependency.Template = class HarmonyImportDependencyTemplate {
	apply() {}

	getHarmonyInitOrder(dep) {
		return dep.sourceOrder;
	}

	static isImportEmitted(dep, source) {
		let sourceInfo = importEmittedMap.get(source);
		if(!sourceInfo) return false;
		const key = dep.module || dep.request;
		return key && sourceInfo.emittedImports.get(key);
	}

	harmonyInit(dep, source, runtime) {
		let sourceInfo = importEmittedMap.get(source);
		if(!sourceInfo) {
			importEmittedMap.set(source, sourceInfo = {
				emittedImports: new Map()
			});
		}
		const key = dep.module || dep.request;
		if(key && sourceInfo.emittedImports.get(key)) return;
		sourceInfo.emittedImports.set(key, true);
		const content = dep.getImportStatement(true, runtime);
		source.insert(-1, content);
	}
};
