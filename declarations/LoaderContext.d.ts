import type { RawSourceMap } from "../lib/NormalModule";
import type Module from "../lib/Module";
import type { validate } from "schema-utils";
import type { AssetInfo } from "../lib/Compilation";
import type { ResolveOptionsWithDependencyType } from "../lib/ResolverFactory";
import type Compilation from "../lib/Compilation";
import type Compiler from "../lib/Compiler";
import type NormalModule from "../lib/NormalModule";
import type Hash from "../lib/util/Hash";
import type { InputFileSystem } from "../lib/util/fs";
import type { Logger } from "../lib/logging/Logger";
import type {
	ImportModuleOptions,
	ImportModuleCallback,
	ExecuteModuleExports
} from "../lib/dependencies/LoaderPlugin";
import type { Resolver } from "enhanced-resolve";
import type {
	Environment,
	HashDigestLength,
	HashSalt,
	HashDigest,
	HashFunction
} from "./WebpackOptions";

type ResolveCallback = Parameters<Resolver["resolve"]>[4];
type Schema = Parameters<typeof validate>[0];

/** These properties are added by the NormalModule */
export interface NormalModuleLoaderContext<OptionsType> {
	version: number;
	/**
	 * Extracts and parses the options of the current loader.
	 * Parses string options as JSON or a query string.
	 * @returns The parsed loader options
	 */
	getOptions(): OptionsType;

	/**
	 * Extracts and parses the options of the current loader.
	 * Parses string options as JSON or a query string, and optionally validates them against a provided schema.
	 * @param schema An optional JSON schema to validate the options against
	 * @returns The parsed loader options
	 */
	getOptions(schema: Schema): OptionsType;

	/**
	 * Emits a warning for this module.
	 * The warning will be displayed to the user during compilation.
	 * @param {Error | string} warning the warning message or error object
	 */
	emitWarning(warning: Error | string): void;

	/**
	 * Emits an error for this module.
	 * The error will be displayed to the user and typically causes the compilation to fail.
	 * @param {Error | string} error the error message or error object
	 */
	emitError(error: Error | string): void;

	/**
	 * Gets a logger instance scoped to this loader and module.
	 * Useful for emitting debug or compilation information in a structured way.
	 * @param name the name or category of the logger
	 * @returns the scoped logger instance
	 */
	getLogger(name?: string): Logger;

	/**
	 * Resolves a module request (e.g., a relative path or module name) to an absolute file path.
	 * It uses Webpack's internal resolver, taking into account configured aliases and extensions.
	 * @param context The absolute path of the directory to use as the base for resolution
	 * @param request The module request string to resolve (e.g., './image.png', 'lodash')
	 * @param callback A callback function invoked with the resolved absolute path, or false if ignored
	 */
	resolve(context: string, request: string, callback: ResolveCallback): void;

	/**
	 * Creates a resolve function with specific options.
	 * The returned function can be used as a Promise-based resolver or a callback-based resolver.
	 * @param options custom resolve options
	 * @returns dual-mode resolve function
	 */
	getResolve(
		options?: ResolveOptionsWithDependencyType
	): ((context: string, request: string, callback: ResolveCallback) => void) &
		((context: string, request: string) => Promise<string>);

	/**
	 * Emits a new file (asset) to the compilation output directory.
	 * This allows loaders to generate additional files alongside the main module output.
	 * @param name the name or path of the file to emit
	 * @param content the content of the file
	 * @param sourceMap optional source map for the emitted file
	 * @param assetInfo optional metadata about the asset
	 */
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
		createHash: (algorithm?: string | typeof Hash) => Hash;
	};
	rootContext: string;
	fs: InputFileSystem;
	sourceMap?: boolean;
	mode: "development" | "production" | "none";
	webpack?: boolean;
	hashFunction: HashFunction;
	hashDigest: HashDigest;
	hashDigestLength: HashDigestLength;
	hashSalt?: HashSalt;
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
			source?: string | Buffer,
			sourceMap?: object | null,
			module?: Module
		) => void
	): void;

	importModule(
		request: string,
		options: ImportModuleOptions | undefined,
		callback: ImportModuleCallback
	): void;
	importModule(
		request: string,
		options?: ImportModuleOptions
	): Promise<ExecuteModuleExports>;
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
		type?: "commonjs" | "module" | undefined;
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

	/**
	 * Target of compilation.
	 * Example: "web"
	 */
	target: string;

	/**
	 * Tell what kind of ES-features may be used in the generated runtime-code.
	 * Example: { arrowFunction: true }
	 */
	environment: Environment;
}

type AdditionalData = {
	webpackAST: object;
	[index: string]: any;
};

type WebpackLoaderContextCallback = (
	err: undefined | null | Error,
	content?: string | Buffer,
	sourceMap?: null | string | RawSourceMap,
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
	sourceMap?: string | RawSourceMap,
	additionalData?: AdditionalData
) => string | Buffer | Promise<string | Buffer> | void;

type RawLoaderDefinitionFunction<OptionsType = {}, ContextAdditions = {}> = (
	this: LoaderContext<OptionsType> & ContextAdditions,
	content: Buffer,
	sourceMap?: string | RawSourceMap,
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
