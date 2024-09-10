import { table } from 'table'

export function test() {
    expect(table([['1']])).toBe('<table><tr><td>1</td></tr></table>')
}