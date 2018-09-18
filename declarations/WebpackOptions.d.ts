/**
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn special-lint-fix` to update
 */

/**
 * This interface was referenced by `WebpackOptions`'s JSON-Schema
 * via the `definition` "entry".
 */
export type Entry =
	| {
			/**
			 * An entry point with name
			 */
			[k: string]: string | CommonNonEmptyArrayOfUniqueStringValues;
	  }
	| string
	| CommonNonEmptyArrayOfUniqueStringValues
	| {
			[k: string]: any;
	  };
/**
 * This interface was referenced by `WebpackOptions`'s JSON-Schema
 * via the `definition` "common.nonEmptyArrayOfUniqueStringValues".
 */
export type CommonNonEmptyArrayOfUniqueStringValues = string[];
/**
 * This interface was referenced by `WebpackOptions`'s JSON-Schema
 * via the `definition` "externals".
 */
export type Externals =
	| string
	| {
			/**
			 * The dependency used for the external
			 */
			[k: string]:
				| string
				| {
						[k: string]: any;
				  }
				| CommonArrayOfStringValues
				| boolean;
	  }
	| {
			[k: string]: any;
	  }
	| Externals[];
/**
 * This interface was referenced by `WebpackOptions`'s JSON-Schema
 * via the `definition` "common.arrayOfStringValues".
 */
export type CommonArrayOfStringValues = string[];
/**
 * This interface was referenced by `WebpackOptions`'s JSON-Schema
 * via the `definition` "ruleSet-condition".
 */
export type RuleSetCondition =
	| {
			[k: string]: any;
	  }
	| string
	| RuleSetConditions
	| {
			/**
			 * Logical AND
			 */
			and?: RuleSetConditions;
			/**
			 * Exclude all modules matching any of these conditions
			 */
			exclude?: RuleSetCondition;
			/**
			 * Exclude all modules matching not any of these conditions
			 */
			include?: RuleSetCondition;
			/**
			 * Logical NOT
			 */
			not?: RuleSetConditions;
			/**
			 * Logical OR
			 */
			or?: RuleSetConditions;
			/**
			 * Exclude all modules matching any of these conditions
			 */
			test?: RuleSetCondition;
	  };
/**
 * This interface was referenced by `WebpackOptions`'s JSON-Schema
 * via the `definition` "ruleSet-conditions".
 */
export type RuleSetConditions = RuleSetCondition[];
/**
 * This interface was referenced by `WebpackOptions`'s JSON-Schema
 * via the `definition` "ruleSet-loader".
 */
export type RuleSetLoader = string;
/**
 * This interface was referenced by `WebpackOptions`'s JSON-Schema
 * via the `definition` "ruleSet-use".
 */
export type RuleSetUse =
	| RuleSetUseItem
	| {
			[k: string]: any;
	  }
	| RuleSetUseItem[];
/**
 * This interface was referenced by `WebpackOptions`'s JSON-Schema
 * via the `definition` "ruleSet-use-item".
 */
export type RuleSetUseItem =
	| RuleSetLoader
	| {
			[k: string]: any;
	  }
	| {
			/**
			 * Loader name
			 */
			loader?: RuleSetLoader;
			/**
			 * Loader options
			 */
			options?: RuleSetQuery;
			/**
			 * Unique loader identifier
			 */
			ident?: string;
			/**
			 * Loader query
			 */
			query?: RuleSetQuery;
	  };
/**
 * This interface was referenced by `WebpackOptions`'s JSON-Schema
 * via the `definition` "ruleSet-query".
 */
export type RuleSetQuery =
	| {
			[k: string]: any;
	  }
	| string;
/**
 * This interface was referenced by `WebpackOptions`'s JSON-Schema
 * via the `definition` "common.arrayOfStringOrStringArrayValues".
 */
export type CommonArrayOfStringOrStringArrayValues = (string | string[])[];
/**
 * This interface was referenced by `WebpackOptions`'s JSON-Schema
 * via the `definition` "ruleSet-rules".
 */
export type RuleSetRules = RuleSetRule[];
/**
 * This interface was referenced by `WebpackOptions`'s JSON-Schema
 * via the `definition` "filter-types".
 */
