"use strict";

// the getters record which externals the bundle actually requires
let required = [];

const track = (name, exports) => {
	required.push(name);
	return exports;
};

module.exports = {
	modules: {
		get "side-effect-free-ext"() {
			return track("side-effect-free-ext", {});
		},
		get "function-form-ext"() {
			return track("function-form-ext", {});
		},
		get "unused-export-ext"() {
			return track("unused-export-ext", { unusedExport: "unused" });
		},
		get "used-ext"() {
			return track("used-ext", { used: "used" });
		},
		get "with-side-effects-ext"() {
			return track("with-side-effects-ext", {});
		},
		get "default-ext"() {
			return track("default-ext", {});
		},
		get twin() {
			return track("twin", {});
		},
		get "required-used-ext"() {
			return track("required-used-ext", { used: "used" });
		},
		get "required-unused-ext"() {
			return track("required-unused-ext", { unused: "unused" });
		},
		get "required-free-ext"() {
			return track("required-free-ext", {});
		},
		get "reexport-used-ext"() {
			return track("reexport-used-ext", { used: "used" });
		},
		get "reexport-unused-ext"() {
			return track("reexport-unused-ext", { unused: "unused" });
		}
	},
	moduleScope(scope) {
		required = [];
		scope.REQUIRED = required;
	}
};
