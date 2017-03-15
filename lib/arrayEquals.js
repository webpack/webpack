module.exports = function arrayEquals(a, b) {
	return a.length === b.length && a.every(function(e, i) {
		return b[i] === e;
	});
};
