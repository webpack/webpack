# json-ext

[![NPM version](https://img.shields.io/npm/v/@discoveryjs/json-ext.svg)](https://www.npmjs.com/package/@discoveryjs/json-ext)
[![Build Status](https://github.com/discoveryjs/json-ext/actions/workflows/ci.yml/badge.svg)](https://github.com/discoveryjs/json-ext/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/discoveryjs/json-ext/badge.svg?branch=master)](https://coveralls.io/github/discoveryjs/json-ext)
[![NPM Downloads](https://img.shields.io/npm/dm/@discoveryjs/json-ext.svg)](https://www.npmjs.com/package/@discoveryjs/json-ext)

A set of utilities designed to extend JSON's capabilities, especially for handling large JSON data (over 100MB) efficiently:

- [parseChunked()](#parsechunked) – Parses JSON incrementally; similar to [`JSON.parse()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse), but processing JSON data in chunks.
- [stringifyChunked()](#stringifychunked) – Converts JavaScript objects to JSON incrementally; similar to [`JSON.stringify()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify), but returns a generator that yields JSON strings in parts.
- [stringifyInfo()](#stringifyinfo) – Estimates the size of the `JSON.stringify()` result and identifies circular references without generating the JSON.
- [parseFromWebStream()](#parsefromwebstream) – A helper function to parse JSON chunks directly from a Web Stream.
- [createStringifyWebStream()](#createstringifywebstream) – A helper function to generate JSON data as a Web Stream.

### Key Features

- Optimized to handle large JSON data with minimal resource usage (see [benchmarks](./benchmarks/README.md))
- Works seamlessly with browsers, Node.js, Deno, and Bun
- Supports both Node.js and Web streams
- Available in both ESM and CommonJS
- TypeScript typings included
- No external dependencies
- Compact size: 9.4Kb (minified), 3.8Kb (min+gzip)

### Why json-ext?

- **Handles large JSON files**: Overcomes the limitations of V8 for strings larger than ~500MB, enabling the processing of huge JSON data.
- **Prevents main thread blocking**: Distributes parsing and stringifying over time, ensuring the main thread remains responsive during heavy JSON operations.
- **Reduces memory usage**: Traditional `JSON.parse()` and `JSON.stringify()` require loading entire data into memory, leading to high memory consumption and increased garbage collection pressure. `parseChunked()` and `stringifyChunked()` process data incrementally, optimizing memory usage.
- **Size estimation**: `stringifyInfo()` allows estimating the size of resulting JSON before generating it, enabling better decision-making for JSON generation strategies.

## Install

```bash
npm install @discoveryjs/json-ext
```

## API

### parseChunked()

Functions like [`JSON.parse()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse), iterating over chunks to reconstruct the result object, and returns a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise).

> Note: `reviver` parameter is not supported yet.

```ts
function parseChunked(input: Iterable<Chunk> | AsyncIterable<Chunk>): Promise<any>;
function parseChunked(input: () => (Iterable<Chunk> | AsyncIterable<Chunk>)): Promise<any>;

type Chunk = string | Buffer | Uint8Array;
```

[Benchmark](https://github.com/discoveryjs/json-ext/tree/master/benchmarks#parse-chunked)

Usage:

```js
import { parseChunked } from '@discoveryjs/json-ext';

const data = await parseChunked(chunkEmitter);
```

Parameter `chunkEmitter` can be an iterable or async iterable that iterates over chunks, or a function returning such a value. A chunk can be a `string`, `Uint8Array`, or Node.js `Buffer`.

Examples:

- Generator:
    ```js
    parseChunked(function*() {
        yield '{ "hello":';
        yield Buffer.from(' "wor'); // Node.js only
        yield new TextEncoder().encode('ld" }'); // returns Uint8Array
    });
    ```
- Async generator:
    ```js
    parseChunked(async function*() {
        for await (const chunk of someAsyncSource) {
            yield chunk;
        }
    });
    ```
- Array:
    ```js
    parseChunked(['{ "hello":', ' "world"}'])
    ```
- Function returning iterable:
    ```js
    parseChunked(() => ['{ "hello":', ' "world"}'])
    ```
- Node.js [`Readable`](https://nodejs.org/dist/latest-v14.x/docs/api/stream.html#stream_readable_streams) stream:
    ```js
    import fs from 'node:fs';

    parseChunked(fs.createReadStream('path/to/file.json'))
    ```
- Web stream (e.g., using [fetch()](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)):
    > Note: Iterability for Web streams was added later in the Web platform, not all environments support it. Consider using `parseFromWebStream()` for broader compatibility.
    ```js
    const response = await fetch('https://example.com/data.json');
    const data = await parseChunked(response.body); // body is ReadableStream
    ```

### stringifyChunked()

Functions like [`JSON.stringify()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify), but returns a generator yielding strings instead of a single string.

> Note: Returns `"null"` when `JSON.stringify()` returns `undefined` (since a chunk cannot be `undefined`).

```ts
function stringifyChunked(value: any, replacer?: Replacer, space?: Space): Generator<string, void, unknown>;
function stringifyChunked(value: any, options: StringifyOptions): Generator<string, void, unknown>;

type Replacer =
    | ((this: any, key: string, value: any) => any)
    | (string | number)[]
    | null;
type Space = string | number | null;
type StringifyOptions = {
    replacer?: Replacer;
    space?: Space;
    highWaterMark?: number;
};
```

[Benchmark](https://github.com/discoveryjs/json-ext/tree/master/benchmarks#stream-stringifying)

Usage:

- Getting an array of chunks:
    ```js
    const chunks = [...stringifyChunked(data)];
    ```
- Iterating over chunks:
    ```js
    for (const chunk of stringifyChunked(data)) {
        console.log(chunk);
    }
    ```
- Specifying the minimum size of a chunk with `highWaterMark` option:
    ```js
    const data = [1, "hello world", 42];

    console.log([...stringifyChunked(data)]); // default 16kB
    // ['[1,"hello world",42]']

    console.log([...stringifyChunked(data, { highWaterMark: 16 })]);
    // ['[1,"hello world"', ',42]']

    console.log([...stringifyChunked(data, { highWaterMark: 1 })]);
    // ['[1', ',"hello world"', ',42', ']']
    ```
- Streaming into a stream with a `Promise` (modern Node.js):
    ```js
    import { pipeline } from 'node:stream/promises';
    import fs from 'node:fs';

    await pipeline(
        stringifyChunked(data),
        fs.createWriteStream('path/to/file.json')
    );
    ```
- Wrapping into a `Promise` streaming into a stream (legacy Node.js):
    ```js
    import { Readable } from 'node:stream';

    new Promise((resolve, reject) => {
        Readable.from(stringifyChunked(data))
            .on('error', reject)
            .pipe(stream)
            .on('error', reject)
            .on('finish', resolve);
    });
    ```
- Writing into a file synchronously:
    > Note: Slower than `JSON.stringify()` but uses much less heap space and has no limitation on string length
    ```js
    import fs from 'node:fs';

    const fd = fs.openSync('output.json', 'w');

    for (const chunk of stringifyChunked(data)) {
        fs.writeFileSync(fd, chunk);
    }

    fs.closeSync(fd);
    ```
- Using with fetch (JSON streaming):
    > Note: This feature has limited support in browsers, see [Streaming requests with the fetch API](https://developer.chrome.com/docs/capabilities/web-apis/fetch-streaming-requests)

    > Note: `ReadableStream.from()` has limited [support in browsers](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/from_static), use [`createStringifyWebStream()`](#createstringifywebstream) instead.
    ```js
    fetch('http://example.com', {
        method: 'POST',
        duplex: 'half',
        body: ReadableStream.from(stringifyChunked(data))
    });
    ```
- Wrapping into `ReadableStream`:
    > Note: Use `ReadableStream.from()` or [`createStringifyWebStream()`](#createstringifywebstream) when no extra logic is needed
    ```js
    new ReadableStream({
        start() {
            this.generator = stringifyChunked(data);
        },
        pull(controller) {
            const { value, done } = this.generator.next();

            if (done) {
                controller.close();
            } else {
                controller.enqueue(value);
            }
        },
        cancel() {
            this.generator = null;
        }
    });
    ```

### stringifyInfo()

```ts
export function stringifyInfo(value: any, replacer?: Replacer, space?: Space): StringifyInfoResult;
export function stringifyInfo(value: any, options?: StringifyInfoOptions): StringifyInfoResult;

type StringifyInfoOptions = {
    replacer?: Replacer;
    space?: Space;
    continueOnCircular?: boolean;
}
type StringifyInfoResult = {
    bytes: number;      // size of JSON in bytes
    spaceBytes: number; // size of white spaces in bytes (when space option used)
    circular: object[]; // list of circular references
};
```

Functions like [`JSON.stringify()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify), but returns an object with the expected overall size of the stringify operation and a list of circular references.

Example:

```js
import { stringifyInfo } from '@discoveryjs/json-ext';

console.log(stringifyInfo({ test: true }, null, 4));
// {
//   bytes: 20,     // Buffer.byteLength('{\n    "test": true\n}')
//   spaceBytes: 7,
//   circular: []    
// }
```

#### Options

##### continueOnCircular

Type: `Boolean`  
Default: `false`

Determines whether to continue collecting info for a value when a circular reference is found. Setting this option to `true` allows finding all circular references.

### parseFromWebStream()

A helper function to consume JSON from a Web Stream. You can use `parseChunked(stream)` instead, but `@@asyncIterator` on `ReadableStream` has limited support in browsers (see [ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) compatibility table).

```js
import { parseFromWebStream } from '@discoveryjs/json-ext';

const data = await parseFromWebStream(readableStream);
// equivalent to (when ReadableStream[@@asyncIterator] is supported):
// await parseChunked(readableStream);
```

### createStringifyWebStream()

A helper function to convert `stringifyChunked()` into a `ReadableStream` (Web Stream). You can use `ReadableStream.from()` instead, but this method has limited support in browsers (see [ReadableStream.from()](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/from_static) compatibility table).

```js
import { createStringifyWebStream } from '@discoveryjs/json-ext';

createStringifyWebStream({ test: true });
// equivalent to (when ReadableStream.from() is supported):
// ReadableStream.from(stringifyChunked({ test: true }))
```

## License

MIT
