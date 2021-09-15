import type { SourceMap } from "../lib/NormalModule";
import type { validate } from "schema-utils";
import type { AssetInfo } from "../lib/Compilation";
import type { ResolveOptionsWithDependencyType } from "../lib/ResolverFactory";
import type Compilation from "../lib/Compilation";
import type Compiler from "../lib/Compiler";
import type NormalModule from "../lib/NormalModule";
import type { InputFileSystem } from "../lib/util/fs";
import type { Logger } from "../lib/logging/Logger";
import type {
	ImportModuleCallback,
	ImportModuleOptions
} from "../lib/dependencies/LoaderPlugin";
import type { Resolver } from "enhanced-resolve";

type ResolveCallback = Parameters<Resolver["resolve"]>[4];
type Schema = Parameters<typeof validate>[0];

/** These properties are added by the NormalModule */
export interface NormalModuleLoaderContext<OptionsType> {
	version: number;
	getOptions(): OptionsType;
	getOptions(schema: Schema): OptionsType;
	emitWarning(warning: Error): void;
	emitError(error: Error): void;
	getLogger(name?: string): Logger;
	resolve(context: string, request: string, callback: ResolveCallback): any;
	getResolve(
		options?: ResolveOptionsWithDependencyType
	): ((context: string, request: string, callback: ResolveCallback) => void) &
		((context: string, request: string) => Promise<string>);
	emitFile(
		name: string,
		content: string | Buffer,
		sourceMap?: string,
		assetInfo?: AssetInfo
	): void;
	addBuildDependency(dep: string): void;
	utils: {
		absolutify: (context: string, request: string) => string;
		contextify: (context: string, request: string) => string;
	};
	rootContext: string;
	fs: InputFileSystem;
	sourceMap?: boolean;
	mode: "development" | "production" | "none";
	webpack?: boolean;
	_module?: NormalModule;
	_compilation?: Compilation;
	_compiler?: Compiler;
}

/** These properties are added by the HotModuleReplacementPlugin */
export interface HotModuleReplacementPluginLoaderContext {
	hot?: boolean;
}

/** These properties are added by the LoaderPlugin */
export interface LoaderPluginLoaderContext {
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

	importModule(
		request: string,
		options: ImportModuleOptions,
		callback: ImportModuleCallback
	): void;
	importModule(request: string, options?: ImportModuleOptions): Promise<any>;
}

/** The properties are added by https://github.com/webpack/loader-runner */
export interface LoaderRunnerLoaderContext<OptionsType> {
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
	async(): WebpackLoaderContextCallback;

	/**
	 * Make this loader result cacheable. By default it's cacheable.
	 * A cacheable loader must have a deterministic result, when inputs and dependencies haven't changed.
	 * This means the loader shouldn't have other dependencies than specified with this.addDependency.
	 * Most loaders are deterministic and cacheable.
	 */
	cacheable(flag?: boolean): void;

	callback: WebpackLoaderContextCallback;

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

	readonly previousRequest: string;

	readonly query: string | OptionsType;

	readonly remainingRequest: string;

	readonly request: string;

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
	loaders: {
		request: string;
		path: string;
		query: string;
		fragment: string;
		options: object | string | undefined;
		ident: string;
		normal: Function | undefined;
		pitch: Function | undefined;
		raw: boolean | undefined;
		data: object | undefined;
		pitchExecuted: boolean;
		normalExecuted: boolean;
	}[];

	/**
	 * The resource path.
	 * In the example: "/abc/resource.js"
	 */
	resourcePath: string;

	/**
	 * The resource query string.
	 * Example: "?query"
	 */
	resourceQuery: string;

	/**
	 * The resource fragment.
	 * Example: "#frag"
	 */
	resourceFragment: string;

	/**
	 * The resource inclusive query and fragment.
	 * Example: "/abc/resource.js?query#frag"
	 */
	resource: string;
}

type AdditionalData = {
	webpackAST: object;
	[index: string]: any;
};

type WebpackLoaderContextCallback = (
	err: Error | undefined | null,
	content?: string | Buffer,
	sourceMap?: string | SourceMap,
	additionalData?: AdditionalData
) => void;

type LoaderContext<OptionsType> = NormalModuleLoaderContext<OptionsType> &
	LoaderRunnerLoaderContext<OptionsType> &
	LoaderPluginLoaderContext &
	HotModuleReplacementPluginLoaderContext;

type PitchLoaderDefinitionFunction<OptionsType = {}, ContextAdditions = {}> = (
	this: LoaderContext<OptionsType> & ContextAdditions,
	remainingRequest: string,
	previousRequest: string,
	data: object
) => string | Buffer | Promise<string | Buffer> | void;

type LoaderDefinitionFunction<OptionsType = {}, ContextAdditions = {}> = (
	this: LoaderContext<OptionsType> & ContextAdditions,
	content: string,
	sourceMap?: string | SourceMap,
	additionalData?: AdditionalData
) => string | Buffer | Promise<string | Buffer> | void;

type RawLoaderDefinitionFunction<OptionsType = {}, ContextAdditions = {}> = (
	this: LoaderContext<OptionsType> & ContextAdditions,
	content: Buffer,
	sourceMap?: string | SourceMap,
	additionalData?: AdditionalData
) => string | Buffer | Promise<string | Buffer> | void;

export type LoaderDefinition<
	OptionsType = {},
	ContextAdditions = {}
> = LoaderDefinitionFunction<OptionsType, ContextAdditions> & {
	raw?: false;
	pitch?: PitchLoaderDefinitionFunction<OptionsType, ContextAdditions>;
};

export type RawLoaderDefinition<
	OptionsType = {},
	ContextAdditions = {}
> = RawLoaderDefinitionFunction<OptionsType, ContextAdditions> & {
	raw: true;
	pitch?: PitchLoaderDefinitionFunction<OptionsType, ContextAdditions>;
};

export interface LoaderModule<OptionsType = {}, ContextAdditions = {}> {
	default?:
		| RawLoaderDefinitionFunction<OptionsType, ContextAdditions>
		| LoaderDefinitionFunction<OptionsType, ContextAdditions>;
	raw?: false;
	pitch?: PitchLoaderDefinitionFunction<OptionsType, ContextAdditions>;
}
