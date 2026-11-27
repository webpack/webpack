interface I {
    m<T extends object = { x: number }>(): T;
}
