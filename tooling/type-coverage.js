/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

// loosely based on https://github.com/plantain-00/type-coverage

const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const { root } = require("./argv");
const createTypeScriptProgram = require("./typescript-program");

const program = createTypeScriptProgram("tsconfig.json");
const typeChecker = program.getTypeChecker();

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

for (const sourceFile of program.getSourceFiles()) {
	const file = sourceFile.fileName;
	if (!sourceFile.isDeclarationFile) {
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
		 * @param {ts.Node} node the node to be walked
		 * @returns {void}
		 */
		const walkNode = (node) => {
			if (ts.isIdentifier(node) || node.kind === ts.SyntaxKind.ThisKeyword) {
				const type = typeChecker.getTypeAtLocation(node);

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
					// Ignore `name` in `const { name: otherName } = obj;`
					(ts.isBindingElement(node.parent) &&
						node.parent.propertyName === node) ||
					// Ignore `"string".replace("s", "t")`, because the second argument can be a function with `any` types
					isReplaceMethod(node) ||
					// Ignore external types
					isExternal ||
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
				statementIndex++;
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
