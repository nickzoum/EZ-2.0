export interface IScope {
    type: "Program" | "FunctionDeclaration" | "Identifier" | "VariableDeclaration" | "VariableDeclarator" | "ExpressionStatement" | "ArrowFunctionExpression" | "BlockStatement" | "Literal" | "EmptyStatement";
    start: number;
    end: number;
    parent?: IScope;
    /** Array in `BlockStatement`, `IScope` in `ArrowFunctionExpression` and `FunctionDeclaration`  */
    body?: Array<IScope> | IScope;
    /** `FunctionDeclaration` and `VariableDeclaration` */
    id?: IScope;
    /** `Identifier` */
    name?: string;
    /** `FunctionDeclaration` and `ArrowFunctionExpression` */
    params?: Array<IScope>;
    /** `VariableDeclaration` */
    declarations?: Array<IScope>;
    /** `VariableDeclaration` */
    kind?: string;
    /** `VariableDeclarator` */
    init?: IScope;
    /** `ExpressionStatement` */
    expression?: IScope;
    /** `Literal` */
    value?: number;
    /** `Literal` */
    raw?: string;
}

export interface ILinter {
    fixDefinition(): ILinter;
    fixRequire(): ILinter;
    packageName: string;
    exportMode: boolean;
    scope: IScope;
    text: string;
}

export as namespace NodeInfo;