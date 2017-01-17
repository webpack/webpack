/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
/*
<rules>: <rule>
<rules>: [<rule>]
<rule>: {
	resource: {
		test: <condition>,
		include: <condition>,
		exclude: <condition>,
	},
	resource: <condition>, -> resource.test
	test: <condition>, -> resource.test
	include: <condition>, -> resource.include
	exclude: <condition>, -> resource.exclude
	resourceQuery: <condition>,
	issuer: <condition>,
	use: "loader", -> use[0].loader
	loader: <>, -> use[0].loader
	loaders: <>, -> use
	options: {}, -> use[0].options,
	query: {}, -> options
	parser: {},
	use: [
		"loader" -> use[x].loader
	],
	use: [
		{
			loader: "loader",
			options: {}
		}
	],
	rules: [
		<rule>
	],
	oneOf: [
		<rule>
	]
}

<condition>: /regExp/
<condition>: function(arg) {}
<condition>: "starting"
<condition>: [<condition>] // or
<condition>: { and: [<condition>] }
<condition>: { or: [<condition>] }
<condition>: { not: [<condition>] }
<condition>: { test: <condition>, include: <condition>, exclude: <condition> }


normalized:

{
	resource: function(),
	resourceQuery: function(),
	issuer: function(),
	use: [
		{
			loader: string,
			options: string,
			<any>: <any>
		}
	],
	rules: [<rule>],
	oneOf: [<rule>],
	<any>: <any>,
}

*/
"use strict";

function RuleSet(rules) {
	this.references = Object.create(null);
	this.rules = RuleSet.normalizeRules(rules, this.references, "ref-");
}

module.exports = RuleSet;

RuleSet.normalizeRules = function(rules, refs, ident) {
	if(Array.isArray(rules)) {
		return rules.map(function(rule, idx) {
			return RuleSet.normalizeRule(rule, refs, `${ident}-${idx}`);
		});
	} else if(rules) {
		return [RuleSet.normalizeRule(rules, refs, ident)];
	} else {
		return [];
	}
};

