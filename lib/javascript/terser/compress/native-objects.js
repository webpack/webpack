// Vendored from terser v5.51.2, BSD-2-Clause:
// https://github.com/terser/terser/blob/v5.51.2/lib/compress/native-objects.js
// Held to terser's output rather than to webpack's types.
// @ts-nocheck

/***********************************************************************

  A JavaScript tokenizer / parser / beautifier / compressor.
  https://github.com/mishoo/UglifyJS2

  -------------------------------- (C) ---------------------------------

                           Author: Mihai Bazon
                         <mihai.bazon@gmail.com>
                       http://mihai.bazon.net/blog

  Distributed under the BSD license:

    Copyright 2012 (c) Mihai Bazon <mihai.bazon@gmail.com>

    Redistribution and use in source and binary forms, with or without
    modification, are permitted provided that the following conditions
    are met:

        * Redistributions of source code must retain the above
          copyright notice, this list of conditions and the following
          disclaimer.

        * Redistributions in binary form must reproduce the above
          copyright notice, this list of conditions and the following
          disclaimer in the documentation and/or other materials
          provided with the distribution.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDER “AS IS” AND ANY
    EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
    IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
    PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE
    LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY,
    OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
    PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
    PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
    THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
    TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF
    THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
    SUCH DAMAGE.

 ***********************************************************************/

"use strict";

const { AST_Array, AST_Dot, AST_New, AST_Number, AST_SymbolRef } = require("../ast.js");
const { makePredicate } = require("../utils/index.js");

// Lists of native methods, useful for `unsafe` option which assumes they exist.
// Note: Lots of methods and functions are missing here, in case they aren't pure
// or not available in all JS environments.

const make_nested_lookup = (feature_callback) => (compressor) => {
    const obj = feature_callback(feature_variables(compressor));

    const out = new Map();
    for (var key of Object.keys(obj)) {
        if (obj[key]) {
            out.set(key, makePredicate(remove_false(obj[key])));
        }
    }

    const does_have = (global_name, fname) => {
        const inner_map = out.get(global_name);
        return inner_map != null && inner_map.has(fname);
    };
    return does_have;
};

const make_lookup = (feature_callback) => (compressor) => {
    const obj = feature_callback(feature_variables(compressor));

    const predicate = makePredicate(remove_false(obj));
    const does_have = (global_name) => {
        return predicate.has(global_name);
    };
    return does_have;
};

function remove_false(arr) {
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] === false) {
            arr.splice(i, 1);
            i--;
        }
    }
    return arr;
}

/** Generate the object with arguments seen below */
function feature_variables(compressor) {
    return {
        sloppy: compressor.option("unsafe"),
        es: compressor.option("builtins_ecma"),
    };
}

// eslint-disable-next-line no-unused-vars
const pure_access_globals = make_lookup(({ sloppy, es }) => [
    "Array",
    "Boolean",
    "clearInterval",
    "clearTimeout",
    "console",
    "Date",
    "decodeURI",
    "decodeURIComponent",
    "encodeURI",
    "encodeURIComponent",
    "Error",
    "escape",
    "eval",
    "EvalError",
    "Function",
    es >= 2020 && "globalThis",
    "isFinite",
    "isNaN",
    "JSON",
    "Math",
    "Number",
    "parseFloat",
    "parseInt",
    "RangeError",
    "ReferenceError",
    "RegExp",
    "Object",
    "setInterval",
    "setTimeout",
    "String",
    "SyntaxError",
    "TypeError",
    "unescape",
    "URIError",
]);

// Objects which are safe to access without throwing or causing a side effect.
// Usually we'd check the `unsafe` option first but these are way too common for that
const pure_prop_access_globals = new Set([
    "Number",
    "String",
    "Array",
    "Object",
    "Function",
    "Promise",
]);

// eslint-disable-next-line no-unused-vars
const is_pure_native_fn = make_lookup(({ sloppy, es }) => [
    sloppy && es >= 2021 && "AggregateError",
    "Array",
    "ArrayBuffer",
    es >= 2020 && "BigInt",
    es >= 2020 && "BigInt64Array",
    es >= 2020 && "BigUint64Array",
    "Boolean",
    "Date",
    sloppy && "decodeURI",
    sloppy && "decodeURIComponent",
    sloppy && "encodeURI",
    sloppy && "encodeURIComponent",
    "Error",
    "escape",
    "EvalError",
    es >= 2021 && "FinalizationRegistry",
    es >= 2026 && "Float16Array",
    "Float32Array",
    "Float64Array",
    "Int16Array",
    "Int32Array",
    "Int8Array",
    "isFinite",
    "isNaN",
    es >= 2026 && "Iterator",
    es >= 2015 && "Map",
    "Number",
    "parseFloat",
    "parseInt",
    es >= 2015 && "Promise",
    es >= 2015 && "Proxy",
    "RangeError",
    "ReferenceError",
    sloppy && "RegExp",
    es >= 2015 && "Set",
    "String",
    es >= 2015 && "Symbol",
    "SyntaxError",
    "TypeError",
    "Uint16Array",
    "Uint32Array",
    "Uint8Array",
    "Uint8ClampedArray",
    sloppy && "unescape",
    "URIError",
    sloppy && es >= 2015 && "WeakMap",
    sloppy && es >= 2021 && "WeakRef",
    sloppy && es >= 2015 && "WeakSet",
]);

