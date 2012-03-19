// Polyfill for node.js
//  adds require.ensure
//  call it like this: require("webpack/require-polyfill")(require);
// This is only required when you want to use require.ensure or require.context
//  in server-side code which should be so only in rar cases.
module.exports = function(req) {
	if(!req.ensure) {
		req.ensure = function(array, callback) {
			callback(req);
		};
	}
	if(!req.context) {
		req.context = function(contextName) {
			return function(name) {
				return req(contextName + "/" + name);
			}
		}
	}
}