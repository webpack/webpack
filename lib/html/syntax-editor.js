/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// Loaded on the first edit, once the parser has loaded and exports these.
const { Field, NodeType, Part } = require("./syntax-parser");

/** @typedef {import("./syntax-parser").HtmlNodeRef} HtmlNodeRef */
/** @typedef {import("./syntax-parser").HtmlNodeRef} HtmlElement */
/** @typedef {import("../util/SourceProcessor").EditContext} EditContext */
/** @typedef {import("../util/SourceProcessor").EditableTree} EditableTree */
/** @typedef {Omit<EditableTree, "typeName" | "fieldName" | "isList" | "isOptional" | "locate" | "itemsOf" | "write" | "parse" | "check">} WalkSteps the walk's steps, which `EditContext` takes over once a visitor edits */
/** @typedef {"html" | "mathml" | "svg" | "xml"} HtmlNamespace an element's namespace */
/** @typedef {"data" | "rcdata" | "rawtext" | "script" | "plaintext" | "void" | "template"} ContentModel how an element's content reads */

/**
 * What the edits read and write of the tree they are made in: its nodes'
 * links and spans, its attributes, and the records the print reads of what
 * they changed. An attribute is its negative id where a node stands for it.
 * @typedef {object} HtmlEditedTree
 * @property {EditContext} ctx the edits every language makes alike
 * @property {boolean} xmlMode whether the source is XML
 * @property {string} input the source, with the text written anew after it
 * @property {Map<HtmlNodeRef, number[]>} formerSpans where a node or attribute stood before its first move: start, end, tag end and name end
 * @property {Set<HtmlElement>} staleTags the elements whose start tag is to be written anew
 * @property {string | null} publicId the doctype's public identifier
 * @property {string | null} systemId the doctype's system identifier
 * @property {(n: HtmlNodeRef) => number} type the node's `NodeType`
 * @property {(n: HtmlNodeRef) => HtmlNodeRef} parentOf its parent, `0` for none
 * @property {(n: HtmlNodeRef) => HtmlNodeRef[]} childNodesOf a fresh array of its child nodes
 * @property {(n: HtmlElement) => HtmlNodeRef} templateContentOf a template's content, `0` for none
 * @property {(n: HtmlElement) => HtmlNamespace} namespaceOf an element's namespace
 * @property {(n: HtmlElement) => ContentModel} contentModel how an element's content reads
 * @property {(n: HtmlElement) => boolean} selfClosing whether an element closes its own start tag, holding nothing
 * @property {(n: HtmlNodeRef) => boolean} isShadowRoot whether a node is a declarative shadow root
 * @property {(flag: number, n: HtmlNodeRef) => boolean} flag whether a `Flag` is set
 * @property {(n: HtmlNodeRef) => string} stringOf the node's text: an element's or doctype's name, a text's, comment's or processing instruction's data
 * @property {(n: HtmlNodeRef, value: string) => void} setString sets it
 * @property {(n: HtmlNodeRef) => string | undefined} targetOf a processing instruction's target
 * @property {(n: HtmlNodeRef, target: string) => void} setTarget sets it
 * @property {(n: HtmlNodeRef) => number} start where a node or attribute starts
 * @property {(n: HtmlNodeRef) => number} end where a node or attribute ends
 * @property {(n: HtmlElement) => number} nameEnd where an element's tag name ends, `0` for a tag the parser inserted
 * @property {(n: HtmlElement) => number} tagEnd where an element's start tag ends
 * @property {(n: HtmlElement) => boolean} hasSourceTag whether an element's start tag is in the source
 * @property {(n: HtmlNodeRef, start: number, end: number) => void} placeNode the node reads its source between two offsets
 * @property {(el: HtmlElement, start: number, nameEnd: number, tagEnd: number) => void} placeTag an element's start tag stands at these offsets
 * @property {(el: HtmlElement) => void} forgetMerged the element's start tag spells every attribute, a repeated tag's merged ones too
 * @property {(el: HtmlElement) => number[]} attributeIds an element's attribute ids, in order
 * @property {(el: HtmlElement) => number} attributeCountOf how many attributes it has
 * @property {(el: HtmlElement) => void} releaseAttributes the element no longer holds the attributes read off it
 * @property {(el: HtmlElement, ids: number[], removed: number[], added: number[]) => void} setAttributes an element holds these attributes, `removed` leaving it and `added` coming in
 * @property {(id: number) => string} attributeName an attribute's name
 * @property {(id: number, name: string) => void} renameAttribute sets it, forgetting what was read off the former
 * @property {(id: number) => number} attributeStart where its name starts, `-1` for one with no source
 * @property {(id: number) => number} attributeNameEnd where its name ends
 * @property {(id: number) => number} attributeValueStart where its value starts, `-1` without one
 * @property {(id: number) => number} attributeValueEnd where its value ends
 * @property {(id: number) => number} attributeEnd where it ends, past its value's closing quote
 * @property {(id: number) => string} attributeValue its value as written
 * @property {(id: number, start: number, nameEnd: number, valueStart: number, valueEnd: number) => void} placeAttribute it stands at these offsets, `-1` for no value
 * @property {(id: number, value: string) => void} storeAttributeValue its value as written, escaped
 * @property {(id: number, value: string) => void} setXmlAttributeValue its value, decoded, in an XML tree
 * @property {(value: string) => string} escapeAttributeValue writes a value to stand between double quotes
 * @property {(value: string) => string} asciiLowercase lowercases ASCII letters
 * @property {() => void} invalidateCursors the tree changed shape, so a kept cursor reads it anew
 * @property {(parent: HtmlNodeRef, node: HtmlNodeRef) => void} unlinkChild takes a node out of its parent's children
 * @property {(parent: HtmlNodeRef, before: HtmlNodeRef, nodes: HtmlNodeRef[]) => void} linkChildren links nodes into a parent's children before `before`, at the end for `0`
 * @property {(context: string, text: string) => HtmlNodeRef[]} parseFragment parses text as the content of an element named `context`, into nodes not yet in the tree
 * @property {(container: HtmlNodeRef) => boolean} printsOpen whether the print wrote out the node's start tag and what it held up to where the walk is
 * @property {() => void} forgetDoctypeSpans the doctype's identifiers read no source any more
 */

