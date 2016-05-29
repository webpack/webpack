/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function LoadersList(list) {
	this.list = list || [];
	this.list.forEach(function(element) {
		if(element === null || typeof element !== "object")
			throw new TypeError("Each element of the loaders list must be an object or array");
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
	}
	if(typeof test === "function") {
		return test;
	}
	if(test instanceof RegExp) {
		return regExpAsMatcher(test);
	}
	if(Array.isArray(test)) {
		// create an array of match functions
		var matchers = test.map(asMatcher);
		return function(str) {
			return matchers.some(function(matcher) {
				return matcher(str);
			});
		};
	}
	throw new TypeError(test + " is not a valid test");
}

function getLoaderWithQuery(loader, query) {
	if(typeof query === "string") {
		return loader + "?" + query;
	}
	return loader + "?" + JSON.stringify(query);
}

function getLoadersFromObject(element) {
	var loaders = element.loaders || element.loader;
	if(typeof loaders === "string") {
		loaders = loaders.split("!");
	} else if(!Array.isArray(loaders)) {
		throw new TypeError("Element from loaders list should have one of the fields 'loader' or 'loaders'");
	}
	// legacy query usage
	if(element.query) {
		if(loaders.length > 1) {
			throw new Error("Cannot define 'query' and multiple loaders in loaders list");
		}
		var loader = loaders[0];
		return [getLoaderWithQuery(loader, element.query)];
	}
	return loaders.map(function(entry) {
		if(typeof entry === "string") {
			return entry;
		}
		if(typeof entry === "object") {
			var loader = entry.loader;
			if(!loader) {
				throw new TypeError("Element from loaders list with objects should have a 'loader' specified");
			}
			var query = entry.query;
			if(!query) {
				return loader;
			}
			return getLoaderWithQuery(loader, query);
		}
		throw new TypeError("Element from loaders list should be a string or an object");
	});
}

LoadersList.prototype.matchPart = function matchPart(str, test) {
	var matcher = asMatcher(test);
	return matcher(str);
};

LoadersList.prototype.match = function match(str) {
	return this.list
		.map(function(element) {
			if(Array.isArray(element)) {
				for(var i = 0; i < element.length; i++) {
					if(this.matchObject(str, element[i])) return getLoadersFromObject(element[i]);
				}
			} else {
				if(this.matchObject(str, element)) return getLoadersFromObject(element);
			}
		}, this)
		.filter(Boolean)
		.reduce(function(loaders, r) {
			return loaders.concat(r);
		}, []);
};

LoadersList.prototype.matchObject = function matchObject(str, obj) {
	if(obj.test && !this.matchPart(str, obj.test)) return false;
	if(obj.include && !this.matchPart(str, obj.include)) return false;
	if(obj.exclude && this.matchPart(str, obj.exclude)) return false;
	return true;
};
