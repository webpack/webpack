/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("./StatsPrinter")} StatsPrinter */

/**
 * @typedef {Object} UsualContext
 * @property {string} type
 * @property {Object} compilation
 * @property {Object} chunkGroup
 * @property {Object} asset
 * @property {Object} module
 * @property {Object} chunk
 * @property {Object} moduleReason
 * @property {(str: string) => string} bold
 * @property {(str: string) => string} yellow
 * @property {(str: string) => string} red
 * @property {(str: string) => string} green
 * @property {(str: string) => string} magenta
 * @property {(str: string) => string} cyan
 * @property {(file: string, oversize?: boolean) => string} formatFilename
 * @property {(id: string) => string} formatModuleId
 * @property {(id: string, direction?: "parent"|"child"|"sibling") => string} formatChunkId
 * @property {(size: number) => string} formatSize
 * @property {(dateTime: number) => string} formatDateTime
 * @property {(flag: string) => string} formatFlag
 * @property {(time: number, boldQuantity?: boolean) => string} formatTime
 * @property {string} chunkGroupKind
 */

const plural = (n, singular, plural) => (n === 1 ? singular : plural);

const printSizes = (sizes, { formatSize }) => {
	const keys = Object.keys(sizes);
	if (keys.length > 1) {
		return keys.map(key => `${formatSize(sizes[key])} (${key})`).join(" ");
	} else if (keys.length === 1) {
		return formatSize(sizes[keys[0]]);
	}
};

const mapLines = (str, fn) => str.split("\n").map(fn).join("\n");

/**
 * @param {number} n a number
 * @returns {string} number as two digit string, leading 0
 */
const twoDigit = n => (n >= 10 ? `${n}` : `0${n}`);

const isValidId = id => {
	return typeof id === "number" || id;
};

