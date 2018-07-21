module.exports = function(source) {
	return "module.exports = " + JSON.stringify(this.query.f());
};
