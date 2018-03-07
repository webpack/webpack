/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const HarmonyImportDependency = require("./HarmonyImportDependency");
const Template = require("../Template");

class HarmonyExportImportedSpecifierDependency extends HarmonyImportDependency {
	constructor(
		request,
		originModule,
		sourceOrder,
		parserScope,
		id,
		name,
		activeExports,
		otherStarExports,
		strictExportPresence
	) {
		super(request, originModule, sourceOrder, parserScope);
		this.id = id;
		this.name = name;
		this.activeExports = activeExports;
		this.otherStarExports = otherStarExports;
		this.strictExportPresence = strictExportPresence;
	}

	get type() {
		return "harmony export imported specifier";
	}

	getMode(ignoreUnused) {
		const name = this.name;
		const id = this.id;
		const used = this.originModule.isUsed(name);
		const importedModule = this.module;

		if (!importedModule) {
			return {
				type: "missing",
				userRequest: this.userRequest
			};
		}

		if (
			!ignoreUnused &&
			(name ? !used : this.originModule.usedExports === false)
		) {
			return {
				type: "unused",
				name: name || "*"
			};
		}

		const isNotAHarmonyModule =
			importedModule.buildMeta && !importedModule.buildMeta.exportsType;
		const strictHarmonyModule = this.originModule.buildMeta.strictHarmonyModule;
		if (name && id === "default" && isNotAHarmonyModule) {
			if (strictHarmonyModule) {
				return {
					type: "reexport-non-harmony-default-strict",
					module: importedModule,
					name
				};
			} else {
				return {
					type: "reexport-non-harmony-default",
					module: importedModule,
					name
				};
			}
		}

		if (name) {
			// export { name as name }
			if (id) {
				if (isNotAHarmonyModule && strictHarmonyModule) {
					return {
						type: "rexport-non-harmony-undefined",
						module: importedModule,
						name
					};
				} else {
					return {
						type: "safe-reexport",
						module: importedModule,
						map: new Map([[name, id]])
					};
				}
			}

			// export { * as name }
			if (isNotAHarmonyModule && strictHarmonyModule) {
				return {
					type: "reexport-fake-namespace-object",
					module: importedModule,
					name
				};
			} else {
				return {
					type: "reexport-namespace-object",
					module: importedModule,
					name
				};
			}
		}

		const hasUsedExports = Array.isArray(this.originModule.usedExports);
		const hasProvidedExports = Array.isArray(
			importedModule.buildMeta.providedExports
		);
		const activeFromOtherStarExports = this._discoverActiveExportsFromOtherStartExports();

		// export *
		if (hasUsedExports) {
			// reexport * with known used exports
			if (hasProvidedExports) {
				const map = new Map(
					this.originModule.usedExports
						.filter(id => {
							if (id === "default") return false;
							if (this.activeExports.has(id)) return false;
							if (activeFromOtherStarExports.has(id)) return false;
							if (!importedModule.buildMeta.providedExports.includes(id))
								return false;
							return true;
						})
						.map(item => [item, item])
				);

				if (map.size === 0) {
					return {
						type: "empty-star"
					};
				}

				return {
					type: "safe-reexport",
					module: importedModule,
					map
				};
			}

			const map = new Map(
				this.originModule.usedExports
					.filter(id => {
						if (id === "default") return false;
						if (this.activeExports.has(id)) return false;
						if (activeFromOtherStarExports.has(id)) return false;

						return true;
					})
					.map(item => [item, item])
			);

			if (map.size === 0) {
				return {
					type: "empty-star"
				};
			}

			return {
				type: "checked-reexport",
				module: importedModule,
				map
			};
		}

		if (hasProvidedExports) {
			const map = new Map(
				importedModule.buildMeta.providedExports
					.filter(id => {
						if (id === "default") return false;
						if (this.activeExports.has(id)) return false;
						if (activeFromOtherStarExports.has(id)) return false;

						return true;
					})
					.map(item => [item, item])
			);

			if (map.size === 0) {
				return {
					type: "empty-star"
				};
			}

			return {
				type: "safe-reexport",
				module: importedModule,
				map
			};
		}

		return {
			type: "dynamic-reexport",
			module: importedModule
		};
	}

