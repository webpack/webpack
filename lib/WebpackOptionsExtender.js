/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Marat Dreizin @mdreizin
*/
var path = require("path");
var OptionsDefaulter = require("webpack-core/lib/OptionsDefaulter");

function WebpackOptionsExtender() {
	OptionsDefaulter.call(this);
}

module.exports = WebpackOptionsExtender;

WebpackOptionsExtender.prototype = Object.create(OptionsDefaulter.prototype);

WebpackOptionsExtender.prototype.constructor = OptionsDefaulter;

/**
 * Merges two objects
 * @param {Object} source
 * @param {Object} target
 * @returns {Object}
 */
WebpackOptionsExtender.prototype.merge = function merge(source, target) {
	Object.keys(target).forEach(function(key) {
		var property = target[key];

		if(Array.isArray(property)) {
			if(!source[key]) {
				source[key] = [];
			}

			property.forEach(function(prop) {
				if(source[key].indexOf(prop) === -1) {
					source[key].push(prop);
				}
			});
			return;
		}

		if(Array.isArray(source[key]) && !Array.isArray(property) && typeof property === "number") {
			source[key][0] = target[key];
			return;
		}

		if(typeof property === "object" && !Array.isArray(property)) {
			source[key] = merge(source[key] || {}, target[key]);
		} else {
			source[key] = target[key];
		}
	});

	return source;
};

/**
 * Loads `config` from the file
 * @throws Will throw an error if the `filename` is not found
 * @param {String} filename
 * @returns {Object}
 */
WebpackOptionsExtender.prototype.load = function(filename) {
	var options = require(filename);

	return this.merge({}, options);
};

/**
 * Gets `default` mapper which just returns original `options`
 * @param {Object} options
 * @returns {Object}
 */
WebpackOptionsExtender.prototype.defaultConfigMapper = function(options) {
	return options;
};

/**
 * Converts to `extends` object
 * @param {String|String[]|Object<String,Function>|Object<String,Boolean>} options
 * @returns {Object<String,Function>}
 */
WebpackOptionsExtender.prototype.toExtendsOptions = function(options) {
	if(!options) {
		options = {};
	}

	var arr = [];

	if(Array.isArray(options)) { // NOTE (@mdreizin): {extends:["./webpack.config.js"]}
		arr = options.map(function(filename) {
			return {
				filename: filename
			};
		});
	} else if(typeof options === "string") { // NOTE (@mdreizin): {extends:"./webpack.config.js"}
		arr = [{
			filename: options
		}];
	} else if(typeof options === "object") { // NOTE (@mdreizin): {extends:{"./webpack.config.js":Function|Boolean}}
		arr = Object.keys(options).map(function(filename) {
			return {
				filename: filename,
				mapper: options[filename]
			};
		});
	}

	return arr.reduce(function(acc, obj) {
		var key = path.resolve(obj.filename);

		if(typeof obj.mapper === "boolean") { // NOTE (@mdreizin): {extends:{"./webpack.config.js":Boolean}}
			if(obj.mapper === true) {
				acc[key] = this.defaultConfigMapper;
			}
		} else { // NOTE (@mdreizin): {extends:{"./webpack.config.js":Function}}
			acc[key] = obj.mapper || this.defaultConfigMapper;
		}

		return acc;
	}.bind(this), {});
};

/**
 * Walks recursively through `options.extends` property and builds `visited` configs
 * @param {Object} options
 * @param {Object<String,Object>} visited
 * @returns {Object}
 */
WebpackOptionsExtender.prototype.walk = function(options, visited) {
	if(options && options.extends) {
		var extendsOptions = this.toExtendsOptions(options.extends);

		Object.keys(extendsOptions).filter(function(filename, index, arr) {
			return arr.indexOf(filename) === index;
		}).filter(function(filename) {
			return typeof visited[filename] === "undefined";
		}).forEach(function(filename) {
			var currentOptions = this.load(filename),
				mapOptions = extendsOptions[filename];

			/*if(typeof currentOptions === "function") { // NOTE (@mdreizin): Case for `webpack-2`
				// NOTE (@mdreizin): Need to find a way how to pass `env` variable to config `function`.
				currentOptions = currentOptions()
			}*/

			if(typeof mapOptions === "function") {
				currentOptions = mapOptions(currentOptions);
			}

			visited[filename] = currentOptions || {};

			this.walk(currentOptions, visited);
		}, this);
	}
};

WebpackOptionsExtender.prototype.process = function(options) {
	var visited = {};

	this.walk(options, visited);

	Object.keys(visited).reverse().forEach(function(filename) {
		var currentOptions = this.merge({}, visited[filename]);

		// NOTE (@mdreizin): Prevent merging `extends` property
		delete currentOptions.extends;

		this.merge(options, currentOptions);
	}, this);
};
