/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const HarmonyImportDependency = require("./HarmonyImportDependency");

class HarmonyImportSpecifierDependency extends HarmonyImportDependency {
	constructor(request, originModule, sourceOrder, parserScope, id, name, range, strictExportPresence) {
		super(request, originModule, sourceOrder, parserScope);
		this.id = id;
		this.name = name;
		this.range = range;
		this.strictExportPresence = strictExportPresence;
		this.namespaceObjectAsContext = false;
		this.callArgs = undefined;
		this.call = undefined;
		this.directImport = undefined;
	}

	get type() {
		return "harmony import specifier";
	}

	getReference() {
		if(!this.module) return null;
		return {
			module: this.module,
			importedNames: this.id && !this.namespaceObjectAsContext ? [this.id] : true
		};
	}

	getWarnings() {
		if(this.strictExportPresence) {
			return [];
		}
		return this._getErrors();
	}

	getErrors() {
		if(this.strictExportPresence) {
			return this._getErrors();
		}
		return [];
	}

	_getErrors() {
		const importedModule = this.module;
		if(!importedModule || !importedModule.meta || !importedModule.meta.harmonyModule) {
			return;
		}

		if(!this.id) {
			return;
		}

		if(importedModule.isProvided(this.id) !== false) {
			return;
		}

		const idIsNotNameMessage = this.id !== this.name ? ` (imported as '${this.name}')` : "";
		const errorMessage = `"export '${this.id}'${idIsNotNameMessage} was not found in '${this.userRequest}'`;
		const err = new Error(errorMessage);
		err.hideStack = true;
		return [err];
	}

	// implement this method to allow the occurence order plugin to count correctly
	getNumberOfIdOccurrences() {
		return 0;
	}

	updateHash(hash) {
		super.updateHash(hash);
		const importedModule = this.module;
		hash.update((importedModule && this.id) + "");
		hash.update((importedModule && this.id && importedModule.isUsed(this.id)) + "");
		hash.update((importedModule && (!importedModule.meta || importedModule.meta.harmonyModule)) + "");
		hash.update((importedModule && (importedModule.used + JSON.stringify(importedModule.usedExports))) + "");
	}
}

HarmonyImportSpecifierDependency.Template = class HarmonyImportSpecifierDependencyTemplate extends HarmonyImportDependency.Template {
	apply(dep, source, outputOptions, requestShortener) {
		super.apply(dep, source, outputOptions, requestShortener);
		const importedVar = dep.getImportVar(requestShortener);
		const content = this.getContent(dep, importedVar);
		source.replace(dep.range[0], dep.range[1] - 1, content);
	}

	getContent(dep, importedVar) {
		const importedModule = dep.module;
		const nonHarmonyDefaultImport = dep.directImport && dep.id === "default" && !(importedModule && (!importedModule.meta || importedModule.meta.harmonyModule));
		const shortHandPrefix = dep.shorthand ? `${dep.name}: ` : "";
		const importedVarSuffix = this.getImportVarSuffix(dep.id, nonHarmonyDefaultImport, importedModule);

		if(dep.call && nonHarmonyDefaultImport) {
			return `${shortHandPrefix}${importedVar}_default()`;
		}

		if(dep.call && dep.id) {
			return `${shortHandPrefix}Object(${importedVar}${importedVarSuffix})`;
		}

		return `${shortHandPrefix}${importedVar}${importedVarSuffix}`;
	}

	getImportVarSuffix(id, nonHarmonyDefaultImport, importedModule) {
		if(nonHarmonyDefaultImport) {
			return "_default.a";
		}

		if(id) {
			const used = importedModule ? importedModule.isUsed(id) : id;
			const optionalComment = id !== used ? " /* " + id + " */" : "";
			return `[${JSON.stringify(used)}${optionalComment}]`;
		}

		return "";
	}
};

module.exports = HarmonyImportSpecifierDependency;
