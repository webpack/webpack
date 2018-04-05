/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const DependencyReference = require("./DependencyReference");
const HarmonyImportDependency = require("./HarmonyImportDependency");
const HarmonyLinkingError = require("../HarmonyLinkingError");

class HarmonyImportSpecifierDependency extends HarmonyImportDependency {
	constructor(
		request,
		originModule,
		sourceOrder,
		parserScope,
		id,
		name,
		range,
		strictExportPresence
	) {
		super(request, originModule, sourceOrder, parserScope);
		this.id = id === null ? null : `${id}`;
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
		if (!this.module) return null;
		return new DependencyReference(
			this.module,
			this.id && !this.namespaceObjectAsContext ? [this.id] : true,
			false
		);
	}

	getWarnings() {
		if (
			this.strictExportPresence ||
			this.originModule.buildMeta.strictHarmonyModule
		) {
			return [];
		}
		return this._getErrors();
	}

	getErrors() {
		if (
			this.strictExportPresence ||
			this.originModule.buildMeta.strictHarmonyModule
		) {
			return this._getErrors();
		}
		return [];
	}

	_getErrors() {
		const importedModule = this.module;
		if (!importedModule) {
			return;
		}

		if (!importedModule.buildMeta || !importedModule.buildMeta.exportsType) {
			// It's not an harmony module
			if (
				this.originModule.buildMeta.strictHarmonyModule &&
				this.id !== "default"
			) {
				// In strict harmony modules we only support the default export
				const exportName = this.id
					? `the named export '${this.id}'`
					: "the namespace object";
				return [
					new HarmonyLinkingError(
						`Can't import ${exportName} from non EcmaScript module (only default export is available)`
					)
				];
			}
			return;
		}

		if (!this.id) {
			return;
		}

		if (importedModule.isProvided(this.id) !== false) {
			// It's provided or we are not sure
			return;
		}

		// We are sure that it's not provided
		const idIsNotNameMessage =
			this.id !== this.name ? ` (imported as '${this.name}')` : "";
		const errorMessage = `"export '${
			this.id
		}'${idIsNotNameMessage} was not found in '${this.userRequest}'`;
		return [new HarmonyLinkingError(errorMessage)];
	}

	// implement this method to allow the occurrence order plugin to count correctly
	getNumberOfIdOccurrences() {
		return 0;
	}

	updateHash(hash) {
		super.updateHash(hash);
		const importedModule = this.module;
		hash.update((importedModule && this.id) + "");
		hash.update(
			(importedModule && this.id && importedModule.isUsed(this.id)) + ""
		);
		hash.update(
			(importedModule &&
				(!importedModule.buildMeta || importedModule.buildMeta.exportsType)) +
				""
		);
		hash.update(
			(importedModule &&
				importedModule.used + JSON.stringify(importedModule.usedExports)) + ""
		);
	}
}

HarmonyImportSpecifierDependency.Template = class HarmonyImportSpecifierDependencyTemplate extends HarmonyImportDependency.Template {
	apply(dep, source, runtime) {
		super.apply(dep, source, runtime);
		const content = this.getContent(dep, runtime);
		source.replace(dep.range[0], dep.range[1] - 1, content);
	}

	getContent(dep, runtime) {
		const exportExpr = runtime.exportFromImport({
			module: dep.module,
			request: dep.request,
			exportName: dep.id,
			originModule: dep.originModule,
			asiSafe: dep.shorthand,
			isCall: dep.call,
			callContext: !dep.directImport,
			importVar: dep.getImportVar()
		});
		return dep.shorthand ? `${dep.name}: ${exportExpr}` : exportExpr;
	}
};

module.exports = HarmonyImportSpecifierDependency;
