// Type definitions for Webpack
// Project: https://webpack.github.io/
// Definitions by: Nejc Zdovc <https://github.com/NejcZdovc>
// Definitions: https://github.com/webpack/webpack


declare namespace WebpackType {
    interface Node {
        Buffer?: boolean | "mock";
        __dirname?: boolean | "mock";
        __filename?: boolean | "mock";
        console?: boolean | "mock";
        global?: boolean;
        process?: boolean | "mock";
    }

    interface WatchOptions {
        // Delay the rebuilt after the first change. Value is a time in ms.
        aggregateTimeout: number;

        // Use boolean to use polling. Use number for using polling with specified interval.
        poll: boolean | number;
    }

    interface Module {
        exprContextCritical?: boolean;
        exprContextRecursive?: boolean;
        exprContextRegExp?: RegExp;
        exprContextRequest?: string;

        // An array of automatically applied loaders.
        loaders?: RuleSetRules;

        // Don't parse files matching. It's matched against the full resolved request.
        noParse?: RegExp[] | RegExp;

        // An array of rules applied for modules.
        rules?: RuleSetRules;
        unknownContextCritical?: boolean;
        unknownContextRecursive?: boolean;
        unknownContextRegExp?: RegExp;
        unknownContextRequest?: string;
        wrappedContextCritical?: boolean;
        wrappedContextRecursive?: boolean;
        wrappedContextRegExp?: RegExp;
    }

    interface RuleSetRule {
        enforce?: "pre" | "post";
        exclude?: RuleSetCondition;
        include?: RuleSetCondition;
        issuer?: RuleSetCondition;
        loader?: string | RuleSetUse;
        loaders?: RuleSetUse;
        oneOf?: RuleSetRules;
        options?: RuleSetQuery
        parser?: Object;
        query?: RuleSetQuery
        resource?: RuleSetCondition;
        rules?: RuleSetRules;
        test?: RuleSetCondition;
        use?: RuleSetUse;
    }

    interface RuleSetConditionObject {
        and?: RuleSetConditions;
        exclude?: RuleSetCondition;
        include?: RuleSetCondition;
        not?: RuleSetConditions;
        or?: RuleSetConditions;
        test?: RuleSetCondition;
    }

    interface RuleSetUseItemObject {
        loader?: string;
        options?: RuleSetQuery;
        query?: RuleSetQuery;
    }

    interface Output {
        // Add a comment in the UMD wrapper.
        // String: Append the same comment above each import style.
        // OutputAuxiliaryComment: Set explicit comments for `commonjs`, `commonjs2`, `amd`, and `root`.
        auxiliaryComment?: string | OutputAuxiliaryComment;

        // The filename of non-entry chunks as relative path inside the `output.path` directory.
        chunkFilename?: string;

        // This option enables cross-origin loading of chunks.
        crossOriginLoading?: false | "anonymous" | "use-credentials";

        // Similar to `output.devtoolModuleFilenameTemplate`, but used in the case of duplicate module identifiers.
        devtoolFallbackModuleFilenameTemplate?: string | Function;

        // Enable line to line mapped mode for all/specified modules. Line to line mapped mode uses a simple SourceMap where each line of the generated source is mapped to the same line of the original source. It’s a performance optimization. Only use it if your performance need to be better and you are sure that input lines match which generated lines.
        // Boolean: `true` enables it for all modules (not recommended)
        // Object: An object similar to `module.loaders` enables it for specific files.
        devtoolLineToLine?: boolean | OutputDevtoolLineToLine;

        // Filename template string of function for the sources array in a generated SourceMap.
        devtoolModuleFilenameTemplate?: string | Function;

        // Specifies the name of each output file on disk. You must **not** specify an absolute path here! The `output.path` option determines the location on disk the files are written to, filename is used solely for naming the individual files.
        filename?: string;
        hashDigest?: string;
        hashDigestLength?: number;
        hashFunction?: string;

        // The filename of the Hot Update Chunks. They are inside the output.path directory.
        hotUpdateChunkFilename?: string;

        // The JSONP function used by webpack for async loading of hot update chunks.
        hotUpdateFunction?: string;

        // The filename of the Hot Update Main File. It is inside the `output.path` directory.
        hotUpdateMainFilename?: string;

        // The JSONP function used by webpack for async loading of chunks.
        jsonpFunction?: string;

        // If set, export the bundle as library. `output.library` is the name.
        library?: string | string[];

        libraryTarget?: OutputLibraryTarget;

        // The output directory as **absolute path**.
        path?: string;

        // Include comments with information about the modules.
        pathinfo?: boolean;

        // The `publicPath` specifies the public URL address of the output files when referenced in a browser.
        publicPath?: string;

        // The filename of the SourceMaps for the JavaScript files. They are inside the `output.path` directory.
        sourceMapFilename?: string;

        // Prefixes every line of the source in the bundle with this string.
        sourcePrefix?: string;

        // If `output.libraryTarget` is set to umd and `output.library` is set, setting this to true will name the AMD module.
        umdNamedDefine?: boolean;
    }

    interface OutputAuxiliaryComment {
        amd?: string;
        commonjs?: string;
        commonjs2?: string;
        root?: string;
    }

    interface OutputDevtoolLineToLine {
        exclude?: string;
        include?: string;
        test?: string;
    }

