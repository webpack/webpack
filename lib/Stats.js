/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const RequestShortener = require("./RequestShortener");
const SizeFormatHelpers = require("./SizeFormatHelpers");
const formatLocation = require("./formatLocation");

const optionOrFallback = (optionValue, fallbackValue) => typeof optionValue !== "undefined" ? optionValue : fallbackValue;

class Stats {
	constructor(compilation) {
		this.compilation = compilation;
		this.hash = compilation.hash;
	}

	static filterWarnings(warnings, warningsFilter) {
		// we dont have anything to filter so all warnings can be shown
		if(!warningsFilter) {
			return warnings;
		}

		// create a chain of filters
		// if they return "true" a warning should be surpressed
		const normalizedWarningsFilters = [].concat(warningsFilter).map(filter => {
			if(typeof filter === "string") {
				return warning => warning.indexOf(filter) > -1;
			}

			if(filter instanceof RegExp) {
				return warning => filter.test(warning);
			}

			if(typeof filter === "function") {
				return filter;
			}

			throw new Error(`Can only filter warnings with Strings or RegExps. (Given: ${filter})`);
		});
		return warnings.filter(warning => {
			return !normalizedWarningsFilters.some(check => check(warning));
		});
	}

	hasWarnings() {
		return this.compilation.warnings.length > 0;
	}

	hasErrors() {
		return this.compilation.errors.length > 0;
	}

	// remove a prefixed "!" that can be specified to reverse sort order
	normalizeFieldKey(field) {
		if(field[0] === "!") {
			return field.substr(1);
		}
		return field;
	}

	// if a field is prefixed by a "!" reverse sort order
	sortOrderRegular(field) {
		if(field[0] === "!") {
			return false;
		}
		return true;
	}

