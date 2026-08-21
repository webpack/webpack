"use strict";

// elements of the `#configs` context module, whose `request` is relative to the
// resolved directory while `originalRequest` is what the user wrote
const CONTEXT_ELEMENTS = new Set(["./a.js", "./b.js", "./c.js", "./d.js"]);

/** @type {import("../../../../").Configuration} */
module.exports = {
	externalsType: "commonjs",
	externals: [
		({ request, originalRequest }, callback) => {
			if (CONTEXT_ELEMENTS.has(request)) {
				const expected = `#configs/${request.slice(2)}`;
				if (originalRequest !== expected) {
					return callback(
						new Error(
							`Expected "${expected}" as original request, but got "${originalRequest}"`
						)
					);
				}
				// the other elements are matched by the externals below
				if (request === "./a.js") return callback(null, true);
				return callback();
			}
			// an element of a context module with inline loaders carries the resolved
			// loaders in its request, which the context request must not be joined to
			if (originalRequest !== request) {
				return callback(
					new Error(
						`Expected the original request of "${request}" to be unchanged, but got "${originalRequest}"`
					)
				);
			}
			callback();
		},
		{ "#configs/b.js": true },
		"#configs/c.js",
		/^#configs\/d\.js$/
	]
};
