"use strict";

const { recordVisitors } = require("../_shared/record");

// Below the top level, each node's place among its siblings.
const walk = recordVisitors(({ NodeType }) => ({
	[NodeType.Declaration]: (path) => path.index,
	[NodeType.QualifiedRule]: (path) => path.index
}));

module.exports = { walk };
