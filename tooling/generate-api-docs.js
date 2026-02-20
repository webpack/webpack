"use strict";

const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const doWrite = process.argv.includes("--write");

const DEFAULT_TARGETS = [
	"lib/Compiler.js",
	"lib/Compilation.js",
	"lib/NormalModule.js",
	"lib/Module.js"
];

const targets = process.argv.slice(2).filter((a) => !a.startsWith("--"));

const filePaths =
	targets.length > 0
		? targets.map((f) => path.resolve(f))
		: DEFAULT_TARGETS.map((f) => path.resolve(__dirname, "..", f));

const program = ts.createProgram(filePaths, {
	allowJs: true,
	checkJs: true
});
const checker = program.getTypeChecker();

/**
 * @param {ts.Node} node node to get JSDoc from
 * @returns {string} the extracted type string, or empty string if not found
 */
function getJSDocInfo(node) {
	const jsDocTags = ts.getJSDocTags(node);
	let type = "";
	for (const tag of jsDocTags) {
		if (tag.tagName && tag.tagName.text === "type" && tag.comment) {
			type =
				typeof tag.comment === "string" ? tag.comment : String(tag.comment);
		}
	}

	// fall back to inline @type {T} in leading comment
	const fullText = node.getSourceFile().getFullText();
	const commentRanges = ts.getLeadingCommentRanges(
		fullText,
		node.getFullStart()
	);
	if (commentRanges) {
		for (const range of commentRanges) {
			const typeMatch = fullText
				.slice(range.pos, range.end)
				.match(/@type\s*\{([^}]+)\}/);
			if (typeMatch) {
				type = typeMatch[1];
			}
		}
	}

	return type;
}

/** @typedef {{ name: string, documentation: string, params: { name: string, description: string }[], returns: string }} ExtractedMethod */
/** @typedef {{ name: string, type: string, documentation: string }} ExtractedProperty */
/** @typedef {{ name: string, type: string, documentation: string }} ExtractedHook */
/** @typedef {{ className: string, description: string, methods: ExtractedMethod[], properties: ExtractedProperty[], hooks: ExtractedHook[] }} ExtractedData */

/**
 * @param {string} filePath absolute path to the source file
 * @returns {ExtractedData} extracted data
 */
function extractFromFile(filePath) {
	const sourceFile = program.getSourceFile(filePath);
	if (!sourceFile) {
		throw new Error(`Could not parse: ${filePath}`);
	}

	const className = path.basename(filePath, ".js");
	/** @type {ExtractedMethod[]} */
	const methods = [];
	/** @type {ExtractedProperty[]} */
	const properties = [];
	/** @type {ExtractedHook[]} */
	const hooks = [];

	let classDescription = "";
	const fullText = sourceFile.getFullText();
	const seenProps = new Set();
	let insideConstructor = false;

	/**
	 * @param {ts.Node} node ast node to visit
	 */
	function visit(node) {
		if (!node) return;

		// Class declaration — get description
		if (ts.isClassDeclaration(node) && node.name) {
			const symbol = checker.getSymbolAtLocation(node.name);
			if (symbol) {
				classDescription = ts.displayPartsToString(
					symbol.getDocumentationComment(checker)
				);
			}
		}

		// Track constructor scope
		const isConstructor =
			ts.isConstructorDeclaration(node) ||
			(ts.isMethodDeclaration(node) &&
				node.name &&
				ts.isIdentifier(node.name) &&
				node.name.text === "constructor");

		if (isConstructor) {
			insideConstructor = true;
			ts.forEachChild(node, visit);
			insideConstructor = false;
			return;
		}

		// Method declarations
		if (ts.isMethodDeclaration(node) && node.name) {
			const symbol = checker.getSymbolAtLocation(node.name);
			if (symbol) {
				const name = symbol.getName();
				if (name.startsWith("_")) {
					ts.forEachChild(node, visit);
					return;
				}
				const doc = ts.displayPartsToString(
					symbol.getDocumentationComment(checker)
				);
				const tags = symbol.getJsDocTags();

				const params = tags
					.filter((t) => t.name === "param")
					.map((t) => {
						const text = t.text ? ts.displayPartsToString(t.text) : "";
						const parts = text.split(" ");
						return {
							name: parts[0] || "",
							description: parts.slice(1).join(" ")
						};
					});

				const returnsTag = tags.find((t) => t.name === "returns");
				const returns =
					returnsTag && returnsTag.text
						? ts.displayPartsToString(returnsTag.text)
						: "";

				methods.push({ name, documentation: doc, params, returns });
			}
		}

		// this.hooks = { ... } — extract hook names and types from JSDoc
		if (
			ts.isPropertyAssignment(node) &&
			node.name &&
			ts.isIdentifier(node.name)
		) {
			const propName = node.name.text;

			const parent = node.parent;
			if (parent && ts.isObjectLiteralExpression(parent)) {
				const grandParent = parent.parent;
				let isHooksObject = false;

				if (
					grandParent &&
					ts.isCallExpression(grandParent) &&
					grandParent.expression &&
					ts.isPropertyAccessExpression(grandParent.expression) &&
					grandParent.expression.name.text === "freeze"
				) {
					const greatGrandParent = grandParent.parent;
					if (
						greatGrandParent &&
						ts.isBinaryExpression(greatGrandParent) &&
						ts.isPropertyAccessExpression(greatGrandParent.left) &&
						greatGrandParent.left.name.text === "hooks"
					) {
						isHooksObject = true;
					}
				}

				if (
					grandParent &&
					ts.isBinaryExpression(grandParent) &&
					ts.isPropertyAccessExpression(grandParent.left) &&
					grandParent.left.name.text === "hooks"
				) {
					isHooksObject = true;
				}

				if (isHooksObject) {
					const type = getJSDocInfo(node);
					hooks.push({
						name: propName,
						type: type || "Hook",
						documentation: ""
					});
				}
			}
		}

		// this.xxx = ... inside constructor only — extract properties
		if (
			insideConstructor &&
			ts.isExpressionStatement(node) &&
			ts.isBinaryExpression(node.expression) &&
			node.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
			ts.isPropertyAccessExpression(node.expression.left) &&
			node.expression.left.expression.kind === ts.SyntaxKind.ThisKeyword
		) {
			const propName = node.expression.left.name.text;
			if (
				propName === "hooks" ||
				propName.startsWith("_") ||
				seenProps.has(propName)
			) {
				ts.forEachChild(node, visit);
				return;
			}
			seenProps.add(propName);

			const type = getJSDocInfo(node);
			const commentRanges2 = ts.getLeadingCommentRanges(
				fullText,
				node.getFullStart()
			);
			let description = "";
			if (commentRanges2) {
				for (const range of commentRanges2) {
					const cleaned = fullText
						.slice(range.pos, range.end)
						.replace(/\/\*\*|\*\/|\*/g, "")
						.replace(/@type\s*\{[^}]+\}/g, "")
						.trim();
					if (cleaned) description = cleaned;
				}
			}

			properties.push({
				name: propName,
				type: type || "unknown",
				documentation: description
			});
		}

		ts.forEachChild(node, visit);
	}

	visit(sourceFile);

	return {
		className,
		description: classDescription,
		methods,
		properties,
		hooks
	};
}

