"use strict";

const { recordVisitors } = require("../_shared/record");

// Every field read on the current node, at each kind of node the input holds.
const walk = recordVisitors(({ NodeType, Field, Flag, Part }) => ({
	[NodeType.AtRule]: (path) => [
		path.name(),
		path.source(...path.rangeOf(Part.name)),
		path.childCount(),
		path.fieldCount(Field.rules),
		path.fieldCount(Field.declarations),
		path.rangeOf(Part.block),
		path.rangeOf(Part.block),
		path.range(),
		path.range(),
		path.node,
		path.parent
	],
	[NodeType.Declaration]: (path) =>
		path.flag(Flag.important) && [
			path.source(...path.rangeOf(Part.name)),
			path.name()
		],
	[NodeType.Url]: (path) => [path.rangeOf(Part.value), path.rangeOf(Part.value)],
	[NodeType.SimpleBlock]: (path) => path.value(),
	[NodeType.Function]: {
		enter: (path) => path.name() === "var" && path.childCount(),
		exit: (path) => path.name()
	},
	[NodeType.Comment]: {
		enter: (path) => [path.range(), path.range(), path.parent],
		exit: () => undefined
	}
}));

module.exports = { walk };