/** @type {Record<string, (thing: any, context: UsualContext, printer: StatsPrinter) => string | void>} */
const SIMPLE_PRINTERS = {
	"compilation.summary!": (
		_,
		{
			type,
			bold,
			green,
			red,
			yellow,
			formatDateTime,
			formatTime,
			compilation: {
				name,
				hash,
				version,
				time,
				builtAt,
				errorsCount,
				warningsCount
			}
		}
	) => {
		const root = type === "compilation.summary!";
		const warningsMessage =
			warningsCount > 0
				? yellow(
						`${warningsCount} ${plural(warningsCount, "warning", "warnings")}`
				  )
				: "";
		const errorsMessage =
			errorsCount > 0
				? red(`${errorsCount} ${plural(errorsCount, "error", "errors")}`)
				: "";
		const timeMessage = root && time ? ` in ${formatTime(time)}` : "";
		const hashMessage = hash ? ` (${hash})` : "";
		const builtAtMessage =
			root && builtAt ? `${formatDateTime(builtAt)}: ` : "";
		const versionMessage = root && version ? `webpack ${version}` : "";
		const nameMessage =
			root && name
				? bold(name)
				: name
				? `Child ${bold(name)}`
				: root
				? ""
				: "Child";
		const subjectMessage =
			nameMessage && versionMessage
				? `${nameMessage} (${versionMessage})`
				: versionMessage || nameMessage || "webpack";
		let statusMessage;
		if (errorsMessage && warningsMessage) {
			statusMessage = `compiled with ${errorsMessage} and ${warningsMessage}`;
		} else if (errorsMessage) {
			statusMessage = `compiled with ${errorsMessage}`;
		} else if (warningsMessage) {
			statusMessage = `compiled with ${warningsMessage}`;
		} else if (errorsCount === 0 && warningsCount === 0) {
			statusMessage = `compiled ${green("successfully")}`;
		} else {
			statusMessage = `compiled`;
		}
		if (
			builtAtMessage ||
			versionMessage ||
			errorsMessage ||
			warningsMessage ||
			timeMessage ||
			hashMessage
		)
			return `${builtAtMessage}${subjectMessage} ${statusMessage}${timeMessage}${hashMessage}`;
	},
	"compilation.env": (env, { bold }) =>
		env
			? `Environment (--env): ${bold(JSON.stringify(env, null, 2))}`
			: undefined,
	"compilation.publicPath": (publicPath, { bold }) =>
		`PublicPath: ${bold(publicPath || "(none)")}`,
	"compilation.entrypoints": (entrypoints, context, printer) =>
		Array.isArray(entrypoints)
			? undefined
			: printer.print(context.type, Object.values(entrypoints), {
					...context,
					chunkGroupKind: "Entrypoint"
			  }),
	"compilation.namedChunkGroups": (namedChunkGroups, context, printer) => {
		if (!Array.isArray(namedChunkGroups)) {
			const {
				compilation: { entrypoints }
			} = context;
			let chunkGroups = Object.values(namedChunkGroups);
			if (entrypoints) {
				chunkGroups = chunkGroups.filter(
					group =>
						!Object.prototype.hasOwnProperty.call(entrypoints, group.name)
				);
			}
			return printer.print(context.type, chunkGroups, {
				...context,
				chunkGroupKind: "Chunk Group"
			});
		}
	},
	"compilation.assetsByChunkName": () => "",

	"compilation.filteredModules": filteredModules =>
		filteredModules > 0
			? `${filteredModules} ${plural(filteredModules, "module", "modules")}`
			: undefined,
	"compilation.filteredAssets": (filteredAssets, { compilation: { assets } }) =>
		filteredAssets > 0
			? `${filteredAssets} ${plural(filteredAssets, "asset", "assets")}`
			: undefined,
	"compilation.logging": (logging, context, printer) =>
		Array.isArray(logging)
			? undefined
			: printer.print(
					context.type,
					Object.entries(logging).map(([name, value]) => ({ ...value, name })),
					context
			  ),
	"compilation.warningsInChildren!": (_, { yellow, compilation }) => {
		if (
			!compilation.children &&
			compilation.warningsCount > 0 &&
			compilation.warnings
		) {
			const childWarnings =
				compilation.warningsCount - compilation.warnings.length;
			if (childWarnings > 0) {
				return yellow(
					`${childWarnings} ${plural(
						childWarnings,
						"WARNING",
						"WARNINGS"
					)} in child compilations`
				);
			}
		}
	},
	"compilation.errorsInChildren!": (_, { red, compilation }) => {
		if (
			!compilation.children &&
			compilation.errorsCount > 0 &&
			compilation.errors
		) {
			const childErrors = compilation.errorsCount - compilation.errors.length;
			if (childErrors > 0) {
				return red(
					`${childErrors} ${plural(
						childErrors,
						"ERROR",
						"ERRORS"
					)} in child compilations`
				);
			}
		}
	},

	"asset.type": type => type,
	"asset.name": (name, { formatFilename, asset: { isOverSizeLimit } }) =>
		formatFilename(name, isOverSizeLimit),
	"asset.size": (
		size,
		{ asset: { isOverSizeLimit }, yellow, green, formatSize }
	) => (isOverSizeLimit ? yellow(formatSize(size)) : formatSize(size)),
	"asset.emitted": (emitted, { green, formatFlag }) =>
		emitted ? green(formatFlag("emitted")) : undefined,
	"asset.comparedForEmit": (comparedForEmit, { yellow, formatFlag }) =>
		comparedForEmit ? yellow(formatFlag("compared for emit")) : undefined,
	"asset.cached": (cached, { green, formatFlag }) =>
		cached ? green(formatFlag("cached")) : undefined,
	"asset.isOverSizeLimit": (isOverSizeLimit, { yellow, formatFlag }) =>
		isOverSizeLimit ? yellow(formatFlag("big")) : undefined,

	"asset.info.immutable": (immutable, { green, formatFlag }) =>
		immutable ? green(formatFlag("immutable")) : undefined,
	"asset.info.javascriptModule": (javascriptModule, { formatFlag }) =>
		javascriptModule ? formatFlag("javascript module") : undefined,
	"asset.info.sourceFilename": (sourceFilename, { formatFlag }) =>
		sourceFilename
			? formatFlag(
					sourceFilename === true
						? "from source file"
						: `from: ${sourceFilename}`
			  )
			: undefined,
	"asset.info.development": (development, { green, formatFlag }) =>
		development ? green(formatFlag("dev")) : undefined,
	"asset.info.hotModuleReplacement": (
		hotModuleReplacement,
		{ green, formatFlag }
	) => (hotModuleReplacement ? green(formatFlag("hmr")) : undefined),
	"asset.separator!": () => "\n",
	"asset.filteredRelated": (filteredRelated, { asset: { related } }) =>
		filteredRelated > 0
			? `${filteredRelated} related ${plural(
					filteredRelated,
					"asset",
					"assets"
			  )}`
			: undefined,
	"asset.filteredChildren": filteredChildren =>
		filteredChildren > 0
			? `${filteredChildren} ${plural(filteredChildren, "asset", "assets")}`
			: undefined,

	assetChunk: (id, { formatChunkId }) => formatChunkId(id),

	assetChunkName: name => name,
	assetChunkIdHint: name => name,

	"module.type": type => (type !== "module" ? type : undefined),
	"module.id": (id, { formatModuleId }) =>
		isValidId(id) ? formatModuleId(id) : undefined,
	"module.name": (name, { bold }) => {
		const [, prefix, resource] = /^(.*!)?([^!]*)$/.exec(name);
		return (prefix || "") + bold(resource);
	},
	"module.identifier": identifier => undefined,
	"module.sizes": printSizes,
	"module.chunks[]": (id, { formatChunkId }) => formatChunkId(id),
	"module.depth": (depth, { formatFlag }) =>
		depth !== null ? formatFlag(`depth ${depth}`) : undefined,
	"module.cacheable": (cacheable, { formatFlag, red }) =>
		cacheable === false ? red(formatFlag("not cacheable")) : undefined,
	"module.orphan": (orphan, { formatFlag, yellow }) =>
		orphan ? yellow(formatFlag("orphan")) : undefined,
	"module.runtime": (runtime, { formatFlag, yellow }) =>
		runtime ? yellow(formatFlag("runtime")) : undefined,
	"module.optional": (optional, { formatFlag, yellow }) =>
		optional ? yellow(formatFlag("optional")) : undefined,
	"module.dependent": (dependent, { formatFlag, cyan }) =>
		dependent ? cyan(formatFlag("dependent")) : undefined,
	"module.built": (built, { formatFlag, yellow }) =>
		built ? yellow(formatFlag("built")) : undefined,
	"module.codeGenerated": (codeGenerated, { formatFlag, yellow }) =>
		codeGenerated ? yellow(formatFlag("code generated")) : undefined,
	"module.cached": (cached, { formatFlag, green }) =>
		cached ? green(formatFlag("cached")) : undefined,
	"module.assets": (assets, { formatFlag, magenta }) =>
		assets && assets.length
			? magenta(
					formatFlag(
						`${assets.length} ${plural(assets.length, "asset", "assets")}`
					)
			  )
			: undefined,
	"module.warnings": (warnings, { formatFlag, yellow }) =>
		warnings === true
			? yellow(formatFlag("warnings"))
			: warnings
			? yellow(
					formatFlag(`${warnings} ${plural(warnings, "warning", "warnings")}`)
			  )
			: undefined,
	"module.errors": (errors, { formatFlag, red }) =>
		errors === true
			? red(formatFlag("errors"))
			: errors
			? red(formatFlag(`${errors} ${plural(errors, "error", "errors")}`))
			: undefined,
	"module.providedExports": (providedExports, { formatFlag, cyan }) => {
		if (Array.isArray(providedExports)) {
			if (providedExports.length === 0) return cyan(formatFlag("no exports"));
			return cyan(formatFlag(`exports: ${providedExports.join(", ")}`));
		}
	},
	"module.usedExports": (usedExports, { formatFlag, cyan, module }) => {
		if (usedExports !== true) {
			if (usedExports === null) return cyan(formatFlag("used exports unknown"));
			if (usedExports === false) return cyan(formatFlag("module unused"));
			if (Array.isArray(usedExports)) {
				if (usedExports.length === 0)
					return cyan(formatFlag("no exports used"));
				const providedExportsCount = Array.isArray(module.providedExports)
					? module.providedExports.length
					: null;
				if (
					providedExportsCount !== null &&
					providedExportsCount === module.usedExports.length
				) {
					return cyan(formatFlag("all exports used"));
				} else {
					return cyan(
						formatFlag(`only some exports used: ${usedExports.join(", ")}`)
					);
				}
			}
		}
	},
	"module.optimizationBailout[]": (optimizationBailout, { yellow }) =>
		yellow(optimizationBailout),
	"module.issuerPath": (issuerPath, { module }) =>
		module.profile ? undefined : "",
	"module.profile": profile => undefined,
	"module.filteredModules": filteredModules =>
		filteredModules > 0
			? `${filteredModules} nested ${plural(
					filteredModules,
					"module",
					"modules"
			  )}`
			: undefined,
	"module.filteredChildren": filteredChildren =>
		filteredChildren > 0
			? `${filteredChildren} ${plural(filteredChildren, "module", "modules")}`
			: undefined,
	"module.separator!": () => "\n",

	"moduleIssuer.id": (id, { formatModuleId }) => formatModuleId(id),
	"moduleIssuer.profile.total": (value, { formatTime }) => formatTime(value),

	"moduleReason.type": type => type,
	"moduleReason.userRequest": (userRequest, { cyan }) => cyan(userRequest),
	"moduleReason.moduleId": (moduleId, { formatModuleId }) =>
		isValidId(moduleId) ? formatModuleId(moduleId) : undefined,
	"moduleReason.module": (module, { magenta }) => magenta(module),
	"moduleReason.loc": loc => loc,
	"moduleReason.explanation": (explanation, { cyan }) => cyan(explanation),
	"moduleReason.active": (active, { formatFlag }) =>
		active ? undefined : formatFlag("inactive"),
	"moduleReason.resolvedModule": (module, { magenta }) => magenta(module),

	"module.profile.total": (value, { formatTime }) => formatTime(value),
	"module.profile.resolving": (value, { formatTime }) =>
		`resolving: ${formatTime(value)}`,
	"module.profile.restoring": (value, { formatTime }) =>
		`restoring: ${formatTime(value)}`,
	"module.profile.integration": (value, { formatTime }) =>
		`integration: ${formatTime(value)}`,
	"module.profile.building": (value, { formatTime }) =>
		`building: ${formatTime(value)}`,
	"module.profile.storing": (value, { formatTime }) =>
		`storing: ${formatTime(value)}`,
	"module.profile.additionalResolving": (value, { formatTime }) =>
		value ? `additional resolving: ${formatTime(value)}` : undefined,
	"module.profile.additionalIntegration": (value, { formatTime }) =>
		value ? `additional integration: ${formatTime(value)}` : undefined,

	"chunkGroup.kind!": (_, { chunkGroupKind }) => chunkGroupKind,
	"chunkGroup.separator!": () => "\n",
	"chunkGroup.name": (name, { bold }) => bold(name),
	"chunkGroup.isOverSizeLimit": (isOverSizeLimit, { formatFlag, yellow }) =>
		isOverSizeLimit ? yellow(formatFlag("big")) : undefined,
	"chunkGroup.assetsSize": (size, { formatSize }) =>
		size ? formatSize(size) : undefined,
	"chunkGroup.auxiliaryAssetsSize": (size, { formatSize }) =>
		size ? `(${formatSize(size)})` : undefined,
	"chunkGroup.filteredAssets": n =>
		n > 0 ? `${n} ${plural(n, "asset", "assets")}` : undefined,
	"chunkGroup.filteredAuxiliaryAssets": n =>
		n > 0 ? `${n} auxiliary ${plural(n, "asset", "assets")}` : undefined,
	"chunkGroup.is!": () => "=",
	"chunkGroupAsset.name": (asset, { green }) => green(asset),
	"chunkGroupAsset.size": (size, { formatSize, chunkGroup }) =>
		chunkGroup.assets.length > 1 ||
		(chunkGroup.auxiliaryAssets && chunkGroup.auxiliaryAssets.length > 0)
			? formatSize(size)
			: undefined,
	"chunkGroup.children": (children, context, printer) =>
		Array.isArray(children)
			? undefined
			: printer.print(
					context.type,
					Object.keys(children).map(key => ({
						type: key,
						children: children[key]
					})),
					context
			  ),
	"chunkGroupChildGroup.type": type => `${type}:`,
	"chunkGroupChild.assets[]": (file, { formatFilename }) =>
		formatFilename(file),
	"chunkGroupChild.chunks[]": (id, { formatChunkId }) => formatChunkId(id),
	"chunkGroupChild.name": name => (name ? `(name: ${name})` : undefined),

	"chunk.id": (id, { formatChunkId }) => formatChunkId(id),
	"chunk.files[]": (file, { formatFilename }) => formatFilename(file),
	"chunk.names[]": name => name,
	"chunk.idHints[]": name => name,
	"chunk.runtime[]": name => name,
	"chunk.sizes": (sizes, context) => printSizes(sizes, context),
	"chunk.parents[]": (parents, context) =>
		context.formatChunkId(parents, "parent"),
	"chunk.siblings[]": (siblings, context) =>
		context.formatChunkId(siblings, "sibling"),
	"chunk.children[]": (children, context) =>
		context.formatChunkId(children, "child"),
	"chunk.childrenByOrder": (childrenByOrder, context, printer) =>
		Array.isArray(childrenByOrder)
			? undefined
			: printer.print(
					context.type,
					Object.keys(childrenByOrder).map(key => ({
						type: key,
						children: childrenByOrder[key]
					})),
					context
			  ),
	"chunk.childrenByOrder[].type": type => `${type}:`,
	"chunk.childrenByOrder[].children[]": (id, { formatChunkId }) =>
		isValidId(id) ? formatChunkId(id) : undefined,
	"chunk.entry": (entry, { formatFlag, yellow }) =>
		entry ? yellow(formatFlag("entry")) : undefined,
	"chunk.initial": (initial, { formatFlag, yellow }) =>
		initial ? yellow(formatFlag("initial")) : undefined,
	"chunk.rendered": (rendered, { formatFlag, green }) =>
		rendered ? green(formatFlag("rendered")) : undefined,
	"chunk.recorded": (recorded, { formatFlag, green }) =>
		recorded ? green(formatFlag("recorded")) : undefined,
	"chunk.reason": (reason, { yellow }) => (reason ? yellow(reason) : undefined),
	"chunk.filteredModules": filteredModules =>
		filteredModules > 0
			? `${filteredModules} chunk ${plural(
					filteredModules,
					"module",
					"modules"
			  )}`
			: undefined,
	"chunk.separator!": () => "\n",

	"chunkOrigin.request": request => request,
	"chunkOrigin.moduleId": (moduleId, { formatModuleId }) =>
		isValidId(moduleId) ? formatModuleId(moduleId) : undefined,
	"chunkOrigin.moduleName": (moduleName, { bold }) => bold(moduleName),
	"chunkOrigin.loc": loc => loc,

	"error.compilerPath": (compilerPath, { bold }) =>
		compilerPath ? bold(`(${compilerPath})`) : undefined,
	"error.chunkId": (chunkId, { formatChunkId }) =>
		isValidId(chunkId) ? formatChunkId(chunkId) : undefined,
	"error.chunkEntry": (chunkEntry, { formatFlag }) =>
		chunkEntry ? formatFlag("entry") : undefined,
	"error.chunkInitial": (chunkInitial, { formatFlag }) =>
		chunkInitial ? formatFlag("initial") : undefined,
	"error.file": (file, { bold }) => bold(file),
	"error.moduleName": (moduleName, { bold }) => {
		return moduleName.includes("!")
			? `${bold(moduleName.replace(/^(\s|\S)*!/, ""))} (${moduleName})`
			: `${bold(moduleName)}`;
	},
	"error.loc": (loc, { green }) => green(loc),
	"error.message": (message, { bold }) => bold(message),
	"error.details": details => details,
	"error.stack": stack => stack,
	"error.moduleTrace": moduleTrace => undefined,
	"error.separator!": () => "\n",

	"loggingEntry(error).loggingEntry.message": (message, { red }) =>
		mapLines(message, x => `<e> ${red(x)}`),
	"loggingEntry(warn).loggingEntry.message": (message, { yellow }) =>
		mapLines(message, x => `<w> ${yellow(x)}`),
	"loggingEntry(info).loggingEntry.message": (message, { green }) =>
		mapLines(message, x => `<i> ${green(x)}`),
	"loggingEntry(log).loggingEntry.message": (message, { bold }) =>
		mapLines(message, x => `    ${bold(x)}`),
	"loggingEntry(debug).loggingEntry.message": message =>
		mapLines(message, x => `    ${x}`),
	"loggingEntry(trace).loggingEntry.message": message =>
		mapLines(message, x => `    ${x}`),
	"loggingEntry(status).loggingEntry.message": (message, { magenta }) =>
		mapLines(message, x => `<s> ${magenta(x)}`),
	"loggingEntry(profile).loggingEntry.message": (message, { magenta }) =>
		mapLines(message, x => `<p> ${magenta(x)}`),
	"loggingEntry(profileEnd).loggingEntry.message": (message, { magenta }) =>
		mapLines(message, x => `</p> ${magenta(x)}`),
	"loggingEntry(time).loggingEntry.message": (message, { magenta }) =>
		mapLines(message, x => `<t> ${magenta(x)}`),
	"loggingEntry(group).loggingEntry.message": (message, { cyan }) =>
		mapLines(message, x => `<-> ${cyan(x)}`),
	"loggingEntry(groupCollapsed).loggingEntry.message": (message, { cyan }) =>
		mapLines(message, x => `<+> ${cyan(x)}`),
	"loggingEntry(clear).loggingEntry": () => "    -------",
	"loggingEntry(groupCollapsed).loggingEntry.children": () => "",
	"loggingEntry.trace[]": trace =>
		trace ? mapLines(trace, x => `| ${x}`) : undefined,

	"moduleTraceItem.originName": originName => originName,

	loggingGroup: loggingGroup =>
		loggingGroup.entries.length === 0 ? "" : undefined,
	"loggingGroup.debug": (flag, { red }) => (flag ? red("DEBUG") : undefined),
	"loggingGroup.name": (name, { bold }) => bold(`LOG from ${name}`),
	"loggingGroup.separator!": () => "\n",
	"loggingGroup.filteredEntries": filteredEntries =>
		filteredEntries > 0 ? `+ ${filteredEntries} hidden lines` : undefined,

	"moduleTraceDependency.loc": loc => loc
};

