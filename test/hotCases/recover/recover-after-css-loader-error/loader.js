/** @type {import("../../../../").LoaderDefinition} */
module.exports = function(content) {
	const callback = this.async();

	if (content.includes("Failed")) {
		callback(new Error("Error in loader"));
		return;
	}

	callback(null, content);
};
