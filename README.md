[![webpack](https://webpack.github.io/assets/logo.png)](https://webpack.github.io)


[![NPM version][npm-image]][npm-url] [![Gitter chat][gitter-image]][gitter-url] [![Downloads][downloads-image]][downloads-url]

[![NPM][nodei-image]][nodei-url]

build
[![Build Status][travis-image]][travis-url] [![Appveyor Status][appveyor-image]][appveyor-url]  [![Coverage Status][coveralls-image]][coveralls-url]

dependencies
[![Dependency Status][david-image]][david-url] [![devDependency Status][david-dev-image]][david-dev-url] [![peerDependency Status][david-peer-image]][david-peer-url]

donation
[![gratipay donate button][gratipay-image]][gratipay-url] [![Donate to sokra][donate-image]][donate-url]

[![BADGINATOR][badginator-image]][badginator-url]

[documentation](https://webpack.github.io/docs/?utm_source=github&utm_medium=readme&utm_campaign=top)

# Introduction

webpack is a bundler for modules. The main purpose is to bundle JavaScript
files for usage in a browser, yet it is also capable of transforming, bundling,
or packaging just about any resource or asset.


**TL; DR**

* Bundles both [CommonJS](http://wiki.commonjs.org/) and [AMD](https://github.com/amdjs/amdjs-api/wiki/AMD) modules (even combined).
* Can create a single bundle or multiple chunks that are asynchronously loaded at runtime (to reduce initial loading time).
* Dependencies are resolved during compilation reducing the runtime size.
* Loaders can preprocess files while compiling, e.g. coffeescript to JavaScript, handlebars strings to compiled functions, images to Base64, etc.
* Highly modular plugin system to do whatever else your application requires.

# Getting Started

Check out webpack's [documentation](https://webpack.github.io/docs/?utm_source=github&utm_medium=readme&utm_campaign=trdr) for quick Getting Started guide, in-depth usage,
tutorials and resources.

# Installation

project:
`npm install webpack --save-dev`

global:
`npm install webpack -g`

Usage:
https://webpack.github.io/docs/tutorials/getting-started/

# Examples

Take a look at the [`examples`](https://github.com/webpack/webpack/tree/master/examples) folder.

# Features

## Plugins

webpack has a [rich plugin
interface](https://webpack.github.io/docs/plugins.html). Most of the features
within webpack itself use this plugin interface. This makes webpack very
**flexible**.


## Performance

webpack uses async I/O and has multiple caching levels. This makes webpack fast
and incredibly **fast** on incremental compilations.

## Loaders

webpack enables use of loaders to preprocess files. This allows you to bundle
**any static resource** way beyond JavaScript. You can easily [write your own
loaders](https://webpack.github.io/docs/loaders.html) using node.js.

Loaders are activated by using `loadername!` prefixes in `require()` statements,
or are automatically applied via regex from your webpack configuration.

Please see [Using Loaders](https://webpack.github.io/docs/using-loaders.html) for more information.

**basic**
* [`json`](https://github.com/webpack/json-loader): Loads file as JSON
* [`raw`](https://github.com/webpack/raw-loader): Loads raw content of a file (as utf-8)
* [`val`](https://github.com/webpack/val-loader): Executes code as module and consider exports as JavaScript code
* [`script`](https://github.com/webpack/script-loader): Executes a JavaScript file once in global context (like in script tag), requires are not parsed.

**packaging**
* [`file`](https://github.com/webpack/file-loader): Emits the file into the output folder and returns the (relative) url.
* [`url`](https://github.com/webpack/url-loader): The url loader works like the file loader, but can return a Data Url if the file is smaller than a limit.
* [`image`](https://github.com/tcoopman/image-webpack-loader): Compresses your images. Ideal to use together with `file` or `url`.
* [`svgo-loader`](https://github.com/rpominov/svgo-loader): Compresses SVG images using [svgo](https://github.com/svg/svgo) library
* [`baggage`](https://github.com/deepsweet/baggage-loader): Automatically require any resources related to the required one
* [`polymer-loader`](https://github.com/JonDum/polymer-loader): Process HTML & CSS with preprocessor of choice and `require()` Web Components like first-class modules.

**dialects**
* [`coffee`](https://github.com/webpack/coffee-loader): Loads coffee-script like JavaScript
* [`babel`](https://github.com/babel/babel-loader): Turn ES6 code into vanilla ES5 using [Babel](https://github.com/babel/babel).
* [`livescript`](https://github.com/appedemic/livescript-loader): Loads LiveScript like JavaScript
* [`sweetjs`](https://github.com/jlongster/sweetjs-loader): Use sweetjs macros.
* [`traceur`](https://github.com/jupl/traceur-loader): Use future JavaScript features with [Traceur](https://github.com/google/traceur-compiler).
* [`typescript`](https://github.com/andreypopp/typescript-loader): Loads TypeScript like JavaScript.

**templating**
* [`html`](https://github.com/webpack/html-loader): Exports HTML as string, require references to static resources.
* [`jade`](https://github.com/webpack/jade-loader): Loads jade template and returns a function
* [`handlebars`](https://github.com/altano/handlebars-loader): Loads handlebars template and returns a function
* [`ractive`](https://github.com/rstacruz/ractive-loader): Pre-compiles Ractive templates for interactive DOM manipulation
* [`markdown`](https://github.com/peerigon/markdown-loader): Compiles Markdown to HTML
* [`ng-cache`](https://github.com/teux/ng-cache-loader): Puts HTML partials in the Angular's $templateCache

**styling**
* [`style`](https://github.com/webpack/style-loader): Add exports of a module as style to DOM
* [`css`](https://github.com/webpack/css-loader): Loads css file with resolved imports and returns css code
* [`cssnext`](https://github.com/MoOx/cssnext-loader): Loads and compiles a css file using [cssnext](http://cssnext.io/)
* [`less`](https://github.com/webpack/less-loader): Loads and compiles a less file
* [`sass`](https://github.com/jtangelder/sass-loader): Loads and compiles a scss file
* [`stylus`](https://github.com/shama/stylus-loader): Loads and compiles a stylus file

**misc**
* [`po`](https://github.com/perchlayer/po-loader): Loads a PO gettext file and returns JSON
* [`mocha`](https://github.com/webpack/mocha-loader): Do tests with mocha in browser or node.js
* [`eslint`](https://github.com/MoOx/eslint-loader): PreLoader for linting code using ESLint.
* [`jshint`](https://github.com/webpack/jshint-loader): PreLoader for linting code.
* [`jscs`](https://github.com/unindented/jscs-loader): PreLoader for style checking.
* [`injectable`](https://github.com/jauco/webpack-injectable): Allow to inject dependencies into modules
* [`transform`](https://github.com/webpack/transform-loader): Use browserify transforms as loader.

For the full list of loaders, see [list of loaders](https://webpack.github.io/docs/list-of-loaders.html).

## Module Format (AMD/CommonJS)

webpack supports **both** AMD and CommonJS module styles. It performs clever static
analysis on the AST of your code. It even has an evaluation engine to evaluate
simple expressions. This allows you to **support most existing libraries** out of the box.

## Code Splitting

webpack allows you to split your codebase into multiple chunks. Chunks are
loaded asynchronously at runtime. This reduces the initial loading time.

[Code Splitting documentation](https://webpack.github.io/docs/code-splitting.html)

## Optimizations

webpack can do many optimizations to **reduce the output size of your
JavaScript** by deduplicating frequently used modules, minifying, and giving
you full control of what is loaded initially and what is loaded at runtime
through code splitting. It can also can make your code chunks **cache
friendly** by using hashes.

[Optimization documentation](https://webpack.github.io/docs/optimization.html)

# A small example of what's possible

``` javascript
// webpack is a module bundler.
// This means webpack takes modules with dependencies
// and emits static assets representing those modules.

// Dependencies can be written in CommonJS
var commonjs = require("./commonjs");
// or in AMD
define(["amd-module", "../file"], function (amdModule, file) {
	// while previous constructs are sync,
	// this is async
	require(["big-module/big/file"], function (big) {
		 // For async dependencies, webpack splits
		 // your application into multiple "chunks".
		 // This part of your application is
		 // loaded on demand (code-splitting).
		var stuff = require("../my/stuff");
		// "../my/stuff" is also loaded on-demand
		//  because it's in the callback function
		//  of the AMD require.
	});
});


require("coffee!./cup.coffee");
// "Loaders" are used to preprocess files.
// They can be prefixed in the require call
// or configured in the configuration.
require("./cup");
// This does the same when you add ".coffee" to the extensions
// and configure the "coffee" loader for /\.coffee$/

function loadTemplate (name) {
	return require("./templates/" + name + ".jade");
	// Many expressions are supported in require calls.
	// A clever parser extracts information and concludes
	// that everything in "./templates" that matches
	// /\.jade$/ should be included in the bundle, as it
	// can be required.
}


// ...and you can combine everything.
function loadTemplateAsync (name, callback) {
	require(["bundle?lazy!./templates/" + name + ".jade"],
	  function (templateBundle) {
	          templateBundle(callback);
	});
}
```

## Documentation

[documentation](https://webpack.github.io/docs/?utm_source=github&utm_medium=readme&utm_campaign=documentation)


## Changelog

[changelog](https://webpack.github.io/docs/changelog.html)


## Tests

You can run the Node tests with `npm test`.

You can run the browser tests:

```
cd test/browsertests
node build
```

and open `tests.html` in the browser.

## Contribution

Most of the time, if webpack is not working correctly for you it is a simple configuration issue.

If you are still having difficulty after looking over your configuration carefully, please post
a question to [StackOverflow with the webpack tag](http://stackoverflow.com/tags/webpack). Questions
that include your webpack.config.js and relevant files are more likely to receive responses.

If you have discovered a bug or have a feature suggestion, feel free to create an issue on Github.

If you create a loader or plugin, please consider open sourcing it, putting it
on NPM and following the `x-loader`, `x-plugin` convention.

You are also welcome to correct any spelling mistakes or any language issues.

If you want to discuss something or just need help, [here is our gitter.im room](https://gitter.im/webpack/webpack).

## License

Copyright (c) 2012-2016 Tobias Koppers

MIT (http://opensource.org/licenses/mit-license.php)

## Thanks to

(In chronological order)

* @google for [Google Web Toolkit (GWT)](https://code.google.com/archive/p/google-web-toolkit), which aims to compile Java to JavaScript. It features a similar [Code Splitting](http://www.gwtproject.org/doc/latest/DevGuideCodeSplitting.html) as webpack.
* @medikoo for [modules-webmake](https://github.com/medikoo/modules-webmake), which is a similar project. webpack was born because I wanted Code Splitting for modules-webpack. Interestingly the [Code Splitting issue is still open](https://github.com/medikoo/modules-webmake/issues/7) (thanks also to @Phoscur for the discussion).
* @substack for [browserify](http://browserify.org/), which is a similar project and source for many ideas.
* @jrburke for [require.js](http://requirejs.org/), which is a similar project and source for many ideas.
* @defunctzombie for the [browser-field spec](https://gist.github.com/defunctzombie/4339901), which makes modules available for node.js, browserify and webpack.
* Every early webpack user, which contributed to webpack by writing issues or PRs. You influenced the direction...
* @shama, @jhnns and @sokra for maintaining this project
* Everyone who has written a loader for webpack. You are the ecosystem...
* Everyone I forgot to mention here, but also influenced webpack.


## Sponsor

This is a free-time project. The time I invest in it fluctuates. If you use webpack for a serious task, and you'd like me to invest more time on it, please donate. This project increases your income/productivity too. It makes development and applications faster and it reduces the required bandwidth.

Another way you can help fund Webpack is by buying the ebook ["SurviveJS - Webpack"](https://leanpub.com/survivejs-webpack), where around ~30% of the book's profit will go to me.

I'm very thankful for every dollar. If you leave your username or email, I may show my thanks by giving you extra support.


## Dependencies

* [esprima](http://esprima.org/)
* [enhanced-resolve](https://github.com/webpack/enhanced-resolve)
* [uglify-js](https://github.com/mishoo/UglifyJS)
* [mocha](https://github.com/mochajs/mocha)
* [should](https://github.com/tj/should.js)
* [optimist](https://github.com/substack/node-optimist)
* [async](https://github.com/caolan/async)
* [mkdirp](https://github.com/substack/node-mkdirp)
* [clone](https://github.com/pvorb/node-clone)


[travis-url]: https://travis-ci.org/webpack/webpack
[travis-image]: https://img.shields.io/travis/webpack/webpack/master.svg
[appveyor-url]: https://ci.appveyor.com/project/sokra/webpack/branch/master
[appveyor-image]: https://ci.appveyor.com/api/projects/status/github/webpack/webpack?svg=true
[coveralls-url]: https://coveralls.io/r/webpack/webpack/
[coveralls-image]: https://img.shields.io/coveralls/webpack/webpack.svg
[npm-url]: https://www.npmjs.com/package/webpack
[npm-image]: https://img.shields.io/npm/v/webpack.svg
[downloads-image]: https://img.shields.io/npm/dm/webpack.svg
[downloads-url]: http://badge.fury.io/js/webpack
[david-url]: https://david-dm.org/webpack/webpack
[david-image]: https://img.shields.io/david/webpack/webpack.svg
[david-dev-url]: https://david-dm.org/webpack/webpack#info=devDependencies
[david-dev-image]: https://david-dm.org/webpack/webpack/dev-status.svg
[david-peer-url]: https://david-dm.org/webpack/webpack#info=peerDependencies
[david-peer-image]: https://david-dm.org/webpack/webpack/peer-status.svg
[nodei-image]: https://nodei.co/npm/webpack.png?downloads=true&downloadRank=true&stars=true
[nodei-url]: https://www.npmjs.com/package/webpack
[donate-url]: http://sokra.github.io/
[donate-image]: https://img.shields.io/badge/donate-sokra-brightgreen.svg
[gratipay-url]: https://gratipay.com/webpack/
[gratipay-image]: https://img.shields.io/gratipay/webpack.svg
[gitter-url]: https://gitter.im/webpack/webpack
[gitter-image]: https://img.shields.io/badge/gitter-webpack%2Fwebpack-brightgreen.svg
[badginator-image]: https://badginator.herokuapp.com/webpack/webpack.svg
[badginator-url]: https://github.com/defunctzombie/badginator
