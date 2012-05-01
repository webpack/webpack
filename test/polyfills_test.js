/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var vows = require("vows");
var assert = require("assert");
var path = require("path");
require = require("../require-polyfill")(require.valueOf());

vows.describe("polyfills").addBatch({

	"polyfill context": {
		topic: function() {
			return require.context("./fixtures")
		},

		"simple file": {
			topic: function(context) {
				return context("./a");
			},

			"correct file": function(a) {
				assert.equal(a(), "This is a");
			}
		},

		"simple file with extension": {
			topic: function(context) {
				return context("./a.js");
			},

			"correct file": function(a) {
				assert.equal(a(), "This is a");
			}
		},

		"file in folder": {
			topic: function(context) {
				return context("./lib/complex1");
			},

			"correct file": function(complex1) {
				assert.equal(complex1, "lib complex1");
			}
		}
	},

	"polyfill ensure": {
		"empty ensure list": {
			topic: function() {
				var cb = this.callback;
				require.ensure([], function(require) {
					cb(null, require("./fixtures/a"));
				});
			},

			"executed": function(a) {
				assert.equal(a(), "This is a");
			}
		},
		"with ensure list": {
			topic: function() {
				var cb = this.callback;
				require.ensure(["./fixtures/a"], function(require) {
					cb(null, require("./fixtures/a"));
				});
			},
			
			"executed": function(a) {
				assert.equal(a(), "This is a");
			}
		}
	},
	
	"polyfill loaders": {
		"buildin raw loader": {
			topic: require("raw!./fixtures/abc.txt"),
			
			"raw loaded": function(abc) {
				assert.equal(abc, "abc");
			}
		},
		"buildin json loader": {
			topic: require("json!../package.json"),
			
			"json loaded": function(packageJson) {
				assert.equal(packageJson.name, "webpack");
			}
		},
		"buildin jade loader": {
			topic: function() {
				return require("jade!./browsertest/resources/template.jade");
			},
			
			"jade loaded": function(template) {
				assert.equal(template({abc:"abc"}), "<p>abc</p>");
			}
		},
		"buildin coffee loader": {
			topic: function() {
				return require("coffee!./browsertest/resources/script.coffee") || 1;
			},
			
			"coffee loaded": function(result) {
				assert.equal(result, "coffee test");
			}
		}
	}


}).export(module);