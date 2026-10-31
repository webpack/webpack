/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

// loosely based on https://github.com/plantain-00/type-coverage

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const { base, baseAny, root } = require("./argv");
const createTypeScriptProgram = require("./typescript-program");

// `hot/` is a project of its own, so its files reach only that program.
/** @type {[ts.SourceFile, ts.TypeChecker][]} */
const sourceFiles = [];
for (const configName of ["tsconfig.json", "tsconfig.hot.json"]) {
	const program = createTypeScriptProgram(configName);
	const checker = program.getTypeChecker();
	for (const sourceFile of program.getSourceFiles()) {
		sourceFiles.push([sourceFile, checker]);
	}
}

/**
 * @typedef {object} Location
 * @property {number} line
 * @property {number} column
 */

/**
 * @typedef {object} FileReport
 * @property {string} path
 * @property {Record<number, { start: Location, end: Location }>} statementMap
 * @property {Record<string, never>} fnMap always empty, the report only counts statements
 * @property {Record<string, never>} branchMap always empty, the report only counts statements
 * @property {Record<number, number>} s
 * @property {Record<string, never>} f always empty, the report only counts statements
 * @property {Record<string, never>} b always empty, the report only counts statements
 */

/** @type {Record<string, FileReport>} */
const coverageReport = Object.create(null);

// Directories whose escape hatches and inferred `any` the report counts.
const ESCAPE_HATCH_DIRECTORIES = ["lib/", "hot/", "declarations/"];

/**
 * @typedef {object} InferredAny
 * @property {number} line the line, from 1
 * @property {string} name the identifier
 */

/** @type {Record<string, InferredAny[]>} */
const inferredAnyByFile = {};

