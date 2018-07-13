declare module "*.json";

// Deprecated NodeJS API usages in Webpack
declare namespace NodeJS {
	interface Process {
		binding(internalModule: string): any;
	}
}

declare module "neo-async" {
	export interface Dictionary<T> {
		[key: string]: T;
	}
	export type IterableCollection<T> = T[] | IterableIterator<T> | Dictionary<T>;

	export interface ErrorCallback<T> {
		(err?: T): void;
	}
	export interface AsyncBooleanResultCallback<E> {
		(err?: E, truthValue?: boolean): void;
	}
	export interface AsyncResultCallback<T, E> {
		(err?: E, result?: T): void;
	}
	export interface AsyncResultArrayCallback<T, E> {
		(err?: E, results?: Array<T | undefined>): void;
	}
	export interface AsyncResultObjectCallback<T, E> {
		(err: E | undefined, results: Dictionary<T | undefined>): void;
	}

	export interface AsyncFunction<T, E> {
		(callback: (err?: E, result?: T) => void): void;
	}
	export interface AsyncFunctionEx<T, E> {
		(callback: (err?: E, ...results: T[]) => void): void;
	}
	export interface AsyncIterator<T, E> {
		(item: T, callback: ErrorCallback<E>): void;
	}
	export interface AsyncForEachOfIterator<T, E> {
		(item: T, key: number | string, callback: ErrorCallback<E>): void;
	}
	export interface AsyncResultIterator<T, R, E> {
		(item: T, callback: AsyncResultCallback<R, E>): void;
	}
	export interface AsyncMemoIterator<T, R, E> {
		(memo: R | undefined, item: T, callback: AsyncResultCallback<R, E>): void;
	}
	export interface AsyncBooleanIterator<T, E> {
		(item: T, callback: AsyncBooleanResultCallback<E>): void;
	}

	export interface AsyncWorker<T, E> {
		(task: T, callback: ErrorCallback<E>): void;
	}
	export interface AsyncVoidFunction<E> {
		(callback: ErrorCallback<E>): void;
	}

	export type AsyncAutoTasks<R extends Dictionary<any>, E> = {
		[K in keyof R]: AsyncAutoTask<R[K], R, E>
	};
	export type AsyncAutoTask<R1, R extends Dictionary<any>, E> =
		| AsyncAutoTaskFunctionWithoutDependencies<R1, E>
		| (keyof R | AsyncAutoTaskFunction<R1, R, E>)[];
	export interface AsyncAutoTaskFunctionWithoutDependencies<R1, E> {
		(cb: AsyncResultCallback<R1, E> | ErrorCallback<E>): void;
	}
	export interface AsyncAutoTaskFunction<R1, R extends Dictionary<any>, E> {
		(results: R, cb: AsyncResultCallback<R1, E> | ErrorCallback<E>): void;
	}

	export function each<T, E>(
		arr: IterableCollection<T>,
		iterator: AsyncIterator<T, E>,
		callback?: ErrorCallback<E>
	): void;

	export function map<T, R, E>(
		arr: T[] | IterableIterator<T>,
		iterator: AsyncResultIterator<T, R, E>,
		callback?: AsyncResultArrayCallback<R, E>
	): void;
	export function map<T, R, E>(
		arr: Dictionary<T>,
		iterator: AsyncResultIterator<T, R, E>,
		callback?: AsyncResultArrayCallback<R, E>
	): void;

	export function parallel<T, E>(
		tasks: Array<AsyncFunction<T, E>>,
		callback?: AsyncResultArrayCallback<T, E>
	): void;
	export function parallel<T, E>(
		tasks: Dictionary<AsyncFunction<T, E>>,
		callback?: AsyncResultObjectCallback<T, E>
	): void;

	export const forEach: typeof each;
}