export type FilterTypes = FilterItemTypes | FilterItemTypes[];
/**
 * This interface was referenced by `WebpackOptions`'s JSON-Schema
 * via the `definition` "filter-item-types".
 */
export type FilterItemTypes =
	| {
			[k: string]: any;
	  }
	| string;

export interface WebpackOptions {
	/**
	 * Enable production optimizations or development hints.
	 */
	mode?: "development" | "production" | "none";
	/**
	 * Set the value of `require.amd` and `define.amd`.
	 */
	amd?: {
		[k: string]: any;
	};
	/**
	 * Report the first error as a hard error instead of tolerating it.
	 */
	bail?: boolean;
	/**
	 * Cache generated modules and chunks to improve performance for multiple incremental builds.
	 */
	cache?:
		| boolean
		| {
				[k: string]: any;
		  };
	/**
	 * The base directory (absolute path!) for resolving the `entry` option. If `output.pathinfo` is set, the included pathinfo is shortened to this directory.
	 */
	context?: string;
	/**
	 * References to other configurations to depend on.
	 */
	dependencies?: string[];
	/**
	 * Options for the webpack-dev-server
	 */
	devServer?: {
		[k: string]: any;
	};
	/**
	 * A developer tool to enhance debugging.
	 */
	devtool?: string | false;
	/**
	 * The entry point(s) of the compilation.
	 */
	entry?: Entry;
	/**
	 * Specify dependencies that shouldn't be resolved by webpack, but should become dependencies of the resulting bundle. The kind of the dependency depends on `output.libraryTarget`.
	 */
	externals?: Externals;
	/**
	 * Custom values available in the loader context.
	 */
	loader?: {
		[k: string]: any;
	};
	/**
	 * Options affecting the normal modules (`NormalModuleFactory`).
	 */
	module?: Module;
	/**
	 * Name of the configuration. Used when loading multiple configurations.
	 */
	name?: string;
	/**
	 * Include polyfills or mocks for various node stuff.
	 */
	node?:
		| false
		| {
				/**
				 * Include a polyfill for the 'Buffer' variable
				 */
				Buffer?: false | true | "mock";
				/**
				 * Include a polyfill for the '__dirname' variable
				 */
				__dirname?: false | true | "mock";
				/**
				 * Include a polyfill for the '__filename' variable
				 */
				__filename?: false | true | "mock";
				/**
				 * Include a polyfill for the 'console' variable
				 */
				console?: false | true | "mock";
				/**
				 * Include a polyfill for the 'global' variable
				 */
				global?: boolean;
				/**
				 * Include a polyfill for the 'process' variable
				 */
				process?: false | true | "mock";
				/**
				 * Include a polyfill for the node.js module
				 */
				[k: string]: false | true | "mock" | "empty";
		  };
	/**
	 * Options affecting the output of the compilation. `output` options tell webpack how to write the compiled files to disk.
	 */
	output?: Output;
	/**
	 * Enables/Disables integrated optimizations
	 */
	optimization?: {
		/**
		 * Removes modules from chunks when these modules are already included in all parents
		 */
		removeAvailableModules?: boolean;
		/**
		 * Remove chunks which are empty
		 */
		removeEmptyChunks?: boolean;
		/**
		 * Merge chunks which contain the same modules
		 */
		mergeDuplicateChunks?: boolean;
		/**
		 * Also flag chunks as loaded which contain a subset of the modules
		 */
		flagIncludedChunks?: boolean;
		/**
		 * Figure out a order of modules which results in the smallest initial bundle
		 */
		occurrenceOrder?: boolean;
		/**
		 * Skip over modules which are flagged to contain no side effects when exports are not used
		 */
		sideEffects?: boolean;
		/**
		 * Figure out which exports are provided by modules to generate more efficient code
		 */
		providedExports?: boolean;
		/**
		 * Figure out which exports are used by modules to mangle export names, omit unused exports and generate more efficient code
		 */
		usedExports?: boolean;
		/**
		 * Concatenate modules when possible to generate less modules, more efficient code and enable more optimizations by the minimizer
		 */
		concatenateModules?: boolean;
		/**
		 * Optimize duplication and caching by splitting chunks by shared modules and cache group
		 */
		splitChunks?:
			| false
			| {
					/**
					 * Select chunks for determining shared modules (defaults to "async", "initial" and "all" requires adding these chunks to the HTML)
					 */
					chunks?:
						| ("initial" | "async" | "all")
						| {
								[k: string]: any;
						  };
					/**
					 * Minimal size for the created chunks
					 */
					minSize?: number;
					/**
					 * Maximal size hint for the created chunks
					 */
					maxSize?: number;
					/**
					 * Minimum number of times a module has to be duplicated until it's considered for splitting
					 */
					minChunks?: number;
					/**
					 * Maximum number of requests which are accepted for on-demand loading
					 */
					maxAsyncRequests?: number;
					/**
					 * Maximum number of initial chunks which are accepted for an entry point
					 */
					maxInitialRequests?: number;
					/**
					 * Give chunks created a name (chunks with equal name are merged)
					 */
					name?:
						| boolean
						| {
								[k: string]: any;
						  }
						| string;
					/**
					 * Sets the template for the filename for created chunks (Only works for initial chunks)
					 */
					filename?: string;
					/**
					 * Sets the name delimiter for created chunks
					 */
					automaticNameDelimiter?: string;
					/**
					 * Prevents exposing path info when creating names for parts splitted by maxSize
					 */
					hidePathInfo?: boolean;
					/**
					 * Options for modules not selected by any other cache group
					 */
					fallbackCacheGroup?: {
						/**
						 * Minimal size for the created chunk
						 */
						minSize?: number;
						/**
						 * Maximal size hint for the created chunks
						 */
						maxSize?: number;
						/**
						 * Sets the name delimiter for created chunks
						 */
						automaticNameDelimiter?: string;
					};
					/**
					 * Assign modules to a cache group (modules from different cache groups are tried to keep in separate chunks)
					 */
					cacheGroups?: {
						/**
						 * Configuration for a cache group
						 */
						[k: string]:
							| false
							| {
									[k: string]: any;
							  }
							| string
							| {
									/**
									 * Assign modules to a cache group
									 */
									test?:
										| {
												[k: string]: any;
										  }
										| string;
									/**
									 * Select chunks for determining cache group content (defaults to "initial", "initial" and "all" requires adding these chunks to the HTML)
									 */
									chunks?:
										| ("initial" | "async" | "all")
										| {
												[k: string]: any;
										  };
									/**
									 * Ignore minimum size, minimum chunks and maximum requests and always create chunks for this cache group
									 */
									enforce?: boolean;
									/**
									 * Priority of this cache group
									 */
									priority?: number;
									/**
									 * Minimal size for the created chunk
									 */
									minSize?: number;
									/**
									 * Maximal size hint for the created chunks
									 */
									maxSize?: number;
									/**
									 * Minimum number of times a module has to be duplicated until it's considered for splitting
									 */
									minChunks?: number;
									/**
									 * Maximum number of requests which are accepted for on-demand loading
									 */
									maxAsyncRequests?: number;
									/**
									 * Maximum number of initial chunks which are accepted for an entry point
									 */
									maxInitialRequests?: number;
									/**
									 * Try to reuse existing chunk (with name) when it has matching modules
									 */
									reuseExistingChunk?: boolean;
									/**
									 * Give chunks for this cache group a name (chunks with equal name are merged)
									 */
									name?:
										| boolean
										| {
												[k: string]: any;
										  }
										| string;
									/**
									 * Sets the name delimiter for created chunks
									 */
									automaticNameDelimiter?: string;
									/**
									 * Sets the name prefix for created chunks
									 */
									automaticNamePrefix?: string;
									/**
									 * Sets the template for the filename for created chunks (Only works for initial chunks)
									 */
									filename?: string;
							  };
					};
			  };
		/**
		 * Create an additional chunk which contains only the webpack runtime and chunk hash maps
		 */
		runtimeChunk?:
			| boolean
			| ("single" | "multiple")
			| {
					/**
					 * The name or name factory for the runtime chunks
					 */
					name?:
						| string
						| {
								[k: string]: any;
						  };
			  };
		/**
		 * Avoid emitting assets when errors occur
		 */
		noEmitOnErrors?: boolean;
		/**
		 * Check for incompatible wasm types when importing/exporting from/to ESM
		 */
		checkWasmTypes?: boolean;
		/**
		 * Reduce size of WASM by changing imports to shorter strings.
		 */
		mangleWasmImports?: boolean;
		/**
		 * Define the algorithm to choose module ids (natural: numeric ids in order of usage, named: readable ids for better debugging, hashed: short hashes as ids for better long term caching, size: numeric ids focused on minimal initial download size, total-size: numeric ids focused on minimal total download size, false: no algorithm used, as custom one can be provided via plugin)
		 */
		moduleIds?: "natural" | "named" | "hashed" | "size" | "total-size" | false;
		/**
		 * Define the algorithm to choose chunk ids (named: readable ids for better debugging, size: numeric ids focused on minimal initial download size, total-size: numeric ids focused on minimal total download size, false: no algorithm used, as custom one can be provided via plugin)
		 */
		chunkIds?: "natural" | "named" | "size" | "total-size" | false;
		/**
		 * Use readable module identifiers for better debugging (deprecated, used moduleIds: named instead)
		 */
		namedModules?: boolean;
		/**
		 * Use hashed module id instead module identifiers for better long term caching (deprecated, used moduleIds: hashed instead)
		 */
		hashedModuleIds?: boolean;
		/**
		 * Use readable chunk identifiers for better debugging (deprecated, used chunkIds: named instead)
		 */
		namedChunks?: boolean;
		/**
		 * Generate records with relative paths to be able to move the context folder
		 */
		portableRecords?: boolean;
		/**
		 * Enable minimizing the output. Uses optimization.minimizer.
		 */
		minimize?: boolean;
		/**
		 * Minimizer(s) to use for minimizing the output
		 */
		minimizer?: (CommonPluginObject | CommonPluginFunction)[];
		/**
		 * Set process.env.NODE_ENV to a specific value
		 */
		nodeEnv?: false | string;
	};
	/**
	 * The number of parallel processed modules in the compilation.
	 */
	parallelism?: number;
	/**
	 * Configuration for web performance recommendations.
	 */
	performance?:
		| false
		| {
				/**
				 * Filter function to select assets that are checked
				 */
				assetFilter?: {
					[k: string]: any;
				};
				/**
				 * Sets the format of the hints: warnings, errors or nothing at all
				 */
				hints?: false | "warning" | "error";
				/**
				 * Total size of an entry point (in bytes)
				 */
				maxEntrypointSize?: number;
				/**
				 * Filesize limit (in bytes) when exceeded, that webpack will provide performance hints
				 */
				maxAssetSize?: number;
		  };
	/**
	 * Add additional plugins to the compiler.
	 */
	plugins?: (CommonPluginObject | CommonPluginFunction)[];
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
	 * Options for the resolver
	 */
	resolve?: Resolve;
	/**
	 * Options for the resolver when resolving loaders
	 */
	resolveLoader?: Resolve;
	/**
	 * Options for webpack-serve
	 */
	serve?: {
		[k: string]: any;
	};
	/**
	 * Used by the webpack CLI program to pass stats options.
	 */
	stats?:
		| {
				/**
				 * fallback value for stats options when an option is not defined (has precedence over local webpack defaults)
				 */
				all?: boolean;
				/**
				 * context directory for request shortening
				 */
				context?: string;
				/**
				 * add the hash of the compilation
				 */
				hash?: boolean;
				/**
				 * add webpack version information
				 */
				version?: boolean;
				/**
				 * add timing information
				 */
				timings?: boolean;
				/**
				 * add built at time information
				 */
				builtAt?: boolean;
				/**
				 * add performance hint flags
				 */
				performance?: boolean;
				/**
				 * add module depth in module graph
				 */
				depth?: boolean;
				/**
				 * add assets information
				 */
				assets?: boolean;
				/**
				 * add --env information
				 */
				env?: boolean;
				/**
				 * Enables/Disables colorful output
				 */
				colors?:
					| boolean
					| {
							/**
							 * Custom color for bold text
							 */
							bold?: string;
							/**
							 * Custom color for red text
							 */
							red?: string;
							/**
							 * Custom color for green text
							 */
							green?: string;
							/**
							 * Custom color for cyan text
							 */
							cyan?: string;
							/**
							 * Custom color for magenta text
							 */
							magenta?: string;
							/**
							 * Custom color for yellow text
							 */
							yellow?: string;
					  };
				/**
				 * Set the maximum number of modules to be shown
				 */
				maxModules?: number;
				/**
				 * add chunk information
				 */
				chunks?: boolean;
				/**
				 * add built modules information to chunk information
				 */
				chunkModules?: boolean;
				/**
				 * add built modules information
				 */
				modules?: boolean;
				/**
				 * add information about modules nested in other modules (like with module concatenation)
				 */
				nestedModules?: boolean;
				/**
				 * add information about assets inside modules
				 */
				moduleAssets?: boolean;
				/**
				 * add children information
				 */
				children?: boolean;
				/**
				 * add also information about cached (not built) modules
				 */
				cached?: boolean;
				/**
				 * Show cached assets (setting this to `false` only shows emitted files)
				 */
				cachedAssets?: boolean;
				/**
				 * add information about the reasons why modules are included
				 */
				reasons?: boolean;
				/**
				 * add the source code of modules
				 */
				source?: boolean;
				/**
				 * add warnings
				 */
				warnings?: boolean;
				/**
				 * add errors
				 */
				errors?: boolean;
				/**
				 * Suppress warnings that match the specified filters. Filters can be Strings, RegExps or Functions
				 */
				warningsFilter?: FilterTypes;
				/**
				 * Suppress assets that match the specified filters. Filters can be Strings, RegExps or Functions
				 */
				excludeAssets?: FilterTypes;
				/**
				 * Suppress modules that match the specified filters. Filters can be Strings, RegExps, Booleans or Functions
				 */
				excludeModules?: FilterTypes | boolean;
				/**
				 * Please use excludeModules instead.
				 */
				exclude?: FilterTypes | boolean;
				/**
				 * Display the entry points with the corresponding bundles
				 */
				entrypoints?: boolean;
				/**
				 * Display all chunk groups with the corresponding bundles
				 */
				chunkGroups?: boolean;
				/**
				 * add details to errors (like resolving log)
				 */
				errorDetails?: boolean;
				/**
				 * add the origins of chunks and chunk merging info
				 */
				chunkOrigins?: boolean;
				/**
				 * sort the modules by that field
				 */
				modulesSort?: string;
				/**
				 * add dependencies and origin of warnings/errors
				 */
				moduleTrace?: boolean;
				/**
				 * sort the chunks by that field
				 */
				chunksSort?: string;
				/**
				 * sort the assets by that field
				 */
				assetsSort?: string;
				/**
				 * Add public path information
				 */
				publicPath?: boolean;
				/**
				 * Add output path information
				 */
				outputPath?: boolean;
				/**
				 * show exports provided by modules
				 */
				providedExports?: boolean;
				/**
				 * show exports used by modules
				 */
				usedExports?: boolean;
				/**
				 * show reasons why optimization bailed out for modules
				 */
				optimizationBailout?: boolean;
		  }
		| boolean
		| ("none" | "errors-only" | "minimal" | "normal" | "detailed" | "verbose");
	/**
	 * Environment to build for
	 */
	target?:
		| (
				| "web"
				| "webworker"
				| "node"
				| "async-node"
				| "node-webkit"
				| "electron-main"
				| "electron-renderer")
		| {
				[k: string]: any;
		  };
	/**
	 * Enter watch mode, which rebuilds on file change.
	 */
	watch?: boolean;
	/**
	 * Options for the watcher
	 */
	watchOptions?: {
		/**
		 * Delay the rebuilt after the first change. Value is a time in ms.
		 */
		aggregateTimeout?: number;
		/**
		 * Ignore some files from watching
		 */
		ignored?: {
			[k: string]: any;
		};
		/**
		 * Stop watching when stdin stream has ended
		 */
		stdin?: boolean;
		/**
		 * Enable polling mode for watching
		 */
		poll?: boolean | number;
	};
}
/**
 * This interface was referenced by `WebpackOptions`'s JSON-Schema
 * via the `definition` "module".
 */