    interface Resolve {
        alias?: { [key: string]: string } | ResolveAlias[];
        aliasFields?: [string | string[]];
        cachePredicate?: Function;
        descriptionFiles?: string[];
        enforceExtension?: boolean;
        enforceModuleExtension?: boolean;
        extensions?: string[];
        fileSystem?: any; // TODO missing type
        mainFields?: [string | string[]];
        mainFiles?: string[];
        moduleExtensions?: string[];
        modules?: string[];
        plugins?: any[];
        resolver?: any; // TODO missing type
        symlinks?: boolean;
        unsafeCache?: boolean | Object;
    }

    interface ResolveAlias {
        alias?: string;
        name?: string;
        onlyModule?: boolean;
    }

    interface Object {
        [key: string]: any;
    }

    type EntryItem = string | string[];

    type OutputLibraryTarget =
        "var"
        | "assign"
        | "this"
        | "window"
        | "global"
        | "commonjs"
        | "commonjs2"
        | "commonjs-module"
        | "amd"
        | "umd"
        | "umd2"
        | "jsonp";

    type Stats =
        "none"
        | "errors-only"
        | "minimal"
        | "normal"
        | "verbose";

    type Target =
        "web"
        | "webworker"
        | "node"
        | "async-node"
        | "node-webkit"
        | "atom"
        | "electron"
        | "electron-main"
        | "electron-renderer";

    type Externals = string | Object | ((context: any, request: any, callback: (err: any, result: any)=> any) => any) | RegExp;

    type RuleSetConditionSimple = RegExp | string | Function | RuleSetConditionObject;
    type RuleSetCondition = RuleSetConditionSimple | RuleSetConditionSimple[];
    type RuleSetConditions = RuleSetCondition[];

    type RuleSetUse = RuleSetUseItem | RuleSetUseItem[];
    type RuleSetUseItem = string | RuleSetUseItemObject;

    type RuleSetQuery = Object | string;

    type RuleSetRules = RuleSetRule[];
}

interface Webpack {
    /**
     * Set the value of `require.amd` and `define.amd`.
     */
    amd?: {[key: string]: boolean};

    /**
     * Report the first error as a hard error instead of tolerating it.
     */
    bail?: boolean;

    /**
     * Cache generated modules and chunks to improve performance for multiple incremental builds.
     *
     * Boolean: You can pass `false` to disable it.
     * Object: You can pass an object to enable it and let webpack use the passed object as cache.This way you can share the cache object between multiple compiler calls.
     */
    cache?: false | WebpackType.Object;

    /*
     The base directory (absolute path!) for resolving the `entry` option. If `output.pathinfo` is set, the included pathinfo is shortened to this directory.
     */
    context?: string;

    /**
     * References to other configurations to depend on.
     */
    dependencies?: string[];

    /**
     * Can be used to configure the behaviour of webpack-dev-server when the webpack config is passed to webpack-dev-server CLI.
     */
    devServer?: WebpackType.Object;

    /**
     * A developer tool to enhance debugging.
     * Note: Boolean can be used only with value `false`.
     */
    devtool?: string | false;

    /**
     * The entry point(s) of the compilation.
     *
     * Object: Multiple entry bundles are created. The key is the chunk name. The value can be a string or an array. If its' array all modules are loaded upon startup. The last one is exported. If it's a string look at the definition for string.
     * String: The entry point for one output file. The string is resolved to a module which is loaded upon startup.
     */
    entry: WebpackType.EntryItem | {[key: string]: WebpackType.EntryItem};

    /**
     * Specify dependencies that shouldn't be resolved by webpack, but should become dependencies of the resulting bundle. The kind of the dependency depends on `output.libraryTarget`.
     *
     * String: An exact matched dependency becomes external. The same string is used as external dependency.
     * Object: If an dependency matches exactly a property of the object, the property value is used as dependency.
     * Function: `function(context, request, callback(err, result))` The function is called on each dependency.
     * RegExp: Every matched dependency becomes external.
     * Array: Use the all externals options defined above.
     */
    externals?: WebpackType.Externals | WebpackType.Externals[];

    /**
     * Custom values available in the loader context.
     */
    loader?: WebpackType.Object;

    /**
     * Options affecting the normal modules (`NormalModuleFactory`).
     */
    module?: WebpackType.Module;

    /**
     * Name of the configuration. Used when loading multiple configurations.
     */
    name?: string;

    /**
     * Include polyfills or mocks for various node stuff.
     */
    node?: WebpackType.Node;

    /**
     * Options affecting the output of the compilation. `output` options tell webpack how to write the compiled files to disk.
     */
    output?: WebpackType.Output;

    /**
     * Add additional plugins to the compiler.
     */
    plugins?: WebpackType.Object[];

    /**
     * Capture timing information for each module.
     */
    profile?: boolean;

    /**
     * Store compiler state to a json file.
     */
    recordsInputPath?: string;

    /**
     * Load compiler state from a json file.
     */
    recordsOutputPath?: string;

    /**
     * Store/Load compiler state from/to a json file. This will result in persistent ids of modules and chunks. An absolute path is expected. `recordsPath` is used for `recordsInputPath` and `recordsOutputPath` if they left undefined.
     */
    recordsPath?: string;

    /**
     * Options affecting the resolving of modules.
     */
    resolve?: WebpackType.Resolve;

    resolveLoader?: WebpackType.Resolve;

    /**
     * Used by the webpack CLI program to pass stats options.
     */
    stats?: WebpackType.Object | boolean | WebpackType.Stats;

    /**
     * Specifies webpack deployment target. This modifies how the webpack bootstrap function is generated based on each target.
     */
    target?: Function | WebpackType.Target;

    /**
     * Enter watch mode, which rebuilds on file change.
     */
    watch?: boolean;

    /**
     * TODO add description
     */
    watchOptions?: WebpackType.WatchOptions;
}