/** @type {Record<string, string | Function>} */
const ITEM_NAMES = {
	"compilation.assets[]": "asset",
	"compilation.modules[]": "module",
	"compilation.chunks[]": "chunk",
	"compilation.entrypoints[]": "chunkGroup",
	"compilation.namedChunkGroups[]": "chunkGroup",
	"compilation.errors[]": "error",
	"compilation.warnings[]": "error",
	"compilation.logging[]": "loggingGroup",
	"compilation.children[]": "compilation",
	"asset.related[]": "asset",
	"asset.children[]": "asset",
	"asset.chunks[]": "assetChunk",
	"asset.auxiliaryChunks[]": "assetChunk",
	"asset.chunkNames[]": "assetChunkName",
	"asset.chunkIdHints[]": "assetChunkIdHint",
	"asset.auxiliaryChunkNames[]": "assetChunkName",
	"asset.auxiliaryChunkIdHints[]": "assetChunkIdHint",
	"chunkGroup.assets[]": "chunkGroupAsset",
	"chunkGroup.auxiliaryAssets[]": "chunkGroupAsset",
	"chunkGroupChild.assets[]": "chunkGroupAsset",
	"chunkGroupChild.auxiliaryAssets[]": "chunkGroupAsset",
	"chunkGroup.children[]": "chunkGroupChildGroup",
	"chunkGroupChildGroup.children[]": "chunkGroupChild",
	"module.modules[]": "module",
	"module.children[]": "module",
	"module.reasons[]": "moduleReason",
	"module.issuerPath[]": "moduleIssuer",
	"chunk.origins[]": "chunkOrigin",
	"chunk.modules[]": "module",
	"loggingGroup.entries[]": logEntry =>
		`loggingEntry(${logEntry.type}).loggingEntry`,
	"loggingEntry.children[]": logEntry =>
		`loggingEntry(${logEntry.type}).loggingEntry`,
	"error.moduleTrace[]": "moduleTraceItem",
	"moduleTraceItem.dependencies[]": "moduleTraceDependency"
};

