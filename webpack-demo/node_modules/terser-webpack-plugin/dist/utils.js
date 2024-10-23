"use strict";

/** @typedef {import("@jridgewell/trace-mapping").SourceMapInput} SourceMapInput */
/** @typedef {import("terser").FormatOptions} TerserFormatOptions */
/** @typedef {import("terser").MinifyOptions} TerserOptions */
/** @typedef {import("terser").CompressOptions} TerserCompressOptions */
/** @typedef {import("terser").ECMA} TerserECMA */
/** @typedef {import("./index.js").ExtractCommentsOptions} ExtractCommentsOptions */
/** @typedef {import("./index.js").ExtractCommentsFunction} ExtractCommentsFunction */
/** @typedef {import("./index.js").ExtractCommentsCondition} ExtractCommentsCondition */
/** @typedef {import("./index.js").Input} Input */
/** @typedef {import("./index.js").MinimizedResult} MinimizedResult */
/** @typedef {import("./index.js").PredefinedOptions} PredefinedOptions */
/** @typedef {import("./index.js").CustomOptions} CustomOptions */

/**
 * @typedef {Array<string>} ExtractedComments
 */

const notSettled = Symbol(`not-settled`);

/**
 * @template T
 * @typedef {() => Promise<T>} Task
 */

/**
 * Run tasks with limited concurrency.
 * @template T
 * @param {number} limit - Limit of tasks that run at once.
 * @param {Task<T>[]} tasks - List of tasks to run.
 * @returns {Promise<T[]>} A promise that fulfills to an array of the results
 */
function throttleAll(limit, tasks) {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new TypeError(`Expected \`limit\` to be a finite number > 0, got \`${limit}\` (${typeof limit})`);
  }
  if (!Array.isArray(tasks) || !tasks.every(task => typeof task === `function`)) {
    throw new TypeError(`Expected \`tasks\` to be a list of functions returning a promise`);
  }
  return new Promise((resolve, reject) => {
    const result = Array(tasks.length).fill(notSettled);
    const entries = tasks.entries();
    const next = () => {
      const {
        done,
        value
      } = entries.next();
      if (done) {
        const isLast = !result.includes(notSettled);
        if (isLast) resolve( /** @type{T[]} **/result);
        return;
      }
      const [index, task] = value;

      /**
       * @param {T} x
       */
      const onFulfilled = x => {
        result[index] = x;
        next();
      };
      task().then(onFulfilled, reject);
    };
    Array(limit).fill(0).forEach(next);
  });
}

/* istanbul ignore next */
/**
 * @param {Input} input
 * @param {SourceMapInput | undefined} sourceMap
 * @param {PredefinedOptions & CustomOptions} minimizerOptions
 * @param {ExtractCommentsOptions | undefined} extractComments
 * @return {Promise<MinimizedResult>}
 */
