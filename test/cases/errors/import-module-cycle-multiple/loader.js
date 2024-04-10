/** @type {import("../../../../").LoaderDefinitionFunction} */
exports.default = function (source) {
	const content = JSON.parse(source);
	// content is one reference or an array of references
	const refs = Array.isArray(content) ? content : [content];
	const callback = this.async();
	const importReferencedModules = async () => {
		const loadedRefs = []
		for(const ref of refs) {
			try {
				const source = await this.importModule("../loader!" + ref);
				loadedRefs.push([ref, source]);
			} catch(err) {
				loadedRefs.push([ref, `err: ${err && err.message}`]);
			}
		}
		return loadedRefs;
	}

	importReferencedModules().then((loadResults) => {
		callback(null, JSON.stringify(loadResults));
	});
};