export interface Module {
	/**
	 * Enable warnings for full dynamic dependencies
	 */
	exprContextCritical?: boolean;
	/**
	 * Enable recursive directory lookup for full dynamic dependencies
	 */
	exprContextRecursive?: boolean;
	/**
	 * Sets the default regular expression for full dynamic dependencies
	 */
	exprContextRegExp?:
		| boolean
		| {
				[k: string]: any;
		  };
	/**
	 * Set the default request for full dynamic dependencies
	 */
	exprContextRequest?: string;
	/**
	 * Don't parse files matching. It's matched against the full resolved request.
	 */
	noParse?:
		| {
				[k: string]: any;
		  }[]
		| {
				[k: string]: any;
		  }
		| string[]
		| string;
	/**
	 * An array of rules applied for modules.
	 */
	rules?: RuleSetRules;
	/**
	 * An array of rules applied by default for modules.
	 */
	defaultRules?: RuleSetRules;
	/**
	 * Enable warnings when using the require function in a not statically analyse-able way
	 */
	unknownContextCritical?: boolean;
	/**
	 * Enable recursive directory lookup when using the require function in a not statically analyse-able way
	 */
	unknownContextRecursive?: boolean;
	/**
	 * Sets the regular expression when using the require function in a not statically analyse-able way
	 */
	unknownContextRegExp?:
		| boolean
		| {
				[k: string]: any;
		  };
	/**
	 * Sets the request when using the require function in a not statically analyse-able way
	 */
	unknownContextRequest?: string;
	/**
	 * Cache the resolving of module requests
	 */
	unsafeCache?:
		| boolean
		| {
				[k: string]: any;
		  };
	/**
	 * Enable warnings for partial dynamic dependencies
	 */
	wrappedContextCritical?: boolean;
	/**
	 * Enable recursive directory lookup for partial dynamic dependencies
	 */
	wrappedContextRecursive?: boolean;
	/**
	 * Set the inner regular expression for partial dynamic dependencies
	 */
	wrappedContextRegExp?: {
		[k: string]: any;
	};
	/**
	 * Emit errors instead of warnings when imported names don't exist in imported module
	 */
	strictExportPresence?: boolean;
	/**
	 * Handle the this context correctly according to the spec for namespace objects
	 */
	strictThisContextOnImports?: boolean;
}
/**
 * This interface was referenced by `WebpackOptions`'s JSON-Schema
 * via the `definition` "ruleSet-rule".
 */