async function terserMinify(input, sourceMap, minimizerOptions, extractComments) {
  /**
   * @param {any} value
   * @returns {boolean}
   */
  const isObject = value => {
    const type = typeof value;
    return value != null && (type === "object" || type === "function");
  };

  /**
   * @param {TerserOptions & { sourceMap: undefined } & ({ output: TerserFormatOptions & { beautify: boolean } } | { format: TerserFormatOptions & { beautify: boolean } })} terserOptions
   * @param {ExtractedComments} extractedComments
   * @returns {ExtractCommentsFunction}
   */
  const buildComments = (terserOptions, extractedComments) => {
    /** @type {{ [index: string]: ExtractCommentsCondition }} */
    const condition = {};
    let comments;
    if (terserOptions.format) {
      ({
        comments
      } = terserOptions.format);
    } else if (terserOptions.output) {
      ({
        comments
      } = terserOptions.output);
    }
    condition.preserve = typeof comments !== "undefined" ? comments : false;
    if (typeof extractComments === "boolean" && extractComments) {
      condition.extract = "some";
    } else if (typeof extractComments === "string" || extractComments instanceof RegExp) {
      condition.extract = extractComments;
    } else if (typeof extractComments === "function") {
      condition.extract = extractComments;
    } else if (extractComments && isObject(extractComments)) {
      condition.extract = typeof extractComments.condition === "boolean" && extractComments.condition ? "some" : typeof extractComments.condition !== "undefined" ? extractComments.condition : "some";
    } else {
      // No extract
      // Preserve using "commentsOpts" or "some"
      condition.preserve = typeof comments !== "undefined" ? comments : "some";
      condition.extract = false;
    }

    // Ensure that both conditions are functions
    ["preserve", "extract"].forEach(key => {
      /** @type {undefined | string} */
      let regexStr;
      /** @type {undefined | RegExp} */
      let regex;
      switch (typeof condition[key]) {
        case "boolean":
          condition[key] = condition[key] ? () => true : () => false;
          break;
        case "function":
          break;
        case "string":
          if (condition[key] === "all") {
            condition[key] = () => true;
            break;
          }
          if (condition[key] === "some") {
            condition[key] = /** @type {ExtractCommentsFunction} */
            (astNode, comment) => (comment.type === "comment2" || comment.type === "comment1") && /@preserve|@lic|@cc_on|^\**!/i.test(comment.value);
            break;
          }
          regexStr = /** @type {string} */condition[key];
          condition[key] = /** @type {ExtractCommentsFunction} */
          (astNode, comment) => new RegExp( /** @type {string} */regexStr).test(comment.value);
          break;
        default:
          regex = /** @type {RegExp} */condition[key];
          condition[key] = /** @type {ExtractCommentsFunction} */
          (astNode, comment) => /** @type {RegExp} */regex.test(comment.value);
      }
    });

    // Redefine the comments function to extract and preserve
    // comments according to the two conditions
    return (astNode, comment) => {
      if ( /** @type {{ extract: ExtractCommentsFunction }} */
      condition.extract(astNode, comment)) {
        const commentText = comment.type === "comment2" ? `/*${comment.value}*/` : `//${comment.value}`;

        // Don't include duplicate comments
        if (!extractedComments.includes(commentText)) {
          extractedComments.push(commentText);
        }
      }
      return /** @type {{ preserve: ExtractCommentsFunction }} */condition.preserve(astNode, comment);
    };
  };

  /**
   * @param {PredefinedOptions & TerserOptions} [terserOptions={}]
   * @returns {TerserOptions & { sourceMap: undefined } & { compress: TerserCompressOptions } & ({ output: TerserFormatOptions & { beautify: boolean } } | { format: TerserFormatOptions & { beautify: boolean } })}
   */
  const buildTerserOptions = (terserOptions = {}) => {
    // Need deep copy objects to avoid https://github.com/terser/terser/issues/366
    return {
      ...terserOptions,
      compress: typeof terserOptions.compress === "boolean" ? terserOptions.compress ? {} : false : {
        ...terserOptions.compress
      },
      // ecma: terserOptions.ecma,
      // ie8: terserOptions.ie8,
      // keep_classnames: terserOptions.keep_classnames,
      // keep_fnames: terserOptions.keep_fnames,
      mangle: terserOptions.mangle == null ? true : typeof terserOptions.mangle === "boolean" ? terserOptions.mangle : {
        ...terserOptions.mangle
      },
      // module: terserOptions.module,
      // nameCache: { ...terserOptions.toplevel },
      // the `output` option is deprecated
      ...(terserOptions.format ? {
        format: {
          beautify: false,
          ...terserOptions.format
        }
      } : {
        output: {
          beautify: false,
          ...terserOptions.output
        }
      }),
      parse: {
        ...terserOptions.parse
      },
      // safari10: terserOptions.safari10,
      // Ignoring sourceMap from options
      // eslint-disable-next-line no-undefined
      sourceMap: undefined
      // toplevel: terserOptions.toplevel
    };
  };

  // eslint-disable-next-line global-require
  const {
    minify
  } = require("terser");
  // Copy `terser` options
  const terserOptions = buildTerserOptions(minimizerOptions);

  // Let terser generate a SourceMap
  if (sourceMap) {
    // @ts-ignore
    terserOptions.sourceMap = {
      asObject: true
    };
  }

  /** @type {ExtractedComments} */
  const extractedComments = [];
  if (terserOptions.output) {
    terserOptions.output.comments = buildComments(terserOptions, extractedComments);
  } else if (terserOptions.format) {
    terserOptions.format.comments = buildComments(terserOptions, extractedComments);
  }
  if (terserOptions.compress) {
    // More optimizations
    if (typeof terserOptions.compress.ecma === "undefined") {
      terserOptions.compress.ecma = terserOptions.ecma;
    }

    // https://github.com/webpack/webpack/issues/16135
    if (terserOptions.ecma === 5 && typeof terserOptions.compress.arrows === "undefined") {
      terserOptions.compress.arrows = false;
    }
  }
  const [[filename, code]] = Object.entries(input);
  const result = await minify({
    [filename]: code
  }, terserOptions);
  return {
    code: ( /** @type {string} **/result.code),
    // @ts-ignore
    // eslint-disable-next-line no-undefined
    map: result.map ? ( /** @type {SourceMapInput} **/result.map) : undefined,
    extractedComments
  };
}

