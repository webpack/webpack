/** @type {import("../../").LoaderDefinition<{}, { updateIndex: number }>} */
module.exports = function (source) {
	var idx = this.updateIndex;
	var items = source.split(/---+\r?\n/g);
	if (items.length > 1) {
		this.cacheable(false);
	}
	return items[idx] || items[items.length - 1];
};
