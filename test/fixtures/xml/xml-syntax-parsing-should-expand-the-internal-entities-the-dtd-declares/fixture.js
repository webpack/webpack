"use strict";

const { decodeXmlAttribute } = require("../../../../").html.syntax.parser;

/**
 * @typedef {{ attributes?: { name: string, value: string }[], children?: MaterializedNode[] }} MaterializedNode
 */

/**
 * Decodes right after the parse, as the entities it declared still apply.
 * @param {string[]} values the parse's tree, as JSON, and its errors
 * @returns {[string, string][]} each attribute value as parsed and as decoded
 */
const decodedAttributes = (values) => {
	/** @type {[string, string][]} */
	const pairs = [];
	/**
	 * @param {MaterializedNode[]} nodes nodes of the tree
	 * @returns {void}
	 */
	const walk = (nodes) => {
		for (const node of nodes) {
			for (const { value } of node.attributes || []) {
				pairs.push([value, decodeXmlAttribute(value)]);
			}
			walk(node.children || []);
		}
	};
	walk(JSON.parse(values[0]));
	return pairs;
};

module.exports = { decodedAttributes };
