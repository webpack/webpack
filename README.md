# modules-webpack

## Goal

As developer you want to reuse existing code.
As with node.js and web all file are already in the same language, but it is extra work to use your code with the node.js module system and the browser.
The goal of `webpack` is to bundle CommonJs modules into javascript files which can be loaded by `<script>`-tags.
Simply concating all required files has a disadvantage: many code to download (and execute) on page load.
Therefore `webpack` uses the `require.ensure` function ([CommonJs/Modules/Async/A](http://wiki.commonjs.org/wiki/Modules/Async/A)) to split your code automatically into multiple bundles which are loaded on demand.
This happens mostly transparent to the developer with a single function call. Dependencies are resolved for you.
The result is a smaller inital code download which results in faster page load.

**TL;DR**

* bundle CommonJs modules for browser
* reuse server-side code (node.js) on client-side
* create multiple files which are loaded on demand
* dependencies managed for you
* faster page load in big webapps

## Example

``` javascript
// a.js
var b = require("./b");
b.stuff("It works");

// b.js
exports.stuff = function(text) {
	console.log(text);
}
```

are compiled to

``` javascript
(/* small webpack header */)
({
0: function(module, exports, require) {

	var b = require(1);
	b.stuff("It works");

},
1: function(module, exports, require) {

	exports.stuff = function(text) {
		console.log(text);
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
- code of module a and dependencies
- code of module b and dependencies

File 2: 1.web.js
- code of module c and dependencies (but code is not used)
- code of module d and dependencies
```

See [details](modules-webpack/tree/master/example) for exact output.

## Browser replacements

Somethings it happens that browsers require other code than node.js do.
`webpack` allow module developers to specify replacements which are used in the compile process of `webpack`.

Modules in `web_modules` replace modules in `node_modules`.
`filename.web.js` replaces `filename.js` when required without file extention.

TODO specify replacements in options

## Limitations

### `require`-function

As dependencies are resolved before running:
* `require` should not be overwritten
* `require` should not be called indirect as `var r = require; r("./a");`
* arguments of `require` should be literals. `"./abc" + "/def"` is allowed to support long lines.
* `require.ensure` has the same limitations as `require`
* the function passed to `require.ensure` should be inlined in the call.

TODO allow variables passing to `require` like `require("./templates/" + mytemplate)`
(this will cause all modules matching this pattern to be included in addition to a mapping table)

### node.js specific modules

As node.js specific modules like `fs` will not work in browser they are not included and cause an error.
You should replace them be own modules if your use them.

```
web_modules
  fs
  path
  ...
```

## Usage

### Shell

`webpack` offers a command line interface:

after `npm install webpack -g` you can use the `webpack` command

if invoked without arguments it prints a usage:

```
Usage: webpack <options> <input> <output>

Options:
  --single             Disable Code Splitting                 [boolean]  [default: false]
  --min                Minimize it with uglifyjs              [boolean]  [default: false]
  --filenames          Output Filenames Into File             [boolean]  [default: false]
  --options            Options JSON File                      [string]
  --script-src-prefix  Path Prefix For JavaScript Loading     [string]
  --libary             Stores the exports into this variable  [string]
```

### Programmatically Usage

``` javascript
webpack(context, moduleName, [options], callback)
webpack(absoluteModulePath, [options], callback)
```

#### `options`

you can save this options object in a JSON file and use it with the shell command.

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

`includeFilenames`
add absolute filenames of input files as comments

#### `callback`
`function(err, source / stats)`
`source` if `options.output` is not set
else `stats` as json see [example](/modules-webpack/tree/master/example)

## medikoo/modules-webmake

`webpack` as originally intended as fork for `webmake` for @medikoo so it shared several ideas with it.
So big credit goes to medikoo.

However `webpack` has big differences:

`webpack` replaces module names and paths with numbers. `webmake` don't do that and do resolves requires on client-side.
This design of `webmake` wes intended to support variables as arguments to require calls.
`webpack` resolves requires in compile time and have no resolve code on client side. This results in smaller bundles.
Variables as argments will be handled different and with more limitations.

Another limitation in `webmake` which are based on the previous one is that modules must be in the current package scope.
In `webpack` this is not a restriction.

The design of `webmake` causes all modules with the same name to overlap. This can be problematic if different submodules rely on specific versions of the same module. The behaivior also differs from the behaivior of node.js, because node.js installs a module for each instance in submodules and `webmake` cause them the merge into a single module which is only installed once. In `webpack` this is not the case. Different versions do not overlap and modules are installed multiple times. But in `webpack` this can (currently) cause duplicate code if a module is used in multiple modules. I want to face this issue (TODO).

`webmake` do (currently) not support Code Splitting.

## Tests

You can run the unit tests which `node_modules/.bin/vows`.

You can run the browser tests:

```
cd test/browsertests
node build
```

and open `test.html` in browser. There must be several OKs in the file and no FAIL.

TODO more tests

## Contribution

You are welcome to contribute by writing issues or pull requests.

You are also welcome to correct any spelling mistakes or any language issues, because my english is not so good...

## License

MIT