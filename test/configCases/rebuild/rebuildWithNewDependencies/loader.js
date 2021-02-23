module.exports = function (source) {
	if (this.shouldReplace) {
		this._module.buildInfo._isReplaced = true;
		return `import otherFile from './other-file.js';
		export default otherFile;
		`;
	}
	return source;
};
