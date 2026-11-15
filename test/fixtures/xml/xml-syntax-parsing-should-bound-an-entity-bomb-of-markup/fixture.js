"use strict";

/**
 * @returns {string} a billion-laughs subset whose innermost entity is markup
 */
const source = () => {
	let subset = '<!ENTITY l0 "&m;">';
	for (let i = 1; i < 10; i++) {
		subset += `<!ENTITY l${i} "${`&l${i - 1};`.repeat(10)}">`;
	}
	return `<!DOCTYPE r [<!ENTITY m "<m/>">${subset}]><r>&l9;</r>`;
};

/**
 * @param {string[]} values the parse's tree, as JSON, and its errors
 * @returns {{ children: number[], bounded: boolean }} how many children each top-level node has, and whether every count stays under 2 ** 20
 */
const childCounts = (values) => {
	/** @type {{ children?: unknown[] }[]} */
	const nodes = JSON.parse(values[0]);
	const children = nodes.map((node) =>
		node.children === undefined ? 0 : node.children.length
	);
	return {
		children,
		bounded: children.every((count) => count < 1 << 20)
	};
};

module.exports = { childCounts, source };
