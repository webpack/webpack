/*
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn special-lint-fix` to update
 */

import {
	ArrayExpression,
	ArrayPattern,
	ArrowFunctionExpression,
	AssignmentExpression,
	AssignmentPattern,
	AssignmentProperty,
	AwaitExpression,
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
	Program,
	Property,
	RegExpLiteral,
	RestElement,
	ReturnStatement,
	SequenceExpression,
	SimpleCallExpression,
	SimpleLiteral,
	SpreadElement,
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
import { Stats as FsStats, WriteStream } from "fs";
import { default as ValidationError } from "schema-utils/declarations/ValidationError";
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
	runtimeRequirements(
		chunk: Chunk,
		set: Set<string>,
		libraryContext: LibraryContext<T>
	): void;
	render(
		source: Source,
		renderContext: RenderContextObject,
		libraryContext: LibraryContext<T>
	): Source;
	chunkHash(
		chunk: Chunk,
		hash: Hash,
		chunkHashContext: ChunkHashContext,
		libraryContext: LibraryContext<T>
	): void;
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
type Amd = false | { [index: string]: any };
declare interface Argument {
	description: string;
	simpleType: "string" | "number" | "boolean";
	multiple: boolean;
	configs: ArgumentConfig[];
}
declare interface ArgumentConfig {
	description: string;
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
declare interface AssetInfo {
	/**
	 * true, if the asset can be long term cached forever (contains a hash)
	 */
	immutable?: boolean;

	/**
	 * the value(s) of the full hash used for this asset
	 */
	fullhash?: LibraryExport;

	/**
	 * the value(s) of the chunk hash used for this asset
	 */
	chunkhash?: LibraryExport;

	/**
	 * the value(s) of the module hash used for this asset
	 */
	modulehash?: LibraryExport;

	/**
	 * the value(s) of the content hash used for this asset
	 */
	contenthash?: LibraryExport;

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
	 * object of pointers to other assets, keyed by type of relation (only points from parent to child)
	 */
	related?: Record<string, LibraryExport>;
}
type AssetModuleFilename =
	| string
	| ((pathData: PathData, assetInfo: AssetInfo) => string);
declare abstract class AsyncDependenciesBlock extends DependenciesBlock {
	groupOptions: {
		preloadOrder?: number;
		prefetchOrder?: number;
		name?: string;
		entryOptions?: { name?: string } & Pick<
			EntryDescriptionNormalized,
			| "filename"
			| "chunkLoading"
			| "dependOn"
			| "library"
			| "runtime"
			| "wasmLoading"
		>;
	};
	loc: SyntheticDependencyLocation | RealDependencyLocation;
	request: string;
	parent: DependenciesBlock;
	chunkName: string;
	module: any;
}
declare abstract class AsyncQueue<T, K, R> {
	hooks: {
		beforeAdd: AsyncSeriesHook<[T]>;
		added: SyncHook<[T], void>;
		beforeStart: AsyncSeriesHook<[T]>;
		started: SyncHook<[T], void>;
		result: SyncHook<[T, Error, R], void>;
	};
	add(item: T, callback: CallbackFunction<R>): void;
	invalidate(item: T): void;
	stop(): void;
	increaseParallelism(): void;
	decreaseParallelism(): void;
	isProcessing(item: T): boolean;
	isQueued(item: T): boolean;
	isDone(item: T): boolean;
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
	exclude?: Rules;

	/**
	 * Include all modules matching any of these conditions.
	 */
	include?: Rules;

	/**
	 * If true, banner will not be wrapped in a comment.
	 */
	raw?: boolean;

	/**
	 * Include all modules that pass test assertion.
	 */
	test?: Rules;
}
declare interface BaseResolveRequest {
	path: DevTool;
	descriptionFilePath?: string;
	descriptionFileRoot?: string;
	descriptionFileData?: any;
	relativePath?: string;
	ignoreSymlinks?: boolean;
	fullySpecified?: boolean;
}
declare abstract class BasicEvaluatedExpression {
	type: number;
	range: [number, number];
	falsy: boolean;
	truthy: boolean;
	nullish: boolean;
	sideEffects: boolean;
	bool: boolean;
	number: number;
	bigint: bigint;
	regExp: RegExp;
	string: string;
	quasis: BasicEvaluatedExpression[];
	parts: BasicEvaluatedExpression[];
	array: any[];
	items: BasicEvaluatedExpression[];
	options: BasicEvaluatedExpression[];
	prefix: BasicEvaluatedExpression;
	postfix: BasicEvaluatedExpression;
	wrappedInnerExpressions: any;
	identifier: string;
	rootInfo: {
		declaredScope: ScopeInfo;
		freeName: string | true;
		tagInfo: TagInfo;
	};
	getMembers: () => string[];
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
	isPrimitiveType(): boolean;

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
	isNullish(): boolean;

	/**
	 * Can this expression have side effects?
	 */
	couldHaveSideEffects(): boolean;
	asBool(): any;
	asNullish(): boolean;
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
		getMembers?: any
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
				Etag,
				((result: any, callback: (arg0: Error) => void) => void)[]
			],
			any
		>;
		store: AsyncParallelHook<[string, Etag, any]>;
		storeBuildDependencies: AsyncParallelHook<[Iterable<string>]>;
		beginIdle: SyncHook<[], void>;
		endIdle: AsyncParallelHook<[]>;
		shutdown: AsyncParallelHook<[]>;
	};
	get<T>(identifier: string, etag: Etag, callback: CallbackCache<T>): void;
	store<T>(
		identifier: string,
		etag: Etag,
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
	getItemCache(identifier: string, etag: Etag): ItemCacheFacade;
	getLazyHashedEtag(obj: HashableObject): Etag;
	mergeEtags(a: Etag, b: Etag): Etag;
	get<T>(identifier: string, etag: Etag, callback: CallbackCache<T>): void;
	getPromise<T>(identifier: string, etag: Etag): Promise<T>;
	store<T>(
		identifier: string,
		etag: Etag,
		data: T,
		callback: CallbackCache<void>
	): void;
	storePromise<T>(identifier: string, etag: Etag, data: T): Promise<void>;
	provide<T>(
		identifier: string,
		etag: Etag,
		computer: (arg0: CallbackNormalErrorCache<T>) => void,
		callback: CallbackNormalErrorCache<T>
	): void;
	providePromise<T>(
		identifier: string,
		etag: Etag,
		computer: () => T | Promise<T>
	): Promise<T>;
}
declare interface CacheGroupSource {
	key?: string;
	priority?: number;
	getName?: (module?: Module, chunks?: Chunk[], key?: string) => string;
	chunksFilter?: (chunk: Chunk) => boolean;
	enforce?: boolean;
	minSize: Record<string, number>;
	minRemainingSize: Record<string, number>;
	enforceSizeThreshold: Record<string, number>;
	maxAsyncSize: Record<string, number>;
	maxInitialSize: Record<string, number>;
	minChunks?: number;
	maxAsyncRequests?: number;
	maxInitialRequests?: number;
	filename?: string | ((arg0: PathData, arg1: AssetInfo) => string);
	idHint?: string;
	automaticNameDelimiter: string;
	reuseExistingChunk?: boolean;
	usedExports?: boolean;
}
declare interface CacheGroupsContext {
	moduleGraph: ModuleGraph;
	chunkGraph: ChunkGraph;
}
type CacheOptions = boolean | MemoryCacheOptions | FileCacheOptions;
type CacheOptionsNormalized = false | MemoryCacheOptions | FileCacheOptions;
declare class CachedSource extends Source {
	constructor(source: Source);
	constructor(source: Source | (() => Source), cachedData?: any);
	original(): Source;
	originalLazy(): Source | (() => Source);
	getCachedData(): any;
}
type CallExpression = SimpleCallExpression | NewExpression;
declare interface CallbackCache<T> {
	(err?: WebpackError, result?: T): void;
}
declare interface CallbackFunction<T> {
	(err?: Error, result?: T): any;
}
declare interface CallbackNormalErrorCache<T> {
	(err?: Error, result?: T): void;
}
declare interface CallbackWebpack<T> {
	(err?: Error, stats?: T): void;
}
declare class Chunk {
	constructor(name?: string);
	id: string | number;
	ids: (string | number)[];
	debugId: number;
	name: string;
	idNameHints: SortableSet<string>;
	preventIntegration: boolean;
	filenameTemplate: string | ((arg0: PathData, arg1: AssetInfo) => string);
	runtime: string | SortableSet<string>;
	files: Set<string>;
	auxiliaryFiles: Set<string>;
	rendered: boolean;
	hash: string;
	contentHash: Record<string, string>;
	renderedHash: string;
	chunkReason: string;
	extraAsync: boolean;
	readonly entryModule: Module;
	hasEntryModule(): boolean;
	addModule(module: Module): boolean;
	removeModule(module: Module): void;
	getNumberOfModules(): number;
	readonly modulesIterable: Iterable<Module>;
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
	getEntryOptions(): { name?: string } & Pick<
		EntryDescriptionNormalized,
		| "filename"
		| "chunkLoading"
		| "dependOn"
		| "library"
		| "runtime"
		| "wasmLoading"
	>;
	addGroup(chunkGroup: ChunkGroup): void;
	removeGroup(chunkGroup: ChunkGroup): void;
	isInGroup(chunkGroup: ChunkGroup): boolean;
	getNumberOfGroups(): number;
	readonly groupsIterable: Iterable<ChunkGroup>;
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
	getChildIdsByOrdersMap(
		chunkGraph: ChunkGraph,
		includeDirectChildren?: boolean,
		filterFn?: (c: Chunk, chunkGraph: ChunkGraph) => boolean
	): Record<string | number, Record<string, (string | number)[]>>;
}
type ChunkFilename =
	| string
	| ((pathData: PathData, assetInfo: AssetInfo) => string);
declare class ChunkGraph {
	constructor(moduleGraph: ModuleGraph);
	moduleGraph: ModuleGraph;
	connectChunkAndModule(chunk: Chunk, module: Module): void;
	disconnectChunkAndModule(chunk: Chunk, module: Module): void;
	disconnectChunk(chunk: Chunk): void;
	attachModules(chunk: Chunk, modules: Iterable<Module>): void;
	attachRuntimeModules(chunk: Chunk, modules: Iterable<RuntimeModule>): void;
	attachFullHashModules(chunk: Chunk, modules: Iterable<RuntimeModule>): void;
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
	getChunkModulesIterable(chunk: Chunk): Iterable<Module>;
	getChunkModulesIterableBySourceType(
		chunk: Chunk,
		sourceType: string
	): Iterable<Module>;
	getOrderedChunkModulesIterable(
		chunk: Chunk,
		comparator: (arg0: Module, arg1: Module) => 0 | 1 | -1
	): Iterable<Module>;
	getOrderedChunkModulesIterableBySourceType(
		chunk: Chunk,
		sourceType: string,
		comparator: (arg0: Module, arg1: Module) => 0 | 1 | -1
	): Iterable<Module>;
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
	isEntryModuleInChunk(module: Module, chunk: Chunk): boolean;
	connectChunkAndEntryModule(
		chunk: Chunk,
		module: Module,
		entrypoint?: Entrypoint
	): void;
	connectChunkAndRuntimeModule(chunk: Chunk, module: RuntimeModule): void;
	addFullHashModuleToChunk(chunk: Chunk, module: RuntimeModule): void;
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
	getChunkFullHashModulesIterable(chunk: Chunk): Iterable<RuntimeModule>;
	getChunkEntryModulesWithChunkGroupIterable(
		chunk: Chunk
	): Iterable<[Module, Entrypoint]>;
	getBlockChunkGroup(depBlock: AsyncDependenciesBlock): ChunkGroup;
	connectBlockAndChunkGroup(
		depBlock: AsyncDependenciesBlock,
		chunkGroup: ChunkGroup
	): void;
	disconnectChunkGroup(chunkGroup: ChunkGroup): void;
	getModuleId(module: Module): string | number;
	setModuleId(module: Module, id: string | number): void;
	hasModuleHashes(
		module: Module,
		runtime: string | SortableSet<string>
	): boolean;
	getModuleHash(module: Module, runtime: string | SortableSet<string>): string;
	getRenderedModuleHash(
		module: Module,
		runtime: string | SortableSet<string>
	): string;
	setModuleHashes(
		module: Module,
		runtime: string | SortableSet<string>,
		hash: string,
		renderedHash: string
	): void;
	addModuleRuntimeRequirements(
		module: Module,
		runtime: string | SortableSet<string>,
		items: Set<string>
	): void;
	addChunkRuntimeRequirements(chunk: Chunk, items: Set<string>): void;
	addTreeRuntimeRequirements(chunk: Chunk, items: Iterable<string>): void;
	getModuleRuntimeRequirements(
		module: Module,
		runtime: string | SortableSet<string>
	): ReadonlySet<string>;
	getChunkRuntimeRequirements(chunk: Chunk): ReadonlySet<string>;
	getTreeRuntimeRequirements(chunk: Chunk): ReadonlySet<string>;
	static getChunkGraphForModule(
		module: Module,
		deprecateMessage: string,
		deprecationCode: string
	): ChunkGraph;
	static setChunkGraphForModule(module: Module, chunkGraph: ChunkGraph): void;
	static getChunkGraphForChunk(
		chunk: Chunk,
		deprecateMessage: string,
		deprecationCode: string
	): ChunkGraph;
	static setChunkGraphForChunk(chunk: Chunk, chunkGraph: ChunkGraph): void;
}
declare abstract class ChunkGroup {
	groupDebugId: number;
	options: { preloadOrder?: number; prefetchOrder?: number; name?: string };
	chunks: Chunk[];
	origins: {
		module: Module;
		loc: SyntheticDependencyLocation | RealDependencyLocation;
		request: string;
	}[];
	index: number;

	/**
	 * when a new chunk is added to a chunkGroup, addingOptions will occur.
	 */
	addOptions(options: {
		preloadOrder?: number;
		prefetchOrder?: number;
		name?: string;
	}): void;

	/**
	 * returns the name of current ChunkGroup
	 * sets a new name for current ChunkGroup
	 */
	name: string;

	/**
	 * get a uniqueId for ChunkGroup, made up of its member Chunk debugId's
	 */
	readonly debugId: string;

	/**
	 * get a unique id for ChunkGroup, made up of its member Chunk id's
	 */
	readonly id: string;

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
	readonly childrenIterable: SortableSet<ChunkGroup>;
	removeChild(group: ChunkGroup): boolean;
	addParent(parentChunk: ChunkGroup): boolean;
	getParents(): ChunkGroup[];
	getNumberOfParents(): number;
	hasParent(parent: ChunkGroup): boolean;
	readonly parentsIterable: SortableSet<ChunkGroup>;
	removeParent(chunkGroup: ChunkGroup): boolean;
	addAsyncEntrypoint(entrypoint: Entrypoint): boolean;
	readonly asyncEntrypointsIterable: SortableSet<ChunkGroup>;
	getBlocks(): any[];
	getNumberOfBlocks(): number;
	hasBlock(block?: any): boolean;
	readonly blocksIterable: Iterable<AsyncDependenciesBlock>;
	addBlock(block: AsyncDependenciesBlock): boolean;
	addOrigin(
		module: Module,
		loc: SyntheticDependencyLocation | RealDependencyLocation,
		request: string
	): void;
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
declare interface ChunkHashContext {
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
	readonly outputOptions: Output;
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
	runtime: string | SortableSet<string>;

	/**
	 * when in concatenated module, information about other concatenated modules
	 */
	concatenationScope?: ConcatenationScope;
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
}
declare abstract class CodeGenerationResults {
	map: Map<Module, RuntimeSpecMap<CodeGenerationResult>>;
	get(
		module: Module,
		runtime: string | SortableSet<string>
	): CodeGenerationResult;
	getSource(
		module: Module,
		runtime: string | SortableSet<string>,
		sourceType: string
	): Source;
	getRuntimeRequirements(
		module: Module,
		runtime: string | SortableSet<string>
	): ReadonlySet<string>;
	getData(
		module: Module,
		runtime: string | SortableSet<string>,
		key: string
	): any;
	add(
		module: Module,
		runtime: string | SortableSet<string>,
		result: CodeGenerationResult
	): void;
}
declare class CompatSource extends Source {
	constructor(sourceLike: SourceLike);
	static from(sourceLike: SourceLike): Source;
}
declare class Compilation {
	/**
	 * Creates an instance of Compilation.
	 */
	constructor(compiler: Compiler);
	hooks: Readonly<{
		buildModule: SyncHook<[Module], void>;
		rebuildModule: SyncHook<[Module], void>;
		failedModule: SyncHook<[Module, WebpackError], void>;
		succeedModule: SyncHook<[Module], void>;
		stillValidModule: SyncHook<[Module], void>;
		addEntry: SyncHook<
			[
				Dependency,
				{ name?: string } & Pick<
					EntryDescriptionNormalized,
					| "filename"
					| "chunkLoading"
					| "dependOn"
					| "library"
					| "runtime"
					| "wasmLoading"
				>
			],
			void
		>;
		failedEntry: SyncHook<
			[
				Dependency,
				{ name?: string } & Pick<
					EntryDescriptionNormalized,
					| "filename"
					| "chunkLoading"
					| "dependOn"
					| "library"
					| "runtime"
					| "wasmLoading"
				>,
				Error
			],
			void
		>;
		succeedEntry: SyncHook<
			[
				Dependency,
				{ name?: string } & Pick<
					EntryDescriptionNormalized,
					| "filename"
					| "chunkLoading"
					| "dependOn"
					| "library"
					| "runtime"
					| "wasmLoading"
				>,
				Module
			],
			void
		>;
		dependencyReferencedExports: SyncWaterfallHook<
			[
				(string[] | ReferencedExport)[],
				Dependency,
				string | SortableSet<string>
			]
		>;
		finishModules: AsyncSeriesHook<[Iterable<Module>]>;
		finishRebuildingModule: AsyncSeriesHook<[Module]>;
		unseal: SyncHook<[], void>;
		seal: SyncHook<[], void>;
		beforeChunks: SyncHook<[], void>;
		afterChunks: SyncHook<[Iterable<Chunk>], void>;
		optimizeDependencies: SyncBailHook<[Iterable<Module>], any>;
		afterOptimizeDependencies: SyncHook<[Iterable<Module>], void>;
		optimize: SyncHook<[], void>;
		optimizeModules: SyncBailHook<[Iterable<Module>], any>;
		afterOptimizeModules: SyncHook<[Iterable<Module>], void>;
		optimizeChunks: SyncBailHook<[Iterable<Chunk>, ChunkGroup[]], any>;
		afterOptimizeChunks: SyncHook<[Iterable<Chunk>, ChunkGroup[]], void>;
		optimizeTree: AsyncSeriesHook<[Iterable<Chunk>, Iterable<Module>]>;
		afterOptimizeTree: SyncHook<[Iterable<Chunk>, Iterable<Module>], void>;
		optimizeChunkModules: AsyncSeriesBailHook<
			[Iterable<Chunk>, Iterable<Module>],
			any
		>;
		afterOptimizeChunkModules: SyncHook<
			[Iterable<Chunk>, Iterable<Module>],
			void
		>;
		shouldRecord: SyncBailHook<[], boolean>;
		additionalChunkRuntimeRequirements: SyncHook<[Chunk, Set<string>], void>;
		runtimeRequirementInChunk: HookMap<SyncBailHook<[Chunk, Set<string>], any>>;
		additionalModuleRuntimeRequirements: SyncHook<[Module, Set<string>], void>;
		runtimeRequirementInModule: HookMap<
			SyncBailHook<[Module, Set<string>], any>
		>;
		additionalTreeRuntimeRequirements: SyncHook<[Chunk, Set<string>], void>;
		runtimeRequirementInTree: HookMap<SyncBailHook<[Chunk, Set<string>], any>>;
		runtimeModule: SyncHook<[RuntimeModule, Chunk], void>;
		reviveModules: SyncHook<[Iterable<Module>, any], void>;
		beforeModuleIds: SyncHook<[Iterable<Module>], void>;
		moduleIds: SyncHook<[Iterable<Module>], void>;
		optimizeModuleIds: SyncHook<[Iterable<Module>], void>;
		afterOptimizeModuleIds: SyncHook<[Iterable<Module>], void>;
		reviveChunks: SyncHook<[Iterable<Chunk>, any], void>;
		beforeChunkIds: SyncHook<[Iterable<Chunk>], void>;
		chunkIds: SyncHook<[Iterable<Chunk>], void>;
		optimizeChunkIds: SyncHook<[Iterable<Chunk>], void>;
		afterOptimizeChunkIds: SyncHook<[Iterable<Chunk>], void>;
		recordModules: SyncHook<[Iterable<Module>, any], void>;
		recordChunks: SyncHook<[Iterable<Chunk>, any], void>;
		optimizeCodeGeneration: SyncHook<[Iterable<Module>], void>;
		beforeModuleHash: SyncHook<[], void>;
		afterModuleHash: SyncHook<[], void>;
		beforeCodeGeneration: SyncHook<[], void>;
		afterCodeGeneration: SyncHook<[], void>;
		beforeRuntimeRequirements: SyncHook<[], void>;
		afterRuntimeRequirements: SyncHook<[], void>;
		beforeHash: SyncHook<[], void>;
		contentHash: SyncHook<[Chunk], void>;
		afterHash: SyncHook<[], void>;
		recordHash: SyncHook<[any], void>;
		record: SyncHook<[Compilation, any], void>;
		beforeModuleAssets: SyncHook<[], void>;
		shouldGenerateChunkAssets: SyncBailHook<[], boolean>;
		beforeChunkAssets: SyncHook<[], void>;
		additionalChunkAssets: Pick<
			AsyncSeriesHook<[Set<Chunk>]>,
			"tap" | "tapAsync" | "tapPromise" | "name"
		> &
			FakeHookMarker;
		additionalAssets: Pick<
			AsyncSeriesHook<[]>,
			"tap" | "tapAsync" | "tapPromise" | "name"
		> &
			FakeHookMarker;
		optimizeChunkAssets: Pick<
			AsyncSeriesHook<[Set<Chunk>]>,
			"tap" | "tapAsync" | "tapPromise" | "name"
		> &
			FakeHookMarker;
		afterOptimizeChunkAssets: Pick<
			AsyncSeriesHook<[Set<Chunk>]>,
			"tap" | "tapAsync" | "tapPromise" | "name"
		> &
			FakeHookMarker;
		optimizeAssets: AsyncSeriesHook<[Record<string, Source>]>;
		afterOptimizeAssets: SyncHook<[Record<string, Source>], void>;
		processAssets: AsyncSeriesHook<[Record<string, Source>]>;
		afterProcessAssets: SyncHook<[Record<string, Source>], void>;
		needAdditionalSeal: SyncBailHook<[], boolean>;
		afterSeal: AsyncSeriesHook<[]>;
		renderManifest: SyncWaterfallHook<
			[
				(RenderManifestEntryTemplated | RenderManifestEntryStatic)[],
				RenderManifestOptions
			]
		>;
		fullHash: SyncHook<[Hash], void>;
		chunkHash: SyncHook<[Chunk, Hash, ChunkHashContext], void>;
		moduleAsset: SyncHook<[Module, string], void>;
		chunkAsset: SyncHook<[Chunk, string], void>;
		assetPath: SyncWaterfallHook<[string, any, AssetInfo]>;
		needAdditionalPass: SyncBailHook<[], boolean>;
		childCompiler: SyncHook<[Compiler, string, number], void>;
		log: SyncBailHook<[string, LogEntry], true>;
		processWarnings: SyncWaterfallHook<[WebpackError[]]>;
		processErrors: SyncWaterfallHook<[WebpackError[]]>;
		statsPreset: HookMap<SyncHook<[any, any], void>>;
		statsNormalize: SyncHook<[any, any], void>;
		statsFactory: SyncHook<[StatsFactory, any], void>;
		statsPrinter: SyncHook<[StatsPrinter, any], void>;
		readonly normalModuleLoader: SyncHook<[any, NormalModule], void>;
	}>;
	name: string;
	startTime: any;
	endTime: any;
	compiler: Compiler;
	resolverFactory: ResolverFactory;
	inputFileSystem: InputFileSystem;
	fileSystemInfo: FileSystemInfo;
	requestShortener: RequestShortener;
	compilerPath: string;
	logger: WebpackLogger;
	options: WebpackOptionsNormalized;
	outputOptions: OutputNormalized;
	bail: boolean;
	profile: boolean;
	mainTemplate: MainTemplate;
	chunkTemplate: ChunkTemplate;
	runtimeTemplate: RuntimeTemplate;
	moduleTemplates: { javascript: ModuleTemplate };
	moduleGraph: ModuleGraph;
	chunkGraph: ChunkGraph;
	codeGenerationResults: CodeGenerationResults;
	factorizeQueue: AsyncQueue<FactorizeModuleOptions, string, Module>;
	addModuleQueue: AsyncQueue<Module, string, Module>;
	buildQueue: AsyncQueue<Module, Module, Module>;
	rebuildQueue: AsyncQueue<Module, Module, Module>;
	processDependenciesQueue: AsyncQueue<Module, Module, Module>;

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
	assets: Record<string, Source>;
	assetsInfo: Map<string, AssetInfo>;
	errors: WebpackError[];
	warnings: WebpackError[];
	children: Compilation[];
	logging: Map<string, LogEntry[]>;
	dependencyFactories: Map<{ new (...args: any[]): Dependency }, ModuleFactory>;
	dependencyTemplates: DependencyTemplates;
	childrenCounters: {};
	usedChunkIds: Set<string | number>;
	usedModuleIds: Set<number>;
	needAdditionalPass: boolean;
	builtModules: WeakSet<Module>;
	codeGeneratedModules: WeakSet<Module>;
	emittedAssets: Set<string>;
	comparedForEmitAssets: Set<string>;
	fileDependencies: LazySet<string>;
	contextDependencies: LazySet<string>;
	missingDependencies: LazySet<string>;
	buildDependencies: LazySet<string>;
	compilationDependencies: { add: (item?: any) => LazySet<string> };
	getStats(): Stats;
	createStatsOptions(optionsOrPreset?: any, context?: {}): {};
	createStatsFactory(options?: any): StatsFactory;
	createStatsPrinter(options?: any): StatsPrinter;
	getCache(name: string): CacheFacade;
	getLogger(name: string | (() => string)): WebpackLogger;
	addModule(
		module: Module,
		callback: (err?: WebpackError, result?: Module) => void
	): void;

	/**
	 * Fetches a module from a compilation by its identifier
	 */
	getModule(module: Module): Module;

	/**
	 * Attempts to search for a module by its identifier
	 */
	findModule(identifier: string): Module;

	/**
	 * Schedules a build of the module object
	 */
	buildModule(
		module: Module,
		callback: (err?: WebpackError, result?: Module) => void
	): void;
	processModuleDependencies(
		module: Module,
		callback: (err?: WebpackError, result?: Module) => void
	): void;
	processModuleDependenciesNonRecursive(module: Module): void;
	handleModuleCreation(
		__0: HandleModuleCreationOptions,
		callback: (err?: WebpackError, result?: Module) => void
	): void;
	factorizeModule(
		options: FactorizeModuleOptions,
		callback: (err?: WebpackError, result?: Module) => void
	): void;
	addModuleChain(
		context: string,
		dependency: Dependency,
		callback: (err?: WebpackError, result?: Module) => void
	): void;
	addEntry(
		context: string,
		entry: Dependency,
		optionsOrName:
			| string
			| ({ name?: string } & Pick<
					EntryDescriptionNormalized,
					| "filename"
					| "chunkLoading"
					| "dependOn"
					| "library"
					| "runtime"
					| "wasmLoading"
			  >),
		callback: (err?: WebpackError, result?: Module) => void
	): void;
	addInclude(
		context: string,
		dependency: Dependency,
		options: { name?: string } & Pick<
			EntryDescriptionNormalized,
			| "filename"
			| "chunkLoading"
			| "dependOn"
			| "library"
			| "runtime"
			| "wasmLoading"
		>,
		callback: (err?: WebpackError, result?: Module) => void
	): void;
	rebuildModule(
		module: Module,
		callback: (err?: WebpackError, result?: Module) => void
	): void;
	finish(callback?: any): void;
	unseal(): void;
	seal(callback: (err?: WebpackError) => void): void;
	reportDependencyErrorsAndWarnings(
		module: Module,
		blocks: DependenciesBlock[]
	): void;
	codeGeneration(callback?: any): void;
	processRuntimeRequirements(): void;
	addRuntimeModule(chunk: Chunk, module: RuntimeModule): void;
	addChunkInGroup(
		groupOptions:
			| string
			| { preloadOrder?: number; prefetchOrder?: number; name?: string },
		module: Module,
		loc: SyntheticDependencyLocation | RealDependencyLocation,
		request: string
	): ChunkGroup;
	addAsyncEntrypoint(
		options: { name?: string } & Pick<
			EntryDescriptionNormalized,
			| "filename"
			| "chunkLoading"
			| "dependOn"
			| "library"
			| "runtime"
			| "wasmLoading"
		>,
		module: Module,
		loc: SyntheticDependencyLocation | RealDependencyLocation,
		request: string
	): Entrypoint;

	/**
	 * This method first looks to see if a name is provided for a new chunk,
	 * and first looks to see if any named chunks already exist and reuse that chunk instead.
	 */
	addChunk(name?: string): Chunk;
	assignDepth(module: Module): void;
	getDependencyReferencedExports(
		dependency: Dependency,
		runtime: string | SortableSet<string>
	): (string[] | ReferencedExport)[];
	removeReasonsOfDependencyBlock(
		module: Module,
		block: DependenciesBlockLike
	): void;
	patchChunksAfterReasonRemoval(module: Module, chunk: Chunk): void;
	removeChunkFromDependencies(block: DependenciesBlock, chunk: Chunk): void;
	sortItemsWithChunkIds(): void;
	summarizeDependencies(): void;
	createModuleHashes(): void;
	createHash(): void;
	fullHash: string;
	hash: string;
	emitAsset(file: string, source: Source, assetInfo?: AssetInfo): void;
	updateAsset(
		file: string,
		newSourceOrFunction: Source | ((arg0: Source) => Source),
		assetInfoUpdateOrFunction?: AssetInfo | ((arg0: AssetInfo) => AssetInfo)
	): void;
	renameAsset(file?: any, newFile?: any): void;
	deleteAsset(file: string): void;
	getAssets(): Readonly<Asset>[];
	getAsset(name: string): Readonly<Asset>;
	clearAssets(): void;
	createModuleAssets(): void;
	getRenderManifest(
		options: RenderManifestOptions
	): (RenderManifestEntryTemplated | RenderManifestEntryStatic)[];
	createChunkAssets(callback: (err?: WebpackError) => void): void;
	getPath(
		filename: string | ((arg0: PathData, arg1: AssetInfo) => string),
		data?: PathData
	): string;
	getPathWithInfo(
		filename: string | ((arg0: PathData, arg1: AssetInfo) => string),
		data?: PathData
	): { path: string; info: AssetInfo };
	getAssetPath(
		filename: string | ((arg0: PathData, arg1: AssetInfo) => string),
		data: PathData
	): string;
	getAssetPathWithInfo(
		filename: string | ((arg0: PathData, arg1: AssetInfo) => string),
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
		outputOptions: OutputNormalized,
		plugins: Plugin[]
	): Compiler;
	checkConstraints(): void;

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
	 * Summarize the list of existing assets.
	 * When creating new assets from this they should be fully optimized.
	 * e. g. creating an assets manifest of Service Workers.
	 */
	static PROCESS_ASSETS_STAGE_SUMMARIZE: number;

	/**
	 * Add development tooling to assets, e. g. by extracting a SourceMap.
	 */
	static PROCESS_ASSETS_STAGE_DEV_TOOLING: number;

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
declare interface CompilationHooksAsyncWebAssemblyModulesPlugin {
	renderModuleContent: SyncWaterfallHook<[Source, Module, RenderContextObject]>;
}
declare interface CompilationHooksJavascriptModulesPlugin {
	renderModuleContent: SyncWaterfallHook<[Source, Module, RenderContextObject]>;
	renderModuleContainer: SyncWaterfallHook<
		[Source, Module, RenderContextObject]
	>;
	renderModulePackage: SyncWaterfallHook<[Source, Module, RenderContextObject]>;
	renderChunk: SyncWaterfallHook<[Source, RenderContextObject]>;
	renderMain: SyncWaterfallHook<[Source, RenderContextObject]>;
	render: SyncWaterfallHook<[Source, RenderContextObject]>;
	renderRequire: SyncWaterfallHook<[string, RenderBootstrapContext]>;
	chunkHash: SyncHook<[Chunk, Hash, ChunkHashContext], void>;
}
declare interface CompilationParams {
	normalModuleFactory: NormalModuleFactory;
	contextModuleFactory: ContextModuleFactory;
}
declare class Compiler {
	constructor(context: string);
	hooks: Readonly<{
		initialize: SyncHook<[], void>;
		shouldEmit: SyncBailHook<[Compilation], boolean>;
		done: AsyncSeriesHook<[Stats]>;
		afterDone: SyncHook<[Stats], void>;
		additionalPass: AsyncSeriesHook<[]>;
		beforeRun: AsyncSeriesHook<[Compiler]>;
		run: AsyncSeriesHook<[Compiler]>;
		emit: AsyncSeriesHook<[Compilation]>;
		assetEmitted: AsyncSeriesHook<[string, AssetEmittedInfo]>;
		afterEmit: AsyncSeriesHook<[Compilation]>;
		thisCompilation: SyncHook<[Compilation, CompilationParams], void>;
		compilation: SyncHook<[Compilation, CompilationParams], void>;
		normalModuleFactory: SyncHook<[NormalModuleFactory], void>;
		contextModuleFactory: SyncHook<[ContextModuleFactory], void>;
		beforeCompile: AsyncSeriesHook<[CompilationParams]>;
		compile: SyncHook<[CompilationParams], void>;
		make: AsyncParallelHook<[Compilation]>;
		finishMake: AsyncParallelHook<[Compilation]>;
		afterCompile: AsyncSeriesHook<[Compilation]>;
		watchRun: AsyncSeriesHook<[Compiler]>;
		failed: SyncHook<[Error], void>;
		invalid: SyncHook<[string, number], void>;
		watchClose: SyncHook<[], void>;
		infrastructureLog: SyncBailHook<[string, string, any[]], true>;
		environment: SyncHook<[], void>;
		afterEnvironment: SyncHook<[], void>;
		afterPlugins: SyncHook<[Compiler], void>;
		afterResolvers: SyncHook<[Compiler], void>;
		entryOption: SyncBailHook<[string, EntryNormalized], boolean>;
	}>;
	webpack: typeof exports;
	name: string;
	parentCompilation: Compilation;
	root: Compiler;
	outputPath: string;
	watching: Watching;
	outputFileSystem: OutputFileSystem;
	intermediateFileSystem: InputFileSystem &
		OutputFileSystem &
		IntermediateFileSystemExtras;
	inputFileSystem: InputFileSystem;
	watchFileSystem: WatchFileSystem;
	recordsInputPath: string;
	recordsOutputPath: string;
	records: {};
	managedPaths: Set<string>;
	immutablePaths: Set<string>;
	modifiedFiles: Set<string>;
	removedFiles: Set<string>;
	fileTimestamps: Map<string, FileSystemInfoEntry>;
	contextTimestamps: Map<string, FileSystemInfoEntry>;
	resolverFactory: ResolverFactory;
	infrastructureLogger: any;
	options: WebpackOptionsNormalized;
	context: string;
	requestShortener: RequestShortener;
	cache: Cache;
	compilerPath: string;
	running: boolean;
	idle: boolean;
	watchMode: boolean;
	getCache(name: string): CacheFacade;
	getInfrastructureLogger(name: string | (() => string)): WebpackLogger;
	watch(watchOptions: WatchOptions, handler: CallbackFunction<Stats>): Watching;
	run(callback: CallbackFunction<Stats>): void;
	runAsChild(
		callback: (err?: Error, entries?: Chunk[], compilation?: Compilation) => any
	): void;
	purgeInputFileSystem(): void;
	emitAssets(compilation: Compilation, callback: CallbackFunction<void>): void;
	emitRecords(callback: CallbackFunction<void>): void;
	readRecords(callback: CallbackFunction<void>): void;
	createChildCompiler(
		compilation: Compilation,
		compilerName: string,
		compilerIndex: number,
		outputOptions: OutputNormalized,
		plugins: WebpackPluginInstance[]
	): Compiler;
	isChild(): boolean;
	createCompilation(): Compilation;
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
		modulesWithInfo: (ConcatenatedModuleInfo | ExternalModuleInfo)[],
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
	): {
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
		asiSafe: boolean;
		index: number;
	};
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
	amd?: Amd;

	/**
	 * Report the first error as a hard error instead of tolerating it.
	 */
	bail?: boolean;

	/**
	 * Cache generated modules and chunks to improve performance for multiple incremental builds.
	 */
	cache?: CacheOptions;

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
	devtool?: DevTool;

	/**
	 * The entry point(s) of the compilation.
	 */
	entry?: Entry;

	/**
	 * Enables/Disables experiments (experimental features with relax SemVer compatibility).
	 */
	experiments?: Experiments;

	/**
	 * Specify dependencies that shouldn't be resolved by webpack, but should become dependencies of the resulting bundle. The kind of the dependency depends on `output.libraryTarget`.
	 */
	externals?: Externals;

	/**
	 * Enable presets of externals for specific targets.
	 */
	externalsPresets?: ExternalsPresets;

	/**
	 * Specifies the default type of externals ('amd*', 'umd*', 'system' and 'jsonp' depend on output.libraryTarget set to the same value).
	 */
	externalsType?: ExternalsType;

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
	mode?: Mode;

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
	node?: NodeWebpackOptions;

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
	performance?: Performance;

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
	recordsInputPath?: DevTool;

	/**
	 * Load compiler state from a json file.
	 */
	recordsOutputPath?: DevTool;

	/**
	 * Store/Load compiler state from/to a json file. This will result in persistent ids of modules and chunks. An absolute path is expected. `recordsPath` is used for `recordsInputPath` and `recordsOutputPath` if they left undefined.
	 */
	recordsPath?: DevTool;

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
	stats?: StatsValue;

	/**
	 * Environment to build for. An array of environments to build for all of them when possible.
	 */
	target?: Target;

	/**
	 * Enter watch mode, which rebuilds on file change.
	 */
	watch?: boolean;

	/**
	 * Options for the watcher.
	 */
	watchOptions?: WatchOptions;
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
	import?: DevTool;

	/**
	 * Package name to determine required version from description file. This is only needed when package name can't be automatically determined from request.
	 */
	packageName?: string;

	/**
	 * Version requirement from module in share scope.
	 */
	requiredVersion?: DevTool;

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
	referencedExports: any;
}
declare class ContextExclusionPlugin {
	constructor(negativeMatcher: RegExp);
	negativeMatcher: RegExp;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare abstract class ContextModuleFactory extends ModuleFactory {
	hooks: Readonly<{
		beforeResolve: AsyncSeriesWaterfallHook<[any]>;
		afterResolve: AsyncSeriesWaterfallHook<[any]>;
		contextModuleFiles: SyncWaterfallHook<[string[]]>;
		alternatives: Pick<
			AsyncSeriesWaterfallHook<[any[]]>,
			"tap" | "tapAsync" | "tapPromise" | "name"
		> &
			FakeHookMarker;
		alternativeRequests: AsyncSeriesWaterfallHook<
			[
				any[],
				{
					mode: "sync" | "eager" | "weak" | "async-weak" | "lazy" | "lazy-once";
					recursive: boolean;
					regExp: RegExp;
					namespaceObject?: boolean | "strict";
					addon?: string;
					chunkName?: string;
					include?: RegExp;
					exclude?: RegExp;
					groupOptions?: RawChunkGroupOptions;
					category?: string;
					/**
					 * exports referenced from modules (won't be mangled)
					 */
					referencedExports?: string[][];
					resource: string;
					resourceQuery?: string;
					resourceFragment?: string;
					resolveOptions: any;
				}
			]
		>;
	}>;
	resolverFactory: ResolverFactory;
	resolveDependencies(
		fs: InputFileSystem,
		options: {
			mode: "sync" | "eager" | "weak" | "async-weak" | "lazy" | "lazy-once";
			recursive: boolean;
			regExp: RegExp;
			namespaceObject?: boolean | "strict";
			addon?: string;
			chunkName?: string;
			include?: RegExp;
			exclude?: RegExp;
			groupOptions?: RawChunkGroupOptions;
			category?: string;
			/**
			 * exports referenced from modules (won't be mangled)
			 */
			referencedExports?: string[][];
			resource: string;
			resourceQuery?: string;
			resourceFragment?: string;
			resolveOptions: any;
		},
		callback: (err?: Error, dependencies?: ContextElementDependency[]) => any
	): void;
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
type CrossOriginLoading = false | "anonymous" | "use-credentials";
type Declaration = FunctionDeclaration | VariableDeclaration | ClassDeclaration;
declare class DefinePlugin {
	/**
	 * Create a new define plugin
	 */
	constructor(definitions: Record<string, RecursiveArrayOrRecord>);
	definitions: Record<string, RecursiveArrayOrRecord>;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
	static runtimeValue(fn?: any, fileDependencies?: any): RuntimeValue;
}
declare class DelegatedPlugin {
	constructor(options?: any);
	options: any;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare abstract class DependenciesBlock {
	dependencies: Dependency[];
	blocks: AsyncDependenciesBlock[];

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
	loc: SyntheticDependencyLocation | RealDependencyLocation;
	readonly type: string;
	readonly category: string;
	getResourceIdentifier(): string;

	/**
	 * Returns the referenced module and export
	 */
	getReference(moduleGraph: ModuleGraph): never;

	/**
	 * Returns list of exports referenced by this dependency
	 */
	getReferencedExports(
		moduleGraph: ModuleGraph,
		runtime: string | SortableSet<string>
	): (string[] | ReferencedExport)[];
	getCondition(
		moduleGraph: ModuleGraph
	): (
		arg0: ModuleGraphConnection,
		arg1: string | SortableSet<string>
	) => boolean | typeof TRANSITIVE_ONLY | typeof CIRCULAR_CONNECTION;

	/**
	 * Returns the exported names
	 */
	getExports(moduleGraph: ModuleGraph): ExportsSpec;

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
	): boolean | typeof TRANSITIVE_ONLY | typeof CIRCULAR_CONNECTION;
	serialize(__0: { write: any }): void;
	deserialize(__0: { read: any }): void;
	module: any;
	readonly disconnect: any;
	static NO_EXPORTS_REFERENCED: any[];
	static EXPORTS_OBJECT_REFERENCED: any[][];
}
declare abstract class DependencyTemplate {
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
	runtime: string | SortableSet<string>;

	/**
	 * mutable array of init fragments for the current module
	 */
	initFragments: InitFragment[];

	/**
	 * when in a concatenated module, information about other concatenated modules
	 */
	concatenationScope?: ConcatenationScope;
}
declare abstract class DependencyTemplates {
	get(dependency: { new (...args: any[]): Dependency }): DependencyTemplate;
	set(
		dependency: { new (...args: any[]): Dependency },
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
	constructor(options?: any);
	options: any;

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
type DevTool = string | false;
type DevtoolFallbackModuleFilenameTemplate = string | Function;
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
			sourceType?: DllReferencePluginOptionsSourceType;
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
			sourceType?: DllReferencePluginOptionsSourceType;
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
	type?: DllReferencePluginOptionsSourceType;
}
type DllReferencePluginOptionsSourceType =
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
type Entry =
	| string
	| (() => string | EntryObject | [string, ...string[]] | Promise<EntryStatic>)
	| EntryObject
	| [string, ...string[]];
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
	options: { name?: string } & Pick<
		EntryDescriptionNormalized,
		| "filename"
		| "chunkLoading"
		| "dependOn"
		| "library"
		| "runtime"
		| "wasmLoading"
	>;
}
declare abstract class EntryDependency extends ModuleDependency {}

/**
 * An object with entry point description.
 */
declare interface EntryDescription {
	/**
	 * The method of loading chunks (methods included by default are 'jsonp' (web), 'importScripts' (WebWorker), 'require' (sync node.js), 'async-node' (async node.js), but others might be added by plugins).
	 */
	chunkLoading?: DevTool;

	/**
	 * The entrypoints that the current entrypoint depend on. They must be loaded when this entrypoint is loaded.
	 */
	dependOn?: EntryItem;

	/**
	 * Specifies the name of each output file on disk. You must **not** specify an absolute path here! The `output.path` option determines the location on disk the files are written to, filename is used solely for naming the individual files.
	 */
	filename?: Filename;

	/**
	 * Module(s) that are loaded upon startup.
	 */
	import: EntryItem;

	/**
	 * Options for library.
	 */
	library?: LibraryOptions;

	/**
	 * The name of the runtime chunk. If set a runtime chunk with this name is created or an existing entrypoint is used as runtime.
	 */
	runtime?: string;

	/**
	 * The method of loading WebAssembly Modules (methods included by default are 'fetch' (web/WebWorker), 'async-node' (node.js), but others might be added by plugins).
	 */
	wasmLoading?: DevTool;
}

/**
 * An object with entry point description.
 */
declare interface EntryDescriptionNormalized {
	/**
	 * The method of loading chunks (methods included by default are 'jsonp' (web), 'importScripts' (WebWorker), 'require' (sync node.js), 'async-node' (async node.js), but others might be added by plugins).
	 */
	chunkLoading?: DevTool;

	/**
	 * The entrypoints that the current entrypoint depend on. They must be loaded when this entrypoint is loaded.
	 */
	dependOn?: [string, ...string[]];

	/**
	 * Specifies the name of each output file on disk. You must **not** specify an absolute path here! The `output.path` option determines the location on disk the files are written to, filename is used solely for naming the individual files.
	 */
	filename?: Filename;

	/**
	 * Module(s) that are loaded upon startup. The last one is exported.
	 */
	import?: [string, ...string[]];

	/**
	 * Options for library.
	 */
	library?: LibraryOptions;

	/**
	 * The name of the runtime chunk. If set a runtime chunk with this name is created or an existing entrypoint is used as runtime.
	 */
	runtime?: string;

	/**
	 * The method of loading WebAssembly Modules (methods included by default are 'fetch' (web/WebWorker), 'async-node' (node.js), but others might be added by plugins).
	 */
	wasmLoading?: DevTool;
}
type EntryItem = string | [string, ...string[]];
type EntryNormalized =
	| (() => Promise<EntryStaticNormalized>)
	| EntryStaticNormalized;

/**
 * Multiple entry bundles are created. The key is the entry name. The value can be a string, an array or an entry description object.
 */
declare interface EntryObject {
	[index: string]: string | [string, ...string[]] | EntryDescription;
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
	): { name?: string } & Pick<
		EntryDescriptionNormalized,
		| "filename"
		| "chunkLoading"
		| "dependOn"
		| "library"
		| "runtime"
		| "wasmLoading"
	>;
}
declare class EntryPlugin {
	/**
	 * An entry plugin which will handle
	 * creation of the EntryDependency
	 */
	constructor(
		context: string,
		entry: string,
		options:
			| string
			| ({ name?: string } & Pick<
					EntryDescriptionNormalized,
					| "filename"
					| "chunkLoading"
					| "dependOn"
					| "library"
					| "runtime"
					| "wasmLoading"
			  >)
	);
	context: string;
	entry: string;
	options:
		| string
		| ({ name?: string } & Pick<
				EntryDescriptionNormalized,
				| "filename"
				| "chunkLoading"
				| "dependOn"
				| "library"
				| "runtime"
				| "wasmLoading"
		  >);

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
	static createDependency(
		entry: string,
		options:
			| string
			| ({ name?: string } & Pick<
					EntryDescriptionNormalized,
					| "filename"
					| "chunkLoading"
					| "dependOn"
					| "library"
					| "runtime"
					| "wasmLoading"
			  >)
	): EntryDependency;
}
type EntryStatic = string | EntryObject | [string, ...string[]];

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
	getRuntimeChunk(): Chunk;

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
	moduleFilenameTemplate: DevtoolFallbackModuleFilenameTemplate;
	namespace: string;
	options: SourceMapDevToolPluginOptions;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}

/**
 * Enables/Disables experiments (experimental features with relax SemVer compatibility).
 */
declare interface Experiments {
	/**
	 * Allow module type 'asset' to generate assets.
	 */
	asset?: boolean;

	/**
	 * Support WebAssembly as asynchronous EcmaScript Module.
	 */
	asyncWebAssembly?: boolean;

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
declare abstract class ExportInfo {
	name: string;

	/**
	 * true: it is provided
	 * false: it is not provided
	 * null: only the runtime knows if it is provided
	 * undefined: it was not determined if it is provided
	 */
	provided: boolean;

	/**
	 * is the export a terminal binding that should be checked for export star conflicts
	 */
	terminalBinding: boolean;

	/**
	 * true: it can be mangled
	 * false: is can not be mangled
	 * undefined: it was not determined if it can be mangled
	 */
	canMangleProvide: boolean;

	/**
	 * true: it can be mangled
	 * false: is can not be mangled
	 * undefined: it was not determined if it can be mangled
	 */
	canMangleUse: boolean;
	exportsInfoOwned: boolean;
	exportsInfo: ExportsInfo;
	readonly canMangle: boolean;
	setUsedInUnknownWay(runtime: string | SortableSet<string>): boolean;
	setUsedWithoutInfo(runtime: string | SortableSet<string>): boolean;
	setHasUseInfo(): void;
	setUsedConditionally(
		condition: (arg0: 0 | 1 | 2 | 3 | 4) => boolean,
		newValue: 0 | 1 | 2 | 3 | 4,
		runtime: string | SortableSet<string>
	): boolean;
	setUsed(
		newValue: 0 | 1 | 2 | 3 | 4,
		runtime: string | SortableSet<string>
	): boolean;
	setTarget(
		key?: any,
		connection?: ModuleGraphConnection,
		exportName?: string[]
	): boolean;
	getUsed(runtime: string | SortableSet<string>): 0 | 1 | 2 | 3 | 4;

	/**
	 * get used name
	 */
	getUsedName(
		fallbackName: string,
		runtime: string | SortableSet<string>
	): DevTool;
	hasUsedName(): boolean;

	/**
	 * Sets the mangled name of this export
	 */
	setUsedName(name: string): void;
	getTerminalBinding(
		moduleGraph: ModuleGraph,
		resolveTargetFilter?: (arg0: {
			module: Module;
			export: string[];
		}) => boolean
	): ExportsInfo | ExportInfo;
	isReexport(): boolean;
	findTarget(
		moduleGraph: ModuleGraph,
		validTargetModuleFilter: (arg0: Module) => boolean
	): false | { module: Module; export: string[] };
	getTarget(
		moduleGraph: ModuleGraph,
		resolveTargetFilter?: (arg0: {
			module: Module;
			export: string[];
		}) => boolean
	): { module: Module; export: string[] };
	createNestedExportsInfo(): ExportsInfo;
	getNestedExportsInfo(): ExportsInfo;
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
	export?: string[];
}
declare abstract class ExportsInfo {
	readonly ownedExports: Iterable<ExportInfo>;
	readonly orderedOwnedExports: Iterable<ExportInfo>;
	readonly exports: Iterable<ExportInfo>;
	readonly orderedExports: Iterable<ExportInfo>;
	readonly otherExportsInfo: ExportInfo;
	setRedirectNamedTo(exportsInfo?: any): boolean;
	setHasProvideInfo(): void;
	setHasUseInfo(): void;
	getOwnExportInfo(name: string): ExportInfo;
	getExportInfo(name: string): ExportInfo;
	getReadOnlyExportInfo(name: string): ExportInfo;
	getReadOnlyExportInfoRecursive(name: string[]): ExportInfo;
	getNestedExportsInfo(name?: string[]): ExportsInfo;
	setUnknownExportsProvided(
		canMangle?: boolean,
		excludeExports?: Set<string>,
		targetKey?: any,
		targetModule?: ModuleGraphConnection
	): boolean;
	setUsedInUnknownWay(runtime: string | SortableSet<string>): boolean;
	setUsedWithoutInfo(runtime: string | SortableSet<string>): boolean;
	setAllKnownExportsUsed(runtime: string | SortableSet<string>): boolean;
	setUsedForSideEffectsOnly(runtime: string | SortableSet<string>): boolean;
	isUsed(runtime: string | SortableSet<string>): boolean;
	isModuleUsed(runtime: string | SortableSet<string>): boolean;
	getUsedExports(
		runtime: string | SortableSet<string>
	): boolean | SortableSet<string>;
	getProvidedExports(): true | string[];
	getRelevantExports(runtime: string | SortableSet<string>): ExportInfo[];
	isExportProvided(name: LibraryExport): boolean;
	getUsageKey(runtime: string | SortableSet<string>): string;
	isEquallyUsed(
		runtimeA: string | SortableSet<string>,
		runtimeB: string | SortableSet<string>
	): boolean;
	getUsed(
		name: LibraryExport,
		runtime: string | SortableSet<string>
	): 0 | 1 | 2 | 3 | 4;
	getUsedName(
		name: LibraryExport,
		runtime: string | SortableSet<string>
	): string | false | string[];
	updateHash(hash: Hash, runtime: string | SortableSet<string>): void;
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
	exports: true | (string | ExportSpec)[];

	/**
	 * when exports = true, list of unaffected exports
	 */
	excludeExports?: Set<string>;

	/**
	 * when reexported: from which module
	 */
	from?: ModuleGraphConnection;

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
type ExternalItem =
	| string
	| RegExp
	| { [index: string]: string | boolean | string[] | { [index: string]: any } }
	| ((
			data: { context: string; request: string },
			callback: (err: Error, result: string) => void
	  ) => void);
declare class ExternalModule extends Module {
	constructor(request?: any, type?: any, userRequest?: any);
	request: string | string[] | Record<string, LibraryExport>;
	externalType: string;
	userRequest: string;
	getSourceData(
		runtimeTemplate?: any,
		moduleGraph?: any,
		chunkGraph?: any
	): SourceData;
}
declare interface ExternalModuleInfo {
	index: number;
	module: Module;
}
type Externals =
	| string
	| RegExp
	| ExternalItem[]
	| { [index: string]: string | boolean | string[] | { [index: string]: any } }
	| ((
			data: { context: string; request: string },
			callback: (err: Error, result: string) => void
	  ) => void);
declare class ExternalsPlugin {
	constructor(type: string, externals: Externals);
	type: string;
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
	| "amd"
	| "amd-require"
	| "umd"
	| "umd2"
	| "jsonp"
	| "system"
	| "promise"
	| "import"
	| "script";
declare interface FactorizeModuleOptions {
	currentProfile: ModuleProfile;
	factory: ModuleFactory;
	dependencies: Dependency[];
	originModule: Module;
	context?: string;
}
declare interface FakeHookMarker {}
declare interface FallbackCacheGroup {
	minSize: Record<string, number>;
	maxAsyncSize: Record<string, number>;
	maxInitialSize: Record<string, number>;
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
	 * Algorithm used for generation the hash (see node.js crypto package).
	 */
	hashAlgorithm?: string;

	/**
	 * Time in ms after which idle period the cache storing should happen (only for store: 'pack' or 'idle').
	 */
	idleTimeout?: number;

	/**
	 * Time in ms after which idle period the initial cache storing should happen (only for store: 'pack' or 'idle').
	 */
	idleTimeoutForInitialStore?: number;

	/**
	 * List of paths that are managed by a package manager and contain a version or hash in its path so all files are immutable.
	 */
	immutablePaths?: string[];

	/**
	 * List of paths that are managed by a package manager and can be trusted to not be modified otherwise.
	 */
	managedPaths?: string[];

	/**
	 * Name for the cache. Different names will lead to different coexisting caches.
	 */
	name?: string;

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
		(arg0: string, arg1: any, arg2: FileSystemCallback<string | Buffer>): void;
	};
	readdir: {
		(
			arg0: string,
			arg1: FileSystemCallback<(string | Buffer)[] | FileSystemDirent[]>
		): void;
		(
			arg0: string,
			arg1: any,
			arg2: FileSystemCallback<(string | Buffer)[] | FileSystemDirent[]>
		): void;
	};
	readJson?: {
		(arg0: string, arg1: FileSystemCallback<any>): void;
		(arg0: string, arg1: any, arg2: FileSystemCallback<any>): void;
	};
	readlink: {
		(arg0: string, arg1: FileSystemCallback<string | Buffer>): void;
		(arg0: string, arg1: any, arg2: FileSystemCallback<string | Buffer>): void;
	};
	lstat?: {
		(arg0: string, arg1: FileSystemCallback<FileSystemStats>): void;
		(arg0: string, arg1: any, arg2: FileSystemCallback<string | Buffer>): void;
	};
	stat: {
		(arg0: string, arg1: FileSystemCallback<FileSystemStats>): void;
		(arg0: string, arg1: any, arg2: FileSystemCallback<string | Buffer>): void;
	};
}
declare interface FileSystemCallback<T> {
	(err: PossibleFileSystemError & Error, result: T): any;
}
declare interface FileSystemDirent {
	name: string | Buffer;
	isDirectory: () => boolean;
	isFile: () => boolean;
}
declare abstract class FileSystemInfo {
	fs: InputFileSystem;
	logger: WebpackLogger;
	fileTimestampQueue: AsyncQueue<string, string, FileSystemInfoEntry>;
	fileHashQueue: AsyncQueue<string, string, string>;
	contextTimestampQueue: AsyncQueue<string, string, FileSystemInfoEntry>;
	contextHashQueue: AsyncQueue<string, string, string>;
	managedItemQueue: AsyncQueue<string, string, string>;
	managedItemDirectoryQueue: AsyncQueue<string, string, Set<string>>;
	managedPaths: string[];
	managedPathsWithSlash: string[];
	immutablePaths: string[];
	immutablePathsWithSlash: string[];
	logStatistics(): void;
	addFileTimestamps(map: Map<string, FileSystemInfoEntry | "ignore">): void;
	addContextTimestamps(map: Map<string, FileSystemInfoEntry | "ignore">): void;
	getFileTimestamp(
		path: string,
		callback: (arg0: WebpackError, arg1: FileSystemInfoEntry | "ignore") => void
	): void;
	getContextTimestamp(
		path: string,
		callback: (arg0: WebpackError, arg1: FileSystemInfoEntry | "ignore") => void
	): void;
	getFileHash(
		path: string,
		callback: (arg0: WebpackError, arg1: string) => void
	): void;
	getContextHash(
		path: string,
		callback: (arg0: WebpackError, arg1: string) => void
	): void;
	resolveBuildDependencies(
		context: string,
		deps: Iterable<string>,
		callback: (arg0: Error, arg1: ResolveBuildDependenciesResult) => void
	): void;
	checkResolveResultsValid(
		resolveResults: Map<string, string>,
		callback: (arg0: Error, arg1: boolean) => void
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
		callback: (arg0: WebpackError, arg1: Snapshot) => void
	): void;
	mergeSnapshots(snapshot1: Snapshot, snapshot2: Snapshot): Snapshot;
	checkSnapshotValid(
		snapshot: Snapshot,
		callback: (arg0: WebpackError, arg1: boolean) => void
	): void;
	getDeprecatedFileTimestamps(): Map<any, any>;
	getDeprecatedContextTimestamps(): Map<any, any>;
}
declare interface FileSystemInfoEntry {
	safeTime: number;
	timestamp?: number;
	timestampHash?: string;
}
declare interface FileSystemStats {
	isDirectory: () => boolean;
	isFile: () => boolean;
}
type Filename = string | ((pathData: PathData, assetInfo: AssetInfo) => string);
type FilterItemTypes = string | RegExp | ((value: string) => boolean);
type FilterTypes =
	| string
	| RegExp
	| FilterItemTypes[]
	| ((value: string) => boolean);
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
	runtime: string | SortableSet<string>;

	/**
	 * when in concatenated module, information about other concatenated modules
	 */
	concatenationScope?: ConcatenationScope;

	/**
	 * which kind of code should be generated
	 */
	type: string;
}
declare class Generator {
	constructor();
	getTypes(module: NormalModule): Set<string>;
	getSize(module: NormalModule, type?: string): number;
	generate(module: NormalModule, __1: GenerateContext): Source;
	getConcatenationBailoutReason(
		module: NormalModule,
		context: ConcatenationBailoutReasonContext
	): string;
	updateHash(hash: Hash, __1: UpdateHashContextGenerator): void;
	static byType(map?: any): ByTypeGenerator;
}
declare class GetChunkFilenameRuntimeModule extends RuntimeModule {
	constructor(
		contentType: string,
		name: string,
		global: string,
		getFilenameForChunk: (
			arg0: Chunk
		) => string | ((arg0: PathData, arg1: AssetInfo) => string),
		allChunks: boolean
	);
	contentType: string;
	global: string;
	getFilenameForChunk: (
		arg0: Chunk
	) => string | ((arg0: PathData, arg1: AssetInfo) => string);
	allChunks: boolean;
}
declare interface GroupConfig<T, R> {
	getKeys: (arg0: T) => string[];
	createGroup: (arg0: string, arg1: (T | R)[], arg2: T[]) => R;
	getOptions?: (arg0: string, arg1: T[]) => GroupOptions;
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
	originModule: Module;
	context?: string;

	/**
	 * recurse into dependencies of the created module
	 */
	recursive?: boolean;
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
type HashFunction = string | typeof Hash;
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
	hashDigest?: "hex" | "latin1" | "base64";

	/**
	 * The prefix length of the hash digest to use, defaults to 4.
	 */
	hashDigestLength?: number;

	/**
	 * The hashing algorithm to use, defaults to 'md4'. All functions from Node.JS' crypto.createHash are supported.
	 */
	hashFunction?: string;
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
declare class HotUpdateChunk extends Chunk {
	constructor();
}
declare class HttpUriPlugin {
	constructor();

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare class HttpsUriPlugin {
	constructor();

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare class IgnorePlugin {
	constructor(options: IgnorePluginOptions);
	options: IgnorePluginOptions;

	/**
	 * Note that if "contextRegExp" is given, both the "resourceRegExp"
	 * and "contextRegExp" have to match.
	 */
	checkIgnore(resolveData: ResolveData): false;

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
			resourceRegExp?: RegExp;
	  }
	| {
			/**
			 * A filter function for resource and context.
			 */
			checkResource?: (resource: string, context: string) => boolean;
	  };

/**
 * Options for infrastructure level logging.
 */
declare interface InfrastructureLogging {
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
	level?: "none" | "verbose" | "error" | "warn" | "info" | "log";
}
declare abstract class InitFragment {
	content: string | Source;
	stage: number;
	position: number;
	key: string;
	endContent: string | Source;
	getContent(generateContext: GenerateContext): string | Source;
	getEndContent(generateContext: GenerateContext): string | Source;
	merge: any;
}
declare interface InputFileSystem {
	readFile: (
		arg0: string,
		arg1: (arg0: NodeJS.ErrnoException, arg1: Buffer) => void
	) => void;
	readJson?: (
		arg0: string,
		arg1: (arg0: Error | NodeJS.ErrnoException, arg1?: any) => void
	) => void;
	readlink: (
		arg0: string,
		arg1: (arg0: NodeJS.ErrnoException, arg1: string | Buffer) => void
	) => void;
	readdir: (
		arg0: string,
		arg1: (arg0: NodeJS.ErrnoException, arg1: string[]) => void
	) => void;
	stat: (
		arg0: string,
		arg1: (arg0: NodeJS.ErrnoException, arg1: FsStats) => void
	) => void;
	realpath?: (
		arg0: string,
		arg1: (arg0: NodeJS.ErrnoException, arg1: string) => void
	) => void;
	purge?: (arg0: string) => void;
	join?: (arg0: string, arg1: string) => string;
	relative?: (arg0: string, arg1: string) => string;
	dirname?: (arg0: string) => string;
}
declare interface IntermediateFileSystemExtras {
	mkdirSync: (arg0: string) => void;
	createWriteStream: (arg0: string) => WriteStream;
	rename: (
		arg0: string,
		arg1: string,
		arg2: (arg0: NodeJS.ErrnoException) => void
	) => void;
}
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
	constructor(options?: {});
	options: {};

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
	renderModule(
		module: Module,
		renderContext: RenderContextObject,
		hooks: CompilationHooksJavascriptModulesPlugin,
		factory: boolean | "strict"
	): Source;
	renderChunk(
		renderContext: RenderContextObject,
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
	): { header: string[]; startup: string[]; allowInlineStartup: boolean };
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
	constructor(sourceType?: "module" | "script" | "auto");
	hooks: Readonly<{
		evaluateTypeof: HookMap<
			SyncBailHook<[UnaryExpression], BasicEvaluatedExpression>
		>;
		evaluate: HookMap<SyncBailHook<[Expression], BasicEvaluatedExpression>>;
		evaluateIdentifier: HookMap<
			SyncBailHook<
				[ThisExpression | MemberExpression | MetaProperty | Identifier],
				BasicEvaluatedExpression
			>
		>;
		evaluateDefinedIdentifier: HookMap<
			SyncBailHook<
				[ThisExpression | MemberExpression | Identifier],
				BasicEvaluatedExpression
			>
		>;
		evaluateCallExpressionMember: HookMap<
			SyncBailHook<
				[CallExpression, BasicEvaluatedExpression],
				BasicEvaluatedExpression
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
			[MethodDefinition, ClassExpression | ClassDeclaration],
			boolean | void
		>;
		label: HookMap<SyncBailHook<[LabeledStatement], boolean | void>>;
		import: SyncBailHook<
			[Statement, string | SimpleLiteral | RegExpLiteral],
			boolean | void
		>;
		importSpecifier: SyncBailHook<
			[Statement, string | SimpleLiteral | RegExpLiteral, string, string],
			boolean | void
		>;
		export: SyncBailHook<[Statement], boolean | void>;
		exportImport: SyncBailHook<
			[Statement, string | SimpleLiteral | RegExpLiteral],
			boolean | void
		>;
		exportDeclaration: SyncBailHook<[Statement, Declaration], boolean | void>;
		exportExpression: SyncBailHook<[Statement, Declaration], boolean | void>;
		exportSpecifier: SyncBailHook<
			[Statement, string, string, number],
			boolean | void
		>;
		exportImportSpecifier: SyncBailHook<
			[
				Statement,
				string | SimpleLiteral | RegExpLiteral,
				string,
				string,
				number
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
		pattern: HookMap<SyncBailHook<any, any>>;
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
			SyncBailHook<[CallExpression, string[]], boolean | void>
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
		expression: HookMap<SyncBailHook<[Expression], boolean | void>>;
		expressionMemberChain: HookMap<
			SyncBailHook<[Expression, string[]], boolean | void>
		>;
		unhandledExpressionMemberChain: HookMap<
			SyncBailHook<[Expression, string[]], boolean | void>
		>;
		expressionConditionalOperator: SyncBailHook<[Expression], boolean | void>;
		expressionLogicalOperator: SyncBailHook<[Expression], boolean | void>;
		program: SyncBailHook<[Program, Comment[]], boolean | void>;
		finish: SyncBailHook<[Program, Comment[]], boolean | void>;
	}>;
	sourceType: "module" | "script" | "auto";
	scope: ScopeInfo;
	state: Record<string, any> & ParserStateBase;
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
	getRenameIdentifier(expr?: any): string;
	walkClass(classy: ClassExpression | ClassDeclaration): void;
	walkMethodDefinition(methodDefinition?: any): void;
	preWalkStatements(statements?: any): void;
	blockPreWalkStatements(statements?: any): void;
	walkStatements(statements?: any): void;
	preWalkStatement(statement?: any): void;
	blockPreWalkStatement(statement?: any): void;
	walkStatement(statement?: any): void;
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
	walkNewExpression(expression?: any, args?: any): void;
	walkYieldExpression(expression?: any): void;
	walkTemplateLiteral(expression?: any): void;
	walkTaggedTemplateExpression(expression?: any): void;
	walkClassExpression(expression?: any): void;
	walkChainExpression(expression: ChainExpression): void;
	walkImportExpression(expression?: any): void;
	walkCallExpression(expression?: any, args?: any): void;
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
		info: string | ScopeInfo | VariableInfo,
		...args: AsArray<T>
	): R;
	callHooksForInfoWithFallback<T, R>(
		hookMap: HookMap<SyncBailHook<T, R>>,
		info: string | ScopeInfo | VariableInfo,
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
	evaluate(source?: any): BasicEvaluatedExpression;
	isPure(
		expr:
			| UnaryExpression
			| ThisExpression
			| ArrayExpression
			| ObjectExpression
			| FunctionExpression
			| ArrowFunctionExpression
			| YieldExpression
			| SimpleLiteral
			| RegExpLiteral
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
			| ClassDeclaration,
		commentsStartPos: number,
		args?: any
	): boolean;
	getComments(range?: any): any;
	isAsiPosition(pos: number): boolean;
	isStatementLevelExpression(expr?: any): boolean;
	getTagData(name?: any, tag?: any): any;
	tagVariable(name?: any, tag?: any, data?: any): void;
	defineVariable(name?: any): void;
	undefineVariable(name?: any): void;
	isVariableDefined(name?: any): boolean;
	getVariableInfo(name: string): string | ScopeInfo | VariableInfo;
	setVariable(
		name: string,
		variableInfo: string | ScopeInfo | VariableInfo
	): void;
	parseCommentOptions(range?: any): { options: any; errors: any };
	extractMemberExpressionChain(
		expression: MemberExpression
	): {
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
	};
	getFreeInfoFromVariable(
		varName: string
	): { name: string; info: string | VariableInfo };
	getMemberExpressionInfo(
		expression: MemberExpression,
		allowedTypes: number
	):
		| {
				type: "call";
				call: CallExpression;
				calleeName: string;
				rootInfo: string | VariableInfo;
				getCalleeMembers: () => string[];
				name: string;
				getMembers: () => string[];
		  }
		| {
				type: "expression";
				rootInfo: string | VariableInfo;
				name: string;
				getMembers: () => string[];
		  };
	getNameForExpression(
		expression: MemberExpression
	): {
		name: string;
		rootInfo: string | ScopeInfo | VariableInfo;
		getMembers: () => string[];
	};
	static ALLOWED_MEMBER_TYPES_ALL: number;
	static ALLOWED_MEMBER_TYPES_EXPRESSION: number;
	static ALLOWED_MEMBER_TYPES_CALL_EXPRESSION: number;
}
declare class JsonpChunkLoadingRuntimeModule extends RuntimeModule {
	constructor(runtimeRequirements?: any);
	static getCompilationHooks(
		compilation: Compilation
	): JsonpCompilationPluginHooks;
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
declare abstract class LazySet<T> {
	readonly size: number;
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
	[Symbol.iterator](): IterableIterator<T>;
	readonly [Symbol.toStringTag]: string;
	serialize(__0: { write: any }): void;
}
declare interface LibIdentOptions {
	/**
	 * absolute context path to which lib ident is relative to
	 */
	context: string;

	/**
	 * object for caching
	 */
	associatedObjectForCache?: any;
}
declare class LibManifestPlugin {
	constructor(options?: any);
	options: any;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
type Library = string | string[] | LibraryOptions | LibraryCustomUmdObject;
declare interface LibraryContext<T> {
	compilation: Compilation;
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
	root?: LibraryExport;
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
	auxiliaryComment?: AuxiliaryComment;

	/**
	 * Specify which export should be exposed as library.
	 */
	export?: LibraryExport;

	/**
	 * The name of the library (some types allow unnamed libraries too).
	 */
	name?: LibraryName;

	/**
	 * Type of library (types included by default are 'var', 'module', 'assign', 'this', 'window', 'self', 'global', 'commonjs', 'commonjs2', 'commonjs-module', 'amd', 'amd-require', 'umd', 'umd2', 'jsonp', 'system', but others might be added by plugins).
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
	options: LimitChunkCountPluginOptions;
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
	constructor();
	static getCompilationHooks(
		compilation: Compilation
	): LoadScriptCompilationHooks;
}

/**
 * Custom values available in the loader context.
 */
declare interface Loader {
	[index: string]: any;
}
declare interface LoaderItem {
	loader: string;
	options: any;
	ident: string;
	type: string;
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
		readonly jsonpScript: SyncWaterfallHook<[string, Chunk]>;
		readonly linkPrefetch: SyncWaterfallHook<[string, Chunk]>;
		readonly linkPreload: SyncWaterfallHook<[string, Chunk]>;
	}>;
	renderCurrentHashCode: (hash: string, length?: number) => string;
	getPublicPath: (options?: any) => string;
	getAssetPath: (path?: any, options?: any) => string;
	getAssetPathWithInfo: (
		path?: any,
		options?: any
	) => { path: string; info: AssetInfo };
	readonly requireFn: string;
	readonly outputOptions: Output;
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
type Mode = "development" | "production" | "none";
declare class Module extends DependenciesBlock {
	constructor(type: string, context?: string);
	type: string;
	context: string;
	needId: boolean;
	debugId: number;
	resolveOptions: ResolveOptionsWebpackOptions;
	factoryMeta: any;
	buildMeta: KnownBuildMeta & Record<string, any>;
	buildInfo: any;
	presentationalDependencies: Dependency[];
	id: string | number;
	readonly hash: string;
	readonly renderedHash: string;
	profile: ModuleProfile;
	index: number;
	index2: number;
	depth: number;
	issuer: Module;
	readonly usedExports: boolean | SortableSet<string>;
	readonly optimizationBailout: (
		| string
		| ((requestShortener: RequestShortener) => string)
	)[];
	readonly optional: boolean;
	addChunk(chunk?: any): boolean;
	removeChunk(chunk?: any): void;
	isInChunk(chunk?: any): boolean;
	isEntryModule(): boolean;
	getChunks(): Chunk[];
	getNumberOfChunks(): number;
	readonly chunksIterable: Iterable<Chunk>;
	isProvided(exportName: string): boolean;
	readonly exportsArgument: string;
	readonly moduleArgument: string;
	getExportsType(
		moduleGraph: ModuleGraph,
		strict: boolean
	): "namespace" | "default-only" | "default-with-named" | "dynamic";
	addPresentationalDependency(presentationalDependency: Dependency): void;
	addWarning(warning: WebpackError): void;
	getWarnings(): Iterable<WebpackError>;
	getNumberOfWarnings(): number;
	addError(error: WebpackError): void;
	getErrors(): Iterable<WebpackError>;
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
	hasReasons(
		moduleGraph: ModuleGraph,
		runtime: string | SortableSet<string>
	): boolean;
	needBuild(
		context: NeedBuildContext,
		callback: (arg0: WebpackError, arg1: boolean) => void
	): void;
	needRebuild(
		fileTimestamps: Map<string, number>,
		contextTimestamps: Map<string, number>
	): boolean;
	invalidateBuild(): void;
	identifier(): string;
	readableIdentifier(requestShortener: RequestShortener): string;
	build(
		options: WebpackOptionsNormalized,
		compilation: Compilation,
		resolver: Resolver & WithOptions,
		fs: InputFileSystem,
		callback: (arg0: WebpackError) => void
	): void;
	getSourceTypes(): Set<string>;
	source(
		dependencyTemplates: DependencyTemplates,
		runtimeTemplate: RuntimeTemplate,
		type?: string
	): Source;
	size(type?: string): number;
	libIdent(options: LibIdentOptions): string;
	nameForCondition(): string;
	getConcatenationBailoutReason(
		context: ConcatenationBailoutReasonContext
	): string;
	getSideEffectsConnectionState(
		moduleGraph: ModuleGraph
	): boolean | typeof TRANSITIVE_ONLY | typeof CIRCULAR_CONNECTION;
	codeGeneration(context: CodeGenerationContext): CodeGenerationResult;
	chunkCondition(chunk: Chunk, compilation: Compilation): boolean;

	/**
	 * Assuming this module is in the cache. Update the (cached) module with
	 * the fresh module from the factory. Usually updates internal references
	 * and properties.
	 */
	updateCacheModule(module: Module): void;
	originalSource(): Source;
	addCacheDependencies(
		fileDependencies: LazySet<string>,
		contextDependencies: LazySet<string>,
		missingDependencies: LazySet<string>,
		buildDependencies: LazySet<string>
	): void;
	useSourceMap: any;
	readonly hasEqualsChunks: any;
	readonly isUsed: any;
	readonly errors: any;
	readonly warnings: any;
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
declare abstract class ModuleDependency extends Dependency {
	request: string;
	userRequest: string;
	range: any;
}
declare abstract class ModuleFactory {
	create(
		data: ModuleFactoryCreateData,
		callback: (arg0: Error, arg1: ModuleFactoryResult) => void
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
	exposes?: Exposes;

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
	remoteType?: ExternalsType;

	/**
	 * Container locations and request scopes from which modules should be resolved and loaded at runtime. When provided, property name is used as request scope, otherwise request scope is automatically inferred from container location.
	 */
	remotes?: Remotes;

	/**
	 * Share scope name used for all shared modules (defaults to 'default').
	 */
	shareScope?: string;

	/**
	 * Modules that should be shared in the share scope. When provided, property names are used to match requested modules in this compilation.
	 */
	shared?: Shared;
}
declare class ModuleGraph {
	constructor();
	setParents(
		dependency: Dependency,
		block: DependenciesBlock,
		module: Module
	): void;
	getParentModule(dependency: Dependency): Module;
	getParentBlock(dependency: Dependency): DependenciesBlock;
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
	getConnection(dependency: Dependency): ModuleGraphConnection;
	getModule(dependency: Dependency): Module;
	getOrigin(dependency: Dependency): Module;
	getResolvedOrigin(dependency: Dependency): Module;
	getIncomingConnections(module: Module): Iterable<ModuleGraphConnection>;
	getOutgoingConnections(module: Module): Iterable<ModuleGraphConnection>;
	getProfile(module: Module): ModuleProfile;
	setProfile(module: Module, profile: ModuleProfile): void;
	getIssuer(module: Module): Module;
	setIssuer(module: Module, issuer: Module): void;
	setIssuerIfUnset(module: Module, issuer: Module): void;
	getOptimizationBailout(
		module: Module
	): (string | ((requestShortener: RequestShortener) => string))[];
	getProvidedExports(module: Module): true | string[];
	isExportProvided(module: Module, exportName: LibraryExport): boolean;
	getExportsInfo(module: Module): ExportsInfo;
	getExportInfo(module: Module, exportName: string): ExportInfo;
	getReadOnlyExportInfo(module: Module, exportName: string): ExportInfo;
	getUsedExports(
		module: Module,
		runtime: string | SortableSet<string>
	): boolean | SortableSet<string>;
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
	getMeta(thing?: any): any;
	static getModuleGraphForModule(
		module: Module,
		deprecateMessage: string,
		deprecationCode: string
	): ModuleGraph;
	static setModuleGraphForModule(
		module: Module,
		moduleGraph: ModuleGraph
	): void;
	static ModuleGraphConnection: typeof ModuleGraphConnection;
}
declare class ModuleGraphConnection {
	constructor(
		originModule: Module,
		dependency: Dependency,
		module: Module,
		explanation?: string,
		weak?: boolean,
		condition?: (
			arg0: ModuleGraphConnection,
			arg1: string | SortableSet<string>
		) => boolean | typeof TRANSITIVE_ONLY | typeof CIRCULAR_CONNECTION
	);
	originModule: Module;
	resolvedOriginModule: Module;
	dependency: Dependency;
	resolvedModule: Module;
	module: Module;
	weak: boolean;
	conditional: boolean;
	condition: (
		arg0: ModuleGraphConnection,
		arg1: string | SortableSet<string>
	) => boolean | typeof TRANSITIVE_ONLY | typeof CIRCULAR_CONNECTION;
	explanations: Set<string>;
	clone(): ModuleGraphConnection;
	addCondition(
		condition: (
			arg0: ModuleGraphConnection,
			arg1: string | SortableSet<string>
		) => boolean | typeof TRANSITIVE_ONLY | typeof CIRCULAR_CONNECTION
	): void;
	addExplanation(explanation: string): void;
	readonly explanation: string;
	active: void;
	isActive(runtime: string | SortableSet<string>): boolean;
	isTargetActive(runtime: string | SortableSet<string>): boolean;
	getActiveState(
		runtime: string | SortableSet<string>
	): boolean | typeof TRANSITIVE_ONLY | typeof CIRCULAR_CONNECTION;
	setActive(value: boolean): void;
	static addConnectionStates: (
		a: boolean | typeof TRANSITIVE_ONLY | typeof CIRCULAR_CONNECTION,
		b: boolean | typeof TRANSITIVE_ONLY | typeof CIRCULAR_CONNECTION
	) => boolean | typeof TRANSITIVE_ONLY | typeof CIRCULAR_CONNECTION;
	static TRANSITIVE_ONLY: typeof TRANSITIVE_ONLY;
	static CIRCULAR_CONNECTION: typeof CIRCULAR_CONNECTION;
}

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
	 * Don't parse files matching. It's matched against the full resolved request.
	 */
	noParse?:
		| string
		| Function
		| RegExp
		| [string | Function | RegExp, ...(string | Function | RegExp)[]];

	/**
	 * An array of rules applied for modules.
	 */
	rules?: (RuleSetRule | "...")[];

	/**
	 * Emit errors instead of warnings when imported names don't exist in imported module.
	 */
	strictExportPresence?: boolean;

	/**
	 * Handle the this context correctly according to the spec for namespace objects.
	 */
	strictThisContextOnImports?: boolean;

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
	 * Cache the resolving of module requests.
	 */
	unsafeCache?: boolean | Function;

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
declare interface ModulePathData {
	id: string | number;
	hash: string;
	hashWithLength?: (arg0: number) => string;
}
declare abstract class ModuleProfile {
	startTime: number;
	factory: number;
	restoring: number;
	integration: number;
	building: number;
	storing: number;
	additionalFactories: number;
	additionalIntegration: number;
	markFactoryStart(): void;
	factoryStartTime: number;
	markFactoryEnd(): void;
	factoryEndTime: number;
	markRestoringStart(): void;
	restoringStartTime: number;
	markRestoringEnd(): void;
	restoringEndTime: number;
	markIntegrationStart(): void;
	integrationStartTime: number;
	markIntegrationEnd(): void;
	integrationEndTime: number;
	markBuildingStart(): void;
	buildingStartTime: number;
	markBuildingEnd(): void;
	buildingEndTime: number;
	markStoringStart(): void;
	storingStartTime: number;
	markStoringEnd(): void;
	storingEndTime: number;

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
	asiSafe: boolean;
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
	readonly runtimeTemplate: any;
}
declare class MultiCompiler {
	constructor(compilers: Compiler[] | Record<string, Compiler>);
	hooks: Readonly<{
		done: SyncHook<[MultiStats], void>;
		invalid: MultiHook<SyncHook<[string, number], void>>;
		run: MultiHook<AsyncSeriesHook<[Compiler]>>;
		watchClose: SyncHook<[], void>;
		watchRun: MultiHook<AsyncSeriesHook<[Compiler]>>;
		infrastructureLog: MultiHook<SyncBailHook<[string, string, any[]], true>>;
	}>;
	compilers: Compiler[];
	dependencies: WeakMap<Compiler, string[]>;
	running: boolean;
	readonly options: WebpackOptionsNormalized[];
	readonly outputPath: string;
	inputFileSystem: InputFileSystem;
	outputFileSystem: OutputFileSystem;
	watchFileSystem: WatchFileSystem;
	intermediateFileSystem: InputFileSystem &
		OutputFileSystem &
		IntermediateFileSystemExtras;
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
declare abstract class MultiStats {
	stats: Stats[];
	readonly hash: string;
	hasErrors(): boolean;
	hasWarnings(): boolean;
	toJson(
		options?: any
	): {
		children: any[];
		version: any;
		hash: string;
		errors: any[];
		warnings: any[];
		errorsCount: number;
		warningsCount: number;
	};
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
	fileSystemInfo: FileSystemInfo;
}
declare class NoEmitOnErrorsPlugin {
	constructor();

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare class NodeEnvironmentPlugin {
	constructor(options?: any);
	options: any;

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
	__dirname?: boolean | "mock" | "eval-only";

	/**
	 * Include a polyfill for the '__filename' variable.
	 */
	__filename?: boolean | "mock" | "eval-only";

	/**
	 * Include a polyfill for the 'global' variable.
	 */
	global?: boolean;
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
	constructor(__0: {
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
		 * path + query of the matched resource (virtual)
		 */
		matchResource: string;
		/**
		 * the parser used
		 */
		parser: Parser;
		/**
		 * the generator used
		 */
		generator: Generator;
		/**
		 * options used for resolving requests from this module
		 */
		resolveOptions: any;
	});
	request: string;
	userRequest: string;
	rawRequest: string;
	binary: boolean;
	parser: Parser;
	generator: Generator;
	resource: string;
	matchResource: string;
	loaders: LoaderItem[];
	error: WebpackError;
	createSourceForAsset(
		context: string,
		name: string,
		content: string,
		sourceMap?: any,
		associatedObjectForCache?: any
	): Source;
	createLoaderContext(
		resolver: Resolver & WithOptions,
		options: WebpackOptionsNormalized,
		compilation: Compilation,
		fs: InputFileSystem
	): any;
	getCurrentLoader(loaderContext?: any, index?: any): LoaderItem;
	createSource(
		context: string,
		content: string | Buffer,
		sourceMap?: any,
		associatedObjectForCache?: any
	): Source;
	doBuild(
		options: WebpackOptionsNormalized,
		compilation: Compilation,
		resolver: Resolver & WithOptions,
		fs: InputFileSystem,
		callback: (arg0: WebpackError) => void
	): void;
	markModuleAsErrored(error: WebpackError): void;
	applyNoParseRule(rule?: any, content?: any): any;
	shouldPreventParsing(noParseRule?: any, request?: any): any;
	static getCompilationHooks(
		compilation: Compilation
	): NormalModuleCompilationHooks;
	static deserialize(context?: any): NormalModule;
}
declare interface NormalModuleCompilationHooks {
	loader: SyncHook<[any, NormalModule], void>;
	beforeLoaders: SyncHook<[LoaderItem[], NormalModule, any], void>;
	readResourceForScheme: HookMap<
		AsyncSeriesBailHook<[string, NormalModule], string | Buffer>
	>;
}
declare abstract class NormalModuleFactory extends ModuleFactory {
	hooks: Readonly<{
		resolve: AsyncSeriesBailHook<[ResolveData], any>;
		resolveForScheme: HookMap<
			AsyncSeriesBailHook<
				[
					{
						resource: string;
						path: string;
						query: string;
						fragment: string;
						data: Record<string, any>;
					},
					ResolveData
				],
				true | void
			>
		>;
		factorize: AsyncSeriesBailHook<[ResolveData], any>;
		beforeResolve: AsyncSeriesBailHook<[ResolveData], any>;
		afterResolve: AsyncSeriesBailHook<[ResolveData], any>;
		createModule: AsyncSeriesBailHook<[any, ResolveData], any>;
		module: SyncWaterfallHook<[Module, any, ResolveData]>;
		createParser: HookMap<SyncBailHook<any, any>>;
		parser: HookMap<SyncHook<any, void>>;
		createGenerator: HookMap<SyncBailHook<any, any>>;
		generator: HookMap<SyncHook<any, void>>;
	}>;
	resolverFactory: ResolverFactory;
	ruleSet: RuleSet;
	unsafeCache: boolean;
	cachePredicate: Function;
	context: string;
	fs: InputFileSystem;
	parserCache: Map<string, WeakMap<any, any>>;
	generatorCache: Map<string, WeakMap<any, Generator>>;
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
	getParser(type?: any, parserOptions?: {}): any;
	createParser(type: string, parserOptions?: { [index: string]: any }): Parser;
	getGenerator(type?: any, generatorOptions?: {}): Generator;
	createGenerator(type?: any, generatorOptions?: {}): any;
	getResolver(type?: any, resolveOptions?: any): Resolver & WithOptions;
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
	nodeEnv?: DevTool;

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
	runtimeChunk?: OptimizationRuntimeChunk;

	/**
	 * Skip over modules which are flagged to contain no side effects when exports are not used.
	 */
	sideEffects?: boolean;

	/**
	 * Optimize duplication and caching by splitting chunks by shared modules and cache group.
	 */
	splitChunks?: false | OptimizationSplitChunksOptions;

	/**
	 * Figure out which exports are used by modules to mangle export names, omit unused exports and generate more efficient code (true: analyse used exports for each runtime, "global": analyse exports globally for all runtimes combined).
	 */
	usedExports?: boolean | "global";
}
type OptimizationRuntimeChunk =
	| boolean
	| "single"
	| "multiple"
	| {
			/**
			 * The name or name factory for the runtime chunks.
			 */
			name?: DevtoolFallbackModuleFilenameTemplate;
	  };

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
	chunks?: "initial" | "async" | "all" | ((chunk: Chunk) => boolean);

	/**
	 * Ignore minimum size, minimum chunks and maximum requests and always create chunks for this cache group.
	 */
	enforce?: boolean;

	/**
	 * Size threshold at which splitting is enforced and other restrictions (minRemainingSize, maxAsyncRequests, maxInitialRequests) are ignored.
	 */
	enforceSizeThreshold?: OptimizationSplitChunksSizes;

	/**
	 * Sets the template for the filename for created chunks.
	 */
	filename?: string | ((pathData: PathData, assetInfo: AssetInfo) => string);

	/**
	 * Sets the hint for chunk id.
	 */
	idHint?: string;

	/**
	 * Maximum number of requests which are accepted for on-demand loading.
	 */
	maxAsyncRequests?: number;

	/**
	 * Maximal size hint for the on-demand chunks.
	 */
	maxAsyncSize?: OptimizationSplitChunksSizes;

	/**
	 * Maximum number of initial chunks which are accepted for an entry point.
	 */
	maxInitialRequests?: number;

	/**
	 * Maximal size hint for the initial chunks.
	 */
	maxInitialSize?: OptimizationSplitChunksSizes;

	/**
	 * Maximal size hint for the created chunks.
	 */
	maxSize?: OptimizationSplitChunksSizes;

	/**
	 * Minimum number of times a module has to be duplicated until it's considered for splitting.
	 */
	minChunks?: number;

	/**
	 * Minimal size for the chunks the stay after moving the modules to a new chunk.
	 */
	minRemainingSize?: OptimizationSplitChunksSizes;

	/**
	 * Minimal size for the created chunk.
	 */
	minSize?: OptimizationSplitChunksSizes;

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
	chunks?: "initial" | "async" | "all" | ((chunk: Chunk) => boolean);

	/**
	 * Sets the size types which are used when a number is used for sizes.
	 */
	defaultSizeTypes?: string[];

	/**
	 * Size threshold at which splitting is enforced and other restrictions (minRemainingSize, maxAsyncRequests, maxInitialRequests) are ignored.
	 */
	enforceSizeThreshold?: OptimizationSplitChunksSizes;

	/**
	 * Options for modules not selected by any other cache group.
	 */
	fallbackCacheGroup?: {
		/**
		 * Sets the name delimiter for created chunks.
		 */
		automaticNameDelimiter?: string;
		/**
		 * Maximal size hint for the on-demand chunks.
		 */
		maxAsyncSize?: OptimizationSplitChunksSizes;
		/**
		 * Maximal size hint for the initial chunks.
		 */
		maxInitialSize?: OptimizationSplitChunksSizes;
		/**
		 * Maximal size hint for the created chunks.
		 */
		maxSize?: OptimizationSplitChunksSizes;
		/**
		 * Minimal size for the created chunk.
		 */
		minSize?: OptimizationSplitChunksSizes;
	};

	/**
	 * Sets the template for the filename for created chunks.
	 */
	filename?: string | ((pathData: PathData, assetInfo: AssetInfo) => string);

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
	maxAsyncSize?: OptimizationSplitChunksSizes;

	/**
	 * Maximum number of initial chunks which are accepted for an entry point.
	 */
	maxInitialRequests?: number;

	/**
	 * Maximal size hint for the initial chunks.
	 */
	maxInitialSize?: OptimizationSplitChunksSizes;

	/**
	 * Maximal size hint for the created chunks.
	 */
	maxSize?: OptimizationSplitChunksSizes;

	/**
	 * Minimum number of times a module has to be duplicated until it's considered for splitting.
	 */
	minChunks?: number;

	/**
	 * Minimal size for the chunks the stay after moving the modules to a new chunk.
	 */
	minRemainingSize?: OptimizationSplitChunksSizes;

	/**
	 * Minimal size for the created chunks.
	 */
	minSize?: OptimizationSplitChunksSizes;

	/**
	 * Give chunks created a name (chunks with equal name are merged).
	 */
	name?: string | false | Function;

	/**
	 * Compare used exports when checking common modules. Modules will only be put in the same chunk when exports are equal.
	 */
	usedExports?: boolean;
}
type OptimizationSplitChunksSizes = number | { [index: string]: number };
declare abstract class OptionsApply {
	process(options?: any, compiler?: any): void;
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
	 * The filename of asset modules as relative path inside the `output.path` directory.
	 */
	assetModuleFilename?: AssetModuleFilename;

	/**
	 * Add a comment in the UMD wrapper.
	 */
	auxiliaryComment?: AuxiliaryComment;

	/**
	 * Add charset attribute for script tag.
	 */
	charset?: boolean;

	/**
	 * The filename of non-initial chunks as relative path inside the `output.path` directory.
	 */
	chunkFilename?: ChunkFilename;

	/**
	 * The format of chunks (formats included by default are 'array-push' (web/WebWorker), 'commonjs' (node.js), but others might be added by plugins).
	 */
	chunkFormat?: DevTool;

	/**
	 * Number of milliseconds before chunk request expires.
	 */
	chunkLoadTimeout?: number;

	/**
	 * The method of loading chunks (methods included by default are 'jsonp' (web), 'importScripts' (WebWorker), 'require' (sync node.js), 'async-node' (async node.js), but others might be added by plugins).
	 */
	chunkLoading?: DevTool;

	/**
	 * The global variable used by webpack for loading of chunks.
	 */
	chunkLoadingGlobal?: string;

	/**
	 * Check if to be emitted file already exists and have the same content before writing to output filesystem.
	 */
	compareBeforeEmit?: boolean;

	/**
	 * This option enables cross-origin loading of chunks.
	 */
	crossOriginLoading?: CrossOriginLoading;

	/**
	 * Similar to `output.devtoolModuleFilenameTemplate`, but used in the case of duplicate module identifiers.
	 */
	devtoolFallbackModuleFilenameTemplate?: DevtoolFallbackModuleFilenameTemplate;

	/**
	 * Filename template string of function for the sources array in a generated SourceMap.
	 */
	devtoolModuleFilenameTemplate?: DevtoolFallbackModuleFilenameTemplate;

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
	 * Specifies the name of each output file on disk. You must **not** specify an absolute path here! The `output.path` option determines the location on disk the files are written to, filename is used solely for naming the individual files.
	 */
	filename?: Filename;

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
	hashFunction?: HashFunction;

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
	 * The filename of the Hot Update Main File. It is inside the `output.path` directory.
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
	library?: Library;

	/**
	 * Specify which export should be exposed as library.
	 */
	libraryExport?: LibraryExport;

	/**
	 * Type of library (types included by default are 'var', 'module', 'assign', 'this', 'window', 'self', 'global', 'commonjs', 'commonjs2', 'commonjs-module', 'amd', 'amd-require', 'umd', 'umd2', 'jsonp', 'system', but others might be added by plugins).
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
	pathinfo?: boolean;

	/**
	 * The `publicPath` specifies the public URL address of the output files when referenced in a browser.
	 */
	publicPath?: PublicPath;

	/**
	 * This option enables loading async chunks via a custom script type, such as script type="module".
	 */
	scriptType?: ScriptType;

	/**
	 * The filename of the SourceMaps for the JavaScript files. They are inside the `output.path` directory.
	 */
	sourceMapFilename?: string;

	/**
	 * Prefixes every line of the source in the bundle with this string.
	 */
	sourcePrefix?: string;

	/**
	 * Handles exceptions in module loading correctly at a performance cost.
	 */
	strictModuleExceptionHandling?: boolean;

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
	wasmLoading?: DevTool;

	/**
	 * The filename of WebAssembly modules as relative path inside the `output.path` directory.
	 */
	webassemblyModuleFilename?: string;

	/**
	 * The method of loading chunks (methods included by default are 'jsonp' (web), 'importScripts' (WebWorker), 'require' (sync node.js), 'async-node' (async node.js), but others might be added by plugins).
	 */
	workerChunkLoading?: DevTool;

	/**
	 * The method of loading WebAssembly Modules (methods included by default are 'fetch' (web/WebWorker), 'async-node' (node.js), but others might be added by plugins).
	 */
	workerWasmLoading?: DevTool;
}
declare interface OutputFileSystem {
	writeFile: (
		arg0: string,
		arg1: string | Buffer,
		arg2: (arg0: NodeJS.ErrnoException) => void
	) => void;
	mkdir: (arg0: string, arg1: (arg0: NodeJS.ErrnoException) => void) => void;
	stat: (
		arg0: string,
		arg1: (arg0: NodeJS.ErrnoException, arg1: FsStats) => void
	) => void;
	readFile: (
		arg0: string,
		arg1: (arg0: NodeJS.ErrnoException, arg1: Buffer) => void
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
	 * The filename of asset modules as relative path inside the `output.path` directory.
	 */
	assetModuleFilename?: AssetModuleFilename;

	/**
	 * Add charset attribute for script tag.
	 */
	charset?: boolean;

	/**
	 * The filename of non-initial chunks as relative path inside the `output.path` directory.
	 */
	chunkFilename?: ChunkFilename;

	/**
	 * The format of chunks (formats included by default are 'array-push' (web/WebWorker), 'commonjs' (node.js), but others might be added by plugins).
	 */
	chunkFormat?: DevTool;

	/**
	 * Number of milliseconds before chunk request expires.
	 */
	chunkLoadTimeout?: number;

	/**
	 * The method of loading chunks (methods included by default are 'jsonp' (web), 'importScripts' (WebWorker), 'require' (sync node.js), 'async-node' (async node.js), but others might be added by plugins).
	 */
	chunkLoading?: DevTool;

	/**
	 * The global variable used by webpack for loading of chunks.
	 */
	chunkLoadingGlobal?: string;

	/**
	 * Check if to be emitted file already exists and have the same content before writing to output filesystem.
	 */
	compareBeforeEmit?: boolean;

	/**
	 * This option enables cross-origin loading of chunks.
	 */
	crossOriginLoading?: CrossOriginLoading;

	/**
	 * Similar to `output.devtoolModuleFilenameTemplate`, but used in the case of duplicate module identifiers.
	 */
	devtoolFallbackModuleFilenameTemplate?: DevtoolFallbackModuleFilenameTemplate;

	/**
	 * Filename template string of function for the sources array in a generated SourceMap.
	 */
	devtoolModuleFilenameTemplate?: DevtoolFallbackModuleFilenameTemplate;

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
	 * Specifies the name of each output file on disk. You must **not** specify an absolute path here! The `output.path` option determines the location on disk the files are written to, filename is used solely for naming the individual files.
	 */
	filename?: Filename;

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
	hashFunction?: HashFunction;

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
	 * The filename of the Hot Update Main File. It is inside the `output.path` directory.
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
	pathinfo?: boolean;

	/**
	 * The `publicPath` specifies the public URL address of the output files when referenced in a browser.
	 */
	publicPath?: PublicPath;

	/**
	 * This option enables loading async chunks via a custom script type, such as script type="module".
	 */
	scriptType?: ScriptType;

	/**
	 * The filename of the SourceMaps for the JavaScript files. They are inside the `output.path` directory.
	 */
	sourceMapFilename?: string;

	/**
	 * Prefixes every line of the source in the bundle with this string.
	 */
	sourcePrefix?: string;

	/**
	 * Handles exceptions in module loading correctly at a performance cost.
	 */
	strictModuleExceptionHandling?: boolean;

	/**
	 * A unique name of the webpack build to avoid multiple webpack runtimes to conflict when using globals.
	 */
	uniqueName?: string;

	/**
	 * The method of loading WebAssembly Modules (methods included by default are 'fetch' (web/WebWorker), 'async-node' (node.js), but others might be added by plugins).
	 */
	wasmLoading?: DevTool;

	/**
	 * The filename of WebAssembly modules as relative path inside the `output.path` directory.
	 */
	webassemblyModuleFilename?: string;

	/**
	 * The method of loading chunks (methods included by default are 'jsonp' (web), 'importScripts' (WebWorker), 'require' (sync node.js), 'async-node' (async node.js), but others might be added by plugins).
	 */
	workerChunkLoading?: DevTool;

	/**
	 * The method of loading WebAssembly Modules (methods included by default are 'fetch' (web/WebWorker), 'async-node' (node.js), but others might be added by plugins).
	 */
	workerWasmLoading?: DevTool;
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
		source: string | Record<string, any> | Buffer,
		state: Record<string, any> & ParserStateBase
	): Record<string, any> & ParserStateBase;
}
declare interface ParserStateBase {
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
	runtime?: string | SortableSet<string>;
	filename?: string;
	basename?: string;
	query?: string;
	contentHashType?: string;
	contentHash?: string;
	contentHashWithLength?: (arg0: number) => string;
	noChunkHash?: boolean;
	url?: string;
}
type Performance = false | PerformanceOptions;

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
declare interface Plugin {
	apply: () => void;
}
declare interface PnpApiImpl {
	resolveToUnqualified: (arg0: string, arg1: string, arg2?: any) => string;
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
declare interface PrintedElement {
	element: string;
	content: string;
}
declare interface Problem {
	type:
		| "unknown-argument"
		| "unexpected-non-array-in-path"
		| "unexpected-non-object-in-path"
		| "multiple-values-unexpected"
		| "invalid-value";
	path: string;
	argument: string;
	value?: any;
	index?: number;
	expected?: string;
}
declare class Profiler {
	constructor(inspector?: any);
	session: any;
	inspector: any;
	hasSession(): boolean;
	startProfiling(): Promise<void> | Promise<[any, any, any]>;
	sendCommand(method?: any, params?: any): Promise<any>;
	destroy(): Promise<void>;
	stopProfiling(): Promise<any>;
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
	constructor(options: ProgressPluginArgument);
	profile: boolean;
	handler: (percentage: number, msg: string, ...args: string[]) => void;
	modulesCount: number;
	dependenciesCount: number;
	showEntries: boolean;
	showModules: boolean;
	showDependencies: boolean;
	showActiveModules: boolean;
	percentBy: "modules" | "dependencies" | "entries";
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
	percentBy?: "modules" | "dependencies" | "entries";

	/**
	 * Collect profile data for progress steps. Default: false.
	 */
	profile?: boolean;
}
declare class ProvidePlugin {
	constructor(definitions: Record<string, LibraryExport>);
	definitions: Record<string, LibraryExport>;

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
	version?: DevTool;
}

/**
 * Modules that should be provided as shared modules to the share scope. Property names are used as share keys.
 */
declare interface ProvidesObject {
	[index: string]: string | ProvidesConfig;
}
type PublicPath =
	| string
	| ((pathData: PathData, assetInfo: AssetInfo) => string);
declare interface RawChunkGroupOptions {
	preloadOrder?: number;
	prefetchOrder?: number;
}
declare class RawSource extends Source {
	constructor(source: string | Buffer, convertToString: boolean);
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
declare interface RealDependencyLocation {
	start: SourcePosition;
	end?: SourcePosition;
	index?: number;
}
type RecursiveArrayOrRecord =
	| string
	| number
	| bigint
	| boolean
	| Function
	| RegExp
	| RuntimeValue
	| { [index: string]: RecursiveArrayOrRecord }
	| RecursiveArrayOrRecord[];
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
declare interface RenderContextModuleTemplate {
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
}
declare interface RenderContextObject {
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
	filenameTemplate: string | ((arg0: PathData, arg1: AssetInfo) => string);
	pathOptions?: PathData;
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
	constructor(source: Source, name: string);
	replace(start: number, end: number, newValue: string, name: string): void;
	insert(pos: number, newValue: string, name: string): void;
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
	shorten(request: string): string;
}
type ResolveAlias =
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
	resolveResults: Map<string, string>;

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
	contextDependencies?: { add: (T?: any) => void };

	/**
	 * files that was found on file system
	 */
	fileDependencies?: { add: (T?: any) => void };

	/**
	 * dependencies that was not found on file system
	 */
	missingDependencies?: { add: (T?: any) => void };

	/**
	 * set of hooks' calls. For instance, `resolve → parsedResolve → describedResolve`,
	 */
	stack?: Set<string>;

	/**
	 * log function
	 */
	log?: (arg0: string) => void;
}
declare interface ResolveData {
	contextInfo: ModuleFactoryCreateDataContextInfo;
	resolveOptions: ResolveOptionsWebpackOptions;
	context: string;
	request: string;
	dependencies: ModuleDependency[];
	createData: any;
	fileDependencies: LazySet<string>;
	missingDependencies: LazySet<string>;
	contextDependencies: LazySet<string>;

	/**
	 * allow to use the unsafe cache
	 */
	cacheable: boolean;
}
declare interface ResolveOptionsTypes {
	alias: {
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
	}[];
	fallback: {
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
	}[];
	aliasFields: Set<LibraryExport>;
	cachePredicate: (arg0: ResolveRequest) => boolean;
	cacheWithContext: boolean;

	/**
	 * A list of exports field condition names.
	 */
	conditionNames: Set<string>;
	descriptionFiles: string[];
	enforceExtension: boolean;
	exportsFields: Set<LibraryExport>;
	importsFields: Set<LibraryExport>;
	extensions: Set<string>;
	fileSystem: FileSystem;
	unsafeCache: any;
	symlinks: boolean;
	resolver?: Resolver;
	modules: LibraryExport[];
	mainFields: { name: string[]; forceRelative: boolean }[];
	mainFiles: Set<string>;
	plugins: (
		| { apply: (arg0: Resolver) => void }
		| ((this: Resolver, arg1: Resolver) => void)
	)[];
	pnpApi: PnpApiImpl;
	roots: Set<string>;
	fullySpecified: boolean;
	resolveToContext: boolean;
	restrictions: Set<string | RegExp>;
	preferRelative: boolean;
}

/**
 * Options object for resolving requests.
 */
declare interface ResolveOptionsWebpackOptions {
	/**
	 * Redirect module requests.
	 */
	alias?: ResolveAlias;

	/**
	 * Fields in the description file (usually package.json) which are used to redirect requests inside the module.
	 */
	aliasFields?: LibraryExport[];

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
	 * Extensions added to the request when trying to find the file.
	 */
	extensions?: string[];

	/**
	 * Redirect module requests when normal resolving fails.
	 */
	fallback?: ResolveAlias;

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
	mainFields?: LibraryExport[];

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
	plugins?: ("..." | ResolvePluginInstance)[];

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
	 * A list of directories in which requests that are server-relative URLs (starting with '/') are resolved. On non-windows system these requests are tried to resolve as absolute path first.
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

/**
 * Plugin instance.
 */
declare interface ResolvePluginInstance {
	[index: string]: any;

	/**
	 * The run point of the plugin, required method.
	 */
	apply: (resolver?: any) => void;
}
type ResolveRequest = BaseResolveRequest & Partial<ParsedIdentifier>;
declare abstract class Resolver {
	fileSystem: FileSystem;
	options: ResolveOptionsTypes;
	hooks: {
		resolveStep: SyncHook<
			[
				AsyncSeriesBailHook<[ResolveRequest, ResolveContext], ResolveRequest>,
				ResolveRequest
			],
			void
		>;
		noResolve: SyncHook<[ResolveRequest, Error], void>;
		resolve: AsyncSeriesBailHook<
			[ResolveRequest, ResolveContext],
			ResolveRequest
		>;
		result: AsyncSeriesHook<[ResolveRequest, ResolveContext]>;
	};
	ensureHook(
		name:
			| string
			| AsyncSeriesBailHook<[ResolveRequest, ResolveContext], ResolveRequest>
	): AsyncSeriesBailHook<[ResolveRequest, ResolveContext], ResolveRequest>;
	getHook(
		name:
			| string
			| AsyncSeriesBailHook<[ResolveRequest, ResolveContext], ResolveRequest>
	): AsyncSeriesBailHook<[ResolveRequest, ResolveContext], ResolveRequest>;
	resolveSync(context: any, path: string, request: string): DevTool;
	resolve(
		context: any,
		path: string,
		request: string,
		resolveContext: ResolveContext,
		callback: (arg0: Error, arg1: DevTool, arg2: ResolveRequest) => void
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
	direct: WeakMap<any, Resolver & WithOptions>;
	stringified: Map<string, Resolver & WithOptions>;
}
declare abstract class ResolverFactory {
	hooks: Readonly<{
		resolveOptions: HookMap<
			SyncWaterfallHook<
				[
					{
						/**
						 * Redirect module requests.
						 */
						alias?: ResolveAlias;
						/**
						 * Fields in the description file (usually package.json) which are used to redirect requests inside the module.
						 */
						aliasFields?: LibraryExport[];
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
						 * Extensions added to the request when trying to find the file.
						 */
						extensions?: string[];
						/**
						 * Redirect module requests when normal resolving fails.
						 */
						fallback?: ResolveAlias;
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
						mainFields?: LibraryExport[];
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
						plugins?: ("..." | ResolvePluginInstance)[];
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
						 * A list of directories in which requests that are server-relative URLs (starting with '/') are resolved. On non-windows system these requests are tried to resolve as absolute path first.
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
						dependencyType?: string;
						resolveToContext?: boolean;
					}
				]
			>
		>;
		resolver: HookMap<
			SyncHook<
				[
					Resolver,
					UserResolveOptions,
					{
						/**
						 * Redirect module requests.
						 */
						alias?: ResolveAlias;
						/**
						 * Fields in the description file (usually package.json) which are used to redirect requests inside the module.
						 */
						aliasFields?: LibraryExport[];
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
						 * Extensions added to the request when trying to find the file.
						 */
						extensions?: string[];
						/**
						 * Redirect module requests when normal resolving fails.
						 */
						fallback?: ResolveAlias;
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
						mainFields?: LibraryExport[];
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
						plugins?: ("..." | ResolvePluginInstance)[];
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
						 * A list of directories in which requests that are server-relative URLs (starting with '/') are resolved. On non-windows system these requests are tried to resolve as absolute path first.
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
						dependencyType?: string;
						resolveToContext?: boolean;
					}
				],
				void
			>
		>;
	}>;
	cache: Map<string, ResolverCache>;
	get(
		type: string,
		resolveOptions?: {
			/**
			 * Redirect module requests.
			 */
			alias?: ResolveAlias;
			/**
			 * Fields in the description file (usually package.json) which are used to redirect requests inside the module.
			 */
			aliasFields?: LibraryExport[];
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
			 * Extensions added to the request when trying to find the file.
			 */
			extensions?: string[];
			/**
			 * Redirect module requests when normal resolving fails.
			 */
			fallback?: ResolveAlias;
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
			mainFields?: LibraryExport[];
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
			plugins?: ("..." | ResolvePluginInstance)[];
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
			 * A list of directories in which requests that are server-relative URLs (starting with '/') are resolved. On non-windows system these requests are tried to resolve as absolute path first.
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
			dependencyType?: string;
			resolveToContext?: boolean;
		}
	): Resolver & WithOptions;
}
declare interface RuleSet {
	/**
	 * map of references in the rule set (may grow over time)
	 */
	references: Map<string, any>;

	/**
	 * execute the rule set
	 */
	exec: (arg0?: any) => Effect[];
}
type RuleSetCondition =
	| string
	| RegExp
	| {
			/**
			 * Logical AND.
			 */
			and?: RuleSetCondition[];
			/**
			 * Logical NOT.
			 */
			not?: RuleSetCondition[];
			/**
			 * Logical OR.
			 */
			or?: RuleSetCondition[];
	  }
	| ((value: string) => boolean)
	| RuleSetCondition[];
type RuleSetConditionAbsolute =
	| string
	| RegExp
	| {
			/**
			 * Logical AND.
			 */
			and?: RuleSetConditionAbsolute[];
			/**
			 * Logical NOT.
			 */
			not?: RuleSetConditionAbsolute[];
			/**
			 * Logical OR.
			 */
			or?: RuleSetConditionAbsolute[];
	  }
	| ((value: string) => boolean)
	| RuleSetConditionAbsolute[];
type RuleSetLoaderOptions = string | { [index: string]: any };

/**
 * A rule description with conditions and effects for modules.
 */
declare interface RuleSetRule {
	/**
	 * Match the child compiler name.
	 */
	compiler?: RuleSetCondition;

	/**
	 * Match dependency type.
	 */
	dependency?: RuleSetCondition;

	/**
	 * Match values of properties in the description file (usually package.json).
	 */
	descriptionData?: { [index: string]: RuleSetCondition };

	/**
	 * Enforce this rule as pre or post step.
	 */
	enforce?: "pre" | "post";

	/**
	 * Shortcut for resource.exclude.
	 */
	exclude?: RuleSetConditionAbsolute;

	/**
	 * The options for the module generator.
	 */
	generator?: { [index: string]: any };

	/**
	 * Shortcut for resource.include.
	 */
	include?: RuleSetConditionAbsolute;

	/**
	 * Match the issuer of the module (The module pointing to this module).
	 */
	issuer?: RuleSetConditionAbsolute;

	/**
	 * Shortcut for use.loader.
	 */
	loader?: string;

	/**
	 * Match module mimetype when load from Data URI.
	 */
	mimetype?: RuleSetCondition;

	/**
	 * Only execute the first matching rule in this array.
	 */
	oneOf?: RuleSetRule[];

	/**
	 * Shortcut for use.options.
	 */
	options?: RuleSetLoaderOptions;

	/**
	 * Options for parsing.
	 */
	parser?: { [index: string]: any };

	/**
	 * Match the real resource path of the module.
	 */
	realResource?: RuleSetConditionAbsolute;

	/**
	 * Options for the resolver.
	 */
	resolve?: ResolveOptionsWebpackOptions;

	/**
	 * Match the resource path of the module.
	 */
	resource?: RuleSetConditionAbsolute;

	/**
	 * Match the resource fragment of the module.
	 */
	resourceFragment?: RuleSetCondition;

	/**
	 * Match the resource query of the module.
	 */
	resourceQuery?: RuleSetCondition;

	/**
	 * Match and execute these rules when this rule is matched.
	 */
	rules?: RuleSetRule[];

	/**
	 * Flags a module as with or without side effects.
	 */
	sideEffects?: boolean;

	/**
	 * Shortcut for resource.test.
	 */
	test?: RuleSetConditionAbsolute;

	/**
	 * Module type to use for the module.
	 */
	type?: string;

	/**
	 * Modifiers applied to the module when rule is matched.
	 */
	use?: RuleSetUse;
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
			options?: RuleSetLoaderOptions;
	  }
	| ((data: {}) =>
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
					options?: RuleSetLoaderOptions;
			  }
			| __TypeWebpackOptions
			| RuleSetUseItem[]);
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
			options?: RuleSetLoaderOptions;
	  }
	| __TypeWebpackOptions;
type Rules = string | RegExp | (string | RegExp)[];
declare class RuntimeChunkPlugin {
	constructor(options?: any);
	options: any;

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare class RuntimeModule extends Module {
	constructor(name: string, stage?: number);
	name: string;
	stage: number;
	compilation: Compilation;
	chunk: Chunk;
	fullHash: boolean;
	attach(compilation: Compilation, chunk: Chunk): void;
	generate(): string;
	getGeneratedCode(): string;
	shouldIsolate(): boolean;
}
declare abstract class RuntimeSpecMap<T> {
	get(runtime: string | SortableSet<string>): T;
	has(runtime: string | SortableSet<string>): boolean;
	set(runtime?: any, value?: any): void;
	delete(runtime?: any): void;
	update(runtime?: any, fn?: any): void;
	keys(): (string | SortableSet<string>)[];
	values(): IterableIterator<T>;
}
declare abstract class RuntimeSpecSet {
	add(runtime?: any): void;
	[Symbol.iterator](): IterableIterator<string | SortableSet<string>>;
	readonly size: number;
}
declare abstract class RuntimeTemplate {
	outputOptions: OutputNormalized;
	requestShortener: RequestShortener;
	isIIFE(): boolean;
	supportsConst(): boolean;
	supportsArrowFunction(): boolean;
	supportsForOf(): boolean;
	supportsDestructuring(): boolean;
	supportsBigIntLiteral(): boolean;
	supportsDynamicImport(): boolean;
	supportsEcmaScriptModuleSyntax(): boolean;
	supportTemplateLiteral(): boolean;
	returningFunction(returnValue?: any, args?: string): string;
	basicFunction(args?: any, body?: any): string;
	destructureArray(items?: any, value?: any): string;
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
		exportName: LibraryExport;
		/**
		 * the origin module
		 */
		originModule: Module;
		/**
		 * true, if location is safe for ASI, a bracket can be emitted
		 */
		asiSafe: boolean;
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
		initFragments: InitFragment[];
		/**
		 * runtime for which this code will be generated
		 */
		runtime: string | SortableSet<string>;
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
}
declare abstract class RuntimeValue {
	fn: any;
	fileDependencies: any;
	exec(parser?: any): any;
}
declare interface ScopeInfo {
	definitions: StackedMap<string, ScopeInfo | VariableInfo>;
	topLevelScope: boolean | "arrow";
	inShorthand: boolean;
	isStrict: boolean;
	isAsmJs: boolean;
	inTry: boolean;
}
type ScriptType = false | "module" | "text/javascript";
declare abstract class Serializer {
	serializeMiddlewares: any;
	deserializeMiddlewares: any;
	context: any;
	serialize(obj?: any, context?: any): any;
	deserialize(value?: any, context?: any): any;
}
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
	import?: DevTool;

	/**
	 * Package name to determine required version from description file. This is only needed when package name can't be automatically determined from request.
	 */
	packageName?: string;

	/**
	 * Version requirement from module in share scope.
	 */
	requiredVersion?: DevTool;

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
	version?: DevTool;
}

/**
 * Modules that should be shared in the share scope. Property names are used to match requested modules in this compilation. Relative requests are resolved, module requests are matched unresolved, absolute paths will match resolved requests. A trailing slash will match all requests with this prefix. In this case shareKey must also have a trailing slash.
 */
declare interface SharedObject {
	[index: string]: string | SharedConfig;
}
declare class SideEffectsFlagPlugin {
	constructor();

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
	startTime: number;
	fileTimestamps: Map<string, FileSystemInfoEntry>;
	fileHashes: Map<string, string>;
	fileTshs: Map<string, string | TimestampAndHash>;
	contextTimestamps: Map<string, FileSystemInfoEntry>;
	contextHashes: Map<string, string>;
	contextTshs: Map<string, string | TimestampAndHash>;
	missingExistence: Map<string, boolean>;
	managedItemInfo: Map<string, string>;
	managedFiles: Set<string>;
	managedContexts: Set<string>;
	managedMissing: Set<string>;
	children: Set<Snapshot>;
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
	immutablePaths?: string[];

	/**
	 * List of paths that are managed by a package manager and can be trusted to not be modified otherwise.
	 */
	managedPaths?: string[];

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
	readonly [Symbol.toStringTag]: string;
}
declare class Source {
	constructor();
	size(): number;
	map(options: MapOptions): Object;
	sourceAndMap(options: MapOptions): { source: string | Buffer; map: Object };
	updateHash(hash: Hash): void;
	source(): string | Buffer;
	buffer(): Buffer;
}
declare interface SourceData {
	iife?: boolean;
	init?: string;
	expression: string;
}
declare interface SourceLike {
	source(): string | Buffer;
}
declare class SourceMapDevToolPlugin {
	constructor(options?: SourceMapDevToolPluginOptions);
	sourceMapFilename: DevTool;
	sourceMappingURLComment: DevTool;
	moduleFilenameTemplate: DevtoolFallbackModuleFilenameTemplate;
	fallbackModuleFilenameTemplate: DevtoolFallbackModuleFilenameTemplate;
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
	append?: DevTool;

	/**
	 * Indicates whether column mappings should be used (defaults to true).
	 */
	columns?: boolean;

	/**
	 * Exclude modules that match the given value from source map generation.
	 */
	exclude?: Rules;

	/**
	 * Generator string or function to create identifiers of modules for the 'sources' array in the SourceMap used only if 'moduleFilenameTemplate' would result in a conflict.
	 */
	fallbackModuleFilenameTemplate?: DevtoolFallbackModuleFilenameTemplate;

	/**
	 * Path prefix to which the [file] placeholder is relative to.
	 */
	fileContext?: string;

	/**
	 * Defines the output filename of the SourceMap (will be inlined if no value is provided).
	 */
	filename?: DevTool;

	/**
	 * Include source maps for module paths that match the given value.
	 */
	include?: Rules;

	/**
	 * Indicates whether SourceMaps from loaders should be used (defaults to true).
	 */
	module?: boolean;

	/**
	 * Generator string or function to create identifiers of modules for the 'sources' array in the SourceMap.
	 */
	moduleFilenameTemplate?: DevtoolFallbackModuleFilenameTemplate;

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
	test?: Rules;
}
declare class SourceMapSource extends Source {
	constructor(
		source: string | Buffer,
		name: string,
		sourceMap: string | Object | Buffer,
		originalSource: string | Buffer,
		innerSourceMap: string | Object | Buffer
	);
	getArgsAsBuffers(): [Buffer, string, Buffer, Buffer, Buffer];
}
declare interface SourcePosition {
	line: number;
	column?: number;
}
declare interface SplitChunksOptions {
	chunksFilter: (chunk: Chunk) => boolean;
	defaultSizeTypes: string[];
	minSize: Record<string, number>;
	minRemainingSize: Record<string, number>;
	enforceSizeThreshold: Record<string, number>;
	maxInitialSize: Record<string, number>;
	maxAsyncSize: Record<string, number>;
	minChunks: number;
	maxAsyncRequests: number;
	maxInitialRequests: number;
	hidePathInfo: boolean;
	filename: string | ((arg0: PathData, arg1: AssetInfo) => string);
	automaticNameDelimiter: string;
	getCacheGroups: (
		module: Module,
		context: CacheGroupsContext
	) => CacheGroupSource[];
	getName: (module?: Module, chunks?: Chunk[], key?: string) => string;
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
declare abstract class StackedMap<K, V> {
	map: Map<K, V | typeof TOMBSTONE | typeof UNDEFINED_MARKER>;
	stack: Map<K, V | typeof TOMBSTONE | typeof UNDEFINED_MARKER>[];
	set(item: K, value: V): void;
	delete(item: K): void;
	has(item: K): boolean;
	get(item: K): V;
	asArray(): K[];
	asSet(): Set<K>;
	asPairArray(): [K, V][];
	asMap(): Map<K, V>;
	readonly size: number;
	createChild(): StackedMap<K, V>;
}
type Statement =
	| FunctionDeclaration
	| VariableDeclaration
	| ClassDeclaration
	| ExpressionStatement
	| BlockStatement
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
	readonly hash: string;
	readonly startTime: any;
	readonly endTime: any;
	hasWarnings(): boolean;
	hasErrors(): boolean;
	toJson(options?: any): any;
	toString(options?: any): string;
}
declare abstract class StatsFactory {
	hooks: Readonly<{
		extract: HookMap<SyncBailHook<[any, any, any], any>>;
		filter: HookMap<SyncBailHook<[any, any, number, number], any>>;
		sort: HookMap<
			SyncBailHook<[((arg0?: any, arg1?: any) => number)[], any], any>
		>;
		filterSorted: HookMap<SyncBailHook<[any, any, number, number], any>>;
		groupResults: HookMap<SyncBailHook<[GroupConfig<any, any>[], any], any>>;
		sortResults: HookMap<
			SyncBailHook<[((arg0?: any, arg1?: any) => number)[], any], any>
		>;
		filterResults: HookMap<SyncBailHook<any, any>>;
		merge: HookMap<SyncBailHook<[any[], any], any>>;
		result: HookMap<SyncBailHook<[any[], any], any>>;
		getItemName: HookMap<SyncBailHook<[any, any], any>>;
		getItemFactory: HookMap<SyncBailHook<[any, any], any>>;
	}>;
	create(type?: any, data?: any, baseContext?: any): any;
}

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
	 * Add information about cached (not built) modules.
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
	errorDetails?: boolean;

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
		| FilterItemTypes[]
		| ((value: string) => boolean);

	/**
	 * Suppress assets that match the specified filters. Filters can be Strings, RegExps or Functions.
	 */
	excludeAssets?: FilterTypes;

	/**
	 * Suppress modules that match the specified filters. Filters can be Strings, RegExps, Booleans or Functions.
	 */
	excludeModules?:
		| string
		| boolean
		| RegExp
		| FilterItemTypes[]
		| ((value: string) => boolean);

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
	 * Group modules by their path.
	 */
	groupModulesByPath?: boolean;

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
	logging?: boolean | "none" | "verbose" | "error" | "warn" | "info" | "log";

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
	 * Space to display modules (groups will be collapsed to fit this space, values is in number of modules/groups).
	 */
	modulesSpace?: number;

	/**
	 * Add information about modules nested in other modules (like with module concatenation).
	 */
	nestedModules?: boolean;

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
	 * Add information about assets that are related to other assets (like SourceMaps for assets).
	 */
	relatedAssets?: boolean;

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
	warningsFilter?: FilterTypes;
}
declare abstract class StatsPrinter {
	hooks: Readonly<{
		sortElements: HookMap<SyncBailHook<[string[], {}], true>>;
		printElements: HookMap<SyncBailHook<[PrintedElement[], {}], string>>;
		sortItems: HookMap<SyncBailHook<[any[], {}], true>>;
		getItemName: HookMap<SyncBailHook<[any, {}], string>>;
		printItems: HookMap<SyncBailHook<[string[], {}], string>>;
		print: HookMap<SyncBailHook<[{}, {}], string>>;
		result: HookMap<SyncWaterfallHook<[string, {}]>>;
	}>;
	print(type: string, object?: any, baseContext?: any): string;
}
type StatsValue =
	| boolean
	| "none"
	| "summary"
	| "errors-only"
	| "errors-warnings"
	| "minimal"
	| "normal"
	| "detailed"
	| "verbose"
	| StatsOptions;
declare interface SyntheticDependencyLocation {
	name: string;
	index?: number;
}
declare const TOMBSTONE: unique symbol;
declare const TRANSITIVE_ONLY: unique symbol;
declare interface TagInfo {
	tag: any;
	data: any;
	next: TagInfo;
}
type Target = string | false | [string, ...string[]];
declare class Template {
	constructor();
	static getFunctionContent(fn: Function): string;
	static toIdentifier(str: string): string;
	static toComment(str: string): string;
	static toNormalComment(str: string): string;
	static toPath(str: string): string;
	static numberToIdentifier(n: number): string;
	static numberToIdentifierContinuation(n: number): string;
	static indent(s: LibraryExport): string;
	static prefix(s: LibraryExport, prefix: string): string;
	static asString(str: LibraryExport): string;
	static getModulesArrayBounds(modules: WithId[]): false | [number, number];
	static renderChunkModules(
		renderContext: RenderContextModuleTemplate,
		modules: Module[],
		renderModule: (arg0: Module) => Source,
		prefix?: string
	): Source;
	static renderRuntimeModules(
		runtimeModules: RuntimeModule[],
		renderContext: RenderContextModuleTemplate
	): Source;
	static renderChunkRuntimeModules(
		runtimeModules: RuntimeModule[],
		renderContext: RenderContextModuleTemplate
	): Source;
	static NUMBER_OF_IDENTIFIER_START_CHARS: number;
	static NUMBER_OF_IDENTIFIER_CONTINUATION_CHARS: number;
}
declare interface TimestampAndHash {
	safeTime: number;
	timestamp?: number;
	timestampHash?: string;
	hash: string;
}
declare const UNDEFINED_MARKER: unique symbol;
declare interface UpdateHashContextDependency {
	chunkGraph: ChunkGraph;
	runtime: string | SortableSet<string>;
}
declare interface UpdateHashContextGenerator {
	/**
	 * the module
	 */
	module: NormalModule;
	chunkGraph: ChunkGraph;
	runtime: string | SortableSet<string>;
}
declare interface UserResolveOptions {
	/**
	 * A list of module alias configurations or an object which maps key to value
	 */
	alias?:
		| { [index: string]: string | false | string[] }
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
		  }[];

	/**
	 * A list of module alias configurations or an object which maps key to value, applied only after modules option
	 */
	fallback?:
		| { [index: string]: string | false | string[] }
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
		  }[];

	/**
	 * A list of alias fields in description files
	 */
	aliasFields?: LibraryExport[];

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
	exportsFields?: LibraryExport[];

	/**
	 * A list of imports fields in description files
	 */
	importsFields?: LibraryExport[];

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
	unsafeCache?: any;

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
	modules?: LibraryExport;

	/**
	 * A list of main fields in description files
	 */
	mainFields?: (
		| string
		| string[]
		| { name: LibraryExport; forceRelative: boolean }
	)[];

	/**
	 * A list of main files in directories
	 */
	mainFiles?: string[];

	/**
	 * A list of additional resolve plugins which should be applied
	 */
	plugins?: (
		| { apply: (arg0: Resolver) => void }
		| ((this: Resolver, arg1: Resolver) => void)
	)[];

	/**
	 * A PnP API that should be used - null is "never", undefined is "auto"
	 */
	pnpApi?: PnpApiImpl;

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
	 * Use only the sync constiants of the file system calls
	 */
	useSyncFileSystemCalls?: boolean;

	/**
	 * Prefer to resolve module requests as relative requests before falling back to modules
	 */
	preferRelative?: boolean;
}
declare abstract class VariableInfo {
	declaredScope: ScopeInfo;
	freeName: string | true;
	tagInfo: TagInfo;
}
declare interface WatchFileSystem {
	watch: (
		files: Iterable<string>,
		directories: Iterable<string>,
		missing: Iterable<string>,
		startTime: number,
		options: WatchOptions,
		callback: (
			arg0: Error,
			arg1: Map<string, FileSystemInfoEntry>,
			arg2: Map<string, FileSystemInfoEntry>,
			arg3: Set<string>,
			arg4: Set<string>
		) => void,
		callbackUndelayed: (arg0: string, arg1: number) => void
	) => Watcher;
}
declare class WatchIgnorePlugin {
	constructor(options: WatchIgnorePluginOptions);
	paths: [string | RegExp, ...(string | RegExp)[]];

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare interface WatchIgnorePluginOptions {
	/**
	 * A list of RegExps or absolute paths to directories or files that should be ignored.
	 */
	paths: [string | RegExp, ...(string | RegExp)[]];
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
	 * get info about files
	 */
	getFileTimeInfoEntries: () => Map<string, FileSystemInfoEntry>;

	/**
	 * get info about directories
	 */
	getContextTimeInfoEntries: () => Map<string, FileSystemInfoEntry>;
}
declare abstract class Watching {
	startTime: number;
	invalid: boolean;
	handler: CallbackFunction<Stats>;
	callbacks: CallbackFunction<void>[];
	closed: boolean;
	suspended: boolean;
	watchOptions: {
		/**
		 * Delay the rebuilt after the first change. Value is a time in ms.
		 */
		aggregateTimeout?: number;
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
	watcher: any;
	pausedWatcher: any;
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
declare class WebWorkerTemplatePlugin {
	constructor();

	/**
	 * Apply the plugin
	 */
	apply(compiler: Compiler): void;
}
declare interface WebpackError extends Error {
	details: any;
	module: Module;
	loc: SyntheticDependencyLocation | RealDependencyLocation;
	hideStack: boolean;
	chunk: Chunk;
	file: string;
	serialize(__0: { write: any }): void;
	deserialize(__0: { read: any }): void;
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
	amd?: Amd;

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
	devtool?: DevTool;

	/**
	 * The entry point(s) of the compilation.
	 */
	entry: EntryNormalized;

	/**
	 * Enables/Disables experiments (experimental features with relax SemVer compatibility).
	 */
	experiments: Experiments;

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
	externalsType?: ExternalsType;

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
	mode?: Mode;

	/**
	 * Options affecting the normal modules (`NormalModuleFactory`).
	 */
	module: ModuleOptions;

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
	performance?: Performance;

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
	recordsInputPath?: DevTool;

	/**
	 * Load compiler state from a json file.
	 */
	recordsOutputPath?: DevTool;

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
	target?: Target;

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
		arg0: Partial<{
			/**
			 * Redirect module requests.
			 */
			alias?: ResolveAlias;
			/**
			 * Fields in the description file (usually package.json) which are used to redirect requests inside the module.
			 */
			aliasFields?: LibraryExport[];
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
			 * Extensions added to the request when trying to find the file.
			 */
			extensions?: string[];
			/**
			 * Redirect module requests when normal resolving fails.
			 */
			fallback?: ResolveAlias;
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
			mainFields?: LibraryExport[];
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
			plugins?: ("..." | ResolvePluginInstance)[];
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
			 * A list of directories in which requests that are server-relative URLs (starting with '/') are resolved. On non-windows system these requests are tried to resolve as absolute path first.
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
			dependencyType?: string;
			resolveToContext?: boolean;
		}>
	) => Resolver & WithOptions;
}
type __TypeWebpackOptions = (data: {}) =>
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
			options?: RuleSetLoaderOptions;
	  }
	| __TypeWebpackOptions
	| RuleSetUseItem[];
declare function exports(
	options: Configuration,
	callback?: CallbackWebpack<Stats>
): Compiler;
declare function exports(
	options: Configuration[],
	callback?: CallbackWebpack<MultiStats>
): MultiCompiler;
declare namespace exports {
	export const webpack: {
		(options: Configuration, callback?: CallbackWebpack<Stats>): Compiler;
		(
			options: Configuration[],
			callback?: CallbackWebpack<MultiStats>
		): MultiCompiler;
	};
	export const validate: (options?: any) => void;
	export const validateSchema: (schema?: any, options?: any) => void;
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
		) => Problem[];
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
			module: any,
			options: any,
			__2: { requestShortener: any; chunkGraph: any }
		) => any;
		export let replaceDuplicates: (
			array?: any,
			fn?: any,
			comparator?: any
		) => any;
		export let matchPart: (str?: any, test?: any) => any;
		export let matchObject: (obj?: any, str?: any) => boolean;
	}
	export namespace RuntimeGlobals {
		export let require: string;
		export let requireScope: string;
		export let exports: string;
		export let thisAsExports: string;
		export let returnExportsFromRuntime: string;
		export let module: string;
		export let moduleId: string;
		export let moduleLoaded: string;
		export let publicPath: string;
		export let entryModuleId: string;
		export let moduleCache: string;
		export let moduleFactories: string;
		export let moduleFactoriesAddOnly: string;
		export let ensureChunk: string;
		export let ensureChunkHandlers: string;
		export let ensureChunkIncludeEntries: string;
		export let prefetchChunk: string;
		export let prefetchChunkHandlers: string;
		export let preloadChunk: string;
		export let preloadChunkHandlers: string;
		export let definePropertyGetters: string;
		export let makeNamespaceObject: string;
		export let createFakeNamespaceObject: string;
		export let compatGetDefaultExport: string;
		export let harmonyModuleDecorator: string;
		export let nodeModuleDecorator: string;
		export let getFullHash: string;
		export let wasmInstances: string;
		export let instantiateWasm: string;
		export let uncaughtErrorHandler: string;
		export let scriptNonce: string;
		export let loadScript: string;
		export let chunkName: string;
		export let getChunkScriptFilename: string;
		export let getChunkUpdateScriptFilename: string;
		export let startup: string;
		export let startupNoDefault: string;
		export let startupEntrypoint: string;
		export let externalInstallChunk: string;
		export let interceptModuleExecution: string;
		export let global: string;
		export let shareScopeMap: string;
		export let initializeSharing: string;
		export let currentRemoteGetScope: string;
		export let getUpdateManifestFilename: string;
		export let hmrDownloadManifest: string;
		export let hmrDownloadUpdateHandlers: string;
		export let hmrModuleData: string;
		export let hmrInvalidateModuleHandlers: string;
		export let amdDefine: string;
		export let amdOptions: string;
		export let system: string;
		export let hasOwnProperty: string;
		export let systemContext: string;
		export let baseURI: string;
	}
	export const UsageState: Readonly<{
		Unused: 0;
		OnlyPropertiesUsed: 1;
		NoInfo: 2;
		Unknown: 3;
		Used: 4;
	}>;
	export const WebpackOptionsValidationError: ValidationError;
	export const ValidationError: ValidationError;
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
		export {
			AggressiveMergingPlugin,
			AggressiveSplittingPlugin,
			LimitChunkCountPlugin,
			MinChunkSizePlugin,
			ModuleConcatenationPlugin,
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
		export { AsyncWebAssemblyModulesPlugin };
	}
	export namespace library {
		export { AbstractLibraryPlugin, EnableLibraryPlugin };
	}
	export namespace container {
		export const scope: <T>(
			scope: string,
			options:
				| Record<string, string | string[] | T>
				| (string | Record<string, string | string[] | T>)[]
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
			options:
				| Record<string, string | string[] | T>
				| (string | Record<string, string | string[] | T>)[]
		) => Record<string, string | string[] | T>;
		export { ConsumeSharedPlugin, ProvideSharedPlugin, SharePlugin };
	}
	export namespace debug {
		export { ProfilingPlugin };
	}
	export namespace util {
		export const createHash: (algorithm: HashFunction) => Hash;
		export namespace comparators {
			export let compareChunksById: (a: Chunk, b: Chunk) => 0 | 1 | -1;
			export let compareModulesByIdentifier: (
				a: Module,
				b: Module
			) => 0 | 1 | -1;
			export let compareModulesById: (
				arg0: ChunkGraph
			) => (arg0: Module, arg1: Module) => 0 | 1 | -1;
			export let compareNumbers: (a: number, b: number) => 0 | 1 | -1;
			export let compareStringsNumeric: (a: string, b: string) => 0 | 1 | -1;
			export let compareModulesByPostOrderIndexOrIdentifier: (
				arg0: ModuleGraph
			) => (arg0: Module, arg1: Module) => 0 | 1 | -1;
			export let compareModulesByPreOrderIndexOrIdentifier: (
				arg0: ModuleGraph
			) => (arg0: Module, arg1: Module) => 0 | 1 | -1;
			export let compareModulesByIdOrIdentifier: (
				arg0: ChunkGraph
			) => (arg0: Module, arg1: Module) => 0 | 1 | -1;
			export let compareChunks: (
				arg0: ChunkGraph
			) => (arg0: Chunk, arg1: Chunk) => 0 | 1 | -1;
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
				c1: (arg0: T, arg1: T) => 0 | 1 | -1,
				c2: (arg0: T, arg1: T) => 0 | 1 | -1,
				...cRest: ((arg0: T, arg1: T) => 0 | 1 | -1)[]
			) => (arg0: T, arg1: T) => 0 | 1 | -1;
			export let compareSelect: <T, R>(
				getter: (input: T) => R,
				comparator: (arg0: R, arg1: R) => 0 | 1 | -1
			) => (arg0: T, arg1: T) => 0 | 1 | -1;
			export let compareIterables: <T>(
				elementComparator: (arg0: T, arg1: T) => 0 | 1 | -1
			) => (arg0: Iterable<T>, arg1: Iterable<T>) => 0 | 1 | -1;
			export let keepOriginalOrder: <T>(
				iterable: Iterable<T>
			) => (arg0: T, arg1: T) => 0 | 1 | -1;
			export let compareChunksNatural: (
				chunkGraph: ChunkGraph
			) => (arg0: Chunk, arg1: Chunk) => 0 | 1 | -1;
			export let compareLocations: (
				a: SyntheticDependencyLocation | RealDependencyLocation,
				b: SyntheticDependencyLocation | RealDependencyLocation
			) => 0 | 1 | -1;
		}
		export namespace serialization {
			export let register: (
				Constructor: { new (...params: any[]): any },
				request: string,
				name: string,
				serializer: ObjectSerializer
			) => void;
			export let registerLoader: (
				regExp: RegExp,
				loader: (arg0: string) => boolean
			) => void;
			export let registerNotSerializable: (Constructor: {
				new (...params: any[]): any;
			}) => void;
			export let NOT_SERIALIZABLE: {};
			export let buffersSerializer: Serializer;
			export let createFileSerializer: (fs?: any) => Serializer;
			export { MEASURE_START_OPERATION, MEASURE_END_OPERATION };
		}
		export const cleverMerge: <T, O>(first: T, second: O) => T & O;
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
			export { HttpUriPlugin, HttpsUriPlugin };
		}
	}
	export type WebpackPluginFunction = (
		this: Compiler,
		compiler: Compiler
	) => void;
	export type ParserState = Record<string, any> & ParserStateBase;
	export {
		AutomaticPrefetchPlugin,
		BannerPlugin,
		Cache,
		Chunk,
		ChunkGraph,
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
		WebpackOptionsApply,
		WebpackOptionsDefaulter,
		Entry,
		EntryNormalized,
		LibraryOptions,
		ModuleOptions,
		ResolveOptionsWebpackOptions as ResolveOptions,
		RuleSetCondition,
		RuleSetConditionAbsolute,
		RuleSetRule,
		RuleSetUse,
		RuleSetUseItem,
		Configuration,
		WebpackOptionsNormalized,
		WebpackPluginInstance
	};
}

export = exports;
