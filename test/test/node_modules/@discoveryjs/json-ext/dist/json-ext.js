(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global.jsonExt = factory());
}(typeof globalThis != 'undefined' ? globalThis : typeof window != 'undefined' ? window : typeof global != 'undefined' ? global : typeof self != 'undefined' ? self : this, (function () {
var exports = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.js
  var src_exports = {};
  __export(src_exports, {
    createStringifyWebStream: () => createStringifyWebStream,
    parseChunked: () => parseChunked,
    parseFromWebStream: () => parseFromWebStream,
    stringifyChunked: () => stringifyChunked,
    stringifyInfo: () => stringifyInfo
  });

  // src/utils.js
  function isIterable(value) {
    return typeof value === "object" && value !== null && (typeof value[Symbol.iterator] === "function" || typeof value[Symbol.asyncIterator] === "function");
  }
  function replaceValue(holder, key, value, replacer) {
    if (value && typeof value.toJSON === "function") {
      value = value.toJSON();
    }
    if (replacer !== null) {
      value = replacer.call(holder, String(key), value);
    }
    switch (typeof value) {
      case "function":
      case "symbol":
        value = void 0;
        break;
      case "object":
        if (value !== null) {
          const cls = value.constructor;
          if (cls === String || cls === Number || cls === Boolean) {
            value = value.valueOf();
          }
        }
        break;
    }
    return value;
  }
  function normalizeReplacer(replacer) {
    if (typeof replacer === "function") {
      return replacer;
    }
    if (Array.isArray(replacer)) {
      const allowlist = new Set(
        replacer.map((item) => {
          const cls = item && item.constructor;
          return cls === String || cls === Number ? String(item) : null;
        }).filter((item) => typeof item === "string")
      );
      return [...allowlist];
    }
    return null;
  }
  function normalizeSpace(space) {
    if (typeof space === "number") {
      if (!Number.isFinite(space) || space < 1) {
        return false;
      }
      return " ".repeat(Math.min(space, 10));
    }
    if (typeof space === "string") {
      return space.slice(0, 10) || false;
    }
    return false;
  }
  function normalizeStringifyOptions(optionsOrReplacer, space) {
    if (optionsOrReplacer === null || Array.isArray(optionsOrReplacer) || typeof optionsOrReplacer !== "object") {
      optionsOrReplacer = {
        replacer: optionsOrReplacer,
        space
      };
    }
    let replacer = normalizeReplacer(optionsOrReplacer.replacer);
    let getKeys = Object.keys;
    if (Array.isArray(replacer)) {
      const allowlist = replacer;
      getKeys = () => allowlist;
      replacer = null;
    }
    return {
      ...optionsOrReplacer,
      replacer,
      getKeys,
      space: normalizeSpace(optionsOrReplacer.space)
    };
  }

  // src/parse-chunked.js
  var STACK_OBJECT = 1;
  var STACK_ARRAY = 2;
  var decoder = new TextDecoder();
  function adjustPosition(error, parser) {
    if (error.name === "SyntaxError" && parser.jsonParseOffset) {
      error.message = error.message.replace(
        /at position (\d+)/,
        (_, pos) => "at position " + (Number(pos) + parser.jsonParseOffset)
      );
    }
    return error;
  }
  function append(array, elements) {
    const initialLength = array.length;
    array.length += elements.length;
    for (let i = 0; i < elements.length; i++) {
      array[initialLength + i] = elements[i];
    }
  }
  async function parseChunked(chunkEmitter) {
    const iterable = typeof chunkEmitter === "function" ? chunkEmitter() : chunkEmitter;
    if (isIterable(iterable)) {
      let parser = new ChunkParser();
      try {
        for await (const chunk of iterable) {
          if (typeof chunk !== "string" && !ArrayBuffer.isView(chunk)) {
            throw new TypeError("Invalid chunk: Expected string, TypedArray or Buffer");
          }
          parser.push(chunk);
        }
        return parser.finish();
      } catch (e) {
        throw adjustPosition(e, parser);
      }
    }
    throw new TypeError(
      "Invalid chunk emitter: Expected an Iterable, AsyncIterable, generator, async generator, or a function returning an Iterable or AsyncIterable"
    );
  }
  var ChunkParser = class {
    constructor() {
      this.value = void 0;
      this.valueStack = null;
      this.stack = new Array(100);
      this.lastFlushDepth = 0;
      this.flushDepth = 0;
      this.stateString = false;
      this.stateStringEscape = false;
      this.pendingByteSeq = null;
      this.pendingChunk = null;
      this.chunkOffset = 0;
      this.jsonParseOffset = 0;
    }
    parseAndAppend(fragment, wrap) {
      if (this.stack[this.lastFlushDepth - 1] === STACK_OBJECT) {
        if (wrap) {
          this.jsonParseOffset--;
          fragment = "{" + fragment + "}";
        }
        Object.assign(this.valueStack.value, JSON.parse(fragment));
      } else {
        if (wrap) {
          this.jsonParseOffset--;
          fragment = "[" + fragment + "]";
        }
        append(this.valueStack.value, JSON.parse(fragment));
      }
    }
    prepareAddition(fragment) {
      const { value } = this.valueStack;
      const expectComma = Array.isArray(value) ? value.length !== 0 : Object.keys(value).length !== 0;
      if (expectComma) {
        if (fragment[0] === ",") {
          this.jsonParseOffset++;
          return fragment.slice(1);
        }
        if (fragment[0] !== "}" && fragment[0] !== "]") {
          this.jsonParseOffset -= 3;
          return "[[]" + fragment;
        }
      }
      return fragment;
    }
    flush(chunk, start, end) {
      let fragment = chunk.slice(start, end);
      this.jsonParseOffset = this.chunkOffset + start;
      if (this.pendingChunk !== null) {
        fragment = this.pendingChunk + fragment;
        this.jsonParseOffset -= this.pendingChunk.length;
        this.pendingChunk = null;
      }
      if (this.flushDepth === this.lastFlushDepth) {
        if (this.flushDepth > 0) {
          this.parseAndAppend(this.prepareAddition(fragment), true);
        } else {
          this.value = JSON.parse(fragment);
          this.valueStack = {
            value: this.value,
            prev: null
          };
        }
      } else if (this.flushDepth > this.lastFlushDepth) {
        for (let i = this.flushDepth - 1; i >= this.lastFlushDepth; i--) {
          fragment += this.stack[i] === STACK_OBJECT ? "}" : "]";
        }
        if (this.lastFlushDepth === 0) {
          this.value = JSON.parse(fragment);
          this.valueStack = {
            value: this.value,
            prev: null
          };
        } else {
          this.parseAndAppend(this.prepareAddition(fragment), true);
        }
        for (let i = this.lastFlushDepth || 1; i < this.flushDepth; i++) {
          let value = this.valueStack.value;
          if (this.stack[i - 1] === STACK_OBJECT) {
            let key;
            for (key in value) ;
            value = value[key];
          } else {
            value = value[value.length - 1];
          }
          this.valueStack = {
            value,
            prev: this.valueStack
          };
        }
      } else {
        fragment = this.prepareAddition(fragment);
        for (let i = this.lastFlushDepth - 1; i >= this.flushDepth; i--) {
          this.jsonParseOffset--;
          fragment = (this.stack[i] === STACK_OBJECT ? "{" : "[") + fragment;
        }
        this.parseAndAppend(fragment, false);
        for (let i = this.lastFlushDepth - 1; i >= this.flushDepth; i--) {
          this.valueStack = this.valueStack.prev;
        }
      }
      this.lastFlushDepth = this.flushDepth;
    }
    push(chunk) {
      if (typeof chunk !== "string") {
        if (this.pendingByteSeq !== null) {
          const origRawChunk = chunk;
          chunk = new Uint8Array(this.pendingByteSeq.length + origRawChunk.length);
          chunk.set(this.pendingByteSeq);
          chunk.set(origRawChunk, this.pendingByteSeq.length);
          this.pendingByteSeq = null;
        }
        if (chunk[chunk.length - 1] > 127) {
          for (let seqLength = 0; seqLength < chunk.length; seqLength++) {
            const byte = chunk[chunk.length - 1 - seqLength];
            if (byte >> 6 === 3) {
              seqLength++;
              if (seqLength !== 4 && byte >> 3 === 30 || seqLength !== 3 && byte >> 4 === 14 || seqLength !== 2 && byte >> 5 === 6) {
                this.pendingByteSeq = chunk.slice(chunk.length - seqLength);
                chunk = chunk.slice(0, -seqLength);
              }
              break;
            }
          }
        }
        chunk = decoder.decode(chunk);
      }
      const chunkLength = chunk.length;
      let lastFlushPoint = 0;
      let flushPoint = 0;
      scan: for (let i = 0; i < chunkLength; i++) {
        if (this.stateString) {
          for (; i < chunkLength; i++) {
            if (this.stateStringEscape) {
              this.stateStringEscape = false;
            } else {
              switch (chunk.charCodeAt(i)) {
                case 34:
                  this.stateString = false;
                  continue scan;
                case 92:
                  this.stateStringEscape = true;
              }
            }
          }
          break;
        }
        switch (chunk.charCodeAt(i)) {
          case 34:
            this.stateString = true;
            this.stateStringEscape = false;
            break;
          case 44:
            flushPoint = i;
            break;
          case 123:
            flushPoint = i + 1;
            this.stack[this.flushDepth++] = STACK_OBJECT;
            break;
          case 91:
            flushPoint = i + 1;
            this.stack[this.flushDepth++] = STACK_ARRAY;
            break;
          case 93:
          /* ] */
          case 125:
            flushPoint = i + 1;
            this.flushDepth--;
            if (this.flushDepth < this.lastFlushDepth) {
              this.flush(chunk, lastFlushPoint, flushPoint);
              lastFlushPoint = flushPoint;
            }
            break;
          case 9:
          /* \t */
          case 10:
          /* \n */
          case 13:
          /* \r */
          case 32:
            if (lastFlushPoint === i) {
              lastFlushPoint++;
            }
            if (flushPoint === i) {
              flushPoint++;
            }
            break;
        }
      }
      if (flushPoint > lastFlushPoint) {
        this.flush(chunk, lastFlushPoint, flushPoint);
      }
      if (flushPoint < chunkLength) {
        if (this.pendingChunk !== null) {
          this.pendingChunk += chunk;
        } else {
          this.pendingChunk = chunk.slice(flushPoint, chunkLength);
        }
      }
      this.chunkOffset += chunkLength;
    }
    finish() {
      if (this.pendingChunk !== null) {
        this.flush("", 0, 0);
        this.pendingChunk = null;
      }
      return this.value;
    }
  };

  // src/stringify-chunked.js
  function encodeString(value) {
    if (/[^\x20\x21\x23-\x5B\x5D-\uD799]/.test(value)) {
      return JSON.stringify(value);
    }
    return '"' + value + '"';
  }
  function* stringifyChunked(value, ...args) {
    const { replacer, getKeys, space, ...options } = normalizeStringifyOptions(...args);
    const highWaterMark = Number(options.highWaterMark) || 16384;
    const keyStrings = /* @__PURE__ */ new Map();
    const stack = [];
    const rootValue = { "": value };
    let prevState = null;
    let state = () => printEntry("", value);
    let stateValue = rootValue;
    let stateEmpty = true;
    let stateKeys = [""];
    let stateIndex = 0;
    let buffer = "";
    while (true) {
      state();
      if (buffer.length >= highWaterMark || prevState === null) {
        yield buffer;
        buffer = "";
        if (prevState === null) {
          break;
        }
      }
    }
    function printObject() {
      if (stateIndex === 0) {
        stateKeys = getKeys(stateValue);
        buffer += "{";
      }
      if (stateIndex === stateKeys.length) {
        buffer += space && !stateEmpty ? `
${space.repeat(stack.length - 1)}}` : "}";
        popState();
        return;
      }
      const key = stateKeys[stateIndex++];
      printEntry(key, stateValue[key]);
    }
    function printArray() {
      if (stateIndex === 0) {
        buffer += "[";
      }
      if (stateIndex === stateValue.length) {
        buffer += space && !stateEmpty ? `
${space.repeat(stack.length - 1)}]` : "]";
        popState();
        return;
      }
      printEntry(stateIndex, stateValue[stateIndex++]);
    }
    function printEntryPrelude(key) {
      if (stateEmpty) {
        stateEmpty = false;
      } else {
        buffer += ",";
      }
      if (space && prevState !== null) {
        buffer += `
${space.repeat(stack.length)}`;
      }
      if (state === printObject) {
        let keyString = keyStrings.get(key);
        if (keyString === void 0) {
          keyStrings.set(key, keyString = encodeString(key) + (space ? ": " : ":"));
        }
        buffer += keyString;
      }
    }
    function printEntry(key, value2) {
      value2 = replaceValue(stateValue, key, value2, replacer);
      if (value2 === null || typeof value2 !== "object") {
        if (state !== printObject || value2 !== void 0) {
          printEntryPrelude(key);
          pushPrimitive(value2);
        }
      } else {
        if (stack.includes(value2)) {
          throw new TypeError("Converting circular structure to JSON");
        }
        printEntryPrelude(key);
        stack.push(value2);
        pushState();
        state = Array.isArray(value2) ? printArray : printObject;
        stateValue = value2;
        stateEmpty = true;
        stateIndex = 0;
      }
    }
    function pushPrimitive(value2) {
      switch (typeof value2) {
        case "string":
          buffer += encodeString(value2);
          break;
        case "number":
          buffer += Number.isFinite(value2) ? String(value2) : "null";
          break;
        case "boolean":
          buffer += value2 ? "true" : "false";
          break;
        case "undefined":
        case "object":
          buffer += "null";
          break;
        default:
          throw new TypeError(`Do not know how to serialize a ${value2.constructor?.name || typeof value2}`);
      }
    }
    function pushState() {
      prevState = {
        keys: stateKeys,
        index: stateIndex,
        prev: prevState
      };
    }
    function popState() {
      stack.pop();
      const value2 = stack.length > 0 ? stack[stack.length - 1] : rootValue;
      state = Array.isArray(value2) ? printArray : printObject;
      stateValue = value2;
      stateEmpty = false;
      stateKeys = prevState.keys;
      stateIndex = prevState.index;
      prevState = prevState.prev;
    }
  }

  // src/stringify-info.js
  var hasOwn = typeof Object.hasOwn === "function" ? Object.hasOwn : (object, key) => Object.hasOwnProperty.call(object, key);
  var escapableCharCodeSubstitution = {
    // JSON Single Character Escape Sequences
    8: "\\b",
    9: "\\t",
    10: "\\n",
    12: "\\f",
    13: "\\r",
    34: '\\"',
    92: "\\\\"
  };
  var charLength2048 = Uint8Array.from({ length: 2048 }, (_, code) => {
    if (hasOwn(escapableCharCodeSubstitution, code)) {
      return 2;
    }
    if (code < 32) {
      return 6;
    }
    return code < 128 ? 1 : 2;
  });
  function isLeadingSurrogate(code) {
    return code >= 55296 && code <= 56319;
  }
  function isTrailingSurrogate(code) {
    return code >= 56320 && code <= 57343;
  }
  function stringLength(str) {
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
        len += 6;
        prevLeadingSurrogate = true;
        continue;
      } else if (isTrailingSurrogate(code)) {
        len = prevLeadingSurrogate ? len - 2 : len + 6;
      } else {
        len += 3;
      }
      prevLeadingSurrogate = false;
    }
    return len + 2;
  }
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
        return len + (num >= 1e8 ? 9 : num >= 1e7 ? 8 : 7);
      }
      return len + (num >= 1e5 ? 6 : 5);
    }
    return len + (num >= 100 ? num >= 1e3 ? 4 : 3 : num >= 10 ? 2 : 1);
  }
  function primitiveLength(value) {
    switch (typeof value) {
      case "string":
        return stringLength(value);
      case "number":
        return Number.isFinite(value) ? Number.isInteger(value) ? intLength(value) : String(value).length : 4;
      case "boolean":
        return value ? 4 : 5;
      case "undefined":
      case "object":
        return 4;
      /* null */
      default:
        return 0;
    }
  }
  function stringifyInfo(value, ...args) {
    const { replacer, getKeys, ...options } = normalizeStringifyOptions(...args);
    const continueOnCircular = Boolean(options.continueOnCircular);
    const space = options.space?.length || 0;
    const keysLength = /* @__PURE__ */ new Map();
    const visited = /* @__PURE__ */ new Map();
    const circular = /* @__PURE__ */ new Set();
    const stack = [];
    const root = { "": value };
    let stop = false;
    let bytes = 0;
    let spaceBytes = 0;
    let objects = 0;
    walk(root, "", value);
    if (bytes === 0) {
      bytes += 9;
    }
    return {
      bytes: isNaN(bytes) ? Infinity : bytes + spaceBytes,
      spaceBytes: space > 0 && isNaN(bytes) ? Infinity : spaceBytes,
      circular: [...circular]
    };
    function walk(holder, key, value2) {
      if (stop) {
        return;
      }
      value2 = replaceValue(holder, key, value2, replacer);
      if (value2 === null || typeof value2 !== "object") {
        if (value2 !== void 0 || Array.isArray(holder)) {
          bytes += primitiveLength(value2);
        }
      } else {
        if (stack.includes(value2)) {
          circular.add(value2);
          bytes += 4;
          if (!continueOnCircular) {
            stop = true;
          }
          return;
        }
        if (visited.has(value2)) {
          bytes += visited.get(value2);
          return;
        }
        objects++;
        const prevObjects = objects;
        const valueBytes = bytes;
        let valueLength = 0;
        stack.push(value2);
        if (Array.isArray(value2)) {
          valueLength = value2.length;
          for (let i = 0; i < valueLength; i++) {
            walk(value2, i, value2[i]);
          }
        } else {
          let prevLength = bytes;
          for (const key2 of getKeys(value2)) {
            walk(value2, key2, value2[key2]);
            if (prevLength !== bytes) {
              let keyLen = keysLength.get(key2);
              if (keyLen === void 0) {
                keysLength.set(key2, keyLen = stringLength(key2) + 1);
              }
              bytes += keyLen;
              valueLength++;
              prevLength = bytes;
            }
          }
        }
        bytes += valueLength === 0 ? 2 : 1 + valueLength;
        if (space > 0 && valueLength > 0) {
          spaceBytes += // a space between ":" and a value for each object entry
          (Array.isArray(value2) ? 0 : valueLength) + // the formula results from folding the following components:
          // - for each key-value or element: ident + newline
          //   (1 + stack.length * space) * valueLength
          // - ident (one space less) before "}" or "]" + newline
          //   (stack.length - 1) * space + 1
          (1 + stack.length * space) * (valueLength + 1) - space;
        }
        stack.pop();
        if (prevObjects !== objects) {
          visited.set(value2, bytes - valueBytes);
        }
      }
    }
  }

  // src/web-streams.js
  function parseFromWebStream(stream) {
    return parseChunked(isIterable(stream) ? stream : async function* () {
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
  function createStringifyWebStream(value, replacer, space) {
    if (typeof ReadableStream.from === "function") {
      return ReadableStream.from(stringifyChunked(value, replacer, space));
    }
    return new ReadableStream({
      start() {
        this.generator = stringifyChunked(value, replacer, space);
      },
      pull(controller) {
        const { value: value2, done } = this.generator.next();
        if (done) {
          controller.close();
        } else {
          controller.enqueue(value2);
        }
      },
      cancel() {
        this.generator = null;
      }
    });
  }
  return __toCommonJS(src_exports);
})();

  return exports;
})));
