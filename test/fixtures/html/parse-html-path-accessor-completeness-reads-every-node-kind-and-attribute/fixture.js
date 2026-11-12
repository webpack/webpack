"use strict";

/**
 * @param {string[]} log the visit log
 * @param {import("../../../helpers/fixture").SyntaxEnums} enums the HTML parser's enums
 * @returns {Record<number, EXPECTED_ANY>} visitors logging each node kind's reads through the current-node defaults
 */
const defaults = (log, enums) => {
	const { Field, Flag, NodeType, Part } = enums;
	return {
		[NodeType.Document]: (path) => {
			log.push(`doc:${path.index}:${path.range()}:${path.loc()}:${path.within(NodeType.Document)}`);
		},
		[NodeType.DocumentFragment]: (path) => {
			log.push(
				`fragment:${path.index}:${path.within(NodeType.Element)}:${JSON.stringify(path.name())}:${JSON.stringify(path.value())}`
			);
		},
		[NodeType.Doctype]: (path) => {
			log.push(`doctype:${path.startOf(Part.name)}:${path.endOf(Part.name)}:${path.textOf(Part.name)}`);
		},
		[NodeType.Comment]: (path) => {
			log.push(
				`comment:${path.index}:${path.type()}:${path.source()}:${JSON.stringify(path.name())}:${path.fieldCount(Field.attributes)}:${path.field(0, Field.attributes)}:${path.fieldNamed(Field.attributes, "a")}:${path.startOf(Part.name)}:${path.endOf(Part.name)}:${path.textOf(Part.publicId)}`
			);
		},
		[NodeType.Element]: (path) => {
			const name = path.name();
			if (name === "template") {
				log.push(
					`template:${path.fieldCount(Field.content)}:${path.type(path.field(0, Field.content))}:${path.field(1, Field.content)}`
				);
			}
			if (name === "i") {
				log.push(
					`i:${path.index}:${path.rangeOf(Part.endTag)}:${path.within(NodeType.Element)}:${path.within(NodeType.DocumentFragment)}`
				);
			}
			if (name !== "div") return;
			for (let i = 0; i < 4; i++) {
				const a = path.field(i, Field.attributes);
				log.push(
					`attr:${path.type(a)}:${path.source(a)}:${path.range(a)}:${path.start(a)}-${path.end(a)}:${path.loc(a)}:${path.rangeOf(Part.value, a)}:${path.startOf(Part.startTag, a)}:${path.endOf(Part.startTag, a)}:${path.flag(Flag.selfClosing, a)}:${path.children(a).length}`
				);
			}
			log.push(
				`div:${path.source(0, 9)}:${path.start()}-${path.end()}:${path.childCount()}/${path.childCount()}:${path.type(path.child(1))}:${path.type(path.child(0))}:${path.children().length}:${path.flag(Flag.selfClosing)}:${path.fieldCount(Field.content)}:${path.field(0, Field.content)}:${path.fieldNamed(Field.content, "a")}`
			);
		}
	};
};

/**
 * @param {string[]} values the run's answer
 * @returns {{ asserted: unknown[] }} the whole log
 */
const logged = (values) => ({ asserted: [values[0] === "" ? [] : values[0].split("\n")] });

module.exports = {
	defaults,
	logged
};
