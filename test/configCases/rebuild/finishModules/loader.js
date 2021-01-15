module.exports = function (source) {
	if (this.shouldReplace)
		return "module.exports = { foo: { foo: 'bar' }, doThings: (v) => v}";
	return source;
};
