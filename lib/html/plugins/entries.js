/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const plugin = options => {
	return function entries(tree) {
		let idx = 0;

		tree.match({ tag: "script" }, node => {
			if (node.attrs) {
				delete node.attrs.entry;

				tree.messages.push({
					type: "entry",
					url: node.attrs.src,
					name: `HTML__ENTRY__${idx}`
				});

				node.attrs.src = `HTML__ENTRY__${idx}`;
			}

			idx++;

			return node;
		});

		return tree;
	};
};

module.exports = plugin;
