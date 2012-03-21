// Polyfill for node.js
//  - adds require.ensure
//  - adds require.context
//  call it like this: 
//   require = require("webpack/require-polyfill")(require.valueOf());
// This is only required when you want to use the special require.xxx methods
//  in server-side code which should be so only in rar cases.
module.exports = function(req) {
	if(!req.webpackPolyfill) {
		var oldReq = req;
		req = function(name) {
			return oldReq(name);
		};
		req.__proto__ = oldReq;
		req.webpackPolyfill = true;
	}
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
	return req;
}