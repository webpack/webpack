declare function foo (this : number, a : string, b : number) : void

declare function bar (this : number): void

declare function baz (this : number, ...a : any): void

declare function qux<T> (this : T) : void