/**
 * @returns {string | undefined}
 */
terserMinify.getMinimizerVersion = () => {
  let packageJson;
  try {
    // eslint-disable-next-line global-require
    packageJson = require("terser/package.json");
  } catch (error) {
    // Ignore
  }
  return packageJson && packageJson.version;
};

/* istanbul ignore next */
/**
 * @param {Input} input
 * @param {SourceMapInput | undefined} sourceMap
 * @param {PredefinedOptions & CustomOptions} minimizerOptions
 * @param {ExtractCommentsOptions | undefined} extractComments
 * @return {Promise<MinimizedResult>}
 */
async function uglifyJsMinify(input, sourceMap, minimizerOptions, extractComments) {
  /**
   * @param {any} value
   * @returns {boolean}
   */
  const isObject = value => {
    const type = typeof value;
    return value != null && (type === "object" || type === "function");
  };

  /**
   * @param {import("uglify-js").MinifyOptions & { sourceMap: undefined } & { output: import("uglify-js").OutputOptions & { beautify: boolean }}} uglifyJsOptions
   * @param {ExtractedComments} extractedComments
   * @returns {ExtractCommentsFunction}
   */
  const buildComments = (uglifyJsOptions, extractedComments) => {
    /** @type {{ [index: string]: ExtractCommentsCondition }} */
    const condition = {};
    const {
      comments
    } = uglifyJsOptions.output;
    condition.preserve = typeof comments !== "undefined" ? comments : false;
    if (typeof extractComments === "boolean" && extractComments) {
      condition.extract = "some";
    } else if (typeof extractComments === "string" || extractComments instanceof RegExp) {
      condition.extract = extractComments;
    } else if (typeof extractComments === "function") {
      condition.extract = extractComments;
    } else if (extractComments && isObject(extractComments)) {
      condition.extract = typeof extractComments.condition === "boolean" && extractComments.condition ? "some" : typeof extractComments.condition !== "undefined" ? extractComments.condition : "some";
    } else {
      // No extract
      // Preserve using "commentsOpts" or "some"
      condition.preserve = typeof comments !== "undefined" ? comments : "some";
      condition.extract = false;
    }

    // Ensure that both conditions are functions
    ["preserve", "extract"].forEach(key => {
      /** @type {undefined | string} */
      let regexStr;
      /** @type {undefined | RegExp} */
      let regex;
      switch (typeof condition[key]) {
        case "boolean":
          condition[key] = condition[key] ? () => true : () => false;
          break;
        case "function":
          break;
        case "string":
          if (condition[key] === "all") {
            condition[key] = () => true;
            break;
          }
          if (condition[key] === "some") {
            condition[key] = /** @type {ExtractCommentsFunction} */
            (astNode, comment) => (comment.type === "comment2" || comment.type === "comment1") && /@preserve|@lic|@cc_on|^\**!/i.test(comment.value);
            break;
          }
          regexStr = /** @type {string} */condition[key];
          condition[key] = /** @type {ExtractCommentsFunction} */
          (astNode, comment) => new RegExp( /** @type {string} */regexStr).test(comment.value);
          break;
        default:
          regex = /** @type {RegExp} */condition[key];
          condition[key] = /** @type {ExtractCommentsFunction} */
          (astNode, comment) => /** @type {RegExp} */regex.test(comment.value);
      }
    });

    // Redefine the comments function to extract and preserve
    // comments according to the two conditions
    return (astNode, comment) => {
      if ( /** @type {{ extract: ExtractCommentsFunction }} */
      condition.extract(astNode, comment)) {
        const commentText = comment.type === "comment2" ? `/*${comment.value}*/` : `//${comment.value}`;

        // Don't include duplicate comments
        if (!extractedComments.includes(commentText)) {
          extractedComments.push(commentText);
        }
      }
      return /** @type {{ preserve: ExtractCommentsFunction }} */condition.preserve(astNode, comment);
    };
  };

  /**
   * @param {PredefinedOptions & import("uglify-js").MinifyOptions} [uglifyJsOptions={}]
   * @returns {import("uglify-js").MinifyOptions & { sourceMap: undefined } & { output: import("uglify-js").OutputOptions & { beautify: boolean }}}
   */
  const buildUglifyJsOptions = (uglifyJsOptions = {}) => {
    // eslint-disable-next-line no-param-reassign
    delete minimizerOptions.ecma;
    // eslint-disable-next-line no-param-reassign
    delete minimizerOptions.module;

    // Need deep copy objects to avoid https://github.com/terser/terser/issues/366
    return {
      ...uglifyJsOptions,
      // warnings: uglifyJsOptions.warnings,
      parse: {
        ...uglifyJsOptions.parse
      },
      compress: typeof uglifyJsOptions.compress === "boolean" ? uglifyJsOptions.compress : {
        ...uglifyJsOptions.compress
      },
      mangle: uglifyJsOptions.mangle == null ? true : typeof uglifyJsOptions.mangle === "boolean" ? uglifyJsOptions.mangle : {
        ...uglifyJsOptions.mangle
      },
      output: {
        beautify: false,
        ...uglifyJsOptions.output
      },
      // Ignoring sourceMap from options
      // eslint-disable-next-line no-undefined
      sourceMap: undefined
      // toplevel: uglifyJsOptions.toplevel
      // nameCache: { ...uglifyJsOptions.toplevel },
      // ie8: uglifyJsOptions.ie8,
      // keep_fnames: uglifyJsOptions.keep_fnames,
    };
  };

  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  const {
    minify
  } = require("uglify-js");

  // Copy `uglify-js` options
  const uglifyJsOptions = buildUglifyJsOptions(minimizerOptions);

  // Let terser generate a SourceMap
  if (sourceMap) {
    // @ts-ignore
    uglifyJsOptions.sourceMap = true;
  }

  /** @type {ExtractedComments} */
  const extractedComments = [];

  // @ts-ignore
  uglifyJsOptions.output.comments = buildComments(uglifyJsOptions, extractedComments);
  const [[filename, code]] = Object.entries(input);
  const result = await minify({
    [filename]: code
  }, uglifyJsOptions);
  return {
    code: result.code,
    // eslint-disable-next-line no-undefined
    map: result.map ? JSON.parse(result.map) : undefined,
    errors: result.error ? [result.error] : [],
    warnings: result.warnings || [],
    extractedComments
  };
}