// There are no typings for @webassemblyjs/ast
declare module "@webassemblyjs/ast" {
	export function traverse(
		ast: any,
		visitor: {
			ModuleImport?: (p: NodePath<ModuleImport>) => void;
			ModuleExport?: (p: NodePath<ModuleExport>) => void;
			Start?: (p: NodePath<Start>) => void;
			Global?: (p: NodePath<Global>) => void;
		}
	);
	export class NodePath<T> {
		node: T;
	}
	export class Node {}
	export class Identifier extends Node {
		value: string;
	}
	export class Start extends Node {
		index: Identifier;
	}
	export class ModuleImport extends Node {
		module: string;
		descr: {
			type: string;
			valtype?: string;
			id?: Identifier;
			signature?: Signature;
		};
		name: string;
	}
	export class ModuleExport extends Node {
		name: string;
		descr: ModuleExportDescr;
	}
	type Index = Identifier | NumberLiteral;
	export class ModuleExportDescr extends Node {
		type: string;
		exportType: string;
		id: Index;
	}
	export class NumberLiteral extends Node {
		value: number;
		raw: string;
	}
	export class FloatLiteral extends Node {}
	export class GlobalType extends Node {
		valtype: string;
	}
	export class Global extends Node {
		init: Instruction[];
		globalType: GlobalType;
	}
	export class FuncParam extends Node {
		valtype: string;
	}
	export class Instruction extends Node {
		id: string;
		args: NumberLiteral[];
	}
	export class CallInstruction extends Instruction {}
	export class ObjectInstruction extends Instruction {}
	export class Func extends Node {
		signature: Signature;
	}
	export class Signature {
		type: "Signature";
		params: FuncParam[];
		results: string[];
	}
	export class TypeInstruction extends Node {}
	export class IndexInFuncSection extends Node {}
	export function indexLiteral(index: number): Index;
	export function numberLiteralFromRaw(num: number): NumberLiteral;
	export function floatLiteral(
		value: number,
		nan?: boolean,
		inf?: boolean,
		raw?: string
	): FloatLiteral;
	export function global(globalType: string, nodes: Node[]): Global;
	export function identifier(indentifier: string): Identifier;
	export function funcParam(valType: string, id: Identifier): FuncParam;
	export function instruction(inst: string, args: Node[]): Instruction;
	export function callInstruction(funcIndex: Index): CallInstruction;
	export function objectInstruction(
		kind: string,
		type: string,
		init: Node[]
	): ObjectInstruction;
	export function signature(params: FuncParam[], results: string[]): Signature;
	export function func(initFuncId, signature: Signature, funcBody): Func;
	export function typeInstruction(
		id: Identifier,
		functype: Signature
	): TypeInstruction;
	export function indexInFuncSection(index: Index): IndexInFuncSection;
	export function moduleExport(
		identifier: string,
		descr: ModuleExportDescr
	): ModuleExport;
	export function moduleExportDescr(
		type: string,
		index: Index
	): ModuleExportDescr;

	export function getSectionMetadata(ast: any, section: string);
	export class FuncSignature {
		args: string[];
		result: string[];
	}

	// Node matcher
	export function isGlobalType(n: Node): boolean;
	export function isTable(n: Node): boolean;
	export function isMemory(n: Node): boolean;
	export function isFuncImportDescr(n: Node): boolean;
}

// Fixes for Tapable
declare module "tapable" {
	export class Tapable {
		private _plugins: {
			[propName: string]: Tapable.Handler[];
		};

		/** @deprecated Private internals. Do not use directly */
		_pluginCompat: Hook;

		/**
		 * @deprecated Tapable.plugin is deprecated. Use new API on `.hooks` instead
		 * Register plugin(s)
		 * This acts as the same as on() of EventEmitter, for registering a handler/listener to do something when the
		 * signal/event happens.
		 *
		 * @param names a string or an array of strings to generate the id(group name) of plugins
		 * @param handler a function which provides the plugin functionality *
		 */
		plugin(names: string, handler: (this: this, ...args: any[]) => void): void;

		/** @deprecated Tapable.plugin is deprecated. Use new API on `.hooks` instead */
		plugin(
			names: string[],
			handler: (this: this, ...args: any[]) => void
		): void;

		/**
		 * @deprecated Tapable.apply is deprecated. Call apply on the plugin directly instead
		 * invoke all plugins with this attached.
		 * This method is just to "apply" plugins' definition, so that the real event listeners can be registered into
		 * registry. Mostly the `apply` method of a plugin is the main place to place extension logic.
		 */
		apply(...plugins: (((this: this) => any) | Tapable.Plugin)[]): void;

		/**
		 * @deprecated Tapable.apply is deprecated. Call apply on the plugin directly instead
		 * synchronously applies all registered handlers for target name(event id).
		 *
		 * The handlers are called with all the rest arguments.
		 *
		 * @param name - plugin group name
		 * @param args
		 */
		applyPlugins(name: string, ...args: any[]): void;