const ERROR_PREFERRED_ORDER = [
	"compilerPath",
	"chunkId",
	"chunkEntry",
	"chunkInitial",
	"file",
	"separator!",
	"moduleName",
	"loc",
	"separator!",
	"message",
	"separator!",
	"details",
	"separator!",
	"stack",
	"separator!",
	"missing",
	"separator!",
	"moduleTrace"
];

/** @type {Record<string, string[]>} */
const PREFERRED_ORDERS = {
	compilation: [
		"name",
		"hash",
		"version",
		"time",
		"builtAt",
		"env",
		"publicPath",
		"assets",
		"filteredAssets",
		"entrypoints",
		"namedChunkGroups",
		"chunks",
		"modules",
		"filteredModules",
		"children",
		"logging",
		"warnings",
		"warningsInChildren!",
		"errors",
		"errorsInChildren!",
		"summary!",
		"needAdditionalPass"
	],
	asset: [
		"type",
		"name",
		"size",
		"chunks",
		"auxiliaryChunks",
		"emitted",
		"comparedForEmit",
		"cached",
		"info",
		"isOverSizeLimit",
		"chunkNames",
		"auxiliaryChunkNames",
		"chunkIdHints",
		"auxiliaryChunkIdHints",
		"related",
		"filteredRelated",
		"children",
		"filteredChildren"
	],
	"asset.info": [
		"immutable",
		"sourceFilename",
		"javascriptModule",
		"development",
		"hotModuleReplacement"
	],
	chunkGroup: [
		"kind!",
		"name",
		"isOverSizeLimit",
		"assetsSize",
		"auxiliaryAssetsSize",
		"is!",
		"assets",
		"filteredAssets",
		"auxiliaryAssets",
		"filteredAuxiliaryAssets",
		"separator!",
		"children"
	],
	chunkGroupAsset: ["name", "size"],
	chunkGroupChildGroup: ["type", "children"],
	chunkGroupChild: ["assets", "chunks", "name"],
	module: [
		"type",
		"name",
		"identifier",
		"id",
		"sizes",
		"chunks",
		"depth",
		"cacheable",
		"orphan",
		"runtime",
		"optional",
		"dependent",
		"built",
		"codeGenerated",
		"cached",
		"assets",
		"failed",
		"warnings",
		"errors",
		"children",
		"filteredChildren",
		"providedExports",
		"usedExports",
		"optimizationBailout",
		"reasons",
		"issuerPath",
		"profile",
		"modules",
		"filteredModules"
	],
	moduleReason: [
		"active",
		"type",
		"userRequest",
		"moduleId",
		"module",
		"resolvedModule",
		"loc",
		"explanation"
	],
	"module.profile": [
		"total",
		"separator!",
		"resolving",
		"restoring",
		"integration",
		"building",
		"storing",
		"additionalResolving",
		"additionalIntegration"
	],
	chunk: [
		"id",
		"runtime",
		"files",
		"names",
		"idHints",
		"sizes",
		"parents",
		"siblings",
		"children",
		"childrenByOrder",
		"entry",
		"initial",
		"rendered",
		"recorded",
		"reason",
		"separator!",
		"origins",
		"separator!",
		"modules",
		"separator!",
		"filteredModules"
	],
	chunkOrigin: ["request", "moduleId", "moduleName", "loc"],
	error: ERROR_PREFERRED_ORDER,
	warning: ERROR_PREFERRED_ORDER,
	"chunk.childrenByOrder[]": ["type", "children"],
	loggingGroup: [
		"debug",
		"name",
		"separator!",
		"entries",
		"separator!",
		"filteredEntries"
	],
	loggingEntry: ["message", "trace", "children"]
};