/**
 * @returns {string | undefined}
 */
uglifyJsMinify.getMinimizerVersion = () => {
  let packageJson;
  try {
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    packageJson = require("uglify-js/package.json");
  } catch (error) {
    // Ignore
  }
  return packageJson && packageJson.version;
};

/* istanbul ignore next */
/**
 * @param {Input} input
 * @param {SourceMapInput | undefined} sourceMap
 * @param {PredefinedOptions & CustomOptions} minimizerOptions
 * @return {Promise<MinimizedResult>}
 */
async function swcMinify(input, sourceMap, minimizerOptions) {
  /**
   * @param {PredefinedOptions & import("@swc/core").JsMinifyOptions} [swcOptions={}]
   * @returns {import("@swc/core").JsMinifyOptions & { sourceMap: undefined } & { compress: import("@swc/core").TerserCompressOptions }}
   */
  const buildSwcOptions = (swcOptions = {}) => {
    // Need deep copy objects to avoid https://github.com/terser/terser/issues/366
    return {
      ...swcOptions,
      compress: typeof swcOptions.compress === "boolean" ? swcOptions.compress ? {} : false : {
        ...swcOptions.compress
      },
      mangle: swcOptions.mangle == null ? true : typeof swcOptions.mangle === "boolean" ? swcOptions.mangle : {
        ...swcOptions.mangle
      },
      // ecma: swcOptions.ecma,
      // keep_classnames: swcOptions.keep_classnames,
      // keep_fnames: swcOptions.keep_fnames,
      // module: swcOptions.module,
      // safari10: swcOptions.safari10,
      // toplevel: swcOptions.toplevel
      // eslint-disable-next-line no-undefined
      sourceMap: undefined
    };
  };

  // eslint-disable-next-line import/no-extraneous-dependencies, global-require
  const swc = require("@swc/core");
  // Copy `swc` options
  const swcOptions = buildSwcOptions(minimizerOptions);

  // Let `swc` generate a SourceMap
  if (sourceMap) {
    // @ts-ignore
    swcOptions.sourceMap = true;
  }
  if (swcOptions.compress) {
    // More optimizations
    if (typeof swcOptions.compress.ecma === "undefined") {
      swcOptions.compress.ecma = swcOptions.ecma;
    }

    // https://github.com/webpack/webpack/issues/16135
    if (swcOptions.ecma === 5 && typeof swcOptions.compress.arrows === "undefined") {
      swcOptions.compress.arrows = false;
    }
  }
  const [[filename, code]] = Object.entries(input);
  const result = await swc.minify(code, swcOptions);
  let map;
  if (result.map) {
    map = JSON.parse(result.map);

    // TODO workaround for swc because `filename` is not preset as in `swc` signature as for `terser`
    map.sources = [filename];
    delete map.sourcesContent;
  }
  return {
    code: result.code,
    map
  };
}

