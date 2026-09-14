/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const fs = require("fs").promises;
const path = require("path");
const prettier = require("prettier");
const ts = require("typescript");
const argv = require("./argv");

const {
	write: doWrite,
	verbose,
	root,
	types: outputFile,
	templateLiterals
} = argv;

process.exitCode = 1;
let exitCode = 0;
let hasUnresolvableTypes = false;

// The checker hands back nodes carrying more than the public typings admit.
/** @typedef {ts.Symbol & { parent?: SymbolWithParent }} SymbolWithParent */
/** @typedef {ts.Type & { intrinsicName?: string }} TypeWithIntrinsicName */
/** @typedef {ts.Declaration & { expression?: ts.Node }} DeclarationWithExpression */

const AnonymousType = "__Type";

/** @type {Record<number, string>} */
const SYNTAX_KIND_TO_NAME = {
	[ts.SyntaxKind.ObjectLiteralExpression]: "Object",
	[ts.SyntaxKind.TypeLiteral]: "TypeLiteral",
	[ts.SyntaxKind.SourceFile]: "Module",
	[ts.SyntaxKind.JSDocTypedefTag]: "Object",
	[ts.SyntaxKind.JSDocTypeLiteral]: "Object",
	[ts.SyntaxKind.TypeAliasDeclaration]: "Alias",
	[ts.SyntaxKind.FunctionDeclaration]: "Function",
	[ts.SyntaxKind.FunctionExpression]: "Function",
	[ts.SyntaxKind.ArrowFunction]: "Function",
	[ts.SyntaxKind.FunctionType]: "Function",
	[ts.SyntaxKind.JSDocSignature]: "Function",
	[ts.SyntaxKind.JSDocCallbackTag]: "Function",
	[ts.SyntaxKind.MethodDeclaration]: "Method",
	[ts.SyntaxKind.MethodSignature]: "Method",
	[ts.SyntaxKind.EnumDeclaration]: "Enum",
	[ts.SyntaxKind.ClassDeclaration]: "Class",
	[ts.SyntaxKind.ClassExpression]: "Class",
	[ts.SyntaxKind.InterfaceDeclaration]: "Interface"
};

const IDENTIFIER_NAME_REPLACE_REGEX = /^([^a-zA-Z$_])/;
const IDENTIFIER_ALPHA_NUMERIC_NAME_REPLACE_REGEX = /[^a-zA-Z0-9$]+/g;
/**
 * @param {string} str the name to sanitize
 * @returns {string} the name as a valid identifier
 */
const toIdentifier = (str) =>
	str
		.replace(IDENTIFIER_NAME_REPLACE_REGEX, "_$1")
		.replace(IDENTIFIER_ALPHA_NUMERIC_NAME_REPLACE_REGEX, "_");

/**
 * @param {string[]} list the identifier parts
 * @returns {string} the parts joined into one camel-cased identifier
 */
const joinIdentifier = (list) => {
	const str = list.join("_");
	return str.replace(
		/([^_])_+(.|$)/g,
		/**
		 * @param {string} m the whole match
		 * @param {string} a the character before the underscores
		 * @param {string} b the character after them
		 * @returns {string} the two characters joined
		 */
		(m, a, b) => (a !== a.toLowerCase() ? `${a}_${b}` : a + b.toUpperCase())
	);
};

/**
 * @template T
 * @param {Iterable<Iterable<T>>} iterable the lists to concatenate
 * @returns {T[]} every item of every list
 */
const flatten = (iterable) => {
	/** @type {T[]} */
	const array = [];
	for (const list of iterable) {
		array.push(...list);
	}
	return array;
};

/**
 * @param {string} str the text to quote
 * @returns {string} the text with every regexp metacharacter escaped
 */
const quoteMeta = (str) => str.replace(/[-[\]\\/{}()*+?.^$|]/g, "\\$&");

class TupleMap {
	constructor() {
		/** @type {Map<any, { map: TupleMap | undefined, hasValue: boolean, value: any }>} */
		this.map = new Map();
	}

	/**
	 * @param {any[]} tuple tuple
	 * @returns {any} value or undefined
	 */
	get(tuple) {
		return this._get(tuple, 0);
	}

	/**
	 * @param {EXPECTED_ANY[]} tuple the key tuple
	 * @param {number} index how far into the tuple this level is
	 * @returns {EXPECTED_ANY} the value at that tuple
	 */
	_get(tuple, index) {
		const entry = this.map.get(tuple[index]);
		if (entry === undefined) return undefined;
		if (tuple.length === index + 1) return entry.value;
		if (entry.map === undefined) return undefined;
		return entry.map._get(tuple, index + 1);
	}

	/**
	 * @param {any[]} tuple tuple
	 * @returns {boolean} true, if it's in the map
	 */
	has(tuple) {
		return this._has(tuple, 0);
	}

	/**
	 * @param {EXPECTED_ANY[]} tuple the key tuple
	 * @param {number} index how far into the tuple this level is
	 * @returns {boolean} true when the tuple is present
	 */
	_has(tuple, index) {
		const entry = this.map.get(tuple[index]);
		if (entry === undefined) return false;
		if (tuple.length === index + 1) return entry.hasValue;
		if (entry.map === undefined) return false;
		return entry.map._has(tuple, index + 1);
	}

	/**
	 * @param {any[]} tuple tuple
	 * @param {any} value the new value
	 * @returns {void}
	 */
	set(tuple, value) {
		return this._set(tuple, 0, value);
	}

	/**
	 * @param {EXPECTED_ANY[]} tuple the key tuple
	 * @param {number} index how far into the tuple this level is
	 * @param {EXPECTED_ANY} value the new value
	 * @returns {void} nothing
	 */
	_set(tuple, index, value) {
		let entry = this.map.get(tuple[index]);
		if (entry === undefined) {
			entry = { map: undefined, hasValue: false, value: undefined };
			this.map.set(tuple[index], entry);
		}
		if (tuple.length === index + 1) {
			entry.hasValue = true;
			entry.value = value;
			return;
		}
		if (entry.map === undefined) {
			entry.map = new TupleMap();
		}
		entry.map._set(tuple, index + 1, value);
	}

	/**
	 * @param {any[]} tuple tuple
	 * @returns {void}
	 */
	add(tuple) {
		return this._add(tuple, 0);
	}

	/**
	 * @param {EXPECTED_ANY[]} tuple the key tuple
	 * @param {number} index how far into the tuple this level is
	 * @returns {void} nothing
	 */
	_add(tuple, index) {
		let entry = this.map.get(tuple[index]);
		if (entry === undefined) {
			entry = { map: undefined, hasValue: false, value: undefined };
			this.map.set(tuple[index], entry);
		}
		if (tuple.length === index + 1) {
			entry.hasValue = true;
			entry.value = undefined;
			return;
		}
		if (entry.map === undefined) {
			entry.map = new TupleMap();
		}
		entry.map._add(tuple, index + 1);
	}

	/**
	 * @param {any[]} tuple tuple
	 * @returns {void}
	 */
	delete(tuple) {
		return this._delete(tuple, 0);
	}

	/**
	 * @param {EXPECTED_ANY[]} tuple the key tuple
	 * @param {number} index how far into the tuple this level is
	 * @returns {void} nothing
	 */
	_delete(tuple, index) {
		const entry = this.map.get(tuple[index]);
		if (entry === undefined) {
			return;
		}
		if (tuple.length === index + 1) {
			entry.hasValue = false;
			entry.value = undefined;
			if (entry.map === undefined) {
				this.map.delete(tuple[index]);
			}
			return;
		}
		if (entry.map === undefined) {
			return;
		}
		entry.map._delete(tuple, index + 1);
		if (entry.map.map.size === 0) {
			entry.map = undefined;
			if (!entry.hasValue) {
				this.map.delete(tuple[index]);
			}
		}
	}

	/**
	 * @returns {EXPECTED_ANY[]} every value in the map, at any depth
	 */
	values() {
		/** @type {EXPECTED_ANY[]} */
		const values = [];
		for (const entry of this.map.values()) {
			if (entry.hasValue) values.push(entry.value);
			if (entry.map !== undefined) {
				values.push(...entry.map.values());
			}
		}
		return values;
	}
}

/**
 * @param {ts.Diagnostic} diagnostic info
 * @returns {void}
 */
const printError = (diagnostic) => {
	if (diagnostic.file && typeof diagnostic.start === "number") {
		const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
			diagnostic.start
		);
		const message = ts.flattenDiagnosticMessageText(
			diagnostic.messageText,
			"\n"
		);
		console.error(
			`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`
		);
	} else {
		console.error(
			ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
		);
	}
};

