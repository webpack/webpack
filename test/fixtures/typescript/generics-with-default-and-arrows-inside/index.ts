const handler = useCallback<(event: Event) => void>((event) => {}, []);
const reducer = useReducer<(state: number, action: { type: string }) => number>((s) => s, 0);
const nested = make<{ a: Array<() => void> }>();