/**
 * @returns {string | undefined}
 */
swcMinify.getMinimizerVersion = () => {
  let packageJson;
  try {
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    packageJson = require("@swc/core/package.json");
  } catch (error) {
    // Ignore
  }
  return packageJson && packageJson.version;
};

/* istanbul ignore next */
/**
 * @param {Input} input
 * @param {SourceMapInput | undefined} sourceMap
 * @param {PredefinedOptions & CustomOptions} minimizerOptions
 * @return {Promise<MinimizedResult>}
 */
async function esbuildMinify(input, sourceMap, minimizerOptions) {
  /**
   * @param {PredefinedOptions & import("esbuild").TransformOptions} [esbuildOptions={}]
   * @returns {import("esbuild").TransformOptions}
   */
  const buildEsbuildOptions = (esbuildOptions = {}) => {
    // eslint-disable-next-line no-param-reassign
    delete esbuildOptions.ecma;
    if (esbuildOptions.module) {
      // eslint-disable-next-line no-param-reassign
      esbuildOptions.format = "esm";
    }

    // eslint-disable-next-line no-param-reassign
    delete esbuildOptions.module;

    // Need deep copy objects to avoid https://github.com/terser/terser/issues/366
    return {
      minify: true,
      legalComments: "inline",
      ...esbuildOptions,
      sourcemap: false
    };
  };

  // eslint-disable-next-line import/no-extraneous-dependencies, global-require
  const esbuild = require("esbuild");

  // Copy `esbuild` options
  const esbuildOptions = buildEsbuildOptions(minimizerOptions);

  // Let `esbuild` generate a SourceMap
  if (sourceMap) {
    esbuildOptions.sourcemap = true;
    esbuildOptions.sourcesContent = false;
  }
  const [[filename, code]] = Object.entries(input);
  esbuildOptions.sourcefile = filename;
  const result = await esbuild.transform(code, esbuildOptions);
  return {
    code: result.code,
    // eslint-disable-next-line no-undefined
    map: result.map ? JSON.parse(result.map) : undefined,
    warnings: result.warnings.length > 0 ? result.warnings.map(item => {
      const plugin = item.pluginName ? `\nPlugin Name: ${item.pluginName}` : "";
      const location = item.location ? `\n\n${item.location.file}:${item.location.line}:${item.location.column}:\n  ${item.location.line} | ${item.location.lineText}\n\nSuggestion: ${item.location.suggestion}` : "";
      const notes = item.notes.length > 0 ? `\n\nNotes:\n${item.notes.map(note => `${note.location ? `[${note.location.file}:${note.location.line}:${note.location.column}] ` : ""}${note.text}${note.location ? `\nSuggestion: ${note.location.suggestion}` : ""}${note.location ? `\nLine text:\n${note.location.lineText}\n` : ""}`).join("\n")}` : "";
      return `${item.text} [${item.id}]${plugin}${location}${item.detail ? `\nDetails:\n${item.detail}` : ""}${notes}`;
    }) : []
  };
}

/**
 * @returns {string | undefined}
 */
esbuildMinify.getMinimizerVersion = () => {
  let packageJson;
  try {
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    packageJson = require("esbuild/package.json");
  } catch (error) {
    // Ignore
  }
  return packageJson && packageJson.version;
};

/**
 * @template T
 * @param fn {(function(): any) | undefined}
 * @returns {function(): T}
 */
function memoize(fn) {
  let cache = false;
  /** @type {T} */
  let result;
  return () => {
    if (cache) {
      return result;
    }
    result = /** @type {function(): any} */fn();
    cache = true;
    // Allow to clean up memory for fn
    // and all dependent resources
    // eslint-disable-next-line no-undefined, no-param-reassign
    fn = undefined;
    return result;
  };
}
module.exports = {
  throttleAll,
  memoize,
  terserMinify,
  uglifyJsMinify,
  swcMinify,
  esbuildMinify
};