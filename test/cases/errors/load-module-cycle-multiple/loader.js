const { promisify } = require("util");

/** @type {import("../../../../").LoaderDefinitionFunction} */
exports.default = function (source) {
	const content = JSON.parse(source);
	// content is one reference or an array of references
	const refs = Array.isArray(content) ? content : [content];
	const callback = this.async();
	const loadModulePromise = promisify(this.loadModule.bind(this));

	async function loadReferencedModules() {
		// Modules are loaded sequentially as the false-positive circular reference
		// bug from https://github.com/webpack/webpack/issues/14379 doesn't occur if
		// they are loaded in parallel.
		const loadedRefs = []
		for(const ref of refs) {
			try {
				const source = await loadModulePromise("../loader!" + ref);
				loadedRefs.push([ref, JSON.parse(source)]);
			} catch(err) {
				loadedRefs.push([ref, `err: ${err && err.message}`]);
			}
		}
		return loadedRefs;
	}

	loadReferencedModules().then((loadResults) => {
		callback(null, JSON.stringify(loadResults));
	});
};
