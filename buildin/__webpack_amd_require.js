var req = require.valueOf();
function amdRequire(chunk, requiresFn, fn) {
	if(!requiresFn) {
		// commonjs
		return req(chunk);
	}
	req.e(chunk, function() {
		var modules = requiresFn();
		if(fn)
			return fn.apply(null, modules);
	});
}
for(var name in req)
	amdRequire[name] = req[name];
amdRequire.amd = require("./__webpack_options_amd.loader.js!./__webpack_options_amd.loader.js");
amdRequire.config = function() {/* config is ignored, use webpack options */};
module.exports = amdRequire;
