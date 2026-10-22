"use strict";

// elements of the `#configs` and `./configs?query#hash` context modules, whose
// `request` is relative to the resolved directory while `originalRequest` is
// what the user wrote
const CONTEXT_ELEMENT = /^\.\/(?:[a-d]|q|nested\/f)\.js(\?query#hash)?$/;

/** @type {import("../../../../").Configuration} */
module.exports = {
	externalsType: "commonjs",
	externals: [
		({ request, originalRequest }, callback) => {
			const element = CONTEXT_ELEMENT.exec(request);
			if (element) {
				// the query and fragment the context carries are not repeated
				const expected = `${
					element[1] ? "./configs" : "#configs"
				}/${request.slice(2)}`;
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
