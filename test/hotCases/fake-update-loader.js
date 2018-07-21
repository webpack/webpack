module.exports = function(source) {
	this.cacheable(false);
	var idx = this.options.updateIndex;
	var items = source.split(/---+\r?\n/g);
	return items[idx] || items[items.length - 1];
}