const itemsJoinOneLine = items => items.filter(Boolean).join(" ");
const itemsJoinOneLineBrackets = items =>
	items.length > 0 ? `(${items.filter(Boolean).join(" ")})` : undefined;
const itemsJoinMoreSpacing = items => items.filter(Boolean).join("\n\n");
const itemsJoinComma = items => items.filter(Boolean).join(", ");
const itemsJoinCommaBrackets = items =>
	items.length > 0 ? `(${items.filter(Boolean).join(", ")})` : undefined;
const itemsJoinCommaBracketsWithName = name => items =>
	items.length > 0
		? `(${name}: ${items.filter(Boolean).join(", ")})`
		: undefined;

/** @type {Record<string, (items: string[]) => string>} */
const SIMPLE_ITEMS_JOINER = {
	"chunk.parents": itemsJoinOneLine,
	"chunk.siblings": itemsJoinOneLine,
	"chunk.children": itemsJoinOneLine,
	"chunk.names": itemsJoinCommaBrackets,
	"chunk.idHints": itemsJoinCommaBracketsWithName("id hint"),
	"chunk.runtime": itemsJoinCommaBracketsWithName("runtime"),
	"chunk.files": itemsJoinComma,
	"chunk.childrenByOrder": itemsJoinOneLine,
	"chunk.childrenByOrder[].children": itemsJoinOneLine,
	"chunkGroup.assets": itemsJoinOneLine,
	"chunkGroup.auxiliaryAssets": itemsJoinOneLineBrackets,
	"chunkGroupChildGroup.children": itemsJoinComma,
	"chunkGroupChild.assets": itemsJoinOneLine,
	"chunkGroupChild.auxiliaryAssets": itemsJoinOneLineBrackets,
	"asset.chunks": itemsJoinComma,
	"asset.auxiliaryChunks": itemsJoinCommaBrackets,
	"asset.chunkNames": itemsJoinCommaBracketsWithName("name"),
	"asset.auxiliaryChunkNames": itemsJoinCommaBracketsWithName("auxiliary name"),
	"asset.chunkIdHints": itemsJoinCommaBracketsWithName("id hint"),
	"asset.auxiliaryChunkIdHints": itemsJoinCommaBracketsWithName(
		"auxiliary id hint"
	),
	"module.chunks": itemsJoinOneLine,
	"module.issuerPath": items =>
		items
			.filter(Boolean)
			.map(item => `${item} ->`)
			.join(" "),
	"compilation.errors": itemsJoinMoreSpacing,
	"compilation.warnings": itemsJoinMoreSpacing,
	"compilation.logging": itemsJoinMoreSpacing,
	"compilation.children": items => indent(itemsJoinMoreSpacing(items), "  "),
	"moduleTraceItem.dependencies": itemsJoinOneLine,
	"loggingEntry.children": items =>
		indent(items.filter(Boolean).join("\n"), "  ", false)
};