const CC_SOLIDUS = 0x2f;
const CC_GREATER_THAN = 0x3e;

// The nodes of each type, and the fields, by number, for an error.
const NODE_TYPE_NAMES = Object.keys(NodeType);
const FIELD_NAMES = Object.keys(Field);

/**
 * @param {HtmlEditedTree} tree the tree
 * @param {HtmlNodeRef} n an element, document or fragment
 * @returns {string} the context its children parse in, as `fragmentContext` takes it
 */
const contextOf = (tree, n) => {
	if (tree.type(n) === NodeType.DocumentFragment) return "template";
	if (tree.type(n) !== NodeType.Element) return "body";
	const ns = tree.namespaceOf(n);
	const name = tree.stringOf(n);
	return ns === "svg" ? `svg ${name}` : ns === "mathml" ? `math ${name}` : name;
};

/**
 * @param {HtmlEditedTree} tree the tree
 * @param {HtmlNodeRef} n a node
 * @returns {boolean} whether it holds children an edit may change
 */
const holdsChildren = (tree, n) => {
	const type = tree.type(n);
	return (
		type === NodeType.Document ||
		type === NodeType.DocumentFragment ||
		(type === NodeType.Element &&
			!tree.selfClosing(n) &&
			tree.templateContentOf(n) === 0)
	);
};

/**
 * @param {HtmlEditedTree} tree the tree
 * @param {HtmlElement} n an element
 * @returns {boolean} whether its children are raw text, so only text stands in it
 */
const holdsRawText = (tree, n) => {
	const model = tree.contentModel(n);
	return model !== "data" && model !== "void" && model !== "template";
};

/**
 * Keeps where a node or attribute stood in the source, before its first move.
 * @param {HtmlEditedTree} tree the tree
 * @param {HtmlNodeRef} n the node, or an attribute as its negative id
 * @returns {void}
 */