	toJson(options, forToString) {
		if(typeof options === "boolean" || typeof options === "string") {
			options = Stats.presetToOptions(options);
		} else if(!options) {
			options = {};
		}

		const optionOrLocalFallback = (v, def) =>
			typeof v !== "undefined" ? v :
			typeof options.all !== "undefined" ? options.all : def;

		const compilation = this.compilation;
		const requestShortener = new RequestShortener(optionOrFallback(options.context, process.cwd()));
		const showPerformance = optionOrLocalFallback(options.performance, true);
		const showHash = optionOrLocalFallback(options.hash, true);
		const showVersion = optionOrLocalFallback(options.version, true);
		const showTimings = optionOrLocalFallback(options.timings, true);
		const showAssets = optionOrLocalFallback(options.assets, true);
		const showEntrypoints = optionOrLocalFallback(options.entrypoints, !forToString);
		const showChunks = optionOrLocalFallback(options.chunks, !forToString);
		const showChunkModules = optionOrLocalFallback(options.chunkModules, true);
		const showChunkOrigins = optionOrLocalFallback(options.chunkOrigins, !forToString);
		const showModules = optionOrLocalFallback(options.modules, true);
		const showDepth = optionOrLocalFallback(options.depth, !forToString);
		const showCachedModules = optionOrLocalFallback(options.cached, true);
		const showCachedAssets = optionOrLocalFallback(options.cachedAssets, true);
		const showReasons = optionOrLocalFallback(options.reasons, !forToString);
		const showUsedExports = optionOrLocalFallback(options.usedExports, !forToString);
		const showProvidedExports = optionOrLocalFallback(options.providedExports, !forToString);
		const showOptimizationBailout = optionOrLocalFallback(options.optimizationBailout, !forToString);
		const showChildren = optionOrLocalFallback(options.children, true);
		const showSource = optionOrLocalFallback(options.source, !forToString);
		const showModuleTrace = optionOrLocalFallback(options.moduleTrace, true);
		const showErrors = optionOrLocalFallback(options.errors, true);
		const showErrorDetails = optionOrLocalFallback(options.errorDetails, !forToString);
		const showWarnings = optionOrLocalFallback(options.warnings, true);
		const warningsFilter = optionOrFallback(options.warningsFilter, null);
		const showPublicPath = optionOrLocalFallback(options.publicPath, !forToString);
		const excludeModules = [].concat(optionOrFallback(options.exclude, [])).map(item => {
			if(typeof item === "string") {
				const regExp = new RegExp(`[\\\\/]${item.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&")}([\\\\/]|$|!|\\?)`);
				return ident => regExp.test(ident);
			}
			if(item && typeof item === "object" && typeof item.test === "function")
				return ident => item.test(ident);
			if(typeof item === "function")
				return item;
		});
		const maxModules = optionOrFallback(options.maxModules, forToString ? 15 : Infinity);
		const sortModules = optionOrFallback(options.modulesSort, "id");
		const sortChunks = optionOrFallback(options.chunksSort, "id");
		const sortAssets = optionOrFallback(options.assetsSort, "");

		if(!showCachedModules) {
			excludeModules.push((ident, module) => !module.built);
		}

		const createModuleFilter = () => {
			let i = 0;
			return module => {
				if(excludeModules.length > 0) {
					const ident = requestShortener.shorten(module.resource);
					const excluded = excludeModules.some(fn => fn(ident, module));
					if(excluded)
						return false;
				}
				return i++ < maxModules;
			};
		};

		const sortByFieldAndOrder = (fieldKey, a, b) => {
			if(a[fieldKey] === null && b[fieldKey] === null) return 0;
			if(a[fieldKey] === null) return 1;
			if(b[fieldKey] === null) return -1;
			if(a[fieldKey] === b[fieldKey]) return 0;
			return a[fieldKey] < b[fieldKey] ? -1 : 1;
		};

		const sortByField = (field) => (a, b) => {
			if(!field) {
				return 0;
			}

			const fieldKey = this.normalizeFieldKey(field);

			// if a field is prefixed with a "!" the sort is reversed!
			const sortIsRegular = this.sortOrderRegular(field);

			return sortByFieldAndOrder(fieldKey, sortIsRegular ? a : b, sortIsRegular ? b : a);
		};

		const formatError = (e) => {
			let text = "";
			if(typeof e === "string")
				e = {
					message: e
				};
			if(e.chunk) {
				text += `chunk ${e.chunk.name || e.chunk.id}${e.chunk.hasRuntime() ? " [entry]" : e.chunk.isInitial() ? " [initial]" : ""}\n`;
			}
			if(e.file) {
				text += `${e.file}\n`;
			}
			if(e.module && e.module.readableIdentifier && typeof e.module.readableIdentifier === "function") {
				text += `${e.module.readableIdentifier(requestShortener)}\n`;
			}
			text += e.message;
			if(showErrorDetails && e.details) text += `\n${e.details}`;
			if(showErrorDetails && e.missing) text += e.missing.map(item => `\n[${item}]`).join("");
			if(showModuleTrace && e.dependencies && e.origin) {
				text += `\n @ ${e.origin.readableIdentifier(requestShortener)}`;
				e.dependencies.forEach(dep => {
					if(!dep.loc) return;
					if(typeof dep.loc === "string") return;
					const locInfo = formatLocation(dep.loc);
					if(!locInfo) return;
					text += ` ${locInfo}`;
				});
				let current = e.origin;
				while(current.issuer) {
					current = current.issuer;
					text += `\n @ ${current.readableIdentifier(requestShortener)}`;
				}
			}
			return text;
		};

		const obj = {
			errors: compilation.errors.map(formatError),
			warnings: Stats.filterWarnings(compilation.warnings.map(formatError), warningsFilter)
		};

		//We just hint other renderers since actually omitting
		//errors/warnings from the JSON would be kind of weird.
		Object.defineProperty(obj, "_showWarnings", {
			value: showWarnings,
			enumerable: false
		});
		Object.defineProperty(obj, "_showErrors", {
			value: showErrors,
			enumerable: false
		});

		if(showVersion) {
			obj.version = require("../package.json").version;
		}

		if(showHash) obj.hash = this.hash;
		if(showTimings && this.startTime && this.endTime) {
			obj.time = this.endTime - this.startTime;
		}
		if(compilation.needAdditionalPass) {
			obj.needAdditionalPass = true;
		}
		if(showPublicPath) {
			obj.publicPath = this.compilation.mainTemplate.getPublicPath({
				hash: this.compilation.hash
			});
		}
		if(showAssets) {
			const assetsByFile = {};
			obj.assetsByChunkName = {};
			obj.assets = Object.keys(compilation.assets).map(asset => {
				const obj = {
					name: asset,
					size: compilation.assets[asset].size(),
					chunks: [],
					chunkNames: [],
					emitted: compilation.assets[asset].emitted
				};

				if(showPerformance) {
					obj.isOverSizeLimit = compilation.assets[asset].isOverSizeLimit;
				}

				assetsByFile[asset] = obj;
				return obj;
			}).filter(asset => showCachedAssets || asset.emitted);

			compilation.chunks.forEach(chunk => {
				chunk.files.forEach(asset => {
					if(assetsByFile[asset]) {
						chunk.ids.forEach(id => {
							assetsByFile[asset].chunks.push(id);
						});
						if(chunk.name) {
							assetsByFile[asset].chunkNames.push(chunk.name);
							if(obj.assetsByChunkName[chunk.name])
								obj.assetsByChunkName[chunk.name] = [].concat(obj.assetsByChunkName[chunk.name]).concat([asset]);
							else
								obj.assetsByChunkName[chunk.name] = asset;
						}
					}
				});
			});
			obj.assets.sort(sortByField(sortAssets));
		}

		if(showEntrypoints) {
			obj.entrypoints = {};
			Object.keys(compilation.entrypoints).forEach(name => {
				const ep = compilation.entrypoints[name];
				obj.entrypoints[name] = {
					chunks: ep.chunks.map(c => c.id),
					assets: ep.chunks.reduce((array, c) => array.concat(c.files || []), [])
				};
				if(showPerformance) {
					obj.entrypoints[name].isOverSizeLimit = ep.isOverSizeLimit;
				}
			});
		}

		function fnModule(module) {
			const obj = {
				id: module.id,
				identifier: module.identifier(),
				name: module.readableIdentifier(requestShortener),
				index: module.index,
				index2: module.index2,
				size: module.size(),
				cacheable: !!module.cacheable,
				built: !!module.built,
				optional: !!module.optional,
				prefetched: !!module.prefetched,
				chunks: module.mapChunks(chunk => chunk.id),
				assets: Object.keys(module.assets || {}),
				issuer: module.issuer && module.issuer.identifier(),
				issuerId: module.issuer && module.issuer.id,
				issuerName: module.issuer && module.issuer.readableIdentifier(requestShortener),
				profile: module.profile,
				failed: !!module.error,
				errors: module.errors && module.dependenciesErrors && (module.errors.length + module.dependenciesErrors.length),
				warnings: module.errors && module.dependenciesErrors && (module.warnings.length + module.dependenciesWarnings.length)
			};
			if(showReasons) {
				obj.reasons = module.reasons.filter(reason => reason.dependency && reason.module).map(reason => {
					const obj = {
						moduleId: reason.module.id,
						moduleIdentifier: reason.module.identifier(),
						module: reason.module.readableIdentifier(requestShortener),
						moduleName: reason.module.readableIdentifier(requestShortener),
						type: reason.dependency.type,
						userRequest: reason.dependency.userRequest
					};
					const locInfo = formatLocation(reason.dependency.loc);
					if(locInfo) obj.loc = locInfo;
					return obj;
				}).sort((a, b) => a.moduleId - b.moduleId);
			}
			if(showUsedExports) {
				obj.usedExports = module.used ? module.usedExports : false;
			}
			if(showProvidedExports) {
				obj.providedExports = Array.isArray(module.providedExports) ? module.providedExports : null;
			}
			if(showOptimizationBailout) {
				obj.optimizationBailout = module.optimizationBailout.map(item => {
					if(typeof item === "function") return item(requestShortener);
					return item;
				});
			}
			if(showDepth) {
				obj.depth = module.depth;
			}
			if(showSource && module._source) {
				obj.source = module._source.source();
			}
			return obj;
		}
		if(showChunks) {
			obj.chunks = compilation.chunks.map(chunk => {
				const obj = {
					id: chunk.id,
					rendered: chunk.rendered,
					initial: chunk.isInitial(),
					entry: chunk.hasRuntime(),
					recorded: chunk.recorded,
					extraAsync: !!chunk.extraAsync,
					size: chunk.mapModules(m => m.size()).reduce((size, moduleSize) => size + moduleSize, 0),
					names: chunk.name ? [chunk.name] : [],
					files: chunk.files.slice(),
					hash: chunk.renderedHash,
					parents: chunk.parents.map(c => c.id)
				};
				if(showChunkModules) {
					obj.modules = chunk
						.getModules()
						.sort(sortByField("depth"))
						.filter(createModuleFilter())
						.map(fnModule);
					obj.filteredModules = chunk.getNumberOfModules() - obj.modules.length;
					obj.modules.sort(sortByField(sortModules));
				}
				if(showChunkOrigins) {
					obj.origins = chunk.origins.map(origin => ({
						moduleId: origin.module ? origin.module.id : undefined,
						module: origin.module ? origin.module.identifier() : "",
						moduleIdentifier: origin.module ? origin.module.identifier() : "",
						moduleName: origin.module ? origin.module.readableIdentifier(requestShortener) : "",
						loc: formatLocation(origin.loc),
						name: origin.name,
						reasons: origin.reasons || []
					}));
				}
				return obj;
			});
			obj.chunks.sort(sortByField(sortChunks));
		}
		if(showModules) {
			obj.modules = compilation.modules
				.slice()
				.sort(sortByField("depth"))
				.filter(createModuleFilter())
				.map(fnModule);
			obj.filteredModules = compilation.modules.length - obj.modules.length;
			obj.modules.sort(sortByField(sortModules));
		}
		if(showChildren) {
			obj.children = compilation.children.map((child, idx) => {
				const childOptions = Stats.getChildOptions(options, idx);
				const obj = new Stats(child).toJson(childOptions, forToString);
				delete obj.hash;
				delete obj.version;
				obj.name = child.name;
				return obj;
			});
		}

		return obj;
	}

