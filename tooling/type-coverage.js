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
const { base, baseCounts: baseCountsFile, root } = require("./argv");

const createTypeScriptProgram = require("./typescript-program");

/**
 * Drops the text of string and template literal types from a printed type,
 * keeping the types in template placeholders: `"any"` and `isn't ${T}` leave
 * nothing but `T`. Scans once, so a quote inside one literal never opens another.
 * @param {string} typeText printed type
 * @returns {string} the type with literal text removed
 */
const maskLiterals = (typeText) => {
	let out = "";
	let i = 0;
	while (i < typeText.length) {
		const char = typeText[i];
		if (char === '"' || char === "'") {
			i++;
			while (i < typeText.length && typeText[i] !== char) {
				i += typeText[i] === "\\" ? 2 : 1;
			}
			i++;
			out += '""';
		} else if (char === "`") {
			i++;
			while (i < typeText.length && typeText[i] !== "`") {
				if (typeText[i] === "\\") {
					i += 2;
				} else if (typeText[i] === "$" && typeText[i + 1] === "{") {
					const start = i + 2;
					let depth = 1;
					i = start;
					while (i < typeText.length && depth > 0) {
						if (typeText[i] === "{") depth++;
						else if (typeText[i] === "}") depth--;
						i++;
					}
					out += ` ${maskLiterals(typeText.slice(start, i - 1))} `;
				} else {
					i++;
				}
			}
			i++;
		} else {
			out += char;
			i++;
		}
	}
	return out;
};

/**
 * Tells whether a printed type uses `any` as a type. The word also shows up
 * where it is no type at all: inside a string or template literal type, and as
 * the name of a parameter or property, such as `(any: SourceBucket) => ...`.
 * @param {string} typeText printed type
 * @returns {boolean} true when `any` appears as a type
 */
const mentionsAny = (typeText) =>
	/\bany\b/.test(maskLiterals(typeText).replace(/\bany\??:/g, "_:"));

