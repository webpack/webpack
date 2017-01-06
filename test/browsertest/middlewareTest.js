var webpackMiddleware = require("webpack-dev-middleware");
var webpack = require("webpack");
var express = require("express");
var path = require("path");

var app = express();

app.configure(function() {
	app.use(webpackMiddleware(webpack({
		context: __dirname,
		entry: ["../../hot/poll?10000", "./lib/index"],
		debug: true,
		devtool: "sourcemap",
		module: {
			loaders: [
				{ test: /\.json$/, loader: "json" },
				{ test: /\.coffee$/, loader: "coffee" },
				{ test: /\.jade$/, loader: "jade" },
				{ test: /\.css$/, loader: "style!css" },
				{ test: /\.less$/, loader: "style!css!less" },
			]
		},
		resolve: {
			alias: {
				vm: "vm-browserify"
			}
		},
		resolve: {
			unsafeCache: true
		},
		cache: true,
		recordsPath: path.join(__dirname, "webpack.records.json"),
		output: {
			publicPath: "http://localhost:8080/js/",
			path: "/",
			filename: "web.js",
			chunkFilename: "[chunkhash].chunk.js"
		},
		plugins: [
			new webpack.dependencies.LabeledModulesPlugin(),
			new webpack.optimize.UglifyJsPlugin(),
			new webpack.HotModuleReplacementPlugin()
		]
	}), {
		lazy: false,
		watchDelay: 5000,
		publicPath: "/js/",
		filename: "web.js",
		stats: {
			colors: true
		}
	}));
	app.use(express.static(path.join(__dirname)));

});

app.listen(8080);
