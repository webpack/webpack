// Vendored from terser v5.51.2, BSD-2-Clause:
// https://github.com/terser/terser/blob/v5.51.2/tools/terser.d.ts

/// <reference lib="es2015" />

// Two changes from upstream, both for webpack's published types, which can
// import only what webpack depends on and cannot declare an enum. The source
// map shapes below are the ones this file imported from '@jridgewell/source-map',
// spelled out as that package defines them, less a `TraceMap` instance in
// `SectionedSourceMapInput`, which is a class of its own. And the two enums
// further down are written as the numbers they are.

// What a map this writes is, as '@jridgewell/gen-mapping' defines it.
interface EncodedSourceMap {
    file?: string | null;
    names: readonly string[];
    sourceRoot?: string;
    sources: readonly (string | null)[];
    sourcesContent?: readonly (string | null)[];
    version: 3;
    ignoreList?: readonly number[];
    mappings: string;
}

// What a map this reads may be, as '@jridgewell/trace-mapping' defines it.
interface SourceMapV3 {
    file?: string | null;
    names: string[];
    sourceRoot?: string;
    sources: (string | null)[];
    sourcesContent?: (string | null)[];
    version: 3;
    ignoreList?: number[];
}

type SourceMapSegment =
    | [number]
    | [number, number, number, number]
    | [number, number, number, number, number];

interface DecodedSourceMap extends SourceMapV3 {
    mappings: SourceMapSegment[][];
}

type XInput = { x_google_ignoreList?: number[] };

type SectionedSourceMapInput =
    | string
    | (SourceMapV3 & { mappings: string } & XInput)
    | (DecodedSourceMap & XInput)
    | {
          file?: string | null;
          sections: {
              offset: { line: number; column: number };
              map: SectionedSourceMapInput;
          }[];
          version: 3;
      };

export type ECMA = 5 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025;

export type ConsoleProperty = keyof typeof console;
type DropConsoleOption = boolean | ConsoleProperty[];

export interface ParseOptions {
    bare_returns?: boolean;
    /** @deprecated legacy option. Currently, all supported EcmaScript is valid to parse. */
    ecma?: ECMA;
    html5_comments?: boolean;
    shebang?: boolean;
}

export interface CompressOptions {
    arguments?: boolean;
    arrows?: boolean;
    booleans_as_integers?: boolean;
    booleans?: boolean;
    collapse_vars?: boolean;
    comparisons?: boolean;
    computed_props?: boolean;
    conditionals?: boolean;
    dead_code?: boolean;
    defaults?: boolean;
    directives?: boolean;
    drop_console?: DropConsoleOption;
    drop_debugger?: boolean;
    ecma?: ECMA;
    builtins_ecma?: ECMA;
    builtins_pure?: boolean;
    evaluate?: boolean;
    expression?: boolean;
    global_defs?: object;
    hoist_funs?: boolean;
    hoist_props?: boolean;
    hoist_vars?: boolean;
    ie8?: boolean;
    if_return?: boolean;
    inline?: boolean | InlineFunctions;
    join_vars?: boolean;
    keep_classnames?: boolean | RegExp;
    keep_fargs?: boolean;
    keep_fnames?: boolean | RegExp;
    keep_infinity?: boolean;
    lhs_constants?: boolean;
    loops?: boolean;
    module?: boolean;
    negate_iife?: boolean;
    passes?: number;
    properties?: boolean;
    pure_funcs?: string[];
    pure_new?: boolean;
    pure_getters?: boolean | 'strict';
    reduce_funcs?: boolean;
    reduce_vars?: boolean;
    sequences?: boolean | number;
    side_effects?: boolean;
    switches?: boolean;
    toplevel?: boolean;
    top_retain?: null | string | string[] | RegExp;
    typeofs?: boolean;
    unsafe_arrows?: boolean;
    unsafe?: boolean;
    unsafe_comps?: boolean;
    unsafe_Function?: boolean;
    unsafe_math?: boolean;
    unsafe_symbols?: boolean;
    unsafe_methods?: boolean;
    unsafe_proto?: boolean;
    unsafe_regexp?: boolean;
    unsafe_undefined?: boolean;
    unused?: boolean;
}

// 0 Disabled, 1 SimpleFunctions, 2 WithArguments, 3 WithArgumentsAndVariables
export type InlineFunctions = 0 | 1 | 2 | 3;