		applyPlugins0(name: string): void;

		applyPlugins1(name: string, param: any): void;

		applyPlugins2(name: string, param1: any, param2: any): void;

		/**
		 * @deprecated Tapable.apply is deprecated. Call apply on the plugin directly instead
		 * synchronously applies all registered handlers for target name(event id).
		 *
		 * The handlers are called with the return value of the previous handler and all the rest arguments.
		 *
		 * `init` is used for the first handler.
		 *
		 * return the returned value of the last handler
		 */
		applyPluginsWaterfall(name: string, init: any, ...args: any[]): any;

		/**
		 * @deprecated Tapable.apply is deprecated. Call apply on the plugin directly instead
		 * synchronously applies all registered handlers for target name(event id).
		 *
		 * The handlers are called ONLY with the return value of the previous handler.
		 *
		 * `init` is used for the first handler.
		 *
		 * return the returned value of the last handler
		 */
		applyPluginsWaterfall0(name: string, init: any): any;

		/**
		 * @deprecated Tapable.apply is deprecated. Call apply on the plugin directly instead
		 * synchronously applies all registered handlers for target name(event id).
		 *
		 * The handlers are called with all the rest arguments.
		 *
		 * If a handler returns something !== undefined, that value is returned and no more handlers will be applied.
		 */
		applyPluginsBailResult(name: string, ...args: any[]): any;

		/**
		 * @deprecated Tapable.apply is deprecated. Call apply on the plugin directly instead
		 * synchronously applies all registered handlers for target name(event id).
		 *
		 * The handlers are called with target param
		 *
		 * If a handler returns something !== undefined, the value is returned and no more handlers are applied.
		 *
		 * Note: the fundamental difference with `{@link applyPluginsBailResult}`, is that,
		 *       `{@link applyPluginsBailResult}` passes the arguments as arguments list for plugins
		 *       while `{@link applyPluginsBailResult1}` passes the arguments as single param(any type) for plugins
		 */
		applyPluginsBailResult1(name: string, param: any): any;

		/**
		 * @deprecated Tapable.apply is deprecated. Call apply on the plugin directly instead
		 * asynchronously applies all registered handlers for target name(event id).
		 *
		 * The handlers are called with all the rest arguments
		 * and a callback function with the signature (err: Error) => void.
		 *
		 * The handlers are called in series, one at a time. After all handlers are applied, callback is called.
		 *
		 * If any handler invokes the (anonymous)callback with error, no more handlers will be called
		 * and the real callback is call with that error.
		 */
		applyPluginsAsync(name: string, ...args: any[]): void;

		/**
		 * @deprecated Tapable.apply is deprecated. Call apply on the plugin directly instead
		 * same as `applyPluginsAsync`
		 * @see applyPluginsAsync
		 * @alias Tapable.applyPluginsAsync
		 * @param name
		 * @param args
		 */
		applyPluginsAsyncSeries(name: string, ...args: any[]): void;

		applyPluginsAsyncSeries1(
			name: string,
			param: any,
			callback: Tapable.CallbackFunction
		): void;

		/**
		 * @deprecated Tapable.apply is deprecated. Call apply on the plugin directly instead
		 * asynchronously applies all registered handlers for target name(event id).
		 *
		 * The handlers are called with all the rest arguments
		 * and a callback function with the signature (...params) => void.
		 *
		 * Handlers must invoke the (anonymous)callback, otherwise the series is cut down and real callback won't be
		 * invoked.
		 *
		 * The order is defined by registration order not by speed of the handler function.
		 *
		 * If a handler returns something !== undefined, that value is returned and no more handlers will be applied.
		 */
		applyPluginsAsyncSeriesBailResult(name: string, ...args: any[]): void;

		/**
		 * @deprecated Tapable.apply is deprecated. Call apply on the plugin directly instead
		 * asynchronously applies all registered handlers for target name(event id).
		 *
		 * @see applyPluginsAsyncSeriesBailResult
		 *
		 * Note: the fundamental difference with `{@link applyPluginsAsyncSeriesBailResult}`, is that,
		 *       `{@link applyPluginsAsyncSeriesBailResult}` passes the arguments as arguments list for plugins
		 *       while `{@link applyPluginsAsyncSeriesBailResult1}` passes the arguments as single param(any type)
		 *       and a callback for plugins
		 */
		applyPluginsAsyncSeriesBailResult1(
			name: string,
			param: any,
			callback: Tapable.CallbackFunction
		): void;

