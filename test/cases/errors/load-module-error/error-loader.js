module.exports = function(source) {
	const callback = this.async();
	callback(new Error("err: abc"));
}
