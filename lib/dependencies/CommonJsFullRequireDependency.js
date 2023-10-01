/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Template = require("../Template");
const { equals } = require("../util/ArrayHelpers");
const makeSerializable = require("../util/makeSerializable");
const propertyAccess = require("../util/propertyAccess");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").ReferencedExport} ReferencedExport */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */

class CommonJsFullRequireDependency extends ModuleDependency {
	/**
	 * @param {string} request the request string
	 * @param {Range} range location in source code
	 * @param {string[]} names accessed properties on module
	 * @param {Range[]=} idRanges ranges for members of ids; the two arrays are right-aligned
	 */
	constructor(
		request,
		range,
		names,
		idRanges /* TODO webpack 6 make this non-optional. It must always be set to properly trim ids. */
	) {
		super(request);
		this.range = range;
		this.names = names;
		this.idRanges = idRanges;
		this.call = false;
		this.asiSafe = undefined;
	}

	/**
	 * Returns list of exports referenced by this dependency
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {RuntimeSpec} runtime the runtime for which the module is analysed
	 * @returns {(string[] | ReferencedExport)[]} referenced exports
	 */
	getReferencedExports(moduleGraph, runtime) {
		if (this.call) {
			const importedModule = moduleGraph.getModule(this);
			if (
				!importedModule ||
				importedModule.getExportsType(moduleGraph, false) !== "namespace"
			) {
				return [this.names.slice(0, -1)];
			}
		}
		return [this.names];
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.names);
		write(this.idRanges);
		write(this.call);
		write(this.asiSafe);
		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.names = read();
		this.idRanges = read();
		this.call = read();
		this.asiSafe = read();
		super.deserialize(context);
	}

	get type() {
		return "cjs full require";
	}

	get category() {
		return "commonjs";
	}
}

CommonJsFullRequireDependency.Template = class CommonJsFullRequireDependencyTemplate extends (
	ModuleDependency.Template
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(
		dependency,
		source,
		{
			module,
			runtimeTemplate,
			moduleGraph,
			chunkGraph,
			runtimeRequirements,
			runtime,
			initFragments
		}
	) {
		const dep = /** @type {CommonJsFullRequireDependency} */ (dependency);
		if (!dep.range) return;
		const importedModule = moduleGraph.getModule(dep);
		let requireExpr = runtimeTemplate.moduleExports({
			module: importedModule,
			chunkGraph,
			request: dep.request,
			weak: dep.weak,
			runtimeRequirements
		});

		const ids = dep.names;
		let trimmedIds = this._trimIdsToThoseImported(ids, moduleGraph, dep);

		let [rangeStart, rangeEnd] = dep.range;
		if (trimmedIds.length !== ids.length) {
			// The array returned from dep.idRanges is right-aligned with the array returned from dep.names.
			// Meaning, the two arrays may not always have the same number of elements, but the last element of
			// dep.idRanges corresponds to [the expression fragment to the left of] the last element of dep.names.
			// Use this to find the correct replacement range based on the number of ids that were trimmed.
			const idx =
				dep.idRanges === undefined
					? -1 /* trigger failure case below */
					: dep.idRanges.length + (trimmedIds.length - ids.length);
			if (idx < 0 || idx >= dep.idRanges.length) {
				// cspell:ignore minifiers
				// Should not happen but we can't throw an error here because of backward compatibility with
				// external plugins in wp5.  Instead, we just disable trimming for now.  This may break some minifiers.
				trimmedIds = ids;
				// TODO webpack 6 remove the "trimmedIds = ids" above and uncomment the following line instead.
				// throw new Error("Missing range starts data for id replacement trimming.");
			} else {
				[rangeStart, rangeEnd] = dep.idRanges[idx];
			}
		}

		if (importedModule) {
			const usedImported = moduleGraph
				.getExportsInfo(importedModule)
				.getUsedName(trimmedIds, runtime);
			if (usedImported) {
				const comment = equals(usedImported, trimmedIds)
					? ""
					: Template.toNormalComment(propertyAccess(trimmedIds)) + " ";
				const access = `${comment}${propertyAccess(usedImported)}`;
				requireExpr =
					dep.asiSafe === true
						? `(${requireExpr}${access})`
						: `${requireExpr}${access}`;
			}
		}
		source.replace(rangeStart, rangeEnd - 1, requireExpr);
	}

	/**
	 * @summary Determine which IDs in the id chain are actually referring to namespaces or imports,
	 * and which are deeper member accessors on the imported object.  Only the former should be re-rendered.
	 * @param {string[]} ids ids
	 * @param {ModuleGraph} moduleGraph moduleGraph
	 * @param {CommonJsFullRequireDependency} dependency dependency
	 * @returns {string[]} generated code
	 */
	_trimIdsToThoseImported(ids, moduleGraph, dependency) {
		let trimmedIds = [];
		const exportsInfo = moduleGraph.getExportsInfo(
			moduleGraph.getModule(dependency)
		);
		let currentExportsInfo = /** @type {ExportsInfo=} */ exportsInfo;
		for (let i = 0; i < ids.length; i++) {
			if (i === 0 && ids[i] === "default") {
				continue; // ExportInfo for the next level under default is still at the root ExportsInfo, so don't advance currentExportsInfo
			}
			const exportInfo = currentExportsInfo.getExportInfo(ids[i]);
			if (exportInfo.provided === false) {
				// json imports have nested ExportInfo for elements that things that are not actually exported, so check .provided
				trimmedIds = ids.slice(0, i);
				break;
			}
			const nestedInfo = exportInfo.getNestedExportsInfo();
			if (!nestedInfo) {
				// once all nested exports are traversed, the next item is the actual import so stop there
				trimmedIds = ids.slice(0, i + 1);
				break;
			}
			currentExportsInfo = nestedInfo;
		}
		// Never trim to nothing.  This can happen for invalid imports (e.g. import { notThere } from "./module", or import { anything } from "./missingModule")
		return trimmedIds.length ? trimmedIds : ids;
	}
};

makeSerializable(
	CommonJsFullRequireDependency,
	"webpack/lib/dependencies/CommonJsFullRequireDependency"
);

module.exports = CommonJsFullRequireDependency;