		/**
		 * @deprecated Tapable.apply is deprecated. Call apply on the plugin directly instead
		 * Asynchronously applies all registered handlers for target name(event id).
		 *
		 * The handlers are called with the current value and a callback function with the signature (err: Error,
		 * nextValue: any) => void.
		 *
		 * `init` is used for the first handler. The rest handles are called with the value which previous handler uses
		 * to invoke the (anonymous)callback invoked
		 *
		 * After all handlers are applied, callback is called with the last value.
		 *
		 * If any handler invokes the (anonymous)callback with error, no more handlers will be called
		 * and the real callback is call with that error.
		 */
		applyPluginsAsyncWaterfall(
			name: string,
			init: any,
			callback: Tapable.CallbackFunction
		): void;

		/**
		 * @deprecated Tapable.apply is deprecated. Call apply on the plugin directly instead
		 * applies all registered handlers for target name(event id) in parallel.
		 *
		 * The handlers are called with all the rest arguments
		 * and a callback function with the signature (err?: Error) => void.
		 *
		 * The callback function is called when all handlers call the callback without err.
		 *
		 * If any handler invokes the callback with err, callback is invoked with this error and the other handlers are
		 * skipped.
		 */
		applyPluginsParallel(name: string, ...args: any[]): void;

		/**
		 * @deprecated Tapable.apply is deprecated. Call apply on the plugin directly instead
		 * applies all registered handlers for target name(event id) in parallel.
		 *
		 * The handlers are called with all the rest arguments
		 * and a callback function with the signature (currentResult?: []) => void.
		 *
		 * Handlers must call the callback.
		 *
		 * The first result (either error or value) with is not undefined is passed to the callback.
		 *
		 * The order is defined by registration not by speed of the handler function.
		 */
		applyPluginsParallelBailResult(name: string, ...args: any[]): void;

		/**
		 * @deprecated Tapable.apply is deprecated. Call apply on the plugin directly instead
		 * applies all registered handlers for target name(event id) in parallel.
		 *
		 * @see applyPluginsParallelBailResult
		 *
		 * Note: the fundamental difference with `{@link applyPluginsParallelBailResult}`, is that,
		 *       `{@link applyPluginsParallelBailResult}` passes the arguments as arguments list for plugins
		 *       while `{@link applyPluginsParallelBailResult1}` passes the arguments as single param(any type)
		 *       and a callback for plugins
		 */
		applyPluginsParallelBailResult1(
			name: string,
			param: any,
			callback: Tapable.CallbackFunction
		): void;

		static mixin(proto: any): void;
	}

	namespace Tapable {
		interface Handler {
			(...args: any[]): void;
		}

		interface Plugin {
			apply(...args: any[]): void;
		}

		interface CallbackFunction {
			(err?: Error, result?: any, ...args: any[]): void;
		}
	}

	type TapType = "sync" | "async" | "promise";

	export interface HookCompileOptions {
		type: TapType;
	}

	export interface Tap {
		name: string;
		type: TapType;
		fn: Function;
		stage: number;
		context: boolean;
	}

	export class Hook<T1 = any, T2 = any, T3 = any> {
		constructor(...args: any[]);
		taps: any[];
		interceptors: any[];
		call: (
			arg1?: T1 | string,
			arg2?: T2 | string,
			arg3?: T3,
			...args: any[]
		) => any;
		promise: (arg1?: T1, arg2?: T2, arg3?: T3, ...args: any[]) => Promise<any>;
		callAsync: (arg1?: T1, arg2?: T2, arg3?: T3, ...args: any[]) => any;

		compile(options: HookCompileOptions): Function;
		tap: (
			name: string | Partial<Tap>,
			fn: (arg1: T1, arg2: T2, arg3: T3, ...args: any[]) => any
		) => void;
		tapAsync: (
			name: string | Tap,
			fn: (arg1: T1, arg2: T2, arg3: T3, ...args: any[]) => void
		) => void;
		tapPromise: (
			name: string | Tap,
			fn: (arg1: T1, arg2: T2, arg3: T3, ...args: any[]) => Promise<any>
		) => void;
		intercept: (interceptor: HookInterceptor) => void;
	}

