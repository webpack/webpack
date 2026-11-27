class C {
    f<T>(a: T, b?: T, ...c: T[]): T {}
    [Symbol.iterator]<T>(): T {}
}
