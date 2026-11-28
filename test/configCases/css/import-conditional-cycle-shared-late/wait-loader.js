"use strict";

// Holds `c.css` back until `b.css` has resolved its import of `a.css`.
/** @type {import("../../../../").LoaderDefinition} */
module.exports = function waitLoader(source) {
	const callback = this.async();
	const compilation = this._compilation;
	const started = Date.now();
	const check = () => {
		for (const module of compilation.modules) {
			if (!/b\.css$/.test(module.resource || "")) continue;
			const dep = module.dependencies.find((d) => d.type === "css @import");
			if (dep && compilation.moduleGraph.getModule(dep)) {
				return callback(null, source);
			}
		}
		if (Date.now() - started > 5000) {
			return callback(new Error("b.css did not resolve its @import in time"));
		}
		setTimeout(check, 10);
	};
	check();
};
