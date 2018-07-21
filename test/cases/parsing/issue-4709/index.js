function getDirectiveRequire(directive) {
	var require = directive.require || (directive.controller && directive.name);

	if (!isArray(require) && isObject(require)) {
		forEach(require, function(value, key) {
			var match = value.match(REQUIRE_PREFIX_REGEXP);
			var name = value.substring(match[0].length);
			if (!name) require[key] = match[0] + key;
		});
	}

	return require;
}

it("should parse these snippets successfully", function() {

});
