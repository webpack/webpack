module.exports = function(content) {
	return "module.exports = " + JSON.stringify({
		resourceQuery: this.resourceQuery,
		query: this.query,
		prev: content
	});
}