export interface MangleOptions {
    eval?: boolean;
    keep_classnames?: boolean | RegExp;
    keep_fnames?: boolean | RegExp;
    module?: boolean;
    nth_identifier?: SimpleIdentifierMangler | WeightedIdentifierMangler;
    properties?: boolean | ManglePropertiesOptions;
    reserved?: string[];
    safari10?: boolean;
    toplevel?: boolean;
}

/**
 * An identifier mangler for which the output is invariant with respect to the source code.
 */
export interface SimpleIdentifierMangler {
    /**
     * Obtains the nth most favored (usually shortest) identifier to rename a variable to.
     * The mangler will increment n and retry until the return value is not in use in scope, and is not a reserved word.
     * This function is expected to be stable; Evaluating get(n) === get(n) should always return true.
     * @param n The ordinal of the identifier.
     */
    get(n: number): string;
}

/**
 * An identifier mangler that leverages character frequency analysis to determine identifier precedence.
 */
export interface WeightedIdentifierMangler extends SimpleIdentifierMangler {
    /**
     * Modifies the internal weighting of the input characters by the specified delta.
     * Will be invoked on the entire printed AST, and then deduct mangleable identifiers.
     * @param chars The characters to modify the weighting of.
     * @param delta The numeric weight to add to the characters.
     */
    consider(chars: string, delta: number): number;
    /**
     * Resets character weights.
     */
    reset(): void;
    /**
     * Sorts identifiers by character frequency, in preparation for calls to get(n).
     */
    sort(): void;
}

export interface ManglePropertiesOptions {
    builtins?: boolean;
    debug?: boolean;
    keep_quoted?: boolean | 'strict';
    nth_identifier?: SimpleIdentifierMangler | WeightedIdentifierMangler;
    regex?: RegExp | string;
    reserved?: string[];
}

export interface FormatOptions {
    ascii_only?: boolean;
    /** @deprecated Not implemented anymore */
    beautify?: boolean;
    braces?: boolean;
    comments?: boolean | 'all' | 'some' | RegExp | ( (node: any, comment: {
        value: string,
        type: 'comment1' | 'comment2' | 'comment3' | 'comment4',
        pos: number,
        line: number,
        col: number,
    }) => boolean );
    ecma?: ECMA;
    ie8?: boolean;
    keep_numbers?: boolean;
    indent_level?: number;
    indent_start?: number;
    inline_script?: boolean;
    keep_quoted_props?: boolean;
    max_line_len?: number | false;
    preamble?: string;
    preserve_annotations?: boolean;
    quote_keys?: boolean;
    quote_style?: OutputQuoteStyle;
    safari10?: boolean;
    semicolons?: boolean;
    shebang?: boolean;
    shorthand?: boolean;
    source_map?: SourceMapOptions;
    webkit?: boolean;
    width?: number;
    wrap_iife?: boolean;
    wrap_func_args?: boolean;
}

// 0 PreferDouble, 1 AlwaysSingle, 2 AlwaysDouble, 3 AlwaysOriginal
export type OutputQuoteStyle = 0 | 1 | 2 | 3;

export interface MinifyOptions {
    compress?: boolean | CompressOptions;
    ecma?: ECMA;
    enclose?: boolean | string;
    ie8?: boolean;
    keep_classnames?: boolean | RegExp;
    keep_fnames?: boolean | RegExp;
    mangle?: boolean | MangleOptions;
    module?: boolean;
    nameCache?: object;
    format?: FormatOptions;
    /** @deprecated */
    output?: FormatOptions;
    parse?: ParseOptions;
    safari10?: boolean;
    sourceMap?: boolean | SourceMapOptions;
    toplevel?: boolean;
}

export interface MinifyOutput {
    code?: string;
    map?: EncodedSourceMap | string;
    decoded_map?: DecodedSourceMap | null;
}

export interface SourceMapOptions {
    /** Source map object, 'inline' or source map file content */
    content?: SectionedSourceMapInput | string;
    includeSources?: boolean;
    filename?: string;
    root?: string;
    asObject?: boolean;
    url?: string | 'inline';
}

export function minify(files: string | string[] | { [file: string]: string }, options?: MinifyOptions): Promise<MinifyOutput>;
export function minify_sync(files: string | string[] | { [file: string]: string }, options?: MinifyOptions): MinifyOutput;
