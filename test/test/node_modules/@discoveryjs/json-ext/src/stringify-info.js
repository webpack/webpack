import { normalizeStringifyOptions, replaceValue } from './utils.js';

const hasOwn = typeof Object.hasOwn === 'function'
    ? Object.hasOwn
    : (object, key) => Object.hasOwnProperty.call(object, key);

// https://tc39.es/ecma262/#table-json-single-character-escapes
const escapableCharCodeSubstitution = { // JSON Single Character Escape Sequences
    0x08: '\\b',
    0x09: '\\t',
    0x0a: '\\n',
    0x0c: '\\f',
    0x0d: '\\r',
    0x22: '\\\"',
    0x5c: '\\\\'
};

const charLength2048 = Uint8Array.from({ length: 2048 }, (_, code) => {
    if (hasOwn(escapableCharCodeSubstitution, code)) {
        return 2; // \X
    }

    if (code < 0x20) {
        return 6; // \uXXXX
    }

    return code < 128 ? 1 : 2; // UTF8 bytes
});

function isLeadingSurrogate(code) {
    return code >= 0xD800 && code <= 0xDBFF;
}

function isTrailingSurrogate(code) {
    return code >= 0xDC00 && code <= 0xDFFF;
}

function stringLength(str) {
    // Fast path to compute length when a string contains only characters encoded as single bytes
    if (!/[^\x20\x21\x23-\x5B\x5D-\x7F]/.test(str)) {
        return str.length + 2;
    }

    let len = 0;
    let prevLeadingSurrogate = false;

    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);

        if (code < 2048) {
            len += charLength2048[code];
        } else if (isLeadingSurrogate(code)) {
            len += 6; // \uXXXX since no pair with trailing surrogate yet
            prevLeadingSurrogate = true;
            continue;
        } else if (isTrailingSurrogate(code)) {
            len = prevLeadingSurrogate
                ? len - 2  // surrogate pair (4 bytes), since we calculate prev leading surrogate as 6 bytes, substruct 2 bytes
                : len + 6; // \uXXXX
        } else {
            len += 3; // code >= 2048 is 3 bytes length for UTF8
        }

        prevLeadingSurrogate = false;
    }

    return len + 2; // +2 for quotes
}

// avoid producing a string from a number
function intLength(num) {
    let len = 0;

    if (num < 0) {
        len = 1;
        num = -num;
    }

    if (num >= 1e9) {
        len += 9;
        num = (num - num % 1e9) / 1e9;
    }

    if (num >= 1e4) {
        if (num >= 1e6) {
            return len + (num >= 1e8
                ? 9
                : num >= 1e7 ? 8 : 7
            );
        }
        return len + (num >= 1e5 ? 6 : 5);
    }

    return len + (num >= 1e2
        ? num >= 1e3 ? 4 : 3
        : num >= 10 ? 2 : 1
    );
};

function primitiveLength(value) {
    switch (typeof value) {
        case 'string':
            return stringLength(value);

        case 'number':
            return Number.isFinite(value)
                ? Number.isInteger(value)
                    ? intLength(value)
                    : String(value).length
                : 4 /* null */;

        case 'boolean':
            return value ? 4 /* true */ : 5 /* false */;

        case 'undefined':
        case 'object':
            return 4; /* null */

        default:
            return 0;
    }
}

export function stringifyInfo(value, ...args) {
    const { replacer, getKeys, ...options } = normalizeStringifyOptions(...args);
    const continueOnCircular = Boolean(options.continueOnCircular);
    const space = options.space?.length || 0;

    const keysLength = new Map();
    const visited = new Map();
    const circular = new Set();
    const stack = [];
    const root = { '': value };
    let stop = false;
    let bytes = 0;
    let spaceBytes = 0;
    let objects = 0;

    walk(root, '', value);

    // when value is undefined or replaced for undefined
    if (bytes === 0) {
        bytes += 9; // FIXME: that's the length of undefined, should we normalize behaviour to convert it to null?
    }

    return {
        bytes: isNaN(bytes) ? Infinity : bytes + spaceBytes,
        spaceBytes: space > 0 && isNaN(bytes) ? Infinity : spaceBytes,
        circular: [...circular]
    };

    function walk(holder, key, value) {
        if (stop) {
            return;
        }

        value = replaceValue(holder, key, value, replacer);

        if (value === null || typeof value !== 'object') {
            // primitive
            if (value !== undefined || Array.isArray(holder)) {
                bytes += primitiveLength(value);
            }
        } else {
            // check for circular references
            if (stack.includes(value)) {
                circular.add(value);
                bytes += 4; // treat as null

                if (!continueOnCircular) {
                    stop = true;
                }

                return;
            }

            // Using 'visited' allows avoiding hang-ups in cases of highly interconnected object graphs;
            // for example, a list of git commits with references to parents can lead to N^2 complexity for traversal,
            // and N when 'visited' is used
            if (visited.has(value)) {
                bytes += visited.get(value);

                return;
            }

            objects++;

            const prevObjects = objects;
            const valueBytes = bytes;
            let valueLength = 0;

            stack.push(value);

            if (Array.isArray(value)) {
                // array
                valueLength = value.length;

                for (let i = 0; i < valueLength; i++) {
                    walk(value, i, value[i]);
                }
            } else {
                // object
                let prevLength = bytes;

                for (const key of getKeys(value)) {
                    walk(value, key, value[key]);

                    if (prevLength !== bytes) {
                        let keyLen = keysLength.get(key);

                        if (keyLen === undefined) {
                            keysLength.set(key, keyLen = stringLength(key) + 1); // "key":
                        }

                        // value is printed
                        bytes += keyLen;
                        valueLength++;
                        prevLength = bytes;
                    }
                }
            }

            bytes += valueLength === 0
                ? 2 // {} or []
                : 1 + valueLength; // {} or [] + commas

            if (space > 0 && valueLength > 0) {
                spaceBytes +=
                    // a space between ":" and a value for each object entry
                    (Array.isArray(value) ? 0 : valueLength) +
                    // the formula results from folding the following components:
                    // - for each key-value or element: ident + newline
                    //   (1 + stack.length * space) * valueLength
                    // - ident (one space less) before "}" or "]" + newline
                    //   (stack.length - 1) * space + 1
                    (1 + stack.length * space) * (valueLength + 1) - space;
            }

            stack.pop();

            // add to 'visited' only objects that contain nested objects
            if (prevObjects !== objects) {
                visited.set(value, bytes - valueBytes);
            }
        }
    }
};
