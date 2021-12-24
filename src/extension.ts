import * as vscode from 'vscode'
import * as net from 'net'
import { TransportKind, LanguageClient, LanguageClientOptions, StreamInfo } from 'vscode-languageclient/node'
import { readLexTokens } from './lisp'
import { Swank } from './vscode/backend/Swank'
import { tokenModifiersLegend, tokenTypesLegend } from './vscode/colorize'
import * as cmds from './vscode/commands'
import { PackageMgr } from './vscode/PackageMgr'
import { getFoldProvider, getHoverProvider, getRenameProvider } from './vscode/providers'
import { ExtensionState, SwankBackendState } from './vscode/Types'
import { COMMON_LISP_ID, hasValidLangId, REPL_ID, useEditor } from './vscode/Utils'

const BACKEND_TYPE_SWANK = 'Swank'
const BACKEND_TYPE_LSP = 'LSP'
const DEFAULT_LSP_PORT = 25483
const DEFAULT_LSP_HOST = '127.0.0.1'

const legend = new vscode.SemanticTokensLegend(tokenTypesLegend, tokenModifiersLegend)
let state: ExtensionState = { hoverText: '', compileRunning: false, compileTimeoutID: undefined }
let backendType = BACKEND_TYPE_SWANK

export const activate = async (ctx: vscode.ExtensionContext) => {
    const swankState: SwankBackendState = {
        ctx,
        extState: state,
        repl: undefined,
        pkgMgr: new PackageMgr(),
    }

    const serverOpts: () => Promise<StreamInfo> = () => {
        return new Promise((resolve, reject) => {
            const socket: net.Socket = net.connect({ port: DEFAULT_LSP_PORT, host: DEFAULT_LSP_HOST }, () =>
                resolve({ reader: socket, writer: socket })
            )

            socket.on('error', (err) => reject(err))
        })
    }
    const clientOpts: LanguageClientOptions = {
        documentSelector: [
            { scheme: 'file', language: COMMON_LISP_ID },
            { scheme: 'untitled', language: COMMON_LISP_ID },
        ],
    }

    const client = new LanguageClient(COMMON_LISP_ID, 'Alive Client', serverOpts, clientOpts)

    backendType = BACKEND_TYPE_LSP
    client.start()

    if (backendType === BACKEND_TYPE_SWANK) {
        state.backend = new Swank(swankState)

        // vscode.window.onDidChangeVisibleTextEditors((editors: vscode.TextEditor[]) => visibleEditorsChanged(editors))
        vscode.window.onDidChangeActiveTextEditor(
            (editor?: vscode.TextEditor) => state.backend?.editorChanged(editor),
            null,
            ctx.subscriptions
        )
        vscode.workspace.onDidOpenTextDocument((doc: vscode.TextDocument) => openTextDocument(doc))
        vscode.workspace.onDidChangeTextDocument(
            (event: vscode.TextDocumentChangeEvent) => state.backend?.textDocumentChanged(event),
            null,
            ctx.subscriptions
        )
        vscode.workspace.onDidSaveTextDocument((doc: vscode.TextDocument) => state.backend?.textDocumentSaved(doc))

        if (state.backend !== undefined) {
            vscode.languages.registerCompletionItemProvider(
                { scheme: 'untitled', language: COMMON_LISP_ID },
                state.backend.getCompletionProvider()
            )
            vscode.languages.registerCompletionItemProvider(
                { scheme: 'file', language: COMMON_LISP_ID },
                state.backend.getCompletionProvider()
            )
            vscode.languages.registerCompletionItemProvider(
                { scheme: 'file', language: REPL_ID },
                state.backend.getCompletionProvider()
            )

            vscode.languages.registerDocumentFormattingEditProvider(
                { scheme: 'untitled', language: COMMON_LISP_ID },
                state.backend.getFormatProvider()
            )
            vscode.languages.registerDocumentFormattingEditProvider(
                { scheme: 'file', language: COMMON_LISP_ID },
                state.backend.getFormatProvider()
            )

            vscode.languages.registerDocumentSemanticTokensProvider(
                { scheme: 'untitled', language: COMMON_LISP_ID },
                state.backend.getSemTokensProvider(),
                legend
            )
            vscode.languages.registerDocumentSemanticTokensProvider(
                { scheme: 'file', language: COMMON_LISP_ID },
                state.backend.getSemTokensProvider(),
                legend
            )
            vscode.languages.registerDocumentSemanticTokensProvider(
                { scheme: 'file', language: REPL_ID },
                state.backend.getSemTokensProvider(),
                legend
            )

            vscode.languages.registerDefinitionProvider(
                { scheme: 'untitled', language: COMMON_LISP_ID },
                state.backend.getDefinitionProvider()
            )
            vscode.languages.registerDefinitionProvider(
                { scheme: 'file', language: COMMON_LISP_ID },
                state.backend.getDefinitionProvider()
            )
            vscode.languages.registerDefinitionProvider(
                { scheme: 'file', language: REPL_ID },
                state.backend.getDefinitionProvider()
            )
        }

        vscode.languages.registerRenameProvider({ scheme: 'untitled', language: COMMON_LISP_ID }, getRenameProvider(state))
        vscode.languages.registerRenameProvider({ scheme: 'file', language: COMMON_LISP_ID }, getRenameProvider(state))

        vscode.languages.registerHoverProvider({ scheme: 'file', language: COMMON_LISP_ID }, getHoverProvider(state))

        vscode.languages.registerFoldingRangeProvider({ scheme: 'untitled', language: COMMON_LISP_ID }, getFoldProvider(state))
        vscode.languages.registerFoldingRangeProvider({ scheme: 'file', language: COMMON_LISP_ID }, getFoldProvider(state))

        if (backendType === BACKEND_TYPE_SWANK) {
            ctx.subscriptions.push(vscode.commands.registerCommand('alive.attachRepl', () => cmds.attachRepl(state)))
            ctx.subscriptions.push(vscode.commands.registerCommand('alive.detachRepl', () => cmds.detachRepl(state)))
        }

        ctx.subscriptions.push(vscode.commands.registerCommand('alive.selectSexpr', () => cmds.selectSexpr()))
        ctx.subscriptions.push(vscode.commands.registerCommand('alive.sendToRepl', () => cmds.sendToRepl(state)))
        ctx.subscriptions.push(vscode.commands.registerCommand('alive.inlineEval', () => cmds.inlineEval(state)))
        ctx.subscriptions.push(vscode.commands.registerCommand('alive.clearInlineResults', () => cmds.clearInlineResults(state)))
        ctx.subscriptions.push(vscode.commands.registerCommand('alive.startReplAndAttach', () => cmds.startReplAndAttach(state)))
        ctx.subscriptions.push(vscode.commands.registerCommand('alive.replHistory', () => cmds.sendReplHistoryItem(state)))
        ctx.subscriptions.push(
            vscode.commands.registerCommand('alive.replHistoryDoNotEval', () => cmds.grabReplHistoryItem(state))
        )
        ctx.subscriptions.push(vscode.commands.registerCommand('alive.debugAbort', () => cmds.debugAbort(state)))
        ctx.subscriptions.push(vscode.commands.registerCommand('alive.nthRestart', (n: unknown) => cmds.nthRestart(state, n)))
        ctx.subscriptions.push(vscode.commands.registerCommand('alive.macroExpand', () => cmds.macroExpand(state)))
        ctx.subscriptions.push(vscode.commands.registerCommand('alive.macroExpandAll', () => cmds.macroExpandAll(state)))
        ctx.subscriptions.push(vscode.commands.registerCommand('alive.disassemble', () => cmds.disassemble(state)))
        ctx.subscriptions.push(vscode.commands.registerCommand('alive.compileFile', () => cmds.compileFile(state, false)))
        ctx.subscriptions.push(vscode.commands.registerCommand('alive.loadFile', () => cmds.loadFile(state)))
        ctx.subscriptions.push(vscode.commands.registerCommand('alive.loadAsdfSystem', () => cmds.loadAsdfSystem(state)))
        ctx.subscriptions.push(vscode.commands.registerCommand('alive.compileAsdfSystem', () => cmds.compileAsdfSystem(state)))
        ctx.subscriptions.push(vscode.commands.registerCommand('alive.inspector', () => cmds.inspector(state)))
        ctx.subscriptions.push(vscode.commands.registerCommand('alive.inspector-prev', () => cmds.inspectorPrev(state)))
        ctx.subscriptions.push(vscode.commands.registerCommand('alive.inspector-next', () => cmds.inspectorNext(state)))
        ctx.subscriptions.push(vscode.commands.registerCommand('alive.inspector-refresh', () => cmds.inspectorRefresh(state)))
        ctx.subscriptions.push(vscode.commands.registerCommand('alive.inspector-quit', () => cmds.inspectorQuit(state)))
        ctx.subscriptions.push(vscode.commands.registerCommand('alive.systemSkeleton', () => cmds.systemSkeleton()))

        useEditor([COMMON_LISP_ID, REPL_ID], (editor: vscode.TextEditor) => {
            readLexTokens(editor.document.fileName, editor.document.getText())
            // visibleEditorsChanged(vscode.window.visibleTextEditors)
        })
    }
}

function visibleEditorsChanged(editors: vscode.TextEditor[]) {
    for (const editor of editors) {
        if (hasValidLangId(editor.document, [COMMON_LISP_ID, REPL_ID])) {
            readLexTokens(editor.document.fileName, editor.document.getText())
        }
    }
}

function openTextDocument(doc: vscode.TextDocument) {
    if (!hasValidLangId(doc, [COMMON_LISP_ID, REPL_ID])) {
        return
    }

    readLexTokens(doc.fileName, doc.getText())
}