// `hot/` is a project of its own, so its files reach only that program.
/** @type {[ts.SourceFile, ts.TypeChecker, ts.Program][]} */
const sourceFiles = [];
for (const configName of ["tsconfig.json", "tsconfig.hot.json"]) {
	const program = createTypeScriptProgram(configName);
	const checker = program.getTypeChecker();
	for (const sourceFile of program.getSourceFiles()) {
		sourceFiles.push([sourceFile, checker, program]);
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

// Directories whose escape hatches, `any` and untyped identifiers the report counts.
const ESCAPE_HATCH_DIRECTORIES = ["lib/", "hot/", "declarations/", "bin/"];

/**
 * @typedef {object} Spot
 * @property {number} line the line, from 1
 * @property {string} name the identifier, call or type written there
 * @property {string=} type the type that makes an untyped identifier untyped
 */

/** @type {Record<string, Spot[]>} */
const inferredAnyByFile = {};
/** @type {Record<string, Spot[]>} */
const untypedByFile = {};

/** @type {Set<string>} */
const walkedFiles = new Set();
for (const [sourceFile, typeChecker, program] of sourceFiles) {
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
		const counted = ESCAPE_HATCH_DIRECTORIES.some((directory) =>
			relativeFile.startsWith(directory)
		);
		/** @type {Spot[] | undefined} */
		const inferredAny = counted
			? (inferredAnyByFile[relativeFile] = [])
			: undefined;
		/** @type {Spot[] | undefined} */
		const untyped = counted ? (untypedByFile[relativeFile] = []) : undefined;

		/**
		 * Tells whether a node is `prototype` in `C.prototype` of a class or other constructor `C`.
		 * @param {ts.Node} node the identifier
		 * @returns {boolean} true when it is
		 */
		const isClassPrototype = (node) => {
			const { parent } = node;
			if (
				!ts.isIdentifier(node) ||
				node.text !== "prototype" ||
				!ts.isPropertyAccessExpression(parent) ||
				parent.name !== node
			) {
				return false;
			}
			// A `prototype` someone declared, as in `{ new (): T, prototype: any }`, is theirs.
			const symbol = typeChecker.getSymbolAtLocation(node);
			const declarations = (symbol && symbol.getDeclarations()) || [];
			if (
				declarations.some(
					(declaration) =>
						("type" in declaration && declaration.type !== undefined) ||
						ts.getJSDocType(declaration) !== undefined
				)
			) {
				return false;
			}
			// Any constructor value, a class name or a variable holding classes.
			const type = typeChecker.getTypeAtLocation(parent.expression);
			return (type.isUnion() ? type.types : [type]).every(
				(member) => member.getConstructSignatures().length > 0
			);
		};

		/**
		 * Tells whether a node is `module` or `exports` in `module.exports`.
		 * @param {ts.Node} node the identifier
		 * @returns {boolean} true when it is
		 */
		const isModuleExports = (node) => {
			const access = ts.isPropertyAccessExpression(node.parent)
				? node.parent
				: undefined;
			return Boolean(
				access &&
				ts.isIdentifier(access.expression) &&
				access.expression.text === "module" &&
				access.name.text === "exports"
			);
		};

		/**
		 * Prints a type in full: a shortened union, such as `A | ... 14 more ... | B`,
		 * could hide the member that holds an `any`.
		 * @param {ts.Type} type the type
		 * @returns {string} the printed type
		 */
		const printType = (type) =>
			typeChecker.typeToString(
				type,
				undefined,
				ts.TypeFormatFlags.NoTruncation
			);

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
		 * Tells whether a declaration file is the platform's own: TypeScript's
		 * built-in lib or Node.js's `@types/node`. The `any` they write in their
		 * signatures, such as a stream's `chunk: any`, is theirs; other
		 * dependencies, such as tapable, still count.
		 * @param {ts.SourceFile} sourceFile the declaration's file
		 * @returns {boolean} true when the platform declares it
		 */
		const isPlatformFile = (sourceFile) =>
			program.isSourceFileDefaultLibrary(sourceFile) ||
			/[\\/]node_modules[\\/]@types[\\/]node[\\/]/.test(sourceFile.fileName);

		/**
		 * Tells whether an identifier names a member of TypeScript's built-in lib
		 * whose own signature carries the `any`, such as the replacer of
		 * `String#replace` or the `thisArg?: any` of `Array#map`. A receiver typed
		 * with `any`, such as `any[]` in `list.push`, is this project's and counts.
		 * @param {ts.Node} node the identifier
		 * @returns {boolean} true when the `any` comes from the built-in lib
		 */
		const isBuiltinAny = (node) => {
			// A literal's key takes the property its declared type gives it, such as `PropertyDescriptor#get`.
			const symbol =
				declaredProperty(node) || typeChecker.getSymbolAtLocation(node);
			const declarations = symbol && symbol.getDeclarations();
			if (
				!declarations ||
				declarations.length === 0 ||
				!declarations.every((declaration) =>
					isPlatformFile(declaration.getSourceFile())
				)
			) {
				return false;
			}
			const { parent } = node;
			const isMember =
				ts.isPropertyAccessExpression(parent) && parent.name === node;
			if (isMember) {
				const receiver = typeChecker.getTypeAtLocation(parent.expression);
				if (
					receiver.flags & ts.TypeFlags.Any ||
					mentionsAny(printType(receiver))
				) {
					return false;
				}
			}
			return true;
		};

		/**
		 * Tells whether an identifier calls a built-in through an overload that
		 * returns `any`, such as `new (arrayLength?: number): any[]` of `Array`,
		 * while a generic overload could type the result and no declared type,
		 * such as the JSDoc type of the variable it is assigned to, receives it.
		 * @param {ts.Node} node the identifier
		 * @returns {boolean} true when the call should take the generic overload
		 */
		const landsOnAnyOverload = (node) => {
			if (!ts.isIdentifier(node)) return false;
			const { parent } = node;
			const callee =
				ts.isPropertyAccessExpression(parent) && parent.name === node
					? parent
					: node;
			const call = callee.parent;
			if (
				!(ts.isCallExpression(call) || ts.isNewExpression(call)) ||
				call.expression !== callee
			) {
				return false;
			}
			let { parent: user } = call;
			while (ts.isParenthesizedExpression(user)) user = user.parent;
			// A discarded result reads nothing, and a declared type receiving it types it.
			if (
				ts.isExpressionStatement(user) ||
				ts.isVoidExpression(user) ||
				typeChecker.getContextualType(call)
			) {
				return false;
			}
			const signature = typeChecker.getResolvedSignature(call);
			const declaration = signature && signature.declaration;
			/**
			 * @param {ts.Declaration | undefined} declaration a signature's declaration
			 * @returns {boolean} true when it declares type parameters
			 */
			const isGeneric = (declaration) =>
				declaration !== undefined &&
				ts.isFunctionLike(declaration) &&
				ts.getEffectiveTypeParameterDeclarations(declaration).length > 0;
			if (
				!declaration ||
				!ts.isFunctionLike(declaration) ||
				!isPlatformFile(declaration.getSourceFile()) ||
				isGeneric(declaration) ||
				!declaration.type
			) {
				return false;
			}
			// The `any` must be the overload's own, not one of the receiver's, as in `anyList.filter(…)`.
			/** @type {(node: ts.Node) => boolean} */
			const writesAny = (node) =>
				node.kind === ts.SyntaxKind.AnyKeyword ||
				Boolean(ts.forEachChild(node, writesAny));
			if (!writesAny(declaration.type)) return false;
			const calleeType = typeChecker.getTypeAtLocation(callee);
			const overloads = ts.isNewExpression(call)
				? calleeType.getConstructSignatures()
				: calleeType.getCallSignatures();
			return overloads.some((overload) => isGeneric(overload.declaration));
		};

		/**
		 * Tells whether a declaration comes from TypeScript's built-in lib.
		 * @param {ts.Symbol | undefined} symbol the symbol
		 * @returns {boolean} true when every declaration is in the built-in lib
		 */
		const isBuiltinSymbol = (symbol) => {
			const declarations = symbol && symbol.getDeclarations();
			return Boolean(
				declarations &&
				declarations.length > 0 &&
				declarations.every((declaration) =>
					isPlatformFile(declaration.getSourceFile())
				)
			);
		};

		/**
		 * Tells whether type arguments hold an `any` of this project's. An `any`
		 * a built-in generic gets from its own default, such as the `TReturn` of
		 * `Iterator<T>`, is TypeScript's.
		 * @param {readonly ts.Type[]} typeArguments the type arguments
		 * @param {readonly ts.TypeParameter[] | undefined} typeParameters the parameters they fill
		 * @param {boolean} builtin whether the generic is a built-in one
		 * @param {number} depth how deep the walk is
		 * @returns {boolean} true when one does
		 */
		const argumentsHaveOwnAny = (
			typeArguments,
			typeParameters,
			builtin,
			depth
		) =>
			typeArguments.some((argument, i) => {
				if (builtin && argument.flags & ts.TypeFlags.Any) {
					const defaultType =
						typeParameters &&
						typeParameters[i] &&
						typeParameters[i].getDefault();
					if (defaultType && defaultType.flags & ts.TypeFlags.Any) return false;
				}
				return hasOwnAny(argument, depth + 1);
			});

		/**
		 * Tells whether a type's `any` sits only in an index signature, as in
		 * `Record<string, any>` or `{ [key: string]: any }`: the fallback that
		 * keeps an object open for keys its declared fields do not name.
		 * @param {ts.Type} type the type
		 * @returns {boolean} true when it does
		 */
		const isOpenFallback = (type) => {
			const indexInfos = typeChecker.getIndexInfosOfType(type);
			return (
				indexInfos.length > 0 &&
				indexInfos.every((info) => Boolean(info.type.flags & ts.TypeFlags.Any))
			);
		};

		/**
		 * Tells whether a type holds an `any` of this project's, walking what its
		 * printed form shows: the arguments of a named type and the members of an
		 * anonymous one. What it cannot walk counts as its printed form says.
		 * @param {ts.Type} type the type
		 * @param {number} depth how deep the walk is
		 * @returns {boolean} true when it does
		 */
		const hasOwnAny = (type, depth) => {
			if (type.flags & ts.TypeFlags.Any) return true;
			if (depth > 8) return mentionsAny(printType(type));
			// A built-in alias before its union: `IteratorResult<T, TReturn = any>` defaults its own `any`.
			if (type.aliasSymbol && isBuiltinSymbol(type.aliasSymbol)) {
				const typeArguments = type.aliasTypeArguments || [];
				const declaration = (type.aliasSymbol.getDeclarations() || [])[0];
				const typeParameters =
					declaration &&
					ts.isTypeAliasDeclaration(declaration) &&
					declaration.typeParameters
						? declaration.typeParameters.map(
								(parameter) =>
									/** @type {ts.TypeParameter} */ (
										typeChecker.getTypeAtLocation(parameter)
									)
							)
						: undefined;
				return argumentsHaveOwnAny(typeArguments, typeParameters, true, depth);
			}
			if (type.isUnion()) {
				return type.types.some((member) => hasOwnAny(member, depth + 1));
			}
			if (type.isIntersection()) {
				// Declared fields with an open fallback, such as `KnownBuildInfo & Record<string, any>`:
				// the fallback types no declared field, and a read of any other key is counted on its own.
				const declaresFields = type.getProperties().length > 0;
				// A member with fields of its own is still walked; only its fallback is left out.
				return type.types.some(
					(member) =>
						!(
							declaresFields &&
							isOpenFallback(member) &&
							member.getProperties().length === 0
						) && hasOwnAny(member, depth + 1)
				);
			}
			if (type.aliasSymbol) {
				return argumentsHaveOwnAny(
					type.aliasTypeArguments || [],
					undefined,
					false,
					depth
				);
			}
			if (isTypeReference(type)) {
				const { target } = type;
				return argumentsHaveOwnAny(
					typeChecker.getTypeArguments(type),
					target.typeParameters,
					isBuiltinSymbol(target.symbol),
					depth
				);
			}
			if (
				type.flags & ts.TypeFlags.Object &&
				/** @type {ts.ObjectType} */ (type).objectFlags &
					ts.ObjectFlags.Anonymous
			) {
				return (
					type
						.getProperties()
						.some((property) =>
							hasOwnAny(typeChecker.getTypeOfSymbol(property), depth + 1)
						) ||
					[...type.getCallSignatures(), ...type.getConstructSignatures()].some(
						(signature) => {
							const predicate =
								typeChecker.getTypePredicateOfSignature(signature);
							return (
								(signature.getTypeParameters() || []).some((parameter) => {
									const constraint = parameter.getConstraint();
									const defaultType = parameter.getDefault();
									return (
										(constraint !== undefined &&
											hasOwnAny(constraint, depth + 1)) ||
										(defaultType !== undefined &&
											hasOwnAny(defaultType, depth + 1))
									);
								}) ||
								signature
									.getParameters()
									.some((parameter) =>
										hasOwnAny(typeChecker.getTypeOfSymbol(parameter), depth + 1)
									) ||
								(predicate !== undefined &&
									predicate.type !== undefined &&
									hasOwnAny(predicate.type, depth + 1)) ||
								hasOwnAny(signature.getReturnType(), depth + 1)
							);
						}
					) ||
					// Beside declared fields an `any` index signature is the open fallback, as above.
					((type.getProperties().length === 0 || !isOpenFallback(type)) &&
						typeChecker
							.getIndexInfosOfType(type)
							.some((info) => hasOwnAny(info.type, depth + 1)))
				);
			}
			return mentionsAny(printType(type));
		};

		/**
		 * Tells whether a node names a variable an empty array literal starts
		 * with no declared type, such as `const list = []`. TypeScript evolves
		 * its type from what is pushed, but the declaration itself stays `any[]`.
		 * @param {ts.Node} node the identifier
		 * @returns {boolean} true at such a declaration
		 */
		const isUntypedEmptyArray = (node) => {
			const { parent } = node;
			if (!ts.isVariableDeclaration(parent) || parent.name !== node) {
				return false;
			}
			let { initializer } = parent;
			while (initializer && ts.isParenthesizedExpression(initializer)) {
				initializer = initializer.expression;
			}
			return Boolean(
				initializer &&
				ts.isArrayLiteralExpression(initializer) &&
				initializer.elements.length === 0 &&
				!declaresType(parent)
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
				declaredProperty(node) ||
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
		 * Returns the property an object literal's declared type gives a name written in it.
		 * @param {ts.Node} node the identifier
		 * @returns {ts.Symbol | undefined} the declared property
		 */
		const declaredProperty = (node) => {
			const { parent } = node;
			if (
				!ts.isIdentifier(node) ||
				!ts.isPropertyAssignment(parent) ||
				parent.name !== node
			) {
				return undefined;
			}
			const declared = typeChecker.getContextualType(parent.parent);
			return declared && typeChecker.getPropertyOfType(declared, node.text);
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
			// A property name in an object literal has the type the literal's declared
			// type gives it, else that of the value written for it.
			if (ts.isPropertyAssignment(parent) && parent.name === node) {
				const property = declaredProperty(node);
				return property
					? typeChecker.getTypeOfSymbol(property)
					: typeChecker.getTypeAtLocation(parent.initializer);
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

				const typeText = printType(type);

				if (/^(<.*>)?\(/.test(typeText)) {
					checkDecls(type);
				}

				const isTyped =
					// A built-in call should take its generic overload over one returning `any`
					!landsOnAnyOverload(node) && // Ignore labeled statements
					(((ts.isLabeledStatement(node.parent) ||
						ts.isBreakStatement(node.parent) ||
						ts.isContinueStatement(node.parent)) &&
						node.parent.label === node) ||
						// Ignore `module.exports`, its values are counted where they are declared
						isModuleExports(node) ||
						// Ignore `C.prototype`, which TypeScript itself types with `any` type arguments
						isClassPrototype(node) ||
						// Ignore the namespace of a type name such as `NodeJS.WritableStream`
						(ts.isQualifiedName(node.parent) && node.parent.left === node) ||
						// Ignore `name` in `const { name: otherName } = obj;`
						(ts.isBindingElement(node.parent) &&
							node.parent.propertyName === node) ||
						// Ignore `"string".replace("s", "t")`, because the second argument can be a function with `any` types
						isReplaceMethod(node) ||
						// Ignore external types
						isExternal ||
						// Ignore the `any` TypeScript's built-in lib writes in its own signatures
						isBuiltinAny(node) ||
						// Ignore where `let x;` is declared or assigned, its reads are narrowed
						isEvolvingLetWrite(node) ||
						// Should be not `any` and don't include `any` in types
						(!(type.flags & ts.TypeFlags.Any) &&
							(!mentionsAny(typeText) || !hasOwnAny(type, 0))));

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
				if (!isTyped && untyped) {
					untyped.push({
						line: line + 1,
						name: node.getText(sourceFile),
						type: typeText
					});
				}
				if (
					!isTyped &&
					inferredAny &&
					((type.flags & ts.TypeFlags.Any && !isDeclaredAny(node)) ||
						isUntypedEmptyArray(node))
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

// What the report counts in `lib/`, `hot/`, `declarations/` and `bin/`, each written
// escape hatch under the type it stands for, and the identifiers left untyped.
const KINDS = /** @type {const} */ (["any", "unknown", "object", "Function"]);
/** @typedef {(typeof KINDS)[number]} Kind */
const COLUMNS = /** @type {const} */ ([...KINDS, "untyped"]);
/** @typedef {(typeof COLUMNS)[number]} Column */
/** @typedef {Partial<Record<Column, number>>} Counts */

/**
 * @typedef {object} WrittenSpot
 * @property {number} line the line, from 1
 * @property {Kind} kind the type it stands for
 * @property {string} spelling how it is written, such as `EXPECTED_ANY`
 */

/**
 * Tells whether a type node is written in a bound: a type parameter's
 * constraint, such as `@template {unknown[]} T`, or the type a conditional
 * type tests against. A bound limits what may be passed; it types no value.
 * @param {ts.Node} node the type node
 * @returns {boolean} true when it is
 */
const isInBound = (node) => {
	let child = node;
	let { parent } = node;
	while (parent) {
		if (
			(ts.isTypeParameterDeclaration(parent) && parent.constraint === child) ||
			(ts.isConditionalTypeNode(parent) && parent.extendsType === child) ||
			(ts.isJSDocTypeExpression(parent) &&
				ts.isJSDocTemplateTag(parent.parent) &&
				parent.parent.constraint === parent)
		) {
			return true;
		}
		// Stop at the end of the type, where a value's declaration begins.
		if (!ts.isTypeNode(parent) && !ts.isJSDocTypeExpression(parent)) {
			return false;
		}
		child = parent;
		parent = parent.parent;
	}
	return false;
};

/**
 * Returns the escape hatch a type node writes, as the type it stands for and
 * its spelling. An `object` constraining or testing a type, as in
 * `@template {object} T`, says only that it is no primitive.
 * @param {ts.Node} node the node
 * @returns {{ kind: Kind, spelling: string } | undefined} the escape hatch it writes
 */
const escapeHatchOf = (node) => {
	switch (node.kind) {
		case ts.SyntaxKind.AnyKeyword:
			return { kind: "any", spelling: "any" };
		case ts.SyntaxKind.JSDocAllType:
			return { kind: "any", spelling: "*" };
		case ts.SyntaxKind.JSDocUnknownType:
			return { kind: "any", spelling: "?" };
		case ts.SyntaxKind.UnknownKeyword:
			return isInBound(node)
				? undefined
				: { kind: "unknown", spelling: "unknown" };
		case ts.SyntaxKind.ObjectKeyword:
			return isInBound(node)
				? undefined
				: { kind: "object", spelling: "object" };
	}
	if (
		!ts.isTypeReferenceNode(node) ||
		!ts.isIdentifier(node.typeName) ||
		node.typeArguments
	) {
		return undefined;
	}
	const spelling = node.typeName.text;
	switch (spelling) {
		case "EXPECTED_ANY":
			return { kind: "any", spelling };
		case "EXPECTED_OBJECT":
		case "Object":
			return { kind: "object", spelling };
		case "EXPECTED_FUNCTION":
		case "Function":
			return { kind: "Function", spelling };
	}
	return undefined;
};

/**
 * Finds the escape-hatch types of a file, in its JSDoc and TypeScript types alike.
 * @param {string} source the file's source
 * @param {string} file the file, whose extension tells TypeScript from JavaScript
 * @returns {WrittenSpot[]} where each stands
 */
const findEscapeHatches = (source, file) => {
	const sourceFile = ts.createSourceFile(
		file,
		source,
		ts.ScriptTarget.Latest,
		true,
		file.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.JS
	);
	/** @type {WrittenSpot[]} */
	const spots = [];
	/**
	 * @param {ts.Node} node the node to look in
	 * @returns {void}
	 */
	const visit = (node) => {
		const escapeHatch = escapeHatchOf(node);
		if (escapeHatch) {
			const { line } = sourceFile.getLineAndCharacterOfPosition(
				node.getStart(sourceFile)
			);
			spots.push({ line: line + 1, ...escapeHatch });
		}
		// JSDoc hangs off the node it documents rather than being one of its children.
		const { jsDoc } = /** @type {ts.Node & { jsDoc?: ts.JSDoc[] }} */ (node);
		if (jsDoc) for (const comment of jsDoc) visit(comment);
		ts.forEachChild(node, visit);
	};
	visit(sourceFile);
	return spots;
};

/**
 * Returns the escape hatches of every file, from the working tree or from a git revision.
 * @param {string=} revision a git revision, or nothing for the working tree
 * @returns {Record<string, WrittenSpot[]>} spots by file
 */
const findAllEscapeHatches = (revision) => {
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
	/** @type {Record<string, WrittenSpot[]>} */
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
		const spots = findEscapeHatches(source, file);
		if (spots.length > 0) result[file] = spots;
	}
	return result;
};

const headEscapeHatches = findAllEscapeHatches();

/** @type {Record<string, Counts>} */
const headCounts = {};
/**
 * @param {Record<string, Counts>} byFile counts by file
 * @param {string} file the file
 * @param {Column} column what to add to
 * @param {number} count how many
 * @returns {void}
 */
const addCount = (byFile, file, column, count) => {
	if (count === 0) return;
	const counts = (byFile[file] = byFile[file] || {});
	counts[column] = (counts[column] || 0) + count;
};
for (const [file, spots] of Object.entries(inferredAnyByFile)) {
	addCount(headCounts, file, "any", spots.length);
}
for (const [file, spots] of Object.entries(untypedByFile)) {
	addCount(headCounts, file, "untyped", spots.length);
}

// A run on the base commit writes the counts only the type checker finds, for `--base-counts` to compare with.
fs.writeFileSync(
	path.resolve(outputDirectory, "type-counts.json"),
	JSON.stringify(headCounts),
	"utf8"
);

for (const [file, spots] of Object.entries(headEscapeHatches)) {
	for (const { kind } of spots) addCount(headCounts, file, kind, 1);
}

/** @type {Record<string, Counts> | undefined} */
let baseCounts;
if (base) {
	/** @type {Record<string, Counts>} */
	const counts = baseCountsFile
		? JSON.parse(fs.readFileSync(path.resolve(baseCountsFile), "utf8"))
		: {};
	for (const [file, spots] of Object.entries(findAllEscapeHatches(base))) {
		for (const { kind } of spots) addCount(counts, file, kind, 1);
	}
	baseCounts = counts;
}

/**
 * Returns a file's count in one column.
 * @param {Record<string, Counts> | undefined} byFile counts by file
 * @param {string} file the file
 * @param {Column} column the column
 * @returns {number} the count
 */
const countOf = (byFile, file, column) =>
	(byFile && byFile[file] && byFile[file][column]) || 0;

/**
 * Sums a column over every file.
 * @param {Record<string, Counts>} byFile counts by file
 * @param {Column} column the column
 * @returns {number} the total
 */
const totalOf = (byFile, column) =>
	Object.values(byFile).reduce((sum, counts) => sum + (counts[column] || 0), 0);

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
report += baseCounts
	? "| Kind | Base | Head | Change |\n| :-- | --: | --: | --: |\n"
	: "| Kind | Count |\n| :-- | --: |\n";
for (const column of COLUMNS) {
	const label = column === "untyped" ? "untyped" : `\`${column}\``;
	const headTotal = totalOf(headCounts, column);
	if (baseCounts) {
		const baseTotal = totalOf(baseCounts, column);
		report += `| ${label} | ${baseTotal} | ${headTotal} | ${formatChange(headTotal - baseTotal)} |\n`;
	} else {
		report += `| ${label} | ${headTotal} |\n`;
	}
}
report +=
	"\n`any` counts `EXPECTED_ANY`, a written `any` and the `any` TypeScript infers where no type is written, such as `const map = new Map()` or `const list = []`. `unknown` counts a written `unknown`; `ThrownValue`, the `unknown` a `throw` or a rejected promise hands on, is left out. `object` counts `EXPECTED_OBJECT` and `Object`, `Function` counts `EXPECTED_FUNCTION`. Untyped counts the identifiers whose type is or holds `any`, wherever it comes from; the `any` TypeScript's built-in lib and Node.js's `@types/node` write in their own signatures, such as the replacer of `String#replace` or a stream's `chunk`, is left out, and so is the open fallback beside declared fields, such as `KnownBuildInfo & Record<string, any>`, though reading a key no field declares is counted.\n";
if (base && !baseCountsFile) {
	report +=
		"\nThe base's inferred `any` and untyped identifiers were not counted, as `--base-counts` was not given.\n";
}

const header = `| File | Typed lines | ${COLUMNS.map((column) =>
	column === "untyped" ? "untyped" : `\`${column}\``
).join(" | ")} |\n| :-- | --: |${" --: |".repeat(COLUMNS.length)}\n`;

/**
 * Renders a file's row: its coverage and each count, with their changes against the base.
 * @param {string} file the file
 * @returns {string} the row
 */
const fileRow = (file) => {
	const coverage = coverageByFile.get(file);
	const cells = COLUMNS.map((column) =>
		countCell(
			countOf(headCounts, file, column),
			baseCounts ? countOf(baseCounts, file, column) : undefined
		)
	);
	return `| \`${file}\` | ${coverage ? percent(coverage.typed, coverage.lines) : "—"} | ${cells.join(" | ")} |`;
};

/**
 * Lists where a file's escape hatches, `any` and untyped identifiers stand, by line.
 * @param {string} file the file
 * @param {(column: Column) => boolean=} wanted which columns to list, all when not given
 * @returns {string[]} one item per spot
 */
const spotsOf = (file, wanted = () => true) => {
	/** @type {[number, string][]} */
	const items = [];
	for (const { line, kind, spelling } of headEscapeHatches[file] || []) {
		if (!wanted(kind)) continue;
		items.push([
			line,
			`\`${kind}\`${spelling === kind ? "" : ` (\`${spelling}\`)`}`
		]);
	}
	for (const { line, name } of wanted("any")
		? inferredAnyByFile[file] || []
		: []) {
		items.push([line, `\`any\` (inferred) \`${name}\``]);
	}
	for (const { line, name, type } of wanted("untyped")
		? untypedByFile[file] || []
		: []) {
		const shown =
			type && type.length > 100 ? `${type.slice(0, 100)}…` : type || "";
		items.push([line, `untyped \`${name}\`: \`${shown.replace(/`/g, "'")}\``]);
	}
	return items
		.sort((a, b) => a[0] - b[0])
		.map(([line, text]) => `- \`${file}:${line}\` ${text}`);
};

// A pull request comment holds at most 65536 characters.
const MAX_LISTED_SPOTS = 300;

if (baseCounts) {
	const base = baseCounts;
	const changed = [
		...new Set([...Object.keys(base), ...Object.keys(headCounts)])
	]
		.filter((file) =>
			COLUMNS.some(
				(column) =>
					countOf(headCounts, file, column) !== countOf(base, file, column)
			)
		)
		.sort();
	if (changed.length > 0) {
		report += `\n#### Changed by this pull request\n\n${header}${changed.map(fileRow).join("\n")}\n`;
		/**
		 * @param {string} file the file
		 * @param {Column} column the column
		 * @returns {boolean} whether this pull request made the column grow in the file
		 */
		const grew = (file, column) =>
			countOf(headCounts, file, column) > countOf(base, file, column);
		/**
		 * Renders spots as a collapsible list, cut short where a comment would grow too long.
		 * @param {string} summary the list's summary
		 * @param {string[]} spots the spots
		 * @param {boolean} open whether the list starts open
		 * @returns {string} the list, or nothing when there are no spots
		 */
		const spotList = (summary, spots, open) => {
			if (spots.length === 0) return "";
			const listed = spots.slice(0, MAX_LISTED_SPOTS);
			const more =
				spots.length > listed.length
					? `\n- … and ${spots.length - listed.length} more, listed in the job summary\n`
					: "";
			return `\n<details${open ? " open" : ""}><summary>${summary}</summary>\n\n${listed.join("\n")}\n${more}\n</details>\n`;
		};
		report += spotList(
			"Where this pull request adds them, in every column it grows",
			changed.flatMap((file) => spotsOf(file, (column) => grew(file, column))),
			true
		);
		report += spotList(
			"What the files this pull request changes still have",
			changed.flatMap((file) => spotsOf(file, (column) => !grew(file, column))),
			false
		);
	} else {
		report +=
			"\nThis pull request adds or removes no escape hatch, `any` or untyped identifier.\n";
	}
}

// Every file still owing a real type.
const remaining = Object.keys(headCounts)
	.filter((file) => COLUMNS.some((column) => countOf(headCounts, file, column)))
	.sort((a, b) => {
		const total = (/** @type {string} */ file) =>
			COLUMNS.reduce(
				(sum, column) => sum + countOf(headCounts, file, column),
				0
			);
		return total(b) - total(a) || (a < b ? -1 : 1);
	});
report += `\n<details><summary>${remaining.length} file(s) in <code>lib/</code>, <code>hot/</code>, <code>declarations/</code> and <code>bin/</code> still have an escape hatch, \`any\` or untyped identifiers</summary>\n\n${header}${remaining.map(fileRow).join("\n")}\n\n</details>\n`;

fs.writeFileSync(
	path.resolve(outputDirectory, "types-coverage.md"),
	`## Types Coverage\n\n${report}`,
	"utf8"
);
// Every spot of every file, too long for the pull request comment.
fs.writeFileSync(
	path.resolve(outputDirectory, "types-coverage-spots.md"),
	`## Where types are still owed\n\n${remaining.flatMap((file) => spotsOf(file)).join("\n")}\n`,
	"utf8"
);
console.log(report);
