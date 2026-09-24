/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

/* eslint-disable camelcase -- terser's own API, which this speaks */

// cspell:ignore privatename, argnames, argname, bcatch, bfinally, NOINLINE, MANGLEPROP, nlb, punc, Funarg, Defun, thedef

const { parse: parseSource } = require("./syntax-parser");

/** @typedef {EXPECTED_ANY} TerserModules terser's own modules */
/** @typedef {EXPECTED_ANY} Node one of terser's AST nodes */
/** @typedef {EXPECTED_ANY} Token one of terser's tokens */
/** @typedef {EXPECTED_ANY} EstreeNode a node webpack's parser produced */

/**
 * What the tree is built from, as terser's own `parse` options name it.
 * @typedef {object} TreeOptions
 * @property {boolean=} module whether the source is a module
 * @property {boolean=} bare_returns whether `return` may sit at the top level
 * @property {string | null=} filename the name tokens carry
 * @property {boolean=} shebang whether a leading `#!` line is a comment
 */

// The words terser's tokenizer reads as keywords and atoms rather than names.
const KEYWORDS = new Set(
	"break case catch class const continue debugger default delete do else export extends finally for function if in instanceof let new return switch throw try typeof var void while with".split(
		" "
	)
);
const ATOMS = new Set(["false", "null", "true"]);
const WORD_OPERATORS = new Set([
	"in",
	"instanceof",
	"typeof",
	"new",
	"void",
	"delete"
]);
const PUNCTUATION = new Set(["[", "]", "{", "}", "(", ")", ",", ";", ":"]);

const PURE = 0b00000001;
const INLINE = 0b00000010;
const NOINLINE = 0b00000100;
const KEY = 0b00001000;
const MANGLE_PROP = 0b00010000;

// Kinds a lexical token is recorded as, before it becomes one of terser's.
const WORD = 1;
const PRIVATE_NAME = 2;
const STRING = 3;
const OTHER = 4;
const REGEXP = 5;

// Thrown where terser reads a source differently from the specification, so
// the source is left to terser's own parser.
const DECLINE = new Error("terser reads this source its own way");

// A backslash before a line break, which terser reads unlike the specification.
const LINE_CONTINUATION = /\\(?:\r\n|[\n\r\u2028\u2029])/;

// What terser's tokenizer lets a regular expression follow, per token type.
const KEYWORDS_BEFORE_EXPRESSION = new Set([
	"return",
	"new",
	"delete",
	"throw",
	"else",
	"case",
	"yield",
	"await"
]);
const PUNCTUATION_BEFORE_EXPRESSION = new Set(["[", "{", "(", ",", ";", ":"]);
const NO_EXPRESSION_AFTER = new Set([
	"]",
	"}",
	")",
	".",
	"?.",
	"...",
	"`",
	"++",
	"--"
]);

/**
 * @param {number} code a character code
 * @returns {boolean} whether terser's tokenizer reads it as a line break
 */
const isLineBreak = (code) =>
	code === 10 || code === 13 || code === 0x2028 || code === 0x2029;

/**
 * Builds terser's tree from webpack's parser, the way terser's own `parse`
 * would: the same nodes, the same tokens where terser reads one, and comments
 * attached where terser attaches them.
 * @param {TerserModules} modules terser's modules
 * @returns {(source: string, options: TreeOptions) => Node | undefined} the tree, or undefined where webpack's parser refuses the source
 */