/**
 * @param {ExtractedData} data extracted data
 * @returns {string} mdx content
 */
function toMDX(data) {
	const lines = [];

	lines.push("---");
	lines.push(`title: ${data.className}`);
	lines.push(`description: API reference for webpack ${data.className}`);
	lines.push("---");
	lines.push("");
	lines.push(`# ${data.className}`);
	lines.push("");

	if (data.description) {
		lines.push(data.description);
		lines.push("");
	}

	// Hooks
	if (data.hooks.length > 0) {
		lines.push("## Hooks");
		lines.push("");
		lines.push("| Hook | Type |");
		lines.push("| --- | --- |");
		for (const hook of data.hooks) {
			const escapedType = hook.type.replace(/\|/g, "\\|");
			lines.push(`| \`${hook.name}\` | \`${escapedType}\` |`);
		}
		lines.push("");
	}

	// Properties
	if (data.properties.length > 0) {
		lines.push("## Properties");
		lines.push("");
		lines.push("| Property | Type | Description |");
		lines.push("| --- | --- | --- |");
		for (const prop of data.properties) {
			const escapedType = (prop.type || "").replace(/\|/g, "\\|");
			lines.push(
				`| \`${prop.name}\` | \`${escapedType}\` | ${prop.documentation || "-"} |`
			);
		}
		lines.push("");
	}

	// Methods
	if (data.methods.length > 0) {
		lines.push("## Methods");
		lines.push("");
		for (const method of data.methods) {
			lines.push(`### \`${method.name}()\``);
			lines.push("");
			if (method.documentation) {
				lines.push(method.documentation);
				lines.push("");
			}
			if (method.params.length > 0) {
				lines.push("**Parameters:**");
				lines.push("");
				for (const p of method.params) {
					lines.push(`- \`${p.name}\` — ${p.description || ""}`);
				}
				lines.push("");
			}
			if (method.returns) {
				lines.push(`**Returns:** ${method.returns}`);
				lines.push("");
			}
			lines.push("---");
			lines.push("");
		}
	}

	return lines.join("\n");
}

// Run
const outputDir = path.resolve(__dirname, "..", "api-docs");

if (doWrite) fs.mkdirSync(outputDir, { recursive: true });

for (const filePath of filePaths) {
	const data = extractFromFile(filePath);
	const mdx = toMDX(data);
	const outFile = path.join(outputDir, `${data.className}.mdx`);

	if (doWrite) {
		fs.writeFileSync(outFile, mdx);
		console.log(`Written: ${outFile}`);
	} else {
		console.log(`--- ${data.className} ---`);
		console.log(
			`  ${data.hooks.length} hooks, ${data.properties.length} properties, ${data.methods.length} methods`
		);
		console.log(`  Would write to: ${outFile}`);
	}
}
