/*
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn special-lint-fix` to update
 */

import { Buffer } from "buffer";
import {
	ArrayExpression,
	ArrayPattern,
	ArrowFunctionExpression,
	AssignmentExpression,
	AssignmentPattern,
	AssignmentProperty,
	AwaitExpression,
	BigIntLiteral,
	BinaryExpression,
	BlockStatement,
	BreakStatement,
	CatchClause,
	ChainExpression,
	ClassBody,
	ClassDeclaration,
	ClassExpression,
	Comment,
	ConditionalExpression,
	ContinueStatement,
	DebuggerStatement,
	DoWhileStatement,
	EmptyStatement,
	ExportAllDeclaration,
	ExportDefaultDeclaration,
	ExportNamedDeclaration,
	ExportSpecifier,
	ExpressionStatement,
	ForInStatement,
	ForOfStatement,
	ForStatement,
	FunctionDeclaration,
	FunctionExpression,
	Identifier,
	IfStatement,
	ImportDeclaration,
	ImportDefaultSpecifier,
	ImportExpression,
	ImportNamespaceSpecifier,
	ImportSpecifier,
	LabeledStatement,
	LogicalExpression,
	MemberExpression,
	MetaProperty,
	MethodDefinition,
	NewExpression,
	ObjectExpression,
	ObjectPattern,
	PrivateIdentifier,
	Program,
	Property,
	PropertyDefinition,
	RegExpLiteral,
	RestElement,
	ReturnStatement,
	SequenceExpression,
	SimpleCallExpression,
	SimpleLiteral,
	SpreadElement,
	StaticBlock,
	Super,
	SwitchCase,
	SwitchStatement,
	TaggedTemplateExpression,
	TemplateElement,
	TemplateLiteral,
	ThisExpression,
	ThrowStatement,
	TryStatement,
	UnaryExpression,
	UpdateExpression,
	VariableDeclaration,
	VariableDeclarator,
	WhileStatement,
	WithStatement,
	YieldExpression
} from "estree";
import { ServerOptions as ServerOptionsImport } from "http";
import { ListenOptions, Server } from "net";
import { validate as validateFunction } from "schema-utils";
import { default as ValidationError } from "schema-utils/declarations/ValidationError";
import { ValidationErrorConfiguration } from "schema-utils/declarations/validate";
import {
	AsArray,
	AsyncParallelHook,
	AsyncSeriesBailHook,
	AsyncSeriesHook,
	AsyncSeriesWaterfallHook,
	HookMap,
	MultiHook,
	SyncBailHook,
	SyncHook,
	SyncWaterfallHook
} from "tapable";
import { SecureContextOptions, TlsOptions } from "tls";

declare class AbstractLibraryPlugin<T> {
	constructor(__0: {
		/**
		 * name of the plugin
		 */
		pluginName: string;
		/**
		 * used library type
		 */
		type: string;
	});

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
	parseOptions(library: LibraryOptions): false | T;
	finishEntryModule(
		module: Module,
		entryName: string,
		libraryContext: LibraryContext<T>
	): void;
	embedInRuntimeBailout(
		module: Module,
		renderContext: RenderContext,
		libraryContext: LibraryContext<T>
	): undefined | string;
	strictRuntimeBailout(
		renderContext: RenderContext,
		libraryContext: LibraryContext<T>
	): undefined | string;
	runtimeRequirements(
		chunk: Chunk,
		set: Set<string>,
		libraryContext: LibraryContext<T>
	): void;
	render(
		source: Source,
		renderContext: RenderContext,
		libraryContext: LibraryContext<T>
	): Source;
	renderStartup(
		source: Source,
		module: Module,
		renderContext: StartupRenderContext,
		libraryContext: LibraryContext<T>
	): Source;
	chunkHash(
		chunk: Chunk,
		hash: Hash,
		chunkHashContext: ChunkHashContext,
		libraryContext: LibraryContext<T>
	): void;
	static COMMON_LIBRARY_NAME_MESSAGE: string;
}
declare interface AdditionalData {
	[index: string]: any;
	webpackAST: object;
}
declare class AggressiveMergingPlugin {
	constructor(options?: any);
	options: any;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare class AggressiveSplittingPlugin {
	constructor(options?: AggressiveSplittingPluginOptions);
	options: AggressiveSplittingPluginOptions;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
	static wasChunkRecorded(chunk: Chunk): boolean;
}
declare interface AggressiveSplittingPluginOptions {
	/**
	 * Extra cost for each chunk (Default: 9.8kiB).
	 */
	chunkOverhead?: number;

	/**
	 * Extra cost multiplicator for entry chunks (Default: 10).
	 */
	entryChunkMultiplicator?: number;

	/**
	 * Byte, max size of per file (Default: 50kiB).
	 */
	maxSize?: number;

	/**
	 * Byte, split point. (Default: 30kiB).
	 */
	minSize?: number;
}
declare interface AliasOption {
	alias: string | false | string[];
	name: string;
	onlyModule?: boolean;
}
type AliasOptionNewRequest = string | false | string[];
declare interface AliasOptions {
	[index: string]: AliasOptionNewRequest;
}
declare interface Argument {
	description: string;
	simpleType: "string" | "number" | "boolean";
	multiple: boolean;
	configs: ArgumentConfig[];
}
declare interface ArgumentConfig {
	description: string;
	negatedDescription?: string;
	path: string;
	multiple: boolean;
	type: "string" | "number" | "boolean" | "path" | "enum" | "RegExp" | "reset";
	values?: any[];
}
declare interface Asset {
	/**
	 * the filename of the asset
	 */
	name: string;

	/**
	 * source of the asset
	 */
	source: Source;

	/**
	 * info about the asset
	 */
	info: AssetInfo;
}
declare interface AssetEmittedInfo {
	content: Buffer;
	source: Source;
	compilation: Compilation;
	outputPath: string;
	targetPath: string;
}
type AssetFilterItemTypes =
	| string
	| RegExp
	| ((name: string, asset: StatsAsset) => boolean);

/**
 * Options object for data url generation.
 */
declare interface AssetGeneratorDataUrlOptions {
	/**
	 * Asset encoding (defaults to base64).
	 */
	encoding?: false | "base64";

	/**
	 * Asset mimetype (getting from file extension by default).
	 */
	mimetype?: string;
}
type AssetGeneratorOptions = AssetInlineGeneratorOptions &
	AssetResourceGeneratorOptions;
type AssetInfo = KnownAssetInfo & Record<string, any>;

/**
 * Generator options for asset/inline modules.
 */
declare interface AssetInlineGeneratorOptions {
	/**
	 * The options for data url generator.
	 */
	dataUrl?:
		| AssetGeneratorDataUrlOptions
		| ((
				source: string | Buffer,
				context: { filename: string; module: Module }
		  ) => string);
}

/**
 * Options object for DataUrl condition.
 */
declare interface AssetParserDataUrlOptions {
	/**
	 * Maximum size of asset that should be inline as modules. Default: 8kb.
	 */
	maxSize?: number;
}

/**
 * Parser options for asset modules.
 */
declare interface AssetParserOptions {
	/**
	 * The condition for inlining the asset as DataUrl.
	 */
	dataUrlCondition?:
		| AssetParserDataUrlOptions
		| ((
				source: string | Buffer,
				context: { filename: string; module: Module }
		  ) => boolean);
}

/**
 * Generator options for asset/resource modules.
 */
declare interface AssetResourceGeneratorOptions {
	/**
	 * Emit an output asset from this asset module. This can be set to 'false' to omit emitting e. g. for SSR.
	 */
	emit?: boolean;

	/**
	 * Specifies the filename template of output files on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
	 */
	filename?: string | ((pathData: PathData, assetInfo?: AssetInfo) => string);

	/**
	 * Emit the asset in the specified folder relative to 'output.path'. This should only be needed when custom 'publicPath' is specified to match the folder structure there.
	 */
	outputPath?: string | ((pathData: PathData, assetInfo?: AssetInfo) => string);

	/**
	 * The 'publicPath' specifies the public URL address of the output files when referenced in a browser.
	 */
	publicPath?: string | ((pathData: PathData, assetInfo?: AssetInfo) => string);
}
declare class AsyncDependenciesBlock extends DependenciesBlock {
	constructor(
		groupOptions: RawChunkGroupOptions & { name?: string } & {
			entryOptions?: EntryOptions;
		},
		loc?: SyntheticDependencyLocation | RealDependencyLocation,
		request?: string
	);
	groupOptions: RawChunkGroupOptions & { name?: string } & {
		entryOptions?: EntryOptions;
	};
	loc?: SyntheticDependencyLocation | RealDependencyLocation;
	request?: string;
	chunkName: string;
	module: any;
}
declare abstract class AsyncQueue<T, K, R> {
	hooks: {
		beforeAdd: AsyncSeriesHook<[T]>;
		added: SyncHook<[T]>;
		beforeStart: AsyncSeriesHook<[T]>;
		started: SyncHook<[T]>;
		result: SyncHook<[T, Error, R]>;
	};
	add(item: T, callback: CallbackAsyncQueue<R>): void;
	invalidate(item: T): void;

	/**
	 * Waits for an already started item
	 */
	waitFor(item: T, callback: CallbackAsyncQueue<R>): void;
	stop(): void;
	increaseParallelism(): void;
	decreaseParallelism(): void;
	isProcessing(item: T): boolean;
	isQueued(item: T): boolean;
	isDone(item: T): boolean;
	clear(): void;
}
declare class AsyncWebAssemblyModulesPlugin {
	constructor(options?: any);
	options: any;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
	renderModule(module?: any, renderContext?: any, hooks?: any): any;
	static getCompilationHooks(
		compilation: Compilation
	): CompilationHooksAsyncWebAssemblyModulesPlugin;
}
declare class AutomaticPrefetchPlugin {
	constructor();

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
type AuxiliaryComment = string | LibraryCustomUmdCommentObject;
declare interface BackendApi {
	dispose: (arg0?: Error) => void;
	module: (arg0: Module) => { client: string; data: string; active: boolean };
}
declare class BannerPlugin {
	constructor(options: BannerPluginArgument);
	options: BannerPluginOptions;
	banner: (data: { hash: string; chunk: Chunk; filename: string }) => string;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
type BannerPluginArgument =
	| string
	| BannerPluginOptions
	| ((data: { hash: string; chunk: Chunk; filename: string }) => string);
declare interface BannerPluginOptions {
	/**
	 * Specifies the banner.
	 */
	banner:
		| string
		| ((data: { hash: string; chunk: Chunk; filename: string }) => string);

	/**
	 * If true, the banner will only be added to the entry chunks.
	 */
	entryOnly?: boolean;

	/**
	 * Exclude all modules matching any of these conditions.
	 */
	exclude?: string | RegExp | Rule[];

	/**
	 * If true, banner will be placed at the end of the output.
	 */
	footer?: boolean;

	/**
	 * Include all modules matching any of these conditions.
	 */
	include?: string | RegExp | Rule[];

	/**
	 * If true, banner will not be wrapped in a comment.
	 */
	raw?: boolean;

	/**
	 * Include all modules that pass test assertion.
	 */
	test?: string | RegExp | Rule[];
}
declare interface BaseResolveRequest {
	path: string | false;
	descriptionFilePath?: string;
	descriptionFileRoot?: string;
	descriptionFileData?: object;
	relativePath?: string;
	ignoreSymlinks?: boolean;
	fullySpecified?: boolean;
}
declare abstract class BasicEvaluatedExpression {
	type: number;
	range: [number, number];
	falsy: boolean;
	truthy: boolean;
	nullish?: boolean;
	sideEffects: boolean;
	bool?: boolean;
	number?: number;
	bigint?: bigint;
	regExp?: RegExp;
	string?: string;
	quasis?: BasicEvaluatedExpression[];
	parts?: BasicEvaluatedExpression[];
	array?: any[];
	items?: BasicEvaluatedExpression[];
	options?: BasicEvaluatedExpression[];
	prefix?: BasicEvaluatedExpression;
	postfix?: BasicEvaluatedExpression;
	wrappedInnerExpressions: any;
	identifier?: string | VariableInfoInterface;
	rootInfo: VariableInfoInterface;
	getMembers: () => string[];
	getMembersOptionals: () => boolean[];
	expression: NodeEstreeIndex;
	isUnknown(): boolean;
	isNull(): boolean;
	isUndefined(): boolean;
	isString(): boolean;
	isNumber(): boolean;
	isBigInt(): boolean;
	isBoolean(): boolean;
	isRegExp(): boolean;
	isConditional(): boolean;
	isArray(): boolean;
	isConstArray(): boolean;
	isIdentifier(): boolean;
	isWrapped(): boolean;
	isTemplateString(): boolean;

	/**
	 * Is expression a primitive or an object type value?
	 */
	isPrimitiveType(): undefined | boolean;

	/**
	 * Is expression a runtime or compile-time value?
	 */
	isCompileTimeValue(): boolean;

	/**
	 * Gets the compile-time value of the expression
	 */
	asCompileTimeValue(): any;
	isTruthy(): boolean;
	isFalsy(): boolean;
	isNullish(): undefined | boolean;

	/**
	 * Can this expression have side effects?
	 */
	couldHaveSideEffects(): boolean;
	asBool(): any;
	asNullish(): undefined | boolean;
	asString(): any;
	setString(string?: any): BasicEvaluatedExpression;
	setUndefined(): BasicEvaluatedExpression;
	setNull(): BasicEvaluatedExpression;
	setNumber(number?: any): BasicEvaluatedExpression;
	setBigInt(bigint?: any): BasicEvaluatedExpression;
	setBoolean(bool?: any): BasicEvaluatedExpression;
	setRegExp(regExp?: any): BasicEvaluatedExpression;
	setIdentifier(
		identifier?: any,
		rootInfo?: any,
		getMembers?: any,
		getMembersOptionals?: any
	): BasicEvaluatedExpression;
	setWrapped(
		prefix?: any,
		postfix?: any,
		innerExpressions?: any
	): BasicEvaluatedExpression;
	setOptions(options?: any): BasicEvaluatedExpression;
	addOptions(options?: any): BasicEvaluatedExpression;
	setItems(items?: any): BasicEvaluatedExpression;
	setArray(array?: any): BasicEvaluatedExpression;
	setTemplateString(
		quasis?: any,
		parts?: any,
		kind?: any
	): BasicEvaluatedExpression;
	templateStringKind: any;
	setTruthy(): BasicEvaluatedExpression;
	setFalsy(): BasicEvaluatedExpression;
	setNullish(value?: any): BasicEvaluatedExpression;
	setRange(range?: any): BasicEvaluatedExpression;
	setSideEffects(sideEffects?: boolean): BasicEvaluatedExpression;
	setExpression(expression?: any): BasicEvaluatedExpression;
}
type BuildMeta = KnownBuildMeta & Record<string, any>;
declare abstract class ByTypeGenerator extends Generator {
	map: any;
}
declare const CIRCULAR_CONNECTION: unique symbol;
declare class Cache {
	constructor();
	hooks: {
		get: AsyncSeriesBailHook<
			[
				string,
				null | Etag,
				((result: any, callback: (arg0?: Error) => void) => void)[]
			],
			any
		>;
		store: AsyncParallelHook<[string, null | Etag, any]>;
		storeBuildDependencies: AsyncParallelHook<[Iterable<string>]>;
		beginIdle: SyncHook<[]>;
		endIdle: AsyncParallelHook<[]>;
		shutdown: AsyncParallelHook<[]>;
	};
	get<T>(
		identifier: string,
		etag: null | Etag,
		callback: CallbackCache<T>
	): void;
	store<T>(
		identifier: string,
		etag: null | Etag,
		data: T,
		callback: CallbackCache<void>
	): void;

	/**
	 * After this method has succeeded the cache can only be restored when build dependencies are
	 */
	storeBuildDependencies(
		dependencies: Iterable<string>,
		callback: CallbackCache<void>
	): void;
	beginIdle(): void;
	endIdle(callback: CallbackCache<void>): void;
	shutdown(callback: CallbackCache<void>): void;
	static STAGE_MEMORY: number;
	static STAGE_DEFAULT: number;
	static STAGE_DISK: number;
	static STAGE_NETWORK: number;
}
declare abstract class CacheFacade {
	getChildCache(name: string): CacheFacade;
	getItemCache(identifier: string, etag: null | Etag): ItemCacheFacade;
	getLazyHashedEtag(obj: HashableObject): Etag;
	mergeEtags(a: Etag, b: Etag): Etag;
	get<T>(
		identifier: string,
		etag: null | Etag,
		callback: CallbackCache<T>
	): void;
	getPromise<T>(identifier: string, etag: null | Etag): Promise<T>;
	store<T>(
		identifier: string,
		etag: null | Etag,
		data: T,
		callback: CallbackCache<void>
	): void;
	storePromise<T>(
		identifier: string,
		etag: null | Etag,
		data: T
	): Promise<void>;
	provide<T>(
		identifier: string,
		etag: null | Etag,
		computer: (arg0: CallbackNormalErrorCache<T>) => void,
		callback: CallbackNormalErrorCache<T>
	): void;
	providePromise<T>(
		identifier: string,
		etag: null | Etag,
		computer: () => T | Promise<T>
	): Promise<T>;
}
declare interface CacheGroupSource {
	key?: string;
	priority?: number;
	getName?: (
		module?: Module,
		chunks?: Chunk[],
		key?: string
	) => undefined | string;
	chunksFilter?: (chunk: Chunk) => boolean;
	enforce?: boolean;
	minSize: SplitChunksSizes;
	minSizeReduction: SplitChunksSizes;
	minRemainingSize: SplitChunksSizes;
	enforceSizeThreshold: SplitChunksSizes;
	maxAsyncSize: SplitChunksSizes;
	maxInitialSize: SplitChunksSizes;
	minChunks?: number;
	maxAsyncRequests?: number;
	maxInitialRequests?: number;
	filename?: string | ((arg0: PathData, arg1?: AssetInfo) => string);
	idHint?: string;
	automaticNameDelimiter: string;
	reuseExistingChunk?: boolean;
	usedExports?: boolean;
}
declare interface CacheGroupsContext {
	moduleGraph: ModuleGraph;
	chunkGraph: ChunkGraph;
}
type CacheOptionsNormalized = false | FileCacheOptions | MemoryCacheOptions;
declare class CachedSource extends Source {
	constructor(source: Source);
	constructor(source: Source | (() => Source), cachedData?: any);
	original(): Source;
	originalLazy(): Source | (() => Source);
	getCachedData(): any;
}
type CallExpression = SimpleCallExpression | NewExpression;
declare interface CallExpressionInfo {
	type: "call";
	call: CallExpression;
	calleeName: string;
	rootInfo: string | VariableInfo;
	getCalleeMembers: () => string[];
	name: string;
	getMembers: () => string[];
	getMembersOptionals: () => boolean[];
}
declare interface CallbackAsyncQueue<T> {
	(err?: null | WebpackError, result?: T): any;
}
declare interface CallbackCache<T> {
	(err?: null | WebpackError, result?: T): void;
}
declare interface CallbackFunction<T> {
	(err?: null | Error, result?: T): any;
}
declare interface CallbackNormalErrorCache<T> {
	(err?: null | Error, result?: T): void;
}
declare interface CallbackWebpack<T> {
	(err?: Error, stats?: T): void;
}
type Cell<T> = undefined | T;
declare class Chunk {
	constructor(name?: string, backCompat?: boolean);
	id: null | string | number;
	ids: null | (string | number)[];
	debugId: number;
	name: string;
	idNameHints: SortableSet<string>;
	preventIntegration: boolean;
	filenameTemplate:
		| null
		| string
		| ((arg0: PathData, arg1?: AssetInfo) => string);
	cssFilenameTemplate:
		| null
		| string
		| ((arg0: PathData, arg1?: AssetInfo) => string);
	runtime: RuntimeSpec;
	files: Set<string>;
	auxiliaryFiles: Set<string>;
	rendered: boolean;
	hash?: string;
	contentHash: Record<string, string>;
	renderedHash?: string;
	chunkReason?: string;
	extraAsync: boolean;
	get entryModule(): Module;
	hasEntryModule(): boolean;
	addModule(module: Module): boolean;
	removeModule(module: Module): void;
	getNumberOfModules(): number;
	get modulesIterable(): Iterable<Module>;
	compareTo(otherChunk: Chunk): 0 | 1 | -1;
	containsModule(module: Module): boolean;
	getModules(): Module[];
	remove(): void;
	moveModule(module: Module, otherChunk: Chunk): void;
	integrate(otherChunk: Chunk): boolean;
	canBeIntegrated(otherChunk: Chunk): boolean;
	isEmpty(): boolean;
	modulesSize(): number;
	size(options?: ChunkSizeOptions): number;
	integratedSize(otherChunk: Chunk, options: ChunkSizeOptions): number;
	getChunkModuleMaps(filterFn: (m: Module) => boolean): ChunkModuleMaps;
	hasModuleInGraph(
		filterFn: (m: Module) => boolean,
		filterChunkFn?: (c: Chunk, chunkGraph: ChunkGraph) => boolean
	): boolean;
	getChunkMaps(realHash: boolean): ChunkMaps;
	hasRuntime(): boolean;
	canBeInitial(): boolean;
	isOnlyInitial(): boolean;
	getEntryOptions(): undefined | EntryOptions;
	addGroup(chunkGroup: ChunkGroup): void;
	removeGroup(chunkGroup: ChunkGroup): void;
	isInGroup(chunkGroup: ChunkGroup): boolean;
	getNumberOfGroups(): number;
	get groupsIterable(): Iterable<ChunkGroup>;
	disconnectFromGroups(): void;
	split(newChunk: Chunk): void;
	updateHash(hash: Hash, chunkGraph: ChunkGraph): void;
	getAllAsyncChunks(): Set<Chunk>;
	getAllInitialChunks(): Set<Chunk>;
	getAllReferencedChunks(): Set<Chunk>;
	getAllReferencedAsyncEntrypoints(): Set<Entrypoint>;
	hasAsyncChunks(): boolean;
	getChildIdsByOrders(
		chunkGraph: ChunkGraph,
		filterFn?: (c: Chunk, chunkGraph: ChunkGraph) => boolean
	): Record<string, (string | number)[]>;
	getChildrenOfTypeInOrder(
		chunkGraph: ChunkGraph,
		type: string
	): { onChunks: Chunk[]; chunks: Set<Chunk> }[];
	getChildIdsByOrdersMap(
		chunkGraph: ChunkGraph,
		includeDirectChildren?: boolean,
		filterFn?: (c: Chunk, chunkGraph: ChunkGraph) => boolean
	): Record<string | number, Record<string, (string | number)[]>>;
}
declare class ChunkGraph {
	constructor(moduleGraph: ModuleGraph, hashFunction?: string | typeof Hash);
	moduleGraph: ModuleGraph;
	connectChunkAndModule(chunk: Chunk, module: Module): void;
	disconnectChunkAndModule(chunk: Chunk, module: Module): void;
	disconnectChunk(chunk: Chunk): void;
	attachModules(chunk: Chunk, modules: Iterable<Module>): void;
	attachRuntimeModules(chunk: Chunk, modules: Iterable<RuntimeModule>): void;
	attachFullHashModules(chunk: Chunk, modules: Iterable<RuntimeModule>): void;
	attachDependentHashModules(
		chunk: Chunk,
		modules: Iterable<RuntimeModule>
	): void;
	replaceModule(oldModule: Module, newModule: Module): void;
	isModuleInChunk(module: Module, chunk: Chunk): boolean;
	isModuleInChunkGroup(module: Module, chunkGroup: ChunkGroup): boolean;
	isEntryModule(module: Module): boolean;
	getModuleChunksIterable(module: Module): Iterable<Chunk>;
	getOrderedModuleChunksIterable(
		module: Module,
		sortFn: (arg0: Chunk, arg1: Chunk) => 0 | 1 | -1
	): Iterable<Chunk>;
	getModuleChunks(module: Module): Chunk[];
	getNumberOfModuleChunks(module: Module): number;
	getModuleRuntimes(module: Module): RuntimeSpecSet;
	getNumberOfChunkModules(chunk: Chunk): number;
	getNumberOfChunkFullHashModules(chunk: Chunk): number;
	getChunkModulesIterable(chunk: Chunk): Iterable<Module>;
	getChunkModulesIterableBySourceType(
		chunk: Chunk,
		sourceType: string
	): undefined | Iterable<Module>;
	setChunkModuleSourceTypes(
		chunk: Chunk,
		module: Module,
		sourceTypes: Set<string>
	): void;
	getChunkModuleSourceTypes(chunk: Chunk, module: Module): Set<string>;
	getModuleSourceTypes(module: Module): Set<string>;
	getOrderedChunkModulesIterable(
		chunk: Chunk,
		comparator: (arg0: Module, arg1: Module) => 0 | 1 | -1
	): Iterable<Module>;
	getOrderedChunkModulesIterableBySourceType(
		chunk: Chunk,
		sourceType: string,
		comparator: (arg0: Module, arg1: Module) => 0 | 1 | -1
	): undefined | Iterable<Module>;
	getChunkModules(chunk: Chunk): Module[];
	getOrderedChunkModules(
		chunk: Chunk,
		comparator: (arg0: Module, arg1: Module) => 0 | 1 | -1
	): Module[];
	getChunkModuleIdMap(
		chunk: Chunk,
		filterFn: (m: Module) => boolean,
		includeAllChunks?: boolean
	): Record<string | number, (string | number)[]>;
	getChunkModuleRenderedHashMap(
		chunk: Chunk,
		filterFn: (m: Module) => boolean,
		hashLength?: number,
		includeAllChunks?: boolean
	): Record<string | number, Record<string | number, string>>;
	getChunkConditionMap(
		chunk: Chunk,
		filterFn: (c: Chunk, chunkGraph: ChunkGraph) => boolean
	): Record<string | number, boolean>;
	hasModuleInGraph(
		chunk: Chunk,
		filterFn: (m: Module) => boolean,
		filterChunkFn?: (c: Chunk, chunkGraph: ChunkGraph) => boolean
	): boolean;
	compareChunks(chunkA: Chunk, chunkB: Chunk): 0 | 1 | -1;
	getChunkModulesSize(chunk: Chunk): number;
	getChunkModulesSizes(chunk: Chunk): Record<string, number>;
	getChunkRootModules(chunk: Chunk): Module[];
	getChunkSize(chunk: Chunk, options?: ChunkSizeOptions): number;
	getIntegratedChunksSize(
		chunkA: Chunk,
		chunkB: Chunk,
		options?: ChunkSizeOptions
	): number;
	canChunksBeIntegrated(chunkA: Chunk, chunkB: Chunk): boolean;
	integrateChunks(chunkA: Chunk, chunkB: Chunk): void;
	upgradeDependentToFullHashModules(chunk: Chunk): void;
	isEntryModuleInChunk(module: Module, chunk: Chunk): boolean;
	connectChunkAndEntryModule(
		chunk: Chunk,
		module: Module,
		entrypoint?: Entrypoint
	): void;
	connectChunkAndRuntimeModule(chunk: Chunk, module: RuntimeModule): void;
	addFullHashModuleToChunk(chunk: Chunk, module: RuntimeModule): void;
	addDependentHashModuleToChunk(chunk: Chunk, module: RuntimeModule): void;
	disconnectChunkAndEntryModule(chunk: Chunk, module: Module): void;
	disconnectChunkAndRuntimeModule(chunk: Chunk, module: RuntimeModule): void;
	disconnectEntryModule(module: Module): void;
	disconnectEntries(chunk: Chunk): void;
	getNumberOfEntryModules(chunk: Chunk): number;
	getNumberOfRuntimeModules(chunk: Chunk): number;
	getChunkEntryModulesIterable(chunk: Chunk): Iterable<Module>;
	getChunkEntryDependentChunksIterable(chunk: Chunk): Iterable<Chunk>;
	hasChunkEntryDependentChunks(chunk: Chunk): boolean;
	getChunkRuntimeModulesIterable(chunk: Chunk): Iterable<RuntimeModule>;
	getChunkRuntimeModulesInOrder(chunk: Chunk): RuntimeModule[];
	getChunkFullHashModulesIterable(
		chunk: Chunk
	): undefined | Iterable<RuntimeModule>;
	getChunkFullHashModulesSet(
		chunk: Chunk
	): undefined | ReadonlySet<RuntimeModule>;
	getChunkDependentHashModulesIterable(
		chunk: Chunk
	): undefined | Iterable<RuntimeModule>;
	getChunkEntryModulesWithChunkGroupIterable(
		chunk: Chunk
	): Iterable<[Module, undefined | Entrypoint]>;
	getBlockChunkGroup(depBlock: AsyncDependenciesBlock): ChunkGroup;
	connectBlockAndChunkGroup(
		depBlock: AsyncDependenciesBlock,
		chunkGroup: ChunkGroup
	): void;
	disconnectChunkGroup(chunkGroup: ChunkGroup): void;
	getModuleId(module: Module): string | number;
	setModuleId(module: Module, id: string | number): void;
	getRuntimeId(runtime: string): string | number;
	setRuntimeId(runtime: string, id: string | number): void;
	hasModuleHashes(module: Module, runtime: RuntimeSpec): boolean;
	getModuleHash(module: Module, runtime: RuntimeSpec): string;
	getRenderedModuleHash(module: Module, runtime: RuntimeSpec): string;
	setModuleHashes(
		module: Module,
		runtime: RuntimeSpec,
		hash: string,
		renderedHash: string
	): void;
	addModuleRuntimeRequirements(
		module: Module,
		runtime: RuntimeSpec,
		items: Set<string>,
		transferOwnership?: boolean
	): void;
	addChunkRuntimeRequirements(chunk: Chunk, items: Set<string>): void;
	addTreeRuntimeRequirements(chunk: Chunk, items: Iterable<string>): void;
	getModuleRuntimeRequirements(
		module: Module,
		runtime: RuntimeSpec
	): ReadonlySet<string>;
	getChunkRuntimeRequirements(chunk: Chunk): ReadonlySet<string>;
	getModuleGraphHash(
		module: Module,
		runtime: RuntimeSpec,
		withConnections?: boolean
	): string;
	getModuleGraphHashBigInt(
		module: Module,
		runtime: RuntimeSpec,
		withConnections?: boolean
	): bigint;
	getTreeRuntimeRequirements(chunk: Chunk): ReadonlySet<string>;
	static getChunkGraphForModule(
		module: Module,
		deprecateMessage: string,
		deprecationCode: string
	): ChunkGraph;
	static setChunkGraphForModule(module: Module, chunkGraph: ChunkGraph): void;
	static clearChunkGraphForModule(module: Module): void;
	static getChunkGraphForChunk(
		chunk: Chunk,
		deprecateMessage: string,
		deprecationCode: string
	): ChunkGraph;
	static setChunkGraphForChunk(chunk: Chunk, chunkGraph: ChunkGraph): void;
	static clearChunkGraphForChunk(chunk: Chunk): void;
}
declare abstract class ChunkGroup {
	groupDebugId: number;
	options: ChunkGroupOptions;
	chunks: Chunk[];
	origins: OriginRecord[];
	index: number;

	/**
	 * when a new chunk is added to a chunkGroup, addingOptions will occur.
	 */
	addOptions(options: ChunkGroupOptions): void;

	/**
	 * returns the name of current ChunkGroup
	 * sets a new name for current ChunkGroup
	 */
	name?: string;

	/**
	 * get a uniqueId for ChunkGroup, made up of its member Chunk debugId's
	 */
	get debugId(): string;

	/**
	 * get a unique id for ChunkGroup, made up of its member Chunk id's
	 */
	get id(): string;

	/**
	 * Performs an unshift of a specific chunk
	 */
	unshiftChunk(chunk: Chunk): boolean;

	/**
	 * inserts a chunk before another existing chunk in group
	 */
	insertChunk(chunk: Chunk, before: Chunk): boolean;

	/**
	 * add a chunk into ChunkGroup. Is pushed on or prepended
	 */
	pushChunk(chunk: Chunk): boolean;
	replaceChunk(oldChunk: Chunk, newChunk: Chunk): boolean;
	removeChunk(chunk: Chunk): boolean;
	isInitial(): boolean;
	addChild(group: ChunkGroup): boolean;
	getChildren(): ChunkGroup[];
	getNumberOfChildren(): number;
	get childrenIterable(): SortableSet<ChunkGroup>;
	removeChild(group: ChunkGroup): boolean;
	addParent(parentChunk: ChunkGroup): boolean;
	getParents(): ChunkGroup[];
	getNumberOfParents(): number;
	hasParent(parent: ChunkGroup): boolean;
	get parentsIterable(): SortableSet<ChunkGroup>;
	removeParent(chunkGroup: ChunkGroup): boolean;
	addAsyncEntrypoint(entrypoint: Entrypoint): boolean;
	get asyncEntrypointsIterable(): SortableSet<ChunkGroup>;
	getBlocks(): any[];
	getNumberOfBlocks(): number;
	hasBlock(block?: any): boolean;
	get blocksIterable(): Iterable<AsyncDependenciesBlock>;
	addBlock(block: AsyncDependenciesBlock): boolean;
	addOrigin(module: Module, loc: DependencyLocation, request: string): void;
	getFiles(): string[];
	remove(): void;
	sortItems(): void;

	/**
	 * Sorting predicate which allows current ChunkGroup to be compared against another.
	 * Sorting values are based off of number of chunks in ChunkGroup.
	 */
	compareTo(chunkGraph: ChunkGraph, otherGroup: ChunkGroup): 0 | 1 | -1;
	getChildrenByOrders(
		moduleGraph: ModuleGraph,
		chunkGraph: ChunkGraph
	): Record<string, ChunkGroup[]>;

	/**
	 * Sets the top-down index of a module in this ChunkGroup
	 */
	setModulePreOrderIndex(module: Module, index: number): void;

	/**
	 * Gets the top-down index of a module in this ChunkGroup
	 */
	getModulePreOrderIndex(module: Module): number;

	/**
	 * Sets the bottom-up index of a module in this ChunkGroup
	 */
	setModulePostOrderIndex(module: Module, index: number): void;

	/**
	 * Gets the bottom-up index of a module in this ChunkGroup
	 */
	getModulePostOrderIndex(module: Module): number;
	checkConstraints(): void;
	getModuleIndex: (module: Module) => number;
	getModuleIndex2: (module: Module) => number;
}
type ChunkGroupOptions = RawChunkGroupOptions & { name?: string };
declare interface ChunkHashContext {
	/**
	 * results of code generation
	 */
	codeGenerationResults: CodeGenerationResults;

	/**
	 * the runtime template
	 */
	runtimeTemplate: RuntimeTemplate;

	/**
	 * the module graph
	 */
	moduleGraph: ModuleGraph;

	/**
	 * the chunk graph
	 */
	chunkGraph: ChunkGraph;
}
declare interface ChunkMaps {
	hash: Record<string | number, string>;
	contentHash: Record<string | number, Record<string, string>>;
	name: Record<string | number, string>;
}
declare class ChunkModuleIdRangePlugin {
	constructor(options?: any);
	options: any;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare interface ChunkModuleMaps {
	id: Record<string | number, (string | number)[]>;
	hash: Record<string | number, string>;
}
declare interface ChunkPathData {
	id: string | number;
	name?: string;
	hash: string;
	hashWithLength?: (arg0: number) => string;
	contentHash?: Record<string, string>;
	contentHashWithLength?: Record<string, (length: number) => string>;
}
declare class ChunkPrefetchPreloadPlugin {
	constructor();
	apply(compiler: Compiler): void;
}
declare interface ChunkRenderContext {
	/**
	 * the chunk
	 */
	chunk: Chunk;

	/**
	 * the dependency templates
	 */
	dependencyTemplates: DependencyTemplates;

	/**
	 * the runtime template
	 */
	runtimeTemplate: RuntimeTemplate;

	/**
	 * the module graph
	 */
	moduleGraph: ModuleGraph;

	/**
	 * the chunk graph
	 */
	chunkGraph: ChunkGraph;

	/**
	 * results of code generation
	 */
	codeGenerationResults: CodeGenerationResults;

	/**
	 * init fragments for the chunk
	 */
	chunkInitFragments: InitFragment<ChunkRenderContext>[];

	/**
	 * rendering in strict context
	 */
	strictMode: boolean;
}
declare interface ChunkSizeOptions {
	/**
	 * constant overhead for a chunk
	 */
	chunkOverhead?: number;

	/**
	 * multiplicator for initial chunks
	 */
	entryChunkMultiplicator?: number;
}
declare abstract class ChunkTemplate {
	hooks: Readonly<{
		renderManifest: { tap: (options?: any, fn?: any) => void };
		modules: { tap: (options?: any, fn?: any) => void };
		render: { tap: (options?: any, fn?: any) => void };
		renderWithEntry: { tap: (options?: any, fn?: any) => void };
		hash: { tap: (options?: any, fn?: any) => void };
		hashForChunk: { tap: (options?: any, fn?: any) => void };
	}>;
	get outputOptions(): Output;
}

/**
 * Advanced options for cleaning assets.
 */
declare interface CleanOptions {
	/**
	 * Log the assets that should be removed instead of deleting them.
	 */
	dry?: boolean;

	/**
	 * Keep these assets.
	 */
	keep?: string | RegExp | ((filename: string) => boolean);
}
declare class CleanPlugin {
	constructor(options?: CleanOptions);
	options: {
		/**
		 * Log the assets that should be removed instead of deleting them.
		 */
		dry: boolean;
		/**
		 * Keep these assets.
		 */
		keep?: string | RegExp | ((filename: string) => boolean);
	};

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
	static getCompilationHooks(
		compilation: Compilation
	): CleanPluginCompilationHooks;
}
declare interface CleanPluginCompilationHooks {
	/**
	 * when returning true the file/directory will be kept during cleaning, returning false will clean it and ignore the following plugins and config
	 */
	keep: SyncBailHook<[string], boolean>;
}
declare interface CodeGenerationContext {
	/**
	 * the dependency templates
	 */
	dependencyTemplates: DependencyTemplates;

	/**
	 * the runtime template
	 */
	runtimeTemplate: RuntimeTemplate;

	/**
	 * the module graph
	 */
	moduleGraph: ModuleGraph;

	/**
	 * the chunk graph
	 */
	chunkGraph: ChunkGraph;

	/**
	 * the runtimes code should be generated for
	 */
	runtime: RuntimeSpec;

	/**
	 * when in concatenated module, information about other concatenated modules
	 */
	concatenationScope?: ConcatenationScope;

	/**
	 * code generation results of other modules (need to have a codeGenerationDependency to use that)
	 */
	codeGenerationResults: CodeGenerationResults;

	/**
	 * the compilation
	 */
	compilation?: Compilation;

	/**
	 * source types
	 */
	sourceTypes?: ReadonlySet<string>;
}
declare interface CodeGenerationResult {
	/**
	 * the resulting sources for all source types
	 */
	sources: Map<string, Source>;

	/**
	 * the resulting data for all source types
	 */
	data?: Map<string, any>;

	/**
	 * the runtime requirements
	 */
	runtimeRequirements: ReadonlySet<string>;

	/**
	 * a hash of the code generation result (will be automatically calculated from sources and runtimeRequirements if not provided)
	 */
	hash?: string;
}
declare abstract class CodeGenerationResults {
	map: Map<Module, RuntimeSpecMap<CodeGenerationResult>>;
	get(module: Module, runtime: RuntimeSpec): CodeGenerationResult;
	has(module: Module, runtime: RuntimeSpec): boolean;
	getSource(module: Module, runtime: RuntimeSpec, sourceType: string): Source;
	getRuntimeRequirements(
		module: Module,
		runtime: RuntimeSpec
	): ReadonlySet<string>;
	getData(module: Module, runtime: RuntimeSpec, key: string): any;
	getHash(module: Module, runtime: RuntimeSpec): any;
	add(module: Module, runtime: RuntimeSpec, result: CodeGenerationResult): void;
}
type CodeValue =
	| undefined
	| null
	| string
	| number
	| bigint
	| boolean
	| Function
	| RegExp
	| RuntimeValue
	| {
			[index: string]: RecursiveArrayOrRecord<
				| undefined
				| null
				| string
				| number
				| bigint
				| boolean
				| Function
				| RegExp
				| RuntimeValue
			>;
	  }
	| RecursiveArrayOrRecord<
			| undefined
			| null
			| string
			| number
			| bigint
			| boolean
			| Function
			| RegExp
			| RuntimeValue
	  >[];
type CodeValuePrimitive =
	| undefined
	| null
	| string
	| number
	| bigint
	| boolean
	| Function
	| RegExp;
declare interface Comparator<T> {
	(arg0: T, arg1: T): 0 | 1 | -1;
}
declare class CompatSource extends Source {
	constructor(sourceLike: SourceLike);
	static from(sourceLike: SourceLike): Source;
}
declare class Compilation {
	/**
	 * Creates an instance of Compilation.
	 */
	constructor(compiler: Compiler, params: CompilationParams);
	hooks: Readonly<{
		buildModule: SyncHook<[Module]>;
		rebuildModule: SyncHook<[Module]>;
		failedModule: SyncHook<[Module, WebpackError]>;
		succeedModule: SyncHook<[Module]>;
		stillValidModule: SyncHook<[Module]>;
		addEntry: SyncHook<[Dependency, EntryOptions]>;
		failedEntry: SyncHook<[Dependency, EntryOptions, Error]>;
		succeedEntry: SyncHook<[Dependency, EntryOptions, Module]>;
		dependencyReferencedExports: SyncWaterfallHook<
			[(string[] | ReferencedExport)[], Dependency, RuntimeSpec]
		>;
		executeModule: SyncHook<[ExecuteModuleArgument, ExecuteModuleContext]>;
		prepareModuleExecution: AsyncParallelHook<
			[ExecuteModuleArgument, ExecuteModuleContext]
		>;
		finishModules: AsyncSeriesHook<[Iterable<Module>]>;
		finishRebuildingModule: AsyncSeriesHook<[Module]>;
		unseal: SyncHook<[]>;
		seal: SyncHook<[]>;
		beforeChunks: SyncHook<[]>;
		afterChunks: SyncHook<[Iterable<Chunk>]>;
		optimizeDependencies: SyncBailHook<[Iterable<Module>], any>;
		afterOptimizeDependencies: SyncHook<[Iterable<Module>]>;
		optimize: SyncHook<[]>;
		optimizeModules: SyncBailHook<[Iterable<Module>], any>;
		afterOptimizeModules: SyncHook<[Iterable<Module>]>;
		optimizeChunks: SyncBailHook<[Iterable<Chunk>, ChunkGroup[]], any>;
		afterOptimizeChunks: SyncHook<[Iterable<Chunk>, ChunkGroup[]]>;
		optimizeTree: AsyncSeriesHook<[Iterable<Chunk>, Iterable<Module>]>;
		afterOptimizeTree: SyncHook<[Iterable<Chunk>, Iterable<Module>]>;
		optimizeChunkModules: AsyncSeriesBailHook<
			[Iterable<Chunk>, Iterable<Module>],
			any
		>;
		afterOptimizeChunkModules: SyncHook<[Iterable<Chunk>, Iterable<Module>]>;
		shouldRecord: SyncBailHook<[], boolean>;
		additionalChunkRuntimeRequirements: SyncHook<
			[Chunk, Set<string>, RuntimeRequirementsContext]
		>;
		runtimeRequirementInChunk: HookMap<
			SyncBailHook<[Chunk, Set<string>, RuntimeRequirementsContext], any>
		>;
		additionalModuleRuntimeRequirements: SyncHook<
			[Module, Set<string>, RuntimeRequirementsContext]
		>;
		runtimeRequirementInModule: HookMap<
			SyncBailHook<[Module, Set<string>, RuntimeRequirementsContext], any>
		>;
		additionalTreeRuntimeRequirements: SyncHook<
			[Chunk, Set<string>, RuntimeRequirementsContext]
		>;
		runtimeRequirementInTree: HookMap<
			SyncBailHook<[Chunk, Set<string>, RuntimeRequirementsContext], any>
		>;
		runtimeModule: SyncHook<[RuntimeModule, Chunk]>;
		reviveModules: SyncHook<[Iterable<Module>, any]>;
		beforeModuleIds: SyncHook<[Iterable<Module>]>;
		moduleIds: SyncHook<[Iterable<Module>]>;
		optimizeModuleIds: SyncHook<[Iterable<Module>]>;
		afterOptimizeModuleIds: SyncHook<[Iterable<Module>]>;
		reviveChunks: SyncHook<[Iterable<Chunk>, any]>;
		beforeChunkIds: SyncHook<[Iterable<Chunk>]>;
		chunkIds: SyncHook<[Iterable<Chunk>]>;
		optimizeChunkIds: SyncHook<[Iterable<Chunk>]>;
		afterOptimizeChunkIds: SyncHook<[Iterable<Chunk>]>;
		recordModules: SyncHook<[Iterable<Module>, any]>;
		recordChunks: SyncHook<[Iterable<Chunk>, any]>;
		optimizeCodeGeneration: SyncHook<[Iterable<Module>]>;
		beforeModuleHash: SyncHook<[]>;
		afterModuleHash: SyncHook<[]>;
		beforeCodeGeneration: SyncHook<[]>;
		afterCodeGeneration: SyncHook<[]>;
		beforeRuntimeRequirements: SyncHook<[]>;
		afterRuntimeRequirements: SyncHook<[]>;
		beforeHash: SyncHook<[]>;
		contentHash: SyncHook<[Chunk]>;
		afterHash: SyncHook<[]>;
		recordHash: SyncHook<[any]>;
		record: SyncHook<[Compilation, any]>;
		beforeModuleAssets: SyncHook<[]>;
		shouldGenerateChunkAssets: SyncBailHook<[], boolean>;
		beforeChunkAssets: SyncHook<[]>;
		additionalChunkAssets: FakeHook<
			Pick<
				AsyncSeriesHook<[Set<Chunk>]>,
				"name" | "tap" | "tapAsync" | "tapPromise"
			>
		>;
		additionalAssets: FakeHook<
			Pick<AsyncSeriesHook<[]>, "name" | "tap" | "tapAsync" | "tapPromise">
		>;
		optimizeChunkAssets: FakeHook<
			Pick<
				AsyncSeriesHook<[Set<Chunk>]>,
				"name" | "tap" | "tapAsync" | "tapPromise"
			>
		>;
		afterOptimizeChunkAssets: FakeHook<
			Pick<
				AsyncSeriesHook<[Set<Chunk>]>,
				"name" | "tap" | "tapAsync" | "tapPromise"
			>
		>;
		optimizeAssets: AsyncSeriesHook<
			[CompilationAssets],
			ProcessAssetsAdditionalOptions
		>;
		afterOptimizeAssets: SyncHook<[CompilationAssets]>;
		processAssets: AsyncSeriesHook<
			[CompilationAssets],
			ProcessAssetsAdditionalOptions
		>;
		afterProcessAssets: SyncHook<[CompilationAssets]>;
		processAdditionalAssets: AsyncSeriesHook<[CompilationAssets]>;
		needAdditionalSeal: SyncBailHook<[], boolean>;
		afterSeal: AsyncSeriesHook<[]>;
		renderManifest: SyncWaterfallHook<
			[RenderManifestEntry[], RenderManifestOptions]
		>;
		fullHash: SyncHook<[Hash]>;
		chunkHash: SyncHook<[Chunk, Hash, ChunkHashContext]>;
		moduleAsset: SyncHook<[Module, string]>;
		chunkAsset: SyncHook<[Chunk, string]>;
		assetPath: SyncWaterfallHook<[string, object, AssetInfo]>;
		needAdditionalPass: SyncBailHook<[], boolean>;
		childCompiler: SyncHook<[Compiler, string, number]>;
		log: SyncBailHook<[string, LogEntry], true>;
		processWarnings: SyncWaterfallHook<[WebpackError[]]>;
		processErrors: SyncWaterfallHook<[WebpackError[]]>;
		statsPreset: HookMap<
			SyncHook<[Partial<NormalizedStatsOptions>, CreateStatsOptionsContext]>
		>;
		statsNormalize: SyncHook<
			[Partial<NormalizedStatsOptions>, CreateStatsOptionsContext]
		>;
		statsFactory: SyncHook<[StatsFactory, NormalizedStatsOptions]>;
		statsPrinter: SyncHook<[StatsPrinter, NormalizedStatsOptions]>;
		get normalModuleLoader(): SyncHook<[object, NormalModule]>;
	}>;
	name?: string;
	startTime: any;
	endTime: any;
	compiler: Compiler;
	resolverFactory: ResolverFactory;
	inputFileSystem: InputFileSystem;
	fileSystemInfo: FileSystemInfo;
	valueCacheVersions: Map<string, string | Set<string>>;
	requestShortener: RequestShortener;
	compilerPath: string;
	logger: WebpackLogger;
	options: WebpackOptionsNormalized;
	outputOptions: OutputNormalized;
	bail: boolean;
	profile: boolean;
	params: CompilationParams;
	mainTemplate: MainTemplate;
	chunkTemplate: ChunkTemplate;
	runtimeTemplate: RuntimeTemplate;
	moduleTemplates: { javascript: ModuleTemplate };
	moduleMemCaches?: Map<Module, WeakTupleMap<any, any>>;
	moduleMemCaches2?: Map<Module, WeakTupleMap<any, any>>;
	moduleGraph: ModuleGraph;
	chunkGraph: ChunkGraph;
	codeGenerationResults: CodeGenerationResults;
	processDependenciesQueue: AsyncQueue<Module, Module, Module>;
	addModuleQueue: AsyncQueue<Module, string, Module>;
	factorizeQueue: AsyncQueue<
		FactorizeModuleOptions,
		string,
		Module | ModuleFactoryResult
	>;
	buildQueue: AsyncQueue<Module, Module, Module>;
	rebuildQueue: AsyncQueue<Module, Module, Module>;

	/**
	 * Modules in value are building during the build of Module in key.
	 * Means value blocking key from finishing.
	 * Needed to detect build cycles.
	 */
	creatingModuleDuringBuild: WeakMap<Module, Set<Module>>;
	entries: Map<string, EntryData>;
	globalEntry: EntryData;
	entrypoints: Map<string, Entrypoint>;
	asyncEntrypoints: Entrypoint[];
	chunks: Set<Chunk>;
	chunkGroups: ChunkGroup[];
	namedChunkGroups: Map<string, ChunkGroup>;
	namedChunks: Map<string, Chunk>;
	modules: Set<Module>;
	records: any;
	additionalChunkAssets: string[];
	assets: CompilationAssets;
	assetsInfo: Map<string, AssetInfo>;
	errors: WebpackError[];
	warnings: WebpackError[];
	children: Compilation[];
	logging: Map<string, LogEntry[]>;
	dependencyFactories: Map<DepConstructor, ModuleFactory>;
	dependencyTemplates: DependencyTemplates;
	childrenCounters: object;
	usedChunkIds: Set<string | number>;
	usedModuleIds: Set<number>;
	needAdditionalPass: boolean;
	builtModules: WeakSet<Module>;
	codeGeneratedModules: WeakSet<Module>;
	buildTimeExecutedModules: WeakSet<Module>;
	emittedAssets: Set<string>;
	comparedForEmitAssets: Set<string>;
	fileDependencies: LazySet<string>;
	contextDependencies: LazySet<string>;
	missingDependencies: LazySet<string>;
	buildDependencies: LazySet<string>;
	compilationDependencies: { add: (item?: any) => LazySet<string> };
	getStats(): Stats;
	createStatsOptions(
		optionsOrPreset: string | StatsOptions,
		context?: CreateStatsOptionsContext
	): NormalizedStatsOptions;
	createStatsFactory(options?: any): StatsFactory;
	createStatsPrinter(options?: any): StatsPrinter;
	getCache(name: string): CacheFacade;
	getLogger(name: string | (() => string)): WebpackLogger;
	addModule(
		module: Module,
		callback: (err?: null | WebpackError, result?: Module) => void
	): void;

	/**
	 * Fetches a module from a compilation by its identifier
	 */
	getModule(module: Module): Module;

	/**
	 * Attempts to search for a module by its identifier
	 */
	findModule(identifier: string): undefined | Module;

	/**
	 * Schedules a build of the module object
	 */
	buildModule(
		module: Module,
		callback: (err?: null | WebpackError, result?: Module) => void
	): void;
	processModuleDependencies(
		module: Module,
		callback: (err?: null | WebpackError, result?: Module) => void
	): void;
	processModuleDependenciesNonRecursive(module: Module): void;
	handleModuleCreation(
		__0: HandleModuleCreationOptions,
		callback: (err?: null | WebpackError, result?: Module) => void
	): void;
	addModuleChain(
		context: string,
		dependency: Dependency,
		callback: (err?: null | WebpackError, result?: Module) => void
	): void;
	addModuleTree(
		__0: {
			/**
			 * context string path
			 */
			context: string;
			/**
			 * dependency used to create Module chain
			 */
			dependency: Dependency;
			/**
			 * additional context info for the root module
			 */
			contextInfo?: Partial<ModuleFactoryCreateDataContextInfo>;
		},
		callback: (err?: null | WebpackError, result?: Module) => void
	): void;
	addEntry(
		context: string,
		entry: Dependency,
		optionsOrName: string | EntryOptions,
		callback: (err?: null | WebpackError, result?: Module) => void
	): void;
	addInclude(
		context: string,
		dependency: Dependency,
		options: EntryOptions,
		callback: (err?: null | WebpackError, result?: Module) => void
	): void;
	rebuildModule(
		module: Module,
		callback: (err?: null | WebpackError, result?: Module) => void
	): void;
	finish(callback?: any): void;
	unseal(): void;
	seal(callback: (err?: null | WebpackError) => void): void;
	reportDependencyErrorsAndWarnings(
		module: Module,
		blocks: DependenciesBlock[]
	): boolean;
	codeGeneration(callback?: any): void;
	processRuntimeRequirements(__0?: {
		/**
		 * the chunk graph
		 */
		chunkGraph?: ChunkGraph;
		/**
		 * modules
		 */
		modules?: Iterable<Module>;
		/**
		 * chunks
		 */
		chunks?: Iterable<Chunk>;
		/**
		 * codeGenerationResults
		 */
		codeGenerationResults?: CodeGenerationResults;
		/**
		 * chunkGraphEntries
		 */
		chunkGraphEntries?: Iterable<Chunk>;
	}): void;
	addRuntimeModule(
		chunk: Chunk,
		module: RuntimeModule,
		chunkGraph?: ChunkGraph
	): void;

	/**
	 * If `module` is passed, `loc` and `request` must also be passed.
	 */
	addChunkInGroup(
		groupOptions: string | ChunkGroupOptions,
		module?: Module,
		loc?: SyntheticDependencyLocation | RealDependencyLocation,
		request?: string
	): ChunkGroup;
	addAsyncEntrypoint(
		options: EntryOptions,
		module: Module,
		loc: DependencyLocation,
		request: string
	): Entrypoint;

	/**
	 * This method first looks to see if a name is provided for a new chunk,
	 * and first looks to see if any named chunks already exist and reuse that chunk instead.
	 */
	addChunk(name?: string): Chunk;
	assignDepth(module: Module): void;
	assignDepths(modules: Set<Module>): void;
	getDependencyReferencedExports(
		dependency: Dependency,
		runtime: RuntimeSpec
	): (string[] | ReferencedExport)[];
	removeReasonsOfDependencyBlock(
		module: Module,
		block: DependenciesBlockLike
	): void;
	patchChunksAfterReasonRemoval(module: Module, chunk: Chunk): void;
	removeChunkFromDependencies(block: DependenciesBlock, chunk: Chunk): void;
	assignRuntimeIds(): void;
	sortItemsWithChunkIds(): void;
	summarizeDependencies(): void;
	createModuleHashes(): void;
	createHash(): {
		module: Module;
		hash: string;
		runtime: RuntimeSpec;
		runtimes: RuntimeSpec[];
	}[];
	fullHash?: string;
	hash?: string;
	emitAsset(file: string, source: Source, assetInfo?: AssetInfo): void;
	updateAsset(
		file: string,
		newSourceOrFunction: Source | ((arg0: Source) => Source),
		assetInfoUpdateOrFunction?: AssetInfo | ((arg0?: AssetInfo) => AssetInfo)
	): void;
	renameAsset(file?: any, newFile?: any): void;
	deleteAsset(file: string): void;
	getAssets(): Readonly<Asset>[];
	getAsset(name: string): undefined | Readonly<Asset>;
	clearAssets(): void;
	createModuleAssets(): void;
	getRenderManifest(options: RenderManifestOptions): RenderManifestEntry[];
	createChunkAssets(callback: (err?: null | WebpackError) => void): void;
	getPath(
		filename: string | ((arg0: PathData, arg1?: AssetInfo) => string),
		data?: PathData
	): string;
	getPathWithInfo(
		filename: string | ((arg0: PathData, arg1?: AssetInfo) => string),
		data?: PathData
	): { path: string; info: AssetInfo };
	getAssetPath(
		filename: string | ((arg0: PathData, arg1?: AssetInfo) => string),
		data: PathData
	): string;
	getAssetPathWithInfo(
		filename: string | ((arg0: PathData, arg1?: AssetInfo) => string),
		data: PathData
	): { path: string; info: AssetInfo };
	getWarnings(): WebpackError[];
	getErrors(): WebpackError[];

	/**
	 * This function allows you to run another instance of webpack inside of webpack however as
	 * a child with different settings and configurations (if desired) applied. It copies all hooks, plugins
	 * from parent (or top level compiler) and creates a child Compilation
	 */
	createChildCompiler(
		name: string,
		outputOptions?: OutputNormalized,
		plugins?: (
			| ((this: Compiler, compiler: Compiler) => void)
			| WebpackPluginInstance
		)[]
	): Compiler;
	executeModule(
		module: Module,
		options: ExecuteModuleOptions,
		callback: (err?: null | WebpackError, result?: ExecuteModuleResult) => void
	): void;
	checkConstraints(): void;
	factorizeModule: {
		(
			options: FactorizeModuleOptions & { factoryResult?: false },
			callback: (err?: null | WebpackError, result?: Module) => void
		): void;
		(
			options: FactorizeModuleOptions & { factoryResult: true },
			callback: (
				err?: null | WebpackError,
				result?: ModuleFactoryResult
			) => void
		): void;
	};

	/**
	 * Add additional assets to the compilation.
	 */
	static PROCESS_ASSETS_STAGE_ADDITIONAL: number;

	/**
	 * Basic preprocessing of assets.
	 */
	static PROCESS_ASSETS_STAGE_PRE_PROCESS: number;

	/**
	 * Derive new assets from existing assets.
	 * Existing assets should not be treated as complete.
	 */
	static PROCESS_ASSETS_STAGE_DERIVED: number;

	/**
	 * Add additional sections to existing assets, like a banner or initialization code.
	 */
	static PROCESS_ASSETS_STAGE_ADDITIONS: number;

	/**
	 * Optimize existing assets in a general way.
	 */
	static PROCESS_ASSETS_STAGE_OPTIMIZE: number;

	/**
	 * Optimize the count of existing assets, e. g. by merging them.
	 * Only assets of the same type should be merged.
	 * For assets of different types see PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE.
	 */
	static PROCESS_ASSETS_STAGE_OPTIMIZE_COUNT: number;

	/**
	 * Optimize the compatibility of existing assets, e. g. add polyfills or vendor-prefixes.
	 */
	static PROCESS_ASSETS_STAGE_OPTIMIZE_COMPATIBILITY: number;

	/**
	 * Optimize the size of existing assets, e. g. by minimizing or omitting whitespace.
	 */
	static PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE: number;

	/**
	 * Add development tooling to assets, e. g. by extracting a SourceMap.
	 */
	static PROCESS_ASSETS_STAGE_DEV_TOOLING: number;

	/**
	 * Optimize the count of existing assets, e. g. by inlining assets of into other assets.
	 * Only assets of different types should be inlined.
	 * For assets of the same type see PROCESS_ASSETS_STAGE_OPTIMIZE_COUNT.
	 */
	static PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE: number;

	/**
	 * Summarize the list of existing assets
	 * e. g. creating an assets manifest of Service Workers.
	 */
	static PROCESS_ASSETS_STAGE_SUMMARIZE: number;

	/**
	 * Optimize the hashes of the assets, e. g. by generating real hashes of the asset content.
	 */
	static PROCESS_ASSETS_STAGE_OPTIMIZE_HASH: number;

	/**
	 * Optimize the transfer of existing assets, e. g. by preparing a compressed (gzip) file as separate asset.
	 */
	static PROCESS_ASSETS_STAGE_OPTIMIZE_TRANSFER: number;

	/**
	 * Analyse existing assets.
	 */
	static PROCESS_ASSETS_STAGE_ANALYSE: number;

	/**
	 * Creating assets for reporting purposes.
	 */
	static PROCESS_ASSETS_STAGE_REPORT: number;
}
declare interface CompilationAssets {
	[index: string]: Source;
}
declare interface CompilationHooksAsyncWebAssemblyModulesPlugin {
	renderModuleContent: SyncWaterfallHook<
		[Source, Module, WebAssemblyRenderContext]
	>;
}
declare interface CompilationHooksJavascriptModulesPlugin {
	renderModuleContent: SyncWaterfallHook<[Source, Module, ChunkRenderContext]>;
	renderModuleContainer: SyncWaterfallHook<
		[Source, Module, ChunkRenderContext]
	>;
	renderModulePackage: SyncWaterfallHook<[Source, Module, ChunkRenderContext]>;
	renderChunk: SyncWaterfallHook<[Source, RenderContext]>;
	renderMain: SyncWaterfallHook<[Source, RenderContext]>;
	renderContent: SyncWaterfallHook<[Source, RenderContext]>;
	render: SyncWaterfallHook<[Source, RenderContext]>;
	renderStartup: SyncWaterfallHook<[Source, Module, StartupRenderContext]>;
	renderRequire: SyncWaterfallHook<[string, RenderBootstrapContext]>;
	inlineInRuntimeBailout: SyncBailHook<
		[Module, RenderBootstrapContext],
		string
	>;
	embedInRuntimeBailout: SyncBailHook<[Module, RenderContext], string>;
	strictRuntimeBailout: SyncBailHook<[RenderContext], string>;
	chunkHash: SyncHook<[Chunk, Hash, ChunkHashContext]>;
	useSourceMap: SyncBailHook<[Chunk, RenderContext], boolean>;
}
declare interface CompilationHooksRealContentHashPlugin {
	updateHash: SyncBailHook<[Buffer[], string], string>;
}
declare interface CompilationParams {
	normalModuleFactory: NormalModuleFactory;
	contextModuleFactory: ContextModuleFactory;
}
declare class Compiler {
	constructor(context: string, options?: WebpackOptionsNormalized);
	hooks: Readonly<{
		initialize: SyncHook<[]>;
		shouldEmit: SyncBailHook<[Compilation], boolean>;
		done: AsyncSeriesHook<[Stats]>;
		afterDone: SyncHook<[Stats]>;
		additionalPass: AsyncSeriesHook<[]>;
		beforeRun: AsyncSeriesHook<[Compiler]>;
		run: AsyncSeriesHook<[Compiler]>;
		emit: AsyncSeriesHook<[Compilation]>;
		assetEmitted: AsyncSeriesHook<[string, AssetEmittedInfo]>;
		afterEmit: AsyncSeriesHook<[Compilation]>;
		thisCompilation: SyncHook<[Compilation, CompilationParams]>;
		compilation: SyncHook<[Compilation, CompilationParams]>;
		normalModuleFactory: SyncHook<[NormalModuleFactory]>;
		contextModuleFactory: SyncHook<[ContextModuleFactory]>;
		beforeCompile: AsyncSeriesHook<[CompilationParams]>;
		compile: SyncHook<[CompilationParams]>;
		make: AsyncParallelHook<[Compilation]>;
		finishMake: AsyncParallelHook<[Compilation]>;
		afterCompile: AsyncSeriesHook<[Compilation]>;
		readRecords: AsyncSeriesHook<[]>;
		emitRecords: AsyncSeriesHook<[]>;
		watchRun: AsyncSeriesHook<[Compiler]>;
		failed: SyncHook<[Error]>;
		invalid: SyncHook<[null | string, number]>;
		watchClose: SyncHook<[]>;
		shutdown: AsyncSeriesHook<[]>;
		infrastructureLog: SyncBailHook<[string, string, any[]], true>;
		environment: SyncHook<[]>;
		afterEnvironment: SyncHook<[]>;
		afterPlugins: SyncHook<[Compiler]>;
		afterResolvers: SyncHook<[Compiler]>;
		entryOption: SyncBailHook<[string, EntryNormalized], boolean>;
	}>;
	webpack: typeof exports;
	name?: string;
	parentCompilation?: Compilation;
	root: Compiler;
	outputPath: string;
	watching: Watching;
	outputFileSystem: OutputFileSystem;
	intermediateFileSystem: IntermediateFileSystem;
	inputFileSystem: InputFileSystem;
	watchFileSystem: WatchFileSystem;
	recordsInputPath: null | string;
	recordsOutputPath: null | string;
	records: object;
	managedPaths: Set<string | RegExp>;
	immutablePaths: Set<string | RegExp>;
	modifiedFiles: ReadonlySet<string>;
	removedFiles: ReadonlySet<string>;
	fileTimestamps: ReadonlyMap<string, null | FileSystemInfoEntry | "ignore">;
	contextTimestamps: ReadonlyMap<string, null | FileSystemInfoEntry | "ignore">;
	fsStartTime: number;
	resolverFactory: ResolverFactory;
	infrastructureLogger: any;
	options: WebpackOptionsNormalized;
	context: string;
	requestShortener: RequestShortener;
	cache: Cache;
	moduleMemCaches?: Map<
		Module,
		{
			buildInfo: object;
			references: WeakMap<Dependency, Module>;
			memCache: WeakTupleMap<any, any>;
		}
	>;
	compilerPath: string;
	running: boolean;
	idle: boolean;
	watchMode: boolean;
	getCache(name: string): CacheFacade;
	getInfrastructureLogger(name: string | (() => string)): WebpackLogger;
	watch(watchOptions: WatchOptions, handler: CallbackFunction<Stats>): Watching;
	run(callback: CallbackFunction<Stats>): void;
	runAsChild(
		callback: (
			err?: null | Error,
			entries?: Chunk[],
			compilation?: Compilation
		) => any
	): void;
	purgeInputFileSystem(): void;
	emitAssets(compilation: Compilation, callback: CallbackFunction<void>): void;
	emitRecords(callback: CallbackFunction<void>): void;
	readRecords(callback: CallbackFunction<void>): void;
	createChildCompiler(
		compilation: Compilation,
		compilerName: string,
		compilerIndex: number,
		outputOptions?: OutputNormalized,
		plugins?: WebpackPluginInstance[]
	): Compiler;
	isChild(): boolean;
	createCompilation(params?: any): Compilation;
	newCompilation(params: CompilationParams): Compilation;
	createNormalModuleFactory(): NormalModuleFactory;
	createContextModuleFactory(): ContextModuleFactory;
	newCompilationParams(): {
		normalModuleFactory: NormalModuleFactory;
		contextModuleFactory: ContextModuleFactory;
	};
	compile(callback: CallbackFunction<Compilation>): void;
	close(callback: CallbackFunction<void>): void;
}
declare class ConcatSource extends Source {
	constructor(...args: (string | Source)[]);
	getChildren(): Source[];
	add(item: string | Source): void;
	addAllSkipOptimizing(items: Source[]): void;
}
declare interface ConcatenatedModuleInfo {
	index: number;
	module: Module;

	/**
	 * mapping from export name to symbol
	 */
	exportMap: Map<string, string>;

	/**
	 * mapping from export name to symbol
	 */
	rawExportMap: Map<string, string>;
	namespaceExportSymbol?: string;
}
declare interface ConcatenationBailoutReasonContext {
	/**
	 * the module graph
	 */
	moduleGraph: ModuleGraph;

	/**
	 * the chunk graph
	 */
	chunkGraph: ChunkGraph;
}
declare class ConcatenationScope {
	constructor(
		modulesMap: ModuleInfo[] | Map<Module, ModuleInfo>,
		currentModule: ConcatenatedModuleInfo
	);
	isModuleInScope(module: Module): boolean;
	registerExport(exportName: string, symbol: string): void;
	registerRawExport(exportName: string, expression: string): void;
	registerNamespaceExport(symbol: string): void;
	createModuleReference(
		module: Module,
		__1: Partial<ModuleReferenceOptions>
	): string;
	static isModuleReference(name: string): boolean;
	static matchModuleReference(
		name: string
	): ModuleReferenceOptions & { index: number };
	static DEFAULT_EXPORT: string;
	static NAMESPACE_OBJECT_EXPORT: string;
}

/**
 * Options object as provided by the user.
 */
declare interface Configuration {
	/**
	 * Set the value of `require.amd` and `define.amd`. Or disable AMD support.
	 */
	amd?: false | { [index: string]: any };

	/**
	 * Report the first error as a hard error instead of tolerating it.
	 */
	bail?: boolean;

	/**
	 * Cache generated modules and chunks to improve performance for multiple incremental builds.
	 */
	cache?: boolean | FileCacheOptions | MemoryCacheOptions;

	/**
	 * The base directory (absolute path!) for resolving the `entry` option. If `output.pathinfo` is set, the included pathinfo is shortened to this directory.
	 */
	context?: string;

	/**
	 * References to other configurations to depend on.
	 */
	dependencies?: string[];

	/**
	 * A developer tool to enhance debugging (false | eval | [inline-|hidden-|eval-][nosources-][cheap-[module-]]source-map).
	 */
	devtool?: string | false;

	/**
	 * The entry point(s) of the compilation.
	 */
	entry?:
		| string
		| (() => string | EntryObject | string[] | Promise<EntryStatic>)
		| EntryObject
		| string[];

	/**
	 * Enables/Disables experiments (experimental features with relax SemVer compatibility).
	 */
	experiments?: Experiments;

	/**
	 * Specify dependencies that shouldn't be resolved by webpack, but should become dependencies of the resulting bundle. The kind of the dependency depends on `output.libraryTarget`.
	 */
	externals?:
		| string
		| RegExp
		| ExternalItem[]
		| (ExternalItemObjectKnown & ExternalItemObjectUnknown)
		| ((
				data: ExternalItemFunctionData,
				callback: (
					err?: Error,
					result?: string | boolean | string[] | { [index: string]: any }
				) => void
		  ) => void)
		| ((data: ExternalItemFunctionData) => Promise<ExternalItemValue>);

	/**
	 * Enable presets of externals for specific targets.
	 */
	externalsPresets?: ExternalsPresets;

	/**
	 * Specifies the default type of externals ('amd*', 'umd*', 'system' and 'jsonp' depend on output.libraryTarget set to the same value).
	 */
	externalsType?:
		| "import"
		| "var"
		| "module"
		| "assign"
		| "this"
		| "window"
		| "self"
		| "global"
		| "commonjs"
		| "commonjs2"
		| "commonjs-module"
		| "commonjs-static"
		| "amd"
		| "amd-require"
		| "umd"
		| "umd2"
		| "jsonp"
		| "system"
		| "promise"
		| "script"
		| "node-commonjs";

	/**
	 * Ignore specific warnings.
	 */
	ignoreWarnings?: (
		| RegExp
		| {
				/**
				 * A RegExp to select the origin file for the warning.
				 */
				file?: RegExp;
				/**
				 * A RegExp to select the warning message.
				 */
				message?: RegExp;
				/**
				 * A RegExp to select the origin module for the warning.
				 */
				module?: RegExp;
		  }
		| ((warning: WebpackError, compilation: Compilation) => boolean)
	)[];

	/**
	 * Options for infrastructure level logging.
	 */
	infrastructureLogging?: InfrastructureLogging;

	/**
	 * Custom values available in the loader context.
	 */
	loader?: Loader;

	/**
	 * Enable production optimizations or development hints.
	 */
	mode?: "none" | "development" | "production";

	/**
	 * Options affecting the normal modules (`NormalModuleFactory`).
	 */
	module?: ModuleOptions;

	/**
	 * Name of the configuration. Used when loading multiple configurations.
	 */
	name?: string;

	/**
	 * Include polyfills or mocks for various node stuff.
	 */
	node?: false | NodeOptions;

	/**
	 * Enables/Disables integrated optimizations.
	 */
	optimization?: Optimization;

	/**
	 * Options affecting the output of the compilation. `output` options tell webpack how to write the compiled files to disk.
	 */
	output?: Output;

	/**
	 * The number of parallel processed modules in the compilation.
	 */
	parallelism?: number;

	/**
	 * Configuration for web performance recommendations.
	 */
	performance?: false | PerformanceOptions;

	/**
	 * Add additional plugins to the compiler.
	 */
	plugins?: (
		| ((this: Compiler, compiler: Compiler) => void)
		| WebpackPluginInstance
	)[];

	/**
	 * Capture timing information for each module.
	 */
	profile?: boolean;

	/**
	 * Store compiler state to a json file.
	 */
	recordsInputPath?: string | false;

	/**
	 * Load compiler state from a json file.
	 */
	recordsOutputPath?: string | false;

	/**
	 * Store/Load compiler state from/to a json file. This will result in persistent ids of modules and chunks. An absolute path is expected. `recordsPath` is used for `recordsInputPath` and `recordsOutputPath` if they left undefined.
	 */
	recordsPath?: string | false;

	/**
	 * Options for the resolver.
	 */
	resolve?: ResolveOptionsWebpackOptions;

	/**
	 * Options for the resolver when resolving loaders.
	 */
	resolveLoader?: ResolveOptionsWebpackOptions;

	/**
	 * Options affecting how file system snapshots are created and validated.
	 */
	snapshot?: SnapshotOptions;

	/**
	 * Stats options object or preset name.
	 */
	stats?:
		| boolean
		| StatsOptions
		| "none"
		| "verbose"
		| "summary"
		| "errors-only"
		| "errors-warnings"
		| "minimal"
		| "normal"
		| "detailed";

	/**
	 * Environment to build for. An array of environments to build for all of them when possible.
	 */
	target?: string | false | string[];

	/**
	 * Enter watch mode, which rebuilds on file change.
	 */
	watch?: boolean;

	/**
	 * Options for the watcher.
	 */
	watchOptions?: WatchOptions;
}
type ConnectionState =
	| boolean
	| typeof TRANSITIVE_ONLY
	| typeof CIRCULAR_CONNECTION;
declare class ConstDependency extends NullDependency {
	constructor(
		expression: string,
		range: number | [number, number],
		runtimeRequirements?: string[]
	);
	expression: string;
	range: number | [number, number];
	runtimeRequirements: null | Set<string>;
	static Template: typeof ConstDependencyTemplate;
	static NO_EXPORTS_REFERENCED: string[][];
	static EXPORTS_OBJECT_REFERENCED: string[][];
	static TRANSITIVE: typeof TRANSITIVE;
}
declare class ConstDependencyTemplate extends NullDependencyTemplate {
	constructor();
}
declare interface Constructor {
	new (...params: any[]): any;
}
declare class ConsumeSharedPlugin {
	constructor(options: ConsumeSharedPluginOptions);

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}

/**
 * Options for consuming shared modules.
 */
declare interface ConsumeSharedPluginOptions {
	/**
	 * Modules that should be consumed from share scope. When provided, property names are used to match requested modules in this compilation.
	 */
	consumes: Consumes;

	/**
	 * Share scope name used for all consumed modules (defaults to 'default').
	 */
	shareScope?: string;
}
type Consumes = (string | ConsumesObject)[] | ConsumesObject;

/**
 * Advanced configuration for modules that should be consumed from share scope.
 */
declare interface ConsumesConfig {
	/**
	 * Include the fallback module directly instead behind an async request. This allows to use fallback module in initial load too. All possible shared modules need to be eager too.
	 */
	eager?: boolean;

	/**
	 * Fallback module if no shared module is found in share scope. Defaults to the property name.
	 */
	import?: string | false;

	/**
	 * Package name to determine required version from description file. This is only needed when package name can't be automatically determined from request.
	 */
	packageName?: string;

	/**
	 * Version requirement from module in share scope.
	 */
	requiredVersion?: string | false;

	/**
	 * Module is looked up under this key from the share scope.
	 */
	shareKey?: string;

	/**
	 * Share scope name.
	 */
	shareScope?: string;

	/**
	 * Allow only a single version of the shared module in share scope (disabled by default).
	 */
	singleton?: boolean;

	/**
	 * Do not accept shared module if version is not valid (defaults to yes, if local fallback module is available and shared module is not a singleton, otherwise no, has no effect if there is no required version specified).
	 */
	strictVersion?: boolean;
}

/**
 * Modules that should be consumed from share scope. Property names are used to match requested modules in this compilation. Relative requests are resolved, module requests are matched unresolved, absolute paths will match resolved requests. A trailing slash will match all requests with this prefix. In this case shareKey must also have a trailing slash.
 */
declare interface ConsumesObject {
	[index: string]: string | ConsumesConfig;
}
type ContainerOptionsFormat<T> =
	| Record<string, string | string[] | T>
	| (string | Record<string, string | string[] | T>)[];
declare class ContainerPlugin {
	constructor(options: ContainerPluginOptions);

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare interface ContainerPluginOptions {
	/**
	 * Modules that should be exposed by this container. When provided, property name is used as public name, otherwise public name is automatically inferred from request.
	 */
	exposes: Exposes;

	/**
	 * The filename for this container relative path inside the `output.path` directory.
	 */
	filename?: string;

	/**
	 * Options for library.
	 */
	library?: LibraryOptions;

	/**
	 * The name for this container.
	 */
	name: string;

	/**
	 * The name of the runtime chunk. If set a runtime chunk with this name is created or an existing entrypoint is used as runtime.
	 */
	runtime?: string | false;

	/**
	 * The name of the share scope which is shared with the host (defaults to 'default').
	 */
	shareScope?: string;
}
declare class ContainerReferencePlugin {
	constructor(options: ContainerReferencePluginOptions);

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare interface ContainerReferencePluginOptions {
	/**
	 * The external type of the remote containers.
	 */
	remoteType: ExternalsType;

	/**
	 * Container locations and request scopes from which modules should be resolved and loaded at runtime. When provided, property name is used as request scope, otherwise request scope is automatically inferred from container location.
	 */
	remotes: Remotes;

	/**
	 * The name of the share scope shared with all remotes (defaults to 'default').
	 */
	shareScope?: string;
}
declare abstract class ContextElementDependency extends ModuleDependency {
	referencedExports?: string[][];
}
declare class ContextExclusionPlugin {
	constructor(negativeMatcher: RegExp);
	negativeMatcher: RegExp;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare interface ContextFileSystemInfoEntry {
	safeTime: number;
	timestampHash?: string;
	resolved?: ResolvedContextFileSystemInfoEntry;
	symlinks?: Set<string>;
}
declare interface ContextHash {
	hash: string;
	resolved?: string;
	symlinks?: Set<string>;
}
type ContextMode =
	| "weak"
	| "eager"
	| "lazy"
	| "lazy-once"
	| "sync"
	| "async-weak";
declare abstract class ContextModuleFactory extends ModuleFactory {
	hooks: Readonly<{
		beforeResolve: AsyncSeriesWaterfallHook<[any]>;
		afterResolve: AsyncSeriesWaterfallHook<[any]>;
		contextModuleFiles: SyncWaterfallHook<[string[]]>;
		alternatives: FakeHook<
			Pick<
				AsyncSeriesWaterfallHook<[any[]]>,
				"name" | "tap" | "tapAsync" | "tapPromise"
			>
		>;
		alternativeRequests: AsyncSeriesWaterfallHook<
			[any[], ContextModuleOptions]
		>;
	}>;
	resolverFactory: ResolverFactory;
	resolveDependencies(
		fs: InputFileSystem,
		options: ContextModuleOptions,
		callback: (
			err?: null | Error,
			dependencies?: ContextElementDependency[]
		) => any
	): void;
}

declare interface ContextModuleOptions {
	mode: ContextMode;
	recursive: boolean;
	regExp: RegExp;
	namespaceObject?: boolean | "strict";
	addon?: string;
	chunkName?: string;
	include?: RegExp;
	exclude?: RegExp;
	groupOptions?: RawChunkGroupOptions;
	typePrefix?: string;
	category?: string;

	/**
	 * exports referenced from modules (won't be mangled)
	 */
	referencedExports?: string[][];
	resource: string | false | string[];
	resourceQuery?: string;
	resourceFragment?: string;
	resolveOptions: any;
}
declare class ContextReplacementPlugin {
	constructor(
		resourceRegExp?: any,
		newContentResource?: any,
		newContentRecursive?: any,
		newContentRegExp?: any
	);
	resourceRegExp: any;
	newContentCallback: any;
	newContentResource: any;
	newContentCreateContextMap: any;
	newContentRecursive: any;
	newContentRegExp: any;
	apply(compiler?: any): void;
}
declare interface ContextTimestampAndHash {
	safeTime: number;
	timestampHash?: string;
	hash: string;
	resolved?: ResolvedContextTimestampAndHash;
	symlinks?: Set<string>;
}
type CreateStatsOptionsContext = KnownCreateStatsOptionsContext &
	Record<string, any>;

/**
 * Options for css handling.
 */
declare interface CssExperimentOptions {
	/**
	 * Avoid generating and loading a stylesheet and only embed exports from css into output javascript files.
	 */
	exportsOnly?: boolean;
}
type Declaration = FunctionDeclaration | VariableDeclaration | ClassDeclaration;
declare class DefinePlugin {
	/**
	 * Create a new define plugin
	 */
	constructor(definitions: Record<string, CodeValue>);
	definitions: Record<string, CodeValue>;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
	static runtimeValue(
		fn: (arg0: {
			module: NormalModule;
			key: string;
			readonly version?: string;
		}) => CodeValuePrimitive,
		options?: true | string[] | RuntimeValueOptions
	): RuntimeValue;
}
declare class DelegatedPlugin {
	constructor(options?: any);
	options: any;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare interface DepConstructor {
	new (...args: any[]): Dependency;
}
declare abstract class DependenciesBlock {
	dependencies: Dependency[];
	blocks: AsyncDependenciesBlock[];
	parent: DependenciesBlock;
	getRootBlock(): DependenciesBlock;

	/**
	 * Adds a DependencyBlock to DependencyBlock relationship.
	 * This is used for when a Module has a AsyncDependencyBlock tie (for code-splitting)
	 */
	addBlock(block: AsyncDependenciesBlock): void;
	addDependency(dependency: Dependency): void;
	removeDependency(dependency: Dependency): void;

	/**
	 * Removes all dependencies and blocks
	 */
	clearDependenciesAndBlocks(): void;
	updateHash(hash: Hash, context: UpdateHashContextDependency): void;
	serialize(__0: { write: any }): void;
	deserialize(__0: { read: any }): void;
}
declare interface DependenciesBlockLike {
	dependencies: Dependency[];
	blocks: AsyncDependenciesBlock[];
}
declare class Dependency {
	constructor();
	weak: boolean;
	optional: boolean;
	get type(): string;
	get category(): string;
	loc: DependencyLocation;
	setLoc(
		startLine?: any,
		startColumn?: any,
		endLine?: any,
		endColumn?: any
	): void;
	getContext(): undefined | string;
	getResourceIdentifier(): null | string;
	couldAffectReferencingModule(): boolean | typeof TRANSITIVE;

	/**
	 * Returns the referenced module and export
	 */
	getReference(moduleGraph: ModuleGraph): never;

	/**
	 * Returns list of exports referenced by this dependency
	 */
	getReferencedExports(
		moduleGraph: ModuleGraph,
		runtime: RuntimeSpec
	): (string[] | ReferencedExport)[];
	getCondition(
		moduleGraph: ModuleGraph
	):
		| null
		| false
		| ((arg0: ModuleGraphConnection, arg1: RuntimeSpec) => ConnectionState);

	/**
	 * Returns the exported names
	 */
	getExports(moduleGraph: ModuleGraph): undefined | ExportsSpec;

	/**
	 * Returns warnings
	 */
	getWarnings(moduleGraph: ModuleGraph): WebpackError[];

	/**
	 * Returns errors
	 */
	getErrors(moduleGraph: ModuleGraph): WebpackError[];

	/**
	 * Update the hash
	 */
	updateHash(hash: Hash, context: UpdateHashContextDependency): void;

	/**
	 * implement this method to allow the occurrence order plugin to count correctly
	 */
	getNumberOfIdOccurrences(): number;
	getModuleEvaluationSideEffectsState(
		moduleGraph: ModuleGraph
	): ConnectionState;
	createIgnoredModule(context: string): Module;
	serialize(__0: { write: any }): void;
	deserialize(__0: { read: any }): void;
	module: any;
	get disconnect(): any;
	static NO_EXPORTS_REFERENCED: string[][];
	static EXPORTS_OBJECT_REFERENCED: string[][];
	static TRANSITIVE: typeof TRANSITIVE;
}
declare interface DependencyConstructor {
	new (...args: any[]): Dependency;
}
type DependencyLocation = SyntheticDependencyLocation | RealDependencyLocation;
declare class DependencyTemplate {
	constructor();
	apply(
		dependency: Dependency,
		source: ReplaceSource,
		templateContext: DependencyTemplateContext
	): void;
}
declare interface DependencyTemplateContext {
	/**
	 * the runtime template
	 */
	runtimeTemplate: RuntimeTemplate;

	/**
	 * the dependency templates
	 */
	dependencyTemplates: DependencyTemplates;

	/**
	 * the module graph
	 */
	moduleGraph: ModuleGraph;

	/**
	 * the chunk graph
	 */
	chunkGraph: ChunkGraph;

	/**
	 * the requirements for runtime
	 */
	runtimeRequirements: Set<string>;

	/**
	 * current module
	 */
	module: Module;

	/**
	 * current runtimes, for which code is generated
	 */
	runtime: RuntimeSpec;

	/**
	 * mutable array of init fragments for the current module
	 */
	initFragments: InitFragment<GenerateContext>[];

	/**
	 * when in a concatenated module, information about other concatenated modules
	 */
	concatenationScope?: ConcatenationScope;

	/**
	 * the code generation results
	 */
	codeGenerationResults: CodeGenerationResults;
}
declare abstract class DependencyTemplates {
	get(dependency: DependencyConstructor): DependencyTemplate;
	set(
		dependency: DependencyConstructor,
		dependencyTemplate: DependencyTemplate
	): void;
	updateHash(part: string): void;
	getHash(): string;
	clone(): DependencyTemplates;
}
declare class DeterministicChunkIdsPlugin {
	constructor(options?: any);
	options: any;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare class DeterministicModuleIdsPlugin {
	constructor(options?: {
		/**
		 * context relative to which module identifiers are computed
		 */
		context?: string;
		/**
		 * selector function for modules
		 */
		test?: (arg0: Module) => boolean;
		/**
		 * maximum id length in digits (used as starting point)
		 */
		maxLength?: number;
		/**
		 * hash salt for ids
		 */
		salt?: number;
		/**
		 * do not increase the maxLength to find an optimal id space size
		 */
		fixedLength?: boolean;
		/**
		 * throw an error when id conflicts occur (instead of rehashing)
		 */
		failOnConflict?: boolean;
	});
	options: {
		/**
		 * context relative to which module identifiers are computed
		 */
		context?: string;
		/**
		 * selector function for modules
		 */
		test?: (arg0: Module) => boolean;
		/**
		 * maximum id length in digits (used as starting point)
		 */
		maxLength?: number;
		/**
		 * hash salt for ids
		 */
		salt?: number;
		/**
		 * do not increase the maxLength to find an optimal id space size
		 */
		fixedLength?: boolean;
		/**
		 * throw an error when id conflicts occur (instead of rehashing)
		 */
		failOnConflict?: boolean;
	};

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}

/**
 * Options for the webpack-dev-server.
 */
declare interface DevServer {
	[index: string]: any;
}
declare class DllPlugin {
	constructor(options: DllPluginOptions);
	options: {
		entryOnly: boolean;
		/**
		 * Context of requests in the manifest file (defaults to the webpack context).
		 */
		context?: string;
		/**
		 * If true, manifest json file (output) will be formatted.
		 */
		format?: boolean;
		/**
		 * Name of the exposed dll function (external name, use value of 'output.library').
		 */
		name?: string;
		/**
		 * Absolute path to the manifest json file (output).
		 */
		path: string;
		/**
		 * Type of the dll bundle (external type, use value of 'output.libraryTarget').
		 */
		type?: string;
	};

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare interface DllPluginOptions {
	/**
	 * Context of requests in the manifest file (defaults to the webpack context).
	 */
	context?: string;

	/**
	 * If true, only entry points will be exposed (default: true).
	 */
	entryOnly?: boolean;

	/**
	 * If true, manifest json file (output) will be formatted.
	 */
	format?: boolean;

	/**
	 * Name of the exposed dll function (external name, use value of 'output.library').
	 */
	name?: string;

	/**
	 * Absolute path to the manifest json file (output).
	 */
	path: string;

	/**
	 * Type of the dll bundle (external type, use value of 'output.libraryTarget').
	 */
	type?: string;
}
declare class DllReferencePlugin {
	constructor(options: DllReferencePluginOptions);
	options: DllReferencePluginOptions;
	apply(compiler?: any): void;
}
type DllReferencePluginOptions =
	| {
			/**
			 * Context of requests in the manifest (or content property) as absolute path.
			 */
			context?: string;
			/**
			 * Extensions used to resolve modules in the dll bundle (only used when using 'scope').
			 */
			extensions?: string[];
			/**
			 * An object containing content and name or a string to the absolute path of the JSON manifest to be loaded upon compilation.
			 */
			manifest: string | DllReferencePluginOptionsManifest;
			/**
			 * The name where the dll is exposed (external name, defaults to manifest.name).
			 */
			name?: string;
			/**
			 * Prefix which is used for accessing the content of the dll.
			 */
			scope?: string;
			/**
			 * How the dll is exposed (libraryTarget, defaults to manifest.type).
			 */
			sourceType?:
				| "var"
				| "assign"
				| "this"
				| "window"
				| "global"
				| "commonjs"
				| "commonjs2"
				| "commonjs-module"
				| "amd"
				| "amd-require"
				| "umd"
				| "umd2"
				| "jsonp"
				| "system";
			/**
			 * The way how the export of the dll bundle is used.
			 */
			type?: "object" | "require";
	  }
	| {
			/**
			 * The mappings from request to module info.
			 */
			content: DllReferencePluginOptionsContent;
			/**
			 * Context of requests in the manifest (or content property) as absolute path.
			 */
			context?: string;
			/**
			 * Extensions used to resolve modules in the dll bundle (only used when using 'scope').
			 */
			extensions?: string[];
			/**
			 * The name where the dll is exposed (external name).
			 */
			name: string;
			/**
			 * Prefix which is used for accessing the content of the dll.
			 */
			scope?: string;
			/**
			 * How the dll is exposed (libraryTarget).
			 */
			sourceType?:
				| "var"
				| "assign"
				| "this"
				| "window"
				| "global"
				| "commonjs"
				| "commonjs2"
				| "commonjs-module"
				| "amd"
				| "amd-require"
				| "umd"
				| "umd2"
				| "jsonp"
				| "system";
			/**
			 * The way how the export of the dll bundle is used.
			 */
			type?: "object" | "require";
	  };

/**
 * The mappings from request to module info.
 */
declare interface DllReferencePluginOptionsContent {
	[index: string]: {
		/**
		 * Meta information about the module.
		 */
		buildMeta?: { [index: string]: any };
		/**
		 * Information about the provided exports of the module.
		 */
		exports?: true | string[];
		/**
		 * Module ID.
		 */
		id: string | number;
	};
}

/**
 * An object containing content, name and type.
 */
declare interface DllReferencePluginOptionsManifest {
	/**
	 * The mappings from request to module info.
	 */
	content: DllReferencePluginOptionsContent;

	/**
	 * The name where the dll is exposed (external name).
	 */
	name?: string;

	/**
	 * The type how the dll is exposed (external type).
	 */
	type?:
		| "var"
		| "assign"
		| "this"
		| "window"
		| "global"
		| "commonjs"
		| "commonjs2"
		| "commonjs-module"
		| "amd"
		| "amd-require"
		| "umd"
		| "umd2"
		| "jsonp"
		| "system";
}
declare class DynamicEntryPlugin {
	constructor(context: string, entry: () => Promise<EntryStaticNormalized>);
	context: string;
	entry: () => Promise<EntryStaticNormalized>;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare interface Effect {
	type: string;
	value: any;
}
declare class ElectronTargetPlugin {
	constructor(context?: "main" | "preload" | "renderer");

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}

/**
 * No generator options are supported for this module type.
 */
declare interface EmptyGeneratorOptions {}

/**
 * No parser options are supported for this module type.
 */
declare interface EmptyParserOptions {}
declare class EnableChunkLoadingPlugin {
	constructor(type: string);
	type: string;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
	static setEnabled(compiler: Compiler, type: string): void;
	static checkEnabled(compiler: Compiler, type: string): void;
}
declare class EnableLibraryPlugin {
	constructor(type: string);
	type: string;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
	static setEnabled(compiler: Compiler, type: string): void;
	static checkEnabled(compiler: Compiler, type: string): void;
}
declare class EnableWasmLoadingPlugin {
	constructor(type: string);
	type: string;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
	static setEnabled(compiler: Compiler, type: string): void;
	static checkEnabled(compiler: Compiler, type: string): void;
}
type Entry =
	| string
	| (() => string | EntryObject | string[] | Promise<EntryStatic>)
	| EntryObject
	| string[];
declare interface EntryData {
	/**
	 * dependencies of the entrypoint that should be evaluated at startup
	 */
	dependencies: Dependency[];

	/**
	 * dependencies of the entrypoint that should be included but not evaluated
	 */
	includeDependencies: Dependency[];

	/**
	 * options of the entrypoint
	 */
	options: EntryOptions;
}
declare abstract class EntryDependency extends ModuleDependency {}

/**
 * An object with entry point description.
 */
declare interface EntryDescription {
	/**
	 * Enable/disable creating async chunks that are loaded on demand.
	 */
	asyncChunks?: boolean;

	/**
	 * Base uri for this entry.
	 */
	baseUri?: string;

	/**
	 * The method of loading chunks (methods included by default are 'jsonp' (web), 'import' (ESM), 'importScripts' (WebWorker), 'require' (sync node.js), 'async-node' (async node.js), but others might be added by plugins).
	 */
	chunkLoading?: string | false;

	/**
	 * The entrypoints that the current entrypoint depend on. They must be loaded when this entrypoint is loaded.
	 */
	dependOn?: string | string[];

	/**
	 * Specifies the filename of the output file on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
	 */
	filename?: string | ((pathData: PathData, assetInfo?: AssetInfo) => string);

	/**
	 * Module(s) that are loaded upon startup.
	 */
	import: EntryItem;

	/**
	 * Specifies the layer in which modules of this entrypoint are placed.
	 */
	layer?: null | string;

	/**
	 * Options for library.
	 */
	library?: LibraryOptions;

	/**
	 * The 'publicPath' specifies the public URL address of the output files when referenced in a browser.
	 */
	publicPath?: string | ((pathData: PathData, assetInfo?: AssetInfo) => string);

	/**
	 * The name of the runtime chunk. If set a runtime chunk with this name is created or an existing entrypoint is used as runtime.
	 */
	runtime?: string | false;

	/**
	 * The method of loading WebAssembly Modules (methods included by default are 'fetch' (web/WebWorker), 'async-node' (node.js), but others might be added by plugins).
	 */
	wasmLoading?: string | false;
}

/**
 * An object with entry point description.
 */
declare interface EntryDescriptionNormalized {
	/**
	 * Enable/disable creating async chunks that are loaded on demand.
	 */
	asyncChunks?: boolean;

	/**
	 * Base uri for this entry.
	 */
	baseUri?: string;

	/**
	 * The method of loading chunks (methods included by default are 'jsonp' (web), 'import' (ESM), 'importScripts' (WebWorker), 'require' (sync node.js), 'async-node' (async node.js), but others might be added by plugins).
	 */
	chunkLoading?: string | false;

	/**
	 * The entrypoints that the current entrypoint depend on. They must be loaded when this entrypoint is loaded.
	 */
	dependOn?: string[];

	/**
	 * Specifies the filename of output files on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
	 */
	filename?: string | ((pathData: PathData, assetInfo?: AssetInfo) => string);

	/**
	 * Module(s) that are loaded upon startup. The last one is exported.
	 */
	import?: string[];

	/**
	 * Specifies the layer in which modules of this entrypoint are placed.
	 */
	layer?: null | string;

	/**
	 * Options for library.
	 */
	library?: LibraryOptions;

	/**
	 * The 'publicPath' specifies the public URL address of the output files when referenced in a browser.
	 */
	publicPath?: string | ((pathData: PathData, assetInfo?: AssetInfo) => string);

	/**
	 * The name of the runtime chunk. If set a runtime chunk with this name is created or an existing entrypoint is used as runtime.
	 */
	runtime?: string | false;

	/**
	 * The method of loading WebAssembly Modules (methods included by default are 'fetch' (web/WebWorker), 'async-node' (node.js), but others might be added by plugins).
	 */
	wasmLoading?: string | false;
}
type EntryItem = string | string[];
type EntryNormalized =
	| (() => Promise<EntryStaticNormalized>)
	| EntryStaticNormalized;

/**
 * Multiple entry bundles are created. The key is the entry name. The value can be a string, an array or an entry description object.
 */
declare interface EntryObject {
	[index: string]: string | string[] | EntryDescription;
}
declare class EntryOptionPlugin {
	constructor();
	apply(compiler: Compiler): void;
	static applyEntryOption(
		compiler: Compiler,
		context: string,
		entry: EntryNormalized
	): void;
	static entryDescriptionToOptions(
		compiler: Compiler,
		name: string,
		desc: EntryDescriptionNormalized
	): EntryOptions;
}
type EntryOptions = { name?: string } & Omit<
	EntryDescriptionNormalized,
	"import"
>;
declare class EntryPlugin {
	/**
	 * An entry plugin which will handle
	 * creation of the EntryDependency
	 */
	constructor(context: string, entry: string, options?: string | EntryOptions);
	context: string;
	entry: string;
	options: string | EntryOptions;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
	static createDependency(
		entry: string,
		options: string | EntryOptions
	): EntryDependency;
}
type EntryStatic = string | EntryObject | string[];

/**
 * Multiple entry bundles are created. The key is the entry name. The value is an entry description object.
 */
declare interface EntryStaticNormalized {
	[index: string]: EntryDescriptionNormalized;
}
declare abstract class Entrypoint extends ChunkGroup {
	/**
	 * Sets the runtimeChunk for an entrypoint.
	 */
	setRuntimeChunk(chunk: Chunk): void;

	/**
	 * Fetches the chunk reference containing the webpack bootstrap code
	 */
	getRuntimeChunk(): null | Chunk;

	/**
	 * Sets the chunk with the entrypoint modules for an entrypoint.
	 */
	setEntrypointChunk(chunk: Chunk): void;

	/**
	 * Returns the chunk which contains the entrypoint modules
	 * (or at least the execution of them)
	 */
	getEntrypointChunk(): Chunk;
}

/**
 * The abilities of the environment where the webpack generated code should run.
 */
declare interface Environment {
	/**
	 * The environment supports arrow functions ('() => { ... }').
	 */
	arrowFunction?: boolean;

	/**
	 * The environment supports BigInt as literal (123n).
	 */
	bigIntLiteral?: boolean;

	/**
	 * The environment supports const and let for variable declarations.
	 */
	const?: boolean;

	/**
	 * The environment supports destructuring ('{ a, b } = obj').
	 */
	destructuring?: boolean;

	/**
	 * The environment supports an async import() function to import EcmaScript modules.
	 */
	dynamicImport?: boolean;

	/**
	 * The environment supports 'for of' iteration ('for (const x of array) { ... }').
	 */
	forOf?: boolean;

	/**
	 * The environment supports EcmaScript Module syntax to import EcmaScript modules (import ... from '...').
	 */
	module?: boolean;

	/**
	 * The environment supports optional chaining ('obj?.a' or 'obj?.()').
	 */
	optionalChaining?: boolean;

	/**
	 * The environment supports template literals.
	 */
	templateLiteral?: boolean;
}
declare class EnvironmentPlugin {
	constructor(...keys: any[]);
	keys: any[];
	defaultValues: any;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare interface Etag {
	toString: () => string;
}
declare class EvalDevToolModulePlugin {
	constructor(options?: any);
	namespace: any;
	sourceUrlComment: any;
	moduleFilenameTemplate: any;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare class EvalSourceMapDevToolPlugin {
	constructor(inputOptions: string | SourceMapDevToolPluginOptions);
	sourceMapComment: string;
	moduleFilenameTemplate: string | Function;
	namespace: string;
	options: SourceMapDevToolPluginOptions;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare interface ExecuteModuleArgument {
	module: Module;
	moduleObject?: { id: string; exports: any; loaded: boolean };
	preparedInfo: any;
	codeGenerationResult: CodeGenerationResult;
}
declare interface ExecuteModuleContext {
	assets: Map<string, { source: Source; info: AssetInfo }>;
	chunk: Chunk;
	chunkGraph: ChunkGraph;
	__webpack_require__?: (arg0: string) => any;
}
declare interface ExecuteModuleOptions {
	entryOptions?: EntryOptions;
}
declare interface ExecuteModuleResult {
	exports: any;
	cacheable: boolean;
	assets: Map<string, { source: Source; info: AssetInfo }>;
	fileDependencies: LazySet<string>;
	contextDependencies: LazySet<string>;
	missingDependencies: LazySet<string>;
	buildDependencies: LazySet<string>;
}
type Experiments = ExperimentsCommon & ExperimentsExtra;

/**
 * Enables/Disables experiments (experimental features with relax SemVer compatibility).
 */
declare interface ExperimentsCommon {
	/**
	 * Support WebAssembly as asynchronous EcmaScript Module.
	 */
	asyncWebAssembly?: boolean;

	/**
	 * Enable backward-compat layer with deprecation warnings for many webpack 4 APIs.
	 */
	backCompat?: boolean;

	/**
	 * Enable additional in memory caching of modules that are unchanged and reference only unchanged modules.
	 */
	cacheUnaffected?: boolean;

	/**
	 * Apply defaults of next major version.
	 */
	futureDefaults?: boolean;

	/**
	 * Enable module layers.
	 */
	layers?: boolean;

	/**
	 * Allow output javascript files as module source type.
	 */
	outputModule?: boolean;

	/**
	 * Support WebAssembly as synchronous EcmaScript Module (outdated).
	 */
	syncWebAssembly?: boolean;

	/**
	 * Allow using top-level-await in EcmaScript Modules.
	 */
	topLevelAwait?: boolean;
}

/**
 * Enables/Disables experiments (experimental features with relax SemVer compatibility).
 */
declare interface ExperimentsExtra {
	/**
	 * Build http(s): urls using a lockfile and resource content cache.
	 */
	buildHttp?: HttpUriOptions | (string | RegExp | ((uri: string) => boolean))[];

	/**
	 * Enable css support.
	 */
	css?: boolean | CssExperimentOptions;

	/**
	 * Compile entrypoints and import()s only when they are accessed.
	 */
	lazyCompilation?: boolean | LazyCompilationOptions;
}
type ExperimentsNormalized = ExperimentsCommon & ExperimentsNormalizedExtra;

/**
 * Enables/Disables experiments (experimental features with relax SemVer compatibility).
 */
declare interface ExperimentsNormalizedExtra {
	/**
	 * Build http(s): urls using a lockfile and resource content cache.
	 */
	buildHttp?: HttpUriOptions;

	/**
	 * Enable css support.
	 */
	css?: false | CssExperimentOptions;

	/**
	 * Compile entrypoints and import()s only when they are accessed.
	 */
	lazyCompilation?: false | LazyCompilationOptions;
}
declare abstract class ExportInfo {
	name: string;

	/**
	 * true: it is provided
	 * false: it is not provided
	 * null: only the runtime knows if it is provided
	 * undefined: it was not determined if it is provided
	 */
	provided?: null | boolean;

	/**
	 * is the export a terminal binding that should be checked for export star conflicts
	 */
	terminalBinding: boolean;

	/**
	 * true: it can be mangled
	 * false: is can not be mangled
	 * undefined: it was not determined if it can be mangled
	 */
	canMangleProvide?: boolean;

	/**
	 * true: it can be mangled
	 * false: is can not be mangled
	 * undefined: it was not determined if it can be mangled
	 */
	canMangleUse?: boolean;
	exportsInfoOwned: boolean;
	exportsInfo?: ExportsInfo;
	get canMangle(): boolean;
	setUsedInUnknownWay(runtime: RuntimeSpec): boolean;
	setUsedWithoutInfo(runtime: RuntimeSpec): boolean;
	setHasUseInfo(): void;
	setUsedConditionally(
		condition: (arg0: UsageStateType) => boolean,
		newValue: UsageStateType,
		runtime: RuntimeSpec
	): boolean;
	setUsed(newValue: UsageStateType, runtime: RuntimeSpec): boolean;
	unsetTarget(key?: any): boolean;
	setTarget(
		key: any,
		connection: ModuleGraphConnection,
		exportName?: string[],
		priority?: number
	): boolean;
	getUsed(runtime: RuntimeSpec): UsageStateType;

	/**
	 * get used name
	 */
	getUsedName(
		fallbackName: undefined | string,
		runtime: RuntimeSpec
	): string | false;
	hasUsedName(): boolean;

	/**
	 * Sets the mangled name of this export
	 */
	setUsedName(name: string): void;
	getTerminalBinding(
		moduleGraph: ModuleGraph,
		resolveTargetFilter?: (arg0: {
			module: Module;
			export?: string[];
		}) => boolean
	): undefined | ExportsInfo | ExportInfo;
	isReexport(): undefined | boolean;
	findTarget(
		moduleGraph: ModuleGraph,
		validTargetModuleFilter: (arg0: Module) => boolean
	): undefined | false | { module: Module; export?: string[] };
	getTarget(
		moduleGraph: ModuleGraph,
		resolveTargetFilter?: (arg0: {
			module: Module;
			export?: string[];
		}) => boolean
	): undefined | { module: Module; export?: string[] };

	/**
	 * Move the target forward as long resolveTargetFilter is fulfilled
	 */
	moveTarget(
		moduleGraph: ModuleGraph,
		resolveTargetFilter: (arg0: {
			module: Module;
			export?: string[];
		}) => boolean,
		updateOriginalConnection?: (arg0: {
			module: Module;
			export?: string[];
		}) => ModuleGraphConnection
	): undefined | { module: Module; export?: string[] };
	createNestedExportsInfo(): undefined | ExportsInfo;
	getNestedExportsInfo(): undefined | ExportsInfo;
	hasInfo(baseInfo?: any, runtime?: any): boolean;
	updateHash(hash?: any, runtime?: any): void;
	getUsedInfo(): string;
	getProvidedInfo():
		| "no provided info"
		| "maybe provided (runtime-defined)"
		| "provided"
		| "not provided";
	getRenameInfo(): string;
}
declare interface ExportSpec {
	/**
	 * the name of the export
	 */
	name: string;

	/**
	 * can the export be renamed (defaults to true)
	 */
	canMangle?: boolean;

	/**
	 * is the export a terminal binding that should be checked for export star conflicts
	 */
	terminalBinding?: boolean;

	/**
	 * nested exports
	 */
	exports?: (string | ExportSpec)[];

	/**
	 * when reexported: from which module
	 */
	from?: ModuleGraphConnection;

	/**
	 * when reexported: from which export
	 */
	export?: null | string[];

	/**
	 * when reexported: with which priority
	 */
	priority?: number;

	/**
	 * export is not visible, because another export blends over it
	 */
	hidden?: boolean;
}
type ExportedVariableInfo = string | ScopeInfo | VariableInfo;
declare abstract class ExportsInfo {
	get ownedExports(): Iterable<ExportInfo>;
	get orderedOwnedExports(): Iterable<ExportInfo>;
	get exports(): Iterable<ExportInfo>;
	get orderedExports(): Iterable<ExportInfo>;
	get otherExportsInfo(): ExportInfo;
	setRedirectNamedTo(exportsInfo?: any): boolean;
	setHasProvideInfo(): void;
	setHasUseInfo(): void;
	getOwnExportInfo(name: string): ExportInfo;
	getExportInfo(name: string): ExportInfo;
	getReadOnlyExportInfo(name: string): ExportInfo;
	getReadOnlyExportInfoRecursive(name: string[]): undefined | ExportInfo;
	getNestedExportsInfo(name?: string[]): undefined | ExportsInfo;
	setUnknownExportsProvided(
		canMangle?: boolean,
		excludeExports?: Set<string>,
		targetKey?: any,
		targetModule?: ModuleGraphConnection,
		priority?: number
	): boolean;
	setUsedInUnknownWay(runtime: RuntimeSpec): boolean;
	setUsedWithoutInfo(runtime: RuntimeSpec): boolean;
	setAllKnownExportsUsed(runtime: RuntimeSpec): boolean;
	setUsedForSideEffectsOnly(runtime: RuntimeSpec): boolean;
	isUsed(runtime: RuntimeSpec): boolean;
	isModuleUsed(runtime: RuntimeSpec): boolean;
	getUsedExports(runtime: RuntimeSpec): null | boolean | SortableSet<string>;
	getProvidedExports(): null | true | string[];
	getRelevantExports(runtime: RuntimeSpec): ExportInfo[];
	isExportProvided(name: string | string[]): undefined | null | boolean;
	getUsageKey(runtime: RuntimeSpec): string;
	isEquallyUsed(runtimeA: RuntimeSpec, runtimeB: RuntimeSpec): boolean;
	getUsed(name: string | string[], runtime: RuntimeSpec): UsageStateType;
	getUsedName(
		name: string | string[],
		runtime: RuntimeSpec
	): string | false | string[];
	updateHash(hash: Hash, runtime: RuntimeSpec): void;
	getRestoreProvidedData(): any;
	restoreProvided(__0: {
		otherProvided: any;
		otherCanMangleProvide: any;
		otherTerminalBinding: any;
		exports: any;
	}): void;
}
declare interface ExportsSpec {
	/**
	 * exported names, true for unknown exports or null for no exports
	 */
	exports: null | true | (string | ExportSpec)[];

	/**
	 * when exports = true, list of unaffected exports
	 */
	excludeExports?: Set<string>;

	/**
	 * list of maybe prior exposed, but now hidden exports
	 */
	hideExports?: Set<string>;

	/**
	 * when reexported: from which module
	 */
	from?: ModuleGraphConnection;

	/**
	 * when reexported: with which priority
	 */
	priority?: number;

	/**
	 * can the export be renamed (defaults to true)
	 */
	canMangle?: boolean;

	/**
	 * are the exports terminal bindings that should be checked for export star conflicts
	 */
	terminalBinding?: boolean;

	/**
	 * module on which the result depends on
	 */
	dependencies?: Module[];
}
type Exposes = (string | ExposesObject)[] | ExposesObject;

/**
 * Advanced configuration for modules that should be exposed by this container.
 */
declare interface ExposesConfig {
	/**
	 * Request to a module that should be exposed by this container.
	 */
	import: string | string[];

	/**
	 * Custom chunk name for the exposed module.
	 */
	name?: string;
}

/**
 * Modules that should be exposed by this container. Property names are used as public paths.
 */
declare interface ExposesObject {
	[index: string]: string | ExposesConfig | string[];
}
type Expression =
	| UnaryExpression
	| ThisExpression
	| ArrayExpression
	| ObjectExpression
	| FunctionExpression
	| ArrowFunctionExpression
	| YieldExpression
	| SimpleLiteral
	| RegExpLiteral
	| BigIntLiteral
	| UpdateExpression
	| BinaryExpression
	| AssignmentExpression
	| LogicalExpression
	| MemberExpression
	| ConditionalExpression
	| SimpleCallExpression
	| NewExpression
	| SequenceExpression
	| TemplateLiteral
	| TaggedTemplateExpression
	| ClassExpression
	| MetaProperty
	| Identifier
	| AwaitExpression
	| ImportExpression
	| ChainExpression;
declare interface ExpressionExpressionInfo {
	type: "expression";
	rootInfo: string | VariableInfo;
	name: string;
	getMembers: () => string[];
	getMembersOptionals: () => boolean[];
}
declare interface ExtensionAliasOption {
	alias: string | string[];
	extension: string;
}
declare interface ExtensionAliasOptions {
	[index: string]: string | string[];
}
type ExternalItem =
	| string
	| RegExp
	| (ExternalItemObjectKnown & ExternalItemObjectUnknown)
	| ((
			data: ExternalItemFunctionData,
			callback: (
				err?: Error,
				result?: string | boolean | string[] | { [index: string]: any }
			) => void
	  ) => void)
	| ((data: ExternalItemFunctionData) => Promise<ExternalItemValue>);

/**
 * Data object passed as argument when a function is set for 'externals'.
 */
declare interface ExternalItemFunctionData {
	/**
	 * The directory in which the request is placed.
	 */
	context?: string;

	/**
	 * Contextual information.
	 */
	contextInfo?: ModuleFactoryCreateDataContextInfo;

	/**
	 * The category of the referencing dependencies.
	 */
	dependencyType?: string;

	/**
	 * Get a resolve function with the current resolver options.
	 */
	getResolve?: (
		options?: ResolveOptionsWebpackOptions
	) =>
		| ((
				context: string,
				request: string,
				callback: (err?: Error, result?: string) => void
		  ) => void)
		| ((context: string, request: string) => Promise<string>);

	/**
	 * The request as written by the user in the require/import expression/statement.
	 */
	request?: string;
}

/**
 * If an dependency matches exactly a property of the object, the property value is used as dependency.
 */
declare interface ExternalItemObjectKnown {
	/**
	 * Specify externals depending on the layer.
	 */
	byLayer?:
		| { [index: string]: ExternalItem }
		| ((layer: null | string) => ExternalItem);
}

/**
 * If an dependency matches exactly a property of the object, the property value is used as dependency.
 */
declare interface ExternalItemObjectUnknown {
	[index: string]: ExternalItemValue;
}
type ExternalItemValue = string | boolean | string[] | { [index: string]: any };
declare class ExternalModule extends Module {
	constructor(request?: any, type?: any, userRequest?: any);
	request: string | string[] | Record<string, string | string[]>;
	externalType: string;
	userRequest: string;
	restoreFromUnsafeCache(
		unsafeCacheData?: any,
		normalModuleFactory?: any
	): void;
}
declare interface ExternalModuleInfo {
	index: number;
	module: Module;
}
type Externals =
	| string
	| RegExp
	| ExternalItem[]
	| (ExternalItemObjectKnown & ExternalItemObjectUnknown)
	| ((
			data: ExternalItemFunctionData,
			callback: (
				err?: Error,
				result?: string | boolean | string[] | { [index: string]: any }
			) => void
	  ) => void)
	| ((data: ExternalItemFunctionData) => Promise<ExternalItemValue>);
declare class ExternalsPlugin {
	constructor(type: undefined | string, externals: Externals);
	type?: string;
	externals: Externals;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}

/**
 * Enable presets of externals for specific targets.
 */
declare interface ExternalsPresets {
	/**
	 * Treat common electron built-in modules in main and preload context like 'electron', 'ipc' or 'shell' as external and load them via require() when used.
	 */
	electron?: boolean;

	/**
	 * Treat electron built-in modules in the main context like 'app', 'ipc-main' or 'shell' as external and load them via require() when used.
	 */
	electronMain?: boolean;

	/**
	 * Treat electron built-in modules in the preload context like 'web-frame', 'ipc-renderer' or 'shell' as external and load them via require() when used.
	 */
	electronPreload?: boolean;

	/**
	 * Treat electron built-in modules in the renderer context like 'web-frame', 'ipc-renderer' or 'shell' as external and load them via require() when used.
	 */
	electronRenderer?: boolean;

	/**
	 * Treat node.js built-in modules like fs, path or vm as external and load them via require() when used.
	 */
	node?: boolean;

	/**
	 * Treat NW.js legacy nw.gui module as external and load it via require() when used.
	 */
	nwjs?: boolean;

	/**
	 * Treat references to 'http(s)://...' and 'std:...' as external and load them via import when used (Note that this changes execution order as externals are executed before any other code in the chunk).
	 */
	web?: boolean;

	/**
	 * Treat references to 'http(s)://...' and 'std:...' as external and load them via async import() when used (Note that this external type is an async module, which has various effects on the execution).
	 */
	webAsync?: boolean;
}
type ExternalsType =
	| "import"
	| "var"
	| "module"
	| "assign"
	| "this"
	| "window"
	| "self"
	| "global"
	| "commonjs"
	| "commonjs2"
	| "commonjs-module"
	| "commonjs-static"
	| "amd"
	| "amd-require"
	| "umd"
	| "umd2"
	| "jsonp"
	| "system"
	| "promise"
	| "script"
	| "node-commonjs";
declare interface FactorizeModuleOptions {
	currentProfile: ModuleProfile;
	factory: ModuleFactory;
	dependencies: Dependency[];

	/**
	 * return full ModuleFactoryResult instead of only module
	 */
	factoryResult?: boolean;
	originModule: null | Module;
	contextInfo?: Partial<ModuleFactoryCreateDataContextInfo>;
	context?: string;
}
type FakeHook<T> = T & FakeHookMarker;
declare interface FakeHookMarker {}
declare interface FallbackCacheGroup {
	chunksFilter: (chunk: Chunk) => boolean;
	minSize: SplitChunksSizes;
	maxAsyncSize: SplitChunksSizes;
	maxInitialSize: SplitChunksSizes;
	automaticNameDelimiter: string;
}
declare class FetchCompileAsyncWasmPlugin {
	constructor();

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare class FetchCompileWasmPlugin {
	constructor(options?: any);
	options: any;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}

/**
 * Options object for persistent file-based caching.
 */
declare interface FileCacheOptions {
	/**
	 * Allows to collect unused memory allocated during deserialization. This requires copying data into smaller buffers and has a performance cost.
	 */
	allowCollectingMemory?: boolean;

	/**
	 * Dependencies the build depends on (in multiple categories, default categories: 'defaultWebpack').
	 */
	buildDependencies?: { [index: string]: string[] };

	/**
	 * Base directory for the cache (defaults to node_modules/.cache/webpack).
	 */
	cacheDirectory?: string;

	/**
	 * Locations for the cache (defaults to cacheDirectory / name).
	 */
	cacheLocation?: string;

	/**
	 * Compression type used for the cache files.
	 */
	compression?: false | "gzip" | "brotli";

	/**
	 * Algorithm used for generation the hash (see node.js crypto package).
	 */
	hashAlgorithm?: string;

	/**
	 * Time in ms after which idle period the cache storing should happen.
	 */
	idleTimeout?: number;

	/**
	 * Time in ms after which idle period the cache storing should happen when larger changes has been detected (cumulative build time > 2 x avg cache store time).
	 */
	idleTimeoutAfterLargeChanges?: number;

	/**
	 * Time in ms after which idle period the initial cache storing should happen.
	 */
	idleTimeoutForInitialStore?: number;

	/**
	 * List of paths that are managed by a package manager and contain a version or hash in its path so all files are immutable.
	 */
	immutablePaths?: (string | RegExp)[];

	/**
	 * List of paths that are managed by a package manager and can be trusted to not be modified otherwise.
	 */
	managedPaths?: (string | RegExp)[];

	/**
	 * Time for which unused cache entries stay in the filesystem cache at minimum (in milliseconds).
	 */
	maxAge?: number;

	/**
	 * Number of generations unused cache entries stay in memory cache at minimum (0 = no memory cache used, 1 = may be removed after unused for a single compilation, ..., Infinity: kept forever). Cache entries will be deserialized from disk when removed from memory cache.
	 */
	maxMemoryGenerations?: number;

	/**
	 * Additionally cache computation of modules that are unchanged and reference only unchanged modules in memory.
	 */
	memoryCacheUnaffected?: boolean;

	/**
	 * Name for the cache. Different names will lead to different coexisting caches.
	 */
	name?: string;

	/**
	 * Track and log detailed timing information for individual cache items.
	 */
	profile?: boolean;

	/**
	 * When to store data to the filesystem. (pack: Store data when compiler is idle in a single file).
	 */
	store?: "pack";

	/**
	 * Filesystem caching.
	 */
	type: "filesystem";

	/**
	 * Version of the cache data. Different versions won't allow to reuse the cache and override existing content. Update the version when config changed in a way which doesn't allow to reuse cache. This will invalidate the cache.
	 */
	version?: string;
}
declare interface FileSystem {
	readFile: {
		(arg0: string, arg1: FileSystemCallback<string | Buffer>): void;
		(
			arg0: string,
			arg1: object,
			arg2: FileSystemCallback<string | Buffer>
		): void;
	};
	readdir: {
		(
			arg0: string,
			arg1: FileSystemCallback<(string | Buffer)[] | FileSystemDirent[]>
		): void;
		(
			arg0: string,
			arg1: object,
			arg2: FileSystemCallback<(string | Buffer)[] | FileSystemDirent[]>
		): void;
	};
	readJson?: {
		(arg0: string, arg1: FileSystemCallback<object>): void;
		(arg0: string, arg1: object, arg2: FileSystemCallback<object>): void;
	};
	readlink: {
		(arg0: string, arg1: FileSystemCallback<string | Buffer>): void;
		(
			arg0: string,
			arg1: object,
			arg2: FileSystemCallback<string | Buffer>
		): void;
	};
	lstat?: {
		(arg0: string, arg1: FileSystemCallback<FileSystemStats>): void;
		(
			arg0: string,
			arg1: object,
			arg2: FileSystemCallback<string | Buffer>
		): void;
	};
	stat: {
		(arg0: string, arg1: FileSystemCallback<FileSystemStats>): void;
		(
			arg0: string,
			arg1: object,
			arg2: FileSystemCallback<string | Buffer>
		): void;
	};
}
declare interface FileSystemCallback<T> {
	(err?: null | (PossibleFileSystemError & Error), result?: T): any;
}
declare interface FileSystemDirent {
	name: string | Buffer;
	isDirectory: () => boolean;
	isFile: () => boolean;
}
declare abstract class FileSystemInfo {
	fs: InputFileSystem;
	logger?: WebpackLogger;
	fileTimestampQueue: AsyncQueue<string, string, null | FileSystemInfoEntry>;
	fileHashQueue: AsyncQueue<string, string, null | string>;
	contextTimestampQueue: AsyncQueue<
		string,
		string,
		null | ContextFileSystemInfoEntry
	>;
	contextHashQueue: AsyncQueue<string, string, null | ContextHash>;
	contextTshQueue: AsyncQueue<string, string, null | ContextTimestampAndHash>;
	managedItemQueue: AsyncQueue<string, string, null | string>;
	managedItemDirectoryQueue: AsyncQueue<string, string, Set<string>>;
	managedPaths: (string | RegExp)[];
	managedPathsWithSlash: string[];
	managedPathsRegExps: RegExp[];
	immutablePaths: (string | RegExp)[];
	immutablePathsWithSlash: string[];
	immutablePathsRegExps: RegExp[];
	logStatistics(): void;
	clear(): void;
	addFileTimestamps(
		map: ReadonlyMap<string, null | FileSystemInfoEntry | "ignore">,
		immutable?: boolean
	): void;
	addContextTimestamps(
		map: ReadonlyMap<string, null | FileSystemInfoEntry | "ignore">,
		immutable?: boolean
	): void;
	getFileTimestamp(
		path: string,
		callback: (
			arg0?: null | WebpackError,
			arg1?: null | FileSystemInfoEntry | "ignore"
		) => void
	): void;
	getContextTimestamp(
		path: string,
		callback: (
			arg0?: null | WebpackError,
			arg1?: null | "ignore" | ResolvedContextFileSystemInfoEntry
		) => void
	): void;
	getFileHash(
		path: string,
		callback: (arg0?: null | WebpackError, arg1?: string) => void
	): void;
	getContextHash(
		path: string,
		callback: (arg0?: null | WebpackError, arg1?: string) => void
	): void;
	getContextTsh(
		path: string,
		callback: (
			arg0?: null | WebpackError,
			arg1?: ResolvedContextTimestampAndHash
		) => void
	): void;
	resolveBuildDependencies(
		context: string,
		deps: Iterable<string>,
		callback: (
			arg0?: null | Error,
			arg1?: ResolveBuildDependenciesResult
		) => void
	): void;
	checkResolveResultsValid(
		resolveResults: Map<string, string | false>,
		callback: (arg0?: null | Error, arg1?: boolean) => void
	): void;
	createSnapshot(
		startTime: number,
		files: Iterable<string>,
		directories: Iterable<string>,
		missing: Iterable<string>,
		options: {
			/**
			 * Use hashes of the content of the files/directories to determine invalidation.
			 */
			hash?: boolean;
			/**
			 * Use timestamps of the files/directories to determine invalidation.
			 */
			timestamp?: boolean;
		},
		callback: (arg0?: null | WebpackError, arg1?: null | Snapshot) => void
	): void;
	mergeSnapshots(snapshot1: Snapshot, snapshot2: Snapshot): Snapshot;
	checkSnapshotValid(
		snapshot: Snapshot,
		callback: (arg0?: null | WebpackError, arg1?: boolean) => void
	): void;
	getDeprecatedFileTimestamps(): Map<any, any>;
	getDeprecatedContextTimestamps(): Map<any, any>;
}
declare interface FileSystemInfoEntry {
	safeTime: number;
	timestamp?: number;
}
declare interface FileSystemStats {
	isDirectory: () => boolean;
	isFile: () => boolean;
}
type FilterItemTypes = string | RegExp | ((value: string) => boolean);
declare interface GenerateContext {
	/**
	 * mapping from dependencies to templates
	 */
	dependencyTemplates: DependencyTemplates;

	/**
	 * the runtime template
	 */
	runtimeTemplate: RuntimeTemplate;

	/**
	 * the module graph
	 */
	moduleGraph: ModuleGraph;

	/**
	 * the chunk graph
	 */
	chunkGraph: ChunkGraph;

	/**
	 * the requirements for runtime
	 */
	runtimeRequirements: Set<string>;

	/**
	 * the runtime
	 */
	runtime: RuntimeSpec;

	/**
	 * when in concatenated module, information about other concatenated modules
	 */
	concatenationScope?: ConcatenationScope;

	/**
	 * code generation results of other modules (need to have a codeGenerationDependency to use that)
	 */
	codeGenerationResults?: CodeGenerationResults;

	/**
	 * which kind of code should be generated
	 */
	type: string;

	/**
	 * get access to the code generation data
	 */
	getData?: () => Map<string, any>;
}
declare class Generator {
	constructor();
	getTypes(module: NormalModule): Set<string>;
	getSize(module: NormalModule, type?: string): number;
	generate(module: NormalModule, __1: GenerateContext): Source;
	getConcatenationBailoutReason(
		module: NormalModule,
		context: ConcatenationBailoutReasonContext
	): undefined | string;
	updateHash(hash: Hash, __1: UpdateHashContextGenerator): void;
	static byType(map?: any): ByTypeGenerator;
}
type GeneratorOptionsByModuleType = GeneratorOptionsByModuleTypeKnown &
	GeneratorOptionsByModuleTypeUnknown;

/**
 * Specify options for each generator.
 */
declare interface GeneratorOptionsByModuleTypeKnown {
	/**
	 * Generator options for asset modules.
	 */
	asset?: AssetGeneratorOptions;

	/**
	 * Generator options for asset/inline modules.
	 */
	"asset/inline"?: AssetInlineGeneratorOptions;

	/**
	 * Generator options for asset/resource modules.
	 */
	"asset/resource"?: AssetResourceGeneratorOptions;

	/**
	 * No generator options are supported for this module type.
	 */
	javascript?: EmptyGeneratorOptions;

	/**
	 * No generator options are supported for this module type.
	 */
	"javascript/auto"?: EmptyGeneratorOptions;

	/**
	 * No generator options are supported for this module type.
	 */
	"javascript/dynamic"?: EmptyGeneratorOptions;

	/**
	 * No generator options are supported for this module type.
	 */
	"javascript/esm"?: EmptyGeneratorOptions;
}

/**
 * Specify options for each generator.
 */
declare interface GeneratorOptionsByModuleTypeUnknown {
	[index: string]: { [index: string]: any };
}
declare class GetChunkFilenameRuntimeModule extends RuntimeModule {
	constructor(
		contentType: string,
		name: string,
		global: string,
		getFilenameForChunk: (
			arg0: Chunk
		) => string | ((arg0: PathData, arg1?: AssetInfo) => string),
		allChunks: boolean
	);
	contentType: string;
	global: string;
	getFilenameForChunk: (
		arg0: Chunk
	) => string | ((arg0: PathData, arg1?: AssetInfo) => string);
	allChunks: boolean;

	/**
	 * Runtime modules without any dependencies to other runtime modules
	 */
	static STAGE_NORMAL: number;

	/**
	 * Runtime modules with simple dependencies on other runtime modules
	 */
	static STAGE_BASIC: number;

	/**
	 * Runtime modules which attach to handlers of other runtime modules
	 */
	static STAGE_ATTACH: number;

	/**
	 * Runtime modules which trigger actions on bootstrap
	 */
	static STAGE_TRIGGER: number;
}
declare interface GroupConfig {
	getKeys: (arg0?: any) => string[];
	createGroup: (arg0: string, arg1: any[], arg2: any[]) => object;
	getOptions?: (arg0: string, arg1: any[]) => GroupOptions;
}
declare interface GroupOptions {
	groupChildren?: boolean;
	force?: boolean;
	targetGroupCount?: number;
}
declare interface HMRJavascriptParserHooks {
	hotAcceptCallback: SyncBailHook<[any, string[]], void>;
	hotAcceptWithoutCallback: SyncBailHook<[any, string[]], void>;
}
declare interface HandleModuleCreationOptions {
	factory: ModuleFactory;
	dependencies: Dependency[];
	originModule: null | Module;
	contextInfo?: Partial<ModuleFactoryCreateDataContextInfo>;
	context?: string;

	/**
	 * recurse into dependencies of the created module
	 */
	recursive?: boolean;

	/**
	 * connect the resolved module with the origin module
	 */
	connectOrigin?: boolean;
}
declare class HarmonyImportDependency extends ModuleDependency {
	constructor(
		request: string,
		sourceOrder: number,
		assertions?: Record<string, any>
	);
	sourceOrder: number;
	getImportVar(moduleGraph: ModuleGraph): string;
	getImportStatement(
		update: boolean,
		__1: DependencyTemplateContext
	): [string, string];
	getLinkingErrors(
		moduleGraph: ModuleGraph,
		ids: string[],
		additionalMessage: string
	): undefined | WebpackError[];
	static Template: typeof HarmonyImportDependencyTemplate;
	static ExportPresenceModes: {
		NONE: 0;
		WARN: 1;
		AUTO: 2;
		ERROR: 3;
		fromUserOption(str?: any): 0 | 1 | 2 | 3;
	};
	static NO_EXPORTS_REFERENCED: string[][];
	static EXPORTS_OBJECT_REFERENCED: string[][];
	static TRANSITIVE: typeof TRANSITIVE;
}
declare class HarmonyImportDependencyTemplate extends DependencyTemplate {
	constructor();
	static getImportEmittedRuntime(
		module: Module,
		referencedModule: Module
	): undefined | string | boolean | SortableSet<string>;
}
declare class Hash {
	constructor();

	/**
	 * Update hash {@link https://nodejs.org/api/crypto.html#crypto_hash_update_data_inputencoding}
	 */
	update(data: string | Buffer, inputEncoding?: string): Hash;

	/**
	 * Calculates the digest {@link https://nodejs.org/api/crypto.html#crypto_hash_digest_encoding}
	 */
	digest(encoding?: string): string | Buffer;
}
declare interface HashableObject {
	updateHash: (arg0: Hash) => void;
}
declare class HashedModuleIdsPlugin {
	constructor(options?: HashedModuleIdsPluginOptions);
	options: HashedModuleIdsPluginOptions;
	apply(compiler?: any): void;
}
declare interface HashedModuleIdsPluginOptions {
	/**
	 * The context directory for creating names.
	 */
	context?: string;

	/**
	 * The encoding to use when generating the hash, defaults to 'base64'. All encodings from Node.JS' hash.digest are supported.
	 */
	hashDigest?: "latin1" | "hex" | "base64";

	/**
	 * The prefix length of the hash digest to use, defaults to 4.
	 */
	hashDigestLength?: number;

	/**
	 * The hashing algorithm to use, defaults to 'md4'. All functions from Node.JS' crypto.createHash are supported.
	 */
	hashFunction?: string | typeof Hash;
}
declare abstract class HelperRuntimeModule extends RuntimeModule {}
declare class HotModuleReplacementPlugin {
	constructor(options?: any);
	options: any;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
	static getParserHooks(parser: JavascriptParser): HMRJavascriptParserHooks;
}

/**
 * These properties are added by the HotModuleReplacementPlugin
 */
declare interface HotModuleReplacementPluginLoaderContext {
	hot?: boolean;
}
declare class HotUpdateChunk extends Chunk {
	constructor();
}

/**
 * Options for building http resources.
 */
declare interface HttpUriOptions {
	/**
	 * List of allowed URIs (resp. the beginning of them).
	 */
	allowedUris: (string | RegExp | ((uri: string) => boolean))[];

	/**
	 * Location where resource content is stored for lockfile entries. It's also possible to disable storing by passing false.
	 */
	cacheLocation?: string | false;

	/**
	 * When set, anything that would lead to a modification of the lockfile or any resource content, will result in an error.
	 */
	frozen?: boolean;

	/**
	 * Location of the lockfile.
	 */
	lockfileLocation?: string;

	/**
	 * Proxy configuration, which can be used to specify a proxy server to use for HTTP requests.
	 */
	proxy?: string;

	/**
	 * When set, resources of existing lockfile entries will be fetched and entries will be upgraded when resource content has changed.
	 */
	upgrade?: boolean;
}
declare class HttpUriPlugin {
	constructor(options: HttpUriOptions);

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare interface IDirent {
	isFile: () => boolean;
	isDirectory: () => boolean;
	isBlockDevice: () => boolean;
	isCharacterDevice: () => boolean;
	isSymbolicLink: () => boolean;
	isFIFO: () => boolean;
	isSocket: () => boolean;
	name: string | Buffer;
}
declare interface IStats {
	isFile: () => boolean;
	isDirectory: () => boolean;
	isBlockDevice: () => boolean;
	isCharacterDevice: () => boolean;
	isSymbolicLink: () => boolean;
	isFIFO: () => boolean;
	isSocket: () => boolean;
	dev: number | bigint;
	ino: number | bigint;
	mode: number | bigint;
	nlink: number | bigint;
	uid: number | bigint;
	gid: number | bigint;
	rdev: number | bigint;
	size: number | bigint;
	blksize: number | bigint;
	blocks: number | bigint;
	atimeMs: number | bigint;
	mtimeMs: number | bigint;
	ctimeMs: number | bigint;
	birthtimeMs: number | bigint;
	atime: Date;
	mtime: Date;
	ctime: Date;
	birthtime: Date;
}
declare class IgnorePlugin {
	constructor(options: IgnorePluginOptions);
	options: IgnorePluginOptions;

	/**
	 * Note that if "contextRegExp" is given, both the "resourceRegExp"
	 * and "contextRegExp" have to match.
	 */
	checkIgnore(resolveData: ResolveData): undefined | false;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
type IgnorePluginOptions =
	| {
			/**
			 * A RegExp to test the context (directory) against.
			 */
			contextRegExp?: RegExp;
			/**
			 * A RegExp to test the request against.
			 */
			resourceRegExp: RegExp;
	  }
	| {
			/**
			 * A filter function for resource and context.
			 */
			checkResource: (resource: string, context: string) => boolean;
	  };
declare interface ImportModuleOptions {
	/**
	 * the target layer
	 */
	layer?: string;

	/**
	 * the target public path
	 */
	publicPath?: string;

	/**
	 * target base uri
	 */
	baseUri?: string;
}
type ImportSource =
	| undefined
	| null
	| string
	| SimpleLiteral
	| RegExpLiteral
	| BigIntLiteral;

/**
 * Options for infrastructure level logging.
 */
declare interface InfrastructureLogging {
	/**
	 * Only appends lines to the output. Avoids updating existing output e. g. for status messages. This option is only used when no custom console is provided.
	 */
	appendOnly?: boolean;

	/**
	 * Enables/Disables colorful output. This option is only used when no custom console is provided.
	 */
	colors?: boolean;

	/**
	 * Custom console used for logging.
	 */
	console?: Console;

	/**
	 * Enable debug logging for specific loggers.
	 */
	debug?:
		| string
		| boolean
		| RegExp
		| FilterItemTypes[]
		| ((value: string) => boolean);

	/**
	 * Log level.
	 */
	level?: "none" | "error" | "warn" | "info" | "log" | "verbose";

	/**
	 * Stream used for logging output. Defaults to process.stderr. This option is only used when no custom console is provided.
	 */
	stream?: NodeJS.WritableStream;
}
declare abstract class InitFragment<Context> {
	content: string | Source;
	stage: number;
	position: number;
	key?: string;
	endContent?: string | Source;
	getContent(context: Context): string | Source;
	getEndContent(context: Context): undefined | string | Source;
	serialize(context?: any): void;
	deserialize(context?: any): void;
	merge: any;
}
declare interface InputFileSystem {
	readFile: (
		arg0: string,
		arg1: (arg0?: null | NodeJS.ErrnoException, arg1?: string | Buffer) => void
	) => void;
	readJson?: (
		arg0: string,
		arg1: (arg0?: null | Error | NodeJS.ErrnoException, arg1?: any) => void
	) => void;
	readlink: (
		arg0: string,
		arg1: (arg0?: null | NodeJS.ErrnoException, arg1?: string | Buffer) => void
	) => void;
	readdir: (
		arg0: string,
		arg1: (
			arg0?: null | NodeJS.ErrnoException,
			arg1?: (string | Buffer)[] | IDirent[]
		) => void
	) => void;
	stat: (
		arg0: string,
		arg1: (arg0?: null | NodeJS.ErrnoException, arg1?: IStats) => void
	) => void;
	lstat?: (
		arg0: string,
		arg1: (arg0?: null | NodeJS.ErrnoException, arg1?: IStats) => void
	) => void;
	realpath?: (
		arg0: string,
		arg1: (arg0?: null | NodeJS.ErrnoException, arg1?: string | Buffer) => void
	) => void;
	purge?: (arg0?: string) => void;
	join?: (arg0: string, arg1: string) => string;
	relative?: (arg0: string, arg1: string) => string;
	dirname?: (arg0: string) => string;
}
type IntermediateFileSystem = InputFileSystem &
	OutputFileSystem &
	IntermediateFileSystemExtras;
declare interface IntermediateFileSystemExtras {
	mkdirSync: (arg0: string) => void;
	createWriteStream: (arg0: string) => NodeJS.WritableStream;
	open: (
		arg0: string,
		arg1: string,
		arg2: (arg0?: null | NodeJS.ErrnoException, arg1?: number) => void
	) => void;
	read: (
		arg0: number,
		arg1: Buffer,
		arg2: number,
		arg3: number,
		arg4: number,
		arg5: (arg0?: null | NodeJS.ErrnoException, arg1?: number) => void
	) => void;
	close: (
		arg0: number,
		arg1: (arg0?: null | NodeJS.ErrnoException) => void
	) => void;
	rename: (
		arg0: string,
		arg1: string,
		arg2: (arg0?: null | NodeJS.ErrnoException) => void
	) => void;
}
type InternalCell<T> = T | typeof TOMBSTONE | typeof UNDEFINED_MARKER;
declare abstract class ItemCacheFacade {
	get<T>(callback: CallbackCache<T>): void;
	getPromise<T>(): Promise<T>;
	store<T>(data: T, callback: CallbackCache<void>): void;
	storePromise<T>(data: T): Promise<void>;
	provide<T>(
		computer: (arg0: CallbackNormalErrorCache<T>) => void,
		callback: CallbackNormalErrorCache<T>
	): void;
	providePromise<T>(computer: () => T | Promise<T>): Promise<T>;
}
declare class JavascriptModulesPlugin {
	constructor(options?: object);
	options: object;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
	renderModule(
		module: Module,
		renderContext: ChunkRenderContext,
		hooks: CompilationHooksJavascriptModulesPlugin,
		factory: boolean
	): Source;
	renderChunk(
		renderContext: RenderContext,
		hooks: CompilationHooksJavascriptModulesPlugin
	): Source;
	renderMain(
		renderContext: MainRenderContext,
		hooks: CompilationHooksJavascriptModulesPlugin,
		compilation: Compilation
	): Source;
	updateHashWithBootstrap(
		hash: Hash,
		renderContext: RenderBootstrapContext,
		hooks: CompilationHooksJavascriptModulesPlugin
	): void;
	renderBootstrap(
		renderContext: RenderBootstrapContext,
		hooks: CompilationHooksJavascriptModulesPlugin
	): {
		header: string[];
		beforeStartup: string[];
		startup: string[];
		afterStartup: string[];
		allowInlineStartup: boolean;
	};
	renderRequire(
		renderContext: RenderBootstrapContext,
		hooks: CompilationHooksJavascriptModulesPlugin
	): string;
	static getCompilationHooks(
		compilation: Compilation
	): CompilationHooksJavascriptModulesPlugin;
	static getChunkFilenameTemplate(chunk?: any, outputOptions?: any): any;
	static chunkHasJs: (chunk: Chunk, chunkGraph: ChunkGraph) => boolean;
}
declare class JavascriptParser extends Parser {
	constructor(sourceType?: "module" | "auto" | "script");
	hooks: Readonly<{
		evaluateTypeof: HookMap<
			SyncBailHook<
				[UnaryExpression],
				undefined | null | BasicEvaluatedExpression
			>
		>;
		evaluate: HookMap<
			SyncBailHook<[Expression], undefined | null | BasicEvaluatedExpression>
		>;
		evaluateIdentifier: HookMap<
			SyncBailHook<
				[ThisExpression | MemberExpression | MetaProperty | Identifier],
				undefined | null | BasicEvaluatedExpression
			>
		>;
		evaluateDefinedIdentifier: HookMap<
			SyncBailHook<
				[ThisExpression | MemberExpression | Identifier],
				undefined | null | BasicEvaluatedExpression
			>
		>;
		evaluateNewExpression: HookMap<
			SyncBailHook<[NewExpression], undefined | null | BasicEvaluatedExpression>
		>;
		evaluateCallExpression: HookMap<
			SyncBailHook<
				[CallExpression],
				undefined | null | BasicEvaluatedExpression
			>
		>;
		evaluateCallExpressionMember: HookMap<
			SyncBailHook<
				[CallExpression, undefined | BasicEvaluatedExpression],
				undefined | null | BasicEvaluatedExpression
			>
		>;
		isPure: HookMap<
			SyncBailHook<
				[
					(
						| UnaryExpression
						| ThisExpression
						| ArrayExpression
						| ObjectExpression
						| FunctionExpression
						| ArrowFunctionExpression
						| YieldExpression
						| SimpleLiteral
						| RegExpLiteral
						| BigIntLiteral
						| UpdateExpression
						| BinaryExpression
						| AssignmentExpression
						| LogicalExpression
						| MemberExpression
						| ConditionalExpression
						| SimpleCallExpression
						| NewExpression
						| SequenceExpression
						| TemplateLiteral
						| TaggedTemplateExpression
						| ClassExpression
						| MetaProperty
						| Identifier
						| AwaitExpression
						| ImportExpression
						| ChainExpression
						| FunctionDeclaration
						| VariableDeclaration
						| ClassDeclaration
						| PrivateIdentifier
					),
					number
				],
				boolean | void
			>
		>;
		preStatement: SyncBailHook<
			[
				| FunctionDeclaration
				| VariableDeclaration
				| ClassDeclaration
				| ExpressionStatement
				| BlockStatement
				| StaticBlock
				| EmptyStatement
				| DebuggerStatement
				| WithStatement
				| ReturnStatement
				| LabeledStatement
				| BreakStatement
				| ContinueStatement
				| IfStatement
				| SwitchStatement
				| ThrowStatement
				| TryStatement
				| WhileStatement
				| DoWhileStatement
				| ForStatement
				| ForInStatement
				| ForOfStatement
				| ImportDeclaration
				| ExportNamedDeclaration
				| ExportDefaultDeclaration
				| ExportAllDeclaration
			],
			boolean | void
		>;
		blockPreStatement: SyncBailHook<
			[
				| FunctionDeclaration
				| VariableDeclaration
				| ClassDeclaration
				| ExpressionStatement
				| BlockStatement
				| StaticBlock
				| EmptyStatement
				| DebuggerStatement
				| WithStatement
				| ReturnStatement
				| LabeledStatement
				| BreakStatement
				| ContinueStatement
				| IfStatement
				| SwitchStatement
				| ThrowStatement
				| TryStatement
				| WhileStatement
				| DoWhileStatement
				| ForStatement
				| ForInStatement
				| ForOfStatement
				| ImportDeclaration
				| ExportNamedDeclaration
				| ExportDefaultDeclaration
				| ExportAllDeclaration
			],
			boolean | void
		>;
		statement: SyncBailHook<
			[
				| FunctionDeclaration
				| VariableDeclaration
				| ClassDeclaration
				| ExpressionStatement
				| BlockStatement
				| StaticBlock
				| EmptyStatement
				| DebuggerStatement
				| WithStatement
				| ReturnStatement
				| LabeledStatement
				| BreakStatement
				| ContinueStatement
				| IfStatement
				| SwitchStatement
				| ThrowStatement
				| TryStatement
				| WhileStatement
				| DoWhileStatement
				| ForStatement
				| ForInStatement
				| ForOfStatement
				| ImportDeclaration
				| ExportNamedDeclaration
				| ExportDefaultDeclaration
				| ExportAllDeclaration
			],
			boolean | void
		>;
		statementIf: SyncBailHook<[IfStatement], boolean | void>;
		classExtendsExpression: SyncBailHook<
			[Expression, ClassExpression | ClassDeclaration],
			boolean | void
		>;
		classBodyElement: SyncBailHook<
			[
				MethodDefinition | PropertyDefinition,
				ClassExpression | ClassDeclaration
			],
			boolean | void
		>;
		classBodyValue: SyncBailHook<
			[
				Expression,
				MethodDefinition | PropertyDefinition,
				ClassExpression | ClassDeclaration
			],
			boolean | void
		>;
		label: HookMap<SyncBailHook<[LabeledStatement], boolean | void>>;
		import: SyncBailHook<[ImportDeclaration, ImportSource], boolean | void>;
		importSpecifier: SyncBailHook<
			[ImportDeclaration, ImportSource, string, string],
			boolean | void
		>;
		export: SyncBailHook<
			[ExportNamedDeclaration | ExportAllDeclaration],
			boolean | void
		>;
		exportImport: SyncBailHook<
			[ExportNamedDeclaration | ExportAllDeclaration, ImportSource],
			boolean | void
		>;
		exportDeclaration: SyncBailHook<
			[ExportNamedDeclaration | ExportAllDeclaration, Declaration],
			boolean | void
		>;
		exportExpression: SyncBailHook<
			[ExportDefaultDeclaration, Declaration],
			boolean | void
		>;
		exportSpecifier: SyncBailHook<
			[
				ExportNamedDeclaration | ExportAllDeclaration,
				string,
				string,
				undefined | number
			],
			boolean | void
		>;
		exportImportSpecifier: SyncBailHook<
			[
				ExportNamedDeclaration | ExportAllDeclaration,
				ImportSource,
				string,
				string,
				undefined | number
			],
			boolean | void
		>;
		preDeclarator: SyncBailHook<
			[VariableDeclarator, Statement],
			boolean | void
		>;
		declarator: SyncBailHook<[VariableDeclarator, Statement], boolean | void>;
		varDeclaration: HookMap<SyncBailHook<[Declaration], boolean | void>>;
		varDeclarationLet: HookMap<SyncBailHook<[Declaration], boolean | void>>;
		varDeclarationConst: HookMap<SyncBailHook<[Declaration], boolean | void>>;
		varDeclarationVar: HookMap<SyncBailHook<[Declaration], boolean | void>>;
		pattern: HookMap<SyncBailHook<[Identifier], boolean | void>>;
		canRename: HookMap<SyncBailHook<[Expression], boolean | void>>;
		rename: HookMap<SyncBailHook<[Expression], boolean | void>>;
		assign: HookMap<SyncBailHook<[AssignmentExpression], boolean | void>>;
		assignMemberChain: HookMap<
			SyncBailHook<[AssignmentExpression, string[]], boolean | void>
		>;
		typeof: HookMap<SyncBailHook<[Expression], boolean | void>>;
		importCall: SyncBailHook<[Expression], boolean | void>;
		topLevelAwait: SyncBailHook<[Expression], boolean | void>;
		call: HookMap<SyncBailHook<[Expression], boolean | void>>;
		callMemberChain: HookMap<
			SyncBailHook<[CallExpression, string[], boolean[]], boolean | void>
		>;
		memberChainOfCallMemberChain: HookMap<
			SyncBailHook<
				[Expression, string[], CallExpression, string[]],
				boolean | void
			>
		>;
		callMemberChainOfCallMemberChain: HookMap<
			SyncBailHook<
				[Expression, string[], CallExpression, string[]],
				boolean | void
			>
		>;
		optionalChaining: SyncBailHook<[ChainExpression], boolean | void>;
		new: HookMap<SyncBailHook<[NewExpression], boolean | void>>;
		binaryExpression: SyncBailHook<[BinaryExpression], boolean | void>;
		expression: HookMap<SyncBailHook<[Expression], boolean | void>>;
		expressionMemberChain: HookMap<
			SyncBailHook<[Expression, string[], boolean[]], boolean | void>
		>;
		unhandledExpressionMemberChain: HookMap<
			SyncBailHook<[Expression, string[]], boolean | void>
		>;
		expressionConditionalOperator: SyncBailHook<[Expression], boolean | void>;
		expressionLogicalOperator: SyncBailHook<[Expression], boolean | void>;
		program: SyncBailHook<[Program, Comment[]], boolean | void>;
		finish: SyncBailHook<[Program, Comment[]], boolean | void>;
	}>;
	sourceType: "module" | "auto" | "script";
	scope: ScopeInfo;
	state: ParserState;
	comments: any;
	semicolons: any;
	statementPath: (
		| UnaryExpression
		| ThisExpression
		| ArrayExpression
		| ObjectExpression
		| FunctionExpression
		| ArrowFunctionExpression
		| YieldExpression
		| SimpleLiteral
		| RegExpLiteral
		| BigIntLiteral
		| UpdateExpression
		| BinaryExpression
		| AssignmentExpression
		| LogicalExpression
		| MemberExpression
		| ConditionalExpression
		| SimpleCallExpression
		| NewExpression
		| SequenceExpression
		| TemplateLiteral
		| TaggedTemplateExpression
		| ClassExpression
		| MetaProperty
		| Identifier
		| AwaitExpression
		| ImportExpression
		| ChainExpression
		| FunctionDeclaration
		| VariableDeclaration
		| ClassDeclaration
		| ExpressionStatement
		| BlockStatement
		| StaticBlock
		| EmptyStatement
		| DebuggerStatement
		| WithStatement
		| ReturnStatement
		| LabeledStatement
		| BreakStatement
		| ContinueStatement
		| IfStatement
		| SwitchStatement
		| ThrowStatement
		| TryStatement
		| WhileStatement
		| DoWhileStatement
		| ForStatement
		| ForInStatement
		| ForOfStatement
	)[];
	prevStatement: any;
	currentTagData: any;
	getRenameIdentifier(expr?: any): undefined | string | VariableInfoInterface;
	walkClass(classy: ClassExpression | ClassDeclaration): void;
	preWalkStatements(statements?: any): void;
	blockPreWalkStatements(statements?: any): void;
	walkStatements(statements?: any): void;
	preWalkStatement(statement?: any): void;
	blockPreWalkStatement(statement?: any): void;
	walkStatement(statement?: any): void;

	/**
	 * Walks a statements that is nested within a parent statement
	 * and can potentially be a non-block statement.
	 * This enforces the nested statement to never be in ASI position.
	 */
	walkNestedStatement(statement: Statement): void;
	preWalkBlockStatement(statement?: any): void;
	walkBlockStatement(statement?: any): void;
	walkExpressionStatement(statement?: any): void;
	preWalkIfStatement(statement?: any): void;
	walkIfStatement(statement?: any): void;
	preWalkLabeledStatement(statement?: any): void;
	walkLabeledStatement(statement?: any): void;
	preWalkWithStatement(statement?: any): void;
	walkWithStatement(statement?: any): void;
	preWalkSwitchStatement(statement?: any): void;
	walkSwitchStatement(statement?: any): void;
	walkTerminatingStatement(statement?: any): void;
	walkReturnStatement(statement?: any): void;
	walkThrowStatement(statement?: any): void;
	preWalkTryStatement(statement?: any): void;
	walkTryStatement(statement?: any): void;
	preWalkWhileStatement(statement?: any): void;
	walkWhileStatement(statement?: any): void;
	preWalkDoWhileStatement(statement?: any): void;
	walkDoWhileStatement(statement?: any): void;
	preWalkForStatement(statement?: any): void;
	walkForStatement(statement?: any): void;
	preWalkForInStatement(statement?: any): void;
	walkForInStatement(statement?: any): void;
	preWalkForOfStatement(statement?: any): void;
	walkForOfStatement(statement?: any): void;
	preWalkFunctionDeclaration(statement?: any): void;
	walkFunctionDeclaration(statement?: any): void;
	blockPreWalkImportDeclaration(statement?: any): void;
	enterDeclaration(declaration?: any, onIdent?: any): void;
	blockPreWalkExportNamedDeclaration(statement?: any): void;
	walkExportNamedDeclaration(statement?: any): void;
	blockPreWalkExportDefaultDeclaration(statement?: any): void;
	walkExportDefaultDeclaration(statement?: any): void;
	blockPreWalkExportAllDeclaration(statement?: any): void;
	preWalkVariableDeclaration(statement?: any): void;
	blockPreWalkVariableDeclaration(statement?: any): void;
	walkVariableDeclaration(statement?: any): void;
	blockPreWalkClassDeclaration(statement?: any): void;
	walkClassDeclaration(statement?: any): void;
	preWalkSwitchCases(switchCases?: any): void;
	walkSwitchCases(switchCases?: any): void;
	preWalkCatchClause(catchClause?: any): void;
	walkCatchClause(catchClause?: any): void;
	walkPattern(pattern?: any): void;
	walkAssignmentPattern(pattern?: any): void;
	walkObjectPattern(pattern?: any): void;
	walkArrayPattern(pattern?: any): void;
	walkRestElement(pattern?: any): void;
	walkExpressions(expressions?: any): void;
	walkExpression(expression?: any): void;
	walkAwaitExpression(expression?: any): void;
	walkArrayExpression(expression?: any): void;
	walkSpreadElement(expression?: any): void;
	walkObjectExpression(expression?: any): void;
	walkProperty(prop?: any): void;
	walkFunctionExpression(expression?: any): void;
	walkArrowFunctionExpression(expression?: any): void;
	walkSequenceExpression(expression: SequenceExpression): void;
	walkUpdateExpression(expression?: any): void;
	walkUnaryExpression(expression?: any): void;
	walkLeftRightExpression(expression?: any): void;
	walkBinaryExpression(expression?: any): void;
	walkLogicalExpression(expression?: any): void;
	walkAssignmentExpression(expression?: any): void;
	walkConditionalExpression(expression?: any): void;
	walkNewExpression(expression?: any): void;
	walkYieldExpression(expression?: any): void;
	walkTemplateLiteral(expression?: any): void;
	walkTaggedTemplateExpression(expression?: any): void;
	walkClassExpression(expression?: any): void;
	walkChainExpression(expression: ChainExpression): void;
	walkImportExpression(expression?: any): void;
	walkCallExpression(expression?: any): void;
	walkMemberExpression(expression?: any): void;
	walkMemberExpressionWithExpressionName(
		expression?: any,
		name?: any,
		rootInfo?: any,
		members?: any,
		onUnhandled?: any
	): void;
	walkThisExpression(expression?: any): void;
	walkIdentifier(expression?: any): void;
	walkMetaProperty(metaProperty: MetaProperty): void;
	callHooksForExpression(hookMap: any, expr: any, ...args: any[]): any;
	callHooksForExpressionWithFallback<T, R>(
		hookMap: HookMap<SyncBailHook<T, R>>,
		expr: MemberExpression,
		fallback: (
			arg0: string,
			arg1: string | ScopeInfo | VariableInfo,
			arg2: () => string[]
		) => any,
		defined: (arg0: string) => any,
		...args: AsArray<T>
	): R;
	callHooksForName<T, R>(
		hookMap: HookMap<SyncBailHook<T, R>>,
		name: string,
		...args: AsArray<T>
	): R;
	callHooksForInfo<T, R>(
		hookMap: HookMap<SyncBailHook<T, R>>,
		info: ExportedVariableInfo,
		...args: AsArray<T>
	): R;
	callHooksForInfoWithFallback<T, R>(
		hookMap: HookMap<SyncBailHook<T, R>>,
		info: ExportedVariableInfo,
		fallback: (arg0: string) => any,
		defined: () => any,
		...args: AsArray<T>
	): R;
	callHooksForNameWithFallback<T, R>(
		hookMap: HookMap<SyncBailHook<T, R>>,
		name: string,
		fallback: (arg0: string) => any,
		defined: () => any,
		...args: AsArray<T>
	): R;
	inScope(params: any, fn: () => void): void;
	inFunctionScope(hasThis?: any, params?: any, fn?: any): void;
	inBlockScope(fn?: any): void;
	detectMode(statements?: any): void;
	enterPatterns(patterns?: any, onIdent?: any): void;
	enterPattern(pattern?: any, onIdent?: any): void;
	enterIdentifier(pattern?: any, onIdent?: any): void;
	enterObjectPattern(pattern?: any, onIdent?: any): void;
	enterArrayPattern(pattern?: any, onIdent?: any): void;
	enterRestElement(pattern?: any, onIdent?: any): void;
	enterAssignmentPattern(pattern?: any, onIdent?: any): void;
	evaluateExpression(expression: Expression): BasicEvaluatedExpression;
	parseString(expression?: any): any;
	parseCalculatedString(expression?: any): any;
	evaluate(source: string): BasicEvaluatedExpression;
	isPure(
		expr:
			| undefined
			| null
			| UnaryExpression
			| ThisExpression
			| ArrayExpression
			| ObjectExpression
			| FunctionExpression
			| ArrowFunctionExpression
			| YieldExpression
			| SimpleLiteral
			| RegExpLiteral
			| BigIntLiteral
			| UpdateExpression
			| BinaryExpression
			| AssignmentExpression
			| LogicalExpression
			| MemberExpression
			| ConditionalExpression
			| SimpleCallExpression
			| NewExpression
			| SequenceExpression
			| TemplateLiteral
			| TaggedTemplateExpression
			| ClassExpression
			| MetaProperty
			| Identifier
			| AwaitExpression
			| ImportExpression
			| ChainExpression
			| FunctionDeclaration
			| VariableDeclaration
			| ClassDeclaration
			| PrivateIdentifier,
		commentsStartPos: number
	): boolean;
	getComments(range?: any): any[];
	isAsiPosition(pos: number): boolean;
	unsetAsiPosition(pos: number): void;
	isStatementLevelExpression(expr?: any): boolean;
	getTagData(name?: any, tag?: any): any;
	tagVariable(name?: any, tag?: any, data?: any): void;
	defineVariable(name?: any): void;
	undefineVariable(name?: any): void;
	isVariableDefined(name?: any): boolean;
	getVariableInfo(name: string): ExportedVariableInfo;
	setVariable(name: string, variableInfo: ExportedVariableInfo): void;
	evaluatedVariable(tagInfo?: any): VariableInfo;
	parseCommentOptions(
		range?: any
	): { options: null; errors: null } | { options: object; errors: unknown[] };
	extractMemberExpressionChain(expression: MemberExpression): {
		members: string[];
		object:
			| UnaryExpression
			| ThisExpression
			| ArrayExpression
			| ObjectExpression
			| FunctionExpression
			| ArrowFunctionExpression
			| YieldExpression
			| SimpleLiteral
			| RegExpLiteral
			| BigIntLiteral
			| UpdateExpression
			| BinaryExpression
			| AssignmentExpression
			| LogicalExpression
			| MemberExpression
			| ConditionalExpression
			| SimpleCallExpression
			| NewExpression
			| SequenceExpression
			| TemplateLiteral
			| TaggedTemplateExpression
			| ClassExpression
			| MetaProperty
			| Identifier
			| AwaitExpression
			| ImportExpression
			| ChainExpression
			| Super;
		membersOptionals: boolean[];
	};
	getFreeInfoFromVariable(varName: string): {
		name: string;
		info: string | VariableInfo;
	};
	getMemberExpressionInfo(
		expression: MemberExpression,
		allowedTypes: number
	): undefined | CallExpressionInfo | ExpressionExpressionInfo;
	getNameForExpression(expression: MemberExpression): {
		name: string;
		rootInfo: ExportedVariableInfo;
		getMembers: () => string[];
	};
	static ALLOWED_MEMBER_TYPES_ALL: 3;
	static ALLOWED_MEMBER_TYPES_EXPRESSION: 2;
	static ALLOWED_MEMBER_TYPES_CALL_EXPRESSION: 1;
}

/**
 * Parser options for javascript modules.
 */
declare interface JavascriptParserOptions {
	[index: string]: any;

	/**
	 * Set the value of `require.amd` and `define.amd`. Or disable AMD support.
	 */
	amd?: false | { [index: string]: any };

	/**
	 * Enable/disable special handling for browserify bundles.
	 */
	browserify?: boolean;

	/**
	 * Enable/disable parsing of CommonJs syntax.
	 */
	commonjs?: boolean;

	/**
	 * Enable/disable parsing of magic comments in CommonJs syntax.
	 */
	commonjsMagicComments?: boolean;

	/**
	 * Enable/disable parsing "import { createRequire } from "module"" and evaluating createRequire().
	 */
	createRequire?: string | boolean;

	/**
	 * Specifies global mode for dynamic import.
	 */
	dynamicImportMode?: "weak" | "eager" | "lazy" | "lazy-once";

	/**
	 * Specifies global prefetch for dynamic import.
	 */
	dynamicImportPrefetch?: number | boolean;

	/**
	 * Specifies global preload for dynamic import.
	 */
	dynamicImportPreload?: number | boolean;

	/**
	 * Specifies the behavior of invalid export names in "import ... from ..." and "export ... from ...".
	 */
	exportsPresence?: false | "auto" | "error" | "warn";

	/**
	 * Enable warnings for full dynamic dependencies.
	 */
	exprContextCritical?: boolean;

	/**
	 * Enable recursive directory lookup for full dynamic dependencies.
	 */
	exprContextRecursive?: boolean;

	/**
	 * Sets the default regular expression for full dynamic dependencies.
	 */
	exprContextRegExp?: boolean | RegExp;

	/**
	 * Set the default request for full dynamic dependencies.
	 */
	exprContextRequest?: string;

	/**
	 * Enable/disable parsing of EcmaScript Modules syntax.
	 */
	harmony?: boolean;

	/**
	 * Enable/disable parsing of import() syntax.
	 */
	import?: boolean;

	/**
	 * Specifies the behavior of invalid export names in "import ... from ...".
	 */
	importExportsPresence?: false | "auto" | "error" | "warn";

	/**
	 * Enable/disable evaluating import.meta.
	 */
	importMeta?: boolean;

	/**
	 * Enable/disable evaluating import.meta.webpackContext.
	 */
	importMetaContext?: boolean;

	/**
	 * Include polyfills or mocks for various node stuff.
	 */
	node?: false | NodeOptions;

	/**
	 * Specifies the behavior of invalid export names in "export ... from ...". This might be useful to disable during the migration from "export ... from ..." to "export type ... from ..." when reexporting types in TypeScript.
	 */
	reexportExportsPresence?: false | "auto" | "error" | "warn";

	/**
	 * Enable/disable parsing of require.context syntax.
	 */
	requireContext?: boolean;

	/**
	 * Enable/disable parsing of require.ensure syntax.
	 */
	requireEnsure?: boolean;

	/**
	 * Enable/disable parsing of require.include syntax.
	 */
	requireInclude?: boolean;

	/**
	 * Enable/disable parsing of require.js special syntax like require.config, requirejs.config, require.version and requirejs.onError.
	 */
	requireJs?: boolean;

	/**
	 * Deprecated in favor of "exportsPresence". Emit errors instead of warnings when imported names don't exist in imported module.
	 */
	strictExportPresence?: boolean;

	/**
	 * Handle the this context correctly according to the spec for namespace objects.
	 */
	strictThisContextOnImports?: boolean;

	/**
	 * Enable/disable parsing of System.js special syntax like System.import, System.get, System.set and System.register.
	 */
	system?: boolean;

	/**
	 * Enable warnings when using the require function in a not statically analyse-able way.
	 */
	unknownContextCritical?: boolean;

	/**
	 * Enable recursive directory lookup when using the require function in a not statically analyse-able way.
	 */
	unknownContextRecursive?: boolean;

	/**
	 * Sets the regular expression when using the require function in a not statically analyse-able way.
	 */
	unknownContextRegExp?: boolean | RegExp;

	/**
	 * Sets the request when using the require function in a not statically analyse-able way.
	 */
	unknownContextRequest?: string;

	/**
	 * Enable/disable parsing of new URL() syntax.
	 */
	url?: boolean | "relative";

	/**
	 * Disable or configure parsing of WebWorker syntax like new Worker() or navigator.serviceWorker.register().
	 */
	worker?: boolean | string[];

	/**
	 * Enable warnings for partial dynamic dependencies.
	 */
	wrappedContextCritical?: boolean;

	/**
	 * Enable recursive directory lookup for partial dynamic dependencies.
	 */
	wrappedContextRecursive?: boolean;

	/**
	 * Set the inner regular expression for partial dynamic dependencies.
	 */
	wrappedContextRegExp?: RegExp;
}
declare class JsonpChunkLoadingRuntimeModule extends RuntimeModule {
	constructor(runtimeRequirements?: any);
	static getCompilationHooks(
		compilation: Compilation
	): JsonpCompilationPluginHooks;

	/**
	 * Runtime modules without any dependencies to other runtime modules
	 */
	static STAGE_NORMAL: number;

	/**
	 * Runtime modules with simple dependencies on other runtime modules
	 */
	static STAGE_BASIC: number;

	/**
	 * Runtime modules which attach to handlers of other runtime modules
	 */
	static STAGE_ATTACH: number;

	/**
	 * Runtime modules which trigger actions on bootstrap
	 */
	static STAGE_TRIGGER: number;
}
declare interface JsonpCompilationPluginHooks {
	linkPreload: SyncWaterfallHook<[string, Chunk]>;
	linkPrefetch: SyncWaterfallHook<[string, Chunk]>;
}
declare class JsonpTemplatePlugin {
	constructor();

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
	static getCompilationHooks(
		compilation: Compilation
	): JsonpCompilationPluginHooks;
}
declare interface KnownAssetInfo {
	/**
	 * true, if the asset can be long term cached forever (contains a hash)
	 */
	immutable?: boolean;

	/**
	 * whether the asset is minimized
	 */
	minimized?: boolean;

	/**
	 * the value(s) of the full hash used for this asset
	 */
	fullhash?: string | string[];

	/**
	 * the value(s) of the chunk hash used for this asset
	 */
	chunkhash?: string | string[];

	/**
	 * the value(s) of the module hash used for this asset
	 */
	modulehash?: string | string[];

	/**
	 * the value(s) of the content hash used for this asset
	 */
	contenthash?: string | string[];

	/**
	 * when asset was created from a source file (potentially transformed), the original filename relative to compilation context
	 */
	sourceFilename?: string;

	/**
	 * size in bytes, only set after asset has been emitted
	 */
	size?: number;

	/**
	 * true, when asset is only used for development and doesn't count towards user-facing assets
	 */
	development?: boolean;

	/**
	 * true, when asset ships data for updating an existing application (HMR)
	 */
	hotModuleReplacement?: boolean;

	/**
	 * true, when asset is javascript and an ESM
	 */
	javascriptModule?: boolean;

	/**
	 * object of pointers to other assets, keyed by type of relation (only points from parent to child)
	 */
	related?: Record<string, string | string[]>;
}
declare interface KnownBuildMeta {
	moduleArgument?: string;
	exportsArgument?: string;
	strict?: boolean;
	moduleConcatenationBailout?: string;
	exportsType?: "namespace" | "dynamic" | "default" | "flagged";
	defaultObject?: false | "redirect" | "redirect-warn";
	strictHarmonyModule?: boolean;
	async?: boolean;
	sideEffectFree?: boolean;
}
declare interface KnownCreateStatsOptionsContext {
	forToString?: boolean;
}
declare interface KnownNormalizedStatsOptions {
	context: string;
	requestShortener: RequestShortener;
	chunksSort: string;
	modulesSort: string;
	chunkModulesSort: string;
	nestedModulesSort: string;
	assetsSort: string;
	ids: boolean;
	cachedAssets: boolean;
	groupAssetsByEmitStatus: boolean;
	groupAssetsByPath: boolean;
	groupAssetsByExtension: boolean;
	assetsSpace: number;
	excludeAssets: ((value: string, asset: StatsAsset) => boolean)[];
	excludeModules: ((
		name: string,
		module: StatsModule,
		type: "module" | "chunk" | "root-of-chunk" | "nested"
	) => boolean)[];
	warningsFilter: ((warning: StatsError, textValue: string) => boolean)[];
	cachedModules: boolean;
	orphanModules: boolean;
	dependentModules: boolean;
	runtimeModules: boolean;
	groupModulesByCacheStatus: boolean;
	groupModulesByLayer: boolean;
	groupModulesByAttributes: boolean;
	groupModulesByPath: boolean;
	groupModulesByExtension: boolean;
	groupModulesByType: boolean;
	entrypoints: boolean | "auto";
	chunkGroups: boolean;
	chunkGroupAuxiliary: boolean;
	chunkGroupChildren: boolean;
	chunkGroupMaxAssets: number;
	modulesSpace: number;
	chunkModulesSpace: number;
	nestedModulesSpace: number;
	logging: false | "none" | "error" | "warn" | "info" | "log" | "verbose";
	loggingDebug: ((value: string) => boolean)[];
	loggingTrace: boolean;
}
declare interface KnownStatsAsset {
	type: string;
	name: string;
	info: AssetInfo;
	size: number;
	emitted: boolean;
	comparedForEmit: boolean;
	cached: boolean;
	related?: StatsAsset[];
	chunkNames?: (string | number)[];
	chunkIdHints?: (string | number)[];
	chunks?: (string | number)[];
	auxiliaryChunkNames?: (string | number)[];
	auxiliaryChunks?: (string | number)[];
	auxiliaryChunkIdHints?: (string | number)[];
	filteredRelated?: number;
	isOverSizeLimit?: boolean;
}
declare interface KnownStatsChunk {
	rendered: boolean;
	initial: boolean;
	entry: boolean;
	recorded: boolean;
	reason?: string;
	size: number;
	sizes?: Record<string, number>;
	names?: string[];
	idHints?: string[];
	runtime?: string[];
	files?: string[];
	auxiliaryFiles?: string[];
	hash: string;
	childrenByOrder?: Record<string, (string | number)[]>;
	id?: string | number;
	siblings?: (string | number)[];
	parents?: (string | number)[];
	children?: (string | number)[];
	modules?: StatsModule[];
	filteredModules?: number;
	origins?: StatsChunkOrigin[];
}
declare interface KnownStatsChunkGroup {
	name?: string;
	chunks?: (string | number)[];
	assets?: { name: string; size?: number }[];
	filteredAssets?: number;
	assetsSize?: number;
	auxiliaryAssets?: { name: string; size?: number }[];
	filteredAuxiliaryAssets?: number;
	auxiliaryAssetsSize?: number;
	children?: { [index: string]: StatsChunkGroup[] };
	childAssets?: { [index: string]: string[] };
	isOverSizeLimit?: boolean;
}
declare interface KnownStatsChunkOrigin {
	module?: string;
	moduleIdentifier?: string;
	moduleName?: string;
	loc?: string;
	request?: string;
	moduleId?: string | number;
}
declare interface KnownStatsCompilation {
	env?: any;
	name?: string;
	hash?: string;
	version?: string;
	time?: number;
	builtAt?: number;
	needAdditionalPass?: boolean;
	publicPath?: string;
	outputPath?: string;
	assetsByChunkName?: Record<string, string[]>;
	assets?: StatsAsset[];
	filteredAssets?: number;
	chunks?: StatsChunk[];
	modules?: StatsModule[];
	filteredModules?: number;
	entrypoints?: Record<string, StatsChunkGroup>;
	namedChunkGroups?: Record<string, StatsChunkGroup>;
	errors?: StatsError[];
	errorsCount?: number;
	warnings?: StatsError[];
	warningsCount?: number;
	children?: StatsCompilation[];
	logging?: Record<string, StatsLogging>;
}
declare interface KnownStatsError {
	message: string;
	chunkName?: string;
	chunkEntry?: boolean;
	chunkInitial?: boolean;
	file?: string;
	moduleIdentifier?: string;
	moduleName?: string;
	loc?: string;
	chunkId?: string | number;
	moduleId?: string | number;
	moduleTrace?: StatsModuleTraceItem[];
	details?: any;
	stack?: string;
}
declare interface KnownStatsFactoryContext {
	type: string;
	makePathsRelative?: (arg0: string) => string;
	compilation?: Compilation;
	rootModules?: Set<Module>;
	compilationFileToChunks?: Map<string, Chunk[]>;
	compilationAuxiliaryFileToChunks?: Map<string, Chunk[]>;
	runtime?: RuntimeSpec;
	cachedGetErrors?: (arg0: Compilation) => WebpackError[];
	cachedGetWarnings?: (arg0: Compilation) => WebpackError[];
}
declare interface KnownStatsLogging {
	entries: StatsLoggingEntry[];
	filteredEntries: number;
	debug: boolean;
}
declare interface KnownStatsLoggingEntry {
	type: string;
	message: string;
	trace?: string[];
	children?: StatsLoggingEntry[];
	args?: any[];
	time?: number;
}
declare interface KnownStatsModule {
	type?: string;
	moduleType?: string;
	layer?: string;
	identifier?: string;
	name?: string;
	nameForCondition?: string;
	index?: number;
	preOrderIndex?: number;
	index2?: number;
	postOrderIndex?: number;
	size?: number;
	sizes?: { [index: string]: number };
	cacheable?: boolean;
	built?: boolean;
	codeGenerated?: boolean;
	buildTimeExecuted?: boolean;
	cached?: boolean;
	optional?: boolean;
	orphan?: boolean;
	id?: string | number;
	issuerId?: string | number;
	chunks?: (string | number)[];
	assets?: (string | number)[];
	dependent?: boolean;
	issuer?: string;
	issuerName?: string;
	issuerPath?: StatsModuleIssuer[];
	failed?: boolean;
	errors?: number;
	warnings?: number;
	profile?: StatsProfile;
	reasons?: StatsModuleReason[];
	usedExports?: boolean | string[];
	providedExports?: string[];
	optimizationBailout?: string[];
	depth?: number;
	modules?: StatsModule[];
	filteredModules?: number;
	source?: string | Buffer;
}
declare interface KnownStatsModuleIssuer {
	identifier?: string;
	name?: string;
	id?: string | number;
	profile?: StatsProfile;
}
declare interface KnownStatsModuleReason {
	moduleIdentifier?: string;
	module?: string;
	moduleName?: string;
	resolvedModuleIdentifier?: string;
	resolvedModule?: string;
	type?: string;
	active: boolean;
	explanation?: string;
	userRequest?: string;
	loc?: string;
	moduleId?: string | number;
	resolvedModuleId?: string | number;
}
declare interface KnownStatsModuleTraceDependency {
	loc?: string;
}
declare interface KnownStatsModuleTraceItem {
	originIdentifier?: string;
	originName?: string;
	moduleIdentifier?: string;
	moduleName?: string;
	dependencies?: StatsModuleTraceDependency[];
	originId?: string | number;
	moduleId?: string | number;
}
declare interface KnownStatsPrinterContext {
	type?: string;
	compilation?: StatsCompilation;
	chunkGroup?: StatsChunkGroup;
	asset?: StatsAsset;
	module?: StatsModule;
	chunk?: StatsChunk;
	moduleReason?: StatsModuleReason;
	bold?: (str: string) => string;
	yellow?: (str: string) => string;
	red?: (str: string) => string;
	green?: (str: string) => string;
	magenta?: (str: string) => string;
	cyan?: (str: string) => string;
	formatFilename?: (file: string, oversize?: boolean) => string;
	formatModuleId?: (id: string) => string;
	formatChunkId?: (
		id: string,
		direction?: "parent" | "child" | "sibling"
	) => string;
	formatSize?: (size: number) => string;
	formatDateTime?: (dateTime: number) => string;
	formatFlag?: (flag: string) => string;
	formatTime?: (time: number, boldQuantity?: boolean) => string;
	chunkGroupKind?: string;
}
declare interface KnownStatsProfile {
	total: number;
	resolving: number;
	restoring: number;
	building: number;
	integration: number;
	storing: number;
	additionalResolving: number;
	additionalIntegration: number;
	factory: number;
	dependencies: number;
}

/**
 * Options for the default backend.
 */
declare interface LazyCompilationDefaultBackendOptions {
	/**
	 * A custom client.
	 */
	client?: string;

	/**
	 * Specifies where to listen to from the server.
	 */
	listen?: number | ListenOptions | ((server: typeof Server) => void);

	/**
	 * Specifies the protocol the client should use to connect to the server.
	 */
	protocol?: "http" | "https";

	/**
	 * Specifies how to create the server handling the EventSource requests.
	 */
	server?: ServerOptionsImport | ServerOptionsHttps | (() => typeof Server);
}

/**
 * Options for compiling entrypoints and import()s only when they are accessed.
 */
declare interface LazyCompilationOptions {
	/**
	 * Specifies the backend that should be used for handling client keep alive.
	 */
	backend?:
		| ((
				compiler: Compiler,
				callback: (err?: Error, api?: BackendApi) => void
		  ) => void)
		| ((compiler: Compiler) => Promise<BackendApi>)
		| LazyCompilationDefaultBackendOptions;

	/**
	 * Enable/disable lazy compilation for entries.
	 */
	entries?: boolean;

	/**
	 * Enable/disable lazy compilation for import() modules.
	 */
	imports?: boolean;

	/**
	 * Specify which entrypoints or import()ed modules should be lazily compiled. This is matched with the imported module and not the entrypoint name.
	 */
	test?: string | RegExp | ((module: Module) => boolean);
}
declare class LazySet<T> {
	constructor(iterable?: Iterable<T>);
	get size(): number;
	add(item: T): LazySet<T>;
	addAll(iterable: LazySet<T> | Iterable<T>): LazySet<T>;
	clear(): void;
	delete(value: T): boolean;
	entries(): IterableIterator<[T, T]>;
	forEach(
		callbackFn: (arg0: T, arg1: T, arg2: Set<T>) => void,
		thisArg?: any
	): void;
	has(item: T): boolean;
	keys(): IterableIterator<T>;
	values(): IterableIterator<T>;
	serialize(__0: { write: any }): void;
	[Symbol.iterator](): IterableIterator<T>;
	static deserialize(__0: { read: any }): LazySet<any>;
}
declare interface LibIdentOptions {
	/**
	 * absolute context path to which lib ident is relative to
	 */
	context: string;

	/**
	 * object for caching
	 */
	associatedObjectForCache?: Object;
}
declare class LibManifestPlugin {
	constructor(options?: any);
	options: any;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare interface LibraryContext<T> {
	compilation: Compilation;
	chunkGraph: ChunkGraph;
	options: T;
}

/**
 * Set explicit comments for `commonjs`, `commonjs2`, `amd`, and `root`.
 */
declare interface LibraryCustomUmdCommentObject {
	/**
	 * Set comment for `amd` section in UMD.
	 */
	amd?: string;

	/**
	 * Set comment for `commonjs` (exports) section in UMD.
	 */
	commonjs?: string;

	/**
	 * Set comment for `commonjs2` (module.exports) section in UMD.
	 */
	commonjs2?: string;

	/**
	 * Set comment for `root` (global variable) section in UMD.
	 */
	root?: string;
}

/**
 * Description object for all UMD variants of the library name.
 */
declare interface LibraryCustomUmdObject {
	/**
	 * Name of the exposed AMD library in the UMD.
	 */
	amd?: string;

	/**
	 * Name of the exposed commonjs export in the UMD.
	 */
	commonjs?: string;

	/**
	 * Name of the property exposed globally by a UMD library.
	 */
	root?: string | string[];
}
type LibraryExport = string | string[];
type LibraryName = string | string[] | LibraryCustomUmdObject;

/**
 * Options for library.
 */
declare interface LibraryOptions {
	/**
	 * Add a comment in the UMD wrapper.
	 */
	auxiliaryComment?: string | LibraryCustomUmdCommentObject;

	/**
	 * Specify which export should be exposed as library.
	 */
	export?: string | string[];

	/**
	 * The name of the library (some types allow unnamed libraries too).
	 */
	name?: string | string[] | LibraryCustomUmdObject;

	/**
	 * Type of library (types included by default are 'var', 'module', 'assign', 'assign-properties', 'this', 'window', 'self', 'global', 'commonjs', 'commonjs2', 'commonjs-module', 'commonjs-static', 'amd', 'amd-require', 'umd', 'umd2', 'jsonp', 'system', but others might be added by plugins).
	 */
	type: string;

	/**
	 * If `output.libraryTarget` is set to umd and `output.library` is set, setting this to true will name the AMD module.
	 */
	umdNamedDefine?: boolean;
}
declare class LibraryTemplatePlugin {
	constructor(
		name: LibraryName,
		target: string,
		umdNamedDefine: boolean,
		auxiliaryComment: AuxiliaryComment,
		exportProperty: LibraryExport
	);
	library: {
		type: string;
		name: LibraryName;
		umdNamedDefine: boolean;
		auxiliaryComment: AuxiliaryComment;
		export: LibraryExport;
	};

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare class LimitChunkCountPlugin {
	constructor(options?: LimitChunkCountPluginOptions);
	options?: LimitChunkCountPluginOptions;
	apply(compiler: Compiler): void;
}
declare interface LimitChunkCountPluginOptions {
	/**
	 * Constant overhead for a chunk.
	 */
	chunkOverhead?: number;

	/**
	 * Multiplicator for initial chunks.
	 */
	entryChunkMultiplicator?: number;

	/**
	 * Limit the maximum number of chunks using a value greater greater than or equal to 1.
	 */
	maxChunks: number;
}
declare interface LoadScriptCompilationHooks {
	createScript: SyncWaterfallHook<[string, Chunk]>;
}
declare class LoadScriptRuntimeModule extends HelperRuntimeModule {
	constructor(withCreateScriptUrl?: boolean);
	static getCompilationHooks(
		compilation: Compilation
	): LoadScriptCompilationHooks;

	/**
	 * Runtime modules without any dependencies to other runtime modules
	 */
	static STAGE_NORMAL: number;

	/**
	 * Runtime modules with simple dependencies on other runtime modules
	 */
	static STAGE_BASIC: number;

	/**
	 * Runtime modules which attach to handlers of other runtime modules
	 */
	static STAGE_ATTACH: number;

	/**
	 * Runtime modules which trigger actions on bootstrap
	 */
	static STAGE_TRIGGER: number;
}

/**
 * Custom values available in the loader context.
 */
declare interface Loader {
	[index: string]: any;
}
type LoaderContext<OptionsType> = NormalModuleLoaderContext<OptionsType> &
	LoaderRunnerLoaderContext<OptionsType> &
	LoaderPluginLoaderContext &
	HotModuleReplacementPluginLoaderContext;
type LoaderDefinition<
	OptionsType = {},
	ContextAdditions = {}
> = LoaderDefinitionFunction<OptionsType, ContextAdditions> & {
	raw?: false;
	pitch?: PitchLoaderDefinitionFunction<OptionsType, ContextAdditions>;
};
declare interface LoaderDefinitionFunction<
	OptionsType = {},
	ContextAdditions = {}
> {
	(
		this: NormalModuleLoaderContext<OptionsType> &
			LoaderRunnerLoaderContext<OptionsType> &
			LoaderPluginLoaderContext &
			HotModuleReplacementPluginLoaderContext &
			ContextAdditions,
		content: string,
		sourceMap?: string | SourceMap,
		additionalData?: AdditionalData
	): string | void | Buffer | Promise<string | Buffer>;
}
declare interface LoaderItem {
	loader: string;
	options: any;
	ident: null | string;
	type: null | string;
}
declare interface LoaderModule<OptionsType = {}, ContextAdditions = {}> {
	default?:
		| RawLoaderDefinitionFunction<OptionsType, ContextAdditions>
		| LoaderDefinitionFunction<OptionsType, ContextAdditions>;
	raw?: false;
	pitch?: PitchLoaderDefinitionFunction<OptionsType, ContextAdditions>;
}
declare class LoaderOptionsPlugin {
	constructor(options?: LoaderOptionsPluginOptions);
	options: LoaderOptionsPluginOptions;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare interface LoaderOptionsPluginOptions {
	[index: string]: any;

	/**
	 * Whether loaders should be in debug mode or not. debug will be removed as of webpack 3.
	 */
	debug?: boolean;

	/**
	 * Where loaders can be switched to minimize mode.
	 */
	minimize?: boolean;

	/**
	 * A configuration object that can be used to configure older loaders.
	 */
	options?: {
		[index: string]: any;
		/**
		 * The context that can be used to configure older loaders.
		 */
		context?: string;
	};
}

/**
 * These properties are added by the LoaderPlugin
 */
declare interface LoaderPluginLoaderContext {
	/**
	 * Resolves the given request to a module, applies all configured loaders and calls
	 * back with the generated source, the sourceMap and the module instance (usually an
	 * instance of NormalModule). Use this function if you need to know the source code
	 * of another module to generate the result.
	 */
	loadModule(
		request: string,
		callback: (
			err: null | Error,
			source: string,
			sourceMap: any,
			module: NormalModule
		) => void
	): void;
	importModule(
		request: string,
		options: ImportModuleOptions,
		callback: (err?: null | Error, exports?: any) => any
	): void;
	importModule(request: string, options?: ImportModuleOptions): Promise<any>;
}

/**
 * The properties are added by https://github.com/webpack/loader-runner
 */
declare interface LoaderRunnerLoaderContext<OptionsType> {
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
		err?: null | Error,
		content?: string | Buffer,
		sourceMap?: string | SourceMap,
		additionalData?: AdditionalData
	) => void;

	/**
	 * Make this loader result cacheable. By default it's cacheable.
	 * A cacheable loader must have a deterministic result, when inputs and dependencies haven't changed.
	 * This means the loader shouldn't have other dependencies than specified with this.addDependency.
	 * Most loaders are deterministic and cacheable.
	 */
	cacheable(flag?: boolean): void;
	callback: (
		err?: null | Error,
		content?: string | Buffer,
		sourceMap?: string | SourceMap,
		additionalData?: AdditionalData
	) => void;

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
		options?: string | object;
		ident: string;
		normal?: Function;
		pitch?: Function;
		raw?: boolean;
		data?: object;
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

	/**
	 * Target of compilation.
	 * Example: "web"
	 */
	target: string;
}
declare class LoaderTargetPlugin {
	constructor(target: string);
	target: string;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare interface LogEntry {
	type: string;
	args: any[];
	time: number;
	trace?: string[];
}
declare const MEASURE_END_OPERATION: unique symbol;
declare const MEASURE_START_OPERATION: unique symbol;
declare interface MainRenderContext {
	/**
	 * the chunk
	 */
	chunk: Chunk;

	/**
	 * the dependency templates
	 */
	dependencyTemplates: DependencyTemplates;

	/**
	 * the runtime template
	 */
	runtimeTemplate: RuntimeTemplate;

	/**
	 * the module graph
	 */
	moduleGraph: ModuleGraph;

	/**
	 * the chunk graph
	 */
	chunkGraph: ChunkGraph;

	/**
	 * results of code generation
	 */
	codeGenerationResults: CodeGenerationResults;

	/**
	 * hash to be used for render call
	 */
	hash: string;

	/**
	 * rendering in strict context
	 */
	strictMode: boolean;
}
declare abstract class MainTemplate {
	hooks: Readonly<{
		renderManifest: { tap: (options?: any, fn?: any) => void };
		modules: { tap: () => never };
		moduleObj: { tap: () => never };
		require: { tap: (options?: any, fn?: any) => void };
		beforeStartup: { tap: () => never };
		startup: { tap: () => never };
		afterStartup: { tap: () => never };
		render: { tap: (options?: any, fn?: any) => void };
		renderWithEntry: { tap: (options?: any, fn?: any) => void };
		assetPath: {
			tap: (options?: any, fn?: any) => void;
			call: (filename?: any, options?: any) => string;
		};
		hash: { tap: (options?: any, fn?: any) => void };
		hashForChunk: { tap: (options?: any, fn?: any) => void };
		globalHashPaths: { tap: () => void };
		globalHash: { tap: () => void };
		hotBootstrap: { tap: () => never };
		bootstrap: SyncWaterfallHook<
			[string, Chunk, string, ModuleTemplate, DependencyTemplates]
		>;
		localVars: SyncWaterfallHook<[string, Chunk, string]>;
		requireExtensions: SyncWaterfallHook<[string, Chunk, string]>;
		requireEnsure: SyncWaterfallHook<[string, Chunk, string, string]>;
		get jsonpScript(): SyncWaterfallHook<[string, Chunk]>;
		get linkPrefetch(): SyncWaterfallHook<[string, Chunk]>;
		get linkPreload(): SyncWaterfallHook<[string, Chunk]>;
	}>;
	renderCurrentHashCode: (hash: string, length?: number) => string;
	getPublicPath: (options: object) => string;
	getAssetPath: (path?: any, options?: any) => string;
	getAssetPathWithInfo: (
		path?: any,
		options?: any
	) => { path: string; info: AssetInfo };
	get requireFn(): "__webpack_require__";
	get outputOptions(): Output;
}
declare interface MapOptions {
	columns?: boolean;
	module?: boolean;
}

/**
 * Options object for in-memory caching.
 */
declare interface MemoryCacheOptions {
	/**
	 * Additionally cache computation of modules that are unchanged and reference only unchanged modules.
	 */
	cacheUnaffected?: boolean;

	/**
	 * Number of generations unused cache entries stay in memory cache at minimum (1 = may be removed after unused for a single compilation, ..., Infinity: kept forever).
	 */
	maxGenerations?: number;

	/**
	 * In memory caching.
	 */
	type: "memory";
}
declare class MemoryCachePlugin {
	constructor();

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare class MinChunkSizePlugin {
	constructor(options: MinChunkSizePluginOptions);
	options: MinChunkSizePluginOptions;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare interface MinChunkSizePluginOptions {
	/**
	 * Constant overhead for a chunk.
	 */
	chunkOverhead?: number;

	/**
	 * Multiplicator for initial chunks.
	 */
	entryChunkMultiplicator?: number;

	/**
	 * Minimum number of characters.
	 */
	minChunkSize: number;
}
declare class Module extends DependenciesBlock {
	constructor(type: string, context?: string, layer?: string);
	type: string;
	context: null | string;
	layer: null | string;
	needId: boolean;
	debugId: number;
	resolveOptions: ResolveOptionsWebpackOptions;
	factoryMeta?: object;
	useSourceMap: boolean;
	useSimpleSourceMap: boolean;
	buildMeta: BuildMeta;
	buildInfo: Record<string, any>;
	presentationalDependencies?: Dependency[];
	codeGenerationDependencies?: Dependency[];
	id: string | number;
	get hash(): string;
	get renderedHash(): string;
	profile: null | ModuleProfile;
	index: number;
	index2: number;
	depth: number;
	issuer: null | Module;
	get usedExports(): null | boolean | SortableSet<string>;
	get optimizationBailout(): (
		| string
		| ((requestShortener: RequestShortener) => string)
	)[];
	get optional(): boolean;
	addChunk(chunk?: any): boolean;
	removeChunk(chunk?: any): void;
	isInChunk(chunk?: any): boolean;
	isEntryModule(): boolean;
	getChunks(): Chunk[];
	getNumberOfChunks(): number;
	get chunksIterable(): Iterable<Chunk>;
	isProvided(exportName: string): null | boolean;
	get exportsArgument(): string;
	get moduleArgument(): string;
	getExportsType(
		moduleGraph: ModuleGraph,
		strict: boolean
	): "namespace" | "default-only" | "default-with-named" | "dynamic";
	addPresentationalDependency(presentationalDependency: Dependency): void;
	addCodeGenerationDependency(codeGenerationDependency: Dependency): void;
	addWarning(warning: WebpackError): void;
	getWarnings(): undefined | Iterable<WebpackError>;
	getNumberOfWarnings(): number;
	addError(error: WebpackError): void;
	getErrors(): undefined | Iterable<WebpackError>;
	getNumberOfErrors(): number;

	/**
	 * removes all warnings and errors
	 */
	clearWarningsAndErrors(): void;
	isOptional(moduleGraph: ModuleGraph): boolean;
	isAccessibleInChunk(
		chunkGraph: ChunkGraph,
		chunk: Chunk,
		ignoreChunk?: Chunk
	): boolean;
	isAccessibleInChunkGroup(
		chunkGraph: ChunkGraph,
		chunkGroup: ChunkGroup,
		ignoreChunk?: Chunk
	): boolean;
	hasReasonForChunk(
		chunk: Chunk,
		moduleGraph: ModuleGraph,
		chunkGraph: ChunkGraph
	): boolean;
	hasReasons(moduleGraph: ModuleGraph, runtime: RuntimeSpec): boolean;
	needBuild(
		context: NeedBuildContext,
		callback: (arg0?: null | WebpackError, arg1?: boolean) => void
	): void;
	needRebuild(
		fileTimestamps: Map<string, null | number>,
		contextTimestamps: Map<string, null | number>
	): boolean;
	invalidateBuild(): void;
	identifier(): string;
	readableIdentifier(requestShortener: RequestShortener): string;
	build(
		options: WebpackOptionsNormalized,
		compilation: Compilation,
		resolver: ResolverWithOptions,
		fs: InputFileSystem,
		callback: (arg0?: WebpackError) => void
	): void;
	getSourceTypes(): Set<string>;
	source(
		dependencyTemplates: DependencyTemplates,
		runtimeTemplate: RuntimeTemplate,
		type?: string
	): Source;
	size(type?: string): number;
	libIdent(options: LibIdentOptions): null | string;
	nameForCondition(): null | string;
	getConcatenationBailoutReason(
		context: ConcatenationBailoutReasonContext
	): undefined | string;
	getSideEffectsConnectionState(moduleGraph: ModuleGraph): ConnectionState;
	codeGeneration(context: CodeGenerationContext): CodeGenerationResult;
	chunkCondition(chunk: Chunk, compilation: Compilation): boolean;
	hasChunkCondition(): boolean;

	/**
	 * Assuming this module is in the cache. Update the (cached) module with
	 * the fresh module from the factory. Usually updates internal references
	 * and properties.
	 */
	updateCacheModule(module: Module): void;

	/**
	 * Module should be unsafe cached. Get data that's needed for that.
	 * This data will be passed to restoreFromUnsafeCache later.
	 */
	getUnsafeCacheData(): object;

	/**
	 * Assuming this module is in the cache. Remove internal references to allow freeing some memory.
	 */
	cleanupForCache(): void;
	originalSource(): null | Source;
	addCacheDependencies(
		fileDependencies: LazySet<string>,
		contextDependencies: LazySet<string>,
		missingDependencies: LazySet<string>,
		buildDependencies: LazySet<string>
	): void;
	get hasEqualsChunks(): any;
	get isUsed(): any;
	get errors(): any;
	get warnings(): any;
	used: any;
}
declare class ModuleConcatenationPlugin {
	constructor(options?: any);
	options: any;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare class ModuleDependency extends Dependency {
	constructor(request: string);
	request: string;
	userRequest: string;
	range: any;
	assertions?: Record<string, any>;
	static Template: typeof DependencyTemplate;
	static NO_EXPORTS_REFERENCED: string[][];
	static EXPORTS_OBJECT_REFERENCED: string[][];
	static TRANSITIVE: typeof TRANSITIVE;
}
declare abstract class ModuleFactory {
	create(
		data: ModuleFactoryCreateData,
		callback: (arg0?: Error, arg1?: ModuleFactoryResult) => void
	): void;
}
declare interface ModuleFactoryCreateData {
	contextInfo: ModuleFactoryCreateDataContextInfo;
	resolveOptions?: ResolveOptionsWebpackOptions;
	context: string;
	dependencies: Dependency[];
}
declare interface ModuleFactoryCreateDataContextInfo {
	issuer: string;
	issuerLayer?: null | string;
	compiler: string;
}
declare interface ModuleFactoryResult {
	/**
	 * the created module or unset if no module was created
	 */
	module?: Module;
	fileDependencies?: Set<string>;
	contextDependencies?: Set<string>;
	missingDependencies?: Set<string>;

	/**
	 * allow to use the unsafe cache
	 */
	cacheable?: boolean;
}
declare class ModuleFederationPlugin {
	constructor(options: ModuleFederationPluginOptions);

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare interface ModuleFederationPluginOptions {
	/**
	 * Modules that should be exposed by this container. When provided, property name is used as public name, otherwise public name is automatically inferred from request.
	 */
	exposes?: (string | ExposesObject)[] | ExposesObject;

	/**
	 * The filename of the container as relative path inside the `output.path` directory.
	 */
	filename?: string;

	/**
	 * Options for library.
	 */
	library?: LibraryOptions;

	/**
	 * The name of the container.
	 */
	name?: string;

	/**
	 * The external type of the remote containers.
	 */
	remoteType?:
		| "import"
		| "var"
		| "module"
		| "assign"
		| "this"
		| "window"
		| "self"
		| "global"
		| "commonjs"
		| "commonjs2"
		| "commonjs-module"
		| "commonjs-static"
		| "amd"
		| "amd-require"
		| "umd"
		| "umd2"
		| "jsonp"
		| "system"
		| "promise"
		| "script"
		| "node-commonjs";

	/**
	 * Container locations and request scopes from which modules should be resolved and loaded at runtime. When provided, property name is used as request scope, otherwise request scope is automatically inferred from container location.
	 */
	remotes?: (string | RemotesObject)[] | RemotesObject;

	/**
	 * The name of the runtime chunk. If set a runtime chunk with this name is created or an existing entrypoint is used as runtime.
	 */
	runtime?: string | false;

	/**
	 * Share scope name used for all shared modules (defaults to 'default').
	 */
	shareScope?: string;

	/**
	 * Modules that should be shared in the share scope. When provided, property names are used to match requested modules in this compilation.
	 */
	shared?: (string | SharedObject)[] | SharedObject;
}
type ModuleFilterItemTypes =
	| string
	| RegExp
	| ((
			name: string,
			module: StatsModule,
			type: "module" | "chunk" | "root-of-chunk" | "nested"
	  ) => boolean);
declare class ModuleGraph {
	constructor();
	setParents(
		dependency: Dependency,
		block: DependenciesBlock,
		module: Module,
		indexInBlock?: number
	): void;
	getParentModule(dependency: Dependency): Module;
	getParentBlock(dependency: Dependency): DependenciesBlock;
	getParentBlockIndex(dependency: Dependency): number;
	setResolvedModule(
		originModule: Module,
		dependency: Dependency,
		module: Module
	): void;
	updateModule(dependency: Dependency, module: Module): void;
	removeConnection(dependency: Dependency): void;
	addExplanation(dependency: Dependency, explanation: string): void;
	cloneModuleAttributes(sourceModule: Module, targetModule: Module): void;
	removeModuleAttributes(module: Module): void;
	removeAllModuleAttributes(): void;
	moveModuleConnections(
		oldModule: Module,
		newModule: Module,
		filterConnection: (arg0: ModuleGraphConnection) => boolean
	): void;
	copyOutgoingModuleConnections(
		oldModule: Module,
		newModule: Module,
		filterConnection: (arg0: ModuleGraphConnection) => boolean
	): void;
	addExtraReason(module: Module, explanation: string): void;
	getResolvedModule(dependency: Dependency): Module;
	getConnection(dependency: Dependency): undefined | ModuleGraphConnection;
	getModule(dependency: Dependency): Module;
	getOrigin(dependency: Dependency): Module;
	getResolvedOrigin(dependency: Dependency): Module;
	getIncomingConnections(module: Module): Iterable<ModuleGraphConnection>;
	getOutgoingConnections(module: Module): Iterable<ModuleGraphConnection>;
	getIncomingConnectionsByOriginModule(
		module: Module
	): Map<undefined | Module, ReadonlyArray<ModuleGraphConnection>>;
	getOutgoingConnectionsByModule(
		module: Module
	): undefined | Map<undefined | Module, ReadonlyArray<ModuleGraphConnection>>;
	getProfile(module: Module): null | ModuleProfile;
	setProfile(module: Module, profile: null | ModuleProfile): void;
	getIssuer(module: Module): null | Module;
	setIssuer(module: Module, issuer: null | Module): void;
	setIssuerIfUnset(module: Module, issuer: null | Module): void;
	getOptimizationBailout(
		module: Module
	): (string | ((requestShortener: RequestShortener) => string))[];
	getProvidedExports(module: Module): null | true | string[];
	isExportProvided(
		module: Module,
		exportName: string | string[]
	): null | boolean;
	getExportsInfo(module: Module): ExportsInfo;
	getExportInfo(module: Module, exportName: string): ExportInfo;
	getReadOnlyExportInfo(module: Module, exportName: string): ExportInfo;
	getUsedExports(
		module: Module,
		runtime: RuntimeSpec
	): null | boolean | SortableSet<string>;
	getPreOrderIndex(module: Module): number;
	getPostOrderIndex(module: Module): number;
	setPreOrderIndex(module: Module, index: number): void;
	setPreOrderIndexIfUnset(module: Module, index: number): boolean;
	setPostOrderIndex(module: Module, index: number): void;
	setPostOrderIndexIfUnset(module: Module, index: number): boolean;
	getDepth(module: Module): number;
	setDepth(module: Module, depth: number): void;
	setDepthIfLower(module: Module, depth: number): boolean;
	isAsync(module: Module): boolean;
	setAsync(module: Module): void;
	getMeta(thing?: any): Object;
	getMetaIfExisting(thing?: any): Object;
	freeze(cacheStage?: string): void;
	unfreeze(): void;
	cached<T extends any[], V>(
		fn: (moduleGraph: ModuleGraph, ...args: T) => V,
		...args: T
	): V;
	setModuleMemCaches(
		moduleMemCaches: Map<Module, WeakTupleMap<any, any>>
	): void;
	dependencyCacheProvide(dependency: Dependency, ...args: any[]): any;
	static getModuleGraphForModule(
		module: Module,
		deprecateMessage: string,
		deprecationCode: string
	): ModuleGraph;
	static setModuleGraphForModule(
		module: Module,
		moduleGraph: ModuleGraph
	): void;
	static clearModuleGraphForModule(module: Module): void;
	static ModuleGraphConnection: typeof ModuleGraphConnection;
}
declare class ModuleGraphConnection {
	constructor(
		originModule: null | Module,
		dependency: null | Dependency,
		module: Module,
		explanation?: string,
		weak?: boolean,
		condition?:
			| false
			| ((arg0: ModuleGraphConnection, arg1: RuntimeSpec) => ConnectionState)
	);
	originModule: null | Module;
	resolvedOriginModule: null | Module;
	dependency: null | Dependency;
	resolvedModule: Module;
	module: Module;
	weak: boolean;
	conditional: boolean;
	condition: (
		arg0: ModuleGraphConnection,
		arg1: RuntimeSpec
	) => ConnectionState;
	explanations: Set<string>;
	clone(): ModuleGraphConnection;
	addCondition(
		condition: (
			arg0: ModuleGraphConnection,
			arg1: RuntimeSpec
		) => ConnectionState
	): void;
	addExplanation(explanation: string): void;
	get explanation(): string;
	active: void;
	isActive(runtime: RuntimeSpec): boolean;
	isTargetActive(runtime: RuntimeSpec): boolean;
	getActiveState(runtime: RuntimeSpec): ConnectionState;
	setActive(value: boolean): void;
	static addConnectionStates: (
		a: ConnectionState,
		b: ConnectionState
	) => ConnectionState;
	static TRANSITIVE_ONLY: typeof TRANSITIVE_ONLY;
	static CIRCULAR_CONNECTION: typeof CIRCULAR_CONNECTION;
}
type ModuleInfo = ConcatenatedModuleInfo | ExternalModuleInfo;

/**
 * Options affecting the normal modules (`NormalModuleFactory`).
 */
declare interface ModuleOptions {
	/**
	 * An array of rules applied by default for modules.
	 */
	defaultRules?: (RuleSetRule | "...")[];

	/**
	 * Enable warnings for full dynamic dependencies.
	 */
	exprContextCritical?: boolean;

	/**
	 * Enable recursive directory lookup for full dynamic dependencies. Deprecated: This option has moved to 'module.parser.javascript.exprContextRecursive'.
	 */
	exprContextRecursive?: boolean;

	/**
	 * Sets the default regular expression for full dynamic dependencies. Deprecated: This option has moved to 'module.parser.javascript.exprContextRegExp'.
	 */
	exprContextRegExp?: boolean | RegExp;

	/**
	 * Set the default request for full dynamic dependencies. Deprecated: This option has moved to 'module.parser.javascript.exprContextRequest'.
	 */
	exprContextRequest?: string;

	/**
	 * Specify options for each generator.
	 */
	generator?: GeneratorOptionsByModuleType;

	/**
	 * Don't parse files matching. It's matched against the full resolved request.
	 */
	noParse?: string | Function | RegExp | (string | Function | RegExp)[];

	/**
	 * Specify options for each parser.
	 */
	parser?: ParserOptionsByModuleType;

	/**
	 * An array of rules applied for modules.
	 */
	rules?: (RuleSetRule | "...")[];

	/**
	 * Emit errors instead of warnings when imported names don't exist in imported module. Deprecated: This option has moved to 'module.parser.javascript.strictExportPresence'.
	 */
	strictExportPresence?: boolean;

	/**
	 * Handle the this context correctly according to the spec for namespace objects. Deprecated: This option has moved to 'module.parser.javascript.strictThisContextOnImports'.
	 */
	strictThisContextOnImports?: boolean;

	/**
	 * Enable warnings when using the require function in a not statically analyse-able way. Deprecated: This option has moved to 'module.parser.javascript.unknownContextCritical'.
	 */
	unknownContextCritical?: boolean;

	/**
	 * Enable recursive directory lookup when using the require function in a not statically analyse-able way. Deprecated: This option has moved to 'module.parser.javascript.unknownContextRecursive'.
	 */
	unknownContextRecursive?: boolean;

	/**
	 * Sets the regular expression when using the require function in a not statically analyse-able way. Deprecated: This option has moved to 'module.parser.javascript.unknownContextRegExp'.
	 */
	unknownContextRegExp?: boolean | RegExp;

	/**
	 * Sets the request when using the require function in a not statically analyse-able way. Deprecated: This option has moved to 'module.parser.javascript.unknownContextRequest'.
	 */
	unknownContextRequest?: string;

	/**
	 * Cache the resolving of module requests.
	 */
	unsafeCache?: boolean | Function;

	/**
	 * Enable warnings for partial dynamic dependencies. Deprecated: This option has moved to 'module.parser.javascript.wrappedContextCritical'.
	 */
	wrappedContextCritical?: boolean;

	/**
	 * Enable recursive directory lookup for partial dynamic dependencies. Deprecated: This option has moved to 'module.parser.javascript.wrappedContextRecursive'.
	 */
	wrappedContextRecursive?: boolean;

	/**
	 * Set the inner regular expression for partial dynamic dependencies. Deprecated: This option has moved to 'module.parser.javascript.wrappedContextRegExp'.
	 */
	wrappedContextRegExp?: RegExp;
}

/**
 * Options affecting the normal modules (`NormalModuleFactory`).
 */
declare interface ModuleOptionsNormalized {
	/**
	 * An array of rules applied by default for modules.
	 */
	defaultRules: (RuleSetRule | "...")[];

	/**
	 * Specify options for each generator.
	 */
	generator: GeneratorOptionsByModuleType;

	/**
	 * Don't parse files matching. It's matched against the full resolved request.
	 */
	noParse?: string | Function | RegExp | (string | Function | RegExp)[];

	/**
	 * Specify options for each parser.
	 */
	parser: ParserOptionsByModuleType;

	/**
	 * An array of rules applied for modules.
	 */
	rules: (RuleSetRule | "...")[];

	/**
	 * Cache the resolving of module requests.
	 */
	unsafeCache?: boolean | Function;
}
declare interface ModulePathData {
	id: string | number;
	hash: string;
	hashWithLength?: (arg0: number) => string;
}
declare abstract class ModuleProfile {
	startTime: number;
	factoryStartTime: number;
	factoryEndTime: number;
	factory: number;
	factoryParallelismFactor: number;
	restoringStartTime: number;
	restoringEndTime: number;
	restoring: number;
	restoringParallelismFactor: number;
	integrationStartTime: number;
	integrationEndTime: number;
	integration: number;
	integrationParallelismFactor: number;
	buildingStartTime: number;
	buildingEndTime: number;
	building: number;
	buildingParallelismFactor: number;
	storingStartTime: number;
	storingEndTime: number;
	storing: number;
	storingParallelismFactor: number;
	additionalFactoryTimes: any;
	additionalFactories: number;
	additionalFactoriesParallelismFactor: number;
	additionalIntegration: number;
	markFactoryStart(): void;
	markFactoryEnd(): void;
	markRestoringStart(): void;
	markRestoringEnd(): void;
	markIntegrationStart(): void;
	markIntegrationEnd(): void;
	markBuildingStart(): void;
	markBuildingEnd(): void;
	markStoringStart(): void;
	markStoringEnd(): void;

	/**
	 * Merge this profile into another one
	 */
	mergeInto(realProfile: ModuleProfile): void;
}
declare interface ModuleReferenceOptions {
	/**
	 * the properties/exports of the module
	 */
	ids: string[];

	/**
	 * true, when this referenced export is called
	 */
	call: boolean;

	/**
	 * true, when this referenced export is directly imported (not via property access)
	 */
	directImport: boolean;

	/**
	 * if the position is ASI safe or unknown
	 */
	asiSafe?: boolean;
}
declare interface ModuleSettings {
	/**
	 * Specifies the layer in which the module should be placed in.
	 */
	layer?: string;

	/**
	 * Module type to use for the module.
	 */
	type?: string;

	/**
	 * Options for the resolver.
	 */
	resolve?: ResolveOptionsWebpackOptions;

	/**
	 * Options for parsing.
	 */
	parser?: { [index: string]: any };

	/**
	 * The options for the module generator.
	 */
	generator?: { [index: string]: any };

	/**
	 * Flags a module as with or without side effects.
	 */
	sideEffects?: boolean;
}
declare abstract class ModuleTemplate {
	type: string;
	hooks: Readonly<{
		content: { tap: (options?: any, fn?: any) => void };
		module: { tap: (options?: any, fn?: any) => void };
		render: { tap: (options?: any, fn?: any) => void };
		package: { tap: (options?: any, fn?: any) => void };
		hash: { tap: (options?: any, fn?: any) => void };
	}>;
	get runtimeTemplate(): any;
}
declare class MultiCompiler {
	constructor(
		compilers: Compiler[] | Record<string, Compiler>,
		options: MultiCompilerOptions
	);
	hooks: Readonly<{
		done: SyncHook<[MultiStats]>;
		invalid: MultiHook<SyncHook<[null | string, number]>>;
		run: MultiHook<AsyncSeriesHook<[Compiler]>>;
		watchClose: SyncHook<[]>;
		watchRun: MultiHook<AsyncSeriesHook<[Compiler]>>;
		infrastructureLog: MultiHook<SyncBailHook<[string, string, any[]], true>>;
	}>;
	compilers: Compiler[];
	dependencies: WeakMap<Compiler, string[]>;
	running: boolean;
	get options(): WebpackOptionsNormalized[] & MultiCompilerOptions;
	get outputPath(): string;
	inputFileSystem: InputFileSystem;
	outputFileSystem: OutputFileSystem;
	watchFileSystem: WatchFileSystem;
	intermediateFileSystem: IntermediateFileSystem;
	getInfrastructureLogger(name?: any): WebpackLogger;
	setDependencies(compiler: Compiler, dependencies: string[]): void;
	validateDependencies(callback: CallbackFunction<MultiStats>): boolean;
	runWithDependencies(
		compilers: Compiler[],
		fn: (compiler: Compiler, callback: CallbackFunction<MultiStats>) => any,
		callback: CallbackFunction<MultiStats>
	): void;
	watch(
		watchOptions: WatchOptions | WatchOptions[],
		handler: CallbackFunction<MultiStats>
	): MultiWatching;
	run(callback: CallbackFunction<MultiStats>): void;
	purgeInputFileSystem(): void;
	close(callback: CallbackFunction<void>): void;
}
declare interface MultiCompilerOptions {
	/**
	 * how many Compilers are allows to run at the same time in parallel
	 */
	parallelism?: number;
}
declare abstract class MultiStats {
	stats: Stats[];
	get hash(): string;
	hasErrors(): boolean;
	hasWarnings(): boolean;
	toJson(options?: any): StatsCompilation;
	toString(options?: any): string;
}
declare abstract class MultiWatching {
	watchings: Watching[];
	compiler: MultiCompiler;
	invalidate(callback?: any): void;
	suspend(): void;
	resume(): void;
	close(callback: CallbackFunction<void>): void;
}
declare class NamedChunkIdsPlugin {
	constructor(options?: any);
	delimiter: any;
	context: any;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare class NamedModuleIdsPlugin {
	constructor(options?: any);
	options: any;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare class NaturalModuleIdsPlugin {
	constructor();

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare interface NeedBuildContext {
	compilation: Compilation;
	fileSystemInfo: FileSystemInfo;
	valueCacheVersions: Map<string, string | Set<string>>;
}
declare class NoEmitOnErrorsPlugin {
	constructor();

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare class NodeEnvironmentPlugin {
	constructor(options: {
		/**
		 * infrastructure logging options
		 */
		infrastructureLogging: InfrastructureLogging;
	});
	options: {
		/**
		 * infrastructure logging options
		 */
		infrastructureLogging: InfrastructureLogging;
	};

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
type NodeEstreeIndex =
	| UnaryExpression
	| ThisExpression
	| ArrayExpression
	| ObjectExpression
	| FunctionExpression
	| ArrowFunctionExpression
	| YieldExpression
	| SimpleLiteral
	| RegExpLiteral
	| BigIntLiteral
	| UpdateExpression
	| BinaryExpression
	| AssignmentExpression
	| LogicalExpression
	| MemberExpression
	| ConditionalExpression
	| SimpleCallExpression
	| NewExpression
	| SequenceExpression
	| TemplateLiteral
	| TaggedTemplateExpression
	| ClassExpression
	| MetaProperty
	| Identifier
	| AwaitExpression
	| ImportExpression
	| ChainExpression
	| FunctionDeclaration
	| VariableDeclaration
	| ClassDeclaration
	| PrivateIdentifier
	| ExpressionStatement
	| BlockStatement
	| StaticBlock
	| EmptyStatement
	| DebuggerStatement
	| WithStatement
	| ReturnStatement
	| LabeledStatement
	| BreakStatement
	| ContinueStatement
	| IfStatement
	| SwitchStatement
	| ThrowStatement
	| TryStatement
	| WhileStatement
	| DoWhileStatement
	| ForStatement
	| ForInStatement
	| ForOfStatement
	| ImportDeclaration
	| ExportNamedDeclaration
	| ExportDefaultDeclaration
	| ExportAllDeclaration
	| MethodDefinition
	| PropertyDefinition
	| VariableDeclarator
	| Program
	| SwitchCase
	| CatchClause
	| Property
	| AssignmentProperty
	| Super
	| TemplateElement
	| SpreadElement
	| ObjectPattern
	| ArrayPattern
	| RestElement
	| AssignmentPattern
	| ClassBody
	| ImportSpecifier
	| ImportDefaultSpecifier
	| ImportNamespaceSpecifier
	| ExportSpecifier;

/**
 * Options object for node compatibility features.
 */
declare interface NodeOptions {
	/**
	 * Include a polyfill for the '__dirname' variable.
	 */
	__dirname?: boolean | "warn-mock" | "mock" | "eval-only";

	/**
	 * Include a polyfill for the '__filename' variable.
	 */
	__filename?: boolean | "warn-mock" | "mock" | "eval-only";

	/**
	 * Include a polyfill for the 'global' variable.
	 */
	global?: boolean | "warn";
}
declare class NodeSourcePlugin {
	constructor();

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare class NodeTargetPlugin {
	constructor();

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare class NodeTemplatePlugin {
	constructor(options?: any);

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
type NodeWebpackOptions = false | NodeOptions;
declare class NormalModule extends Module {
	constructor(__0: NormalModuleCreateData);
	request: string;
	userRequest: string;
	rawRequest: string;
	binary: boolean;
	parser: Parser;
	parserOptions?: Record<string, any>;
	generator: Generator;
	generatorOptions?: Record<string, any>;
	resource: string;
	resourceResolveData?: Record<string, any>;
	matchResource?: string;
	loaders: LoaderItem[];
	error?: null | WebpackError;
	restoreFromUnsafeCache(
		unsafeCacheData?: any,
		normalModuleFactory?: any
	): void;
	createSourceForAsset(
		context: string,
		name: string,
		content: string,
		sourceMap?: any,
		associatedObjectForCache?: Object
	): Source;
	getCurrentLoader(loaderContext?: any, index?: any): null | LoaderItem;
	createSource(
		context: string,
		content: string | Buffer,
		sourceMap?: any,
		associatedObjectForCache?: Object
	): Source;
	markModuleAsErrored(error: WebpackError): void;
	applyNoParseRule(rule?: any, content?: any): any;
	shouldPreventParsing(noParseRule?: any, request?: any): any;
	static getCompilationHooks(
		compilation: Compilation
	): NormalModuleCompilationHooks;
	static deserialize(context?: any): NormalModule;
}
declare interface NormalModuleCompilationHooks {
	loader: SyncHook<[object, NormalModule]>;
	beforeLoaders: SyncHook<[LoaderItem[], NormalModule, object]>;
	beforeParse: SyncHook<[NormalModule]>;
	beforeSnapshot: SyncHook<[NormalModule]>;
	readResourceForScheme: HookMap<
		AsyncSeriesBailHook<[string, NormalModule], string | Buffer>
	>;
	readResource: HookMap<AsyncSeriesBailHook<[object], string | Buffer>>;
	needBuild: AsyncSeriesBailHook<[NormalModule, NeedBuildContext], boolean>;
}
declare interface NormalModuleCreateData {
	/**
	 * an optional layer in which the module is
	 */
	layer?: string;

	/**
	 * module type
	 */
	type: string;

	/**
	 * request string
	 */
	request: string;

	/**
	 * request intended by user (without loaders from config)
	 */
	userRequest: string;

	/**
	 * request without resolving
	 */
	rawRequest: string;

	/**
	 * list of loaders
	 */
	loaders: LoaderItem[];

	/**
	 * path + query of the real resource
	 */
	resource: string;

	/**
	 * resource resolve data
	 */
	resourceResolveData?: Record<string, any>;

	/**
	 * context directory for resolving
	 */
	context: string;

	/**
	 * path + query of the matched resource (virtual)
	 */
	matchResource?: string;

	/**
	 * the parser used
	 */
	parser: Parser;

	/**
	 * the options of the parser used
	 */
	parserOptions?: Record<string, any>;

	/**
	 * the generator used
	 */
	generator: Generator;

	/**
	 * the options of the generator used
	 */
	generatorOptions?: Record<string, any>;

	/**
	 * options used for resolving requests from this module
	 */
	resolveOptions?: ResolveOptionsWebpackOptions;
}
declare abstract class NormalModuleFactory extends ModuleFactory {
	hooks: Readonly<{
		resolve: AsyncSeriesBailHook<[ResolveData], false | void | Module>;
		resolveForScheme: HookMap<
			AsyncSeriesBailHook<[ResourceDataWithData, ResolveData], true | void>
		>;
		resolveInScheme: HookMap<
			AsyncSeriesBailHook<[ResourceDataWithData, ResolveData], true | void>
		>;
		factorize: AsyncSeriesBailHook<[ResolveData], Module>;
		beforeResolve: AsyncSeriesBailHook<[ResolveData], false | void>;
		afterResolve: AsyncSeriesBailHook<[ResolveData], false | void>;
		createModule: AsyncSeriesBailHook<
			[
				Partial<NormalModuleCreateData & { settings: ModuleSettings }>,
				ResolveData
			],
			void | Module
		>;
		module: SyncWaterfallHook<
			[
				Module,
				Partial<NormalModuleCreateData & { settings: ModuleSettings }>,
				ResolveData
			],
			Module
		>;
		createParser: HookMap<SyncBailHook<any, any>>;
		parser: HookMap<SyncHook<any>>;
		createGenerator: HookMap<SyncBailHook<any, any>>;
		generator: HookMap<SyncHook<any>>;
	}>;
	resolverFactory: ResolverFactory;
	ruleSet: RuleSet;
	context: string;
	fs: InputFileSystem;
	parserCache: Map<string, WeakMap<Object, any>>;
	generatorCache: Map<string, WeakMap<Object, Generator>>;
	cleanupForCache(): void;
	resolveResource(
		contextInfo?: any,
		context?: any,
		unresolvedResource?: any,
		resolver?: any,
		resolveContext?: any,
		callback?: any
	): void;
	resolveRequestArray(
		contextInfo?: any,
		context?: any,
		array?: any,
		resolver?: any,
		resolveContext?: any,
		callback?: any
	): any;
	getParser(type?: any, parserOptions?: object): any;
	createParser(type: string, parserOptions?: { [index: string]: any }): Parser;
	getGenerator(type?: any, generatorOptions?: object): undefined | Generator;
	createGenerator(type?: any, generatorOptions?: object): any;
	getResolver(type?: any, resolveOptions?: any): ResolverWithOptions;
}

/**
 * These properties are added by the NormalModule
 */
declare interface NormalModuleLoaderContext<OptionsType> {
	version: number;
	getOptions(): OptionsType;
	getOptions(schema: Parameters<typeof validateFunction>[0]): OptionsType;
	emitWarning(warning: Error): void;
	emitError(error: Error): void;
	getLogger(name?: string): WebpackLogger;
	resolve(
		context: string,
		request: string,
		callback: (
			arg0: null | Error,
			arg1?: string | false,
			arg2?: ResolveRequest
		) => void
	): any;
	getResolve(options?: ResolveOptionsWithDependencyType): {
		(
			context: string,
			request: string,
			callback: (
				arg0: null | Error,
				arg1?: string | false,
				arg2?: ResolveRequest
			) => void
		): void;
		(context: string, request: string): Promise<string>;
	};
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
		createHash: (algorithm?: string) => Hash;
	};
	rootContext: string;
	fs: InputFileSystem;
	sourceMap?: boolean;
	mode: "none" | "development" | "production";
	webpack?: boolean;
	_module?: NormalModule;
	_compilation?: Compilation;
	_compiler?: Compiler;
}
declare class NormalModuleReplacementPlugin {
	/**
	 * Create an instance of the plugin
	 */
	constructor(
		resourceRegExp: RegExp,
		newResource: string | ((arg0?: any) => void)
	);
	resourceRegExp: RegExp;
	newResource: string | ((arg0?: any) => void);

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
type NormalizedStatsOptions = KnownNormalizedStatsOptions &
	Omit<
		StatsOptions,
		| "context"
		| "chunkGroups"
		| "requestShortener"
		| "chunksSort"
		| "modulesSort"
		| "chunkModulesSort"
		| "nestedModulesSort"
		| "assetsSort"
		| "ids"
		| "cachedAssets"
		| "groupAssetsByEmitStatus"
		| "groupAssetsByPath"
		| "groupAssetsByExtension"
		| "assetsSpace"
		| "excludeAssets"
		| "excludeModules"
		| "warningsFilter"
		| "cachedModules"
		| "orphanModules"
		| "dependentModules"
		| "runtimeModules"
		| "groupModulesByCacheStatus"
		| "groupModulesByLayer"
		| "groupModulesByAttributes"
		| "groupModulesByPath"
		| "groupModulesByExtension"
		| "groupModulesByType"
		| "entrypoints"
		| "chunkGroupAuxiliary"
		| "chunkGroupChildren"
		| "chunkGroupMaxAssets"
		| "modulesSpace"
		| "chunkModulesSpace"
		| "nestedModulesSpace"
		| "logging"
		| "loggingDebug"
		| "loggingTrace"
		| "_env"
	> &
	Record<string, any>;
declare class NullDependency extends Dependency {
	constructor();
	static Template: typeof NullDependencyTemplate;
	static NO_EXPORTS_REFERENCED: string[][];
	static EXPORTS_OBJECT_REFERENCED: string[][];
	static TRANSITIVE: typeof TRANSITIVE;
}
declare class NullDependencyTemplate extends DependencyTemplate {
	constructor();
}
declare interface ObjectDeserializerContext {
	read: () => any;
}
declare interface ObjectSerializer {
	serialize: (arg0: any, arg1: ObjectSerializerContext) => void;
	deserialize: (arg0: ObjectDeserializerContext) => any;
}
declare interface ObjectSerializerContext {
	write: (arg0?: any) => void;
}
declare class OccurrenceChunkIdsPlugin {
	constructor(options?: OccurrenceChunkIdsPluginOptions);
	options: OccurrenceChunkIdsPluginOptions;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare interface OccurrenceChunkIdsPluginOptions {
	/**
	 * Prioritise initial size over total size.
	 */
	prioritiseInitial?: boolean;
}
declare class OccurrenceModuleIdsPlugin {
	constructor(options?: OccurrenceModuleIdsPluginOptions);
	options: OccurrenceModuleIdsPluginOptions;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare interface OccurrenceModuleIdsPluginOptions {
	/**
	 * Prioritise initial size over total size.
	 */
	prioritiseInitial?: boolean;
}

/**
 * Enables/Disables integrated optimizations.
 */
declare interface Optimization {
	/**
	 * Check for incompatible wasm types when importing/exporting from/to ESM.
	 */
	checkWasmTypes?: boolean;

	/**
	 * Define the algorithm to choose chunk ids (named: readable ids for better debugging, deterministic: numeric hash ids for better long term caching, size: numeric ids focused on minimal initial download size, total-size: numeric ids focused on minimal total download size, false: no algorithm used, as custom one can be provided via plugin).
	 */
	chunkIds?:
		| false
		| "natural"
		| "named"
		| "deterministic"
		| "size"
		| "total-size";

	/**
	 * Concatenate modules when possible to generate less modules, more efficient code and enable more optimizations by the minimizer.
	 */
	concatenateModules?: boolean;

	/**
	 * Emit assets even when errors occur. Critical errors are emitted into the generated code and will cause errors at runtime.
	 */
	emitOnErrors?: boolean;

	/**
	 * Also flag chunks as loaded which contain a subset of the modules.
	 */
	flagIncludedChunks?: boolean;

	/**
	 * Creates a module-internal dependency graph for top level symbols, exports and imports, to improve unused exports detection.
	 */
	innerGraph?: boolean;

	/**
	 * Rename exports when possible to generate shorter code (depends on optimization.usedExports and optimization.providedExports, true/"deterministic": generate short deterministic names optimized for caching, "size": generate the shortest possible names).
	 */
	mangleExports?: boolean | "deterministic" | "size";

	/**
	 * Reduce size of WASM by changing imports to shorter strings.
	 */
	mangleWasmImports?: boolean;

	/**
	 * Merge chunks which contain the same modules.
	 */
	mergeDuplicateChunks?: boolean;

	/**
	 * Enable minimizing the output. Uses optimization.minimizer.
	 */
	minimize?: boolean;

	/**
	 * Minimizer(s) to use for minimizing the output.
	 */
	minimizer?: (
		| ((this: Compiler, compiler: Compiler) => void)
		| WebpackPluginInstance
		| "..."
	)[];

	/**
	 * Define the algorithm to choose module ids (natural: numeric ids in order of usage, named: readable ids for better debugging, hashed: (deprecated) short hashes as ids for better long term caching, deterministic: numeric hash ids for better long term caching, size: numeric ids focused on minimal initial download size, false: no algorithm used, as custom one can be provided via plugin).
	 */
	moduleIds?: false | "natural" | "named" | "deterministic" | "size" | "hashed";

	/**
	 * Avoid emitting assets when errors occur (deprecated: use 'emitOnErrors' instead).
	 */
	noEmitOnErrors?: boolean;

	/**
	 * Set process.env.NODE_ENV to a specific value.
	 */
	nodeEnv?: string | false;

	/**
	 * Generate records with relative paths to be able to move the context folder.
	 */
	portableRecords?: boolean;

	/**
	 * Figure out which exports are provided by modules to generate more efficient code.
	 */
	providedExports?: boolean;

	/**
	 * Use real [contenthash] based on final content of the assets.
	 */
	realContentHash?: boolean;

	/**
	 * Removes modules from chunks when these modules are already included in all parents.
	 */
	removeAvailableModules?: boolean;

	/**
	 * Remove chunks which are empty.
	 */
	removeEmptyChunks?: boolean;

	/**
	 * Create an additional chunk which contains only the webpack runtime and chunk hash maps.
	 */
	runtimeChunk?:
		| boolean
		| "single"
		| "multiple"
		| {
				/**
				 * The name or name factory for the runtime chunks.
				 */
				name?: string | Function;
		  };

	/**
	 * Skip over modules which contain no side effects when exports are not used (false: disabled, 'flag': only use manually placed side effects flag, true: also analyse source code for side effects).
	 */
	sideEffects?: boolean | "flag";

	/**
	 * Optimize duplication and caching by splitting chunks by shared modules and cache group.
	 */
	splitChunks?: false | OptimizationSplitChunksOptions;

	/**
	 * Figure out which exports are used by modules to mangle export names, omit unused exports and generate more efficient code (true: analyse used exports for each runtime, "global": analyse exports globally for all runtimes combined).
	 */
	usedExports?: boolean | "global";
}

/**
 * Options object for describing behavior of a cache group selecting modules that should be cached together.
 */
declare interface OptimizationSplitChunksCacheGroup {
	/**
	 * Sets the name delimiter for created chunks.
	 */
	automaticNameDelimiter?: string;

	/**
	 * Select chunks for determining cache group content (defaults to "initial", "initial" and "all" requires adding these chunks to the HTML).
	 */
	chunks?: "all" | "initial" | "async" | ((chunk: Chunk) => boolean);

	/**
	 * Ignore minimum size, minimum chunks and maximum requests and always create chunks for this cache group.
	 */
	enforce?: boolean;

	/**
	 * Size threshold at which splitting is enforced and other restrictions (minRemainingSize, maxAsyncRequests, maxInitialRequests) are ignored.
	 */
	enforceSizeThreshold?: number | { [index: string]: number };

	/**
	 * Sets the template for the filename for created chunks.
	 */
	filename?: string | ((pathData: PathData, assetInfo?: AssetInfo) => string);

	/**
	 * Sets the hint for chunk id.
	 */
	idHint?: string;

	/**
	 * Assign modules to a cache group by module layer.
	 */
	layer?: string | Function | RegExp;

	/**
	 * Maximum number of requests which are accepted for on-demand loading.
	 */
	maxAsyncRequests?: number;

	/**
	 * Maximal size hint for the on-demand chunks.
	 */
	maxAsyncSize?: number | { [index: string]: number };

	/**
	 * Maximum number of initial chunks which are accepted for an entry point.
	 */
	maxInitialRequests?: number;

	/**
	 * Maximal size hint for the initial chunks.
	 */
	maxInitialSize?: number | { [index: string]: number };

	/**
	 * Maximal size hint for the created chunks.
	 */
	maxSize?: number | { [index: string]: number };

	/**
	 * Minimum number of times a module has to be duplicated until it's considered for splitting.
	 */
	minChunks?: number;

	/**
	 * Minimal size for the chunks the stay after moving the modules to a new chunk.
	 */
	minRemainingSize?: number | { [index: string]: number };

	/**
	 * Minimal size for the created chunk.
	 */
	minSize?: number | { [index: string]: number };

	/**
	 * Minimum size reduction due to the created chunk.
	 */
	minSizeReduction?: number | { [index: string]: number };

	/**
	 * Give chunks for this cache group a name (chunks with equal name are merged).
	 */
	name?: string | false | Function;

	/**
	 * Priority of this cache group.
	 */
	priority?: number;

	/**
	 * Try to reuse existing chunk (with name) when it has matching modules.
	 */
	reuseExistingChunk?: boolean;

	/**
	 * Assign modules to a cache group by module name.
	 */
	test?: string | Function | RegExp;

	/**
	 * Assign modules to a cache group by module type.
	 */
	type?: string | Function | RegExp;

	/**
	 * Compare used exports when checking common modules. Modules will only be put in the same chunk when exports are equal.
	 */
	usedExports?: boolean;
}

/**
 * Options object for splitting chunks into smaller chunks.
 */
declare interface OptimizationSplitChunksOptions {
	/**
	 * Sets the name delimiter for created chunks.
	 */
	automaticNameDelimiter?: string;

	/**
	 * Assign modules to a cache group (modules from different cache groups are tried to keep in separate chunks, default categories: 'default', 'defaultVendors').
	 */
	cacheGroups?: {
		[index: string]:
			| string
			| false
			| Function
			| RegExp
			| OptimizationSplitChunksCacheGroup;
	};

	/**
	 * Select chunks for determining shared modules (defaults to "async", "initial" and "all" requires adding these chunks to the HTML).
	 */
	chunks?: "all" | "initial" | "async" | ((chunk: Chunk) => boolean);

	/**
	 * Sets the size types which are used when a number is used for sizes.
	 */
	defaultSizeTypes?: string[];

	/**
	 * Size threshold at which splitting is enforced and other restrictions (minRemainingSize, maxAsyncRequests, maxInitialRequests) are ignored.
	 */
	enforceSizeThreshold?: number | { [index: string]: number };

	/**
	 * Options for modules not selected by any other cache group.
	 */
	fallbackCacheGroup?: {
		/**
		 * Sets the name delimiter for created chunks.
		 */
		automaticNameDelimiter?: string;
		/**
		 * Select chunks for determining shared modules (defaults to "async", "initial" and "all" requires adding these chunks to the HTML).
		 */
		chunks?: "all" | "initial" | "async" | ((chunk: Chunk) => boolean);
		/**
		 * Maximal size hint for the on-demand chunks.
		 */
		maxAsyncSize?: number | { [index: string]: number };
		/**
		 * Maximal size hint for the initial chunks.
		 */
		maxInitialSize?: number | { [index: string]: number };
		/**
		 * Maximal size hint for the created chunks.
		 */
		maxSize?: number | { [index: string]: number };
		/**
		 * Minimal size for the created chunk.
		 */
		minSize?: number | { [index: string]: number };
		/**
		 * Minimum size reduction due to the created chunk.
		 */
		minSizeReduction?: number | { [index: string]: number };
	};

	/**
	 * Sets the template for the filename for created chunks.
	 */
	filename?: string | ((pathData: PathData, assetInfo?: AssetInfo) => string);

	/**
	 * Prevents exposing path info when creating names for parts splitted by maxSize.
	 */
	hidePathInfo?: boolean;

	/**
	 * Maximum number of requests which are accepted for on-demand loading.
	 */
	maxAsyncRequests?: number;

	/**
	 * Maximal size hint for the on-demand chunks.
	 */
	maxAsyncSize?: number | { [index: string]: number };

	/**
	 * Maximum number of initial chunks which are accepted for an entry point.
	 */
	maxInitialRequests?: number;

	/**
	 * Maximal size hint for the initial chunks.
	 */
	maxInitialSize?: number | { [index: string]: number };

	/**
	 * Maximal size hint for the created chunks.
	 */
	maxSize?: number | { [index: string]: number };

	/**
	 * Minimum number of times a module has to be duplicated until it's considered for splitting.
	 */
	minChunks?: number;

	/**
	 * Minimal size for the chunks the stay after moving the modules to a new chunk.
	 */
	minRemainingSize?: number | { [index: string]: number };

	/**
	 * Minimal size for the created chunks.
	 */
	minSize?: number | { [index: string]: number };

	/**
	 * Minimum size reduction due to the created chunk.
	 */
	minSizeReduction?: number | { [index: string]: number };

	/**
	 * Give chunks created a name (chunks with equal name are merged).
	 */
	name?: string | false | Function;

	/**
	 * Compare used exports when checking common modules. Modules will only be put in the same chunk when exports are equal.
	 */
	usedExports?: boolean;
}
declare abstract class OptionsApply {
	process(options?: any, compiler?: any): void;
}
declare interface OriginRecord {
	module: Module;
	loc: DependencyLocation;
	request: string;
}
declare class OriginalSource extends Source {
	constructor(source: string | Buffer, name: string);
	getName(): string;
}

/**
 * Options affecting the output of the compilation. `output` options tell webpack how to write the compiled files to disk.
 */
declare interface Output {
	/**
	 * The filename of asset modules as relative path inside the 'output.path' directory.
	 */
	assetModuleFilename?:
		| string
		| ((pathData: PathData, assetInfo?: AssetInfo) => string);

	/**
	 * Enable/disable creating async chunks that are loaded on demand.
	 */
	asyncChunks?: boolean;

	/**
	 * Add a comment in the UMD wrapper.
	 */
	auxiliaryComment?: string | LibraryCustomUmdCommentObject;

	/**
	 * Add charset attribute for script tag.
	 */
	charset?: boolean;

	/**
	 * Specifies the filename template of output files of non-initial chunks on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
	 */
	chunkFilename?:
		| string
		| ((pathData: PathData, assetInfo?: AssetInfo) => string);

	/**
	 * The format of chunks (formats included by default are 'array-push' (web/WebWorker), 'commonjs' (node.js), 'module' (ESM), but others might be added by plugins).
	 */
	chunkFormat?: string | false;

	/**
	 * Number of milliseconds before chunk request expires.
	 */
	chunkLoadTimeout?: number;

	/**
	 * The method of loading chunks (methods included by default are 'jsonp' (web), 'import' (ESM), 'importScripts' (WebWorker), 'require' (sync node.js), 'async-node' (async node.js), but others might be added by plugins).
	 */
	chunkLoading?: string | false;

	/**
	 * The global variable used by webpack for loading of chunks.
	 */
	chunkLoadingGlobal?: string;

	/**
	 * Clean the output directory before emit.
	 */
	clean?: boolean | CleanOptions;

	/**
	 * Check if to be emitted file already exists and have the same content before writing to output filesystem.
	 */
	compareBeforeEmit?: boolean;

	/**
	 * This option enables cross-origin loading of chunks.
	 */
	crossOriginLoading?: false | "anonymous" | "use-credentials";

	/**
	 * Specifies the filename template of non-initial output css files on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
	 */
	cssChunkFilename?:
		| string
		| ((pathData: PathData, assetInfo?: AssetInfo) => string);

	/**
	 * Specifies the filename template of output css files on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
	 */
	cssFilename?:
		| string
		| ((pathData: PathData, assetInfo?: AssetInfo) => string);

	/**
	 * Similar to `output.devtoolModuleFilenameTemplate`, but used in the case of duplicate module identifiers.
	 */
	devtoolFallbackModuleFilenameTemplate?: string | Function;

	/**
	 * Filename template string of function for the sources array in a generated SourceMap.
	 */
	devtoolModuleFilenameTemplate?: string | Function;

	/**
	 * Module namespace to use when interpolating filename template string for the sources array in a generated SourceMap. Defaults to `output.library` if not set. It's useful for avoiding runtime collisions in sourcemaps from multiple webpack projects built as libraries.
	 */
	devtoolNamespace?: string;

	/**
	 * List of chunk loading types enabled for use by entry points.
	 */
	enabledChunkLoadingTypes?: string[];

	/**
	 * List of library types enabled for use by entry points.
	 */
	enabledLibraryTypes?: string[];

	/**
	 * List of wasm loading types enabled for use by entry points.
	 */
	enabledWasmLoadingTypes?: string[];

	/**
	 * The abilities of the environment where the webpack generated code should run.
	 */
	environment?: Environment;

	/**
	 * Specifies the filename of output files on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
	 */
	filename?: string | ((pathData: PathData, assetInfo?: AssetInfo) => string);

	/**
	 * An expression which is used to address the global object/scope in runtime code.
	 */
	globalObject?: string;

	/**
	 * Digest type used for the hash.
	 */
	hashDigest?: string;

	/**
	 * Number of chars which are used for the hash.
	 */
	hashDigestLength?: number;

	/**
	 * Algorithm used for generation the hash (see node.js crypto package).
	 */
	hashFunction?: string | typeof Hash;

	/**
	 * Any string which is added to the hash to salt it.
	 */
	hashSalt?: string;

	/**
	 * The filename of the Hot Update Chunks. They are inside the output.path directory.
	 */
	hotUpdateChunkFilename?: string;

	/**
	 * The global variable used by webpack for loading of hot update chunks.
	 */
	hotUpdateGlobal?: string;

	/**
	 * The filename of the Hot Update Main File. It is inside the 'output.path' directory.
	 */
	hotUpdateMainFilename?: string;

	/**
	 * Wrap javascript code into IIFE's to avoid leaking into global scope.
	 */
	iife?: boolean;

	/**
	 * The name of the native import() function (can be exchanged for a polyfill).
	 */
	importFunctionName?: string;

	/**
	 * The name of the native import.meta object (can be exchanged for a polyfill).
	 */
	importMetaName?: string;

	/**
	 * Make the output files a library, exporting the exports of the entry point.
	 */
	library?: string | string[] | LibraryOptions | LibraryCustomUmdObject;

	/**
	 * Specify which export should be exposed as library.
	 */
	libraryExport?: string | string[];

	/**
	 * Type of library (types included by default are 'var', 'module', 'assign', 'assign-properties', 'this', 'window', 'self', 'global', 'commonjs', 'commonjs2', 'commonjs-module', 'commonjs-static', 'amd', 'amd-require', 'umd', 'umd2', 'jsonp', 'system', but others might be added by plugins).
	 */
	libraryTarget?: string;

	/**
	 * Output javascript files as module source type.
	 */
	module?: boolean;

	/**
	 * The output directory as **absolute path** (required).
	 */
	path?: string;

	/**
	 * Include comments with information about the modules.
	 */
	pathinfo?: boolean | "verbose";

	/**
	 * The 'publicPath' specifies the public URL address of the output files when referenced in a browser.
	 */
	publicPath?: string | ((pathData: PathData, assetInfo?: AssetInfo) => string);

	/**
	 * This option enables loading async chunks via a custom script type, such as script type="module".
	 */
	scriptType?: false | "module" | "text/javascript";

	/**
	 * The filename of the SourceMaps for the JavaScript files. They are inside the 'output.path' directory.
	 */
	sourceMapFilename?: string;

	/**
	 * Prefixes every line of the source in the bundle with this string.
	 */
	sourcePrefix?: string;

	/**
	 * Handles error in module loading correctly at a performance cost. This will handle module error compatible with the EcmaScript Modules spec.
	 */
	strictModuleErrorHandling?: boolean;

	/**
	 * Handles exceptions in module loading correctly at a performance cost (Deprecated). This will handle module error compatible with the Node.js CommonJS way.
	 */
	strictModuleExceptionHandling?: boolean;

	/**
	 * Use a Trusted Types policy to create urls for chunks. 'output.uniqueName' is used a default policy name. Passing a string sets a custom policy name.
	 */
	trustedTypes?: string | true | TrustedTypes;

	/**
	 * If `output.libraryTarget` is set to umd and `output.library` is set, setting this to true will name the AMD module.
	 */
	umdNamedDefine?: boolean;

	/**
	 * A unique name of the webpack build to avoid multiple webpack runtimes to conflict when using globals.
	 */
	uniqueName?: string;

	/**
	 * The method of loading WebAssembly Modules (methods included by default are 'fetch' (web/WebWorker), 'async-node' (node.js), but others might be added by plugins).
	 */
	wasmLoading?: string | false;

	/**
	 * The filename of WebAssembly modules as relative path inside the 'output.path' directory.
	 */
	webassemblyModuleFilename?: string;

	/**
	 * The method of loading chunks (methods included by default are 'jsonp' (web), 'import' (ESM), 'importScripts' (WebWorker), 'require' (sync node.js), 'async-node' (async node.js), but others might be added by plugins).
	 */
	workerChunkLoading?: string | false;

	/**
	 * The method of loading WebAssembly Modules (methods included by default are 'fetch' (web/WebWorker), 'async-node' (node.js), but others might be added by plugins).
	 */
	workerWasmLoading?: string | false;
}
declare interface OutputFileSystem {
	writeFile: (
		arg0: string,
		arg1: string | Buffer,
		arg2: (arg0?: null | NodeJS.ErrnoException) => void
	) => void;
	mkdir: (
		arg0: string,
		arg1: (arg0?: null | NodeJS.ErrnoException) => void
	) => void;
	readdir?: (
		arg0: string,
		arg1: (
			arg0?: null | NodeJS.ErrnoException,
			arg1?: (string | Buffer)[] | IDirent[]
		) => void
	) => void;
	rmdir?: (
		arg0: string,
		arg1: (arg0?: null | NodeJS.ErrnoException) => void
	) => void;
	unlink?: (
		arg0: string,
		arg1: (arg0?: null | NodeJS.ErrnoException) => void
	) => void;
	stat: (
		arg0: string,
		arg1: (arg0?: null | NodeJS.ErrnoException, arg1?: IStats) => void
	) => void;
	lstat?: (
		arg0: string,
		arg1: (arg0?: null | NodeJS.ErrnoException, arg1?: IStats) => void
	) => void;
	readFile: (
		arg0: string,
		arg1: (arg0?: null | NodeJS.ErrnoException, arg1?: string | Buffer) => void
	) => void;
	join?: (arg0: string, arg1: string) => string;
	relative?: (arg0: string, arg1: string) => string;
	dirname?: (arg0: string) => string;
}

/**
 * Normalized options affecting the output of the compilation. `output` options tell webpack how to write the compiled files to disk.
 */
declare interface OutputNormalized {
	/**
	 * The filename of asset modules as relative path inside the 'output.path' directory.
	 */
	assetModuleFilename?:
		| string
		| ((pathData: PathData, assetInfo?: AssetInfo) => string);

	/**
	 * Enable/disable creating async chunks that are loaded on demand.
	 */
	asyncChunks?: boolean;

	/**
	 * Add charset attribute for script tag.
	 */
	charset?: boolean;

	/**
	 * Specifies the filename template of output files of non-initial chunks on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
	 */
	chunkFilename?:
		| string
		| ((pathData: PathData, assetInfo?: AssetInfo) => string);

	/**
	 * The format of chunks (formats included by default are 'array-push' (web/WebWorker), 'commonjs' (node.js), 'module' (ESM), but others might be added by plugins).
	 */
	chunkFormat?: string | false;

	/**
	 * Number of milliseconds before chunk request expires.
	 */
	chunkLoadTimeout?: number;

	/**
	 * The method of loading chunks (methods included by default are 'jsonp' (web), 'import' (ESM), 'importScripts' (WebWorker), 'require' (sync node.js), 'async-node' (async node.js), but others might be added by plugins).
	 */
	chunkLoading?: string | false;

	/**
	 * The global variable used by webpack for loading of chunks.
	 */
	chunkLoadingGlobal?: string;

	/**
	 * Clean the output directory before emit.
	 */
	clean?: boolean | CleanOptions;

	/**
	 * Check if to be emitted file already exists and have the same content before writing to output filesystem.
	 */
	compareBeforeEmit?: boolean;

	/**
	 * This option enables cross-origin loading of chunks.
	 */
	crossOriginLoading?: false | "anonymous" | "use-credentials";

	/**
	 * Specifies the filename template of non-initial output css files on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
	 */
	cssChunkFilename?:
		| string
		| ((pathData: PathData, assetInfo?: AssetInfo) => string);

	/**
	 * Specifies the filename template of output css files on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
	 */
	cssFilename?:
		| string
		| ((pathData: PathData, assetInfo?: AssetInfo) => string);

	/**
	 * Similar to `output.devtoolModuleFilenameTemplate`, but used in the case of duplicate module identifiers.
	 */
	devtoolFallbackModuleFilenameTemplate?: string | Function;

	/**
	 * Filename template string of function for the sources array in a generated SourceMap.
	 */
	devtoolModuleFilenameTemplate?: string | Function;

	/**
	 * Module namespace to use when interpolating filename template string for the sources array in a generated SourceMap. Defaults to `output.library` if not set. It's useful for avoiding runtime collisions in sourcemaps from multiple webpack projects built as libraries.
	 */
	devtoolNamespace?: string;

	/**
	 * List of chunk loading types enabled for use by entry points.
	 */
	enabledChunkLoadingTypes?: string[];

	/**
	 * List of library types enabled for use by entry points.
	 */
	enabledLibraryTypes?: string[];

	/**
	 * List of wasm loading types enabled for use by entry points.
	 */
	enabledWasmLoadingTypes?: string[];

	/**
	 * The abilities of the environment where the webpack generated code should run.
	 */
	environment?: Environment;

	/**
	 * Specifies the filename of output files on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
	 */
	filename?: string | ((pathData: PathData, assetInfo?: AssetInfo) => string);

	/**
	 * An expression which is used to address the global object/scope in runtime code.
	 */
	globalObject?: string;

	/**
	 * Digest type used for the hash.
	 */
	hashDigest?: string;

	/**
	 * Number of chars which are used for the hash.
	 */
	hashDigestLength?: number;

	/**
	 * Algorithm used for generation the hash (see node.js crypto package).
	 */
	hashFunction?: string | typeof Hash;

	/**
	 * Any string which is added to the hash to salt it.
	 */
	hashSalt?: string;

	/**
	 * The filename of the Hot Update Chunks. They are inside the output.path directory.
	 */
	hotUpdateChunkFilename?: string;

	/**
	 * The global variable used by webpack for loading of hot update chunks.
	 */
	hotUpdateGlobal?: string;

	/**
	 * The filename of the Hot Update Main File. It is inside the 'output.path' directory.
	 */
	hotUpdateMainFilename?: string;

	/**
	 * Wrap javascript code into IIFE's to avoid leaking into global scope.
	 */
	iife?: boolean;

	/**
	 * The name of the native import() function (can be exchanged for a polyfill).
	 */
	importFunctionName?: string;

	/**
	 * The name of the native import.meta object (can be exchanged for a polyfill).
	 */
	importMetaName?: string;

	/**
	 * Options for library.
	 */
	library?: LibraryOptions;

	/**
	 * Output javascript files as module source type.
	 */
	module?: boolean;

	/**
	 * The output directory as **absolute path** (required).
	 */
	path?: string;

	/**
	 * Include comments with information about the modules.
	 */
	pathinfo?: boolean | "verbose";

	/**
	 * The 'publicPath' specifies the public URL address of the output files when referenced in a browser.
	 */
	publicPath?: string | ((pathData: PathData, assetInfo?: AssetInfo) => string);

	/**
	 * This option enables loading async chunks via a custom script type, such as script type="module".
	 */
	scriptType?: false | "module" | "text/javascript";

	/**
	 * The filename of the SourceMaps for the JavaScript files. They are inside the 'output.path' directory.
	 */
	sourceMapFilename?: string;

	/**
	 * Prefixes every line of the source in the bundle with this string.
	 */
	sourcePrefix?: string;

	/**
	 * Handles error in module loading correctly at a performance cost. This will handle module error compatible with the EcmaScript Modules spec.
	 */
	strictModuleErrorHandling?: boolean;

	/**
	 * Handles exceptions in module loading correctly at a performance cost (Deprecated). This will handle module error compatible with the Node.js CommonJS way.
	 */
	strictModuleExceptionHandling?: boolean;

	/**
	 * Use a Trusted Types policy to create urls for chunks.
	 */
	trustedTypes?: TrustedTypes;

	/**
	 * A unique name of the webpack build to avoid multiple webpack runtimes to conflict when using globals.
	 */
	uniqueName?: string;

	/**
	 * The method of loading WebAssembly Modules (methods included by default are 'fetch' (web/WebWorker), 'async-node' (node.js), but others might be added by plugins).
	 */
	wasmLoading?: string | false;

	/**
	 * The filename of WebAssembly modules as relative path inside the 'output.path' directory.
	 */
	webassemblyModuleFilename?: string;

	/**
	 * The method of loading chunks (methods included by default are 'jsonp' (web), 'import' (ESM), 'importScripts' (WebWorker), 'require' (sync node.js), 'async-node' (async node.js), but others might be added by plugins).
	 */
	workerChunkLoading?: string | false;

	/**
	 * The method of loading WebAssembly Modules (methods included by default are 'fetch' (web/WebWorker), 'async-node' (node.js), but others might be added by plugins).
	 */
	workerWasmLoading?: string | false;
}
declare interface ParameterizedComparator<TArg, T> {
	(arg0: TArg): Comparator<T>;
}
declare interface ParsedIdentifier {
	request: string;
	query: string;
	fragment: string;
	directory: boolean;
	module: boolean;
	file: boolean;
	internal: boolean;
}
declare class Parser {
	constructor();
	parse(
		source: string | Buffer | PreparsedAst,
		state: ParserState
	): ParserState;
}
type ParserOptionsByModuleType = ParserOptionsByModuleTypeKnown &
	ParserOptionsByModuleTypeUnknown;

/**
 * Specify options for each parser.
 */
declare interface ParserOptionsByModuleTypeKnown {
	/**
	 * Parser options for asset modules.
	 */
	asset?: AssetParserOptions;

	/**
	 * No parser options are supported for this module type.
	 */
	"asset/inline"?: EmptyParserOptions;

	/**
	 * No parser options are supported for this module type.
	 */
	"asset/resource"?: EmptyParserOptions;

	/**
	 * No parser options are supported for this module type.
	 */
	"asset/source"?: EmptyParserOptions;

	/**
	 * Parser options for javascript modules.
	 */
	javascript?: JavascriptParserOptions;

	/**
	 * Parser options for javascript modules.
	 */
	"javascript/auto"?: JavascriptParserOptions;

	/**
	 * Parser options for javascript modules.
	 */
	"javascript/dynamic"?: JavascriptParserOptions;

	/**
	 * Parser options for javascript modules.
	 */
	"javascript/esm"?: JavascriptParserOptions;
}

/**
 * Specify options for each parser.
 */
declare interface ParserOptionsByModuleTypeUnknown {
	[index: string]: { [index: string]: any };
}
type ParserState = Record<string, any> & ParserStateBase;
declare interface ParserStateBase {
	source: string | Buffer;
	current: NormalModule;
	module: NormalModule;
	compilation: Compilation;
	options: { [index: string]: any };
}
declare interface PathData {
	chunkGraph?: ChunkGraph;
	hash?: string;
	hashWithLength?: (arg0: number) => string;
	chunk?: Chunk | ChunkPathData;
	module?: Module | ModulePathData;
	runtime?: RuntimeSpec;
	filename?: string;
	basename?: string;
	query?: string;
	contentHashType?: string;
	contentHash?: string;
	contentHashWithLength?: (arg0: number) => string;
	noChunkHash?: boolean;
	url?: string;
}

/**
 * Configuration object for web performance recommendations.
 */
declare interface PerformanceOptions {
	/**
	 * Filter function to select assets that are checked.
	 */
	assetFilter?: Function;

	/**
	 * Sets the format of the hints: warnings, errors or nothing at all.
	 */
	hints?: false | "error" | "warning";

	/**
	 * File size limit (in bytes) when exceeded, that webpack will provide performance hints.
	 */
	maxAssetSize?: number;

	/**
	 * Total size of an entry point (in bytes).
	 */
	maxEntrypointSize?: number;
}
declare interface PitchLoaderDefinitionFunction<
	OptionsType = {},
	ContextAdditions = {}
> {
	(
		this: NormalModuleLoaderContext<OptionsType> &
			LoaderRunnerLoaderContext<OptionsType> &
			LoaderPluginLoaderContext &
			HotModuleReplacementPluginLoaderContext &
			ContextAdditions,
		remainingRequest: string,
		previousRequest: string,
		data: object
	): string | void | Buffer | Promise<string | Buffer>;
}
type Plugin =
	| { apply: (arg0: Resolver) => void }
	| ((this: Resolver, arg1: Resolver) => void);
declare interface PnpApiImpl {
	resolveToUnqualified: (arg0: string, arg1: string, arg2: object) => string;
}
declare interface PossibleFileSystemError {
	code?: string;
	errno?: number;
	path?: string;
	syscall?: string;
}
declare class PrefetchPlugin {
	constructor(context?: any, request?: any);
	context: any;
	request: any;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare class PrefixSource extends Source {
	constructor(prefix: string, source: string | Source);
	original(): Source;
	getPrefix(): string;
}
declare interface PreparsedAst {
	[index: string]: any;
}
declare interface PrintedElement {
	element: string;
	content: string;
}
declare interface Problem {
	type: ProblemType;
	path: string;
	argument: string;
	value?: any;
	index?: number;
	expected?: string;
}
type ProblemType =
	| "unknown-argument"
	| "unexpected-non-array-in-path"
	| "unexpected-non-object-in-path"
	| "multiple-values-unexpected"
	| "invalid-value";
declare interface ProcessAssetsAdditionalOptions {
	additionalAssets?: true | Function;
}
declare class Profiler {
	constructor(inspector?: any);
	session: any;
	inspector: any;
	hasSession(): boolean;
	startProfiling(): Promise<void> | Promise<[any, any, any]>;
	sendCommand(method?: any, params?: any): Promise<any>;
	destroy(): Promise<void>;
	stopProfiling(): Promise<{ profile: any }>;
}
declare class ProfilingPlugin {
	constructor(options?: ProfilingPluginOptions);
	outputPath: string;
	apply(compiler?: any): void;
	static Profiler: typeof Profiler;
}
declare interface ProfilingPluginOptions {
	/**
	 * Path to the output file e.g. `path.resolve(__dirname, 'profiling/events.json')`. Defaults to `events.json`.
	 */
	outputPath?: string;
}
declare class ProgressPlugin {
	constructor(options?: ProgressPluginArgument);
	profile?: null | boolean;
	handler?: (percentage: number, msg: string, ...args: string[]) => void;
	modulesCount?: number;
	dependenciesCount?: number;
	showEntries?: boolean;
	showModules?: boolean;
	showDependencies?: boolean;
	showActiveModules?: boolean;
	percentBy?: null | "modules" | "dependencies" | "entries";
	apply(compiler: Compiler | MultiCompiler): void;
	static getReporter(
		compiler: Compiler
	): (p: number, ...args: string[]) => void;
	static defaultOptions: {
		profile: boolean;
		modulesCount: number;
		dependenciesCount: number;
		modules: boolean;
		dependencies: boolean;
		activeModules: boolean;
		entries: boolean;
	};
}
type ProgressPluginArgument =
	| ProgressPluginOptions
	| ((percentage: number, msg: string, ...args: string[]) => void);

/**
 * Options object for the ProgressPlugin.
 */
declare interface ProgressPluginOptions {
	/**
	 * Show active modules count and one active module in progress message.
	 */
	activeModules?: boolean;

	/**
	 * Show dependencies count in progress message.
	 */
	dependencies?: boolean;

	/**
	 * Minimum dependencies count to start with. For better progress calculation. Default: 10000.
	 */
	dependenciesCount?: number;

	/**
	 * Show entries count in progress message.
	 */
	entries?: boolean;

	/**
	 * Function that executes for every progress step.
	 */
	handler?: (percentage: number, msg: string, ...args: string[]) => void;

	/**
	 * Show modules count in progress message.
	 */
	modules?: boolean;

	/**
	 * Minimum modules count to start with. For better progress calculation. Default: 5000.
	 */
	modulesCount?: number;

	/**
	 * Collect percent algorithm. By default it calculates by a median from modules, entries and dependencies percent.
	 */
	percentBy?: null | "modules" | "dependencies" | "entries";

	/**
	 * Collect profile data for progress steps. Default: false.
	 */
	profile?: null | boolean;
}
declare class ProvidePlugin {
	constructor(definitions: Record<string, string | string[]>);
	definitions: Record<string, string | string[]>;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare class ProvideSharedPlugin {
	constructor(options: ProvideSharedPluginOptions);

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare interface ProvideSharedPluginOptions {
	/**
	 * Modules that should be provided as shared modules to the share scope. When provided, property name is used to match modules, otherwise this is automatically inferred from share key.
	 */
	provides: Provides;

	/**
	 * Share scope name used for all provided modules (defaults to 'default').
	 */
	shareScope?: string;
}
type Provides = (string | ProvidesObject)[] | ProvidesObject;

/**
 * Advanced configuration for modules that should be provided as shared modules to the share scope.
 */
declare interface ProvidesConfig {
	/**
	 * Include the provided module directly instead behind an async request. This allows to use this shared module in initial load too. All possible shared modules need to be eager too.
	 */
	eager?: boolean;

	/**
	 * Key in the share scope under which the shared modules should be stored.
	 */
	shareKey?: string;

	/**
	 * Share scope name.
	 */
	shareScope?: string;

	/**
	 * Version of the provided module. Will replace lower matching versions, but not higher.
	 */
	version?: string | false;
}

/**
 * Modules that should be provided as shared modules to the share scope. Property names are used as share keys.
 */
declare interface ProvidesObject {
	[index: string]: string | ProvidesConfig;
}
declare interface RawChunkGroupOptions {
	preloadOrder?: number;
	prefetchOrder?: number;
}
type RawLoaderDefinition<
	OptionsType = {},
	ContextAdditions = {}
> = RawLoaderDefinitionFunction<OptionsType, ContextAdditions> & {
	raw: true;
	pitch?: PitchLoaderDefinitionFunction<OptionsType, ContextAdditions>;
};
declare interface RawLoaderDefinitionFunction<
	OptionsType = {},
	ContextAdditions = {}
> {
	(
		this: NormalModuleLoaderContext<OptionsType> &
			LoaderRunnerLoaderContext<OptionsType> &
			LoaderPluginLoaderContext &
			HotModuleReplacementPluginLoaderContext &
			ContextAdditions,
		content: Buffer,
		sourceMap?: string | SourceMap,
		additionalData?: AdditionalData
	): string | void | Buffer | Promise<string | Buffer>;
}
declare class RawSource extends Source {
	constructor(source: string | Buffer, convertToString?: boolean);
	isBuffer(): boolean;
}
declare class ReadFileCompileWasmPlugin {
	constructor(options?: any);
	options: any;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare class RealContentHashPlugin {
	constructor(__0: { hashFunction: any; hashDigest: any });

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
	static getCompilationHooks(
		compilation: Compilation
	): CompilationHooksRealContentHashPlugin;
}
declare interface RealDependencyLocation {
	start: SourcePosition;
	end?: SourcePosition;
	index?: number;
}
type RecursiveArrayOrRecord<T> =
	| { [index: string]: RecursiveArrayOrRecord<T> }
	| RecursiveArrayOrRecord<T>[]
	| T;
declare interface ReferencedExport {
	/**
	 * name of the referenced export
	 */
	name: string[];

	/**
	 * when false, referenced export can not be mangled, defaults to true
	 */
	canMangle?: boolean;
}
type Remotes = (string | RemotesObject)[] | RemotesObject;

/**
 * Advanced configuration for container locations from which modules should be resolved and loaded at runtime.
 */
declare interface RemotesConfig {
	/**
	 * Container locations from which modules should be resolved and loaded at runtime.
	 */
	external: string | string[];

	/**
	 * The name of the share scope shared with this remote.
	 */
	shareScope?: string;
}

/**
 * Container locations from which modules should be resolved and loaded at runtime. Property names are used as request scopes.
 */
declare interface RemotesObject {
	[index: string]: string | RemotesConfig | string[];
}
declare interface RenderBootstrapContext {
	/**
	 * the chunk
	 */
	chunk: Chunk;

	/**
	 * results of code generation
	 */
	codeGenerationResults: CodeGenerationResults;

	/**
	 * the runtime template
	 */
	runtimeTemplate: RuntimeTemplate;

	/**
	 * the module graph
	 */
	moduleGraph: ModuleGraph;

	/**
	 * the chunk graph
	 */
	chunkGraph: ChunkGraph;

	/**
	 * hash to be used for render call
	 */
	hash: string;
}
declare interface RenderContext {
	/**
	 * the chunk
	 */
	chunk: Chunk;

	/**
	 * the dependency templates
	 */
	dependencyTemplates: DependencyTemplates;

	/**
	 * the runtime template
	 */
	runtimeTemplate: RuntimeTemplate;

	/**
	 * the module graph
	 */
	moduleGraph: ModuleGraph;

	/**
	 * the chunk graph
	 */
	chunkGraph: ChunkGraph;

	/**
	 * results of code generation
	 */
	codeGenerationResults: CodeGenerationResults;

	/**
	 * rendering in strict context
	 */
	strictMode: boolean;
}
type RenderManifestEntry =
	| RenderManifestEntryTemplated
	| RenderManifestEntryStatic;
declare interface RenderManifestEntryStatic {
	render: () => Source;
	filename: string;
	info: AssetInfo;
	identifier: string;
	hash?: string;
	auxiliary?: boolean;
}
declare interface RenderManifestEntryTemplated {
	render: () => Source;
	filenameTemplate: string | ((arg0: PathData, arg1?: AssetInfo) => string);
	pathOptions?: PathData;
	info?: AssetInfo;
	identifier: string;
	hash?: string;
	auxiliary?: boolean;
}
declare interface RenderManifestOptions {
	/**
	 * the chunk used to render
	 */
	chunk: Chunk;
	hash: string;
	fullHash: string;
	outputOptions: Output;
	codeGenerationResults: CodeGenerationResults;
	moduleTemplates: { javascript: ModuleTemplate };
	dependencyTemplates: DependencyTemplates;
	runtimeTemplate: RuntimeTemplate;
	moduleGraph: ModuleGraph;
	chunkGraph: ChunkGraph;
}
declare class ReplaceSource extends Source {
	constructor(source: Source, name?: string);
	replace(start: number, end: number, newValue: string, name?: string): void;
	insert(pos: number, newValue: string, name?: string): void;
	getName(): string;
	original(): string;
	getReplacements(): {
		start: number;
		end: number;
		content: string;
		insertIndex: number;
		name: string;
	}[];
}
declare abstract class RequestShortener {
	contextify: (arg0: string) => string;
	shorten(request?: null | string): undefined | null | string;
}
declare interface ResolveBuildDependenciesResult {
	/**
	 * list of files
	 */
	files: Set<string>;

	/**
	 * list of directories
	 */
	directories: Set<string>;

	/**
	 * list of missing entries
	 */
	missing: Set<string>;

	/**
	 * stored resolve results
	 */
	resolveResults: Map<string, string | false>;

	/**
	 * dependencies of the resolving
	 */
	resolveDependencies: {
		/**
		 * list of files
		 */
		files: Set<string>;
		/**
		 * list of directories
		 */
		directories: Set<string>;
		/**
		 * list of missing entries
		 */
		missing: Set<string>;
	};
}

/**
 * Resolve context
 */
declare interface ResolveContext {
	contextDependencies?: WriteOnlySet<string>;

	/**
	 * files that was found on file system
	 */
	fileDependencies?: WriteOnlySet<string>;

	/**
	 * dependencies that was not found on file system
	 */
	missingDependencies?: WriteOnlySet<string>;

	/**
	 * set of hooks' calls. For instance, `resolve → parsedResolve → describedResolve`,
	 */
	stack?: Set<string>;

	/**
	 * log function
	 */
	log?: (arg0: string) => void;

	/**
	 * yield result, if provided plugins can return several results
	 */
	yield?: (arg0: ResolveRequest) => void;
}
declare interface ResolveData {
	contextInfo: ModuleFactoryCreateDataContextInfo;
	resolveOptions?: ResolveOptionsWebpackOptions;
	context: string;
	request: string;
	assertions?: Record<string, any>;
	dependencies: ModuleDependency[];
	dependencyType: string;
	createData: Partial<NormalModuleCreateData & { settings: ModuleSettings }>;
	fileDependencies: LazySet<string>;
	missingDependencies: LazySet<string>;
	contextDependencies: LazySet<string>;

	/**
	 * allow to use the unsafe cache
	 */
	cacheable: boolean;
}
declare interface ResolveOptionsTypes {
	alias: AliasOption[];
	fallback: AliasOption[];
	aliasFields: Set<string | string[]>;
	extensionAlias: ExtensionAliasOption[];
	cachePredicate: (arg0: ResolveRequest) => boolean;
	cacheWithContext: boolean;

	/**
	 * A list of exports field condition names.
	 */
	conditionNames: Set<string>;
	descriptionFiles: string[];
	enforceExtension: boolean;
	exportsFields: Set<string | string[]>;
	importsFields: Set<string | string[]>;
	extensions: Set<string>;
	fileSystem: FileSystem;
	unsafeCache: false | object;
	symlinks: boolean;
	resolver?: Resolver;
	modules: (string | string[])[];
	mainFields: { name: string[]; forceRelative: boolean }[];
	mainFiles: Set<string>;
	plugins: Plugin[];
	pnpApi: null | PnpApiImpl;
	roots: Set<string>;
	fullySpecified: boolean;
	resolveToContext: boolean;
	restrictions: Set<string | RegExp>;
	preferRelative: boolean;
	preferAbsolute: boolean;
}

/**
 * Options object for resolving requests.
 */
declare interface ResolveOptionsWebpackOptions {
	/**
	 * Redirect module requests.
	 */
	alias?:
		| {
				/**
				 * New request.
				 */
				alias: string | false | string[];
				/**
				 * Request to be redirected.
				 */
				name: string;
				/**
				 * Redirect only exact matching request.
				 */
				onlyModule?: boolean;
		  }[]
		| { [index: string]: string | false | string[] };

	/**
	 * Fields in the description file (usually package.json) which are used to redirect requests inside the module.
	 */
	aliasFields?: (string | string[])[];

	/**
	 * Extra resolve options per dependency category. Typical categories are "commonjs", "amd", "esm".
	 */
	byDependency?: { [index: string]: ResolveOptionsWebpackOptions };

	/**
	 * Enable caching of successfully resolved requests (cache entries are revalidated).
	 */
	cache?: boolean;

	/**
	 * Predicate function to decide which requests should be cached.
	 */
	cachePredicate?: (request: ResolveRequest) => boolean;

	/**
	 * Include the context information in the cache identifier when caching.
	 */
	cacheWithContext?: boolean;

	/**
	 * Condition names for exports field entry point.
	 */
	conditionNames?: string[];

	/**
	 * Filenames used to find a description file (like a package.json).
	 */
	descriptionFiles?: string[];

	/**
	 * Enforce the resolver to use one of the extensions from the extensions option (User must specify requests without extension).
	 */
	enforceExtension?: boolean;

	/**
	 * Field names from the description file (usually package.json) which are used to provide entry points of a package.
	 */
	exportsFields?: string[];

	/**
	 * An object which maps extension to extension aliases.
	 */
	extensionAlias?: { [index: string]: string | string[] };

	/**
	 * Extensions added to the request when trying to find the file.
	 */
	extensions?: string[];

	/**
	 * Redirect module requests when normal resolving fails.
	 */
	fallback?:
		| {
				/**
				 * New request.
				 */
				alias: string | false | string[];
				/**
				 * Request to be redirected.
				 */
				name: string;
				/**
				 * Redirect only exact matching request.
				 */
				onlyModule?: boolean;
		  }[]
		| { [index: string]: string | false | string[] };

	/**
	 * Filesystem for the resolver.
	 */
	fileSystem?: InputFileSystem;

	/**
	 * Treats the request specified by the user as fully specified, meaning no extensions are added and the mainFiles in directories are not resolved (This doesn't affect requests from mainFields, aliasFields or aliases).
	 */
	fullySpecified?: boolean;

	/**
	 * Field names from the description file (usually package.json) which are used to provide internal request of a package (requests starting with # are considered as internal).
	 */
	importsFields?: string[];

	/**
	 * Field names from the description file (package.json) which are used to find the default entry point.
	 */
	mainFields?: (string | string[])[];

	/**
	 * Filenames used to find the default entry point if there is no description file or main field.
	 */
	mainFiles?: string[];

	/**
	 * Folder names or directory paths where to find modules.
	 */
	modules?: string[];

	/**
	 * Plugins for the resolver.
	 */
	plugins?: (ResolvePluginInstance | "...")[];

	/**
	 * Prefer to resolve server-relative URLs (starting with '/') as absolute paths before falling back to resolve in 'resolve.roots'.
	 */
	preferAbsolute?: boolean;

	/**
	 * Prefer to resolve module requests as relative request and fallback to resolving as module.
	 */
	preferRelative?: boolean;

	/**
	 * Custom resolver.
	 */
	resolver?: Resolver;

	/**
	 * A list of resolve restrictions. Resolve results must fulfill all of these restrictions to resolve successfully. Other resolve paths are taken when restrictions are not met.
	 */
	restrictions?: (string | RegExp)[];

	/**
	 * A list of directories in which requests that are server-relative URLs (starting with '/') are resolved.
	 */
	roots?: string[];

	/**
	 * Enable resolving symlinks to the original location.
	 */
	symlinks?: boolean;

	/**
	 * Enable caching of successfully resolved requests (cache entries are not revalidated).
	 */
	unsafeCache?: boolean | { [index: string]: any };

	/**
	 * Use synchronous filesystem calls for the resolver.
	 */
	useSyncFileSystemCalls?: boolean;
}
type ResolveOptionsWithDependencyType = ResolveOptionsWebpackOptions & {
	dependencyType?: string;
	resolveToContext?: boolean;
};

/**
 * Plugin instance.
 */
declare interface ResolvePluginInstance {
	[index: string]: any;

	/**
	 * The run point of the plugin, required method.
	 */
	apply: (resolver: Resolver) => void;
}
type ResolveRequest = BaseResolveRequest & Partial<ParsedIdentifier>;
declare interface ResolvedContextFileSystemInfoEntry {
	safeTime: number;
	timestampHash?: string;
}
declare interface ResolvedContextTimestampAndHash {
	safeTime: number;
	timestampHash?: string;
	hash: string;
}
declare abstract class Resolver {
	fileSystem: FileSystem;
	options: ResolveOptionsTypes;
	hooks: {
		resolveStep: SyncHook<
			[
				AsyncSeriesBailHook<
					[ResolveRequest, ResolveContext],
					null | ResolveRequest
				>,
				ResolveRequest
			]
		>;
		noResolve: SyncHook<[ResolveRequest, Error]>;
		resolve: AsyncSeriesBailHook<
			[ResolveRequest, ResolveContext],
			null | ResolveRequest
		>;
		result: AsyncSeriesHook<[ResolveRequest, ResolveContext]>;
	};
	ensureHook(
		name:
			| string
			| AsyncSeriesBailHook<
					[ResolveRequest, ResolveContext],
					null | ResolveRequest
			  >
	): AsyncSeriesBailHook<
		[ResolveRequest, ResolveContext],
		null | ResolveRequest
	>;
	getHook(
		name:
			| string
			| AsyncSeriesBailHook<
					[ResolveRequest, ResolveContext],
					null | ResolveRequest
			  >
	): AsyncSeriesBailHook<
		[ResolveRequest, ResolveContext],
		null | ResolveRequest
	>;
	resolveSync(context: object, path: string, request: string): string | false;
	resolve(
		context: object,
		path: string,
		request: string,
		resolveContext: ResolveContext,
		callback: (
			arg0: null | Error,
			arg1?: string | false,
			arg2?: ResolveRequest
		) => void
	): void;
	doResolve(
		hook?: any,
		request?: any,
		message?: any,
		resolveContext?: any,
		callback?: any
	): any;
	parse(identifier: string): ParsedIdentifier;
	isModule(path?: any): boolean;
	isPrivate(path?: any): boolean;
	isDirectory(path: string): boolean;
	join(path?: any, request?: any): string;
	normalize(path?: any): string;
}
declare interface ResolverCache {
	direct: WeakMap<Object, ResolverWithOptions>;
	stringified: Map<string, ResolverWithOptions>;
}
declare abstract class ResolverFactory {
	hooks: Readonly<{
		resolveOptions: HookMap<
			SyncWaterfallHook<[ResolveOptionsWithDependencyType]>
		>;
		resolver: HookMap<
			SyncHook<[Resolver, UserResolveOptions, ResolveOptionsWithDependencyType]>
		>;
	}>;
	cache: Map<string, ResolverCache>;
	get(
		type: string,
		resolveOptions?: ResolveOptionsWithDependencyType
	): ResolverWithOptions;
}
type ResolverWithOptions = Resolver & WithOptions;

declare interface ResourceDataWithData {
	resource: string;
	path: string;
	query: string;
	fragment: string;
	context?: string;
	data: Record<string, any>;
}
type Rule = string | RegExp;
declare interface RuleSet {
	/**
	 * map of references in the rule set (may grow over time)
	 */
	references: Map<string, any>;

	/**
	 * execute the rule set
	 */
	exec: (arg0: object) => Effect[];
}
type RuleSetCondition =
	| string
	| RegExp
	| ((value: string) => boolean)
	| RuleSetLogicalConditions
	| RuleSetCondition[];
type RuleSetConditionAbsolute =
	| string
	| RegExp
	| ((value: string) => boolean)
	| RuleSetLogicalConditionsAbsolute
	| RuleSetConditionAbsolute[];
type RuleSetConditionOrConditions =
	| string
	| RegExp
	| ((value: string) => boolean)
	| RuleSetLogicalConditions
	| RuleSetCondition[];

/**
 * Logic operators used in a condition matcher.
 */
declare interface RuleSetLogicalConditions {
	/**
	 * Logical AND.
	 */
	and?: RuleSetCondition[];

	/**
	 * Logical NOT.
	 */
	not?:
		| string
		| RegExp
		| ((value: string) => boolean)
		| RuleSetLogicalConditions
		| RuleSetCondition[];

	/**
	 * Logical OR.
	 */
	or?: RuleSetCondition[];
}

/**
 * Logic operators used in a condition matcher.
 */
declare interface RuleSetLogicalConditionsAbsolute {
	/**
	 * Logical AND.
	 */
	and?: RuleSetConditionAbsolute[];

	/**
	 * Logical NOT.
	 */
	not?:
		| string
		| RegExp
		| ((value: string) => boolean)
		| RuleSetLogicalConditionsAbsolute
		| RuleSetConditionAbsolute[];

	/**
	 * Logical OR.
	 */
	or?: RuleSetConditionAbsolute[];
}

/**
 * A rule description with conditions and effects for modules.
 */
declare interface RuleSetRule {
	/**
	 * Match on import assertions of the dependency.
	 */
	assert?: { [index: string]: RuleSetConditionOrConditions };

	/**
	 * Match the child compiler name.
	 */
	compiler?:
		| string
		| RegExp
		| ((value: string) => boolean)
		| RuleSetLogicalConditions
		| RuleSetCondition[];

	/**
	 * Match dependency type.
	 */
	dependency?:
		| string
		| RegExp
		| ((value: string) => boolean)
		| RuleSetLogicalConditions
		| RuleSetCondition[];

	/**
	 * Match values of properties in the description file (usually package.json).
	 */
	descriptionData?: { [index: string]: RuleSetConditionOrConditions };

	/**
	 * Enforce this rule as pre or post step.
	 */
	enforce?: "pre" | "post";

	/**
	 * Shortcut for resource.exclude.
	 */
	exclude?:
		| string
		| RegExp
		| ((value: string) => boolean)
		| RuleSetLogicalConditionsAbsolute
		| RuleSetConditionAbsolute[];

	/**
	 * The options for the module generator.
	 */
	generator?: { [index: string]: any };

	/**
	 * Shortcut for resource.include.
	 */
	include?:
		| string
		| RegExp
		| ((value: string) => boolean)
		| RuleSetLogicalConditionsAbsolute
		| RuleSetConditionAbsolute[];

	/**
	 * Match the issuer of the module (The module pointing to this module).
	 */
	issuer?:
		| string
		| RegExp
		| ((value: string) => boolean)
		| RuleSetLogicalConditionsAbsolute
		| RuleSetConditionAbsolute[];

	/**
	 * Match layer of the issuer of this module (The module pointing to this module).
	 */
	issuerLayer?:
		| string
		| RegExp
		| ((value: string) => boolean)
		| RuleSetLogicalConditions
		| RuleSetCondition[];

	/**
	 * Specifies the layer in which the module should be placed in.
	 */
	layer?: string;

	/**
	 * Shortcut for use.loader.
	 */
	loader?: string;

	/**
	 * Match module mimetype when load from Data URI.
	 */
	mimetype?:
		| string
		| RegExp
		| ((value: string) => boolean)
		| RuleSetLogicalConditions
		| RuleSetCondition[];

	/**
	 * Only execute the first matching rule in this array.
	 */
	oneOf?: RuleSetRule[];

	/**
	 * Shortcut for use.options.
	 */
	options?: string | { [index: string]: any };

	/**
	 * Options for parsing.
	 */
	parser?: { [index: string]: any };

	/**
	 * Match the real resource path of the module.
	 */
	realResource?:
		| string
		| RegExp
		| ((value: string) => boolean)
		| RuleSetLogicalConditionsAbsolute
		| RuleSetConditionAbsolute[];

	/**
	 * Options for the resolver.
	 */
	resolve?: ResolveOptionsWebpackOptions;

	/**
	 * Match the resource path of the module.
	 */
	resource?:
		| string
		| RegExp
		| ((value: string) => boolean)
		| RuleSetLogicalConditionsAbsolute
		| RuleSetConditionAbsolute[];

	/**
	 * Match the resource fragment of the module.
	 */
	resourceFragment?:
		| string
		| RegExp
		| ((value: string) => boolean)
		| RuleSetLogicalConditions
		| RuleSetCondition[];

	/**
	 * Match the resource query of the module.
	 */
	resourceQuery?:
		| string
		| RegExp
		| ((value: string) => boolean)
		| RuleSetLogicalConditions
		| RuleSetCondition[];

	/**
	 * Match and execute these rules when this rule is matched.
	 */
	rules?: RuleSetRule[];

	/**
	 * Match module scheme.
	 */
	scheme?:
		| string
		| RegExp
		| ((value: string) => boolean)
		| RuleSetLogicalConditions
		| RuleSetCondition[];

	/**
	 * Flags a module as with or without side effects.
	 */
	sideEffects?: boolean;

	/**
	 * Shortcut for resource.test.
	 */
	test?:
		| string
		| RegExp
		| ((value: string) => boolean)
		| RuleSetLogicalConditionsAbsolute
		| RuleSetConditionAbsolute[];

	/**
	 * Module type to use for the module.
	 */
	type?: string;

	/**
	 * Modifiers applied to the module when rule is matched.
	 */
	use?:
		| string
		| RuleSetUseItem[]
		| ((data: {
				resource: string;
				realResource: string;
				resourceQuery: string;
				issuer: string;
				compiler: string;
		  }) => RuleSetUseItem[])
		| {
				/**
				 * Unique loader options identifier.
				 */
				ident?: string;
				/**
				 * Loader name.
				 */
				loader?: string;
				/**
				 * Loader options.
				 */
				options?: string | { [index: string]: any };
		  }
		| ((data: object) =>
				| string
				| {
						/**
						 * Unique loader options identifier.
						 */
						ident?: string;
						/**
						 * Loader name.
						 */
						loader?: string;
						/**
						 * Loader options.
						 */
						options?: string | { [index: string]: any };
				  }
				| __TypeWebpackOptions
				| RuleSetUseItem[]);
}
type RuleSetUse =
	| string
	| RuleSetUseItem[]
	| ((data: {
			resource: string;
			realResource: string;
			resourceQuery: string;
			issuer: string;
			compiler: string;
	  }) => RuleSetUseItem[])
	| {
			/**
			 * Unique loader options identifier.
			 */
			ident?: string;
			/**
			 * Loader name.
			 */
			loader?: string;
			/**
			 * Loader options.
			 */
			options?: string | { [index: string]: any };
	  }
	| __TypeWebpackOptions;
type RuleSetUseItem =
	| string
	| {
			/**
			 * Unique loader options identifier.
			 */
			ident?: string;
			/**
			 * Loader name.
			 */
			loader?: string;
			/**
			 * Loader options.
			 */
			options?: string | { [index: string]: any };
	  }
	| __TypeWebpackOptions;
declare class RuntimeChunkPlugin {
	constructor(options?: any);
	options: any;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
type RuntimeCondition = undefined | string | boolean | SortableSet<string>;
declare class RuntimeModule extends Module {
	constructor(name: string, stage?: number);
	name: string;
	stage: number;
	compilation: Compilation;
	chunk: Chunk;
	chunkGraph: ChunkGraph;
	fullHash: boolean;
	dependentHash: boolean;
	attach(compilation: Compilation, chunk: Chunk, chunkGraph?: ChunkGraph): void;
	generate(): string;
	getGeneratedCode(): string;
	shouldIsolate(): boolean;

	/**
	 * Runtime modules without any dependencies to other runtime modules
	 */
	static STAGE_NORMAL: number;

	/**
	 * Runtime modules with simple dependencies on other runtime modules
	 */
	static STAGE_BASIC: number;

	/**
	 * Runtime modules which attach to handlers of other runtime modules
	 */
	static STAGE_ATTACH: number;

	/**
	 * Runtime modules which trigger actions on bootstrap
	 */
	static STAGE_TRIGGER: number;
}
declare interface RuntimeRequirementsContext {
	/**
	 * the chunk graph
	 */
	chunkGraph: ChunkGraph;

	/**
	 * the code generation results
	 */
	codeGenerationResults: CodeGenerationResults;
}
type RuntimeSpec = undefined | string | SortableSet<string>;
declare class RuntimeSpecMap<T> {
	constructor(clone?: RuntimeSpecMap<T>);
	get(runtime: RuntimeSpec): T;
	has(runtime: RuntimeSpec): boolean;
	set(runtime?: any, value?: any): void;
	provide(runtime?: any, computer?: any): any;
	delete(runtime?: any): void;
	update(runtime?: any, fn?: any): void;
	keys(): RuntimeSpec[];
	values(): IterableIterator<T>;
	get size(): number;
}
declare class RuntimeSpecSet {
	constructor(iterable?: any);
	add(runtime?: any): void;
	has(runtime?: any): boolean;
	get size(): number;
	[Symbol.iterator](): IterableIterator<RuntimeSpec>;
}
declare abstract class RuntimeTemplate {
	compilation: Compilation;
	outputOptions: OutputNormalized;
	requestShortener: RequestShortener;
	globalObject: string;
	contentHashReplacement: string;
	isIIFE(): undefined | boolean;
	isModule(): undefined | boolean;
	supportsConst(): undefined | boolean;
	supportsArrowFunction(): undefined | boolean;
	supportsOptionalChaining(): undefined | boolean;
	supportsForOf(): undefined | boolean;
	supportsDestructuring(): undefined | boolean;
	supportsBigIntLiteral(): undefined | boolean;
	supportsDynamicImport(): undefined | boolean;
	supportsEcmaScriptModuleSyntax(): undefined | boolean;
	supportTemplateLiteral(): undefined | boolean;
	returningFunction(returnValue?: any, args?: string): string;
	basicFunction(args?: any, body?: any): string;
	concatenation(...args: (string | { expr: string })[]): string;
	expressionFunction(expression?: any, args?: string): string;
	emptyFunction(): "x => {}" | "function() {}";
	destructureArray(items?: any, value?: any): string;
	destructureObject(items?: any, value?: any): string;
	iife(args?: any, body?: any): string;
	forEach(variable?: any, array?: any, body?: any): string;

	/**
	 * Add a comment
	 */
	comment(__0: {
		/**
		 * request string used originally
		 */
		request?: string;
		/**
		 * name of the chunk referenced
		 */
		chunkName?: string;
		/**
		 * reason information of the chunk
		 */
		chunkReason?: string;
		/**
		 * additional message
		 */
		message?: string;
		/**
		 * name of the export
		 */
		exportName?: string;
	}): string;
	throwMissingModuleErrorBlock(__0: {
		/**
		 * request string used originally
		 */
		request?: string;
	}): string;
	throwMissingModuleErrorFunction(__0: {
		/**
		 * request string used originally
		 */
		request?: string;
	}): string;
	missingModule(__0: {
		/**
		 * request string used originally
		 */
		request?: string;
	}): string;
	missingModuleStatement(__0: {
		/**
		 * request string used originally
		 */
		request?: string;
	}): string;
	missingModulePromise(__0: {
		/**
		 * request string used originally
		 */
		request?: string;
	}): string;
	weakError(__0: {
		/**
		 * the chunk graph
		 */
		chunkGraph: ChunkGraph;
		/**
		 * the module
		 */
		module: Module;
		/**
		 * the request that should be printed as comment
		 */
		request: string;
		/**
		 * expression to use as id expression
		 */
		idExpr?: string;
		/**
		 * which kind of code should be returned
		 */
		type: "promise" | "expression" | "statements";
	}): string;
	moduleId(__0: {
		/**
		 * the module
		 */
		module: Module;
		/**
		 * the chunk graph
		 */
		chunkGraph: ChunkGraph;
		/**
		 * the request that should be printed as comment
		 */
		request: string;
		/**
		 * if the dependency is weak (will create a nice error message)
		 */
		weak?: boolean;
	}): string;
	moduleRaw(__0: {
		/**
		 * the module
		 */
		module: Module;
		/**
		 * the chunk graph
		 */
		chunkGraph: ChunkGraph;
		/**
		 * the request that should be printed as comment
		 */
		request: string;
		/**
		 * if the dependency is weak (will create a nice error message)
		 */
		weak?: boolean;
		/**
		 * if set, will be filled with runtime requirements
		 */
		runtimeRequirements: Set<string>;
	}): string;
	moduleExports(__0: {
		/**
		 * the module
		 */
		module: Module;
		/**
		 * the chunk graph
		 */
		chunkGraph: ChunkGraph;
		/**
		 * the request that should be printed as comment
		 */
		request: string;
		/**
		 * if the dependency is weak (will create a nice error message)
		 */
		weak?: boolean;
		/**
		 * if set, will be filled with runtime requirements
		 */
		runtimeRequirements: Set<string>;
	}): string;
	moduleNamespace(__0: {
		/**
		 * the module
		 */
		module: Module;
		/**
		 * the chunk graph
		 */
		chunkGraph: ChunkGraph;
		/**
		 * the request that should be printed as comment
		 */
		request: string;
		/**
		 * if the current module is in strict esm mode
		 */
		strict?: boolean;
		/**
		 * if the dependency is weak (will create a nice error message)
		 */
		weak?: boolean;
		/**
		 * if set, will be filled with runtime requirements
		 */
		runtimeRequirements: Set<string>;
	}): string;
	moduleNamespacePromise(__0: {
		/**
		 * the chunk graph
		 */
		chunkGraph: ChunkGraph;
		/**
		 * the current dependencies block
		 */
		block?: AsyncDependenciesBlock;
		/**
		 * the module
		 */
		module: Module;
		/**
		 * the request that should be printed as comment
		 */
		request: string;
		/**
		 * a message for the comment
		 */
		message: string;
		/**
		 * if the current module is in strict esm mode
		 */
		strict?: boolean;
		/**
		 * if the dependency is weak (will create a nice error message)
		 */
		weak?: boolean;
		/**
		 * if set, will be filled with runtime requirements
		 */
		runtimeRequirements: Set<string>;
	}): string;
	runtimeConditionExpression(__0: {
		/**
		 * the chunk graph
		 */
		chunkGraph: ChunkGraph;
		/**
		 * runtime for which this code will be generated
		 */
		runtime?: RuntimeSpec;
		/**
		 * only execute the statement in some runtimes
		 */
		runtimeCondition?: string | boolean | SortableSet<string>;
		/**
		 * if set, will be filled with runtime requirements
		 */
		runtimeRequirements: Set<string>;
	}): string;
	importStatement(__0: {
		/**
		 * whether a new variable should be created or the existing one updated
		 */
		update?: boolean;
		/**
		 * the module
		 */
		module: Module;
		/**
		 * the chunk graph
		 */
		chunkGraph: ChunkGraph;
		/**
		 * the request that should be printed as comment
		 */
		request: string;
		/**
		 * name of the import variable
		 */
		importVar: string;
		/**
		 * module in which the statement is emitted
		 */
		originModule: Module;
		/**
		 * true, if this is a weak dependency
		 */
		weak?: boolean;
		/**
		 * if set, will be filled with runtime requirements
		 */
		runtimeRequirements: Set<string>;
	}): [string, string];
	exportFromImport(__0: {
		/**
		 * the module graph
		 */
		moduleGraph: ModuleGraph;
		/**
		 * the module
		 */
		module: Module;
		/**
		 * the request
		 */
		request: string;
		/**
		 * the export name
		 */
		exportName: string | string[];
		/**
		 * the origin module
		 */
		originModule: Module;
		/**
		 * true, if location is safe for ASI, a bracket can be emitted
		 */
		asiSafe?: boolean;
		/**
		 * true, if expression will be called
		 */
		isCall: boolean;
		/**
		 * when false, call context will not be preserved
		 */
		callContext: boolean;
		/**
		 * when true and accessing the default exports, interop code will be generated
		 */
		defaultInterop: boolean;
		/**
		 * the identifier name of the import variable
		 */
		importVar: string;
		/**
		 * init fragments will be added here
		 */
		initFragments: InitFragment<any>[];
		/**
		 * runtime for which this code will be generated
		 */
		runtime: RuntimeSpec;
		/**
		 * if set, will be filled with runtime requirements
		 */
		runtimeRequirements: Set<string>;
	}): string;
	blockPromise(__0: {
		/**
		 * the async block
		 */
		block: AsyncDependenciesBlock;
		/**
		 * the message
		 */
		message: string;
		/**
		 * the chunk graph
		 */
		chunkGraph: ChunkGraph;
		/**
		 * if set, will be filled with runtime requirements
		 */
		runtimeRequirements: Set<string>;
	}): string;
	asyncModuleFactory(__0: {
		/**
		 * the async block
		 */
		block: AsyncDependenciesBlock;
		/**
		 * the chunk graph
		 */
		chunkGraph: ChunkGraph;
		/**
		 * if set, will be filled with runtime requirements
		 */
		runtimeRequirements: Set<string>;
		/**
		 * request string used originally
		 */
		request?: string;
	}): string;
	syncModuleFactory(__0: {
		/**
		 * the dependency
		 */
		dependency: Dependency;
		/**
		 * the chunk graph
		 */
		chunkGraph: ChunkGraph;
		/**
		 * if set, will be filled with runtime requirements
		 */
		runtimeRequirements: Set<string>;
		/**
		 * request string used originally
		 */
		request?: string;
	}): string;
	defineEsModuleFlagStatement(__0: {
		/**
		 * the name of the exports object
		 */
		exportsArgument: string;
		/**
		 * if set, will be filled with runtime requirements
		 */
		runtimeRequirements: Set<string>;
	}): string;
	assetUrl(__0: {
		/**
		 * the module
		 */
		module: Module;
		/**
		 * the public path
		 */
		publicPath: string;
		/**
		 * runtime
		 */
		runtime?: RuntimeSpec;
		/**
		 * the code generation results
		 */
		codeGenerationResults: CodeGenerationResults;
	}): string;
}
declare abstract class RuntimeValue {
	fn: (arg0: {
		module: NormalModule;
		key: string;
		readonly version?: string;
	}) => CodeValuePrimitive;
	options: true | RuntimeValueOptions;
	get fileDependencies(): true | string[];
	exec(
		parser: JavascriptParser,
		valueCacheVersions: Map<string, string | Set<string>>,
		key: string
	): CodeValuePrimitive;
	getCacheVersion(): undefined | string;
}
declare interface RuntimeValueOptions {
	fileDependencies?: string[];
	contextDependencies?: string[];
	missingDependencies?: string[];
	buildDependencies?: string[];
	version?: string | (() => string);
}
declare interface ScopeInfo {
	definitions: StackedMap<string, ScopeInfo | VariableInfo>;
	topLevelScope: boolean | "arrow";
	inShorthand: boolean;
	isStrict: boolean;
	isAsmJs: boolean;
	inTry: boolean;
}
declare interface Selector<A, B> {
	(input: A): B;
}
declare abstract class Serializer {
	serializeMiddlewares: any;
	deserializeMiddlewares: any;
	context: any;
	serialize(obj?: any, context?: any): any;
	deserialize(value?: any, context?: any): any;
}
type ServerOptionsHttps = SecureContextOptions &
	TlsOptions &
	ServerOptionsImport;
declare class SharePlugin {
	constructor(options: SharePluginOptions);

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}

/**
 * Options for shared modules.
 */
declare interface SharePluginOptions {
	/**
	 * Share scope name used for all shared modules (defaults to 'default').
	 */
	shareScope?: string;

	/**
	 * Modules that should be shared in the share scope. When provided, property names are used to match requested modules in this compilation.
	 */
	shared: Shared;
}
type Shared = (string | SharedObject)[] | SharedObject;

/**
 * Advanced configuration for modules that should be shared in the share scope.
 */
declare interface SharedConfig {
	/**
	 * Include the provided and fallback module directly instead behind an async request. This allows to use this shared module in initial load too. All possible shared modules need to be eager too.
	 */
	eager?: boolean;

	/**
	 * Provided module that should be provided to share scope. Also acts as fallback module if no shared module is found in share scope or version isn't valid. Defaults to the property name.
	 */
	import?: string | false;

	/**
	 * Package name to determine required version from description file. This is only needed when package name can't be automatically determined from request.
	 */
	packageName?: string;

	/**
	 * Version requirement from module in share scope.
	 */
	requiredVersion?: string | false;

	/**
	 * Module is looked up under this key from the share scope.
	 */
	shareKey?: string;

	/**
	 * Share scope name.
	 */
	shareScope?: string;

	/**
	 * Allow only a single version of the shared module in share scope (disabled by default).
	 */
	singleton?: boolean;

	/**
	 * Do not accept shared module if version is not valid (defaults to yes, if local fallback module is available and shared module is not a singleton, otherwise no, has no effect if there is no required version specified).
	 */
	strictVersion?: boolean;

	/**
	 * Version of the provided module. Will replace lower matching versions, but not higher.
	 */
	version?: string | false;
}

/**
 * Modules that should be shared in the share scope. Property names are used to match requested modules in this compilation. Relative requests are resolved, module requests are matched unresolved, absolute paths will match resolved requests. A trailing slash will match all requests with this prefix. In this case shareKey must also have a trailing slash.
 */
declare interface SharedObject {
	[index: string]: string | SharedConfig;
}
declare class SideEffectsFlagPlugin {
	constructor(analyseSource?: boolean);

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
	static moduleHasSideEffects(
		moduleName?: any,
		flagValue?: any,
		cache?: any
	): any;
}
declare class SizeOnlySource extends Source {
	constructor(size: number);
}
declare abstract class Snapshot {
	startTime?: number;
	fileTimestamps?: Map<string, null | FileSystemInfoEntry>;
	fileHashes?: Map<string, null | string>;
	fileTshs?: Map<string, null | string | TimestampAndHash>;
	contextTimestamps?: Map<string, null | ResolvedContextFileSystemInfoEntry>;
	contextHashes?: Map<string, null | string>;
	contextTshs?: Map<string, null | ResolvedContextTimestampAndHash>;
	missingExistence?: Map<string, boolean>;
	managedItemInfo?: Map<string, string>;
	managedFiles?: Set<string>;
	managedContexts?: Set<string>;
	managedMissing?: Set<string>;
	children?: Set<Snapshot>;
	hasStartTime(): boolean;
	setStartTime(value?: any): void;
	setMergedStartTime(value?: any, snapshot?: any): void;
	hasFileTimestamps(): boolean;
	setFileTimestamps(value?: any): void;
	hasFileHashes(): boolean;
	setFileHashes(value?: any): void;
	hasFileTshs(): boolean;
	setFileTshs(value?: any): void;
	hasContextTimestamps(): boolean;
	setContextTimestamps(value?: any): void;
	hasContextHashes(): boolean;
	setContextHashes(value?: any): void;
	hasContextTshs(): boolean;
	setContextTshs(value?: any): void;
	hasMissingExistence(): boolean;
	setMissingExistence(value?: any): void;
	hasManagedItemInfo(): boolean;
	setManagedItemInfo(value?: any): void;
	hasManagedFiles(): boolean;
	setManagedFiles(value?: any): void;
	hasManagedContexts(): boolean;
	setManagedContexts(value?: any): void;
	hasManagedMissing(): boolean;
	setManagedMissing(value?: any): void;
	hasChildren(): boolean;
	setChildren(value?: any): void;
	addChild(child?: any): void;
	serialize(__0: { write: any }): void;
	deserialize(__0: { read: any }): void;
	getFileIterable(): Iterable<string>;
	getContextIterable(): Iterable<string>;
	getMissingIterable(): Iterable<string>;
}

/**
 * Options affecting how file system snapshots are created and validated.
 */
declare interface SnapshotOptions {
	/**
	 * Options for snapshotting build dependencies to determine if the whole cache need to be invalidated.
	 */
	buildDependencies?: {
		/**
		 * Use hashes of the content of the files/directories to determine invalidation.
		 */
		hash?: boolean;
		/**
		 * Use timestamps of the files/directories to determine invalidation.
		 */
		timestamp?: boolean;
	};

	/**
	 * List of paths that are managed by a package manager and contain a version or hash in its path so all files are immutable.
	 */
	immutablePaths?: (string | RegExp)[];

	/**
	 * List of paths that are managed by a package manager and can be trusted to not be modified otherwise.
	 */
	managedPaths?: (string | RegExp)[];

	/**
	 * Options for snapshotting dependencies of modules to determine if they need to be built again.
	 */
	module?: {
		/**
		 * Use hashes of the content of the files/directories to determine invalidation.
		 */
		hash?: boolean;
		/**
		 * Use timestamps of the files/directories to determine invalidation.
		 */
		timestamp?: boolean;
	};

	/**
	 * Options for snapshotting dependencies of request resolving to determine if requests need to be re-resolved.
	 */
	resolve?: {
		/**
		 * Use hashes of the content of the files/directories to determine invalidation.
		 */
		hash?: boolean;
		/**
		 * Use timestamps of the files/directories to determine invalidation.
		 */
		timestamp?: boolean;
	};

	/**
	 * Options for snapshotting the resolving of build dependencies to determine if the build dependencies need to be re-resolved.
	 */
	resolveBuildDependencies?: {
		/**
		 * Use hashes of the content of the files/directories to determine invalidation.
		 */
		hash?: boolean;
		/**
		 * Use timestamps of the files/directories to determine invalidation.
		 */
		timestamp?: boolean;
	};
}
declare abstract class SortableSet<T> extends Set<T> {
	/**
	 * Sort with a comparer function
	 */
	sortWith(sortFn: (arg0: T, arg1: T) => number): void;
	sort(): SortableSet<T>;

	/**
	 * Get data from cache
	 */
	getFromCache<R>(fn: (arg0: SortableSet<T>) => R): R;

	/**
	 * Get data from cache (ignoring sorting)
	 */
	getFromUnorderedCache<R>(fn: (arg0: SortableSet<T>) => R): R;
	toJSON(): T[];

	/**
	 * Iterates over values in the set.
	 */
	[Symbol.iterator](): IterableIterator<T>;
}
declare class Source {
	constructor();
	size(): number;
	map(options?: MapOptions): Object;
	sourceAndMap(options?: MapOptions): { source: string | Buffer; map: Object };
	updateHash(hash: Hash): void;
	source(): string | Buffer;
	buffer(): Buffer;
}
declare interface SourceLike {
	source(): string | Buffer;
}
declare interface SourceMap {
	version: number;
	sources: string[];
	mappings: string;
	file?: string;
	sourceRoot?: string;
	sourcesContent?: string[];
	names?: string[];
}
declare class SourceMapDevToolPlugin {
	constructor(options?: SourceMapDevToolPluginOptions);
	sourceMapFilename: string | false;
	sourceMappingURLComment: string | false;
	moduleFilenameTemplate: string | Function;
	fallbackModuleFilenameTemplate: string | Function;
	namespace: string;
	options: SourceMapDevToolPluginOptions;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare interface SourceMapDevToolPluginOptions {
	/**
	 * Appends the given value to the original asset. Usually the #sourceMappingURL comment. [url] is replaced with a URL to the source map file. false disables the appending.
	 */
	append?: null | string | false;

	/**
	 * Indicates whether column mappings should be used (defaults to true).
	 */
	columns?: boolean;

	/**
	 * Exclude modules that match the given value from source map generation.
	 */
	exclude?: string | RegExp | Rule[];

	/**
	 * Generator string or function to create identifiers of modules for the 'sources' array in the SourceMap used only if 'moduleFilenameTemplate' would result in a conflict.
	 */
	fallbackModuleFilenameTemplate?: string | Function;

	/**
	 * Path prefix to which the [file] placeholder is relative to.
	 */
	fileContext?: string;

	/**
	 * Defines the output filename of the SourceMap (will be inlined if no value is provided).
	 */
	filename?: null | string | false;

	/**
	 * Include source maps for module paths that match the given value.
	 */
	include?: string | RegExp | Rule[];

	/**
	 * Indicates whether SourceMaps from loaders should be used (defaults to true).
	 */
	module?: boolean;

	/**
	 * Generator string or function to create identifiers of modules for the 'sources' array in the SourceMap.
	 */
	moduleFilenameTemplate?: string | Function;

	/**
	 * Namespace prefix to allow multiple webpack roots in the devtools.
	 */
	namespace?: string;

	/**
	 * Omit the 'sourceContents' array from the SourceMap.
	 */
	noSources?: boolean;

	/**
	 * Provide a custom public path for the SourceMapping comment.
	 */
	publicPath?: string;

	/**
	 * Provide a custom value for the 'sourceRoot' property in the SourceMap.
	 */
	sourceRoot?: string;

	/**
	 * Include source maps for modules based on their extension (defaults to .js and .css).
	 */
	test?: string | RegExp | Rule[];
}
declare class SourceMapSource extends Source {
	constructor(
		source: string | Buffer,
		name: string,
		sourceMap: string | Object | Buffer,
		originalSource?: string | Buffer,
		innerSourceMap?: string | Object | Buffer,
		removeOriginalSource?: boolean
	);
	getArgsAsBuffers(): [
		Buffer,
		string,
		Buffer,
		undefined | Buffer,
		undefined | Buffer,
		boolean
	];
}
declare interface SourcePosition {
	line: number;
	column?: number;
}
declare interface SplitChunksOptions {
	chunksFilter: (chunk: Chunk) => boolean;
	defaultSizeTypes: string[];
	minSize: SplitChunksSizes;
	minSizeReduction: SplitChunksSizes;
	minRemainingSize: SplitChunksSizes;
	enforceSizeThreshold: SplitChunksSizes;
	maxInitialSize: SplitChunksSizes;
	maxAsyncSize: SplitChunksSizes;
	minChunks: number;
	maxAsyncRequests: number;
	maxInitialRequests: number;
	hidePathInfo: boolean;
	filename: string | ((arg0: PathData, arg1?: AssetInfo) => string);
	automaticNameDelimiter: string;
	getCacheGroups: (
		module: Module,
		context: CacheGroupsContext
	) => CacheGroupSource[];
	getName: (
		module?: Module,
		chunks?: Chunk[],
		key?: string
	) => undefined | string;
	usedExports: boolean;
	fallbackCacheGroup: FallbackCacheGroup;
}
declare class SplitChunksPlugin {
	constructor(options?: OptimizationSplitChunksOptions);
	options: SplitChunksOptions;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare interface SplitChunksSizes {
	[index: string]: number;
}
declare abstract class StackedMap<K, V> {
	map: Map<K, InternalCell<V>>;
	stack: Map<K, InternalCell<V>>[];
	set(item: K, value: V): void;
	delete(item: K): void;
	has(item: K): boolean;
	get(item: K): Cell<V>;
	asArray(): K[];
	asSet(): Set<K>;
	asPairArray(): [K, Cell<V>][];
	asMap(): Map<K, Cell<V>>;
	get size(): number;
	createChild(): StackedMap<K, V>;
}
type StartupRenderContext = RenderContext & { inlined: boolean };
type Statement =
	| FunctionDeclaration
	| VariableDeclaration
	| ClassDeclaration
	| ExpressionStatement
	| BlockStatement
	| StaticBlock
	| EmptyStatement
	| DebuggerStatement
	| WithStatement
	| ReturnStatement
	| LabeledStatement
	| BreakStatement
	| ContinueStatement
	| IfStatement
	| SwitchStatement
	| ThrowStatement
	| TryStatement
	| WhileStatement
	| DoWhileStatement
	| ForStatement
	| ForInStatement
	| ForOfStatement;
declare class Stats {
	constructor(compilation: Compilation);
	compilation: Compilation;
	get hash(): string;
	get startTime(): any;
	get endTime(): any;
	hasWarnings(): boolean;
	hasErrors(): boolean;
	toJson(options?: string | StatsOptions): StatsCompilation;
	toString(options?: any): string;
}
type StatsAsset = KnownStatsAsset & Record<string, any>;
type StatsChunk = KnownStatsChunk & Record<string, any>;
type StatsChunkGroup = KnownStatsChunkGroup & Record<string, any>;
type StatsChunkOrigin = KnownStatsChunkOrigin & Record<string, any>;
type StatsCompilation = KnownStatsCompilation & Record<string, any>;
type StatsError = KnownStatsError & Record<string, any>;
declare abstract class StatsFactory {
	hooks: Readonly<{
		extract: HookMap<SyncBailHook<[Object, any, StatsFactoryContext], any>>;
		filter: HookMap<
			SyncBailHook<[any, StatsFactoryContext, number, number], any>
		>;
		sort: HookMap<
			SyncBailHook<
				[((arg0?: any, arg1?: any) => number)[], StatsFactoryContext],
				any
			>
		>;
		filterSorted: HookMap<
			SyncBailHook<[any, StatsFactoryContext, number, number], any>
		>;
		groupResults: HookMap<
			SyncBailHook<[GroupConfig[], StatsFactoryContext], any>
		>;
		sortResults: HookMap<
			SyncBailHook<
				[((arg0?: any, arg1?: any) => number)[], StatsFactoryContext],
				any
			>
		>;
		filterResults: HookMap<
			SyncBailHook<[any, StatsFactoryContext, number, number], any>
		>;
		merge: HookMap<SyncBailHook<[any[], StatsFactoryContext], any>>;
		result: HookMap<SyncBailHook<[any[], StatsFactoryContext], any>>;
		getItemName: HookMap<SyncBailHook<[any, StatsFactoryContext], any>>;
		getItemFactory: HookMap<SyncBailHook<[any, StatsFactoryContext], any>>;
	}>;
	create(
		type: string,
		data: any,
		baseContext: Omit<StatsFactoryContext, "type">
	): any;
}
type StatsFactoryContext = KnownStatsFactoryContext & Record<string, any>;
type StatsLogging = KnownStatsLogging & Record<string, any>;
type StatsLoggingEntry = KnownStatsLoggingEntry & Record<string, any>;
type StatsModule = KnownStatsModule & Record<string, any>;
type StatsModuleIssuer = KnownStatsModuleIssuer & Record<string, any>;
type StatsModuleReason = KnownStatsModuleReason & Record<string, any>;
type StatsModuleTraceDependency = KnownStatsModuleTraceDependency &
	Record<string, any>;
type StatsModuleTraceItem = KnownStatsModuleTraceItem & Record<string, any>;

/**
 * Stats options object.
 */
declare interface StatsOptions {
	/**
	 * Fallback value for stats options when an option is not defined (has precedence over local webpack defaults).
	 */
	all?: boolean;

	/**
	 * Add assets information.
	 */
	assets?: boolean;

	/**
	 * Sort the assets by that field.
	 */
	assetsSort?: string;

	/**
	 * Space to display assets (groups will be collapsed to fit this space).
	 */
	assetsSpace?: number;

	/**
	 * Add built at time information.
	 */
	builtAt?: boolean;

	/**
	 * Add information about cached (not built) modules (deprecated: use 'cachedModules' instead).
	 */
	cached?: boolean;

	/**
	 * Show cached assets (setting this to `false` only shows emitted files).
	 */
	cachedAssets?: boolean;

	/**
	 * Add information about cached (not built) modules.
	 */
	cachedModules?: boolean;

	/**
	 * Add children information.
	 */
	children?: boolean;

	/**
	 * Display auxiliary assets in chunk groups.
	 */
	chunkGroupAuxiliary?: boolean;

	/**
	 * Display children of chunk groups.
	 */
	chunkGroupChildren?: boolean;

	/**
	 * Limit of assets displayed in chunk groups.
	 */
	chunkGroupMaxAssets?: number;

	/**
	 * Display all chunk groups with the corresponding bundles.
	 */
	chunkGroups?: boolean;

	/**
	 * Add built modules information to chunk information.
	 */
	chunkModules?: boolean;

	/**
	 * Space to display chunk modules (groups will be collapsed to fit this space, value is in number of modules/group).
	 */
	chunkModulesSpace?: number;

	/**
	 * Add the origins of chunks and chunk merging info.
	 */
	chunkOrigins?: boolean;

	/**
	 * Add information about parent, children and sibling chunks to chunk information.
	 */
	chunkRelations?: boolean;

	/**
	 * Add chunk information.
	 */
	chunks?: boolean;

	/**
	 * Sort the chunks by that field.
	 */
	chunksSort?: string;

	/**
	 * Enables/Disables colorful output.
	 */
	colors?:
		| boolean
		| {
				/**
				 * Custom color for bold text.
				 */
				bold?: string;
				/**
				 * Custom color for cyan text.
				 */
				cyan?: string;
				/**
				 * Custom color for green text.
				 */
				green?: string;
				/**
				 * Custom color for magenta text.
				 */
				magenta?: string;
				/**
				 * Custom color for red text.
				 */
				red?: string;
				/**
				 * Custom color for yellow text.
				 */
				yellow?: string;
		  };

	/**
	 * Context directory for request shortening.
	 */
	context?: string;

	/**
	 * Show chunk modules that are dependencies of other modules of the chunk.
	 */
	dependentModules?: boolean;

	/**
	 * Add module depth in module graph.
	 */
	depth?: boolean;

	/**
	 * Display the entry points with the corresponding bundles.
	 */
	entrypoints?: boolean | "auto";

	/**
	 * Add --env information.
	 */
	env?: boolean;

	/**
	 * Add details to errors (like resolving log).
	 */
	errorDetails?: boolean | "auto";

	/**
	 * Add internal stack trace to errors.
	 */
	errorStack?: boolean;

	/**
	 * Add errors.
	 */
	errors?: boolean;

	/**
	 * Add errors count.
	 */
	errorsCount?: boolean;

	/**
	 * Please use excludeModules instead.
	 */
	exclude?:
		| string
		| boolean
		| RegExp
		| ModuleFilterItemTypes[]
		| ((
				name: string,
				module: StatsModule,
				type: "module" | "chunk" | "root-of-chunk" | "nested"
		  ) => boolean);

	/**
	 * Suppress assets that match the specified filters. Filters can be Strings, RegExps or Functions.
	 */
	excludeAssets?:
		| string
		| RegExp
		| AssetFilterItemTypes[]
		| ((name: string, asset: StatsAsset) => boolean);

	/**
	 * Suppress modules that match the specified filters. Filters can be Strings, RegExps, Booleans or Functions.
	 */
	excludeModules?:
		| string
		| boolean
		| RegExp
		| ModuleFilterItemTypes[]
		| ((
				name: string,
				module: StatsModule,
				type: "module" | "chunk" | "root-of-chunk" | "nested"
		  ) => boolean);

	/**
	 * Group assets by how their are related to chunks.
	 */
	groupAssetsByChunk?: boolean;

	/**
	 * Group assets by their status (emitted, compared for emit or cached).
	 */
	groupAssetsByEmitStatus?: boolean;

	/**
	 * Group assets by their extension.
	 */
	groupAssetsByExtension?: boolean;

	/**
	 * Group assets by their asset info (immutable, development, hotModuleReplacement, etc).
	 */
	groupAssetsByInfo?: boolean;

	/**
	 * Group assets by their path.
	 */
	groupAssetsByPath?: boolean;

	/**
	 * Group modules by their attributes (errors, warnings, assets, optional, orphan, or dependent).
	 */
	groupModulesByAttributes?: boolean;

	/**
	 * Group modules by their status (cached or built and cacheable).
	 */
	groupModulesByCacheStatus?: boolean;

	/**
	 * Group modules by their extension.
	 */
	groupModulesByExtension?: boolean;

	/**
	 * Group modules by their layer.
	 */
	groupModulesByLayer?: boolean;

	/**
	 * Group modules by their path.
	 */
	groupModulesByPath?: boolean;

	/**
	 * Group modules by their type.
	 */
	groupModulesByType?: boolean;

	/**
	 * Group reasons by their origin module.
	 */
	groupReasonsByOrigin?: boolean;

	/**
	 * Add the hash of the compilation.
	 */
	hash?: boolean;

	/**
	 * Add ids.
	 */
	ids?: boolean;

	/**
	 * Add logging output.
	 */
	logging?: boolean | "none" | "error" | "warn" | "info" | "log" | "verbose";

	/**
	 * Include debug logging of specified loggers (i. e. for plugins or loaders). Filters can be Strings, RegExps or Functions.
	 */
	loggingDebug?:
		| string
		| boolean
		| RegExp
		| FilterItemTypes[]
		| ((value: string) => boolean);

	/**
	 * Add stack traces to logging output.
	 */
	loggingTrace?: boolean;

	/**
	 * Add information about assets inside modules.
	 */
	moduleAssets?: boolean;

	/**
	 * Add dependencies and origin of warnings/errors.
	 */
	moduleTrace?: boolean;

	/**
	 * Add built modules information.
	 */
	modules?: boolean;

	/**
	 * Sort the modules by that field.
	 */
	modulesSort?: string;

	/**
	 * Space to display modules (groups will be collapsed to fit this space, value is in number of modules/groups).
	 */
	modulesSpace?: number;

	/**
	 * Add information about modules nested in other modules (like with module concatenation).
	 */
	nestedModules?: boolean;

	/**
	 * Space to display modules nested within other modules (groups will be collapsed to fit this space, value is in number of modules/group).
	 */
	nestedModulesSpace?: number;

	/**
	 * Show reasons why optimization bailed out for modules.
	 */
	optimizationBailout?: boolean;

	/**
	 * Add information about orphan modules.
	 */
	orphanModules?: boolean;

	/**
	 * Add output path information.
	 */
	outputPath?: boolean;

	/**
	 * Add performance hint flags.
	 */
	performance?: boolean;

	/**
	 * Preset for the default values.
	 */
	preset?: string | boolean;

	/**
	 * Show exports provided by modules.
	 */
	providedExports?: boolean;

	/**
	 * Add public path information.
	 */
	publicPath?: boolean;

	/**
	 * Add information about the reasons why modules are included.
	 */
	reasons?: boolean;

	/**
	 * Space to display reasons (groups will be collapsed to fit this space).
	 */
	reasonsSpace?: number;

	/**
	 * Add information about assets that are related to other assets (like SourceMaps for assets).
	 */
	relatedAssets?: boolean;

	/**
	 * Add information about runtime modules (deprecated: use 'runtimeModules' instead).
	 */
	runtime?: boolean;

	/**
	 * Add information about runtime modules.
	 */
	runtimeModules?: boolean;

	/**
	 * Add the source code of modules.
	 */
	source?: boolean;

	/**
	 * Add timing information.
	 */
	timings?: boolean;

	/**
	 * Show exports used by modules.
	 */
	usedExports?: boolean;

	/**
	 * Add webpack version information.
	 */
	version?: boolean;

	/**
	 * Add warnings.
	 */
	warnings?: boolean;

	/**
	 * Add warnings count.
	 */
	warningsCount?: boolean;

	/**
	 * Suppress listing warnings that match the specified filters (they will still be counted). Filters can be Strings, RegExps or Functions.
	 */
	warningsFilter?:
		| string
		| RegExp
		| WarningFilterItemTypes[]
		| ((warning: StatsError, value: string) => boolean);
}
declare abstract class StatsPrinter {
	hooks: Readonly<{
		sortElements: HookMap<SyncBailHook<[string[], StatsPrinterContext], true>>;
		printElements: HookMap<
			SyncBailHook<[PrintedElement[], StatsPrinterContext], string>
		>;
		sortItems: HookMap<SyncBailHook<[any[], StatsPrinterContext], true>>;
		getItemName: HookMap<SyncBailHook<[any, StatsPrinterContext], string>>;
		printItems: HookMap<SyncBailHook<[string[], StatsPrinterContext], string>>;
		print: HookMap<SyncBailHook<[{}, StatsPrinterContext], string>>;
		result: HookMap<SyncWaterfallHook<[string, StatsPrinterContext]>>;
	}>;
	print(type: string, object: Object, baseContext?: Object): string;
}
type StatsPrinterContext = KnownStatsPrinterContext & Record<string, any>;
type StatsProfile = KnownStatsProfile & Record<string, any>;
type StatsValue =
	| boolean
	| StatsOptions
	| "none"
	| "verbose"
	| "summary"
	| "errors-only"
	| "errors-warnings"
	| "minimal"
	| "normal"
	| "detailed";
declare class SyncModuleIdsPlugin {
	constructor(__0: {
		/**
		 * path to file
		 */
		path: string;
		/**
		 * context for module names
		 */
		context?: string;
		/**
		 * selector for modules
		 */
		test: (arg0: Module) => boolean;
		/**
		 * operation mode (defaults to merge)
		 */
		mode?: "read" | "merge" | "create" | "update";
	});

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare interface SyntheticDependencyLocation {
	name: string;
	index?: number;
}
declare const TOMBSTONE: unique symbol;
declare const TRANSITIVE: unique symbol;
declare const TRANSITIVE_ONLY: unique symbol;
declare interface TagInfo {
	tag: any;
	data: any;
	next?: TagInfo;
}
declare class Template {
	constructor();
	static getFunctionContent(fn: Function): string;
	static toIdentifier(str: string): string;
	static toComment(str: string): string;
	static toNormalComment(str: string): string;
	static toPath(str: string): string;
	static numberToIdentifier(n: number): string;
	static numberToIdentifierContinuation(n: number): string;
	static indent(s: string | string[]): string;
	static prefix(s: string | string[], prefix: string): string;
	static asString(str: string | string[]): string;
	static getModulesArrayBounds(modules: WithId[]): false | [number, number];
	static renderChunkModules(
		renderContext: ChunkRenderContext,
		modules: Module[],
		renderModule: (arg0: Module) => Source,
		prefix?: string
	): Source;
	static renderRuntimeModules(
		runtimeModules: RuntimeModule[],
		renderContext: RenderContext & {
			codeGenerationResults?: CodeGenerationResults;
		}
	): Source;
	static renderChunkRuntimeModules(
		runtimeModules: RuntimeModule[],
		renderContext: RenderContext
	): Source;
	static NUMBER_OF_IDENTIFIER_START_CHARS: number;
	static NUMBER_OF_IDENTIFIER_CONTINUATION_CHARS: number;
}
declare interface TimestampAndHash {
	safeTime: number;
	timestamp?: number;
	hash: string;
}
declare class TopLevelSymbol {
	constructor(name: string);
	name: string;
}

/**
 * Use a Trusted Types policy to create urls for chunks.
 */
declare interface TrustedTypes {
	/**
	 * The name of the Trusted Types policy created by webpack to serve bundle chunks.
	 */
	policyName?: string;
}
declare const UNDEFINED_MARKER: unique symbol;
declare interface UpdateHashContextDependency {
	chunkGraph: ChunkGraph;
	runtime: RuntimeSpec;
	runtimeTemplate?: RuntimeTemplate;
}
declare interface UpdateHashContextGenerator {
	/**
	 * the module
	 */
	module: NormalModule;
	chunkGraph: ChunkGraph;
	runtime: RuntimeSpec;
	runtimeTemplate?: RuntimeTemplate;
}
type UsageStateType = 0 | 1 | 2 | 3 | 4;
declare interface UserResolveOptions {
	/**
	 * A list of module alias configurations or an object which maps key to value
	 */
	alias?: AliasOption[] | AliasOptions;

	/**
	 * A list of module alias configurations or an object which maps key to value, applied only after modules option
	 */
	fallback?: AliasOption[] | AliasOptions;

	/**
	 * An object which maps extension to extension aliases
	 */
	extensionAlias?: ExtensionAliasOptions;

	/**
	 * A list of alias fields in description files
	 */
	aliasFields?: (string | string[])[];

	/**
	 * A function which decides whether a request should be cached or not. An object is passed with at least `path` and `request` properties.
	 */
	cachePredicate?: (arg0: ResolveRequest) => boolean;

	/**
	 * Whether or not the unsafeCache should include request context as part of the cache key.
	 */
	cacheWithContext?: boolean;

	/**
	 * A list of description files to read from
	 */
	descriptionFiles?: string[];

	/**
	 * A list of exports field condition names.
	 */
	conditionNames?: string[];

	/**
	 * Enforce that a extension from extensions must be used
	 */
	enforceExtension?: boolean;

	/**
	 * A list of exports fields in description files
	 */
	exportsFields?: (string | string[])[];

	/**
	 * A list of imports fields in description files
	 */
	importsFields?: (string | string[])[];

	/**
	 * A list of extensions which should be tried for files
	 */
	extensions?: string[];

	/**
	 * The file system which should be used
	 */
	fileSystem: FileSystem;

	/**
	 * Use this cache object to unsafely cache the successful requests
	 */
	unsafeCache?: boolean | object;

	/**
	 * Resolve symlinks to their symlinked location
	 */
	symlinks?: boolean;

	/**
	 * A prepared Resolver to which the plugins are attached
	 */
	resolver?: Resolver;

	/**
	 * A list of directories to resolve modules from, can be absolute path or folder name
	 */
	modules?: string | string[];

	/**
	 * A list of main fields in description files
	 */
	mainFields?: (
		| string
		| string[]
		| { name: string | string[]; forceRelative: boolean }
	)[];

	/**
	 * A list of main files in directories
	 */
	mainFiles?: string[];

	/**
	 * A list of additional resolve plugins which should be applied
	 */
	plugins?: Plugin[];

	/**
	 * A PnP API that should be used - null is "never", undefined is "auto"
	 */
	pnpApi?: null | PnpApiImpl;

	/**
	 * A list of root paths
	 */
	roots?: string[];

	/**
	 * The request is already fully specified and no extensions or directories are resolved for it
	 */
	fullySpecified?: boolean;

	/**
	 * Resolve to a context instead of a file
	 */
	resolveToContext?: boolean;

	/**
	 * A list of resolve restrictions
	 */
	restrictions?: (string | RegExp)[];

	/**
	 * Use only the sync constraints of the file system calls
	 */
	useSyncFileSystemCalls?: boolean;

	/**
	 * Prefer to resolve module requests as relative requests before falling back to modules
	 */
	preferRelative?: boolean;

	/**
	 * Prefer to resolve server-relative urls as absolute paths before falling back to resolve in roots
	 */
	preferAbsolute?: boolean;
}
declare abstract class VariableInfo {
	declaredScope: ScopeInfo;
	freeName: string | true;
	tagInfo?: TagInfo;
}
declare interface VariableInfoInterface {
	declaredScope: ScopeInfo;
	freeName: string | true;
	tagInfo?: TagInfo;
}
type WarningFilterItemTypes =
	| string
	| RegExp
	| ((warning: StatsError, value: string) => boolean);
declare interface WatchFileSystem {
	watch: (
		files: Iterable<string>,
		directories: Iterable<string>,
		missing: Iterable<string>,
		startTime: number,
		options: WatchOptions,
		callback: (
			arg0: undefined | Error,
			arg1: Map<string, FileSystemInfoEntry | "ignore">,
			arg2: Map<string, FileSystemInfoEntry | "ignore">,
			arg3: Set<string>,
			arg4: Set<string>
		) => void,
		callbackUndelayed: (arg0: string, arg1: number) => void
	) => Watcher;
}
declare class WatchIgnorePlugin {
	constructor(options: WatchIgnorePluginOptions);
	paths: (string | RegExp)[];

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare interface WatchIgnorePluginOptions {
	/**
	 * A list of RegExps or absolute paths to directories or files that should be ignored.
	 */
	paths: (string | RegExp)[];
}

/**
 * Options for the watcher.
 */
declare interface WatchOptions {
	/**
	 * Delay the rebuilt after the first change. Value is a time in ms.
	 */
	aggregateTimeout?: number;

	/**
	 * Resolve symlinks and watch symlink and real file. This is usually not needed as webpack already resolves symlinks ('resolve.symlinks').
	 */
	followSymlinks?: boolean;

	/**
	 * Ignore some files from watching (glob pattern or regexp).
	 */
	ignored?: string | RegExp | string[];

	/**
	 * Enable polling mode for watching.
	 */
	poll?: number | boolean;

	/**
	 * Stop watching when stdin stream has ended.
	 */
	stdin?: boolean;
}
declare interface Watcher {
	/**
	 * closes the watcher and all underlying file watchers
	 */
	close: () => void;

	/**
	 * closes the watcher, but keeps underlying file watchers alive until the next watch call
	 */
	pause: () => void;

	/**
	 * get current aggregated changes that have not yet send to callback
	 */
	getAggregatedChanges?: () => Set<string>;

	/**
	 * get current aggregated removals that have not yet send to callback
	 */
	getAggregatedRemovals?: () => Set<string>;

	/**
	 * get info about files
	 */
	getFileTimeInfoEntries: () => Map<string, FileSystemInfoEntry | "ignore">;

	/**
	 * get info about directories
	 */
	getContextTimeInfoEntries: () => Map<string, FileSystemInfoEntry | "ignore">;

	/**
	 * get info about timestamps and changes
	 */
	getInfo?: () => WatcherInfo;
}
declare interface WatcherInfo {
	/**
	 * get current aggregated changes that have not yet send to callback
	 */
	changes: Set<string>;

	/**
	 * get current aggregated removals that have not yet send to callback
	 */
	removals: Set<string>;

	/**
	 * get info about files
	 */
	fileTimeInfoEntries: Map<string, FileSystemInfoEntry | "ignore">;

	/**
	 * get info about directories
	 */
	contextTimeInfoEntries: Map<string, FileSystemInfoEntry | "ignore">;
}
declare abstract class Watching {
	startTime: null | number;
	invalid: boolean;
	handler: CallbackFunction<Stats>;
	callbacks: CallbackFunction<void>[];
	closed: boolean;
	suspended: boolean;
	blocked: boolean;
	watchOptions: {
		/**
		 * Delay the rebuilt after the first change. Value is a time in ms.
		 */
		aggregateTimeout?: number;
		/**
		 * Resolve symlinks and watch symlink and real file. This is usually not needed as webpack already resolves symlinks ('resolve.symlinks').
		 */
		followSymlinks?: boolean;
		/**
		 * Ignore some files from watching (glob pattern or regexp).
		 */
		ignored?: string | RegExp | string[];
		/**
		 * Enable polling mode for watching.
		 */
		poll?: number | boolean;
		/**
		 * Stop watching when stdin stream has ended.
		 */
		stdin?: boolean;
	};
	compiler: Compiler;
	running: boolean;
	watcher?: null | Watcher;
	pausedWatcher?: null | Watcher;
	lastWatcherStartTime?: number;
	watch(
		files: Iterable<string>,
		dirs: Iterable<string>,
		missing: Iterable<string>
	): void;
	invalidate(callback?: CallbackFunction<void>): void;
	suspend(): void;
	resume(): void;
	close(callback: CallbackFunction<void>): void;
}
declare abstract class WeakTupleMap<T extends any[], V> {
	set(...args: [T, ...V[]]): void;
	has(...args: T): boolean;
	get(...args: T): V;
	provide(...args: [T, ...(() => V)[]]): V;
	delete(...args: T): void;
	clear(): void;
}
declare interface WebAssemblyRenderContext {
	/**
	 * the chunk
	 */
	chunk: Chunk;

	/**
	 * the dependency templates
	 */
	dependencyTemplates: DependencyTemplates;

	/**
	 * the runtime template
	 */
	runtimeTemplate: RuntimeTemplate;

	/**
	 * the module graph
	 */
	moduleGraph: ModuleGraph;

	/**
	 * the chunk graph
	 */
	chunkGraph: ChunkGraph;

	/**
	 * results of code generation
	 */
	codeGenerationResults: CodeGenerationResults;
}
declare class WebWorkerTemplatePlugin {
	constructor();

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare class WebpackError extends Error {
	/**
	 * Creates an instance of WebpackError.
	 */
	constructor(message?: string);
	details: any;
	module: Module;
	loc: DependencyLocation;
	hideStack: boolean;
	chunk: Chunk;
	file: string;
	serialize(__0: { write: any }): void;
	deserialize(__0: { read: any }): void;

	/**
	 * Create .stack property on a target object
	 */
	static captureStackTrace(
		targetObject: object,
		constructorOpt?: Function
	): void;

	/**
	 * Optional override for formatting stack traces
	 */
	static prepareStackTrace?: (
		err: Error,
		stackTraces: NodeJS.CallSite[]
	) => any;
	static stackTraceLimit: number;
}
declare abstract class WebpackLogger {
	getChildLogger: (arg0: string | (() => string)) => WebpackLogger;
	error(...args: any[]): void;
	warn(...args: any[]): void;
	info(...args: any[]): void;
	log(...args: any[]): void;
	debug(...args: any[]): void;
	assert(assertion: any, ...args: any[]): void;
	trace(): void;
	clear(): void;
	status(...args: any[]): void;
	group(...args: any[]): void;
	groupCollapsed(...args: any[]): void;
	groupEnd(...args: any[]): void;
	profile(label?: any): void;
	profileEnd(label?: any): void;
	time(label?: any): void;
	timeLog(label?: any): void;
	timeEnd(label?: any): void;
	timeAggregate(label?: any): void;
	timeAggregateEnd(label?: any): void;
}
declare class WebpackOptionsApply extends OptionsApply {
	constructor();
}
declare class WebpackOptionsDefaulter {
	constructor();
	process(options?: any): any;
}

/**
 * Normalized webpack options object.
 */
declare interface WebpackOptionsNormalized {
	/**
	 * Set the value of `require.amd` and `define.amd`. Or disable AMD support.
	 */
	amd?: false | { [index: string]: any };

	/**
	 * Report the first error as a hard error instead of tolerating it.
	 */
	bail?: boolean;

	/**
	 * Cache generated modules and chunks to improve performance for multiple incremental builds.
	 */
	cache: CacheOptionsNormalized;

	/**
	 * The base directory (absolute path!) for resolving the `entry` option. If `output.pathinfo` is set, the included pathinfo is shortened to this directory.
	 */
	context?: string;

	/**
	 * References to other configurations to depend on.
	 */
	dependencies?: string[];

	/**
	 * Options for the webpack-dev-server.
	 */
	devServer?: DevServer;

	/**
	 * A developer tool to enhance debugging (false | eval | [inline-|hidden-|eval-][nosources-][cheap-[module-]]source-map).
	 */
	devtool?: string | false;

	/**
	 * The entry point(s) of the compilation.
	 */
	entry: EntryNormalized;

	/**
	 * Enables/Disables experiments (experimental features with relax SemVer compatibility).
	 */
	experiments: ExperimentsNormalized;

	/**
	 * Specify dependencies that shouldn't be resolved by webpack, but should become dependencies of the resulting bundle. The kind of the dependency depends on `output.libraryTarget`.
	 */
	externals: Externals;

	/**
	 * Enable presets of externals for specific targets.
	 */
	externalsPresets: ExternalsPresets;

	/**
	 * Specifies the default type of externals ('amd*', 'umd*', 'system' and 'jsonp' depend on output.libraryTarget set to the same value).
	 */
	externalsType?:
		| "import"
		| "var"
		| "module"
		| "assign"
		| "this"
		| "window"
		| "self"
		| "global"
		| "commonjs"
		| "commonjs2"
		| "commonjs-module"
		| "commonjs-static"
		| "amd"
		| "amd-require"
		| "umd"
		| "umd2"
		| "jsonp"
		| "system"
		| "promise"
		| "script"
		| "node-commonjs";

	/**
	 * Ignore specific warnings.
	 */
	ignoreWarnings?: ((
		warning: WebpackError,
		compilation: Compilation
	) => boolean)[];

	/**
	 * Options for infrastructure level logging.
	 */
	infrastructureLogging: InfrastructureLogging;

	/**
	 * Custom values available in the loader context.
	 */
	loader?: Loader;

	/**
	 * Enable production optimizations or development hints.
	 */
	mode?: "none" | "development" | "production";

	/**
	 * Options affecting the normal modules (`NormalModuleFactory`).
	 */
	module: ModuleOptionsNormalized;

	/**
	 * Name of the configuration. Used when loading multiple configurations.
	 */
	name?: string;

	/**
	 * Include polyfills or mocks for various node stuff.
	 */
	node: NodeWebpackOptions;

	/**
	 * Enables/Disables integrated optimizations.
	 */
	optimization: Optimization;

	/**
	 * Normalized options affecting the output of the compilation. `output` options tell webpack how to write the compiled files to disk.
	 */
	output: OutputNormalized;

	/**
	 * The number of parallel processed modules in the compilation.
	 */
	parallelism?: number;

	/**
	 * Configuration for web performance recommendations.
	 */
	performance?: false | PerformanceOptions;

	/**
	 * Add additional plugins to the compiler.
	 */
	plugins: (
		| ((this: Compiler, compiler: Compiler) => void)
		| WebpackPluginInstance
	)[];

	/**
	 * Capture timing information for each module.
	 */
	profile?: boolean;

	/**
	 * Store compiler state to a json file.
	 */
	recordsInputPath?: string | false;

	/**
	 * Load compiler state from a json file.
	 */
	recordsOutputPath?: string | false;

	/**
	 * Options for the resolver.
	 */
	resolve: ResolveOptionsWebpackOptions;

	/**
	 * Options for the resolver when resolving loaders.
	 */
	resolveLoader: ResolveOptionsWebpackOptions;

	/**
	 * Options affecting how file system snapshots are created and validated.
	 */
	snapshot: SnapshotOptions;

	/**
	 * Stats options object or preset name.
	 */
	stats: StatsValue;

	/**
	 * Environment to build for. An array of environments to build for all of them when possible.
	 */
	target?: string | false | string[];

	/**
	 * Enter watch mode, which rebuilds on file change.
	 */
	watch?: boolean;

	/**
	 * Options for the watcher.
	 */
	watchOptions: WatchOptions;
}

/**
 * Plugin instance.
 */
declare interface WebpackPluginInstance {
	[index: string]: any;

	/**
	 * The run point of the plugin, required method.
	 */
	apply: (compiler: Compiler) => void;
}
declare interface WithId {
	id: string | number;
}
declare interface WithOptions {
	/**
	 * create a resolver with additional/different options
	 */
	withOptions: (
		arg0: Partial<ResolveOptionsWithDependencyType>
	) => ResolverWithOptions;
}
declare interface WriteOnlySet<T> {
	add: (T?: any) => void;
}
type __TypeWebpackOptions = (data: object) =>
	| string
	| {
			/**
			 * Unique loader options identifier.
			 */
			ident?: string;
			/**
			 * Loader name.
			 */
			loader?: string;
			/**
			 * Loader options.
			 */
			options?: string | { [index: string]: any };
	  }
	| __TypeWebpackOptions
	| RuleSetUseItem[];
declare function exports(
	options: Configuration,
	callback?: CallbackWebpack<Stats>
): Compiler;
declare function exports(
	options: ReadonlyArray<Configuration> & MultiCompilerOptions,
	callback?: CallbackWebpack<MultiStats>
): MultiCompiler;
declare namespace exports {
	export const webpack: {
		(options: Configuration, callback?: CallbackWebpack<Stats>): Compiler;
		(
			options: ReadonlyArray<Configuration> & MultiCompilerOptions,
			callback?: CallbackWebpack<MultiStats>
		): MultiCompiler;
	};
	export const validate: (options?: any) => void;
	export const validateSchema: (
		schema: Parameters<typeof validateFunction>[0],
		options: Parameters<typeof validateFunction>[1],
		validationConfiguration?: ValidationErrorConfiguration
	) => void;
	export const version: string;
	export namespace cli {
		export let getArguments: (schema?: any) => Record<string, Argument>;
		export let processArguments: (
			args: Record<string, Argument>,
			config: any,
			values: Record<
				string,
				| string
				| number
				| boolean
				| RegExp
				| (string | number | boolean | RegExp)[]
			>
		) => null | Problem[];
	}
	export namespace ModuleFilenameHelpers {
		export let ALL_LOADERS_RESOURCE: string;
		export let REGEXP_ALL_LOADERS_RESOURCE: RegExp;
		export let LOADERS_RESOURCE: string;
		export let REGEXP_LOADERS_RESOURCE: RegExp;
		export let RESOURCE: string;
		export let REGEXP_RESOURCE: RegExp;
		export let ABSOLUTE_RESOURCE_PATH: string;
		export let REGEXP_ABSOLUTE_RESOURCE_PATH: RegExp;
		export let RESOURCE_PATH: string;
		export let REGEXP_RESOURCE_PATH: RegExp;
		export let ALL_LOADERS: string;
		export let REGEXP_ALL_LOADERS: RegExp;
		export let LOADERS: string;
		export let REGEXP_LOADERS: RegExp;
		export let QUERY: string;
		export let REGEXP_QUERY: RegExp;
		export let ID: string;
		export let REGEXP_ID: RegExp;
		export let HASH: string;
		export let REGEXP_HASH: RegExp;
		export let NAMESPACE: string;
		export let REGEXP_NAMESPACE: RegExp;
		export let createFilename: (
			module: string | Module,
			options: any,
			__2: {
				/**
				 * requestShortener
				 */
				requestShortener: RequestShortener;
				/**
				 * chunk graph
				 */
				chunkGraph: ChunkGraph;
				/**
				 * the hash function to use
				 */
				hashFunction: string | typeof Hash;
			}
		) => string;
		export let replaceDuplicates: (
			array?: any,
			fn?: any,
			comparator?: any
		) => any;
		export let matchPart: (str?: any, test?: any) => any;
		export let matchObject: (obj?: any, str?: any) => boolean;
	}
	export namespace RuntimeGlobals {
		export let require: "__webpack_require__";
		export let requireScope: "__webpack_require__.*";
		export let exports: "__webpack_exports__";
		export let thisAsExports: "top-level-this-exports";
		export let returnExportsFromRuntime: "return-exports-from-runtime";
		export let module: "module";
		export let moduleId: "module.id";
		export let moduleLoaded: "module.loaded";
		export let publicPath: "__webpack_require__.p";
		export let entryModuleId: "__webpack_require__.s";
		export let moduleCache: "__webpack_require__.c";
		export let moduleFactories: "__webpack_require__.m";
		export let moduleFactoriesAddOnly: "__webpack_require__.m (add only)";
		export let ensureChunk: "__webpack_require__.e";
		export let ensureChunkHandlers: "__webpack_require__.f";
		export let ensureChunkIncludeEntries: "__webpack_require__.f (include entries)";
		export let prefetchChunk: "__webpack_require__.E";
		export let prefetchChunkHandlers: "__webpack_require__.F";
		export let preloadChunk: "__webpack_require__.G";
		export let preloadChunkHandlers: "__webpack_require__.H";
		export let definePropertyGetters: "__webpack_require__.d";
		export let makeNamespaceObject: "__webpack_require__.r";
		export let createFakeNamespaceObject: "__webpack_require__.t";
		export let compatGetDefaultExport: "__webpack_require__.n";
		export let harmonyModuleDecorator: "__webpack_require__.hmd";
		export let nodeModuleDecorator: "__webpack_require__.nmd";
		export let getFullHash: "__webpack_require__.h";
		export let wasmInstances: "__webpack_require__.w";
		export let instantiateWasm: "__webpack_require__.v";
		export let uncaughtErrorHandler: "__webpack_require__.oe";
		export let scriptNonce: "__webpack_require__.nc";
		export let loadScript: "__webpack_require__.l";
		export let createScript: "__webpack_require__.ts";
		export let createScriptUrl: "__webpack_require__.tu";
		export let getTrustedTypesPolicy: "__webpack_require__.tt";
		export let chunkName: "__webpack_require__.cn";
		export let runtimeId: "__webpack_require__.j";
		export let getChunkScriptFilename: "__webpack_require__.u";
		export let getChunkCssFilename: "__webpack_require__.k";
		export let hasCssModules: "has css modules";
		export let getChunkUpdateScriptFilename: "__webpack_require__.hu";
		export let getChunkUpdateCssFilename: "__webpack_require__.hk";
		export let startup: "__webpack_require__.x";
		export let startupNoDefault: "__webpack_require__.x (no default handler)";
		export let startupOnlyAfter: "__webpack_require__.x (only after)";
		export let startupOnlyBefore: "__webpack_require__.x (only before)";
		export let chunkCallback: "webpackChunk";
		export let startupEntrypoint: "__webpack_require__.X";
		export let onChunksLoaded: "__webpack_require__.O";
		export let externalInstallChunk: "__webpack_require__.C";
		export let interceptModuleExecution: "__webpack_require__.i";
		export let global: "__webpack_require__.g";
		export let shareScopeMap: "__webpack_require__.S";
		export let initializeSharing: "__webpack_require__.I";
		export let currentRemoteGetScope: "__webpack_require__.R";
		export let getUpdateManifestFilename: "__webpack_require__.hmrF";
		export let hmrDownloadManifest: "__webpack_require__.hmrM";
		export let hmrDownloadUpdateHandlers: "__webpack_require__.hmrC";
		export let hmrModuleData: "__webpack_require__.hmrD";
		export let hmrInvalidateModuleHandlers: "__webpack_require__.hmrI";
		export let hmrRuntimeStatePrefix: "__webpack_require__.hmrS";
		export let amdDefine: "__webpack_require__.amdD";
		export let amdOptions: "__webpack_require__.amdO";
		export let system: "__webpack_require__.System";
		export let hasOwnProperty: "__webpack_require__.o";
		export let systemContext: "__webpack_require__.y";
		export let baseURI: "__webpack_require__.b";
		export let relativeUrl: "__webpack_require__.U";
		export let asyncModule: "__webpack_require__.a";
	}
	export const UsageState: Readonly<{
		Unused: 0;
		OnlyPropertiesUsed: 1;
		NoInfo: 2;
		Unknown: 3;
		Used: 4;
	}>;
	export namespace cache {
		export { MemoryCachePlugin };
	}
	export namespace config {
		export const getNormalizedWebpackOptions: (
			config: Configuration
		) => WebpackOptionsNormalized;
		export const applyWebpackOptionsDefaults: (
			options: WebpackOptionsNormalized
		) => void;
	}
	export namespace dependencies {
		export {
			ModuleDependency,
			HarmonyImportDependency,
			ConstDependency,
			NullDependency
		};
	}
	export namespace ids {
		export {
			ChunkModuleIdRangePlugin,
			NaturalModuleIdsPlugin,
			OccurrenceModuleIdsPlugin,
			NamedModuleIdsPlugin,
			DeterministicChunkIdsPlugin,
			DeterministicModuleIdsPlugin,
			NamedChunkIdsPlugin,
			OccurrenceChunkIdsPlugin,
			HashedModuleIdsPlugin
		};
	}
	export namespace javascript {
		export {
			EnableChunkLoadingPlugin,
			JavascriptModulesPlugin,
			JavascriptParser
		};
	}
	export namespace optimize {
		export namespace InnerGraph {
			export let bailout: (parserState: ParserState) => void;
			export let enable: (parserState: ParserState) => void;
			export let isEnabled: (parserState: ParserState) => boolean;
			export let addUsage: (
				state: ParserState,
				symbol: null | TopLevelSymbol,
				usage: string | true | TopLevelSymbol
			) => void;
			export let addVariableUsage: (
				parser: JavascriptParser,
				name: string,
				usage: string | true | TopLevelSymbol
			) => void;
			export let inferDependencyUsage: (state: ParserState) => void;
			export let onUsage: (
				state: ParserState,
				onUsageCallback: (arg0?: boolean | Set<string>) => void
			) => void;
			export let setTopLevelSymbol: (
				state: ParserState,
				symbol: TopLevelSymbol
			) => void;
			export let getTopLevelSymbol: (
				state: ParserState
			) => void | TopLevelSymbol;
			export let tagTopLevelSymbol: (
				parser: JavascriptParser,
				name: string
			) => TopLevelSymbol;
			export let isDependencyUsedByExports: (
				dependency: Dependency,
				usedByExports: boolean | Set<string>,
				moduleGraph: ModuleGraph,
				runtime: RuntimeSpec
			) => boolean;
			export let getDependencyUsedByExportsCondition: (
				dependency: Dependency,
				usedByExports: boolean | Set<string>,
				moduleGraph: ModuleGraph
			) =>
				| null
				| false
				| ((arg0: ModuleGraphConnection, arg1: RuntimeSpec) => ConnectionState);
			export { TopLevelSymbol, topLevelSymbolTag };
		}
		export {
			AggressiveMergingPlugin,
			AggressiveSplittingPlugin,
			LimitChunkCountPlugin,
			MinChunkSizePlugin,
			ModuleConcatenationPlugin,
			RealContentHashPlugin,
			RuntimeChunkPlugin,
			SideEffectsFlagPlugin,
			SplitChunksPlugin
		};
	}
	export namespace runtime {
		export { GetChunkFilenameRuntimeModule, LoadScriptRuntimeModule };
	}
	export namespace prefetch {
		export { ChunkPrefetchPreloadPlugin };
	}
	export namespace web {
		export {
			FetchCompileAsyncWasmPlugin,
			FetchCompileWasmPlugin,
			JsonpChunkLoadingRuntimeModule,
			JsonpTemplatePlugin
		};
	}
	export namespace webworker {
		export { WebWorkerTemplatePlugin };
	}
	export namespace node {
		export {
			NodeEnvironmentPlugin,
			NodeSourcePlugin,
			NodeTargetPlugin,
			NodeTemplatePlugin,
			ReadFileCompileWasmPlugin
		};
	}
	export namespace electron {
		export { ElectronTargetPlugin };
	}
	export namespace wasm {
		export { AsyncWebAssemblyModulesPlugin, EnableWasmLoadingPlugin };
	}
	export namespace library {
		export { AbstractLibraryPlugin, EnableLibraryPlugin };
	}
	export namespace container {
		export const scope: <T>(
			scope: string,
			options: ContainerOptionsFormat<T>
		) => Record<string, string | string[] | T>;
		export {
			ContainerPlugin,
			ContainerReferencePlugin,
			ModuleFederationPlugin
		};
	}
	export namespace sharing {
		export const scope: <T>(
			scope: string,
			options: ContainerOptionsFormat<T>
		) => Record<string, string | string[] | T>;
		export { ConsumeSharedPlugin, ProvideSharedPlugin, SharePlugin };
	}
	export namespace debug {
		export { ProfilingPlugin };
	}
	export namespace util {
		export const createHash: (algorithm: string | typeof Hash) => Hash;
		export namespace comparators {
			export let compareChunksById: (a: Chunk, b: Chunk) => 0 | 1 | -1;
			export let compareModulesByIdentifier: (
				a: Module,
				b: Module
			) => 0 | 1 | -1;
			export let compareModulesById: ParameterizedComparator<
				ChunkGraph,
				Module
			>;
			export let compareNumbers: (a: number, b: number) => 0 | 1 | -1;
			export let compareStringsNumeric: (a: string, b: string) => 0 | 1 | -1;
			export let compareModulesByPostOrderIndexOrIdentifier: ParameterizedComparator<
				ModuleGraph,
				Module
			>;
			export let compareModulesByPreOrderIndexOrIdentifier: ParameterizedComparator<
				ModuleGraph,
				Module
			>;
			export let compareModulesByIdOrIdentifier: ParameterizedComparator<
				ChunkGraph,
				Module
			>;
			export let compareChunks: ParameterizedComparator<ChunkGraph, Chunk>;
			export let compareIds: (
				a: string | number,
				b: string | number
			) => 0 | 1 | -1;
			export let compareStrings: (a: string, b: string) => 0 | 1 | -1;
			export let compareChunkGroupsByIndex: (
				a: ChunkGroup,
				b: ChunkGroup
			) => 0 | 1 | -1;
			export let concatComparators: <T>(
				c1: Comparator<T>,
				c2: Comparator<T>,
				...cRest: Comparator<T>[]
			) => Comparator<T>;
			export let compareSelect: <T, R>(
				getter: Selector<T, R>,
				comparator: Comparator<R>
			) => Comparator<T>;
			export let compareIterables: <T>(
				elementComparator: Comparator<T>
			) => Comparator<Iterable<T>>;
			export let keepOriginalOrder: <T>(iterable: Iterable<T>) => Comparator<T>;
			export let compareChunksNatural: (
				chunkGraph: ChunkGraph
			) => Comparator<Chunk>;
			export let compareLocations: (
				a: DependencyLocation,
				b: DependencyLocation
			) => 0 | 1 | -1;
		}
		export namespace runtime {
			export let getEntryRuntime: (
				compilation: Compilation,
				name: string,
				options?: EntryOptions
			) => RuntimeSpec;
			export let forEachRuntime: (
				runtime: RuntimeSpec,
				fn: (arg0: string) => void,
				deterministicOrder?: boolean
			) => void;
			export let getRuntimeKey: (runtime: RuntimeSpec) => string;
			export let keyToRuntime: (key: string) => RuntimeSpec;
			export let runtimeToString: (runtime: RuntimeSpec) => string;
			export let runtimeConditionToString: (
				runtimeCondition: RuntimeCondition
			) => string;
			export let runtimeEqual: (a: RuntimeSpec, b: RuntimeSpec) => boolean;
			export let compareRuntime: (a: RuntimeSpec, b: RuntimeSpec) => 0 | 1 | -1;
			export let mergeRuntime: (a: RuntimeSpec, b: RuntimeSpec) => RuntimeSpec;
			export let mergeRuntimeCondition: (
				a: RuntimeCondition,
				b: RuntimeCondition,
				runtime: RuntimeSpec
			) => RuntimeCondition;
			export let mergeRuntimeConditionNonFalse: (
				a: undefined | string | true | SortableSet<string>,
				b: undefined | string | true | SortableSet<string>,
				runtime: RuntimeSpec
			) => undefined | string | true | SortableSet<string>;
			export let mergeRuntimeOwned: (
				a: RuntimeSpec,
				b: RuntimeSpec
			) => RuntimeSpec;
			export let intersectRuntime: (
				a: RuntimeSpec,
				b: RuntimeSpec
			) => RuntimeSpec;
			export let subtractRuntime: (
				a: RuntimeSpec,
				b: RuntimeSpec
			) => RuntimeSpec;
			export let subtractRuntimeCondition: (
				a: RuntimeCondition,
				b: RuntimeCondition,
				runtime: RuntimeSpec
			) => RuntimeCondition;
			export let filterRuntime: (
				runtime: RuntimeSpec,
				filter: (arg0: RuntimeSpec) => boolean
			) => undefined | string | boolean | SortableSet<string>;
			export { RuntimeSpecMap, RuntimeSpecSet };
		}
		export namespace serialization {
			export const register: (
				Constructor: Constructor,
				request: string,
				name: string,
				serializer: ObjectSerializer
			) => void;
			export const registerLoader: (
				regExp: RegExp,
				loader: (arg0: string) => boolean
			) => void;
			export const registerNotSerializable: (Constructor: Constructor) => void;
			export const NOT_SERIALIZABLE: object;
			export const buffersSerializer: Serializer;
			export let createFileSerializer: (
				fs?: any,
				hashFunction?: any
			) => Serializer;
			export { MEASURE_START_OPERATION, MEASURE_END_OPERATION };
		}
		export const cleverMerge: <T, O>(first: T, second: O) => T | O | (T & O);
		export { LazySet };
	}
	export namespace sources {
		export {
			Source,
			RawSource,
			OriginalSource,
			ReplaceSource,
			SourceMapSource,
			ConcatSource,
			PrefixSource,
			CachedSource,
			SizeOnlySource,
			CompatSource
		};
	}
	export namespace experiments {
		export namespace schemes {
			export { HttpUriPlugin };
		}
		export namespace ids {
			export { SyncModuleIdsPlugin };
		}
	}
	export type WebpackPluginFunction = (
		this: Compiler,
		compiler: Compiler
	) => void;
	export {
		AutomaticPrefetchPlugin,
		AsyncDependenciesBlock,
		BannerPlugin,
		Cache,
		Chunk,
		ChunkGraph,
		CleanPlugin,
		Compilation,
		Compiler,
		ConcatenationScope,
		ContextExclusionPlugin,
		ContextReplacementPlugin,
		DefinePlugin,
		DelegatedPlugin,
		Dependency,
		DllPlugin,
		DllReferencePlugin,
		DynamicEntryPlugin,
		EntryOptionPlugin,
		EntryPlugin,
		EnvironmentPlugin,
		EvalDevToolModulePlugin,
		EvalSourceMapDevToolPlugin,
		ExternalModule,
		ExternalsPlugin,
		Generator,
		HotUpdateChunk,
		HotModuleReplacementPlugin,
		IgnorePlugin,
		JavascriptModulesPlugin,
		LibManifestPlugin,
		LibraryTemplatePlugin,
		LoaderOptionsPlugin,
		LoaderTargetPlugin,
		Module,
		ModuleGraph,
		ModuleGraphConnection,
		NoEmitOnErrorsPlugin,
		NormalModule,
		NormalModuleReplacementPlugin,
		MultiCompiler,
		Parser,
		PrefetchPlugin,
		ProgressPlugin,
		ProvidePlugin,
		RuntimeModule,
		EntryPlugin as SingleEntryPlugin,
		SourceMapDevToolPlugin,
		Stats,
		Template,
		WatchIgnorePlugin,
		WebpackError,
		WebpackOptionsApply,
		WebpackOptionsDefaulter,
		ValidationError as WebpackOptionsValidationError,
		ValidationError,
		Entry,
		EntryNormalized,
		EntryObject,
		FileCacheOptions,
		LibraryOptions,
		ModuleOptions,
		ResolveOptionsWebpackOptions as ResolveOptions,
		RuleSetCondition,
		RuleSetConditionAbsolute,
		RuleSetRule,
		RuleSetUse,
		RuleSetUseItem,
		StatsOptions,
		Configuration,
		WebpackOptionsNormalized,
		WebpackPluginInstance,
		Asset,
		AssetInfo,
		EntryOptions,
		PathData,
		AssetEmittedInfo,
		MultiStats,
		ParserState,
		ResolvePluginInstance,
		Resolver,
		Watching,
		Argument,
		Problem,
		StatsAsset,
		StatsChunk,
		StatsChunkGroup,
		StatsChunkOrigin,
		StatsCompilation,
		StatsError,
		StatsLogging,
		StatsLoggingEntry,
		StatsModule,
		StatsModuleIssuer,
		StatsModuleReason,
		StatsModuleTraceDependency,
		StatsModuleTraceItem,
		StatsProfile,
		LoaderModule,
		RawLoaderDefinition,
		LoaderDefinition,
		LoaderDefinitionFunction,
		PitchLoaderDefinitionFunction,
		RawLoaderDefinitionFunction,
		LoaderContext
	};
}
declare const topLevelSymbolTag: unique symbol;

export = exports;