const noteFormerSpan = (tree, n) => {
	if (!tree.formerSpans.has(n)) {
		tree.formerSpans.set(n, [
			tree.start(n),
			tree.end(n),
			n > 0 ? tree.tagEnd(n) : 0,
			n > 0 ? tree.nameEnd(n) : 0
		]);
	}
};

/**
 * Writes a node's source anew at the end of the input, for a node whose own
 * text an edit changed and which prints as written.
 * @param {HtmlEditedTree} tree the tree
 * @param {HtmlNodeRef} n the node
 * @param {string} text its new source
 * @returns {void}
 */
const rewriteSource = (tree, n, text) => {
	noteFormerSpan(tree, n);
	const start = tree.input.length;
	tree.input += text;
	tree.placeNode(n, start, tree.input.length);
};

/**
 * Has an element's start tag written anew from its name and attributes before
 * it prints, once an edit changed either.
 * @param {HtmlEditedTree} tree the tree
 * @param {HtmlElement} n the element
 * @returns {void}
 */
const rebuildTag = (tree, n) => {
	tree.staleTags.add(n);
};

/**
 * Writes an attribute's source anew at the end of the input.
 * @param {HtmlEditedTree} tree the tree
 * @param {number} id the attribute
 * @param {string | null} value its value as written, escaped; null keeps the one it has
 * @returns {void}
 */
const rewriteAttribute = (tree, id, value) => {
	noteFormerSpan(tree, -id);
	const name = tree.attributeName(id);
	let text = name;
	let valueAt = -1;
	let valueLength = 0;
	const valueStart = tree.attributeValueStart(id);
	if (value === null && valueStart !== -1) {
		// The value keeps its quotes, and what stood around its `=`.
		const from = tree.attributeNameEnd(id);
		valueAt = name.length + valueStart - from;
		valueLength = tree.attributeValueEnd(id) - valueStart;
		text += tree.input.slice(from, tree.attributeEnd(id));
	} else {
		const written = value === null ? tree.attributeValue(id) : value;
		if (value !== null || written !== "") {
			valueAt = name.length + 2;
			valueLength = written.length;
			text += `="${written}"`;
		}
	}
	const start = tree.input.length;
	tree.input += text;
	tree.placeAttribute(
		id,
		start,
		start + name.length,
		valueAt === -1 ? -1 : start + valueAt,
		valueAt === -1 ? -1 : start + valueAt + valueLength
	);
	if (value !== null) tree.storeAttributeValue(id, value);
};

/**
 * Writes an element's start tag anew at the end of the input, from its name
 * and attributes, each attribute's own source copied in.
 * @param {HtmlEditedTree} tree the tree
 * @param {HtmlElement} el the element
 * @returns {void}
 */
