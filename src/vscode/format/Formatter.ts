import * as vscode from 'vscode'
import { Token, types } from '../../lisp'
import { toVscodePos } from '../Utils'
import { FormatToken, Whitespace } from './FormatToken'
import { RootExpr } from './RootExpr'
import { TokenList } from './TokenList'
import { HaveBody, Options, State, withIndent } from './Utils'

export { HaveBody, Options } from './Utils'

export class Formatter {
    docTokens: Token[]
    state: State

    constructor(options: Options, tokens: Token[], haveBody: HaveBody) {
        this.docTokens = tokens
        this.state = new State(options, [], new TokenList(), haveBody)
    }

    format(): vscode.TextEdit[] {
        this.getFormatTokens()
        this.updateTargets()

        return this.genTextEdits()
    }

    private genTextEdits(): vscode.TextEdit[] {
        const edits: vscode.TextEdit[] = []

        for (const fmtToken of this.state.tokenList.tokens) {
            const before = fmtToken.before

            if (fmtToken.token.type === types.WHITE_SPACE) {
                const start = toVscodePos(fmtToken.token.start)
                const end = toVscodePos(fmtToken.token.end)
                const range = new vscode.Range(start, end)

                edits.push(vscode.TextEdit.delete(range))
                edits.push(vscode.TextEdit.insert(end, before.target))
            } else if (before.existing !== before.target) {
                const start = toVscodePos(before.start)
                const end = toVscodePos(fmtToken.token.start)
                const range = new vscode.Range(start, end)

                edits.push(vscode.TextEdit.delete(range))
                edits.push(vscode.TextEdit.insert(end, before.target))
            }
        }

        return edits
    }

    private getFormatTokens() {
        let formatToken: FormatToken | undefined = undefined

        for (let ndx = 0; ndx < this.docTokens.length; ndx += 1) {
            const docToken = this.docTokens[ndx]
            const start = toVscodePos(docToken.start)

            if (docToken.type === types.WHITE_SPACE) {
                formatToken = new FormatToken(new Whitespace(start), docToken)
                formatToken.before.existing = docToken.text
                continue
            }

            if (formatToken === undefined) {
                formatToken = new FormatToken(new Whitespace(start), docToken)
            } else {
                formatToken.token = docToken
            }

            this.state.tokenList.add(formatToken)
            formatToken = undefined
        }

        if (formatToken !== undefined) {
            this.state.tokenList.add(formatToken)
        }
    }

    private updateTargets() {
        if (this.state.tokenList.isEmpty()) {
            return
        }

        withIndent(this.state, 0, () => {
            const expr = new RootExpr(this.state)
            expr.format()
        })
    }
}
