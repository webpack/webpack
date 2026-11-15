"use strict";

const { recordVisitors } = require("../_shared/record");

// A declaration visitor stopping the walk, and stopping it again.
const walk = recordVisitors(({ NodeType }) => ({
	[NodeType.Declaration]: (path) => {
		path.name();
		path.stop();
		path.stop();
	}
}));

module.exports = { walk };