const joinOneLine = items =>
	items
		.map(item => item.content)
		.filter(Boolean)
		.join(" ");

const joinInBrackets = items => {
	const res = [];
	let mode = 0;
	for (const item of items) {
		if (item.element === "separator!") {
			switch (mode) {
				case 0:
				case 1:
					mode += 2;
					break;
				case 4:
					res.push(")");
					mode = 3;
					break;
			}
		}
		if (!item.content) continue;
		switch (mode) {
			case 0:
				mode = 1;
				break;
			case 1:
				res.push(" ");
				break;
			case 2:
				res.push("(");
				mode = 4;
				break;
			case 3:
				res.push(" (");
				mode = 4;
				break;
			case 4:
				res.push(", ");
				break;
		}
		res.push(item.content);
	}
	if (mode === 4) res.push(")");
	return res.join("");
};

const indent = (str, prefix, noPrefixInFirstLine) => {
	const rem = str.replace(/\n([^\n])/g, "\n" + prefix + "$1");
	if (noPrefixInFirstLine) return rem;
	const ind = str[0] === "\n" ? "" : prefix;
	return ind + rem;
};

const joinExplicitNewLine = (items, indenter) => {
	let firstInLine = true;
	let first = true;
	return items
		.map(item => {
			if (!item || !item.content) return;
			let content = indent(item.content, first ? "" : indenter, !firstInLine);
			if (firstInLine) {
				content = content.replace(/^\n+/, "");
			}
			if (!content) return;
			first = false;
			const noJoiner = firstInLine || content.startsWith("\n");
			firstInLine = content.endsWith("\n");
			return noJoiner ? content : " " + content;
		})
		.filter(Boolean)
		.join("")
		.trim();
};

