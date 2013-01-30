// Utilities

class ArrayMap {
	get: (key: any) => any;
	set: (key: any, value: any) => ArrayMap;
	remove: (key: any) => Boolean;
	clone: () => ArrayMap;
}

class Tabable {
	static mixin: (pt: ClassPrototype) => void;
	applyPlugins: (name: String, args...) => void;
	applyPluginsAsync: (name: String, args..., callback: (err) => void) => void;
	applyPluginsBailResult: (name: String, args...) => void;
	addPlugin: (name: String, fn: (...) => any) => void
}

class Plugin {
	apply: (tabable: Tabable) => void;
}

// Module and Dependency stuff

class DependenciesBlock {
	dependencies: Dependency[];
	blocks: AsyncDependenciesBlock[];
	variables: Object; // Map<String, String>

	addBlock: (block: AsyncDependenciesBlock) => void;
	addDependency: (dependency: Dependency) => void;
	addVariable: (name: String, expression: String) => void;
	updateHash: (hash: crypto.Hash) => void;
}

class Module extends DependenciesBlock {
	abstract identifier: () => String;
	abstract build: (options: Options, callback: (err) => void) => void;
	abstract source: (template: ModuleTemplate) => Source;
	abstract size: () => Number;

	separable: () => Boolean;
	abstract separateBuild: (options: Options, executor: Executor, callback: (err) => void) => void;

	context: String;
	reasons: ModuleReason[];
	addReason: (reason: ModuleReason) => void;
	id: String;
	chunks: Chunk[];
	addChunk(chunk: Chunk) => void;
}

class NormalModule extends Module {
	constructor(public request: String, preLoaders: String[], loaders: String[], postLoaders: String[]);
	identifier;
	build;
	source;
	size;
}

class ContextModule extends Module {
	constructor(
		public request: String,
		public recursive: Boolean,
		public regExp: String
	);
	identifier;
	build;
	source;
	size;
}

class Dependency {
	public module: Module;

	public Class: Class;
	public loc: { line: int, col: int };
	public optional: Boolean;

	public isEqualResource: (other: Dependency) => Boolean;
	public updateHash: (hash: crypto.Hash) => void;
}

class ModuleDependency {
	constructor(public request: String);
	isEqualResource;
}

class CommonJsRequireDependency extends ModuleDependency {}
class AMDRequireDependency extends ModuleDependency {}
class AMDDefineDependency extends ModuleDependency {}
class RequireEnsureDependency extends ModuleDependency {}
class RequireResolveDependency extends ModuleDependency {}

class ContextDependency {
	constructor(
		public request: String,
		public recursive: Boolean,
		public regExp: String
	);
	isEqual;
}

class CommonJsExpressionRequireDependency extends ContextDependency {}
class AMDExpressionRequireDependency extends ContextDependency {}
class AMDExpressionDefineDependency extends ContextDependency {}
class ExpressionRequireEnsureDependency extends ContextDependency {}
class ExpressionRequireResolveDependency extends ContextDependency {}
class RequireContextDependency extends ContextDependency {}
class RequireExpressionDependency extends ContextDependency {}


class AsyncDependenciesBlock extends DependenciesBlock {
	constructor(public name: String);
	public chunk: Chunk;
}

class Chunk {
	constructor(public name: String);
	public id: Number;
	public addModule(module: Module) => Boolean;
	public addChunk(chunk: Chunk) => void;
}

// Source stuff

interface Source {
	source: () => String;
	map: () => String;
	origins: () => any; // Map<String, Source>
}

class StringSource implements Source {
	constructor(str: String);
	source: () => String;
}

// Compilation stuff

class Compilation {
	constructor(public options: CompilationOptions);

	public dependencyFactories: ArrayMap;
	public moduleTemplate: ModuleTemplate;
	public chunkTemplate: ChunkTemplate;
	public mainTemplate: MainTemplate;


	public entry: Module;
	public chunks: Chunk[];
	public namedChunks: Object; // Map<String, Chunk>
	public assets: Object; // Map<String, String | Buffer>

	public process: (context: String, entry: Dependency, callback: (err) => void) => void;
	public getStats: () => Stats;

	protected addModule(module: Module) => Boolean;
	protected getModule(module: Module) => Module;
	protected buildModule(module: Module, callback: (err) => void) => void;
	protected processModuleDependencies(module: Module, callback: (err) => void) => void;
}

interface ModuleFactory {
	create: (context: String, dependency: Dependency, callback: (err, Module) => void) => void;
}

class NormalModuleFactory {
	constructor(resolver, moduleOptions);
	create;
}

class ContextModuleFactory {
	constructor(resolver, contextOptions);
	create;
}

// Parser stuff

class Parser extends Tabable {
	parse: (source: String) => Object;

	scope: {
		inTry: Boolean;
	};
	state: Object;

