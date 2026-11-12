"use strict";

const { recordVisitors } = require("../_shared/record");

// A rule's index, children, fields and fields by name, read on each rule.
const walk = recordVisitors(({ NodeType, Field }) => ({
	[NodeType.QualifiedRule]: (path) => {
		const color = path.fieldNamed(Field.declarations, "color");
		return [
			path.index,
			path.children().map((n) => path.source(n)),
			path.child(0) !== 0 && path.source(path.child(0)),
			path.child(9),
			path.fieldCount(Field.prelude),
			path.fieldCount(Field.value),
			path.fieldCount(Field.declarations),
			path.fieldCount(Field.rules),
			path.source(path.field(0, Field.prelude)),
			path.field(0, Field.rules) !== 0 &&
				path.source(path.field(0, Field.rules)),
			path.field(1, Field.declarations) !== 0 &&
				path.source(path.field(1, Field.declarations)),
			path.field(-1, Field.declarations),
			path.field(5, Field.declarations),
			color !== 0 && path.source(color),
			path.fieldNamed(Field.declarations, "nope"),
			path.source(path.node)
		];
	}
}));

module.exports = { walk };
