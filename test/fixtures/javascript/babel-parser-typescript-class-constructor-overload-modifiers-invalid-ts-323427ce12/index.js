class C {
    constructor(public x: number, private y: number);
    constructor(protected x: string, readonly y: string);
    constructor(x: any, y: any) {}
}