RuleSet.normalizeRule = function(rule, refs, ident) {
	if(typeof rule === "string")
		return {
			use: [{
				loader: rule
			}]
		};
	if(!rule)
		throw new Error("Unexcepted null when object was expected as rule");
	if(typeof rule !== "object")
		throw new Error("Unexcepted " + typeof rule + " when object was expected as rule (" + rule + ")");

	var newRule = {};
	var useSource;
	var resourceSource;
	var condition;

	if(rule.test || rule.include || rule.exclude) {
		checkResourceSource("test + include + exclude");
		condition = {
			test: rule.test,
			include: rule.include,
			exclude: rule.exclude
		};
		try {
			newRule.resource = RuleSet.normalizeCondition(condition);
		} catch(error) {
			throw new Error(RuleSet.buildErrorMessage(condition, error));
		}
	}

	if(rule.resource) {
		checkResourceSource("resource");
		try {
			newRule.resource = RuleSet.normalizeCondition(rule.resource);
		} catch(error) {
			throw new Error(RuleSet.buildErrorMessage(rule.resource, error));
		}
	}

	if(rule.resourceQuery) {
		try {
			newRule.resourceQuery = RuleSet.normalizeCondition(rule.resourceQuery);
		} catch(error) {
			throw new Error(RuleSet.buildErrorMessage(rule.resourceQuery, error));
		}
	}

	if(rule.issuer) {
		try {
			newRule.issuer = RuleSet.normalizeCondition(rule.issuer);
		} catch(error) {
			throw new Error(RuleSet.buildErrorMessage(rule.issuer, error));
		}
	}

	if(rule.loader && rule.loaders)
		throw new Error(RuleSet.buildErrorMessage(rule, new Error("Provided loader and loaders for rule (use only one of them)")));

	var loader = rule.loaders || rule.loader;
	if(typeof loader === "string" && !rule.options && !rule.query) {
		checkUseSource("loader");
		newRule.use = RuleSet.normalizeUse(loader.split("!"), ident);
	} else if(typeof loader === "string" && (rule.options || rule.query)) {
		checkUseSource("loader + options/query");
		newRule.use = RuleSet.normalizeUse({
			loader: loader,
			options: rule.options,
			query: rule.query
		}, ident);
	} else if(loader && (rule.options || rule.query)) {
		throw new Error(RuleSet.buildErrorMessage(rule, new Error("options/query cannot be used with loaders (use options for each array item)")));
	} else if(loader) {
		checkUseSource("loaders");
		newRule.use = RuleSet.normalizeUse(loader, ident);
	} else if(rule.options || rule.query) {
		throw new Error(RuleSet.buildErrorMessage(rule, new Error("options/query provided without loader (use loader + options)")));
	}

	if(rule.use) {
		checkUseSource("use");
		newRule.use = RuleSet.normalizeUse(rule.use, ident);
	}

	if(rule.rules)
		newRule.rules = RuleSet.normalizeRules(rule.rules, refs, `${ident}-rules`);

	if(rule.oneOf)
		newRule.oneOf = RuleSet.normalizeRules(rule.oneOf, refs, `${ident}-oneOf`);

	var keys = Object.keys(rule).filter(function(key) {
		return ["resource", "resourceQuery", "test", "include", "exclude", "issuer", "loader", "options", "query", "loaders", "use", "rules", "oneOf"].indexOf(key) < 0;
	});
	keys.forEach(function(key) {
		newRule[key] = rule[key];
	});

	function checkUseSource(newSource) {
		if(useSource && useSource !== newSource)
			throw new Error(RuleSet.buildErrorMessage(rule, new Error("Rule can only have one result source (provided " + newSource + " and " + useSource + ")")));
		useSource = newSource;
	}

	function checkResourceSource(newSource) {
		if(resourceSource && resourceSource !== newSource)
			throw new Error(RuleSet.buildErrorMessage(rule, new Error("Rule can only have one resource source (provided " + newSource + " and " + resourceSource + ")")));
		resourceSource = newSource;
	}

	if(Array.isArray(newRule.use)) {
		newRule.use.forEach(function(item) {
			if(item.ident) {
				refs[item.ident] = item.options;
			}
		});
	}

	return newRule;
};

RuleSet.buildErrorMessage = function buildErrorMessage(condition, error) {
	var conditionAsText = JSON.stringify(condition, function(key, value) {
		return value === undefined ? "undefined" : value;
	}, 2);
	var message = error.message + " in " + conditionAsText;
	return message;
};

RuleSet.normalizeUse = function normalizeUse(use, ident) {
	if(Array.isArray(use)) {
		return use.map((item, idx) => RuleSet.normalizeUse(item, `${ident}-${idx}`)).reduce(function(arr, items) {
			return arr.concat(items);
		}, []);
	}
	return [RuleSet.normalizeUseItem(use, ident)];
};

RuleSet.normalizeUseItemFunction = function normalizeUseItemFunction(use, data) {
	var result = use(data);
	if(typeof result === "string") {
		return RuleSet.normalizeUseItem(result);
	}
	return result;
};

RuleSet.normalizeUseItemString = function normalizeUseItemString(useItemString) {
	var idx = useItemString.indexOf("?");
	if(idx >= 0) {
		return {
			loader: useItemString.substr(0, idx),
			options: useItemString.substr(idx + 1)
		};
	}
	return {
		loader: useItemString
	};
};

RuleSet.normalizeUseItem = function normalizeUseItem(item, ident) {
	if(typeof item === "function")
		return item;

	if(typeof item === "string") {
		return RuleSet.normalizeUseItemString(item);
	}

	var newItem = {};

	if(item.options && item.query)
		throw new Error("Provided options and query in use");

	if(!item.loader)
		throw new Error("No loader specified");

	newItem.options = item.options || item.query;

	if(typeof newItem.options === "object" && newItem.options) {
		if(newItem.options.ident)
			newItem.ident = newItem.options.ident;
		else
			newItem.ident = ident;
	}

	var keys = Object.keys(item).filter(function(key) {
		return ["options", "query"].indexOf(key) < 0;
	});

	keys.forEach(function(key) {
		newItem[key] = item[key];
	});

	return newItem;
};

