export namespace Util {

    /**
     * Casts a value as something else
     * @template {*} E type of cast
     * @param {E} prototype cast
     * @param {*} value value to be cast
     * @returns {E} value cast as the first parameter
     */
    function cast<E>(prototype: E, value: any): E;

    /**
     * Coalesce for functions (will return an empty function if none are found)
     * @param {Array<Function>} params List of functions to filter
     * @returns {Function} First valid parameter or empty function
     */
    export function empty(...params: Array<Function>): Function;

    /**
     * More efficient version of `substring(startingIndex).startsWith(searchingFor)` for large strings
     * @param {string} fullText Large text to look through
     * @param {number} startingIndex index to start looking at
     * @param {string} searchingFor text to find
     * @returns {boolean}
     */
    function startsWith(fullText: string, startingIndex: number, searchingFor: string): boolean;

    /**
     * Gets a specified object from a json
     * @param {T} prototype specified object prototype
     * @param {string | T} json json string
     * @template T prototype object or function
     * @returns {T} parsed json as prototype object
     */
    function getModel<T>(prototype: T, json: string | T): T;

    /**
     * Gets the prototype chain of an object
     * @param {Object} obj Object to get the chain from
     * @returns {Array<Object>} Prototype chain
     */
    function getPrototypeChain(obj: Object): Object;

    /**
     * Gets the name of the browser
     * @returns {string}
     */
    function getBrowserName(): string;

    /**
     * 
     * @template {ErrorConstructor} E type of error
     * @param {E} type error constructor
     * @param {string} message error description
     * @param {string} [fileName='anonymous'] name of file that caused the error
     * @param {number} [lineNumber=1] line in of the above file that caused the error
     * @param {number} [columnNumber=1] character of the above line that caused the error
     * @returns {E}
     */
    function createError<E extends ErrorConstructor>(type: E, message: string, fileName?: string, lineNumber?: number, columnNumber?: number): E;
}

export namespace Http {
    interface RequestPromise extends Promise {
        addProgressListener: (callBack: (event: ProgressEvent<EventTarget>) => void) => RequestPromise;
        abort: () => RequestPromise;
    }

    interface SocketPromise extends Promise {
        addListener: (callBack: (data: string) => void) => SocketPromise;
        onClose: (callBack: () => void) => SocketPromise;
        close: () => SocketPromise;
    }

    /**
     * Deletes all of the cookies
     * @returns {void}
     */
    function deleteAllCookies(): void;
    /**
     * Deletes a cookie
     * @param {string} name name of cookie
     * @returns {void}
     */
    function deleteCookieByName(name: string): void;
    /**
     * Gets the value of a cookie
     * @param {string} name name of cookie
     * @returns {string} value of cookie
     */
    function getCookieByName(name: string): string;
    /**
     * Creates/Updates a cookie
     * @param {string} name name of cookie
     * @param {string} value value of cookie
     * @returns {void}
     */
    function setCookie(name: string, value: string): void;
    /**
     * Sends a post request
     * @param {string} url Where the request is going to be sent
     * @param {object} [data] The data that are going to be sent
     * @param {HttpOptions} options optional options for the request / headers
     * @returns {RequestPromise} Promise that is activated when the request is loaded
     */
    function post(url: string, data?: Object, options?: HttpOptions): RequestPromise;
    /**
     * Sends a get request
     * @param {string} url Where the request is going to be sent
     * @param {HttpOptions} options optional options for the request / headers
     * @returns {RequestPromise} Promise that is activated when the request is loaded
     */
    function get(url: string, options?: HttpOptions): RequestPromise;


    /**
     * Sends a put request
     * @param {string} url Where the request is going to be sent
     * @param {object} [data] The data that are going to be sent
     * @param {HttpOptions} options optional options for the request / headers
     * @returns {RequestPromise} Promise that is activated when the request is loaded
     */
    function put(url: string, data?: Object, options?: HttpOptions): RequestPromise;


    /**
     * Creates a new socket
     * @param {string} url socket endpoint
     * @returns {Http.SocketPromise} The created socket
     */
    function socket(url: string): SocketPromise;
}

export class Http {
    private constructor();
    /**
     * Sends a delete request
     * @param {string} url Where the request is going to be sent
     * @param {HttpOptions} options optional options for the request / headers
     * @returns {RequestPromise} Promise that is activated when the request is loaded
     */
    static ["delete"]: (url: string, options?: HttpOptions) => Http.RequestPromise;
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
     * Filters the array and only returns the elements that contain the `searchFor` string
     * @param {ArrayLike<string>} list 
     * @param {string} searchFor 
     * @returns {Array<string>}
     */
    function searchFilter(list: ArrayLike<string>, searchFor: string): Array<string>;
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