const arg1_is_iterable = new Set([
    "Map",
    "Set",
    "WeakMap",
    "WeakSet",
]);
const arg1_is_range_or_iterable = new Set([
    "ArrayBuffer",
    "Float32Array",
    "Float64Array",
    "Int16Array",
    "Int32Array",
    "Int8Array",
    "Uint16Array",
    "Uint32Array",
    "Uint8Array",
    "Uint8ClampedArray",
]);
const lone_arg_is_range = new Set(["Array"]);

const object_methods = [
    "constructor",
    "toString",
    "valueOf",
];

// eslint-disable-next-line no-unused-vars
const is_pure_native_method = make_nested_lookup(({ sloppy, es }) => ({
    Array: [
        es >= 2022 && "at",
        es >= 2019 && "flat",
        es >= 2016 && "includes",
        "indexOf",
        "join",
        "lastIndexOf",
        "slice",
        ...object_methods,
    ],
    Boolean: object_methods,
    Function: object_methods,
    Number: [
        "toExponential",
        "toFixed",
        "toPrecision",
        ...object_methods,
    ],
    Object: object_methods,
    RegExp: [
        "test",
        ...object_methods,
    ],
    String: [
        es >= 2022 && "at",
        "charAt",
        "charCodeAt",
        es >= 2015 && "codePointAt",
        "concat",
        es >= 2025 && "endsWith",
        es >= 2015 && "includes",
        "indexOf",
        "italics",
        "lastIndexOf",
        es >= 2020 && "localeCompare",
        "match",
        es >= 2020 && "matchAll",
        es >= 2015 && "normalize",
        es >= 2017 && "padStart",
        es >= 2017 && "padEnd",
        es >= 2015 && sloppy && "repeat",
        "replace",
        es >= 2021 && "replaceAll",
        "search",
        "slice",
        "split",
        es >= 2015 && "startsWith",
        "substr",
        "substring",
        es >= 2015 && "repeat",
        "toLocaleLowerCase",
        "toLocaleUpperCase",
        "toLowerCase",
        "toUpperCase",
        "trim",
        es >= 2019 && "trimEnd",
        es >= 2019 && "trimStart",
        es >= 2019 && "trimLeft",
        es >= 2019 && "trimRight",
        ...object_methods,
    ],
}));

// eslint-disable-next-line no-unused-vars
const is_pure_native_static_fn = make_nested_lookup(({ sloppy, es }) => ({
    Array: [
        "isArray",
        es >= 2015 && "of",
    ],
    ArrayBuffer: [
        "isView",
    ],
    BigInt: es >= 2020 && [
        sloppy && "asIntN",
        sloppy && "asUintN",
    ],
    BigInt64Array: sloppy && es >= 2020 && ["of"],
    BigUint64Array: sloppy && es >= 2020 && ["of"],
    Date: [
        "now",
        "parse",
        "UTC",
    ],
    Error: [
        es >= 2026 && "isError",
    ],
    Float16Array: sloppy && es >= 2026 && ["of"],
    Float32Array: sloppy && ["of"],
    Float64Array: sloppy && ["of"],
    Int16Array: sloppy && ["of"],
    Int32Array: sloppy && ["of"],
    Int8Array: sloppy && ["of"],
    Math: [
        "abs",
        "acos",
        es >= 2015 && "acosh",
        "asin",
        es >= 2015 && "asinh",
        "atan",
        "atan2",
        es >= 2015 && "atanh",
        es >= 2015 && "cbrt",
        "ceil",
        es >= 2015 && "clz32",
        "cos",
        es >= 2015 && "cosh",
        "exp",
        es >= 2015 && "expm1",
        "floor",
        es >= 2026 && "f16round",
        es >= 2015 && "fround",
        es >= 2015 && "hypot",
        es >= 2015 && "imul",
        "log",
        es >= 2015 && "log10",
        es >= 2015 && "log1p",
        es >= 2015 && "log2",
        "max",
        "min",
        "pow",
        "round",
        es >= 2015 && "sign",
        "sin",
        es >= 2015 && "sinh",
        "sqrt",
        "tan",
        es >= 2015 && "tanh",
        es >= 2015 && "trunc",
    ],
    Number: [
        es >= 2015 && "isFinite",
        es >= 2015 && "isInteger",
        es >= 2015 && "isSafeInteger",
        es >= 2015 && "isNaN",
        es >= 2015 && "parseFloat",
        es >= 2015 && "parseInt",
    ],
    Object: [
        sloppy && "create",
        sloppy && "getOwnPropertyDescriptor",
        es >= 2017 && sloppy && "getOwnPropertyDescriptors",
        sloppy && "getOwnPropertyNames",
        es >= 2015 && sloppy && "getOwnPropertySymbols",
        sloppy && "getPrototypeOf",
        es >= 2022 && sloppy && "hasOwn",
        es >= 2015 && "is",
        "isExtensible",
        "isFrozen",
        "isSealed",
        es >= 2015 && sloppy && "keys",
    ],
    Promise: es >= 2015 && [
        es >= 2024 && "withResolvers",
    ],
    Proxy: es >= 2015 && [
        sloppy && "revocable",
    ],
    Reflect: es >= 2015 && [
        sloppy && "has",
        sloppy && "isExtensible",
        sloppy && "ownKeys",
    ],
    RegExp: [
        es >= 2026 && sloppy && "escape",
    ],
    String: [
        "fromCharCode",
        sloppy && es >= 2025 && "fromCodePoint",
    ],
    Uint16Array: ["of"],
    Uint32Array: ["of"],
    Uint8Array: ["of"],
    Uint8ClampedArray: ["of"],
}));