	getReference() {
		const mode = this.getMode();

		switch (mode.type) {
			case "missing":
			case "unused":
			case "empty-star":
				return null;

			case "reexport-non-harmony-default":
				return {
					module: mode.module,
					importedNames: ["default"]
				};

			case "reexport-namespace-object":
			case "reexport-non-harmony-default-strict":
			case "reexport-fake-namespace-object":
			case "rexport-non-harmony-undefined":
				return {
					module: mode.module,
					importedNames: true
				};

			case "safe-reexport":
			case "checked-reexport":
				return {
					module: mode.module,
					importedNames: Array.from(mode.map.values())
				};

			case "dynamic-reexport":
				return {
					module: mode.module,
					importedNames: true
				};

			default:
				throw new Error(`Unknown mode ${mode.type}`);
		}
	}

	_discoverActiveExportsFromOtherStartExports() {
		if (!this.otherStarExports) return new Set();
		const result = new Set();
		// try to learn impossible exports from other star exports with provided exports
		for (const otherStarExport of this.otherStarExports) {
			const otherImportedModule = otherStarExport.module;
			if (
				otherImportedModule &&
				Array.isArray(otherImportedModule.buildMeta.providedExports)
			) {
				for (const exportName of otherImportedModule.buildMeta.providedExports)
					result.add(exportName);
			}
		}
		return result;
	}

	getExports() {
		if (this.name) {
			return {
				exports: [this.name]
			};
		}

		const importedModule = this.module;

		if (!importedModule) {
			// no imported module available
			return {
				exports: null
			};
		}

		if (Array.isArray(importedModule.buildMeta.providedExports)) {
			return {
				exports: importedModule.buildMeta.providedExports.filter(
					id => id !== "default"
				),
				dependencies: [importedModule]
			};
		}

		if (importedModule.buildMeta.providedExports) {
			return {
				exports: true
			};
		}

		return {
			exports: null,
			dependencies: [importedModule]
		};
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
				const err = new Error(
					`Can't reexport ${
						exportName
					} from non EcmaScript module (only default export is available)`
				);
				err.hideStack = true;
				return [err];
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
			this.id !== this.name ? ` (reexported as '${this.name}')` : "";
		const errorMessage = `"export '${this.id}'${
			idIsNotNameMessage
		} was not found in '${this.userRequest}'`;
		const err = new Error(errorMessage);
		err.hideStack = true;
		return [err];
	}

	updateHash(hash) {
		super.updateHash(hash);
		const hashValue = this.getHashValue(this.module);
		hash.update(hashValue);
	}

	getHashValue(importedModule) {
		if (!importedModule) {
			return "";
		}

		const stringifiedUsedExport = JSON.stringify(importedModule.usedExports);
		const stringifiedProvidedExport = JSON.stringify(
			importedModule.buildMeta.providedExports
		);
		return (
			importedModule.used + stringifiedUsedExport + stringifiedProvidedExport
		);
	}
}

module.exports = HarmonyExportImportedSpecifierDependency;

