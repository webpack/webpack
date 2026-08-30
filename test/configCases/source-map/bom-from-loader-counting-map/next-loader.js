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

	const { mappings } =
		typeof sourceMap === "string" ? JSON.parse(sourceMap) : sourceMap;

	// "A" is VLQ 0: with the BOM gone, the first line has to start at
	// generated column 0 again.
	if (!mappings.startsWith("A")) {
		throw new Error(
			`the source map still counts the removed BOM: ${mappings.split(";")[0]}`
		);
	}

	this.callback(null, source, sourceMap);
};
