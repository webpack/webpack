(function () {
	'use strict';

	function cmodule (args) {
		return (args || []).join(' ');
	}

	if (typeof module !== 'undefined' && module.exports) {
		cmodule.default = cmodule;
		module.exports = cmodule;
	} else if (typeof define === 'function' && typeof define.amd === 'object' && define.amd) {
		define('cmodule', [], function () {
			return cmodule;
		});
	} else {
		window.cmodule = cmodule;
	}
}());
