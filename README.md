# modules-webpack

As developer you want to reuse existing code.
As with node.js and web all files are already in the same language, but it is extra work to use your code with the node.js module system and the browser.

The goal of `webpack` is to bundle CommonJs modules into javascript files which can be loaded by `<script>`-tags.
Simply concating all required files has a disadvantage: many code to download (and execute) on page load.
Therefore `webpack` uses the `require.ensure` function ([CommonJs/Modules/Async/A](http://wiki.commonjs.org/wiki/Modules/Async/A)) to split your code automatically into multiple bundles which are loaded on demand.
This happens mostly transparent to the developer.
Dependencies are resolved for you.
The result is a smaller inital code download which results in faster page load.

Another common thing in web development is that some files have to be preprocessed before send to the client (ex. template files).
This introduce more complexity to the compile step.
`webpack` supports loaders which process files before including them.
You as developer can use such files like any other module.

**TL;DR**

* bundle CommonJs modules for browser
* reuse server-side code (node.js) on client-side
* create multiple files which are loaded on demand (faster page load in big webapps or on mobile connections)
* dependencies managed for you, on compile time (no resolution on runtime needed)
* loaders can preprocess files

## Goals

* make node.js and browser development similar
* minimize code size (mobile connection)
 * minimize code size on inital download
 * download code only on demand
* require minimal configuration, but offer a maximum
 * load polyfills for node-specific things if used
 * offer replacements for node buildin libaries

# Example

See [example webapp](http://sokra.github.com/modules-webpack-example/).

## Simple Example

``` javascript
// a.js
var b = require("./b");
b.stuff("It works");

// b.js
exports.stuff = function(text) {
	console.log(text);
}
```

are compiled to (reformatted)

``` javascript
(/* small webpack header */)
({
0: function(module, exports, require) {

	var b = require(1);
	b.stuff("It works");

},
1: function(module, exports, require) {

	exports.stuff = function(text) {
		console.log(text)
	}

}
})
```

## Code Splitting

### Example

``` javascript
var a = require("a");
var b = require("b");
require.ensure(["c"], function(require) {
	require("b").xyz();
	var d = require("d");
});
```

```
File 1: web.js
- code of that file
- code of module a and dependencies
- code of module b and dependencies

File 2: 1.web.js
- code of module c and dependencies (but code is not used)
- code of module d and dependencies
```

Initially only `web.js` is included (and loaded) by your application.
`1.web.js` is loaded when the call to `require.ensure` happens.
After the second bundle (`1.web.js`) is loaded, the callback function will be invoked.

See [details](/sokra/modules-webpack/tree/master/examples/code-splitting) for exact output.

See [more examples](/sokra/modules-webpack/tree/master/examples).

## Reusing node.js code

`webpack` was built to support most of the code that was coded for node.js environment.
For example this works out of the box:

* `require("./templates/" + templateName);`
* `require(condition ? "moduleA" : condition2 ? "moduleB" : "./localStuff");`
* `function xyz(require) { require("text"); } xyz(function(a) { console.log(a) });`
* `var r = require; r("./file");` with warning
* `function xyz(require) { require("./file"); } xyz(require);` with warning
* `try { require("missingModule"); } catch(e) { console.log("missing") }` with warning
* `var require = function(a) { console.log(a) }; require("text");`
* `if(condition) require("optionalModule")` with warning if missing

## Browser replacements

Somethings it happens that browsers require other code than node.js do.
`webpack` allow module developers to specify replacements which are used in the compile process of `webpack`.

Modules in `web_modules` replace modules in `node_modules`.
`filename.web.js` replaces `filename.js` when required without file extension.

in options: `alias: { "http": "http-browserify" }`

in shell: `--alias http=http-browserify`

## Contexts

If the required module is not known while compile time we get into a problem.
A solution is the method `require.context` which takes a directory as parameter
and returns a function which behaves like the `require` function issued from a file
in this directory (but only if used for files in that directory).
The whole directory is included while compiling, so you have access to all files in it.

### Example

We have a directory full of templates, which are compiled javascript files.
A template should be loaded by template name.

``` javascript
var requireTemplate = require.context("./templates");
function getTemplate(templateName) {
	return requireTemplate("./" + templateName);
}
```

In addition to that `webpack` uses the `require.context` function automatically
if you use variables or other not parseable things in the `require` function.
That means the following code behaves like the above:

``` javascript
function getTemplate(templateName) {
	return require("./templates/" + templateName);
}
// is compiled like: return require.context("./templates")("./"+templateName)
// which compiles to: return require(123)("./"+templateName)
```

See [details](/sokra/modules-webpack/tree/master/examples/require.context) for complete example.

When try to store the `require` function in another variable or try to pass it as parameter,
`webpack` convert it to a `require.context(".")` to be compatible.
There is a warning emitted in this case.

*Warning: The complete code in the directory are included. So use it carefully.*

## Loaders

You can use a syntax for loader plugins to preprocess files before emitting javascript code to the bundle.

The following example loads the raw content of a file with the `raw` loader:

``` javascript
var content = require("raw!./file.txt");
```

Multiple loader plugins can be prepended by seperating them with `!`.
The loader plugins are resolved like in normal `require` call but with different default extension.

The `raw` loader plugin is looked up at modules `raw-webpack-web-loader`, `raw-webpack-loader`, `raw-web-loader`, `raw-loader`, `raw`
and the following files are looked up: `index.webpack-web-loader.js`, `index.webpack-loader.js`, `index.web-loader.js`, `index.loader.js`, `index`, `index.js`.
Note that the `web-` versions are omitted if loaders are used in node.js.

See [example](/sokra/modules-webpack/tree/master/examples/loader).

The following loaders are included in webpack:

* `raw`: Loads raw content of a file (as utf-8)
* `json` (default at `.json`): Loads file as JSON
* `jade` (default at `.jade`): Loads jade template and returns a function
* `coffee` (default at `.coffee`): Loads coffee-script like javascript
* `css`: Loads css file with resolved imports and returns css code
* `style`: Adds result of javascript execution to DOM
* (`.css` defaults to `style!css` loader, so all css rules are added to DOM)
* `script`: Executes a javascript file once in global context (like in script tag), requires are not parsed. Use this to include a libary. ex. `require("script!./jquery.min.js")`. This is synchron, so the `$` variable is avalible after require.

TODO

* `less`, `sass`: like `css` but compiles

## TL;DR

``` javascript
var a = require("a"); // require modules
var b = require("./b"); // and files
                          // like in node.js

// polyfill require method to use the new members in node.js too
require = require("webpack/require-polyfill")(require.valueOf());

// create a lazy loaded bundle
require.ensure([], function(require) {
	var c = require("c");

	// require json
	var packageJson = require("../package.json");

	// or jade templates, coffee-script, and many more with own loaders
	var result = require("./template.jade")(require("./dataFrom.coffee"));

	// files are compiled to javascript and packed into the bundle...
});
```

... and compile from the shell with:

```
webpack lib/input.js js/output.js
```

try `--min` to minimize with `uglify-js`.

## Limitations

### `require`-function

* `require` should not be overwritten, except from polyfill
* `require.ensure` should not be overwritten or called indirect
* `require.context` should not be overwritten or called indirect
* the argument to `require.context` should be a literal or addition of multiple literals
* An indirect call of `require` should access a file in current directory: This throws an exception: `var r = require; r("../file");`

The following cases could result in **too much code** in result file if used wrong:

* indirect call of `require`: `var r = require; r("./file");`. It includes the whole directory.
* `require.context`. It includes the whole directory.
* expressions in require arguments: `require(variable)`. It includes the whole directory. (except from `?:`-operator `require(condition ? "a" : "b")`)
* the function passed to `require.ensure` is not inlined in the call. Only requires in inlined function move into the second bundle.


### node.js specific modules

As node.js specific modules like `fs` will not work in browser they are not included (by default) and cause an exception.
You should replace them by own modules if you want to use them.
For some simple modules are replacements included in `webpack`.
Expensive replacements are not needed by everyone, so that are not included by default.
You need to specify `--alias [module]=[replacement]` to use them.
A warning saying that some module is missing is emitted in the case you use it without providing a replacement.

Some credit goes to the browserify contributors, you can use replacements provided by them.

Included simple replacements:

* `assert`: copy of node.js' version, small change
* `buffer`: copy of node-browserify's version
* `buffer_ieee754`: copy of node-browserify's version
* `child_process`: disabled
* `events`: copy of node.js' version
* `path`: copy of node.js' version
* `punycode`: copy of node.js' version, one line removed (http://mths.be/punycode by @mathias)
* `querystring`: copy of node.js' version
* `string_decoder`: copy of node.js' version
* `url`: copy of node.js' version
* `util`: copy of node.js' version

Here is a list of possible useful replacements: (intentionally not by default)

* `http=http-browserify`
* `vm=vm-browserify`
* TODO provide some more replacements

## Usage

### Shell

`webpack` offers a command line interface:

after `npm install webpack -g` you can use the `webpack` command

if invoked without arguments it prints a usage:

```
Usage: webpack <options> <input> <output>

Options:
  --single             Disable Code Splitting                                   [boolean]  [default: false]
  --min                Minimize it with uglifyjs                                [boolean]  [default: false]
  --filenames          Output Filenames Into File                               [boolean]  [default: false]
  --options            Options JSON File                                        [string]
  --script-src-prefix  Path Prefix For JavaScript Loading                       [string]
  --libary             Stores the exports into this variable                    [string]
  --colors             Output Stats with colors                                 [boolean]  [default: false]
  --json               Output Stats as JSON                                     [boolean]  [default: false]
  --by-size            Sort modules by size in Stats                            [boolean]  [default: false]
  --verbose            Output dependencies in Stats                             [boolean]  [default: false]
  --alias              Set a alias name for a module. ex. http=http-browserify  [string]
  --debug              Prints debug info to output files                        [boolean]  [default: false]
```

### Programmatically Usage

``` javascript
webpack(context, moduleName, [options], callback)
webpack(absoluteModulePath, [options], callback)
```

#### `options`

You can also save this options object in a JSON file and use it with the shell command.

`outputJsonpFunction`

JSONP function used to load chunks

`scriptSrcPrefix`

Path from where chunks are loaded

`outputDirectory`

write files to this directory (absolute path)

`output`

write first chunk to this file

`outputPostfix`

write chunks to files named chunkId plus outputPostfix

`libary`

exports of input file are stored in this variable

`minimize`

minimize outputs with uglify-js

`debug`

prints debug info to output files.

`includeFilenames`

add absolute filenames of input files as comments

`resolve.alias` (object)

replace a module. ex. `{"old-module": "new-module"}`

`resolve.paths` (array)

search paths

`resolve.extensions` (object)

possible extensions for files

default: `["", ".webpack.js", ".web.js", ".js"]`

`resolve.loaders` (array)

extension to loader mappings. ex. `[{test: /\.extension$/, loader: "myloader"}]`

loads files that matches the RegExp to the loader if no other loader set

`resolve.loaderExtensions` (array)

possible extensions for loaders

default: `[".webpack-web-loader.js", ".webpack-loader.js", ".web-loader.js", ".loader.js", "", ".js"]`

`resolve.loaderPostfixes` (array)

possible postfixes for loaders

default: `["-webpack-web-loader", "-webpack-loader", "-web-loader", "-loader", ""]`

`parse.overwrites` (object)

free module variables which are replaced with a module. ex. `{ "$": "jquery" }`

#### `callback`

`function(err, source / stats)`
`source` if `options.output` is not set
else `stats` as json see [example](/sokra/modules-webpack/tree/master/examples/code-splitting)

## Comparison

<table>
 <tr>
  <th>
	Feature
  </th>
  <th>
	sokra/<br/>modules-<br/>webpack
  </th>
  <th>
	medikoo/<br/>modules-<br/>webmake
  </th>
  <th>
	substack/<br/>node-<br/>browserify
  </th>
 </tr>

 <tr>
  <td>
	single bundle
  </td>
  <td>
	yes
  </td>
  <td>
	yes
  </td>
  <td>
	yes
  </td>
 </tr>

 <tr>
  <td>
	multiple bundles, Code Splitting
  </td>
  <td>
	yes
  </td>
  <td>
	no
  </td>
  <td>
	no
  </td>
 </tr>

 <tr>
  <td>
	indirect require
	<code>var r = require; r("./file");</code>
  </td>
  <td>
	in directory
  </td>
  <td>
	include by config option
  </td>
  <td>
	no
  </td>
 </tr>

 <tr>
  <td>
	concat in require
	<code>require("./fi" + "le")</code>
  </td>
  <td>
	yes
  </td>
  <td>
	yes
  </td>
  <td>
	no
  </td>
 </tr>

 <tr>
  <td>
	variables in require (local)
	<code>require("./templates/"+template)</code>
  </td>
  <td>
	yes, complete directory included
  </td>
  <td>
	include by config option
  </td>
  <td>
	no
  </td>
 </tr>

 <tr>
  <td>
	variables in require (global)
	<code>require(moduleName)</code>
  </td>
  <td>
	no
  </td>
  <td>
	include by config option
  </td>
  <td>
	no
  </td>
 </tr>

 <tr>
  <td>
	node buildin libs
	<code>require("http");</code>
  </td>
  <td>
	yes
  </td>
  <td>
	no
  </td>
  <td>
	yes
  </td>
 </tr>

 <tr>
  <td>
	<code>process</code> polyfill
  </td>
  <td>
	yes, on demand
  </td>
  <td>
	no
  </td>
  <td>
	yes, ever
  </td>
 </tr>

 <tr>
  <td>
	<code>module</code> polyfill
  </td>
  <td>
	yes, on demand
  </td>
  <td>
	no
  </td>
  <td>
	no
  </td>
 </tr>

 <tr>
  <td>
	<code>require.resolve</code>
  </td>
  <td>
	no
  </td>
  <td>
	no
  </td>
  <td>
	yes
  </td>
 </tr>

 <tr>
  <td>
	<code>global</code> to <code>window</code> mapping
  </td>
  <td>
	yes
  </td>
  <td>
	no
  </td>
  <td>
	no
  </td>
 </tr>

 <tr>
  <td>
	requirable files
  </td>
  <td>
	filesystem
  </td>
  <td>
	directory scope
  </td>
  <td>
	filesystem
  </td>
 </tr>

 <tr>
  <td>
	different modules with same name
  </td>
  <td>
	yes
  </td>
  <td>
	no
  </td>
  <td>
	yes
  </td>
 </tr>

 <tr>
  <td>
	eliminate duplicate code
  </td>
  <td>
	no
  </td>
  <td>
	no
  </td>
  <td>
	no
  </td>
 </tr>

 <tr>
  <td>
	require JSON
  </td>
  <td>
	yes <em>NEW</em>
  </td>
  <td>
	no
  </td>
  <td>
	no
  </td>
 </tr>

 <tr>
  <td>
	plugins
  </td>
  <td>
	no
  </td>
  <td>
	no
  </td>
  <td>
	yes
  </td>
 </tr>

 <tr>
  <td>
	loaders
  </td>
  <td>
	yes <em>NEW</em>
  </td>
  <td>
	no
  </td>
  <td>
	no
  </td>
 </tr>

 <tr>
  <td>
	compile coffee script
  </td>
  <td>
	yes <em>NEW</em>
  </td>
  <td>
	no
  </td>
  <td>
	yes
  </td>
 </tr>

 <tr>
  <td>
	watch mode
  </td>
  <td>
	no
  </td>
  <td>
	no
  </td>
  <td>
	yes
  </td>
 </tr>

 <tr>
  <td>
	debug mode
  </td>
  <td>
	yes
  </td>
  <td>
	no
  </td>
  <td>
	yes
  </td>
 </tr>

 <tr>
  <td>
	libaries
  </td>
  <td>
	on global obj
  </td>
  <td>
	no
  </td>
  <td>
	requirable
  </td>
 </tr>

 <tr>
  <td>
	browser replacements
  </td>
  <td>
	<code>web_modules</code> and <code>.web.js</code>
  </td>
  <td>
	no
  </td>
  <td>
	by alias config option
  </td>
 </tr>

 <tr>
  <td>
	compiles with (optional) modules missing
  </td>
  <td>
	yes, emit warnings
  </td>
  <td>
	no
  </td>
  <td>
	no
  </td>
 </tr>
</table>


## Tests

You can run the unit tests with `npm test`.

You can run the browser tests:

```
cd test/browsertests
node build
```

and open `test.html` in browser. There must be several OKs in the file, no FAIL and no RED boxes.

## Contribution

You are welcome to contribute by writing issues or pull requests.

You are also welcome to correct any spelling mistakes or any language issues, because my english is not perfect...

## Future plans

* watch mode
* append hash of file to filename, for better caching
* more polyfills for node.js buildin modules, but optional
* require from protocol `require("http://...")`

## License

MIT (http://www.opensource.org/licenses/mit-license.php)