const writeTagAnew = (tree, el) => {
	tree.staleTags.delete(el);
	// The tag written spells every attribute, a repeated tag's merged ones too.
	tree.forgetMerged(el);
	const source = tree.input;
	const start = tree.start(el);
	const nameEnd = tree.nameEnd(el);
	const tagEnd = tree.tagEnd(el);
	const written = nameEnd !== 0 && tree.hasSourceTag(el);
	const name = written ? source.slice(start + 1, nameEnd) : tree.stringOf(el);
	const ids = tree.attributeIds(el);
	// Where the source tag's own attributes end, for a `/>` closing it.
	let last = nameEnd !== 0 ? nameEnd : -1;
	for (const id of ids) {
		const from = tree.attributeStart(id);
		if (from > start && from < tagEnd) {
			last = Math.max(last, tree.attributeEnd(id));
		}
	}
	const solidus =
		last !== -1 &&
		tagEnd - 2 >= last &&
		source.charCodeAt(tagEnd - 2) === CC_SOLIDUS &&
		source.charCodeAt(tagEnd - 1) === CC_GREATER_THAN;
	let text = `<${name}`;
	/** @type {number[]} */
	const at = [];
	// The spaces between attributes are read where the source tag stood.
	const formerSpans = tree.formerSpans;
	const own = formerSpans.size === 0 ? undefined : formerSpans.get(el);
	const tagStart = own === undefined ? start : own[0];
	const sourceTagEnd = own === undefined ? tagEnd : own[2];
	const sourceNameEnd = own === undefined ? nameEnd : own[3];
	let previous = sourceNameEnd !== 0 ? sourceNameEnd : -1;
	for (const id of ids) {
		if (tree.attributeStart(id) === -1) rewriteAttribute(tree, id, null);
		// Where it stood in this tag, an edit having written it anew or not.
		const former = formerSpans.size === 0 ? undefined : formerSpans.get(-id);
		const from = former === undefined ? tree.attributeStart(id) : former[0];
		const gap =
			previous === -1 ||
			previous > from ||
			from > sourceTagEnd ||
			from < tagStart
				? ""
				: source.slice(previous, from);
		// The space before it as written, where it still follows what it did.
		text += gap !== "" && /^[\t\n\f\r ]+$/.test(gap) ? gap : " ";
		at.push(text.length);
		text += tree.input.slice(tree.attributeStart(id), tree.attributeEnd(id));
		previous = former === undefined ? tree.attributeEnd(id) : former[1];
	}
	text += solidus ? "/>" : ">";
	noteFormerSpan(tree, el);
	const base = tree.input.length;
	tree.input += text;
	tree.placeTag(el, base, base + 1 + name.length, base + text.length);
	for (let k = 0; k < ids.length; k++) {
		const id = ids[k];
		const nameStart = tree.attributeStart(id);
		const delta = base + at[k] - nameStart;
		noteFormerSpan(tree, -id);
		const valueStart = tree.attributeValueStart(id);
		tree.placeAttribute(
			id,
			nameStart + delta,
			tree.attributeNameEnd(id) + delta,
			valueStart === -1 ? -1 : valueStart + delta,
			valueStart === -1 ? -1 : tree.attributeValueEnd(id) + delta
		);
	}
};

