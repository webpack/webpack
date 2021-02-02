module.exports = function (source) {
	if (this.shouldReplace)
		return `import otherFile from './other-file.js';
		export default otherFile;
		`;
	return source;
};
