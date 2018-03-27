declare module '*.json';
declare module 'webpack-cli';
declare module 'tapable' {
	// Type definitions for tapable v1.0.0
	// Project: https://github.com/webpack/tapable.git
	// Definitions by: e-cloud <https://github.com/e-cloud>
	// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
	// TypeScript Version: 2.3

	export abstract class Tapable {
		private _plugins: {
			[propName: string]: Tapable.Handler[]
		}

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
		plugin(names: string[], handler: (this: this, ...args: any[]) => void): void;

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
		applyPlugins: (name: string, ...args: any[]) => void;

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

		applyPluginsAsyncSeries1(name: string, param: any, callback: Tapable.CallbackFunction): void

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
		applyPluginsAsyncSeriesBailResult1(name: string, param: any, callback: Tapable.CallbackFunction): void;

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
		applyPluginsAsyncWaterfall(name: string, init: any, callback: Tapable.CallbackFunction): void;

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
		applyPluginsParallelBailResult1(name: string, param: any, callback: Tapable.CallbackFunction): void;

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
		call: (arg1?: T1, arg2?: T2, arg3?: T3, ...args: any[]) => any;
		promise: (arg1?: T1, arg2?: T2, arg3?: T3, ...args: any[]) => Promise<any>;
		callAsync: (arg1?: T1, arg2?: T2, arg3?: T3, ...args: any[]) => any;

		compile(options: HookCompileOptions): Function;
		tap: (name: string | Tap, fn: (arg1: T1, arg2: T2, arg3: T3, ...args: any[]) => any) => void;
		tapAsync: (name: string | Tap, fn: (arg1: T1, arg2: T2, arg3: T3, ...args: any[]) => void) => void;
		tapPromise: (name: string | Tap, fn: (arg1: T1, arg2: T2, arg3: T3, ...args: any[]) => Promise<any>) => void;
		intercept: (interceptor: HookInterceptor) => void;
	}

	export class SyncHook<T1 = any, T2 = any, T3 = any> extends Hook<T1, T2, T3> { }
	export class SyncBailHook<T1 = any, T2 = any, T3 = any> extends Hook<T1, T2, T3> { }
	export class SyncLoopHook<T1 = any, T2 = any, T3 = any> extends Hook<T1, T2, T3> { }
	export class SyncWaterfallHook<T1 = any, T2 = any, T3 = any> extends Hook<T1, T2, T3> { }

	export class AsyncParallelHook<T1 = any, T2 = any, T3 = any> extends Hook<T1, T2, T3> { }
	export class AsyncParallelBailHook<T1 = any, T2 = any, T3 = any> extends Hook<T1, T2, T3> { }
	export class AsyncSeriesHook<T1 = any, T2 = any, T3 = any> extends Hook<T1, T2, T3> { }
	export class AsyncSeriesBailHook<T1 = any, T2 = any, T3 = any> extends Hook<T1, T2, T3> { }
	export class AsyncSeriesWaterfallHook<T1 = any, T2 = any, T3 = any> extends Hook<T1, T2, T3> { }

	export class MultiHook {
		constructor(hooks: Hook[])
	}

	export class HookInterceptor {
		call: (...args: any[]) => void;
		loop: (...args: any[]) => void;
		tap: (tap: Tap) => void;
		register: (tap: Tap) => Tap | undefined;
		context: boolean;
	}

	export class HookMap<T1 = any, T2 = any, T3 = any> {
		constructor(fn: () => SyncHook);
		get: (key: any) => Hook<T1, T2, T3> | undefined;
		for: (key: any) => Hook<T1, T2, T3>;
		tap: (key: any, name: string | Tap, fn: (arg1: T1, arg2: T2, arg3: T3, ...args: any[]) => any) => void;
		tapAsync: (key: any, name: string | Tap, fn: (arg1: T1, arg2: T2, arg3: T3, ...args: any[]) => void) => void;
		tapPromise: (key: any, name: string | Tap, fn: (arg1: T1, arg2: T2, arg3: T3, ...args: any[]) => Promise<any>) => void;
		intercept: (interceptor: HookMapInterceptor<T1, T2, T3>) => void;
	}

	export class HookMapInterceptor<T1 = any, T2 = any, T3 = any> {
		factory: (key: any, hook: Hook<T1, T2, T3>) => Hook<T1, T2, T3>;
	}
}
// Globals
declare const $hash$;
declare const $requestTimeout$;
declare const installedModules;
declare const $require$;
declare const hotDownloadManifest;
declare const hotDownloadUpdateChunk;
declare const hotDisposeChunk;
declare const modules;
declare const installedChunks
declare const hotAddUpdateChunk
declare const parentHotUpdateCallback
declare const $hotChunkFilename$
declare const $hotMainFilename$
declare const $WebAssembly
declare const WebAssembly
declare const importScripts
declare const $crossOriginLoading$;
declare const chunkId;