(async () => {
	const rootPath = path.resolve(root);

	const ownConfigPath = path.resolve(rootPath, "generate-types-config.js");
	/**
	 * @typedef {object} GeneratorOptions
	 * @property {Record<string, RegExp>} nameMapping preferred name per matching key
	 * @property {Record<string, string>} typeMapping replacement type per matching name
	 * @property {RegExp[]} exclude names to leave out
	 * @property {RegExp[]} include names to keep
	 */

	/** @type {GeneratorOptions} */
	const options = {
		nameMapping: {},
		typeMapping: {},
		exclude: [],
		include: []
	};
	try {
		Object.assign(options, require(ownConfigPath));
	} catch (err) {
		if (verbose) {
			console.log(`Can't read config file: ${err}`);
		}
	}

	const configPath = path.resolve(rootPath, "tsconfig.types.json");
	const configContent = ts.sys.readFile(configPath);
	if (!configContent) {
		console.error("Empty config file");
		return;
	}
	const configJsonFile = ts.parseJsonText(configPath, configContent);
	const parsedConfig = ts.parseJsonSourceFileConfigFileContent(
		configJsonFile,
		ts.sys,
		rootPath,
		{
			noEmit: true
		}
	);

	if (parsedConfig.errors && parsedConfig.errors.length > 0) {
		for (const error of parsedConfig.errors) {
			printError(error);
		}
		return;
	}

	const program = ts.createProgram(
		parsedConfig.fileNames,
		parsedConfig.options
	);

	const checker = program.getTypeChecker();

	const exposedFiles = ["lib/index.js"];

	try {
		if (
			(
				await fs.stat(path.resolve(rootPath, "declarations/index.d.ts"))
			).isFile()
		) {
			exposedFiles.push("declarations/index.d.ts");
		}
	} catch {
		// the file is optional
	}

	/** @type {Set<ts.Type>} */
	const collectedTypes = new Set();
	/** @type {Map<ts.Type, { source: ts.SourceFile, symbol?: ts.Symbol, name?: string }>} */
	const typeNameHints = new Map();
	/** @type {Map<ts.Type, Set<ts.Type>>} */
	const typeReferencedBy = new Map();

	/**
	 * @param {ts.Type | undefined} from source type
	 * @param {ts.Type} type type
	 * @param {ts.SourceFile=} source source file
	 * @param {ts.Symbol=} symbol declaration symbol
	 * @param {string=} name name hint
	 * @returns {void}
	 */
	const captureType = (from, type, source, symbol, name) => {
		if (from) {
			const set = typeReferencedBy.get(type);
			if (set === undefined) {
				typeReferencedBy.set(type, new Set([from]));
			} else {
				set.add(from);
			}
		}
		if (typeNameHints.has(type)) return;
		collectedTypes.add(type);
		const hint = typeNameHints.get(type);
		if (!hint) return;
		typeNameHints.set(type, {
			source: source || hint.source,
			symbol: symbol || hint.symbol,
			name: name || hint.name
		});
	};

	/**
	 * @param {ts.SourceFile} source source file
	 * @returns {ts.Type} the type
	 */
	const getTypeOfSourceFile = (source) => {
		const sourceAsAny = /** @type {any} */ (source);
		if (
			sourceAsAny.externalModuleIndicator ||
			sourceAsAny.commonJsModuleIndicator
		) {
			const moduleSymbol = /** @type {ts.Symbol} */ (sourceAsAny.symbol);
			return checker.getTypeOfSymbolAtLocation(moduleSymbol, source);
		}
		throw new Error("Not a module");
	};

	/**
	 * @param {ts.SourceFile} source source file
	 * @returns {Map<string, ts.Type>} type exports
	 */
	const getTypeExportsOfSourceFile = (source) => {
		/** @type {Map<string, ts.Type>} */
		const map = new Map();
		if (isSourceFileModule(source)) {
			const sourceAsAny = /** @type {any} */ (source);
			const moduleSymbol = /** @type {ts.Symbol} */ (sourceAsAny.symbol);
			if (!moduleSymbol.exports) throw new Error("Not a module namespace");
			for (const [name, symbol] of moduleSymbol.exports.entries()) {
				if (name === ts.InternalSymbolName.ExportEquals) continue;
				const exportName = ts.unescapeLeadingUnderscores(name);
				if (exportName.startsWith("_")) continue;
				const type = checker.getDeclaredTypeOfSymbol(symbol);
				if (type.getFlags() & ts.TypeFlags.Any) continue;
				type.aliasSymbol = symbol;
				map.set(exportName, type);
			}
			return map;
		}
		throw new Error("Not a module");
	};

	/**
	 * @param {ts.SourceFile} source source file
	 * @returns {boolean} true when it's a module
	 */
	/**
	 * @param {ts.SourceFile | undefined} source the file to test
	 * @returns {boolean} true when the file is a module
	 */
	const isSourceFileModule = (source) => {
		const sourceAsAny = /** @type {any} */ (source);
		return Boolean(
			sourceAsAny &&
			(sourceAsAny.externalModuleIndicator ||
				sourceAsAny.commonJsModuleIndicator)
		);
	};

	/**
	 * @param {ts.Symbol} current current
	 * @returns {string} full escaped name
	 */
	/**
	 * @param {SymbolWithParent} symbol the symbol to name
	 * @returns {string} the symbol's name, prefixed by every enclosing one
	 */
	const getFullEscapedName = (symbol) => {
		let current = symbol;
		let name = current.escapedName.toString();
		while (current.parent) {
			current = current.parent;
			if (
				current.escapedName === undefined ||
				current.escapedName.toString() === "__global"
			) {
				break;
			}
			name = `${current.escapedName.toString()}.${name}`;
		}
		return name;
	};

	/**
	 * @param {ts.Symbol} symbol symbol
	 * @returns {string} location of the symbol for error messages
	 */
	const getSymbolLocation = (symbol) => {
		const decls = symbol.getDeclarations();
		const decl = decls && decls[0];
		if (!decl) return "<unknown location>";
		const source = decl.getSourceFile();
		const { line, character } = ts.getLineAndCharacterOfPosition(
			source,
			decl.getStart()
		);
		return `${source.fileName} (${line + 1},${character + 1})`;
	};

	/**
	 * @param {ts.Symbol} symbol the symbol to resolve
	 * @param {boolean} isValue whether the value side is wanted
	 * @param {boolean=} reportUnresolvable whether to report a failure
	 * @returns {ts.Type | undefined} the resolved type
	 */
	const getTypeOfSymbol = (symbol, isValue, reportUnresolvable = true) => {
		let decl;
		/** @type {ts.Type | undefined} */
		let errorType;
		const type = (() => {
			let type;
			if (!isValue) {
				type = checker.getDeclaredTypeOfSymbol(symbol);
				if (
					type &&
					/** @type {TypeWithIntrinsicName} */ (type).intrinsicName !== "error"
				) {
					return type;
				}
				errorType = errorType || type;
			}
			const symbolType = /** @type {ts.Symbol & { type?: ts.Type }} */ (symbol)
				.type;

			if (symbolType) return symbolType;
			const decls = symbol.getDeclarations();
			decl = decls && decls[0];
			if (decl) {
				type = checker.getTypeOfSymbolAtLocation(symbol, decl);
				if (
					type &&
					/** @type {TypeWithIntrinsicName} */ (type).intrinsicName !== "error"
				) {
					return type;
				}
				errorType = errorType || type;
				type = checker.getTypeAtLocation(decl);
				if (
					type &&
					/** @type {TypeWithIntrinsicName} */ (type).intrinsicName !== "error"
				) {
					return type;
				}
				errorType = errorType || type;
			}
		})();
		if (!type) {
			if (reportUnresolvable) {
				// Reporting every unresolvable symbol beats failing on the first, so
				// continue with the error type and bail out before writing.
				hasUnresolvableTypes = true;
				console.error(
					`${getSymbolLocation(symbol)}: Unable to resolve the type of "${
						symbol.name
					}".`
				);
			}
			return errorType || checker.getDeclaredTypeOfSymbol(symbol);
		}
		if (type && decl) {
			// Learn about type nodes
			if (
				((ts.isTypeAliasDeclaration(decl) && !decl.typeParameters) ||
					(ts.isParameter(decl) && !decl.questionToken)) &&
				decl.type
			) {
				/** @type {any} */ (type)._typeNode = decl.type;
			}
			if (ts.isParameter(decl)) {
				for (const tag of ts.getJSDocTags(decl)) {
					if (
						ts.isJSDocParameterTag(tag) &&
						tag.typeExpression &&
						ts.isJSDocTypeExpression(tag.typeExpression)
					) {
						/** @type {any} */ (type)._typeNode = tag.typeExpression.type;
					}
				}
			}
		}
		return type;
	};

	/**
	 * @param {ts.Symbol | undefined} symbol the symbol to look up
	 * @returns {ts.Declaration | undefined} the declaration it was declared by
	 */
	const getDeclaration = (symbol) => {
		if (!symbol) return undefined;
		/** @type {ts.Declaration | undefined} */
		let decl;
		if (symbol.valueDeclaration) {
			decl = symbol.valueDeclaration;
		} else {
			const decls = symbol.getDeclarations();
			if (decls) decl = decls[0];
		}
		if (decl) {
			const symbol = /** @type {any} */ (decl).symbol;
			if (symbol && symbol.name === ts.InternalSymbolName.Type && decl.parent) {
				const parent = decl.parent;
				if (parent.kind === ts.SyntaxKind.TypeAliasDeclaration) {
					decl = /** @type {ts.Declaration} */ (parent);
				}
				if (
					parent.kind === ts.SyntaxKind.JSDocTypeExpression &&
					parent.parent &&
					parent.parent.kind === ts.SyntaxKind.JSDocTypedefTag
				) {
					decl = /** @type {ts.Declaration} */ (parent.parent);
				}
			}
		}

		return decl;
	};

	/**
	 * @param {ts.SourceFile} source source file
	 * @returns {Map<ts.Symbol, string>} exposed symbols with their names
	 */
	const getExportsOfSourceFile = (source) => {
		// TODO caching
		/** @type Map<ts.Symbol, string> */
		const map = new Map();
		const sourceAsAny = /** @type {any} */ (source);
		if (isSourceFileModule(source)) {
			const moduleSymbol = /** @type {ts.Symbol} */ (sourceAsAny.symbol);
			if (moduleSymbol && moduleSymbol.exports) {
				for (const [name, symbol] of moduleSymbol.exports.entries()) {
					map.set(symbol, ts.unescapeLeadingUnderscores(name));
				}
			}
		} else {
			for (const [name, symbol] of sourceAsAny.locals) {
				map.set(symbol, name);
			}
		}
		// Expand namespaces
		for (const [symbol, namespaceName] of map) {
			const flags = symbol.getFlags();
			if (
				(flags & ts.SymbolFlags.NamespaceModule ||
					flags & ts.SymbolFlags.ValueModule) &&
				symbol.exports
			) {
				for (const [name, exportedSymbol] of symbol.exports) {
					map.set(
						exportedSymbol,
						`${namespaceName}.${ts.unescapeLeadingUnderscores(name)}`
					);
				}
			}
		}
		// Expand references
		for (const [symbol, name] of map) {
			const decl = /** @type {DeclarationWithExpression | undefined} */ (
				getDeclaration(symbol)
			);
			if (decl && decl.expression) {
				const type = checker.getTypeAtLocation(decl.expression);
				if (type && type.symbol && !map.has(type.symbol)) {
					map.set(type.symbol, name);
				}
			}
		}
		return map;
	};

	/** @type {ts.Type | undefined} */
	let exposedType;
	const typeExports = new Map();

	for (const exposedFile of exposedFiles) {
		const exposedSource = program.getSourceFile(
			path.resolve(rootPath, exposedFile)
		);
		if (!exposedSource) {
			console.error(
				`No source found for ${exposedFile}. These files are available:`
			);
			for (const source of program.getSourceFiles()) {
				console.error(` - ${source.fileName}`);
			}
			continue;
		}

		const type = getTypeOfSourceFile(exposedSource);
		if (type && !exposedType) {
			captureType(undefined, type, exposedSource);
			exposedType = type;
		}

		for (const [name, type] of getTypeExportsOfSourceFile(exposedSource)) {
			captureType(undefined, type, exposedSource);
			typeExports.set(name, type);
		}
	}

	/** @typedef {{ name: string, optional: boolean, spread: boolean, documentation: string, type: ts.Type }} ParsedParameter */
	/** @typedef {{ documentation: string, typeParameters?: readonly ts.Type[], args: ParsedParameter[], thisType?: ts.Type, returnType: ts.Type }} ParsedSignature */
	/** @typedef {string[]} SymbolName */
	/** @typedef {Map<string, { type: ts.Type, method: boolean, optional: boolean, readonly: boolean, getter: boolean, documentation: string }>} PropertiesMap */

	/** @typedef {{ type: "primitive", name: string }} ParsedPrimitiveType */
	/** @typedef {{ type: "typeParameter", name: string, constraint?: ts.Type, defaultValue?: ts.Type }} ParsedTypeParameterType */
	/** @typedef {{ type: "tuple", typeArguments: readonly ts.Type[] }} ParsedTupleType */
	/** @typedef {{ type: "interface", symbolName: SymbolName, subtype: "class" | "module" | "literal" | undefined, properties: PropertiesMap, constructors: ParsedSignature[], calls: ParsedSignature[], numberIndex?: ts.Type, stringIndex?: ts.Type, typeParameters?: readonly ts.Type[], baseTypes: readonly ts.Type[], documentation: string }} ParsedInterfaceType */
	/** @typedef {{ type: "class" | "typeof class", symbolName: SymbolName, properties: PropertiesMap, staticProperties: PropertiesMap, constructors: ParsedSignature[], numberIndex?: ts.Type, stringIndex?: ts.Type, typeParameters?: readonly ts.Type[], baseType: ts.Type, correspondingType: ts.Type | undefined, documentation: string }} MergedClassType */
	/** @typedef {{ type: "namespace", symbolName: SymbolName, calls: ParsedSignature[], exports: PropertiesMap }} MergedNamespaceType */
	/** @typedef {{ type: "reference", target: ts.Type, typeArguments: readonly ts.Type[], typeArgumentsWithoutDefaults: readonly ts.Type[] }} ParsedReferenceType */
	/** @typedef {{ type: "union", symbolName: SymbolName, types: ts.Type[], typeParameters?: readonly ts.Type[] }} ParsedUnionType */
	/** @typedef {{ type: "intersection", symbolName: SymbolName, types: ts.Type[], typeParameters?: readonly ts.Type[] }} ParsedIntersectionType */
	/** @typedef {{ type: "index", symbolName: SymbolName, objectType: ts.Type, indexType: ts.Type }} ParsedIndexType */
	/** @typedef {{ type: "template", texts: readonly string[], types: readonly ts.Type[] }} ParsedTemplateType */
	/** @typedef {{ type: "import", symbolName: SymbolName, exportName: string, from: string, isValue: boolean }} ParsedImportType */
	/** @typedef {{ type: "symbol", symbolName: SymbolName }} ParsedSymbolType */
	/** @typedef {{ type: "conditional", symbolName: SymbolName, checkType: ts.Type, extendsType: ts.Type, trueType: ts.Type, falseType: ts.Type, typeParameters?: readonly ts.Type[] }} ParsedConditionalType */
	/** @typedef {ParsedPrimitiveType | ParsedTypeParameterType | ParsedTupleType | ParsedInterfaceType | ParsedReferenceType | ParsedUnionType | ParsedIntersectionType | ParsedIndexType | ParsedTemplateType | ParsedImportType | ParsedSymbolType | ParsedConditionalType} ParsedType */
	/** @typedef {ParsedType | MergedClassType | MergedNamespaceType} MergedType */

	/**
	 * @param {string} name the name to test
	 * @returns {boolean} true when the name is excluded by the options
	 */
	const isExcluded = (name) =>
		options.exclude.some((/** @type {RegExp} */ e) => e.test(name));
	/**
	 * @param {string} name the name to test
	 * @returns {boolean} true when the name is included by the options
	 */
	const isIncluded = (name) =>
		options.include.some((/** @type {RegExp} */ e) => e.test(name));

	/**
	 * @param {ts.Type} type the type
	 * @param {string[]=} suffix additional suffix
	 * @returns {string[]} name of the symbol
	 */
	const parseName = (type, suffix = []) => {
		if (type === exposedType) return ["exports"];
		const symbol = /** @type {ts.Symbol} */ (
			/** @type {EXPECTED_ANY} */ (type).symbol
		);
		const aliasSymbol = type.aliasSymbol;
		/**
		 * @param {ts.Symbol | undefined} symbol the symbol to name
		 * @returns {string | undefined} its identifier, when it has one
		 */
		const getName = (symbol) => {
			if (!symbol) return undefined;
			if (symbol.getFlags() & ts.SymbolFlags.ValueModule) return sourceFile;
			const name = symbol.name;
			return name &&
				name !== ts.InternalSymbolName.Type &&
				name !== ts.InternalSymbolName.Object
				? toIdentifier(name)
				: undefined;
		};
		const valueDeclaration =
			getDeclaration(symbol) || getDeclaration(aliasSymbol) || undefined;
		const sourceFile =
			valueDeclaration &&
			toIdentifier(
				valueDeclaration
					.getSourceFile()
					.fileName.slice(rootPath.length + 1)
					.replace(/^.*\/(?!index)/, "")
					.replace(/^lib\./, "")
					.replace(/\.(js|(d\.)?ts)$/, "")
			);
		const syntaxType =
			valueDeclaration &&
			(SYNTAX_KIND_TO_NAME[valueDeclaration.kind] ||
				`Kind${valueDeclaration.kind}_`);
		const name1 = getName(symbol);
		const name2 = getName(aliasSymbol);
		const result = [name1, name2, ...suffix, sourceFile, syntaxType];
		if (!name1 && !name2) {
			result.unshift(AnonymousType);
		}
		return [...new Set(result.filter((x) => x !== undefined))];
	};

	/**
	 * @param {ts.Symbol | ts.Signature | undefined} symbol symbol
	 * @returns {string} documentation comment
	 */
	const getDocumentation = (symbol) => {
		if (!symbol) return "";
		/**
		 * @param {ts.SymbolDisplayPart[] | undefined} parts the doc parts
		 * @returns {string} the parts as one normalized string
		 */
		const normalizeText = (parts) =>
			ts
				.displayPartsToString(parts || [])
				.replace(/\r\n?/g, "\n")
				.replace(/\n+/g, "\n")
				.trim();

		const commentText = normalizeText(symbol.getDocumentationComment(checker));
		const jsDocTags = symbol.getJsDocTags(checker);
		const forwardedTagNames = ["since", "deprecated", "experimental"];
		const forwardedTags = forwardedTagNames.flatMap((name) =>
			jsDocTags.filter((tag) => tag.name === name)
		);

		if (!commentText && forwardedTags.length === 0) {
			return "";
		}

		const lines = commentText ? commentText.split("\n") : [];

		for (const tag of forwardedTags) {
			const text = normalizeText(tag.text);
			if (
				text &&
				!commentText &&
				(tag.name === "deprecated" || tag.name === "experimental")
			) {
				lines.push(...text.split("\n"));
				lines.push(`@${tag.name}`);
			} else {
				lines.push(text ? `@${tag.name} ${text}` : `@${tag.name}`);
			}
		}

		return `\n/**\n${lines
			.map((line) => (line ? ` * ${line}` : " *"))
			.join("\n")}\n */\n`;
	};

	/**
	 * @param {ts.Signature} signature signature
	 * @returns {ParsedSignature} parsed signature
	 */
	const parseSignature = (signature) => {
		let canBeOptional = true;
		let rest = /** @type {EXPECTED_ANY} */ (ts).signatureHasRestParameter(
			signature
		);
		/**
		 * @param {ts.Symbol} p parameter
		 * @returns {ParsedParameter} parsed
		 */
		const parseParameter = (p) => {
			const decl = getDeclaration(p);
			const paramDeclaration = decl && ts.isParameter(decl) ? decl : undefined;
			let jsdocParamDeclaration =
				decl && ts.isJSDocParameterTag(decl) ? decl : undefined;
			if (!jsdocParamDeclaration && decl) {
				const jsdoc = ts.getJSDocTags(decl);
				if (
					jsdoc.length > 0 &&
					jsdoc[0].kind === ts.SyntaxKind.JSDocParameterTag
				) {
					jsdocParamDeclaration = /** @type {ts.JSDocParameterTag} */ (
						jsdoc[0]
					);
				}
			}
			const type = /** @type {ts.Type} */ (getTypeOfSymbol(p, false));
			const optional = Boolean(
				canBeOptional &&
				((type.getFlags() & ts.TypeFlags.Any) !== 0 ||
					(p.getFlags() & ts.SymbolFlags.Optional) !== 0 ||
					(paramDeclaration &&
						(Boolean(paramDeclaration.initializer) ||
							Boolean(paramDeclaration.questionToken))) ||
					(jsdocParamDeclaration &&
						jsdocParamDeclaration.typeExpression &&
						jsdocParamDeclaration.typeExpression.type.kind ===
							ts.SyntaxKind.JSDocOptionalType))
			);
			canBeOptional = canBeOptional && optional;
			const spread = rest;
			rest = false;
			const documentation = getDocumentation(p);
			return {
				name: p.name,
				optional,
				spread,
				documentation,
				type
			};
		};
		const params = [...signature.getParameters()];
		if (
			rest &&
			params.length > 0 &&
			params[params.length - 1].name === "args"
		) {
			const p = params[params.length - 1];
			const type = /** @type {TypeWithIntrinsicName} */ (
				getTypeOfSymbol(p, false)
			);
			if (type.intrinsicName === "error") {
				// This fixes a problem that typescript adds `...args: any[]` to a signature when `arguments` as text is used in body
				params.pop();
				rest = false;
			}
		}
		return {
			documentation: getDocumentation(signature),
			typeParameters:
				signature.typeParameters && signature.typeParameters.length > 0
					? signature.typeParameters
					: undefined,
			args: params.reverse().map(parseParameter).reverse(),
			returnType: signature.getReturnType(),
			thisType: signature.thisParameter
				? getTypeOfSymbol(signature.thisParameter, false)
				: undefined
		};
	};

	/**
	 * @param {ts.SourceFile} sourceFile the file to test
	 * @returns {boolean} true when it comes from node_modules
	 */
	const isNodeModulesSource = (sourceFile) =>
		sourceFile.isDeclarationFile &&
		sourceFile.fileName.slice(rootPath.length + 1).startsWith("node_modules/");
	/**
	 * @param {ts.SourceFile} sourceFile the file to look up
	 * @returns {ts.SourceFile | undefined} the package's own type declarations
	 */
	const getRootPackage = (sourceFile) => {
		const match = /^(node_modules\/(@[^/]+\/)?[^/]+)/.exec(
			sourceFile.fileName.slice(rootPath.length + 1)
		);
		if (!match) return undefined;

		const pkg = require(`${rootPath}/${match[1]}/package.json`);

		const types = pkg.types || "index.d.ts";
		return program.getSourceFile(`${rootPath}/${match[1]}/${types}`);
	};

	const { typeMapping } = options;

	/**
	 * @param {string} name the type name to test
	 * @returns {boolean} true when it is one of the typed array types
	 */
	const isArrayBufferLike = (name) =>
		[
			"Uint8Array",
			"Uint8ClampedArray",
			"Uint16Array",
			"Uint32Array",
			"Int8Array",
			"Int16Array",
			"Int32Array",
			"BigUint64Array",
			"BigInt64Array",
			"Float16Array",
			"Float32Array",
			"Float64Array",
			"DataView",
			"Buffer"
		].includes(name);

	/**
	 * @param {ts.Type} type type
	 * @returns {ParsedType | undefined} parsed type
	 */
	const parseType = (type) => {
		/**
		 * @param {ts.Symbol[]} symbols list of symbols
		 * @param {ts.Type[]=} baseTypes base types from which properties should be omitted
		 * @param {SymbolName} symbolName name
		 * @returns {PropertiesMap} map of types
		 */
		const toPropMap = (symbols, baseTypes = [], symbolName = []) => {
			/** @type {PropertiesMap} */
			const properties = new Map();
			for (const prop of symbols) {
				let name = prop.name;
				if (name === "prototype") continue;
				const nameForFilter = `${name} in ${symbolName.join(" ")}`;
				if (isExcluded(nameForFilter)) continue;
				if (
					!isIncluded(nameForFilter) &&
					name.startsWith("_") &&
					!name.startsWith("__")
				) {
					continue;
				}
				if (
					name.startsWith("__@") &&
					(prop.flags & ts.SymbolFlags.Method) === 0
				) {
					continue;
				}
				if (baseTypes.some((t) => t.getProperty(name))) continue;
				let modifierFlags = ts.ModifierFlags.None;
				const innerType = getTypeOfSymbol(prop, true);
				const decl = getDeclaration(prop);
				if (decl) {
					modifierFlags = ts.getCombinedModifierFlags(decl);
				}
				if (!innerType) continue;
				if (modifierFlags & ts.ModifierFlags.Private) {
					continue;
				}
				const flags = prop.getFlags();
				if (name.startsWith("__@")) {
					name = `[Symbol.${name.slice(3, name.lastIndexOf("@"))}]`;
				} else if (!/^[_a-zA-Z$][_a-zA-Z$0-9]*$/.test(name)) {
					name = JSON.stringify(name);
				}

				let needContinue = false;

				for (const [regExp, newName] of Object.entries(typeMapping)) {
					if (new RegExp(regExp).test(nameForFilter)) {
						const newType = checker.getESSymbolType();
						/** @type {TypeWithIntrinsicName} */
						(newType).intrinsicName = newName;
						properties.set(name, {
							type: newType,
							method: (flags & ts.SymbolFlags.Method) !== 0,
							optional: (flags & ts.SymbolFlags.Optional) !== 0,
							readonly: (modifierFlags & ts.ModifierFlags.Readonly) !== 0,
							getter:
								(flags & ts.SymbolFlags.GetAccessor) !== 0 &&
								(flags & ts.SymbolFlags.SetAccessor) === 0,
							documentation: getDocumentation(prop)
						});
						needContinue = true;
						break;
					}
				}

				if (needContinue) {
					continue;
				}

				properties.set(name, {
					type: innerType,
					method: (flags & ts.SymbolFlags.Method) !== 0,
					optional: (flags & ts.SymbolFlags.Optional) !== 0,
					readonly: (modifierFlags & ts.ModifierFlags.Readonly) !== 0,
					getter:
						(flags & ts.SymbolFlags.GetAccessor) !== 0 &&
						(flags & ts.SymbolFlags.SetAccessor) === 0,
					documentation: getDocumentation(prop)
				});
			}
			return properties;
		};

		/**
		 * @param {readonly ts.Type[]} args the type arguments
		 * @param {readonly ts.Type[] | undefined} parameters the type parameters
		 * @returns {readonly ts.Type[]} the arguments with trailing defaults dropped
		 */
		const omitDefaults = (args, parameters) => {
			if (!parameters) return args;
			const argsWithoutDefaults = [...args];
			for (let i = args.length - 1; i >= 0; i--) {
				const parameter = parameters[i];
				if (!parameter) {
					argsWithoutDefaults.length--;
					continue;
				}
				const defaultValue = parameter.getDefault();
				if (
					args[i] === defaultValue ||
					(defaultValue !== undefined && args[i] === parameter)
				) {
					argsWithoutDefaults.length--;
				} else {
					break;
				}
			}
			return argsWithoutDefaults;
		};

		const symbol = type.aliasSymbol || type.getSymbol();

		if (/** @type {any} */ (type).isTypeParameter()) {
			return {
				type: "typeParameter",
				name: type.symbol.name,
				constraint: type.getConstraint(),
				defaultValue: type.getDefault()
			};
		}

		/** @type {ts.TypeNode} */
		const typeNode = /** @type {any} */ (type)._typeNode;
		if (type.aliasSymbol) {
			const fullEscapedName = getFullEscapedName(type.aliasSymbol);
			if (fullEscapedName.includes("NodeJS.")) {
				return {
					type: "primitive",
					name: fullEscapedName
				};
			}
			const aliasType = checker.getDeclaredTypeOfSymbol(type.aliasSymbol);
			if (aliasType && aliasType !== type) {
				const typeArguments = type.aliasTypeArguments || [];
				return {
					type: "reference",
					target: aliasType,
					typeArguments,
					typeArgumentsWithoutDefaults: omitDefaults(
						typeArguments,
						(aliasType.isClassOrInterface() && aliasType.typeParameters) ||
							undefined
					)
				};
			}
		}

		if (typeNode && !isNodeModulesSource(typeNode.getSourceFile())) {
			switch (typeNode.kind) {
				case ts.SyntaxKind.IndexedAccessType: {
					const { objectType, indexType } =
						/** @type {ts.IndexedAccessTypeNode} */ (typeNode);
					const objectTypeType = checker.getTypeAtLocation(objectType);
					/** @type {any} */ (objectTypeType)._typeNode = objectType;
					const indexTypeType = checker.getTypeAtLocation(indexType);
					/** @type {any} */ (indexTypeType)._typeNode = indexType;
					if (objectTypeType && indexTypeType) {
						return {
							type: "index",
							symbolName: parseName(type),
							objectType: objectTypeType,
							indexType: indexTypeType
						};
					}
					break;
				}
				case ts.SyntaxKind.TypeReference: {
					const { typeArguments, typeName } =
						/** @type {ts.TypeReferenceNode} */ (typeNode);
					const typeArgumentsTypes = typeArguments
						? typeArguments.map((node) => {
								const type = checker.getTypeAtLocation(node);
								if (type) {
									/** @type {any} */ (type)._typeNode = node;
								}
								return type;
							})
						: [];
					const targetSymbol = /** @type {ts.Symbol} */ (
						checker.getSymbolAtLocation(typeName)
					);
					const targetType = getTypeOfSymbol(targetSymbol, false);
					if (
						typeArgumentsTypes.every(Boolean) &&
						targetType &&
						targetType !== type
					) {
						return {
							type: "reference",
							target: targetType,
							typeArguments: typeArgumentsTypes,
							typeArgumentsWithoutDefaults: omitDefaults(
								typeArgumentsTypes,
								(targetType.isClassOrInterface() &&
									targetType.typeParameters) ||
									undefined
							)
						};
					}
					break;
				}
			}
		}

		if (type.isUnion()) {
			let types = type.types;

			const origin =
				/** @type {ts.UnionType & { origin?: ts.UnionType }} */
				(type).origin;
			const nodeJSOriginTypes =
				origin &&
				origin.types &&
				origin.types.filter((item) => {
					if (!item.aliasSymbol) {
						return false;
					}

					const fullEscapedName = getFullEscapedName(item.aliasSymbol);

					return fullEscapedName.includes("NodeJS.");
				});

			if (nodeJSOriginTypes && nodeJSOriginTypes.length > 0) {
				types = types.filter((item) => {
					if (!item.symbol) {
						return true;
					}

					return !isArrayBufferLike(getFullEscapedName(item.symbol));
				});

				types.push(...nodeJSOriginTypes);
			}

			return {
				type: "union",
				symbolName: parseName(type),
				types,
				typeParameters:
					type.aliasTypeArguments && type.aliasTypeArguments.length > 0
						? type.aliasTypeArguments
						: undefined
			};
		}

		if (type.isIntersection()) {
			return {
				type: "intersection",
				symbolName: parseName(type),
				types: type.types,
				typeParameters:
					type.aliasTypeArguments && type.aliasTypeArguments.length > 0
						? type.aliasTypeArguments
						: undefined
			};
		}

		const { intrinsicName } = /** @type {TypeWithIntrinsicName} */ (type);

		if (intrinsicName) {
			return {
				type: "primitive",
				name: intrinsicName === "error" ? "any" : intrinsicName
			};
		}

		const flags = type.getFlags();

		if (flags & ts.TypeFlags.Literal) {
			return { type: "primitive", name: checker.typeToString(type) };
		}
		if (flags & ts.TypeFlags.TemplateLiteral) {
			if (!templateLiterals) return { type: "primitive", name: "string" };
			const templateType = /** @type {ts.TemplateLiteralType} */ (type);
			return {
				type: "template",
				texts: templateType.texts,
				types: templateType.types
			};
		}
		if (flags & ts.TypeFlags.Any) return { type: "primitive", name: "any" };
		if (flags & ts.TypeFlags.Unknown) {
			return { type: "primitive", name: "unknown" };
		}
		if (flags & ts.TypeFlags.String) {
			return { type: "primitive", name: "string" };
		}
		if (flags & ts.TypeFlags.Number) {
			return { type: "primitive", name: "number" };
		}
		if (flags & ts.TypeFlags.Boolean) {
			return { type: "primitive", name: "boolean" };
		}
		if (flags & ts.TypeFlags.BigInt) {
			return { type: "primitive", name: "bigint" };
		}
		if (flags & ts.TypeFlags.Void) return { type: "primitive", name: "void" };
		if (flags & ts.TypeFlags.Undefined) {
			return { type: "primitive", name: "undefined" };
		}
		if (flags & ts.TypeFlags.Null) return { type: "primitive", name: "null" };
		if (flags & ts.TypeFlags.Never) return { type: "primitive", name: "never" };
		if (flags & ts.TypeFlags.Void) return { type: "primitive", name: "void" };

		const objectFlags =
			flags & ts.TypeFlags.Object
				? /** @type {ts.ObjectType} */ (type).objectFlags
				: 0;
		if (objectFlags & ts.ObjectFlags.JSLiteral) {
			const props = type.getProperties();
			if (props.length === 0) {
				return {
					type: "primitive",
					name: "object"
				};
			}
			return {
				type: "interface",
				symbolName: [AnonymousType, "Literal"],
				subtype: "literal",
				properties: toPropMap(props, undefined, ["Literal"]),
				constructors: [],
				calls: [],
				baseTypes: [],
				documentation: getDocumentation(type.getSymbol())
			};
		}

		if (objectFlags & ts.ObjectFlags.Reference) {
			const typeRef = /** @type {ts.TypeReference} */ (type);
			const typeArguments = checker.getTypeArguments(typeRef);
			if (objectFlags & ts.ObjectFlags.Tuple) {
				const tupleType = /** @type {ts.TupleType} */ (type);
				return {
					type: "primitive",
					name: tupleType.hasRestElement ? "[...]" : "[]"
				};
			}
			if (typeRef !== typeRef.target) {
				return {
					type: "reference",
					target: typeRef.target,
					typeArguments,
					typeArgumentsWithoutDefaults: omitDefaults(
						typeArguments,
						typeRef.target.typeParameters
					)
				};
			}
		}

		if (symbol) {
			// Handle `NodeJS` prefix for global types
			if (symbol.escapedName !== undefined) {
				const fullEscapedName = getFullEscapedName(symbol);

				if (fullEscapedName.includes("NodeJS.")) {
					return {
						type: "primitive",
						name: fullEscapedName
					};
				}
			}

			const decl = getDeclaration(symbol);
			if (decl && isNodeModulesSource(decl.getSourceFile())) {
				let symbol = /** @type {any} */ (decl).symbol;
				const isValue = Boolean(
					symbol &&
					symbol.valueDeclaration &&
					(symbol.flags & ts.SymbolFlags.Function ||
						symbol.flags & ts.SymbolFlags.Class)
				);
				const potentialSources = /** @type {ts.SourceFile[]} */ (
					[getRootPackage(decl.getSourceFile()), decl.getSourceFile()].filter(
						Boolean
					)
				);
				/** @type {ts.SourceFile | undefined} */
				let externalSource;
				let exportName;
				// Several exports can alias one type, so prefer the one named like the
				// symbol instead of whichever is declared first.
				const preferredName = symbol
					? ts.unescapeLeadingUnderscores(symbol.escapedName)
					: undefined;
				outer: for (const source of potentialSources) {
					externalSource = source;
					const symbolToExport = getExportsOfSourceFile(externalSource);
					exportName = symbolToExport.get(symbol);
					if (exportName) break;
					let aliasSymbol;
					let aliasName;
					for (const [key, name] of symbolToExport) {
						if (getTypeOfSymbol(key, false, false) !== type) continue;
						if (name.slice(name.lastIndexOf(".") + 1) === preferredName) {
							symbol = key;
							exportName = name;
							break outer;
						}
						if (aliasName === undefined) {
							aliasSymbol = key;
							aliasName = name;
						}
					}
					if (aliasName !== undefined) {
						symbol = aliasSymbol;
						exportName = aliasName;
						break;
					}
				}
				if (exportName === undefined) {
					if (verbose) {
						console.log(
							`${parseName(type).join(
								" "
							)} is an imported symbol, but couldn't find export in ${potentialSources.map(
								(source) => {
									const symbolToExport = getExportsOfSourceFile(source);
									return `${source.fileName} (exports: ${[
										...symbolToExport.values()
									]
										.sort()
										.join(", ")})`;
								}
							)}`
						);
					}
				} else if (isSourceFileModule(externalSource)) {
					const match =
						/^(.+\/node_modules\/(?:@types\/)?)((?:@[^/]+\/)?[^/]+)(.*?)(\.d\.ts)?$/.exec(
							/** @type {ts.SourceFile} */ (externalSource).fileName
						);
					if (!match) {
						console.error(
							`${/** @type {ts.SourceFile} */ (externalSource).fileName} doesn't match node_modules import schema`
						);
					} else {
						let from = match[2] + match[3];
						try {
							const pkg = require(`${match[1] + match[2]}/package.json`);

							const regExp = new RegExp(
								`^(\\.\\/)?${quoteMeta(match[3].slice(1))}(\\.d\\.ts)?$`
							);
							const types = pkg.types || "index.d.ts";
							if (regExp.test(types)) {
								from = match[2];
							}
						} catch (_err) {
							// sorry, doesn't work
						}
						return {
							type: "import",
							symbolName: parseName(type, [toIdentifier(exportName), "Import"]),
							exportName,
							from,
							isValue
						};
					}
				} else {
					const match = /"(.+?)"\.?(.*)$/.exec(exportName);
					if (match) {
						return {
							type: "import",
							symbolName: parseName(type, [toIdentifier(match[2]), "Import"]),
							exportName: match[2],
							from: match[1],
							isValue
						};
					}
					return {
						type: "primitive",
						name: exportName
					};
				}
			}
		}

		const symbolName = parseName(type);

		if (flags & ts.TypeFlags.UniqueESSymbol) {
			return {
				type: "symbol",
				symbolName
			};
		}

		if (flags & ts.TypeFlags.Conditional) {
			const { checkType, extendsType, root } =
				/** @type {ts.ConditionalType} */ (type);

			return {
				type: "conditional",
				symbolName,
				checkType,
				extendsType,
				trueType: checker.getTypeAtLocation(root.node.trueType),
				falseType: checker.getTypeAtLocation(root.node.falseType),
				typeParameters:
					type.aliasTypeArguments && type.aliasTypeArguments.length > 0
						? type.aliasTypeArguments
						: undefined
				// skip: true,
			};
		}

		if (flags & ts.TypeFlags.IndexedAccess) {
			const { objectType, indexType } = /** @type {ts.IndexedAccessType} */ (
				type
			);

			return {
				type: "index",
				symbolName: parseName(type),
				objectType,
				indexType
			};
		}

		const declaration = getDeclaration(symbol);

		return {
			type: "interface",
			symbolName,
			subtype: type.isClass()
				? "class"
				: declaration && declaration.kind === ts.SyntaxKind.SourceFile
					? "module"
					: undefined,
			properties: toPropMap(
				type.getProperties(),
				type.getBaseTypes(),
				symbolName
			),
			constructors: type.getConstructSignatures().map(parseSignature),
			calls: type.getCallSignatures().map(parseSignature),
			numberIndex: type.getNumberIndexType(),
			stringIndex: type.getStringIndexType(),
			baseTypes: type.getBaseTypes() || [],
			typeParameters:
				type.isClassOrInterface() &&
				type.typeParameters &&
				type.typeParameters.length > 0
					? type.typeParameters
					: type.aliasSymbol &&
						  type.aliasTypeArguments &&
						  type.aliasTypeArguments.length > 0
						? type.aliasTypeArguments
						: undefined,
			documentation: getDocumentation(type.getSymbol())
		};
	};

	/** @type {Set<ts.Type>} */
	const typeUsedAsArgument = new Set();
	/** @type {Set<ts.Type>} */
	const typeUsedAsReturnValue = new Set();
	/** @type {Set<ts.Type>} */
	const typeUsedAsConstructedValue = new Set();
	/** @type {Set<ts.Type>} */
	const typeUsedAsBaseType = new Set();
	/** @type {Set<ts.Type>} */
	const typeUsedAsTypeArgument = new Set();
	/** @type {Set<ts.Type>} */
	const typeUsedInUnion = new Set();

	/** @type {Map<ts.Type, MergedType>} */
	const parsedCollectedTypes = new Map();

	for (const type of collectedTypes) {
		const parsed = parseType(type);
		if (!parsed) {
			console.error(checker.typeToString(type), "can't be parsed");
			continue;
		}
		parsedCollectedTypes.set(type, parsed);
		switch (parsed.type) {
			case "typeParameter":
				if (parsed.constraint) captureType(type, parsed.constraint);
				if (parsed.defaultValue) captureType(type, parsed.defaultValue);
				break;
			case "template":
				for (const inner of parsed.types) captureType(type, inner);
				break;
			case "union":
				for (const inner of parsed.types) {
					typeUsedInUnion.add(inner);
					captureType(type, inner);
				}
				if (parsed.typeParameters) {
					for (const prop of parsed.typeParameters) captureType(type, prop);
				}
				break;
			case "intersection":
				for (const inner of parsed.types) captureType(type, inner);
				if (parsed.typeParameters) {
					for (const prop of parsed.typeParameters) captureType(type, prop);
				}
				break;
			case "index":
				captureType(type, parsed.objectType);
				captureType(type, parsed.indexType);
				break;
			case "reference":
				captureType(type, parsed.target);
				for (const inner of parsed.typeArgumentsWithoutDefaults) {
					typeUsedAsTypeArgument.add(inner);
					captureType(type, inner);
				}
				break;
			case "conditional":
				captureType(type, parsed.checkType);
				captureType(type, parsed.extendsType);
				captureType(type, parsed.trueType);
				captureType(type, parsed.falseType);
				break;
			case "interface":
				for (const prop of parsed.baseTypes) {
					typeUsedAsBaseType.add(prop);
					captureType(type, prop);
				}
				for (const prop of parsed.properties.values()) {
					captureType(type, /** @type {ts.Type} */ (prop.type));
				}
				for (const call of parsed.calls) {
					for (const arg of call.args) {
						typeUsedAsArgument.add(arg.type);
						captureType(type, arg.type);
					}
					typeUsedAsReturnValue.add(call.returnType);
					captureType(type, call.returnType);
					if (call.thisType) {
						typeUsedAsArgument.add(call.thisType);
						captureType(type, call.thisType);
					}
				}
				for (const construct of parsed.constructors) {
					for (const arg of construct.args) {
						typeUsedAsArgument.add(arg.type);
						captureType(type, arg.type);
					}
					typeUsedAsConstructedValue.add(construct.returnType);
					captureType(type, construct.returnType);
				}
				if (parsed.numberIndex) captureType(type, parsed.numberIndex);
				if (parsed.stringIndex) captureType(type, parsed.stringIndex);
				if (parsed.typeParameters) {
					for (const prop of parsed.typeParameters) captureType(type, prop);
				}
				break;
		}
	}

	/**
	 * @param {MergedType} parsed the parsed type
	 * @returns {boolean} true when it is a bare call signature
	 */
	const isSimpleFunction = (parsed) =>
		parsed.type === "interface" &&
		parsed.properties.size === 0 &&
		parsed.constructors.length === 0 &&
		parsed.calls.length === 1 &&
		(!parsed.typeParameters || parsed.typeParameters.length === 0);

	// / Convert interfaces to classes ///
	/**
	 * @param {ts.Type} type the type
	 * @param {ParsedType | MergedType} parsed the parsed variant
	 * @returns {boolean} true, when it can be classified
	 */
	const canBeClassified = (
		type,
		parsed = /** @type {MergedType} */ (parsedCollectedTypes.get(type))
	) => {
		if (parsed === undefined) return false;
		if (parsed.type === "reference") return true;
		if (parsed.type === "class") return true;
		if (
			parsed.type !== "interface" ||
			parsed.calls.length !== 0 ||
			parsed.constructors.length !== 0 ||
			parsed.baseTypes.length > 1
		) {
			return false;
		}
		if (parsed.baseTypes.length === 0) return true;
		return parsed.baseTypes.length === 1 && canBeBaseClass(parsed.baseTypes[0]);
	};

	/**
	 * @param {ts.Type} type the type
	 * @returns {boolean} true, when it can be a base class
	 */
	const canBeBaseClass = (type) => {
		const baseType = type;
		const baseParsed = /** @type {MergedType} */ (
			parsedCollectedTypes.get(baseType)
		);
		return (
			baseParsed.type === "primitive" || canBeClassified(baseType, baseParsed)
		);
	};

	const toBeClassified = new Set();

	for (const [type, parsed] of parsedCollectedTypes) {
		if (
			parsed.type === "interface" &&
			parsed.constructors.length > 0 &&
			!parsed.typeParameters &&
			parsed.calls.length === 0 &&
			!parsed.numberIndex &&
			!parsed.stringIndex &&
			parsed.baseTypes.length === 0
		) {
			const instanceType = parsed.constructors[0].returnType;
			if (parsed.constructors.every((c) => c.returnType === instanceType)) {
				const instance = parsedCollectedTypes.get(instanceType);
				if (
					instance !== undefined &&
					instance.type === "interface" &&
					instance.calls.length === 0 &&
					instance.constructors.length === 0 &&
					((instance.baseTypes.length === 1 &&
						canBeBaseClass(instance.baseTypes[0])) ||
						instance.baseTypes.length === 0)
				) {
					/** @type {Omit<MergedClassType, "type" | "correspondingType">} */
					const merged = {
						symbolName: instance.symbolName,
						properties: instance.properties,
						staticProperties: parsed.properties,
						constructors: parsed.constructors,
						numberIndex: instance.numberIndex,
						stringIndex: instance.stringIndex,
						typeParameters: instance.typeParameters,
						baseType: instance.baseTypes[0],
						documentation: instance.documentation || parsed.documentation
					};
					parsedCollectedTypes.set(instanceType, {
						type: "class",
						correspondingType: type,
						...merged
					});
					parsedCollectedTypes.set(type, {
						type: "typeof class",
						correspondingType: instanceType,
						...merged
					});
					if (merged.baseType) toBeClassified.add(merged.baseType);
				}
			}
		} else if (parsed.type === "interface" && parsed.subtype === "class") {
			if (canBeClassified(type)) {
				toBeClassified.add(type);
			} else if (verbose) {
				console.log(
					`${checker.typeToString(
						type
					)} was a class in source code, but we are unable to generate a class for it.`
				);
			}
		}
	}

	for (const type of toBeClassified) {
		const parsed = parsedCollectedTypes.get(type);
		if (!parsed) continue;
		if (parsed.type !== "interface") continue;
		/** @type {MergedClassType} */
		const newParsed = {
			type: "class",
			correspondingType: undefined,
			symbolName: parsed.symbolName,
			properties: parsed.properties,
			staticProperties: new Map(),
			constructors: [],
			numberIndex: parsed.numberIndex,
			stringIndex: parsed.stringIndex,
			typeParameters: parsed.typeParameters,
			baseType: parsed.baseTypes[0],
			documentation: parsed.documentation
		};
		parsedCollectedTypes.set(type, newParsed);
	}

	// / Analyse unions and intersections ///

	for (const [type, parsed] of parsedCollectedTypes) {
		if (parsed.type === "union" || parsed.type === "intersection") {
			if (typeUsedAsTypeArgument.has(type)) {
				for (const t of parsed.types) {
					typeUsedAsTypeArgument.add(t);
				}
			}
			if (typeUsedAsReturnValue.has(type)) {
				for (const t of parsed.types) {
					typeUsedAsReturnValue.add(t);
				}
			}
			if (typeUsedAsConstructedValue.has(type)) {
				for (const t of parsed.types) {
					typeUsedAsConstructedValue.add(t);
				}
			}
		}
		if (parsed.type === "intersection") {
			const keys = new Set();
			/** @type {ParsedInterfaceType[]} */
			const subtypes = [];
			if (
				parsed.types.every((type) => {
					const parsed = /** @type {MergedType} */ (
						parsedCollectedTypes.get(type)
					);
					if (parsed.type !== "interface") return false;
					subtypes.push(parsed);
					const referencedBy = /** @type {Set<ts.Type>} */ (
						typeReferencedBy.get(type)
					);

					return (
						(referencedBy.size === 1 ||
							parsed.symbolName[0] === AnonymousType ||
							parsed.properties.size === 0) &&
						!parsed.subtype &&
						!parsed.typeParameters &&
						!parsed.stringIndex &&
						!parsed.numberIndex &&
						parsed.baseTypes.length === 0 &&
						[...parsed.properties.keys()].every((key) => {
							if (keys.has(key)) return false;
							keys.add(key);
							return true;
						})
					);
				})
			) {
				const interfaceSubtypes = subtypes;
				const symbol = /** @type {any} */ (type).symbol;
				const declaration = symbol && getDeclaration(symbol);
				/** @type {ParsedInterfaceType} */
				const newParsed = {
					type: "interface",
					subtype:
						declaration && declaration.kind === ts.SyntaxKind.SourceFile
							? "module"
							: undefined,
					symbolName: parsed.symbolName,
					baseTypes: [],
					calls: flatten(interfaceSubtypes.map((p) => p.calls)),
					constructors: flatten(interfaceSubtypes.map((p) => p.constructors)),
					properties: new Map(
						flatten(interfaceSubtypes.map((p) => p.properties))
					),
					documentation: interfaceSubtypes
						.map((p) => p.documentation)
						.join("\n")
						.replace(/\n+/g, "\n")
				};
				parsedCollectedTypes.set(type, newParsed);
			}
		}
	}

	// / Convert interfaces to namespaces ///

	for (const [type, parsed] of parsedCollectedTypes) {
		if (parsed.type !== "interface") continue;
		if (
			parsed.numberIndex ||
			parsed.stringIndex ||
			parsed.baseTypes.length > 0 ||
			parsed.typeParameters ||
			parsed.constructors.length > 0 ||
			parsed.properties.size === 0 ||
			typeUsedAsBaseType.has(type) ||
			typeUsedAsConstructedValue.has(type) ||
			typeUsedAsArgument.has(type) ||
			typeUsedAsTypeArgument.has(type)
		) {
			continue;
		}
		if (
			parsed.subtype !== undefined &&
			parsed.subtype !== "module" &&
			parsed.subtype !== "literal" &&
			exposedType !== type
		) {
			continue;
		}
		if (exposedType !== type && parsed.subtype !== "module") {
			if (typeUsedAsReturnValue.has(type)) continue;
			// heuristic: only referenced from other namespaces
			if (
				!Array.from(
					typeReferencedBy.get(type) || [],
					(t) => /** @type {MergedType} */ (parsedCollectedTypes.get(t))
				).every((p) => p.type === "namespace")
			) {
				continue;
			}
		}
		/** @type {MergedNamespaceType} */
		const newParsed = {
			type: "namespace",
			symbolName: parsed.symbolName,
			calls: parsed.calls,
			exports: parsed.properties
		};
		parsedCollectedTypes.set(type, newParsed);
	}

	// / Merge identical types ///

	/**
	 * @param {string} prefix type parameter prefix
	 * @param {ParsedSignature} signature signature
	 * @param {number} index signature index
	 * @returns {any[] | undefined} hash
	 */
	/**
	 * @param {string} prefix what kind of signature it is
	 * @param {ParsedSignature} signature the signature to hash
	 * @param {number} index its position among the type's signatures
	 * @returns {EXPECTED_ANY[]} the hash parts
	 */
	const getSigHash = (prefix, signature, index) => {
		const { args, returnType, typeParameters, documentation } = signature;
		const typeParametersMap = new Map(
			typeParameters && typeParameters.map((t, i) => [t, i])
		);
		return [
			"args",
			...flatten(
				args.map((arg) => [
					arg.name,
					arg.optional,
					arg.spread,
					arg.type,
					arg.documentation
				])
			),
			"return",
			returnType,
			"typeParameters",
			typeParameters ? typeParameters.length : 0,
			"documentation",
			documentation
		].map((item) => {
			const x = typeParametersMap.get(item);
			return x === undefined ? item : `${prefix}${index}_${x}`;
		});
	};

	/**
	 * @param {MergedType} parsed type
	 * @returns {any[] | undefined} hash
	 */
	const getTypeHash = (parsed) => {
		switch (parsed.type) {
			case "primitive": {
				return [parsed.type, parsed.name];
			}
			case "typeParameter": {
				return [
					parsed.type,
					parsed.name,
					parsed.constraint,
					parsed.defaultValue
				];
			}
			case "template": {
				return [parsed.type, ...parsed.texts, ...parsed.types];
			}
			case "reference": {
				const { target, typeArgumentsWithoutDefaults } = parsed;
				if (typeArgumentsWithoutDefaults.length === 0) return undefined;
				return [parsed.type, target, ...typeArgumentsWithoutDefaults];
			}
			case "index": {
				const { objectType, indexType } = parsed;
				return [parsed.type, objectType, indexType];
			}
			case "union":
			case "intersection": {
				const { symbolName, types, typeParameters } = parsed;
				const typeParametersMap = new Map(
					typeParameters && typeParameters.map((t, i) => [t, i])
				);
				return [
					parsed.type,
					symbolName[0],
					typeParameters ? typeParameters.length : 0,
					...types
				].map((item) => {
					const x = typeParametersMap.get(/** @type {ts.Type} */ (item));
					return x === undefined ? item : x;
				});
			}
			case "conditional": {
				const { symbolName, checkType, extendsType, trueType, falseType } =
					parsed;
				return [
					parsed.type,
					symbolName[0],
					checkType,
					extendsType,
					trueType,
					falseType
				];
			}
			case "interface": {
				const {
					symbolName,
					baseTypes,
					calls,
					constructors,
					properties,
					numberIndex,
					stringIndex,
					typeParameters,
					documentation
				} = parsed;
				if (
					calls.length === 0 &&
					constructors.length === 0 &&
					properties.size === 0 &&
					!numberIndex &&
					!stringIndex
				) {
					// need to have something unique
					return undefined;
				}
				const callHashes = calls.map(getSigHash.bind(null, "call"));
				if (callHashes.some((x) => !x)) return undefined;
				const constructorHashes = constructors.map(
					getSigHash.bind(null, "constructor")
				);
				if (constructorHashes.some((x) => !x)) return undefined;
				const typeParametersMap = new Map(
					typeParameters && typeParameters.map((t, i) => [t, i])
				);
				return [
					parsed.type,
					symbolName[0],
					"base",
					...baseTypes,
					"calls",
					...flatten(callHashes),
					"constructors",
					...flatten(constructorHashes),
					"properties",
					...flatten(
						Array.from(properties, ([name, { type, optional }]) => [
							name,
							type,
							optional
						])
					),
					"numberIndex",
					numberIndex,
					"stringIndex",
					stringIndex,
					"typeParameters",
					typeParameters ? typeParameters.length : 0,
					"documentation",
					documentation
				].map((item) => {
					const x = typeParametersMap.get(item);
					return x === undefined ? item : x;
				});
			}
		}
		return undefined;
	};

	const knownTypes = new TupleMap();
	let updates = true;
	while (updates) {
		updates = false;
		for (const [type, parsed] of parsedCollectedTypes) {
			const hash = getTypeHash(parsed);
			if (!hash) continue;
			const mappedHash = hash.map((item) => {
				let parsed = /** @type {MergedType | undefined} */ (
					parsedCollectedTypes.get(item)
				);
				if (!parsed) return item;
				while (
					parsed.type === "reference" &&
					parsed.typeArgumentsWithoutDefaults.length === 0
				) {
					parsed = /** @type {MergedType} */ (
						parsedCollectedTypes.get(parsed.target)
					);
				}
				return parsed;
			});
			const otherType = knownTypes.get(mappedHash);
			if (otherType && otherType !== type) {
				const otherParsed = /** @type {MergedType} */ (
					parsedCollectedTypes.get(otherType)
				);
				if (otherParsed === parsed) continue;
				if ("symbolName" in otherParsed && "symbolName" in parsed) {
					const commonSymbolName = otherParsed.symbolName.filter((n) =>
						parsed.symbolName.includes(n)
					);
					otherParsed.symbolName = commonSymbolName;
				}
				parsedCollectedTypes.set(
					type,
					otherParsed.type === "primitive" || otherParsed.type === "reference"
						? otherParsed
						: {
								type: "reference",
								target: otherType,
								typeArguments: [],
								typeArgumentsWithoutDefaults: []
							}
				);
				updates = true;
			} else {
				knownTypes.set(mappedHash, type);
			}
		}
	}

	// / Determine names for types ///

	const usedNames = new Set([AnonymousType]);

	/** @type {[ts.Type, { symbolName: SymbolName }][]} */
	const needName = [];
	for (const [type, parsed] of parsedCollectedTypes) {
		switch (parsed.type) {
			case "conditional": {
				if (parsed.typeParameters) {
					needName.push([type, parsed]);
				}
				break;
			}
			case "interface": {
				if (
					parsed.typeParameters ||
					parsed.baseTypes.length > 0 ||
					(parsed.symbolName[0] !== AnonymousType &&
						!isSimpleFunction(parsed) &&
						exposedType !== type)
				) {
					needName.push([type, parsed]);
				}
				break;
			}
			case "union":
			case "intersection": {
				if (
					parsed.typeParameters ||
					(parsed.symbolName[0] !== AnonymousType && exposedType !== type)
				) {
					needName.push([type, parsed]);
				}
				break;
			}
			case "class":
			case "namespace":
			case "symbol":
			case "import": {
				needName.push([type, parsed]);
				break;
			}
		}
	}

	const { nameMapping } = options;

	const nameToQueueEntry = new Map();
	/**
	 * @param {string[]} symbolName the name parts to pick from
	 * @param {boolean=} requeueOnConflict whether to requeue when the name is taken
	 * @returns {string | undefined} the chosen name
	 */
	const findName = (symbolName, requeueOnConflict = false) => {
		const key = symbolName.join(" ");
		for (const wishedName of Object.keys(nameMapping)) {
			if (nameMapping[wishedName].test(key)) {
				symbolName = [wishedName, ...symbolName];
			}
		}
		let name;
		for (let i = 1; i <= symbolName.length; i++) {
			name = joinIdentifier(symbolName.slice(0, i));
			if (!usedNames.has(name)) {
				usedNames.add(name);
				return name;
			}
			if (requeueOnConflict) {
				if (verbose) {
					console.log(
						`Naming conflict: ${name} can't be used for ${symbolName.join(" ")}`
					);
				}
				const item = nameToQueueEntry.get(name);
				if (item) {
					needName.push(item);
					nameToQueueEntry.set(name, undefined);
				}
			}
		}
		let i = 1;
		while (usedNames.has(`${name}_${i}`)) i++;
		usedNames.add(`${name}_${i}`);
		return `${name}_${i}`;
	};

	const typeToVariable = new Map();
	for (const entry of needName) {
		const [type, item] = entry;
		const { symbolName } = item;
		const name = findName(symbolName, true);
		typeToVariable.set(type, name);
		nameToQueueEntry.set(name, entry);
	}

	// / Determine code for types

	/** @type {Set<string>} */
	const declarations = new Set();
	/** @type {Map<string, string>} */
	/** @type {Map<string, string | string[]>} */
	const declarationKeys = new Map();
	/** @type {Map<string, Set<string>>} */
	const imports = new Map();
	/** @type {Set<string>} */
	const importDeclarations = new Set();
	/** @type {Map<ts.Type, () => void>} */
	const emitDeclarations = new Map();
	/** @type {string[]} */
	const exports = [];
	const typeToCode = new TupleMap();

	/**
	 * @param {string} key key for sorting
	 * @param {string} text content
	 * @returns {void}
	 */
	/**
	 * @param {string | string[]} key what the declaration is keyed by
	 * @param {string} text the declaration source
	 * @returns {void}
	 */
	const addDeclaration = (key, text) => {
		declarations.add(text);
		declarationKeys.set(text, key);
	};

	/**
	 * @param {ts.Type} type the type being declared
	 * @param {string | undefined} variable the name to declare it under
	 * @param {() => string} fn renders the declaration
	 * @returns {void}
	 */
	const queueDeclaration = (type, variable, fn) => {
		if (!variable) {
			throw new Error(
				`variable missing for queueDeclaration of ${checker.typeToString(type)}`
			);
		}
		emitDeclarations.set(type, () => {
			const oldCodeGenerationContext = codeGenerationContext;
			codeGenerationContext = variable;
			const text = fn();
			codeGenerationContext = oldCodeGenerationContext;
			declarations.add(text);
			declarationKeys.set(text, variable);
		});
	};

	/**
	 * @param {string} exportName exported name
	 * @param {string} name local identifier name
	 * @param {string} from source file
	 * @returns {void}
	 */
	const addImport = (exportName, name, from) => {
		if (from.startsWith("node:")) from = from.slice(5);
		if (!exportName.includes(".")) {
			let set = imports.get(from);
			if (set === undefined) {
				imports.set(from, (set = new Set()));
			}
			set.add(exportName === name ? name : `${exportName} as ${name}`);
		} else {
			importDeclarations.add(
				`type ${name} = import(${JSON.stringify(from)}).${exportName};`
			);
		}
	};

	/**
	 * @param {string} code the rendered type
	 * @param {boolean=} optional whether it is already known to be optional
	 * @returns {{ code: string, optional: boolean }} the type without its `undefined`
	 */
	const extractOptional = (code, optional = false) => {
		if (code.startsWith("(undefined | ")) {
			return {
				code: `(${code.slice("(undefined | ".length)}`,
				optional: true
			};
		} else if (code.endsWith(" | undefined)")) {
			return {
				code: `${code.slice(0, -" | undefined)".length)})`,
				optional: true
			};
		}
		return {
			code,
			optional
		};
	};

	/**
	 * @param {ParsedSignature} sig the signature
	 * @param {Set<ts.Type>} typeArgs type args specified in context
	 * @param {"arrow" | "constructor" | "class-constructor" | "method" | undefined} type type of generated code
	 * @returns {string} code
	 */
	const sigToString = (sig, typeArgs, type = undefined) => {
		const sigTypeArgs = sig.typeParameters
			? `<${sig.typeParameters
					.map((t) => getCode(t, typeArgs, "in type args"))
					.join(", ")}>`
			: "";
		const innerTypeArgs = new Set(typeArgs);
		if (sig.typeParameters) {
			for (const t of sig.typeParameters) innerTypeArgs.add(t);
		}
		let canBeOptional = true;
		const args = `(${
			sig.thisType
				? `this: ${getCode(sig.thisType, innerTypeArgs)}${
						sig.args.length > 0 ? ", " : ""
					}`
				: ""
		} ${[...sig.args]
			.reverse()
			.map((arg) => {
				const { code, optional } = canBeOptional
					? extractOptional(getCode(arg.type, innerTypeArgs), arg.optional)
					: {
							code: getCode(arg.type, innerTypeArgs),
							optional: false
						};
				const isCurrentOptional = optional && !arg.spread;
				canBeOptional = canBeOptional && isCurrentOptional;
				return `${arg.spread ? "..." : ""}${arg.name}${
					isCurrentOptional ? "?" : ""
				}: ${code}`;
			})
			.reverse()
			.join(", ")})`;
		switch (type) {
			case "arrow":
				return `${sigTypeArgs}${args} => ${getCode(
					sig.returnType,
					innerTypeArgs
				)}`;
			case "class-constructor":
				return `constructor${args}`;
			case "constructor":
				return `new ${sigTypeArgs}${args}: ${getCode(
					sig.returnType,
					innerTypeArgs
				)}`;
			case "method":
				return `${sigTypeArgs}${args}: ${getCode(
					sig.returnType,
					innerTypeArgs
				)}`;
			default:
				return `${sigTypeArgs}${args}: ${getCode(
					sig.returnType,
					innerTypeArgs
				)}`;
		}
	};

	/**
	 * @param {ts.Type} type the type
	 * @param {ParsedInterfaceType | MergedClassType} parsed parsed type
	 * @param {Set<ts.Type>} typeArgs type args specified in context
	 * @returns {string[]} code items for interface
	 */
	const getInterfaceItems = (type, parsed, typeArgs) => {
		const items = [];
		for (const construct of parsed.constructors) {
			items.push(
				`${construct.documentation}${sigToString(
					construct,
					typeArgs,
					parsed.type === "interface" ? "constructor" : "class-constructor"
				)}`
			);
		}
		if (parsed.type === "interface") {
			for (const call of parsed.calls) {
				items.push(`${call.documentation}${sigToString(call, typeArgs)}`);
			}
		}
		if (parsed.numberIndex) {
			items.push(`[index: number]: ${getCode(parsed.numberIndex, typeArgs)}`);
		}
		if (parsed.stringIndex) {
			items.push(`[index: string]: ${getCode(parsed.stringIndex, typeArgs)}`);
		}

		/**
		 * @param {ts.Type} type the type to test
		 * @returns {boolean} true when a base type declares an iterator
		 */
		const hasIteratorInBaseType = (type) => {
			const parsed = parsedCollectedTypes.get(type);
			if (!parsed || parsed.type !== "reference") return false;
			const parsedTarget = /** @type {MergedType} */ (
				parsedCollectedTypes.get(parsed.target)
			);
			return (
				parsedTarget.type === "primitive" &&
				[
					"Array",
					"Map",
					"Set",
					"String",
					"Int8Array",
					"Uint8Array",
					"Uint8ClampedArray",
					"Int16Array",
					"Uint16Array",
					"Int32Array",
					"Uint32Array",
					"Float16Array",
					"Float32Array",
					"Float64Array"
				].includes(parsedTarget.name)
			);
		};

		/**
		 * @param {Map<string, EXPECTED_ANY>} properties the properties to render
		 * @param {string=} prefix rendered before each name
		 * @returns {void}
		 */
		const handleProperties = (properties, prefix = "") => {
			for (const [
				name,
				{ getter, type: propType, optional, readonly, method, documentation }
			] of properties) {
				if (method) {
					if (
						name === "[Symbol.iterator]" &&
						parsed.type === "class" &&
						parsed.baseType &&
						hasIteratorInBaseType(parsed.baseType)
					) {
						continue;
					}
					let methodInfo = /** @type {MergedType} */ (
						parsedCollectedTypes.get(propType)
					);
					while (
						methodInfo.type === "reference" &&
						methodInfo.typeArgumentsWithoutDefaults.length === 0
					) {
						methodInfo = /** @type {MergedType} */ (
							parsedCollectedTypes.get(methodInfo.target)
						);
					}
					if (
						methodInfo.type === "interface" &&
						methodInfo.baseTypes.length === 0 &&
						methodInfo.constructors.length === 0 &&
						!methodInfo.numberIndex &&
						!methodInfo.stringIndex &&
						methodInfo.properties.size === 0
					) {
						for (const call of methodInfo.calls) {
							const docs = new Set([
								documentation,
								methodInfo.documentation,
								call.documentation
							]);
							items.push(
								`${[...docs].join("")}${prefix}${name}${sigToString(
									call,
									typeArgs,
									"method"
								)}`
							);
						}
						continue;
					} else if (verbose) {
						console.log(
							`Method ${name} has weird type ${getCode(propType, typeArgs)} (${
								methodInfo.type
							})`
						);
					}
				}
				const { code, optional: opt } = extractOptional(
					getCode(propType, typeArgs),
					optional
				);
				if (!getter) {
					const p = prefix + (readonly ? "readonly " : "");
					if (opt) {
						items.push(`${documentation}${p}${name}?: ${code}`);
					} else {
						items.push(`${documentation}${p}${name}: ${code}`);
					}
				} else {
					items.push(`${documentation}get ${name}(): ${code}`);
				}
			}
		};

		handleProperties(parsed.properties);
		if (parsed.type === "class" && parsed.correspondingType) {
			handleProperties(parsed.staticProperties, "static ");
		}
		return items;
	};

	/**
	 * @param {ts.Type} type the type
	 * @param {Set<ts.Type>} typeArgs type args specified in context
	 * @param {string} state generation state
	 * @returns {string} code
	 */
	const getCodeInternal = (type, typeArgs, state) => {
		const parsed = parsedCollectedTypes.get(type);
		if (!parsed) return "unknown /* no parsed data */";
		switch (parsed.type) {
			case "primitive":
				return parsed.name;
			case "typeParameter": {
				let code = parsed.name;

				if (state === "in type args") {
					if (parsed.constraint) {
						const constraint = getCode(parsed.constraint, typeArgs, state);
						code += ` extends ${constraint}`;
					}
					if (parsed.defaultValue) {
						const defaultValue = getCode(parsed.defaultValue, typeArgs, state);
						code += ` = ${defaultValue}`;
					}
				}

				return code;
			}
			case "template": {
				let code = "`";
				code += parsed.texts[0];
				for (let i = 0; i < parsed.types.length; i++) {
					code += `\${${getCode(parsed.types[i], typeArgs)}}`;
					code += parsed.texts[i + 1];
				}
				code += "`";
				return code;
			}
			case "index": {
				const { objectType, indexType } = parsed;
				const getIndexTypeCode = () => {
					if (indexType.flags & ts.TypeFlags.Substitution) {
						const { baseType } = /** @type {ts.SubstitutionType} */ (indexType);
						const symbol = baseType.getSymbol();
						if (symbol) {
							const name = symbol.getName();
							if (name !== "__type" && name !== "unknown") return name;
						}
					}

					return getCode(indexType, typeArgs);
				};

				return `(${getCode(objectType, typeArgs)})[${getIndexTypeCode()}]`;
			}
			case "union":
			case "intersection": {
				/**
				 * @param {Set<ts.Type>} typeArgs type args specified in context
				 * @returns {string} code
				 */
				const code = (typeArgs) =>
					`(${[...new Set(parsed.types.map((t) => getCode(t, typeArgs)))]
						.join(parsed.type === "intersection" ? " & " : " | ")
						.replace(/(^|\| )false \| true($| \|)/g, "$1boolean$2")})`;

				const variable = typeToVariable.get(type);
				if (variable) {
					queueDeclaration(
						type,
						variable,
						() =>
							`type ${variable}${
								parsed.typeParameters
									? `<${parsed.typeParameters
											.map((t) => getCode(t, new Set(), "in type args"))
											.join(", ")}>`
									: ""
							} = ${code(new Set(parsed.typeParameters))};`
					);
					if (
						state !== "with type args" &&
						parsed.typeParameters &&
						parsed.typeParameters.every((t) => typeArgs.has(t))
					) {
						return `${variable}<${parsed.typeParameters.map((t) =>
							getCode(t, typeArgs)
						)}>`;
					}
					return `${variable}`;
				}
				return code(typeArgs);
			}
			case "reference": {
				if (parsed.typeArguments.length === 0) {
					return getCode(parsed.target, typeArgs, state);
				}
				if (parsed.typeArgumentsWithoutDefaults.length === 0) {
					return getCode(parsed.target, typeArgs, "with type args");
				}
				const parsedTarget = parsedCollectedTypes.get(parsed.target);
				if (parsedTarget && parsedTarget.type === "primitive") {
					if (parsedTarget.name === "[]") {
						return `[${parsed.typeArgumentsWithoutDefaults
							.map((t) => getCode(t, typeArgs))
							.join(", ")}]`;
					} else if (parsedTarget.name === "[...]") {
						const items = parsed.typeArgumentsWithoutDefaults.map((t) =>
							getCode(t, typeArgs)
						);
						const last = items.pop();
						return `[${items.join(", ")}, ...(${last})[]]`;
					} else if (
						parsedTarget.name === "Array" &&
						parsed.typeArgumentsWithoutDefaults.length === 1
					) {
						return `(${getCode(
							parsed.typeArgumentsWithoutDefaults[0],
							typeArgs
						)})[]`;
					}
				}

				const symbol = type.getSymbol();
				const typeArgumentsWithoutDefaults =
					symbol && isArrayBufferLike(getFullEscapedName(symbol))
						? ""
						: `<${parsed.typeArgumentsWithoutDefaults
								.map((t) => getCode(t, typeArgs))
								.join(", ")}>`;

				return `${getCode(
					parsed.target,
					typeArgs,
					"with type args"
				)}${typeArgumentsWithoutDefaults}`;
			}
			case "conditional": {
				/**
				 * @param {ts.Type} t the type to render
				 * @returns {string} the `extends` clause for it
				 */
				const getExtendsString = (t) => {
					if (t.flags & ts.TypeFlags.TypeParameter) {
						const symbol = t.getSymbol();
						if (
							symbol &&
							symbol.declarations &&
							symbol.declarations.length > 0
						) {
							const decl = symbol.declarations[0];
							if (
								ts.isTypeParameterDeclaration(decl) &&
								decl.parent &&
								ts.isInferTypeNode(decl.parent)
							) {
								return `infer ${symbol.getName()}`;
							}
						}
						return symbol ? symbol.getName() : getCode(t, typeArgs, state);
					}

					// Tuples in `extends` position must be rendered element-wise so that
					// `infer` in an element/rest slot survives (getCode collapses it).
					const objectFlags =
						t.flags & ts.TypeFlags.Object
							? /** @type {ts.ObjectType} */ (t).objectFlags
							: 0;
					if (objectFlags & ts.ObjectFlags.Reference) {
						const target = /** @type {ts.TypeReference} */ (t).target;
						if (
							target &&
							/** @type {ts.ObjectType} */ (target).objectFlags &
								ts.ObjectFlags.Tuple
						) {
							const tupleTarget = /** @type {ts.TupleType} */ (target);
							const elements = checker.getTypeArguments(
								/** @type {ts.TypeReference} */ (t)
							);
							const parts = elements.map((el, i) => {
								const flag = tupleTarget.elementFlags[i];
								const inner = getExtendsString(el);
								// Rest `...x[]` carries the element type; Variadic `...x`
								// (incl. `...infer R`) carries the whole spread type.
								if (flag & ts.ElementFlags.Rest) return `...(${inner})[]`;
								if (flag & ts.ElementFlags.Variadic) return `...${inner}`;
								if (flag & ts.ElementFlags.Optional) return `${inner}?`;
								return inner;
							});
							return `${tupleTarget.readonly ? "readonly " : ""}[${parts.join(
								", "
							)}]`;
						}
					}

					if (checker.isArrayType(t)) {
						const target = /** @type {ts.TypeReference} */ (t).target;
						// `isArrayType` covers both `T[]` and `readonly T[]`; only the
						// latter's target is the global `ReadonlyArray`.
						const readonly =
							Boolean(target.symbol) &&
							ts.unescapeLeadingUnderscores(target.symbol.escapedName) ===
								"ReadonlyArray";
						const elementType = checker.getTypeArguments(
							/** @type {ts.TypeReference} */ (t)
						)[0];
						return `${readonly ? "readonly " : ""}(${getExtendsString(
							elementType
						)})[]`;
					}

					return getCode(t, typeArgs, state);
				};

				const checkType = getCode(parsed.checkType, typeArgs, state);
				const extendsType = getExtendsString(parsed.extendsType);
				const trueType = getCode(parsed.trueType, typeArgs, state);
				const falseType = getCode(parsed.falseType, typeArgs, state);

				const variable = typeToVariable.get(type);
				if (variable !== undefined) {
					queueDeclaration(
						type,
						variable,
						() =>
							`type ${variable}${
								parsed.typeParameters
									? `<${parsed.typeParameters
											.map((t) => getCode(t, new Set(), "in type args"))
											.join(", ")}>`
									: ""
							} = (${checkType} extends ${extendsType} ? ${trueType} : ${falseType});`
					);
					return `${variable}`;
				}

				return `(${checkType} extends ${extendsType} ? ${trueType} : ${falseType})`;
			}
			case "interface": {
				const variable = typeToVariable.get(type);
				if (variable !== undefined) {
					queueDeclaration(type, variable, () => {
						const typeArgs = new Set(parsed.typeParameters);
						return `${parsed.documentation}declare interface ${variable}${
							parsed.typeParameters
								? `<${parsed.typeParameters
										.map((t) => getCode(t, new Set(), "in type args"))
										.join(", ")}>`
								: ""
						}${
							parsed.baseTypes.length > 0
								? ` extends ${parsed.baseTypes
										.map((t) => getCode(t, typeArgs))
										.join(", ")}`
								: ""
						} {\n${getInterfaceItems(type, parsed, typeArgs)
							.map((i) => `\t${i};`)
							.join("\n")}\n}`;
					});
					if (
						state !== "with type args" &&
						parsed.typeParameters &&
						parsed.typeParameters.every((t) => typeArgs.has(t))
					) {
						return `${variable}<${parsed.typeParameters.map((t) =>
							getCode(t, typeArgs)
						)}>`;
					}
					return `${variable}`;
				}
				if (isSimpleFunction(parsed)) {
					return `(${sigToString(parsed.calls[0], typeArgs, "arrow")})`;
				}
				return `{ ${getInterfaceItems(type, parsed, typeArgs).join("; ")} }`;
			}
			case "typeof class":
			case "class": {
				const classType =
					parsed.type === "typeof class" ? parsed.correspondingType : type;
				const variable = typeToVariable.get(classType);
				queueDeclaration(/** @type {ts.Type} */ (classType), variable, () => {
					const parsed = /** @type {MergedClassType} */ (
						parsedCollectedTypes.get(/** @type {ts.Type} */ (classType))
					);
					const typeArgs = new Set(parsed.typeParameters);
					return `${parsed.documentation}declare ${
						parsed.constructors.length === 0 ? "abstract class" : "class"
					} ${variable}${
						parsed.typeParameters
							? `<${parsed.typeParameters
									.map((t) => getCode(t, new Set(), "in type args"))
									.join(", ")}>`
							: ""
					}${
						parsed.baseType
							? ` extends ${getCode(parsed.baseType, typeArgs)}`
							: ""
					} {\n${getInterfaceItems(
						/** @type {ts.Type} */ (classType),
						parsed,
						typeArgs
					)
						.map((i) => `\t${i};`)
						.join("\n")}\n}`;
				});
				if (parsed.type === "typeof class") {
					return `typeof ${variable}`;
				}
				if (state !== "with type args" && parsed.typeParameters) {
					return `${variable}<${parsed.typeParameters.map((t) =>
						getCode(t, typeArgs)
					)}>`;
				}
				return `${variable}`;
			}
			case "namespace": {
				/**
				 * @param {string} variable the namespace's name
				 * @param {boolean=} exportNamespace whether to export it
				 * @returns {string} the rendered namespace
				 */
				const ns = (variable, exportNamespace) => {
					const exports = [];
					const declarations = [];
					const exposedNames = new Set();
					for (const [
						name,
						{ type: exportedType, readonly, getter }
					] of parsed.exports) {
						const code = getCode(
							/** @type {ts.Type} */
							(exportedType),
							new Set(),
							`in namespace ${name}`
						);
						if (code.startsWith("export ")) {
							declarations.push(code);
						} else if (/^typeof [A-Za-z_0-9]+$/.test(code)) {
							const exportName = code.slice("typeof ".length);
							exports.push(
								exportName === name ? name : `${exportName} as ${name}`
							);
						} else if (name === "default") {
							declarations.push(
								`${readonly || getter ? "const" : "let"} _default: ${code};\n`
							);
							exports.push("_default as default");
						} else {
							declarations.push(
								`export ${
									readonly || getter ? "const" : "let"
								} ${name}: ${code};\n`
							);
						}
					}
					if (type === exposedType) {
						for (const [name, type] of typeExports) {
							if (exposedNames.has(name)) continue;
							const code = getCode(type, new Set());
							const named = /^([A-Za-z_0-9]+)(?:<.+>)?$/.exec(code);
							if (named) {
								const [, codeWithoutTemplateArgs] = named;
								exports.push(
									codeWithoutTemplateArgs === name
										? name
										: `${codeWithoutTemplateArgs} as ${name}`
								);
							} else {
								declarations.push(`export type ${name} = ${code};\n`);
							}
						}
					}
					return `${parsed.calls
						.map(
							(call) =>
								`${
									exportNamespace ? "export" : "declare"
								} function ${variable}${sigToString(
									call,
									new Set(),
									"method"
								)};\n`
						)
						.join("")}${
						exportNamespace ? "export" : "declare"
					} namespace ${variable} {\n${declarations.join("")}${
						exports.length > 0 ? `export { ${exports.join(", ")} }` : ""
					}\n}`;
				};
				if (state.startsWith("in namespace ")) {
					return ns(state.slice("in namespace ".length), true);
				}
				const variable = typeToVariable.get(type);
				queueDeclaration(type, variable, () => ns(variable));
				return `typeof ${variable}`;
			}
			case "symbol": {
				const variable = typeToVariable.get(type);
				queueDeclaration(
					type,
					variable,
					() => `declare const ${variable}: unique symbol;`
				);
				return `typeof ${variable}`;
			}
			case "import": {
				const variable = typeToVariable.get(type);
				addImport(parsed.exportName, variable, parsed.from);
				return (
					(parsed.isValue && !type.isClass() && state !== "with type args"
						? "typeof "
						: "") + variable
				);
			}
		}
		return `unknown /* failed to generate code: ${parsed.type} */`;
	};

	let codeGenerationContext = "";

	const unusedTempNames = new TupleMap();

	/**
	 * @param {ts.Type} type the type
	 * @param {Set<ts.Type>} typeArgs type args specified in context
	 * @param {string} state generation state
	 * @returns {string} code
	 */
	const getCode = (type, typeArgs, state = "") => {
		const tuple = [type, ...typeArgs, state];
		const code = typeToCode.get(tuple);
		if (code !== undefined) {
			unusedTempNames.delete(tuple);
			return code;
		}
		const parsed = parsedCollectedTypes.get(type);
		const tempName = findName(
			(parsed && "symbolName" in parsed && parsed.symbolName) || [
				`${codeGenerationContext}AnonymousCircularType`
			]
		);
		typeToCode.set(tuple, tempName);
		unusedTempNames.add(tuple);
		const newCode = getCodeInternal(type, typeArgs, state);
		const used = !unusedTempNames.has(tuple);
		unusedTempNames.delete(tuple);
		if (used) {
			addDeclaration(
				/** @type {string} */ (tempName),
				`type ${tempName} = ${newCode};`
			);
		} else {
			usedNames.delete(/** @type {string} */ (tempName));
			typeToCode.set(tuple, newCode);
		}
		return newCode;
	};

	if (exposedType) {
		const code = getCode(exposedType, new Set());
		if (code.startsWith("typeof ")) {
			exports.push(`export = ${code.slice("typeof ".length)};`);
		} else {
			const exportsName = findName(["exports"]);
			exports.push(`declare const ${exportsName}: ${code};`);
			exports.push(`export = ${exportsName};`);
		}
	}

	for (const [, fn] of emitDeclarations) {
		fn();
	}

	if (hasUnresolvableTypes) {
		console.error(
			"Some types can't be resolved, so no declarations are generated."
		);
		console.error(
			"Note that a type imported with `@import` is only a local alias, it's not re-exported from the module like a `@typedef` is."
		);
		return;
	}

	const outputFilePath = path.resolve(root, outputFile);

	const sortedDeclarations = [...declarations].sort((a, b) => {
		const ak = /** @type {string} */ (declarationKeys.get(a));
		const bk = /** @type {string} */ (declarationKeys.get(b));
		if (ak < bk) return -1;
		if (ak > bk) return 1;
		return 0;
	});

	let source = [
		"/*",
		" * This file was automatically generated.",
		" * DO NOT MODIFY BY HAND.",
		" * Run `yarn fix:special` to update",
		" */",
		"",
		...[...imports.keys()]
			.sort()
			.map(
				(from) =>
					`import { ${[.../** @type {Set<string>} */ (imports.get(from))]
						.sort()
						.join(", ")} } from ${JSON.stringify(from)}`
			),
		...[...importDeclarations].sort(),
		"",
		...sortedDeclarations,
		"",
		...exports
	].join("\n");
	try {
		const prettierOptions = await prettier.resolveConfig(outputFilePath);
		if (!prettierOptions) {
			console.error("Prettier options not found");
			return;
		}

		source = await prettier.format(source, prettierOptions);
	} catch (err) {
		exitCode = 1;
		console.error(/** @type {Error} */ (err).message);
	}

	let needUpdate = true;
	try {
		if ((await fs.readFile(outputFilePath, "utf8")) === source) {
			needUpdate = false;
		}
	} catch (_err) {
		// ignore
	}

	if (needUpdate) {
		if (doWrite) {
			await fs.writeFile(outputFilePath, source);
			console.error("types.d.ts updated.");
		} else {
			exitCode = 1;
			console.error("types.d.ts need to be updated.");
			console.error("run 'yarn fix:special' to update.");
		}
	}

	process.exitCode = exitCode;
})();
