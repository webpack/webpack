export = TerserPlugin;
/**
 * @template [T=import("terser").MinifyOptions]
 */
declare class TerserPlugin<T = import("terser").MinifyOptions> {
  /**
   * @private
   * @param {any} input
   * @returns {boolean}
   */
  private static isSourceMap;
  /**
   * @private
   * @param {unknown} warning
   * @param {string} file
   * @returns {Error}
   */
  private static buildWarning;
  /**
   * @private
   * @param {any} error
   * @param {string} file
   * @param {TraceMap} [sourceMap]
   * @param {Compilation["requestShortener"]} [requestShortener]
   * @returns {Error}
   */
  private static buildError;
  /**
   * @private
   * @param {Parallel} parallel
   * @returns {number}
   */
  private static getAvailableNumberOfCores;
  /**
   * @private
   * @param {any} environment
   * @returns {number}
   */
  private static getEcmaVersion;
  /**
   * @param {BasePluginOptions & DefinedDefaultMinimizerAndOptions<T>} [options]
   */
  constructor(
    options?:
      | (BasePluginOptions & DefinedDefaultMinimizerAndOptions<T>)
      | undefined
  );
  /**
   * @private
   * @type {InternalPluginOptions<T>}
   */
  private options;
  /**
   * @private
   * @param {Compiler} compiler
   * @param {Compilation} compilation
   * @param {Record<string, import("webpack").sources.Source>} assets
   * @param {{availableNumberOfCores: number}} optimizeOptions
   * @returns {Promise<void>}
   */
  private optimize;
  /**
   * @param {Compiler} compiler
   * @returns {void}
   */
  apply(compiler: Compiler): void;
}
declare namespace TerserPlugin {
  export {
    terserMinify,
    uglifyJsMinify,
    swcMinify,
    esbuildMinify,
    Schema,
    Compiler,
    Compilation,
    WebpackError,
    Asset,
    JestWorker,
    SourceMapInput,
    TraceMap,
    Rule,
    Rules,
    ExtractCommentsFunction,
    ExtractCommentsCondition,
    ExtractCommentsFilename,
    ExtractCommentsBanner,
    ExtractCommentsObject,
    ExtractCommentsOptions,
    MinimizedResult,
    Input,
    CustomOptions,
    InferDefaultType,
    PredefinedOptions,
    MinimizerOptions,
    BasicMinimizerImplementation,
    MinimizeFunctionHelpers,
    MinimizerImplementation,
    InternalOptions,
    MinimizerWorker,
    Parallel,
    BasePluginOptions,
    DefinedDefaultMinimizerAndOptions,
    InternalPluginOptions,
  };
}
type Compiler = import("webpack").Compiler;
type BasePluginOptions = {
  test?: Rules | undefined;
  include?: Rules | undefined;
  exclude?: Rules | undefined;
  extractComments?: ExtractCommentsOptions | undefined;
  parallel?: Parallel;
};
type DefinedDefaultMinimizerAndOptions<T> =
  T extends import("terser").MinifyOptions
    ? {
        minify?: MinimizerImplementation<T> | undefined;
        terserOptions?: MinimizerOptions<T> | undefined;
      }
    : {
        minify: MinimizerImplementation<T>;
        terserOptions?: MinimizerOptions<T> | undefined;
      };
import { terserMinify } from "./utils";
import { uglifyJsMinify } from "./utils";
import { swcMinify } from "./utils";
import { esbuildMinify } from "./utils";
type Schema = import("schema-utils/declarations/validate").Schema;
type Compilation = import("webpack").Compilation;
type WebpackError = import("webpack").WebpackError;
type Asset = import("webpack").Asset;
type JestWorker = import("jest-worker").Worker;
type SourceMapInput = import("@jridgewell/trace-mapping").SourceMapInput;
type TraceMap = import("@jridgewell/trace-mapping").TraceMap;
type Rule = RegExp | string;
type Rules = Rule[] | Rule;
type ExtractCommentsFunction = (
  astNode: any,
  comment: {
    value: string;
    type: "comment1" | "comment2" | "comment3" | "comment4";
    pos: number;
    line: number;
    col: number;
  }
) => boolean;
type ExtractCommentsCondition =
  | boolean
  | "all"
  | "some"
  | RegExp
  | ExtractCommentsFunction;
type ExtractCommentsFilename = string | ((fileData: any) => string);
type ExtractCommentsBanner =
  | string
  | boolean
  | ((commentsFile: string) => string);
type ExtractCommentsObject = {
  condition?: ExtractCommentsCondition | undefined;
  filename?: ExtractCommentsFilename | undefined;
  banner?: ExtractCommentsBanner | undefined;
};
type ExtractCommentsOptions = ExtractCommentsCondition | ExtractCommentsObject;
type MinimizedResult = {
  code: string;
  map?: import("@jridgewell/trace-mapping").SourceMapInput | undefined;
  errors?: (string | Error)[] | undefined;
  warnings?: (string | Error)[] | undefined;
  extractedComments?: string[] | undefined;
};
type Input = {
  [file: string]: string;
};
type CustomOptions = {
  [key: string]: any;
};
type InferDefaultType<T> = T extends infer U ? U : CustomOptions;
type PredefinedOptions<T> = {
  module?:
    | (T extends {
        module?: infer P | undefined;
      }
        ? P
        : string | boolean)
    | undefined;
  ecma?:
    | (T extends {
        ecma?: infer P_1 | undefined;
      }
        ? P_1
        : string | number)
    | undefined;
};
type MinimizerOptions<T> = PredefinedOptions<T> & InferDefaultType<T>;
type BasicMinimizerImplementation<T> = (
  input: Input,
  sourceMap: SourceMapInput | undefined,
  minifyOptions: MinimizerOptions<T>,
  extractComments: ExtractCommentsOptions | undefined
) => Promise<MinimizedResult>;
type MinimizeFunctionHelpers = {
  getMinimizerVersion?: (() => string | undefined) | undefined;
  supportsWorkerThreads?: (() => boolean | undefined) | undefined;
};
type MinimizerImplementation<T> = BasicMinimizerImplementation<T> &
  MinimizeFunctionHelpers;
type InternalOptions<T> = {
  name: string;
  input: string;
  inputSourceMap: SourceMapInput | undefined;
  extractComments: ExtractCommentsOptions | undefined;
  minimizer: {
    implementation: MinimizerImplementation<T>;
    options: MinimizerOptions<T>;
  };
};
type MinimizerWorker<T> = import("jest-worker").Worker & {
  transform: (options: string) => MinimizedResult;
  minify: (options: InternalOptions<T>) => MinimizedResult;
};
type Parallel = undefined | boolean | number;
type InternalPluginOptions<T> = BasePluginOptions & {
  minimizer: {
    implementation: MinimizerImplementation<T>;
    options: MinimizerOptions<T>;
  };
};
import { minify } from "./minify";