const joinError = error => (items, { red, yellow }) =>
	`${error ? red("ERROR") : yellow("WARNING")} in ${joinExplicitNewLine(
		items,
		""
	)}`;

/** @type {Record<string, (items: ({ element: string, content: string })[], context: UsualContext) => string>} */
const SIMPLE_ELEMENT_JOINERS = {
	compilation: items => {
		const result = [];
		let lastNeedMore = false;
		for (const item of items) {
			if (!item.content) continue;
			const needMoreSpace =
				item.element === "warnings" ||
				item.element === "errors" ||
				item.element === "logging";
			if (result.length !== 0) {
				result.push(needMoreSpace || lastNeedMore ? "\n\n" : "\n");
			}
			result.push(item.content);
			lastNeedMore = needMoreSpace;
		}
		if (lastNeedMore) result.push("\n");
		return result.join("");
	},
	asset: items =>
		joinExplicitNewLine(
			items.map(item => {
				if (
					(item.element === "related" || item.element === "children") &&
					item.content
				) {
					return {
						...item,
						content: `\n${item.content}\n`
					};
				}
				return item;
			}),
			"  "
		),
	"asset.info": joinOneLine,
	module: (items, { module }) => {
		let hasName = false;
		return joinExplicitNewLine(
			items.map(item => {
				switch (item.element) {
					case "id":
						if (module.id === module.name) {
							if (hasName) return false;
							if (item.content) hasName = true;
						}
						break;
					case "name":
						if (hasName) return false;
						if (item.content) hasName = true;
						break;
					case "providedExports":
					case "usedExports":
					case "optimizationBailout":
					case "reasons":
					case "issuerPath":
					case "profile":
					case "children":
					case "modules":
						if (item.content) {
							return {
								...item,
								content: `\n${item.content}\n`
							};
						}
						break;
				}
				return item;
			}),
			"  "
		);
	},
	chunk: items => {
		let hasEntry = false;
		return (
			"chunk " +
			joinExplicitNewLine(
				items.filter(item => {
					switch (item.element) {
						case "entry":
							if (item.content) hasEntry = true;
							break;
						case "initial":
							if (hasEntry) return false;
							break;
					}
					return true;
				}),
				"  "
			)
		);
	},
	"chunk.childrenByOrder[]": items => `(${joinOneLine(items)})`,
	chunkGroup: items => joinExplicitNewLine(items, "  "),
	chunkGroupAsset: joinOneLine,
	chunkGroupChildGroup: joinOneLine,
	chunkGroupChild: joinOneLine,
	moduleReason: (items, { moduleReason }) => {
		let hasName = false;
		return joinOneLine(
			items.filter(item => {
				switch (item.element) {
					case "moduleId":
						if (moduleReason.moduleId === moduleReason.module && item.content)
							hasName = true;
						break;
					case "module":
						if (hasName) return false;
						break;
					case "resolvedModule":
						return (
							moduleReason.module !== moduleReason.resolvedModule &&
							item.content
						);
				}
				return true;
			})
		);
	},
	"module.profile": joinInBrackets,
	moduleIssuer: joinOneLine,
	chunkOrigin: items => "> " + joinOneLine(items),
	"errors[].error": joinError(true),
	"warnings[].error": joinError(false),
	loggingGroup: items => joinExplicitNewLine(items, "").trimRight(),
	moduleTraceItem: items => " @ " + joinOneLine(items),
	moduleTraceDependency: joinOneLine
};

const AVAILABLE_COLORS = {
	bold: "\u001b[1m",
	yellow: "\u001b[1m\u001b[33m",
	red: "\u001b[1m\u001b[31m",
	green: "\u001b[1m\u001b[32m",
	cyan: "\u001b[1m\u001b[36m",
	magenta: "\u001b[1m\u001b[35m"
};

