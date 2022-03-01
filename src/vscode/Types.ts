import { ChildProcess } from 'child_process'
import * as vscode from 'vscode'
import { PackageMgr } from './PackageMgr'
import { Repl } from './repl'

export interface ExtensionState {
    child?: ChildProcess
    backend?: Backend
    hoverText: string
    compileRunning: boolean
    compileTimeoutID: NodeJS.Timeout | undefined
}

export interface LSPBackendState {
    extState: ExtensionState
}

export interface SwankBackendState {
    extState: ExtensionState
    ctx: vscode.ExtensionContext
    repl?: Repl
    slimeBasePath?: string
    pkgMgr: PackageMgr
}

/**
 * Interface used for the backend that the extension is connected to
 */
export interface Backend {
    /**
     * The default port to connect to
     */
    defaultPort: number

    inspector(text: string, pkgName: string): Promise<void>

    inspectorPrev(): Promise<void>

    inspectorNext(): Promise<void>

    inspectorRefresh(): Promise<void>

    inspectorQuit(): Promise<void>

    addToReplView(text: string): Promise<void>

    inlineEval(text: string, pkgName: string): Promise<string | undefined>

    replDebugAbort(): void

    macroExpand(text: string, pkgName: string): Promise<string | undefined>

    macroExpandAll(text: string, pkgName: string): Promise<string | undefined>

    disassemble(text: string, pkgName: string): Promise<string | undefined>

    listAsdfSystems(): Promise<string[]>

    compileAsdfSystem(name: string): Promise<CompileFileResp | undefined>

    loadAsdfSystem(name: string): Promise<CompileFileResp | undefined>

    loadFile(path: string, showMsgs?: boolean): Promise<void>

    compileFile(path: string, ignoreOutput?: boolean): Promise<CompileFileResp | undefined>

    getSymbolDoc(text: string, pkgName: string): Promise<string | undefined>

    getOpArgs(name: string, pkgName: string): Promise<string | undefined>

    /**
     * Action to take when a text document is changed
     * @param event The change event
     */
    textDocumentChanged(event: vscode.TextDocumentChangeEvent): void

    /**
     * Check if the backend is currently connected
     */
    isConnected(): boolean

    /**
     * Connect to the given host and port
     * @param hostPort The HostPort pair to connect to
     */
    connect(hostPort: HostPort): Promise<void>

    /**
     * Disconnect from the backend
     */
    disconnect(): Promise<void>

    /**
     * Get the package name for the given line in the given document
     * @param doc The text document
     * @param line The line in the document
     */
    getPkgName(doc: vscode.TextDocument, line: number): string

    /**
     * Send the given text to the REPL for evaluation
     * @param editor The REPL editor buffer
     * @param text The text to send
     * @param pkgName The package name to evaluate the text in
     * @param captureOutput Whether to capture output
     */
    sendToRepl(editor: vscode.TextEditor, text: string, pkgName: string, captureOutput: boolean): Promise<void>

    /**
     * Tell the REPL to choose the given restart
     * @param restart The restart number
     */
    replNthRestart(restart: number): Promise<void>

    /**
     * Install needed software to start the server
     */
    installServer(): Promise<void>

    /**
     * Get the install path for the server
     */
    serverInstallPath(): string | undefined

    /**
     * The command to use to start the server
     */
    serverStartupCommand(): string[] | undefined
}

export interface LocalBackend extends Backend {
    /**
     * Action to take when a text document is saved
     * @param doc The text document that was saved
     */
    textDocumentSaved(doc: vscode.TextDocument): Promise<void>

    editorChanged(editor?: vscode.TextEditor): void

    getFormatProvider(): vscode.DocumentFormattingEditProvider

    getSemTokensProvider(): vscode.DocumentSemanticTokensProvider

    getCompletionProvider(): vscode.CompletionItemProvider

    getDefinitionProvider(): vscode.DefinitionProvider
}

export interface SlimeVersion {
    created_at: string
    name: string
    zipball_url: string
}

export interface InstalledSlimeInfo {
    path: string
    latest: SlimeVersion | undefined
}

export interface HostPort {
    host: string
    port: number
}

export interface CompileLocation {
    file: string
    position: number
}

export interface CompileFileNote {
    message: string
    severity: string
    location: CompileLocation
}

export interface CompileFileResp {
    notes: CompileFileNote[]
}
