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

export interface LSPBackendState {}

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
     * Action to take when a text document is saved
     * @param doc The text document that was saved
     */
    textDocumentSaved(doc: vscode.TextDocument): Promise<void>

    /**
     * Action to take when a text document is changed
     * @param event The change event
     */
    textDocumentChanged(event: vscode.TextDocumentChangeEvent): void

    editorChanged(editor?: vscode.TextEditor): void

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
     * Add the given text to the bottom of the REPL view
     * @param text Text to add
     */
    addToReplView(text: string): Promise<void>

    /**
     * Evaluate the given text in the given package
     * @param text Expression to evaluate
     * @param pkgName Package to evaluate the expression in
     */
    inlineEval(text: string, pkgName: string): Promise<string | undefined>

    /**
     * Abort the current debugger
     */
    replDebugAbort(): void

    /**
     * Tell the REPL to choose the given restart
     * @param restart The restart number
     */
    replNthRestart(restart: number): Promise<void>

    /**
     * Expand the given macro in the given package
     * @param text Text of the macro
     * @param pkgName Package to use
     */
    macroExpand(text: string, pkgName: string): Promise<string | undefined>

    /**
     * Recursively expand the given macro
     * @param text Text of the macro
     * @param pkgName Package to use
     */
    macroExpandAll(text: string, pkgName: string): Promise<string | undefined>

    /**
     * Disassemble the function specified by the given symbol
     * @param text Symbol to disassemble
     * @param pkgName Package to use
     */
    disassemble(text: string, pkgName: string): Promise<string | undefined>

    /**
     * Get the list of defined ASDF systems
     */
    listAsdfSystems(): Promise<string[]>

    /**
     * Compile the given ASDF system
     * @param name Name of the system to compile
     */
    compileAsdfSystem(name: string): Promise<CompileFileResp | undefined>

    /**
     * Load the given ASDF system
     * @param name Name of the system to load
     */
    loadAsdfSystem(name: string): Promise<CompileFileResp | undefined>

    /**
     * Load the given file into the REPL
     * @param path Path of the file to load
     */
    loadFile(path: string): Promise<void>

    /**
     * Compile the given file
     * @param path Path of the file to compile
     * @param ignoreOutput Whether to ignore the output
     */
    compileFile(path: string, ignoreOutput: boolean): Promise<CompileFileResp | undefined>

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
