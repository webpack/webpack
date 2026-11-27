declare class A {
    m(this : number, a : number, b : string) : void,
    n(this : number, ...c : any) : void,
    o(this : number) : void,
    p<T>(this : T) : void
}