// Known numeric values which come with JS environments
// eslint-disable-next-line no-unused-vars
const is_pure_native_static_property = make_nested_lookup(({ sloppy, es }) => ({
    Math: [
        "E",
        "LN10",
        "LN2",
        "LOG2E",
        "LOG10E",
        "PI",
        "SQRT1_2",
        "SQRT2",
    ],
    Number: [
        es >= 2015 && "EPSILON",
        es >= 2015 && "MAX_SAFE_VALUE",
        "MAX_VALUE",
        es >= 2015 && "MIN_SAFE_VALUE",
        "MIN_VALUE",
        "NaN",
        "NEGATIVE_INFINITY",
        "POSITIVE_INFINITY",
    ],
    RegExp: [
        "$_",
        "$0",
        "$1",
        "$2",
        "$3",
        "$4",
        "$5",
        "$6",
        "$7",
        "$8",
        "$9",
        "input",
        "lastMatch",
        "lastParen",
        "leftContext",
        "rightContext",
    ],
}));

const re_uppercase_first_letter = /^[A-Z]/;
function is_pure_builtin_call(compressor, call) {
    let builtin = "";
    let method = "";

    let exp = call.expression;
    if (inference_module.is_undeclared_ref(exp)) {
        builtin = exp.name;
    } else if (exp instanceof AST_Dot) {
        method = exp.property;

        exp = exp.expression;
        if (inference_module.is_undeclared_ref(exp)) {
            if (
                // globalThis.pureFunc()
                exp.name === "globalThis"
                && compressor.option("builtins_ecma") >= 2020
            ) {
                builtin = method;
                method = "";
            } else {
                // SomeBuiltin.pureFunc()
                builtin = exp.name;
            }
        } else if (exp instanceof AST_Dot) {
            if (
                inference_module.is_undeclared_ref(exp.expression)
                && exp.expression.name === "globalThis"
                && compressor.option("builtins_ecma") >= 2020
            ) {
                // globalThis.SomeBuiltin.pureFunc()
                builtin = exp.property;
            } else {
                return false;
            }
        } else {
            return false;
        }
    } else {
        return false;
    }

    if (!method) {
        if (compressor.is_pure_native_fn(builtin)) {
            // some require `new`, others throw if you use it
            const is_new = call instanceof AST_New;
            const should_be_new = re_uppercase_first_letter.test(builtin); // true of all `is_pure_native_fn`
            if (is_new !== should_be_new) return false;

            if (!is_builtin_pure_with_these_args(builtin, call.args)) {
                return false;
            }

            return true;
        }

        return false;
    } else {
        return compressor.is_pure_native_static_fn(builtin, method);
    }
}

/** Some builtins are listed above but their purity is subject to some conditions */
function is_builtin_pure_with_these_args(builtin, args) {
    // all the builtins we deal with here are ok with getting 0 args
    if (args.length === 0) return true;

    let arg1 = args[0];
    if (arg1 instanceof AST_SymbolRef) {
        arg1 = arg1.fixed_value();
    }

    if (lone_arg_is_range.has(builtin)) { // new Array(number)
        const arg_valid = args.length > 1
            || arg1 instanceof AST_Number
                && arg1.value >= 0 && arg1.value <= 0xffffffff;
            // TODO: or, we are asked to ignore TypeError
        if (!arg_valid) return false;
    }

    if (arg1_is_range_or_iterable.has(builtin)) { // new Float32Array(number | Array)
        const arg_valid = args.length === 0
            || arg1 instanceof AST_Array
            || arg1 instanceof AST_Number
                && arg1.value >= 0 && arg1.value <= 0xffffffff;
        if (!arg_valid) return false;
    }

    if (arg1_is_iterable.has(builtin)) { // new Set(iterable)
        const arg_valid = args.length === 0 || arg1 instanceof AST_Array;
        if (!arg_valid) return false;
    }

    return true;
}

Object.assign(module.exports, {
    pure_access_globals,
    pure_prop_access_globals,
    is_pure_native_fn,
    is_pure_native_method,
    is_pure_native_static_fn,
    is_pure_native_static_property,
    is_pure_builtin_call,
});

const inference_module = require("./inference.js");
