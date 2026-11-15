"use strict";

/**
 * @param {string} text a parse run's `fields` lines
 * @param {string[]} fields the reads each line holds, in order
 * @returns {EXPECTED_ANY} the root, each node with its type, range, reads, children, attributes and template content
 */
const treeOf = (text, fields) => {
	const root = { children: [] };
	/** @type {{ depth: number, node: EXPECTED_ANY }[]} */
	const stack = [{ depth: -1, node: root }];
	for (const line of text.split("\n")) {
		const m = /^( *)(\w+)\[(-?\d+),(-?\d+)\]/.exec(line);
		const node = {
			type: m[2],
			start: Number(m[3]),
			end: Number(m[4]),
			fields: {},
			children: [],
			attributes: [],
			content: null
		};
		let rest = line.slice(m[0].length);
		for (let i = 0; i < fields.length; i++) {
			rest = rest.slice(` ${fields[i]}=`.length);
			const next = i + 1 < fields.length ? rest.indexOf(` ${fields[i + 1]}=`) : rest.length;
			node.fields[fields[i]] = JSON.parse(rest.slice(0, next));
			rest = rest.slice(next);
		}
		const depth = m[1].length / 2;
		while (stack[stack.length - 1].depth >= depth) stack.pop();
		const parent = stack[stack.length - 1].node;
		if (node.type === "Attribute") parent.attributes.push(node);
		else if (node.type === "DocumentFragment") parent.content = node;
		else parent.children.push(node);
		stack.push({ depth, node });
	}
	return root.children[0];
};

/**
 * @param {EXPECTED_ANY} document a rebuilt document
 * @returns {EXPECTED_ANY[]} what its `<body>` holds
 */
const bodyOf = (document) => {
	const html = document.children.find((n) => n.fields.name === "html");
	return html.children.find((n) => n.fields.name === "body").children;
};

/**
 * @param {string[]} values the run's answer
 * @param {{ spec: EXPECTED_ANY }} context the run
 * @returns {{ asserted: unknown[] }} how many `<b>`s the second thing in the body nests
 */
const reconstructed = (values, { spec }) => {
	let depth = 0;
	let node = bodyOf(treeOf(values[2], spec.fields))[1];
	while (node !== undefined && node.fields.name === "b") {
		depth++;
		node = node.children[0];
	}
	return { asserted: [depth] };
};

module.exports = {
	reconstructed
};