const AVAILABLE_FORMATS = {
	formatChunkId: (id, { yellow }, direction) => {
		switch (direction) {
			case "parent":
				return `<{${yellow(id)}}>`;
			case "sibling":
				return `={${yellow(id)}}=`;
			case "child":
				return `>{${yellow(id)}}<`;
			default:
				return `{${yellow(id)}}`;
		}
	},
	formatModuleId: id => `[${id}]`,
	formatFilename: (filename, { green, yellow }, oversize) =>
		(oversize ? yellow : green)(filename),
	formatFlag: flag => `[${flag}]`,
	formatSize: require("../SizeFormatHelpers").formatSize,
	formatDateTime: (dateTime, { bold }) => {
		const d = new Date(dateTime);
		const x = twoDigit;
		const date = `${d.getFullYear()}-${x(d.getMonth() + 1)}-${x(d.getDate())}`;
		const time = `${x(d.getHours())}:${x(d.getMinutes())}:${x(d.getSeconds())}`;
		return `${date} ${bold(time)}`;
	},
	formatTime: (
		time,
		{ timeReference, bold, green, yellow, red },
		boldQuantity
	) => {
		const unit = " ms";
		if (timeReference && time !== timeReference) {
			const times = [
				timeReference / 2,
				timeReference / 4,
				timeReference / 8,
				timeReference / 16
			];
			if (time < times[3]) return `${time}${unit}`;
			else if (time < times[2]) return bold(`${time}${unit}`);
			else if (time < times[1]) return green(`${time}${unit}`);
			else if (time < times[0]) return yellow(`${time}${unit}`);
			else return red(`${time}${unit}`);
		} else {
			return `${boldQuantity ? bold(time) : time}${unit}`;
		}
	}
};

const RESULT_MODIFIER = {
	"module.modules": result => {
		return indent(result, "| ");
	}
};

const createOrder = (array, preferredOrder) => {
	const originalArray = array.slice();
	const set = new Set(array);
	const usedSet = new Set();
	array.length = 0;
	for (const element of preferredOrder) {
		if (element.endsWith("!") || set.has(element)) {
			array.push(element);
			usedSet.add(element);
		}
	}
	for (const element of originalArray) {
		if (!usedSet.has(element)) {
			array.push(element);
		}
	}
	return array;
};

class DefaultStatsPrinterPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("DefaultStatsPrinterPlugin", compilation => {
			compilation.hooks.statsPrinter.tap(
				"DefaultStatsPrinterPlugin",
				(stats, options, context) => {
					// Put colors into context
					stats.hooks.print
						.for("compilation")
						.tap("DefaultStatsPrinterPlugin", (compilation, context) => {
							for (const color of Object.keys(AVAILABLE_COLORS)) {
								let start;
								if (options.colors) {
									if (
										typeof options.colors === "object" &&
										typeof options.colors[color] === "string"
									) {
										start = options.colors[color];
									} else {
										start = AVAILABLE_COLORS[color];
									}
								}
								if (start) {
									context[color] = str => `${start}${str}\u001b[39m\u001b[22m`;
								} else {
									context[color] = str => str;
								}
							}
							for (const format of Object.keys(AVAILABLE_FORMATS)) {
								context[format] = (content, ...args) =>
									AVAILABLE_FORMATS[format](content, context, ...args);
							}
							context.timeReference = compilation.time;
						});

					for (const key of Object.keys(SIMPLE_PRINTERS)) {
						stats.hooks.print
							.for(key)
							.tap("DefaultStatsPrinterPlugin", (obj, ctx) =>
								SIMPLE_PRINTERS[key](obj, ctx, stats)
							);
					}

					for (const key of Object.keys(PREFERRED_ORDERS)) {
						const preferredOrder = PREFERRED_ORDERS[key];
						stats.hooks.sortElements
							.for(key)
							.tap("DefaultStatsPrinterPlugin", (elements, context) => {
								createOrder(elements, preferredOrder);
							});
					}

					for (const key of Object.keys(ITEM_NAMES)) {
						const itemName = ITEM_NAMES[key];
						stats.hooks.getItemName
							.for(key)
							.tap(
								"DefaultStatsPrinterPlugin",
								typeof itemName === "string" ? () => itemName : itemName
							);
					}

					for (const key of Object.keys(SIMPLE_ITEMS_JOINER)) {
						const joiner = SIMPLE_ITEMS_JOINER[key];
						stats.hooks.printItems
							.for(key)
							.tap("DefaultStatsPrinterPlugin", joiner);
					}

					for (const key of Object.keys(SIMPLE_ELEMENT_JOINERS)) {
						const joiner = SIMPLE_ELEMENT_JOINERS[key];
						stats.hooks.printElements
							.for(key)
							.tap("DefaultStatsPrinterPlugin", joiner);
					}

					for (const key of Object.keys(RESULT_MODIFIER)) {
						const modifier = RESULT_MODIFIER[key];
						stats.hooks.result
							.for(key)
							.tap("DefaultStatsPrinterPlugin", modifier);
					}
				}
			);
		});
	}
}
module.exports = DefaultStatsPrinterPlugin;