HarmonyExportImportedSpecifierDependency.Template = class HarmonyExportImportedSpecifierDependencyTemplate extends HarmonyImportDependency.Template {
	harmonyInit(dep, source, runtime, dependencyTemplates) {
		super.harmonyInit(dep, source, runtime, dependencyTemplates);
		const content = this.getContent(dep);
		source.insert(-1, content);
	}

	getHarmonyInitOrder(dep) {
		if (dep.name) {
			const used = dep.originModule.isUsed(dep.name);
			if (!used) return NaN;
		} else {
			const importedModule = dep.module;

			const activeFromOtherStarExports = dep._discoverActiveExportsFromOtherStartExports();

			if (Array.isArray(dep.originModule.usedExports)) {
				// we know which exports are used

				const unused = dep.originModule.usedExports.every(id => {
					if (id === "default") return true;
					if (dep.activeExports.has(id)) return true;
					if (importedModule.isProvided(id) === false) return true;
					if (activeFromOtherStarExports.has(id)) return true;
					return false;
				});
				if (unused) return NaN;
			} else if (
				dep.originModule.usedExports &&
				importedModule &&
				Array.isArray(importedModule.buildMeta.providedExports)
			) {
				// not sure which exports are used, but we know which are provided

				const unused = importedModule.buildMeta.providedExports.every(id => {
					if (id === "default") return true;
					if (dep.activeExports.has(id)) return true;
					if (activeFromOtherStarExports.has(id)) return true;
					return false;
				});
				if (unused) return NaN;
			}
		}
		return super.getHarmonyInitOrder(dep);
	}

	getContent(dep) {
		const mode = dep.getMode();
		const module = dep.originModule;
		const importedModule = dep.module;
		const importVar = dep.getImportVar();

		switch (mode.type) {
			case "missing":
				return `throw new Error(${JSON.stringify(
					`Cannot find module '${mode.userRequest}'`
				)});\n`;

			case "unused":
				return `${Template.toNormalComment(
					`unused harmony reexport ${mode.name}`
				)}\n`;

			case "reexport-non-harmony-default":
				return (
					"/* harmony reexport (default from non-harmony) */ " +
					this.getReexportStatement(
						module,
						module.isUsed(mode.name),
						importVar,
						null
					)
				);

			case "reexport-fake-namespace-object":
				return (
					"/* harmony reexport (fake namespace object from non-harmony) */ " +
					this.getReexportFakeNamespaceObjectStatement(
						module,
						module.isUsed(mode.name),
						importVar
					)
				);

			case "rexport-non-harmony-undefined":
				return (
					"/* harmony reexport (non default export from non-harmony) */ " +
					this.getReexportStatement(
						module,
						module.isUsed(mode.name),
						"undefined",
						""
					)
				);

			case "reexport-non-harmony-default-strict":
				return (
					"/* harmony reexport (default from non-harmony) */ " +
					this.getReexportStatement(
						module,
						module.isUsed(mode.name),
						importVar,
						""
					)
				);

			case "reexport-namespace-object":
				return (
					"/* harmony reexport (module object) */ " +
					this.getReexportStatement(
						module,
						module.isUsed(mode.name),
						importVar,
						""
					)
				);

			case "empty-star":
				return "/* empty/unused harmony star reexport */";

			case "safe-reexport":
				return Array.from(mode.map.entries())
					.map(item => {
						return (
							"/* harmony reexport (safe) */ " +
							this.getReexportStatement(
								module,
								module.isUsed(item[0]),
								importVar,
								importedModule.isUsed(item[1])
							) +
							"\n"
						);
					})
					.join("");

			case "checked-reexport":
				return Array.from(mode.map.entries())
					.map(item => {
						return (
							"/* harmony reexport (checked) */ " +
							this.getConditionalReexportStatement(
								module,
								item[0],
								importVar,
								item[1]
							) +
							"\n"
						);
					})
					.join("");

			case "dynamic-reexport": {
				const activeExports = new Set([
					...dep.activeExports,
					...dep._discoverActiveExportsFromOtherStartExports()
				]);
				let content =
					"/* harmony reexport (unknown) */ for(var __WEBPACK_IMPORT_KEY__ in " +
					importVar +
					") ";

				// Filter out exports which are defined by other exports
				// and filter out default export because it cannot be reexported with *
				if (activeExports.length > 0)
					content +=
						"if(" +
						JSON.stringify(activeExports.concat("default")) +
						".indexOf(__WEBPACK_IMPORT_KEY__) < 0) ";
				else content += "if(__WEBPACK_IMPORT_KEY__ !== 'default') ";
				const exportsName = dep.originModule.exportsArgument;
				return (
					content +
					`(function(key) { __webpack_require__.d(${
						exportsName
					}, key, function() { return ${
						importVar
					}[key]; }) }(__WEBPACK_IMPORT_KEY__));\n`
				);
			}

			default:
				throw new Error(`Unknown mode ${mode.type}`);
		}
	}

	getReexportStatement(module, key, name, valueKey) {
		const exportsName = module.exportsArgument;
		const returnValue = this.getReturnValue(valueKey);
		return `__webpack_require__.d(${exportsName}, ${JSON.stringify(
			key
		)}, function() { return ${name}${returnValue}; });\n`;
	}

	getReexportFakeNamespaceObjectStatement(module, key, name) {
		const exportsName = module.exportsArgument;
		return `__webpack_require__.d(${exportsName}, ${JSON.stringify(
			key
		)}, function() { return { "default": ${name} }; });\n`;
	}

	getConditionalReexportStatement(module, key, name, valueKey) {
		const exportsName = module.exportsArgument;
		const returnValue = this.getReturnValue(valueKey);
		return `if(__webpack_require__.o(${name}, ${JSON.stringify(
			valueKey
		)})) __webpack_require__.d(${exportsName}, ${JSON.stringify(
			key
		)}, function() { return ${name}${returnValue}; });\n`;
	}

	getReturnValue(valueKey) {
		if (valueKey === null) {
			return "_default.a";
		}

		return valueKey && "[" + JSON.stringify(valueKey) + "]";
	}
};
