/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Marat Dreizin @mdreizin
*/
var path = require("path");
var OptionsDefaulter = require("webpack-core/lib/OptionsDefaulter");

var DEFAULT_FIELD_NAME = "extend";

/**
 * @constructor
 * @param {String=} fieldName
 */
function WebpackOptionsExtender(fieldName) {
	OptionsDefaulter.call(this);

	this.fieldName = fieldName || DEFAULT_FIELD_NAME;
}

module.exports = WebpackOptionsExtender;

WebpackOptionsExtender.prototype = Object.create(OptionsDefaulter.prototype);

WebpackOptionsExtender.prototype.constructor = OptionsDefaulter;

/**
 * Merges two objects
 * @param {Object} source
 * @param {Object} target
 * @private
 * @returns {Object}
 */
function merge(source, target) {
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
}

/**
 * Loads config from the file
 * @throws Will throw an error if the `filename` is not found
 * @param {String} filename
 * @private
 * @returns {Object}
 */
function loadConfig(filename) {
	var options = require(filename);

	return merge({}, options);
}

/**
 * Default config transform which just returns original `options`
 * @param {Object} options
 * @private
 * @returns {Object}
 */
function defaultConfigTransform(options) {
	return options;
}

/**
 * Extracts transforms from `options`
 * @param {String|String[]|Object<String,Function>|Object<String,Boolean>} options
 * @private
 * @returns {Object<String,Function>}
 */
function getConfigTransforms(options) {
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
				transform: options[filename]
			};
		});
	}

	return arr.reduce(function(acc, obj) {
		var key = path.resolve(obj.filename);

		if(typeof obj.transform === "boolean") { // NOTE (@mdreizin): {extends:{"./webpack.config.js":Boolean}}
			if(obj.transform === true) {
				acc[key] = defaultConfigTransform;
			}
		} else { // NOTE (@mdreizin): {extends:{"./webpack.config.js":Function}}
			acc[key] = obj.transform || defaultConfigTransform;
		}

		return acc;
	}, {});
}

/**
 * Walks recursively through `this.fieldName` property and builds `visited` configs
 * @param {Object} options
 * @param {Object<String,Object>} visited
 * @returns {Object}
 */
WebpackOptionsExtender.prototype.walk = function(options, visited) {
	var field = options && options[this.fieldName];

	if(typeof field !== "undefined") {
		var transforms = getConfigTransforms(field);

		Object.keys(transforms).filter(function(filename, index, arr) {
			return arr.indexOf(filename) === index; // NOTE (@mdreizin): Skip `duplicates`
		}).filter(function(filename) {
			return typeof visited[filename] === "undefined"; // NOTE (@mdreizin): Skip `visited` configs
		}).forEach(function(filename) {
			var currentConfig = loadConfig(filename),
				currentOptions = transforms[filename];

			/*if (typeof currentConfig === "function") { // NOTE (@mdreizin): Case for `webpack-2`
				// NOTE (@mdreizin): Need to find a way how to pass `env` variable to config `Function`.
				currentConfig = currentConfig(process.env.NODE_ENV)
			}*/

			if(typeof currentOptions === "function") {
				currentConfig = currentOptions(currentConfig);
			}

			visited[filename] = currentConfig || {};

			this.walk(currentConfig, visited);
		}, this);
	}
};

WebpackOptionsExtender.prototype.process = function(options) {
	var visited = {};

	this.walk(options, visited);

	Object.keys(visited).reverse().forEach(function(filename) {
		var currentOptions = merge({}, visited[filename]);

		// NOTE (@mdreizin): Prevent merging of `this.fieldName` property
		delete currentOptions[this.fieldName];

		merge(options, currentOptions);
	}, this);

	return options;
};