export interface RuleSetRule {
	/**
	 * Enforce this rule as pre or post step
	 */
	enforce?: "pre" | "post";
	/**
	 * Shortcut for resource.exclude
	 */
	exclude?: RuleSetCondition & {
		[k: string]: any;
	};
	/**
	 * Shortcut for resource.include
	 */
	include?: RuleSetCondition & {
		[k: string]: any;
	};
	/**
	 * Match the issuer of the module (The module pointing to this module)
	 */
	issuer?: RuleSetCondition & {
		[k: string]: any;
	};
	/**
	 * Shortcut for use.loader
	 */
	loader?: RuleSetLoader | RuleSetUse;
	/**
	 * Shortcut for use.loader
	 */
	loaders?: RuleSetUse;
	/**
	 * Only execute the first matching rule in this array
	 */
	oneOf?: RuleSetRules;
	/**
	 * Shortcut for use.options
	 */
	options?: RuleSetQuery;
	/**
	 * Options for parsing
	 */
	parser?: {
		[k: string]: any;
	};
	/**
	 * Options for the resolver
	 */
	resolve?: Resolve;
	/**
	 * Flags a module as with or without side effects
	 */
	sideEffects?: boolean;
	/**
	 * Shortcut for use.query
	 */
	query?: RuleSetQuery;
	/**
	 * Module type to use for the module
	 */
	type?:
		| "javascript/auto"
		| "javascript/dynamic"
		| "javascript/esm"
		| "json"
		| "webassembly/experimental";
	/**
	 * Match the resource path of the module
	 */
	resource?: RuleSetCondition & {
		[k: string]: any;
	};
	/**
	 * Match the resource query of the module
	 */
	resourceQuery?: RuleSetCondition;
	/**
	 * Match the child compiler name
	 */
	compiler?: RuleSetCondition;
	/**
	 * Match and execute these rules when this rule is matched
	 */
	rules?: RuleSetRules;
	/**
	 * Shortcut for resource.test
	 */
	test?: RuleSetCondition & {
		[k: string]: any;
	};
	/**
	 * Modifiers applied to the module when rule is matched
	 */
	use?: RuleSetUse;
}
/**
 * This interface was referenced by `WebpackOptions`'s JSON-Schema
 * via the `definition` "resolve".
 */
