/* eslint-env browser */
import { parseChunked } from './parse-chunked.js';
import { stringifyChunked } from './stringify-chunked.js';
import { isIterable } from './utils.js';

export function parseFromWebStream(stream) {
    // 2024/6/17: currently, an @@asyncIterator on a ReadableStream is not widely supported,
    // therefore use a fallback using a reader
    // https://caniuse.com/mdn-api_readablestream_--asynciterator
    return parseChunked(isIterable(stream) ? stream : async function*() {
        const reader = stream.getReader();

        try {
            while (true) {
                const { value, done } = await reader.read();

                if (done) {
                    break;
                }

                yield value;
            }
        } finally {
            reader.releaseLock();
        }
    });
}

export function createStringifyWebStream(value, replacer, space) {
    // 2024/6/17: the ReadableStream.from() static method is supported
    // in Node.js 20.6+ and Firefox only
    if (typeof ReadableStream.from === 'function') {
        return ReadableStream.from(stringifyChunked(value, replacer, space));
    }

    // emulate ReadableStream.from()
    return new ReadableStream({
        start() {
            this.generator = stringifyChunked(value, replacer, space);
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
};
