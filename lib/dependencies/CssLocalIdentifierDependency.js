/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const { cssExportConvention } = require("../util/conventions");
const createHash = require("../util/createHash");
const { makePathsRelative } = require("../util/identifier");
const makeSerializable = require("../util/makeSerializable");
const NullDependency = require("./NullDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../../declarations/WebpackOptions").CssGeneratorExportsConvention} CssGeneratorExportsConvention */
/** @typedef {import("../../declarations/WebpackOptions").CssGeneratorLocalIdentName} CssGeneratorLocalIdentName */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../CssModule")} CssModule */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").ExportsSpec} ExportsSpec */
/** @typedef {import("../Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../DependencyTemplate").CssDependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../NormalModuleFactory").ResourceDataWithData} ResourceDataWithData */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("../css/CssGenerator")} CssGenerator */
/** @typedef {import("../css/CssParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("../util/createHash").Algorithm} Algorithm */

/**
 * @param {string} local css local
 * @param {CssModule} module module
 * @param {ChunkGraph} chunkGraph chunk graph
 * @param {RuntimeTemplate} runtimeTemplate runtime template
 * @returns {string} local ident
 */
const getLocalIdent = (local, module, chunkGraph, runtimeTemplate) => {
	const localIdentName =
		/** @type {CssGenerator} */
		(module.generator).localIdentName;
	const relativeResourcePath = makePathsRelative(
		/** @type {string} */
		(module.context),
		module.matchResource || module.resource,
		runtimeTemplate.compilation.compiler.root
	);
	const { hashFunction, hashDigest, hashDigestLength, hashSalt, uniqueName } =
		runtimeTemplate.outputOptions;
	const hash = createHash(/** @type {Algorithm} */ (hashFunction));

	if (hashSalt) {
		hash.update(hashSalt);
	}

	hash.update(relativeResourcePath);

	if (!/\[local\]/.test(localIdentName)) {
		hash.update(local);
	}

	const localIdentHash =
		/** @type {string} */
		(hash.digest(hashDigest)).slice(0, hashDigestLength);

	return runtimeTemplate.compilation
		.getPath(localIdentName, {
			filename: relativeResourcePath,
			hash: localIdentHash,
			contentHash: localIdentHash,
			chunkGraph,
			module
		})
		.replace(/\[local\]/g, local)
		.replace(/\[uniqueName\]/g, /** @type {string} */ (uniqueName))
		.replace(/^((-?[0-9])|--)/, "_$1");
};

const CONTAINS_ESCAPE = /\\/;

/**
 * @param {string} str string
 * @returns {[string, number] | undefined} hex
 */
const gobbleHex = str => {
	const lower = str.toLowerCase();
	let hex = "";
	let spaceTerminated = false;

	for (let i = 0; i < 6 && lower[i] !== undefined; i++) {
		const code = lower.charCodeAt(i);
		// check to see if we are dealing with a valid hex char [a-f|0-9]
		const valid = (code >= 97 && code <= 102) || (code >= 48 && code <= 57);
		// https://drafts.csswg.org/css-syntax/#consume-escaped-code-point
		spaceTerminated = code === 32;
		if (!valid) break;
		hex += lower[i];
	}

	if (hex.length === 0) return undefined;

	const codePoint = Number.parseInt(hex, 16);
	const isSurrogate = codePoint >= 0xd800 && codePoint <= 0xdfff;

	// Add special case for
	// "If this number is zero, or is for a surrogate, or is greater than the maximum allowed code point"
	// https://drafts.csswg.org/css-syntax/#maximum-allowed-code-point
	if (isSurrogate || codePoint === 0x0000 || codePoint > 0x10ffff) {
		return ["\uFFFD", hex.length + (spaceTerminated ? 1 : 0)];
	}

	return [
		String.fromCodePoint(codePoint),
		hex.length + (spaceTerminated ? 1 : 0)
	];
};

