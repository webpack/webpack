var webpackMiddleware = require("webpack-dev-middleware");
var express = require("express");
var path = require("path");

var app = express();

app.configure(function() {
	app.use(webpackMiddleware(path.join(__dirname, "lib", "index"), {
		publicPrefix: "http://localhost:8080/js/",
		watch: true,
		watchDelay: 5000,
		debug: true,
		output: "web.js",
		outputPostfix: ".web.js",
		resolve: {
			alias: {
				vm: "vm-browserify"
			}
		}
	}));
	app.use(express.static(path.join(__dirname)));

});

app.listen(8080);
