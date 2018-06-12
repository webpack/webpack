module.exports = function(source) {
	const callback = this.async();
	const error = new Error("this is a callback error");
	callback(error, source);
};
