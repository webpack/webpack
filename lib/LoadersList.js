/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function LoadersList(list) {
	this.list = list || [];
	this.list.forEach(function(element) {
		if(element === null || typeof element !== "object")
			throw new Error("Each element of the loaders list must be an object or array");
	});
}
module.exports = LoadersList;

function regExpAsMatcher(regExp) {
	return function(str) {
		return regExp.test(str);
	}
}

function asMatcher(test) {
	if(typeof test === "string") {
		return regExpAsMatcher(new RegExp("^" + test.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")));
	} else if(typeof test === "function") {
		return test;
	} else if(test instanceof RegExp) {
		return regExpAsMatcher(test);
	} else if(Array.isArray(test)) {
		var matchers = test.map(function(item) {
			if(Array.isArray(item)) {
				var matchers = item.map(asMatcher);
				return function(str) {
					return matchers.every(function(matcher) {
						return matcher(str);
					});
				};
			} else {
				return asMatcher(item);
			}
		});
		return function(str) {
			for(var i = 0; i < test.length; i++) {
				if(matchers[i](str))
					return true;
			}
			return false;
		};
	} else {
		throw new Error(test + " is not a valid test");
	}
}

function getLoadersFromObject(element) {
	if(element.query) {
		if(!element.loader || element.loader.indexOf("!") >= 0) throw new Error("Cannot define 'query' and multiple loaders in loaders list");
		if(typeof element.query === "string") return [element.loader + "?" + element.query];
		return [element.loader + "?" + JSON.stringify(element.query)];
	}
	if(element.loader) return element.loader.split("!");
	if(element.loaders) return element.loaders;
	throw new Error("Element from loaders list should have one of the fields 'loader' or 'loaders'");
}

LoadersList.prototype.matchPart = function matchPart(str, test) {
	if(!test) return true;
	var matcher = asMatcher(test);
	return matcher(str);
};

LoadersList.prototype.match = function match(str) {
	return this.list.map(function(element) {
		if(Array.isArray(element)) {
			for(var i = 0; i < element.length; i++) {
				if(this.matchObject(str, element[i]))
					return getLoadersFromObject(element[i]);
			}
		} else {
			if(this.matchObject(str, element))
				return getLoadersFromObject(element);
		}
	}, this).filter(Boolean).reduce(function(array, r) {
		r.forEach(function(r) {
			array.push(r);
		});
		return array;
	}, []) || [];
};

LoadersList.prototype.matchObject = function matchObject(str, obj) {
	if(obj.test)
		if(!this.matchPart(str, obj.test)) return false;
	if(obj.include)
		if(!this.matchPart(str, obj.include)) return false;
	if(obj.exclude)
		if(this.matchPart(str, obj.exclude)) return false;
	return true;
};