/** @type {Set<string>} */
const walkedFiles = new Set();
for (const [sourceFile, typeChecker] of sourceFiles) {
	const file = sourceFile.fileName;
	if (!sourceFile.isDeclarationFile && !walkedFiles.has(file)) {
		walkedFiles.add(file);
		/** @type {FileReport} */
		const rep = {
			path: path.sep !== "/" ? file.replace(/\//g, path.sep) : file,
			statementMap: {},
			fnMap: {},
			branchMap: {},
			s: {},
			f: {},
			b: {}
		};
		coverageReport[rep.path] = rep;
		let statementIndex = 0;
		const relativeFile = path.relative(root, file).split(path.sep).join("/");
		/** @type {InferredAny[] | undefined} */
		const inferredAny = ESCAPE_HATCH_DIRECTORIES.some((directory) =>
			relativeFile.startsWith(directory)
		)
			? (inferredAnyByFile[relativeFile] = [])
			: undefined;

		/**
		 * @param {ts.Node} node the node to be walked
		 * @returns {boolean} true when the node is a `replace` call
		 */
		const isReplaceMethod = (node) => {
			if (!ts.isIdentifier(node)) {
				return false;
			}

			if (node.text !== "replace") {
				return false;
			}

			if (!ts.isPropertyAccessExpression(node.parent)) {
				return false;
			}

			if (node.parent.name !== node) {
				return false;
			}

			const callExpr = node.parent.parent;

			if (!ts.isCallExpression(callExpr)) {
				return false;
			}

			const objType = typeChecker.getTypeAtLocation(node.parent.expression);
			const isString =
				(objType.getFlags() &
					(ts.TypeFlags.String | ts.TypeFlags.StringLiteral)) !==
				0;

			if (!isString) {
				return false;
			}

			const args = callExpr.arguments;

			if (args.length < 2) {
				return false;
			}

			const secondArg = args[1];
			const isStringOrTemplate =
				// "string"
				ts.isStringLiteral(secondArg) ||
				// `template`
				ts.isNoSubstitutionTemplateLiteral(secondArg) ||
				// `template ${var}`
				ts.isTemplateExpression(secondArg);

			if (isStringOrTemplate) {
				return true;
			}

			const type = typeChecker.getTypeAtLocation(secondArg);
			const signatures = type.getCallSignatures();

			let needIgnore = false;

			for (const signature of signatures) {
				const parameters = signature.getParameters();

				if (parameters.length === 1) {
					needIgnore = true;
				}
			}

			return needIgnore;
		};

		/**
		 * Tells whether a node declares or assigns a `let` written without a
		 * type or a value. TypeScript answers `any` there, but types every
		 * read by the values assigned before it, so nothing reads an `any`.
		 * @param {ts.Node} node the identifier or `this`
		 * @returns {boolean} true at such a declaration or assignment
		 */
		const isEvolvingLetWrite = (node) => {
			if (!ts.isIdentifier(node)) return false;
			const { parent } = node;
			const isWrite =
				(ts.isVariableDeclaration(parent) && parent.name === node) ||
				(ts.isBinaryExpression(parent) &&
					parent.left === node &&
					parent.operatorToken.kind === ts.SyntaxKind.EqualsToken);
			if (!isWrite) return false;
			const symbol = typeChecker.getSymbolAtLocation(node);
			const declaration = symbol && symbol.valueDeclaration;
			return Boolean(
				declaration &&
				ts.isVariableDeclaration(declaration) &&
				!declaration.initializer &&
				!declaration.type &&
				ts.getJSDocType(declaration) === undefined &&
				ts.getJSDocType(declaration.parent.parent) === undefined
			);
		};

		/**
		 * Tells whether a declaration names its type, in JSDoc or TypeScript.
		 * @param {ts.Declaration} declaration the declaration
		 * @returns {boolean} true when the declaration states a type
		 */
		const declaresType = (declaration) => {
			if (
				(ts.isJSDocPropertyLikeTag(declaration) &&
					declaration.typeExpression !== undefined) ||
				("type" in declaration && declaration.type !== undefined) ||
				ts.getJSDocType(declaration) !== undefined
			) {
				return true;
			}
			// `/** @type {T} */ const x = …` puts the tag on the statement.
			const statement = declaration.parent && declaration.parent.parent;
			return Boolean(
				ts.isVariableDeclaration(declaration) &&
				statement &&
				ts.isVariableStatement(statement) &&
				ts.getJSDocType(statement) !== undefined
			);
		};

		/**
		 * Tells whether a declaration states a type in this project's own source.
		 * @param {ts.Declaration} declaration the declaration
		 * @returns {boolean} true when it does
		 */
		const declaresOwnType = (declaration) =>
			!declaration.getSourceFile().isDeclarationFile &&
			declaresType(declaration);

		/**
		 * Tells whether an unannotated parameter or destructured binding takes its
		 * type from one this project declares: a callback's parameter from the
		 * signature it is passed to, a binding from the property it reads.
		 * @param {ts.Declaration} declaration the declaration
		 * @returns {boolean} true when the type it takes is declared
		 */
		const takesDeclaredType = (declaration) => {
			if (ts.isParameter(declaration)) {
				const fn = declaration.parent;
				if (!ts.isArrowFunction(fn) && !ts.isFunctionExpression(fn)) {
					return false;
				}
				const contextualType = typeChecker.getContextualType(fn);
				if (!contextualType) return false;
				const index = fn.parameters.indexOf(declaration);
				const signatures = contextualType.getCallSignatures();
				return (
					signatures.length > 0 &&
					signatures.every((signature) => {
						const { parameters } = signature;
						const parameter =
							parameters[Math.min(index, parameters.length - 1)];
						const declarations = parameter && parameter.getDeclarations();
						return Boolean(
							declarations &&
							declarations.length > 0 &&
							declarations.every(declaresOwnType)
						);
					})
				);
			}
			if (ts.isBindingElement(declaration) && !declaration.initializer) {
				const key = declaration.propertyName || declaration.name;
				if (!ts.isIdentifier(key)) return false;
				const property = typeChecker
					.getTypeAtLocation(declaration.parent)
					.getProperty(key.text);
				const declarations = property && property.getDeclarations();
				return Boolean(
					declarations &&
					declarations.length > 0 &&
					declarations.every(declaresOwnType)
				);
			}
			return false;
		};

		/**
		 * Tells whether an identifier's `any` is stated by a declaration, such as
		 * an `EXPECTED_ANY` the escape-hatch rows already count, not inferred.
		 * @param {ts.Node} node the identifier
		 * @returns {boolean} true when every declaration of its symbol states a type
		 */
		const isDeclaredAny = (node) => {
			const symbol =
				(ts.isShorthandPropertyAssignment(node.parent)
					? typeChecker.getShorthandAssignmentValueSymbol(node.parent)
					: typeChecker.getSymbolAtLocation(node)) ||
				(ts.isPropertyAccessExpression(node.parent) && node.parent.name === node
					? typeChecker.getSymbolAtLocation(node.parent)
					: undefined);
			const declarations = symbol && symbol.getDeclarations();
			return Boolean(
				declarations &&
				declarations.length > 0 &&
				declarations.every(
					(declaration) =>
						declaresType(declaration) || takesDeclaredType(declaration)
				)
			);
		};

		/**
		 * Tells whether a type names one of a signature's own type parameters,
		 * other than one this project's source defaults to `any` on purpose;
		 * lib's `new <T = any>()` of `Set` still counts.
		 * @param {Set<ts.Type>} parameters the signature's type parameters
		 * @param {ts.Type} type the declared type
		 * @returns {boolean} true when it does
		 */
		const namesTypeParameter = (parameters, type) => {
			if (type.flags & ts.TypeFlags.TypeParameter) {
				if (!parameters.has(type)) return false;
				const defaultType = type.getDefault();
				if (!defaultType || !(defaultType.flags & ts.TypeFlags.Any)) {
					return true;
				}
				const declarations = type.symbol && type.symbol.getDeclarations();
				return (
					!declarations ||
					declarations.every(
						(declaration) => declaration.getSourceFile().isDeclarationFile
					)
				);
			}
			return (
				type.isUnionOrIntersection() &&
				type.types.some((member) => namesTypeParameter(parameters, member))
			);
		};

		/**
		 * @param {ts.Type} type a type
		 * @returns {type is ts.TypeReference} whether it is a generic reference, such as `Map<K, V>` or an array
		 */
		const isTypeReference = (type) =>
			Boolean(
				type.flags & ts.TypeFlags.Object &&
				/** @type {ts.ObjectType} */ (type).objectFlags &
					ts.ObjectFlags.Reference
			);

		/**
		 * Tells whether a call's type sets `any` where the type it was declared
		 * with names a type parameter of the call, walking both side by side.
		 * @param {Set<ts.Type>} parameters the call's type parameters
		 * @param {ts.Type} declared the declared return type
		 * @param {ts.Type} actual the type the call has
		 * @param {number} depth how deep the walk is
		 * @returns {boolean} true when a type parameter became `any`
		 */
		const setsParameterToAny = (parameters, declared, actual, depth) => {
			if (depth > 4) return false;
			if (actual.flags & ts.TypeFlags.Any) {
				return namesTypeParameter(parameters, declared);
			}
			/** @type {readonly ts.Type[] | undefined} */
			let declaredArguments;
			/** @type {readonly ts.Type[] | undefined} */
			let actualArguments;
			if (declared.aliasSymbol && declared.aliasSymbol === actual.aliasSymbol) {
				declaredArguments = declared.aliasTypeArguments;
				actualArguments = actual.aliasTypeArguments;
			} else if (
				isTypeReference(declared) &&
				isTypeReference(actual) &&
				declared.target === actual.target
			) {
				declaredArguments = typeChecker.getTypeArguments(declared);
				actualArguments = typeChecker.getTypeArguments(actual);
			} else if (
				declared.isUnionOrIntersection() &&
				actual.isUnionOrIntersection()
			) {
				return declared.types.some((member) =>
					actual.types.some((actualMember) =>
						setsParameterToAny(parameters, member, actualMember, depth + 1)
					)
				);
			}
			if (!declaredArguments || !actualArguments) return false;
			const { length } = actualArguments;
			return declaredArguments.some(
				(argument, i) =>
					i < length &&
					setsParameterToAny(
						parameters,
						argument,
						actualArguments[i],
						depth + 1
					)
			);
		};

		/**
		 * Tells whether a `new` or call expression gets a type argument TypeScript
		 * fills with `any`, such as `new Map()`, where nothing declares the type it should have.
		 * @param {ts.NewExpression | ts.CallExpression} node the expression
		 * @returns {boolean} true when it does
		 */
		const fillsTypeArgumentWithAny = (node) => {
			let { parent } = node;
			while (ts.isParenthesizedExpression(parent)) parent = parent.parent;
			// A discarded result reads nothing, and a declared type receiving it types it.
			if (
				ts.isExpressionStatement(parent) ||
				ts.isVoidExpression(parent) ||
				typeChecker.getContextualType(node)
			) {
				return false;
			}
			const signature = typeChecker.getResolvedSignature(node);
			if (!signature) return false;
			const type = typeChecker.getTypeAtLocation(node);
			const { target } =
				/** @type {ts.Signature & { target?: ts.Signature }} */ (signature);
			if (target) {
				return Boolean(
					target.typeParameters &&
					setsParameterToAny(
						new Set(target.typeParameters),
						typeChecker.getReturnTypeOfSignature(target),
						type,
						0
					)
				);
			}
			// `new Map()` takes lib's `new (): Map<any, any>`, which has no type parameter.
			const { declaration } = signature;
			return (
				ts.isNewExpression(node) &&
				declaration !== undefined &&
				declaration.getSourceFile().isDeclarationFile &&
				isTypeReference(type) &&
				typeChecker
					.getTypeArguments(type)
					.some((argument) => Boolean(argument.flags & ts.TypeFlags.Any))
			);
		};

		/**
		 * Returns an identifier's type. The name `x` in `this.x = value` declares
		 * the property, and TypeScript answers `any` there, so it is read off
		 * the property's symbol instead.
		 * @param {ts.Node} node the identifier or `this`
		 * @returns {ts.Type} its type
		 */
		const getIdentifierType = (node) => {
			const { parent } = node;
			if (
				ts.isPropertyAccessExpression(parent) &&
				parent.name === node &&
				ts.isBinaryExpression(parent.parent) &&
				parent.parent.left === parent &&
				parent.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken
			) {
				const symbol = typeChecker.getSymbolAtLocation(parent);
				if (symbol) return typeChecker.getTypeOfSymbol(symbol);
			}
			// A property name in an object literal holds the value written for it.
			if (ts.isPropertyAssignment(parent) && parent.name === node) {
				return typeChecker.getTypeAtLocation(parent.initializer);
			}
			return typeChecker.getTypeAtLocation(node);
		};

		/**
		 * @param {ts.Node} node the node to be walked
		 * @returns {void}
		 */
		const walkNode = (node) => {
			if (ts.isIdentifier(node) || node.kind === ts.SyntaxKind.ThisKeyword) {
				const type = getIdentifierType(node);

				if (!type) {
					return;
				}

				const { line, character } = ts.getLineAndCharacterOfPosition(
					sourceFile,
					node.getStart()
				);
				const { line: lineEnd, character: characterEnd } =
					ts.getLineAndCharacterOfPosition(sourceFile, node.getEnd());

				let isExternal = false;

				/**
				 * @param {ts.Type} type the type to be checked
				 * @returns {void}
				 */
				const checkDecls = (type) => {
					if (!type.symbol) return;
					for (const decl of type.symbol.getDeclarations() || []) {
						const sourceFile = decl.getSourceFile();
						if (sourceFile && sourceFile.isDeclarationFile) isExternal = true;
					}
				};

				if (node.parent && ts.isPropertyAccessExpression(node.parent)) {
					const expressionType = typeChecker.getTypeAtLocation(
						node.parent.expression
					);
					checkDecls(expressionType);
				}

				const typeText = typeChecker.typeToString(type);

				if (/^(<.*>)?\(/.test(typeText)) {
					checkDecls(type);
				}

				const isTyped =
					// Ignore labeled statements
					((ts.isLabeledStatement(node.parent) ||
						ts.isBreakStatement(node.parent) ||
						ts.isContinueStatement(node.parent)) &&
						node.parent.label === node) ||
					// Ignore the namespace of a type name such as `NodeJS.WritableStream`
					(ts.isQualifiedName(node.parent) && node.parent.left === node) ||
					// Ignore `name` in `const { name: otherName } = obj;`
					(ts.isBindingElement(node.parent) &&
						node.parent.propertyName === node) ||
					// Ignore `"string".replace("s", "t")`, because the second argument can be a function with `any` types
					isReplaceMethod(node) ||
					// Ignore external types
					isExternal ||
					// Ignore where `let x;` is declared or assigned, its reads are narrowed
					isEvolvingLetWrite(node) ||
					// Should be not `any` and don't include `any` in types
					(!(type.flags & ts.TypeFlags.Any) && !/\bany\b/.test(typeText));

				rep.statementMap[statementIndex] = {
					start: {
						line: line + 1,
						column: character
					},
					end: {
						line: lineEnd + 1,
						column: characterEnd - 1
					}
				};
				rep.s[statementIndex] = isTyped ? typeText.length : 0;
				if (
					!isTyped &&
					inferredAny &&
					type.flags & ts.TypeFlags.Any &&
					!isDeclaredAny(node)
				) {
					inferredAny.push({
						line: line + 1,
						name: node.getText(sourceFile)
					});
				}
				statementIndex++;
			}

			if (
				inferredAny &&
				(ts.isNewExpression(node) || ts.isCallExpression(node)) &&
				fillsTypeArgumentWithAny(node)
			) {
				const { line } = ts.getLineAndCharacterOfPosition(
					sourceFile,
					node.getStart()
				);
				const callee = node.expression.getText(sourceFile);
				inferredAny.push({
					line: line + 1,
					name: ts.isNewExpression(node) ? `new ${callee}()` : `${callee}()`
				});
			}

			node.forEachChild(walkNode);
		};

		sourceFile.forEachChild(walkNode);
	}
}

const outputDirectory = path.resolve(root, "coverage");
fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(
	path.resolve(outputDirectory, "coverage-types.json"),
	JSON.stringify(coverageReport),
	"utf8"
);

/** @type {Record<string, number>} */
const headAny = {};
for (const [file, list] of Object.entries(inferredAnyByFile)) {
	if (list.length > 0) headAny[file] = list.length;
}
// A run on the base commit writes these for `--base-any` to compare with.
fs.writeFileSync(
	path.resolve(outputDirectory, "inferred-any.json"),
	JSON.stringify(headAny),
	"utf8"
);
/** @type {Record<string, number> | undefined} */
const baseAnyCounts = baseAny
	? JSON.parse(fs.readFileSync(path.resolve(baseAny), "utf8"))
	: undefined;

// Escape-hatch types: how often each one stands in a type in `lib/`, `hot/`
// and `declarations/`, against `--base` when given, for the report the pull request shows.
const ESCAPE_HATCHES = [
	"EXPECTED_ANY",
	"EXPECTED_OBJECT",
	"EXPECTED_FUNCTION",
	"unknown"
];
/** @typedef {Record<string, number>} EscapeHatchCounts */

/**
 * Returns the escape hatch a type node writes: an `EXPECTED_*` alias, `unknown`
 * or a raw type one alias stands for. An `object` constraining or testing a
 * type, as in `@template {object} T`, says only that it is no primitive.
 * @param {ts.Node} node the node
 * @returns {string | undefined} the escape hatch it counts as
 */
const escapeHatchOf = (node) => {
	switch (node.kind) {
		case ts.SyntaxKind.AnyKeyword:
		case ts.SyntaxKind.JSDocAllType:
		case ts.SyntaxKind.JSDocUnknownType:
			return "EXPECTED_ANY";
		case ts.SyntaxKind.UnknownKeyword:
			return "unknown";
		case ts.SyntaxKind.ObjectKeyword: {
			const { parent } = node;
			const isBound =
				(ts.isTypeParameterDeclaration(parent) && parent.constraint === node) ||
				(ts.isConditionalTypeNode(parent) && parent.extendsType === node) ||
				(ts.isJSDocTypeExpression(parent) &&
					ts.isJSDocTemplateTag(parent.parent) &&
					parent.parent.constraint === parent);
			return isBound ? undefined : "EXPECTED_OBJECT";
		}
	}
	if (
		!ts.isTypeReferenceNode(node) ||
		!ts.isIdentifier(node.typeName) ||
		node.typeArguments
	) {
		return undefined;
	}
	switch (node.typeName.text) {
		case "EXPECTED_ANY":
		case "EXPECTED_OBJECT":
		case "EXPECTED_FUNCTION":
			return node.typeName.text;
		case "Object":
			return "EXPECTED_OBJECT";
		case "Function":
			return "EXPECTED_FUNCTION";
	}
	return undefined;
};

/**
 * Counts the escape-hatch types of a file, in its JSDoc and TypeScript types alike.
 * @param {string} source the file's source
 * @param {string} file the file, whose extension tells TypeScript from JavaScript
 * @returns {EscapeHatchCounts} counts by name
 */
const countEscapeHatches = (source, file) => {
	const sourceFile = ts.createSourceFile(
		file,
		source,
		ts.ScriptTarget.Latest,
		true,
		file.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.JS
	);
	/** @type {EscapeHatchCounts} */
	const counts = {};
	/**
	 * @param {ts.Node} node the node to count in
	 * @returns {void}
	 */
	const visit = (node) => {
		const name = escapeHatchOf(node);
		if (name) counts[name] = (counts[name] || 0) + 1;
		// JSDoc hangs off the node it documents rather than being one of its children.
		const { jsDoc } = /** @type {ts.Node & { jsDoc?: ts.JSDoc[] }} */ (node);
		if (jsDoc) for (const comment of jsDoc) visit(comment);
		ts.forEachChild(node, visit);
	};
	visit(sourceFile);
	return counts;
};

/**
 * Returns the escape-hatch counts of every file, from the working tree or from a git revision.
 * @param {string=} revision a git revision, or nothing for the working tree
 * @returns {Record<string, EscapeHatchCounts>} counts by file
 */
const countAllEscapeHatches = (revision) => {
	const git = (/** @type {string[]} */ ...args) =>
		execFileSync("git", args, {
			cwd: root,
			encoding: "utf8",
			maxBuffer: 1024 * 1024 * 1024
		});
	const files = git(
		"ls-files",
		...(revision ? ["--with-tree", revision] : []),
		"--",
		...ESCAPE_HATCH_DIRECTORIES
	)
		.split("\n")
		.filter((file) => file.endsWith(".js") || file.endsWith(".ts"));
	/** @type {Record<string, EscapeHatchCounts>} */
	const result = {};
	for (const file of files) {
		let source;
		try {
			source = revision
				? git("show", `${revision}:${file}`)
				: fs.readFileSync(path.resolve(root, file), "utf8");
		} catch (_err) {
			// Listed by the tree but not present on this side.
			continue;
		}
		const counts = countEscapeHatches(source, file);
		if (Object.keys(counts).length > 0) result[file] = counts;
	}
	return result;
};

/**
 * Sums the counts of every file by name.
 * @param {Record<string, EscapeHatchCounts>} byFile counts by file
 * @returns {EscapeHatchCounts} totals by name
 */
const totalEscapeHatches = (byFile) => {
	/** @type {EscapeHatchCounts} */
	const totals = {};
	for (const name of ESCAPE_HATCHES) totals[name] = 0;
	for (const counts of Object.values(byFile)) {
		for (const name of ESCAPE_HATCHES) totals[name] += counts[name] || 0;
	}
	return totals;
};

/**
 * Renders a change, red when it grows and green when it shrinks.
 * @param {number} change the change
 * @returns {string} the change as the report shows it
 */
const formatChange = (change) =>
	change > 0 ? `🔴 +${change}` : change < 0 ? `🟢 −${-change}` : "—";

/**
 * Returns the share of a file's lines whose identifiers are typed, as lcov counts lines.
 * @param {FileReport} fileReport the file's report
 * @returns {{ lines: number, typed: number }} the line counts
 */
const lineCoverage = (fileReport) => {
	/** @type {Map<number, number>} */
	const lines = new Map();
	for (const [index, count] of Object.entries(fileReport.s)) {
		const { line } = fileReport.statementMap[Number(index)].start;
		lines.set(line, Math.max(lines.get(line) || 0, count));
	}
	let typed = 0;
	for (const count of lines.values()) if (count > 0) typed++;
	return { lines: lines.size, typed };
};

/**
 * Formats a share as a percentage.
 * @param {number} part the part
 * @param {number} whole the whole
 * @returns {string} the percentage, with two decimals
 */
const percent = (part, whole) =>
	whole === 0 ? "100%" : `${((100 * part) / whole).toFixed(2)}%`;

/** @type {Map<string, { lines: number, typed: number }>} */
const coverageByFile = new Map();
let allLines = 0;
let allTyped = 0;
for (const fileReport of Object.values(coverageReport)) {
	const coverage = lineCoverage(fileReport);
	allLines += coverage.lines;
	allTyped += coverage.typed;
	coverageByFile.set(
		path.relative(root, fileReport.path).split(path.sep).join("/"),
		coverage
	);
}

const headCounts = countAllEscapeHatches();
const headTotals = totalEscapeHatches(headCounts);
const baseCounts = base ? countAllEscapeHatches(base) : undefined;
const baseTotals = baseCounts ? totalEscapeHatches(baseCounts) : undefined;

/**
 * Returns a file's count of one escape hatch.
 * @param {Record<string, EscapeHatchCounts> | undefined} byFile counts by file
 * @param {string} file the file
 * @param {string} name the escape hatch
 * @returns {number} the count
 */
const countOf = (byFile, file, name) =>
	(byFile && byFile[file] && byFile[file][name]) || 0;

/**
 * Returns a file's count of inferred `any`.
 * @param {Record<string, number> | undefined} byFile counts by file
 * @param {string} file the file
 * @returns {number} the count
 */
const anyOf = (byFile, file) => (byFile && byFile[file]) || 0;

/**
 * Sums the counts of every file.
 * @param {Record<string, number>} byFile counts by file
 * @returns {number} the total
 */
const totalAny = (byFile) =>
	Object.values(byFile).reduce((sum, count) => sum + count, 0);

/**
 * Renders a count with its change against the base, or nothing when it is zero and unchanged.
 * @param {number} head the count at the head
 * @param {number | undefined} baseCount the count at the base, when there is one
 * @returns {string} the cell
 */
const countCell = (head, baseCount) => {
	const change = baseCount === undefined ? 0 : head - baseCount;
	if (change === 0) return head === 0 ? "" : `${head}`;
	return `${head} (${formatChange(change)})`;
};

let report = `Typed lines: **${percent(allTyped, allLines)}** (${allTyped} of ${allLines})\n\n`;
report += baseTotals
	? "| Escape hatch | Base | Head | Change |\n| :-- | --: | --: | --: |\n"
	: "| Escape hatch | Count |\n| :-- | --: |\n";
for (const name of ESCAPE_HATCHES) {
	report += baseTotals
		? `| \`${name}\` | ${baseTotals[name]} | ${headTotals[name]} | ${formatChange(
				headTotals[name] - baseTotals[name]
			)} |\n`
		: `| \`${name}\` | ${headTotals[name]} |\n`;
}
if (baseTotals && baseAnyCounts) {
	const baseAnyTotal = totalAny(baseAnyCounts);
	const headAnyTotal = totalAny(headAny);
	report += `| inferred \`any\` | ${baseAnyTotal} | ${headAnyTotal} | ${formatChange(
		headAnyTotal - baseAnyTotal
	)} |\n`;
} else {
	report += baseTotals
		? `| inferred \`any\` | — | ${totalAny(headAny)} | — |\n`
		: `| inferred \`any\` | ${totalAny(headAny)} |\n`;
}
report +=
	"\nEscape hatches count the raw types they stand for too: `any`, `object` and `Function`. Inferred `any` counts the identifiers whose type TypeScript infers as `any` though no JSDoc names it, and the `new` or generic calls whose type arguments it fills with `any`, such as `const map = new Map()`.\n";

const header = `| File | Typed lines | ${ESCAPE_HATCHES.map((name) => `\`${name}\``).join(" | ")} | inferred \`any\` |\n| :-- | --: |${" --: |".repeat(ESCAPE_HATCHES.length + 1)}\n`;

