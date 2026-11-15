/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// Fails `yarn lint` on a JSDoc type assertion `/** @type {T} */ (expr)` whose
// `expr` already has exactly the type `T`, as `no-unnecessary-type-assertion`
// does for TypeScript `as`. `--write` deletes the redundant `@type` comments.

const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const { root, write } = require("./argv");
const createTypeScriptProgram = require("./typescript-program");

const program = createTypeScriptProgram("tsconfig.json");
const checker = program.getTypeChecker();

/**
 * Whether an expression's type cannot come from its contextual type, so the
 * type seen inside the cast is the one it keeps once the cast is gone.
 * @param {ts.Expression} node the expression inside the cast
 * @returns {boolean} true when removing the cast cannot retype it
 */
const isContextFree = (node) => {
	if (ts.isParenthesizedExpression(node)) {
		return Boolean(ts.getJSDocTypeTag(node)) || isContextFree(node.expression);
	}
	if (
		ts.isIdentifier(node) ||
		ts.isPropertyAccessExpression(node) ||
		ts.isElementAccessExpression(node) ||
		ts.isNonNullExpression(node)
	) {
		return true;
	}
	if (ts.isAwaitExpression(node)) return isContextFree(node.expression);
	if (ts.isConditionalExpression(node)) {
		return isContextFree(node.whenTrue) && isContextFree(node.whenFalse);
	}
	if (ts.isBinaryExpression(node)) {
		switch (node.operatorToken.kind) {
			case ts.SyntaxKind.BarBarToken:
			case ts.SyntaxKind.AmpersandAmpersandToken:
			case ts.SyntaxKind.QuestionQuestionToken:
				return isContextFree(node.left) && isContextFree(node.right);
			case ts.SyntaxKind.CommaToken:
				return isContextFree(node.right);
			default:
				return false;
		}
	}
	if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
		// A generic signature can infer its type arguments from the cast
		const signature = checker.getResolvedSignature(node);
		const declaration = signature && signature.getDeclaration();
		if (
			!declaration ||
			ts.isJSDocSignature(declaration) ||
			ts.getEffectiveTypeParameterDeclarations(declaration).length > 0
		) {
			return false;
		}
		return (
			!ts.isConstructorDeclaration(declaration) ||
			ts.getEffectiveTypeParameterDeclarations(declaration.parent).length === 0
		);
	}
	return false;
};

/**
 * Whether the cast is the initializer of an unannotated variable inside a
 * loop, where it stops the variable's type depending on the loop's own flow.
 * @param {ts.ParenthesizedExpression} node the cast
 * @returns {boolean} true when removing it can make the variable circular
 */
const typesLoopVariable = (node) => {
	const { parent } = node;
	if (
		!ts.isVariableDeclaration(parent) ||
		parent.initializer !== node ||
		parent.type
	) {
		return false;
	}
	/** @type {ts.Node | undefined} */
	let current = parent.parent;
	while (current && !ts.isFunctionLike(current)) {
		if (ts.isIterationStatement(current, false)) return true;
		current = current.parent;
	}
	return false;
};

/**
 * @param {ts.Type} type a type on either side of the cast
 * @returns {boolean} true for `any` and `unknown`, which a cast never just restates
 */
const isTopType = (type) =>
	(type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) !== 0;

/**
 * @typedef {object} RedundantAssertion
 * @property {ts.SourceFile} sourceFile file holding the cast
 * @property {ts.ParenthesizedExpression} node the cast
 * @property {ts.JSDoc} comment the comment holding its `@type`
 * @property {string} type the asserted type, as written
 */

/** @type {RedundantAssertion[]} */
const found = [];

for (const sourceFile of program.getSourceFiles()) {
	if (
		sourceFile.isDeclarationFile ||
		program.isSourceFileFromExternalLibrary(sourceFile)
	) {
		continue;
	}

	/**
	 * @param {ts.Node} node the node to be walked
	 * @returns {void}
	 */
	const walk = (node) => {
		const tag = ts.isParenthesizedExpression(node) && ts.getJSDocTypeTag(node);
		// TS also reads a statement's `@type` as a cast of `(…)` starting that
		// statement's right-hand side, but that comment types the assigned name
		if (
			tag &&
			ts.isParenthesizedExpression(node) &&
			ts.isJSDoc(tag.parent) &&
			tag.parent.parent === node
		) {
			const typeNode = tag.typeExpression.type;
			const isConst =
				ts.isTypeReferenceNode(typeNode) &&
				ts.isIdentifier(typeNode.typeName) &&
				typeNode.typeName.text === "const";
			if (
				!isConst &&
				// `(this).x = …` in a JS function makes it a constructor
				node.expression.kind !== ts.SyntaxKind.ThisKeyword &&
				isContextFree(node.expression) &&
				!typesLoopVariable(node)
			) {
				const asserted = checker.getTypeFromTypeNode(typeNode);
				const actual = checker.getTypeAtLocation(node.expression);
				if (asserted === actual && !isTopType(asserted)) {
					found.push({
						sourceFile,
						node,
						comment: tag.parent,
						type: typeNode.getText(sourceFile)
					});
				}
			}
		}
		ts.forEachChild(node, walk);
	};
	walk(sourceFile);
}

/** @type {Map<ts.SourceFile, RedundantAssertion[]>} */
const byFile = new Map();
for (const item of found) {
	const list = byFile.get(item.sourceFile);
	if (list) list.push(item);
	else byFile.set(item.sourceFile, [item]);
}

for (const [sourceFile, items] of byFile) {
	const file = path.relative(root, sourceFile.fileName);
	if (write) {
		let source = sourceFile.text;
		// Deleting from the end keeps the earlier offsets valid
		for (const { node, comment } of items.sort(
			(a, b) => b.node.pos - a.node.pos
		)) {
			source = source.slice(0, comment.pos) + source.slice(node.getStart());
		}
		fs.writeFileSync(sourceFile.fileName, source);
	} else {
		for (const { node, type } of items) {
			const { line, character } = sourceFile.getLineAndCharacterOfPosition(
				node.getStart()
			);
			console.error(
				`${file}:${line + 1}:${character + 1}: redundant type assertion to ${type}`
			);
		}
	}
}

if (found.length > 0) {
	if (write) {
		console.log(
			`Removed ${found.length} redundant type assertions, run \`yarn fmt\``
		);
	} else {
		console.error(
			`\n${found.length} redundant type assertions: the expression already has the asserted type. Remove them with \`node tooling/check-redundant-type-assertions.js --write\`.`
		);
		process.exitCode = 1;
	}
}