    /**
     * 
     * @template T generic type of the array
     * @template {{[index: string]: T} | Array<T>} E type of first argument
     * @param {E} obj 
     * @param {"of"} type 
     * @param {(item: T, index: number, list: E) => void} callBack 
     * @returns {void}
     */
    function iterate<T, E>(obj: E, type: "of", callBack: (item: T, index: number, list: E) => void): void;


    /**
     * 
     * @template {{}} E type of first argument
     * @param {E} obj 
     * @param {"in"} type 
     * @param {(item: string, index: number, list: E) => void} callBack 
     * @returns {void}
     */
    function iterate<E>(obj: E, type: "in", callBack: (item: string, index: number, list: E) => void): void;


    /**
     * 
     * @template T type of array
     * @param {number} size 
     * @param {T} [defaultValue]
     * @returns {Array<T>}
     */
    function createEmptyArray<T>(size: number, defaultValue?: T): Array<T>;
}

export interface HttpOptions {
    /** @ype {boolean} [withCredentials=false] */
    withCredentials?: boolean;
    headers: {
        /** @ype {Array<string> | string} [Accept=["application/json", "text/html"]] */
        "Accept"?: Array<string> | string;
        /** @ype {Array<string> | string} [Content-Type="application/json"] */
        "Content-Type"?: Array<string> | string;
        /** @ype {Array<string> | string} [Cache-Control="no-cache, no-store, must-revalidate"] */
        "Cache-Control"?: Array<string> | string;
    };
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
            callBack: (target: {}, property: string, type: "get" | "set", value: any, path: string) => void;
        };
    };
    children: {
        [key: string]: ObjectListenerScope;
    };
}

export interface ViewController extends Object {
    construct?: (...params: Array<any>) => Promise<undefined> | undefined | void;
    onLoad?: (dom: HTMLElement) => void;
    emit?: (eventName: string, event: any) => void;
}

export namespace HTML {

    /**
     * Sets the attribute of an element (handles special cases)
     * @param {HTMLInputElement} dom element object
     * @param {string} valueType name of attribute
     * @param {*} value value to set to attribute
     * @returns {boolean} true if special case
     */
    function setValue(dom: HTMLElement, valueType: string, value: any): boolean;

    /**
     * Sets the attribute of an element (handles special cases)
     * @param {Attr} attribute attribute object
     * @param {*} value value to set to attribute
     * @returns {boolean} true if special case
     */
    function setValue(attribute: Attr, value: any): boolean;

    /**
     * Gets the attribute of an element (handles special cases)
     * @param {HTMLElement} dom element object
     * @param {string} valueType name of attribute
     * @returns {*} value of element for specified attribute
     */
    function getValue(dom: HTMLElement, valueType: string): any;

    /**
     * Gets the attribute of an element (handles special cases)
     * @param {Attr} attribute attribute object
     * @returns {*} value of element for specified attribute
     */
    function getValue(attribute: Attr): any;

    /**
     * Adds a global event listener
     * @template {keyof HTMLElementEventMap} K event type
     * @param {K} type event type
     * @param {(this: HTMLElement, ev: HTMLElementEventMap[K]) => void} listener event listener
     * @param {HTMLElement} [root=document.body] optional root element 
     * @returns {void}
     */
    function on<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => void, root?: HTMLElement): void;

    /**
     * Adds a global event listener
     * @template {keyof HTMLElementEventMap} K event type
     * @param {K} type event type
     * @param {string} query css query
     * @param {(this: HTMLElement, ev: HTMLElementEventMap[K]) => void} listener event listener
     * @param {HTMLElement} [root=document.body] optional root element 
     * @returns {void}
     */
    function on<K extends keyof HTMLElementEventMap>(type: K, query: string, listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => void, root?: HTMLElement): void;
}

export namespace Parser {
    /**
     * Converts html to an AST
     * @param {string} text source of html
     * @param {string} [fileName='anonymous'] name of file
     * @returns {HTMLContent} AST form of html
     */
    function parsePage(text: string, fileName?: string): HTMLContent;

    /**
     * Converts an expression (ez-attribute or ${}) to an AST
     * @param {string} pageText html text
     * @param {number} [index=0] character index that the expression starts at
     * @param {number} [lineNumber=1] line index that the expression starts at
     * @param {number} [columnNumber=1] column index that the expression starts at
     * @param {string} [fileName='anonymous'] name of file the expression originated from
     * @returns {Array<EZAttribute>} AST form of the expression
     */
    function parseExpression(pageText: string, index?: number, lineNumber?: number, columnNumber?: number, fileName?: string): Array<EZAttribute>;
}

