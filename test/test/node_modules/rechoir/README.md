<p align="center">
  <a href="http://gulpjs.com">
    <img height="257" width="114" src="https://raw.githubusercontent.com/gulpjs/artwork/master/gulp-2x.png">
  </a>
</p>

# rechoir

[![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url] [![Build Status][ci-image]][ci-url] [![Coveralls Status][coveralls-image]][coveralls-url]

Prepare a node environment to require files with different extensions.

## What is it?

This module, in conjunction with [interpret]-like objects, can register any filetype the npm ecosystem has a module loader for. This library is a dependency of [liftoff].

**Note:** While `rechoir` will automatically load and register transpilers like `coffee-script`, you must provide a local installation. The transpilers are **not** bundled with this module.

## Usage

```js
const config = require('interpret').extensions;
const rechoir = require('rechoir');
rechoir.prepare(config, './test/fixtures/test.coffee');
rechoir.prepare(config, './test/fixtures/test.csv');
rechoir.prepare(config, './test/fixtures/test.toml');

console.log(require('./test/fixtures/test.coffee'));
console.log(require('./test/fixtures/test.csv'));
console.log(require('./test/fixtures/test.toml'));
```

## API

### `prepare(config, filepath, [cwd], [noThrow])`

Look for a module loader associated with the provided file and attempt require it. If necessary, run any setup required to inject it into [require.extensions].

`config` An [interpret]-like configuration object.

`filepath` A file whose type you'd like to register a module loader for.

`cwd` An optional path to start searching for the module required to load the requested file. Defaults to the directory of `filepath`.

`noThrow` An optional boolean indicating if the method should avoid throwing.

If calling this method is successful (e.g. it doesn't throw), you can now require files of the type you requested natively.

An error with a `failures` property will be thrown if the module loader(s) configured for a given extension cannot be registered.

If a loader is already registered, this will simply return `true`.

## License

MIT

<!-- prettier-ignore-start -->
[downloads-image]: https://img.shields.io/npm/dm/rechoir.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/rechoir
[npm-image]: https://img.shields.io/npm/v/rechoir.svg?style=flat-square

[ci-url]: https://github.com/gulpjs/rechoir/actions?query=workflow:dev
[ci-image]: https://img.shields.io/github/workflow/status/gulpjs/rechoir/dev?style=flat-square

[coveralls-url]: https://coveralls.io/r/gulpjs/rechoir
[coveralls-image]: https://img.shields.io/coveralls/gulpjs/rechoir/master.svg
<!-- prettier-ignore-end -->

<!-- prettier-ignore-start -->
[interpret]: https://github.com/gulpjs/interpret
[require.extensions]: https://nodejs.org/api/modules.html#modules_require_extensions
[liftoff]: https://github.com/js-cli/js-liftoff
<!-- prettier-ignore-end -->