// eslint-disable-next-line no-useless-escape
const regexSingleEscape = /[ -,.\/:-@[\]\^`{-~]/;
const regexExcessiveSpaces =
	/(^|\\+)?(\\[A-F0-9]{1,6})\u0020(?![a-fA-F0-9\u0020])/g;

class CssLocalIdentifierDependency extends NullDependency {
	/**
	 * @param {string} name name
	 * @param {Range} range range
	 * @param {string=} prefix prefix
	 */
	constructor(name, range, prefix = "") {
		super();
		this.name = CssLocalIdentifierDependency.unescapeIdentifier(name);
		this.range = range;
		this.prefix = prefix;
		this._conventionNames = undefined;
		this._hashUpdate = undefined;
	}

	/**
	 * @param {string} str string
	 * @returns {string} unescaped string
	 */
	static unescapeIdentifier(str) {
		const needToProcess = CONTAINS_ESCAPE.test(str);
		if (!needToProcess) return str;
		let ret = "";
		for (let i = 0; i < str.length; i++) {
			if (str[i] === "\\") {
				const gobbled = gobbleHex(str.slice(i + 1, i + 7));
				if (gobbled !== undefined) {
					ret += gobbled[0];
					i += gobbled[1];
					continue;
				}
				// Retain a pair of \\ if double escaped `\\\\`
				// https://github.com/postcss/postcss-selector-parser/commit/268c9a7656fb53f543dc620aa5b73a30ec3ff20e
				if (str[i + 1] === "\\") {
					ret += "\\";
					i += 1;
					continue;
				}
				// if \\ is at the end of the string retain it
				// https://github.com/postcss/postcss-selector-parser/commit/01a6b346e3612ce1ab20219acc26abdc259ccefb
				if (str.length === i + 1) {
					ret += str[i];
				}
				continue;
			}
			ret += str[i];
		}

		return ret;
	}

	/**
	 * @param {string} str string
	 * @returns {string} escaped identifier
	 */
	static escapeIdentifier(str) {
		let output = "";
		let counter = 0;

		while (counter < str.length) {
			const character = str.charAt(counter++);

			let value;

			if (/[\t\n\f\r\u000B]/.test(character)) {
				const codePoint = character.charCodeAt(0);

				value = `\\${codePoint.toString(16).toUpperCase()} `;
			} else if (character === "\\" || regexSingleEscape.test(character)) {
				value = `\\${character}`;
			} else {
				value = character;
			}

			output += value;
		}

		const firstChar = str.charAt(0);

		if (/^-[-\d]/.test(output)) {
			output = `\\-${output.slice(1)}`;
		} else if (/\d/.test(firstChar)) {
			output = `\\3${firstChar} ${output.slice(1)}`;
		}

		// Remove spaces after `\HEX` escapes that are not followed by a hex digit,
		// since they’re redundant. Note that this is only possible if the escape
		// sequence isn’t preceded by an odd number of backslashes.
		output = output.replace(regexExcessiveSpaces, ($0, $1, $2) => {
			if ($1 && $1.length % 2) {
				// It’s not safe to remove the space, so don’t.
				return $0;
			}

			// Strip the space.
			return ($1 || "") + $2;
		});

		return output;
	}

	get type() {
		return "css local identifier";
	}

	/**
	 * @param {string} name export name
	 * @param {CssGeneratorExportsConvention} convention convention of the export name
	 * @returns {string[]} convention results
	 */
	getExportsConventionNames(name, convention) {
		if (this._conventionNames) {
			return this._conventionNames;
		}
		this._conventionNames = cssExportConvention(this.name, convention);
		return this._conventionNames;
	}

	/**
	 * Returns the exported names
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {ExportsSpec | undefined} export names
	 */
	getExports(moduleGraph) {
		const module = /** @type {CssModule} */ (moduleGraph.getParentModule(this));
		const convention =
			/** @type {CssGenerator} */
			(module.generator).convention;
		const names = this.getExportsConventionNames(this.name, convention);
		return {
			exports: names.map(name => ({
				name,
				canMangle: true
			})),
			dependencies: undefined
		};
	}

	/**
	 * Update the hash
	 * @param {Hash} hash hash to be updated
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, { chunkGraph }) {
		if (this._hashUpdate === undefined) {
			const module =
				/** @type {CssModule} */
				(chunkGraph.moduleGraph.getParentModule(this));
			const generator =
				/** @type {CssGenerator} */
				(module.generator);
			const names = this.getExportsConventionNames(
				this.name,
				generator.convention
			);
			this._hashUpdate = `exportsConvention|${JSON.stringify(names)}|localIdentName|${JSON.stringify(generator.localIdentName)}`;
		}
		hash.update(this._hashUpdate);
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.name);
		write(this.range);
		write(this.prefix);
		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.name = read();
		this.range = read();
		this.prefix = read();
		super.deserialize(context);
	}
}

CssLocalIdentifierDependency.Template = class CssLocalIdentifierDependencyTemplate extends (
	NullDependency.Template
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {string} local local name
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {string} identifier
	 */
	static getIdentifier(
		dependency,
		local,
		{ module: m, chunkGraph, runtimeTemplate }
	) {
		const dep = /** @type {CssLocalIdentifierDependency} */ (dependency);
		const module = /** @type {CssModule} */ (m);

		return (
			dep.prefix +
			CssLocalIdentifierDependency.escapeIdentifier(
				getLocalIdent(local, module, chunkGraph, runtimeTemplate)
			)
		);
	}

	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const { module: m, moduleGraph, runtime, cssExportsData } = templateContext;
		const dep = /** @type {CssLocalIdentifierDependency} */ (dependency);
		const module = /** @type {CssModule} */ (m);
		const convention =
			/** @type {CssGenerator} */
			(module.generator).convention;
		const names = dep.getExportsConventionNames(dep.name, convention);
		const usedNames =
			/** @type {(string)[]} */
			(
				names
					.map(name =>
						moduleGraph.getExportInfo(module, name).getUsedName(name, runtime)
					)
					.filter(Boolean)
			);
		const local = usedNames.length === 0 ? names[0] : usedNames[0];
		const identifier = CssLocalIdentifierDependencyTemplate.getIdentifier(
			dep,
			local,
			templateContext
		);

		source.replace(dep.range[0], dep.range[1] - 1, identifier);

		for (const used of usedNames.concat(names)) {
			cssExportsData.exports.set(used, identifier);
		}
	}
};

makeSerializable(
	CssLocalIdentifierDependency,
	"webpack/lib/dependencies/CssLocalIdentifierDependency"
);

module.exports = CssLocalIdentifierDependency;
