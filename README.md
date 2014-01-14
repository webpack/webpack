[![webpack](http://webpack.github.io/assets/logo.png)](http://webpack.github.io)

[![NPM version](https://badge.fury.io/js/webpack.png)](http://badge.fury.io/js/webpack)

[documentation](http://webpack.github.io/docs/)

# Introduction

webpack is a bundler for modules. The main purpose is to bundle javascript files for usage in browser.

**TL;DR**

* bundles [CommonJs](http://www.commonjs.org/specs/modules/1.0/) and [AMD](https://github.com/amdjs/amdjs-api/wiki/AMD) modules. (even combined)
* can create a single bundle or a bunch of chunks loaded on demand, to reduce initial loading time.
* dependencies are resolved while compiling, this makes the runtime very small
* loader can preprocess files while compiling, i. e. coffee-script to javascript

Check the [documentation](http://webpack.github.io/docs/) if you want to know more...



# Examples

Take a look at the [`examples`](https://github.com/webpack/webpack/tree/master/examples) folder.



# Features

* loaders are chainable
* loaders run in node.js and can do a bunch of stuff
* option to name your file with a hash of the content
* watch mode
* SourceUrl and SourceMap support
* plugin system, extend webpack or build a complete different compiler
 * i. e. [component](https://github.com/webpack/component-webpack-plugin), [rewire](https://github.com/jhnns/rewire-webpack) and [more...](http://webpack.github.io/docs/webpack-plugins.html)
* [interfaces](http://webpack.github.io/docs/webpack-usage.html)
 * CLI with [arguments](http://webpack.github.io/docs/webpack-detailed-usage.html)
 * CLI with [config file](http://webpack.github.io/docs/webpack-options.html), [arguments](http://webpack.github.io/docs/webpack-detailed-usage.html) are still possible
 * usable as library from node.js
 * usable as [grunt plugin](https://github.com/webpack/grunt-webpack)
* browser replacements
 * comes with browser replacements for some node.js modules
* [Hot Module Replacement](http://webpack.github.io/docs/hot-code-replacement.html)
 * install updates without full page refresh
* see also
 * [webpack-dev-middleware](https://github.com/webpack/webpack-dev-middleware)
 * [webpack-dev-server](https://github.com/webpack/webpack-dev-server)
 * [enhanced-resolve](https://github.com/webpack/enhanced-resolve) and
 * [enhanced-require](https://github.com/webpack/enhanced-require)

## A small example what's possible

``` javascript
var commonjs = require("./commonjs");
define(["amd-module", "./file"], function(amdModule, file) {
	require(["big-module/big/file"], function(big) {
		// AMD require acts as split point
		// and "big-module/big/file" is only downloaded when requested
		var stuff = require("../my/stuff");
		// dependencies automatically goes in chunk too
	});
});

require("coffee!./cup.coffee");
// The loader syntax allows to proprocess files
// for common stuff you can bind RegExps to loaders
// if you also add ".coffee" to the default extensions
// you can write:
require("./cup");

function loadTemplate(name) {
	return require("./templates/" + name ".jade");
	// dynamic requires are supported
	// while compiling we figure out what can be requested
	// here everything in "./templates" that matches /^.*\.jade$/
	// (can also be in subdirectories)
}

require("imports?_=underscore!../loaders/my-ejs-loader!./template.html");
// you can chain loaders
// you can configure loaders with query parameters
// and loaders resolve similar to modules

// ...you can combine everything
function loadTemplateAsync(name, callback) {
	require(["bundle?lazy!./templates/" + name + ".jade"], function(templateBundle) {
		templateBundle(callback);
	});
}
```



## Documentation

[documentation](http://webpack.github.io/docs/)



## Tests

You can run the unit tests with `npm test`. [![build status](https://secure.travis-ci.org/webpack/webpack.png)](http://travis-ci.org/webpack/webpack)

You can run the browser tests:

```
cd test/browsertests
node build
```

and open `tests.html` in browser.



## Contribution

You are welcome to contribute by writing issues or pull requests.
It would be nice if you open source your own loaders or webmodules. :)

You are also welcome to correct any spelling mistakes or any language issues, because my english is not perfect...

If you want to discus something or just need help, [here is a gitter.im room](https://gitter.im/webpack/webpack).


## License

Copyright (c) 2012-2013 Tobias Koppers

MIT (http://www.opensource.org/licenses/mit-license.php)




## Dependencies

* [esprima](http://esprima.org/)
* [enhanced-resolve](https://github.com/webpack/enhanced-resolve)
* [uglify-js](https://github.com/mishoo/UglifyJS)
* [mocha](https://github.com/visionmedia/mocha)
* [should](https://github.com/visionmedia/should.js)
* [optimist](https://github.com/substack/node-optimist)
* [async](https://github.com/caolan/async)
* [mkdirp](http://esprima.org/)
* [clone](https://github.com/pvorb/node-clone)
* [base64-encode](https://github.com/ForbesLindesay/base64-encode)

[![Dependency Status](https://david-dm.org/webpack/webpack.png)](https://david-dm.org/webpack/webpack)
