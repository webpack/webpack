var amdRequire = require("./__webpack_amd_require");
module.exports = function(module, req) {
	req = amdRequire(req);
	function define(name, requires, fn) {
		if(!fn) {
			fn = requires;
			requires = name;
		}
		if(!fn) {
			return module.exports = name.call(module.exports, req);
		}
		return module.exports = fn.apply(module.exports, requires);
	}
	define.amd = true;
	return define;
}