var amdRequire = require("./__webpack_amd_require");
module.exports = function(module, req) {
	req = amdRequire(req);
	function define(id, dependencies, factory) {
		if(typeof id != "number") {
			factory = dependencies;
			dependencies = id;
			id = null;
		}
		if(!factory) {
			factory = dependencies;
			dependencies = [req, module.exports, module];
		}
		var result = typeof factory == "function" ? factory.apply(null, dependencies) : factory;
		if(result !== undefined)
			module.exports = result;
		return module.exports;
	}
	define.amd = amdRequire.amd;
	return define;
}