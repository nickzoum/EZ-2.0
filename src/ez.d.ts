export namespace Util {
    /**
     * Coalesce for functions (will return an empty function if none are found)
     * @param {Array<Function>} params List of functions to filter
     * @returns {Function} First valid parameter or empty function
     */
    export function empty(...params: Function): Function;

    /**
     * More efficient version of `substring(startingIndex).startsWith(searchingFor)` for large strings
     * @param {string} fullText Large text to look through
     * @param {number} startingIndex index to start looking at
     * @param {string} searchingFor text to find
     * @returns {boolean}
     */
    function startsWith(fullText: string, startingIndex: number, searchingFor: string): boolean;
}

export namespace Enumerables {
    /**
     * Converts an enumerable object to an array
     * @param {ArrayLike<T>} arrayLike enumerable object to be converted
     * @param {number} [start=0] only list items after this index (inclusive) will be included in the end array, defaults to 0
     * @param {number} [end] only list items before this index (exclusive) will be included in the end array, defaults to `length`
     * @template T generic type of `arrayLike` object
     * @returns {Array<T>} array created from enumerable object
     */
    export function toArray<T>(arrayLike: ArrayLike<T>, start?: number, end?: number): Array<T>;
    /**
     * Flattens a two dimensional array to one dimension
     * @param {Array<Array<T> | T>} list two dimensional array to be flattened
     * @template T generic type of the array
     * @returns {Array<T>} one-dimensional array
     */
    function flattenArray<T>(list: ArrayLike<Array<T> | T>): Array<T>;
    /**
     * Iterates from one number to another
     * @param {number} start number to start iterating from
     * @param {number} end last number
     * @param {(index: number, iteration: number) => void} callBack function to call in every iteration
     * @returns {void}
     */
    function forLoop(start: number, end: number, callBack: (index: number, iteration: number) => void): void;

    /**
     * Creates an array with numeric items, starting from `start` and ending at `end`
     * @param {number} start first element of array
     * @param {number} end last element of array
     * @returns {Array<number>}
     */
    function createSequence(start: number, end: number): Array<number>;


    /**
     * Gets the property list of an object or array
     * @param {{}} obj
     * @returns {Array<string | number>}
     */
    function getPropertyList(obj: {}): Array<string | number>;
}

export interface EZExpression {
    type: "Ternary" | "Binary" | "Type" | "Loop";
    left: EZExpression | string;
    right: EZExpression | string;
    leftCase: EZExpression | string;
    rightCase: EZExpression | string;
    operator: string;
    parent: EZExpression | EZAttribute | EZAttribute;
}

export interface EZAttribute {
    type: "Attribute";
    dependencies: Array<string>;
    expression: EZExpression;
    parent: HTMLScope;
}

export interface HTMLContent {
    type: "HTMLContent";
    content: Array<string | EZAttribute | HTMLScope>;
    parent?: HTMLScope;
}

export interface HTMLScope {
    type: "Scope";
    name: string | Array<string>;
    attributes: {
        [index: string]: string;
    };
    ezAttributes: {
        [index: string]: EZAttribute;
    };
    text: HTMLContent;
    singleTag: boolean;
    closedTag: boolean;
    parent: HTMLScope | HTMLContent;
    start: number;
    end: number;
}

export interface ObjectListenerScope {
    references: {
        [pKey: string]: {
            path: string;
            callBack: (target: {}, property: string, type: "get" | "set", value: *, path: string) => void;
        };
    };
    children: {
        [key: string]: ObjectListenerScope;
    };
}

export interface ViewController {
    construct?: (...params?: Array<*>) => Promise<undefined> | undefined;
    onLoad?: () => void;
}

export namespace Parser {
    /**
     * Converts html to an AST
     * @param {string} text source of html
     * @returns {HTMLContent} AST form of html
     */
    function parsePage(text: string): HTMLContent;

    /**
     * Converts an expression (ez-attribute or ${}) to an AST
     * @param {string} pageText html text
     * @param {number} [index=0] index that the expression starts at
     * @returns {Array<EZAttribute>} AST form of the expression
     */
    function parseExpression(pageText: string, index?: number): Array<EZAttribute>;
}

export namespace View {
    /**
     * Registers a tagName to a specific view
     * @param {string} tagName
     * @param {string | HTMLElement | Array<Node> | HTMLCollection | NodeList | NodeListOf<Node>} dom 
     * @param {ViewController} controller
     * @returns {void}
     */
    function registerView(tagName: string, dom: string | HTMLElement | Array<Node> | HTMLCollection | NodeList | NodeListOf<Node>, controller: ViewController): void;
}

export namespace Mutation {
    /**
     * @template {{}} T
     * @param {T} oldObject 
     * @returns {T}
     */
    function deepClone<T extends {}>(oldObject: T): T;

    /**
     * 
     * @param {(changes: Array<MutationRecord>) => void} callBack 
     * @param {HTMLElement} [dom=document.body] 
     * @param {boolean} [checkAttributes=true]
     * @param {boolean} [checkChildren=true]
     * @returns {void}
     */
    function addDomListener(callBack: (changes: Array<MutationRecord>) => void, dom?: HTMLElement = document.body, checkAttributes?: boolean = true, checkChildren?: boolean = true): void;

    /**
     * 
     * @param {Node} node 
     * @param {number} treeID 
     * @returns {void}
     */
    function setTree(node: Node, treeID: number): void;

    /**
    * 
    * @param {Node} node 
    * @param {number} scopeID 
    * @returns {void}
    */
    function setScope(node: Node, scopeID: number): void;
}

export namespace Expressions {
    /**
     * 
     * @param {ViewController} controller 
     * @param {EZExpression} expression 
     * @param {{[index: string]: *}} [scope]
     * @returns {*}
     */
    function evaluateValue(controller: ViewController, expression: EZExpression, scope?: { [index: string]: * }): *;
}

export as namespace JSDoc;