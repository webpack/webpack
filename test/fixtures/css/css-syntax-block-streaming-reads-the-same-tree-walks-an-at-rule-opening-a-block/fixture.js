"use strict";

const { recordVisitors } = require("../_shared/record");

// Each rule entered and each declaration's name, in walk order.
const walk = recordVisitors(({ NodeType }) => ({
	[NodeType.AtRule]: (path) => path.name(),
	[NodeType.QualifiedRule]: (path) => path.source(path.child(0)),
	[NodeType.Declaration]: (path) => path.name()
}));

module.exports = { walk };
