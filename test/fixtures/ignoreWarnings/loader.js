module.exports = function wraningLoader(content) {
    this.emitWarning('__mocked__warning__');
	return content;
};