	toString(options) {
		if(typeof options === "boolean" || typeof options === "string") {
			options = Stats.presetToOptions(options);
		} else if(!options) {
			options = {};
		}

		const useColors = optionOrFallback(options.colors, false);

		const obj = this.toJson(options, true);

		return Stats.jsonToString(obj, useColors);
	}

	static jsonToString(obj, useColors) {
		const buf = [];

		const defaultColors = {
			bold: "\u001b[1m",
			yellow: "\u001b[1m\u001b[33m",
			red: "\u001b[1m\u001b[31m",
			green: "\u001b[1m\u001b[32m",
			cyan: "\u001b[1m\u001b[36m",
			magenta: "\u001b[1m\u001b[35m"
		};

		const colors = Object.keys(defaultColors).reduce((obj, color) => {
			obj[color] = str => {
				if(useColors) {
					buf.push(
						(useColors === true || useColors[color] === undefined) ?
						defaultColors[color] : useColors[color]
					);
				}
				buf.push(str);
				if(useColors) {
					buf.push("\u001b[39m\u001b[22m");
				}
			};
			return obj;
		}, {
			normal: (str) => buf.push(str)
		});

		const coloredTime = (time) => {
			let times = [800, 400, 200, 100];
			if(obj.time) {
				times = [obj.time / 2, obj.time / 4, obj.time / 8, obj.time / 16];
			}
			if(time < times[3])
				colors.normal(`${time}ms`);
			else if(time < times[2])
				colors.bold(`${time}ms`);
			else if(time < times[1])
				colors.green(`${time}ms`);
			else if(time < times[0])
				colors.yellow(`${time}ms`);
			else
				colors.red(`${time}ms`);
		};

		const newline = () => buf.push("\n");

		const getText = (arr, row, col) => {
			return arr[row][col].value;
		};

		const table = (array, align, splitter) => {
			const rows = array.length;
			const cols = array[0].length;
			const colSizes = new Array(cols);
			for(let col = 0; col < cols; col++)
				colSizes[col] = 0;
			for(let row = 0; row < rows; row++) {
				for(let col = 0; col < cols; col++) {
					const value = `${getText(array, row, col)}`;
					if(value.length > colSizes[col]) {
						colSizes[col] = value.length;
					}
				}
			}
			for(let row = 0; row < rows; row++) {
				for(let col = 0; col < cols; col++) {
					const format = array[row][col].color;
					const value = `${getText(array, row, col)}`;
					let l = value.length;
					if(align[col] === "l")
						format(value);
					for(; l < colSizes[col] && col !== cols - 1; l++)
						colors.normal(" ");
					if(align[col] === "r")
						format(value);
					if(col + 1 < cols && colSizes[col] !== 0)
						colors.normal(splitter || "  ");
				}
				newline();
			}
		};

		const getAssetColor = (asset, defaultColor) => {
			if(asset.isOverSizeLimit) {
				return colors.yellow;
			}

			return defaultColor;
		};

		if(obj.hash) {
			colors.normal("Hash: ");
			colors.bold(obj.hash);
			newline();
		}
		if(obj.version) {
			colors.normal("Version: webpack ");
			colors.bold(obj.version);
			newline();
		}
		if(typeof obj.time === "number") {
			colors.normal("Time: ");
			colors.bold(obj.time);
			colors.normal("ms");
			newline();
		}
		if(obj.publicPath) {
			colors.normal("PublicPath: ");
			colors.bold(obj.publicPath);
			newline();
		}

		if(obj.assets && obj.assets.length > 0) {
			const t = [
				[{
					value: "Asset",
					color: colors.bold
				}, {
					value: "Size",
					color: colors.bold
				}, {
					value: "Chunks",
					color: colors.bold
				}, {
					value: "",
					color: colors.bold
				}, {
					value: "",
					color: colors.bold
				}, {
					value: "Chunk Names",
					color: colors.bold
				}]
			];
			obj.assets.forEach(asset => {
				t.push([{
					value: asset.name,
					color: getAssetColor(asset, colors.green)
				}, {
					value: SizeFormatHelpers.formatSize(asset.size),
					color: getAssetColor(asset, colors.normal)
				}, {
					value: asset.chunks.join(", "),
					color: colors.bold
				}, {
					value: asset.emitted ? "[emitted]" : "",
					color: colors.green
				}, {
					value: asset.isOverSizeLimit ? "[big]" : "",
					color: getAssetColor(asset, colors.normal)
				}, {
					value: asset.chunkNames.join(", "),
					color: colors.normal
				}]);
			});
			table(t, "rrrlll");
		}
		if(obj.entrypoints) {
			Object.keys(obj.entrypoints).forEach(name => {
				const ep = obj.entrypoints[name];
				colors.normal("Entrypoint ");
				colors.bold(name);
				if(ep.isOverSizeLimit) {
					colors.normal(" ");
					colors.yellow("[big]");
				}
				colors.normal(" =");
				ep.assets.forEach(asset => {
					colors.normal(" ");
					colors.green(asset);
				});
				newline();
			});
		}
		const modulesByIdentifier = {};
		if(obj.modules) {
			obj.modules.forEach(module => {
				modulesByIdentifier[`$${module.identifier}`] = module;
			});
		} else if(obj.chunks) {
			obj.chunks.forEach(chunk => {
				if(chunk.modules) {
					chunk.modules.forEach(module => {
						modulesByIdentifier[`$${module.identifier}`] = module;
					});
				}
			});
		}

		const processModuleAttributes = (module) => {
			colors.normal(" ");
			colors.normal(SizeFormatHelpers.formatSize(module.size));
			if(module.chunks) {
				module.chunks.forEach(chunk => {
					colors.normal(" {");
					colors.yellow(chunk);
					colors.normal("}");
				});
			}
			if(typeof module.depth === "number") {
				colors.normal(` [depth ${module.depth}]`);
			}
			if(!module.cacheable) {
				colors.red(" [not cacheable]");
			}
			if(module.optional) {
				colors.yellow(" [optional]");
			}
			if(module.built) {
				colors.green(" [built]");
			}
			if(module.prefetched) {
				colors.magenta(" [prefetched]");
			}
			if(module.failed)
				colors.red(" [failed]");
			if(module.warnings)
				colors.yellow(` [${module.warnings} warning${module.warnings === 1 ? "" : "s"}]`);
			if(module.errors)
				colors.red(` [${module.errors} error${module.errors === 1 ? "" : "s"}]`);
		};

		const processModuleContent = (module, prefix) => {
			if(Array.isArray(module.providedExports)) {
				colors.normal(prefix);
				if(module.providedExports.length === 0)
					colors.cyan("[no exports]");
				else
					colors.cyan(`[exports: ${module.providedExports.join(", ")}]`);
				newline();
			}
			if(module.usedExports !== undefined) {
				if(module.usedExports !== true) {
					colors.normal(prefix);
					if(module.usedExports === false)
						colors.cyan("[no exports used]");
					else
						colors.cyan(`[only some exports used: ${module.usedExports.join(", ")}]`);
					newline();
				}
			}
			if(Array.isArray(module.optimizationBailout)) {
				module.optimizationBailout.forEach(item => {
					colors.normal(prefix);
					colors.yellow(item);
					newline();
				});
			}
			if(module.reasons) {
				module.reasons.forEach(reason => {
					colors.normal(prefix);
					colors.normal(reason.type);
					colors.normal(" ");
					colors.cyan(reason.userRequest);
					colors.normal(" [");
					colors.normal(reason.moduleId);
					colors.normal("] ");
					colors.magenta(reason.module);
					if(reason.loc) {
						colors.normal(" ");
						colors.normal(reason.loc);
					}
					newline();
				});
			}
			if(module.profile) {
				colors.normal(prefix);
				let sum = 0;
				const path = [];
				let current = module;
				while(current.issuer) {
					path.unshift(current = current.issuer);
				}
				path.forEach(module => {
					colors.normal("[");
					colors.normal(module.id);
					colors.normal("] ");
					if(module.profile) {
						const time = (module.profile.factory || 0) + (module.profile.building || 0);
						coloredTime(time);
						sum += time;
						colors.normal(" ");
					}
					colors.normal("->");
				});
				Object.keys(module.profile).forEach(key => {
					colors.normal(` ${key}:`);
					const time = module.profile[key];
					coloredTime(time);
					sum += time;
				});
				colors.normal(" = ");
				coloredTime(sum);
				newline();
			}
		};

		const processModulesList = (obj, prefix) => {
			if(obj.modules) {
				obj.modules.forEach(module => {
					colors.normal(prefix);
					if(module.id < 1000) colors.normal(" ");
					if(module.id < 100) colors.normal(" ");
					if(module.id < 10) colors.normal(" ");
					colors.normal("[");
					colors.normal(module.id);
					colors.normal("] ");
					colors.bold(module.name || module.identifier);
					processModuleAttributes(module);
					newline();
					processModuleContent(module, prefix + "       ");
				});
				if(obj.filteredModules > 0) {
					colors.normal(prefix);
					colors.normal("   ");
					if(obj.modules.length > 0)
						colors.normal(" + ");
					colors.normal(obj.filteredModules);
					if(obj.modules.length > 0)
						colors.normal(" hidden");
					colors.normal(obj.filteredModules !== 1 ? " modules" : " module");
					newline();
				}
			}
		};

		if(obj.chunks) {
			obj.chunks.forEach(chunk => {
				colors.normal("chunk ");
				if(chunk.id < 1000) colors.normal(" ");
				if(chunk.id < 100) colors.normal(" ");
				if(chunk.id < 10) colors.normal(" ");
				colors.normal("{");
				colors.yellow(chunk.id);
				colors.normal("} ");
				colors.green(chunk.files.join(", "));
				if(chunk.names && chunk.names.length > 0) {
					colors.normal(" (");
					colors.normal(chunk.names.join(", "));
					colors.normal(")");
				}
				colors.normal(" ");
				colors.normal(SizeFormatHelpers.formatSize(chunk.size));
				chunk.parents.forEach(id => {
					colors.normal(" {");
					colors.yellow(id);
					colors.normal("}");
				});
				if(chunk.entry) {
					colors.yellow(" [entry]");
				} else if(chunk.initial) {
					colors.yellow(" [initial]");
				}
				if(chunk.rendered) {
					colors.green(" [rendered]");
				}
				if(chunk.recorded) {
					colors.green(" [recorded]");
				}
				newline();
				if(chunk.origins) {
					chunk.origins.forEach(origin => {
						colors.normal("    > ");
						if(origin.reasons && origin.reasons.length) {
							colors.yellow(origin.reasons.join(" "));
							colors.normal(" ");
						}
						if(origin.name) {
							colors.normal(origin.name);
							colors.normal(" ");
						}
						if(origin.module) {
							colors.normal("[");
							colors.normal(origin.moduleId);
							colors.normal("] ");
							const module = modulesByIdentifier[`$${origin.module}`];
							if(module) {
								colors.bold(module.name);
								colors.normal(" ");
							}
							if(origin.loc) {
								colors.normal(origin.loc);
							}
						}
						newline();
					});
				}
				processModulesList(chunk, " ");
			});
		}

		processModulesList(obj, "");

		if(obj._showWarnings && obj.warnings) {
			obj.warnings.forEach(warning => {
				newline();
				colors.yellow(`WARNING in ${warning}`);
				newline();
			});
		}
		if(obj._showErrors && obj.errors) {
			obj.errors.forEach(error => {
				newline();
				colors.red(`ERROR in ${error}`);
				newline();
			});
		}
		if(obj.children) {
			obj.children.forEach(child => {
				const childString = Stats.jsonToString(child, useColors);
				if(childString) {
					if(child.name) {
						colors.normal("Child ");
						colors.bold(child.name);
						colors.normal(":");
					} else {
						colors.normal("Child");
					}
					newline();
					buf.push("    ");
					buf.push(childString.replace(/\n/g, "\n    "));
					newline();
				}
			});
		}
		if(obj.needAdditionalPass) {
			colors.yellow("Compilation needs an additional pass and will compile again.");
		}

		while(buf[buf.length - 1] === "\n") buf.pop();
		return buf.join("");
	}

