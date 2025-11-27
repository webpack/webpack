import type { EntryOptions, Stats, MultiStats, Configuration, WebpackError, WebpackOptionsNormalized, Compiler, MultiCompiler, Problem, Argument, AssetEmittedInfo, FileCacheOptions } from "webpack";
import type webpack from "webpack";
import type { ClientConfiguration, Configuration as DevServerConfig } from "webpack-dev-server";
import { type Colorette } from "colorette";
import { type Command, type CommandOptions, type Option, type ParseOptions } from "commander";
import { type prepare } from "rechoir";
import { type stringifyChunked } from "@discoveryjs/json-ext";
/**
 * Webpack CLI
 */
interface IWebpackCLI {
    colors: WebpackCLIColors;
    logger: WebpackCLILogger;
    isColorSupportChanged: boolean | undefined;
    webpack: typeof webpack;
    builtInOptionsCache: WebpackCLIBuiltInOption[] | undefined;
    program: WebpackCLICommand;
    isMultipleCompiler(compiler: WebpackCompiler): compiler is MultiCompiler;
    isPromise<T>(value: Promise<T>): value is Promise<T>;
    isFunction(value: unknown): value is CallableFunction;
    getLogger(): WebpackCLILogger;
    createColors(useColors?: boolean): WebpackCLIColors;
    toKebabCase: StringFormatter;
    capitalizeFirstLetter: StringFormatter;
    checkPackageExists(packageName: string): boolean;
    getAvailablePackageManagers(): PackageManager[];
    getDefaultPackageManager(): PackageManager | undefined;
    doInstall(packageName: string, options?: PackageInstallOptions): Promise<string>;
    loadJSONFile<T = unknown>(path: Path, handleError: boolean): Promise<T>;
    tryRequireThenImport<T = unknown>(module: ModuleName, handleError: boolean): Promise<T>;
    getInfoOptions(): WebpackCLIBuiltInOption[];
    getInfoOutput(options: {
        output: string;
        additionalPackage: string[];
    }): Promise<string>;
    makeCommand(commandOptions: WebpackCLIOptions, options: WebpackCLICommandOptions, action: CommandAction): Promise<WebpackCLICommand | undefined>;
    makeOption(command: WebpackCLICommand, option: WebpackCLIBuiltInOption): void;
    run(args: Parameters<WebpackCLICommand["parseOptions"]>[0], parseOptions?: ParseOptions): Promise<void>;
    getBuiltInOptions(): WebpackCLIBuiltInOption[];
    loadWebpack(handleError?: boolean): Promise<typeof webpack>;
    loadConfig(options: Partial<WebpackDevServerOptions>): Promise<WebpackCLIConfig>;
    buildConfig(config: WebpackCLIConfig, options: WebpackDevServerOptions): Promise<WebpackCLIConfig>;
    isValidationError(error: Error): error is WebpackError;
    createCompiler(options: Partial<WebpackDevServerOptions>, callback?: Callback<[Error | undefined, Stats | MultiStats | undefined]>): Promise<WebpackCompiler>;
    needWatchStdin(compiler: Compiler | MultiCompiler): boolean;
    runWebpack(options: WebpackRunOptions, isWatchCommand: boolean): Promise<void>;
}
interface WebpackCLIColors extends Colorette {
    isColorSupported: boolean;
}
interface WebpackCLILogger {
    error: LogHandler;
    warn: LogHandler;
    info: LogHandler;
    success: LogHandler;
    log: LogHandler;
    raw: LogHandler;
}
interface WebpackCLICommandOption extends CommanderOption {
    helpLevel?: "minimum" | "verbose";
}
interface WebpackCLIConfig {
    options: WebpackConfiguration | WebpackConfiguration[];
    path: WeakMap<object, string[]>;
}
interface WebpackCLICommand extends Command {
    pkg: string | undefined;
    forHelp: boolean | undefined;
    _args: WebpackCLICommandOption[];
}
type WebpackCLIMainOption = Pick<WebpackCLIBuiltInOption, "valueName" | "description" | "defaultValue" | "multiple"> & {
    flags: string;
    type: Set<BooleanConstructor | StringConstructor | NumberConstructor>;
};
interface WebpackCLIOptions extends CommandOptions {
    name: string;
    alias: string | string[];
    description?: string;
    usage?: string;
    dependencies?: string[];
    pkg?: string;
    argsDescription?: {
        [argName: string]: string;
    };
}
type WebpackCLICommandOptions = WebpackCLIBuiltInOption[] | (() => Promise<WebpackCLIBuiltInOption[]>);
interface WebpackCLIBuiltInFlag {
    name: string;
    alias?: string;
    type?: (value: string, previous: Record<string, BasicPrimitive | object>) => Record<string, BasicPrimitive | object>;
    configs?: Partial<FlagConfig>[];
    negative?: boolean;
    multiple?: boolean;
    valueName?: string;
    description?: string;
    describe?: string;
    negatedDescription?: string;
    defaultValue?: string;
    helpLevel: "minimum" | "verbose";
}
interface WebpackCLIBuiltInOption extends WebpackCLIBuiltInFlag {
    hidden?: boolean;
    group?: "core";
}
type WebpackCLIExternalCommandInfo = Pick<WebpackCLIOptions, "name" | "alias" | "description"> & {
    pkg: string;
};
/**
 * Webpack dev server
 */
