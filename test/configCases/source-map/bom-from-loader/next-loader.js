// Runs after the BOM-emitting loader, so its input is what `convertArgs`
// handed over: a throw here fails the case.
/** @type {import("../../../../").LoaderDefinition} */
module.exports = function nextLoader(source, sourceMap) {
	if (source.charCodeAt(0) === 0xfeff) {
		throw new Error("the previous loader's BOM reached the next loader");
	}
	if (!sourceMap) {
		throw new Error("the previous loader's source map was dropped");
	}

	this.callback(null, source, sourceMap);
};