/**
 * Renders a file's row: its coverage, each escape hatch and its inferred `any`, with their changes against the base.
 * @param {string} file the file
 * @returns {string} the row
 */
const fileRow = (file) => {
	const coverage = coverageByFile.get(file);
	const cells = ESCAPE_HATCHES.map((name) =>
		countCell(
			countOf(headCounts, file, name),
			baseCounts ? countOf(baseCounts, file, name) : undefined
		)
	);
	cells.push(
		countCell(
			anyOf(headAny, file),
			baseAnyCounts ? anyOf(baseAnyCounts, file) : undefined
		)
	);
	return `| \`${file}\` | ${coverage ? percent(coverage.typed, coverage.lines) : "—"} | ${cells.join(" | ")} |`;
};

if (baseCounts) {
	const changed = [
		...new Set([
			...Object.keys(baseCounts),
			...Object.keys(headCounts),
			...Object.keys(baseAnyCounts || {}),
			...Object.keys(headAny)
		])
	]
		.filter(
			(file) =>
				ESCAPE_HATCHES.some(
					(name) =>
						countOf(headCounts, file, name) !== countOf(baseCounts, file, name)
				) ||
				(baseAnyCounts !== undefined &&
					anyOf(headAny, file) !== anyOf(baseAnyCounts, file))
		)
		.sort();
	report +=
		changed.length > 0
			? `\n#### Changed by this pull request\n\n${header}${changed.map(fileRow).join("\n")}\n`
			: baseAnyCounts
				? "\nThis pull request adds or removes no escape-hatch type or inferred `any`.\n"
				: "\nThis pull request adds or removes no escape-hatch type. Inferred `any` was not compared, as `--base-any` was not given.\n";

	// Where each inferred `any` stands in the files this pull request gave more of them.
	const worse = baseAnyCounts
		? changed.filter(
				(file) => anyOf(headAny, file) > anyOf(baseAnyCounts, file)
			)
		: [];
	if (worse.length > 0) {
		/** @type {string[]} */
		const lines = [];
		for (const file of worse) {
			for (const { line, name } of inferredAnyByFile[file] || []) {
				lines.push(`- \`${file}:${line}\` \`${name}\``);
			}
		}
		report += `\n<details><summary>Inferred \`any\` in the files this pull request adds some to</summary>\n\n${lines.join("\n")}\n\n</details>\n`;
	}
}

// Every file still owing a real type: an escape hatch, an inferred `any` or an untyped line.
const remaining = [
	...new Set([
		...Object.keys(headCounts),
		...Object.keys(headAny),
		...[...coverageByFile]
			.filter(
				([file, { lines, typed }]) =>
					typed < lines &&
					ESCAPE_HATCH_DIRECTORIES.some((directory) =>
						file.startsWith(directory)
					)
			)
			.map(([file]) => file)
	])
].sort((a, b) => {
	const total = (/** @type {string} */ file) =>
		ESCAPE_HATCHES.reduce(
			(sum, name) => sum + countOf(headCounts, file, name),
			anyOf(headAny, file)
		);
	return total(b) - total(a) || (a < b ? -1 : 1);
});
report += `\n<details><summary>${remaining.length} file(s) in <code>lib/</code>, <code>hot/</code> and <code>declarations/</code> still use an escape hatch, infer \`any\` or have untyped lines</summary>\n\n${header}${remaining.map(fileRow).join("\n")}\n\n</details>\n`;

fs.writeFileSync(
	path.resolve(outputDirectory, "types-coverage.md"),
	`## Types Coverage\n\n${report}`,
	"utf8"
);
console.log(report);