type WebpackDevServerOptions = DevServerConfig & WebpackConfiguration & ClientConfiguration & AssetEmittedInfo & WebpackOptionsNormalized & FileCacheOptions & Argv & {
    nodeEnv?: "string";
    watchOptionsStdin?: boolean;
    progress?: boolean | "profile" | undefined;
    analyze?: boolean;
    prefetch?: string;
    json?: boolean;
    entry: EntryOptions;
    merge?: boolean;
    config: string[];
    configName?: string[];
    disableInterpret?: boolean;
    extends?: string[];
    argv: Argv;
};
type Callback<T extends unknown[]> = (...args: T) => void;
/**
 * Webpack
 */
type WebpackConfiguration = Configuration;
type LoadableWebpackConfiguration = PotentialPromise<WebpackConfiguration | CallableWebpackConfiguration>;
type CallableWebpackConfiguration = (env: Env | undefined, argv: Argv) => WebpackConfiguration;
type WebpackCompiler = Compiler | MultiCompiler;
type FlagType = boolean | "enum" | "string" | "path" | "number" | "boolean" | "RegExp" | "reset";
type FlagConfig = {
    negatedDescription: string;
    type: FlagType;
    values: FlagType[];
};
type FileSystemCacheOptions = WebpackConfiguration & {
    cache: FileCacheOptions & {
        defaultConfig: string[];
    };
};
type ProcessedArguments = Record<string, (BasicPrimitive | RegExp)[]>;
type CommandAction = Parameters<WebpackCLICommand["action"]>[0];
interface WebpackRunOptions extends WebpackOptionsNormalized {
    progress?: boolean | "profile";
    json?: boolean;
    argv?: Argv;
    env: Env;
    failOnWarnings?: boolean;
    isWatchingLikeCommand?: boolean;
}
/**
 * Package management
 */
type PackageManager = "pnpm" | "yarn" | "npm";
interface PackageInstallOptions {
    preMessage?: () => void;
}
/**
 * Plugins and util types
 */
interface CLIPluginOptions {
    isMultiCompiler?: boolean;
    configPath?: string[];
    helpfulOutput: boolean;
    hot?: boolean | "only";
    progress?: boolean | "profile";
    prefetch?: string;
    analyze?: boolean;
}
type BasicPrimitive = string | boolean | number;
type Instantiable<InstanceType = unknown, ConstructorParameters extends unknown[] = unknown[]> = {
    new (...args: ConstructorParameters): InstanceType;
};
type PotentialPromise<T> = T | Promise<T>;
type ModuleName = string;
type Path = string;
type LogHandler = (value: any) => void;
type StringFormatter = (value: string) => string;
interface Argv extends Record<string, any> {
    env?: Env;
}
interface Env {
    WEBPACK_BUNDLE?: boolean;
    WEBPACK_BUILD?: boolean;
    WEBPACK_WATCH?: boolean;
    WEBPACK_SERVE?: boolean;
    WEBPACK_PACKAGE?: string;
    WEBPACK_DEV_SERVER_PACKAGE?: string;
}
type DynamicImport<T> = (url: string) => Promise<{
    default: T;
}>;
interface ImportLoaderError extends Error {
    code?: string;
}
/**
 * External libraries types
 */
type OptionConstructor = new (flags: string, description?: string) => Option;
type CommanderOption = InstanceType<OptionConstructor>;
interface Rechoir {
    prepare: typeof prepare;
}
interface JsonExt {
    stringifyChunked: typeof stringifyChunked;
}
interface RechoirError extends Error {
    failures: RechoirError[];
    error: Error;
}
interface PromptOptions {
    message: string;
    defaultResponse: string;
    stream: NodeJS.WritableStream;
}
export { IWebpackCLI, WebpackCLICommandOption, WebpackCLIBuiltInOption, WebpackCLIBuiltInFlag, WebpackCLIColors, WebpackCLIConfig, WebpackCLIExternalCommandInfo, WebpackCLIOptions, WebpackCLICommand, WebpackCLICommandOptions, WebpackCLIMainOption, WebpackCLILogger, WebpackDevServerOptions, WebpackRunOptions, WebpackCompiler, WebpackConfiguration, Argv, Argument, BasicPrimitive, CallableWebpackConfiguration, Callback, CLIPluginOptions, CommandAction, CommanderOption, CommandOptions, LoadableWebpackConfiguration, DynamicImport, FileSystemCacheOptions, FlagConfig, ImportLoaderError, Instantiable, JsonExt, ModuleName, PackageInstallOptions, PackageManager, Path, ProcessedArguments, PromptOptions, Problem, PotentialPromise, Rechoir, RechoirError, };