	export class SyncHook<T1 = any, T2 = any, T3 = any> extends Hook<
		T1,
		T2,
		T3
	> {}
	export class SyncBailHook<T1 = any, T2 = any, T3 = any> extends Hook<
		T1,
		T2,
		T3
	> {}
	export class SyncLoopHook<T1 = any, T2 = any, T3 = any> extends Hook<
		T1,
		T2,
		T3
	> {}
	export class SyncWaterfallHook<T1 = any, T2 = any, T3 = any> extends Hook<
		T1,
		T2,
		T3
	> {}

	export class AsyncParallelHook<T1 = any, T2 = any, T3 = any> extends Hook<
		T1,
		T2,
		T3
	> {}
	export class AsyncParallelBailHook<T1 = any, T2 = any, T3 = any> extends Hook<
		T1,
		T2,
		T3
	> {}
	export class AsyncSeriesHook<T1 = any, T2 = any, T3 = any> extends Hook<
		T1,
		T2,
		T3
	> {}
	export class AsyncSeriesBailHook<T1 = any, T2 = any, T3 = any> extends Hook<
		T1,
		T2,
		T3
	> {}
	export class AsyncSeriesWaterfallHook<
		T1 = any,
		T2 = any,
		T3 = any
	> extends Hook<T1, T2, T3> {}

	export class HookInterceptor {
		call: (...args: any[]) => void;
		loop: (...args: any[]) => void;
		tap: (tap: Tap) => void;
		register: (tap: Tap) => Tap | undefined;
		context: boolean;
		name: string;
	}

	/** A HookMap is a helper class for a Map with Hooks */
	export class HookMap<T1 = any, T2 = any, T3 = any> {
		constructor(fn: () => Hook);
		get: (key: any) => Hook<T1, T2, T3> | undefined;
		for: (key: any) => Hook<T1, T2, T3>;
		tap: (
			key: any,
			name: string | Tap,
			fn: (arg1: T1, arg2: T2, arg3: T3, ...args: any[]) => any
		) => void;
		tapAsync: (
			key: any,
			name: string | Tap,
			fn: (arg1: T1, arg2: T2, arg3: T3, ...args: any[]) => void
		) => void;
		tapPromise: (
			key: any,
			name: string | Tap,
			fn: (arg1: T1, arg2: T2, arg3: T3, ...args: any[]) => Promise<any>
		) => void;
		intercept: (interceptor: HookMapInterceptor<T1, T2, T3>) => void;
	}

	export class HookMapInterceptor<T1 = any, T2 = any, T3 = any> {
		factory: (key: any, hook: Hook<T1, T2, T3>) => Hook<T1, T2, T3>;
	}

	/**
	 *  A helper Hook-like class to redirect taps to multiple other hooks
	 *
	 * ```
	 * const { MultiHook } = require("tapable");
	 *
	 * this.hooks.allHooks = new MultiHook([this.hooks.hookA, this.hooks.hookB]);
	 * ```
	 */
	export class MultiHook<T1 = any, T2 = any, T3 = any> {
		constructor(hooks: Hook[]);
		tap: (
			key: any,
			fn: (arg1: T1, arg2: T2, arg3: T3, ...args: any[]) => any
		) => void;
		tapAsync: (
			key: any,
			fn: (arg1: T1, arg2: T2, arg3: T3, ...args: any[]) => void
		) => void;
		tapPromise: (
			key: any,
			fn: (arg1: T1, arg2: T2, arg3: T3, ...args: any[]) => Promise<any>
		) => void;
		intercept: (interceptor: HookMapInterceptor<T1, T2, T3>) => void;
	}
}

/**
 * Global variable declarations
 * @todo Once this issue is resolved, remove these globals and add JSDoc onsite instead
 * https://github.com/Microsoft/TypeScript/issues/15626
 */
declare const $hash$;
declare const $requestTimeout$;
declare const installedModules;
declare const $require$;
declare const hotDownloadManifest;
declare const hotDownloadUpdateChunk;
declare const hotDisposeChunk;
declare const modules;
declare const installedChunks;
declare const hotAddUpdateChunk;
declare const parentHotUpdateCallback;
declare const $hotChunkFilename$;
declare const $hotMainFilename$;
declare const WebAssembly;
declare const importScripts;
declare const $crossOriginLoading$;
declare const chunkId;

type TODO = any;
