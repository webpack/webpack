module.exports = function(source) {
	var idx = this.options.updateIndex;
	var items = source.split(/---+\r?\n/g);
	return items[idx] || items[items.length - 1];
}