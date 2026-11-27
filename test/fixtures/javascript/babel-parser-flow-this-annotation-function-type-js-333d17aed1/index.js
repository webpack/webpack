type T = (this : number, a : string, b : number) => void

type U = (this : number, ...c : any) => void

type V = (this : number) => void

type Q = <T>(this : T) => void
