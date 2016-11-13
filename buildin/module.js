module.exports = function(module) {
	if(!module.webpackPolyfill) {
		module.deprecate = function() {};
		module.paths = [];
		// module.parent = undefined by default
		if(!module.children) module.children = [];
		try{
      Object.defineProperty(module, "loaded", {
        enumerable: true,
        configurable: false,
        get: function() { return module.l; }
      });
      Object.defineProperty(module, "id", {
        enumerable: true,
        configurable: false,
        get: function() { return module.i; }
      });
		}catch (e){
      module["loaded"] = function() { return module.l; };
      module["id"] = function() { return module.i; };
		}
		module.webpackPolyfill = 1;
	}
	return module;
}