export interface Resolve {
	/**
	 * Redirect module requests
	 */
	alias?:
		| {
				/**
				 * New request
				 */
				[k: string]: string;
		  }
		| {
				/**
				 * New request
				 */
				alias?: string;
				/**
				 * Request to be redirected
				 */
				name?: string;
				/**
				 * Redirect only exact matching request
				 */
				onlyModule?: boolean;
		  }[];
	/**
	 * Fields in the description file (package.json) which are used to redirect requests inside the module
	 */
	aliasFields?: CommonArrayOfStringOrStringArrayValues;
	/**
	 * Predicate function to decide which requests should be cached
	 */
	cachePredicate?: {
		[k: string]: any;
	};
	/**
	 * Include the context information in the cache identifier when caching
	 */
	cacheWithContext?: boolean;
	/**
	 * Filenames used to find a description file
	 */
	descriptionFiles?: CommonArrayOfStringValues;
	/**
	 * Enforce using one of the extensions from the extensions option
	 */
	enforceExtension?: boolean;
	/**
	 * Enforce using one of the module extensions from the moduleExtensions option
	 */
	enforceModuleExtension?: boolean;
	/**
	 * Extensions added to the request when trying to find the file
	 */
	extensions?: CommonArrayOfStringValues;
	/**
	 * Filesystem for the resolver
	 */
	fileSystem?: {
		[k: string]: any;
	};
	/**
	 * Field names from the description file (package.json) which are used to find the default entry point
	 */
	mainFields?: CommonArrayOfStringOrStringArrayValues;
	/**
	 * Filenames used to find the default entry point if there is no description file or main field
	 */
	mainFiles?: CommonArrayOfStringValues;
	/**
	 * Extensions added to the module request when trying to find the module
	 */
	moduleExtensions?: CommonArrayOfStringValues;
	/**
	 * Folder names or directory paths where to find modules
	 */
	modules?: CommonArrayOfStringValues;
	/**
	 * Plugins for the resolver
	 */
	plugins?: (CommonPluginObject | CommonPluginFunction)[];
	/**
	 * Custom resolver
	 */
	resolver?: {
		[k: string]: any;
	};
	/**
	 * Enable resolving symlinks to the original location
	 */
	symlinks?: boolean;
	/**
	 * Enable concord resolving extras
	 */
	concord?: boolean;
	/**
	 * Enable caching of successfully resolved requests
	 */
	unsafeCache?:
		| boolean
		| {
				[k: string]: any;
		  };
	/**
	 * Use synchronous filesystem calls for the resolver
	 */
	useSyncFileSystemCalls?: boolean;
}
/**
 * Plugin instance
 *
 * This interface was referenced by `WebpackOptions`'s JSON-Schema
 * via the `definition` "common.pluginObject".
 */
