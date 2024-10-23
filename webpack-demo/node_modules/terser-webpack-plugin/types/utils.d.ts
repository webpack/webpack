export type Task<T> = () => Promise<T>;
export type SourceMapInput = import("@jridgewell/trace-mapping").SourceMapInput;
export type TerserFormatOptions = import("terser").FormatOptions;
export type TerserOptions = import("terser").MinifyOptions;
export type TerserCompressOptions = import("terser").CompressOptions;
export type TerserECMA = import("terser").ECMA;
export type ExtractCommentsOptions =
  import("./index.js").ExtractCommentsOptions;
export type ExtractCommentsFunction =
  import("./index.js").ExtractCommentsFunction;
export type ExtractCommentsCondition =
  import("./index.js").ExtractCommentsCondition;
export type Input = import("./index.js").Input;
export type MinimizedResult = import("./index.js").MinimizedResult;
export type PredefinedOptions = import("./index.js").PredefinedOptions;
export type CustomOptions = import("./index.js").CustomOptions;
export type ExtractedComments = Array<string>;
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
export function throttleAll<T>(limit: number, tasks: Task<T>[]): Promise<T[]>;
/**
 * @template T
 * @param fn {(function(): any) | undefined}
 * @returns {function(): T}
 */
export function memoize<T>(fn: (() => any) | undefined): () => T;
/**
 * @param {Input} input
 * @param {SourceMapInput | undefined} sourceMap
 * @param {PredefinedOptions & CustomOptions} minimizerOptions
 * @param {ExtractCommentsOptions | undefined} extractComments
 * @return {Promise<MinimizedResult>}
 */
export function terserMinify(
  input: Input,
  sourceMap: SourceMapInput | undefined,
  minimizerOptions: PredefinedOptions & CustomOptions,
  extractComments: ExtractCommentsOptions | undefined
): Promise<MinimizedResult>;
export namespace terserMinify {
  /**
   * @returns {string | undefined}
   */
  function getMinimizerVersion(): string | undefined;
}
/**
 * @param {Input} input
 * @param {SourceMapInput | undefined} sourceMap
 * @param {PredefinedOptions & CustomOptions} minimizerOptions
 * @param {ExtractCommentsOptions | undefined} extractComments
 * @return {Promise<MinimizedResult>}
 */
export function uglifyJsMinify(
  input: Input,
  sourceMap: SourceMapInput | undefined,
  minimizerOptions: PredefinedOptions & CustomOptions,
  extractComments: ExtractCommentsOptions | undefined
): Promise<MinimizedResult>;
export namespace uglifyJsMinify {
  /**
   * @returns {string | undefined}
   */
  function getMinimizerVersion(): string | undefined;
}
/**
 * @param {Input} input
 * @param {SourceMapInput | undefined} sourceMap
 * @param {PredefinedOptions & CustomOptions} minimizerOptions
 * @return {Promise<MinimizedResult>}
 */
export function swcMinify(
  input: Input,
  sourceMap: SourceMapInput | undefined,
  minimizerOptions: PredefinedOptions & CustomOptions
): Promise<MinimizedResult>;
export namespace swcMinify {
  /**
   * @returns {string | undefined}
   */
  function getMinimizerVersion(): string | undefined;
}
/**
 * @param {Input} input
 * @param {SourceMapInput | undefined} sourceMap
 * @param {PredefinedOptions & CustomOptions} minimizerOptions
 * @return {Promise<MinimizedResult>}
 */
export function esbuildMinify(
  input: Input,
  sourceMap: SourceMapInput | undefined,
  minimizerOptions: PredefinedOptions & CustomOptions
): Promise<MinimizedResult>;
export namespace esbuildMinify {
  /**
   * @returns {string | undefined}
   */
  function getMinimizerVersion(): string | undefined;
}
