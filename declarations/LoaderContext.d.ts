import type { AssetInfo, Configuration } from "../lib";
import Compilation from "../lib/Compilation";
import NormalModule, { InputFileSystem } from "../lib/NormalModule";
import type { Mode } from "./WebpackOptions";

export interface LoaderContextBase {
	version: number;
	getOptions(schema: any): any;
	emitWarning(warning: Error | string): void;
	emitError(error: Error | string): void;
	getLogger(name: string): Compilation["logger"];
	resolve(context: string, request: string, callback: any): any;
	getResolve(
		options: Configuration
	): (context: string, request: string, callback: any) => Promise<any>;
	emitFile(
		name: string,
		content: string,
		sourceMap: string,
		assetInfo: AssetInfo
	): void;
	addBuildDependency(dep: string): void;
	utils: {
		absolutify: (context: string, request: string) => string;
		contextify: (context: string, request: string) => string;
	};
	rootContext: string;
	webpack: boolean;
	sourceMap: boolean;
	mode: Mode;
	_module: NormalModule;
	_compilation: Compilation;
	_compiler: Compilation.Compiler;
	fs: InputFileSystem;
}

/** The types added to LoaderContextBase by https://github.com/webpack/loader-runner */
export interface LoaderContext extends LoaderContextBase {
	/**
	 * Add a directory as dependency of the loader result.
	 */
	addContextDependency(context: string): void;

	/**
	 * Adds a file as dependency of the loader result in order to make them watchable.
	 * For example, html-loader uses this technique as it finds src and src-set attributes.
	 * Then, it sets the url's for those attributes as dependencies of the html file that is parsed.
	 */
	addDependency(file: string): void;

	addMissingDependency(context: string): void;

	/**
	 * Make this loader async.
	 */
	async(): (
		err: Error | undefined | null,
		content?: string | Buffer,
		sourceMap?: string | any
	) => void | undefined;

	/**
	 * Make this loader result cacheable. By default it's not cacheable.
	 * A cacheable loader must have a deterministic result, when inputs and dependencies haven't changed.
	 * This means the loader shouldn't have other dependencies than specified with this.addDependency.
	 * Most loaders are deterministic and cacheable.
	 */
	cacheable(flag?: boolean): void;

	callback(): void;

	/**
	 * Remove all dependencies of the loader result. Even initial dependencies and these of other loaders.
	 */
	clearDependencies(): void;

	/**
	 * The directory of the module. Can be used as context for resolving other stuff.
	 * eg '/workspaces/ts-loader/examples/vanilla/src'
	 */
	context: string;

	readonly currentRequest: string;

	readonly data: any;
	/**
	 * alias of addDependency
	 * Adds a file as dependency of the loader result in order to make them watchable.
	 * For example, html-loader uses this technique as it finds src and src-set attributes.
	 * Then, it sets the url's for those attributes as dependencies of the html file that is parsed.
	 */
	dependency(file: string): void;

	getContextDependencies(): string[];

	getDependencies(): string[];

	getMissingDependencies(): string[];

	/**
	 * The index in the loaders array of the current loader.
	 * In the example: in loader1: 0, in loader2: 1
	 */
	loaderIndex: number;

	/**
	 * Resolves the given request to a module, applies all configured loaders and calls
	 * back with the generated source, the sourceMap and the module instance (usually an
	 * instance of NormalModule). Use this function if you need to know the source code
	 * of another module to generate the result.
	 */
	loadModule(
		request: string,
		callback: (
			err: Error | null,
			source: string,
			sourceMap: any,
			module: NormalModule
		) => void
	): void;

	readonly previousRequest: any;

	readonly query: any;

	readonly remainingRequest: any;

	readonly request: any;

	/**
	 * An array of all the loaders. It is writeable in the pitch phase.
	 * loaders = [{request: string, path: string, query: string, module: function}]
	 *
	 * In the example:
	 * [
	 *   { request: "/abc/loader1.js?xyz",
	 *     path: "/abc/loader1.js",
	 *     query: "?xyz",
	 *     module: [Function]
	 *   },
	 *   { request: "/abc/node_modules/loader2/index.js",
	 *     path: "/abc/node_modules/loader2/index.js",
	 *     query: "",
	 *     module: [Function]
	 *   }
	 * ]
	 */
	loaders: { request: string }[];

	/**
	 * The resource file.
	 * In the example: "/abc/resource.js"
	 */
	resourcePath: string;
}