	waltStatements: (statements: Statement[]) => void;
	walkStatement: (statement: Statement) => void;
	walkSwitchCases: (switchCases: SwitchCase[]) => void;
	walkCatchClauses: (catchClauses: CatchClause[]) => void;
	walkVariableDeclarators: (declarators: Declarator[]) => void;
	walkExpressions: (expressions: Expression[]) => void;
	walkExpression: (expression: Expression) => void;

	inScope: (params: Expression[], fn: () => void) => void;

	evaluateExpression: (expression: Expression) => EvaluatedExpression;

	// parseStringArray: (expression: Expression) => String[];
	// parseString: (expression: Expression) => String;
	// parseCalculatedStringArray: (expression: Expression) => CalculatedString[];
	// parseCalculatedString: (expression: Expression) => CalculatedString;

	tab "call *": (expr) => void; // * = methodName, i.e. "require", "require.ensure"
	tab "expression *": (expr) => void; // * =
	tab "evaluate *": (expr) => void;
}

interface EvaluatedExpression {
	isString: () => Boolean;
	isNumber: () => Boolean;
	isRegExp: () => Boolean;
	isConditional: () => Boolean;
	isArray: () => Boolean;
	isWrapped: () => Boolean;

	range: Number[2];

	// isConditional
	options: EvaluatedExpression[];

	// isArray
	items: EvaluatedExpression[];

	// isConstant && isString
	string: String;

	// isConstant && isNumber
	number: Number;

	// isConstant && isRegExp
	regExp: RegExp;

	// !isConstant && isWrapped
	prefix: EvaluatedExpression;

	// !isConstant && isWrapped
	postfix: EvaluatedExpression;
}

type CalculatedString {
	range: Number[];
	value: String;
	code: Boolean;
}

// Options stuff

interface CompilationOptions {

	context: String;
	entry: String;
	resolve: ResolveOptions;

	module: {
		preLoaders: MatchableLoader[];
		postLoaders: MatchableLoader[];
		loaders: MatchableLoader[];
		loader: Object;
		parse: ParseOptions;
	};

	optimize: {
		maxChunks: Number;
		chunkOverhead: Number;
		entryChunkMultiplicator: Number;
	};

	debug: Boolean;
	devtool: false | "eval" | "sourcemap";
	minimize: UglifyJs2Options;

	separate: {

	};

	output: {
		path: String;
		publicPath: String;
		filename: String;
		chunkFilename: String;
		namedChunkFilename: String;
		pathinfo: Boolean;
		jsonpFunction?: String;
		libraryName?: String;
	};

}

interface ResolveOptions {
	paths: String[];
	modulesDirectories: String[];

	resourcePaths: String[];
	resourceModulesDirectories: String[];
	alias: Object; // Map<String, String>
	extensions: String[];
	packageMains: String[];

	loaderPaths: String[];
	loaderModulesDirectories: String[];
	loaderAlias: Object; // Map<String, String>
	loaderPostfixes: String[];
	loaderExtensions: String[];
	loaderPackageMains: String[];

	disableLoaders: Boolean;
	disableResourceQuery: Boolean;
	disableResourcePureQuery: Boolean;
	disableLoaderQuery: Boolean;
}

interface MatchableLoader {
	test: StringOrRegExp | StringOrRegExp[];
	include?: StringOrRegExp | StringOrRegExp[];
	exclude?: StringOrRegExp | StringOrRegExp[];
	loader: String;
}

// Compiler stuff

interface Resolver {
	resolveModuleRequest: (context: String, request: String, callback: (err, request) => void) => void;
	resolveContextRequest: (context: String, request: String, callback: (err, request) => void) => void;
	resolveLoader: (context: String, request: String, callback: (err, request) => void) => void;
}

interface Executor {
	static availible: () => Boolean;
	ready: () => Boolean;
	execute: (
		module: String;
		params: Object[];
		callback: (err, results...) => void
	) => void;
}

interface CompilationOptimizer {
	optimize(compilation: Compilation, callback: (err) => void);
}

interface FileEmitter {
	emitFile(name: String, content: Buffer | String, callback: (err) => void) => void;
}

class Compiler {
	constructor(options);

	resolver: Resolver;
	separateExecutor: Executor;
	optimizers: CompilationOptimizer[];
	dependencyTemplates: ArrayMap; // Dependency Class -> DependencyTemplate
	moduleTemplate: ModuleTemplate;
	chunkTemplate: ChunkTemplate;
	mainTemplate: ChunkTemplate;
	fileEmitter: FileEmitter;

	plugins: CompilationPlugin[];

	run(callback: (err, stats: Stats) => void) => void;
}

// Node specifiy stuff

class NodeSubProcessExecutor implements Executor {
	static availible;
	constructor(count: Number);
	ready;
	execute;
}

class NodeFileEmitter implements FileEmitter {
	constructor(outputPath: String);
	emitFile;
}

class NodeResolver implements Resolver {
	constructor(options: ResolveOptions);
	resolveModuleRequest;
	resolveContextRequest;
	resolveLoader;
}

class NodeCompiler {
	constructor(options);

	resolver: NodeResolver
}