RuleSet.normalizeCondition = function normalizeCondition(condition) {
	if(!condition)
		throw new Error("Expected condition but got falsy value");
	if(typeof condition === "string") {
		return function(str) {
			return str.indexOf(condition) === 0;
		};
	}
	if(typeof condition === "function") {
		return condition;
	}
	if(condition instanceof RegExp) {
		return condition.test.bind(condition);
	}
	if(Array.isArray(condition)) {
		var items = condition.map(function(c) {
			return RuleSet.normalizeCondition(c);
		});
		return orMatcher(items);
	}
	if(typeof condition !== "object")
		throw Error("Unexcepted " + typeof condition + " when condition was expected (" + condition + ")");
	var matchers = [];
	Object.keys(condition).forEach(function(key) {
		var value = condition[key];
		switch(key) {
			case "or":
			case "include":
			case "test":
				if(value)
					matchers.push(RuleSet.normalizeCondition(value));
				break;
			case "and":
				if(value) {
					var items = value.map(function(c) {
						return RuleSet.normalizeCondition(c);
					});
					matchers.push(andMatcher(items));
				}
				break;
			case "not":
			case "exclude":
				if(value) {
					var matcher = RuleSet.normalizeCondition(value);
					matchers.push(notMatcher(matcher));
				}
				break;
			default:
				throw new Error("Unexcepted property " + key + " in condition");
		}
	});
	if(matchers.length === 0)
		throw new Error("Excepted condition but got " + condition);
	if(matchers.length === 1)
		return matchers[0];
	return andMatcher(matchers);
};

function notMatcher(matcher) {
	return function(str) {
		return !matcher(str);
	};
}

function orMatcher(items) {
	return function(str) {
		for(var i = 0; i < items.length; i++) {
			if(items[i](str))
				return true;
		}
		return false;
	};
}

function andMatcher(items) {
	return function(str) {
		for(var i = 0; i < items.length; i++) {
			if(!items[i](str))
				return false;
		}
		return true;
	};
}

RuleSet.prototype.exec = function(data) {
	var result = [];
	this._run(data, {
		rules: this.rules
	}, result);
	return result;
};

RuleSet.prototype._run = function _run(data, rule, result) {
	// test conditions
	if(rule.resource && !data.resource)
		return false;
	if(rule.resourceQuery && !data.resourceQuery)
		return false;
	if(rule.issuer && !data.issuer)
		return false;
	if(rule.resource && !rule.resource(data.resource))
		return false;
	if(data.issuer && rule.issuer && !rule.issuer(data.issuer))
		return false;
	if(data.resourceQuery && rule.resourceQuery && !rule.resourceQuery(data.resourceQuery))
		return false;

	// apply
	var keys = Object.keys(rule).filter(function(key) {
		return ["resource", "resourceQuery", "issuer", "rules", "oneOf", "use", "enforce"].indexOf(key) < 0;
	});
	keys.forEach(function(key) {
		result.push({
			type: key,
			value: rule[key]
		});
	});

	if(rule.use) {
		rule.use.forEach(function(use) {
			result.push({
				type: "use",
				value: typeof use === "function" ? RuleSet.normalizeUseItemFunction(use, data) : use,
				enforce: rule.enforce
			});
		});
	}

	var i;

	if(rule.rules) {
		for(i = 0; i < rule.rules.length; i++) {
			this._run(data, rule.rules[i], result);
		}
	}

	if(rule.oneOf) {
		for(i = 0; i < rule.oneOf.length; i++) {
			if(this._run(data, rule.oneOf[i], result))
				break;
		}
	}

	return true;
};

RuleSet.prototype.findOptionsByIdent = function findOptionsByIdent(ident) {
	var options = this.references[ident];
	if(!options) throw new Error("Can't find options with ident '" + ident + "'");
	return options;
};