const createTerserTree = ({ ast }) => {
	const A = ast;
	// The comments of every gap no parenthesis borders, which nothing mutates.
	/** @type {Token[]} */
	const EMPTY = [];
	// Kept across calls, as a worker minifies one asset after another: every
	// read is at an offset this source set, so what an earlier one left is inert.
	let byStart = new Int32Array(0);
	let byEnd = new Int32Array(0);
	// Each token's offsets and kind, by index: a source holds fewer tokens
	// than characters, so these grow with the two above.
	let startBuffer = new Int32Array(0);
	let endBuffer = new Int32Array(0);
	let kindBuffer = new Int8Array(0);

	return (source, options) => {
		const module = Boolean(options.module);
		const file = options.filename === undefined ? null : options.filename;

		/** @type {EXPECTED_ANY[]} */
		const values = [];
		let count = 0;
		/** @type {{ block: boolean, text: string, start: number, end: number }[]} */
		const rawComments = [];

		let previousWasDot = false;
		let inTemplateText = false;
		/** @type {boolean[]} */
		const braces = [];
		if (byStart.length <= source.length) {
			byStart = new Int32Array(source.length + 1);
			byEnd = new Int32Array(source.length + 1);
			startBuffer = new Int32Array(source.length + 1);
			endBuffer = new Int32Array(source.length + 1);
			kindBuffer = new Int8Array(source.length + 1);
		}
		const starts = startBuffer;
		const ends = endBuffer;
		const kinds = kindBuffer;
		const tokenStart = byStart;
		const tokenEnd = byEnd;
		/** @type {EstreeNode} */
		let program;
		try {
			program = parseSource(source, {
				ecmaVersion: "latest",
				sourceType: module ? "module" : "script",
				allowHashBang: true,
				allowReturnOutsideFunction: Boolean(options.bare_returns),
				preserveParens: true,
				onComment: (block, text, start, end) => {
					if (
						!block &&
						(source.startsWith("<!--", start) ||
							source.startsWith("-->", start))
					) {
						throw DECLINE;
					}
					rawComments.push({ block, text, start, end });
				},
				onToken: (token) => {
					const { type } = token;
					const { label } = type;
					if (label === "eof") return;
					// What terser reads as an HTML comment, whatever this parser made of it.
					const first = source.charCodeAt(token.start);
					if (
						(first === 60 && source.startsWith("<!--", token.start)) ||
						(first === 45 && source.startsWith("-->", token.start))
					) {
						throw DECLINE;
					}
					// terser reads a template's text from its opening backtick, or the
					// `}` closing a substitution, through the next `${` or backtick.
					if (inTemplateText) {
						ends[count - 1] = token.end;
						tokenEnd[token.end] = count;
						// terser's template token carries the text it holds.
						if (label === "template" || label === "invalidTemplate") {
							values[count - 1] = token.value;
						}
						if (label === "${") {
							braces.push(true);
							inTemplateText = false;
						} else if (label === "`") {
							inTemplateText = false;
						}
						return;
					}
					if (label === "`") {
						inTemplateText = true;
					} else if (label === "{" || label === "${") {
						braces.push(label === "${");
					} else if (label === "}" && braces.pop() === true) {
						inTemplateText = true;
					}
					let kind = OTHER;
					let { value } = token;
					if (type.keyword !== undefined || label === "name") {
						kind = WORD;
						if (value === undefined) value = type.keyword;
					} else if (label === "privateId") {
						kind = PRIVATE_NAME;
					} else if (label === "string") {
						kind = STRING;
					} else if (label === "regexp") {
						kind = REGEXP;
					} else if (value === undefined) {
						value = label;
					}
					// A word after a dot is a property name to terser, even a keyword.
					if (kind === WORD && previousWasDot) kind = -WORD;
					previousWasDot = label === "." || label === "?.";
					starts[count] = token.start;
					ends[count] = token.end;
					kinds[count] = kind;
					values.push(value);
					count++;
					tokenStart[token.start] = count;
					tokenEnd[token.end] = count;
				}
			});
		} catch (_err) {
			return undefined;
		}

		const lineStarts = [0];
		for (let i = 0; i < source.length; i++) {
			const code = source.charCodeAt(i);
			if (code === 13) {
				if (source.charCodeAt(i + 1) === 10) i++;
				lineStarts.push(i + 1);
			} else if (code === 10 || code === 0x2028 || code === 0x2029) {
				lineStarts.push(i + 1);
			}
		}
		let lastLine = 0;
		/**
		 * @param {number} offset an offset into the source
		 * @returns {number} the line it is on, from 0
		 */
		const lineOf = (offset) => {
			let line = lastLine;
			if (lineStarts[line] <= offset) {
				for (let step = 0; step < 4; step++) {
					if (line + 1 >= lineStarts.length || lineStarts[line + 1] > offset) {
						lastLine = line;
						return line;
					}
					line++;
				}
			}
			let low = 0;
			let high = lineStarts.length - 1;
			while (low < high) {
				const middle = (low + high + 1) >> 1;
				if (lineStarts[middle] <= offset) low = middle;
				else high = middle - 1;
			}
			lastLine = low;
			return low;
		};

		// Too large a source is not kept past this call.
		if (source.length > 1 << 23) {
			byStart = new Int32Array(0);
			byEnd = new Int32Array(0);
			startBuffer = new Int32Array(0);
			endBuffer = new Int32Array(0);
			kindBuffer = new Int8Array(0);
		}

		// The comments in each gap, gap `i` being the one before token `i`.
		// Sized up front: filled out of order, it would otherwise go sparse.
		/** @type {(Token[] | undefined)[]} */
		// eslint-disable-next-line unicorn/no-new-array
		const gaps = new Array(count + 1);
		/** @type {Uint8Array} */
		const gapBreaks = new Uint8Array(count + 1);
		// Where the last comment of a gap ends, read before anything moves them.
		/** @type {Int32Array} */
		const gapEnds = new Int32Array(count + 1).fill(-1);
		if (rawComments.length !== 0) {
			let tokenIndex = 0;
			let previousEnd = 0;
			let breakPending = false;
			let lastGap = -1;
			for (const comment of rawComments) {
				while (tokenIndex < count && starts[tokenIndex] < comment.start) {
					previousEnd = ends[tokenIndex];
					tokenIndex++;
					breakPending = false;
				}
				if (lastGap !== tokenIndex) {
					lastGap = tokenIndex;
					gaps[tokenIndex] = [];
				}
				const list = /** @type {Token[]} */ (gaps[tokenIndex]);
				const between = list.length === 0 ? previousEnd : gapEnds[tokenIndex];
				let nlb = breakPending;
				for (let i = between; i < comment.start && !nlb; i++) {
					if (isLineBreak(source.charCodeAt(i))) nlb = true;
				}
				const line = lineOf(comment.start);
				let type;
				let value;
				if (comment.start === 0 && source.startsWith("#!")) {
					type = "comment5";
					value = comment.text;
					nlb = false;
				} else if (comment.block) {
					type = "comment2";
					value = comment.text.replace(/\r\n|\r|\u2028|\u2029/g, "\n");
					// terser steps through the comment before it records it, so a
					// break inside counts as one before it too.
					if (value.includes("\n")) nlb = true;
				} else {
					type = "comment1";
					value = comment.text;
				}
				const token = new A.AST_Token(
					type,
					value,
					line + 1,
					comment.start - lineStarts[line],
					comment.start,
					nlb,
					[],
					[],
					file
				);
				list.push(token);
				gapEnds[tokenIndex] = comment.end;
				breakPending = type === "comment2" && value.includes("\n");
				gapBreaks[tokenIndex] = breakPending ? 1 : 0;
			}
		}

		/**
		 * The comments of one gap, which the tokens on both sides of it share as
		 * terser's do: a parenthesized expression moves comments by mutating it.
		 * @param {number} index a gap index
		 * @returns {Token[]} its comments
		 */
		const gapAt = (index) => {
			const list = gaps[index];
			if (list !== undefined) return list;
			if (!isParenthesis(index - 1) && !isParenthesis(index)) return EMPTY;
			return (gaps[index] = []);
		};
		/**
		 * @param {number} index a token index
		 * @returns {boolean} whether it is `(` or `)`
		 */
		const isParenthesis = (index) =>
			kinds[index] === OTHER &&
			(values[index] === "(" || values[index] === ")");
		/**
		 * Gives a gap its own comments where a parenthesis will add to them,
		 * and points the tokens already made on either side of it there.
		 * @param {number} index a gap index
		 * @returns {void}
		 */
		const ownGap = (index) => {
			if (gaps[index] !== undefined) return;
			/** @type {Token[]} */
			const list = [];
			gaps[index] = list;
			const before = tokens[index - 1];
			if (before !== undefined && before.comments_after === EMPTY) {
				before.comments_after = list;
			}
			const after = tokens[index];
			if (after !== undefined && after.comments_before === EMPTY) {
				after.comments_before = list;
			}
		};

		/**
		 * @param {number} index a token index
		 * @returns {boolean} whether terser's tokenizer reads a `/` after it as a pattern
		 */
		const allowsRegexp = (index) => {
			if (index < 0) return false;
			const kind = kinds[index];
			const value = values[index];
			if (kind === WORD) {
				if (ATOMS.has(value) || !KEYWORDS.has(value)) return false;
				return (
					WORD_OPERATORS.has(value) || KEYWORDS_BEFORE_EXPRESSION.has(value)
				);
			}
			if (kind !== OTHER) return false;
			if (typeof value !== "string") return false;
			if (PUNCTUATION_BEFORE_EXPRESSION.has(value)) return true;
			return !NO_EXPRESSION_AFTER.has(value) && !PUNCTUATION.has(value);
		};

		/** @type {Token[]} */
		// eslint-disable-next-line unicorn/no-new-array
		const tokens = new Array(count + 1);
		/**
		 * @param {number} index a token index
		 * @returns {Token} terser's token for it
		 */
		const tokenAt = (index) => {
			let token = tokens[index];
			if (token !== undefined) return token;
			const start = index < count ? starts[index] : source.length;
			let nlb = false;
			let from = index === 0 ? 0 : ends[index - 1];
			const commentsEnd = gapEnds[index];
			if (commentsEnd !== -1) {
				from = commentsEnd;
				nlb = gapBreaks[index] === 1;
			}
			for (let i = from; i < start && !nlb; i++) {
				if (isLineBreak(source.charCodeAt(i))) nlb = true;
			}
			const line = lineOf(start);
			let type = "eof";
			let value;
			if (index < count) {
				const kind = kinds[index];
				value = values[index];
				if (kind === WORD) {
					type = ATOMS.has(value)
						? "atom"
						: !KEYWORDS.has(value)
							? "name"
							: WORD_OPERATORS.has(value)
								? "operator"
								: "keyword";
				} else if (kind === -WORD) {
					type = "name";
				} else if (kind === PRIVATE_NAME) {
					type = "privatename";
				} else if (kind === STRING) {
					type = "string";
				} else {
					type = PUNCTUATION.has(value) ? "punc" : "operator";
				}
			}
			token = new A.AST_Token(
				type,
				value,
				line + 1,
				start - lineStarts[line],
				start,
				nlb,
				gapAt(index),
				gapAt(index + 1),
				file
			);
			if (type === "string") token.quote = source[start];
			if (kinds[index] === REGEXP && !allowsRegexp(index - 1)) {
				// terser read a `/` here, then reads the pattern again from it: the
				// new token comes after no line break and holds no comments.
				read.set(index, token);
				token = new A.AST_Token(
					type,
					value,
					token.line,
					token.col,
					start,
					false,
					[],
					gapAt(index + 1),
					file
				);
			}
			tokens[index] = token;
			return token;
		};
		// The token terser first read where it read a pattern again, which a
		// node that took its start before the second reading keeps.
		/** @type {Map<number, Token>} */
		const read = new Map();
		/**
		 * @param {number} index a token index
		 * @returns {Token} the token a node starting there before any rereading takes
		 */
		const firstReadAt = (index) => {
			const token = tokenAt(index);
			const first = read.get(index);
			return first === undefined ? token : first;
		};
		/**
		 * @param {EstreeNode} node a node
		 * @returns {Token} the token it starts with
		 */
		const startOf = (node) => tokenAt(byStart[node.start] - 1);
		/**
		 * @param {EstreeNode} node a node
		 * @returns {Token} the token it ends with
		 */
		const endOf = (node) => tokenAt(byEnd[node.end] - 1);
		/**
		 * @param {EstreeNode} node a node
		 * @returns {Token} the token after it
		 */
		const afterOf = (node) => tokenAt(byEnd[node.end]);

		// Where a parenthesized start token's own comments end, as terser keeps it.
		/** @type {WeakMap<Token, number>} */
		const outerComments = new WeakMap();
		/**
		 * @param {Node} node a node terser annotates
		 * @param {Token=} before the token whose comments are read
		 * @returns {Node} the node
		 */
		const annotate = (node, before = node.start) => {
			const comments = before.comments_before;
			const outside = outerComments.get(before);
			let i = outside !== undefined ? outside : comments.length;
			while (--i >= 0) {
				const { value } = comments[i];
				if (/[@#]__/.test(value)) {
					if (/[@#]__PURE__/.test(value)) {
						node._annotations |= PURE;
						break;
					}
					if (/[@#]__INLINE__/.test(value)) {
						node._annotations |= INLINE;
						break;
					}
					if (/[@#]__NOINLINE__/.test(value)) {
						node._annotations |= NOINLINE;
						break;
					}
					if (/[@#]__KEY__/.test(value)) {
						node._annotations |= KEY;
						break;
					}
					if (/[@#]__MANGLE_PROP__/.test(value)) {
						node._annotations |= MANGLE_PROP;
						break;
					}
				}
			}
			return node;
		};

		/** @type {Node[]} */
		const labels = [];

		/**
		 * @param {EstreeNode[]} nodes expressions
		 * @returns {Node[]} each converted
		 */
		const list = (nodes) => {
			const out = Array.from({ length: nodes.length });
			for (let i = 0; i < nodes.length; i++) out[i] = from(nodes[i]);
			return out;
		};

		/**
		 * A statement where terser's `statement` wrapper reads it, which gives
		 * the node the statement's own first and last tokens.
		 * @param {EstreeNode} node a statement
		 * @returns {Node} the statement
		 */
		const statement = (node) => {
			const converted = from(node);
			converted.start = firstReadAt(byStart[node.start] - 1);
			converted.end = endOf(node);
			return converted;
		};

		/**
		 * @param {EstreeNode[]} nodes statements
		 * @returns {Node[]} each read as `statement` reads it
		 */
		const statementList = (nodes) => {
			const out = Array.from({ length: nodes.length });
			for (let i = 0; i < nodes.length; i++) out[i] = statement(nodes[i]);
			return out;
		};

		/**
		 * @param {EstreeNode[]} body a program's or function's statements
		 * @returns {Node[]} them, the directive prologue read as terser reads it
		 */
		const statements = (body) => {
			const out = [];
			let prologue = true;
			for (let i = 0; i < body.length; i++) {
				const node = body[i];
				if (
					node.type === "ExportNamedDeclaration" ||
					node.type === "ExportDefaultDeclaration" ||
					node.type === "ExportAllDeclaration"
				) {
					prologue = false;
					const converted = statement(node);
					// terser's `export` takes a `;` that follows it as its own.
					const next = body[i + 1];
					if (
						next !== undefined &&
						next.type === "EmptyStatement" &&
						byStart[next.start] - 1 === byEnd[node.end]
					) {
						converted.end = endOf(next);
						i++;
					}
					out.push(converted);
					continue;
				}
				if (prologue) {
					if (
						node.type === "ExpressionStatement" &&
						node.expression.type === "Literal" &&
						typeof node.expression.value === "string"
					) {
						// A string holding an escape ends the prologue, as terser reads it.
						if (!node.expression.raw.includes("\\")) {
							const directive = new A.AST_Directive(from(node.expression));
							directive.start = startOf(node);
							directive.end = endOf(node);
							out.push(directive);
							continue;
						}
						prologue = false;
					} else {
						prologue = false;
					}
				}
				out.push(statement(node));
			}
			return out;
		};

		/**
		 * @param {EstreeNode} node a block
		 * @returns {Node[]} its statements
		 */
		const blockBody = (node) => statementList(node.body);

		/**
		 * @param {Node} Type the symbol class
		 * @param {EstreeNode} node an identifier
		 * @returns {Node} the symbol, on its one token
		 */
		const symbol = (Type, node) => {
			const token = startOf(node);
			return new Type({ name: node.name, start: token, end: token });
		};

		/**
		 * @param {EstreeNode} node a property's key
		 * @returns {string} the key as terser's `as_property_name` reads it
		 */
		const keyName = (node) => {
			const { value } = startOf(node);
			return typeof value === "string" ? value : `${value}`;
		};

		/**
		 * @param {EstreeNode} node a function
		 * @param {Node} Type the function class
		 * @param {Node | null} name its name
		 * @param {Token} start the token it starts with
		 * @param {boolean=} isAccessor whether it is a getter's or setter's function
		 * @returns {Node} the function
		 */
		const lambda = (node, Type, name, start, isAccessor = false) =>
			new Type({
				start,
				// terser reads a getter's or setter's function without either flag.
				is_generator: isAccessor ? undefined : node.generator,
				async: isAccessor ? undefined : node.async,
				name,
				argnames: node.params.map((/** @type {EstreeNode} */ param) =>
					parameter(param, A.AST_SymbolFunarg)
				),
				body: statements(node.body.body),
				end: endOf(node)
			});

		/**
		 * A declared name or destructuring, as terser's `binding_element` reads
		 * one: in a parameter list, a catch clause or a declaration.
		 * @param {EstreeNode} node the pattern
		 * @param {Node} Type the symbol class a name in it declares
		 * @returns {Node} the pattern
		 */
		const binding = (node, Type) => {
			if (node.type === "ArrayPattern") {
				let cursor = byStart[node.start];
				const names = [];
				const { elements } = node;
				for (let i = 0; i < elements.length; i++) {
					if (i > 0) cursor++;
					const element = elements[i];
					if (element === null) {
						const comma = tokenAt(cursor);
						names.push(new A.AST_Hole({ start: comma, end: comma }));
						continue;
					}
					if (element.type === "RestElement") {
						const expand = startOf(element);
						names.push(
							new A.AST_Expansion({
								start: expand,
								expression: binding(element.argument, Type),
								end: expand
							})
						);
					} else if (element.type === "AssignmentPattern") {
						const left = binding(element.left, Type);
						names.push(
							new A.AST_DefaultAssign({
								start: left.start,
								left,
								operator: "=",
								right: from(element.right),
								end: afterOf(element)
							})
						);
					} else {
						names.push(binding(element, Type));
					}
					cursor = byEnd[element.end];
				}
				return new A.AST_Destructuring({
					start: startOf(node),
					names,
					is_array: true,
					end: endOf(node)
				});
			}
			if (node.type === "ObjectPattern") {
				const names = [];
				for (const property of node.properties) {
					if (property.type === "RestElement") {
						const value = binding(property.argument, Type);
						names.push(
							new A.AST_Expansion({
								start: startOf(property),
								expression: value,
								end: value.end
							})
						);
						continue;
					}
					const defaulted = property.value.type === "AssignmentPattern";
					const target = defaulted ? property.value.left : property.value;
					let keyValue;
					if (property.shorthand && startOf(property.key).type === "name") {
						const value = binding(target, Type);
						keyValue = new A.AST_ObjectKeyVal({
							start: tokenAt(byStart[property.key.start] - 2),
							key: value.name,
							value,
							end: value.end
						});
					} else {
						const propertyToken = startOf(property);
						keyValue = new A.AST_ObjectKeyVal({
							start: propertyToken,
							quote: propertyToken.quote,
							key: property.computed
								? from(property.key)
								: keyName(property.key),
							value: binding(target, Type),
							end: endOf(target)
						});
					}
					if (defaulted) {
						const left = keyValue.value;
						keyValue.value = new A.AST_DefaultAssign({
							start: left.start,
							left,
							operator: "=",
							right: from(property.value.right),
							end: afterOf(property.value)
						});
					}
					names.push(keyValue);
				}
				return new A.AST_Destructuring({
					start: startOf(node),
					names,
					is_array: false,
					end: endOf(node)
				});
			}
			return symbol(Type, node);
		};

		/**
		 * A parameter, as terser's `parameter` reads one.
		 * @param {EstreeNode} node the parameter
		 * @param {Node} Type the symbol class a name in it declares
		 * @returns {Node} the parameter
		 */
		const parameter = (node, Type) => {
			if (node.type === "RestElement") {
				const expand = startOf(node);
				return new A.AST_Expansion({
					start: expand,
					expression: binding(node.argument, Type),
					end: expand
				});
			}
			if (node.type === "AssignmentPattern") {
				const left = binding(node.left, Type);
				return new A.AST_DefaultAssign({
					start: left.start,
					left,
					operator: "=",
					right: from(node.right),
					end: afterOf(node)
				});
			}
			return binding(node, Type);
		};

		/**
		 * A pattern as terser's expression parser first reads it — an object,
		 * an array or an assignment — before converting it to a pattern.
		 * @param {EstreeNode} node the pattern
		 * @returns {Node} its expression form
		 */
		const cover = (node) => {
			switch (node.type) {
				case "ObjectPattern":
					return new A.AST_Object({
						start: startOf(node),
						properties: node.properties.map(
							(/** @type {EstreeNode} */ property) => {
								const start = startOf(property);
								if (property.type === "RestElement") {
									return new A.AST_Expansion({
										start,
										expression: cover(property.argument),
										end: endOf(property)
									});
								}
								const key = property.computed
									? from(property.key)
									: keyName(property.key);
								let value;
								if (property.shorthand) {
									const token = startOf(property.key);
									value = new A.AST_SymbolRef({
										start: token,
										name: key,
										end: token
									});
									if (property.value.type === "AssignmentPattern") {
										value = new A.AST_Assign({
											start,
											left: value,
											operator: "=",
											right: from(property.value.right),
											logical: false,
											end: endOf(property.value)
										});
									}
								} else {
									value = cover(property.value);
								}
								return annotate(
									new A.AST_ObjectKeyVal({
										start,
										quote: start.quote,
										key,
										value,
										end: endOf(property)
									})
								);
							}
						),
						end: endOf(node)
					});
				case "ArrayPattern":
					return new A.AST_Array({
						start: startOf(node),
						elements: elements(node, (element) =>
							element.type === "RestElement"
								? new A.AST_Expansion({
										start: startOf(element),
										expression: cover(element.argument),
										end: afterOf(element)
									})
								: cover(element)
						),
						end: endOf(node)
					});
				case "AssignmentPattern":
					return new A.AST_Assign({
						start: startOf(node),
						left: cover(node.left),
						operator: "=",
						right: from(node.right),
						logical: false,
						end: endOf(node)
					});
				case "RestElement":
					return new A.AST_Expansion({
						start: startOf(node),
						expression: cover(node.argument),
						end: afterOf(node)
					});
				default:
					return from(node);
			}
		};

		/**
		 * terser's `to_destructuring`: an assignment target read as an expression,
		 * made the pattern it is.
		 * @param {Node} node the expression form
		 * @returns {Node} the pattern
		 */
		const toDestructuring = (node) => {
			if (node instanceof A.AST_Object) {
				return new A.AST_Destructuring({
					start: node.start,
					names: node.properties.map(toDestructuring),
					is_array: false,
					end: node.end
				});
			}
			if (node instanceof A.AST_Array) {
				const names = [];
				for (const element of node.elements) {
					if (element instanceof A.AST_Expansion) {
						element.expression = toDestructuring(element.expression);
					}
					names.push(toDestructuring(element));
				}
				return new A.AST_Destructuring({
					start: node.start,
					names,
					is_array: true,
					end: node.end
				});
			}
			if (node instanceof A.AST_ObjectProperty) {
				node.value = toDestructuring(node.value);
			} else if (node instanceof A.AST_Assign) {
				return new A.AST_DefaultAssign({
					start: node.start,
					left: node.left,
					operator: "=",
					right: node.right,
					end: node.end
				});
			}
			return node;
		};

		/**
		 * terser's `to_fun_args`: an arrow's parameter read as an expression,
		 * made the parameter it is.
		 * @param {Node} node the expression form
		 * @param {Node=} defaultValue a default read above it
		 * @returns {Node} the parameter
		 */
		const toFunArgs = (node, defaultValue) => {
			/**
			 * @param {Node} parameter a parameter
			 * @returns {Node} it, with the default read above it
			 */
			const withDefault = (parameter) =>
				defaultValue
					? new A.AST_DefaultAssign({
							start: parameter.start,
							left: parameter,
							operator: "=",
							right: defaultValue,
							end: defaultValue.end
						})
					: parameter;
			if (node instanceof A.AST_Object) {
				return withDefault(
					new A.AST_Destructuring({
						start: node.start,
						end: node.end,
						is_array: false,
						names: node.properties.map((/** @type {Node} */ property) =>
							toFunArgs(property)
						)
					})
				);
			}
			if (node instanceof A.AST_ObjectKeyVal) {
				node.value = toFunArgs(node.value);
				return withDefault(node);
			}
			if (node instanceof A.AST_Hole) return node;
			if (node instanceof A.AST_Destructuring) {
				node.names = node.names.map((/** @type {Node} */ name) =>
					toFunArgs(name)
				);
				return withDefault(node);
			}
			if (node instanceof A.AST_SymbolRef) {
				return withDefault(
					new A.AST_SymbolFunarg({
						name: node.name,
						start: node.start,
						end: node.end
					})
				);
			}
			if (node instanceof A.AST_Expansion) {
				node.expression = toFunArgs(node.expression);
				return withDefault(node);
			}
			if (node instanceof A.AST_Array) {
				return withDefault(
					new A.AST_Destructuring({
						start: node.start,
						end: node.end,
						is_array: true,
						names: node.elements.map((/** @type {Node} */ element) =>
							toFunArgs(element)
						)
					})
				);
			}
			if (node instanceof A.AST_Assign) {
				return withDefault(toFunArgs(node.left, node.right));
			}
			if (node instanceof A.AST_DefaultAssign) {
				node.left = toFunArgs(node.left);
				return node;
			}
			throw new Error("Invalid function parameter");
		};

		/**
		 * An assignment's or loop's target, as terser reads it.
		 * @param {EstreeNode} node the target
		 * @returns {Node} the target
		 */
		const target = (node) =>
			node.type === "ObjectPattern" || node.type === "ArrayPattern"
				? toDestructuring(cover(node))
				: from(node);

		/**
		 * The elements of a list that may hold holes, each hole on the comma that
		 * makes it, as terser's `expr_list` reads one.
		 * @param {EstreeNode} list the array or array pattern
		 * @param {(node: EstreeNode) => Node} convert converts one element
		 * @returns {Node[]} the elements
		 */
		const elements = (list, convert) => {
			const nodes = list.elements;
			const out = Array.from({ length: nodes.length });
			// The token after `[`, then after each element's comma.
			let cursor = byStart[list.start];
			for (let i = 0; i < nodes.length; i++) {
				const node = nodes[i];
				if (node === null) {
					const comma = tokenAt(cursor++);
					out[i] = new A.AST_Hole({ start: comma, end: comma });
					continue;
				}
				out[i] = convert(node);
				cursor = byEnd[node.end] + 1;
			}
			return out;
		};

		/**
		 * @param {EstreeNode} node an object or class member
		 * @param {boolean} isClass whether a class holds it
		 * @returns {Node} the member, as terser's `object_or_class_property` reads it
		 */
		const member = (node, isClass) => {
			const start = startOf(node);
			const { computed } = node;
			const isPrivate = node.key.type === "PrivateIdentifier";
			// The token terser reads the key's quote from: the key, or its `]`.
			const keyToken = computed ? afterOf(node.key) : startOf(node.key);
			if (node.type === "PropertyDefinition") {
				if (
					!computed &&
					!node.value &&
					!isPrivate &&
					keyName(node.key) === "async"
				) {
					// terser reads a field named `async` with the member after it.
					throw DECLINE;
				}
				const key = computed
					? from(node.key)
					: new (isPrivate
							? A.AST_SymbolPrivateProperty
							: A.AST_SymbolClassProperty)({
							start,
							name: isPrivate ? node.key.name : keyName(node.key),
							end: keyToken
						});
				return annotate(
					new (isPrivate ? A.AST_ClassPrivateProperty : A.AST_ClassProperty)({
						start,
						static: node.static,
						quote:
							key instanceof A.AST_SymbolClassProperty
								? keyToken.quote
								: undefined,
						key,
						value: node.value ? from(node.value) : undefined,
						end: node.value ? endOf(node.value) : keyToken
					})
				);
			}
			const key = computed
				? from(node.key)
				: new A.AST_SymbolMethod({
						start,
						name: isPrivate ? node.key.name : keyName(node.key),
						end: keyToken
					});
			const { kind } = node;
			const accessor = lambda(
				node.value,
				A.AST_Accessor,
				null,
				startOf(node.value),
				kind === "get" || kind === "set"
			);
			const isStatic = isClass ? node.static : false;
			const quote =
				key instanceof A.AST_SymbolMethod ? keyToken.quote : undefined;
			if (kind === "get" || kind === "set") {
				if (isPrivate) {
					return annotate(
						new (kind === "get" ? A.AST_PrivateGetter : A.AST_PrivateSetter)({
							start,
							static: isStatic,
							key,
							value: accessor,
							end: endOf(node)
						})
					);
				}
				return annotate(
					new (kind === "get" ? A.AST_ObjectGetter : A.AST_ObjectSetter)({
						start,
						static: isStatic,
						key,
						quote,
						value: accessor,
						end: endOf(node)
					})
				);
			}
			return annotate(
				new (isPrivate ? A.AST_PrivateMethod : A.AST_ConciseMethod)({
					start,
					static: isStatic,
					key,
					quote,
					value: accessor,
					end: endOf(node)
				})
			);
		};

		/**
		 * @param {EstreeNode} node a declaration
		 * @returns {Node} the declaration, on the tokens terser gives it before `statement` does
		 */
		const declaration = (node) => {
			let Declaration = A.AST_Var;
			let Definition = A.AST_VarDef;
			let Symbol = A.AST_SymbolVar;
			let isAwait = false;
			if (node.kind === "const") {
				Declaration = A.AST_Const;
				Symbol = A.AST_SymbolConst;
			} else if (node.kind === "let") {
				Declaration = A.AST_Let;
				Symbol = A.AST_SymbolLet;
			} else if (node.kind === "using" || node.kind === "await using") {
				Declaration = A.AST_Using;
				Definition = A.AST_UsingDef;
				Symbol = A.AST_SymbolUsing;
				isAwait = node.kind === "await using";
			}
			const { declarations } = node;
			return new Declaration({
				start: startOf(node),
				definitions: declarations.map(
					(/** @type {EstreeNode} */ declarator) =>
						new Definition({
							start: startOf(declarator),
							name: binding(declarator.id, Symbol),
							value: declarator.init ? from(declarator.init) : null,
							end: endOf(declarator)
						})
				),
				await: isAwait,
				end: endOf(declarations[declarations.length - 1])
			});
		};

		/**
		 * @param {EstreeNode[]} nodes call arguments
		 * @param {boolean} spreadEndsAfter whether a spread ends past its operand, as `new` reads one
		 * @returns {Node[]} the arguments
		 */
		const callArguments = (nodes, spreadEndsAfter) => {
			const out = Array.from({ length: nodes.length });
			for (let i = 0; i < nodes.length; i++) {
				const node = nodes[i];
				out[i] =
					node.type === "SpreadElement"
						? new A.AST_Expansion({
								start: startOf(node),
								expression: from(node.argument),
								end: spreadEndsAfter ? afterOf(node) : endOf(node)
							})
						: from(node);
			}
			return out;
		};

		/**
		 * @param {EstreeNode} node a node that may continue a chain
		 * @returns {boolean} whether it is one
		 */
		const isChainLink = (node) =>
			node.type === "MemberExpression" ||
			node.type === "CallExpression" ||
			node.type === "TaggedTemplateExpression";

		/**
		 * The nodes of a subscript chain, and which of them terser annotates:
		 * every call, and the chain as a whole where it holds a member step.
		 * @param {EstreeNode} node the outermost link of a chain
		 * @returns {Node} the chain
		 */
		const chain = (node) => {
			/** @type {EstreeNode[]} */
			const links = [];
			let base = node;
			while (isChainLink(base)) {
				links.push(base);
				base =
					base.type === "TaggedTemplateExpression"
						? base.tag
						: base.type === "CallExpression"
							? base.callee
							: base.object;
			}
			let current = from(base);
			const { start } = current;
			let memberSteps = 0;
			let first = links.length - 1;
			const innermost = links[first];
			if (
				base.type === "Identifier" &&
				base.name === "async" &&
				current.start.value === "async" &&
				innermost.type === "CallExpression" &&
				!innermost.optional
			) {
				// terser reads `async(...)` as an arrow's parameters that turned out
				// not to be, which leaves the call without `optional`.
				const call = new A.AST_Call({
					expression: current,
					args: callArguments(innermost.arguments, true)
				});
				call.start = start;
				call.end = endOf(innermost);
				current = annotate(call);
				first--;
			}
			for (let i = first; i >= 0; i--) {
				const link = links[i];
				if (link.type === "MemberExpression") {
					memberSteps++;
					const { property } = link;
					if (property.type === "PrivateIdentifier") {
						current = new A.AST_DotHash({
							start,
							expression: current,
							optional: link.optional,
							property: property.name,
							end: endOf(link)
						});
					} else if (link.computed) {
						current = new A.AST_Sub({
							start,
							expression: current,
							optional: link.optional,
							property: from(property),
							end: endOf(link)
						});
					} else {
						current = new A.AST_Dot({
							start,
							expression: current,
							optional: link.optional,
							property: property.name,
							end: endOf(link)
						});
					}
				} else if (link.type === "CallExpression") {
					current = annotate(
						new A.AST_Call({
							start,
							expression: current,
							optional: link.optional,
							args: callArguments(link.arguments, false),
							end: endOf(link)
						})
					);
				} else {
					current = new A.AST_PrefixedTemplateString({
						start,
						prefix: current,
						template_string: from(link.quasi),
						end: endOf(link)
					});
				}
			}
			if (memberSteps !== 0) annotate(current);
			return current;
		};

		/**
		 * @param {EstreeNode} node a parenthesized expression
		 * @returns {Node} what it holds, with the parentheses' tokens
		 */
		const parenthesized = (node) => {
			const open = startOf(node);
			const close = endOf(node);
			const inner = node.expression;
			// A sequence is read with `)` already taken, so its `peek()` end is the
			// second token past it.
			let ex;
			if (inner.type === "SequenceExpression") {
				// Its comments are what the `)`'s join, so they must be its own.
				const endIndex = Math.min(byEnd[node.end] + 1, count);
				ownGap(endIndex + 1);
				ex = new A.AST_Sequence({
					start: open,
					expressions: list(inner.expressions),
					end: tokenAt(endIndex)
				});
			} else {
				ex = from(inner);
			}
			if (ex.start) {
				const outside = open.comments_before.length;
				outerComments.set(open, outside);
				const comments = ex.start.comments_before;
				comments.unshift(...open.comments_before);
				open.comments_before = comments;
				if (outside === 0 && comments.length > 0) {
					const comment = comments[0];
					if (!comment.nlb) {
						comment.nlb = open.nlb;
						open.nlb = false;
					}
				}
				open.comments_after = ex.start.comments_after;
			}
			ex.start = open;
			if (ex.end) {
				close.comments_before = ex.end.comments_before;
				const after = ex.end.comments_after;
				after.push(...close.comments_after);
				close.comments_after = after;
			}
			ex.end = close;
			if (ex instanceof A.AST_Call) annotate(ex);
			return ex;
		};

		/**
		 * @param {EstreeNode} node an import or export's source
		 * @returns {Node} the string terser keeps, which it does not annotate
		 */
		const moduleName = (node) => {
			const token = startOf(node);
			return new A.AST_String({
				start: token,
				value: token.value,
				quote: token.quote,
				end: token
			});
		};

		/**
		 * The `with { ... }` an import or export ends with, as the object terser
		 * reads it as.
		 * @param {EstreeNode} node the import or export
		 * @returns {Node | null} the attributes
		 */
		const importAttributes = (node) => {
			const after = byEnd[node.source.end];
			if (
				after >= count ||
				after >= byEnd[node.end] ||
				(values[after] !== "with" && values[after] !== "assert")
			) {
				return null;
			}
			const open = tokenAt(after + 1);
			const { attributes } = node;
			let closeIndex = byEnd[node.end] - 1;
			if (values[closeIndex] === ";") closeIndex--;
			return new A.AST_Object({
				start: open,
				properties: attributes.map((/** @type {EstreeNode} */ attribute) => {
					const start = startOf(attribute);
					return annotate(
						new A.AST_ObjectKeyVal({
							start,
							quote: start.quote,
							key: keyName(attribute.key),
							value: from(attribute.value),
							end: endOf(attribute)
						})
					);
				}),
				end: tokenAt(closeIndex)
			});
		};

		/**
		 * terser's `map_name`: one `{ ... }` entry of an import or export.
		 * @param {EstreeNode} node the specifier
		 * @param {boolean} isImport whether an import holds it
		 * @returns {Node} the mapping
		 */
		const mapName = (node, isImport) => {
			const outer = isImport ? node.imported : node.local;
			const inner = isImport ? node.local : node.exported;
			const start = startOf(outer);
			/**
			 * @param {Node} Type the symbol class
			 * @param {Token} token the token it names
			 * @param {string=} quote the quote it keeps
			 * @returns {Node} the symbol
			 */
			const make = (Type, token, quote) =>
				new Type({
					name:
						typeof token.value === "string" ? token.value : `${token.value}`,
					quote: quote || undefined,
					start: token,
					end: token
				});
			const renamed = outer.start !== inner.start;
			let name;
			let foreignName;
			if (isImport) {
				foreignName = make(A.AST_SymbolImportForeign, start, start.quote);
				name = renamed
					? make(A.AST_SymbolImport, startOf(inner))
					: new A.AST_SymbolImport(foreignName);
			} else {
				name = make(A.AST_SymbolExport, start, start.quote);
				if (renamed) {
					const token = startOf(inner);
					foreignName = make(A.AST_SymbolExportForeign, token, token.quote);
				} else {
					foreignName = new A.AST_SymbolExportForeign(name);
				}
			}
			return new A.AST_NameMapping({
				start,
				foreign_name: foreignName,
				name,
				end: endOf(inner)
			});
		};

		/**
		 * terser's `map_nameAsterisk`: `* as name`, or a bare `*`.
		 * @param {boolean} isImport whether an import holds it
		 * @param {Node | undefined} named the name after `as`
		 * @param {number} lastIndex the index of the mapping's last token
		 * @returns {Node} the mapping
		 */
		const mapAsterisk = (isImport, named, lastIndex) => {
			const start = tokenAt(lastIndex + 1);
			const end = tokenAt(lastIndex);
			const name =
				(isImport && named) ||
				new (isImport ? A.AST_SymbolImport : A.AST_SymbolExport)({
					start,
					name: "*",
					end
				});
			const foreignName =
				(!isImport && named) ||
				new (isImport ? A.AST_SymbolImportForeign : A.AST_SymbolExportForeign)({
					start,
					name: "*",
					end
				});
			return new A.AST_NameMapping({
				start,
				foreign_name: foreignName,
				name,
				end
			});
		};

		/**
		 * @param {EstreeNode} node an import declaration
		 * @returns {Node} the import, on the tokens terser gives it before `statement` does
		 */
		const importDeclaration = (node) => {
			let importedName;
			/** @type {Node[] | undefined} */
			let importedNames;
			for (const specifier of node.specifiers) {
				if (specifier.type === "ImportDefaultSpecifier") {
					importedName = symbol(A.AST_SymbolImport, specifier.local);
				} else if (specifier.type === "ImportNamespaceSpecifier") {
					const local = symbol(A.AST_SymbolImport, specifier.local);
					importedNames = [mapAsterisk(true, local, byEnd[specifier.end] - 1)];
				} else {
					if (importedNames === undefined) importedNames = [];
					importedNames.push(mapName(specifier, true));
				}
			}
			// `import {} from` names a list that holds nothing.
			if (
				importedNames === undefined &&
				node.specifiers.every(
					(/** @type {EstreeNode} */ specifier) =>
						specifier.type === "ImportDefaultSpecifier"
				)
			) {
				const index = byStart[node.source.start] - 3;
				if (index >= 0 && values[index] === "}") importedNames = [];
			}
			const attributes = importAttributes(node);
			return new A.AST_Import({
				start: startOf(node),
				imported_name: importedName,
				imported_names: importedNames,
				module_name: moduleName(node.source),
				attributes,
				phase: node.phase || null,
				end: attributes ? tokenAt(byEnd[node.end] - 1) : afterOf(node.source)
			});
		};

		/**
		 * @param {EstreeNode} node an export declaration
		 * @returns {Node} the export, on the tokens terser gives it before `statement` does
		 */
		const exportDeclaration = (node) => {
			const start = tokenAt(byStart[node.start]);
			if (node.type === "ExportAllDeclaration") {
				const named = node.exported
					? symbolOrString(A.AST_SymbolExportForeign, node.exported)
					: undefined;
				const lastIndex = byStart[node.source.start] - 3;
				return new A.AST_Export({
					start,
					is_default: undefined,
					exported_names: [mapAsterisk(false, named, lastIndex)],
					module_name: moduleName(node.source),
					end: endOfExport(node),
					attributes: importAttributes(node)
				});
			}
			if (node.type === "ExportNamedDeclaration" && !node.declaration) {
				const exportedNames = node.specifiers.map(
					(/** @type {EstreeNode} */ specifier) => mapName(specifier, false)
				);
				if (node.source) {
					return new A.AST_Export({
						start,
						is_default: undefined,
						exported_names: exportedNames,
						module_name: moduleName(node.source),
						end: endOfExport(node),
						attributes: importAttributes(node)
					});
				}
				return new A.AST_Export({
					start,
					is_default: undefined,
					exported_names: exportedNames,
					end: endOfExport(node)
				});
			}
			const { declaration } = node;
			const isDefault =
				node.type === "ExportDefaultDeclaration" ? true : undefined;
			let exportedValue;
			let exportedDefinition;
			if (
				declaration.type === "VariableDeclaration" ||
				((declaration.type === "FunctionDeclaration" ||
					declaration.type === "ClassDeclaration") &&
					declaration.id)
			) {
				exportedDefinition = statement(declaration);
			} else if (
				declaration.type === "FunctionDeclaration" ||
				declaration.type === "ClassDeclaration"
			) {
				exportedValue = from({
					...declaration,
					type:
						declaration.type === "FunctionDeclaration"
							? "FunctionExpression"
							: "ClassExpression"
				});
				exportedValue.start = startOf(declaration);
				exportedValue.end = endOf(declaration);
			} else {
				exportedValue = from(declaration);
			}
			return new A.AST_Export({
				start,
				is_default: isDefault,
				exported_value: exportedValue,
				exported_definition: exportedDefinition,
				end: endOfExport(node),
				attributes: null
			});
		};

		/**
		 * @param {EstreeNode} node an export
		 * @returns {Token} its last token before any `;`
		 */
		const endOfExport = (node) => {
			const last = byEnd[node.end] - 1;
			return tokenAt(
				values[last] === ";" && kinds[last] === OTHER ? last - 1 : last
			);
		};

		/**
		 * terser's `as_symbol_or_string`.
		 * @param {Node} Type the symbol class
		 * @param {EstreeNode} node an identifier or string
		 * @returns {Node} the symbol
		 */
		const symbolOrString = (Type, node) => {
			const token = startOf(node);
			if (token.type === "string") {
				return new Type({
					start: token,
					end: token,
					name: token.value,
					quote: token.quote
				});
			}
			return new Type({ name: token.value, start: token, end: token });
		};

		/**
		 * @param {EstreeNode} node a node
		 * @returns {Node} terser's node for it
		 */
		const from = (node) => {
			switch (node.type) {
				case "Identifier":
					// terser reads `let` as a keyword wherever it stands.
					if (node.name === "let") throw DECLINE;
					return symbol(A.AST_SymbolRef, node);
				case "MemberExpression":
				case "CallExpression":
				case "TaggedTemplateExpression":
					return chain(node);
				case "Literal":
					return literal(node);
				case "ExpressionStatement":
					if (
						node.expression.type === "Identifier" &&
						node.expression.name === "async"
					) {
						// terser reads `async` and a function after a line break as one.
						throw DECLINE;
					}
					return new A.AST_SimpleStatement({ body: from(node.expression) });
				case "ParenthesizedExpression":
					return parenthesized(node);
				case "BinaryExpression":
					if (node.left.type === "PrivateIdentifier") {
						const token = startOf(node.left);
						return new A.AST_PrivateIn({
							start: startOf(node),
							key: new A.AST_SymbolPrivateProperty({
								start: token,
								name: node.left.name,
								end: token
							}),
							value: from(node.right),
							end: endOf(node)
						});
					}
				// falls through
				case "LogicalExpression": {
					let leftmost = node.left;
					while (
						leftmost.type === "BinaryExpression" ||
						leftmost.type === "LogicalExpression"
					) {
						// terser reads the operators after `#x in y` into its right side.
						if (leftmost.left.type === "PrivateIdentifier") throw DECLINE;
						leftmost = leftmost.left;
					}
					const left = from(node.left);
					const right = from(node.right);
					return new A.AST_Binary({
						start: left.start,
						left,
						operator: node.operator,
						right,
						end: right.end
					});
				}
				case "AssignmentExpression":
					return new A.AST_Assign({
						start: startOf(node),
						left: target(node.left),
						operator: node.operator,
						right: from(node.right),
						logical:
							node.operator === "??=" ||
							node.operator === "&&=" ||
							node.operator === "||=",
						end: endOf(node)
					});
				case "Program":
					return new A.AST_Toplevel({
						start: firstReadAt(0),
						body: statements(node.body),
						end: count === 0 ? null : tokenAt(count - 1)
					});
				case "VariableDeclaration":
					return declaration(node);
				case "BlockStatement":
					return new A.AST_BlockStatement({
						start: startOf(node),
						body: blockBody(node),
						end: endOf(node)
					});
				case "ReturnStatement":
					return new A.AST_Return({
						value: node.argument ? from(node.argument) : null
					});
				case "IfStatement":
					return new A.AST_If({
						condition: from(node.test),
						body: statement(node.consequent),
						alternative: node.alternate ? statement(node.alternate) : null
					});
				case "ConditionalExpression":
					return new A.AST_Conditional({
						start: startOf(node),
						condition: from(node.test),
						consequent: from(node.consequent),
						alternative: from(node.alternate),
						end: endOf(node)
					});
				case "UnaryExpression":
				case "UpdateExpression":
					return new (node.prefix ? A.AST_UnaryPrefix : A.AST_UnaryPostfix)({
						start: startOf(node),
						operator: node.operator,
						expression: from(node.argument),
						end: endOf(node)
					});
				case "ObjectExpression":
					return new A.AST_Object({
						start: startOf(node),
						properties: node.properties.map(
							(/** @type {EstreeNode} */ property) => {
								if (property.type === "SpreadElement") {
									return new A.AST_Expansion({
										start: startOf(property),
										expression: from(property.argument),
										end: endOf(property)
									});
								}
								if (property.kind !== "init" || property.method) {
									return member(property, false);
								}
								const start = startOf(property);
								const key = property.computed
									? from(property.key)
									: keyName(property.key);
								let value;
								if (property.shorthand) {
									const token = startOf(property.key);
									value = new A.AST_SymbolRef({
										start: token,
										name: key,
										end: token
									});
								} else {
									value = from(property.value);
								}
								return annotate(
									new A.AST_ObjectKeyVal({
										start,
										quote: start.quote,
										key,
										value,
										end: endOf(property)
									})
								);
							}
						),
						end: endOf(node)
					});
				case "ArrayExpression":
					return new A.AST_Array({
						start: startOf(node),
						elements: elements(node, (element) =>
							element.type === "SpreadElement"
								? new A.AST_Expansion({
										start: startOf(element),
										expression: from(element.argument),
										end: afterOf(element)
									})
								: from(element)
						),
						end: endOf(node)
					});
				case "FunctionExpression":
					return lambda(
						node,
						A.AST_Function,
						node.id ? symbol(A.AST_SymbolLambda, node.id) : null,
						startOf(node)
					);
				case "FunctionDeclaration":
					return lambda(
						node,
						A.AST_Defun,
						node.id ? symbol(A.AST_SymbolDefun, node.id) : null,
						startOf(node)
					);
				case "ArrowFunctionExpression": {
					const { body, params } = node;
					const start = startOf(node);
					// terser reads a lone parameter as its own token, anything else
					// as the expressions it later turns into parameters.
					const startIndex = byStart[node.start] - 1;
					const firstIndex =
						params.length === 1 ? byStart[params[0].start] - 1 : -1;
					const lone =
						params.length === 1 &&
						params[0].type === "Identifier" &&
						(firstIndex === startIndex ||
							(node.async && firstIndex === startIndex + 1));
					const argnames = lone
						? [
								new A.AST_SymbolFunarg({
									name: params[0].name,
									start,
									end: start
								})
							]
						: params.map((/** @type {EstreeNode} */ param) =>
								toFunArgs(
									param.type === "RestElement"
										? new A.AST_Expansion({
												start: startOf(param),
												expression: cover(param.argument),
												end: afterOf(param)
											})
										: cover(param)
								)
							);
					return new A.AST_Arrow({
						start,
						end: undefined,
						async: node.async,
						argnames,
						body:
							body.type === "BlockStatement"
								? statements(body.body)
								: [
										new A.AST_Return({
											start: startOf(body),
											value: from(body),
											end: afterOf(body)
										})
									]
					});
				}
				case "ThisExpression":
					return new A.AST_This({
						start: startOf(node),
						name: "this",
						end: endOf(node)
					});
				case "NewExpression":
					return annotate(
						new A.AST_New({
							start: startOf(node),
							expression: from(node.callee),
							args: callArguments(node.arguments, true),
							end: endOf(node)
						})
					);
				case "SequenceExpression":
					// terser ends a sequence at `peek()`, a token past the one after it.
					return new A.AST_Sequence({
						start: firstReadAt(byStart[node.start] - 1),
						expressions: list(node.expressions),
						end: tokenAt(Math.min(byEnd[node.end] + 1, count))
					});
				case "SpreadElement":
					return new A.AST_Expansion({
						start: startOf(node),
						expression: from(node.argument),
						end: endOf(node)
					});
				case "ThrowStatement":
					return new A.AST_Throw({ value: from(node.argument) });
				case "ForStatement":
					return new A.AST_For({
						init: node.init ? from(node.init) : null,
						condition: node.test ? from(node.test) : null,
						step: node.update ? from(node.update) : null,
						body: statement(node.body)
					});
				case "ForInStatement":
					return new A.AST_ForIn({
						init: target(node.left),
						object: from(node.right),
						body: statement(node.body)
					});
				case "ForOfStatement": {
					const init = target(node.left);
					return new A.AST_ForOf({
						await: node.await,
						init,
						name:
							init instanceof A.AST_DefinitionsLike
								? init.definitions[0].name
								: null,
						object: from(node.right),
						body: statement(node.body)
					});
				}
				case "WhileStatement":
					// Read by `statement` itself, which calls its own unwrapped self.
					return new A.AST_While({
						condition: from(node.test),
						body: from(node.body)
					});
				case "DoWhileStatement":
					return new A.AST_Do({
						body: from(node.body),
						condition: from(node.test)
					});
				case "WithStatement":
					return new A.AST_With({
						expression: from(node.object),
						body: from(node.body)
					});
				case "EmptyStatement":
					return new A.AST_EmptyStatement();
				case "DebuggerStatement":
					return new A.AST_Debugger();
				case "BreakStatement":
				case "ContinueStatement": {
					let label = null;
					let definition;
					if (node.label) {
						label = symbol(A.AST_LabelRef, node.label);
						for (let i = labels.length - 1; i >= 0; i--) {
							if (labels[i].name === label.name) {
								definition = labels[i];
								break;
							}
						}
						label.thedef = definition;
					}
					const jump = new (
						node.type === "BreakStatement" ? A.AST_Break : A.AST_Continue
					)({
						label
					});
					if (definition) definition.references.push(jump);
					return jump;
				}
				case "LabeledStatement": {
					const label = symbol(A.AST_Label, node.label);
					labels.push(label);
					const body = statement(node.body);
					labels.pop();
					return new A.AST_LabeledStatement({ body, label });
				}
				case "SwitchStatement":
					return new A.AST_Switch({
						expression: from(node.discriminant),
						body: node.cases.map(
							(/** @type {EstreeNode} */ branch) =>
								new (branch.test ? A.AST_Case : A.AST_Default)({
									start: startOf(branch),
									expression: branch.test ? from(branch.test) : undefined,
									body: statementList(branch.consequent),
									end: endOf(branch)
								})
						)
					});
				case "TryStatement": {
					const { block, handler, finalizer } = node;
					return new A.AST_Try({
						body: new A.AST_TryBlock({
							start: startOf(block),
							body: blockBody(block),
							end: endOf(block)
						}),
						bcatch: handler
							? new A.AST_Catch({
									start: startOf(handler),
									argname: handler.param
										? parameter(handler.param, A.AST_SymbolCatch)
										: null,
									body: blockBody(handler.body),
									end: endOf(handler)
								})
							: null,
						bfinally: finalizer
							? new A.AST_Finally({
									start: tokenAt(byStart[finalizer.start] - 2),
									body: blockBody(finalizer),
									end: endOf(finalizer)
								})
							: null
					});
				}
				case "TemplateLiteral": {
					const segments = [];
					const { quasis, expressions } = node;
					for (let i = 0; i < quasis.length; i++) {
						const quasi = quasis[i];
						if (
							quasi.value.cooked === null ||
							LINE_CONTINUATION.test(quasi.value.raw)
						) {
							throw DECLINE;
						}
						const token = tokenAt(byStart[quasi.start - 1] - 1);
						segments.push(
							new A.AST_TemplateSegment({
								start: token,
								raw: quasi.value.raw,
								value: quasi.value.cooked,
								end: token
							})
						);
						if (i < expressions.length) segments.push(from(expressions[i]));
					}
					// terser ends a template on the token after it.
					return new A.AST_TemplateString({
						start: startOf(node),
						segments,
						end: afterOf(node)
					});
				}
				case "ClassDeclaration":
				case "ClassExpression": {
					const isDeclaration = node.type === "ClassDeclaration";
					const { body } = node.body;
					return new (isDeclaration ? A.AST_DefClass : A.AST_ClassExpression)({
						start: startOf(node),
						name: node.id
							? symbol(
									isDeclaration ? A.AST_SymbolDefClass : A.AST_SymbolClass,
									node.id
								)
							: undefined,
						extends: node.superClass ? from(node.superClass) : undefined,
						properties: body.map((/** @type {EstreeNode} */ element) =>
							element.type === "StaticBlock"
								? new A.AST_ClassStaticBlock({
										start: tokenAt(byStart[element.start]),
										body: statementList(element.body),
										end: endOf(element)
									})
								: member(element, true)
						),
						end: endOf(node)
					});
				}
				case "AwaitExpression":
					// terser reads the end before the operand, so it is the operand's start.
					return new A.AST_Await({
						start: startOf(node),
						end: tokenAt(byStart[node.start]),
						expression: from(node.argument)
					});
				case "YieldExpression":
					// terser starts a `yield` on the token after the keyword.
					return new A.AST_Yield({
						start: firstReadAt(byStart[node.start]),
						expression: node.argument ? from(node.argument) : null,
						is_star: node.delegate,
						end: endOf(node)
					});
				case "ChainExpression":
					return new A.AST_Chain({
						start: startOf(node),
						expression: from(node.expression),
						end: endOf(node)
					});
				case "Super":
					return new A.AST_Super({
						start: startOf(node),
						name: "super",
						end: endOf(node)
					});
				case "MetaProperty":
					return new (
						node.meta.name === "new" ? A.AST_NewTarget : A.AST_ImportMeta
					)({
						start: startOf(node),
						end: endOf(node)
					});
				case "ImportExpression":
					return new A.AST_DynamicImport({
						start: startOf(node),
						args: node.options
							? [from(node.source), from(node.options)]
							: [from(node.source)],
						phase: node.phase || null,
						end: endOf(node)
					});
				case "PrivateIdentifier":
					return new A.AST_SymbolPrivateProperty({
						start: startOf(node),
						name: node.name,
						end: endOf(node)
					});
				case "ImportDeclaration":
					return importDeclaration(node);
				case "ExportNamedDeclaration":
				case "ExportDefaultDeclaration":
				case "ExportAllDeclaration":
					return exportDeclaration(node);
				default:
					throw new Error(`Unsupported node ${node.type}`);
			}
		};

		/**
		 * @param {EstreeNode} node a literal
		 * @returns {Node} terser's constant for it
		 */
		const literal = (node) => {
			const start = startOf(node);
			const end = endOf(node);
			const { value } = node;
			if (node.regex) {
				return new A.AST_RegExp({
					start,
					value: { source: node.regex.pattern, flags: node.regex.flags },
					end
				});
			}
			if (node.bigint !== undefined) {
				return new A.AST_BigInt({
					start,
					value: node.raw.slice(0, -1).replace(/_/g, ""),
					raw: node.raw,
					end
				});
			}
			switch (typeof value) {
				case "string":
					if (LINE_CONTINUATION.test(node.raw)) throw DECLINE;
					return annotate(
						new A.AST_String({ start, value, quote: start.quote, end })
					);
				case "number":
					// A legacy octal or `0`-led decimal, which terser tokenizes its own way.
					if (/^0[\d_]/.test(node.raw)) throw DECLINE;
					if (value === Infinity) return new A.AST_Infinity({ start, end });
					return new A.AST_Number({ start, value, raw: node.raw, end });
				case "boolean":
					return new (value ? A.AST_True : A.AST_False)({ start, end });
				default:
					return new A.AST_Null({ start, end });
			}
		};

		try {
			return from(program);
		} catch (_err) {
			return undefined;
		}
	};
};

module.exports = createTerserTree;
