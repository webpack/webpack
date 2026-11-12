"use strict";

const { recordVisitors } = require("../_shared/record");

// What an ident and a declaration read where their kind has no such thing.
const empty = recordVisitors(({ NodeType, Flag, Part }) => {
	const read = (path) => [
		path.name(),
		path.value(),
		path.childCount(),
		path.children().length,
		path.flag(Flag.integer),
		path.flag(Flag.important),
		path.flag(Flag.id),
		path.rangeOf(Part.value),
		path.rangeOf(Part.block),
		path.textOf(Part.name)
	];
	return { [NodeType.Ident]: read, [NodeType.Declaration]: read };
});

// A leaf, read from its declaration: no children and no fields.
const leaf = recordVisitors(({ NodeType, Field }) => ({
	[NodeType.Declaration]: (path) => [
		path.fieldCount(Field.declarations, path.child(0)),
		path.children(path.child(0))
	]
}));

module.exports = { empty, leaf };
