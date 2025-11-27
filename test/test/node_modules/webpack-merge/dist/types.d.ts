export type Key = string;
export type Customize = (a: any, b: any, key: Key) => any;
export interface ICustomizeOptions {
    customizeArray?: Customize;
    customizeObject?: Customize;
}
export declare enum CustomizeRule {
    Match = "match",
    Merge = "merge",
    Append = "append",
    Prepend = "prepend",
    Replace = "replace"
}
export type CustomizeRuleString = "match" | "merge" | "append" | "prepend" | "replace";
