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
 * @param {string[]} values the run's answer
 * @param {{ spec: EXPECTED_ANY }} context the run
 * @returns {{ asserted: unknown[] }} the doctype's name and identifiers
 */
const doctype = (values, { spec }) => {
	const doctype = treeOf(values[2], spec.fields).children.find((n) => n.type === "Doctype");
	return {
		asserted: [
			{
				name: doctype.fields.name,
				publicId: doctype.fields["textOf:publicId"],
				systemId: doctype.fields["textOf:systemId"]
			}
		]
	};
};

module.exports = {
	doctype
};
