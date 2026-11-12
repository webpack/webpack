"use strict";

const SRC = require("fs").readFileSync(require("path").join(__dirname, "index.html"), "utf8");

/**
 * @param {string[]} log the visit log
 * @param {import("../../../helpers/fixture").SyntaxEnums} enums the HTML parser's enums
 * @returns {Record<number, EXPECTED_ANY>} visitors logging what the path says of the doctype and the `<div>`
 */
const links = (log, enums) => {
	const { Field, NodeType, Part } = enums;
	return {
		[NodeType.Doctype]: (path) => {
			const n = path.node;
			log.push(`doctype:${path.textOf(Part.publicId, n)}/${path.textOf(Part.systemId, n)}`);
		},
		[NodeType.Element]: (path) => {
			if (path.name() !== "div") return;
			log.push(`node:${path.node !== null}`);
			log.push(`parentTag:${path.name(path.parent)}`);
			log.push(`index:${path.index}`);
			log.push(`attrs:${path.fieldCount(Field.attributes)}`);
			const id = path.fieldNamed(Field.attributes, "id");
			log.push(`id:${path.name(id)}=${path.value(id)}`);
			log.push(`idName:${SRC.slice(...path.rangeOf(Part.name, id))}`);
			log.push(`idValue:${SRC.slice(...path.rangeOf(Part.value, id))}`);
			log.push(`checkedValue:${path.rangeOf(Part.value, path.field(1, Field.attributes))}`);
			log.push(`firstChildType:${path.type(path.child(0))}`);
			log.push(`nextSibling:${path.child(path.index + 1, path.parent)}`);
		}
	};
};

/**
 * @param {string[]} values the run's answer
 * @returns {{ asserted: unknown[] }} the whole log
 */
const logged = (values) => ({ asserted: [values[0] === "" ? [] : values[0].split("\n")] });

module.exports = {
	links,
	logged
};
