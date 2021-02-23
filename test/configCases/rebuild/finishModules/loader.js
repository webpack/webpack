module.exports = function (source) {
	if (this.shouldReplace) {
		this._module.buildInfo._isReplaced = true;
		return "module.exports = { foo: { foo: 'bar' }, doThings: (v) => v}";
	}
	return source;
};
