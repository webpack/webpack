// Polyfill for node.js
// adds require.ensure
// call it like this: require("webpack/require-polyfill")(require);
module.exports = function(req) {
	if(!req.ensure) {
		req.ensure = function(array, callback) {
			callback(req);
		};
	}
}