	static presetToOptions(name) {
		// Accepted values: none, errors-only, minimal, normal, detailed, verbose
		// Any other falsy value will behave as 'none', truthy values as 'normal'
		const pn = (typeof name === "string") && name.toLowerCase() || name || "none";
		switch(pn) {
			case "none":
				return {
					all: false
				};
			case "verbose":
				return {
					entrypoints: true,
					modules: false,
					chunks: true,
					chunkModules: true,
					chunkOrigins: true,
					depth: true,
					reasons: true,
					usedExports: true,
					providedExports: true,
					optimizationBailout: true,
					errorDetails: true,
					publicPath: true,
					exclude: () => false,
					maxModules: Infinity,
				};
			case "detailed":
				return {
					entrypoints: true,
					chunks: true,
					chunkModules: false,
					chunkOrigins: true,
					depth: true,
					usedExports: true,
					providedExports: true,
					optimizationBailout: true,
					errorDetails: true,
					publicPath: true,
					exclude: () => false,
					maxModules: Infinity,
				};
			case "minimal":
				return {
					all: false,
					modules: true,
					maxModules: 0,
					errors: true,
					warnings: true,
				};
			case "errors-only":
				return {
					all: false,
					errors: true,
					moduleTrace: true,
				};
			default:
				return {};
		}
	}

	static getChildOptions(options, idx) {
		let innerOptions;
		if(Array.isArray(options.children)) {
			if(idx < options.children.length)
				innerOptions = options.children[idx];
		} else if(typeof options.children === "object" && options.children) {
			innerOptions = options.children;
		}
		if(typeof innerOptions === "boolean" || typeof innerOptions === "string")
			innerOptions = Stats.presetToOptions(innerOptions);
		if(!innerOptions)
			return options;
		const childOptions = Object.assign({}, options);
		delete childOptions.children; // do not inherit children
		return Object.assign(childOptions, innerOptions);
	}
}

module.exports = Stats;