export interface CommonPluginObject {
	/**
	 * The run point of the plugin, required method.
	 */
	apply: {
		[k: string]: any;
	};
	[k: string]: any;
}
/**
 * Function acting as plugin
 *
 * This interface was referenced by `WebpackOptions`'s JSON-Schema
 * via the `definition` "common.pluginFunction".
 */
export interface CommonPluginFunction {
	/**
	 * The run point of the plugin, required method.
	 */
	apply: {
		[k: string]: any;
	};
	[k: string]: any;
}
/**
 * This interface was referenced by `WebpackOptions`'s JSON-Schema
 * via the `definition` "output".
 */
export interface Output {
	/**
	 * Add a comment in the UMD wrapper.
	 */
	auxiliaryComment?:
		| string
		| {
				/**
				 * Set comment for `amd` section in UMD
				 */
				amd?: string;
				/**
				 * Set comment for `commonjs` (exports) section in UMD
				 */
				commonjs?: string;
				/**
				 * Set comment for `commonjs2` (module.exports) section in UMD
				 */
				commonjs2?: string;
				/**
				 * Set comment for `root` (global variable) section in UMD
				 */
				root?: string;
		  };
	/**
	 * The filename of non-entry chunks as relative path inside the `output.path` directory.
	 */
	chunkFilename?: string;
	/**
	 * The filename of WebAssembly modules as relative path inside the `output.path` directory.
	 */
	webassemblyModuleFilename?: string;
	/**
	 * An expression which is used to address the global object/scope in runtime code
	 */
	globalObject?: string;
	/**
	 * This option enables cross-origin loading of chunks.
	 */
	crossOriginLoading?: false | "anonymous" | "use-credentials";
	/**
	 * This option enables loading async chunks via a custom script type, such as script type="module"
	 */
	jsonpScriptType?: false | "text/javascript" | "module";
	/**
	 * Number of milliseconds before chunk request expires
	 */
	chunkLoadTimeout?: number;
	/**
	 * Similar to `output.devtoolModuleFilenameTemplate`, but used in the case of duplicate module identifiers.
	 */
	devtoolFallbackModuleFilenameTemplate?:
		| string
		| {
				[k: string]: any;
		  };
	/**
	 * Enable line to line mapped mode for all/specified modules. Line to line mapped mode uses a simple SourceMap where each line of the generated source is mapped to the same line of the original source. It’s a performance optimization. Only use it if your performance need to be better and you are sure that input lines match which generated lines.
	 */
	devtoolLineToLine?:
		| boolean
		| {
				[k: string]: any;
		  };
	/**
	 * Filename template string of function for the sources array in a generated SourceMap.
	 */
	devtoolModuleFilenameTemplate?:
		| string
		| {
				[k: string]: any;
		  };
	/**
	 * Module namespace to use when interpolating filename template string for the sources array in a generated SourceMap. Defaults to `output.library` if not set. It's useful for avoiding runtime collisions in sourcemaps from multiple webpack projects built as libraries.
	 */
	devtoolNamespace?: string;
	/**
	 * Specifies the name of each output file on disk. You must **not** specify an absolute path here! The `output.path` option determines the location on disk the files are written to, filename is used solely for naming the individual files.
	 */
	filename?:
		| string
		| {
				[k: string]: any;
		  };
	/**
	 * Digest type used for the hash
	 */
	hashDigest?: string;
	/**
	 * Number of chars which are used for the hash
	 */
	hashDigestLength?: number;
	/**
	 * Algorithm used for generation the hash (see node.js crypto package)
	 */
	hashFunction?:
		| string
		| {
				[k: string]: any;
		  };
	/**
	 * Any string which is added to the hash to salt it
	 */
	hashSalt?: string;
	/**
	 * The filename of the Hot Update Chunks. They are inside the output.path directory.
	 */
	hotUpdateChunkFilename?:
		| string
		| {
				[k: string]: any;
		  };
	/**
	 * The JSONP function used by webpack for async loading of hot update chunks.
	 */
	hotUpdateFunction?: string;
	/**
	 * The filename of the Hot Update Main File. It is inside the `output.path` directory.
	 */
	hotUpdateMainFilename?:
		| string
		| {
				[k: string]: any;
		  };
	/**
	 * The JSONP function used by webpack for async loading of chunks.
	 */
	jsonpFunction?: string;
	/**
	 * The callback function name used by webpack for loading of chunks in WebWorkers.
	 */
	chunkCallbackName?: string;
	/**
	 * If set, export the bundle as library. `output.library` is the name.
	 */
	library?:
		| string
		| string[]
		| {
				/**
				 * Name of the property exposed globally by a UMD library
				 */
				root?: string | CommonArrayOfStringValues;
				/**
				 * Name of the exposed AMD library in the UMD
				 */
				amd?: string;
				/**
				 * Name of the exposed commonjs export in the UMD
				 */
				commonjs?: string;
		  };
	/**
	 * Type of library
	 */
	libraryTarget?:
		| "var"
		| "assign"
		| "this"
		| "window"
		| "self"
		| "global"
		| "commonjs"
		| "commonjs2"
		| "commonjs-module"
		| "amd"
		| "umd"
		| "umd2"
		| "jsonp";
	/**
	 * Specify which export should be exposed as library
	 */
	libraryExport?: string | CommonArrayOfStringValues;
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
		| {
				[k: string]: any;
		  };
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
}