// What makes a name an element's or an attribute's (Section 13.2.5.8,
// 13.2.5.33), read as the tokenizer would read it written in a tag.
const ELEMENT_NAME_RE = /^[A-Za-z][^\t\n\f\r />\0]*$/;
const ATTRIBUTE_NAME_RE = /^[^\t\n\f\r />"'<=\0]+$/;

/**
 * The tree and walk as `EditContext` reads them: a node's children are its
 * `childNodes`, text parses as an element's content would, and an attribute
 * is an item of its element's `attributes`.
 * @param {HtmlEditedTree} tree the tree the edits are made in
 * @param {WalkSteps} steps the walk's steps
 * @returns {EditableTree} the tree
 */
const editableTreeOf = (tree, steps) => ({
	...steps,
	typeName: (node) =>
		node < 0 ? "Attribute" : NODE_TYPE_NAMES[tree.type(node) - 1],
	fieldName: (field) => FIELD_NAMES[field - 1] || String(field),
	isList: (container, field) => {
		const type = container < 0 ? NodeType.Attribute : tree.type(container);
		if (
			(field === Field.childNodes &&
				(type === NodeType.Document ||
					type === NodeType.DocumentFragment ||
					type === NodeType.Element)) ||
			(field === Field.attributes && type === NodeType.Element)
		) {
			return true;
		}
		if (field === Field.content && type === NodeType.Element) return false;
		throw tree.ctx.error(
			`${tree.ctx.describe(container)} has no field ${FIELD_NAMES[field - 1] || field}`
		);
	},
	isOptional: (container, field) => field !== Field.content,
	locate: (container, node) => {
		if (node < 0) {
			const index = tree.attributeIds(container).indexOf(-node);
			return index === -1 ? undefined : { field: Field.attributes, index };
		}
		if (
			tree.type(container) === NodeType.Element &&
			tree.templateContentOf(container) === node
		) {
			return { field: Field.content, index: -1 };
		}
		const index = tree.childNodesOf(container).indexOf(node);
		return index === -1 ? undefined : { field: Field.childNodes, index };
	},
	itemsOf: (container, field) => {
		if (field === Field.attributes) {
			return tree.attributeIds(container).map((id) => -id);
		}
		if (field === Field.content) {
			const content = tree.templateContentOf(container);
			return content === 0 ? [] : [content];
		}
		return tree.childNodesOf(container);
	},
	write: (container, field, index, removeCount, items) => {
		tree.invalidateCursors();
		if (field === Field.attributes) {
			const ids = [...tree.attributeIds(container)];
			const removed = ids.splice(
				index,
				removeCount,
				...items.map((item) => -item)
			);
			tree.setAttributes(
				container,
				ids,
				removed,
				items.map((item) => -item)
			);
			rebuildTag(tree, container);
			return;
		}
		const children = tree.childNodesOf(container);
		for (let i = index; i < index + removeCount; i++) {
			tree.unlinkChild(container, children[i]);
		}
		const before =
			index + removeCount < children.length ? children[index + removeCount] : 0;
		tree.linkChildren(container, before, items);
	},
	parse: (container, field, text) => {
		if (field === Field.attributes) {
			// Read off a tag of the element's namespace, where attributes adjust alike.
			const ns = tree.namespaceOf(container);
			const name = tree.xmlMode
				? "_"
				: ns === "svg"
					? "svg"
					: ns === "mathml"
						? "math"
						: "div";
			const nodes = tree.parseFragment(
				"body",
				tree.xmlMode ? `<_ ${text}/>` : `<${name} ${text}>`
			);
			const element = nodes.length === 1 ? nodes[0] : 0;
			if (
				element === 0 ||
				tree.type(element) !== NodeType.Element ||
				tree.stringOf(element) !== name ||
				tree.childNodesOf(element).length !== 0 ||
				tree.attributeCountOf(element) === 0
			) {
				throw tree.ctx.error(
					`${JSON.stringify(text)} does not read as attributes`
				);
			}
			const ids = tree.attributeIds(element);
			// They leave the tag they were read off, to be no one's but where they go.
			tree.releaseAttributes(element);
			return ids.map((id) => -id);
		}
		if (tree.type(container) === NodeType.Document) {
			return tree.parseFragment("html", text);
		}
		return tree.parseFragment(contextOf(tree, container), text);
	},
	check: (container, field, added, after) => {
		const ctx = tree.ctx;
		if (field === Field.content) {
			throw ctx.error(
				"a template's content follows from it; edit what the content holds"
			);
		}
		if (field === Field.attributes) {
			/** @type {Set<string>} */
			const names = new Set();
			for (const item of after) {
				if (item >= 0) {
					throw ctx.error(
						`an Element's attributes hold no ${item === 0 ? "hole" : ctx.tree.typeName(item)}`
					);
				}
				const name = tree.attributeName(-item);
				if (names.has(name)) {
					throw ctx.error(`an Element holds one attribute named ${name}`);
				}
				names.add(name);
			}
			return;
		}
		if (!holdsChildren(tree, container)) {
			throw ctx.error(
				`${ctx.describe(container)} <${tree.stringOf(container)}> holds no children`
			);
		}
		// Printed in pieces, what it held up to the edit is out already.
		if (added.length !== 0 && tree.printsOpen(container)) {
			for (let i = after.indexOf(added[0]) + 1; i < after.length; i++) {
				if (ctx.isPrinted(after[i])) {
					throw ctx.error(
						`the walk printed the ${ctx.tree.typeName(after[i])} after where the nodes would go already`
					);
				}
			}
		}
		const containerType = tree.type(container);
		const rawText =
			containerType === NodeType.Element && holdsRawText(tree, container);
		for (const item of added) {
			const type = item > 0 ? tree.type(item) : 0;
			if (
				item <= 0 ||
				type === NodeType.Document ||
				type === NodeType.DocumentFragment ||
				(type === NodeType.Doctype && containerType !== NodeType.Document) ||
				(type === NodeType.Text && containerType === NodeType.Document) ||
				(rawText && type !== NodeType.Text)
			) {
				throw ctx.error(
					`${ctx.describe(container)}'s childNodes hold no ${item === 0 ? "hole" : ctx.tree.typeName(item)}`
				);
			}
			if (tree.isShadowRoot(item)) {
				throw ctx.error(
					"a declarative shadow root stays on its host; remove the host instead"
				);
			}
		}
	}
});

/**
 * Throws where the node's own text is out already.
 * @param {EditContext} ctx the edits
 * @param {HtmlNodeRef} n the node
 * @returns {void}
 */
const checkOwnText = (ctx, n) => {
	ctx.checkNode(n);
	ctx.checkWritable(n < 0 ? ctx.holderOf(n) : n, n < 0);
	if (n < 0) {
		const holder = ctx.holderOf(n);
		if (holder !== 0) ctx.checkWritable(holder, true);
	}
};

/**
 * Writes a doctype's source anew from its name and identifiers.
 * @param {HtmlEditedTree} tree the tree
 * @param {HtmlNodeRef} n the doctype
 * @returns {void}
 */
const rewriteDoctype = (tree, n) => {
	const name = tree.stringOf(n);
	/**
	 * @param {string} id an identifier
	 * @returns {string} it quoted
	 */
	const quoted = (id) => (id.includes('"') ? `'${id}'` : `"${id}"`);
	let text = `<!DOCTYPE ${name}`;
	const publicId = tree.publicId;
	const systemId = tree.systemId;
	if (publicId !== null) {
		text += ` PUBLIC ${quoted(publicId)}`;
		if (systemId !== null) text += ` ${quoted(systemId)}`;
	} else if (systemId !== null) {
		text += ` SYSTEM ${quoted(systemId)}`;
	}
	rewriteSource(tree, n, `${text}>`);
	tree.forgetDoctypeSpans();
};

/**
 * @param {HtmlEditedTree} tree the tree
 * @param {HtmlNodeRef} n an element or attribute
 * @param {string} name its name
 * @returns {void}
 */
const setName = (tree, n, name) => {
	const ctx = tree.ctx;
	checkOwnText(ctx, n);
	if (typeof name !== "string") throw ctx.error("a name is text");
	if (n < 0) {
		if (!ATTRIBUTE_NAME_RE.test(name)) {
			throw ctx.error(`${JSON.stringify(name)} is no attribute name`);
		}
		const owner = ctx.holderOf(n);
		const written =
			owner !== 0 && tree.namespaceOf(owner) === "html" && !tree.xmlMode;
		const next = written ? tree.asciiLowercase(name) : name;
		if (
			owner !== 0 &&
			tree
				.attributeIds(owner)
				.some((id) => id !== -n && tree.attributeName(id) === next)
		) {
			throw ctx.error(`an Element holds one attribute named ${next}`);
		}
		tree.renameAttribute(-n, next);
		rewriteAttribute(tree, -n, null);
		if (owner !== 0) rebuildTag(tree, owner);
		return;
	}
	const type = tree.type(n);
	if (type === NodeType.Element) {
		if (!ELEMENT_NAME_RE.test(name)) {
			throw ctx.error(`${JSON.stringify(name)} is no element name`);
		}
		const model = tree.contentModel(n);
		const before = tree.stringOf(n);
		tree.setString(
			n,
			tree.namespaceOf(n) === "html" && !tree.xmlMode
				? tree.asciiLowercase(name)
				: name
		);
		if (tree.contentModel(n) !== model) {
			tree.setString(n, before);
			throw ctx.error(
				`a <${before}> cannot be renamed to ${JSON.stringify(name)}, whose content reads otherwise; replace it instead`
			);
		}
		rebuildTag(tree, n);
		return;
	}
	if (type === NodeType.ProcessingInstruction) {
		if (!/^[^\s?>]+$/.test(name)) {
			throw ctx.error(
				`${JSON.stringify(name)} is no processing instruction target`
			);
		}
		tree.setTarget(n, name);
		rewriteSource(tree, n, `<?${name} ${tree.stringOf(n)}?>`);
		return;
	}
	if (type === NodeType.Doctype) {
		if (!/^[^\s>]+$/.test(name)) {
			throw ctx.error(`${JSON.stringify(name)} is no doctype name`);
		}
		tree.setString(n, tree.asciiLowercase(name));
		rewriteDoctype(tree, n);
		return;
	}
	throw ctx.error(`${ctx.describe(n)} has no name`);
};

/**
 * @param {HtmlEditedTree} tree the tree
 * @param {HtmlNodeRef} n a text, comment, processing instruction or attribute
 * @param {string} value its value, decoded
 * @returns {void}
 */
const setValue = (tree, n, value) => {
	const ctx = tree.ctx;
	checkOwnText(ctx, n);
	if (typeof value !== "string") throw ctx.error("a value is text");
	if (n < 0) {
		rewriteAttribute(tree, -n, tree.escapeAttributeValue(value));
		if (tree.xmlMode) tree.setXmlAttributeValue(-n, value);
		const owner = ctx.holderOf(n);
		if (owner !== 0) rebuildTag(tree, owner);
		return;
	}
	const type = tree.type(n);
	if (type === NodeType.Text) {
		const parent = tree.parentOf(n);
		if (parent !== 0 && tree.type(parent) === NodeType.Element) {
			const model = tree.contentModel(parent);
			const name = tree.stringOf(parent);
			if (
				model !== "data" &&
				model !== "rcdata" &&
				(value.toLowerCase().includes(`</${name}`) ||
					(model === "script" && value.includes("<!--")))
			) {
				throw ctx.error(
					`a <${name}>'s text cannot hold ${JSON.stringify(`</${name}`)}`
				);
			}
		}
		tree.setString(n, value);
		rewriteSource(tree, n, "");
		return;
	}
	if (type === NodeType.Comment) {
		if (
			value.startsWith(">") ||
			value.startsWith("->") ||
			value.includes("-->") ||
			value.includes("--!>") ||
			value.endsWith("<!-") ||
			value.endsWith("-")
		) {
			throw ctx.error(`${JSON.stringify(value)} cannot stand in a comment`);
		}
		tree.setString(n, value);
		rewriteSource(tree, n, `<!--${value}-->`);
		return;
	}
	if (type === NodeType.ProcessingInstruction) {
		if (value.includes("?>")) {
			throw ctx.error(
				`${JSON.stringify(value)} cannot stand in a processing instruction`
			);
		}
		tree.setString(n, value);
		rewriteSource(tree, n, `<?${tree.targetOf(n) || ""} ${value}?>`);
		return;
	}
	throw ctx.error(`${ctx.describe(n)} has no value`);
};

/**
 * @param {HtmlEditedTree} tree the tree
 * @param {number} flag a `Flag`
 * @param {boolean} on whether it is set
 * @param {HtmlNodeRef} n the node
 * @returns {void}
 */
const setFlag = (tree, flag, on, n) => {
	const ctx = tree.ctx;
	ctx.checkNode(n);
	if (n < 0 || tree.type(n) !== NodeType.Element) {
		throw ctx.error(`${ctx.describe(n)} has no flag ${flag}`);
	}
	if (tree.flag(flag, n) === on) return;
	throw ctx.error(
		`an Element's flags follow from its name and where it stands, so it cannot be ${on ? "set" : "cleared"}; rename or replace the element instead`
	);
};

/**
 * @param {HtmlEditedTree} tree the tree
 * @param {number} part a `Part`
 * @param {string} text its text
 * @param {HtmlNodeRef} n the node
 * @returns {void}
 */
const setText = (tree, part, text, n) => {
	const ctx = tree.ctx;
	checkOwnText(ctx, n);
	if (
		n < 0 ||
		tree.type(n) !== NodeType.Doctype ||
		(part !== Part.publicId && part !== Part.systemId)
	) {
		throw ctx.error(`${ctx.describe(n)} has no text part ${part}`);
	}
	if (typeof text !== "string") throw ctx.error("an identifier is text");
	if ((text.includes('"') && text.includes("'")) || text.includes(">")) {
		throw ctx.error(`${JSON.stringify(text)} cannot stand in a doctype`);
	}
	const id = text === "" ? null : text;
	if (part === Part.publicId) tree.publicId = id;
	else tree.systemId = id;
	rewriteDoctype(tree, n);
};

module.exports = {
	editableTreeOf,
	setFlag,
	setName,
	setText,
	setValue,
	writeTagAnew
};
