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
const ESCAPE_HATCH_DIRECTORIES = ["lib/", "hot/"];

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
				if (!isTyped && inferredAny && type.flags & ts.TypeFlags.Any) {
					inferredAny.push({
						line: line + 1,
						name: node.getText(sourceFile)
					});
				}
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
	"\nInferred `any` counts the identifiers whose type TypeScript infers as `any` though no JSDoc names it, such as `const map = new Map()`.\n";

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
			: "\nThis pull request adds or removes no escape-hatch type or inferred `any`.\n";

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
report += `\n<details><summary>${remaining.length} file(s) in <code>lib/</code> and <code>hot/</code> still use an escape hatch, infer \`any\` or have untyped lines</summary>\n\n${header}${remaining.map(fileRow).join("\n")}\n\n</details>\n`;

fs.writeFileSync(
	path.resolve(outputDirectory, "types-coverage.md"),
	`## Types Coverage\n\n${report}`,
	"utf8"
);
console.log(report);
