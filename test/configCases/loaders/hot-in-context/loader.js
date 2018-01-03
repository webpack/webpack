module.exports = function() {
	return `module.exports = ${JSON.stringify(!!this.hot)};`;
}
