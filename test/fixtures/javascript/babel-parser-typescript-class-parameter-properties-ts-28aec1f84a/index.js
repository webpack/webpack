class C {
    constructor(
        readonly r,
        public pu: number,
        protected po?,
        private pi?: number,
        public readonly pur,
        // Also works on AssignmentPattern
        readonly x = 0,
        public y?: number = 0) {}
}
