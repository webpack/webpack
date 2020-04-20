/**
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn special-lint-fix` to update
 */

import {
	ArrayExpression,
	ArrowFunctionExpression,
	AssignmentExpression,
	AwaitExpression,
	BinaryExpression,
	BlockStatement,
	BreakStatement,
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
	ExpressionStatement,
	ForInStatement,
	ForOfStatement,
	ForStatement,
	FunctionDeclaration,
	FunctionExpression,
	Identifier,
	IfStatement,
	ImportDeclaration,
	LabeledStatement,
	LogicalExpression,
	MemberExpression,
	MetaProperty,
	MethodDefinition,
	NewExpression,
	ObjectExpression,
	Program,
	RegExpLiteral,
	ReturnStatement,
	SequenceExpression,
	SimpleCallExpression,
	SimpleLiteral,
	Super,
	SwitchStatement,
	TaggedTemplateExpression,
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

declare namespace webpack {
	export class AbstractLibraryPlugin<T> {
		constructor(__0: {
			/**
			 * name of the plugin
			 */
			pluginName: string;
			/**
			 * used library type
			 */
			type:
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
				| "system";
		});

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
		parseOptions(library: webpack.LibraryOptions): false | T;
		finishEntryModule(
			module: webpack.Module,
			libraryContext: webpack.LibraryContext<T>
		): void;
		runtimeRequirements(
			chunk: webpack.Chunk,
			set: Set<string>,
			libraryContext: webpack.LibraryContext<T>
		): void;
		render(
			source: webpack.Source,
			renderContext: webpack.RenderContextJavascriptModulesPlugin,
			libraryContext: webpack.LibraryContext<T>
		): webpack.Source;
		chunkHash(
			chunk: webpack.Chunk,
			hash: webpack.Hash,
			chunkHashContext: webpack.ChunkHashContext,
			libraryContext: webpack.LibraryContext<T>
		): void;
	}
	export class AggressiveMergingPlugin {
		constructor(options?: any);
		options: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
	}
	export class AggressiveSplittingPlugin {
		constructor(options?: webpack.AggressiveSplittingPluginOptions);
		options: webpack.AggressiveSplittingPluginOptions;

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
		static wasChunkRecorded(chunk: webpack.Chunk): boolean;
	}

	/**
	 * This file was automatically generated.
	 * DO NOT MODIFY BY HAND.
	 * Run `yarn special-lint-fix` to update
	 */
	export interface AggressiveSplittingPluginOptions {
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
	export type Amd = false | { [index: string]: any };
	export interface Argument {
		description: string;
		simpleType: "string" | "number" | "boolean";
		multiple: boolean;
		configs: Array<webpack.ArgumentConfig>;
	}
	export interface ArgumentConfig {
		description: string;
		path: string;
		multiple: boolean;
		type:
			| "string"
			| "number"
			| "boolean"
			| "path"
			| "enum"
			| "RegExp"
			| "reset";
		values?: Array<any>;
	}
	export interface Asset {
		/**
		 * the filename of the asset
		 */
		name: string;

		/**
		 * source of the asset
		 */
		source: webpack.Source;

		/**
		 * info about the asset
		 */
		info: webpack.AssetInfo;
	}
	export interface AssetEmittedInfo {
		content: Buffer;
		source: webpack.Source;
		compilation: webpack.Compilation;
		outputPath: string;
		targetPath: string;
	}
	export interface AssetInfo {
		/**
		 * true, if the asset can be long term cached forever (contains a hash)
		 */
		immutable?: boolean;

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
	}
	export type AssetModuleFilename =
		| string
		| ((pathData: webpack.PathData, assetInfo: webpack.AssetInfo) => string);
	export abstract class AsyncDependenciesBlock extends webpack.DependenciesBlock {
		groupOptions: {
			preloadOrder?: number;
			prefetchOrder?: number;
			name: string;
		};
		loc: webpack.SyntheticDependencyLocation | webpack.RealDependencyLocation;
		request: string;
		parent: webpack.DependenciesBlock;
		chunkName: string;
		module: any;
	}
	export abstract class AsyncQueue<T, K, R> {
		hooks: {
			beforeAdd: AsyncSeriesHook<[T]>;
			added: SyncHook<[T], void>;
			beforeStart: AsyncSeriesHook<[T]>;
			started: SyncHook<[T], void>;
			result: SyncHook<[T, Error, R], void>;
		};
		add(item: T, callback: webpack.CallbackCompiler<R>): void;
		invalidate(item: T): void;
		stop(): void;
		increaseParallelism(): void;
		decreaseParallelism(): void;
		isProcessing(item: T): boolean;
		isQueued(item: T): boolean;
		isDone(item: T): boolean;
	}
	export class AsyncWebAssemblyModulesPlugin {
		constructor(options?: any);
		options: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
		renderModule(module?: any, renderContext?: any, hooks?: any): any;
		static getCompilationHooks(
			compilation: webpack.Compilation
		): webpack.CompilationHooksAsyncWebAssemblyModulesPlugin;
	}
	export class AutomaticPrefetchPlugin {
		constructor();

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
	}
	export type AuxiliaryComment = string | webpack.LibraryCustomUmdCommentObject;
	export class BannerPlugin {
		constructor(
			options:
				| string
				| webpack.BannerPluginOptions
				| ((data: {
						hash: string;
						chunk: webpack.Chunk;
						filename: string;
				  }) => string)
		);
		options: webpack.BannerPluginOptions;
		banner: (data: {
			hash: string;
			chunk: webpack.Chunk;
			filename: string;
		}) => string;

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
	}
	export type BannerPluginArgument =
		| string
		| webpack.BannerPluginOptions
		| ((data: {
				hash: string;
				chunk: webpack.Chunk;
				filename: string;
		  }) => string);
	export interface BannerPluginOptions {
		/**
		 * Specifies the banner.
		 */
		banner:
			| string
			| ((data: {
					hash: string;
					chunk: webpack.Chunk;
					filename: string;
			  }) => string);

		/**
		 * If true, the banner will only be added to the entry chunks.
		 */
		entryOnly?: boolean;

		/**
		 * Exclude all modules matching any of these conditions.
		 */
		exclude?: string | RegExp | Array<string | RegExp>;

		/**
		 * Include all modules matching any of these conditions.
		 */
		include?: string | RegExp | Array<string | RegExp>;

		/**
		 * If true, banner will not be wrapped in a comment.
		 */
		raw?: boolean;

		/**
		 * Include all modules that pass test assertion.
		 */
		test?: string | RegExp | Array<string | RegExp>;
	}
	export abstract class BasicEvaluatedExpression {
		type: number;
		range: any;
		falsy: boolean;
		truthy: boolean;
		bool: any;
		number: any;
		bigint: any;
		regExp: any;
		string: any;
		quasis: any;
		parts: any;
		array: any;
		items: any;
		options: any;
		prefix: any;
		postfix: any;
		wrappedInnerExpressions: any;
		identifier: any;
		rootInfo: any;
		getMembers: any;
		expression: any;
		isNull(): boolean;
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
		isTruthy(): boolean;
		isFalsy(): boolean;
		asBool(): any;
		asString(): any;
		setString(string?: any): webpack.BasicEvaluatedExpression;
		setNull(): webpack.BasicEvaluatedExpression;
		setNumber(number?: any): webpack.BasicEvaluatedExpression;
		setBigInt(bigint?: any): webpack.BasicEvaluatedExpression;
		setBoolean(bool?: any): webpack.BasicEvaluatedExpression;
		setRegExp(regExp?: any): webpack.BasicEvaluatedExpression;
		setIdentifier(
			identifier?: any,
			rootInfo?: any,
			getMembers?: any
		): webpack.BasicEvaluatedExpression;
		setWrapped(
			prefix?: any,
			postfix?: any,
			innerExpressions?: any
		): webpack.BasicEvaluatedExpression;
		setOptions(options?: any): webpack.BasicEvaluatedExpression;
		addOptions(options?: any): webpack.BasicEvaluatedExpression;
		setItems(items?: any): webpack.BasicEvaluatedExpression;
		setArray(array?: any): webpack.BasicEvaluatedExpression;
		setTemplateString(
			quasis?: any,
			parts?: any,
			kind?: any
		): webpack.BasicEvaluatedExpression;
		templateStringKind: any;
		setTruthy(): webpack.BasicEvaluatedExpression;
		setFalsy(): webpack.BasicEvaluatedExpression;
		setRange(range?: any): webpack.BasicEvaluatedExpression;
		setExpression(expression?: any): webpack.BasicEvaluatedExpression;
	}
	export abstract class ByTypeGenerator extends webpack.Generator {
		map: any;
	}
	export class Cache {
		constructor();
		hooks: {
			get: AsyncSeriesBailHook<
				[
					string,
					webpack.Etag,
					Array<(result: any, stats: webpack.CallbackCache<void>) => void>
				],
				any
			>;
			store: AsyncParallelHook<[string, webpack.Etag, any]>;
			storeBuildDependencies: AsyncParallelHook<[Iterable<string>]>;
			beginIdle: SyncHook<[], void>;
			endIdle: AsyncParallelHook<[]>;
			shutdown: AsyncParallelHook<[]>;
		};
		get<T>(
			identifier: string,
			etag: webpack.Etag,
			callback: webpack.CallbackCache<T>
		): void;
		store<T>(
			identifier: string,
			etag: webpack.Etag,
			data: T,
			callback: webpack.CallbackCache<void>
		): void;

		/**
		 * After this method has succeeded the cache can only be restored when build dependencies are
		 */
		storeBuildDependencies(
			dependencies: Iterable<string>,
			callback: webpack.CallbackCache<void>
		): void;
		beginIdle(): void;
		endIdle(callback: webpack.CallbackCache<void>): void;
		shutdown(callback: webpack.CallbackCache<void>): void;
		static STAGE_MEMORY: number;
		static STAGE_DEFAULT: number;
		static STAGE_DISK: number;
		static STAGE_NETWORK: number;
	}
	export interface CacheGroupSource {
		key?: string;
		priority?: number;
		getName?: (
			module?: webpack.Module,
			chunks?: Array<webpack.Chunk>,
			key?: string
		) => string;
		chunksFilter?: (chunk: webpack.Chunk) => boolean;
		enforce?: boolean;
		minSize: Record<string, number>;
		minRemainingSize: Record<string, number>;
		maxAsyncSize: Record<string, number>;
		maxInitialSize: Record<string, number>;
		minChunks?: number;
		maxAsyncRequests?: number;
		maxInitialRequests?: number;
		filename?:
			| string
			| ((arg0: webpack.PathData, arg1: webpack.AssetInfo) => string);
		idHint?: string;
		automaticNameDelimiter: string;
		reuseExistingChunk?: boolean;
	}
	export interface CacheGroupsContext {
		moduleGraph: webpack.ModuleGraph;
		chunkGraph: webpack.ChunkGraph;
	}
	export type CacheOptions =
		| boolean
		| webpack.MemoryCacheOptions
		| webpack.FileCacheOptions;
	export type CacheOptionsNormalized =
		| false
		| webpack.MemoryCacheOptions
		| webpack.FileCacheOptions;
	export type CallExpression = SimpleCallExpression | NewExpression;
	export interface CallbackCache<T> {
		(err?: webpack.WebpackError, stats?: T): void;
	}
	export interface CallbackCompiler<T> {
		(err?: Error, result?: T): any;
	}
	export interface CallbackWebpack<T> {
		(err?: Error, stats?: T): void;
	}
	export class Chunk {
		constructor(name?: string);
		id: string | number;
		ids: Array<string | number>;
		debugId: number;
		name: string;
		idNameHints: webpack.SortableSet<string>;
		preventIntegration: boolean;
		filenameTemplate:
			| string
			| ((arg0: webpack.PathData, arg1: webpack.AssetInfo) => string);
		files: Set<string>;
		auxiliaryFiles: Set<string>;
		rendered: boolean;
		hash: string;
		contentHash: Record<string, string>;
		renderedHash: string;
		chunkReason: string;
		extraAsync: boolean;
		readonly entryModule: webpack.Module;
		hasEntryModule(): boolean;
		addModule(module: webpack.Module): boolean;
		removeModule(module: webpack.Module): void;
		getNumberOfModules(): number;
		readonly modulesIterable: Iterable<webpack.Module>;
		compareTo(otherChunk: webpack.Chunk): 0 | 1 | -1;
		containsModule(module: webpack.Module): boolean;
		getModules(): Array<webpack.Module>;
		remove(): void;
		moveModule(module: webpack.Module, otherChunk: webpack.Chunk): void;
		integrate(otherChunk: webpack.Chunk): boolean;
		canBeIntegrated(otherChunk: webpack.Chunk): boolean;
		isEmpty(): boolean;
		modulesSize(): number;
		size(options?: webpack.ChunkSizeOptions): number;
		integratedSize(
			otherChunk: webpack.Chunk,
			options: webpack.ChunkSizeOptions
		): number;
		getChunkModuleMaps(
			filterFn: (m: webpack.Module) => boolean
		): webpack.ChunkModuleMaps;
		hasModuleInGraph(
			filterFn: (m: webpack.Module) => boolean,
			filterChunkFn?: (
				c: webpack.Chunk,
				chunkGraph: webpack.ChunkGraph
			) => boolean
		): boolean;
		getChunkMaps(realHash: boolean): webpack.ChunkMaps;
		hasRuntime(): boolean;
		canBeInitial(): boolean;
		isOnlyInitial(): boolean;
		addGroup(chunkGroup: webpack.ChunkGroup): void;
		removeGroup(chunkGroup: webpack.ChunkGroup): void;
		isInGroup(chunkGroup: webpack.ChunkGroup): boolean;
		getNumberOfGroups(): number;
		readonly groupsIterable: Iterable<webpack.ChunkGroup>;
		disconnectFromGroups(): void;
		split(newChunk: webpack.Chunk): void;
		updateHash(hash: webpack.Hash, chunkGraph: webpack.ChunkGraph): void;
		getAllAsyncChunks(): Set<webpack.Chunk>;
		getAllReferencedChunks(): Set<webpack.Chunk>;
		hasAsyncChunks(): boolean;
		getChildIdsByOrders(
			chunkGraph: webpack.ChunkGraph,
			filterFn?: (c: webpack.Chunk, chunkGraph: webpack.ChunkGraph) => boolean
		): Record<string, Array<string | number>>;
		getChildIdsByOrdersMap(
			chunkGraph: webpack.ChunkGraph,
			includeDirectChildren?: boolean,
			filterFn?: (c: webpack.Chunk, chunkGraph: webpack.ChunkGraph) => boolean
		): Record<string | number, Record<string, Array<string | number>>>;
	}
	export class ChunkGraph {
		constructor(moduleGraph: webpack.ModuleGraph);
		moduleGraph: webpack.ModuleGraph;
		connectChunkAndModule(chunk: webpack.Chunk, module: webpack.Module): void;
		disconnectChunkAndModule(
			chunk: webpack.Chunk,
			module: webpack.Module
		): void;
		disconnectChunk(chunk: webpack.Chunk): void;
		attachModules(
			chunk: webpack.Chunk,
			modules: Iterable<webpack.Module>
		): void;
		attachRuntimeModules(
			chunk: webpack.Chunk,
			modules: Iterable<webpack.RuntimeModule>
		): void;
		replaceModule(oldModule: webpack.Module, newModule: webpack.Module): void;
		isModuleInChunk(module: webpack.Module, chunk: webpack.Chunk): boolean;
		isModuleInChunkGroup(
			module: webpack.Module,
			chunkGroup: webpack.ChunkGroup
		): boolean;
		isEntryModule(module: webpack.Module): boolean;
		getModuleChunksIterable(module: webpack.Module): Iterable<webpack.Chunk>;
		getOrderedModuleChunksIterable(
			module: webpack.Module,
			sortFn: (arg0: webpack.Chunk, arg1: webpack.Chunk) => 0 | 1 | -1
		): Iterable<webpack.Chunk>;
		getModuleChunks(module: webpack.Module): Array<webpack.Chunk>;
		getNumberOfModuleChunks(module: webpack.Module): number;
		haveModulesEqualChunks(
			moduleA: webpack.Module,
			moduleB: webpack.Module
		): boolean;
		getNumberOfChunkModules(chunk: webpack.Chunk): number;
		getChunkModulesIterable(chunk: webpack.Chunk): Iterable<webpack.Module>;
		getChunkModulesIterableBySourceType(
			chunk: webpack.Chunk,
			sourceType: string
		): Iterable<webpack.Module>;
		getOrderedChunkModulesIterable(
			chunk: webpack.Chunk,
			comparator: (arg0: webpack.Module, arg1: webpack.Module) => 0 | 1 | -1
		): Iterable<webpack.Module>;
		getOrderedChunkModulesIterableBySourceType(
			chunk: webpack.Chunk,
			sourceType: string,
			comparator: (arg0: webpack.Module, arg1: webpack.Module) => 0 | 1 | -1
		): Iterable<webpack.Module>;
		getChunkModules(chunk: webpack.Chunk): Array<webpack.Module>;
		getOrderedChunkModules(
			chunk: webpack.Chunk,
			comparator: (arg0: webpack.Module, arg1: webpack.Module) => 0 | 1 | -1
		): Array<webpack.Module>;
		getChunkModuleMaps(
			chunk: webpack.Chunk,
			filterFn: (m: webpack.Module) => boolean,
			includeAllChunks?: boolean
		): webpack.ChunkModuleMaps;
		getChunkConditionMap(
			chunk: webpack.Chunk,
			filterFn: (c: webpack.Chunk, chunkGraph: webpack.ChunkGraph) => boolean
		): Record<string | number, boolean>;
		hasModuleInChunk(
			chunk: webpack.Chunk,
			filterFn: (m: webpack.Module) => boolean
		): boolean;
		hasModuleInGraph(
			chunk: webpack.Chunk,
			filterFn: (m: webpack.Module) => boolean,
			filterChunkFn?: (
				c: webpack.Chunk,
				chunkGraph: webpack.ChunkGraph
			) => boolean
		): boolean;
		compareChunks(chunkA: webpack.Chunk, chunkB: webpack.Chunk): 0 | 1 | -1;
		getChunkModulesSize(chunk: webpack.Chunk): number;
		getChunkModulesSizes(chunk: webpack.Chunk): Record<string, number>;
		getChunkRootModules(chunk: webpack.Chunk): Array<webpack.Module>;
		getChunkSize(
			chunk: webpack.Chunk,
			options?: webpack.ChunkSizeOptions
		): number;
		getIntegratedChunksSize(
			chunkA: webpack.Chunk,
			chunkB: webpack.Chunk,
			options?: webpack.ChunkSizeOptions
		): number;
		canChunksBeIntegrated(
			chunkA: webpack.Chunk,
			chunkB: webpack.Chunk
		): boolean;
		integrateChunks(chunkA: webpack.Chunk, chunkB: webpack.Chunk): void;
		isEntryModuleInChunk(module: webpack.Module, chunk: webpack.Chunk): boolean;
		connectChunkAndEntryModule(
			chunk: webpack.Chunk,
			module: webpack.Module,
			entrypoint?: webpack.Entrypoint
		): void;
		connectChunkAndRuntimeModule(
			chunk: webpack.Chunk,
			module: webpack.RuntimeModule
		): void;
		disconnectChunkAndEntryModule(
			chunk: webpack.Chunk,
			module: webpack.Module
		): void;
		disconnectChunkAndRuntimeModule(
			chunk: webpack.Chunk,
			module: webpack.RuntimeModule
		): void;
		disconnectEntryModule(module: webpack.Module): void;
		disconnectEntries(chunk: webpack.Chunk): void;
		getNumberOfEntryModules(chunk: webpack.Chunk): number;
		getNumberOfRuntimeModules(chunk: webpack.Chunk): number;
		getChunkEntryModulesIterable(
			chunk: webpack.Chunk
		): Iterable<webpack.Module>;
		getChunkEntryDependentChunksIterable(
			chunk: webpack.Chunk
		): Iterable<webpack.Chunk>;
		hasChunkEntryDependentChunks(chunk: webpack.Chunk): boolean;
		getChunkRuntimeModulesIterable(
			chunk: webpack.Chunk
		): Iterable<webpack.RuntimeModule>;
		getChunkRuntimeModulesInOrder(
			chunk: webpack.Chunk
		): Array<webpack.RuntimeModule>;
		getChunkEntryModulesWithChunkGroupIterable(
			chunk: webpack.Chunk
		): Iterable<[webpack.Module, webpack.Entrypoint]>;
		getBlockChunkGroup(
			depBlock: webpack.AsyncDependenciesBlock
		): webpack.ChunkGroup;
		connectBlockAndChunkGroup(
			depBlock: webpack.AsyncDependenciesBlock,
			chunkGroup: webpack.ChunkGroup
		): void;
		disconnectChunkGroup(chunkGroup: webpack.ChunkGroup): void;
		getModuleId(module: webpack.Module): string | number;
		setModuleId(module: webpack.Module, id: string | number): void;
		getModuleHash(module: webpack.Module): string;
		getRenderedModuleHash(module: webpack.Module): string;
		setModuleHashes(
			module: webpack.Module,
			hash: string,
			renderedHash: string
		): void;
		addModuleRuntimeRequirements(
			module: webpack.Module,
			items: Set<string>
		): void;
		addChunkRuntimeRequirements(chunk: webpack.Chunk, items: Set<string>): void;
		addTreeRuntimeRequirements(
			chunk: webpack.Chunk,
			items: Iterable<string>
		): void;
		getModuleRuntimeRequirements(module: webpack.Module): ReadonlySet<string>;
		getChunkRuntimeRequirements(chunk: webpack.Chunk): ReadonlySet<string>;
		getTreeRuntimeRequirements(chunk: webpack.Chunk): ReadonlySet<string>;
		static getChunkGraphForModule(
			module: webpack.Module,
			deprecateMessage: string,
			deprecationCode: string
		): webpack.ChunkGraph;
		static setChunkGraphForModule(
			module: webpack.Module,
			chunkGraph: webpack.ChunkGraph
		): void;
		static getChunkGraphForChunk(
			chunk: webpack.Chunk,
			deprecateMessage: string,
			deprecationCode: string
		): webpack.ChunkGraph;
		static setChunkGraphForChunk(
			chunk: webpack.Chunk,
			chunkGraph: webpack.ChunkGraph
		): void;
	}
	export abstract class ChunkGroup {
		groupDebugId: number;
		options: { preloadOrder?: number; prefetchOrder?: number; name: string };
		chunks: Array<webpack.Chunk>;
		origins: Array<{
			module: webpack.Module;
			loc: webpack.SyntheticDependencyLocation | webpack.RealDependencyLocation;
			request: string;
		}>;
		index: number;

		/**
		 * when a new chunk is added to a chunkGroup, addingOptions will occur.
		 */
		addOptions(options: {
			preloadOrder?: number;
			prefetchOrder?: number;
			name: string;
		}): void;

		/**
		 * returns the name of current ChunkGroup
		 *
		 *
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
		unshiftChunk(chunk: webpack.Chunk): boolean;

		/**
		 * inserts a chunk before another existing chunk in group
		 */
		insertChunk(chunk: webpack.Chunk, before: webpack.Chunk): boolean;

		/**
		 * add a chunk into ChunkGroup. Is pushed on or prepended
		 */
		pushChunk(chunk: webpack.Chunk): boolean;
		replaceChunk(oldChunk: webpack.Chunk, newChunk: webpack.Chunk): boolean;
		removeChunk(chunk: webpack.Chunk): boolean;
		isInitial(): boolean;
		addChild(group: webpack.ChunkGroup): boolean;
		getChildren(): Array<webpack.ChunkGroup>;
		getNumberOfChildren(): number;
		readonly childrenIterable: webpack.SortableSet<webpack.ChunkGroup>;
		removeChild(group: webpack.ChunkGroup): boolean;
		addParent(parentChunk: webpack.ChunkGroup): boolean;
		getParents(): Array<webpack.ChunkGroup>;
		getNumberOfParents(): number;
		hasParent(parent: webpack.ChunkGroup): boolean;
		readonly parentsIterable: webpack.SortableSet<webpack.ChunkGroup>;
		removeParent(chunkGroup: webpack.ChunkGroup): boolean;
		getBlocks(): Array<any>;
		getNumberOfBlocks(): number;
		hasBlock(block?: any): boolean;
		readonly blocksIterable: Iterable<webpack.AsyncDependenciesBlock>;
		addBlock(block: webpack.AsyncDependenciesBlock): boolean;
		addOrigin(
			module: webpack.Module,
			loc: webpack.SyntheticDependencyLocation | webpack.RealDependencyLocation,
			request: string
		): void;
		getFiles(): Array<string>;
		remove(): void;
		sortItems(): void;

		/**
		 * Sorting predicate which allows current ChunkGroup to be compared against another.
		 * Sorting values are based off of number of chunks in ChunkGroup.
		 */
		compareTo(
			chunkGraph: webpack.ChunkGraph,
			otherGroup: webpack.ChunkGroup
		): 0 | 1 | -1;
		getChildrenByOrders(
			moduleGraph: webpack.ModuleGraph,
			chunkGraph: webpack.ChunkGraph
		): Record<string, Array<webpack.ChunkGroup>>;

		/**
		 * Sets the top-down index of a module in this ChunkGroup
		 */
		setModulePreOrderIndex(module: webpack.Module, index: number): void;

		/**
		 * Gets the top-down index of a module in this ChunkGroup
		 */
		getModulePreOrderIndex(module: webpack.Module): number;

		/**
		 * Sets the bottom-up index of a module in this ChunkGroup
		 */
		setModulePostOrderIndex(module: webpack.Module, index: number): void;

		/**
		 * Gets the bottom-up index of a module in this ChunkGroup
		 */
		getModulePostOrderIndex(module: webpack.Module): number;
		checkConstraints(): void;
		getModuleIndex: (module: webpack.Module) => number;
		getModuleIndex2: (module: webpack.Module) => number;
	}
	export interface ChunkHashContext {
		/**
		 * the runtime template
		 */
		runtimeTemplate: webpack.RuntimeTemplate;

		/**
		 * the module graph
		 */
		moduleGraph: webpack.ModuleGraph;

		/**
		 * the chunk graph
		 */
		chunkGraph: webpack.ChunkGraph;
	}

	/**
	 * Compare two Modules based on their ids for sorting
	 */
	export interface ChunkMaps {
		hash: Record<string | number, string>;
		contentHash: Record<string | number, Record<string, string>>;
		name: Record<string | number, string>;
	}
	export class ChunkModuleIdRangePlugin {
		constructor(options?: any);
		options: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
	}
	export interface ChunkModuleMaps {
		id: Record<string | number, Array<string | number>>;
		hash: Record<string | number, string>;
	}
	export interface ChunkPathData {
		id: string | number;
		name?: string;
		hash: string;
		hashWithLength?: (arg0: number) => string;
		contentHash?: Record<string, string>;
		contentHashWithLength?: Record<string, (length: number) => string>;
	}
	export interface ChunkSizeOptions {
		/**
		 * constant overhead for a chunk
		 */
		chunkOverhead?: number;

		/**
		 * multiplicator for initial chunks
		 */
		entryChunkMultiplicator?: number;
	}
	export abstract class ChunkTemplate {
		hooks: Readonly<{
			renderManifest: { tap: (options?: any, fn?: any) => void };
			modules: { tap: (options?: any, fn?: any) => void };
			render: { tap: (options?: any, fn?: any) => void };
			renderWithEntry: { tap: (options?: any, fn?: any) => void };
			hash: { tap: (options?: any, fn?: any) => void };
			hashForChunk: { tap: (options?: any, fn?: any) => void };
		}>;
		readonly outputOptions: any;
	}
	export interface CodeGenerationContext {
		/**
		 * the dependency templates
		 */
		dependencyTemplates: webpack.DependencyTemplates;

		/**
		 * the runtime template
		 */
		runtimeTemplate: webpack.RuntimeTemplate;

		/**
		 * the module graph
		 */
		moduleGraph: webpack.ModuleGraph;

		/**
		 * the chunk graph
		 */
		chunkGraph: webpack.ChunkGraph;
	}
	export interface CodeGenerationResult {
		/**
		 * the resulting sources for all source types
		 */
		sources: Map<string, webpack.Source>;

		/**
		 * the runtime requirements
		 */
		runtimeRequirements: ReadonlySet<string>;
	}
	export class Compilation {
		/**
		 * Creates an instance of Compilation.
		 */
		constructor(compiler: webpack.Compiler);
		hooks: Readonly<{
			buildModule: SyncHook<[webpack.Module], void>;
			rebuildModule: SyncHook<[webpack.Module], void>;
			failedModule: SyncHook<[webpack.Module, webpack.WebpackError], void>;
			succeedModule: SyncHook<[webpack.Module], void>;
			stillValidModule: SyncHook<[webpack.Module], void>;
			addEntry: SyncHook<
				[
					webpack.Dependency,
					{ name: string } & Pick<
						webpack.EntryDescriptionNormalized,
						"filename" | "dependOn" | "library"
					>
				],
				void
			>;
			failedEntry: SyncHook<
				[
					webpack.Dependency,
					{ name: string } & Pick<
						webpack.EntryDescriptionNormalized,
						"filename" | "dependOn" | "library"
					>,
					Error
				],
				void
			>;
			succeedEntry: SyncHook<
				[
					webpack.Dependency,
					{ name: string } & Pick<
						webpack.EntryDescriptionNormalized,
						"filename" | "dependOn" | "library"
					>,
					webpack.Module
				],
				void
			>;
			dependencyReferencedExports: SyncWaterfallHook<
				[Array<Array<string>>, webpack.Dependency]
			>;
			finishModules: AsyncSeriesHook<[Iterable<webpack.Module>]>;
			finishRebuildingModule: AsyncSeriesHook<[webpack.Module]>;
			unseal: SyncHook<[], void>;
			seal: SyncHook<[], void>;
			beforeChunks: SyncHook<[], void>;
			afterChunks: SyncHook<[Iterable<webpack.Chunk>], void>;
			optimizeDependencies: SyncBailHook<[Iterable<webpack.Module>], any>;
			afterOptimizeDependencies: SyncHook<[Iterable<webpack.Module>], void>;
			optimize: SyncHook<[], void>;
			optimizeModules: SyncBailHook<[Iterable<webpack.Module>], any>;
			afterOptimizeModules: SyncHook<[Iterable<webpack.Module>], void>;
			optimizeChunks: SyncBailHook<
				[Iterable<webpack.Chunk>, Array<webpack.ChunkGroup>],
				any
			>;
			afterOptimizeChunks: SyncHook<
				[Iterable<webpack.Chunk>, Array<webpack.ChunkGroup>],
				void
			>;
			optimizeTree: AsyncSeriesHook<
				[Iterable<webpack.Chunk>, Iterable<webpack.Module>]
			>;
			afterOptimizeTree: SyncHook<
				[Iterable<webpack.Chunk>, Iterable<webpack.Module>],
				void
			>;
			optimizeChunkModules: AsyncSeriesBailHook<
				[Iterable<webpack.Chunk>, Iterable<webpack.Module>],
				any
			>;
			afterOptimizeChunkModules: SyncHook<
				[Iterable<webpack.Chunk>, Iterable<webpack.Module>],
				void
			>;
			shouldRecord: SyncBailHook<[], boolean>;
			additionalChunkRuntimeRequirements: SyncHook<
				[webpack.Chunk, Set<string>],
				void
			>;
			runtimeRequirementInChunk: HookMap<
				SyncBailHook<[webpack.Chunk, Set<string>], any>
			>;
			additionalModuleRuntimeRequirements: SyncHook<
				[webpack.Module, Set<string>],
				void
			>;
			runtimeRequirementInModule: HookMap<
				SyncBailHook<[webpack.Module, Set<string>], any>
			>;
			additionalTreeRuntimeRequirements: SyncHook<
				[webpack.Chunk, Set<string>],
				void
			>;
			runtimeRequirementInTree: HookMap<
				SyncBailHook<[webpack.Chunk, Set<string>], any>
			>;
			runtimeModule: SyncHook<[webpack.RuntimeModule, webpack.Chunk], void>;
			reviveModules: SyncHook<[Iterable<webpack.Module>, any], void>;
			beforeModuleIds: SyncHook<[Iterable<webpack.Module>], void>;
			moduleIds: SyncHook<[Iterable<webpack.Module>], void>;
			optimizeModuleIds: SyncHook<[Iterable<webpack.Module>], void>;
			afterOptimizeModuleIds: SyncHook<[Iterable<webpack.Module>], void>;
			reviveChunks: SyncHook<[Iterable<webpack.Chunk>, any], void>;
			beforeChunkIds: SyncHook<[Iterable<webpack.Chunk>], void>;
			chunkIds: SyncHook<[Iterable<webpack.Chunk>], void>;
			optimizeChunkIds: SyncHook<[Iterable<webpack.Chunk>], void>;
			afterOptimizeChunkIds: SyncHook<[Iterable<webpack.Chunk>], void>;
			recordModules: SyncHook<[Iterable<webpack.Module>, any], void>;
			recordChunks: SyncHook<[Iterable<webpack.Chunk>, any], void>;
			optimizeCodeGeneration: SyncHook<[Iterable<webpack.Module>], void>;
			beforeModuleHash: SyncHook<[], void>;
			afterModuleHash: SyncHook<[], void>;
			beforeCodeGeneration: SyncHook<[], void>;
			afterCodeGeneration: SyncHook<[], void>;
			beforeRuntimeRequirements: SyncHook<[], void>;
			afterRuntimeRequirements: SyncHook<[], void>;
			beforeHash: SyncHook<[], void>;
			contentHash: SyncHook<[webpack.Chunk], void>;
			afterHash: SyncHook<[], void>;
			recordHash: SyncHook<[any], void>;
			record: SyncHook<[webpack.Compilation, any], void>;
			beforeModuleAssets: SyncHook<[], void>;
			shouldGenerateChunkAssets: SyncBailHook<[], boolean>;
			beforeChunkAssets: SyncHook<[], void>;
			additionalChunkAssets: SyncHook<[Iterable<webpack.Chunk>], void>;
			additionalAssets: AsyncSeriesHook<[]>;
			optimizeChunkAssets: AsyncSeriesHook<[Iterable<webpack.Chunk>]>;
			afterOptimizeChunkAssets: SyncHook<[Iterable<webpack.Chunk>], void>;
			optimizeAssets: AsyncSeriesHook<[Record<string, webpack.Source>]>;
			afterOptimizeAssets: SyncHook<[Record<string, webpack.Source>], void>;
			finishAssets: AsyncSeriesHook<[Record<string, webpack.Source>]>;
			afterFinishAssets: SyncHook<[Record<string, webpack.Source>], void>;
			needAdditionalSeal: SyncBailHook<[], boolean>;
			afterSeal: AsyncSeriesHook<[]>;
			renderManifest: SyncWaterfallHook<
				[Array<webpack.RenderManifestEntry>, webpack.RenderManifestOptions]
			>;
			fullHash: SyncHook<[webpack.Hash], void>;
			chunkHash: SyncHook<
				[webpack.Chunk, webpack.Hash, webpack.ChunkHashContext],
				void
			>;
			moduleAsset: SyncHook<[webpack.Module, string], void>;
			chunkAsset: SyncHook<[webpack.Chunk, string], void>;
			assetPath: SyncWaterfallHook<[string, any, webpack.AssetInfo]>;
			needAdditionalPass: SyncBailHook<[], boolean>;
			childCompiler: SyncHook<[webpack.Compiler, string, number], void>;
			log: SyncBailHook<[string, webpack.LogEntry], true>;
			statsPreset: HookMap<SyncHook<[any, any], void>>;
			statsNormalize: SyncHook<[any, any], void>;
			statsFactory: SyncHook<[webpack.StatsFactory, any], void>;
			statsPrinter: SyncHook<[webpack.StatsPrinter, any], void>;
			readonly normalModuleLoader: SyncHook<[any, webpack.NormalModule], void>;
		}>;
		name: string;
		compiler: webpack.Compiler;
		resolverFactory: webpack.ResolverFactory;
		inputFileSystem: webpack.InputFileSystem;
		fileSystemInfo: webpack.FileSystemInfo;
		requestShortener: webpack.RequestShortener;
		compilerPath: string;
		cache: webpack.Cache;
		logger: webpack.WebpackLogger;
		options: webpack.WebpackOptionsNormalized;
		outputOptions: webpack.OutputNormalized;
		bail: boolean;
		profile: boolean;
		mainTemplate: webpack.MainTemplate;
		chunkTemplate: webpack.ChunkTemplate;
		runtimeTemplate: webpack.RuntimeTemplate;
		moduleTemplates: { javascript: webpack.ModuleTemplate };
		moduleGraph: webpack.ModuleGraph;
		chunkGraph: webpack.ChunkGraph;
		codeGenerationResults: Map<webpack.Module, webpack.CodeGenerationResult>;
		factorizeQueue: webpack.AsyncQueue<
			webpack.FactorizeModuleOptions,
			string,
			webpack.Module
		>;
		addModuleQueue: webpack.AsyncQueue<webpack.Module, string, webpack.Module>;
		buildQueue: webpack.AsyncQueue<
			webpack.Module,
			webpack.Module,
			webpack.Module
		>;
		rebuildQueue: webpack.AsyncQueue<
			webpack.Module,
			webpack.Module,
			webpack.Module
		>;
		processDependenciesQueue: webpack.AsyncQueue<
			webpack.Module,
			webpack.Module,
			webpack.Module
		>;

		/**
		 * Modules in value are building during the build of Module in key.
		 * Means value blocking key from finishing.
		 * Needed to detect build cycles.
		 */
		creatingModuleDuringBuild: WeakMap<webpack.Module, Set<webpack.Module>>;
		entries: Map<string, webpack.EntryData>;
		entrypoints: Map<string, webpack.Entrypoint>;
		chunks: Set<webpack.Chunk>;
		chunkGroups: Array<webpack.ChunkGroup>;
		namedChunkGroups: Map<string, webpack.ChunkGroup>;
		namedChunks: Map<string, webpack.Chunk>;
		modules: Set<webpack.Module>;
		records: any;
		additionalChunkAssets: Array<string>;
		assets: Record<string, webpack.Source>;
		assetsInfo: Map<string, webpack.AssetInfo>;
		errors: Array<webpack.WebpackError>;
		warnings: Array<webpack.WebpackError>;
		children: Array<webpack.Compilation>;
		logging: Map<string, Array<webpack.LogEntry>>;
		dependencyFactories: Map<
			{ new (...args: Array<any>): webpack.Dependency },
			webpack.ModuleFactory
		>;
		dependencyTemplates: webpack.DependencyTemplates;
		childrenCounters: {};
		usedChunkIds: Set<string | number>;
		usedModuleIds: Set<number>;
		needAdditionalPass: boolean;
		builtModules: WeakSet<webpack.Module>;
		emittedAssets: Set<string>;
		comparedForEmitAssets: Set<string>;
		fileDependencies: webpack.LazySet<string>;
		contextDependencies: webpack.LazySet<string>;
		missingDependencies: webpack.LazySet<string>;
		buildDependencies: webpack.LazySet<string>;
		compilationDependencies: { add: (item?: any) => webpack.LazySet<string> };
		getStats(): webpack.Stats;
		createStatsOptions(optionsOrPreset?: any, context?: {}): {};
		createStatsFactory(options?: any): webpack.StatsFactory;
		createStatsPrinter(options?: any): webpack.StatsPrinter;
		getLogger(name: string | (() => string)): webpack.WebpackLogger;
		addModule(
			module: webpack.Module,
			callback: (err?: webpack.WebpackError, result?: webpack.Module) => void
		): void;

		/**
		 * Fetches a module from a compilation by its identifier
		 */
		getModule(module: webpack.Module): webpack.Module;

		/**
		 * Attempts to search for a module by its identifier
		 */
		findModule(identifier: string): webpack.Module;

		/**
		 * Schedules a build of the module object
		 */
		buildModule(
			module: webpack.Module,
			callback: (err?: webpack.WebpackError, result?: webpack.Module) => void
		): void;
		processModuleDependencies(
			module: webpack.Module,
			callback: (err?: webpack.WebpackError, result?: webpack.Module) => void
		): void;
		handleModuleCreation(
			__0: webpack.HandleModuleCreationOptions,
			callback: (err?: webpack.WebpackError, result?: webpack.Module) => void
		): void;
		factorizeModule(
			options: webpack.FactorizeModuleOptions,
			callback: (err?: webpack.WebpackError, result?: webpack.Module) => void
		): void;
		addModuleChain(
			context: string,
			dependency: webpack.Dependency,
			callback: (err?: webpack.WebpackError, result?: webpack.Module) => void
		): void;
		addEntry(
			context: string,
			entry: webpack.EntryDependency,
			optionsOrName:
				| string
				| ({ name: string } & Pick<
						webpack.EntryDescriptionNormalized,
						"filename" | "dependOn" | "library"
				  >),
			callback: (err?: webpack.WebpackError, result?: webpack.Module) => void
		): void;
		rebuildModule(
			module: webpack.Module,
			callback: (err?: webpack.WebpackError, result?: webpack.Module) => void
		): void;
		finish(callback?: any): void;
		unseal(): void;
		seal(callback: (err?: webpack.WebpackError) => void): void;
		reportDependencyErrorsAndWarnings(
			module: webpack.Module,
			blocks: Array<webpack.DependenciesBlock>
		): void;
		codeGeneration(): Map<any, any>;
		processRuntimeRequirements(entrypoints: Iterable<webpack.Entrypoint>): void;
		addRuntimeModule(chunk: webpack.Chunk, module: webpack.RuntimeModule): void;
		addChunkInGroup(
			groupOptions:
				| string
				| { preloadOrder?: number; prefetchOrder?: number; name: string },
			module: webpack.Module,
			loc: webpack.SyntheticDependencyLocation | webpack.RealDependencyLocation,
			request: string
		): webpack.ChunkGroup;

		/**
		 * This method first looks to see if a name is provided for a new chunk,
		 * and first looks to see if any named chunks already exist and reuse that chunk instead.
		 */
		addChunk(name?: string): webpack.Chunk;
		assignDepth(module: webpack.Module): void;
		getDependencyReferencedExports(
			dependency: webpack.Dependency
		): Array<Array<string>>;
		removeReasonsOfDependencyBlock(
			module: webpack.Module,
			block: webpack.DependenciesBlockLike
		): void;
		patchChunksAfterReasonRemoval(
			module: webpack.Module,
			chunk: webpack.Chunk
		): void;
		removeChunkFromDependencies(
			block: webpack.DependenciesBlock,
			chunk: webpack.Chunk
		): void;
		sortItemsWithChunkIds(): void;
		summarizeDependencies(): void;
		createModuleHashes(): void;
		createHash(): void;
		fullHash: string;
		hash: string;
		modifyHash(update: string): void;
		emitAsset(
			file: string,
			source: webpack.Source,
			assetInfo?: webpack.AssetInfo
		): void;
		updateAsset(
			file: string,
			newSourceOrFunction:
				| webpack.Source
				| ((arg0: webpack.Source) => webpack.Source),
			assetInfoUpdateOrFunction?:
				| webpack.AssetInfo
				| ((arg0: webpack.AssetInfo) => webpack.AssetInfo)
		): void;
		getAssets(): Array<webpack.Asset>;
		getAsset(name: string): webpack.Asset;
		clearAssets(): void;
		createModuleAssets(): void;
		getRenderManifest(
			options: webpack.RenderManifestOptions
		): Array<webpack.RenderManifestEntry>;
		createChunkAssets(callback: (err?: webpack.WebpackError) => void): void;
		getPath(
			filename:
				| string
				| ((arg0: webpack.PathData, arg1: webpack.AssetInfo) => string),
			data?: webpack.PathData
		): string;
		getPathWithInfo(
			filename:
				| string
				| ((arg0: webpack.PathData, arg1: webpack.AssetInfo) => string),
			data?: webpack.PathData
		): { path: string; info: webpack.AssetInfo };
		getAssetPath(
			filename:
				| string
				| ((arg0: webpack.PathData, arg1: webpack.AssetInfo) => string),
			data: webpack.PathData
		): string;
		getAssetPathWithInfo(
			filename:
				| string
				| ((arg0: webpack.PathData, arg1: webpack.AssetInfo) => string),
			data: webpack.PathData
		): { path: string; info: webpack.AssetInfo };

		/**
		 * This function allows you to run another instance of webpack inside of webpack however as
		 * a child with different settings and configurations (if desired) applied. It copies all hooks, plugins
		 * from parent (or top level compiler) and creates a child Compilation
		 */
		createChildCompiler(
			name: string,
			outputOptions: webpack.OutputNormalized,
			plugins: Array<webpack.Plugin>
		): webpack.Compiler;
		checkConstraints(): void;
	}
	export interface CompilationHooksAsyncWebAssemblyModulesPlugin {
		renderModuleContent: SyncWaterfallHook<
			[
				webpack.Source,
				webpack.Module,
				webpack.RenderContextAsyncWebAssemblyModulesPlugin
			]
		>;
	}
	export interface CompilationHooksJavascriptModulesPlugin {
		renderModuleContent: SyncWaterfallHook<
			[
				webpack.Source,
				webpack.Module,
				webpack.RenderContextJavascriptModulesPlugin
			]
		>;
		renderModuleContainer: SyncWaterfallHook<
			[
				webpack.Source,
				webpack.Module,
				webpack.RenderContextJavascriptModulesPlugin
			]
		>;
		renderModulePackage: SyncWaterfallHook<
			[
				webpack.Source,
				webpack.Module,
				webpack.RenderContextJavascriptModulesPlugin
			]
		>;
		renderChunk: SyncWaterfallHook<
			[webpack.Source, webpack.RenderContextJavascriptModulesPlugin]
		>;
		renderMain: SyncWaterfallHook<
			[webpack.Source, webpack.RenderContextJavascriptModulesPlugin]
		>;
		render: SyncWaterfallHook<
			[webpack.Source, webpack.RenderContextJavascriptModulesPlugin]
		>;
		renderRequire: SyncWaterfallHook<[string, webpack.RenderBootstrapContext]>;
		chunkHash: SyncHook<
			[webpack.Chunk, webpack.Hash, webpack.ChunkHashContext],
			void
		>;
	}
	export interface CompilationParams {
		normalModuleFactory: webpack.NormalModuleFactory;
		contextModuleFactory: webpack.ContextModuleFactory;
	}
	export class Compiler {
		constructor(context: string);
		hooks: Readonly<{
			initialize: SyncHook<[], void>;
			shouldEmit: SyncBailHook<[webpack.Compilation], boolean>;
			done: AsyncSeriesHook<[webpack.Stats]>;
			afterDone: SyncHook<[webpack.Stats], void>;
			additionalPass: AsyncSeriesHook<[]>;
			beforeRun: AsyncSeriesHook<[webpack.Compiler]>;
			run: AsyncSeriesHook<[webpack.Compiler]>;
			emit: AsyncSeriesHook<[webpack.Compilation]>;
			assetEmitted: AsyncSeriesHook<[string, webpack.AssetEmittedInfo]>;
			afterEmit: AsyncSeriesHook<[webpack.Compilation]>;
			thisCompilation: SyncHook<
				[webpack.Compilation, webpack.CompilationParams],
				void
			>;
			compilation: SyncHook<
				[webpack.Compilation, webpack.CompilationParams],
				void
			>;
			normalModuleFactory: SyncHook<[webpack.NormalModuleFactory], void>;
			contextModuleFactory: SyncHook<[webpack.ContextModuleFactory], void>;
			beforeCompile: AsyncSeriesHook<[webpack.CompilationParams]>;
			compile: SyncHook<[webpack.CompilationParams], void>;
			make: AsyncParallelHook<[webpack.Compilation]>;
			afterCompile: AsyncSeriesHook<[webpack.Compilation]>;
			watchRun: AsyncSeriesHook<[webpack.Compiler]>;
			failed: SyncHook<[Error], void>;
			invalid: SyncHook<[string, string], void>;
			watchClose: SyncHook<[], void>;
			infrastructureLog: SyncBailHook<[string, string, Array<any>], true>;
			environment: SyncHook<[], void>;
			afterEnvironment: SyncHook<[], void>;
			afterPlugins: SyncHook<[webpack.Compiler], void>;
			afterResolvers: SyncHook<[webpack.Compiler], void>;
			entryOption: SyncBailHook<
				[
					string,
					(
						| (() => Promise<webpack.EntryStaticNormalized>)
						| webpack.EntryStaticNormalized
					)
				],
				boolean
			>;
		}>;
		name: string;
		parentCompilation: webpack.Compilation;
		root: webpack.Compiler;
		outputPath: string;
		outputFileSystem: webpack.OutputFileSystem;
		intermediateFileSystem: webpack.InputFileSystem &
			webpack.OutputFileSystem &
			webpack.IntermediateFileSystemExtras;
		inputFileSystem: webpack.InputFileSystem;
		watchFileSystem: any;
		recordsInputPath: string;
		recordsOutputPath: string;
		records: {};
		managedPaths: Set<string>;
		immutablePaths: Set<string>;
		modifiedFiles: Set<string>;
		removedFiles: Set<string>;
		fileTimestamps: Map<string, webpack.FileSystemInfoEntry>;
		contextTimestamps: Map<string, webpack.FileSystemInfoEntry>;
		resolverFactory: webpack.ResolverFactory;
		infrastructureLogger: any;
		options: webpack.WebpackOptionsNormalized;
		context: string;
		requestShortener: webpack.RequestShortener;
		cache: webpack.Cache;
		compilerPath: string;
		running: boolean;
		watchMode: boolean;
		getInfrastructureLogger(
			name: string | (() => string)
		): webpack.WebpackLogger;
		watch(
			watchOptions: webpack.WatchOptions,
			handler: webpack.CallbackCompiler<webpack.Stats>
		): webpack.Watching;
		run(callback: webpack.CallbackCompiler<webpack.Stats>): void;
		runAsChild(
			callback: (
				err?: Error,
				entries?: Array<webpack.Chunk>,
				compilation?: webpack.Compilation
			) => any
		): void;
		purgeInputFileSystem(): void;
		emitAssets(
			compilation: webpack.Compilation,
			callback: webpack.CallbackCompiler<void>
		): void;
		emitRecords(callback: webpack.CallbackCompiler<void>): void;
		readRecords(callback: webpack.CallbackCompiler<void>): void;
		createChildCompiler(
			compilation: webpack.Compilation,
			compilerName: string,
			compilerIndex: number,
			outputOptions: webpack.OutputNormalized,
			plugins: Array<webpack.WebpackPluginInstance>
		): webpack.Compiler;
		isChild(): boolean;
		createCompilation(): webpack.Compilation;
		newCompilation(params: webpack.CompilationParams): webpack.Compilation;
		createNormalModuleFactory(): webpack.NormalModuleFactory;
		createContextModuleFactory(): webpack.ContextModuleFactory;
		newCompilationParams(): {
			normalModuleFactory: webpack.NormalModuleFactory;
			contextModuleFactory: webpack.ContextModuleFactory;
		};
		compile(callback: webpack.CallbackCompiler<webpack.Compilation>): void;
		close(callback: webpack.CallbackCompiler<void>): void;
	}
	export class ContextExclusionPlugin {
		constructor(negativeMatcher: RegExp);
		negativeMatcher: RegExp;

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
	}
	export abstract class ContextModuleFactory extends webpack.ModuleFactory {
		hooks: Readonly<{
			beforeResolve: AsyncSeriesWaterfallHook<[any]>;
			afterResolve: AsyncSeriesWaterfallHook<[any]>;
			contextModuleFiles: SyncWaterfallHook<[Array<string>]>;
			alternatives: AsyncSeriesWaterfallHook<[Array<any>]>;
		}>;
		resolverFactory: any;
		resolveDependencies(fs?: any, options?: any, callback?: any): any;
	}
	export class ContextReplacementPlugin {
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
	export type CrossOriginLoading = false | "anonymous" | "use-credentials";
	export type Declaration =
		| FunctionDeclaration
		| VariableDeclaration
		| ClassDeclaration;
	export class DefinePlugin {
		/**
		 * Create a new define plugin
		 */
		constructor(
			definitions: Record<
				string,
				| string
				| number
				| bigint
				| boolean
				| Function
				| RegExp
				| webpack.RuntimeValue
				| { [index: string]: RecursiveArrayOrRecordDeclarations }
				| Array<RecursiveArrayOrRecordDeclarations>
			>
		);
		definitions: Record<
			string,
			| string
			| number
			| bigint
			| boolean
			| Function
			| RegExp
			| webpack.RuntimeValue
			| { [index: string]: RecursiveArrayOrRecordDeclarations }
			| Array<RecursiveArrayOrRecordDeclarations>
		>;

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
		static runtimeValue(fn?: any, fileDependencies?: any): webpack.RuntimeValue;
	}
	export class DelegatedPlugin {
		constructor(options?: any);
		options: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
	}
	export abstract class DependenciesBlock {
		dependencies: Array<webpack.Dependency>;
		blocks: Array<webpack.AsyncDependenciesBlock>;

		/**
		 * Adds a DependencyBlock to DependencyBlock relationship.
		 * This is used for when a Module has a AsyncDependencyBlock tie (for code-splitting)
		 */
		addBlock(block: webpack.AsyncDependenciesBlock): void;
		addDependency(dependency: webpack.Dependency): void;
		removeDependency(dependency: webpack.Dependency): void;

		/**
		 * Removes all dependencies and blocks
		 */
		clearDependenciesAndBlocks(): void;
		updateHash(hash: webpack.Hash, chunkGraph: webpack.ChunkGraph): void;
		serialize(__0: { write: any }): void;
		deserialize(__0: { read: any }): void;
	}
	export interface DependenciesBlockLike {
		dependencies: Array<webpack.Dependency>;
		blocks: Array<webpack.AsyncDependenciesBlock>;
	}
	export class Dependency {
		constructor();
		weak: boolean;
		optional: boolean;
		loc: webpack.SyntheticDependencyLocation | webpack.RealDependencyLocation;
		readonly type: string;
		getResourceIdentifier(): string;
		getReference(moduleGraph: webpack.ModuleGraph): never;

		/**
		 * Returns list of exports referenced by this dependency
		 */
		getReferencedExports(
			moduleGraph: webpack.ModuleGraph
		): Array<Array<string>>;
		getCondition(moduleGraph: webpack.ModuleGraph): () => boolean;

		/**
		 * Returns the exported names
		 */
		getExports(moduleGraph: webpack.ModuleGraph): webpack.ExportsSpec;

		/**
		 * Returns warnings
		 */
		getWarnings(moduleGraph: webpack.ModuleGraph): Array<webpack.WebpackError>;

		/**
		 * Returns errors
		 */
		getErrors(moduleGraph: webpack.ModuleGraph): Array<webpack.WebpackError>;
		updateHash(hash: webpack.Hash, chunkGraph: webpack.ChunkGraph): void;

		/**
		 * implement this method to allow the occurrence order plugin to count correctly
		 */
		getNumberOfIdOccurrences(): number;
		serialize(__0: { write: any }): void;
		deserialize(__0: { read: any }): void;
		module: any;
		readonly disconnect: any;
		static NO_EXPORTS_REFERENCED: Array<any>;
		static NS_OBJECT_REFERENCED: Array<Array<any>>;
		static DEFAULT_EXPORT_REFERENCED: Array<Array<string>>;
	}
	export abstract class DependencyTemplate {
		apply(
			dependency: webpack.Dependency,
			source: webpack.ReplaceSource,
			templateContext: webpack.DependencyTemplateContext
		): void;
	}
	export interface DependencyTemplateContext {
		/**
		 * the runtime template
		 */
		runtimeTemplate: webpack.RuntimeTemplate;

		/**
		 * the dependency templates
		 */
		dependencyTemplates: webpack.DependencyTemplates;

		/**
		 * the module graph
		 */
		moduleGraph: webpack.ModuleGraph;

		/**
		 * the chunk graph
		 */
		chunkGraph: webpack.ChunkGraph;

		/**
		 * the requirements for runtime
		 */
		runtimeRequirements: Set<string>;

		/**
		 * current module
		 */
		module: webpack.Module;

		/**
		 * mutable array of init fragments for the current module
		 */
		initFragments: Array<webpack.InitFragment>;
	}
	export abstract class DependencyTemplates {
		get(dependency: {
			new (...args: Array<any>): webpack.Dependency;
		}): webpack.DependencyTemplate;
		set(
			dependency: { new (...args: Array<any>): webpack.Dependency },
			dependencyTemplate: webpack.DependencyTemplate
		): void;
		updateHash(part: string): void;
		getHash(): string;
		clone(): webpack.DependencyTemplates;
	}
	export class DeterministicModuleIdsPlugin {
		constructor(options?: any);
		options: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
	}

	/**
	 * Options for the webpack-dev-server.
	 */
	export interface DevServer {
		[index: string]: any;
	}
	export type DevTool = string | false;
	export type DevtoolFallbackModuleFilenameTemplate = string | Function;
	export class DllPlugin {
		constructor(options: webpack.DllPluginOptions);
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
		apply(compiler: webpack.Compiler): void;
	}

	/**
	 * This file was automatically generated.
	 * DO NOT MODIFY BY HAND.
	 * Run `yarn special-lint-fix` to update
	 */
	export interface DllPluginOptions {
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
	export class DllReferencePlugin {
		constructor(
			options:
				| {
						/**
						 * Context of requests in the manifest (or content property) as absolute path.
						 */
						context?: string;
						/**
						 * Extensions used to resolve modules in the dll bundle (only used when using 'scope').
						 */
						extensions?: Array<string>;
						/**
						 * An object containing content and name or a string to the absolute path of the JSON manifest to be loaded upon compilation.
						 */
						manifest: string | webpack.DllReferencePluginOptionsManifest;
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
						content: webpack.DllReferencePluginOptionsContent;
						/**
						 * Context of requests in the manifest (or content property) as absolute path.
						 */
						context?: string;
						/**
						 * Extensions used to resolve modules in the dll bundle (only used when using 'scope').
						 */
						extensions?: Array<string>;
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
				  }
		);
		options:
			| {
					/**
					 * Context of requests in the manifest (or content property) as absolute path.
					 */
					context?: string;
					/**
					 * Extensions used to resolve modules in the dll bundle (only used when using 'scope').
					 */
					extensions?: Array<string>;
					/**
					 * An object containing content and name or a string to the absolute path of the JSON manifest to be loaded upon compilation.
					 */
					manifest: string | webpack.DllReferencePluginOptionsManifest;
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
					content: webpack.DllReferencePluginOptionsContent;
					/**
					 * Context of requests in the manifest (or content property) as absolute path.
					 */
					context?: string;
					/**
					 * Extensions used to resolve modules in the dll bundle (only used when using 'scope').
					 */
					extensions?: Array<string>;
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
		apply(compiler?: any): void;
	}
	export type DllReferencePluginOptions =
		| {
				/**
				 * Context of requests in the manifest (or content property) as absolute path.
				 */
				context?: string;
				/**
				 * Extensions used to resolve modules in the dll bundle (only used when using 'scope').
				 */
				extensions?: Array<string>;
				/**
				 * An object containing content and name or a string to the absolute path of the JSON manifest to be loaded upon compilation.
				 */
				manifest: string | webpack.DllReferencePluginOptionsManifest;
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
				content: webpack.DllReferencePluginOptionsContent;
				/**
				 * Context of requests in the manifest (or content property) as absolute path.
				 */
				context?: string;
				/**
				 * Extensions used to resolve modules in the dll bundle (only used when using 'scope').
				 */
				extensions?: Array<string>;
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
	export interface DllReferencePluginOptionsContent {
		[index: string]: {
			/**
			 * Meta information about the module.
			 */
			buildMeta?: { [index: string]: any };
			/**
			 * Information about the provided exports of the module.
			 */
			exports?: true | Array<string>;
			/**
			 * Module ID.
			 */
			id: string | number;
		};
	}

	/**
	 * An object containing content, name and type.
	 */
	export interface DllReferencePluginOptionsManifest {
		/**
		 * The mappings from request to module info.
		 */
		content: webpack.DllReferencePluginOptionsContent;

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
	export type DllReferencePluginOptionsSourceType =
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
	export interface Effect {
		type: string;
		value: any;
	}
	export class EnableLibraryPlugin {
		constructor(
			type:
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
		);
		type:
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
			| "system";

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
		static checkEnabled(
			compiler: webpack.Compiler,
			type:
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
		): void;
	}
	export type Entry =
		| string
		| (() =>
				| string
				| webpack.EntryObject
				| [string, string]
				| Promise<string | webpack.EntryObject | [string, string]>)
		| webpack.EntryObject
		| [string, string];
	export interface EntryData {
		/**
		 * dependencies of the entrypoint
		 */
		dependencies: Array<webpack.EntryDependency>;

		/**
		 * options of the entrypoint
		 */
		options: { name: string } & Pick<
			webpack.EntryDescriptionNormalized,
			"filename" | "dependOn" | "library"
		>;
	}
	export abstract class EntryDependency extends webpack.ModuleDependency {}

	/**
	 * An object with entry point description.
	 */
	export interface EntryDescription {
		/**
		 * The entrypoints that the current entrypoint depend on. They must be loaded when this entrypoint is loaded.
		 */
		dependOn?: string | [string, string];

		/**
		 * Specifies the name of each output file on disk. You must **not** specify an absolute path here! The `output.path` option determines the location on disk the files are written to, filename is used solely for naming the individual files.
		 */
		filename?:
			| string
			| ((pathData: webpack.PathData, assetInfo: webpack.AssetInfo) => string);

		/**
		 * Module(s) that are loaded upon startup.
		 */
		import: string | [string, string];

		/**
		 * Options for library.
		 */
		library?: webpack.LibraryOptions;
	}

	/**
	 * An object with entry point description.
	 */
	export interface EntryDescriptionNormalized {
		/**
		 * The entrypoints that the current entrypoint depend on. They must be loaded when this entrypoint is loaded.
		 */
		dependOn?: [string, string];

		/**
		 * Specifies the name of each output file on disk. You must **not** specify an absolute path here! The `output.path` option determines the location on disk the files are written to, filename is used solely for naming the individual files.
		 */
		filename?:
			| string
			| ((pathData: webpack.PathData, assetInfo: webpack.AssetInfo) => string);

		/**
		 * Module(s) that are loaded upon startup. The last one is exported.
		 */
		import: [string, string];

		/**
		 * Options for library.
		 */
		library?: webpack.LibraryOptions;
	}
	export type EntryItem = string | [string, string];
	export type EntryNormalized =
		| (() => Promise<webpack.EntryStaticNormalized>)
		| webpack.EntryStaticNormalized;

	/**
	 * Multiple entry bundles are created. The key is the entry name. The value can be a string, an array or an entry description object.
	 */
	export interface EntryObject {
		[index: string]: string | [string, string] | webpack.EntryDescription;
	}
	export class EntryPlugin {
		/**
		 * An entry plugin which will handle
		 * creation of the EntryDependency
		 */
		constructor(
			context: string,
			entry: string,
			options:
				| string
				| ({ name: string } & Pick<
						webpack.EntryDescriptionNormalized,
						"filename" | "dependOn" | "library"
				  >)
		);
		context: string;
		entry: string;
		options:
			| string
			| ({ name: string } & Pick<
					webpack.EntryDescriptionNormalized,
					"filename" | "dependOn" | "library"
			  >);

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
		static createDependency(
			entry: string,
			options:
				| string
				| ({ name: string } & Pick<
						webpack.EntryDescriptionNormalized,
						"filename" | "dependOn" | "library"
				  >)
		): webpack.EntryDependency;
	}
	export type EntryStatic = string | webpack.EntryObject | [string, string];

	/**
	 * Multiple entry bundles are created. The key is the entry name. The value is an entry description object.
	 */
	export interface EntryStaticNormalized {
		[index: string]: webpack.EntryDescriptionNormalized;
	}
	export abstract class Entrypoint extends webpack.ChunkGroup {
		runtimeChunk: webpack.Chunk;

		/**
		 * Sets the runtimeChunk for an entrypoint.
		 */
		setRuntimeChunk(chunk: webpack.Chunk): void;

		/**
		 * Fetches the chunk reference containing the webpack bootstrap code
		 */
		getRuntimeChunk(): webpack.Chunk;
	}
	export class EnvironmentPlugin {
		constructor(...keys: Array<any>);
		keys: Array<any>;
		defaultValues: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
	}
	export interface Etag {
		toString: () => string;
	}
	export class EvalDevToolModulePlugin {
		constructor(options?: any);
		namespace: any;
		sourceUrlComment: any;
		moduleFilenameTemplate: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
	}
	export class EvalSourceMapDevToolPlugin {
		constructor(options?: any);
		sourceMapComment: any;
		moduleFilenameTemplate: any;
		namespace: any;
		options: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
	}

	/**
	 * Enables/Disables experiments (experimental features with relax SemVer compatibility).
	 */
	export interface Experiments {
		/**
		 * Allow module type 'asset' to generate assets.
		 */
		asset?: boolean;

		/**
		 * Support WebAssembly as asynchronous EcmaScript Module.
		 */
		asyncWebAssembly?: boolean;

		/**
		 * Allow 'import/export' syntax to import async modules.
		 */
		importAsync?: boolean;

		/**
		 * Allow 'import/export await' syntax to import async modules.
		 */
		importAwait?: boolean;

		/**
		 * Support .mjs files as way to define strict ESM file (node.js).
		 */
		mjs?: boolean;

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
	export class ExportInfo {
		constructor(name: string, initFrom?: webpack.ExportInfo);
		name: string;
		usedName: string | typeof webpack.SKIP_OVER_NAME;
		used: 0 | 1 | 2 | 3 | 4;

		/**
		 * true: it is provided
		 * false: it is not provided
		 * null: only the runtime knows if it is provided
		 * undefined: it was not determined if it is provided
		 */
		provided: boolean;

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
		exportsInfo: webpack.ExportsInfo;
		readonly canMangle: boolean;
		getUsedName(fallbackName?: any): any;
		createNestedExportsInfo(): webpack.ExportsInfo;
		getNestedExportsInfo(): webpack.ExportsInfo;
		getUsedInfo():
			| "used"
			| "no usage info"
			| "maybe used (runtime-defined)"
			| "unused"
			| "only properties used";
		getProvidedInfo():
			| "no provided info"
			| "maybe provided (runtime-defined)"
			| "provided"
			| "not provided";
		getRenameInfo(): string;
	}
	export interface ExportSpec {
		/**
		 * the name of the export
		 */
		name: string;

		/**
		 * can the export be renamed (defaults to true)
		 */
		canMangle?: boolean;

		/**
		 * nested exports
		 */
		exports?: Array<string | webpack.ExportSpec>;

		/**
		 * when reexported: from which module
		 */
		from?: webpack.Module;

		/**
		 * when reexported: from which export
		 */
		export?: Array<string>;
	}
	export class ExportsInfo {
		constructor();
		readonly ownedExports: Iterable<webpack.ExportInfo>;
		readonly exports: Iterable<webpack.ExportInfo>;
		readonly orderedExports: Iterable<webpack.ExportInfo>;
		readonly otherExportsInfo: webpack.ExportInfo;
		setRedirectNamedTo(exportsInfo?: any): void;
		setHasProvideInfo(): void;
		setHasUseInfo(): void;
		getExportInfo(name: string): webpack.ExportInfo;
		getReadOnlyExportInfo(name: string): webpack.ExportInfo;
		getNestedExportsInfo(name?: Array<string>): webpack.ExportsInfo;
		setUnknownExportsProvided(canMangle?: boolean): boolean;
		setUsedInUnknownWay(): boolean;
		setAllKnownExportsUsed(): boolean;
		setUsedForSideEffectsOnly(): boolean;
		isUsed(): boolean;
		getUsedExports(): any;
		getProvidedExports(): true | Array<string>;
		isExportProvided(name: string | Array<string>): boolean;
		isExportUsed(name: string | Array<string>): 0 | 1 | 2 | 3 | 4;
		getUsedName(name: string | Array<string>): string | false | Array<string>;
		getRestoreProvidedData(): any;
		restoreProvided(__0: {
			otherProvided: any;
			otherCanMangleProvide: any;
			exports: any;
		}): void;
	}
	export interface ExportsSpec {
		/**
		 * exported names, true for unknown exports or null for no exports
		 */
		exports: true | Array<string | webpack.ExportSpec>;

		/**
		 * can the export be renamed (defaults to true)
		 */
		canMangle?: boolean;

		/**
		 * module on which the result depends on
		 */
		dependencies?: Array<webpack.Module>;
	}
	export type Expression =
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
		| AwaitExpression;
	export type ExternalItem =
		| string
		| RegExp
		| {
				[index: string]:
					| string
					| boolean
					| Array<string>
					| { [index: string]: any };
		  }
		| ((
				context: string,
				request: string,
				callback: (err: Error, result: string) => void
		  ) => void);
	export class ExternalModule extends webpack.Module {
		constructor(request?: any, type?: any, userRequest?: any);
		request: string | Array<string> | Record<string, string | Array<string>>;
		externalType: string;
		userRequest: string;
		getSourceString(
			runtimeTemplate?: any,
			moduleGraph?: any,
			chunkGraph?: any
		): string;
	}
	export type Externals =
		| string
		| RegExp
		| Array<
				| string
				| RegExp
				| {
						[index: string]:
							| string
							| boolean
							| Array<string>
							| { [index: string]: any };
				  }
				| ((
						context: string,
						request: string,
						callback: (err: Error, result: string) => void
				  ) => void)
		  >
		| {
				[index: string]:
					| string
					| boolean
					| Array<string>
					| { [index: string]: any };
		  }
		| ((
				context: string,
				request: string,
				callback: (err: Error, result: string) => void
		  ) => void);
	export class ExternalsPlugin {
		constructor(type?: any, externals?: any);
		type: any;
		externals: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
	}
	export type ExternalsType =
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
		| "system";
	export interface FactorizeModuleOptions {
		currentProfile: webpack.ModuleProfile;
		factory: webpack.ModuleFactory;
		dependencies: Array<webpack.Dependency>;
		originModule: webpack.Module;
		context?: string;
	}
	export interface FallbackCacheGroup {
		minSize: Record<string, number>;
		maxAsyncSize: Record<string, number>;
		maxInitialSize: Record<string, number>;
		automaticNameDelimiter: string;
	}
	export class FetchCompileWasmPlugin {
		constructor(options?: any);
		options: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
	}

	/**
	 * Options object for persistent file-based caching.
	 */
	export interface FileCacheOptions {
		/**
		 * Dependencies the build depends on (in multiple categories, default categories: 'defaultWebpack').
		 */
		buildDependencies?: { [index: string]: Array<string> };

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
		 * List of paths that are managed by a package manager and contain a version or hash in it's path so all files are immutable.
		 */
		immutablePaths?: Array<string>;

		/**
		 * List of paths that are managed by a package manager and can be trusted to not be modified otherwise.
		 */
		managedPaths?: Array<string>;

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
	export abstract class FileSystemInfo {
		fs: webpack.InputFileSystem;
		logger: webpack.WebpackLogger;
		fileTimestampQueue: webpack.AsyncQueue<
			string,
			string,
			webpack.FileSystemInfoEntry
		>;
		fileHashQueue: webpack.AsyncQueue<string, string, string>;
		contextTimestampQueue: webpack.AsyncQueue<
			string,
			string,
			webpack.FileSystemInfoEntry
		>;
		contextHashQueue: webpack.AsyncQueue<string, string, string>;
		managedItemQueue: webpack.AsyncQueue<string, string, string>;
		managedItemDirectoryQueue: webpack.AsyncQueue<string, string, Set<string>>;
		managedPaths: Array<string>;
		managedPathsWithSlash: Array<string>;
		immutablePaths: Array<string>;
		immutablePathsWithSlash: Array<string>;
		addFileTimestamps(
			map: Map<string, webpack.FileSystemInfoEntry | "ignore">
		): void;
		addContextTimestamps(
			map: Map<string, webpack.FileSystemInfoEntry | "ignore">
		): void;
		getFileTimestamp(
			path: string,
			callback: (
				arg0: webpack.WebpackError,
				arg1: webpack.FileSystemInfoEntry | "ignore"
			) => void
		): void;
		getContextTimestamp(
			path: string,
			callback: (
				arg0: webpack.WebpackError,
				arg1: webpack.FileSystemInfoEntry | "ignore"
			) => void
		): void;
		getFileHash(
			path: string,
			callback: (arg0: webpack.WebpackError, arg1: string) => void
		): void;
		getContextHash(
			path: string,
			callback: (arg0: webpack.WebpackError, arg1: string) => void
		): void;
		resolveBuildDependencies(
			context: string,
			deps: Iterable<string>,
			callback: (
				arg0: Error,
				arg1: webpack.ResolveBuildDependenciesResult
			) => void
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
				 * should use hash to snapshot
				 */
				hash?: boolean;
			},
			callback: (arg0: webpack.WebpackError, arg1: webpack.Snapshot) => void
		): void;
		mergeSnapshots(
			snapshot1: webpack.Snapshot,
			snapshot2: webpack.Snapshot
		): webpack.Snapshot;
		checkSnapshotValid(
			snapshot: webpack.Snapshot,
			callback: (arg0: webpack.WebpackError, arg1: boolean) => void
		): void;
		getDeprecatedFileTimestamps(): Map<any, any>;
		getDeprecatedContextTimestamps(): Map<any, any>;
	}

	/**
	 * istanbul ignore next
	 */
	export interface FileSystemInfoEntry {
		safeTime: number;
		timestamp?: number;
		timestampHash?: string;
	}
	export type Filename =
		| string
		| ((pathData: webpack.PathData, assetInfo: webpack.AssetInfo) => string);
	export type FilterItemTypes = string | RegExp | ((value: string) => boolean);
	export type FilterTypes =
		| string
		| RegExp
		| Array<string | RegExp | ((value: string) => boolean)>
		| ((value: string) => boolean);
	export interface GenerateContext {
		/**
		 * mapping from dependencies to templates
		 */
		dependencyTemplates: webpack.DependencyTemplates;

		/**
		 * the runtime template
		 */
		runtimeTemplate: webpack.RuntimeTemplate;

		/**
		 * the module graph
		 */
		moduleGraph: webpack.ModuleGraph;

		/**
		 * the chunk graph
		 */
		chunkGraph: webpack.ChunkGraph;

		/**
		 * the requirements for runtime
		 */
		runtimeRequirements: Set<string>;

		/**
		 * which kind of code should be generated
		 */
		type: string;
	}
	export class Generator {
		constructor();
		getTypes(module: webpack.NormalModule): Set<string>;
		getSize(module: webpack.NormalModule, type?: string): number;
		generate(
			module: webpack.NormalModule,
			__1: webpack.GenerateContext
		): webpack.Source;
		updateHash(hash: webpack.Hash, __1: webpack.UpdateHashContext): void;
		static byType(map?: any): webpack.ByTypeGenerator;
	}
	export interface HMRJavascriptParserHooks {
		hotAcceptCallback: SyncBailHook<[any, Array<string>], void>;
		hotAcceptWithoutCallback: SyncBailHook<[any, Array<string>], void>;
	}
	export interface HandleModuleCreationOptions {
		factory: webpack.ModuleFactory;
		dependencies: Array<webpack.Dependency>;
		originModule: webpack.Module;
		context?: string;

		/**
		 * recurse into dependencies of the created module
		 */
		recursive?: boolean;
	}
	export class Hash {
		constructor();
		update(data: string | Buffer, inputEncoding?: string): webpack.Hash;
		digest(encoding?: string): string | Buffer;
	}
	export type HashFunction = string | typeof webpack.Hash;
	export class HashedModuleIdsPlugin {
		constructor(options?: webpack.HashedModuleIdsPluginOptions);
		options: webpack.HashedModuleIdsPluginOptions;
		apply(compiler?: any): void;
	}

	/**
	 * This file was automatically generated.
	 * DO NOT MODIFY BY HAND.
	 * Run `yarn special-lint-fix` to update
	 */
	export interface HashedModuleIdsPluginOptions {
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
	export class HotModuleReplacementPlugin {
		constructor(options?: any);
		options: any;
		multiStep: any;
		fullBuildTimeout: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
		static getParserHooks(
			parser: webpack.JavascriptParser
		): webpack.HMRJavascriptParserHooks;
	}
	export class IgnorePlugin {
		constructor(
			options:
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
				  }
		);
		options:
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
		 * Note that if "contextRegExp" is given, both the "resourceRegExp"
		 * and "contextRegExp" have to match.
		 */
		checkIgnore(resolveData: webpack.ResolveData): false;

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
	}
	export type IgnorePluginOptions =
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
	export interface InfrastructureLogging {
		/**
		 * Enable debug logging for specific loggers.
		 */
		debug?:
			| string
			| boolean
			| RegExp
			| Array<string | RegExp | ((value: string) => boolean)>
			| ((value: string) => boolean);

		/**
		 * Log level.
		 */
		level?: "none" | "verbose" | "error" | "warn" | "info" | "log";
	}
	export abstract class InitFragment {
		content: string | webpack.Source;
		stage: number;
		position: number;
		key: string;
		endContent: string | webpack.Source;
		getContent(
			generateContext: webpack.GenerateContext
		): string | webpack.Source;
		getEndContent(
			generateContext: webpack.GenerateContext
		): string | webpack.Source;
		merge: any;
	}
	export interface InputFileSystem {
		readFile: (
			arg0: string,
			arg1: (arg0: NodeJS.ErrnoException, arg1: Buffer) => void
		) => void;
		readdir: (
			arg0: string,
			arg1: (arg0: NodeJS.ErrnoException, arg1: Array<string>) => void
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
	export interface IntermediateFileSystemExtras {
		mkdirSync: (arg0: string) => void;
		createWriteStream: (arg0: string) => WriteStream;
		rename: (
			arg0: string,
			arg1: string,
			arg2: (arg0: NodeJS.ErrnoException) => void
		) => void;
	}
	export class JavascriptModulesPlugin {
		constructor(options?: {});
		options: {};

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
		renderModule(
			module: webpack.Module,
			renderContext: webpack.RenderContextJavascriptModulesPlugin,
			hooks: webpack.CompilationHooksJavascriptModulesPlugin,
			factory: boolean | "strict"
		): webpack.Source;
		renderChunk(
			renderContext: webpack.RenderContextJavascriptModulesPlugin,
			hooks: webpack.CompilationHooksJavascriptModulesPlugin
		): webpack.Source;
		renderMain(
			renderContext: webpack.MainRenderContext,
			hooks: webpack.CompilationHooksJavascriptModulesPlugin
		): webpack.Source;
		renderBootstrap(
			renderContext: webpack.RenderBootstrapContext,
			hooks: webpack.CompilationHooksJavascriptModulesPlugin
		): {
			header: Array<string>;
			startup: Array<string>;
			allowInlineStartup: boolean;
		};
		renderRequire(
			renderContext: webpack.RenderBootstrapContext,
			hooks: webpack.CompilationHooksJavascriptModulesPlugin
		): string;
		static getCompilationHooks(
			compilation: webpack.Compilation
		): webpack.CompilationHooksJavascriptModulesPlugin;
		static getChunkFilenameTemplate(chunk?: any, outputOptions?: any): any;
		static chunkHasJs: (
			chunk: webpack.Chunk,
			chunkGraph: webpack.ChunkGraph
		) => boolean;
	}
	export abstract class JavascriptParser extends webpack.Parser {
		hooks: Readonly<{
			evaluateTypeof: HookMap<
				SyncBailHook<[UnaryExpression], webpack.BasicEvaluatedExpression>
			>;
			evaluate: HookMap<
				SyncBailHook<
					[
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
					],
					webpack.BasicEvaluatedExpression
				>
			>;
			evaluateIdentifier: HookMap<
				SyncBailHook<
					[ThisExpression | MemberExpression | Identifier],
					webpack.BasicEvaluatedExpression
				>
			>;
			evaluateDefinedIdentifier: HookMap<
				SyncBailHook<
					[ThisExpression | MemberExpression | Identifier],
					webpack.BasicEvaluatedExpression
				>
			>;
			evaluateCallExpressionMember: HookMap<
				SyncBailHook<
					[
						SimpleCallExpression | NewExpression,
						webpack.BasicEvaluatedExpression
					],
					webpack.BasicEvaluatedExpression
				>
			>;
			preStatement: SyncBailHook<
				[
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
					| FunctionDeclaration
					| VariableDeclaration
					| ClassDeclaration
					| ImportDeclaration
					| ExportNamedDeclaration
					| ExportDefaultDeclaration
					| ExportAllDeclaration
				],
				boolean | void
			>;
			blockPreStatement: SyncBailHook<
				[
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
					| FunctionDeclaration
					| VariableDeclaration
					| ClassDeclaration
					| ImportDeclaration
					| ExportNamedDeclaration
					| ExportDefaultDeclaration
					| ExportAllDeclaration
				],
				boolean | void
			>;
			statement: SyncBailHook<
				[
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
					| FunctionDeclaration
					| VariableDeclaration
					| ClassDeclaration
					| ImportDeclaration
					| ExportNamedDeclaration
					| ExportDefaultDeclaration
					| ExportAllDeclaration
				],
				boolean | void
			>;
			statementIf: SyncBailHook<[IfStatement], boolean | void>;
			classExtendsExpression: SyncBailHook<
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
					),
					ClassExpression | ClassDeclaration
				],
				boolean | void
			>;
			classBodyElement: SyncBailHook<
				[MethodDefinition, ClassExpression | ClassDeclaration],
				boolean | void
			>;
			label: HookMap<SyncBailHook<[LabeledStatement], boolean | void>>;
			import: SyncBailHook<
				[
					(
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
						| FunctionDeclaration
						| VariableDeclaration
						| ClassDeclaration
					),
					string | SimpleLiteral | RegExpLiteral
				],
				boolean | void
			>;
			importSpecifier: SyncBailHook<
				[
					(
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
						| FunctionDeclaration
						| VariableDeclaration
						| ClassDeclaration
					),
					string | SimpleLiteral | RegExpLiteral,
					string,
					string
				],
				boolean | void
			>;
			export: SyncBailHook<
				[
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
					| FunctionDeclaration
					| VariableDeclaration
					| ClassDeclaration
				],
				boolean | void
			>;
			exportImport: SyncBailHook<
				[
					(
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
						| FunctionDeclaration
						| VariableDeclaration
						| ClassDeclaration
					),
					string | SimpleLiteral | RegExpLiteral
				],
				boolean | void
			>;
			exportDeclaration: SyncBailHook<
				[
					(
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
						| FunctionDeclaration
						| VariableDeclaration
						| ClassDeclaration
					),
					FunctionDeclaration | VariableDeclaration | ClassDeclaration
				],
				boolean | void
			>;
			exportExpression: SyncBailHook<
				[
					(
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
						| FunctionDeclaration
						| VariableDeclaration
						| ClassDeclaration
					),
					FunctionDeclaration | VariableDeclaration | ClassDeclaration
				],
				boolean | void
			>;
			exportSpecifier: SyncBailHook<
				[
					(
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
						| FunctionDeclaration
						| VariableDeclaration
						| ClassDeclaration
					),
					string,
					string,
					number
				],
				boolean | void
			>;
			exportImportSpecifier: SyncBailHook<
				[
					(
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
						| FunctionDeclaration
						| VariableDeclaration
						| ClassDeclaration
					),
					string | SimpleLiteral | RegExpLiteral,
					string,
					string,
					number
				],
				boolean | void
			>;
			preDeclarator: SyncBailHook<
				[
					VariableDeclarator,
					(
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
						| FunctionDeclaration
						| VariableDeclaration
						| ClassDeclaration
					)
				],
				boolean | void
			>;
			declarator: SyncBailHook<
				[
					VariableDeclarator,
					(
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
						| FunctionDeclaration
						| VariableDeclaration
						| ClassDeclaration
					)
				],
				boolean | void
			>;
			varDeclaration: HookMap<
				SyncBailHook<
					[FunctionDeclaration | VariableDeclaration | ClassDeclaration],
					boolean | void
				>
			>;
			varDeclarationLet: HookMap<
				SyncBailHook<
					[FunctionDeclaration | VariableDeclaration | ClassDeclaration],
					boolean | void
				>
			>;
			varDeclarationConst: HookMap<
				SyncBailHook<
					[FunctionDeclaration | VariableDeclaration | ClassDeclaration],
					boolean | void
				>
			>;
			varDeclarationVar: HookMap<
				SyncBailHook<
					[FunctionDeclaration | VariableDeclaration | ClassDeclaration],
					boolean | void
				>
			>;
			pattern: HookMap<SyncBailHook<any, any>>;
			canRename: HookMap<
				SyncBailHook<
					[
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
					],
					boolean | void
				>
			>;
			rename: HookMap<
				SyncBailHook<
					[
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
					],
					boolean | void
				>
			>;
			assign: HookMap<SyncBailHook<[AssignmentExpression], boolean | void>>;
			assignMemberChain: HookMap<
				SyncBailHook<[AssignmentExpression, Array<string>], boolean | void>
			>;
			typeof: HookMap<
				SyncBailHook<
					[
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
					],
					boolean | void
				>
			>;
			importCall: SyncBailHook<
				[
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
				],
				boolean | void
			>;
			topLevelAwait: SyncBailHook<
				[
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
				],
				boolean | void
			>;
			call: HookMap<
				SyncBailHook<
					[
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
					],
					boolean | void
				>
			>;
			callMemberChain: HookMap<
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
						),
						Array<string>
					],
					boolean | void
				>
			>;
			memberChainOfCallMemberChain: HookMap<
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
						),
						Array<string>,
						SimpleCallExpression | NewExpression,
						Array<string>
					],
					boolean | void
				>
			>;
			callMemberChainOfCallMemberChain: HookMap<
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
						),
						Array<string>,
						SimpleCallExpression | NewExpression,
						Array<string>
					],
					boolean | void
				>
			>;
			new: HookMap<
				SyncBailHook<
					[
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
					],
					boolean | void
				>
			>;
			expression: HookMap<
				SyncBailHook<
					[
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
					],
					boolean | void
				>
			>;
			expressionMemberChain: HookMap<
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
						),
						Array<string>
					],
					boolean | void
				>
			>;
			expressionConditionalOperator: SyncBailHook<
				[
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
				],
				boolean | void
			>;
			expressionLogicalOperator: SyncBailHook<
				[
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
				],
				boolean | void
			>;
			program: SyncBailHook<[Program, Array<Comment>], boolean | void>;
			finish: SyncBailHook<[Program, Array<Comment>], boolean | void>;
		}>;
		options: any;
		sourceType: "module" | "script" | "auto";
		scope: webpack.ScopeInfo;
		state: Record<string, any> & webpack.ParserStateBase;
		comments: any;
		semicolons: any;
		statementEndPos: any;
		lastStatementEndPos: any;
		statementStartPos: any;
		currentTagData: any;
		initializeEvaluating(): void;
		getRenameIdentifier(expr?: any): any;
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
		walkSequenceExpression(expression?: any): void;
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
		walkImportExpression(expression?: any): void;
		walkCallExpression(expression?: any, args?: any): void;
		walkMemberExpression(expression?: any): void;
		walkMemberExpressionWithExpressionName(
			expression?: any,
			name?: any,
			rootInfo?: any,
			members?: any
		): void;
		walkThisExpression(expression?: any): void;
		walkIdentifier(expression?: any): void;
		callHooksForExpression(hookMap: any, expr: any, ...args: Array<any>): any;
		callHooksForExpressionWithFallback<T, R>(
			hookMap: HookMap<SyncBailHook<T, R>>,
			expr: MemberExpression,
			fallback: (
				arg0: string,
				arg1: string | webpack.ScopeInfo | webpack.VariableInfo,
				arg2: () => Array<string>
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
			info: string | webpack.ScopeInfo | webpack.VariableInfo,
			...args: AsArray<T>
		): R;
		callHooksForInfoWithFallback<T, R>(
			hookMap: HookMap<SyncBailHook<T, R>>,
			info: string | webpack.ScopeInfo | webpack.VariableInfo,
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
		evaluateExpression(
			expression:
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
		): webpack.BasicEvaluatedExpression;
		parseString(expression?: any): any;
		parseCalculatedString(expression?: any): any;
		evaluate(source?: any): webpack.BasicEvaluatedExpression;
		getComments(range?: any): any;
		isAsiPosition(pos?: any): any;
		getTagData(name?: any, tag?: any): any;
		tagVariable(name?: any, tag?: any, data?: any): void;
		defineVariable(name?: any): void;
		undefineVariable(name?: any): void;
		isVariableDefined(name?: any): boolean;
		getVariableInfo(
			name: string
		): string | webpack.ScopeInfo | webpack.VariableInfo;
		setVariable(
			name: string,
			variableInfo: string | webpack.ScopeInfo | webpack.VariableInfo
		): void;
		parseCommentOptions(range?: any): { options: any; errors: any };
		extractMemberExpressionChain(
			expression: MemberExpression
		): {
			members: Array<string>;
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
				| Super;
		};
		getFreeInfoFromVariable(
			varName: string
		): { name: string; info: string | webpack.VariableInfo };
		getMemberExpressionInfo(
			expression: MemberExpression,
			allowedTypes: Array<"expression" | "call">
		):
			| {
					type: "call";
					call: SimpleCallExpression | NewExpression;
					calleeName: string;
					rootInfo: string | webpack.VariableInfo;
					getCalleeMembers: () => Array<string>;
					name: string;
					getMembers: () => Array<string>;
			  }
			| {
					type: "expression";
					rootInfo: string | webpack.VariableInfo;
					name: string;
					getMembers: () => Array<string>;
			  };
		getNameForExpression(
			expression: MemberExpression
		): {
			name: string;
			rootInfo: string | webpack.ScopeInfo | webpack.VariableInfo;
			getMembers: () => Array<string>;
		};
	}
	export interface JsonpCompilationPluginHooks {
		jsonpScript: SyncWaterfallHook<[string, webpack.Chunk, string]>;
		linkPreload: SyncWaterfallHook<[string, webpack.Chunk, string]>;
		linkPrefetch: SyncWaterfallHook<[string, webpack.Chunk, string]>;
	}
	export type JsonpScriptType = false | "module" | "text/javascript";
	export class JsonpTemplatePlugin {
		constructor();

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
		static getCompilationHooks(
			compilation: webpack.Compilation
		): webpack.JsonpCompilationPluginHooks;
	}
	export interface KnownBuildMeta {
		moduleArgument?: string;
		exportsArgument?: string;
		strict?: boolean;
		moduleConcatenationBailout?: string;
		exportsType?: "default" | "namespace" | "flagged";
		defaultObject?: boolean | "redirect" | "redirect-warn";
		strictHarmonyModule?: boolean;
		async?: boolean;
	}
	export abstract class LazySet<T> {
		readonly size: number;
		add(item: T): webpack.LazySet<T>;
		addAll(iterable: webpack.LazySet<T> | Iterable<T>): webpack.LazySet<T>;
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
	export interface LibIdentOptions {
		/**
		 * absolute context path to which lib ident is relative to
		 */
		context: string;

		/**
		 * object for caching
		 */
		associatedObjectForCache?: any;
	}
	export class LibManifestPlugin {
		constructor(options?: any);
		options: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
	}
	export type Library =
		| string
		| Array<string>
		| webpack.LibraryCustomUmdObject
		| webpack.LibraryOptions;
	export interface LibraryContext<T> {
		compilation: webpack.Compilation;
		options: T;
	}

	/**
	 * Set explicit comments for `commonjs`, `commonjs2`, `amd`, and `root`.
	 */
	export interface LibraryCustomUmdCommentObject {
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
	export interface LibraryCustomUmdObject {
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
		root?: string | Array<string>;
	}
	export type LibraryExport = string | Array<string>;
	export type LibraryName =
		| string
		| Array<string>
		| webpack.LibraryCustomUmdObject;

	/**
	 * Options for library.
	 */
	export interface LibraryOptions {
		/**
		 * Add a comment in the UMD wrapper.
		 */
		auxiliaryComment?: string | webpack.LibraryCustomUmdCommentObject;

		/**
		 * Specify which export should be exposed as library.
		 */
		export?: string | Array<string>;

		/**
		 * The name of the library (some types allow unnamed libraries too).
		 */
		name?: string | Array<string> | webpack.LibraryCustomUmdObject;

		/**
		 * Type of library.
		 */
		type:
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
			| "system";

		/**
		 * If `output.libraryTarget` is set to umd and `output.library` is set, setting this to true will name the AMD module.
		 */
		umdNamedDefine?: boolean;
	}
	export class LibraryTemplatePlugin {
		constructor(
			name: string | Array<string> | webpack.LibraryCustomUmdObject,
			target:
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
				| "system",
			umdNamedDefine: boolean,
			auxiliaryComment: string | webpack.LibraryCustomUmdCommentObject,
			exportProperty: string | Array<string>
		);
		library: {
			type:
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
				| "system";
			name: string | Array<string> | webpack.LibraryCustomUmdObject;
			umdNamedDefine: boolean;
			auxiliaryComment: string | webpack.LibraryCustomUmdCommentObject;
			export: string | Array<string>;
		};

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
	}
	export class LimitChunkCountPlugin {
		constructor(options?: webpack.LimitChunkCountPluginOptions);
		options: webpack.LimitChunkCountPluginOptions;

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
	}

	/**
	 * This file was automatically generated.
	 * DO NOT MODIFY BY HAND.
	 * Run `yarn special-lint-fix` to update
	 */
	export interface LimitChunkCountPluginOptions {
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

	/**
	 * Custom values available in the loader context.
	 */
	export interface Loader {
		[index: string]: any;
	}
	export interface LoaderItem {
		loader: string;
		options: any;
		ident: string;
	}
	export class LoaderOptionsPlugin {
		constructor(options?: webpack.LoaderOptionsPluginOptions);
		options: webpack.LoaderOptionsPluginOptions;

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
	}

	/**
	 * This file was automatically generated.
	 * DO NOT MODIFY BY HAND.
	 * Run `yarn special-lint-fix` to update
	 */
	export interface LoaderOptionsPluginOptions {
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
	export class LoaderTargetPlugin {
		constructor(target: string);
		target: string;

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
	}
	export interface LogEntry {
		type: string;
		args: Array<any>;
		time: number;
		trace?: Array<string>;
	}
	export const MEASURE_END_OPERATION: unique symbol;
	export const MEASURE_START_OPERATION: unique symbol;
	export interface MainRenderContext {
		/**
		 * the chunk
		 */
		chunk: webpack.Chunk;

		/**
		 * the dependency templates
		 */
		dependencyTemplates: webpack.DependencyTemplates;

		/**
		 * the runtime template
		 */
		runtimeTemplate: webpack.RuntimeTemplate;

		/**
		 * the module graph
		 */
		moduleGraph: webpack.ModuleGraph;

		/**
		 * the chunk graph
		 */
		chunkGraph: webpack.ChunkGraph;

		/**
		 * results of code generation
		 */
		codeGenerationResults: Map<webpack.Module, webpack.CodeGenerationResult>;

		/**
		 * hash to be used for render call
		 */
		hash: string;
	}
	export abstract class MainTemplate {
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
				[
					string,
					webpack.Chunk,
					string,
					webpack.ModuleTemplate,
					webpack.DependencyTemplates
				]
			>;
			localVars: SyncWaterfallHook<[string, webpack.Chunk, string]>;
			requireExtensions: SyncWaterfallHook<[string, webpack.Chunk, string]>;
			requireEnsure: SyncWaterfallHook<[string, webpack.Chunk, string, string]>;
		}>;
		renderCurrentHashCode: (hash: string, length?: number) => string;
		getPublicPath: (options?: any) => string;
		getAssetPath: (path?: any, options?: any) => string;
		getAssetPathWithInfo: (
			path?: any,
			options?: any
		) => { path: string; info: webpack.AssetInfo };
		readonly requireFn: string;
		readonly outputOptions: any;
	}
	export interface MapOptions {
		columns?: boolean;
		module?: boolean;
	}

	/**
	 * Options object for in-memory caching.
	 */
	export interface MemoryCacheOptions {
		/**
		 * List of paths that are managed by a package manager and contain a version or hash in it's path so all files are immutable.
		 */
		immutablePaths?: Array<string>;

		/**
		 * List of paths that are managed by a package manager and can be trusted to not be modified otherwise.
		 */
		managedPaths?: Array<string>;

		/**
		 * In memory caching.
		 */
		type: "memory";
	}
	export class MemoryCachePlugin {
		constructor();

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
	}
	export class MinChunkSizePlugin {
		constructor(options: webpack.MinChunkSizePluginOptions);
		options: webpack.MinChunkSizePluginOptions;

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
	}

	/**
	 * This file was automatically generated.
	 * DO NOT MODIFY BY HAND.
	 * Run `yarn special-lint-fix` to update
	 */
	export interface MinChunkSizePluginOptions {
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
	export type Mode = "development" | "production" | "none";
	export class Module extends webpack.DependenciesBlock {
		constructor(type: string, context?: string);
		type: string;
		context: string;
		needId: boolean;
		debugId: number;
		resolveOptions: any;
		factoryMeta: any;
		buildMeta: webpack.KnownBuildMeta & Record<string, any>;
		buildInfo: any;
		presentationalDependencies: Array<webpack.Dependency>;
		id: string | number;
		readonly hash: string;
		readonly renderedHash: string;
		profile: webpack.ModuleProfile;
		index: number;
		index2: number;
		depth: number;
		issuer: webpack.Module;
		readonly usedExports: boolean | webpack.SortableSet<string>;
		readonly optimizationBailout: Array<
			string | ((requestShortener: webpack.RequestShortener) => string)
		>;
		readonly optional: boolean;
		addChunk(chunk?: any): boolean;
		removeChunk(chunk?: any): void;
		isInChunk(chunk?: any): boolean;
		isEntryModule(): boolean;
		getChunks(): Array<webpack.Chunk>;
		getNumberOfChunks(): number;
		readonly chunksIterable: Iterable<webpack.Chunk>;
		isProvided(exportName: string): boolean;
		readonly exportsArgument: string;
		readonly moduleArgument: string;
		getExportsType(
			strict: boolean
		):
			| "dynamic"
			| "dynamic-default"
			| "namespace"
			| "default-only"
			| "default-with-named";
		addPresentationalDependency(
			presentationalDependency: webpack.Dependency
		): void;
		addWarning(warning: webpack.WebpackError): void;
		getWarnings(): Iterable<webpack.WebpackError>;
		addError(error: webpack.WebpackError): void;
		getErrors(): Iterable<webpack.WebpackError>;

		/**
		 * removes all warnings and errors
		 */
		clearWarningsAndErrors(): void;
		isOptional(moduleGraph: webpack.ModuleGraph): boolean;
		isAccessibleInChunk(
			chunkGraph: webpack.ChunkGraph,
			chunk: webpack.Chunk,
			ignoreChunk?: webpack.Chunk
		): boolean;
		isAccessibleInChunkGroup(
			chunkGraph: webpack.ChunkGraph,
			chunkGroup: webpack.ChunkGroup,
			ignoreChunk?: webpack.Chunk
		): boolean;
		hasReasonForChunk(
			chunk: webpack.Chunk,
			moduleGraph: webpack.ModuleGraph,
			chunkGraph: webpack.ChunkGraph
		): boolean;
		hasReasons(moduleGraph: webpack.ModuleGraph): boolean;
		isModuleUsed(moduleGraph: webpack.ModuleGraph): boolean;
		isExportUsed(
			moduleGraph: webpack.ModuleGraph,
			exportName: string | Array<string>
		): 0 | 1 | 2 | 3 | 4;
		getUsedName(
			moduleGraph: webpack.ModuleGraph,
			exportName: string | Array<string>
		): string | false | Array<string>;
		needBuild(
			context: webpack.NeedBuildContext,
			callback: (arg0: webpack.WebpackError, arg1: boolean) => void
		): void;
		needRebuild(fileTimestamps?: any, contextTimestamps?: any): boolean;
		invalidateBuild(): void;
		identifier(): string;
		readableIdentifier(requestShortener: webpack.RequestShortener): string;
		build(
			options: webpack.WebpackOptionsNormalized,
			compilation: webpack.Compilation,
			resolver: webpack.Resolver & webpack.WithOptions,
			fs: webpack.InputFileSystem,
			callback: (arg0: webpack.WebpackError) => void
		): void;
		getSourceTypes(): Set<string>;
		source(sourceContext: webpack.SourceContext): webpack.Source;
		size(type?: string): number;
		libIdent(options: webpack.LibIdentOptions): string;
		nameForCondition(): string;
		getRuntimeRequirements(context: webpack.SourceContext): ReadonlySet<string>;
		codeGeneration(
			context: webpack.CodeGenerationContext
		): webpack.CodeGenerationResult;
		chunkCondition(
			chunk: webpack.Chunk,
			compilation: webpack.Compilation
		): boolean;

		/**
		 * Assuming this module is in the cache. Update the (cached) module with
		 * the fresh module from the factory. Usually updates internal references
		 * and properties.
		 */
		updateCacheModule(module: webpack.Module): void;
		originalSource(): webpack.Source;
		useSourceMap: any;
		readonly hasEqualsChunks: any;
		readonly isUsed: any;
		readonly errors: any;
		readonly warnings: any;
		used: any;
	}
	export class ModuleConcatenationPlugin {
		constructor(options?: any);
		options: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
	}
	export abstract class ModuleDependency extends webpack.Dependency {
		request: string;
		userRequest: string;
		range: any;
	}
	export abstract class ModuleFactory {
		create(
			data: webpack.ModuleFactoryCreateData,
			callback: (arg0: Error, arg1: webpack.ModuleFactoryResult) => void
		): void;
	}
	export interface ModuleFactoryCreateData {
		contextInfo: webpack.ModuleFactoryCreateDataContextInfo;
		resolveOptions?: any;
		context: string;
		dependencies: Array<webpack.Dependency>;
	}
	export interface ModuleFactoryCreateDataContextInfo {
		issuer: string;
		compiler: string;
	}
	export interface ModuleFactoryResult {
		/**
		 * the created module or unset if no module was created
		 */
		module?: webpack.Module;
		fileDependencies?: Set<string>;
		contextDependencies?: Set<string>;
		missingDependencies?: Set<string>;
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
	export class ModuleGraph {
		constructor();
		setParents(
			dependency: webpack.Dependency,
			block: webpack.DependenciesBlock,
			module: webpack.Module
		): void;
		getParentModule(dependency: webpack.Dependency): webpack.Module;
		getParentBlock(dependency: webpack.Dependency): webpack.DependenciesBlock;
		setResolvedModule(
			originModule: webpack.Module,
			dependency: webpack.Dependency,
			module: webpack.Module
		): void;
		updateModule(dependency: webpack.Dependency, module: webpack.Module): void;
		removeConnection(dependency: webpack.Dependency): void;
		addExplanation(dependency: webpack.Dependency, explanation: string): void;
		cloneModuleAttributes(
			sourceModule: webpack.Module,
			targetModule: webpack.Module
		): void;
		removeModuleAttributes(module: webpack.Module): void;
		removeAllModuleAttributes(): void;
		moveModuleConnections(
			oldModule: webpack.Module,
			newModule: webpack.Module,
			filterConnection: (arg0: webpack.ModuleGraphConnection) => boolean
		): void;
		addExtraReason(module: webpack.Module, explanation: string): void;
		getResolvedModule(dependency: webpack.Dependency): webpack.Module;
		finishModule(module: webpack.Module): void;
		getConnection(
			dependency: webpack.Dependency
		): webpack.ModuleGraphConnection;
		getModule(dependency: webpack.Dependency): webpack.Module;
		getOrigin(dependency: webpack.Dependency): webpack.Module;
		getResolvedOrigin(dependency: webpack.Dependency): webpack.Module;
		getIncomingConnections(
			module: webpack.Module
		): Iterable<webpack.ModuleGraphConnection>;
		getOutgoingConnections(
			module: webpack.Module
		): Iterable<webpack.ModuleGraphConnection>;
		getProfile(module: webpack.Module): webpack.ModuleProfile;
		setProfile(module: webpack.Module, profile: webpack.ModuleProfile): void;
		getIssuer(module: webpack.Module): webpack.Module;
		setIssuer(module: webpack.Module, issuer: webpack.Module): void;
		setIssuerIfUnset(module: webpack.Module, issuer: webpack.Module): void;
		getOptimizationBailout(
			module: webpack.Module
		): Array<string | ((requestShortener: webpack.RequestShortener) => string)>;
		getProvidedExports(module: webpack.Module): true | Array<string>;
		isExportProvided(
			module: webpack.Module,
			exportName: string | Array<string>
		): boolean;
		getExportsInfo(module: webpack.Module): webpack.ExportsInfo;
		getExportInfo(
			module: webpack.Module,
			exportName: string
		): webpack.ExportInfo;
		getReadOnlyExportInfo(
			module: webpack.Module,
			exportName: string
		): webpack.ExportInfo;
		getUsedExports(
			module: webpack.Module
		): boolean | webpack.SortableSet<string>;
		getPreOrderIndex(module: webpack.Module): number;
		getPostOrderIndex(module: webpack.Module): number;
		setPreOrderIndex(module: webpack.Module, index: number): void;
		setPreOrderIndexIfUnset(module: webpack.Module, index: number): boolean;
		setPostOrderIndex(module: webpack.Module, index: number): void;
		setPostOrderIndexIfUnset(module: webpack.Module, index: number): boolean;
		getDepth(module: webpack.Module): number;
		setDepth(module: webpack.Module, depth: number): void;
		setDepthIfLower(module: webpack.Module, depth: number): boolean;
		isAsync(module: webpack.Module): boolean;
		setAsync(module: webpack.Module): void;
		getMeta(thing?: any): any;
		static getModuleGraphForModule(
			module: webpack.Module,
			deprecateMessage: string,
			deprecationCode: string
		): webpack.ModuleGraph;
		static setModuleGraphForModule(
			module: webpack.Module,
			moduleGraph: webpack.ModuleGraph
		): void;
		static ModuleGraphConnection: typeof webpack.ModuleGraphConnection;
		static ExportsInfo: typeof webpack.ExportsInfo;
		static ExportInfo: typeof webpack.ExportInfo;
		static SKIP_OVER_NAME: typeof webpack.SKIP_OVER_NAME;
		static UsageState: Readonly<{
			NoInfo: 0;
			Unused: 1;
			Unknown: 2;
			OnlyPropertiesUsed: 3;
			Used: 4;
		}>;
	}
	export class ModuleGraphConnection {
		constructor(
			originModule: webpack.Module,
			dependency: webpack.Dependency,
			module: webpack.Module,
			explanation?: string,
			weak?: boolean,
			condition?: (arg0: webpack.ModuleGraphConnection) => boolean
		);
		originModule: webpack.Module;
		resolvedOriginModule: webpack.Module;
		dependency: webpack.Dependency;
		resolvedModule: webpack.Module;
		module: webpack.Module;
		weak: boolean;
		conditional: boolean;
		condition: (arg0: webpack.ModuleGraphConnection) => boolean;
		explanations: Set<string>;
		addCondition(
			condition: (arg0: webpack.ModuleGraphConnection) => boolean
		): void;
		addExplanation(explanation: string): void;
		readonly explanation: string;
		active: any;
	}

	/**
	 * Options affecting the normal modules (`NormalModuleFactory`).
	 */
	export interface ModuleOptions {
		/**
		 * An array of rules applied by default for modules.
		 */
		defaultRules?: Array<webpack.RuleSetRule>;

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
			| [string | Function | RegExp, string | Function | RegExp];

		/**
		 * An array of rules applied for modules.
		 */
		rules?: Array<webpack.RuleSetRule>;

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
	export interface ModulePathData {
		id: string | number;
		hash: string;
		hashWithLength?: (arg0: number) => string;
	}
	export abstract class ModuleProfile {
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
		mergeInto(realProfile: webpack.ModuleProfile): void;
	}
	export abstract class ModuleTemplate {
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
	export class MultiCompiler {
		constructor(
			compilers: Array<webpack.Compiler> | Record<string, webpack.Compiler>
		);
		hooks: Readonly<{
			done: SyncHook<[webpack.MultiStats], void>;
			invalid: MultiHook<SyncHook<[string, string], void>>;
			run: MultiHook<AsyncSeriesHook<[webpack.Compiler]>>;
			watchClose: SyncHook<[], void>;
			watchRun: MultiHook<AsyncSeriesHook<[webpack.Compiler]>>;
			infrastructureLog: MultiHook<
				SyncBailHook<[string, string, Array<any>], true>
			>;
		}>;
		compilers: Array<webpack.Compiler>;
		dependencies: WeakMap<webpack.Compiler, Array<string>>;
		running: boolean;
		readonly options: Array<webpack.WebpackOptionsNormalized>;
		readonly outputPath: string;
		inputFileSystem: webpack.InputFileSystem;
		outputFileSystem: webpack.OutputFileSystem;
		intermediateFileSystem: webpack.InputFileSystem &
			webpack.OutputFileSystem &
			webpack.IntermediateFileSystemExtras;
		getInfrastructureLogger(name?: any): webpack.WebpackLogger;
		setDependencies(
			compiler: webpack.Compiler,
			dependencies: Array<string>
		): void;
		validateDependencies(
			callback: webpack.CallbackCompiler<webpack.MultiStats>
		): boolean;
		runWithDependencies(
			compilers: Array<webpack.Compiler>,
			fn: (
				compiler: webpack.Compiler,
				callback: webpack.CallbackCompiler<webpack.MultiStats>
			) => any,
			callback: webpack.CallbackCompiler<webpack.MultiStats>
		): void;
		watch(
			watchOptions: webpack.WatchOptions | Array<webpack.WatchOptions>,
			handler: webpack.CallbackCompiler<webpack.MultiStats>
		): webpack.MultiWatching;
		run(callback: webpack.CallbackCompiler<webpack.MultiStats>): void;
		purgeInputFileSystem(): void;
		close(callback: webpack.CallbackCompiler<void>): void;
	}
	export abstract class MultiStats {
		stats: Array<webpack.Stats>;
		hash: string;
		hasErrors(): boolean;
		hasWarnings(): boolean;
		toJson(
			options?: any
		): {
			children: Array<any>;
			version: any;
			hash: string;
			errors: Array<any>;
			warnings: Array<any>;
		};
		toString(options?: any): string;
	}
	export abstract class MultiWatching {
		watchings: Array<webpack.Watching>;
		compiler: webpack.MultiCompiler;
		invalidate(): void;
		suspend(): void;
		resume(): void;
		close(callback: webpack.CallbackCompiler<void>): void;
	}
	export class NamedChunkIdsPlugin {
		constructor(options?: any);
		delimiter: any;
		context: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
	}
	export class NamedModuleIdsPlugin {
		constructor(options?: any);
		options: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
	}
	export class NaturalModuleIdsPlugin {
		constructor();

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
	}
	export interface NeedBuildContext {
		fileSystemInfo: webpack.FileSystemInfo;
	}
	export class NoEmitOnErrorsPlugin {
		constructor();

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
	}
	export type Node = false | webpack.NodeOptions;
	export class NodeEnvironmentPlugin {
		constructor(options?: any);
		options: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
	}

	/**
	 * Options object for node compatibility features.
	 */
	export interface NodeOptions {
		/**
		 * Include a polyfill for the 'global' variable.
		 */
		global?: boolean;
	}
	export class NodeTemplatePlugin {
		constructor(options?: any);
		asyncChunkLoading: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
	}
	export class NormalModule extends webpack.Module {
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
			loaders: Array<webpack.LoaderItem>;
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
			parser: webpack.Parser;
			/**
			 * the generator used
			 */
			generator: webpack.Generator;
			/**
			 * options used for resolving requests from this module
			 */
			resolveOptions: any;
		});
		request: string;
		userRequest: string;
		rawRequest: string;
		binary: boolean;
		parser: webpack.Parser;
		generator: webpack.Generator;
		resource: string;
		matchResource: string;
		loaders: Array<webpack.LoaderItem>;
		error: webpack.WebpackError;
		createSourceForAsset(
			context: string,
			name: string,
			content: string,
			sourceMap?: any,
			associatedObjectForCache?: any
		): webpack.Source;
		createLoaderContext(
			resolver: webpack.Resolver & webpack.WithOptions,
			options: webpack.WebpackOptionsNormalized,
			compilation: webpack.Compilation,
			fs: webpack.InputFileSystem
		): any;
		getCurrentLoader(loaderContext?: any, index?: any): webpack.LoaderItem;
		createSource(
			context: string,
			content: string | Buffer,
			sourceMap?: any,
			associatedObjectForCache?: any
		): webpack.Source;
		doBuild(
			options: webpack.WebpackOptionsNormalized,
			compilation: webpack.Compilation,
			resolver: webpack.Resolver & webpack.WithOptions,
			fs: webpack.InputFileSystem,
			callback: (arg0: webpack.WebpackError) => void
		): void;
		markModuleAsErrored(error: webpack.WebpackError): void;
		applyNoParseRule(rule?: any, content?: any): any;
		shouldPreventParsing(noParseRule?: any, request?: any): any;
		static getCompilationHooks(
			compilation: webpack.Compilation
		): webpack.NormalModuleCompilationHooks;
		static deserialize(context?: any): webpack.NormalModule;
	}
	export interface NormalModuleCompilationHooks {
		loader: SyncHook<[any, webpack.NormalModule], void>;
	}
	export abstract class NormalModuleFactory extends webpack.ModuleFactory {
		hooks: Readonly<{
			resolve: AsyncSeriesBailHook<[webpack.ResolveData], any>;
			factorize: AsyncSeriesBailHook<[webpack.ResolveData], any>;
			beforeResolve: AsyncSeriesBailHook<[webpack.ResolveData], any>;
			afterResolve: AsyncSeriesBailHook<[webpack.ResolveData], any>;
			createModule: SyncBailHook<[webpack.ResolveData], any>;
			module: SyncWaterfallHook<[webpack.Module, any, webpack.ResolveData]>;
			createParser: HookMap<SyncBailHook<any, any>>;
			parser: HookMap<SyncHook<any, void>>;
			createGenerator: HookMap<SyncBailHook<any, any>>;
			generator: HookMap<SyncHook<any, void>>;
		}>;
		resolverFactory: any;
		ruleSet: webpack.RuleSet;
		unsafeCache: boolean;
		cachePredicate: any;
		context: any;
		fs: any;
		parserCache: Map<string, WeakMap<any, any>>;
		generatorCache: Map<string, WeakMap<any, webpack.Generator>>;
		resolveRequestArray(
			contextInfo?: any,
			context?: any,
			array?: any,
			resolver?: any,
			resolveContext?: any,
			callback?: any
		): any;
		getParser(type?: any, parserOptions?: {}): any;
		createParser(type?: any, parserOptions?: {}): any;
		getGenerator(type?: any, generatorOptions?: {}): webpack.Generator;
		createGenerator(type?: any, generatorOptions?: {}): any;
		getResolver(type?: any, resolveOptions?: any): any;
	}
	export class NormalModuleReplacementPlugin {
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
		apply(compiler: webpack.Compiler): void;
	}
	export interface ObjectDeserializerContext {
		read: () => any;
	}
	export interface ObjectSerializer {
		serialize: (arg0: any, arg1: webpack.ObjectSerializerContext) => void;
		deserialize: (arg0: webpack.ObjectDeserializerContext) => any;
	}
	export interface ObjectSerializerContext {
		write: (arg0?: any) => void;
	}
	export class OccurrenceChunkIdsPlugin {
		constructor(options?: webpack.OccurrenceChunkIdsPluginOptions);
		options: webpack.OccurrenceChunkIdsPluginOptions;

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
	}

	/**
	 * This file was automatically generated.
	 * DO NOT MODIFY BY HAND.
	 * Run `yarn special-lint-fix` to update
	 */
	export interface OccurrenceChunkIdsPluginOptions {
		/**
		 * Prioritise initial size over total size.
		 */
		prioritiseInitial?: boolean;
	}
	export class OccurrenceModuleIdsPlugin {
		constructor(options?: webpack.OccurrenceModuleIdsPluginOptions);
		options: webpack.OccurrenceModuleIdsPluginOptions;

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
	}

	/**
	 * This file was automatically generated.
	 * DO NOT MODIFY BY HAND.
	 * Run `yarn special-lint-fix` to update
	 */
	export interface OccurrenceModuleIdsPluginOptions {
		/**
		 * Prioritise initial size over total size.
		 */
		prioritiseInitial?: boolean;
	}

	/**
	 * Enables/Disables integrated optimizations.
	 */
	export interface Optimization {
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
		 * Also flag chunks as loaded which contain a subset of the modules.
		 */
		flagIncludedChunks?: boolean;

		/**
		 * Creates a module-internal dependency graph for top level symbols, exports and imports, to improve unused exports detection.
		 */
		innerGraph?: boolean;

		/**
		 * Rename exports when possible to generate shorter code (depends on optimization.usedExports and optimization.providedExports).
		 */
		mangleExports?: boolean;

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
		minimizer?: Array<
			| ((this: webpack.Compiler, compiler: webpack.Compiler) => void)
			| webpack.WebpackPluginInstance
		>;

		/**
		 * Define the algorithm to choose module ids (natural: numeric ids in order of usage, named: readable ids for better debugging, hashed: (deprecated) short hashes as ids for better long term caching, deterministic: numeric hash ids for better long term caching, size: numeric ids focused on minimal initial download size, false: no algorithm used, as custom one can be provided via plugin).
		 */
		moduleIds?:
			| false
			| "natural"
			| "named"
			| "deterministic"
			| "size"
			| "hashed";

		/**
		 * Avoid emitting assets when errors occur.
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
		 * Skip over modules which are flagged to contain no side effects when exports are not used.
		 */
		sideEffects?: boolean;

		/**
		 * Optimize duplication and caching by splitting chunks by shared modules and cache group.
		 */
		splitChunks?: false | webpack.OptimizationSplitChunksOptions;

		/**
		 * Figure out which exports are used by modules to mangle export names, omit unused exports and generate more efficient code.
		 */
		usedExports?: boolean;
	}
	export type OptimizationRuntimeChunk =
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
	 * Options object for describing behavior of a cache group selecting modules that should be cached together.
	 */
	export interface OptimizationSplitChunksCacheGroup {
		/**
		 * Sets the name delimiter for created chunks.
		 */
		automaticNameDelimiter?: string;

		/**
		 * Select chunks for determining cache group content (defaults to "initial", "initial" and "all" requires adding these chunks to the HTML).
		 */
		chunks?:
			| "initial"
			| "async"
			| "all"
			| ((
					module: webpack.Module
			  ) =>
					| void
					| webpack.OptimizationSplitChunksCacheGroup
					| Array<webpack.OptimizationSplitChunksCacheGroup>);

		/**
		 * Ignore minimum size, minimum chunks and maximum requests and always create chunks for this cache group.
		 */
		enforce?: boolean;

		/**
		 * Sets the template for the filename for created chunks.
		 */
		filename?:
			| string
			| ((pathData: webpack.PathData, assetInfo: webpack.AssetInfo) => string);

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
	}

	/**
	 * Options object for splitting chunks into smaller chunks.
	 */
	export interface OptimizationSplitChunksOptions {
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
				| webpack.OptimizationSplitChunksCacheGroup;
		};

		/**
		 * Select chunks for determining shared modules (defaults to "async", "initial" and "all" requires adding these chunks to the HTML).
		 */
		chunks?: Function | "initial" | "async" | "all";

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
		};

		/**
		 * Sets the template for the filename for created chunks.
		 */
		filename?:
			| string
			| ((pathData: webpack.PathData, assetInfo: webpack.AssetInfo) => string);

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
		 * Give chunks created a name (chunks with equal name are merged).
		 */
		name?: string | false | Function;
	}
	export type OptimizationSplitChunksSizes =
		| number
		| { [index: string]: number };
	export abstract class OptionsApply {
		process(options?: any, compiler?: any): void;
	}

	/**
	 * Options affecting the output of the compilation. `output` options tell webpack how to write the compiled files to disk.
	 */
	export interface Output {
		/**
		 * The filename of asset modules as relative path inside the `output.path` directory.
		 */
		assetModuleFilename?:
			| string
			| ((pathData: webpack.PathData, assetInfo: webpack.AssetInfo) => string);

		/**
		 * Add a comment in the UMD wrapper.
		 */
		auxiliaryComment?: string | webpack.LibraryCustomUmdCommentObject;

		/**
		 * The callback function name used by webpack for loading of chunks in WebWorkers.
		 */
		chunkCallbackName?: string;

		/**
		 * The filename of non-entry chunks as relative path inside the `output.path` directory.
		 */
		chunkFilename?: string;

		/**
		 * Number of milliseconds before chunk request expires.
		 */
		chunkLoadTimeout?: number;

		/**
		 * Check if to be emitted file already exists and have the same content before writing to output filesystem.
		 */
		compareBeforeEmit?: boolean;

		/**
		 * This option enables cross-origin loading of chunks.
		 */
		crossOriginLoading?: false | "anonymous" | "use-credentials";

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
		 * The maximum EcmaScript version of the webpack generated code (doesn't include input source code from modules).
		 */
		ecmaVersion?: number;

		/**
		 * List of library types enabled for use by entry points.
		 */
		enabledLibraryTypes?: Array<
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
		>;

		/**
		 * Specifies the name of each output file on disk. You must **not** specify an absolute path here! The `output.path` option determines the location on disk the files are written to, filename is used solely for naming the individual files.
		 */
		filename?:
			| string
			| ((pathData: webpack.PathData, assetInfo: webpack.AssetInfo) => string);

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
		hashFunction?: string | typeof webpack.Hash;

		/**
		 * Any string which is added to the hash to salt it.
		 */
		hashSalt?: string;

		/**
		 * The filename of the Hot Update Chunks. They are inside the output.path directory.
		 */
		hotUpdateChunkFilename?: string;

		/**
		 * The JSONP function used by webpack for async loading of hot update chunks.
		 */
		hotUpdateFunction?: string;

		/**
		 * The filename of the Hot Update Main File. It is inside the `output.path` directory.
		 */
		hotUpdateMainFilename?: string;

		/**
		 * Wrap javascript code into IIFE's to avoid leaking into global scope.
		 */
		iife?: boolean;

		/**
		 * The JSONP function used by webpack for async loading of chunks.
		 */
		jsonpFunction?: string;

		/**
		 * This option enables loading async chunks via a custom script type, such as script type="module".
		 */
		jsonpScriptType?: false | "module" | "text/javascript";

		/**
		 * Make the output files a library, exporting the exports of the entry point.
		 */
		library?:
			| string
			| Array<string>
			| webpack.LibraryCustomUmdObject
			| webpack.LibraryOptions;

		/**
		 * Specify which export should be exposed as library.
		 */
		libraryExport?: string | Array<string>;

		/**
		 * Type of library.
		 */
		libraryTarget?:
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
			| "system";

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
		publicPath?:
			| string
			| ((pathData: webpack.PathData, assetInfo: webpack.AssetInfo) => string);

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
		 * The filename of WebAssembly modules as relative path inside the `output.path` directory.
		 */
		webassemblyModuleFilename?: string;
	}
	export interface OutputFileSystem {
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
	export interface OutputNormalized {
		/**
		 * The filename of asset modules as relative path inside the `output.path` directory.
		 */
		assetModuleFilename?:
			| string
			| ((pathData: webpack.PathData, assetInfo: webpack.AssetInfo) => string);

		/**
		 * The callback function name used by webpack for loading of chunks in WebWorkers.
		 */
		chunkCallbackName?: string;

		/**
		 * The filename of non-entry chunks as relative path inside the `output.path` directory.
		 */
		chunkFilename?: string;

		/**
		 * Number of milliseconds before chunk request expires.
		 */
		chunkLoadTimeout?: number;

		/**
		 * Check if to be emitted file already exists and have the same content before writing to output filesystem.
		 */
		compareBeforeEmit?: boolean;

		/**
		 * This option enables cross-origin loading of chunks.
		 */
		crossOriginLoading?: false | "anonymous" | "use-credentials";

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
		 * The maximum EcmaScript version of the webpack generated code (doesn't include input source code from modules).
		 */
		ecmaVersion?: number;

		/**
		 * List of library types enabled for use by entry points.
		 */
		enabledLibraryTypes?: Array<
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
		>;

		/**
		 * Specifies the name of each output file on disk. You must **not** specify an absolute path here! The `output.path` option determines the location on disk the files are written to, filename is used solely for naming the individual files.
		 */
		filename?:
			| string
			| ((pathData: webpack.PathData, assetInfo: webpack.AssetInfo) => string);

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
		hashFunction?: string | typeof webpack.Hash;

		/**
		 * Any string which is added to the hash to salt it.
		 */
		hashSalt?: string;

		/**
		 * The filename of the Hot Update Chunks. They are inside the output.path directory.
		 */
		hotUpdateChunkFilename?: string;

		/**
		 * The JSONP function used by webpack for async loading of hot update chunks.
		 */
		hotUpdateFunction?: string;

		/**
		 * The filename of the Hot Update Main File. It is inside the `output.path` directory.
		 */
		hotUpdateMainFilename?: string;

		/**
		 * Wrap javascript code into IIFE's to avoid leaking into global scope.
		 */
		iife?: boolean;

		/**
		 * The JSONP function used by webpack for async loading of chunks.
		 */
		jsonpFunction?: string;

		/**
		 * This option enables loading async chunks via a custom script type, such as script type="module".
		 */
		jsonpScriptType?: false | "module" | "text/javascript";

		/**
		 * Options for library.
		 */
		library?: webpack.LibraryOptions;

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
		publicPath?:
			| string
			| ((pathData: webpack.PathData, assetInfo: webpack.AssetInfo) => string);

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
		 * The filename of WebAssembly modules as relative path inside the `output.path` directory.
		 */
		webassemblyModuleFilename?: string;
	}
	export class Parser {
		constructor();
		parse(
			source: string | Record<string, any> | Buffer,
			state: Record<string, any> & webpack.ParserStateBase
		): Record<string, any> & webpack.ParserStateBase;
	}
	export interface ParserStateBase {
		current: webpack.NormalModule;
		module: webpack.NormalModule;
		compilation: webpack.Compilation;
		options: any;
	}
	export interface PathData {
		chunkGraph?: webpack.ChunkGraph;
		hash?: string;
		hashWithLength?: (arg0: number) => string;
		chunk?: webpack.Chunk | webpack.ChunkPathData;
		module?: webpack.Module | webpack.ModulePathData;
		filename?: string;
		basename?: string;
		query?: string;
		contentHashType?: string;
		contentHash?: string;
		contentHashWithLength?: (arg0: number) => string;
		noChunkHash?: boolean;
		url?: string;
	}
	export type Performance = false | webpack.PerformanceOptions;

	/**
	 * Configuration object for web performance recommendations.
	 */
	export interface PerformanceOptions {
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
	export interface Plugin {
		apply: () => void;
	}
	export class PrefetchPlugin {
		constructor(context?: any, request?: any);
		context: any;
		request: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
	}
	export interface PrintedElement {
		element: string;
		content: string;
	}
	export interface Problem {
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
	export class Profiler {
		constructor(inspector?: any);
		session: any;
		inspector: any;
		hasSession(): boolean;
		startProfiling(): Promise<void> | Promise<[any, any, any]>;
		sendCommand(method?: any, params?: any): Promise<any>;
		destroy(): Promise<void>;
		stopProfiling(): Promise<any>;
	}
	export class ProfilingPlugin {
		constructor(options?: webpack.ProfilingPluginOptions);
		outputPath: string;
		apply(compiler?: any): void;
		static Profiler: typeof webpack.Profiler;
	}

	/**
	 * This file was automatically generated.
	 * DO NOT MODIFY BY HAND.
	 * Run `yarn special-lint-fix` to update
	 */
	export interface ProfilingPluginOptions {
		/**
		 * Path to the output file e.g. `path.resolve(__dirname, 'profiling/events.json')`. Defaults to `events.json`.
		 */
		outputPath?: string;
	}
	export class ProgressPlugin {
		constructor(
			options:
				| webpack.ProgressPluginOptions
				| ((percentage: number, msg: string, ...args: Array<string>) => void)
		);
		profile: boolean;
		handler: (percentage: number, msg: string, ...args: Array<string>) => void;
		modulesCount: number;
		dependenciesCount: number;
		showEntries: boolean;
		showModules: boolean;
		showDependencies: boolean;
		showActiveModules: boolean;
		percentBy: "modules" | "dependencies" | "entries";
		apply(compiler: webpack.Compiler | webpack.MultiCompiler): void;
		static getReporter(
			compiler: webpack.Compiler
		): (p: number, ...args: Array<string>) => void;
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
	export type ProgressPluginArgument =
		| webpack.ProgressPluginOptions
		| ((percentage: number, msg: string, ...args: Array<string>) => void);

	/**
	 * Options object for the ProgressPlugin.
	 */
	export interface ProgressPluginOptions {
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
		handler?: (percentage: number, msg: string, ...args: Array<string>) => void;

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
	export class ProvidePlugin {
		constructor(definitions: Record<string, string | Array<string>>);
		definitions: Record<string, string | Array<string>>;

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
	}
	export type PublicPath =
		| string
		| ((pathData: webpack.PathData, assetInfo: webpack.AssetInfo) => string);
	export interface RawChunkGroupOptions {
		preloadOrder?: number;
		prefetchOrder?: number;
	}
	export class ReadFileCompileWasmPlugin {
		constructor(options?: any);
		options: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
	}
	export interface RealDependencyLocation {
		start: webpack.SourcePosition;
		end?: webpack.SourcePosition;
		index?: number;
	}
	export type RecursiveArrayOrRecord =
		| string
		| number
		| bigint
		| boolean
		| Function
		| RegExp
		| webpack.RuntimeValue
		| { [index: string]: RecursiveArrayOrRecordDeclarations }
		| Array<RecursiveArrayOrRecordDeclarations>;
	type RecursiveArrayOrRecordDeclarations =
		| string
		| number
		| bigint
		| boolean
		| Function
		| RegExp
		| webpack.RuntimeValue
		| { [index: string]: RecursiveArrayOrRecordDeclarations }
		| Array<RecursiveArrayOrRecordDeclarations>;
	export interface RenderBootstrapContext {
		/**
		 * the chunk
		 */
		chunk: webpack.Chunk;

		/**
		 * the runtime template
		 */
		runtimeTemplate: webpack.RuntimeTemplate;

		/**
		 * the module graph
		 */
		moduleGraph: webpack.ModuleGraph;

		/**
		 * the chunk graph
		 */
		chunkGraph: webpack.ChunkGraph;

		/**
		 * hash to be used for render call
		 */
		hash: string;
	}
	export interface RenderContextAsyncWebAssemblyModulesPlugin {
		/**
		 * the chunk
		 */
		chunk: any;

		/**
		 * the dependency templates
		 */
		dependencyTemplates: any;

		/**
		 * the runtime template
		 */
		runtimeTemplate: any;

		/**
		 * the module graph
		 */
		moduleGraph: any;

		/**
		 * the chunk graph
		 */
		chunkGraph: any;

		/**
		 * results of code generation
		 */
		codeGenerationResults: Map<webpack.Module, webpack.CodeGenerationResult>;
	}
	export interface RenderContextJavascriptModulesPlugin {
		/**
		 * the chunk
		 */
		chunk: webpack.Chunk;

		/**
		 * the dependency templates
		 */
		dependencyTemplates: webpack.DependencyTemplates;

		/**
		 * the runtime template
		 */
		runtimeTemplate: webpack.RuntimeTemplate;

		/**
		 * the module graph
		 */
		moduleGraph: webpack.ModuleGraph;

		/**
		 * the chunk graph
		 */
		chunkGraph: webpack.ChunkGraph;

		/**
		 * results of code generation
		 */
		codeGenerationResults: Map<webpack.Module, webpack.CodeGenerationResult>;
	}
	export interface RenderContextModuleTemplate {
		/**
		 * the chunk
		 */
		chunk: webpack.Chunk;

		/**
		 * the dependency templates
		 */
		dependencyTemplates: webpack.DependencyTemplates;

		/**
		 * the runtime template
		 */
		runtimeTemplate: webpack.RuntimeTemplate;

		/**
		 * the module graph
		 */
		moduleGraph: webpack.ModuleGraph;

		/**
		 * the chunk graph
		 */
		chunkGraph: webpack.ChunkGraph;
	}
	export interface RenderManifestEntry {
		render: () => webpack.Source;
		filenameTemplate:
			| string
			| ((arg0: webpack.PathData, arg1: webpack.AssetInfo) => string);
		pathOptions?: webpack.PathData;
		identifier: string;
		hash?: string;
		auxiliary?: boolean;
	}
	export interface RenderManifestOptions {
		/**
		 * the chunk used to render
		 */
		chunk: webpack.Chunk;
		hash: string;
		fullHash: string;
		outputOptions: any;
		codeGenerationResults: Map<webpack.Module, webpack.CodeGenerationResult>;
		moduleTemplates: { javascript: webpack.ModuleTemplate };
		dependencyTemplates: webpack.DependencyTemplates;
		runtimeTemplate: webpack.RuntimeTemplate;
		moduleGraph: webpack.ModuleGraph;
		chunkGraph: webpack.ChunkGraph;
	}
	export abstract class ReplaceSource extends webpack.Source {
		replace(start: number, end: number, newValue: string, name: string): void;
		insert(pos: number, newValue: string, name: string): void;
		getName(): string;
		original(): string;
		getReplacements(): Array<{
			start: number;
			end: number;
			content: string;
			insertIndex: number;
			name: string;
		}>;
	}
	export abstract class RequestShortener {
		contextify: (arg0: string) => string;
		shorten(request: string): string;
	}

	/**
	 * istanbul ignore next
	 */
	export interface ResolveBuildDependenciesResult {
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
	export interface ResolveContext {
		log?: (message: string) => void;
		fileDependencies?: webpack.WriteOnlySet<string>;
		contextDependencies?: webpack.WriteOnlySet<string>;
		missingDependencies?: webpack.WriteOnlySet<string>;
		stack?: Set<string>;
	}
	export interface ResolveData {
		contextInfo: webpack.ModuleFactoryCreateDataContextInfo;
		resolveOptions: any;
		context: string;
		request: string;
		dependencies: Array<webpack.ModuleDependency>;
		createData: any;
		fileDependencies: webpack.LazySet<string>;
		missingDependencies: webpack.LazySet<string>;
		contextDependencies: webpack.LazySet<string>;
	}

	/**
	 * Options object for resolving requests.
	 */
	export interface ResolveOptions {
		/**
		 * Redirect module requests.
		 */
		alias?:
			| Array<{
					/**
					 * New request.
					 */
					alias: string | false | Array<string>;
					/**
					 * Request to be redirected.
					 */
					name: string;
					/**
					 * Redirect only exact matching request.
					 */
					onlyModule?: boolean;
			  }>
			| { [index: string]: string | false | Array<string> };

		/**
		 * Fields in the description file (usually package.json) which are used to redirect requests inside the module.
		 */
		aliasFields?: Array<string | Array<string>>;

		/**
		 * Enable caching of successfully resolved requests (cache entries are revalidated).
		 */
		cache?: boolean;

		/**
		 * Predicate function to decide which requests should be cached.
		 */
		cachePredicate?: Function;

		/**
		 * Include the context information in the cache identifier when caching.
		 */
		cacheWithContext?: boolean;

		/**
		 * Filenames used to find a description file (like a package.json).
		 */
		descriptionFiles?: Array<string>;

		/**
		 * Enforce using one of the extensions from the extensions option.
		 */
		enforceExtension?: boolean;

		/**
		 * Extensions added to the request when trying to find the file.
		 */
		extensions?: Array<string>;

		/**
		 * Filesystem for the resolver.
		 */
		fileSystem?: { [index: string]: any };

		/**
		 * Field names from the description file (package.json) which are used to find the default entry point.
		 */
		mainFields?: Array<string | Array<string>>;

		/**
		 * Filenames used to find the default entry point if there is no description file or main field.
		 */
		mainFiles?: Array<string>;

		/**
		 * Folder names or directory paths where to find modules.
		 */
		modules?: Array<string>;

		/**
		 * Plugins for the resolver.
		 */
		plugins?: Array<webpack.ResolvePluginInstance>;

		/**
		 * Custom resolver.
		 */
		resolver?: { [index: string]: any };

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
	export interface ResolvePluginInstance {
		[index: string]: any;

		/**
		 * The run point of the plugin, required method.
		 */
		apply: (resolver?: any) => void;
	}
	export abstract class Resolver {
		resolve(
			context: Object,
			path: string,
			request: string,
			resolveContext: webpack.ResolveContext,
			callback: (
				err: NodeJS.ErrnoException,
				result: string,
				additionalInfo: Object
			) => void
		): void;
	}
	export interface ResolverCache {
		direct: WeakMap<any, webpack.Resolver & webpack.WithOptions>;
		stringified: Map<string, webpack.Resolver & webpack.WithOptions>;
	}
	export abstract class ResolverFactory {
		hooks: Readonly<{
			resolveOptions: HookMap<SyncWaterfallHook<[any]>>;
			resolver: HookMap<SyncHook<[webpack.Resolver, any, any], void>>;
		}>;
		cache: Map<string, webpack.ResolverCache>;
		get(
			type: string,
			resolveOptions?: any
		): webpack.Resolver & webpack.WithOptions;
	}
	export interface RuleSet {
		/**
		 * map of references in the rule set (may grow over time)
		 */
		references: Map<string, any>;

		/**
		 * execute the rule set
		 */
		exec: (arg0?: any) => Array<webpack.Effect>;
	}
	export type RuleSetCondition =
		| string
		| RegExp
		| {
				/**
				 * Logical AND.
				 */
				and?: Array<RuleSetConditionWebpackOptions>;
				/**
				 * Logical NOT.
				 */
				not?: Array<RuleSetConditionWebpackOptions>;
				/**
				 * Logical OR.
				 */
				or?: Array<RuleSetConditionWebpackOptions>;
		  }
		| ((value: string) => boolean)
		| Array<RuleSetConditionWebpackOptions>;
	export type RuleSetConditionAbsolute =
		| string
		| RegExp
		| {
				/**
				 * Logical AND.
				 */
				and?: Array<RuleSetConditionAbsoluteWebpackOptions>;
				/**
				 * Logical NOT.
				 */
				not?: Array<RuleSetConditionAbsoluteWebpackOptions>;
				/**
				 * Logical OR.
				 */
				or?: Array<RuleSetConditionAbsoluteWebpackOptions>;
		  }
		| ((value: string) => boolean)
		| Array<RuleSetConditionAbsoluteWebpackOptions>;
	type RuleSetConditionAbsoluteWebpackOptions =
		| string
		| RegExp
		| {
				/**
				 * Logical AND.
				 */
				and?: Array<RuleSetConditionAbsoluteWebpackOptions>;
				/**
				 * Logical NOT.
				 */
				not?: Array<RuleSetConditionAbsoluteWebpackOptions>;
				/**
				 * Logical OR.
				 */
				or?: Array<RuleSetConditionAbsoluteWebpackOptions>;
		  }
		| ((value: string) => boolean)
		| Array<RuleSetConditionAbsoluteWebpackOptions>;
	type RuleSetConditionWebpackOptions =
		| string
		| RegExp
		| {
				/**
				 * Logical AND.
				 */
				and?: Array<RuleSetConditionWebpackOptions>;
				/**
				 * Logical NOT.
				 */
				not?: Array<RuleSetConditionWebpackOptions>;
				/**
				 * Logical OR.
				 */
				or?: Array<RuleSetConditionWebpackOptions>;
		  }
		| ((value: string) => boolean)
		| Array<RuleSetConditionWebpackOptions>;
	export type RuleSetLoaderOptions = string | { [index: string]: any };

	/**
	 * A rule description with conditions and effects for modules.
	 */
	export interface RuleSetRule {
		/**
		 * Match the child compiler name.
		 */
		compiler?:
			| string
			| RegExp
			| {
					/**
					 * Logical AND.
					 */
					and?: Array<RuleSetConditionWebpackOptions>;
					/**
					 * Logical NOT.
					 */
					not?: Array<RuleSetConditionWebpackOptions>;
					/**
					 * Logical OR.
					 */
					or?: Array<RuleSetConditionWebpackOptions>;
			  }
			| ((value: string) => boolean)
			| Array<RuleSetConditionWebpackOptions>;

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
			| {
					/**
					 * Logical AND.
					 */
					and?: Array<RuleSetConditionAbsoluteWebpackOptions>;
					/**
					 * Logical NOT.
					 */
					not?: Array<RuleSetConditionAbsoluteWebpackOptions>;
					/**
					 * Logical OR.
					 */
					or?: Array<RuleSetConditionAbsoluteWebpackOptions>;
			  }
			| ((value: string) => boolean)
			| Array<RuleSetConditionAbsoluteWebpackOptions>;

		/**
		 * The options for the module generator.
		 */
		generator?: { [index: string]: any };

		/**
		 * Shortcut for resource.include.
		 */
		include?: RuleSetConditionAbsoluteWebpackOptions;

		/**
		 * Match the issuer of the module (The module pointing to this module).
		 */
		issuer?: RuleSetConditionAbsoluteWebpackOptions;

		/**
		 * Shortcut for use.loader.
		 */
		loader?: string;

		/**
		 * Only execute the first matching rule in this array.
		 */
		oneOf?: Array<webpack.RuleSetRule>;

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
		realResource?: RuleSetConditionAbsoluteWebpackOptions;

		/**
		 * Options for the resolver.
		 */
		resolve?: webpack.ResolveOptions;

		/**
		 * Match the resource path of the module.
		 */
		resource?: RuleSetConditionAbsoluteWebpackOptions;

		/**
		 * Match the resource query of the module.
		 */
		resourceQuery?: RuleSetConditionWebpackOptions;

		/**
		 * Match and execute these rules when this rule is matched.
		 */
		rules?: Array<webpack.RuleSetRule>;

		/**
		 * Flags a module as with or without side effects.
		 */
		sideEffects?: boolean;

		/**
		 * Shortcut for resource.test.
		 */
		test?: RuleSetConditionAbsoluteWebpackOptions;

		/**
		 * Module type to use for the module.
		 */
		type?: string;

		/**
		 * Modifiers applied to the module when rule is matched.
		 */
		use?:
			| string
			| Array<
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
									options?: string | { [index: string]: any };
							  }
							| __TypeWebpackOptions
							| Array<RuleSetUseItemWebpackOptions>)
			  >
			| ((data: {
					resource: string;
					realResource: string;
					resourceQuery: string;
					issuer: string;
					compiler: string;
			  }) => Array<RuleSetUseItemWebpackOptions>)
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
	}
	export type RuleSetUse =
		| string
		| Array<
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
								options?: string | { [index: string]: any };
						  }
						| __TypeWebpackOptions
						| Array<RuleSetUseItemWebpackOptions>)
		  >
		| ((data: {
				resource: string;
				realResource: string;
				resourceQuery: string;
				issuer: string;
				compiler: string;
		  }) => Array<RuleSetUseItemWebpackOptions>)
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
	export type RuleSetUseItem =
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
	type RuleSetUseItemWebpackOptions =
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
						options?: string | { [index: string]: any };
				  }
				| __TypeWebpackOptions
				| Array<RuleSetUseItemWebpackOptions>);
	export type RulesBannerPlugin = string | RegExp | Array<string | RegExp>;
	export type RulesSourceMapDevToolPlugin =
		| string
		| RegExp
		| Array<string | RegExp>;
	export class RuntimeChunkPlugin {
		constructor(options?: any);
		options: any;

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
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
		export let chunkName: string;
		export let getChunkScriptFilename: string;
		export let getChunkUpdateScriptFilename: string;
		export let startup: string;
		export let startupNoDefault: string;
		export let interceptModuleExecution: string;
		export let global: string;
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
	}
	export class RuntimeModule extends webpack.Module {
		constructor(name: string, stage?: number);
		name: string;
		stage: number;
		compilation: webpack.Compilation;
		chunk: webpack.Chunk;
		attach(compilation: webpack.Compilation, chunk: webpack.Chunk): void;
		generate(): string;
		getGeneratedCode(): string;
	}
	export abstract class RuntimeTemplate {
		outputOptions: webpack.Output;
		requestShortener: webpack.RequestShortener;
		isIIFE(): boolean;
		supportsConst(): boolean;
		supportsArrowFunction(): boolean;
		supportsForOf(): boolean;
		returningFunction(returnValue?: any, args?: string): string;
		basicFunction(args?: any, body?: any): string;
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
			chunkGraph: webpack.ChunkGraph;
			/**
			 * the module
			 */
			module: webpack.Module;
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
			type: "expression" | "promise" | "statements";
		}): string;
		moduleId(__0: {
			/**
			 * the module
			 */
			module: webpack.Module;
			/**
			 * the chunk graph
			 */
			chunkGraph: webpack.ChunkGraph;
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
			module: webpack.Module;
			/**
			 * the chunk graph
			 */
			chunkGraph: webpack.ChunkGraph;
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
			module: webpack.Module;
			/**
			 * the chunk graph
			 */
			chunkGraph: webpack.ChunkGraph;
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
			module: webpack.Module;
			/**
			 * the chunk graph
			 */
			chunkGraph: webpack.ChunkGraph;
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
			chunkGraph: webpack.ChunkGraph;
			/**
			 * the current dependencies block
			 */
			block?: webpack.AsyncDependenciesBlock;
			/**
			 * the module
			 */
			module: webpack.Module;
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
			module: webpack.Module;
			/**
			 * the chunk graph
			 */
			chunkGraph: webpack.ChunkGraph;
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
			originModule: webpack.Module;
			/**
			 * true, if this is a weak dependency
			 */
			weak?: boolean;
			/**
			 * if set, will be filled with runtime requirements
			 */
			runtimeRequirements: Set<string>;
		}): string;
		exportFromImport(__0: {
			/**
			 * the module graph
			 */
			moduleGraph: webpack.ModuleGraph;
			/**
			 * the module
			 */
			module: webpack.Module;
			/**
			 * the request
			 */
			request: string;
			/**
			 * the export name
			 */
			exportName: string | Array<string>;
			/**
			 * the origin module
			 */
			originModule: webpack.Module;
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
			initFragments: Array<webpack.InitFragment>;
			/**
			 * if set, will be filled with runtime requirements
			 */
			runtimeRequirements: Set<string>;
		}): string;
		blockPromise(__0: {
			/**
			 * the async block
			 */
			block: webpack.AsyncDependenciesBlock;
			/**
			 * the message
			 */
			message: string;
			/**
			 * the chunk graph
			 */
			chunkGraph: webpack.ChunkGraph;
			/**
			 * if set, will be filled with runtime requirements
			 */
			runtimeRequirements: Set<string>;
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
	export abstract class RuntimeValue {
		fn: any;
		fileDependencies: any;
		exec(parser?: any): any;
	}
	export const SKIP_OVER_NAME: unique symbol;
	export interface ScopeInfo {
		definitions: webpack.StackedMap<
			string,
			webpack.ScopeInfo | webpack.VariableInfo
		>;
		topLevelScope: boolean | "arrow";
		inShorthand: boolean;
		isStrict: boolean;
		isAsmJs: boolean;
		inTry: boolean;
	}
	export abstract class Serializer {
		serializeMiddlewares: any;
		deserializeMiddlewares: any;
		context: any;
		serialize(obj?: any, context?: any): any;
		deserialize(value?: any, context?: any): any;
	}
	export class SideEffectsFlagPlugin {
		constructor();

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
		static moduleHasSideEffects(
			moduleName?: any,
			flagValue?: any,
			cache?: any
		): any;
	}

	/**
	 * istanbul ignore next
	 */
	export interface Snapshot {
		startTime?: number;
		fileTimestamps?: Map<string, webpack.FileSystemInfoEntry>;
		fileHashes?: Map<string, string>;
		contextTimestamps?: Map<string, webpack.FileSystemInfoEntry>;
		contextHashes?: Map<string, string>;
		missingExistence?: Map<string, boolean>;
		managedItemInfo?: Map<string, string>;
		children?: Set<webpack.Snapshot>;
	}
	export abstract class SortableSet<T> extends Set<T> {
		/**
		 * Sort with a comparer function
		 */
		sortWith(sortFn: (arg0: T, arg1: T) => number): void;
		sort(): void;

		/**
		 * Get data from cache
		 */
		getFromCache<R>(fn: (arg0: webpack.SortableSet<T>) => R): R;

		/**
		 * Get data from cache (ignoring sorting)
		 */
		getFromUnorderedCache<R>(fn: (arg0: webpack.SortableSet<T>) => R): R;
		toJSON(): Array<T>;

		/**
		 * Iterates over values in the set.
		 */
		[Symbol.iterator](): IterableIterator<T>;
		readonly [Symbol.toStringTag]: string;
	}
	export abstract class Source {
		size(): number;
		map(options: webpack.MapOptions): Object;
		sourceAndMap(
			options: webpack.MapOptions
		): { source: string | Buffer; map: Object };
		updateHash(hash: webpack.Hash): void;
		source(): string | Buffer;
		buffer(): Buffer;
	}
	export interface SourceContext {
		/**
		 * the dependency templates
		 */
		dependencyTemplates: webpack.DependencyTemplates;

		/**
		 * the runtime template
		 */
		runtimeTemplate: webpack.RuntimeTemplate;

		/**
		 * the module graph
		 */
		moduleGraph: webpack.ModuleGraph;

		/**
		 * the chunk graph
		 */
		chunkGraph: webpack.ChunkGraph;

		/**
		 * the type of source that should be generated
		 */
		type?: string;
	}
	export class SourceMapDevToolPlugin {
		constructor(options?: webpack.SourceMapDevToolPluginOptions);
		sourceMapFilename: string | false;
		sourceMappingURLComment: string | false;
		moduleFilenameTemplate: string | Function;
		fallbackModuleFilenameTemplate: string | Function;
		namespace: string;
		options: webpack.SourceMapDevToolPluginOptions;

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
	}
	export interface SourceMapDevToolPluginOptions {
		/**
		 * Appends the given value to the original asset. Usually the #sourceMappingURL comment. [url] is replaced with a URL to the source map file. false disables the appending.
		 */
		append?: string | false;

		/**
		 * Indicates whether column mappings should be used (defaults to true).
		 */
		columns?: boolean;

		/**
		 * Exclude modules that match the given value from source map generation.
		 */
		exclude?: string | RegExp | Array<string | RegExp>;

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
		filename?: string | false;

		/**
		 * Include source maps for module paths that match the given value.
		 */
		include?: string | RegExp | Array<string | RegExp>;

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
		test?: string | RegExp | Array<string | RegExp>;
	}
	export interface SourcePosition {
		line: number;
		column?: number;
	}
	export interface SplitChunksOptions {
		chunksFilter: (chunk: webpack.Chunk) => boolean;
		minSize: Record<string, number>;
		minRemainingSize: Record<string, number>;
		maxInitialSize: Record<string, number>;
		maxAsyncSize: Record<string, number>;
		minChunks: number;
		maxAsyncRequests: number;
		maxInitialRequests: number;
		hidePathInfo: boolean;
		filename:
			| string
			| ((arg0: webpack.PathData, arg1: webpack.AssetInfo) => string);
		automaticNameDelimiter: string;
		getCacheGroups: (
			module: webpack.Module,
			context: webpack.CacheGroupsContext
		) => Array<webpack.CacheGroupSource>;
		getName: (
			module?: webpack.Module,
			chunks?: Array<webpack.Chunk>,
			key?: string
		) => string;
		fallbackCacheGroup: webpack.FallbackCacheGroup;
	}
	export class SplitChunksPlugin {
		constructor(options?: webpack.OptimizationSplitChunksOptions);
		options: webpack.SplitChunksOptions;

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
	}
	export abstract class StackedMap<K, V> {
		map: Map<K, V | typeof webpack.TOMBSTONE | typeof webpack.UNDEFINED_MARKER>;
		stack: Array<
			Map<K, V | typeof webpack.TOMBSTONE | typeof webpack.UNDEFINED_MARKER>
		>;
		set(item: K, value: V): void;
		delete(item: K): void;
		has(item: K): boolean;
		get(item: K): V;
		asArray(): Array<K>;
		asSet(): Set<K>;
		asPairArray(): Array<[K, V]>;
		asMap(): Map<K, V>;
		readonly size: number;
		createChild(): webpack.StackedMap<K, V>;
	}
	export type Statement =
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
		| FunctionDeclaration
		| VariableDeclaration
		| ClassDeclaration;
	export class Stats {
		constructor(compilation: webpack.Compilation);
		compilation: webpack.Compilation;
		hash: string;
		startTime: any;
		endTime: any;
		hasWarnings(): boolean;
		hasErrors(): boolean;
		toJson(options?: any): any;
		toString(options?: any): any;
	}
	export abstract class StatsFactory {
		hooks: Readonly<{
			extract: HookMap<SyncBailHook<[any, any, any], any>>;
			filter: HookMap<SyncBailHook<[any, any, number, number], any>>;
			sort: HookMap<
				SyncBailHook<[Array<(arg0?: any, arg1?: any) => number>, any], any>
			>;
			filterSorted: HookMap<SyncBailHook<[any, any, number, number], any>>;
			sortResults: HookMap<
				SyncBailHook<[Array<(arg0?: any, arg1?: any) => number>, any], any>
			>;
			filterResults: HookMap<SyncBailHook<any, any>>;
			merge: HookMap<SyncBailHook<[Array<any>, any], any>>;
			result: HookMap<SyncBailHook<[Array<any>, any], any>>;
			getItemName: HookMap<SyncBailHook<[any, any], any>>;
			getItemFactory: HookMap<SyncBailHook<[any, any], any>>;
		}>;
		create(type?: any, data?: any, baseContext?: any): any;
	}

	/**
	 * Stats options object.
	 */
	export interface StatsOptions {
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
		 * Add children information.
		 */
		children?: boolean;

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
		 * Add root modules information to chunk information.
		 */
		chunkRootModules?: boolean;

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
		 * Add module depth in module graph.
		 */
		depth?: boolean;

		/**
		 * Display the entry points with the corresponding bundles.
		 */
		entrypoints?: boolean;

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
		 * Please use excludeModules instead.
		 */
		exclude?:
			| string
			| boolean
			| RegExp
			| Array<string | RegExp | ((value: string) => boolean)>
			| ((value: string) => boolean);

		/**
		 * Suppress assets that match the specified filters. Filters can be Strings, RegExps or Functions.
		 */
		excludeAssets?:
			| string
			| RegExp
			| Array<string | RegExp | ((value: string) => boolean)>
			| ((value: string) => boolean);

		/**
		 * Suppress modules that match the specified filters. Filters can be Strings, RegExps, Booleans or Functions.
		 */
		excludeModules?:
			| string
			| boolean
			| RegExp
			| Array<string | RegExp | ((value: string) => boolean)>
			| ((value: string) => boolean);

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
			| Array<string | RegExp | ((value: string) => boolean)>
			| ((value: string) => boolean);

		/**
		 * Add stack traces to logging output.
		 */
		loggingTrace?: boolean;

		/**
		 * Set the maximum number of modules to be shown.
		 */
		maxModules?: number;

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
		 * Add information about runtime modules.
		 */
		runtime?: boolean;

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
		 * Suppress warnings that match the specified filters. Filters can be Strings, RegExps or Functions.
		 */
		warningsFilter?:
			| string
			| RegExp
			| Array<string | RegExp | ((value: string) => boolean)>
			| ((value: string) => boolean);
	}
	export abstract class StatsPrinter {
		hooks: Readonly<{
			sortElements: HookMap<SyncBailHook<[Array<string>, any], any>>;
			printElements: HookMap<
				SyncBailHook<[Array<webpack.PrintedElement>, any], any>
			>;
			sortItems: HookMap<SyncBailHook<[Array<any>, any], any>>;
			getItemName: HookMap<SyncBailHook<[any, any], any>>;
			printItems: HookMap<SyncBailHook<[Array<string>, any], any>>;
			print: HookMap<SyncBailHook<[any, any], any>>;
			result: HookMap<SyncWaterfallHook<[string, any]>>;
		}>;
		print(type?: any, object?: any, baseContext?: any): any;
	}
	export type StatsValue =
		| boolean
		| "none"
		| "errors-only"
		| "minimal"
		| "normal"
		| "detailed"
		| "verbose"
		| "errors-warnings"
		| webpack.StatsOptions;
	export interface SyntheticDependencyLocation {
		name: string;
		index?: number;
	}
	export const TOMBSTONE: unique symbol;
	export interface TagInfo {
		tag: any;
		data: any;
		next: webpack.TagInfo;
	}
	export type Target =
		| "web"
		| "webworker"
		| "node"
		| "async-node"
		| "node-webkit"
		| "electron-main"
		| "electron-renderer"
		| "electron-preload"
		| ((compiler: webpack.Compiler) => void);
	export class Template {
		constructor();
		static getFunctionContent(fn: Function): string;
		static toIdentifier(str: string): string;
		static toComment(str: string): string;
		static toNormalComment(str: string): string;
		static toPath(str: string): string;
		static numberToIdentifier(n: number): string;
		static numberToIdentifierContinuation(n: number): string;
		static indent(s: string | Array<string>): string;
		static prefix(s: string | Array<string>, prefix: string): string;
		static asString(str: string | Array<string>): string;
		static getModulesArrayBounds(
			modules: Array<webpack.WithId>
		): false | [number, number];
		static renderChunkModules(
			renderContext: webpack.RenderContextModuleTemplate,
			modules: Array<webpack.Module>,
			renderModule: (arg0: webpack.Module) => webpack.Source,
			prefix?: string
		): webpack.Source;
		static renderRuntimeModules(
			runtimeModules: Array<webpack.RuntimeModule>,
			renderContext: webpack.RenderContextModuleTemplate
		): webpack.Source;
		static renderChunkRuntimeModules(
			runtimeModules: Array<webpack.RuntimeModule>,
			renderContext: webpack.RenderContextModuleTemplate
		): webpack.Source;
		static NUMBER_OF_IDENTIFIER_START_CHARS: number;
		static NUMBER_OF_IDENTIFIER_CONTINUATION_CHARS: number;
	}
	export const UNDEFINED_MARKER: unique symbol;
	export interface UpdateHashContext {
		/**
		 * the module
		 */
		module: webpack.NormalModule;

		/**
		 * the compilation
		 */
		compilation: webpack.Compilation;
	}
	export abstract class VariableInfo {
		declaredScope: webpack.ScopeInfo;
		freeName: string | true;
		tagInfo: webpack.TagInfo;
	}
	export class WatchIgnorePlugin {
		constructor(options: webpack.WatchIgnorePluginOptions);
		paths: [string | RegExp, string | RegExp];

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
	}

	/**
	 * This file was automatically generated.
	 * DO NOT MODIFY BY HAND.
	 * Run `yarn special-lint-fix` to update
	 */
	export interface WatchIgnorePluginOptions {
		/**
		 * A list of RegExps or absolute paths to directories or files that should be ignored.
		 */
		paths: [string | RegExp, string | RegExp];
	}

	/**
	 * Options for the watcher.
	 */
	export interface WatchOptions {
		/**
		 * Delay the rebuilt after the first change. Value is a time in ms.
		 */
		aggregateTimeout?: number;

		/**
		 * Ignore some files from watching (glob pattern).
		 */
		ignored?: string | Array<string>;

		/**
		 * Enable polling mode for watching.
		 */
		poll?: number | boolean;

		/**
		 * Stop watching when stdin stream has ended.
		 */
		stdin?: boolean;
	}
	export abstract class Watching {
		startTime: number;
		invalid: boolean;
		handler: webpack.CallbackCompiler<webpack.Stats>;
		callbacks: Array<webpack.CallbackCompiler<void>>;
		closed: boolean;
		suspended: boolean;
		watchOptions: {
			/**
			 * Delay the rebuilt after the first change. Value is a time in ms.
			 */
			aggregateTimeout?: number;
			/**
			 * Ignore some files from watching (glob pattern).
			 */
			ignored?: string | Array<string>;
			/**
			 * Enable polling mode for watching.
			 */
			poll?: number | boolean;
			/**
			 * Stop watching when stdin stream has ended.
			 */
			stdin?: boolean;
		};
		compiler: webpack.Compiler;
		running: boolean;
		watcher: any;
		pausedWatcher: any;
		watch(
			files: Iterable<string>,
			dirs: Iterable<string>,
			missing: Iterable<string>
		): void;
		invalidate(callback?: webpack.CallbackCompiler<void>): void;
		suspend(): void;
		resume(): void;
		close(callback: webpack.CallbackCompiler<void>): void;
	}
	export class WebWorkerTemplatePlugin {
		constructor();

		/**
		 * Apply the plugin
		 */
		apply(compiler: webpack.Compiler): void;
	}
	export interface WebpackError extends Error {
		details: any;
		module: webpack.Module;
		loc: webpack.SyntheticDependencyLocation | webpack.RealDependencyLocation;
		hideStack: boolean;
		chunk: webpack.Chunk;
		file: string;
		serialize(__0: { write: any }): void;
		deserialize(__0: { read: any }): void;
	}
	export abstract class WebpackLogger {
		getChildLogger: (arg0: string | (() => string)) => webpack.WebpackLogger;
		error(...args: Array<any>): void;
		warn(...args: Array<any>): void;
		info(...args: Array<any>): void;
		log(...args: Array<any>): void;
		debug(...args: Array<any>): void;
		assert(assertion: any, ...args: Array<any>): void;
		trace(): void;
		clear(): void;
		status(...args: Array<any>): void;
		group(...args: Array<any>): void;
		groupCollapsed(...args: Array<any>): void;
		groupEnd(...args: Array<any>): void;
		profile(label?: any): void;
		profileEnd(label?: any): void;
		time(label?: any): void;
		timeLog(label?: any): void;
		timeEnd(label?: any): void;
		timeAggregate(label?: any): void;
		timeAggregateEnd(label?: any): void;
	}

	/**
	 * Options object as provided by the user.
	 */
	export interface WebpackOptions {
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
		cache?: boolean | webpack.MemoryCacheOptions | webpack.FileCacheOptions;

		/**
		 * The base directory (absolute path!) for resolving the `entry` option. If `output.pathinfo` is set, the included pathinfo is shortened to this directory.
		 */
		context?: string;

		/**
		 * References to other configurations to depend on.
		 */
		dependencies?: Array<string>;

		/**
		 * Options for the webpack-dev-server.
		 */
		devServer?: webpack.DevServer;

		/**
		 * A developer tool to enhance debugging (false | eval | [inline-|hidden-|eval-][nosources-][cheap-[module-]]source-map).
		 */
		devtool?: string | false;

		/**
		 * The entry point(s) of the compilation.
		 */
		entry?:
			| string
			| (() =>
					| string
					| webpack.EntryObject
					| [string, string]
					| Promise<string | webpack.EntryObject | [string, string]>)
			| webpack.EntryObject
			| [string, string];

		/**
		 * Enables/Disables experiments (experimental features with relax SemVer compatibility).
		 */
		experiments?: webpack.Experiments;

		/**
		 * Specify dependencies that shouldn't be resolved by webpack, but should become dependencies of the resulting bundle. The kind of the dependency depends on `output.libraryTarget`.
		 */
		externals?:
			| string
			| RegExp
			| Array<
					| string
					| RegExp
					| {
							[index: string]:
								| string
								| boolean
								| Array<string>
								| { [index: string]: any };
					  }
					| ((
							context: string,
							request: string,
							callback: (err: Error, result: string) => void
					  ) => void)
			  >
			| {
					[index: string]:
						| string
						| boolean
						| Array<string>
						| { [index: string]: any };
			  }
			| ((
					context: string,
					request: string,
					callback: (err: Error, result: string) => void
			  ) => void);

		/**
		 * Specifies the default type of externals ('amd*', 'umd*', 'system' and 'jsonp' depend on output.libraryTarget set to the same value).
		 */
		externalsType?:
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
			| "system";

		/**
		 * Options for infrastructure level logging.
		 */
		infrastructureLogging?: webpack.InfrastructureLogging;

		/**
		 * Custom values available in the loader context.
		 */
		loader?: webpack.Loader;

		/**
		 * Enable production optimizations or development hints.
		 */
		mode?: "development" | "production" | "none";

		/**
		 * Options affecting the normal modules (`NormalModuleFactory`).
		 */
		module?: webpack.ModuleOptions;

		/**
		 * Name of the configuration. Used when loading multiple configurations.
		 */
		name?: string;

		/**
		 * Include polyfills or mocks for various node stuff.
		 */
		node?: false | webpack.NodeOptions;

		/**
		 * Enables/Disables integrated optimizations.
		 */
		optimization?: webpack.Optimization;

		/**
		 * Options affecting the output of the compilation. `output` options tell webpack how to write the compiled files to disk.
		 */
		output?: webpack.Output;

		/**
		 * The number of parallel processed modules in the compilation.
		 */
		parallelism?: number;

		/**
		 * Configuration for web performance recommendations.
		 */
		performance?: false | webpack.PerformanceOptions;

		/**
		 * Add additional plugins to the compiler.
		 */
		plugins?: Array<
			| ((this: webpack.Compiler, compiler: webpack.Compiler) => void)
			| webpack.WebpackPluginInstance
		>;

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
		resolve?: webpack.ResolveOptions;

		/**
		 * Options for the resolver when resolving loaders.
		 */
		resolveLoader?: webpack.ResolveOptions;

		/**
		 * Stats options object or preset name.
		 */
		stats?:
			| boolean
			| "none"
			| "errors-only"
			| "minimal"
			| "normal"
			| "detailed"
			| "verbose"
			| "errors-warnings"
			| webpack.StatsOptions;

		/**
		 * Environment to build for.
		 */
		target?:
			| "web"
			| "webworker"
			| "node"
			| "async-node"
			| "node-webkit"
			| "electron-main"
			| "electron-renderer"
			| "electron-preload"
			| ((compiler: webpack.Compiler) => void);

		/**
		 * Enter watch mode, which rebuilds on file change.
		 */
		watch?: boolean;

		/**
		 * Options for the watcher.
		 */
		watchOptions?: webpack.WatchOptions;
	}
	export class WebpackOptionsApply extends webpack.OptionsApply {
		constructor();
	}
	export class WebpackOptionsDefaulter {
		constructor();
		process(options?: any): any;
	}

	/**
	 * Normalized webpack options object.
	 */
	export interface WebpackOptionsNormalized {
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
		cache: false | webpack.MemoryCacheOptions | webpack.FileCacheOptions;

		/**
		 * The base directory (absolute path!) for resolving the `entry` option. If `output.pathinfo` is set, the included pathinfo is shortened to this directory.
		 */
		context?: string;

		/**
		 * References to other configurations to depend on.
		 */
		dependencies?: Array<string>;

		/**
		 * Options for the webpack-dev-server.
		 */
		devServer?: webpack.DevServer;

		/**
		 * A developer tool to enhance debugging (false | eval | [inline-|hidden-|eval-][nosources-][cheap-[module-]]source-map).
		 */
		devtool?: string | false;

		/**
		 * The entry point(s) of the compilation.
		 */
		entry:
			| (() => Promise<webpack.EntryStaticNormalized>)
			| webpack.EntryStaticNormalized;

		/**
		 * Enables/Disables experiments (experimental features with relax SemVer compatibility).
		 */
		experiments: webpack.Experiments;

		/**
		 * Specify dependencies that shouldn't be resolved by webpack, but should become dependencies of the resulting bundle. The kind of the dependency depends on `output.libraryTarget`.
		 */
		externals:
			| string
			| RegExp
			| Array<
					| string
					| RegExp
					| {
							[index: string]:
								| string
								| boolean
								| Array<string>
								| { [index: string]: any };
					  }
					| ((
							context: string,
							request: string,
							callback: (err: Error, result: string) => void
					  ) => void)
			  >
			| {
					[index: string]:
						| string
						| boolean
						| Array<string>
						| { [index: string]: any };
			  }
			| ((
					context: string,
					request: string,
					callback: (err: Error, result: string) => void
			  ) => void);

		/**
		 * Specifies the default type of externals ('amd*', 'umd*', 'system' and 'jsonp' depend on output.libraryTarget set to the same value).
		 */
		externalsType?:
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
			| "system";

		/**
		 * Options for infrastructure level logging.
		 */
		infrastructureLogging: webpack.InfrastructureLogging;

		/**
		 * Custom values available in the loader context.
		 */
		loader?: webpack.Loader;

		/**
		 * Enable production optimizations or development hints.
		 */
		mode?: "development" | "production" | "none";

		/**
		 * Options affecting the normal modules (`NormalModuleFactory`).
		 */
		module: webpack.ModuleOptions;

		/**
		 * Name of the configuration. Used when loading multiple configurations.
		 */
		name?: string;

		/**
		 * Include polyfills or mocks for various node stuff.
		 */
		node: false | webpack.NodeOptions;

		/**
		 * Enables/Disables integrated optimizations.
		 */
		optimization: webpack.Optimization;

		/**
		 * Normalized options affecting the output of the compilation. `output` options tell webpack how to write the compiled files to disk.
		 */
		output: webpack.OutputNormalized;

		/**
		 * The number of parallel processed modules in the compilation.
		 */
		parallelism?: number;

		/**
		 * Configuration for web performance recommendations.
		 */
		performance?: false | webpack.PerformanceOptions;

		/**
		 * Add additional plugins to the compiler.
		 */
		plugins: Array<
			| ((this: webpack.Compiler, compiler: webpack.Compiler) => void)
			| webpack.WebpackPluginInstance
		>;

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
		resolve: webpack.ResolveOptions;

		/**
		 * Options for the resolver when resolving loaders.
		 */
		resolveLoader: webpack.ResolveOptions;

		/**
		 * Stats options object or preset name.
		 */
		stats:
			| boolean
			| "none"
			| "errors-only"
			| "minimal"
			| "normal"
			| "detailed"
			| "verbose"
			| "errors-warnings"
			| webpack.StatsOptions;

		/**
		 * Environment to build for.
		 */
		target?:
			| "web"
			| "webworker"
			| "node"
			| "async-node"
			| "node-webkit"
			| "electron-main"
			| "electron-renderer"
			| "electron-preload"
			| ((compiler: webpack.Compiler) => void);

		/**
		 * Enter watch mode, which rebuilds on file change.
		 */
		watch?: boolean;

		/**
		 * Options for the watcher.
		 */
		watchOptions: webpack.WatchOptions;
	}

	/**
	 * Plugin instance.
	 */
	export interface WebpackPluginInstance {
		[index: string]: any;

		/**
		 * The run point of the plugin, required method.
		 */
		apply: (compiler: webpack.Compiler) => void;
	}
	export interface WithId {
		id: string | number;
	}
	export interface WithOptions {
		/**
		 * create a resolver with additional/different options
		 */
		withOptions: (arg0?: any) => webpack.Resolver & webpack.WithOptions;
	}
	export interface WriteOnlySet<T> {
		add(item: T): void;
	}
	export namespace __TypeLibIndex {
		export const webpack: (
			options: webpack.WebpackOptions | Array<webpack.WebpackOptions>,
			callback?: webpack.CallbackWebpack<webpack.Stats | webpack.MultiStats>
		) => webpack.Compiler | webpack.MultiCompiler;
		export const validate: any;
		export const validateSchema: (schema?: any, options?: any) => void;
		export const version: any;
		export const WebpackOptionsValidationError: ValidationError;
		export const ValidationError: ValidationError;
		export {
			cli,
			AutomaticPrefetchPlugin,
			BannerPlugin,
			Cache,
			Chunk,
			ChunkGraph,
			Compilation,
			Compiler,
			ContextExclusionPlugin,
			ContextReplacementPlugin,
			DefinePlugin,
			DelegatedPlugin,
			Dependency,
			DllPlugin,
			DllReferencePlugin,
			EntryPlugin,
			EnvironmentPlugin,
			EvalDevToolModulePlugin,
			EvalSourceMapDevToolPlugin,
			ExternalModule,
			ExternalsPlugin,
			Generator,
			HotModuleReplacementPlugin,
			IgnorePlugin,
			JavascriptModulesPlugin,
			LibManifestPlugin,
			LibraryTemplatePlugin,
			LoaderOptionsPlugin,
			LoaderTargetPlugin,
			Module,
			ModuleFilenameHelpers,
			ModuleGraph,
			NoEmitOnErrorsPlugin,
			NormalModule,
			NormalModuleReplacementPlugin,
			MultiCompiler,
			Parser,
			PrefetchPlugin,
			ProgressPlugin,
			ProvidePlugin,
			RuntimeGlobals,
			RuntimeModule,
			EntryPlugin as SingleEntryPlugin,
			SourceMapDevToolPlugin,
			Stats,
			Template,
			WatchIgnorePlugin,
			WebpackOptionsApply,
			WebpackOptionsDefaulter,
			__TypeLiteral_12 as cache,
			__TypeLiteral_1 as config,
			__TypeLiteral_2 as ids,
			__TypeLiteral_3 as javascript,
			__TypeLiteral_4 as optimize,
			__TypeLiteral_5 as web,
			__TypeLiteral_6 as webworker,
			__TypeLiteral_7 as node,
			__TypeLiteral_8 as wasm,
			__TypeLiteral_9 as library,
			__TypeLiteral_10 as debug,
			__TypeLiteral_11 as util
		};
	}
	export namespace __TypeLiteral_1 {
		export const getNormalizedWebpackOptions: (
			config: webpack.WebpackOptions
		) => webpack.WebpackOptionsNormalized;
		export const applyWebpackOptionsDefaults: (
			options: webpack.WebpackOptionsNormalized
		) => void;
	}
	export namespace __TypeLiteral_10 {
		export { ProfilingPlugin };
	}
	export namespace __TypeLiteral_11 {
		export const createHash: (
			algorithm: string | typeof webpack.Hash
		) => webpack.Hash;
		export { comparators, serialization };
	}
	export namespace __TypeLiteral_12 {
		export { MemoryCachePlugin };
	}
	export namespace __TypeLiteral_2 {
		export {
			ChunkModuleIdRangePlugin,
			NaturalModuleIdsPlugin,
			OccurrenceModuleIdsPlugin,
			NamedModuleIdsPlugin,
			DeterministicModuleIdsPlugin,
			NamedChunkIdsPlugin,
			OccurrenceChunkIdsPlugin,
			HashedModuleIdsPlugin
		};
	}
	export namespace __TypeLiteral_3 {
		export { JavascriptModulesPlugin };
	}
	export namespace __TypeLiteral_4 {
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
	export namespace __TypeLiteral_5 {
		export { FetchCompileWasmPlugin, JsonpTemplatePlugin };
	}
	export namespace __TypeLiteral_6 {
		export { WebWorkerTemplatePlugin };
	}
	export namespace __TypeLiteral_7 {
		export {
			NodeEnvironmentPlugin,
			NodeTemplatePlugin,
			ReadFileCompileWasmPlugin
		};
	}
	export namespace __TypeLiteral_8 {
		export { AsyncWebAssemblyModulesPlugin };
	}
	export namespace __TypeLiteral_9 {
		export { AbstractLibraryPlugin, EnableLibraryPlugin };
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
				options?: string | { [index: string]: any };
		  }
		| __TypeWebpackOptions
		| Array<RuleSetUseItemWebpackOptions>;
	export namespace cli {
		export let getArguments: (schema?: any) => Record<string, webpack.Argument>;
		export let processArguments: (
			args: Record<string, webpack.Argument>,
			config: any,
			values: Record<
				string,
				| string
				| number
				| boolean
				| RegExp
				| Array<string | number | boolean | RegExp>
			>
		) => Array<webpack.Problem>;
	}
	export namespace comparators {
		export let compareChunksById: (
			a: webpack.Chunk,
			b: webpack.Chunk
		) => 0 | 1 | -1;
		export let compareModulesByIdentifier: (
			a: webpack.Module,
			b: webpack.Module
		) => 0 | 1 | -1;
		export let compareModulesById: (
			arg0: webpack.ChunkGraph
		) => (arg0: webpack.Module, arg1: webpack.Module) => 0 | 1 | -1;
		export let compareNumbers: (a: number, b: number) => 0 | 1 | -1;
		export let compareStringsNumeric: (a: string, b: string) => 0 | 1 | -1;
		export let compareModulesByPostOrderIndexOrIdentifier: (
			arg0: webpack.ModuleGraph
		) => (arg0: webpack.Module, arg1: webpack.Module) => 0 | 1 | -1;
		export let compareModulesByPreOrderIndexOrIdentifier: (
			arg0: webpack.ModuleGraph
		) => (arg0: webpack.Module, arg1: webpack.Module) => 0 | 1 | -1;
		export let compareModulesByIdOrIdentifier: (
			arg0: webpack.ChunkGraph
		) => (arg0: webpack.Module, arg1: webpack.Module) => 0 | 1 | -1;
		export let compareChunks: (
			arg0: webpack.ChunkGraph
		) => (arg0: webpack.Chunk, arg1: webpack.Chunk) => 0 | 1 | -1;
		export let compareIds: (
			a: string | number,
			b: string | number
		) => 0 | 1 | -1;
		export let compareChunkGroupsByIndex: (
			a: webpack.ChunkGroup,
			b: webpack.ChunkGroup
		) => 0 | 1 | -1;
		export let concatComparators: <T>(
			c1: (arg0: T, arg1: T) => 0 | 1 | -1,
			c2: (arg0: T, arg1: T) => 0 | 1 | -1,
			...cRest: Array<(arg0: T, arg1: T) => 0 | 1 | -1>
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
			chunkGraph: webpack.ChunkGraph
		) => (arg0: webpack.Chunk, arg1: webpack.Chunk) => 0 | 1 | -1;
		export let compareLocations: (
			a: webpack.SyntheticDependencyLocation | webpack.RealDependencyLocation,
			b: webpack.SyntheticDependencyLocation | webpack.RealDependencyLocation
		) => 0 | 1 | -1;
	}
	export function exports(
		options: webpack.WebpackOptions | Array<webpack.WebpackOptions>,
		callback?: webpack.CallbackWebpack<webpack.Stats | webpack.MultiStats>
	): webpack.Compiler | webpack.MultiCompiler;
	export namespace exports {
		export const webpack: (
			options: webpack.WebpackOptions | Array<webpack.WebpackOptions>,
			callback?: webpack.CallbackWebpack<webpack.Stats | webpack.MultiStats>
		) => webpack.Compiler | webpack.MultiCompiler;
		export const validate: any;
		export const validateSchema: (schema?: any, options?: any) => void;
		export const version: any;
		export const WebpackOptionsValidationError: ValidationError;
		export const ValidationError: ValidationError;
		export type WebpackPluginFunction = (
			this: webpack.Compiler,
			compiler: webpack.Compiler
		) => void;
		export type ParserState = Record<string, any> & webpack.ParserStateBase;
		export {
			cli,
			AutomaticPrefetchPlugin,
			BannerPlugin,
			Cache,
			Chunk,
			ChunkGraph,
			Compilation,
			Compiler,
			ContextExclusionPlugin,
			ContextReplacementPlugin,
			DefinePlugin,
			DelegatedPlugin,
			Dependency,
			DllPlugin,
			DllReferencePlugin,
			EntryPlugin,
			EnvironmentPlugin,
			EvalDevToolModulePlugin,
			EvalSourceMapDevToolPlugin,
			ExternalModule,
			ExternalsPlugin,
			Generator,
			HotModuleReplacementPlugin,
			IgnorePlugin,
			JavascriptModulesPlugin,
			LibManifestPlugin,
			LibraryTemplatePlugin,
			LoaderOptionsPlugin,
			LoaderTargetPlugin,
			Module,
			ModuleFilenameHelpers,
			ModuleGraph,
			NoEmitOnErrorsPlugin,
			NormalModule,
			NormalModuleReplacementPlugin,
			MultiCompiler,
			Parser,
			PrefetchPlugin,
			ProgressPlugin,
			ProvidePlugin,
			RuntimeGlobals,
			RuntimeModule,
			EntryPlugin as SingleEntryPlugin,
			SourceMapDevToolPlugin,
			Stats,
			Template,
			WatchIgnorePlugin,
			WebpackOptionsApply,
			WebpackOptionsDefaulter,
			__TypeLiteral_12 as cache,
			__TypeLiteral_1 as config,
			__TypeLiteral_2 as ids,
			__TypeLiteral_3 as javascript,
			__TypeLiteral_4 as optimize,
			__TypeLiteral_5 as web,
			__TypeLiteral_6 as webworker,
			__TypeLiteral_7 as node,
			__TypeLiteral_8 as wasm,
			__TypeLiteral_9 as library,
			__TypeLiteral_10 as debug,
			__TypeLiteral_11 as util,
			WebpackOptions as Configuration,
			WebpackPluginInstance
		};
	}
	export namespace serialization {
		export let register: (
			Constructor: { new (...params: Array<any>): any },
			request: string,
			name: string,
			serializer: webpack.ObjectSerializer
		) => void;
		export let registerLoader: (
			regExp: RegExp,
			loader: (arg0: string) => boolean
		) => void;
		export let registerNotSerializable: (Constructor: {
			new (...params: Array<any>): any;
		}) => void;
		export let NOT_SERIALIZABLE: {};
		export let buffersSerializer: webpack.Serializer;
		export let createFileSerializer: (fs?: any) => webpack.Serializer;
		export { MEASURE_START_OPERATION, MEASURE_END_OPERATION };
	}
}

export = webpack.exports;
