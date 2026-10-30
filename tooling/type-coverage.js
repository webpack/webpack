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
const { base, root } = require("./argv");
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

// Escape-hatch types: how often each one stands in a JSDoc type in `lib/` and
// `hot/`, against `--base` when given, for the report the pull request shows.
const ESCAPE_HATCHES = [
	"EXPECTED_ANY",
	"EXPECTED_OBJECT",
	"EXPECTED_FUNCTION",
	"unknown"
];
const ESCAPE_HATCH_REGEXP =
	/\b(?:EXPECTED_ANY|EXPECTED_OBJECT|EXPECTED_FUNCTION|unknown)\b/g;
const JSDOC_REGEXP = /\/\*\*[\s\S]*?\*\//g;
const TYPE_TAG_REGEXP =
	/@(?:type|param|returns?|typedef|property|prop|template|this|satisfies|callback|enum)\s*\{/g;
const ESCAPE_HATCH_DIRECTORIES = ["lib/", "hot/"];

/** @typedef {Record<string, number>} EscapeHatchCounts */

/**
 * Counts the escape-hatch types in the braces of a file's JSDoc type tags.
 * @param {string} source the file's source
 * @returns {EscapeHatchCounts} counts by name
 */
const countEscapeHatches = (source) => {
	/** @type {EscapeHatchCounts} */
	const counts = {};
	for (const [comment] of source.matchAll(JSDOC_REGEXP)) {
		TYPE_TAG_REGEXP.lastIndex = 0;
		while (TYPE_TAG_REGEXP.exec(comment) !== null) {
			// The type runs to the brace that balances the tag's opening one.
			let depth = 1;
			let end = TYPE_TAG_REGEXP.lastIndex;
			while (end < comment.length && depth > 0) {
				if (comment[end] === "{") depth++;
				else if (comment[end] === "}") depth--;
				end++;
			}
			const type = comment.slice(TYPE_TAG_REGEXP.lastIndex, end - 1);
			for (const [name] of type.matchAll(ESCAPE_HATCH_REGEXP)) {
				counts[name] = (counts[name] || 0) + 1;
			}
			TYPE_TAG_REGEXP.lastIndex = end;
		}
	}
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
		.filter((file) => file.endsWith(".js"));
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
		const counts = countEscapeHatches(source);
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

const headCounts = countAllEscapeHatches();
const headTotals = totalEscapeHatches(headCounts);
let report = "";
if (base) {
	const baseCounts = countAllEscapeHatches(base);
	const baseTotals = totalEscapeHatches(baseCounts);
	report += "| Type | Base | Head | Change |\n| :-- | --: | --: | --: |\n";
	for (const name of ESCAPE_HATCHES) {
		report += `| \`${name}\` | ${baseTotals[name]} | ${headTotals[name]} | ${formatChange(
			headTotals[name] - baseTotals[name]
		)} |\n`;
	}
	/** @type {string[]} */
	const changed = [];
	for (const file of [
		...new Set([...Object.keys(baseCounts), ...Object.keys(headCounts)])
	].sort()) {
		const parts = ESCAPE_HATCHES.map((name) => {
			const change =
				((headCounts[file] && headCounts[file][name]) || 0) -
				((baseCounts[file] && baseCounts[file][name]) || 0);
			return change === 0 ? "" : `\`${name}\` ${formatChange(change)}`;
		}).filter(Boolean);
		if (parts.length > 0) changed.push(`| \`${file}\` | ${parts.join(", ")} |`);
	}
	report +=
		changed.length > 0
			? `\n<details><summary>${changed.length} file(s) changed</summary>\n\n| File | Change |\n| :-- | :-- |\n${changed.join("\n")}\n\n</details>\n`
			: "\nNo file changed its escape-hatch types.\n";
} else {
	report += "| Type | Count |\n| :-- | --: |\n";
	for (const name of ESCAPE_HATCHES) {
		report += `| \`${name}\` | ${headTotals[name]} |\n`;
	}
}
fs.writeFileSync(
	path.resolve(outputDirectory, "escape-hatch-types.md"),
	`### Escape-hatch types\n\n${report}`,
	"utf8"
);
console.log(report);