export namespace View {
    /**
     * Registers a tagName to a specific view
     * @param {string} tagName
     * @param {string | HTMLElement | Array<Node> | HTMLCollection | NodeList | NodeListOf<Node>} dom 
     * @param {ViewController} controller
     * @returns {void}
     */
    function registerView<T extends ViewController>(tagName: string, dom: string | HTMLElement | Array<Node> | HTMLCollection | NodeList | NodeListOf<Node>, controller: T): void;

    /**
     * Registers a tagName to a specific view (defined by a url)
     * @param {string} tagName
     * @param {string} url 
     * @param {ViewController} controller
     * @returns {void}
     */
    function registerURL<T extends ViewController>(tagName: string, url: string, controller: T): void;
}

export namespace Mutation {
    /**
     * @template {{}} T
     * @param {T} oldObject 
     * @returns {T}
     */
    function deepClone<T extends {}>(oldObject: T): T;

    /**
     * Sets the value of an object and makes it immutable
     * @template {{}} T
     * @param {T} obj object to add property to
     * @param {string} key name of property
     * @param {*} value value of property to be added
     * @returns {T} initial object
     */
    function setValue<T extends {}>(obj: T, key: string, value: any): T;

    /**
     * 
     * @param {{}} obj 
     * @param {(target: {}, property: string, type: "get" | "set", value: *, path: string) => void} callBack
     * @returns {void}
     */
    function addListener(obj: {}, callBack: (target: {}, property: string, type: "get" | "set", value: any, path: string) => void): void;

    /**
     * 
     * @param {(changes: Array<MutationRecord>) => void} callBack 
     * @param {HTMLElement} [dom=document.body] 
     * @param {boolean} [checkAttributes=true]
     * @param {boolean} [checkChildren=true]
     * @returns {void}
     */
    function addDomListener(callBack: (changes: Array<MutationRecord>) => void, dom?: HTMLElement, checkAttributes?: boolean, checkChildren?: boolean): void;

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

    /**
    * 
    * @param {Node} node 
    * @param {number} placeholderID 
    * @returns {void}
    */
    function setPlaceholder(node: Node, placeholderID: number): void;
}

export namespace Expressions {
    /**
     * 
     * @param {ViewController} controller 
     * @param {EZExpression} expression 
     * @param {{[index: string]: any}} [scope]
     * @returns {*}
     */
    function evaluateValue(controller: ViewController, expression: EZExpression, scope?: { [index: string]: any }): any;

    /**
     * 
     * @param {ViewController} controller 
     * @param {EZExpression} expression 
     * @param {{[index: string]: any}} [scope]
     * @returns { parent: {}, key: string }
     */
    function getParent(controller: ViewController, expression: EZExpression, scope?: { [index: string]: any }): { parent: {}, key: string };
}

export namespace Formatting {


    /**
     * Changes the text of the months
     * @param {Array<string>} names new names
     * @returns {void} 
     */
    function setMonthNames(...names: Array<string>): void;

    /**
     * Changes the text of the week days
     * @param {Array<string>} names new names
     * @returns {void} 
     */
    function setWeekDayNames(...names: Array<string>): void;

    /**
     * Changes the thousand separator
     * @param {"." | ","} newSeparator
     * @returns {void} 
     */
    function setThousandSeparator(newSeparator: "." | ","): void;

    /**
     * Changes the thousand separator
     * @param {string} newSign
     * @returns {void} 
     */
    function setPercentageSign(newSign: string): void;

    /**
     * Changes the currency sign
     * @param {string} newSign
     * @returns {void} 
     */
    function setCurrencySign(newSign: string): void;

    /**
     * Changes the decimal point of numbers
     * @param {"." | ","} newPoint
     * @returns {void} 
     */
    function setDecimalPoint(newPoint: "." | ","): void;

    /**
     * Custom toString method for numbers
     * @param {number} number number to be transformed
     * @param {string} format form of requested number
     * @returns {string} string form of requested number 
     */
    function numberToString(number: number, format: string): string;

    /**
     * Custom toString method for dates
     * @param {Date} date date object
     * @param {string} format string format
     * @returns {string} string form of requested date
     */
    function dateToString(date: Date, format: string): string;

    /**
     * Formats a value to string
     * @param {*} item value
     * @param {string} format format of value
     * @returns {string} formatted value
     */
    function format(item: any, format: string): string;

}

export as namespace JSDoc;