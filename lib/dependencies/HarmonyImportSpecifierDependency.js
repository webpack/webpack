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
		if(this.strictExportPresence || this.originModule.meta.strictHarmonyModule) {
			return [];
		}
		return this._getErrors();
	}

	getErrors() {
		if(this.strictExportPresence || this.originModule.meta.strictHarmonyModule) {
			return this._getErrors();
		}
		return [];
	}

	_getErrors() {
		const importedModule = this.module;
		if(!importedModule) {
			return;
		}

		if(!importedModule.meta || !importedModule.meta.harmonyModule) {
			// It's not an harmony module
			if(this.originModule.meta.strictHarmonyModule && this.id !== "default") {
				// In strict harmony modules we only support the default export
				const exportName = this.id ? `the named export '${this.id}'` : "the namespace object";
				const err = new Error(`Can't import ${exportName} from non EcmaScript module (only default export is available)`);
				err.hideStack = true;
				return [err];
			}
			return;
		}

		if(!this.id) {
			return;
		}

		if(importedModule.isProvided(this.id) !== false) {
			// It's provided or we are not sure
			return;
		}

		// We are sure that it's not provided
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
	apply(dep, source, runtime) {
		super.apply(dep, source, runtime);
		const importedVar = dep.getImportVar();
		const content = this.getContent(dep, importedVar);
		source.replace(dep.range[0], dep.range[1] - 1, content);
	}

	getContent(dep, importedVar) {
		const importedModule = dep.module;
		const nonHarmonyImport = !(importedModule && (!importedModule.meta || importedModule.meta.harmonyModule));
		const importedVarSuffix = this.getImportVarSuffix(dep.id, importedModule);
		const shortHandPrefix = dep.shorthand ? `${dep.name}: ` : "";

		// Note: dep.call and dep.shorthand are exclusive

		if(nonHarmonyImport) {
			const defaultExport = dep.id === "default";
			if(dep.originModule.meta.strictHarmonyModule) {
				if(defaultExport) {
					return `${shortHandPrefix}${importedVar}`;
				}

				if(!dep.id) {
					if(shortHandPrefix)
						return `${shortHandPrefix}/* fake namespace object for non-esm import */ { default: ${importedVar} }`;
					else
						return `Object(/* fake namespace object for non-esm import */{ "default": ${importedVar} })`;
				}

				return `${shortHandPrefix}/* non-default import from non-esm module */undefined`;
			} else {
				if(dep.call && defaultExport) {
					return `${shortHandPrefix}${importedVar}_default()`;
				}

				if(defaultExport) {
					return `${shortHandPrefix}${importedVar}_default.a`;
				}
			}
		}

		if(dep.call && dep.id && dep.directImport) {
			return `Object(${importedVar}${importedVarSuffix})`;
		}

		return `${shortHandPrefix}${importedVar}${importedVarSuffix}`;
	}

	getImportVarSuffix(id, importedModule) {
		if(id) {
			const used = importedModule ? importedModule.isUsed(id) : id;
			const optionalComment = id !== used ? " /* " + id + " */" : "";
			return `[${JSON.stringify(used)}${optionalComment}]`;
		}

		return "";
	}
};

module.exports = HarmonyImportSpecifierDependency;
