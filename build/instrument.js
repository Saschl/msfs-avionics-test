/**
 * Types of subscribable array change event.
 */
var SubscribableArrayEventType;
(function (SubscribableArrayEventType) {
    /** An element was added. */
    SubscribableArrayEventType["Added"] = "Added";
    /** An element was removed. */
    SubscribableArrayEventType["Removed"] = "Removed";
    /** The array was cleared. */
    SubscribableArrayEventType["Cleared"] = "Cleared";
})(SubscribableArrayEventType || (SubscribableArrayEventType = {}));
/**
 * An abstract implementation of a subscribable which allows adding, removing, and notifying subscribers.
 */
class AbstractSubscribable {
    constructor() {
        this.subs = [];
    }
    /** @inheritdoc */
    sub(fn, initialNotify) {
        this.subs.push(fn);
        if (initialNotify) {
            fn(this.get());
        }
    }
    /** @inheritdoc */
    unsub(fn) {
        const index = this.subs.indexOf(fn);
        if (index >= 0) {
            this.subs.splice(index, 1);
        }
    }
    /**
     * Notifies subscribers that this subscribable's value has changed.
     */
    notify() {
        const subLen = this.subs.length;
        for (let i = 0; i < subLen; i++) {
            try {
                this.subs[i](this.get());
            }
            catch (error) {
                console.error(`AbstractSubscribable: error in handler: ${error}`);
                if (error instanceof Error) {
                    console.error(error.stack);
                }
            }
        }
    }
}
/**
 * Checks if two values are equal using the strict equality operator.
 * @param a The first value.
 * @param b The second value.
 * @returns whether a and b are equal.
 */
AbstractSubscribable.DEFAULT_EQUALITY_FUNC = (a, b) => a === b;

/**
 * A subscribable subject whose value can be freely manipulated.
 */
class Subject extends AbstractSubscribable {
    /**
     * Constructs an observable Subject.
     * @param value The initial value.
     * @param equalityFunc The function to use to check for equality.
     * @param mutateFunc The function to use to mutate the subject's value.
     */
    constructor(value, equalityFunc, mutateFunc) {
        super();
        this.value = value;
        this.equalityFunc = equalityFunc;
        this.mutateFunc = mutateFunc;
    }
    /**
     * Creates and returns a new Subject.
     * @param v The initial value of the subject.
     * @param equalityFunc The function to use to check for equality between subject values. Defaults to the strict
     * equality comparison (`===`).
     * @param mutateFunc The function to use to change the subject's value. If not defined, new values will replace
     * old values by variable assignment.
     * @returns A Subject instance.
     */
    static create(v, equalityFunc, mutateFunc) {
        return new Subject(v, equalityFunc !== null && equalityFunc !== void 0 ? equalityFunc : Subject.DEFAULT_EQUALITY_FUNC, mutateFunc);
    }
    /**
     * Sets the value of this subject and notifies subscribers if the value changed.
     * @param value The new value.
     */
    set(value) {
        if (!this.equalityFunc(value, this.value)) {
            if (this.mutateFunc) {
                this.mutateFunc(this.value, value);
            }
            else {
                this.value = value;
            }
            this.notify();
        }
    }
    /**
     * Applies a partial set of properties to this subject's value and notifies subscribers if the value changed as a
     * result.
     * @param value The properties to apply.
     */
    apply(value) {
        let changed = false;
        for (const prop in value) {
            changed = value[prop] !== this.value[prop];
            if (changed) {
                break;
            }
        }
        Object.assign(this.value, value);
        changed && this.notify();
    }
    /** @inheritdoc */
    notify() {
        super.notify();
    }
    /**
     * Gets the value of this subject.
     * @returns The value of this subject.
     */
    get() {
        return this.value;
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    map(fn, equalityFunc, mutateFunc, initialVal) {
        const mapFunc = (inputs, previousVal) => fn(inputs[0], previousVal);
        return mutateFunc
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            ? MappedSubject.create(mapFunc, equalityFunc, mutateFunc, initialVal, this)
            : MappedSubject.create(mapFunc, equalityFunc !== null && equalityFunc !== void 0 ? equalityFunc : AbstractSubscribable.DEFAULT_EQUALITY_FUNC, this);
    }
}
/**
 * A subscribable subject that is a mapped stream from one or more input subscribables.
 */
class MappedSubject extends AbstractSubscribable {
    /**
     * Creates a new MappedSubject.
     * @param mapFunc The function which maps this subject's inputs to a value.
     * @param equalityFunc The function which this subject uses to check for equality between values.
     * @param mutateFunc The function which this subject uses to change its value.
     * @param initialVal The initial value of this subject.
     * @param inputs The subscribables which provide the inputs to this subject.
     */
    constructor(mapFunc, equalityFunc, mutateFunc, initialVal, ...inputs) {
        super();
        this.mapFunc = mapFunc;
        this.equalityFunc = equalityFunc;
        this.inputs = inputs;
        this.inputValues = inputs.map(input => input.get());
        if (initialVal && mutateFunc) {
            this.value = initialVal;
            mutateFunc(this.value, this.mapFunc(this.inputValues));
            this.mutateFunc = (newVal) => { mutateFunc(this.value, newVal); };
        }
        else {
            this.value = this.mapFunc(this.inputValues);
            this.mutateFunc = (newVal) => { this.value = newVal; };
        }
        this.inputHandlers = this.inputs.map((input, index) => this.updateValue.bind(this, index));
        for (let i = 0; i < inputs.length; i++) {
            inputs[i].sub(this.inputHandlers[i]);
        }
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    static create(mapFunc, ...args) {
        let equalityFunc, mutateFunc, initialVal;
        if (typeof args[0] === 'function') {
            equalityFunc = args.shift();
        }
        else {
            equalityFunc = MappedSubject.DEFAULT_EQUALITY_FUNC;
        }
        if (typeof args[0] === 'function') {
            mutateFunc = args.shift();
            initialVal = args.shift();
        }
        return new MappedSubject(mapFunc, equalityFunc, mutateFunc, initialVal, ...args);
    }
    /**
     * Updates an input value, then re-maps this subject's value, and notifies subscribers if this results in a change to
     * the mapped value according to this subject's equality function.
     * @param index The index of the input value to update.
     */
    updateValue(index) {
        this.inputValues[index] = this.inputs[index].get();
        const value = this.mapFunc(this.inputValues, this.value);
        if (!this.equalityFunc(this.value, value)) {
            this.mutateFunc(value);
            this.notify();
        }
    }
    /**
     * Gets the current value of the subject.
     * @returns The current value.
     */
    get() {
        return this.value;
    }
    /**
     * Destroys the subscription to the parent subscribable.
     */
    destroy() {
        for (let i = 0; i < this.inputs.length; i++) {
            this.inputs[i].unsub(this.inputHandlers[i]);
        }
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    map(fn, equalityFunc, mutateFunc, initialVal) {
        const mapFunc = (inputs, previousVal) => fn(inputs[0], previousVal);
        return new MappedSubject(mapFunc, equalityFunc !== null && equalityFunc !== void 0 ? equalityFunc : MappedSubject.DEFAULT_EQUALITY_FUNC, mutateFunc, initialVal, this);
    }
}

/**
 * A class for subjects that return a computed value.
 * @class ComputedSubject
 * @template I The type of the input value.
 * @template T The type of the computed output value.
 */
class ComputedSubject {
    /**
     * Creates an instance of ComputedSubject.
     * @param value The initial value.
     * @param computeFn The computation function.
     */
    constructor(value, computeFn) {
        this.computeFn = computeFn;
        this._subs = [];
        this._value = value;
        this._computedValue = computeFn(value);
    }
    /**
     * Creates and returns a new ComputedSubject.
     * @param v The initial value of the Subject.
     * @param fn A function which transforms raw values to computed values.
     * @returns A ComputedSubject instance.
     */
    static create(v, fn) {
        return new ComputedSubject(v, fn);
    }
    /**
     * Sets the new value and notifies the subscribers when value changed.
     * @param value The new value.
     */
    set(value) {
        this._value = value;
        const compValue = this.computeFn(value);
        if (compValue !== this._computedValue) {
            this._computedValue = compValue;
            const subLen = this._subs.length;
            for (let i = 0; i < subLen; i++) {
                this._subs[i](this._computedValue, this._value);
            }
        }
    }
    /**
     * Gets the computed value of the Subject.
     * @returns The computed value.
     */
    get() {
        return this._computedValue;
    }
    /**
     * Gets the raw value of the Subject.
     * @returns The raw value.
     */
    getRaw() {
        return this._value;
    }
    /**
     * Subscribes to the subject with a callback function. The function will be called whenever the computed value of
     * this Subject changes.
     * @param fn A callback function.
     * @param initialNotify Whether to immediately notify the callback function with the current compured and raw values
     * of this Subject after it is subscribed. False by default.
     */
    sub(fn, initialNotify) {
        this._subs.push(fn);
        if (initialNotify) {
            fn(this._computedValue, this._value);
        }
    }
    /**
     * Unsubscribes a callback function from this Subject.
     * @param fn The callback function to unsubscribe.
     */
    unsub(fn) {
        const index = this._subs.indexOf(fn);
        if (index >= 0) {
            this._subs.splice(index, 1);
        }
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    map(fn, equalityFunc, mutateFunc, initialVal) {
        const mapFunc = (inputs, previousVal) => fn(inputs[0], previousVal);
        return mutateFunc
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            ? MappedSubject.create(mapFunc, equalityFunc, mutateFunc, initialVal, this)
            : MappedSubject.create(mapFunc, equalityFunc !== null && equalityFunc !== void 0 ? equalityFunc : AbstractSubscribable.DEFAULT_EQUALITY_FUNC, this);
    }
}

/* eslint-disable no-inner-declarations */
/** A releative render position. */
var RenderPosition;
(function (RenderPosition) {
    RenderPosition[RenderPosition["Before"] = 0] = "Before";
    RenderPosition[RenderPosition["After"] = 1] = "After";
    RenderPosition[RenderPosition["In"] = 2] = "In";
})(RenderPosition || (RenderPosition = {}));
/**
 * A display component in the component framework.
 * @typedef P The type of properties for this component.
 * @typedef C The type of context that this component might have.
 */
class DisplayComponent {
    /**
     * Creates an instance of a DisplayComponent.
     * @param props The propertis of the component.
     */
    constructor(props) {
        /** The context on this component, if any. */
        this.context = undefined;
        /** The type of context for this component, if any. */
        this.contextType = undefined;
        this.props = props;
    }
    /**
     * A callback that is called before the component is rendered.
     */
    onBeforeRender() { return; }
    /**
     * A callback that is called after the component is rendered.
     * @param node The component's VNode.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onAfterRender(node) { return; }
    /**
     * Destroys this component.
     */
    destroy() { return; }
    /**
     * Gets a context data subscription from the context collection.
     * @param context The context to get the subscription for.
     * @returns The requested context.
     * @throws An error if no data for the specified context type could be found.
     */
    getContext(context) {
        if (this.context !== undefined && this.contextType !== undefined) {
            const index = this.contextType.indexOf(context);
            return this.context[index];
        }
        throw new Error('Could not find the provided context type.');
    }
}
/**
 * A reference to a component or element node.
 */
class NodeReference {
    constructor() {
        /** The internal reference instance. */
        this._instance = null;
    }
    /**
     * The instance of the element or component.
     * @returns The instance of the element or component.
     */
    get instance() {
        if (this._instance !== null) {
            return this._instance;
        }
        throw new Error('Instance was null.');
    }
    /**
     * Sets the value of the instance.
     */
    set instance(val) {
        this._instance = val;
    }
    /**
     * Gets the instance, or null if the instance is not populated.
     * @returns The component or element instance.
     */
    getOrDefault() {
        return this._instance;
    }
}
/**
 * Provides a context of data that can be passed down to child components via a provider.
 */
class Context {
    /**
     * Creates an instance of a Context.
     * @param defaultValue The default value of this context.
     */
    constructor(defaultValue) {
        this.defaultValue = defaultValue;
        /**
         * The provider component that can be set to a specific context value.
         * @param props The props of the provider component.
         * @returns A new context provider.
         */
        this.Provider = (props) => new ContextProvider(props, this);
    }
}
/**
 * A provider component that can be set to a specific context value.
 */
class ContextProvider extends DisplayComponent {
    /**
     * Creates an instance of a ContextProvider.
     * @param props The props on the component.
     * @param parent The parent context instance for this provider.
     */
    constructor(props, parent) {
        super(props);
        this.parent = parent;
    }
    /** @inheritdoc */
    render() {
        var _a;
        const children = (_a = this.props.children) !== null && _a !== void 0 ? _a : [];
        return FSComponent.buildComponent(FSComponent.Fragment, this.props, ...children);
    }
}
/**
 * The FS component namespace.
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
var FSComponent;
(function (FSComponent) {
    /**
     * Valid SVG element tags.
     */
    const svgTags = {
        'circle': true,
        'clipPath': true,
        'color-profile': true,
        'cursor': true,
        'defs': true,
        'desc': true,
        'ellipse': true,
        'g': true,
        'image': true,
        'line': true,
        'linearGradient': true,
        'marker': true,
        'mask': true,
        'path': true,
        'pattern': true,
        'polygon': true,
        'polyline': true,
        'radialGradient': true,
        'rect': true,
        'stop': true,
        'svg': true,
        'text': true
    };
    /**
     * A fragment of existing elements with no specific root.
     * @param props The fragment properties.
     * @returns The fragment children.
     */
    function Fragment(props) {
        return props.children;
    }
    FSComponent.Fragment = Fragment;
    /**
     * Builds a JSX based FSComponent.
     * @param type The DOM element tag that will be built.
     * @param props The properties to apply to the DOM element.
     * @param children Any children of this DOM element.
     * @returns The JSX VNode for the component or element.
     */
    // eslint-disable-next-line no-inner-declarations
    function buildComponent(type, props, ...children) {
        let vnode = null;
        if (typeof type === 'string') {
            let element;
            if (svgTags[type] !== undefined) {
                element = document.createElementNS('http://www.w3.org/2000/svg', type);
            }
            else {
                element = document.createElement(type);
            }
            if (props !== null) {
                for (const key in props) {
                    if (key === 'ref' && props.ref !== undefined) {
                        props.ref.instance = element;
                    }
                    else {
                        const prop = props[key];
                        if (prop instanceof Subject || prop instanceof MappedSubject || prop instanceof ComputedSubject) {
                            element.setAttribute(key, prop.get());
                            prop.sub((v) => {
                                element.setAttribute(key, v);
                            });
                        }
                        else {
                            element.setAttribute(key, prop);
                        }
                    }
                }
            }
            vnode = {
                instance: element,
                props: props,
                children: null
            };
            vnode.children = createChildNodes(vnode, children);
        }
        else if (typeof type === 'function') {
            if (children !== null && props === null) {
                props = {
                    children: children
                };
            }
            else if (props !== null) {
                props.children = children;
            }
            if (typeof type === 'function' && type.name === 'Fragment') {
                let childNodes = type(props);
                //Handle the case where the single fragment children is an array of nodes passsed down from above
                if (childNodes !== null && childNodes.length > 0 && Array.isArray(childNodes[0])) {
                    childNodes = childNodes[0];
                }
                vnode = {
                    instance: null,
                    props,
                    children: childNodes
                };
            }
            else {
                let instance;
                try {
                    instance = type(props);
                }
                catch (_a) {
                    instance = new type(props);
                }
                if (props !== null && props.ref !== null && props.ref !== undefined) {
                    props.ref.instance = instance;
                }
                if (instance.contextType !== undefined) {
                    instance.context = instance.contextType.map(c => Subject.create(c.defaultValue));
                }
                vnode = {
                    instance,
                    props,
                    children: [instance.render()]
                };
            }
        }
        return vnode;
    }
    FSComponent.buildComponent = buildComponent;
    /**
     * Creates the collection of child VNodes.
     * @param parent The parent VNode.
     * @param children The JSX children to convert to nodes.
     * @returns A collection of child VNodes.
     */
    function createChildNodes(parent, children) {
        let vnodes = null;
        if (children !== null && children !== undefined && children.length > 0) {
            vnodes = [];
            for (const child of children) {
                if (child !== null) {
                    if (child instanceof Subject || child instanceof MappedSubject || child instanceof ComputedSubject) {
                        const subjectValue = child.get().toString();
                        const node = {
                            instance: subjectValue === '' ? ' ' : subjectValue,
                            children: null,
                            props: null,
                            root: undefined,
                        };
                        child.sub((v) => {
                            if (node.root !== undefined) {
                                // TODO workaround. gotta find a solution for the text node vanishing when text is empty
                                node.root.nodeValue = v === '' ? ' ' : v.toString();
                            }
                        });
                        vnodes.push(node);
                    }
                    else if (child instanceof Array) {
                        const arrayNodes = createChildNodes(parent, child);
                        if (arrayNodes !== null) {
                            vnodes.push(...arrayNodes);
                        }
                    }
                    else if (typeof child === 'string' || typeof child === 'number') {
                        vnodes.push(createStaticContentNode(child));
                    }
                    else if (typeof child === 'object') {
                        vnodes.push(child);
                    }
                }
            }
        }
        return vnodes;
    }
    FSComponent.createChildNodes = createChildNodes;
    /**
     * Creates a static content VNode.
     * @param content The content to create a node for.
     * @returns A static content VNode.
     */
    function createStaticContentNode(content) {
        return {
            instance: content,
            children: null,
            props: null
        };
    }
    FSComponent.createStaticContentNode = createStaticContentNode;
    /**
     * Renders a VNode to a DOM element.
     * @param node The node to render.
     * @param element The DOM element to render to.
     * @param position The RenderPosition to put the item in.
     */
    function render(node, element, position = RenderPosition.In) {
        if (node.children && node.children.length > 0 && element !== null) {
            const componentInstance = node.instance;
            if (componentInstance !== null && componentInstance.onBeforeRender !== undefined) {
                componentInstance.onBeforeRender();
            }
            if (node.instance instanceof HTMLElement || node.instance instanceof SVGElement) {
                insertNode(node, position, element);
            }
            else {
                for (const child of node.children) {
                    insertNode(child, position, element);
                }
            }
            const instance = node.instance;
            if (instance instanceof ContextProvider) {
                visitNodes(node, (n) => {
                    const nodeInstance = n.instance;
                    if (nodeInstance !== null && nodeInstance.contextType !== undefined) {
                        const contextSlot = nodeInstance.contextType.indexOf(instance.parent);
                        if (contextSlot >= 0) {
                            if (nodeInstance.context === undefined) {
                                nodeInstance.context = [];
                            }
                            nodeInstance.context[contextSlot].set(instance.props.value);
                        }
                        if (nodeInstance instanceof ContextProvider && nodeInstance !== instance && nodeInstance.parent === instance.parent) {
                            return true;
                        }
                    }
                    return false;
                });
            }
            if (componentInstance !== null && componentInstance.onAfterRender !== undefined) {
                componentInstance.onAfterRender(node);
            }
        }
    }
    FSComponent.render = render;
    /**
     * Inserts a node into the DOM.
     * @param node The node to insert.
     * @param position The position to insert the node in.
     * @param element The element to insert relative to.
     */
    function insertNode(node, position, element) {
        var _a, _b, _c, _d, _e, _f;
        if (node.instance instanceof HTMLElement || node.instance instanceof SVGElement) {
            switch (position) {
                case RenderPosition.In:
                    element.appendChild(node.instance);
                    node.root = (_a = element.lastChild) !== null && _a !== void 0 ? _a : undefined;
                    break;
                case RenderPosition.Before:
                    element.insertAdjacentElement('beforebegin', node.instance);
                    node.root = (_b = element.previousSibling) !== null && _b !== void 0 ? _b : undefined;
                    break;
                case RenderPosition.After:
                    element.insertAdjacentElement('afterend', node.instance);
                    node.root = (_c = element.nextSibling) !== null && _c !== void 0 ? _c : undefined;
                    break;
            }
            if (node.children !== null) {
                for (const child of node.children) {
                    insertNode(child, RenderPosition.In, node.instance);
                }
            }
        }
        else if (typeof node.instance === 'string') {
            switch (position) {
                case RenderPosition.In:
                    element.insertAdjacentHTML('beforeend', node.instance);
                    node.root = (_d = element.lastChild) !== null && _d !== void 0 ? _d : undefined;
                    break;
                case RenderPosition.Before:
                    element.insertAdjacentHTML('beforebegin', node.instance);
                    node.root = (_e = element.previousSibling) !== null && _e !== void 0 ? _e : undefined;
                    break;
                case RenderPosition.After:
                    element.insertAdjacentHTML('afterend', node.instance);
                    node.root = (_f = element.nextSibling) !== null && _f !== void 0 ? _f : undefined;
                    break;
            }
        }
        else if (Array.isArray(node)) {
            for (let i = 0; i < node.length; i++) {
                render(node[i], element);
            }
        }
        else {
            render(node, element);
        }
    }
    /**
     * Render a node before a DOM element.
     * @param node The node to render.
     * @param element The element to render boeore.
     */
    function renderBefore(node, element) {
        render(node, element, RenderPosition.Before);
    }
    FSComponent.renderBefore = renderBefore;
    /**
     * Render a node after a DOM element.
     * @param node The node to render.
     * @param element The element to render after.
     */
    function renderAfter(node, element) {
        render(node, element, RenderPosition.After);
    }
    FSComponent.renderAfter = renderAfter;
    /**
     * Remove a previously rendered element.  Currently, this is just a simple
     * wrapper so that all of our high-level "component maniuplation" state is kept
     * in the FSComponent API, but it's not doing anything other than a simple
     * remove() on the element.   This can probably be enhanced.
     * @param element The element to remove.
     */
    function remove(element) {
        if (element !== null) {
            element.remove();
        }
    }
    FSComponent.remove = remove;
    /**
     * Creates a component or element node reference.
     * @returns A new component or element node reference.
     */
    function createRef() {
        return new NodeReference();
    }
    FSComponent.createRef = createRef;
    /**
     * Creates a new context to hold data for passing to child components.
     * @param defaultValue The default value of this context.
     * @returns A new context.
     */
    function createContext(defaultValue) {
        return new Context(defaultValue);
    }
    FSComponent.createContext = createContext;
    /**
     * Visits VNodes with a supplied visitor function within the given children tree.
     * @param node The node to visit.
     * @param visitor The visitor function to inspect VNodes with. Return true if the search should stop at the visited
     * node and not proceed any further down the node's children.
     * @returns True if the visitation should break, or false otherwise.
     */
    function visitNodes(node, visitor) {
        const stopVisitation = visitor(node);
        if (!stopVisitation && node.children !== null) {
            for (let i = 0; i < node.children.length; i++) {
                visitNodes(node.children[i], visitor);
            }
        }
        return true;
    }
    FSComponent.visitNodes = visitNodes;
    /**
     * An empty callback handler.
     */
    FSComponent.EmptyHandler = () => { return; };
})(FSComponent || (FSComponent = {}));
FSComponent.Fragment;

/**
 * A number with an associated unit. Each NumberUnit is created with a reference unit type,
 * which cannot be changed after instantiation. The reference unit type determines how the
 * value of the NumberUnit is internally represented. Each NumberUnit also maintains an
 * active unit type, which can be dynamically changed at any time.
 */
class NumberUnit {
    /**
     * Constructor.
     * @param number - the initial numeric value of the new NumberUnit.
     * @param unit - the unit type of the new NumberUnit.
     */
    constructor(number, unit) {
        this._number = number;
        this._unit = unit;
        this.readonly = new NumberUnitReadOnly(this);
    }
    /**
     * Gets this NumberUnit's numeric value.
     * @returns This NumberUnit's numeric value.
     */
    get number() {
        return this._number;
    }
    /**
     * Gets this NumberUnit's unit type.
     * @returns This NumberUnit's unit type.
     */
    get unit() {
        return this._unit;
    }
    /**
     * Converts a value to a numeric value with this NumberUnit's unit type.
     * @param value - the value.
     * @param unit - the unit type of the new value. Defaults to this NumberUnit's unit type. This argument is ignored if
     * value is a NumberUnit.
     * @returns the numeric of the value with this NumberUnit's unit type.
     */
    toNumberOfThisUnit(value, unit) {
        if ((typeof value !== 'number') && this.unit.canConvert(value.unit)) {
            return this.unit.convertFrom(value.number, value.unit);
        }
        if (typeof value === 'number' && (!unit || this.unit.canConvert(unit))) {
            return unit ? this.unit.convertFrom(value, unit) : value;
        }
        return undefined;
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    set(arg1, arg2) {
        const converted = this.toNumberOfThisUnit(arg1, arg2);
        if (converted !== undefined) {
            this._number = converted;
            return this;
        }
        throw new Error('Invalid unit conversion attempted.');
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    add(arg1, arg2, arg3) {
        const isArg2NumberUnit = arg2 instanceof NumberUnit;
        const converted = this.toNumberOfThisUnit(arg1, isArg2NumberUnit ? undefined : arg2);
        if (converted !== undefined) {
            let out = isArg2NumberUnit ? arg2 : arg3;
            if (out) {
                out.set(this.number + converted, this.unit);
            }
            else {
                out = this;
                this._number += converted;
            }
            return out;
        }
        throw new Error('Invalid unit conversion attempted.');
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    subtract(arg1, arg2, arg3) {
        const isArg2NumberUnit = arg2 instanceof NumberUnit;
        const converted = this.toNumberOfThisUnit(arg1, isArg2NumberUnit ? undefined : arg2);
        if (converted !== undefined) {
            let out = isArg2NumberUnit ? arg2 : arg3;
            if (out) {
                out.set(this.number - converted, this.unit);
            }
            else {
                out = this;
                this._number -= converted;
            }
            return out;
        }
        throw new Error('Invalid unit conversion attempted.');
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    scale(factor, out) {
        if (out) {
            return out.set(this.number * factor, this.unit);
        }
        else {
            this._number *= factor;
            return this;
        }
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    ratio(value, unit) {
        const converted = this.toNumberOfThisUnit(value, unit);
        if (converted) {
            return this.number / converted;
        }
        throw new Error('Invalid unit conversion attempted.');
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    abs(out) {
        if (out) {
            return out.set(Math.abs(this.number), this.unit);
        }
        else {
            this._number = Math.abs(this._number);
            return this;
        }
    }
    /**
     * Returns the numeric value of this NumberUnit after conversion to a specified unit.
     * @param unit The unit to which to convert.
     * @returns The converted numeric value.
     * @throws Error if this NumberUnit's unit type cannot be converted to the specified unit.
     */
    asUnit(unit) {
        return this.unit.convertTo(this.number, unit);
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    compare(value, unit) {
        const converted = this.toNumberOfThisUnit(value, unit);
        if (converted === undefined) {
            throw new Error('Invalid unit conversion attempted.');
        }
        const diff = this.number - converted;
        if (Math.abs(diff) < 1e-14) {
            return 0;
        }
        return Math.sign(diff);
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    equals(value, unit) {
        const converted = this.toNumberOfThisUnit(value, unit);
        if (converted === undefined) {
            return false;
        }
        const diff = this.number - converted;
        return Math.abs(diff) < 1e-14;
    }
    /**
     * Checks whether this NumberUnit has a numeric value of NaN.
     * @returns Whether this NumberUnit has a numeric value of NaN.
     */
    isNaN() {
        return isNaN(this.number);
    }
    /**
     * Copies this NumberUnit.
     * @returns A copy of this NumberUnit.
     */
    copy() {
        return new NumberUnit(this.number, this.unit);
    }
}
/**
 * A read-only interface for a WT_NumberUnit.
 */
class NumberUnitReadOnly {
    /**
     * Constructor.
     * @param source - the source of the new read-only NumberUnit.
     */
    constructor(source) {
        this.source = source;
    }
    /**
     * Gets this NumberUnit's numeric value.
     * @returns This NumberUnit's numeric value.
     */
    get number() {
        return this.source.number;
    }
    /**
     * Gets this NumberUnit's unit type.
     * @returns This NumberUnit's unit type.
     */
    get unit() {
        return this.source.unit;
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    add(arg1, arg2, arg3) {
        const isArg2NumberUnit = arg2 instanceof NumberUnit;
        const out = (isArg2NumberUnit ? arg2 : arg3);
        if (typeof arg1 === 'number') {
            return this.source.add(arg1, arg2, out);
        }
        else {
            return this.source.add(arg1, out);
        }
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    subtract(arg1, arg2, arg3) {
        const isArg2NumberUnit = arg2 instanceof NumberUnit;
        const out = (isArg2NumberUnit ? arg2 : arg3);
        if (typeof arg1 === 'number') {
            return this.source.subtract(arg1, arg2, out);
        }
        else {
            return this.source.subtract(arg1, out);
        }
    }
    /**
     * Scales this NumberUnit by a unit-less factor and returns the result.
     * @param factor The factor by which to scale.
     * @param out The NumberUnit to which to write the result.
     * @returns The scaled value.
     */
    scale(factor, out) {
        return this.source.scale(factor, out);
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    ratio(arg1, arg2) {
        if (typeof arg1 === 'number') {
            return this.source.ratio(arg1, arg2);
        }
        else {
            return this.source.ratio(arg1);
        }
    }
    /**
     * Calculates the absolute value of this NumberUnit and returns the result.
     * @param out The NumberUnit to which to write the result.
     * @returns The absolute value.
     */
    abs(out) {
        return this.source.abs(out);
    }
    /**
     * Returns the numeric value of this NumberUnit after conversion to a specified unit.
     * @param unit The unit to which to convert.
     * @returns The converted numeric value.
     * @throws Error if this NumberUnit's unit type cannot be converted to the specified unit.
     */
    asUnit(unit) {
        return this.source.asUnit(unit);
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    compare(arg1, arg2) {
        if (typeof arg1 === 'number') {
            return this.source.compare(arg1, arg2);
        }
        else {
            return this.source.compare(arg1);
        }
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    equals(arg1, arg2) {
        if (typeof arg1 === 'number') {
            return this.source.equals(arg1, arg2);
        }
        else {
            return this.source.equals(arg1);
        }
    }
    /**
     * Checks whether this NumberUnit has a numeric value of NaN.
     * @returns Whether this NumberUnit has a numeric value of NaN.
     */
    isNaN() {
        return this.source.isNaN();
    }
    /**
     * Copies this NumberUnit.
     * @returns A copy of this NumberUnit.
     */
    copy() {
        return this.source.copy();
    }
}
/**
 * A unit of measurement.
 */
class AbstractUnit {
    /**
     * Constructor.
     * @param name The name of this unit.
     */
    constructor(name) {
        this.name = name;
    }
    /** @inheritdoc */
    canConvert(otherUnit) {
        return this.family === otherUnit.family;
    }
    /** @inheritdoc */
    createNumber(value) {
        return new NumberUnit(value, this);
    }
    /** @inheritdoc */
    equals(other) {
        return this.family === other.family && this.name === other.name;
    }
}
/**
 * A unit that can be converted to another unit of the same type via a fixed linear transformation.
 */
class SimpleUnit extends AbstractUnit {
    /**
     * Constructor.
     * @param family The family to which this unit belongs.
     * @param name The name of this unit.
     * @param scaleFactor The relative linear scale of the new unit compared to the standard unit of the same family.
     * @param zeroOffset The zero offset of the new unit compared to the standard unit of the same family.
     */
    constructor(family, name, scaleFactor, zeroOffset = 0) {
        super(name);
        this.family = family;
        this.scaleFactor = scaleFactor;
        this.zeroOffset = zeroOffset;
    }
    /** @inheritdoc */
    canConvert(otherUnit) {
        return otherUnit instanceof SimpleUnit && super.canConvert(otherUnit);
    }
    /** @inheritdoc */
    convertTo(value, toUnit) {
        if (!this.canConvert(toUnit)) {
            throw new Error(`Invalid conversion from ${this.name} to ${toUnit.name}.`);
        }
        return (value + this.zeroOffset) * (this.scaleFactor / toUnit.scaleFactor) - toUnit.zeroOffset;
    }
    /** @inheritdoc */
    convertFrom(value, fromUnit) {
        if (!this.canConvert(fromUnit)) {
            throw new Error(`Invalid conversion from ${fromUnit.name} to ${this.name}.`);
        }
        return (value + fromUnit.zeroOffset) * (fromUnit.scaleFactor / this.scaleFactor) - this.zeroOffset;
    }
}
/**
 * A unit of measure composed of the multiplicative combination of multiple elementary units.
 */
class CompoundUnit extends AbstractUnit {
    /**
     * Constructor.
     * @param family The family to which this unit belongs.
     * @param numerator An array of CompoundableUnits containing all the units in the numerator of the compound unit.
     * @param denominator An array of CompoundableUnits containing all the units in the denominator of the compound unit.
     * @param name The name of this unit. If not defined, one will be automatically generated.
     */
    constructor(family, numerator, denominator, name) {
        // if not specified, build name from component units.
        if (name === undefined) {
            name = '';
            let i = 0;
            while (i < numerator.length - 1) {
                name += `${numerator[i].name}-`;
            }
            name += `${numerator[i].name}`;
            if (denominator.length > 0) {
                name += ' per ';
                i = 0;
                while (i < denominator.length - 1) {
                    name += `${denominator[i].name}-`;
                }
                name += `${denominator[i].name}`;
            }
        }
        super(name);
        this.family = family;
        this.numerator = Array.from(numerator);
        this.denominator = Array.from(denominator);
        this.numerator.sort((a, b) => a.family.localeCompare(b.family));
        this.denominator.sort((a, b) => a.family.localeCompare(b.family));
        this.scaleFactor = this.getScaleFactor();
    }
    /**
     * Gets the scale factor for this unit.
     * @returns the scale factor for this unit.
     */
    getScaleFactor() {
        let factor = 1;
        factor = this.numerator.reduce((prev, curr) => prev * curr.scaleFactor, factor);
        factor = this.denominator.reduce((prev, curr) => prev / curr.scaleFactor, factor);
        return factor;
    }
    /** @inheritdoc */
    canConvert(otherUnit) {
        return otherUnit instanceof CompoundUnit && super.canConvert(otherUnit);
    }
    /** @inheritdoc */
    convertTo(value, toUnit) {
        if (!this.canConvert(toUnit)) {
            throw new Error(`Invalid conversion from ${this.name} to ${toUnit.name}.`);
        }
        return value * (this.scaleFactor / toUnit.scaleFactor);
    }
    /** @inheritdoc */
    convertFrom(value, fromUnit) {
        if (!this.canConvert(fromUnit)) {
            throw new Error(`Invalid conversion from ${fromUnit.name} to ${this.name}.`);
        }
        return value * (fromUnit.scaleFactor / this.scaleFactor);
    }
}
/**
 * Predefined unit families.
 */
var UnitFamily;
(function (UnitFamily) {
    UnitFamily["Distance"] = "distance";
    UnitFamily["Angle"] = "angle";
    UnitFamily["Duration"] = "duration";
    UnitFamily["Weight"] = "weight";
    UnitFamily["Volume"] = "volume";
    UnitFamily["Pressure"] = "pressure";
    UnitFamily["Temperature"] = "temperature";
    UnitFamily["Speed"] = "speed";
    UnitFamily["WeightFlux"] = "weight_flux";
    UnitFamily["VolumeFlux"] = "volume_flux";
})(UnitFamily || (UnitFamily = {}));
/**
 * Predefined unit types.
 */
class UnitType {
}
UnitType.METER = new SimpleUnit(UnitFamily.Distance, 'meter', 1);
UnitType.FOOT = new SimpleUnit(UnitFamily.Distance, 'foot', 0.3048);
UnitType.KILOMETER = new SimpleUnit(UnitFamily.Distance, 'kilometer', 1000);
UnitType.MILE = new SimpleUnit(UnitFamily.Distance, 'mile', 1609.34);
UnitType.NMILE = new SimpleUnit(UnitFamily.Distance, 'nautical mile', 1852);
UnitType.GA_RADIAN = new SimpleUnit(UnitFamily.Distance, 'great arc radian', 6378100);
UnitType.RADIAN = new SimpleUnit(UnitFamily.Angle, 'radian', 1);
UnitType.DEGREE = new SimpleUnit(UnitFamily.Angle, 'degree', Math.PI / 180);
UnitType.ARC_MIN = new SimpleUnit(UnitFamily.Angle, 'minute', Math.PI / 180 / 60);
UnitType.ARC_SEC = new SimpleUnit(UnitFamily.Angle, 'second', Math.PI / 180 / 3600);
UnitType.MILLISECOND = new SimpleUnit(UnitFamily.Duration, 'millisecond', 0.001);
UnitType.SECOND = new SimpleUnit(UnitFamily.Duration, 'second', 1);
UnitType.MINUTE = new SimpleUnit(UnitFamily.Duration, 'minute', 60);
UnitType.HOUR = new SimpleUnit(UnitFamily.Duration, 'hour', 3600);
UnitType.KILOGRAM = new SimpleUnit(UnitFamily.Weight, 'kilogram', 1);
UnitType.POUND = new SimpleUnit(UnitFamily.Weight, 'pound', 0.453592);
UnitType.TON = new SimpleUnit(UnitFamily.Weight, 'ton', 907.185);
UnitType.TONNE = new SimpleUnit(UnitFamily.Weight, 'tonne', 1000);
// the following fuel units use the generic conversion factor of 1 gal = 6.7 lbs
UnitType.LITER_FUEL = new SimpleUnit(UnitFamily.Weight, 'liter', 0.80283679);
UnitType.GALLON_FUEL = new SimpleUnit(UnitFamily.Weight, 'gallon', 3.0390664);
UnitType.LITER = new SimpleUnit(UnitFamily.Volume, 'liter', 1);
UnitType.GALLON = new SimpleUnit(UnitFamily.Volume, 'gallon', 3.78541);
UnitType.HPA = new SimpleUnit(UnitFamily.Pressure, 'hectopascal', 1);
UnitType.ATM = new SimpleUnit(UnitFamily.Pressure, 'atmosphere', 1013.25);
UnitType.IN_HG = new SimpleUnit(UnitFamily.Pressure, 'inch of mercury', 33.8639);
UnitType.MM_HG = new SimpleUnit(UnitFamily.Pressure, 'millimeter of mercury', 1.33322);
UnitType.CELSIUS = new SimpleUnit(UnitFamily.Temperature, '° Celsius', 1, 273.15);
UnitType.FAHRENHEIT = new SimpleUnit(UnitFamily.Temperature, '° Fahrenheit', 5 / 9, 459.67);
UnitType.KNOT = new CompoundUnit(UnitFamily.Speed, [UnitType.NMILE], [UnitType.HOUR], 'knot');
UnitType.KPH = new CompoundUnit(UnitFamily.Speed, [UnitType.KILOMETER], [UnitType.HOUR]);
UnitType.MPM = new CompoundUnit(UnitFamily.Speed, [UnitType.METER], [UnitType.MINUTE]);
UnitType.MPS = new CompoundUnit(UnitFamily.Speed, [UnitType.METER], [UnitType.SECOND]);
UnitType.FPM = new CompoundUnit(UnitFamily.Speed, [UnitType.FOOT], [UnitType.MINUTE]);
UnitType.FPS = new CompoundUnit(UnitFamily.Speed, [UnitType.FOOT], [UnitType.SECOND]);
UnitType.KGH = new CompoundUnit(UnitFamily.WeightFlux, [UnitType.KILOGRAM], [UnitType.HOUR]);
UnitType.PPH = new CompoundUnit(UnitFamily.WeightFlux, [UnitType.POUND], [UnitType.HOUR]);
UnitType.LPH_FUEL = new CompoundUnit(UnitFamily.WeightFlux, [UnitType.LITER_FUEL], [UnitType.HOUR]);
UnitType.GPH_FUEL = new CompoundUnit(UnitFamily.WeightFlux, [UnitType.GALLON_FUEL], [UnitType.HOUR]);

/**
 * A class for conversions of degree units.
 */
class Degrees {
    constructor() {
        /**
         * Converts degrees to radians.
         * @param degrees The degrees to convert.
         * @returns The result as radians.
         */
        this.toRadians = (degrees) => degrees * (Math.PI / 180);
    }
}
/**
 * A class for conversions of foot units.
 */
class Feet {
    constructor() {
        /**
         * Converts feet to meters.
         * @param feet The feet to convert.
         * @returns The result as meters.
         */
        this.toMeters = (feet) => feet * 0.3048;
        /**
         * Converts feet to nautical miles.
         * @param feet The feet to convert.
         * @returns The result as nautical miles.
         */
        this.toNauticalMiles = (feet) => feet / 6076.11549;
    }
}
/**
 * A class for conversions of meter units.
 */
class Meters {
    constructor() {
        /**
         * Converts meters to feet.
         * @param meters The meters to convert.
         * @returns The result as feet.
         */
        this.toFeet = (meters) => meters / 0.3048;
        /**
         * Converts meters to nautical miles.
         * @param meters The meters to convert.
         * @returns The result as nautical miles.
         */
        this.toNauticalMiles = (meters) => meters / 1852;
    }
}
/**
 * A class for conversions of nautical mile units.
 */
class NauticalMiles {
    constructor() {
        /**
         * Converts nautical miles to feet.
         * @param nm The nautical miles to convert.
         * @returns The result as feet.
         */
        this.toFeet = (nm) => nm * 6076.11549;
        /**
         * Converts nautical miles to meters.
         * @param nm The nautical miles to convert.
         * @returns The result as meters.
         */
        this.toMeters = (nm) => nm * 1852;
    }
}
/**
 * A class for conversions of radian units.
 */
class Radians {
    constructor() {
        /**
         * Converts radians to degrees.
         * @param radians The radians to convert.
         * @returns The result as degrees.
         */
        this.toDegrees = (radians) => radians * 180 / Math.PI;
    }
}
/**
 * A class for unit conversions.
 */
class Units {
}
/** The degrees unit. */
Units.Degrees = new Degrees();
/** The radians unit. */
Units.Radians = new Radians();
/** The feet unit. */
Units.Feet = new Feet();
/** The meters unit. */
Units.Meters = new Meters();
/** The nautical miles unit. */
Units.NauticalMiles = new NauticalMiles();

/**
 * 2D vector mathematical opertaions.
 */
/**
 * 3D vector mathematical opertaions.
 */
class Vec3Math {
    /**
     * Gets the spherical angle theta of a vector in radians.
     * @param vec - a vector.
     * @returns the spherical angle theta of the vector.
     */
    static theta(vec) {
        return Math.atan2(Math.hypot(vec[0], vec[1]), vec[2]);
    }
    /**
     * Gets the spherical angle phi of a vector in radians.
     * @param vec - a vector.
     * @returns the spherical angle phi of the vector.
     */
    static phi(vec) {
        return Math.atan2(vec[1], vec[0]);
    }
    /**
     * Sets the components of a vector.
     * @param x - the new x-component.
     * @param y - the new y-component.
     * @param z - the new z-component.
     * @param vec - the vector to change.
     * @returns the vector after it has been changed.
     */
    static set(x, y, z, vec) {
        vec[0] = x;
        vec[1] = y;
        vec[2] = z;
        return vec;
    }
    /**
     * Sets the spherical components of a vector.
     * @param r - the new length (magnitude).
     * @param theta - the new spherical angle theta, in radians.
     * @param phi - the new spherical angle phi, in radians.
     * @param vec - the vector to change.
     * @returns the vector after it has been changed.
     */
    static setFromSpherical(r, theta, phi, vec) {
        const sinTheta = Math.sin(theta);
        vec[0] = sinTheta * Math.cos(phi);
        vec[1] = sinTheta * Math.sin(phi);
        vec[2] = Math.cos(theta);
        return vec;
    }
    /**
     * Add one vector to another.
     * @param v1 The first vector.
     * @param v2 The second vector.
     * @param out The vector to write the results to.
     * @returns the vector sum.
     */
    static add(v1, v2, out) {
        out[0] = v1[0] + v2[0];
        out[1] = v1[1] + v2[1];
        out[2] = v1[2] + v2[2];
        return out;
    }
    /**
     * Subtracts one vector from another.
     * @param v1 The first vector.
     * @param v2 The second vector.
     * @param out The vector to write the results to.
     * @returns the vector difference.
     */
    static sub(v1, v2, out) {
        out[0] = v1[0] - v2[0];
        out[1] = v1[1] - v2[1];
        out[2] = v1[2] - v2[2];
        return out;
    }
    /**
     * Gets the dot product of two vectors.
     * @param v1 The first vector.
     * @param v2 The second vector.
     * @returns The dot product of the vectors.
     */
    static dot(v1, v2) {
        return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
    }
    /**
     * Gets the cross product of two vectors.
     * @param v1 - the first vector.
     * @param v2 - the second vector.
     * @param out - the vector to which to write the result.
     * @returns the cross product.
     */
    static cross(v1, v2, out) {
        const x1 = v1[0];
        const y1 = v1[1];
        const z1 = v1[2];
        const x2 = v2[0];
        const y2 = v2[1];
        const z2 = v2[2];
        out[0] = y1 * z2 - z1 * y2;
        out[1] = z1 * x2 - x1 * z2;
        out[2] = x1 * y2 - y1 * x2;
        return out;
    }
    /**
     * Multiplies a vector by a scalar.
     * @param v1 The vector to multiply.
     * @param scalar The scalar to apply.
     * @param out The vector to write the results to.
     * @returns The scaled vector.
     */
    static multScalar(v1, scalar, out) {
        out[0] = v1[0] * scalar;
        out[1] = v1[1] * scalar;
        out[2] = v1[2] * scalar;
        return out;
    }
    /**
     * Gets the magnitude of a vector.
     * @param v1 The vector to get the magnitude for.
     * @returns the vector's magnitude.
     */
    static abs(v1) {
        return Math.hypot(v1[0], v1[1], v1[2]);
    }
    /**
     * Normalizes the vector to a unit vector.
     * @param v1 The vector to normalize.
     * @param out The vector to write the results to.
     * @returns the normalized vector.
     */
    static normalize(v1, out) {
        const mag = Vec3Math.abs(v1);
        out[0] = v1[0] / mag;
        out[1] = v1[1] / mag;
        out[2] = v1[2] / mag;
        return out;
    }
    /**
     * Gets the Euclidean distance between two vectors.
     * @param vec1 The first vector.
     * @param vec2 The second vector.
     * @returns the Euclidean distance between the two vectors.
     */
    static distance(vec1, vec2) {
        return Math.hypot(vec2[0] - vec1[0], vec2[1] - vec1[0], vec2[2] - vec1[2]);
    }
    /**
     * Checks if two vectors are equal.
     * @param vec1 - the first vector.
     * @param vec2 - the second vector.
     * @returns whether the two vectors are equal.
     */
    static equals(vec1, vec2) {
        return vec1.length === vec2.length && vec1.every((element, index) => element === vec2[index]);
    }
    /**
     * Copies one vector to another.
     * @param from - the vector from which to copy.
     * @param to - the vector to which to copy.
     * @returns the changed vector.
     */
    static copy(from, to) {
        return Vec3Math.set(from[0], from[1], from[2], to);
    }
}

/**
 * A read-only wrapper for a GeoPoint.
 */
class GeoPointReadOnly {
    /**
     * Constructor.
     * @param source - the source of the new read-only point.
     */
    constructor(source) {
        this.source = source;
    }
    /**
     * The latitude of this point, in degrees.
     * @returns the latitude of this point.
     */
    get lat() {
        return this.source.lat;
    }
    /**
     * The longitude of this point, in degrees.
     * @returns the longitude of this point.
     */
    get lon() {
        return this.source.lon;
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    distance(arg1, arg2) {
        if (typeof arg1 === 'number') {
            return this.source.distance(arg1, arg2);
        }
        else {
            return this.source.distance(arg1);
        }
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    distanceRhumb(arg1, arg2) {
        if (typeof arg1 === 'number') {
            return this.source.distanceRhumb(arg1, arg2);
        }
        else {
            return this.source.distanceRhumb(arg1);
        }
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    bearingTo(arg1, arg2) {
        if (typeof arg1 === 'number') {
            return this.source.bearingTo(arg1, arg2);
        }
        else {
            return this.source.bearingTo(arg1);
        }
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    bearingFrom(arg1, arg2) {
        if (typeof arg1 === 'number') {
            return this.source.bearingFrom(arg1, arg2);
        }
        else {
            return this.source.bearingFrom(arg1);
        }
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    bearingRhumb(arg1, arg2) {
        if (typeof arg1 === 'number') {
            return this.source.bearingRhumb(arg1, arg2);
        }
        else {
            return this.source.bearingRhumb(arg1);
        }
    }
    /**
     * Offsets this point by an initial bearing and distance along a great circle.
     * @param bearing - the initial bearing (forward azimuth) by which to offset.
     * @param distance - the distance, in great-arc radians, by which to offset.
     * @param out - the GeoPoint to which to write the results. If not supplied, a new GeoPoint object is created.
     * @returns the offset point.
     * @throws {Error} argument out cannot be undefined.
     */
    offset(bearing, distance, out) {
        if (!out) {
            throw new Error('Cannot mutate a read-only GeoPoint.');
        }
        return this.source.offset(bearing, distance, out);
    }
    /**
     * Offsets this point by a constant bearing and distance along a rhumb line.
     * @param bearing - the bearing by which to offset.
     * @param distance - the distance, in great-arc radians, by which to offset.
     * @param out - the GeoPoint to which to write the results. If not supplied, a new GeoPoint object is created.
     * @returns the offset point.
     * @throws {Error} argument out cannot be undefined.
     */
    offsetRhumb(bearing, distance, out) {
        if (!out) {
            throw new Error('Cannot mutate a read-only GeoPoint.');
        }
        return this.source.offsetRhumb(bearing, distance, out);
    }
    /**
     * Calculates the cartesian (x, y, z) representation of this point, in units of great-arc radians. By convention,
     * in the cartesian coordinate system the origin is at the center of the Earth, the positive x-axis passes through
     * 0 degrees N, 0 degrees E, and the positive z-axis passes through the north pole.
     * @param out - the vector array to which to write the result.
     * @returns the cartesian representation of this point.
     */
    toCartesian(out) {
        return this.source.toCartesian(out);
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    equals(arg1, arg2, arg3) {
        if (typeof arg1 === 'number') {
            return this.source.equals(arg1, arg2, arg3);
        }
        else {
            return this.source.equals(arg1, arg2);
        }
    }
    /**
     * Copies this point.
     * @param to - an optional point to which to copy this point. If this argument is not supplied, a new GeoPoint object
     * will be created.
     * @returns a copy of this point.
     */
    copy(to) {
        return this.source.copy(to);
    }
}
/**
 * A point on Earth's surface. This class uses a spherical Earth model.
 */
class GeoPoint {
    /**
     * Constructor.
     * @param lat - the latitude, in degrees.
     * @param lon - the longitude, in degrees.
     */
    constructor(lat, lon) {
        this._lat = 0;
        this._lon = 0;
        this.set(lat, lon);
        this.readonly = new GeoPointReadOnly(this);
    }
    /**
     * The latitude of this point, in degrees.
     * @returns the latitude of this point.
     */
    get lat() {
        return this._lat;
    }
    /**
     * The longitude of this point, in degrees.
     * @returns the longitude of this point.
     */
    get lon() {
        return this._lon;
    }
    /**
     * Converts an argument list consisting of either a LatLonInterface or lat/lon coordinates into an equivalent
     * LatLonInterface.
     * @param arg1 Argument 1.
     * @param arg2 Argument 2.
     * @returns a LatLonInterface.
     */
    static asLatLonInterface(arg1, arg2) {
        if (typeof arg1 === 'number') {
            return GeoPoint.tempGeoPoint.set(arg1, arg2);
        }
        else {
            return arg1;
        }
    }
    /**
     * Converts an argument list consisting of either a 3D vector or x, y, z components into an equivalent 3D vector.
     * @param arg1 Argument 1.
     * @param arg2 Argument 2.
     * @param arg3 Argument 3.
     * @returns a 3D vector.
     */
    static asVec3(arg1, arg2, arg3) {
        if (typeof arg1 === 'number') {
            return Vec3Math.set(arg1, arg2, arg3, GeoPoint.tempVec3);
        }
        else {
            return arg1;
        }
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    set(arg1, arg2) {
        let lat, lon;
        if (typeof arg1 === 'number') {
            lat = arg1;
            lon = arg2;
        }
        else {
            lat = arg1.lat;
            lon = arg1.lon;
        }
        lat = GeoPoint.toPlusMinus180(lat);
        lon = GeoPoint.toPlusMinus180(lon);
        if (Math.abs(lat) > 90) {
            lat = 180 - lat;
            lat = GeoPoint.toPlusMinus180(lat);
            lon += 180;
            lon = GeoPoint.toPlusMinus180(lon);
        }
        this._lat = lat;
        this._lon = lon;
        return this;
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    setFromCartesian(arg1, arg2, arg3) {
        const vec = GeoPoint.asVec3(arg1, arg2, arg3);
        const theta = Vec3Math.theta(vec);
        const phi = Vec3Math.phi(vec);
        return this.set(90 - theta * Avionics.Utils.RAD2DEG, phi * Avionics.Utils.RAD2DEG);
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    distance(arg1, arg2) {
        const other = GeoPoint.asLatLonInterface(arg1, arg2);
        const lat1 = this.lat * Avionics.Utils.DEG2RAD;
        const lat2 = other.lat * Avionics.Utils.DEG2RAD;
        const lon1 = this.lon * Avionics.Utils.DEG2RAD;
        const lon2 = other.lon * Avionics.Utils.DEG2RAD;
        // haversine formula
        const sinHalfDeltaLat = Math.sin((lat2 - lat1) / 2);
        const sinHalfDeltaLon = Math.sin((lon2 - lon1) / 2);
        const a = sinHalfDeltaLat * sinHalfDeltaLat + Math.cos(lat1) * Math.cos(lat2) * sinHalfDeltaLon * sinHalfDeltaLon;
        return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    distanceRhumb(arg1, arg2) {
        const other = GeoPoint.asLatLonInterface(arg1, arg2);
        const lat1 = this.lat * Avionics.Utils.DEG2RAD;
        const lat2 = other.lat * Avionics.Utils.DEG2RAD;
        const lon1 = this.lon * Avionics.Utils.DEG2RAD;
        const lon2 = other.lon * Avionics.Utils.DEG2RAD;
        const deltaLat = lat2 - lat1;
        let deltaLon = lon2 - lon1;
        const deltaPsi = GeoPoint.deltaPsi(lat1, lat2);
        const correction = GeoPoint.rhumbCorrection(deltaPsi, lat1, lat2);
        if (Math.abs(deltaLon) > Math.PI) {
            deltaLon += -Math.sign(deltaLon) * 2 * Math.PI;
        }
        return Math.sqrt(deltaLat * deltaLat + correction * correction * deltaLon * deltaLon);
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    bearingTo(arg1, arg2) {
        const other = GeoPoint.asLatLonInterface(arg1, arg2);
        return GeoPoint.calculateInitialBearing(this, other);
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    bearingFrom(arg1, arg2) {
        const other = GeoPoint.asLatLonInterface(arg1, arg2);
        return (GeoPoint.calculateInitialBearing(this, other) + 180) % 360;
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    bearingRhumb(arg1, arg2) {
        const other = GeoPoint.asLatLonInterface(arg1, arg2);
        const lat1 = this.lat * Avionics.Utils.DEG2RAD;
        const lon1 = this.lon * Avionics.Utils.DEG2RAD;
        const lat2 = other.lat * Avionics.Utils.DEG2RAD;
        const lon2 = other.lon * Avionics.Utils.DEG2RAD;
        let deltaLon = lon2 - lon1;
        const deltaPsi = GeoPoint.deltaPsi(lat1, lat2);
        if (Math.abs(deltaLon) > Math.PI) {
            deltaLon += -Math.sign(deltaLon) * 2 * Math.PI;
        }
        return Math.atan2(deltaLon, deltaPsi) * Avionics.Utils.RAD2DEG;
    }
    /**
     * Offsets this point by an initial bearing and distance along a great circle.
     * @param bearing - the initial bearing (forward azimuth) by which to offset.
     * @param distance - the distance, in great-arc radians, by which to offset.
     * @param out - the GeoPoint to which to write the results. By default this point.
     * @returns the offset point.
     */
    offset(bearing, distance, out) {
        const latRad = this.lat * Avionics.Utils.DEG2RAD;
        const lonRad = this.lon * Avionics.Utils.DEG2RAD;
        const sinLat = Math.sin(latRad);
        const cosLat = Math.cos(latRad);
        const sinBearing = Math.sin(bearing * Avionics.Utils.DEG2RAD);
        const cosBearing = Math.cos(bearing * Avionics.Utils.DEG2RAD);
        const angularDistance = distance;
        const sinAngularDistance = Math.sin(angularDistance);
        const cosAngularDistance = Math.cos(angularDistance);
        const offsetLatRad = Math.asin(sinLat * cosAngularDistance + cosLat * sinAngularDistance * cosBearing);
        const offsetLonDeltaRad = Math.atan2(sinBearing * sinAngularDistance * cosLat, cosAngularDistance - sinLat * Math.sin(offsetLatRad));
        const offsetLat = offsetLatRad * Avionics.Utils.RAD2DEG;
        const offsetLon = (lonRad + offsetLonDeltaRad) * Avionics.Utils.RAD2DEG;
        return (out !== null && out !== void 0 ? out : this).set(offsetLat, offsetLon);
    }
    /**
     * Offsets this point by a constant bearing and distance along a rhumb line.
     * @param bearing - the bearing by which to offset.
     * @param distance - the distance, in great-arc radians, by which to offset.
     * @param out - the GeoPoint to which to write the results. By default this point.
     * @returns the offset point.
     */
    offsetRhumb(bearing, distance, out) {
        const latRad = this.lat * Avionics.Utils.DEG2RAD;
        const lonRad = this.lon * Avionics.Utils.DEG2RAD;
        const bearingRad = bearing * Avionics.Utils.DEG2RAD;
        const deltaLat = distance * Math.cos(bearingRad);
        let offsetLat = latRad + deltaLat;
        let offsetLon;
        if (Math.abs(offsetLat) >= Math.PI / 2) {
            // you can't technically go past the poles along a rhumb line, so we will simply terminate the path at the pole
            offsetLat = Math.sign(offsetLat) * 90;
            offsetLon = 0; // since longitude is meaningless at the poles, we'll arbitrarily pick a longitude of 0 degrees.
        }
        else {
            const deltaPsi = GeoPoint.deltaPsi(latRad, offsetLat);
            const correction = GeoPoint.rhumbCorrection(deltaPsi, latRad, offsetLat);
            const deltaLon = distance * Math.sin(bearingRad) / correction;
            offsetLon = lonRad + deltaLon;
            offsetLat *= Avionics.Utils.RAD2DEG;
            offsetLon *= Avionics.Utils.RAD2DEG;
        }
        return (out !== null && out !== void 0 ? out : this).set(offsetLat, offsetLon);
    }
    /**
     * Calculates the cartesian (x, y, z) representation of this point, in units of great-arc radians. By convention,
     * in the cartesian coordinate system the origin is at the center of the Earth, the positive x-axis passes through
     * 0 degrees N, 0 degrees E, and the positive z-axis passes through the north pole.
     * @param out - the vector array to which to write the result.
     * @returns the cartesian representation of this point.
     */
    toCartesian(out) {
        return GeoPoint.sphericalToCartesian(this, out);
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    equals(arg1, arg2, arg3) {
        const other = GeoPoint.asLatLonInterface(arg1, arg2);
        const tolerance = typeof arg1 === 'number' ? arg3 : arg2;
        if (other) {
            return this.distance(other) <= (tolerance !== null && tolerance !== void 0 ? tolerance : GeoPoint.EQUALITY_TOLERANCE);
        }
        else {
            return false;
        }
    }
    /**
     * Copies this point.
     * @param to - an optional point to which to copy this point. If this argument is not supplied, a new GeoPoint object
     * will be created.
     * @returns a copy of this point.
     */
    copy(to) {
        return to ? to.set(this.lat, this.lon) : new GeoPoint(this.lat, this.lon);
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    static sphericalToCartesian(arg1, arg2, arg3) {
        const point = GeoPoint.asLatLonInterface(arg1, arg2);
        const theta = (90 - point.lat) * Avionics.Utils.DEG2RAD;
        const phi = point.lon * Avionics.Utils.DEG2RAD;
        return Vec3Math.setFromSpherical(1, theta, phi, arg3 !== null && arg3 !== void 0 ? arg3 : arg2);
    }
    /**
     * Converts an angle, in degrees, to an equivalent value in the range [-180, 180).
     * @param angle - an angle in degrees.
     * @returns the angle's equivalent in the range [-180, 180).
     */
    static toPlusMinus180(angle) {
        return ((angle % 360) + 540) % 360 - 180;
    }
    /**
     * Calculates the initial bearing (forward azimuth) from an origin point to a destination point.
     * @param origin - the origin point.
     * @param destination - the destination point.
     * @returns the initial bearing from the origin to destination.
     */
    static calculateInitialBearing(origin, destination) {
        const lat1 = origin.lat * Avionics.Utils.DEG2RAD;
        const lat2 = destination.lat * Avionics.Utils.DEG2RAD;
        const lon1 = origin.lon * Avionics.Utils.DEG2RAD;
        const lon2 = destination.lon * Avionics.Utils.DEG2RAD;
        const cosLat2 = Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * cosLat2 * Math.cos(lon2 - lon1);
        const y = Math.sin(lon2 - lon1) * cosLat2;
        const bearing = Math.atan2(y, x) * Avionics.Utils.RAD2DEG;
        return (bearing + 360) % 360; // enforce range [0, 360)
    }
    /**
     * Calculates the difference in isometric latitude from a pair of geodetic (geocentric) latitudes.
     * @param latRad1 - geodetic latitude 1, in radians.
     * @param latRad2 - geodetic latitude 2, in radians.
     * @returns the difference in isometric latitude from latitude 1 to latitude 2, in radians.
     */
    static deltaPsi(latRad1, latRad2) {
        return Math.log(Math.tan(latRad2 / 2 + Math.PI / 4) / Math.tan(latRad1 / 2 + Math.PI / 4));
    }
    /**
     * Calculates the rhumb correction factor between two latitudes.
     * @param deltaPsi - the difference in isometric latitude beween the two latitudes.
     * @param latRad1 - geodetic latitude 1, in radians.
     * @param latRad2 - geodetic latitude 2, in radians.
     * @returns the rhumb correction factor between the two latitudes.
     */
    static rhumbCorrection(deltaPsi, latRad1, latRad2) {
        return Math.abs(deltaPsi) > 1e-12 ? ((latRad2 - latRad1) / deltaPsi) : Math.cos(latRad1);
    }
}
/**
 * The default equality tolerance, defined as the maximum allowed distance between two equal points in great-arc
 * radians.
 */
GeoPoint.EQUALITY_TOLERANCE = 1e-7; // ~61 cm
GeoPoint.tempVec3 = new Float64Array(3);
GeoPoint.tempGeoPoint = new GeoPoint(0, 0);

/**
 * A circle on Earth's surface, defined as the set of points on the Earth's surface equidistant (as measured
 * geodetically) from a central point.
 */
class GeoCircle {
    /**
     * Constructor.
     * @param center The center of the new small circle, represented as a position vector in the standard geographic
     * cartesian reference system.
     * @param radius The radius of the new small circle in great-arc radians.
     */
    constructor(center, radius) {
        this._center = new Float64Array(3);
        this._radius = 0;
        this.set(center, radius);
    }
    // eslint-disable-next-line jsdoc/require-returns
    /**
     * The center of this circle.
     */
    get center() {
        return this._center;
    }
    // eslint-disable-next-line jsdoc/require-returns
    /**
     * The radius of this circle, in great-arc radians.
     */
    get radius() {
        return this._radius;
    }
    /**
     * Checks whether this circle is a great circle, or equivalently, whether its radius is equal to pi / 2 great-arc
     * radians.
     * @returns Whether this circle is a great circle.
     */
    isGreatCircle() {
        return this._radius === Math.PI / 2;
    }
    /**
     * Calculates the length of an arc along this circle subtended by a central angle.
     * @param angle A central angle, in radians.
     * @returns the length of the arc subtended by the angle, in great-arc radians.
     */
    arcLength(angle) {
        return Math.sin(this._radius) * angle;
    }
    /**
     * Sets the center and radius of this circle.
     * @param center The new center.
     * @param radius The new radius in great-arc radians.
     * @returns this circle, after it has been changed.
     */
    set(center, radius) {
        if (center instanceof Float64Array) {
            if (Vec3Math.abs(center) === 0) {
                // if center has no direction, arbitrarily set the center to 0 N, 0 E.
                Vec3Math.set(1, 0, 0, this._center);
            }
            else {
                Vec3Math.normalize(center, this._center);
            }
        }
        else {
            GeoPoint.sphericalToCartesian(center, this._center);
        }
        this._radius = Math.abs(radius) % Math.PI;
        return this;
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    setAsGreatCircle(arg1, arg2) {
        this.set(GeoCircle._getGreatCircleNormal(arg1, arg2, GeoCircle.vec3Cache[0]), Math.PI / 2);
        return this;
    }
    /**
     * Gets the distance from a point to the center of this circle, in great-arc radians.
     * @param point The point to which to measure the distance.
     * @returns the distance from the point to the center of this circle.
     */
    distanceToCenter(point) {
        if (point instanceof Float64Array) {
            point = Vec3Math.normalize(point, GeoCircle.vec3Cache[0]);
        }
        else {
            point = GeoPoint.sphericalToCartesian(point, GeoCircle.vec3Cache[0]);
        }
        const dot = Vec3Math.dot(point, this._center);
        return Math.acos(Utils.Clamp(dot, -1, 1));
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    closest(point, out) {
        if (!(point instanceof Float64Array)) {
            point = GeoPoint.sphericalToCartesian(point, GeoCircle.vec3Cache[0]);
        }
        const offset = Vec3Math.multScalar(this._center, Math.cos(this._radius), GeoCircle.vec3Cache[1]);
        const dot = Vec3Math.dot(Vec3Math.sub(point, offset, GeoCircle.vec3Cache[2]), this._center);
        const planeProjected = Vec3Math.sub(point, Vec3Math.multScalar(this._center, dot, GeoCircle.vec3Cache[2]), GeoCircle.vec3Cache[2]);
        if (Vec3Math.dot(planeProjected, planeProjected) === 0 || Math.abs(Vec3Math.dot(planeProjected, this._center)) === 1) {
            // the point is equidistant from all points on this circle
            return out instanceof GeoPoint ? out.set(NaN, NaN) : Vec3Math.set(NaN, NaN, NaN, out);
        }
        const displacement = Vec3Math.multScalar(Vec3Math.normalize(Vec3Math.sub(planeProjected, offset, GeoCircle.vec3Cache[2]), GeoCircle.vec3Cache[2]), Math.sin(this._radius), GeoCircle.vec3Cache[2]);
        const closest = Vec3Math.add(offset, displacement, GeoCircle.vec3Cache[2]);
        return out instanceof Float64Array ? Vec3Math.normalize(closest, out) : out.setFromCartesian(closest);
    }
    /**
     * Calculates and returns the great-circle distance from a specified point to the closest point that lies on this
     * circle. In other words, calculates the shortest distance from a point to this circle. The distance is signed, with
     * positive distances representing deviation away from the center of the circle, and negative distances representing
     * deviation toward the center of the circle.
     * @param point A point, represented as either a position vector or lat/long coordinates.
     * @returns the great circle distance, in great-arc radians, from the point to the closest point on this circle.
     */
    distance(point) {
        const distanceToCenter = this.distanceToCenter(point);
        return distanceToCenter - this._radius;
    }
    /**
     * Checks whether a point lies on this circle.
     * @param point A point, represented as either a position vector or lat/long coordinates.
     * @param tolerance The error tolerance, in great-arc radians, of this operation. Defaults to
     * `GeoCircle.ANGULAR_TOLERANCE` if not specified.
     * @returns whether the point lies on this circle.
     */
    includes(point, tolerance = GeoCircle.ANGULAR_TOLERANCE) {
        const distance = this.distance(point);
        return Math.abs(distance) < tolerance;
    }
    /**
     * Checks whether a point lies within the boundary defined by this circle. This is equivalent to checking whether
     * the distance of the point from the center of this circle is less than or equal to this circle's radius.
     * @param point A point, represented as either a position vector or lat/long coordinates.
     * @param inclusive Whether points that lie on this circle should pass the check. True by default.
     * @param tolerance The error tolerance, in great-arc radians, of this operation. Defaults to
     * `GeoCircle.ANGULAR_TOLERANCE` if not specified.
     * @returns whether the point lies within the boundary defined by this circle.
     */
    encircles(point, inclusive = true, tolerance = GeoCircle.ANGULAR_TOLERANCE) {
        const distance = this.distance(point);
        return inclusive
            ? distance <= tolerance
            : distance < -tolerance;
    }
    /**
     * Gets the angular distance along an arc between two points that lie on this circle. The arc extends from the first
     * point to the second in a counterclockwise direction when viewed from above the center of the circle.
     * @param start A point on this circle which marks the beginning of an arc.
     * @param end A point on this circle which marks the end of an arc.
     * @param tolerance The error tolerance, in great-arc radians, when checking if `start` and `end` lie on this circle.
     * Defaults to `GeoCircle.ANGULAR_TOLERANCE` if not specified.
     * @returns the angular width of the arc between the two points, in radians.
     * @throws Error if either point does not lie on this circle.
     */
    angleAlong(start, end, tolerance = GeoCircle.ANGULAR_TOLERANCE) {
        if (!(start instanceof Float64Array)) {
            start = GeoPoint.sphericalToCartesian(start, GeoCircle.vec3Cache[1]);
        }
        if (!(end instanceof Float64Array)) {
            end = GeoPoint.sphericalToCartesian(end, GeoCircle.vec3Cache[2]);
        }
        if (!this.includes(start, tolerance) || !this.includes(end, tolerance)) {
            throw new Error(`GeoCircle: at least one of the two specified arc end points does not lie on this circle (start point distance of ${this.distance(start)}, end point distance of ${this.distance(end)}, vs tolerance of ${tolerance}).`);
        }
        if (this._radius <= GeoCircle.ANGULAR_TOLERANCE) {
            return 0;
        }
        const startRadialNormal = Vec3Math.normalize(Vec3Math.cross(this._center, start, GeoCircle.vec3Cache[3]), GeoCircle.vec3Cache[3]);
        const endRadialNormal = Vec3Math.normalize(Vec3Math.cross(this._center, end, GeoCircle.vec3Cache[4]), GeoCircle.vec3Cache[4]);
        const angularDistance = Math.acos(Utils.Clamp(Vec3Math.dot(startRadialNormal, endRadialNormal), -1, 1));
        const isArcGreaterThanSemi = Vec3Math.dot(startRadialNormal, end) < 0;
        return isArcGreaterThanSemi ? 2 * Math.PI - angularDistance : angularDistance;
    }
    /**
     * Gets the distance along an arc between two points that lie on this circle. The arc extends from the first point
     * to the second in a counterclockwise direction when viewed from above the center of the circle.
     * @param start A point on this circle which marks the beginning of an arc.
     * @param end A point on this circle which marks the end of an arc.
     * @param tolerance The error tolerance, in great-arc radians, when checking if `start` and `end` lie on this circle.
     * Defaults to `GeoCircle.ANGULAR_TOLERANCE` if not specified.
     * @returns the length of the arc between the two points, in great-arc radians.
     * @throws Error if either point does not lie on this circle.
     */
    distanceAlong(start, end, tolerance = GeoCircle.ANGULAR_TOLERANCE) {
        return this.arcLength(this.angleAlong(start, end, tolerance));
    }
    /**
     * Calculates the true bearing along this circle at a point on the circle.
     * @param point A point on this circle.
     * @param tolerance The error tolerance, in great-arc radians, when checking if `point` lies on this circle. Defaults
     * to `GeoCircle.ANGULAR_TOLERANCE` if not specified.
     * @returns the bearing along this circle at the point.
     * @throws Error if the point does not lie on this circle.
     */
    bearingAt(point, tolerance = GeoCircle.ANGULAR_TOLERANCE) {
        if (!(point instanceof Float64Array)) {
            point = GeoPoint.sphericalToCartesian(point, GeoCircle.vec3Cache[1]);
        }
        if (!this.includes(point, tolerance)) {
            throw new Error(`GeoCircle: the specified point does not lie on this circle (distance of ${Math.abs(this.distance(point))} vs tolerance of ${tolerance}).`);
        }
        if (this._radius <= GeoCircle.ANGULAR_TOLERANCE || 1 - Math.abs(Vec3Math.dot(point, GeoCircle.NORTH_POLE)) <= GeoCircle.ANGULAR_TOLERANCE) {
            // Meaningful bearings cannot be defined along a circle with 0 radius (effectively a point) and at the north and south poles.
            return NaN;
        }
        const radialNormal = Vec3Math.normalize(Vec3Math.cross(this._center, point, GeoCircle.vec3Cache[2]), GeoCircle.vec3Cache[2]);
        const northNormal = Vec3Math.normalize(Vec3Math.cross(point, GeoCircle.NORTH_POLE, GeoCircle.vec3Cache[3]), GeoCircle.vec3Cache[3]);
        return (Math.acos(Utils.Clamp(Vec3Math.dot(radialNormal, northNormal), -1, 1)) * (radialNormal[2] >= 0 ? 1 : -1) * Avionics.Utils.RAD2DEG - 90 + 360) % 360;
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    offsetDistanceAlong(point, distance, out, tolerance = GeoCircle.ANGULAR_TOLERANCE) {
        const angle = distance / Math.sin(this.radius);
        return this._offsetAngleAlong(point, angle, out, tolerance);
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    offsetAngleAlong(point, angle, out, tolerance = GeoCircle.ANGULAR_TOLERANCE) {
        return this._offsetAngleAlong(point, angle, out, tolerance);
    }
    /**
     * Offsets a point on this circle by a specified angular distance. The direction of the offset for positive distances
     * is counterclockwise when viewed from above the center of this circle.
     * @param point The point to offset.
     * @param angle The angular distance by which to offset, in radians.
     * @param out A Float64Array or GeoPoint object to which to write the result.
     * @param tolerance The error tolerance, in great-arc radians, when checking if `point` lies on this circle. Defaults
     * to `GeoCircle.ANGULAR_TOLERANCE` if not specified.
     * @returns The offset point.
     * @throws Error if the point does not lie on this circle.
     */
    _offsetAngleAlong(point, angle, out, tolerance = GeoCircle.ANGULAR_TOLERANCE) {
        if (!(point instanceof Float64Array)) {
            point = GeoPoint.sphericalToCartesian(point, GeoCircle.vec3Cache[3]);
        }
        if (!this.includes(point, tolerance)) {
            throw new Error(`GeoCircle: the specified point does not lie on this circle (distance of ${Math.abs(this.distance(point))} vs tolerance of ${tolerance}).`);
        }
        if (this.radius === 0) {
            return out instanceof GeoPoint ? out.setFromCartesian(point) : Vec3Math.copy(point, out);
        }
        // Since point may not lie exactly on this circle due to error tolerance, project point onto this circle to ensure
        // the offset point lies exactly on this circle.
        point = this.closest(point, GeoCircle.vec3Cache[3]);
        const sin = Math.sin(angle / 2);
        const q0 = Math.cos(angle / 2);
        const q1 = sin * this._center[0];
        const q2 = sin * this._center[1];
        const q3 = sin * this._center[2];
        const q0Sq = q0 * q0;
        const q1Sq = q1 * q1;
        const q2Sq = q2 * q2;
        const q3Sq = q3 * q3;
        const q01 = q0 * q1;
        const q02 = q0 * q2;
        const q03 = q0 * q3;
        const q12 = q1 * q2;
        const q13 = q1 * q3;
        const q23 = q2 * q3;
        const rot_11 = q0Sq + q1Sq - q2Sq - q3Sq;
        const rot_12 = 2 * (q12 - q03);
        const rot_13 = 2 * (q13 + q02);
        const rot_21 = 2 * (q12 + q03);
        const rot_22 = q0Sq - q1Sq + q2Sq - q3Sq;
        const rot_23 = 2 * (q23 - q01);
        const rot_31 = 2 * (q13 - q02);
        const rot_32 = 2 * (q23 + q01);
        const rot_33 = (q0Sq - q1Sq - q2Sq + q3Sq);
        const x = point[0];
        const y = point[1];
        const z = point[2];
        const rotX = rot_11 * x + rot_12 * y + rot_13 * z;
        const rotY = rot_21 * x + rot_22 * y + rot_23 * z;
        const rotZ = rot_31 * x + rot_32 * y + rot_33 * z;
        return out instanceof Float64Array
            ? Vec3Math.set(rotX, rotY, rotZ, out)
            : out.setFromCartesian(Vec3Math.set(rotX, rotY, rotZ, GeoCircle.vec3Cache[2]));
    }
    /**
     * Calculates and returns the set of intersection points between this circle and another one, and writes the results
     * to an array of position vectors.
     * @param other The other circle to test for intersections.
     * @param out An array in which to store the results. The results will be stored at indexes 0 and 1. If these indexes
     * are empty, then new Float64Array objects will be created and inserted into the array.
     * @returns The number of solutions written to the out array. Either 0, 1, or 2.
     */
    intersection(other, out) {
        const center1 = this._center;
        const center2 = other._center;
        const radius1 = this._radius;
        const radius2 = other._radius;
        /**
         * Theory: We can model geo circles as the intersection between a sphere and the unit sphere (Earth's surface).
         * Therefore, the intersection of two geo circles is the intersection between two spheres AND the unit sphere.
         * First, we find the intersection of the two non-Earth spheres (which can either be a sphere, a circle, or a
         * point), then we find the intersection of that geometry with the unit sphere.
         */
        const dot = Vec3Math.dot(center1, center2);
        const dotSquared = dot * dot;
        if (dotSquared === 1) {
            // the two circles are concentric; either there are zero solutions or infinite solutions; either way we don't
            // write any solutions to the array.
            return 0;
        }
        // find the position vector to the center of the circle which defines the intersection of the two geo circle
        // spheres.
        const a = (Math.cos(radius1) - dot * Math.cos(radius2)) / (1 - dotSquared);
        const b = (Math.cos(radius2) - dot * Math.cos(radius1)) / (1 - dotSquared);
        const intersection = Vec3Math.add(Vec3Math.multScalar(center1, a, GeoCircle.vec3Cache[0]), Vec3Math.multScalar(center2, b, GeoCircle.vec3Cache[1]), GeoCircle.vec3Cache[0]);
        const intersectionLengthSquared = Vec3Math.dot(intersection, intersection);
        if (intersectionLengthSquared > 1) {
            // the two geo circle spheres do not intersect.
            return 0;
        }
        const cross = Vec3Math.cross(center1, center2, GeoCircle.vec3Cache[1]);
        const crossLengthSquared = Vec3Math.dot(cross, cross);
        if (crossLengthSquared === 0) {
            // this technically can't happen (since we already check if center1 dot center2 === +/-1 above, but just in
            // case...)
            return 0;
        }
        const offset = Math.sqrt((1 - intersectionLengthSquared) / crossLengthSquared);
        let solutionCount = 1;
        if (!out[0]) {
            out[0] = new Float64Array(3);
        }
        out[0].set(cross);
        Vec3Math.multScalar(out[0], offset, out[0]);
        Vec3Math.add(out[0], intersection, out[0]);
        if (offset > 0) {
            if (!out[1]) {
                out[1] = new Float64Array(3);
            }
            out[1].set(cross);
            Vec3Math.multScalar(out[1], -offset, out[1]);
            Vec3Math.add(out[1], intersection, out[1]);
            solutionCount++;
        }
        return solutionCount;
    }
    /**
     * Calculates and returns the set of intersection points between this circle and another one, and writes the results
     * to an array of GeoPoint objects.
     * @param other The other circle to test for intersections.
     * @param out An array in which to store the results. The results will be stored at indexes 0 and 1. If these indexes
     * are empty, then new GeoPoint objects will be created and inserted into the array.
     * @returns The number of solutions written to the out array. Either 0, 1, or 2.
     */
    intersectionGeoPoint(other, out) {
        const solutionCount = this.intersection(other, GeoCircle.intersectionCache);
        for (let i = 0; i < solutionCount; i++) {
            if (!out[i]) {
                out[i] = new GeoPoint(0, 0);
            }
            out[i].setFromCartesian(GeoCircle.intersectionCache[i]);
        }
        return solutionCount;
    }
    /**
     * Calculates and returns the number of intersection points between this circle and another one. Returns NaN if there
     * are an infinite number of intersection points.
     * @param other The other circle to test for intersections.
     * @param tolerance The error tolerance, in great-arc radians, of this operation. Defaults to
     * `GeoCircle.ANGULAR_TOLERANCE` if not specified.
     * @returns the number of intersection points between this circle and the other one.
     */
    numIntersectionPoints(other, tolerance = GeoCircle.ANGULAR_TOLERANCE) {
        const center1 = this.center;
        const center2 = other.center;
        const radius1 = this.radius;
        const radius2 = other.radius;
        const dot = Vec3Math.dot(center1, center2);
        const dotSquared = dot * dot;
        if (dotSquared === 1) {
            // the two circles are concentric; if they are the same circle there are an infinite number of intersections,
            // otherwise there are none.
            if (dot === 1) {
                // centers are the same
                return (Math.abs(this.radius - other.radius) <= tolerance) ? NaN : 0;
            }
            else {
                // centers are antipodal
                return (Math.abs(Math.PI - this.radius - other.radius) <= tolerance) ? NaN : 0;
            }
        }
        const a = (Math.cos(radius1) - dot * Math.cos(radius2)) / (1 - dotSquared);
        const b = (Math.cos(radius2) - dot * Math.cos(radius1)) / (1 - dotSquared);
        const intersection = Vec3Math.add(Vec3Math.multScalar(center1, a, GeoCircle.vec3Cache[0]), Vec3Math.multScalar(center2, b, GeoCircle.vec3Cache[1]), GeoCircle.vec3Cache[1]);
        const intersectionLengthSquared = Vec3Math.dot(intersection, intersection);
        if (intersectionLengthSquared > 1) {
            return 0;
        }
        const cross = Vec3Math.cross(center1, center2, GeoCircle.vec3Cache[1]);
        const crossLengthSquared = Vec3Math.dot(cross, cross);
        if (crossLengthSquared === 0) {
            return 0;
        }
        const sinTol = Math.sin(tolerance);
        return ((1 - intersectionLengthSquared) / crossLengthSquared > sinTol * sinTol) ? 2 : 1;
    }
    /**
     * Creates a new small circle from a lat/long coordinate pair and radius.
     * @param point The center of the new small circle.
     * @param radius The radius of the new small circle, in great-arc radians.
     * @returns a small circle.
     */
    static createFromPoint(point, radius) {
        return new GeoCircle(GeoPoint.sphericalToCartesian(point, GeoCircle.vec3Cache[0]), radius);
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    static createGreatCircle(arg1, arg2) {
        return new GeoCircle(GeoCircle._getGreatCircleNormal(arg1, arg2, GeoCircle.vec3Cache[0]), Math.PI / 2);
    }
    /**
     * Creates a new great circle defined by one point and a bearing offset. The new great circle will be equivalent to
     * the path projected from the point with the specified initial bearing (forward azimuth).
     * @param point A point that lies on the new great circle.
     * @param bearing The initial bearing from the point.
     * @returns a great circle.
     */
    static createGreatCircleFromPointBearing(point, bearing) {
        return new GeoCircle(GeoCircle.getGreatCircleNormalFromPointBearing(point, bearing, GeoCircle.vec3Cache[0]), Math.PI / 2);
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    static getGreatCircleNormal(arg1, arg2, out) {
        return GeoCircle._getGreatCircleNormal(arg1, arg2, out);
    }
    /**
     * Calculates a normal vector for a great circle given two points which lie on the circle, or a point and initial bearing.
     * @param arg1 A point that lies on the great circle.
     * @param arg2 A second point that lies on the great circle, or an initial bearing from the first point.
     * @param out The vector to which to write the result.
     * @returns the normal vector for the great circle.
     */
    static _getGreatCircleNormal(arg1, arg2, out) {
        if (typeof arg2 === 'number') {
            return GeoCircle.getGreatCircleNormalFromPointBearing(arg1, arg2, out);
        }
        else {
            return GeoCircle.getGreatCircleNormalFromPoints(arg1, arg2, out);
        }
    }
    /**
     * Calculates a normal vector for a great circle given two points which lie on the cirlce.
     * @param point1 The first point that lies on the great circle.
     * @param point2 The second point that lies on the great circle.
     * @param out The vector to which to write the result.
     * @returns the normal vector for the great circle.
     */
    static getGreatCircleNormalFromPoints(point1, point2, out) {
        if (!(point1 instanceof Float64Array)) {
            point1 = GeoPoint.sphericalToCartesian(point1, GeoCircle.vec3Cache[0]);
        }
        if (!(point2 instanceof Float64Array)) {
            point2 = GeoPoint.sphericalToCartesian(point2, GeoCircle.vec3Cache[1]);
        }
        return Vec3Math.normalize(Vec3Math.cross(point1, point2, out), out);
    }
    /**
     * Calculates a normal vector for a great circle given a point and initial bearing.
     * @param point A point that lies on the great circle.
     * @param bearing The initial bearing from the point.
     * @param out The vector to which to write the result.
     * @returns the normal vector for the great circle.
     */
    static getGreatCircleNormalFromPointBearing(point, bearing, out) {
        if (point instanceof Float64Array) {
            point = GeoCircle.tempGeoPoint.setFromCartesian(point);
        }
        const lat = point.lat * Avionics.Utils.DEG2RAD;
        const long = point.lon * Avionics.Utils.DEG2RAD;
        bearing *= Avionics.Utils.DEG2RAD;
        const sinLat = Math.sin(lat);
        const sinLon = Math.sin(long);
        const cosLon = Math.cos(long);
        const sinBearing = Math.sin(bearing);
        const cosBearing = Math.cos(bearing);
        const x = sinLon * cosBearing - sinLat * cosLon * sinBearing;
        const y = -cosLon * cosBearing - sinLat * sinLon * sinBearing;
        const z = Math.cos(lat) * sinBearing;
        return Vec3Math.set(x, y, z, out);
    }
}
GeoCircle.ANGULAR_TOLERANCE = 1e-7; // ~61cm
GeoCircle.NORTH_POLE = new Float64Array([0, 0, 1]);
GeoCircle.tempGeoPoint = new GeoPoint(0, 0);
GeoCircle.vec3Cache = [new Float64Array(3), new Float64Array(3), new Float64Array(3), new Float64Array(3), new Float64Array(3)];
GeoCircle.intersectionCache = [new Float64Array(3), new Float64Array(3)];

/**
 * Navigational mathematics functions.
 */
class NavMath {
    /**
     * Clamps a value to a min and max.
     * @param val The value to clamp.
     * @param min The minimum value to clamp to.
     * @param max The maximum value to clamp to.
     * @returns The clamped value.
     */
    static clamp(val, min, max) {
        return Math.min(Math.max(val, min), max);
    }
    /**
     * Normalizes a heading to a 0-360 range.
     * @param heading The heading to normalize.
     * @returns The normalized heading.
     */
    static normalizeHeading(heading) {
        if (isFinite(heading)) {
            return (heading % 360 + 360) % 360;
        }
        else {
            console.error(`normalizeHeading: Invalid heading: ${heading}`);
            return NaN;
        }
    }
    /**
     * Gets the turn radius for a given true airspeed.
     * @param airspeedTrue The true airspeed of the plane.
     * @param bankAngle The bank angle of the plane, in degrees.
     * @returns The airplane turn radius.
     */
    static turnRadius(airspeedTrue, bankAngle) {
        return (Math.pow(airspeedTrue, 2) / (11.26 * Math.tan(bankAngle * NavMath.DEG2RAD)))
            / 3.2808399;
    }
    /**
     * Gets the required bank angle for a given true airspeed and turn radius.
     * @param airspeedTrue The true airspeed of the plane.
     * @param radius The airplane turn radius.
     * @returns The required bank angle, in degrees.
     */
    static bankAngle(airspeedTrue, radius) {
        const airspeedMS = airspeedTrue * 0.51444444;
        return Units.Radians.toDegrees(Math.atan(Math.pow(airspeedMS, 2) / (radius * 9.80665)));
    }
    /**
     * Get the turn direction for a given course change.
     * @param startCourse The start course.
     * @param endCourse The end course.
     * @returns The turn direction for the course change.
     */
    static getTurnDirection(startCourse, endCourse) {
        return NavMath.normalizeHeading(endCourse - startCourse) > 180 ? 'left' : 'right';
    }
    /**
     * Converts polar radians to degrees north.
     * @param radians The radians to convert.
     * @returns The angle, in degrees north.
     */
    static polarToDegreesNorth(radians) {
        return NavMath.normalizeHeading((180 / Math.PI) * (Math.PI / 2 - radians));
    }
    /**
     * Converts degrees north to polar radians.
     * @param degrees The degrees to convert.
     * @returns The angle radians, in polar.
     */
    static degreesNorthToPolar(degrees) {
        return NavMath.normalizeHeading(degrees - 90) / (180 / Math.PI);
    }
    /**
     * Calculates the distance along an arc on Earth's surface. The arc begins at the intersection of the great circle
     * passing through the center of a circle of radius `radius` meters in the direction of 'startBearing', and ends at
     * the intersection of the great circle passing through the center of the circle in the direction of 'endBearing',
     * proceeding clockwise (as viewed from above).
     * @param startBearing The degrees of the start of the arc.
     * @param endBearing The degrees of the end of the arc.
     * @param radius The radius of the arc, in meters.
     * @returns The arc distance.
     */
    static calculateArcDistance(startBearing, endBearing, radius) {
        const angularWidth = ((endBearing - startBearing + 360) % 360) * Avionics.Utils.DEG2RAD;
        const conversion = UnitType.GA_RADIAN.convertTo(1, UnitType.METER);
        return angularWidth * Math.sin(radius / conversion) * conversion;
    }
    /**
     * Calculates the intersection of a line and a circle.
     * @param x1 The start x of the line.
     * @param y1 The start y of the line.
     * @param x2 The end x of the line.
     * @param y2 The end y of the line.
     * @param cx The circle center x.
     * @param cy The circle center y.
     * @param r The radius of the circle.
     * @param sRef The reference to the solution object to write the solution to.
     * @returns The number of solutions (0, 1 or 2).
     */
    static circleIntersection(x1, y1, x2, y2, cx, cy, r, sRef) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const a = dx * dx + dy * dy;
        const b = 2 * (dx * (x1 - cx) + dy * (y1 - cy));
        const c = (x1 - cx) * (x1 - cx) + (y1 - cy) * (y1 - cy) - r * r;
        const det = b * b - 4 * a * c;
        if (a < 0.0000001 || det < 0) {
            sRef.x1 = NaN;
            sRef.x2 = NaN;
            sRef.y1 = NaN;
            sRef.y2 = NaN;
            return 0;
        }
        else if (det == 0) {
            const t = -b / (2 * a);
            sRef.x1 = x1 + t * dx;
            sRef.y1 = y1 + t * dy;
            sRef.x2 = NaN;
            sRef.y2 = NaN;
            return 1;
        }
        else {
            const t1 = ((-b + Math.sqrt(det)) / (2 * a));
            sRef.x1 = x1 + t1 * dx;
            sRef.y1 = y1 + t1 * dy;
            const t2 = ((-b - Math.sqrt(det)) / (2 * a));
            sRef.x2 = x1 + t2 * dx;
            sRef.y2 = y1 + t2 * dy;
            return 2;
        }
    }
    /**
     * Gets the degrees north that a point lies on a circle.
     * @param cx The x point of the center of the circle.
     * @param cy The y point of the center of the circle.
     * @param x The x point to get the bearing for.
     * @param y The y point to get the bearing for.
     * @returns The angle in degrees north that the point is relative to the center.
     */
    static northAngle(cx, cy, x, y) {
        return NavMath.polarToDegreesNorth(Math.atan2(y - cy, x - cx));
    }
    /**
     * Checks if a degrees north bearing is between two other degrees north bearings.
     * @param bearing The bearing in degrees north to check.
     * @param start The start bearing in degrees north.
     * @param end The end bearing, in degrees north.
     * @returns True if the bearing is between the two provided bearings, false otherwise.
     */
    static bearingIsBetween(bearing, start, end) {
        const range = this.normalizeHeading(end - start);
        const relativeBearing = this.normalizeHeading(bearing - start);
        return relativeBearing >= 0 && relativeBearing <= range;
    }
    /**
     * Converts a degrees north heading to a degrees north turn circle angle.
     * @param heading The heading to convert.
     * @param turnDirection The direction of the turn.
     * @returns A degrees north turn circle angle.
     */
    static headingToAngle(heading, turnDirection) {
        return NavMath.normalizeHeading(heading + (turnDirection === 'left' ? 90 : -90));
    }
    /**
     * Converts a degrees north turn circle angle to a degrees north heading.
     * @param angle The turn circle angle to convert.
     * @param turnDirection The direction of the turn.
     * @returns A degrees north heading.
     */
    static angleToHeading(angle, turnDirection) {
        return NavMath.normalizeHeading(angle + (turnDirection === 'left' ? -90 : 90));
    }
    /**
     * Calculates the wind correction angle.
     * @param course The current plane true course.
     * @param airspeedTrue The current plane true airspeed.
     * @param windDirection The direction of the wind, in degrees true.
     * @param windSpeed The current speed of the wind.
     * @returns The calculated wind correction angle.
     */
    static windCorrectionAngle(course, airspeedTrue, windDirection, windSpeed) {
        const currCrosswind = windSpeed * (Math.sin((course * Math.PI / 180) - (windDirection * Math.PI / 180)));
        const windCorrection = 180 * Math.asin(currCrosswind / airspeedTrue) / Math.PI;
        return windCorrection;
    }
    /**
     * Calculates the cross track deviation from the provided leg fixes.
     * @param start The location of the starting fix of the leg.
     * @param end The location of the ending fix of the leg.
     * @param pos The current plane location coordinates.
     * @returns The amount of cross track deviation, in nautical miles.
     */
    static crossTrack(start, end, pos) {
        const path = NavMath.geoCircleCache[0].setAsGreatCircle(start, end);
        if (isNaN(path.center[0])) {
            return NaN;
        }
        return UnitType.GA_RADIAN.convertTo(path.distance(pos), UnitType.NMILE);
    }
    /**
     * Calculates the along-track distance from a starting point to another point along a great-circle track running
     * through the starting point.
     * @param start The start of the great-circle track.
     * @param end The end of the great-circle track.
     * @param pos The point for which to calculate the along-track distance.
     * @returns The along-track distance, in nautical miles.
     */
    static alongTrack(start, end, pos) {
        const path = NavMath.geoCircleCache[0].setAsGreatCircle(start, end);
        if (isNaN(path.center[0])) {
            return NaN;
        }
        const distance = path.distanceAlong(start, path.closest(pos, NavMath.vec3Cache[0]));
        return UnitType.GA_RADIAN.convertTo((distance + Math.PI) % (2 * Math.PI) - Math.PI, UnitType.NMILE);
    }
    /**
     * Calculates the desired track from the provided leg fixes.
     * @param start The location of the starting fix of the leg.
     * @param end The location of the ending fix of the leg.
     * @param pos The current plane location coordinates.
     * @returns The desired track, in degrees true.
     */
    static desiredTrack(start, end, pos) {
        const path = NavMath.geoCircleCache[0].setAsGreatCircle(start, end);
        if (isNaN(path.center[0])) {
            return NaN;
        }
        return path.bearingAt(path.closest(pos, NavMath.vec3Cache[0]));
    }
    /**
     * Gets the desired track for a given arc.
     * @param center The center of the arc.
     * @param turnDirection The direction of the turn.
     * @param pos The current plane position.
     * @returns The desired track.
     */
    static desiredTrackArc(center, turnDirection, pos) {
        const northAngle = NavMath.geoPointCache[0].set(pos).bearingFrom(center);
        //TODO: Clamp the arc angle to the start and end angles
        return NavMath.angleToHeading(northAngle, turnDirection);
    }
    /**
     * Gets the percentage along the arc path that the plane currently is.
     * @param start The start of the arc, in degrees north.
     * @param end The end of the arc, in degrees north.
     * @param center The center location of the arc.
     * @param turnDirection The direction of the turn.
     * @param pos The current plane position.
     * @returns The percentage along the arc the plane is.
     */
    static percentAlongTrackArc(start, end, center, turnDirection, pos) {
        const bearingFromCenter = NavMath.geoPointCache[0].set(center).bearingTo(pos);
        const sign = turnDirection === 'right' ? 1 : -1;
        const alpha = ((end - start) * sign + 360) % 360;
        const mid = (start + alpha / 2 * sign + 360) % 360;
        const rotBearing = ((bearingFromCenter - mid) + 540) % 360 - 180;
        const frac = rotBearing * sign / alpha + 0.5;
        return frac;
    }
    /**
     * Gets a position given an arc and a distance from the arc start.
     * @param start The start bearing of the arc.
     * @param center The center of the arc.
     * @param radius The radius of the arc.
     * @param turnDirection The turn direction for the arc.
     * @param distance The distance along the arc to get the position for.
     * @param out The position to write to.
     * @returns The position along the arc that was written to.
     */
    static positionAlongArc(start, center, radius, turnDirection, distance, out) {
        const convertedRadius = UnitType.GA_RADIAN.convertTo(Math.sin(UnitType.METER.convertTo(radius, UnitType.GA_RADIAN)), UnitType.METER);
        const theta = UnitType.RADIAN.convertTo(distance / convertedRadius, UnitType.DEGREE);
        const bearing = turnDirection === 'right' ? start + theta : start - theta;
        center.offset(NavMath.normalizeHeading(bearing), UnitType.METER.convertTo(radius, UnitType.GA_RADIAN), out);
        return out;
    }
    /**
     * Gets the cross track distance for a given arc.
     * @param center The center of the arc.
     * @param radius The radius of the arc, in meters.
     * @param pos The current plane position.
     * @returns The cross track distance, in NM.
     */
    static crossTrackArc(center, radius, pos) {
        return UnitType.METER.convertTo(radius, UnitType.NMILE) - UnitType.GA_RADIAN.convertTo(NavMath.geoPointCache[0].set(pos).distance(center), UnitType.NMILE);
    }
    /**
     * Gets the total difference in degrees between two angles.
     * @param a The first angle.
     * @param b The second angle.
     * @returns The difference between the two angles, in degrees.
     */
    static diffAngle(a, b) {
        let diff = b - a;
        while (diff > 180) {
            diff -= 360;
        }
        while (diff <= -180) {
            diff += 360;
        }
        return diff;
    }
    /**
     * Finds side a given sides b, c, and angles beta, gamma.
     * @param b The length of side b, as a trigonometric ratio.
     * @param c The length of side c, as a trigonometric ratio.
     * @param beta The angle, in radians, of the opposite of side b.
     * @param gamma The angle, in radians, of the opposite of side c
     * @returns The length of side a, as a trigonometric ratio.
     */
    static napierSide(b, c, beta, gamma) {
        return 2 * Math.atan(Math.tan(0.5 * (b - c))
            * (Math.sin(0.5 * (beta + gamma)) / Math.sin(0.5 * (beta - gamma))));
    }
    /**
     * Calculates a normal vector to a provided course in degrees north.
     * @param course The course in degrees north.
     * @param turnDirection The direction of the turn to orient the normal.
     * @param outVector The normal vector for the provided course.
     */
    static normal(course, turnDirection, outVector) {
        const normalCourse = NavMath.headingToAngle(course, turnDirection);
        const polarCourse = NavMath.degreesNorthToPolar(normalCourse);
        outVector[0] = Math.cos(polarCourse);
        outVector[1] = Math.sin(polarCourse);
    }
}
NavMath.DEG2RAD = Math.PI / 180;
NavMath.RAD2DEG = 180 / Math.PI;
NavMath.vec3Cache = [new Float64Array(3)];
NavMath.geoPointCache = [new GeoPoint(0, 0), new GeoPoint(0, 0)];
NavMath.geoCircleCache = [new GeoCircle(new Float64Array(3), 0)];

/// <reference types="msfstypes/Coherent/Facilities" />
/**
 * A utility class for working with magnetic variation (magnetic declination).
 */
class MagVar {
    // eslint-disable-next-line jsdoc/require-jsdoc
    static get(arg1, arg2) {
        return MagVar.getMagVar(arg1, arg2);
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    static magneticToTrue(bearing, arg1, arg2) {
        return NavMath.normalizeHeading(bearing + (typeof arg1 === 'number' && arg2 === undefined ? arg1 : MagVar.getMagVar(arg1, arg2)));
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    static trueToMagnetic(bearing, arg1, arg2) {
        return NavMath.normalizeHeading(bearing - (typeof arg1 === 'number' && arg2 === undefined ? arg1 : MagVar.getMagVar(arg1, arg2)));
    }
    /**
     * Gets the magnetic variation (magnetic declination) at a specific point on Earth.
     * @param arg1 The query point, or the latitude of the query point.
     * @param arg2 The longitude of the query point.
     * @returns The magnetic variation (magnetic declination) at the point.
     */
    static getMagVar(arg1, arg2) {
        if (typeof Facilities === 'undefined') {
            // In case this code is executed before the Facilities class is created.
            return 0;
        }
        let lat, lon;
        if (typeof arg1 === 'number') {
            lat = arg1;
            lon = arg2;
        }
        else {
            lat = arg1.lat;
            lon = arg1.lon;
        }
        return Facilities.getMagVar(lat, lon);
    }
}

/**
 * The possible reference norths for navigation angle units.
 */
var NavAngleUnitReferenceNorth;
(function (NavAngleUnitReferenceNorth) {
    NavAngleUnitReferenceNorth["True"] = "true";
    NavAngleUnitReferenceNorth["Magnetic"] = "magnetic";
})(NavAngleUnitReferenceNorth || (NavAngleUnitReferenceNorth = {}));
/**
 * A navigation angle unit, which is a measure of angular degrees relative to either true or magnetic north.
 *
 * Unlike most other unit types, each instance of navigation angle unit contains state specific to that instance,
 * namely the location used to retrieve magnetic variation for conversions. Therefore, it is generally recommended
 * not to re-use the same NavAngleUnit instance to instantiate multiple NumberUnits.
 *
 * Conversions use the location of the NavAngleUnit instance whose conversion method is called; this also means that
 * when using `NumberUnit.asUnit()`, the location of the unit of the NumberUnit whose `asUnit()` method was called
 * will be used.
 */
class NavAngleUnit extends AbstractUnit {
    // eslint-disable-next-line jsdoc/require-jsdoc
    constructor(type, arg1, arg2) {
        super(type === NavAngleUnitReferenceNorth.True ? 'true bearing' : 'magnetic bearing');
        /** @inheritdoc */
        this.family = NavAngleUnit.FAMILY;
        /** This location used to retrieve magnetic variation for conversions related to this unit. */
        this.location = new GeoPoint(0, 0);
        typeof arg1 === 'number' ? this.location.set(arg1, arg2) : this.location.set(arg1);
    }
    /**
     * Checks whether this nav angle unit is relative to magnetic north.
     * @returns Whether this nav angle unit is relative to magnetic north.
     */
    isMagnetic() {
        return this.name === 'magnetic bearing';
    }
    /**
     * Converts a value of this unit to another unit. This unit's location is used for the conversion.
     * @param value The value to convert.
     * @param toUnit The unit to which to convert.
     * @returns The converted value.
     * @throws Error if attempting an invalid conversion.
     */
    convertTo(value, toUnit) {
        if (!this.canConvert(toUnit)) {
            throw new Error(`Invalid conversion from ${this.name} to ${toUnit.name}.`);
        }
        if (!isFinite(value)) {
            return NaN;
        }
        if (toUnit.name === this.name) {
            return value;
        }
        return this.isMagnetic() ? MagVar.magneticToTrue(value, this.location) : MagVar.trueToMagnetic(value, this.location);
    }
    /**
     * Converts a value of another unit to this unit. This unit's location is used for the conversion.
     * @param value The value to convert.
     * @param fromUnit The unit from which to convert.
     * @returns The converted value.
     * @throws Error if attempting an invalid conversion.
     */
    convertFrom(value, fromUnit) {
        if (!this.canConvert(fromUnit)) {
            throw new Error(`Invalid conversion from ${fromUnit.name} to ${this.name}.`);
        }
        if (!isFinite(value)) {
            return NaN;
        }
        if (fromUnit.name === this.name) {
            return value;
        }
        return this.isMagnetic() ? MagVar.trueToMagnetic(value, this.location) : MagVar.magneticToTrue(value, this.location);
    }
    /** @inheritdoc */
    equals(other) {
        return other instanceof NavAngleUnit && this.name === other.name && this.location.equals(other.location);
    }
    /**
     * Creates an instance of NavAngleUnit. The location of the unit is initialized to {0 N, 0 E}.
     * @param isMagnetic Whether the new unit is relative to magnetic north.
     * @returns An instance of NavAngleUnit.
     */
    static create(isMagnetic) {
        return new NavAngleUnit(isMagnetic ? NavAngleUnitReferenceNorth.Magnetic : NavAngleUnitReferenceNorth.True, 0, 0);
    }
}
NavAngleUnit.FAMILY = 'navangle';

/**
 * Bitflags describing the relative location of a point with respect to a rectangular bounding box.
 */
var Outcode;
(function (Outcode) {
    Outcode[Outcode["Inside"] = 0] = "Inside";
    Outcode[Outcode["Left"] = 1] = "Left";
    Outcode[Outcode["Top"] = 2] = "Top";
    Outcode[Outcode["Right"] = 4] = "Right";
    Outcode[Outcode["Bottom"] = 8] = "Bottom";
})(Outcode || (Outcode = {}));
Array.from({ length: 8 }, () => {
    return { point: new Float64Array(2), radial: 0 };
});

[new GeoPoint(0, 0), new GeoPoint(0, 0), new GeoPoint(0, 0), new GeoPoint(0, 0)];

var DmsDirection;
(function (DmsDirection) {
    DmsDirection["NORTH"] = "N";
    DmsDirection["SOUTH"] = "S";
    DmsDirection["WEST"] = "W";
    DmsDirection["EAST"] = "E";
})(DmsDirection || (DmsDirection = {}));

// eslint-disable-next-line @typescript-eslint/no-namespace
var Wait;
(function (Wait) {
    /**
     * Waits for a set amount of time.
     * @param delay The amount of time to wait in milliseconds.
     * @returns a Promise which is fulfilled after the delay.
     */
    // eslint-disable-next-line no-inner-declarations
    function awaitDelay(delay) {
        return new Promise(resolve => setTimeout(() => resolve(), delay));
    }
    Wait.awaitDelay = awaitDelay;
    /**
     * Waits for a condition to be satisfied.
     * @param predicate A function which evaluates whether the condition is satisfied.
     * @param interval The interval, in milliseconds, at which to evaluate the condition. A zero or negative value
     * causes the condition to be evaluated every frame. Defaults to 0.
     * @param timeout The amount of time, in milliseconds, before the returned Promise is rejected if the condition is
     * not satisfied. A zero or negative value causes the Promise to never be rejected and the condition to be
     * continually evaluated until it is satisfied. Defaults to 0.
     * @returns a Promise which is fulfilled when the condition is satisfied.
     */
    // eslint-disable-next-line no-inner-declarations
    function awaitCondition(predicate, interval = 0, timeout = 0) {
        const t0 = Date.now();
        if (interval <= 0) {
            const loopFunc = (resolve, reject) => {
                if (timeout > 0 && Date.now() - t0 >= timeout) {
                    reject('Await condition timed out.');
                }
                else {
                    predicate() ? resolve() : requestAnimationFrame(loopFunc.bind(undefined, resolve, reject));
                }
            };
            return new Promise((resolve, reject) => { loopFunc(resolve, reject); });
        }
        else {
            return new Promise((resolve, reject) => {
                const timer = setInterval(() => {
                    if (timeout > 0 && Date.now() - t0 > timeout) {
                        clearInterval(timer);
                        reject('Await condition timed out.');
                    }
                    else if (predicate()) {
                        clearInterval(timer);
                        resolve();
                    }
                }, interval);
            });
        }
    }
    Wait.awaitCondition = awaitCondition;
})(Wait || (Wait = {}));

/**
 * An event bus consumer for a specific topic.
 */
class Consumer {
    /**
     * Creates an instance of a Consumer.
     * @param bus The event bus to subscribe to.
     * @param topic The topic of the subscription.
     * @param state The state for the consumer to track.
     * @param currentHandler The current build filter handler stack, if any.
     */
    constructor(bus, topic, state = {}, currentHandler) {
        this.bus = bus;
        this.topic = topic;
        this.state = state;
        this.currentHandler = currentHandler;
    }
    /**
     * Handles an event using the provided event handler.
     * @param handler The event handler for the event.
     */
    handle(handler) {
        if (this.currentHandler !== undefined) {
            /**
             * The handler reference to store.
             * @param data The input data to the handler.
             */
            this.handlerReference = (data) => {
                if (this.currentHandler !== undefined) {
                    this.currentHandler(data, this.state, handler);
                }
            };
            this.bus.on(this.topic, this.handlerReference);
        }
        else {
            this.bus.on(this.topic, handler);
        }
    }
    /**
     * Disables handling of the event.
     * @param handler The handler to disable.
     */
    off(handler) {
        if (this.handlerReference !== undefined) {
            this.bus.off(this.topic, this.handlerReference);
        }
        else {
            this.bus.off(this.topic, handler);
        }
    }
    /**
     * Caps the event subscription to a specified frequency, in Hz.
     * @param frequency The frequency, in Hz, to cap to.
     * @returns A new consumer with the applied frequency filter.
     */
    atFrequency(frequency) {
        const deltaTimeTrigger = 1000 / frequency;
        return new Consumer(this.bus, this.topic, { previousTime: Date.now() }, (data, state, next) => {
            const currentTime = Date.now();
            const deltaTime = currentTime - state.previousTime;
            if (deltaTimeTrigger <= deltaTime) {
                while ((state.previousTime + deltaTimeTrigger) < currentTime) {
                    state.previousTime += deltaTimeTrigger;
                }
                this.with(data, next);
            }
        });
    }
    /**
     * Quantizes the numerical event data to consume only at the specified decimal precision.
     * @param precision The decimal precision to snap to.
     * @returns A new consumer with the applied precision filter.
     */
    withPrecision(precision) {
        return new Consumer(this.bus, this.topic, { lastValue: 0 }, (data, state, next) => {
            const dataValue = data;
            const multiplier = Math.pow(10, precision);
            const currentValueAtPrecision = Math.round(dataValue * multiplier) / multiplier;
            if (currentValueAtPrecision !== state.lastValue) {
                state.lastValue = currentValueAtPrecision;
                this.with(currentValueAtPrecision, next);
            }
        });
    }
    /**
     * Filter the subscription to consume only when the value has changed by a minimum amount.
     * @param amount The minimum amount threshold below which the consumer will not consume.
     * @returns A new consumer with the applied change threshold filter.
     */
    whenChangedBy(amount) {
        return new Consumer(this.bus, this.topic, { lastValue: 0 }, (data, state, next) => {
            const dataValue = data;
            const diff = Math.abs(dataValue - state.lastValue);
            if (diff >= amount) {
                state.lastValue = dataValue;
                this.with(data, next);
            }
        });
    }
    /**
     * Filter the subscription to consume only if the value has changed. At all.  Really only
     * useful for strings or other events that don't change much.
     * @returns A new consumer with the applied change threshold filter.
     */
    whenChanged() {
        return new Consumer(this.bus, this.topic, { lastValue: '' }, (data, state, next) => {
            if (state.lastValue !== data) {
                state.lastValue = data;
                this.with(data, next);
            }
        });
    }
    /**
     * Filters events by time such that events will not be consumed until a minimum duration
     * has passed since the previous event.
     * @param deltaTime The minimum delta time between events.
     * @returns A new consumer with the applied change threshold filter.
     */
    onlyAfter(deltaTime) {
        return new Consumer(this.bus, this.topic, { previousTime: Date.now() }, (data, state, next) => {
            const currentTime = Date.now();
            const timeDiff = currentTime - state.previousTime;
            if (timeDiff > deltaTime) {
                state.previousTime += deltaTime;
                this.with(data, next);
            }
        });
    }
    /**
     * Builds a handler stack from the current handler.
     * @param data The data to send in to the handler.
     * @param handler The handler to use for processing.
     */
    with(data, handler) {
        if (this.currentHandler !== undefined) {
            this.currentHandler(data, this.state, handler);
        }
        else {
            handler(data);
        }
    }
}

/**
 * A typed container for subscribers interacting with the Event Bus.
 */
class EventSubscriber {
    /**
     * Creates an instance of an EventSubscriber.
     * @param bus The EventBus that is the parent of this instance.
     */
    constructor(bus) {
        this.bus = bus;
    }
    /**
     * Subscribes to a topic on the bus.
     * @param topic The topic to subscribe to.
     * @returns A consumer to bind the event handler to.
     */
    on(topic) {
        return new Consumer(this.bus, topic);
    }
}

/// <reference types="msfstypes/JS/common" />
/**
 * An event bus that can be used to publish data from backend
 * components and devices to consumers.
 */
class EventBus {
    /**
     * Creates an instance of an EventBus.
     * @param useStorageSync Whether or not to use storage sync (optional, default false)
     */
    constructor(useStorageSync) {
        this._topicHandlersMap = new Map();
        this._wildcardHandlers = new Array();
        this._eventCache = new Map();
        this._busId = Math.floor(Math.random() * 2147483647);
        const syncFunc = useStorageSync ? EventBusStorageSync : EventBusCoherentSync;
        this._busSync = new syncFunc(this.pub.bind(this), this._busId);
        this.syncEvent('event_bus', 'resync_request', false);
        this.on('event_bus', (data) => {
            if (data == 'resync_request') {
                this.resyncEvents();
            }
        });
    }
    /**
     * Subscribes to a topic on the bus.
     * @param topic The topic to subscribe to.
     * @param handler The handler to be called when an event happens.
     */
    on(topic, handler) {
        var _a;
        const handlers = this._topicHandlersMap.get(topic);
        const isNew = !(handlers && handlers.push(handler));
        if (isNew) {
            this._topicHandlersMap.set(topic, [handler]);
        }
        const lastState = (_a = this._eventCache.get(topic)) === null || _a === void 0 ? void 0 : _a.data;
        if (this._eventCache.get(topic) !== undefined) {
            handler(lastState);
        }
    }
    /**
     * Unsubscribes a handler from the topic's events.
     * @param topic The topic to unsubscribe from.
     * @param handler The handler to unsubscribe from topic.
     */
    off(topic, handler) {
        const handlers = this._topicHandlersMap.get(topic);
        if (handlers) {
            handlers.splice(handlers.indexOf(handler) >>> 0, 1);
        }
    }
    /**
     * Subscribe to the handler as * to all topics.
     * @param handler The handler to subscribe to all events.
     */
    onAll(handler) {
        this._wildcardHandlers.push(handler);
    }
    /**
     * Unsubscribe the handler from all topics.
     * @param handler The handler to unsubscribe from all events.
     */
    offAll(handler) {
        const handlerIndex = this._wildcardHandlers.indexOf(handler);
        if (handlerIndex > -1) {
            this._wildcardHandlers.splice(handlerIndex >>> 0, 1);
        }
    }
    /**
     * Publishes an event to the topic on the bus.
     * @param topic The topic to publish to.
     * @param data The data portion of the event.
     * @param sync Whether or not this message needs to be synced on local stoage.
     * @param isCached Whether or not this message will be resync'd across the bus on load.
     */
    pub(topic, data, sync = false, isCached = true) {
        if (isCached) {
            this._eventCache.set(topic, { data: data, synced: sync });
        }
        const handlers = this._topicHandlersMap.get(topic);
        if (handlers !== undefined) {
            const len = handlers.length;
            for (let i = 0; i < len; i++) {
                try {
                    handlers[i](data);
                }
                catch (error) {
                    console.error(`Error in EventBus Handler: ${error}`);
                    if (error instanceof Error) {
                        console.error(error.stack);
                    }
                }
            }
        }
        // We don't know if anything is subscribed on busses in other instruments,
        // so we'll unconditionally sync if sync is true and trust that the
        // publisher knows what it's doing.
        if (sync) {
            this.syncEvent(topic, data, isCached);
        }
        // always push to wildcard handlers
        const wcLen = this._wildcardHandlers.length;
        for (let i = 0; i < wcLen; i++) {
            this._wildcardHandlers[i](topic, data);
        }
    }
    /**
     * Re-sync all synced events
     */
    resyncEvents() {
        for (const [topic, event] of this._eventCache) {
            if (event.synced) {
                this.syncEvent(topic, event.data, true);
            }
        }
    }
    /**
     * Publish an event to the sync bus.
     * @param topic The topic to publish to.
     * @param data The data to publish.
     * @param isCached Whether or not this message will be resync'd across the bus on load.
     */
    syncEvent(topic, data, isCached) {
        this._busSync.sendEvent(topic, data, isCached);
    }
    /**
     * Gets a typed publisher from the event bus..
     * @returns The typed publisher.
     */
    getPublisher() {
        return this;
    }
    /**
     * Gets a typed subscriber from the event bus.
     * @returns The typed subscriber.
     */
    getSubscriber() {
        return new EventSubscriber(this);
    }
}
/**
 * A class that manages event bus synchronization via data storage.
 */
class EventBusStorageSync {
    /**
     * Creates an instance of EventBusStorageSync.
     * @param recvEventCb A callback to execute when an event is received on the bus.
     * @param busId The ID of the bus.  Derp.
     */
    constructor(recvEventCb, busId) {
        this.recvEventCb = recvEventCb;
        this.busId = busId;
        window.addEventListener('storage', this.receiveEvent.bind(this));
    }
    /**
     * Sends an event via storage events.
     * @param topic The topic to send data on.
     * @param data The data to send.
     */
    sendEvent(topic, data) {
        // TODO can we do the stringing more gc friendly?
        // TODO we could not stringify on simple types, but the receiver wouldn't know I guess
        // TODO add handling for busIds to avoid message loops
        localStorage.setItem(EventBusStorageSync.EB_KEY, `${topic.toString()},${data !== undefined ? JSON.stringify(data) : EventBusStorageSync.EMPTY_DATA}`);
        // TODO move removeItem to a function called at intervals instead of every time?
        localStorage.removeItem(EventBusStorageSync.EB_KEY);
    }
    /**
     * Receives an event from storage and syncs onto the bus.
     * @param e The storage event that was received.
     */
    receiveEvent(e) {
        // TODO only react on topics that have subscribers
        if (e.key === EventBusStorageSync.EB_KEY && e.newValue) {
            const val = e.newValue.split(',');
            this.recvEventCb(val[0], val.length > 1 ? JSON.parse(val[1]) : undefined, true);
        }
    }
}
EventBusStorageSync.EMPTY_DATA = '{}';
EventBusStorageSync.EB_KEY = 'eb.evt';
/**
 * A class that manages event bus synchronization via Coherent notifications.
 */
class EventBusCoherentSync {
    /**
     * Creates an instance of EventBusCoherentSync.
     * @param recvEventCb A callback to execute when an event is received on the bus.
     * @param busId The ID of the bus.  Derp.
     */
    constructor(recvEventCb, busId) {
        this.evtNum = 0;
        this.lastEventSynced = -1;
        this.recvEventCb = recvEventCb;
        this.busId = busId;
        this.listener = RegisterViewListener(EventBusCoherentSync.EB_LISTENER_KEY);
        this.listener.on(EventBusCoherentSync.EB_KEY, this.receiveEvent.bind(this));
    }
    /**
     * Sends an event via Coherent events.
     * @param topic The topic to send data on.
     * @param data The data to send.
     * @param isCached Whether or not this event is cached.
     */
    sendEvent(topic, data, isCached) {
        this.listener.triggerToAllSubscribers(EventBusCoherentSync.EB_KEY, { topic, data, isCached, busId: this.busId, evtNum: this.evtNum++ });
    }
    /**
     * Receives an event via Coherent and syncs onto the bus.
     * @param e The storage event that was received.
     */
    receiveEvent(e) {
        // If we've sent this event, don't act on it.
        if (e.busId == this.busId) {
            return;
        }
        if (this.lastEventSynced !== e.evtNum) {
            // TODO only react on topics that have subscribers
            this.lastEventSynced = e.evtNum;
            this.recvEventCb(e['topic'], e['data'], undefined, e['isCached']);
        }
    }
}
EventBusCoherentSync.EMPTY_DATA = '{}';
EventBusCoherentSync.EB_KEY = 'eb.evt';
EventBusCoherentSync.EB_LISTENER_KEY = 'JS_LISTENER_SIMVARS';

/**
 * A basic event-bus publisher.
 */
class BasePublisher {
    /**
     * Creates an instance of BasePublisher.
     * @param bus The common event bus.
     * @param pacer An optional pacer to control the rate of publishing.
     */
    constructor(bus, pacer = undefined) {
        this.bus = bus;
        this.publisher = this.bus.getPublisher();
        this.publishActive = false;
        this.pacer = pacer;
    }
    /**
     * Start publishing.
     */
    startPublish() {
        this.publishActive = true;
    }
    /**
     * Stop publishing.
     */
    stopPublish() {
        this.publishActive = false;
    }
    /**
     * Tells whether or not the publisher is currently active.
     * @returns True if the publisher is active, false otherwise.
     */
    isPublishing() {
        return this.publishActive;
    }
    /**
     * A callback called when the publisher receives an update cycle.
     */
    onUpdate() {
        return;
    }
    /**
     * Publish a message if publishing is acpive
     * @param topic The topic key to publish to.
     * @param data The data type for chosen topic.
     * @param sync Whether or not the event should be synced via local storage.
     * @param isCached Whether or not the event should be cached.
     */
    publish(topic, data, sync = false, isCached = true) {
        if (this.publishActive && (!this.pacer || this.pacer.canPublish(topic, data))) {
            this.publisher.pub(topic, data, sync, isCached);
        }
    }
}
/**
 * A base class for publishers that need to handle simvars with built-in
 * support for pacing callbacks.
 */
class SimVarPublisher extends BasePublisher {
    /**
     * Create a SimVarPublisher
     * @param simVarMap A map of simvar event type keys to a SimVarDefinition.
     * @param bus The EventBus to use for publishing.
     * @param pacer An optional pacer to control the rate of publishing.
     */
    constructor(simVarMap, bus, pacer = undefined) {
        super(bus, pacer);
        this.simvars = simVarMap;
        this.subscribed = new Set();
    }
    /**
     * Subscribe to an event type to begin publishing.
     * @param data Key of the event type in the simVarMap
     */
    subscribe(data) {
        this.subscribed.add(data);
    }
    /**
     * Unsubscribe to an event to stop publishing.
     * @param data Key of the event type in the simVarMap
     */
    unsubscribe(data) {
        // TODO If we have multiple subscribers we may want to add reference counting here.
        this.subscribed.delete(data);
    }
    /**
     * Read the value of a given simvar by its key.
     * @param key The key of the simvar in simVarMap
     * @returns The value returned by SimVar.GetSimVarValue()
     */
    getValue(key) {
        const simvar = this.simvars.get(key);
        if (simvar === undefined) {
            return undefined;
        }
        return SimVar.GetSimVarValue(simvar.name, simvar.type);
    }
    /**
     * Publish all subscribed data points to the bus.
     */
    onUpdate() {
        for (const data of this.subscribed.values()) {
            const value = this.getValue(data);
            if (value !== undefined) {
                this.publish(data, value);
            }
        }
    }
    /**
     * Change the simvar read for a given key.
     * @param key The key of the simvar in simVarMap
     * @param value The new value to set the simvar to.
     */
    updateSimVarSource(key, value) {
        this.simvars.set(key, value);
    }
}

/**
 * Valid type arguments for Set/GetSimVarValue
 */
var SimVarValueType;
(function (SimVarValueType) {
    SimVarValueType["Number"] = "number";
    SimVarValueType["Degree"] = "degrees";
    SimVarValueType["Knots"] = "knots";
    SimVarValueType["Feet"] = "feet";
    SimVarValueType["Meters"] = "meters";
    SimVarValueType["FPM"] = "feet per minute";
    SimVarValueType["Radians"] = "radians";
    SimVarValueType["InHG"] = "inches of mercury";
    SimVarValueType["MB"] = "Millibars";
    SimVarValueType["Bool"] = "Bool";
    SimVarValueType["Celsius"] = "celsius";
    SimVarValueType["MHz"] = "MHz";
    SimVarValueType["KHz"] = "KHz";
    SimVarValueType["NM"] = "nautical mile";
    SimVarValueType["String"] = "string";
    SimVarValueType["RPM"] = "Rpm";
    SimVarValueType["PPH"] = "Pounds per hour";
    SimVarValueType["GPH"] = "gph";
    SimVarValueType["Farenheit"] = "farenheit";
    SimVarValueType["PSI"] = "psi";
    SimVarValueType["GAL"] = "gallons";
    SimVarValueType["Hours"] = "Hours";
    SimVarValueType["Volts"] = "Volts";
    SimVarValueType["Amps"] = "Amperes";
    SimVarValueType["Seconds"] = "seconds";
    SimVarValueType["Enum"] = "Enum";
    SimVarValueType["LLA"] = "latlonalt";
    SimVarValueType["MetersPerSecond"] = "meters per second";
})(SimVarValueType || (SimVarValueType = {}));

/// <reference types="msfstypes/Pages/VCockpit/Instruments/Shared/utils/XMLLogic" />
/** The kind of data to return. */
var CompositeLogicXMLValueType;
(function (CompositeLogicXMLValueType) {
    CompositeLogicXMLValueType[CompositeLogicXMLValueType["Any"] = 0] = "Any";
    CompositeLogicXMLValueType[CompositeLogicXMLValueType["Number"] = 1] = "Number";
    CompositeLogicXMLValueType[CompositeLogicXMLValueType["String"] = 2] = "String";
})(CompositeLogicXMLValueType || (CompositeLogicXMLValueType = {}));

/// <reference types="msfstypes/JS/dataStorage" />
/* eslint-disable no-inner-declarations */
// eslint-disable-next-line @typescript-eslint/no-namespace
var DataStore;
(function (DataStore) {
    /**
     * Writes a keyed value to the data store.
     * @param key A key.
     * @param value The value to set.
     */
    function set(key, value) {
        SetStoredData(key, JSON.stringify(value));
    }
    DataStore.set = set;
    /**
     * Retrieves a keyed value from the data store.
     * @param key A key.
     * @returns the value stored under the key, or undefined if one could not be retrieved.
     */
    function get(key) {
        try {
            const string = GetStoredData(key);
            return JSON.parse(string);
        }
        catch (e) {
            return undefined;
        }
    }
    DataStore.get = get;
    /**
     * Removes a key from the data store.
     * @param key The key to remove.
     */
    function remove(key) {
        DeleteStoredData(key);
    }
    DataStore.remove = remove;
})(DataStore || (DataStore = {}));

/**
 * A subscribable subject which derives its value from an event consumer.
 */
class ConsumerSubject extends AbstractSubscribable {
    /**
     * Constructor.
     * @param consumer The event consumer from which this subject obtains its value.
     * @param initialVal This subject's initial value.
     * @param equalityFunc The function this subject uses check for equality between values.
     * @param mutateFunc The function this subject uses to change its value. If not defined, variable assignment is used
     * instead.
     */
    constructor(consumer, initialVal, equalityFunc, mutateFunc) {
        super();
        this.consumer = consumer;
        this.equalityFunc = equalityFunc;
        this.mutateFunc = mutateFunc;
        this.consumerHandler = this.onEventConsumed.bind(this);
        this.value = initialVal;
        consumer.handle(this.consumerHandler);
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    static create(consumer, initialVal, equalityFunc, mutateFunc) {
        return new ConsumerSubject(consumer, initialVal, equalityFunc !== null && equalityFunc !== void 0 ? equalityFunc : AbstractSubscribable.DEFAULT_EQUALITY_FUNC, mutateFunc);
    }
    /**
     * Consumes an event.
     * @param value The value of the event.
     */
    onEventConsumed(value) {
        if (!this.equalityFunc(this.value, value)) {
            if (this.mutateFunc) {
                this.mutateFunc(this.value, value);
            }
            else {
                this.value = value;
            }
            this.notify();
        }
    }
    /** @inheritdoc */
    get() {
        return this.value;
    }
    // eslint-disable-next-line jsdoc/require-jsdoc
    map(fn, equalityFunc, mutateFunc, initialVal) {
        const mapFunc = (inputs, previousVal) => fn(inputs[0], previousVal);
        return mutateFunc
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            ? MappedSubject.create(mapFunc, equalityFunc, mutateFunc, initialVal, this)
            : MappedSubject.create(mapFunc, equalityFunc !== null && equalityFunc !== void 0 ? equalityFunc : AbstractSubscribable.DEFAULT_EQUALITY_FUNC, this);
    }
    /**
     * Destroys this subject. Once destroyed, it will no longer consume events to update its value.
     */
    destroy() {
        this.consumer.off(this.consumerHandler);
    }
}

/**
 * Types of airspaces.
 */
var AirspaceType;
(function (AirspaceType) {
    AirspaceType[AirspaceType["None"] = 0] = "None";
    AirspaceType[AirspaceType["Center"] = 1] = "Center";
    AirspaceType[AirspaceType["ClassA"] = 2] = "ClassA";
    AirspaceType[AirspaceType["ClassB"] = 3] = "ClassB";
    AirspaceType[AirspaceType["ClassC"] = 4] = "ClassC";
    AirspaceType[AirspaceType["ClassD"] = 5] = "ClassD";
    AirspaceType[AirspaceType["ClassE"] = 6] = "ClassE";
    AirspaceType[AirspaceType["ClassF"] = 7] = "ClassF";
    AirspaceType[AirspaceType["ClassG"] = 8] = "ClassG";
    AirspaceType[AirspaceType["Tower"] = 9] = "Tower";
    AirspaceType[AirspaceType["Clearance"] = 10] = "Clearance";
    AirspaceType[AirspaceType["Ground"] = 11] = "Ground";
    AirspaceType[AirspaceType["Departure"] = 12] = "Departure";
    AirspaceType[AirspaceType["Approach"] = 13] = "Approach";
    AirspaceType[AirspaceType["MOA"] = 14] = "MOA";
    AirspaceType[AirspaceType["Restricted"] = 15] = "Restricted";
    AirspaceType[AirspaceType["Prohibited"] = 16] = "Prohibited";
    AirspaceType[AirspaceType["Warning"] = 17] = "Warning";
    AirspaceType[AirspaceType["Alert"] = 18] = "Alert";
    AirspaceType[AirspaceType["Danger"] = 19] = "Danger";
    AirspaceType[AirspaceType["Nationalpark"] = 20] = "Nationalpark";
    AirspaceType[AirspaceType["ModeC"] = 21] = "ModeC";
    AirspaceType[AirspaceType["Radar"] = 22] = "Radar";
    AirspaceType[AirspaceType["Training"] = 23] = "Training";
    AirspaceType[AirspaceType["Max"] = 24] = "Max";
})(AirspaceType || (AirspaceType = {}));

/**
 * A viewlistener that gets autopilot mode information.
 */
var MSFSAPStates;
(function (MSFSAPStates) {
    MSFSAPStates[MSFSAPStates["LogicOn"] = 1] = "LogicOn";
    MSFSAPStates[MSFSAPStates["APOn"] = 2] = "APOn";
    MSFSAPStates[MSFSAPStates["FDOn"] = 4] = "FDOn";
    MSFSAPStates[MSFSAPStates["FLC"] = 8] = "FLC";
    MSFSAPStates[MSFSAPStates["Alt"] = 16] = "Alt";
    MSFSAPStates[MSFSAPStates["AltArm"] = 32] = "AltArm";
    MSFSAPStates[MSFSAPStates["GS"] = 64] = "GS";
    MSFSAPStates[MSFSAPStates["GSArm"] = 128] = "GSArm";
    MSFSAPStates[MSFSAPStates["Pitch"] = 256] = "Pitch";
    MSFSAPStates[MSFSAPStates["VS"] = 512] = "VS";
    MSFSAPStates[MSFSAPStates["Heading"] = 1024] = "Heading";
    MSFSAPStates[MSFSAPStates["Nav"] = 2048] = "Nav";
    MSFSAPStates[MSFSAPStates["NavArm"] = 4096] = "NavArm";
    MSFSAPStates[MSFSAPStates["WingLevel"] = 8192] = "WingLevel";
    MSFSAPStates[MSFSAPStates["Attitude"] = 16384] = "Attitude";
    MSFSAPStates[MSFSAPStates["ThrottleSpd"] = 32768] = "ThrottleSpd";
    MSFSAPStates[MSFSAPStates["ThrottleMach"] = 65536] = "ThrottleMach";
    MSFSAPStates[MSFSAPStates["ATArm"] = 131072] = "ATArm";
    MSFSAPStates[MSFSAPStates["YD"] = 262144] = "YD";
    MSFSAPStates[MSFSAPStates["EngineRPM"] = 524288] = "EngineRPM";
    MSFSAPStates[MSFSAPStates["TOGAPower"] = 1048576] = "TOGAPower";
    MSFSAPStates[MSFSAPStates["Autoland"] = 2097152] = "Autoland";
    MSFSAPStates[MSFSAPStates["TOGAPitch"] = 4194304] = "TOGAPitch";
    MSFSAPStates[MSFSAPStates["Bank"] = 8388608] = "Bank";
    MSFSAPStates[MSFSAPStates["FBW"] = 16777216] = "FBW";
    MSFSAPStates[MSFSAPStates["AvionicsManaged"] = 33554432] = "AvionicsManaged";
    MSFSAPStates[MSFSAPStates["None"] = -2147483648] = "None";
})(MSFSAPStates || (MSFSAPStates = {}));

/// <reference types="msfstypes/JS/Simplane" />
/**
 * The available facility frequency types.
 */
var FacilityFrequencyType;
(function (FacilityFrequencyType) {
    FacilityFrequencyType[FacilityFrequencyType["None"] = 0] = "None";
    FacilityFrequencyType[FacilityFrequencyType["ATIS"] = 1] = "ATIS";
    FacilityFrequencyType[FacilityFrequencyType["Multicom"] = 2] = "Multicom";
    FacilityFrequencyType[FacilityFrequencyType["Unicom"] = 3] = "Unicom";
    FacilityFrequencyType[FacilityFrequencyType["CTAF"] = 4] = "CTAF";
    FacilityFrequencyType[FacilityFrequencyType["Ground"] = 5] = "Ground";
    FacilityFrequencyType[FacilityFrequencyType["Tower"] = 6] = "Tower";
    FacilityFrequencyType[FacilityFrequencyType["Clearance"] = 7] = "Clearance";
    FacilityFrequencyType[FacilityFrequencyType["Approach"] = 8] = "Approach";
    FacilityFrequencyType[FacilityFrequencyType["Departure"] = 9] = "Departure";
    FacilityFrequencyType[FacilityFrequencyType["Center"] = 10] = "Center";
    FacilityFrequencyType[FacilityFrequencyType["FSS"] = 11] = "FSS";
    FacilityFrequencyType[FacilityFrequencyType["AWOS"] = 12] = "AWOS";
    FacilityFrequencyType[FacilityFrequencyType["ASOS"] = 13] = "ASOS";
    /** Clearance Pre-Taxi*/
    FacilityFrequencyType[FacilityFrequencyType["CPT"] = 14] = "CPT";
    /** Remote Clearance Delivery */
    FacilityFrequencyType[FacilityFrequencyType["GCO"] = 15] = "GCO";
})(FacilityFrequencyType || (FacilityFrequencyType = {}));
/** Additional Approach Types (additive to those defined in simplane). */
var AdditionalApproachType;
(function (AdditionalApproachType) {
    AdditionalApproachType[AdditionalApproachType["APPROACH_TYPE_VISUAL"] = 99] = "APPROACH_TYPE_VISUAL";
})(AdditionalApproachType || (AdditionalApproachType = {}));
/**
 * Flags indicating the approach fix type.
 */
var FixTypeFlags;
(function (FixTypeFlags) {
    FixTypeFlags[FixTypeFlags["None"] = 0] = "None";
    FixTypeFlags[FixTypeFlags["IAF"] = 1] = "IAF";
    FixTypeFlags[FixTypeFlags["IF"] = 2] = "IF";
    FixTypeFlags[FixTypeFlags["MAP"] = 4] = "MAP";
    FixTypeFlags[FixTypeFlags["FAF"] = 8] = "FAF";
    FixTypeFlags[FixTypeFlags["MAHP"] = 16] = "MAHP";
})(FixTypeFlags || (FixTypeFlags = {}));
/**
 * Flags indicating the rnav approach type.
 */
var RnavTypeFlags;
(function (RnavTypeFlags) {
    RnavTypeFlags[RnavTypeFlags["None"] = 0] = "None";
    RnavTypeFlags[RnavTypeFlags["LNAV"] = 1] = "LNAV";
    RnavTypeFlags[RnavTypeFlags["LNAVVNAV"] = 2] = "LNAVVNAV";
    RnavTypeFlags[RnavTypeFlags["LP"] = 4] = "LP";
    RnavTypeFlags[RnavTypeFlags["LPV"] = 8] = "LPV";
})(RnavTypeFlags || (RnavTypeFlags = {}));
/**
 * The class of airport facility.
 */
var AirportClass;
(function (AirportClass) {
    /** No other airport class could be identified. */
    AirportClass[AirportClass["None"] = 0] = "None";
    /** The airport has at least one hard surface runway. */
    AirportClass[AirportClass["HardSurface"] = 1] = "HardSurface";
    /** The airport has no hard surface runways. */
    AirportClass[AirportClass["SoftSurface"] = 2] = "SoftSurface";
    /** The airport has only water surface runways. */
    AirportClass[AirportClass["AllWater"] = 3] = "AllWater";
    /** The airport has no runways, but does contain helipads. */
    AirportClass[AirportClass["HeliportOnly"] = 4] = "HeliportOnly";
    /** The airport is a non-public use airport. */
    AirportClass[AirportClass["Private"] = 5] = "Private";
})(AirportClass || (AirportClass = {}));
/**
 * The class of an airport facility, expressed as a mask for nearest airport search session filtering.
 */
var AirportClassMask;
(function (AirportClassMask) {
    /** No other airport class could be identified. */
    AirportClassMask[AirportClassMask["None"] = 0] = "None";
    /** The airport has at least one hard surface runway. */
    AirportClassMask[AirportClassMask["HardSurface"] = 2] = "HardSurface";
    /** The airport has no hard surface runways. */
    AirportClassMask[AirportClassMask["SoftSurface"] = 4] = "SoftSurface";
    /** The airport has only water surface runways. */
    AirportClassMask[AirportClassMask["AllWater"] = 8] = "AllWater";
    /** The airport has no runways, but does contain helipads. */
    AirportClassMask[AirportClassMask["HeliportOnly"] = 16] = "HeliportOnly";
    /** The airport is a non-public use airport. */
    AirportClassMask[AirportClassMask["Private"] = 32] = "Private";
})(AirportClassMask || (AirportClassMask = {}));
var UserFacilityType;
(function (UserFacilityType) {
    UserFacilityType[UserFacilityType["RADIAL_RADIAL"] = 0] = "RADIAL_RADIAL";
    UserFacilityType[UserFacilityType["RADIAL_DISTANCE"] = 1] = "RADIAL_DISTANCE";
    UserFacilityType[UserFacilityType["LAT_LONG"] = 2] = "LAT_LONG";
})(UserFacilityType || (UserFacilityType = {}));
/**
 * ARINC 424 Leg Types
 */
var LegType;
(function (LegType) {
    /** An unknown leg type. */
    LegType[LegType["Unknown"] = 0] = "Unknown";
    /** An arc-to-fix leg. This indicates a DME arc leg to a specified fix.*/
    LegType[LegType["AF"] = 1] = "AF";
    /** A course-to-altitude leg. */
    LegType[LegType["CA"] = 2] = "CA";
    /**
     * A course-to-DME-distance leg. This leg is flown on a wind corrected course
     * to a specific DME distance from another fix.
     */
    LegType[LegType["CD"] = 3] = "CD";
    /** A course-to-fix leg.*/
    LegType[LegType["CF"] = 4] = "CF";
    /** A course-to-intercept leg. */
    LegType[LegType["CI"] = 5] = "CI";
    /** A course-to-radial intercept leg. */
    LegType[LegType["CR"] = 6] = "CR";
    /** A direct-to-fix leg, from an unspecified starting position. */
    LegType[LegType["DF"] = 7] = "DF";
    /**
     * A fix-to-altitude leg. A FA leg is flown on a track from a fix to a
     * specified altitude.
     */
    LegType[LegType["FA"] = 8] = "FA";
    /**
     * A fix-to-distance leg. This leg is flown on a track from a fix to a
     * specific distance from the fix.
     */
    LegType[LegType["FC"] = 9] = "FC";
    /**
     * A fix to DME distance leg. This leg is flown on a track from a fix to
     * a specific DME distance from another fix.
     */
    LegType[LegType["FD"] = 10] = "FD";
    /** A course-to-manual-termination leg. */
    LegType[LegType["FM"] = 11] = "FM";
    /** A hold-to-altitude leg. The hold is flown until a specified altitude is reached. */
    LegType[LegType["HA"] = 12] = "HA";
    /**
     * A hold-to-fix leg. This indicates one time around the hold circuit and
     * then an exit.
     */
    LegType[LegType["HF"] = 13] = "HF";
    /** A hold-to-manual-termination leg. */
    LegType[LegType["HM"] = 14] = "HM";
    /** Initial procedure fix. */
    LegType[LegType["IF"] = 15] = "IF";
    /** A procedure turn leg. */
    LegType[LegType["PI"] = 16] = "PI";
    /** A radius-to-fix leg, with endpoint fixes, a center fix, and a radius. */
    LegType[LegType["RF"] = 17] = "RF";
    /** A track-to-fix leg, from the previous fix to the terminator. */
    LegType[LegType["TF"] = 18] = "TF";
    /** A heading-to-altitude leg. */
    LegType[LegType["VA"] = 19] = "VA";
    /** A heading-to-DME-distance leg. */
    LegType[LegType["VD"] = 20] = "VD";
    /** A heading-to-intercept leg. */
    LegType[LegType["VI"] = 21] = "VI";
    /** A heading-to-manual-termination leg. */
    LegType[LegType["VM"] = 22] = "VM";
    /** A heading-to-radial intercept leg. */
    LegType[LegType["VR"] = 23] = "VR";
    /** A leg representing a discontinuity in the flight plan. */
    LegType[LegType["Discontinuity"] = 99] = "Discontinuity";
})(LegType || (LegType = {}));
/**
 * Types of altitude restrictions on procedure legs.
 */
var AltitudeRestrictionType;
(function (AltitudeRestrictionType) {
    AltitudeRestrictionType[AltitudeRestrictionType["Unused"] = 0] = "Unused";
    AltitudeRestrictionType[AltitudeRestrictionType["At"] = 1] = "At";
    AltitudeRestrictionType[AltitudeRestrictionType["AtOrAbove"] = 2] = "AtOrAbove";
    AltitudeRestrictionType[AltitudeRestrictionType["AtOrBelow"] = 3] = "AtOrBelow";
    AltitudeRestrictionType[AltitudeRestrictionType["Between"] = 4] = "Between";
})(AltitudeRestrictionType || (AltitudeRestrictionType = {}));
var LegTurnDirection;
(function (LegTurnDirection) {
    LegTurnDirection[LegTurnDirection["None"] = 0] = "None";
    LegTurnDirection[LegTurnDirection["Left"] = 1] = "Left";
    LegTurnDirection[LegTurnDirection["Right"] = 2] = "Right";
    LegTurnDirection[LegTurnDirection["Either"] = 3] = "Either";
})(LegTurnDirection || (LegTurnDirection = {}));
var AirwayType;
(function (AirwayType) {
    AirwayType[AirwayType["None"] = 0] = "None";
    AirwayType[AirwayType["Victor"] = 1] = "Victor";
    AirwayType[AirwayType["Jet"] = 2] = "Jet";
    AirwayType[AirwayType["Both"] = 3] = "Both";
})(AirwayType || (AirwayType = {}));
var NdbType;
(function (NdbType) {
    NdbType[NdbType["CompassPoint"] = 0] = "CompassPoint";
    NdbType[NdbType["MH"] = 1] = "MH";
    NdbType[NdbType["H"] = 2] = "H";
    NdbType[NdbType["HH"] = 3] = "HH";
})(NdbType || (NdbType = {}));
var VorType;
(function (VorType) {
    VorType[VorType["Unknown"] = 0] = "Unknown";
    VorType[VorType["VOR"] = 1] = "VOR";
    VorType[VorType["VORDME"] = 2] = "VORDME";
    VorType[VorType["DME"] = 3] = "DME";
    VorType[VorType["TACAN"] = 4] = "TACAN";
    VorType[VorType["VORTAC"] = 5] = "VORTAC";
    VorType[VorType["ILS"] = 6] = "ILS";
    VorType[VorType["VOT"] = 7] = "VOT";
})(VorType || (VorType = {}));
var RunwaySurfaceType;
(function (RunwaySurfaceType) {
    RunwaySurfaceType[RunwaySurfaceType["Concrete"] = 0] = "Concrete";
    RunwaySurfaceType[RunwaySurfaceType["Grass"] = 1] = "Grass";
    RunwaySurfaceType[RunwaySurfaceType["WaterFSX"] = 2] = "WaterFSX";
    RunwaySurfaceType[RunwaySurfaceType["GrassBumpy"] = 3] = "GrassBumpy";
    RunwaySurfaceType[RunwaySurfaceType["Asphalt"] = 4] = "Asphalt";
    RunwaySurfaceType[RunwaySurfaceType["ShortGrass"] = 5] = "ShortGrass";
    RunwaySurfaceType[RunwaySurfaceType["LongGrass"] = 6] = "LongGrass";
    RunwaySurfaceType[RunwaySurfaceType["HardTurf"] = 7] = "HardTurf";
    RunwaySurfaceType[RunwaySurfaceType["Snow"] = 8] = "Snow";
    RunwaySurfaceType[RunwaySurfaceType["Ice"] = 9] = "Ice";
    RunwaySurfaceType[RunwaySurfaceType["Urban"] = 10] = "Urban";
    RunwaySurfaceType[RunwaySurfaceType["Forest"] = 11] = "Forest";
    RunwaySurfaceType[RunwaySurfaceType["Dirt"] = 12] = "Dirt";
    RunwaySurfaceType[RunwaySurfaceType["Coral"] = 13] = "Coral";
    RunwaySurfaceType[RunwaySurfaceType["Gravel"] = 14] = "Gravel";
    RunwaySurfaceType[RunwaySurfaceType["OilTreated"] = 15] = "OilTreated";
    RunwaySurfaceType[RunwaySurfaceType["SteelMats"] = 16] = "SteelMats";
    RunwaySurfaceType[RunwaySurfaceType["Bituminous"] = 17] = "Bituminous";
    RunwaySurfaceType[RunwaySurfaceType["Brick"] = 18] = "Brick";
    RunwaySurfaceType[RunwaySurfaceType["Macadam"] = 19] = "Macadam";
    RunwaySurfaceType[RunwaySurfaceType["Planks"] = 20] = "Planks";
    RunwaySurfaceType[RunwaySurfaceType["Sand"] = 21] = "Sand";
    RunwaySurfaceType[RunwaySurfaceType["Shale"] = 22] = "Shale";
    RunwaySurfaceType[RunwaySurfaceType["Tarmac"] = 23] = "Tarmac";
    RunwaySurfaceType[RunwaySurfaceType["WrightFlyerTrack"] = 24] = "WrightFlyerTrack";
    //SURFACE_TYPE_LAST_FSX
    RunwaySurfaceType[RunwaySurfaceType["Ocean"] = 26] = "Ocean";
    RunwaySurfaceType[RunwaySurfaceType["Water"] = 27] = "Water";
    RunwaySurfaceType[RunwaySurfaceType["Pond"] = 28] = "Pond";
    RunwaySurfaceType[RunwaySurfaceType["Lake"] = 29] = "Lake";
    RunwaySurfaceType[RunwaySurfaceType["River"] = 30] = "River";
    RunwaySurfaceType[RunwaySurfaceType["WasteWater"] = 31] = "WasteWater";
    RunwaySurfaceType[RunwaySurfaceType["Paint"] = 32] = "Paint";
    // UNUSED
    // SURFACE_TYPE_ERASE_GRASS
})(RunwaySurfaceType || (RunwaySurfaceType = {}));
var RunwayLightingType;
(function (RunwayLightingType) {
    RunwayLightingType[RunwayLightingType["Unknown"] = 0] = "Unknown";
    RunwayLightingType[RunwayLightingType["None"] = 1] = "None";
    RunwayLightingType[RunwayLightingType["PartTime"] = 2] = "PartTime";
    RunwayLightingType[RunwayLightingType["FullTime"] = 3] = "FullTime";
    RunwayLightingType[RunwayLightingType["Frequency"] = 4] = "Frequency";
})(RunwayLightingType || (RunwayLightingType = {}));
var AirportPrivateType;
(function (AirportPrivateType) {
    AirportPrivateType[AirportPrivateType["Uknown"] = 0] = "Uknown";
    AirportPrivateType[AirportPrivateType["Public"] = 1] = "Public";
    AirportPrivateType[AirportPrivateType["Military"] = 2] = "Military";
    AirportPrivateType[AirportPrivateType["Private"] = 3] = "Private";
})(AirportPrivateType || (AirportPrivateType = {}));
var GpsBoolean;
(function (GpsBoolean) {
    GpsBoolean[GpsBoolean["Unknown"] = 0] = "Unknown";
    GpsBoolean[GpsBoolean["No"] = 1] = "No";
    GpsBoolean[GpsBoolean["Yes"] = 2] = "Yes";
})(GpsBoolean || (GpsBoolean = {}));
var VorClass;
(function (VorClass) {
    VorClass[VorClass["Unknown"] = 0] = "Unknown";
    VorClass[VorClass["Terminal"] = 1] = "Terminal";
    VorClass[VorClass["LowAlt"] = 2] = "LowAlt";
    VorClass[VorClass["HighAlt"] = 3] = "HighAlt";
    VorClass[VorClass["ILS"] = 4] = "ILS";
    VorClass[VorClass["VOT"] = 5] = "VOT";
})(VorClass || (VorClass = {}));
var FacilityType;
(function (FacilityType) {
    FacilityType["Airport"] = "LOAD_AIRPORT";
    FacilityType["Intersection"] = "LOAD_INTERSECTION";
    FacilityType["VOR"] = "LOAD_VOR";
    FacilityType["NDB"] = "LOAD_NDB";
    FacilityType["USR"] = "USR";
    FacilityType["RWY"] = "RWY";
    FacilityType["VIS"] = "VIS";
})(FacilityType || (FacilityType = {}));
var FacilitySearchType;
(function (FacilitySearchType) {
    FacilitySearchType[FacilitySearchType["None"] = 0] = "None";
    FacilitySearchType[FacilitySearchType["Airport"] = 1] = "Airport";
    FacilitySearchType[FacilitySearchType["Intersection"] = 2] = "Intersection";
    FacilitySearchType[FacilitySearchType["Vor"] = 3] = "Vor";
    FacilitySearchType[FacilitySearchType["Ndb"] = 4] = "Ndb";
    FacilitySearchType[FacilitySearchType["Boundary"] = 5] = "Boundary";
    FacilitySearchType[FacilitySearchType["User"] = 6] = "User";
})(FacilitySearchType || (FacilitySearchType = {}));
/**
 * A type of airspace boundary.
 */
var BoundaryType;
(function (BoundaryType) {
    BoundaryType[BoundaryType["None"] = 0] = "None";
    BoundaryType[BoundaryType["Center"] = 1] = "Center";
    BoundaryType[BoundaryType["ClassA"] = 2] = "ClassA";
    BoundaryType[BoundaryType["ClassB"] = 3] = "ClassB";
    BoundaryType[BoundaryType["ClassC"] = 4] = "ClassC";
    BoundaryType[BoundaryType["ClassD"] = 5] = "ClassD";
    BoundaryType[BoundaryType["ClassE"] = 6] = "ClassE";
    BoundaryType[BoundaryType["ClassF"] = 7] = "ClassF";
    BoundaryType[BoundaryType["ClassG"] = 8] = "ClassG";
    BoundaryType[BoundaryType["Tower"] = 9] = "Tower";
    BoundaryType[BoundaryType["Clearance"] = 10] = "Clearance";
    BoundaryType[BoundaryType["Ground"] = 11] = "Ground";
    BoundaryType[BoundaryType["Departure"] = 12] = "Departure";
    BoundaryType[BoundaryType["Approach"] = 13] = "Approach";
    BoundaryType[BoundaryType["MOA"] = 14] = "MOA";
    BoundaryType[BoundaryType["Restricted"] = 15] = "Restricted";
    BoundaryType[BoundaryType["Prohibited"] = 16] = "Prohibited";
    BoundaryType[BoundaryType["Warning"] = 17] = "Warning";
    BoundaryType[BoundaryType["Alert"] = 18] = "Alert";
    BoundaryType[BoundaryType["Danger"] = 19] = "Danger";
    BoundaryType[BoundaryType["NationalPark"] = 20] = "NationalPark";
    BoundaryType[BoundaryType["ModeC"] = 21] = "ModeC";
    BoundaryType[BoundaryType["Radar"] = 22] = "Radar";
    BoundaryType[BoundaryType["Training"] = 23] = "Training";
})(BoundaryType || (BoundaryType = {}));
/**
 * A type of airspace boundary altitude maxima.
 */
var BoundaryAltitudeType;
(function (BoundaryAltitudeType) {
    BoundaryAltitudeType[BoundaryAltitudeType["Unknown"] = 0] = "Unknown";
    BoundaryAltitudeType[BoundaryAltitudeType["MSL"] = 1] = "MSL";
    BoundaryAltitudeType[BoundaryAltitudeType["AGL"] = 2] = "AGL";
    BoundaryAltitudeType[BoundaryAltitudeType["Unlimited"] = 3] = "Unlimited";
})(BoundaryAltitudeType || (BoundaryAltitudeType = {}));
/**
 * A type of boundary geometry vector.
 */
var BoundaryVectorType;
(function (BoundaryVectorType) {
    BoundaryVectorType[BoundaryVectorType["None"] = 0] = "None";
    BoundaryVectorType[BoundaryVectorType["Start"] = 1] = "Start";
    BoundaryVectorType[BoundaryVectorType["Line"] = 2] = "Line";
    BoundaryVectorType[BoundaryVectorType["Origin"] = 3] = "Origin";
    BoundaryVectorType[BoundaryVectorType["ArcCW"] = 4] = "ArcCW";
    BoundaryVectorType[BoundaryVectorType["ArcCCW"] = 5] = "ArcCCW";
    BoundaryVectorType[BoundaryVectorType["Circle"] = 6] = "Circle";
})(BoundaryVectorType || (BoundaryVectorType = {}));
/**
 * Wind speed units used by METAR.
 */
var MetarWindSpeedUnits;
(function (MetarWindSpeedUnits) {
    MetarWindSpeedUnits[MetarWindSpeedUnits["Knot"] = 0] = "Knot";
    MetarWindSpeedUnits[MetarWindSpeedUnits["MeterPerSecond"] = 1] = "MeterPerSecond";
    MetarWindSpeedUnits[MetarWindSpeedUnits["KilometerPerHour"] = 2] = "KilometerPerHour";
})(MetarWindSpeedUnits || (MetarWindSpeedUnits = {}));
/** Visibility distance units used by METAR. */
var MetarVisibilityUnits;
(function (MetarVisibilityUnits) {
    MetarVisibilityUnits[MetarVisibilityUnits["Meter"] = 0] = "Meter";
    MetarVisibilityUnits[MetarVisibilityUnits["StatuteMile"] = 1] = "StatuteMile";
})(MetarVisibilityUnits || (MetarVisibilityUnits = {}));
/**
 * METAR cloud layer coverage/sky condition.
 */
var MetarCloudLayerCoverage;
(function (MetarCloudLayerCoverage) {
    MetarCloudLayerCoverage[MetarCloudLayerCoverage["SkyClear"] = 0] = "SkyClear";
    MetarCloudLayerCoverage[MetarCloudLayerCoverage["Clear"] = 1] = "Clear";
    MetarCloudLayerCoverage[MetarCloudLayerCoverage["NoSignificant"] = 2] = "NoSignificant";
    MetarCloudLayerCoverage[MetarCloudLayerCoverage["Few"] = 3] = "Few";
    MetarCloudLayerCoverage[MetarCloudLayerCoverage["Scattered"] = 4] = "Scattered";
    MetarCloudLayerCoverage[MetarCloudLayerCoverage["Broken"] = 5] = "Broken";
    MetarCloudLayerCoverage[MetarCloudLayerCoverage["Overcast"] = 6] = "Overcast";
})(MetarCloudLayerCoverage || (MetarCloudLayerCoverage = {}));
/**
 * METAR significant cloud types.
 */
var MetarCloudLayerType;
(function (MetarCloudLayerType) {
    MetarCloudLayerType[MetarCloudLayerType["Unspecified"] = -1] = "Unspecified";
    MetarCloudLayerType[MetarCloudLayerType["ToweringCumulus"] = 0] = "ToweringCumulus";
    MetarCloudLayerType[MetarCloudLayerType["Cumulonimbus"] = 1] = "Cumulonimbus";
    MetarCloudLayerType[MetarCloudLayerType["AltocumulusCastellanus"] = 2] = "AltocumulusCastellanus";
})(MetarCloudLayerType || (MetarCloudLayerType = {}));
/** METAR phenomenon types. */
var MetarPhenomenonType;
(function (MetarPhenomenonType) {
    MetarPhenomenonType[MetarPhenomenonType["None"] = 0] = "None";
    MetarPhenomenonType[MetarPhenomenonType["Mist"] = 1] = "Mist";
    MetarPhenomenonType[MetarPhenomenonType["Duststorm"] = 2] = "Duststorm";
    MetarPhenomenonType[MetarPhenomenonType["Dust"] = 3] = "Dust";
    MetarPhenomenonType[MetarPhenomenonType["Drizzle"] = 4] = "Drizzle";
    MetarPhenomenonType[MetarPhenomenonType["FunnelCloud"] = 5] = "FunnelCloud";
    MetarPhenomenonType[MetarPhenomenonType["Fog"] = 6] = "Fog";
    MetarPhenomenonType[MetarPhenomenonType["Smoke"] = 7] = "Smoke";
    MetarPhenomenonType[MetarPhenomenonType["Hail"] = 8] = "Hail";
    MetarPhenomenonType[MetarPhenomenonType["SmallHail"] = 9] = "SmallHail";
    MetarPhenomenonType[MetarPhenomenonType["Haze"] = 10] = "Haze";
    MetarPhenomenonType[MetarPhenomenonType["IceCrystals"] = 11] = "IceCrystals";
    MetarPhenomenonType[MetarPhenomenonType["IcePellets"] = 12] = "IcePellets";
    MetarPhenomenonType[MetarPhenomenonType["DustSandWhorls"] = 13] = "DustSandWhorls";
    MetarPhenomenonType[MetarPhenomenonType["Spray"] = 14] = "Spray";
    MetarPhenomenonType[MetarPhenomenonType["Rain"] = 15] = "Rain";
    MetarPhenomenonType[MetarPhenomenonType["Sand"] = 16] = "Sand";
    MetarPhenomenonType[MetarPhenomenonType["SnowGrains"] = 17] = "SnowGrains";
    MetarPhenomenonType[MetarPhenomenonType["Shower"] = 18] = "Shower";
    MetarPhenomenonType[MetarPhenomenonType["Snow"] = 19] = "Snow";
    MetarPhenomenonType[MetarPhenomenonType["Squalls"] = 20] = "Squalls";
    MetarPhenomenonType[MetarPhenomenonType["Sandstorm"] = 21] = "Sandstorm";
    MetarPhenomenonType[MetarPhenomenonType["UnknownPrecip"] = 22] = "UnknownPrecip";
    MetarPhenomenonType[MetarPhenomenonType["VolcanicAsh"] = 23] = "VolcanicAsh";
})(MetarPhenomenonType || (MetarPhenomenonType = {}));
/** METAR phenomenon intensities. */
var MetarPhenomenonIntensity;
(function (MetarPhenomenonIntensity) {
    MetarPhenomenonIntensity[MetarPhenomenonIntensity["Light"] = -1] = "Light";
    MetarPhenomenonIntensity[MetarPhenomenonIntensity["Normal"] = 0] = "Normal";
    MetarPhenomenonIntensity[MetarPhenomenonIntensity["Heavy"] = 1] = "Heavy";
})(MetarPhenomenonIntensity || (MetarPhenomenonIntensity = {}));

({
    [RunwayDesignator.RUNWAY_DESIGNATOR_NONE]: '',
    [RunwayDesignator.RUNWAY_DESIGNATOR_LEFT]: 'L',
    [RunwayDesignator.RUNWAY_DESIGNATOR_RIGHT]: 'R',
    [RunwayDesignator.RUNWAY_DESIGNATOR_CENTER]: 'C',
    [RunwayDesignator.RUNWAY_DESIGNATOR_WATER]: 'W',
    [RunwayDesignator.RUNWAY_DESIGNATOR_A]: 'A',
    [RunwayDesignator.RUNWAY_DESIGNATOR_B]: 'B',
});
new GeoPoint(0, 0);

/// <reference types="msfstypes/JS/common" />
/**
 * A type map of facility type to facility search type.
 */
({
    /** Airport facility type. */
    [FacilityType.Airport]: FacilitySearchType.Airport,
    /** Intersection facility type. */
    [FacilityType.Intersection]: FacilitySearchType.Intersection,
    /** NDB facility type. */
    [FacilityType.NDB]: FacilitySearchType.Ndb,
    /** VOR facility type. */
    [FacilityType.VOR]: FacilitySearchType.Vor,
    /** USR facility type. */
    [FacilityType.USR]: FacilitySearchType.User
});
[FacilityType.USR];
/**
 * WT Airway Status Enum
 */
var AirwayStatus;
(function (AirwayStatus) {
    /**
     * @readonly
     * @property {number} INCOMPLETE - indicates waypoints have not been loaded yet.
     */
    AirwayStatus[AirwayStatus["INCOMPLETE"] = 0] = "INCOMPLETE";
    /**
     * @readonly
     * @property {number} COMPLETE - indicates all waypoints have been successfully loaded.
     */
    AirwayStatus[AirwayStatus["COMPLETE"] = 1] = "COMPLETE";
    /**
     * @readonly
     * @property {number} PARTIAL - indicates some, but not all, waypoints have been successfully loaded.
     */
    AirwayStatus[AirwayStatus["PARTIAL"] = 2] = "PARTIAL";
})(AirwayStatus || (AirwayStatus = {}));

var FacilityRepositorySyncType;
(function (FacilityRepositorySyncType) {
    FacilityRepositorySyncType[FacilityRepositorySyncType["Add"] = 0] = "Add";
    FacilityRepositorySyncType[FacilityRepositorySyncType["Remove"] = 1] = "Remove";
    FacilityRepositorySyncType[FacilityRepositorySyncType["DumpRequest"] = 2] = "DumpRequest";
    FacilityRepositorySyncType[FacilityRepositorySyncType["DumpResponse"] = 3] = "DumpResponse";
})(FacilityRepositorySyncType || (FacilityRepositorySyncType = {}));

/**
 * A type map of search type to concrete facility loader query type.
 */
new Map([
    [FacilitySearchType.Airport, FacilityType.Airport],
    [FacilitySearchType.Intersection, FacilityType.Intersection],
    [FacilitySearchType.Vor, FacilityType.VOR],
    [FacilitySearchType.Ndb, FacilityType.NDB],
    [FacilitySearchType.User, FacilityType.USR]
]);

[new GeoCircle(new Float64Array(3), 0)];

var IcaoSearchFilter;
(function (IcaoSearchFilter) {
    IcaoSearchFilter[IcaoSearchFilter["ALL"] = 0] = "ALL";
    IcaoSearchFilter[IcaoSearchFilter["AIRPORT"] = 1] = "AIRPORT";
    IcaoSearchFilter[IcaoSearchFilter["VOR"] = 2] = "VOR";
    IcaoSearchFilter[IcaoSearchFilter["NDB"] = 3] = "NDB";
    IcaoSearchFilter[IcaoSearchFilter["INTERSECTION"] = 4] = "INTERSECTION";
    IcaoSearchFilter[IcaoSearchFilter["USR"] = 5] = "USR";
})(IcaoSearchFilter || (IcaoSearchFilter = {}));

/// <reference types="msfstypes/JS/simvar" />
/**
 * A publisher for basic ADC/AHRS information.
 */
class ADCPublisher extends SimVarPublisher {
    /**
     * Create an ADCPublisher
     * @param bus The EventBus to publish to
     * @param pacer An optional pacer to use to control the rate of publishing
     */
    constructor(bus, pacer = undefined) {
        super(ADCPublisher.simvars, bus, pacer);
    }
    /**
     * Updates the ADC publisher.
     */
    onUpdate() {
        super.onUpdate();
    }
}
ADCPublisher.simvars = new Map([
    ['ias', { name: 'AIRSPEED INDICATED', type: SimVarValueType.Knots }],
    ['tas', { name: 'AIRSPEED TRUE', type: SimVarValueType.Knots }],
    ['alt', { name: 'INDICATED ALTITUDE', type: SimVarValueType.Feet }],
    ['vs', { name: 'VERTICAL SPEED', type: SimVarValueType.FPM }],
    ['hdg_deg', { name: 'PLANE HEADING DEGREES MAGNETIC', type: SimVarValueType.Degree }],
    ['pitch_deg', { name: 'PLANE PITCH DEGREES', type: SimVarValueType.Degree }],
    ['roll_deg', { name: 'PLANE BANK DEGREES', type: SimVarValueType.Degree }],
    ['hdg_deg_true', { name: 'PLANE HEADING DEGREES TRUE', type: SimVarValueType.Degree }],
    ['kohlsman_setting_hg_1', { name: 'KOHLSMAN SETTING HG', type: SimVarValueType.InHG }],
    ['turn_coordinator_ball', { name: 'TURN COORDINATOR BALL', type: SimVarValueType.Number }],
    ['delta_heading_rate', { name: 'DELTA HEADING RATE', type: SimVarValueType.Degree }],
    ['ambient_temp_c', { name: 'AMBIENT TEMPERATURE', type: SimVarValueType.Celsius }],
    ['ambient_wind_velocity', { name: 'AMBIENT WIND VELOCITY', type: SimVarValueType.Knots }],
    ['ambient_wind_direction', { name: 'AMBIENT WIND DIRECTION', type: SimVarValueType.Degree }],
    ['kohlsman_setting_mb_1', { name: 'KOHLSMAN SETTING MB', type: SimVarValueType.MB }],
    ['baro_units_hpa_1', { name: 'L:XMLVAR_Baro_Selector_HPA_1', type: SimVarValueType.Bool }],
    ['on_ground', { name: 'SIM ON GROUND', type: SimVarValueType.Bool }],
    ['aoa', { name: 'INCIDENCE ALPHA', type: SimVarValueType.Degree }]
]);

// Common definitions relevant to all radio types.
/** The basic radio types. */
var RadioType;
(function (RadioType) {
    RadioType["Com"] = "COM";
    RadioType["Nav"] = "NAV";
    RadioType["Adf"] = "ADF";
})(RadioType || (RadioType = {}));
/** The two frequency "banks", active and standby. */
var FrequencyBank;
(function (FrequencyBank) {
    FrequencyBank[FrequencyBank["Active"] = 0] = "Active";
    FrequencyBank[FrequencyBank["Standby"] = 1] = "Standby";
})(FrequencyBank || (FrequencyBank = {}));
/** COM frequency spacing on COM radios. */
var ComSpacing;
(function (ComSpacing) {
    /** 25Khz spacing */
    ComSpacing[ComSpacing["Spacing25Khz"] = 0] = "Spacing25Khz";
    /** 8.33Khz spacing */
    ComSpacing[ComSpacing["Spacing833Khz"] = 1] = "Spacing833Khz";
})(ComSpacing || (ComSpacing = {}));

/// <reference types="msfstypes/JS/simvar" />
/** Publish simvars for ourselves */
class NavProcSimVarPublisher extends SimVarPublisher {
    /**
     * Create a NavProcSimVarPublisher
     * @param bus The EventBus to publish to
     * @param pacer An optional pacer to use to control the pace of publishing
     */
    constructor(bus, pacer = undefined) {
        super(NavProcSimVarPublisher.simvars, bus, pacer);
    }
}
NavProcSimVarPublisher.simvars = new Map([
    ['nav1_obs', { name: 'NAV OBS:1', type: SimVarValueType.Degree }],
    ['nav1_cdi', { name: 'NAV CDI:1', type: SimVarValueType.Number }],
    ['nav1_dme', { name: 'NAV DME:1', type: SimVarValueType.NM }],
    ['nav1_has_dme', { name: 'NAV HAS DME:1', type: SimVarValueType.Bool }],
    ['nav1_has_nav', { name: 'NAV HAS NAV:1', type: SimVarValueType.Bool }],
    ['nav1_radial', { name: 'NAV RADIAL:1', type: SimVarValueType.Radians }],
    ['nav1_signal', { name: 'NAV SIGNAL:1', type: SimVarValueType.Number }],
    ['nav1_ident', { name: 'NAV IDENT:1', type: SimVarValueType.String }],
    ['nav1_to_from', { name: 'NAV TOFROM:1', type: SimVarValueType.Enum }],
    ['nav1_localizer', { name: 'NAV HAS LOCALIZER:1', type: SimVarValueType.Bool }],
    ['nav1_localizer_crs', { name: 'NAV LOCALIZER:1', type: SimVarValueType.Number }],
    ['nav1_glideslope', { name: 'NAV HAS GLIDE SLOPE:1', type: SimVarValueType.Bool }],
    ['nav1_gs_error', { name: 'NAV GLIDE SLOPE ERROR:1', type: SimVarValueType.Degree }],
    ['nav1_raw_gs', { name: 'NAV RAW GLIDE SLOPE:1', type: SimVarValueType.Degree }],
    ['nav1_gs_lla', { name: 'NAV GS LATLONALT:1', type: SimVarValueType.LLA }],
    ['nav1_lla', { name: 'NAV VOR LATLONALT:1', type: SimVarValueType.LLA }],
    ['nav1_magvar', { name: 'NAV MAGVAR:1', type: SimVarValueType.Number }],
    ['nav2_obs', { name: 'NAV OBS:2', type: SimVarValueType.Degree }],
    ['nav2_cdi', { name: 'NAV CDI:2', type: SimVarValueType.Number }],
    ['nav2_dme', { name: 'NAV DME:2', type: SimVarValueType.NM }],
    ['nav2_has_dme', { name: 'NAV HAS DME:2', type: SimVarValueType.Bool }],
    ['nav2_has_nav', { name: 'NAV HAS NAV:2', type: SimVarValueType.Bool }],
    ['nav2_radial', { name: 'NAV RADIAL:2', type: SimVarValueType.Radians }],
    ['nav2_signal', { name: 'NAV SIGNAL:2', type: SimVarValueType.Number }],
    ['nav2_ident', { name: 'NAV IDENT:2', type: SimVarValueType.String }],
    ['nav2_to_from', { name: 'NAV TOFROM:2', type: SimVarValueType.Enum }],
    ['nav2_localizer', { name: 'NAV HAS LOCALIZER:2', type: SimVarValueType.Bool }],
    ['nav2_localizer_crs', { name: 'NAV LOCALIZER:2', type: SimVarValueType.Number }],
    ['nav2_glideslope', { name: 'NAV HAS GLIDE SLOPE:2', type: SimVarValueType.Bool }],
    ['nav2_gs_error', { name: 'NAV GLIDE SLOPE ERROR:2', type: SimVarValueType.Degree }],
    ['nav2_raw_gs', { name: 'NAV RAW GLIDE SLOPE:2', type: SimVarValueType.Degree }],
    ['nav2_gs_lla', { name: 'NAV GS LATLONALT:2', type: SimVarValueType.LLA }],
    ['nav2_lla', { name: 'NAV VOR LATLONALT:2', type: SimVarValueType.LLA }],
    ['nav2_magvar', { name: 'NAV MAGVAR:2', type: SimVarValueType.Number }],
    ['gps_dtk', { name: 'GPS WP DESIRED TRACK', type: SimVarValueType.Degree }],
    ['gps_xtk', { name: 'GPS WP CROSS TRK', type: SimVarValueType.NM }],
    ['gps_wp', { name: 'GPS WP NEXT ID', type: SimVarValueType.NM }],
    ['gps_wp_bearing', { name: 'GPS WP BEARING', type: SimVarValueType.Degree }],
    ['gps_wp_distance', { name: 'GPS WP DISTANCE', type: SimVarValueType.NM }],
    ['adf1_bearing', { name: 'ADF RADIAL:1', type: SimVarValueType.Radians }],
    ['adf1_signal', { name: 'ADF SIGNAL:1', type: SimVarValueType.Number }],
    ['mkr_bcn_state_simvar', { name: 'MARKER BEACON STATE', type: SimVarValueType.Number }],
    ['gps_obs_active_simvar', { name: 'GPS OBS ACTIVE', type: SimVarValueType.Bool }],
    ['gps_obs_value_simvar', { name: 'GPS OBS VALUE', type: SimVarValueType.Degree }]
]);
//
// Navigation event configurations
//
var NavSourceType;
(function (NavSourceType) {
    NavSourceType[NavSourceType["Nav"] = 0] = "Nav";
    NavSourceType[NavSourceType["Gps"] = 1] = "Gps";
    NavSourceType[NavSourceType["Adf"] = 2] = "Adf";
})(NavSourceType || (NavSourceType = {}));
//* ENUM for VOR To/From Flag */
var VorToFrom;
(function (VorToFrom) {
    VorToFrom[VorToFrom["OFF"] = 0] = "OFF";
    VorToFrom[VorToFrom["TO"] = 1] = "TO";
    VorToFrom[VorToFrom["FROM"] = 2] = "FROM";
})(VorToFrom || (VorToFrom = {}));
/** Marker beacon signal state. */
var MarkerBeaconState;
(function (MarkerBeaconState) {
    MarkerBeaconState[MarkerBeaconState["Inactive"] = 0] = "Inactive";
    MarkerBeaconState[MarkerBeaconState["Outer"] = 1] = "Outer";
    MarkerBeaconState[MarkerBeaconState["Middle"] = 2] = "Middle";
    MarkerBeaconState[MarkerBeaconState["Inner"] = 3] = "Inner";
})(MarkerBeaconState || (MarkerBeaconState = {}));

/** A publisher to poll and publish nav/com simvars. */
class NavComSimVarPublisher extends SimVarPublisher {
    /**
     * Create a NavComSimVarPublisher
     * @param bus The EventBus to publish to
     * @param pacer An optional pacer to use to control the pace of publishing
     */
    constructor(bus, pacer = undefined) {
        super(NavComSimVarPublisher.simvars, bus, pacer);
    }
}
NavComSimVarPublisher.simvars = new Map([
    ['nav1ActiveFreq', { name: 'NAV ACTIVE FREQUENCY:1', type: SimVarValueType.MHz }],
    ['nav1StandbyFreq', { name: 'NAV STANDBY FREQUENCY:1', type: SimVarValueType.MHz }],
    ['nav1Ident', { name: 'NAV IDENT:1', type: SimVarValueType.String }],
    ['nav2ActiveFreq', { name: 'NAV ACTIVE FREQUENCY:2', type: SimVarValueType.MHz }],
    ['nav2StandbyFreq', { name: 'NAV STANDBY FREQUENCY:2', type: SimVarValueType.MHz }],
    ['nav2Ident', { name: 'NAV IDENT:2', type: SimVarValueType.String }],
    ['com1ActiveFreq', { name: 'COM ACTIVE FREQUENCY:1', type: SimVarValueType.MHz }],
    ['com1StandbyFreq', { name: 'COM STANDBY FREQUENCY:1', type: SimVarValueType.MHz }],
    ['com2ActiveFreq', { name: 'COM ACTIVE FREQUENCY:2', type: SimVarValueType.MHz }],
    ['com2StandbyFreq', { name: 'COM STANDBY FREQUENCY:2', type: SimVarValueType.MHz }],
    ['adf1StandbyFreq', { name: 'ADF STANDBY FREQUENCY:1', type: SimVarValueType.KHz }],
    ['adf1ActiveFreq', { name: 'ADF ACTIVE FREQUENCY:1', type: SimVarValueType.KHz }]
]);

/// <reference types="msfstypes/JS/simvar" />
var APLockType;
(function (APLockType) {
    APLockType[APLockType["Heading"] = 0] = "Heading";
    APLockType[APLockType["Nav"] = 1] = "Nav";
    APLockType[APLockType["Alt"] = 2] = "Alt";
    APLockType[APLockType["Bank"] = 3] = "Bank";
    APLockType[APLockType["WingLevel"] = 4] = "WingLevel";
    APLockType[APLockType["Vs"] = 5] = "Vs";
    APLockType[APLockType["Flc"] = 6] = "Flc";
    APLockType[APLockType["Pitch"] = 7] = "Pitch";
    APLockType[APLockType["Approach"] = 8] = "Approach";
    APLockType[APLockType["Backcourse"] = 9] = "Backcourse";
    APLockType[APLockType["Glideslope"] = 10] = "Glideslope";
    APLockType[APLockType["VNav"] = 11] = "VNav";
})(APLockType || (APLockType = {}));
/** base publisher for simvars */
class APSimVarPublisher extends SimVarPublisher {
    /**
     * Create an APSimVarPublisher
     * @param bus The EventBus to publish to
     * @param pacer An optional pacer to use to control the pace of publishing
     */
    constructor(bus, pacer = undefined) {
        super(APSimVarPublisher.simvars, bus, pacer);
    }
}
APSimVarPublisher.simvars = new Map([
    // TODO extend the next two to handle multiple APs?
    ['selected_heading', { name: 'AUTOPILOT HEADING LOCK DIR:1', type: SimVarValueType.Degree }],
    ['selected_altitude', { name: 'AUTOPILOT ALTITUDE LOCK VAR:1', type: SimVarValueType.Feet }],
    ['ap_master_status', { name: 'AUTOPILOT MASTER', type: SimVarValueType.Bool }],
    ['ap_heading_lock', { name: 'AUTOPILOT HEADING LOCK', type: SimVarValueType.Bool }],
    ['ap_nav_lock', { name: 'AUTOPILOT NAV1 LOCK', type: SimVarValueType.Bool }],
    ['ap_bank_hold', { name: 'AUTOPILOT BANK HOLD', type: SimVarValueType.Bool }],
    ['ap_wing_lvl', { name: 'AUTOPILOT WING LEVELER', type: SimVarValueType.Bool }],
    ['ap_approach_hold', { name: 'AUTOPILOT APPROACH HOLD', type: SimVarValueType.Bool }],
    ['ap_backcourse_hold', { name: 'AUTOPILOT BACKCOURSE HOLD', type: SimVarValueType.Bool }],
    ['ap_vs_hold', { name: 'AUTOPILOT VERTICAL HOLD', type: SimVarValueType.Bool }],
    ['ap_flc_hold', { name: 'AUTOPILOT FLIGHT LEVEL CHANGE', type: SimVarValueType.Bool }],
    ['ap_alt_lock', { name: 'AUTOPILOT ALTITUDE LOCK', type: SimVarValueType.Bool }],
    ['ap_glideslope_hold', { name: 'AUTOPILOT GLIDESLOPE HOLD', type: SimVarValueType.Bool }],
    ['ap_pitch_hold', { name: 'AUTOPILOT PITCH HOLD', type: SimVarValueType.Bool }],
    ['vs_hold_fpm', { name: 'AUTOPILOT VERTICAL HOLD VAR:1', type: SimVarValueType.FPM }],
    ['flc_hold_knots', { name: 'AUTOPILOT AIRSPEED HOLD VAR', type: SimVarValueType.Knots }],
    ['flight_director_bank', { name: 'AUTOPILOT FLIGHT DIRECTOR BANK', type: SimVarValueType.Degree }],
    ['flight_director_pitch', { name: 'AUTOPILOT FLIGHT DIRECTOR PITCH', type: SimVarValueType.Degree }],
    ['flight_director_lock', { name: 'AUTOPILOT FLIGHT DIRECTOR ACTIVE', type: SimVarValueType.Bool }],
    ['vnav_active', { name: 'L:XMLVAR_VNAVButtonValue', type: SimVarValueType.Bool }],
    ['alt_lock', { name: 'AUTOPILOT ALTITUDE LOCK', type: SimVarValueType.Bool }],
    ['pitch_ref', { name: 'AUTOPILOT PITCH HOLD REF', type: SimVarValueType.Degree }],
    ['kap_140_simvar', { name: 'L:WT1000_AP_KAP140_INSTALLED', type: SimVarValueType.Bool }]
]);

/// <reference types="msfstypes/JS/simvar" />
/**
 * A publisher for Engine information.
 */
class EISPublisher extends SimVarPublisher {
    /**
     * Create an EISPublisher
     * @param bus The EventBus to publish to
     * @param pacer An optional pacer to use to control the rate of publishing
     */
    constructor(bus, pacer = undefined) {
        const simvars = new Map(EISPublisher.simvars);
        // add engine-indexed simvars
        const engineCount = SimVar.GetSimVarValue('NUMBER OF ENGINES', SimVarValueType.Number);
        for (let i = 1; i <= engineCount; i++) {
            simvars.set(`fuel_flow_${i}`, { name: `ENG FUEL FLOW GPH:${i}`, type: SimVarValueType.GPH });
        }
        super(simvars, bus, pacer);
        this.engineCount = engineCount;
    }
    /** @inheritdoc */
    onUpdate() {
        super.onUpdate();
        if (this.subscribed.has('fuel_flow_total')) {
            let totalFuelFlow = 0;
            for (let i = 1; i <= this.engineCount; i++) {
                totalFuelFlow += SimVar.GetSimVarValue(`ENG FUEL FLOW GPH:${i}`, SimVarValueType.GPH);
            }
            this.publish('fuel_flow_total', totalFuelFlow);
        }
    }
}
EISPublisher.simvars = new Map([
    ['rpm_1', { name: 'GENERAL ENG RPM:1', type: SimVarValueType.RPM }],
    ['recip_ff_1', { name: 'RECIP ENG FUEL FLOW:1', type: SimVarValueType.PPH }],
    ['oil_press_1', { name: 'ENG OIL PRESSURE:1', type: SimVarValueType.PSI }],
    ['oil_temp_1', { name: 'ENG OIL TEMPERATURE:1', type: SimVarValueType.Farenheit }],
    ['egt_1', { name: 'ENG EXHAUST GAS TEMPERATURE:1', type: SimVarValueType.Farenheit }],
    ['vac', { name: 'SUCTION PRESSURE', type: SimVarValueType.InHG }],
    ['fuel_total', { name: 'FUEL TOTAL QUANTITY', type: SimVarValueType.GAL }],
    ['fuel_left', { name: 'FUEL LEFT QUANTITY', type: SimVarValueType.GAL }],
    ['fuel_right', { name: 'FUEL RIGHT QUANTITY', type: SimVarValueType.GAL }],
    ['eng_hours_1', { name: 'GENERAL ENG ELAPSED TIME:1', type: SimVarValueType.Hours }],
    ['elec_bus_main_v', { name: 'ELECTRICAL MAIN BUS VOLTAGE', type: SimVarValueType.Volts }],
    ['elec_bus_main_a', { name: 'ELECTRICAL MAIN BUS AMPS', type: SimVarValueType.Amps }],
    ['elec_bus_avionics_v', { name: 'ELECTRICAL AVIONICS BUS VOLTAGE', type: SimVarValueType.Volts }],
    ['elec_bus_avionics_a', { name: 'ELECTRICAL AVIONICS BUS AMPS', type: SimVarValueType.Amps }],
    ['elec_bus_genalt_1_v', { name: 'ELECTRICAL GENALT BUS VOLTAGE:1', type: SimVarValueType.Volts }],
    ['elec_bus_genalt_1_a', { name: 'ELECTRICAL GENALT BUS AMPS:1', type: SimVarValueType.Amps }],
    ['elec_bat_a', { name: 'ELECTRICAL BATTERY LOAD', type: SimVarValueType.Amps }],
    ['elec_bat_v', { name: 'ELECTRICAL BATTERY VOLTAGE', type: SimVarValueType.Volts }]
]);

/** Transponder modes. */
var XPDRMode;
(function (XPDRMode) {
    XPDRMode[XPDRMode["OFF"] = 0] = "OFF";
    XPDRMode[XPDRMode["STBY"] = 1] = "STBY";
    XPDRMode[XPDRMode["TEST"] = 2] = "TEST";
    XPDRMode[XPDRMode["ON"] = 3] = "ON";
    XPDRMode[XPDRMode["ALT"] = 4] = "ALT";
    XPDRMode[XPDRMode["GROUND"] = 5] = "GROUND";
})(XPDRMode || (XPDRMode = {}));
/** A publiher to poll transponder simvars. */
class XPDRSimVarPublisher extends SimVarPublisher {
    /**
     * Create an XPDRSimVarPublisher
     * @param bus The EventBus to publish to
     * @param pacer An optional pacer to use to control the pace of publishing
     */
    constructor(bus, pacer = undefined) {
        super(XPDRSimVarPublisher.simvars, bus, pacer);
    }
}
XPDRSimVarPublisher.simvars = new Map([
    ['xpdrMode1', { name: 'TRANSPONDER STATE:1', type: SimVarValueType.Number }],
    ['xpdrCode1', { name: 'TRANSPONDER CODE:1', type: SimVarValueType.Number }],
    ['xpdrIdent', { name: 'TRANSPONDER IDENT:1', type: SimVarValueType.Bool }]
]);

new GeoPoint(0, 0);

/// <reference types="msfstypes/JS/simvar" />
/**
 * A publisher for electrical information.
 */
class ElectricalPublisher extends SimVarPublisher {
    /**
     * Create an ElectricalPublisher
     * @param bus The EventBus to publish to
     * @param pacer An optional pacer to use to control the rate of publishing
     */
    constructor(bus, pacer = undefined) {
        super(ElectricalPublisher.simvars, bus, pacer);
    }
    /** @inheritdoc */
    onUpdate() {
        super.onUpdate();
        if (this.av1BusLogic && this.subscribed.has('elec_av1_bus')) {
            this.publish('elec_av1_bus', this.av1BusLogic.getValue() !== 0);
        }
        if (this.av2BusLogic && this.subscribed.has('elec_av2_bus')) {
            this.publish('elec_av2_bus', this.av2BusLogic.getValue() !== 0);
        }
    }
    /**
     * Sets the logic element to use for the avionics 1 bus.
     * @param logicElement The logic element to use.
     */
    setAv1Bus(logicElement) {
        this.av1BusLogic = logicElement;
    }
    /**
     * Sets the logic element to use for the avionics 2 bus.
     * @param logicElement The logic element to use.
     */
    setAv2Bus(logicElement) {
        this.av2BusLogic = logicElement;
    }
}
ElectricalPublisher.simvars = new Map([
    ['elec_master_battery', { name: 'ELECTRICAL MASTER BATTERY', type: SimVarValueType.Bool }],
    ['elec_circuit_avionics_on', { name: 'CIRCUIT AVIONICS ON', type: SimVarValueType.Bool }],
    ['elec_circuit_navcom1_on', { name: 'CIRCUIT NAVCOM1 ON', type: SimVarValueType.Bool }],
    ['elec_circuit_navcom2_on', { name: 'CIRCUIT NAVCOM2 ON', type: SimVarValueType.Bool }],
    ['elec_circuit_navcom3_on', { name: 'CIRCUIT NAVCOM3 ON', type: SimVarValueType.Bool }]
]);

/**
 * The transition type to which a flight path vector belongs.
 */
var FlightPathVectorFlags;
(function (FlightPathVectorFlags) {
    FlightPathVectorFlags[FlightPathVectorFlags["None"] = 0] = "None";
    FlightPathVectorFlags[FlightPathVectorFlags["TurnToCourse"] = 1] = "TurnToCourse";
    FlightPathVectorFlags[FlightPathVectorFlags["Arc"] = 2] = "Arc";
    FlightPathVectorFlags[FlightPathVectorFlags["HoldEntry"] = 4] = "HoldEntry";
    FlightPathVectorFlags[FlightPathVectorFlags["HoldLeg"] = 8] = "HoldLeg";
    FlightPathVectorFlags[FlightPathVectorFlags["CourseReversal"] = 16] = "CourseReversal";
    FlightPathVectorFlags[FlightPathVectorFlags["LegToLegTurn"] = 32] = "LegToLegTurn";
    FlightPathVectorFlags[FlightPathVectorFlags["AnticipatedTurn"] = 64] = "AnticipatedTurn";
})(FlightPathVectorFlags || (FlightPathVectorFlags = {}));
/**
 * A prototype for signalling application-specific type metadata for plan segments.
 */
var FlightPlanSegmentType;
(function (FlightPlanSegmentType) {
    FlightPlanSegmentType["Origin"] = "Origin";
    FlightPlanSegmentType["Departure"] = "Departure";
    FlightPlanSegmentType["Enroute"] = "Enroute";
    FlightPlanSegmentType["Arrival"] = "Arrival";
    FlightPlanSegmentType["Approach"] = "Approach";
    FlightPlanSegmentType["Destination"] = "Destination";
    FlightPlanSegmentType["MissedApproach"] = "MissedApproach";
    FlightPlanSegmentType["RandomDirectTo"] = "RandomDirectTo";
})(FlightPlanSegmentType || (FlightPlanSegmentType = {}));
/**
 * A segment of a flight plan.
 */
class FlightPlanSegment {
    /**
     * Creates a new FlightPlanSegment.
     * @param segmentIndex The index of the segment within the flight plan.
     * @param offset The leg offset within the original flight plan that
     * the segment starts at.
     * @param legs The legs in the flight plan segment.
     * @param segmentType The type of segment this is.
     * @param airway The airway associated with this segment, if any.
     */
    constructor(segmentIndex, offset, legs, segmentType = FlightPlanSegmentType.Enroute, airway) {
        this.segmentIndex = segmentIndex;
        this.offset = offset;
        this.legs = legs;
        this.segmentType = segmentType;
        this.airway = airway;
    }
}
/** An empty flight plan segment. */
FlightPlanSegment.Empty = new FlightPlanSegment(-1, -1, []);
/**
 * Bitflags describing a leg definition.
 */
var LegDefinitionFlags;
(function (LegDefinitionFlags) {
    LegDefinitionFlags[LegDefinitionFlags["None"] = 0] = "None";
    LegDefinitionFlags[LegDefinitionFlags["DirectTo"] = 1] = "DirectTo";
    LegDefinitionFlags[LegDefinitionFlags["MissedApproach"] = 2] = "MissedApproach";
    LegDefinitionFlags[LegDefinitionFlags["Obs"] = 4] = "Obs";
    LegDefinitionFlags[LegDefinitionFlags["VectorsToFinal"] = 8] = "VectorsToFinal";
})(LegDefinitionFlags || (LegDefinitionFlags = {}));

[new GeoPoint(0, 0), new GeoPoint(0, 0)];
[new GeoCircle(new Float64Array(3), 0)];

/* eslint-disable @typescript-eslint/no-non-null-assertion */
[new GeoPoint(0, 0), new GeoPoint(0, 0)];
[new GeoCircle(new Float64Array(3), 0)];
[new GeoPoint(0, 0), new GeoPoint(0, 0), new GeoPoint(0, 0)];
[new GeoCircle(new Float64Array(3), 0)];
[new GeoPoint(0, 0), new GeoPoint(0, 0), new GeoPoint(0, 0)];
[new GeoCircle(new Float64Array(3), 0)];
[new GeoCircle(new Float64Array(3), 0), new GeoCircle(new Float64Array(3), 0)];
[
    new GeoCircle(new Float64Array(3), 0),
    new GeoCircle(new Float64Array(3), 0),
    new GeoCircle(new Float64Array(3), 0),
    new GeoCircle(new Float64Array(3), 0),
    new GeoCircle(new Float64Array(3), 0)
];
[new GeoCircle(new Float64Array(3), 0), new GeoCircle(new Float64Array(3), 0), new GeoCircle(new Float64Array(3), 0)];
[new GeoCircle(new Float64Array(3), 0), new GeoCircle(new Float64Array(3), 0), new GeoCircle(new Float64Array(3), 0)];
[
    new GeoPoint(0, 0), new GeoPoint(0, 0), new GeoPoint(0, 0), new GeoPoint(0, 0), new GeoPoint(0, 0),
    new GeoPoint(0, 0), new GeoPoint(0, 0), new GeoPoint(0, 0), new GeoPoint(0, 0), new GeoPoint(0, 0)
];
[new GeoCircle(new Float64Array(3), 0)];

[new GeoPoint(0, 0), new GeoPoint(0, 0), new GeoPoint(0, 0), new GeoPoint(0, 0), new GeoPoint(0, 0)];
[
    new GeoCircle(new Float64Array(3), 0), new GeoCircle(new Float64Array(3), 0),
    new GeoCircle(new Float64Array(3), 0), new GeoCircle(new Float64Array(3), 0)
];
[new GeoPoint(0, 0), new GeoPoint(0, 0)];
({
    geoPoint: [new GeoPoint(0, 0), new GeoPoint(0, 0), new GeoPoint(0, 0), new GeoPoint(0, 0), new GeoPoint(0, 0)],
    geoCircle: [new GeoCircle(new Float64Array(3), 0), new GeoCircle(new Float64Array(3), 0)]
});

var PlanChangeType;
(function (PlanChangeType) {
    PlanChangeType["Added"] = "Added";
    PlanChangeType["Inserted"] = "Inserted";
    PlanChangeType["Removed"] = "Removed";
    PlanChangeType["Changed"] = "Changed";
    PlanChangeType["Cleared"] = "Cleared";
})(PlanChangeType || (PlanChangeType = {}));
var ActiveLegType;
(function (ActiveLegType) {
    ActiveLegType["Lateral"] = "Lateral";
    ActiveLegType["Vertical"] = "Vertical";
    ActiveLegType["Calculating"] = "Calculating";
})(ActiveLegType || (ActiveLegType = {}));
var OriginDestChangeType;
(function (OriginDestChangeType) {
    OriginDestChangeType["OriginAdded"] = "OriginAdded";
    OriginDestChangeType["OriginRemoved"] = "OriginRemoved";
    OriginDestChangeType["DestinationAdded"] = "DestinationAdded";
    OriginDestChangeType["DestinationRemoved"] = "DestinationRemoved";
})(OriginDestChangeType || (OriginDestChangeType = {}));

/**
 * TCAS operating modes.
 */
var TCASOperatingMode;
(function (TCASOperatingMode) {
    TCASOperatingMode[TCASOperatingMode["Standby"] = 0] = "Standby";
    TCASOperatingMode[TCASOperatingMode["TAOnly"] = 1] = "TAOnly";
    TCASOperatingMode[TCASOperatingMode["TA_RA"] = 2] = "TA_RA";
})(TCASOperatingMode || (TCASOperatingMode = {}));
/**
 * TCAS alert level.
 */
var TCASAlertLevel;
(function (TCASAlertLevel) {
    TCASAlertLevel[TCASAlertLevel["None"] = 0] = "None";
    TCASAlertLevel[TCASAlertLevel["ProximityAdvisory"] = 1] = "ProximityAdvisory";
    TCASAlertLevel[TCASAlertLevel["TrafficAdvisory"] = 2] = "TrafficAdvisory";
    TCASAlertLevel[TCASAlertLevel["ResolutionAdvisory"] = 3] = "ResolutionAdvisory";
})(TCASAlertLevel || (TCASAlertLevel = {}));
UnitType.KNOT.createNumber(30);

var APVerticalModes;
(function (APVerticalModes) {
    APVerticalModes[APVerticalModes["NONE"] = 0] = "NONE";
    APVerticalModes[APVerticalModes["PITCH"] = 1] = "PITCH";
    APVerticalModes[APVerticalModes["VS"] = 2] = "VS";
    APVerticalModes[APVerticalModes["FLC"] = 3] = "FLC";
    APVerticalModes[APVerticalModes["ALT"] = 4] = "ALT";
    APVerticalModes[APVerticalModes["VNAV"] = 5] = "VNAV";
    APVerticalModes[APVerticalModes["GP"] = 6] = "GP";
    APVerticalModes[APVerticalModes["GS"] = 7] = "GS";
    APVerticalModes[APVerticalModes["CAP"] = 8] = "CAP";
})(APVerticalModes || (APVerticalModes = {}));
var APLateralModes;
(function (APLateralModes) {
    APLateralModes[APLateralModes["NONE"] = 0] = "NONE";
    APLateralModes[APLateralModes["ROLL"] = 1] = "ROLL";
    APLateralModes[APLateralModes["LEVEL"] = 2] = "LEVEL";
    APLateralModes[APLateralModes["GPSS"] = 3] = "GPSS";
    APLateralModes[APLateralModes["HEADING"] = 4] = "HEADING";
    APLateralModes[APLateralModes["VOR"] = 5] = "VOR";
    APLateralModes[APLateralModes["LOC"] = 6] = "LOC";
    APLateralModes[APLateralModes["BC"] = 7] = "BC";
    APLateralModes[APLateralModes["NAV"] = 8] = "NAV";
})(APLateralModes || (APLateralModes = {}));
var APAltitudeModes;
(function (APAltitudeModes) {
    APAltitudeModes[APAltitudeModes["NONE"] = 0] = "NONE";
    APAltitudeModes[APAltitudeModes["ALTS"] = 1] = "ALTS";
    APAltitudeModes[APAltitudeModes["ALTV"] = 2] = "ALTV";
})(APAltitudeModes || (APAltitudeModes = {}));

/** AP Mode Types */
var APModeType;
(function (APModeType) {
    APModeType[APModeType["LATERAL"] = 0] = "LATERAL";
    APModeType[APModeType["VERTICAL"] = 1] = "VERTICAL";
    APModeType[APModeType["APPROACH"] = 2] = "APPROACH";
})(APModeType || (APModeType = {}));

var APStates;
(function (APStates) {
    APStates[APStates["None"] = 0] = "None";
    APStates[APStates["APActive"] = 1] = "APActive";
    APStates[APStates["YawDamper"] = 2] = "YawDamper";
    APStates[APStates["Heading"] = 4] = "Heading";
    APStates[APStates["Nav"] = 8] = "Nav";
    APStates[APStates["NavArmed"] = 16] = "NavArmed";
    APStates[APStates["Approach"] = 32] = "Approach";
    APStates[APStates["ApproachArmed"] = 64] = "ApproachArmed";
    APStates[APStates["Backcourse"] = 128] = "Backcourse";
    APStates[APStates["BackcourseArmed"] = 256] = "BackcourseArmed";
    APStates[APStates["Alt"] = 512] = "Alt";
    APStates[APStates["AltS"] = 1024] = "AltS";
    APStates[APStates["AltV"] = 2048] = "AltV";
    APStates[APStates["VS"] = 4096] = "VS";
    APStates[APStates["FLC"] = 8192] = "FLC";
    APStates[APStates["GP"] = 16384] = "GP";
    APStates[APStates["GPArmed"] = 32768] = "GPArmed";
    APStates[APStates["GS"] = 65536] = "GS";
    APStates[APStates["GSArmed"] = 131072] = "GSArmed";
    APStates[APStates["Path"] = 262144] = "Path";
    APStates[APStates["PathArmed"] = 524288] = "PathArmed";
    APStates[APStates["PathInvalid"] = 1048576] = "PathInvalid";
    APStates[APStates["Pitch"] = 2097152] = "Pitch";
    APStates[APStates["Roll"] = 4194304] = "Roll";
    APStates[APStates["VNAV"] = 8388608] = "VNAV";
    APStates[APStates["ATSpeed"] = 16777216] = "ATSpeed";
    APStates[APStates["ATMach"] = 33554432] = "ATMach";
    APStates[APStates["ATArmed"] = 67108864] = "ATArmed";
    APStates[APStates["FD"] = 134217728] = "FD";
})(APStates || (APStates = {}));

/**
 * The state of a given plane director.
 */
var DirectorState;
(function (DirectorState) {
    /** The plane director is not currently armed or active. */
    DirectorState["Inactive"] = "Inactive";
    /** The plane director is currently armed. */
    DirectorState["Armed"] = "Armed";
    /** The plane director is currently active. */
    DirectorState["Active"] = "Active";
})(DirectorState || (DirectorState = {}));

/**
 * The current vertical navigation state.
 */
var VNavMode;
(function (VNavMode) {
    /** VNAV Disabled. */
    VNavMode[VNavMode["Disabled"] = 0] = "Disabled";
    /** VNAV Enabled. */
    VNavMode[VNavMode["Enabled"] = 1] = "Enabled";
})(VNavMode || (VNavMode = {}));
/**
 * The current VNAV path mode.
 */
var VNavPathMode;
(function (VNavPathMode) {
    /** VNAV path is not active. */
    VNavPathMode[VNavPathMode["None"] = 0] = "None";
    /** VNAV path is armed for capture. */
    VNavPathMode[VNavPathMode["PathArmed"] = 1] = "PathArmed";
    /** VNAV path is actively navigating. */
    VNavPathMode[VNavPathMode["PathActive"] = 2] = "PathActive";
    /** The current VNAV path is not valid. */
    VNavPathMode[VNavPathMode["PathInvalid"] = 3] = "PathInvalid";
})(VNavPathMode || (VNavPathMode = {}));
/**
 * The current VNAV approach guidance mode.
 */
var VNavApproachGuidanceMode;
(function (VNavApproachGuidanceMode) {
    /** VNAV is not currently following approach guidance. */
    VNavApproachGuidanceMode[VNavApproachGuidanceMode["None"] = 0] = "None";
    /** VNAV has armed ILS glideslope guidance for capture. */
    VNavApproachGuidanceMode[VNavApproachGuidanceMode["GSArmed"] = 1] = "GSArmed";
    /** VNAV is actively following ILS glideslope guidance. */
    VNavApproachGuidanceMode[VNavApproachGuidanceMode["GSActive"] = 2] = "GSActive";
    /** VNAV RNAV glidepath guidance is armed for capture. */
    VNavApproachGuidanceMode[VNavApproachGuidanceMode["GPArmed"] = 3] = "GPArmed";
    /** VNAV is actively follow RNAV glidepath guidance. */
    VNavApproachGuidanceMode[VNavApproachGuidanceMode["GPActive"] = 4] = "GPActive";
})(VNavApproachGuidanceMode || (VNavApproachGuidanceMode = {}));
/**
 * The current VNAV altitude capture type.
 */
var VNavAltCaptureType;
(function (VNavAltCaptureType) {
    /** Altitude capture is not armed. */
    VNavAltCaptureType[VNavAltCaptureType["None"] = 0] = "None";
    /** Altitude will capture the selected altitude. */
    VNavAltCaptureType[VNavAltCaptureType["Selected"] = 1] = "Selected";
    /** Altitude will capture the VANV target altitude. */
    VNavAltCaptureType[VNavAltCaptureType["VNAV"] = 2] = "VNAV";
})(VNavAltCaptureType || (VNavAltCaptureType = {}));

class Arinc429WordSsmParseError extends Error {
    constructor(ssm) {
        super();
        this.ssm = ssm;
    }
}
class Arinc429Word {
    constructor(word) {
        Arinc429Word.f64View[0] = word;
        const ssm = Arinc429Word.u32View[0];
        if (ssm >= 0b00 && ssm <= 0b11) {
            this.ssm = ssm;
        }
        else {
            throw new Arinc429WordSsmParseError(ssm);
        }
        this.value = Arinc429Word.f32View[1];
    }
    static empty() {
        return new Arinc429Word(0);
    }
    static fromSimVarValue(name) {
        return new Arinc429Word(SimVar.GetSimVarValue(name, 'number'));
    }
    isFailureWarning() {
        return this.ssm === Arinc429Word.SignStatusMatrix.FailureWarning;
    }
    isNoComputedData() {
        return this.ssm === Arinc429Word.SignStatusMatrix.NoComputedData;
    }
    isFunctionalTest() {
        return this.ssm === Arinc429Word.SignStatusMatrix.FunctionalTest;
    }
    isNormalOperation() {
        return this.ssm === Arinc429Word.SignStatusMatrix.NormalOperation;
    }
    /**
     * Returns the value when normal operation, the supplied default value otherwise.
     */
    valueOr(defaultValue) {
        return this.isNormalOperation() ? this.value : defaultValue;
    }
}
Arinc429Word.SignStatusMatrix = Object.freeze({
    FailureWarning: 0b00,
    NoComputedData: 0b01,
    FunctionalTest: 0b10,
    NormalOperation: 0b11,
});
Arinc429Word.f64View = new Float64Array(1);
Arinc429Word.u32View = new Uint32Array(Arinc429Word.f64View.buffer);
Arinc429Word.f32View = new Float32Array(Arinc429Word.f64View.buffer);

var DisplayUnitState;
(function (DisplayUnitState) {
    DisplayUnitState[DisplayUnitState["On"] = 0] = "On";
    DisplayUnitState[DisplayUnitState["Off"] = 1] = "Off";
    DisplayUnitState[DisplayUnitState["Selftest"] = 2] = "Selftest";
    DisplayUnitState[DisplayUnitState["Standby"] = 3] = "Standby";
})(DisplayUnitState || (DisplayUnitState = {}));
class DisplayUnit extends DisplayComponent {
    constructor(props) {
        super(props);
        // FIXME obvious
        this.state = Subject.create(DisplayUnitState.Off); // this.props.coldDark ? DisplayUnitState.Off : DisplayUnitState.Standby;
        this.electricityState = 0;
        this.potentiometer = 0;
        this.timeOut = 0;
        this.selfTestRef = FSComponent.createRef();
        this.pfdRef = FSComponent.createRef();
        this.simvarPublisher = this.props.bus.getSubscriber();
        //const consumer = subscriber.on('elec');
        //this.electricityState = ConsumerSubject.create(consumer, 0);
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        //this.updateState();
        console.log("RENDER DONE");
        this.simvarPublisher.on('potentiometer_captain').whenChanged().handle(value => {
            this.potentiometer = value;
            this.updateState();
        });
        this.simvarPublisher.on('elec').whenChanged().handle(value => {
            this.electricityState = value;
            this.updateState();
        });
        this.state.sub(v => {
            if (v === DisplayUnitState.Selftest) {
                this.selfTestRef.instance.setAttribute('visibility', 'visible');
            }
            else {
                this.selfTestRef.instance.setAttribute('visibility', 'hidden');
                this.pfdRef.instance.setAttribute('visibility', 'visible');
            }
        });
    }
    /*      useUpdate((deltaTime) => {
            if (timer !== null) {
                if (timer > 0) {
                    setTimer(timer - (deltaTime / 1000));
                } else if (state === DisplayUnitState.Standby) {
                    setState(DisplayUnitState.Off);
                    setTimer(null);
                } else if (state === DisplayUnitState.Selftest) {
                    setState(DisplayUnitState.On);
                    setTimer(null);
                }
            }
        }); */
    setTimer(time) {
        console.log("setting timouet");
        this.timeOut = window.setTimeout(() => {
            console.log("firimng timouet");
            if (this.state.get() === DisplayUnitState.Standby) {
                this.state.set(DisplayUnitState.Off);
            }
            if (this.state.get() === DisplayUnitState.Selftest) {
                this.state.set(DisplayUnitState.On);
            }
        }, time * 1000);
    }
    updateState() {
        if (this.state.get() !== DisplayUnitState.Off && this.props.failed) {
            this.state.set(DisplayUnitState.Off);
        }
        else if (this.state.get() === DisplayUnitState.On && (this.potentiometer === 0 || this.electricityState === 0)) {
            this.state.set(DisplayUnitState.Standby);
            this.setTimer(10);
        }
        else if (this.state.get() === DisplayUnitState.Standby && (this.potentiometer !== 0 && this.electricityState !== 0)) {
            this.state.set(DisplayUnitState.On);
            // setTimer(null);
            clearTimeout(this.timeOut);
        }
        else if (this.state.get() === DisplayUnitState.Off && (this.potentiometer !== 0 && this.electricityState !== 0 && !this.props.failed)) {
            this.state.set(DisplayUnitState.Selftest);
            this.setTimer(15);
            // setTimer(parseInt(NXDataStore.get('CONFIG_SELF_TEST_TIME', '15')));
        }
        else if (this.state.get() === DisplayUnitState.Selftest && (this.potentiometer === 0 || this.electricityState === 0)) {
            this.state.set(DisplayUnitState.Off);
            clearTimeout(this.timeOut);
        }
        console.log(this.state);
    }
    render() {
        return (FSComponent.buildComponent(FSComponent.Fragment, null,
            FSComponent.buildComponent("div", { class: "BacklightBleed" }),
            FSComponent.buildComponent("svg", { ref: this.selfTestRef, class: "SelfTest", viewBox: "0 0 600 600" },
                FSComponent.buildComponent("rect", { class: "SelfTestBackground", x: "0", y: "0", width: "100%", height: "100%" }),
                FSComponent.buildComponent("text", { class: "SelfTestText", x: "50%", y: "50%" }, "SELF TEST IN PROGRESS"),
                FSComponent.buildComponent("text", { class: "SelfTestText", x: "50%", y: "56%" }, "(MAX 40 SECONDS)")),
            FSComponent.buildComponent("div", { style: 'block', ref: this.pfdRef, visibility: 'hidden' }, this.props.children)));
        /*    return (
           <svg class="dcdu-lines">
           <g>
               <path d="m 21 236 h 450" />
               <path d="m 130 246 v 124" />
               <path d="m 362 246 v 124" />
           </g>
       </svg>); */
    }
}

class HeadingBug extends DisplayComponent {
    render() {
        return (FSComponent.buildComponent("g", { id: "HorizonHeadingBug", transform: `translate(${this.props.offset} 0)` },
            FSComponent.buildComponent("path", { className: "ThickOutline", d: "m68.906 80.823v-9.0213" }),
            FSComponent.buildComponent("path", { className: "ThickStroke Cyan", d: "m68.906 80.823v-9.0213" })));
    }
}
class Horizon extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.pitchGroupRef = FSComponent.createRef();
        this.rollGroupRef = FSComponent.createRef();
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const pf = this.props.bus.getSubscriber();
        pf.on('pitch').handle(pitch => {
            const newVal = new Arinc429Word(pitch);
            //console.log(newVal.value);
            this.pitchGroupRef.instance.setAttribute('transform', `translate(0 ${calculateHorizonOffsetFromPitch(-newVal.value)})`);
        });
        pf.on('roll').handle(roll => {
            const newVal = new Arinc429Word(roll);
            this.rollGroupRef.instance.setAttribute('transform', `rotate(${newVal.value} 68.814 80.730)`);
        });
    }
    render() {
        /*       if (!this.props.pitch.get().isNormalOperation() || !this.props.roll.isNormalOperation()) {
                  return <></>;
              }
           */
        /*   const yOffset = Math.max(Math.min(calculateHorizonOffsetFromPitch(-this.props.pitch.value), 31.563), -31.563); */
        const bugs = [];
        if (!Number.isNaN(this.props.selectedHeading) && !this.props.FDActive) {
            bugs.push([this.props.selectedHeading]);
        }
        return (FSComponent.buildComponent("g", { id: "RollGroup", ref: this.rollGroupRef },
            FSComponent.buildComponent("g", { id: "PitchGroup", ref: this.pitchGroupRef },
                FSComponent.buildComponent("path", { d: "m23.906 80.823v-160h90v160z", class: "SkyFill" }),
                FSComponent.buildComponent("path", { d: "m113.91 223.82h-90v-143h90z", class: "EarthFill" }),
                FSComponent.buildComponent("g", { class: "NormalStroke White" },
                    FSComponent.buildComponent("path", { d: "m66.406 85.323h5h0" }),
                    FSComponent.buildComponent("path", { d: "m64.406 89.823h9h0" }),
                    FSComponent.buildComponent("path", { d: "m66.406 94.073h5h0" }),
                    FSComponent.buildComponent("path", { d: "m59.406 97.823h19h0" }),
                    FSComponent.buildComponent("path", { d: "m64.406 103.82h9h0" }),
                    FSComponent.buildComponent("path", { d: "m59.406 108.82h19h0" }),
                    FSComponent.buildComponent("path", { d: "m55.906 118.82h26h0" }),
                    FSComponent.buildComponent("path", { d: "m52.906 138.82h32h0" }),
                    FSComponent.buildComponent("path", { d: "m47.906 168.82h42h0" }),
                    FSComponent.buildComponent("path", { d: "m66.406 76.323h5h0" }),
                    FSComponent.buildComponent("path", { d: "m64.406 71.823h9h0" }),
                    FSComponent.buildComponent("path", { d: "m66.406 67.323h5h0" }),
                    FSComponent.buildComponent("path", { d: "m59.406 62.823h19h0" }),
                    FSComponent.buildComponent("path", { d: "m66.406 58.323h5h0" }),
                    FSComponent.buildComponent("path", { d: "m64.406 53.823h9h0" }),
                    FSComponent.buildComponent("path", { d: "m66.406 49.323h5h0" }),
                    FSComponent.buildComponent("path", { d: "m59.406 44.823h19h0" }),
                    FSComponent.buildComponent("path", { d: "m66.406 40.573h5h0" }),
                    FSComponent.buildComponent("path", { d: "m64.406 36.823h9h0" }),
                    FSComponent.buildComponent("path", { d: "m66.406 33.573h5h0" }),
                    FSComponent.buildComponent("path", { d: "m55.906 30.823h26h0" }),
                    FSComponent.buildComponent("path", { d: "m52.906 10.823h32h0" }),
                    FSComponent.buildComponent("path", { d: "m47.906-19.177h42h0" })),
                FSComponent.buildComponent("g", { id: "PitchProtUpper", class: "NormalStroke Green" },
                    FSComponent.buildComponent("path", { d: "m51.506 31.523h4m-4-1.4h4" }),
                    FSComponent.buildComponent("path", { d: "m86.306 31.523h-4m4-1.4h-4" })),
                FSComponent.buildComponent("g", { id: "PitchProtLostUpper", style: "display: none", class: "NormalStroke Amber" },
                    FSComponent.buildComponent("path", { d: "m52.699 30.116 1.4142 1.4142m-1.4142 0 1.4142-1.4142" }),
                    FSComponent.buildComponent("path", { d: "m85.114 31.53-1.4142-1.4142m1.4142 0-1.4142 1.4142" })),
                FSComponent.buildComponent("g", { id: "PitchProtLower", class: "NormalStroke Green" },
                    FSComponent.buildComponent("path", { d: "m59.946 104.52h4m-4-1.4h4" }),
                    FSComponent.buildComponent("path", { d: "m77.867 104.52h-4m4-1.4h-4" })),
                FSComponent.buildComponent("g", { id: "PitchProtLostLower", style: "display: none", class: "NormalStroke Amber" },
                    FSComponent.buildComponent("path", { d: "m61.199 103.12 1.4142 1.4142m-1.4142 0 1.4142-1.4142" }),
                    FSComponent.buildComponent("path", { d: "m76.614 104.53-1.4142-1.4142m1.4142 0-1.4142 1.4142" })),
                FSComponent.buildComponent("path", { d: "m68.906 121.82-8.0829 14h2.8868l5.1962-9 5.1962 9h2.8868z", class: "NormalStroke Red" }),
                FSComponent.buildComponent("path", { d: "m57.359 163.82 11.547-20 11.547 20h-4.0414l-7.5056-13-7.5056 13z", class: "NormalStroke Red" }),
                FSComponent.buildComponent("path", { d: "m71.906 185.32v3.5h15l-18-18-18 18h15v-3.5h-6.5l9.5-9.5 9.5 9.5z", class: "NormalStroke Red" }),
                FSComponent.buildComponent("path", { d: "m60.824 13.823h2.8868l5.1962 9 5.1962-9h2.8868l-8.0829 14z", class: "NormalStroke Red" }),
                FSComponent.buildComponent("path", { d: "m61.401-13.177h-4.0414l11.547 20 11.547-20h-4.0414l-7.5056 13z", class: "NormalStroke Red" }),
                FSComponent.buildComponent("path", { d: "m68.906-26.177-9.5-9.5h6.5v-3.5h-15l18 18 18-18h-15v3.5h6.5z", class: "NormalStroke Red" }),
                FSComponent.buildComponent("path", { d: "m23.906 80.823h90h0", class: "NormalOutline" }),
                FSComponent.buildComponent("path", { d: "m23.906 80.823h90h0", class: "NormalStroke White" }),
                FSComponent.buildComponent("g", { class: "FontSmall White Fill EndAlign" },
                    FSComponent.buildComponent("text", { x: "55.729935", y: "64.812828" }, "10"),
                    FSComponent.buildComponent("text", { x: "88.618317", y: "64.812714" }, "10"),
                    FSComponent.buildComponent("text", { x: "54.710766", y: "46.931034" }, "20"),
                    FSComponent.buildComponent("text", { x: "89.564583", y: "46.930969" }, "20"),
                    FSComponent.buildComponent("text", { x: "50.867237", y: "32.910896" }, "30"),
                    FSComponent.buildComponent("text", { x: "93.408119", y: "32.910839" }, "30"),
                    FSComponent.buildComponent("text", { x: "48.308414", y: "12.690886" }, "50"),
                    FSComponent.buildComponent("text", { x: "96.054962", y: "12.690853" }, "50"),
                    FSComponent.buildComponent("text", { x: "43.050652", y: "-17.138285" }, "80"),
                    FSComponent.buildComponent("text", { x: "101.48304", y: "-17.138248" }, "80"),
                    FSComponent.buildComponent("text", { x: "55.781109", y: "99.81395" }, "10"),
                    FSComponent.buildComponent("text", { x: "88.669487", y: "99.813919" }, "10"),
                    FSComponent.buildComponent("text", { x: "54.645519", y: "110.8641" }, "20"),
                    FSComponent.buildComponent("text", { x: "89.892426", y: "110.86408" }, "20"),
                    FSComponent.buildComponent("text", { x: "51.001217", y: "120.96314" }, "30"),
                    FSComponent.buildComponent("text", { x: "93.280037", y: "120.96311" }, "30"),
                    FSComponent.buildComponent("text", { x: "48.220913", y: "140.69778" }, "50"),
                    FSComponent.buildComponent("text", { x: "96.090324", y: "140.69786" }, "50"),
                    FSComponent.buildComponent("text", { x: "43.125065", y: "170.80962" }, "80"),
                    FSComponent.buildComponent("text", { x: "101.38947", y: "170.80959" }, "80"))),
            FSComponent.buildComponent("path", { d: "m40.952 49.249v-20.562h55.908v20.562z", class: "NormalOutline SkyFill" }),
            FSComponent.buildComponent("path", { d: "m40.952 49.249v-20.562h55.908v20.562z", class: "NormalStroke White" }),
            FSComponent.buildComponent(SideslipIndicator, { bus: this.props.bus, instrument: this.props.instrument }),
            FSComponent.buildComponent(RisingGround, { bus: this.props.bus }),
            FSComponent.buildComponent(RadioAltAndDH, { bus: this.props.bus })));
    }
}
class RadioAltAndDH extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.visibilitySub = Subject.create('visible');
        this.offsetSub = Subject.create('');
        this.radioAltClassSub = Subject.create('');
        this.dhClassSub = Subject.create('');
        this.dhVisibilitySub = Subject.create('hidden');
        this.textSub = Subject.create('');
        this.roll = new Arinc429Word(0);
        this.dh = 0;
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('roll').handle(r => {
            const roll = new Arinc429Word(r);
            this.roll = roll;
        });
        sub.on('dh').handle(dh => {
            this.dh = dh;
        });
        sub.on('radio_alt').handle(ra => {
            if (ra > 2500) {
                this.visibilitySub.set('hidden');
            }
            else {
                this.visibilitySub.set('visible');
                const verticalOffset = calculateVerticalOffsetFromRoll(this.roll.value);
                this.offsetSub.set(`translate(0 ${-verticalOffset})`);
                const size = (ra > 400 ? 'FontLarge' : 'FontLargest');
                const DHValid = this.dh >= 0;
                const color = (ra > 400 || (ra > this.dh + 100 && DHValid) ? 'Green' : 'Amber');
                this.radioAltClassSub.set(`${size} ${color} MiddleAlign`);
                let text = '';
                if (ra < 5) {
                    text = Math.round(ra).toString();
                }
                else if (ra <= 50) {
                    text = (Math.round(ra / 5) * 5).toString();
                }
                else if (ra > 50 || (ra > this.dh + 100 && DHValid)) {
                    text = (Math.round(ra / 10) * 10).toString();
                }
                this.textSub.set(text);
                if (ra <= this.dh) {
                    this.dhClassSub.set('FontLargest Amber EndAlign Blink9Seconds');
                    this.dhVisibilitySub.set('visible');
                }
                else {
                    this.dhClassSub.set('FontLargest Amber EndAlign');
                    this.dhVisibilitySub.set('hidden');
                }
            }
        });
    }
    render() {
        return (FSComponent.buildComponent("g", { visibility: this.visibilitySub, id: "DHAndRAGroup", transform: this.offsetSub },
            FSComponent.buildComponent("text", { id: "AttDHText", x: "73.511879", y: "113.19068", visibility: this.dhVisibilitySub, class: this.dhClassSub }, "DH"),
            FSComponent.buildComponent("text", { id: "RadioAlt", x: "68.803764", y: "119.88165", class: this.radioAltClassSub }, this.textSub)));
    }
}
class SideslipIndicator extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.sideslipIndicatorFilter = new LagFilter(0.8);
        this.classNameSub = Subject.create('Yellow');
        this.rollTriangleSub = Subject.create('');
        this.slideSlipSub = Subject.create('');
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('roll').whenChanged().handle(r => {
            const roll = new Arinc429Word(r);
            const verticalOffset = calculateVerticalOffsetFromRoll(roll.value);
            const isOnGround = SimVar.GetSimVarValue('SIM ON GROUND', 'number');
            let offset = 0;
            if (isOnGround) {
                // on ground, lateral g is indicated. max 0.3g, max deflection is 15mm
                const latAcc = SimVar.GetSimVarValue('ACCELERATION BODY X', 'G Force');
                const accInG = Math.min(0.3, Math.max(-0.3, latAcc));
                offset = -accInG * 15 / 0.3;
            }
            else {
                const beta = SimVar.GetSimVarValue('INCIDENCE BETA', 'degrees');
                const betaTarget = SimVar.GetSimVarValue('L:A32NX_BETA_TARGET', 'Number');
                offset = Math.max(Math.min(beta - betaTarget, 15), -15);
            }
            const betaTargetActive = SimVar.GetSimVarValue('L:A32NX_BETA_TARGET_ACTIVE', 'Number') === 1;
            const SIIndexOffset = this.sideslipIndicatorFilter.step(offset, this.props.instrument.deltaTime / 1000);
            this.rollTriangleSub.set(`translate(0 ${verticalOffset})`);
            this.classNameSub.set(`${betaTargetActive ? 'Cyan' : 'Yellow'}`);
            this.slideSlipSub.set(`translate(${SIIndexOffset} 0)`);
        });
    }
    render() {
        return (FSComponent.buildComponent("g", { id: "RollTriangleGroup", transform: this.rollTriangleSub, class: "NormalStroke Yellow CornerRound" },
            FSComponent.buildComponent("path", { d: "m66.074 43.983 2.8604-4.2333 2.8604 4.2333z" }),
            FSComponent.buildComponent("path", { id: "SideSlipIndicator", transform: this.slideSlipSub, d: "m73.974 47.208-1.4983-2.2175h-7.0828l-1.4983 2.2175z" })));
    }
}
class RisingGround extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.lastRadioAlt = 0;
        this.lastPitch = new Arinc429Word(0);
        this.transformStringSub = Subject.create('');
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('pitch').whenChanged().handle(p => {
            const pitch = new Arinc429Word(p);
            this.lastPitch = pitch;
            const targetPitch = -0.1 * this.lastRadioAlt;
            const targetOffset = Math.max(Math.min(calculateHorizonOffsetFromPitch((-pitch.value) - targetPitch) - 31.563, 0), -63.093);
            this.transformStringSub.set(`translate(0 ${targetOffset})`);
        });
        sub.on('radio_alt').whenChanged().handle(p => {
            const radio_alt = p;
            this.lastRadioAlt = radio_alt;
            const targetPitch = -0.1 * radio_alt;
            const targetOffset = Math.max(Math.min(calculateHorizonOffsetFromPitch((-this.lastPitch.value) - targetPitch) - 31.563, 0), -63.093);
            this.transformStringSub.set(`translate(0 ${targetOffset})`);
        });
    }
    render() {
        return (FSComponent.buildComponent("g", { id: "HorizonGroundRectangle", transform: this.transformStringSub },
            FSComponent.buildComponent("path", { d: "m113.95 157.74h-90.08v-45.357h90.08z", class: "NormalOutline EarthFill" }),
            FSComponent.buildComponent("path", { d: "m113.95 157.74h-90.08v-45.357h90.08z", class: "NormalStroke White" })));
    }
}

const calculateHorizonOffsetFromPitch = (pitch) => {
    if (pitch > -5 && pitch <= 20) {
        return pitch * 1.8;
    }
    if (pitch > 20 && pitch <= 30) {
        return -0.04 * pitch ** 2 + 3.4 * pitch - 16;
    }
    if (pitch > 30) {
        return 20 + pitch;
    }
    if (pitch < -5 && pitch >= -15) {
        return 0.04 * pitch ** 2 + 2.2 * pitch + 1;
    }
    return pitch - 8;
};
const calculateVerticalOffsetFromRoll = (roll) => {
    let offset = 0;
    if (Math.abs(roll) > 60) {
        offset = Math.max(0, 41 - 35.87 / Math.sin(Math.abs(roll) / 180 * Math.PI));
    }
    return offset;
};
class HorizontalTape extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.refElement = FSComponent.createRef();
        this.refElement2 = FSComponent.createRef();
        this.currentHeading = 0;
    }
    buildGraduationElements() {
        const headingTicks = [];
        const numTicks = 72; //Math.round(this.props.displayRange * 100 / this.props.valueSpacing);
        /*   let leftmostHeading = Math.round((this.currentHeading - this.props.displayRange) / this.props.valueSpacing) * this.props.valueSpacing;
          if (leftmostHeading < this.currentHeading - this.props.displayRange) {
              leftmostHeading += this.props.valueSpacing;
          } */
        // FIXME
        let leftmostHeading = 0;
        for (let i = 0; i < numTicks; i++) {
            let text = '';
            let classText = '';
            let tickLength = 3.8302;
            let textYPos;
            const elementHeading = leftmostHeading + i * this.props.valueSpacing;
            const offset = elementHeading * this.props.distanceSpacing / this.props.valueSpacing;
            const roundedHeading = Math.round(elementHeading);
            //console.log(roundedHeading);
            if (roundedHeading % 10 === 0) {
                if (roundedHeading % 30 === 0) {
                    classText = 'FontMedium';
                    textYPos = 154.64206;
                }
                else {
                    classText = 'FontSmallest';
                    textYPos = 154.27985;
                }
                let textVal = Math.round(elementHeading / 10) % 36;
                if (textVal < 0) {
                    textVal += 36;
                }
                text = textVal.toString();
            }
            else {
                tickLength *= 0.42;
            }
            const tickRef = FSComponent.createRef();
            headingTicks.push(FSComponent.buildComponent("g", { id: "HeadingTick", ref: tickRef, transform: `translate(${offset} 0)` },
                FSComponent.buildComponent("path", { class: "NormalStroke White", d: `m68.913 145.34v${tickLength}` }),
                FSComponent.buildComponent("text", { id: "HeadingLabel", class: `White MiddleAlign ${classText}`, x: "68.879425", y: textYPos }, text)));
        }
        return headingTicks;
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const pf = this.props.bus.getSubscriber();
        pf.on('heading').whenChanged().handle(h => {
            const newVal = new Arinc429Word(h);
            // this.currentHeading = newVal.value;
            //console.log(newVal.value);
            const offset = -newVal.value * this.props.distanceSpacing / this.props.valueSpacing;
            let offset2 = -newVal.value * this.props.distanceSpacing / this.props.valueSpacing;
            //calced from 40 degrees (~ the range of the tape)
            if (Math.abs(offset) <= 60.44) {
                //calced from 360 degrees
                offset2 = -543.6 + offset;
            }
            else {
                offset2 += 543.6;
            }
            this.refElement.instance.setAttribute('transform', `translate(${offset} 0)`);
            this.refElement2.instance.setAttribute('transform', `translate(${offset2} 0)`);
        });
    }
    render() {
        Math.round(this.props.displayRange * 2 / this.props.valueSpacing);
        /*     let leftmostHeading = Math.round((this.props.heading.value - this.props.displayRange) / this.props.valueSpacing) * this.props.valueSpacing;
            if (leftmostHeading < this.props.heading.value - this.props.displayRange) {
                leftmostHeading += this.props.valueSpacing;
            } */
        //const graduationElements: JSX.Element[] = [];
        const bugElements = [];
        /*     for (let i = 0; i < numTicks; i++) {
                const elementHeading = leftmostHeading + i * this.props.valueSpacing;
                const offset = elementHeading * this.props.distanceSpacing / this.props.valueSpacing;
                //graduationElements.push(graduationElementFunction(elementHeading, offset));
            }
         */
        /*     this.props.bugs.forEach((currentElement) => {
                const angleToZero = getSmallestAngle(this.props.heading.value, 0);
                const smallestAngle = getSmallestAngle(currentElement[0], 0);
                let offset = currentElement[0];
                if (Math.abs(angleToZero) < 90 && Math.abs(smallestAngle) < 90) {
                    if (angleToZero > 0 && smallestAngle < 0) {
                        offset = currentElement[0] - 360;
                    } else if (angleToZero < 0 && smallestAngle > 0) {
                        offset = currentElement[0] + 360;
                    }
                }
        
                offset *= this.props.distanceSpacing / this.props.valueSpacing;
                bugElements.push(offset);
            }); */
        return (FSComponent.buildComponent(FSComponent.Fragment, null,
            FSComponent.buildComponent("g", { ref: this.refElement },
                this.buildGraduationElements(),
                bugElements.forEach(offet => {
                    FSComponent.buildComponent(HeadingBug, { offset: offet });
                })),
            FSComponent.buildComponent("g", { ref: this.refElement2 },
                this.buildGraduationElements(),
                bugElements.forEach(offet => {
                    FSComponent.buildComponent(HeadingBug, { offset: offet });
                }))));
    }
}
class VerticalTape extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.refElement = FSComponent.createRef();
    }
    buildSpeedGraduationPoints() {
        var _a;
        const numTicks = Math.round(this.props.displayRange * 100 / this.props.valueSpacing);
        let lowestValue = 30;
        if (lowestValue < this.props.tapeValue.get() - this.props.displayRange) {
            lowestValue += this.props.valueSpacing;
        }
        const graduationPoints = [];
        for (let i = 0; i < numTicks; i++) {
            const elementValue = lowestValue + i * this.props.valueSpacing;
            if (elementValue <= ((_a = this.props.upperLimit) !== null && _a !== void 0 ? _a : Infinity)) {
                const offset = -elementValue * this.props.distanceSpacing / this.props.valueSpacing;
                const element = { elementValue, offset };
                if (element) {
                    //console.log("ADDING", elementValue);
                    //this.refElement.instance.append(<this.props.graduationElementFunction offset={offset} alt={elementValue} />);
                    if (elementValue < 30) {
                        return FSComponent.buildComponent(FSComponent.Fragment, null);
                    }
                    let text = '';
                    if (elementValue % 20 === 0) {
                        text = Math.abs(elementValue).toString().padStart(3, '0');
                    }
                    graduationPoints.push(FSComponent.buildComponent("g", { transform: `translate(0 ${offset})` },
                        FSComponent.buildComponent("path", { class: "NormalStroke White", d: "m19.031 80.818h-2.8206" }),
                        FSComponent.buildComponent("text", { class: "FontMedium MiddleAlign White", x: "7.7348943", y: "82.936722" }, text)));
                }
            }
        }
        return graduationPoints;
    }
    buildAltitudeGraduationPoints() {
        var _a;
        const numTicks = Math.round(this.props.displayRange * 100 / this.props.valueSpacing);
        const lowestValue = 0;
        const graduationPoints = [];
        for (let i = 0; i < numTicks; i++) {
            const elementValue = lowestValue + i * this.props.valueSpacing;
            if (elementValue <= ((_a = this.props.upperLimit) !== null && _a !== void 0 ? _a : Infinity)) {
                const offset = -elementValue * this.props.distanceSpacing / this.props.valueSpacing;
                const element = { elementValue, offset };
                if (element) {
                    //console.log("ADDING", newValue.value);
                    //this.refElement.instance.append(<this.props.graduationElementFunction offset={offset} alt={elementValue} />);
                    let text = '';
                    if (elementValue % 500 === 0) {
                        text = (Math.abs(elementValue) / 100).toString().padStart(3, '0');
                    }
                    graduationPoints.push(FSComponent.buildComponent("g", { transform: `translate(0 ${offset})` },
                        text &&
                            FSComponent.buildComponent("path", { class: "NormalStroke White", d: "m115.79 81.889 1.3316-1.0783-1.3316-1.0783" }),
                        FSComponent.buildComponent("path", { class: "NormalStroke White", d: "m130.85 80.819h-2.0147" }),
                        FSComponent.buildComponent("text", { class: "FontMedium MiddleAlign White", x: "122.98842", y: "82.939713" }, text)));
                }
            }
        }
        return graduationPoints;
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        this.props.tapeValue.sub(a => {
            var _a, _b;
            const newValue = new Arinc429Word(a);
            const clampedValue = Math.max(Math.min(newValue.value, (_a = this.props.upperLimit) !== null && _a !== void 0 ? _a : Infinity), (_b = this.props.lowerLimit) !== null && _b !== void 0 ? _b : -Infinity);
            let lowestValue = 30; //Math.max(Math.round((clampedValue - this.props.displayRange) / this.props.valueSpacing) *this.props. valueSpacing, this.props.lowerLimit??-Infinity);
            if (lowestValue < newValue.value - this.props.displayRange) {
                lowestValue += this.props.valueSpacing;
            }
            this.refElement.instance.setAttribute('transform', `translate(0 ${clampedValue * this.props.distanceSpacing / this.props.valueSpacing})`);
        });
    }
    render() {
        /*    this.props.bugs.forEach((currentElement) => {
               const value = currentElement[0];
               const offset = -value * this.props.distanceSpacing / this.props.valueSpacing;
               bugElements.push(offset);
           }); */
        return (FSComponent.buildComponent("g", { ref: this.refElement },
            this.props.type === 'altitude' && this.buildAltitudeGraduationPoints(),
            this.props.type === 'speed' && this.buildSpeedGraduationPoints(),
            this.props.children));
    }
}
/* export const BarberpoleIndicator = (
    tapeValue: number, border: number, isLowerBorder: boolean, displayRange: number,
    element: (offset: number) => JSX.Element, elementSize: number,
) => {
    const Elements: [(offset: number) => JSX.Element, number][] = [];

    const sign = isLowerBorder ? 1 : -1;
    const isInRange = isLowerBorder ? border <= tapeValue + displayRange : border >= tapeValue - displayRange;
    if (!isInRange) {
        return Elements;
    }
    const numElements = Math.ceil((border + sign * tapeValue - sign * (displayRange + 2)) / elementSize);
    for (let i = 0; i < numElements; i++) {
        const elementValue = border + sign * elementSize * i;
        Elements.push([element, elementValue]);
    }

    return Elements;
}; */
const SmoothSin = (origin, destination, smoothFactor, dTime) => {
    if (origin === undefined) {
        return destination;
    }
    if (Math.abs(destination - origin) < Number.EPSILON) {
        return destination;
    }
    const delta = destination - origin;
    let result = origin + delta * Math.sin(Math.min(smoothFactor * dTime, 1.0) * Math.PI / 2.0);
    if ((origin < destination && result > destination) || (origin > destination && result < destination)) {
        result = destination;
    }
    return result;
};
class LagFilter {
    constructor(timeConstant) {
        this.PreviousInput = 0;
        this.PreviousOutput = 0;
        this.TimeConstant = timeConstant;
    }
    reset() {
        this.PreviousInput = 0;
        this.PreviousOutput = 0;
    }
    /**
     *
     * @param input Input to filter
     * @param deltaTime in seconds
     * @returns {number} Filtered output
     */
    step(input, deltaTime) {
        const filteredInput = !Number.isNaN(input) ? input : 0;
        const scaledDeltaTime = deltaTime * this.TimeConstant;
        const sum0 = scaledDeltaTime + 2;
        const output = (filteredInput + this.PreviousInput) * scaledDeltaTime / sum0
            + (2 - scaledDeltaTime) / sum0 * this.PreviousOutput;
        this.PreviousInput = filteredInput;
        if (Number.isFinite(output)) {
            this.PreviousOutput = output;
            return output;
        }
        return 0;
    }
}
class RateLimiter {
    constructor(risingRate, fallingRate) {
        this.PreviousOutput = 0;
        this.RisingRate = risingRate;
        this.FallingRate = fallingRate;
    }
    step(input, deltaTime) {
        const filteredInput = !Number.isNaN(input) ? input : 0;
        const subInput = filteredInput - this.PreviousOutput;
        const scaledUpper = deltaTime * this.RisingRate;
        const scaledLower = deltaTime * this.FallingRate;
        const output = this.PreviousOutput + Math.max(Math.min(scaledUpper, subInput), scaledLower);
        this.PreviousOutput = output;
        return output;
    }
}

const TensDigits = (value) => {
    let text;
    if (value < 0) {
        text = (value + 100).toString();
    }
    else if (value >= 100) {
        text = (value - 100).toString().padEnd(2, '0');
    }
    else {
        text = value.toString().padEnd(2, '0');
    }
    return text;
};
const HundredsDigit = (value) => {
    let text;
    if (value < 0) {
        text = (value + 1).toString();
    }
    else if (value >= 10) {
        text = (value - 10).toString();
    }
    else {
        text = value.toString();
    }
    return text;
};
const ThousandsDigit = (value) => {
    let text;
    if (!Number.isNaN(value)) {
        text = (value % 10).toString();
    }
    else {
        text = '';
    }
    return text;
};
const TenThousandsDigit = (value) => {
    let text;
    if (!Number.isNaN(value)) {
        text = value.toString();
    }
    else {
        text = '';
    }
    return text;
};
class DigitalAltitudeReadout extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.mda = 0;
        this.isNegativeSub = Subject.create('hidden');
        this.colorSub = Subject.create('');
        this.showZeroSub = Subject.create(false);
        this.tenDigitsSub = Subject.create(0);
        this.hundredsValue = Subject.create(0);
        this.hundredsPosition = Subject.create(0);
        this.thousandsValue = Subject.create(0);
        this.thousandsPosition = Subject.create(0);
        this.tenThousandsValue = Subject.create(0);
        this.tenThousandsPosition = Subject.create(0);
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('mda').whenChanged().handle(mda => {
            this.mda = mda;
        });
        sub.on('altitude').whenChanged().handle(a => {
            const altitude = new Arinc429Word(a);
            const isNegative = altitude.value < 0;
            this.isNegativeSub.set(isNegative ? 'visible' : 'hidden');
            const color = (this.mda !== 0 && altitude.value < this.mda) ? 'Amber' : 'Green';
            this.colorSub.set(color);
            const absAlt = Math.abs(Math.max(Math.min(altitude.value, 50000), -1500));
            const tensDigits = absAlt % 100;
            this.tenDigitsSub.set(tensDigits);
            const HundredsValue = Math.floor((absAlt / 100) % 10);
            this.hundredsValue.set(HundredsValue);
            let HundredsPosition = 0;
            if (tensDigits > 80) {
                HundredsPosition = tensDigits / 20 - 4;
                this.hundredsPosition.set(HundredsPosition);
            }
            else {
                this.hundredsPosition.set(0);
            }
            const ThousandsValue = Math.floor((absAlt / 1000) % 10);
            this.thousandsValue.set(ThousandsValue);
            let ThousandsPosition = 0;
            if (HundredsValue >= 9) {
                ThousandsPosition = HundredsPosition;
                this.thousandsPosition.set(ThousandsPosition);
            }
            else {
                this.thousandsPosition.set(0);
            }
            const TenThousandsValue = Math.floor((absAlt / 10000) % 10);
            this.tenThousandsValue.set(TenThousandsValue);
            let TenThousandsPosition = 0;
            if (ThousandsValue >= 9) {
                TenThousandsPosition = ThousandsPosition;
            }
            this.tenThousandsPosition.set(TenThousandsPosition);
            const showThousandsZero = TenThousandsValue !== 0;
            this.showZeroSub.set(showThousandsZero);
        });
    }
    render() {
        return (FSComponent.buildComponent("g", { id: "AltReadoutGroup" },
            FSComponent.buildComponent("g", null,
                FSComponent.buildComponent("svg", { x: "117.754", y: "76.3374", width: "13.5", height: "8.9706", viewBox: "0 0 13.5 8.9706" },
                    FSComponent.buildComponent(Drum, { type: 'ten-thousands', position: this.tenThousandsPosition, value: this.tenThousandsValue, color: this.colorSub, showZero: this.showZeroSub, getText: TenThousandsDigit, valueSpacing: 1, distanceSpacing: 7, displayRange: 1, amount: 2 }),
                    FSComponent.buildComponent(Drum, { type: 'thousands', position: this.thousandsPosition, value: this.thousandsValue, color: this.colorSub, showZero: this.showZeroSub, getText: ThousandsDigit, valueSpacing: 1, distanceSpacing: 7, displayRange: 1, amount: 2 }),
                    FSComponent.buildComponent(Drum, { type: 'hundreds', showZero: this.showZeroSub, position: this.hundredsPosition, value: this.hundredsValue, color: this.colorSub, getText: HundredsDigit, valueSpacing: 1, distanceSpacing: 7, displayRange: 1, amount: 10 })),
                FSComponent.buildComponent("svg", { x: "130.85", y: "73.6664", width: "8.8647", height: "14.313", viewBox: "0 0 8.8647 14.313" },
                    FSComponent.buildComponent(Drum, { type: 'tens', amount: 4, showZero: this.showZeroSub, position: this.tenDigitsSub, value: this.tenDigitsSub, color: this.colorSub, getText: TensDigits, valueSpacing: 20, distanceSpacing: 4.7, displayRange: 40 }),
                    "                     ")),
            FSComponent.buildComponent("path", { id: "AltReadoutReducedAccurMarks", class: "NormalStroke Amber", style: { display: 'none' }, d: "m132.61 81.669h4.7345m-4.7345-1.6933h4.7345" }),
            FSComponent.buildComponent("path", { id: "AltReadoutOutline", class: "NormalStroke Yellow", d: "m117.75 76.337h13.096v-2.671h8.8647v14.313h-8.8647v-2.671h-13.096" }),
            FSComponent.buildComponent("g", { id: "AltNegativeText", class: "FontLarge EndAlign", visibility: this.isNegativeSub },
                FSComponent.buildComponent("text", { class: "White", x: "121.46731", y: "78.156288" }, "N"),
                FSComponent.buildComponent("text", { class: "White", x: "121.49069", y: "83.301224" }, "E"),
                FSComponent.buildComponent("text", { class: "White", x: "121.46731", y: "88.446159" }, "G"))));
    }
}
class Drum extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.digitRefElements = [];
        this.visible = 1;
        this.position = 0;
        this.value = 0;
        this.color = 'Green';
        this.showZero = true;
        this.gRef = FSComponent.createRef();
    }
    buildElements(amount) {
        let highestPosition = Math.round((this.position + this.props.displayRange) / this.props.valueSpacing) * this.props.valueSpacing;
        let highestValue = Math.round((this.value + this.props.displayRange) / this.props.valueSpacing) * this.props.valueSpacing;
        const graduationElements = [];
        for (let i = 0; i < amount; i++) {
            const elementPosition = highestPosition - i * this.props.valueSpacing;
            const offset = -elementPosition * this.props.distanceSpacing / this.props.valueSpacing;
            let elementVal = highestValue - i * this.props.valueSpacing;
            if (!this.showZero && elementVal === 0) {
                elementVal = NaN;
            }
            //graduationElements.push(this.props.elementFunction(elementVal, offset, this.color));
            const digitRef = FSComponent.createRef();
            if (this.props.type === 'hundreds') {
                graduationElements.push(FSComponent.buildComponent("text", { ref: digitRef, transform: `translate(0 ${offset})`, class: `FontLargest MiddleAlign ${this.color}`, x: "11.431", y: "7.1" }));
            }
            else if (this.props.type === 'thousands') {
                graduationElements.push(FSComponent.buildComponent("text", { ref: digitRef, transform: `translate(0 ${offset})`, class: `FontLargest MiddleAlign ${this.color}`, x: "6.98", y: "7.1" }));
            }
            else if (this.props.type === 'ten-thousands') {
                graduationElements.push(FSComponent.buildComponent("text", { ref: digitRef, transform: `translate(0 ${offset})`, class: `FontLargest MiddleAlign ${this.color}`, x: "2.298", y: "7.1" }));
            }
            else if (this.props.type === 'tens') {
                graduationElements.push(FSComponent.buildComponent("text", { ref: digitRef, transform: `translate(0 ${offset})`, class: `FontSmallest MiddleAlign ${this.color}`, x: "4.3894", y: "8.9133" }));
            }
            this.digitRefElements.push(digitRef);
        }
        return graduationElements;
    }
    /*  private getAttributes() {
         const numTicks = Math.round(this.props.displayRange * 2 / this.props.valueSpacing);
 
         let highestPosition = Math.round((this.position + this.props.displayRange) / this.props.valueSpacing) * this.props.valueSpacing;
         if (highestPosition > this.position + this.props.displayRange) {
             highestPosition -= this.props.valueSpacing;
         }
     
         let highestValue = Math.round((this.value + this.props.displayRange) / this.props.valueSpacing) * this.props.valueSpacing;
         if (highestValue > this.value + this.props.displayRange) {
             highestValue -= this.props.valueSpacing;
         }
         
         
     } */
    getOffset(position) {
        const className = `translate(0 ${position * this.props.distanceSpacing / this.props.valueSpacing})`;
        this.gRef.instance.setAttribute('transform', className);
    }
    updateValue() {
        let highestPosition = Math.round((this.position + this.props.displayRange) / this.props.valueSpacing) * this.props.valueSpacing;
        if (highestPosition > this.position + this.props.displayRange) {
            highestPosition -= this.props.valueSpacing;
        }
        let highestValue = Math.round((this.value + this.props.displayRange) / this.props.valueSpacing) * this.props.valueSpacing;
        if (highestValue > this.value + this.props.displayRange) {
            highestValue -= this.props.valueSpacing;
        }
        for (let i = 0; i < this.props.amount; i++) {
            let elementVal = highestValue - i * this.props.valueSpacing;
            const elementPosition = highestPosition - i * this.props.valueSpacing;
            const offset = -elementPosition * this.props.distanceSpacing / this.props.valueSpacing;
            if (!this.showZero && elementVal === 0) {
                elementVal = NaN;
            }
            let text;
            text = this.props.getText(elementVal);
            /*   if(offset > 130 && offset > 40) {
                  this.digitRefElements[i].instance.textContent = text;
                  this.digitRefElements[i].instance.setAttribute('transform', `translate(0 ${offset})`);
              } else {
                  if(offset <=130 && offset < 40) {
                      this.digitRefElements[i].instance.textContent = text;
                      this.digitRefElements[i].instance.setAttribute('transform', `translate(0 ${offset})`);
                  }
              } */
            this.digitRefElements[i].instance.setAttribute('transform', `translate(0 ${offset})`);
            this.digitRefElements[i].instance.textContent = text;
            this.digitRefElements[i].instance.classList.replace('Green', this.color);
            this.digitRefElements[i].instance.classList.replace('Amber', this.color);
        }
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        this.props.position.sub(p => {
            this.position = p;
            // this.getOffset();
            //this.updateValue();
            this.getOffset(p);
            //this.updateValue();
        });
        this.props.value.sub(p => {
            this.value = p;
            this.updateValue();
            //this.getOffset(this.position);
        });
        this.props.color.sub(p => {
            this.color = p;
        });
        this.props.showZero.sub(p => {
            this.showZero = p;
        });
    }
    render() {
        return (FSComponent.buildComponent("g", { ref: this.gRef }, this.buildElements(this.props.amount)));
    }
}

const DisplayRange$2 = 570;
const ValueSpacing$2 = 100;
const DistanceSpacing$2 = 7.5;
/* const LandingElevationIndicator = ({ altitude, FWCFlightPhase }: LandingElevationIndicatorProps) => {
    if (FWCFlightPhase !== 7 && FWCFlightPhase !== 8) {
        return null;
    }

    const landingElevation = getSimVar('C:fs9gps:FlightPlanDestinationAltitude', 'feet');
    const delta = altitude.value - landingElevation;
    if (delta > DisplayRange) {
        return null;
    }
    const offset = (delta - DisplayRange) * DistanceSpacing / ValueSpacing;

    return (
        <path id="AltTapeLandingElevation" class="EarthFill" d={`m130.85 123.56h-13.096v${offset}h13.096z`} />
    );
};
*/
class RadioAltIndicator extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.visibilitySub = Subject.create('hidden');
        this.offsetSub = Subject.create('hidden');
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('radio_alt').whenChanged().handle(ra => {
            if (ra > DisplayRange$2) {
                this.visibilitySub.set('hidden');
            }
            else {
                this.visibilitySub.set('visible');
            }
            const offset = (ra - DisplayRange$2) * DistanceSpacing$2 / ValueSpacing$2;
            this.offsetSub.set(`m131.15 123.56h2.8709v${offset}h-2.8709z`);
        });
    }
    render() {
        return (FSComponent.buildComponent("path", { visibility: this.visibilitySub, id: "AltTapeGroundReference", class: "Fill Red", d: this.offsetSub }));
    }
}
class AltitudeIndicator extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.subscribable = Subject.create(0);
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        console.log("RENDER ALTITUDEINDICATOR");
        const pf = this.props.bus.getSubscriber();
        pf.on('altitude').handle(a => {
            this.subscribable.set(a);
        });
    }
    render() {
        /*         if (!altitude.isNormalOperation()) {
                    return (
                        <AltTapeBackground />
                    );
                } */
        return (FSComponent.buildComponent("g", null,
            FSComponent.buildComponent(AltTapeBackground, null),
            FSComponent.buildComponent(VerticalTape, { bugs: [], displayRange: DisplayRange$2 + 30, valueSpacing: ValueSpacing$2, distanceSpacing: DistanceSpacing$2, lowerLimit: -1500, upperLimit: 50000, tapeValue: this.subscribable, type: 'altitude' })));
    }
}
class AltTapeBackground extends DisplayComponent {
    render() {
        return (FSComponent.buildComponent("path", { id: "AltTapeBackground", d: "m130.85 123.56h-13.096v-85.473h13.096z", class: "TapeBackground" }));
    }
}
class AltitudeIndicatorOfftape extends DisplayComponent {
    render() {
        return (
        /*  if (!altitude.isNormalOperation()) {
             return (
                 <>
                     <path id="AltTapeOutline" class="NormalStroke Red" d="m117.75 123.56h13.096v-85.473h-13.096" />
                     <path id="AltReadoutBackground" class="BlackFill" d="m131.35 85.308h-13.63v-8.9706h13.63z" />
                     <text id="AltFailText" class="Blink9Seconds FontLargest Red EndAlign" x="131.16769" y="83.433167">ALT</text>
                 </>
             );
         } */
        FSComponent.buildComponent("g", null,
            FSComponent.buildComponent("path", { id: "AltTapeOutline", class: "NormalStroke White", d: "m117.75 123.56h17.83m-4.7345-85.473v85.473m-13.096-85.473h17.83" }),
            FSComponent.buildComponent("path", { id: "AltReadoutBackground", class: "BlackFill", d: "m130.85 85.308h-13.13v-8.9706h13.13v-2.671h8.8647v14.313h-8.8647z" }),
            FSComponent.buildComponent(RadioAltIndicator, { bus: this.props.bus }),
            FSComponent.buildComponent(DigitalAltitudeReadout, { bus: this.props.bus })));
    }
}
/*
interface SelectedAltIndicatorProps {
    currentAlt: Arinc429Word,
    targetAlt: number,
    altIsManaged: boolean,
    mode: '' | 'STD' | 'QFE' | 'QNH';
}

const SelectedAltIndicator = ({ currentAlt, targetAlt, altIsManaged, mode }: SelectedAltIndicatorProps) => {
    const color = altIsManaged ? 'Magenta' : 'Cyan';

    const isSTD = mode === 'STD';
    let boxLength = 19.14;
    let text = '';
    if (isSTD) {
        text = Math.round(targetAlt / 100).toString().padStart(3, '0');
        boxLength = 12.5;
    } else {
        text = Math.round(targetAlt).toString().padStart(5, ' ');
    }

    if (currentAlt.value - targetAlt > DisplayRange) {
        return (
            <g id="SelectedAltLowerGroup">
                <text id="SelectedAltLowerText" class={`FontMedium EndAlign ${color}`} x="135.41222" y="128.90233" xmlSpace="preserve">{text}</text>
                {isSTD
                && <text id="SelectedAltLowerFLText" class={`FontSmall MiddleAlign ${color}`} x="120.83108" y="128.97597">FL</text>}
            </g>
        );
    } if (currentAlt.value - targetAlt < -DisplayRange) {
        return (
            <g id="SelectedAltUpperGroup">
                <text id="SelectedAltUpperText" class={`FontMedium EndAlign ${color}`} x="135.41232" y="37.348804" xmlSpace="preserve">{text}</text>
                {isSTD
                && <text id="SelectedAltUpperFLText" class={`FontSmall MiddleAlign ${color}`} x="120.83106" y="37.337193">FL</text>}
            </g>
        );
    }
    const offset = (currentAlt.value - targetAlt) * DistanceSpacing / ValueSpacing;

    return (
        <g id="AltTapeTargetSymbol" transform={`translate(0 ${offset})`}>
            <path class="BlackFill" d={`m117.75 77.784h${boxLength}v6.0476h-${boxLength}z`} />
            <path class={`NormalStroke ${color}`} d="m122.79 83.831v6.5516h-7.0514v-8.5675l2.0147-1.0079m4.8441-3.0238v-6.5516h-6.8588v8.5675l2.0147 1.0079" />
            <text id="AltTapeTargetText" class={`FontMedium StartAlign ${color}`} x="118.12846" y="82.867332" xmlSpace="preserve">{text}</text>
        </g>
    );
};

interface LinearDeviationIndicatorProps {
    linearDeviation: number;
    altitude: Arinc429Word;
}

const LinearDeviationIndicator = ({ linearDeviation, altitude }: LinearDeviationIndicatorProps) => {
    if (Number.isNaN(linearDeviation)) {
        return null;
    }
    const circleRadius = 30;
    if (altitude.value - linearDeviation > DisplayRange - circleRadius) {
        return (
            <path id="VDevDotLower" class="Fill Green" d="m116.24 121.85c4.9e-4 0.83465 0.67686 1.511 1.511 1.511 0.83418 0 1.5105-0.67636 1.511-1.511h-1.511z" />
        );
    } if (altitude.value - linearDeviation < -DisplayRange + circleRadius) {
        return (
            <path id="VDevDotUpper" class="Fill Green" d="m116.24 39.8c4.9e-4 -0.83466 0.67686-1.511 1.511-1.511 0.83418 0 1.5105 0.67635 1.511 1.511h-1.511z" />
        );
    }
    const offset = (altitude.value - linearDeviation) * DistanceSpacing / ValueSpacing;

    return (
        <path id="VDevDot" class="Fill Green" transform={`translate(0 ${offset})`} d="m119.26 80.796a1.511 1.5119 0 1 0-3.022 0 1.511 1.5119 0 1 0 3.022 0z" />
    );
};

interface AltimeterIndicatorProps {
    mode: '' | 'STD' | 'QFE' | 'QNH';
    altitude: Arinc429Word,
}

const AltimeterIndicator = ({ mode, altitude }: AltimeterIndicatorProps) => {
    const phase = getSimVar('L:A32NX_FMGC_FLIGHT_PHASE', 'enum');
    const transAlt = getSimVar(phase <= 3 ? 'L:AIRLINER_TRANS_ALT' : 'L:AIRLINER_APPR_TRANS_ALT', 'number');

    if (mode === 'STD') {
        return (
            <g id="STDAltimeterModeGroup" class={(phase > 3 && transAlt > altitude.value && transAlt !== 0) ? 'BlinkInfinite' : ''}>
                <path class="NormalStroke Yellow" d="m124.79 131.74h13.096v7.0556h-13.096z" />
                <text class="FontMedium Cyan AlignLeft" x="125.99706" y="137.20053">STD</text>
            </g>
        );
    }

    const units = Simplane.getPressureSelectedUnits();
    const pressure = Simplane.getPressureValue(units);
    let text: string;
    if (pressure !== null) {
        if (units === 'millibar') {
            text = Math.round(pressure).toString();
        } else {
            text = pressure.toFixed(2);
        }
    } else {
        text = '';
    }

    return (
        <g id="AltimeterGroup" class={(phase <= 3 && transAlt < altitude.value && transAlt !== 0) ? 'BlinkInfinite' : ''}>
            {mode === 'QFE'
            && <path class="NormalStroke White" d="m 116.83686,133.0668 h 13.93811 v 5.8933 h -13.93811 z" />}
            <text id="AltimeterModeText" class="FontMedium White" x="118.29047" y="138.03368">{mode}</text>
            <text id="AltimeterSettingText" class="FontMedium MiddleAlign Cyan" x="140.86115" y="138.03368">{text}</text>
        </g>
    );
};

interface MetricAltIndicatorProps {
    altitude: Arinc429Word;
    MDA: number;
    targetAlt: number;
    altIsManaged: boolean;
}

const MetricAltIndicator = ({ altitude, MDA, targetAlt, altIsManaged }: MetricAltIndicatorProps) => {
    const currentMetricAlt = Math.round(altitude.value * 0.3048 / 10) * 10;

    const targetMetric = Math.round(targetAlt * 0.3048 / 10) * 10;
    const targetAltColor = altIsManaged ? 'Magenta' : 'Cyan';

    const currentMetricAltColor = altitude.value > MDA ? 'Green' : 'Amber';

    const showMetricAlt = getSimVar('L:A32NX_METRIC_ALT_TOGGLE', 'bool');
    if (!showMetricAlt) {
        return null;
    }

    return (
        <g id="MetricAltGroup">
            <path class="NormalStroke Yellow" d="m116.56 140.22h29.213v7.0556h-29.213z" />
            <text class="FontMedium Cyan MiddleAlign" x="141.78165" y="145.69975">M</text>
            <text id="MetricAltText" class={`FontMedium ${currentMetricAltColor} MiddleAlign`} x="128.23189" y="145.80269">{currentMetricAlt}</text>
            <g id="MetricAltTargetGroup">
                <text id="MetricAltTargetText" class={`FontSmallest ${targetAltColor} MiddleAlign`} x="93.670235" y="37.946552">{targetMetric}</text>
                <text class="FontSmallest Cyan MiddleAlign" x="105.15807" y="37.872921">M</text>
            </g>
        </g>
    );
};
 */

class AttitudeIndicatorFixedUpper extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.roll = new Arinc429Word(0);
        this.pitch = new Arinc429Word(0);
        this.visibilitySub = Subject.create('hidden');
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('roll').whenChanged().handle(r => {
            this.roll = new Arinc429Word(r);
            if (!this.roll.isNormalOperation()) {
                this.visibilitySub.set('hidden');
            }
            else {
                this.visibilitySub.set('visible');
            }
        });
        sub.on('pitch').whenChanged().handle(p => {
            this.pitch = new Arinc429Word(p);
            if (!this.pitch.isNormalOperation()) {
                this.visibilitySub.set('hidden');
            }
            else {
                this.visibilitySub.set('visible');
            }
        });
    }
    render() {
        return (FSComponent.buildComponent("g", { id: "AttitudeUpperInfoGroup", visibility: this.visibilitySub },
            FSComponent.buildComponent("g", { id: "RollProtGroup", class: "NormalStroke Green" },
                FSComponent.buildComponent("path", { id: "RollProtRight", d: "m105.64 62.887 1.5716-0.8008m-1.5716-0.78293 1.5716-0.8008" }),
                FSComponent.buildComponent("path", { id: "RollProtLeft", d: "m32.064 61.303-1.5716-0.8008m1.5716 2.3845-1.5716-0.8008" })),
            FSComponent.buildComponent("g", { id: "RollProtLost", style: "display: none", class: "NormalStroke Amber" },
                FSComponent.buildComponent("path", { id: "RollProtLostRight", d: "m107.77 60.696-1.7808 1.7818m1.7808 0-1.7808-1.7818" }),
                FSComponent.buildComponent("path", { id: "RollProtLostLeft", d: "m30.043 62.478 1.7808-1.7818m-1.7808 0 1.7808 1.7818" })),
            FSComponent.buildComponent("g", { class: "NormalStroke White" },
                FSComponent.buildComponent("path", { d: "m98.645 51.067 2.8492-2.8509" }),
                FSComponent.buildComponent("path", { d: "m39.168 51.067-2.8492-2.8509" }),
                FSComponent.buildComponent("path", { d: "m90.858 44.839a42.133 42.158 0 0 0-43.904 0" }),
                FSComponent.buildComponent("path", { d: "m89.095 43.819 1.8313-3.1738 1.7448 1.0079-1.8313 3.1738" }),
                FSComponent.buildComponent("path", { d: "m84.259 41.563 0.90817-2.4967-1.8932-0.68946-0.90818 2.4966" }),
                FSComponent.buildComponent("path", { d: "m75.229 39.142 0.46109-2.6165 1.9841 0.35005-0.46109 2.6165" }),
                FSComponent.buildComponent("path", { d: "m60.6 39.492-0.46109-2.6165 1.9841-0.35005 0.46109 2.6165" }),
                FSComponent.buildComponent("path", { d: "m53.553 41.563-0.90818-2.4967 0.9466-0.34474 0.9466-0.34472 0.90818 2.4966" }),
                FSComponent.buildComponent("path", { d: "m46.973 44.827-1.8313-3.1738 1.7448-1.0079 1.8313 3.1738" })),
            FSComponent.buildComponent("path", { class: "NormalStroke Yellow CornerRound", d: "m68.906 38.650-2.5184-3.7000h5.0367l-2.5184 3.7000" })));
    }
}
class AttitudeIndicatorFixedCenter extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.roll = new Arinc429Word(0);
        this.pitch = new Arinc429Word(0);
        this.visibilitySub = Subject.create('hidden');
        this.attExcessiveVisibilitySub = Subject.create('false');
    }
    updaetAttExcessive() {
        if (this.pitch.isNormalOperation() && ((this.pitch.value > 25 || this.pitch.value < -13)) || (this.roll.isNormalOperation() && Math.abs(this.roll.value) > 45)) {
            this.attExcessiveVisibilitySub.set('hidden');
        }
        else if (this.pitch.isNormalOperation() && -this.pitch.value < 22 && -this.pitch.value > -10 && this.roll.isNormalOperation() && Math.abs(this.roll.value) < 40) {
            this.attExcessiveVisibilitySub.set('visible');
        }
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('roll').whenChanged().handle(r => {
            this.roll = new Arinc429Word(r);
            if (!this.roll.isNormalOperation()) {
                this.visibilitySub.set('hidden');
            }
            else {
                this.visibilitySub.set('visible');
            }
            this.updaetAttExcessive();
        });
        sub.on('pitch').whenChanged().handle(p => {
            this.pitch = new Arinc429Word(p);
            if (!this.pitch.isNormalOperation()) {
                this.visibilitySub.set('hidden');
            }
            else {
                this.visibilitySub.set('visible');
            }
            this.updaetAttExcessive();
        });
    }
    render() {
        return (FSComponent.buildComponent("g", { id: "AttitudeSymbolsGroup" },
            FSComponent.buildComponent("path", { class: "Yellow Fill", d: "m115.52 80.067v1.5119h-8.9706v-1.5119z" }),
            FSComponent.buildComponent(SidestickIndicator, { bus: this.props.bus }),
            FSComponent.buildComponent("path", { class: "BlackFill", d: "m67.647 82.083v-2.5198h2.5184v2.5198z" }),
            FSComponent.buildComponent("g", { visibility: this.attExcessiveVisibilitySub },
                FSComponent.buildComponent(FDYawBar, { bus: this.props.bus }),
                FSComponent.buildComponent(FlightDirector, { bus: this.props.bus })),
            FSComponent.buildComponent("path", { class: "NormalOutline", d: "m67.647 82.083v-2.5198h2.5184v2.5198z" }),
            FSComponent.buildComponent("path", { class: "NormalStroke Yellow", d: "m67.647 82.083v-2.5198h2.5184v2.5198z" }),
            FSComponent.buildComponent("g", { class: "NormalOutline" },
                FSComponent.buildComponent("path", { d: "m88.55 86.114h2.5184v-4.0317h12.592v-2.5198h-15.11z" }),
                FSComponent.buildComponent("path", { d: "m34.153 79.563h15.11v6.5516h-2.5184v-4.0317h-12.592z" })),
            FSComponent.buildComponent("g", { id: "FixedAircraftReference", class: "NormalStroke Yellow BlackFill" },
                FSComponent.buildComponent("path", { d: "m88.55 86.114h2.5184v-4.0317h12.592v-2.5198h-15.11z" }),
                FSComponent.buildComponent("path", { d: "m34.153 79.563h15.11v6.5516h-2.5184v-4.0317h-12.592z" }))));
    }
}
class FDYawBar extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.lateralMode = 0;
        this.fdYawCommand = 0;
        this.fdActive = false;
        this.yawRef = FSComponent.createRef();
    }
    isActive() {
        if (!this.fdActive || !(this.lateralMode === 40 || this.lateralMode === 33 || this.lateralMode === 34)) {
            return false;
        }
        else {
            return true;
        }
    }
    setOffset() {
        const offset = -Math.max(Math.min(this.fdYawCommand, 45), -45) * 0.44;
        this.yawRef.instance.setAttribute('visibility', 'true');
        this.yawRef.instance.setAttribute('transform', `translate(${offset} 0)`);
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('fdYawCommand').whenChanged().handle(fy => {
            this.fdYawCommand = fy;
            if (this.isActive()) {
                this.setOffset();
            }
            else {
                this.yawRef.instance.setAttribute('visibility', 'hidden');
            }
        });
        sub.on('activeLateralMode').whenChanged().handle(lm => {
            this.lateralMode = lm;
            if (this.isActive()) {
                this.setOffset();
            }
            else {
                this.yawRef.instance.setAttribute('visibility', 'hidden');
            }
        });
        // FIXME, differentiate between 1 and 2 (left and right seat)
        sub.on('fd1Active').whenChanged().handle(fd => {
            this.fdActive = fd;
            if (this.isActive()) {
                this.setOffset();
            }
            else {
                this.yawRef.instance.setAttribute('visibility', 'false');
            }
        });
    }
    render() {
        return (FSComponent.buildComponent("path", { ref: this.yawRef, id: "GroundYawSymbol", class: "NormalStroke Green", d: "m67.899 82.536v13.406h2.0147v-13.406l-1.0074-1.7135z" }));
    }
}
class FlightDirector extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.lateralMode = 0;
        this.verticalMode = 0;
        this.fdActive = false;
        this.fdBank = 0;
        this.fdPitch = 0;
        this.fdRef = FSComponent.createRef();
        this.lateralRef1 = FSComponent.createRef();
        this.lateralRef2 = FSComponent.createRef();
        this.verticalRef1 = FSComponent.createRef();
        this.verticalRef2 = FSComponent.createRef();
    }
    setOffset() {
        const showLateralFD = this.lateralMode !== 0 && this.lateralMode !== 34 && this.lateralMode !== 40;
        const showVerticalFD = this.verticalMode !== 0 && this.verticalMode !== 34;
        let FDRollOffset = 0;
        let FDPitchOffset = 0;
        if (showLateralFD) {
            const FDRollOrder = this.fdBank;
            FDRollOffset = Math.min(Math.max(FDRollOrder, -45), 45) * 0.44;
            this.lateralRef1.instance.setAttribute('visibility', 'visible');
            this.lateralRef1.instance.setAttribute('transform', `translate(${FDRollOffset} 0)`);
            this.lateralRef2.instance.setAttribute('visibility', 'visible');
            this.lateralRef2.instance.setAttribute('transform', `translate(${FDRollOffset} 0)`);
        }
        if (showVerticalFD) {
            const FDPitchOrder = this.fdPitch;
            FDPitchOffset = Math.min(Math.max(FDPitchOrder, -22.5), 22.5) * 0.89;
            this.verticalRef1.instance.setAttribute('visibility', 'visible');
            this.verticalRef1.instance.setAttribute('transform', `translate(0 ${FDPitchOffset})`);
            this.verticalRef2.instance.setAttribute('visibility', 'visible');
            this.verticalRef2.instance.setAttribute('transform', `translate(0 ${FDPitchOffset})`);
        }
    }
    isActive() {
        if (!this.fdActive || !(this.lateralMode === 40 || this.lateralMode === 33 || this.lateralMode === 34) || SimVar.GetSimVarValue('L:A32NX_TRK_FPA_MODE_ACTIVE', 'bool')) {
            return false;
        }
        else {
            return true;
        }
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        /*    sub.on('fdYawCommand').whenChanged().handle(fy => {
               this.fdYawCommand = fy;
   
               if(this.isActive()) {
                   this.setOffset()
               } else {
                   this.fdRef.instance.setAttribute('visibility', 'false')
               }
           }) */
        sub.on('activeLateralMode').whenChanged().handle(vm => {
            this.verticalMode = vm;
            if (this.isActive()) {
                this.fdRef.instance.setAttribute('visibility', 'visible');
            }
            else {
                this.fdRef.instance.setAttribute('visibility', 'hidden');
            }
        });
        sub.on('activeVerticalMode').whenChanged().handle(lm => {
            this.lateralMode = lm;
            if (this.isActive()) {
                this.fdRef.instance.setAttribute('visibility', 'visible');
            }
            else {
                this.fdRef.instance.setAttribute('visibility', 'hidden');
            }
        });
        // FIXME, differentiate between 1 and 2 (left and right seat)
        sub.on('fd1Active').whenChanged().handle(fd => {
            this.fdActive = fd;
            if (this.isActive()) {
                this.fdRef.instance.setAttribute('visibility', 'visible');
            }
            else {
                this.fdRef.instance.setAttribute('visibility', 'hidden');
            }
        });
        sub.on('fdBank').whenChanged().handle(fd => {
            this.fdBank = fd;
            if (this.isActive()) {
                this.fdRef.instance.setAttribute('visibility', 'visible');
            }
            else {
                this.fdRef.instance.setAttribute('visibility', 'hidden');
                this.setOffset();
            }
        });
        sub.on('fdPitch').whenChanged().handle(fd => {
            this.fdPitch = fd;
            if (this.isActive()) {
                this.fdRef.instance.setAttribute('visibility', 'visible');
            }
            else {
                this.fdRef.instance.setAttribute('visibility', 'hidden');
                this.setOffset();
            }
        });
    }
    render() {
        return (FSComponent.buildComponent("g", { ref: this.fdRef },
            FSComponent.buildComponent("g", { class: "ThickOutline" },
                FSComponent.buildComponent("path", { ref: this.lateralRef1, d: "m68.903 61.672v38.302" }),
                FSComponent.buildComponent("path", { ref: this.verticalRef1, d: "m49.263 80.823h39.287" })),
            FSComponent.buildComponent("g", { class: "ThickStroke Green" },
                FSComponent.buildComponent("path", { ref: this.lateralRef2, id: "FlightDirectorRoll", d: "m68.903 61.672v38.302" }),
                FSComponent.buildComponent("path", { ref: this.verticalRef2, id: "FlightDirectorPitch", d: "m49.263 80.823h39.287" }))));
    }
}
class SidestickIndicator extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.sideStickX = 0;
        this.sideStickY = 0;
        this.crossHairRef = FSComponent.createRef();
        this.onGroundForVisibility = Subject.create('visible');
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('sideStickX').whenChanged().handle(x => {
            this.sideStickX = x * 29.56;
            const onGround = SimVar.GetSimVarValue('SIM ON GROUND', 'number');
            const oneEngineRunning = SimVar.GetSimVarValue('GENERAL ENG COMBUSTION:1', 'bool') || SimVar.GetSimVarValue('GENERAL ENG COMBUSTION:2', 'bool');
            if (onGround === 0 || !oneEngineRunning) {
                this.onGroundForVisibility.set('hidden');
            }
            else {
                this.onGroundForVisibility.set('visible');
                this.crossHairRef.instance.setAttribute('transform', `translate(${this.sideStickX} ${this.sideStickY})`);
            }
        });
        sub.on('sideStickY').whenChanged().handle(y => {
            this.sideStickY = -y * 23.02;
            const onGround = SimVar.GetSimVarValue('SIM ON GROUND', 'number');
            const oneEngineRunning = SimVar.GetSimVarValue('GENERAL ENG COMBUSTION:1', 'bool') || SimVar.GetSimVarValue('GENERAL ENG COMBUSTION:2', 'bool');
            if (onGround === 0 || !oneEngineRunning) {
                this.onGroundForVisibility.set('hidden');
            }
            else {
                this.onGroundForVisibility.set('visible');
                this.crossHairRef.instance.setAttribute('transform', `translate(${this.sideStickX} ${this.sideStickY})`);
            }
        });
    }
    render() {
        return (FSComponent.buildComponent("g", { id: "GroundCursorGroup", class: "NormalStroke White", visibility: this.onGroundForVisibility },
            FSComponent.buildComponent("path", { id: "GroundCursorBorders", d: "m92.327 103.75h6.0441v-6.0476m-58.93 0v6.0476h6.0441m46.842-45.861h6.0441v6.0476m-58.93 0v-6.0476h6.0441" }),
            FSComponent.buildComponent("path", { ref: this.crossHairRef, id: "GroundCursorCrosshair", d: "m73.994 81.579h-4.3316v4.3341m-5.8426-4.3341h4.3316v4.3341m5.8426-5.846h-4.3316v-4.3341m-5.8426 4.3341h4.3316v-4.3341" })));
    }
}

//import { createDeltaTimeCalculator, getSimVar, renderTarget } from '../util.js';
class ShowForSecondsComponent extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.timeout = 0;
        this.modeChangedPathRef = FSComponent.createRef();
        this.displayModeChangedPath = (timeout, cancel = false) => {
            if (cancel) {
                clearTimeout(this.timeout);
                this.modeChangedPathRef.instance.classList.remove('ModeChangedPath');
            }
            else {
                this.modeChangedPathRef.instance.classList.add('ModeChangedPath');
                clearTimeout(this.timeout);
                this.timeout = setTimeout(() => {
                    this.modeChangedPathRef.instance.classList.remove('ModeChangedPath');
                }, timeout);
            }
        };
    }
}
class FMA extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.isAttExcessive = false;
        this.isAttExcessiveSub = Subject.create(false);
        this.hiddenClassSub = Subject.create('');
        this.roll = new Arinc429Word(0);
        this.pitch = new Arinc429Word(0);
        this.activeLateralMode = 0;
        this.activeVerticalMode = 0;
        this.firstBorderRef = FSComponent.createRef();
        this.secondBorderRef = FSComponent.createRef();
    }
    ;
    attExcessive(pitch, roll) {
        if (!this.isAttExcessive && ((pitch.isNormalOperation() && (-pitch.value > 25 || -pitch.value < -13)) || (roll.isNormalOperation() && Math.abs(roll.value) > 45))) {
            this.isAttExcessive = true;
            return true;
        }
        else if (this.isAttExcessive && pitch.isNormalOperation() && -pitch.value < 22 && -pitch.value > -10 && roll.isNormalOperation() && Math.abs(roll.value) < 40) {
            this.isAttExcessive = false;
            return false;
        }
        return false;
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const fm = this.props.bus.getSubscriber();
        fm.on('roll').handle(r => {
            this.roll = new Arinc429Word(r);
        });
        fm.on('pitch').handle(p => {
            this.pitch = new Arinc429Word(p);
        });
        fm.on('activeLateralMode').whenChanged().handle(activeLateralMode => {
            const isAttExcessive = this.attExcessive(this.pitch, this.roll);
            this.isAttExcessiveSub.set(isAttExcessive);
            const sharedModeActive = activeLateralMode === 32 || activeLateralMode === 33 || activeLateralMode === 34 || (activeLateralMode === 20 && this.activeVerticalMode === 24);
            const BC3Message = getBC3Message(isAttExcessive)[0] !== null;
            const engineMessage = SimVar.GetSimVarValue('L:A32NX_AUTOTHRUST_MODE_MESSAGE', 'enum');
            const AB3Message = (SimVar.GetSimVarValue('L:A32NX_MachPreselVal', 'mach') !== -1
                || SimVar.GetSimVarValue('L:A32NX_SpeedPreselVal', 'knots') !== -1) && BC3Message && engineMessage === 0;
            let secondBorder;
            if (sharedModeActive && !isAttExcessive) {
                secondBorder = '';
            }
            else if (BC3Message) {
                secondBorder = 'm66.241 0.33732v15.766';
            }
            else {
                secondBorder = 'm66.241 0.33732v20.864';
            }
            let firstBorder;
            if (AB3Message && !isAttExcessive) {
                firstBorder = 'm33.117 0.33732v15.766';
            }
            else {
                firstBorder = 'm33.117 0.33732v20.864';
            }
            this.firstBorderRef.instance.setAttribute('d', firstBorder);
            this.secondBorderRef.instance.setAttribute('d', secondBorder);
        });
        fm.on('activeVerticalMode').whenChanged().handle(activeVerticalMode => {
            const isAttExcessive = this.attExcessive(this.pitch, this.roll);
            const sharedModeActive = this.activeLateralMode === 32 || this.activeLateralMode === 33 || this.activeLateralMode === 34 || (this.activeLateralMode === 20 && activeVerticalMode === 24);
            const BC3Message = getBC3Message(isAttExcessive)[0] !== null;
            const engineMessage = SimVar.GetSimVarValue('L:A32NX_AUTOTHRUST_MODE_MESSAGE', 'enum');
            const AB3Message = (SimVar.GetSimVarValue('L:A32NX_MachPreselVal', 'mach') !== -1
                || SimVar.GetSimVarValue('L:A32NX_SpeedPreselVal', 'knots') !== -1) && BC3Message && engineMessage === 0;
            let secondBorder;
            if (sharedModeActive && !isAttExcessive) {
                secondBorder = '';
            }
            else if (BC3Message) {
                secondBorder = 'm66.241 0.33732v15.766';
            }
            else {
                secondBorder = 'm66.241 0.33732v20.864';
            }
            let firstBorder;
            if (AB3Message && !isAttExcessive) {
                firstBorder = 'm33.117 0.33732v15.766';
            }
            else {
                firstBorder = 'm33.117 0.33732v20.864';
            }
            this.hiddenClassSub.set(isAttExcessive ? 'hidden' : 'visible');
            this.firstBorderRef.instance.setAttribute('d', firstBorder);
            this.secondBorderRef.instance.setAttribute('d', secondBorder);
        });
    }
    render() {
        return (FSComponent.buildComponent("g", { id: "FMA" },
            FSComponent.buildComponent("g", { class: "NormalStroke Grey" },
                FSComponent.buildComponent("path", { ref: this.firstBorderRef }),
                FSComponent.buildComponent("path", { ref: this.secondBorderRef }),
                FSComponent.buildComponent("path", { d: "m102.52 0.33732v20.864" }),
                FSComponent.buildComponent("path", { d: "m133.72 0.33732v20.864" })),
            FSComponent.buildComponent(Row1, { bus: this.props.bus, hiddenClassSub: this.hiddenClassSub }),
            FSComponent.buildComponent(Row2, { bus: this.props.bus, hiddenClassSub: this.hiddenClassSub }),
            FSComponent.buildComponent(Row3, { bus: this.props.bus, hiddenClassSub: this.hiddenClassSub, isAttExcessiveSub: this.isAttExcessiveSub })));
    }
}
class Row1 extends DisplayComponent {
    render() {
        return FSComponent.buildComponent("g", null,
            FSComponent.buildComponent(A1A2Cell, { bus: this.props.bus }),
            FSComponent.buildComponent(FSComponent.Fragment, null,
                FSComponent.buildComponent(B1Cell, { visibility: this.props.hiddenClassSub, bus: this.props.bus }),
                FSComponent.buildComponent(C1Cell, { visibility: this.props.hiddenClassSub, bus: this.props.bus }),
                FSComponent.buildComponent(D1D2Cell, { visibility: this.props.hiddenClassSub, bus: this.props.bus }),
                FSComponent.buildComponent(BC1Cell, { visibility: this.props.hiddenClassSub, bus: this.props.bus })),
            FSComponent.buildComponent(E1Cell, { bus: this.props.bus }));
    }
}
class Row2 extends DisplayComponent {
    render() {
        return (FSComponent.buildComponent("g", null,
            FSComponent.buildComponent("g", { visibility: this.props.hiddenClassSub },
                FSComponent.buildComponent(B2Cell, { bus: this.props.bus }),
                FSComponent.buildComponent(C2Cell, { bus: this.props.bus })),
            FSComponent.buildComponent(E2Cell, { bus: this.props.bus })));
    }
}
class Row3 extends DisplayComponent {
    render() {
        return (FSComponent.buildComponent("g", null,
            FSComponent.buildComponent(A3Cell, { bus: this.props.bus }),
            FSComponent.buildComponent("g", { visibility: this.props.hiddenClassSub },
                FSComponent.buildComponent(AB3Cell, { bus: this.props.bus }),
                FSComponent.buildComponent(D3Cell, { bus: this.props.bus })),
            FSComponent.buildComponent(BC3Cell, { isAttExcessive: this.props.isAttExcessiveSub }),
            FSComponent.buildComponent(E3Cell, { bus: this.props.bus })));
    }
}
class A1A2Cell extends ShowForSecondsComponent {
    constructor() {
        super(...arguments);
        this.athrModeSub = Subject.create(0);
        this.cellRef = FSComponent.createRef();
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('AThrMode').whenChanged().handle(athrMode => {
            this.athrModeSub.set(athrMode);
            let text = '';
            switch (athrMode) {
                case 1:
                    text =
                        `
                            <path class="NormalStroke White" d="m24.023 1.8143v13.506h-15.048v-13.506z" />
                            <text class="FontMedium MiddleAlign White" x="16.558302" y="6.8888531">MAN</text>
                            <text class="FontMedium MiddleAlign White" x="16.511532" y="14.232082">TOGA</text>
                        `;
                    break;
                case 2:
                    text =
                        `<g>
                            <path class="NormalStroke White" d="m29.776 1.8143v13.506h-26.414v-13.506z" />
                            <text class="FontMedium MiddleAlign White" x="16.558302" y="6.8888531">MAN</text>
                            <text class="FontMedium MiddleAlign White" x="16.511532" y="14.232082">GA SOFT</text>
                        </g>`;
                    break;
                case 3:
                    const FlexTemp = Math.round(SimVar.GetSimVarValue('L:AIRLINER_TO_FLEX_TEMP', 'number'));
                    const FlexText = FlexTemp >= 0 ? (`+${FlexTemp}`) : FlexTemp.toString();
                    text =
                        `<g>
                            <path class="NormalStroke White" d="m31.521 1.8143v13.506h-30.217v-13.506z" />
                            <text class="FontMedium MiddleAlign White" x="16.558302" y="6.8888531">MAN</text>
                            <text class="FontMedium MiddleAlign White" x="16.511532" y="14.232082">
                                <tspan xmlSpace="preserve">FLX  </tspan>
                                <tspan class="Cyan">${FlexText}</tspan>
                            </text>
                        </g>`;
                    break;
                case 4:
                    text =
                        `<g>
                            <path class="NormalStroke White" d="m23.172 1.8143v13.506h-12.99v-13.506z" />
                            <text class="FontMedium MiddleAlign White" x="16.558302" y="6.8888531">MAN</text>
                            <text class="FontMedium MiddleAlign White" x="16.511532" y="14.232082">DTO</text>
                        </g>`;
                    break;
                case 5:
                    text = `<g>
                            <path class="NormalStroke White" d="m23.172 1.8143v13.506h-12.99v-13.506z" />
                            <text class="FontMedium MiddleAlign White" x="16.558302" y="6.8888531">MAN</text>
                            <text class="FontMedium MiddleAlign White" x="16.511532" y="14.232082">MCT</text>
                        </g>`;
                    break;
                case 6:
                    text =
                        `<g>
                            <path class="NormalStroke Amber" d="m23.172 1.8143v13.506h-12.99v-13.506z" />
                            <text class="FontMedium MiddleAlign White" x="16.558302" y="6.8888531">MAN</text>
                            <text class="FontMedium MiddleAlign White" x="16.511532" y="14.232082">THR</text>
                        </g>`;
                    break;
                case 7:
                    text = `<text  class="FontMedium MiddleAlign Green" x="16.158028" y="6.8888531">SPEED</text>`;
                    this.displayModeChangedPath(9000);
                    break;
                case 8:
                    text = `<text  class="FontMedium MiddleAlign Green" x="16.158028" y="6.8888531">MACH</text>`;
                    this.displayModeChangedPath(9000);
                    break;
                case 9:
                    text = `<text  class="FontMedium MiddleAlign Green" x="16.158028" y="6.8888531">THR MCT</text>`;
                    this.displayModeChangedPath(9000);
                    break;
                case 10:
                    text = `<text  class="FontMedium MiddleAlign Green" x="16.158028" y="6.8888531">THR CLB</text>`;
                    this.displayModeChangedPath(9000);
                    break;
                case 11:
                    text = `<text  class="FontMedium MiddleAlign Green" x="16.158028" y="6.8888531">THR LVR</text>`;
                    this.displayModeChangedPath(9000);
                    break;
                case 12:
                    text = `<text  class="FontMedium MiddleAlign Green" x="16.158028" y="6.8888531">THR IDLE</text>`;
                    this.displayModeChangedPath(9000);
                    break;
                case 13:
                    text =
                        `<g>
                            <path class="NormalStroke Amber BlinkInfinite" d="m0.70556 1.8143h30.927v6.0476h-30.927z" />
                            <text class="FontMedium MiddleAlign Green" x="16.158028" y="6.8888531">A.FLOOR</text>
                        </g>`;
                    break;
                case 14:
                    text =
                        `<g>
                            <path class="NormalStroke Amber BlinkInfinite" d="m0.70556 1.8143h30.927v6.0476h-30.927z" />
                            <text class="FontMedium MiddleAlign Green" x="16.158028" y="6.8888531">TOGA LK</text>
                        </g>`;
                    break;
                default:
                    text = '';
            }
            this.cellRef.instance.innerHTML = text;
            if (text === '') {
                this.displayModeChangedPath(0, true);
            }
        });
    }
    render() {
        return (FSComponent.buildComponent(FSComponent.Fragment, null,
            FSComponent.buildComponent("path", { ref: this.modeChangedPathRef, visibility: 'hidden', class: "NormalStroke White", d: "m0.70556 1.8143h30.927v6.0476h-30.927z" }),
            FSComponent.buildComponent("g", { ref: this.cellRef })));
    }
}
class A3Cell extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.classSub = Subject.create('');
        this.textSub = Subject.create('');
    }
    onUpdateAthrModeMessage(message) {
        let text = '';
        let className = '';
        switch (message) {
            case 1:
                text = 'THR LK';
                className = 'Amber BlinkInfinite';
                break;
            case 2:
                text = 'LVR TOGA';
                className = 'White BlinkInfinite';
                break;
            case 3:
                text = 'LVR CLB';
                className = 'White BlinkInfinite';
                break;
            case 4:
                text = 'LVR MCT';
                className = 'White BlinkInfinite';
                break;
            case 5:
                text = 'LVR ASYM';
                className = 'Amber';
                break;
        }
        this.textSub.set(text);
        this.classSub.set(`FontMedium MiddleAlign ${className}`);
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('athrModeMessage').whenChanged().handle(m => {
            this.onUpdateAthrModeMessage(m);
        });
    }
    render() {
        return (FSComponent.buildComponent("text", { class: this.classSub, x: "16.511532", y: "21.481768" }, this.textSub));
    }
}
class AB3Cell extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.speedPreselVal = -1;
        this.machPreselVal = -1;
        this.athrModeMessage = 0;
        this.textSub = Subject.create('');
    }
    getText() {
        if (this.athrModeMessage === 0) {
            console.log("speed prese " + this.speedPreselVal);
            console.log("mach prese " + this.machPreselVal);
            if (this.speedPreselVal !== -1 && this.machPreselVal === -1) {
                const text = Math.round(this.speedPreselVal);
                this.textSub.set(`SPEED SEL ${text}`);
            }
            else if (this.machPreselVal !== -1 && this.speedPreselVal === -1) {
                this.textSub.set(`MACH SEL ${this.machPreselVal.toFixed(2)}`);
            }
            else if (this.machPreselVal === -1 && this.speedPreselVal === -1) {
                this.textSub.set('');
            }
        }
        else {
            this.textSub.set('');
        }
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('speedPreselVal').whenChanged().handle(m => {
            this.speedPreselVal = m;
            this.getText();
        });
        sub.on('machPreselVal').whenChanged().handle(m => {
            this.machPreselVal = m;
            this.getText();
        });
        sub.on('athrModeMessage').whenChanged().handle(m => {
            this.athrModeMessage = m;
            this.getText();
        });
    }
    render() {
        return (FSComponent.buildComponent("text", { class: "FontMedium MiddleAlign Cyan", x: "35.275196", y: "21.616354" }, this.textSub));
    }
}
class B1Cell extends ShowForSecondsComponent {
    constructor() {
        super(...arguments);
        this.textSub = Subject.create('V/S');
        this.boxClassSub = Subject.create('');
        this.boxPathStringSub = Subject.create('');
        this.activeVerticalModeSub = Subject.create(0);
        this.inProtectionClassSub = Subject.create('Cyan');
        this.speedProtectionPathRef = FSComponent.createRef();
        this.inModeReversionPathRef = FSComponent.createRef();
        this.fmaTextRef = FSComponent.createRef();
        this.addidionalTextSub = Subject.create('V/S');
    }
    getText(activeVerticalMode) {
        let text;
        let additionalText = '';
        let inProtection = false;
        console.log(activeVerticalMode);
        switch (activeVerticalMode) {
            case 31:
                text = 'G/S';
                break;
            // case 2:
            //     text = 'F-G/S';
            //     break;
            case 30:
                text = 'G/S*';
                break;
            // case 4:
            //     text = 'F-G/S*';
            //     break;
            case 40:
            case 41:
                text = 'SRS';
                break;
            case 50:
                text = 'TCAS';
                break;
            // case 9:
            //     text = 'FINAL';
            //     break;
            case 23:
                text = 'DES';
                break;
            case 13:
                if (SimVar.GetSimVarValue('L:A32NX_FMA_EXPEDITE_MODE', 'bool')) {
                    text = 'EXP DES';
                }
                else {
                    text = 'OP DES';
                }
                break;
            case 22:
                text = 'CLB';
                break;
            case 12:
                if (SimVar.GetSimVarValue('L:A32NX_FMA_EXPEDITE_MODE', 'bool')) {
                    text = 'EXP CLB';
                }
                else {
                    text = 'OP CLB';
                }
                break;
            case 10:
                if (SimVar.GetSimVarValue('L:A32NX_FMA_CRUISE_ALT_MODE', 'Bool')) {
                    text = 'ALT CRZ';
                }
                else {
                    text = 'ALT';
                }
                break;
            case 11:
                text = 'ALT*';
                break;
            case 21:
                text = 'ALT CST*';
                break;
            case 20:
                text = 'ALT CST';
                break;
            // case 18:
            //     text = 'ALT CRZ';
            //     break;
            case 15: {
                const FPA = SimVar.GetSimVarValue('L:A32NX_AUTOPILOT_FPA_SELECTED', 'Degree');
                inProtection = SimVar.GetSimVarValue('L:A32NX_FMA_SPEED_PROTECTION_MODE', 'bool');
                const FPAText = `${(FPA >= 0 ? '+' : '')}${(Math.round(FPA * 10) / 10).toFixed(1)}°`;
                text = 'FPA';
                additionalText = FPAText;
                break;
            }
            case 14: {
                const VS = SimVar.GetSimVarValue('L:A32NX_AUTOPILOT_VS_SELECTED', 'feet per minute');
                inProtection = SimVar.GetSimVarValue('L:A32NX_FMA_SPEED_PROTECTION_MODE', 'bool');
                const VSText = `${(VS >= 0 ? '+' : '')}${Math.round(VS).toString()}`.padStart(5, ' ');
                text = 'V/S';
                additionalText = VSText;
                break;
            }
            default:
                text = '';
        }
        const inSpeedProtection = inProtection && (activeVerticalMode === 14 || activeVerticalMode === 15);
        if (inSpeedProtection) {
            this.speedProtectionPathRef.instance.setAttribute('visibility', 'visible');
        }
        else {
            this.speedProtectionPathRef.instance.setAttribute('visibility', 'hidden');
        }
        //DONE 
        /*        if(inModeReversion) {
                   this.inModeReversionPathRef.instance.setAttribute('visibility','visible');
               } else {
                   this.inModeReversionPathRef.instance.setAttribute('visibility','hidden');
               } */
        const tcasModeDisarmedMessage = SimVar.GetSimVarValue('L:A32NX_AUTOPILOT_TCAS_MESSAGE_DISARM', 'bool');
        const boxclass = inSpeedProtection ? 'NormalStroke None' : 'NormalStroke White';
        this.boxClassSub.set(boxclass);
        const boxPathString = activeVerticalMode === 50 && tcasModeDisarmedMessage ? 'm34.656 1.8143h29.918v13.506h-29.918z' : 'm34.656 1.8143h29.918v6.0476h-29.918z';
        this.boxPathStringSub.set(boxPathString);
        this.textSub.set(text);
        this.addidionalTextSub.set(additionalText);
        //console.log(text);
        //console.log(additionalText);
        this.inProtectionClassSub.set(inProtection ? 'PulseCyanFill' : 'Cyan');
        this.fmaTextRef.instance.innerHTML = `<tspan>${text}</tspan><tspan class=${inProtection ? 'PulseCyanFill' : 'Cyan'}>${additionalText}</tspan>`;
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('activeVerticalMode').whenChanged().handle(activeVerticalModem => {
            this.activeVerticalModeSub.set(activeVerticalModem);
            this.getText(activeVerticalModem);
            this.displayModeChangedPath(10000);
        });
        sub.on('ap_vs_selected').whenChanged().handle(svs => {
            //FIXME use the svs instead of getSimvar again
            this.getText(this.activeVerticalModeSub.get());
            this.displayModeChangedPath(10000);
        });
        sub.on('fma_mode_reversion').whenChanged().handle(r => {
            this.displayModeChangedPath(10000);
            if (r) {
                this.inModeReversionPathRef.instance.setAttribute('visibility', 'visible');
                this.boxClassSub.set('NormalStroke None');
            }
            else {
                this.inModeReversionPathRef.instance.setAttribute('visibility', 'hidden');
                this.boxClassSub.set('NormalStroke White');
            }
        });
        sub.on('fma_speed_protection').whenChanged().handle(protection => {
            this.displayModeChangedPath(10000);
            if (!protection) {
                this.speedProtectionPathRef.instance.setAttribute('visibility', 'hidden');
            }
        });
    }
    render() {
        return (FSComponent.buildComponent("g", { visibility: this.props.visibility },
            FSComponent.buildComponent("path", { ref: this.modeChangedPathRef, class: this.boxClassSub, visibility: 'hidden', d: this.boxPathStringSub }),
            FSComponent.buildComponent("path", { ref: this.speedProtectionPathRef, class: "NormalStroke Amber BlinkInfinite", d: "m34.656 1.8143h29.918v6.0476h-29.918z" }),
            FSComponent.buildComponent("path", { ref: this.inModeReversionPathRef, class: "NormalStroke White BlinkInfinite", d: "m34.656 1.8143h29.918v6.0476h-29.918z" }),
            FSComponent.buildComponent("text", { ref: this.fmaTextRef, class: "FontMedium MiddleAlign Green", x: "49.498924", y: "6.8785663" })));
    }
}
class B2Cell extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.text1Sub = Subject.create('');
        this.text2Sub = Subject.create('');
        this.classSub = Subject.create('');
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('fmaVerticalArmed').whenChanged().handle(fmv => {
            const altArmed = (fmv >> 0) & 1;
            const altCstArmed = (fmv >> 1) & 1;
            const clbArmed = (fmv >> 2) & 1;
            const desArmed = (fmv >> 3) & 1;
            const gsArmed = (fmv >> 4) & 1;
            const finalArmed = (fmv >> 5) & 1;
            let text1;
            let color1 = 'Cyan';
            if (clbArmed) {
                text1 = 'CLB';
            }
            else if (desArmed) {
                text1 = 'DES';
            }
            else if (altCstArmed) {
                text1 = 'ALT';
                color1 = 'Magenta';
            }
            else if (altArmed) {
                text1 = 'ALT';
            }
            else {
                text1 = '';
            }
            let text2;
            // case 1:
            //     text2 = 'F-G/S';
            //     break;
            if (gsArmed) {
                text2 = 'G/S';
            }
            else if (finalArmed) {
                text2 = 'FINAL';
            }
            else {
                text2 = '';
            }
            this.text1Sub.set(text1);
            this.text2Sub.set(text2);
            this.classSub.set(`FontMedium MiddleAlign ${color1}`);
        });
    }
    render() {
        return (FSComponent.buildComponent("g", null,
            FSComponent.buildComponent("text", { class: this.classSub, x: "40.520622", y: "14.130308" }, this.text1Sub),
            FSComponent.buildComponent("text", { class: "FontMedium MiddleAlign Cyan", x: "55.275803", y: "14.143736" }, this.text2Sub)));
    }
}
class C1Cell extends ShowForSecondsComponent {
    constructor() {
        super(...arguments);
        this.textSub = Subject.create('');
        this.idSub = Subject.create(0);
        this.activeLateralMode = 0;
        this.activeVerticalMode = 0;
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('activeLateralMode').whenChanged().handle(lm => {
            this.activeLateralMode = lm;
            this.updateText(lm, this.activeVerticalMode);
            this.displayModeChangedPath(10000);
        });
        sub.on('activeVerticalMode').whenChanged().handle(lm => {
            this.activeVerticalMode = lm;
            this.updateText(this.activeLateralMode, lm);
            this.displayModeChangedPath(10000);
        });
    }
    updateText(activeLateralMode, activeVerticalMode) {
        const armedVerticalBitmask = SimVar.GetSimVarValue('L:A32NX_FMA_VERTICAL_ARMED', 'number');
        const finalArmed = (armedVerticalBitmask >> 5) & 1;
        let text;
        let id = 0;
        if (activeLateralMode === 50) {
            text = 'GA TRK';
            id = 1;
        }
        else if (activeLateralMode === 30) {
            text = 'LOC *';
            id = 3;
        }
        else if (activeLateralMode === 10) {
            text = 'HDG';
            id = 5;
        }
        else if (activeLateralMode === 40) {
            text = 'RWY';
            id = 6;
        }
        else if (activeLateralMode === 41) {
            text = 'RWY TRK';
            id = 7;
        }
        else if (activeLateralMode === 11) {
            text = 'TRACK';
            id = 8;
        }
        else if (activeLateralMode === 31) {
            text = 'LOC';
            id = 10;
        }
        else if (activeLateralMode === 20 && !finalArmed && activeVerticalMode !== 24) {
            text = 'NAV';
            id = 13;
        }
        else if (activeLateralMode === 20 && finalArmed && activeVerticalMode !== 24) {
            text = 'APP NAV';
            id = 12;
        }
        else {
            text = '';
        }
        this.textSub.set(text);
        this.idSub.set(id);
    }
    render() {
        // case 2:
        //     text = 'LOC B/C*';
        //     id = 2;
        //     break;
        // case 4:
        //     text = 'F-LOC*';
        //     id = 4;
        //     break;
        // case 9:
        //     text = 'LOC B/C';
        //     id = 9;
        //     break;
        // case 11:
        //     text = 'F-LOC';
        //     id = 11;
        //     break;
        // case 12:
        //     text = 'APP NAV';
        //     id = 12;
        //     break;
        return (FSComponent.buildComponent("g", { visibility: this.props.visibility },
            FSComponent.buildComponent("path", { ref: this.modeChangedPathRef, class: "NormalStroke White", visibility: 'hidden', d: "m100.87 1.8143v6.0476h-33.075l1e-6 -6.0476z" }),
            FSComponent.buildComponent("text", { class: "FontMedium MiddleAlign Green", x: "84.490074", y: "6.9027362" }, this.textSub)));
    }
}
class C2Cell extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.fmaLateralArmed = 0;
        this.fmaVerticalArmed = 0;
        this.activeVerticalMode = 0;
        this.textSub = Subject.create('');
    }
    getText() {
        const navArmed = (this.fmaLateralArmed >> 0) & 1;
        const locArmed = (this.fmaLateralArmed >> 1) & 1;
        const finalArmed = (this.fmaVerticalArmed >> 5) & 1;
        let text = '';
        if (locArmed) {
            // case 1:
            //     text = 'LOC B/C';
            //     break;
            text = 'LOC';
            // case 3:
            //     text = 'F-LOC';
            //     break;
        }
        else if (navArmed && (finalArmed || this.activeVerticalMode === 24)) {
            text = 'APP NAV';
        }
        else if (navArmed) {
            text = 'NAV';
        }
        this.textSub.set(text);
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('fmaLateralArmed').whenChanged().handle(fla => {
            this.fmaLateralArmed = fla;
            this.getText();
        });
        sub.on('fmaVerticalArmed').whenChanged().handle(fva => {
            this.fmaVerticalArmed = fva;
            this.getText();
        });
        sub.on('activeVerticalMode').whenChanged().handle(avm => {
            this.activeVerticalMode = avm;
            this.getText();
        });
    }
    render() {
        return (FSComponent.buildComponent("text", { class: "FontMedium MiddleAlign Cyan", x: "84.536842", y: "14.130308" }, this.textSub));
    }
}
class BC1Cell extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.modeChangedPathRef = FSComponent.createRef();
        this.timeout = 0;
        this.lastLateralMode = 0;
        this.lastVerticalMode = 0;
        this.textSub = Subject.create('');
        this.displayModeChangedPath = (timeout) => {
            this.modeChangedPathRef.instance.classList.add('ModeChangedPath');
            clearTimeout(this.timeout);
            this.timeout = setTimeout(() => {
                this.modeChangedPathRef.instance.classList.remove('ModeChangedPath');
            }, timeout);
        };
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('activeVerticalMode').whenChanged().handle(v => {
            this.lastVerticalMode = v;
            let text;
            if (this.lastVerticalMode === 34) {
                text = 'ROLL OUT';
            }
            else if (this.lastVerticalMode === 33) {
                text = 'FLARE';
            }
            else if (this.lastVerticalMode === 32) {
                text = 'LAND';
            }
            else if (this.lastVerticalMode === 24 && this.lastLateralMode === 20) {
                text = 'FINAL APP';
            }
            else {
                text = '';
            }
            if (text !== '') {
                this.displayModeChangedPath(9000);
            }
            this.textSub.set(text);
        });
        sub.on('activeLateralMode').whenChanged().handle(l => {
            this.lastLateralMode = l;
            let text;
            if (this.lastVerticalMode === 34) {
                text = 'ROLL OUT';
            }
            else if (this.lastVerticalMode === 33) {
                text = 'FLARE';
            }
            else if (this.lastVerticalMode === 32) {
                text = 'LAND';
            }
            else if (this.lastVerticalMode === 24 && this.lastLateralMode === 20) {
                text = 'FINAL APP';
            }
            else {
                text = '';
            }
            if (text !== '') {
                this.displayModeChangedPath(9000);
            }
            this.textSub.set(text);
        });
    }
    render() {
        return (FSComponent.buildComponent("g", null,
            FSComponent.buildComponent("path", { ref: this.modeChangedPathRef, class: "NormalStroke White", visibility: 'hidden', d: "m50.178 1.8143h35.174v6.0476h-35.174z" }),
            FSComponent.buildComponent("text", { class: "FontMedium MiddleAlign Green", x: "67.9795", y: "6.8893085" }, this.textSub)));
    }
}
const getBC3Message = (isAttExcessive) => {
    const armedVerticalBitmask = SimVar.GetSimVarValue('L:A32NX_FMA_VERTICAL_ARMED', 'number');
    const TCASArmed = (armedVerticalBitmask >> 6) & 1;
    const trkFpaDeselectedTCAS = SimVar.GetSimVarValue('L:A32NX_AUTOPILOT_TCAS_MESSAGE_TRK_FPA_DESELECTION', 'bool');
    const tcasRaInhibited = SimVar.GetSimVarValue('L:A32NX_AUTOPILOT_TCAS_MESSAGE_RA_INHIBITED', 'bool');
    let text;
    let className;
    // All currently unused message are set to false
    if (TCASArmed && !isAttExcessive) {
        text = '  TCAS                ';
        className = 'Cyan';
    }
    else if (tcasRaInhibited && !isAttExcessive) {
        text = 'TCAS RA INHIBITED';
        className = 'White';
    }
    else if (trkFpaDeselectedTCAS && !isAttExcessive) {
        text = 'TRK FPA DESELECTED';
        className = 'White';
    }
    else {
        return [null, null];
    }
    return [text, className];
};
class BC3Cell extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.textSub = Subject.create('');
        this.classNameSub = Subject.create('');
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        this.props.isAttExcessive.sub(e => {
            const [text, className] = getBC3Message(e);
            this.classNameSub.set(`FontMedium MiddleAlign ${className}`);
            if (text !== null) {
                this.textSub.set(text);
            }
        });
    }
    render() {
        return (FSComponent.buildComponent("text", { class: this.classNameSub, x: "67.801949", y: "21.481308", xmlSpace: "preserve" }, this.textSub));
    }
}
class D1D2Cell extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.text1Sub = Subject.create('');
        this.text2Sub = Subject.create('');
        this.modeChangedPathRef = FSComponent.createRef();
        this.timeout = 0;
        this.displayModeChangedPath = (timeout) => {
            this.modeChangedPathRef.instance.classList.add('ModeChangedPath');
            clearTimeout(this.timeout);
            this.timeout = setTimeout(() => {
                this.modeChangedPathRef.instance.classList.remove('ModeChangedPath');
            }, timeout);
        };
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const bus = this.props.bus.getSubscriber();
        bus.on('approachCapability').whenChanged().handle(c => {
            let text1;
            let text2;
            switch (c) {
                case 1:
                    text1 = 'CAT1';
                    break;
                case 2:
                    text1 = 'CAT2';
                    break;
                case 3:
                    text1 = 'CAT3';
                    text2 = 'SINGLE';
                    break;
                case 4:
                    text1 = 'CAT3';
                    text2 = 'DUAL';
                    break;
                case 5:
                    text1 = 'AUTO';
                    text2 = 'LAND';
                    break;
                case 6:
                    text1 = 'F-APP';
                    break;
                case 7:
                    text1 = 'F-APP';
                    text2 = '+ RAW';
                    break;
                case 8:
                    text1 = 'RAW';
                    text2 = 'ONLY';
                    break;
                default:
                    text1 = '';
            }
            text2 ? FSComponent.buildComponent("path", { class: "NormalStroke White", d: "m104.1 1.8143h27.994v13.506h-27.994z" })
                : FSComponent.buildComponent("path", { class: "NormalStroke White", d: "m104.1 1.8143h27.994v6.0476h-27.994z" });
            this.text1Sub.set(text1);
            if (text2) {
                this.text2Sub.set(text2);
                this.modeChangedPathRef.instance.setAttribute('d', 'm104.1 1.8143h27.994v13.506h-27.994z');
            }
            else {
                this.modeChangedPathRef.instance.setAttribute('d', 'm104.1 1.8143h27.994v6.0476h-27.994z');
            }
            this.displayModeChangedPath(9000);
        });
    }
    render() {
        return (FSComponent.buildComponent("g", { visibility: this.props.visibility },
            FSComponent.buildComponent("text", { class: "FontMedium MiddleAlign White", x: "118.09216", y: "7.0131598" }, this.text1Sub),
            FSComponent.buildComponent("text", { class: "FontMedium MiddleAlign White", x: "118.15831", y: "14.130308" }, this.text2Sub),
            FSComponent.buildComponent("path", { ref: this.modeChangedPathRef, class: "NormalStroke White", visibility: 'hidden' })));
    }
}
class D3Cell extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.textRef = FSComponent.createRef();
        this.classNameSub = Subject.create('');
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('mda').whenChanged().handle(mda => {
            if (mda !== 0) {
                const MDAText = Math.round(mda).toString().padStart(6, ' ');
                this.textRef.instance.innerHTML = `<tspan>BARO</tspan>
                        <tspan class="Cyan" xmlSpace="preserve">${MDAText}</tspan>`;
            }
        });
        sub.on('dh').whenChanged().handle(dh => {
            let fontSize = 'FontSmallest';
            if (dh !== -1 && dh !== -2) {
                const DHText = Math.round(dh).toString().padStart(4, ' ');
                this.textRef.instance.innerHTML = `
                        <tspan>RADIO</tspan>
                        <tspan class="Cyan" xmlSpace="preserve">${DHText}</tspan>
                    `;
            }
            else if (dh === -2) {
                this.textRef.instance.innerHTML = '<tspan>NO DH</tspan>';
                fontSize = 'FontMedium';
            }
            else {
                this.textRef.instance.innerHTML = '';
            }
            this.classNameSub.set(`${fontSize} MiddleAlign White`);
        });
    }
    render() {
        return (FSComponent.buildComponent("text", { ref: this.textRef, class: this.classNameSub, x: "118.1583", y: "21.188744" }));
    }
}
class E1Cell extends ShowForSecondsComponent {
    constructor() {
        super(...arguments);
        this.ap1Active = false;
        this.ap2Active = false;
        this.textSub = Subject.create('');
    }
    setText() {
        let text;
        if (this.ap1Active && !this.ap2Active) {
            text = 'AP1';
        }
        else if (this.ap2Active && !this.ap1Active) {
            text = 'AP2';
        }
        else if (!this.ap2Active && !this.ap1Active) {
            text = '';
        }
        else {
            text = 'AP1+2';
        }
        this.textSub.set(text);
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('ap1Active').whenChanged().handle(ap => {
            this.ap1Active = ap;
            this.displayModeChangedPath(9000);
            this.setText();
        });
        sub.on('ap2Active').whenChanged().handle(ap => {
            this.ap2Active = ap;
            this.displayModeChangedPath(9000);
            this.setText();
        });
    }
    render() {
        return (FSComponent.buildComponent("g", null,
            FSComponent.buildComponent("path", { ref: this.modeChangedPathRef, visibility: 'hidden', class: "NormalStroke White", d: "m156.13 1.8143v6.0476h-20.81v-6.0476z" }),
            FSComponent.buildComponent("text", { class: "FontMedium MiddleAlign White", x: "145.61546", y: "6.9559975" }, this.textSub)));
    }
}
class E2Cell extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.fd1Active = false;
        this.fd2Active = false;
        this.ap1Active = false;
        this.ap2Active = false;
        this.textSub = Subject.create('');
    }
    getText() {
        if (!this.ap1Active && !this.ap2Active && !this.fd1Active && !this.fd2Active) {
            console.log("END ME");
            this.textSub.set('');
        }
        else {
            const text = `${this.fd1Active ? '1' : '-'} FD ${this.fd2Active ? '2' : '-'}`;
            this.textSub.set(text);
        }
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('fd1Active').whenChanged().handle(fd => {
            console.log("FD 1" + fd);
            this.fd1Active = fd;
            this.getText();
        });
        sub.on('ap1Active').whenChanged().handle(fd => {
            this.ap1Active = fd;
            this.getText();
        });
        sub.on('ap2Active').whenChanged().handle(fd => {
            this.ap2Active = fd;
            this.getText();
        });
        sub.on('fd2Active').whenChanged().handle(fd => {
            this.fd2Active = fd;
            this.getText();
        });
    }
    render() {
        return (FSComponent.buildComponent("text", { class: "FontMedium MiddleAlign White", x: "145.8961", y: "14.218581" }, this.textSub));
    }
}
class E3Cell extends ShowForSecondsComponent {
    constructor() {
        super(...arguments);
        this.classSub = Subject.create('');
    }
    getClass(athrStatus) {
        let color = '';
        switch (athrStatus) {
            case 1:
                color = 'Cyan';
                break;
            case 2:
                color = 'White';
                break;
        }
        this.classSub.set(`FontMedium MiddleAlign ${color}`);
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('athrStatus').whenChanged().handle(a => {
            this.getClass(a);
            this.displayModeChangedPath(9000);
        });
    }
    render() {
        return (FSComponent.buildComponent("g", null,
            FSComponent.buildComponent("path", { ref: this.modeChangedPathRef, class: "NormalStroke White", visibility: 'hidden', d: "m135.32 16.329h20.81v6.0476h-20.81z" }),
            FSComponent.buildComponent("text", { class: this.classSub, x: "145.75578", y: "21.434536" }, "A/THR")));
    }
}

const DisplayRange$1 = 24;
const DistanceSpacing$1 = 7.555;
const ValueSpacing$1 = 5;
class HeadingTape extends DisplayComponent {
    render() {
        /*        if (!this.props.heading.isNormalOperation()) {
                   return <></>;
               }
             */
        const bugs = [];
        return (FSComponent.buildComponent("g", null,
            FSComponent.buildComponent("path", { id: "HeadingTapeBackground", d: "m32.138 145.34h73.536v10.382h-73.536z", class: "TapeBackground" }),
            FSComponent.buildComponent(HorizontalTape
            /* graduationElementFunction={GraduationElement} */
            , { 
                /* graduationElementFunction={GraduationElement} */
                bus: this.props.bus, bugs: bugs, displayRange: DisplayRange$1 + 3, valueSpacing: ValueSpacing$1, distanceSpacing: DistanceSpacing$1 })));
    }
}

const ValueSpacing = 10;
const DistanceSpacing = 10;
const DisplayRange = 42;
class V1BugElement extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.offsetSub = Subject.create('');
        this.visibilitySub = Subject.create('visible');
        this.flightPhase = 0;
        this.v1Speed = 0;
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const pf = this.props.bus.getSubscriber();
        pf.on('v1').whenChanged().handle(g => {
            this.v1Speed = g;
            this.getV1Offset();
            this.getV1Visibility();
        });
        pf.on('flightPhase').whenChanged().handle(g => {
            this.flightPhase = this.flightPhase;
            this.getV1Visibility();
        });
    }
    getV1Offset() {
        const offset = -this.v1Speed * DistanceSpacing / ValueSpacing;
        this.offsetSub.set(`translate(0 ${offset})`);
    }
    getV1Visibility() {
        if (this.flightPhase <= 4 && this.v1Speed !== 0) {
            this.visibilitySub.set('visible');
        }
        else {
            this.visibilitySub.set('hidden');
        }
    }
    render() {
        return (FSComponent.buildComponent("g", { id: "V1BugGroup", transform: this.offsetSub, visibility: this.visibilitySub },
            FSComponent.buildComponent("path", { class: "NormalStroke Cyan", d: "m16.613 80.82h5.4899" }),
            FSComponent.buildComponent("text", { class: "FontLarge MiddleAlign Cyan", x: "26.205544", y: "82.96" }, "1")));
    }
}
class AirspeedIndicator extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.speedSub = Subject.create(0);
        this.speedTapeOutlineRef = FSComponent.createRef();
        this.alphaProtRef = [];
        this.lastAlphaProtSub = Subject.create(0);
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const pf = this.props.bus.getSubscriber();
        pf.on('speed').handle(a => {
            this.speedSub.set(a);
            const airSpeed = new Arinc429Word(a);
            const length = 42.9 + Math.max(Math.max(Math.min(airSpeed.value, 72.1), 30) - 30, 0);
            this.speedTapeOutlineRef.instance.setAttribute('d', `m19.031 38.086v${length}`);
        });
        pf.on('alpha_prot').handle(a => {
            // ALPHA PROT -> SUB ON ALPHA PROT
            /* if (showBars) {
                bugs.push(...BarberpoleIndicator(new Arinc429Word(this.speedSub.get()), a, false, DisplayRange, VAlphaProtBar, 2.923));
            } */
            this.alphaProtRef.forEach((el, index) => {
                const elementValue = a + -1 * 2.923 * index;
                const offset = -elementValue * DistanceSpacing / ValueSpacing;
                el.instance.setAttribute('transform', `translate(0 ${offset})`);
            });
            this.lastAlphaProtSub.set(a);
        });
        // showBars replacement
        pf.on('onGround').whenChanged().handle(g => {
            if (g === 1) {
                this.alphaProtRef.forEach(el => {
                    el.instance.setAttribute('visibility', 'hidden');
                });
            }
            else {
                setTimeout(() => {
                    this.alphaProtRef.forEach(el => {
                        el.instance.setAttribute('visibility', 'visible');
                    });
                }, 10000);
            }
        });
    }
    createAlphaProtBarberPole() {
        let i = 0;
        const group = [];
        for (i; i < 8; i++) {
            const apref = FSComponent.createRef();
            group.push(FSComponent.buildComponent("g", { id: "alpha-prot", ref: apref },
                FSComponent.buildComponent("path", { class: "BarAmber", d: "m21.952 82.254v1.5119m-0.94654-2.923h0.94654v1.4111h-2.9213v-1.4111z" }),
                ");"));
            this.alphaProtRef.push(apref);
        }
        return group;
    }
    render() {
        /*   if (Number.isNaN(airspeed)) {
              return (
                  <>
                      <path id="SpeedTapeBackground" class="TapeBackground" d="m1.9058 123.56v-85.473h17.125v85.473z" />
                      <text id="SpeedFailText" class="Blink9Seconds FontLargest EndAlign Red" x="17.756115" y="83.386398">SPD</text>
                      <SpeedTapeOutline airspeed={100} isRed />
                  </>
              );
              
              } */
        const length = 42.9 + Math.max(Math.max(Math.min(this.speedSub.get(), 72.1), 30) - 30, 0);
        return (FSComponent.buildComponent("g", { id: "SpeedTapeElementsGroup" },
            FSComponent.buildComponent("path", { id: "SpeedTapeBackground", class: "TapeBackground", d: "m1.9058 123.56v-85.473h17.125v85.473z" }),
            FSComponent.buildComponent("path", { id: "SpeedTapeOutlineRight", ref: this.speedTapeOutlineRef, class: 'NormalStroke White', d: `m19.031 38.086v${length}` }),
            FSComponent.buildComponent(VerticalTape, { tapeValue: this.speedSub, bugs: [], lowerLimit: 30, upperLimit: 660, valueSpacing: ValueSpacing, displayRange: DisplayRange + 6, distanceSpacing: DistanceSpacing, type: 'speed' },
                this.createAlphaProtBarberPole(),
                FSComponent.buildComponent(V1BugElement, { bus: this.props.bus })),
            FSComponent.buildComponent(SpeedTrendArrow, { airspeed: this.speedSub, instrument: this.props.instrument }),
            FSComponent.buildComponent(VLsBar, { airspeed: this.speedSub, VAlphaProt: this.lastAlphaProtSub }),
            FSComponent.buildComponent(VAlphaLimBar, { airspeed: this.speedSub })));
    }
}
class AirspeedIndicatorOfftape extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.lowerRef = FSComponent.createRef();
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const subscriber = this.props.bus.getSubscriber();
        subscriber.on('speed').whenChanged().handle(s => {
            const newVal = new Arinc429Word(s);
            if (Number.isNaN(newVal.value)) ;
            else {
                const clampedSpeed = Math.max(Math.min(newVal.value, 660), 30);
                const showLower = clampedSpeed > 72;
                if (showLower) {
                    this.lowerRef.instance.setAttribute('visibility', 'visible');
                }
                else {
                    this.lowerRef.instance.setAttribute('visibility', 'hidden');
                }
            }
        });
    }
    render() {
        // const clampedTargetSpeed = Math.max(Math.min(targetSpeed, 660), 30);
        return (FSComponent.buildComponent("g", { id: "SpeedOfftapeGroup" },
            FSComponent.buildComponent("path", { id: "SpeedTapeOutlineUpper", class: "NormalStroke White", d: "m1.9058 38.086h21.859" }),
            FSComponent.buildComponent("path", { class: "Fill Yellow SmallOutline", d: "m13.994 80.46v0.7257h6.5478l3.1228 1.1491v-3.0238l-3.1228 1.1491z" }),
            FSComponent.buildComponent("path", { class: "Fill Yellow SmallOutline", d: "m0.092604 81.185v-0.7257h2.0147v0.7257z" }),
            FSComponent.buildComponent("path", { id: "SpeedTapeOutlineLower", ref: this.lowerRef, class: "NormalStroke White", d: "m1.9058 123.56h21.859" })));
    }
}
class SpeedTrendArrow extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.refElement = FSComponent.createRef();
        this.arrowBaseRef = FSComponent.createRef();
        this.arrowHeadRef = FSComponent.createRef();
        this.offset = Subject.create('');
        this.pathString = Subject.create('');
        this.lagFilter = new LagFilter(1.2);
        this.airspeedAccRateLimiter = new RateLimiter(1.2, -1.2);
        this.previousAirspeed = 0;
        this.previousTime = new Date().appTime();
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        this.props.airspeed.sub(a => {
            const currentTime = new Date().appTime();
            const deltaTime = this.props.instrument.deltaTime; // (currentTime - this.previousTime);
            const newValue = new Arinc429Word(a);
            const clamped = newValue.isNormalOperation() ? Math.max(newValue.value, 30) : NaN;
            const airspeedAcc = (clamped - this.previousAirspeed) / deltaTime * 1000;
            this.previousAirspeed = clamped;
            const rateLimitedAirspeedAcc = this.airspeedAccRateLimiter.step(airspeedAcc, deltaTime / 1000);
            const filteredAirspeedAcc = this.lagFilter.step(rateLimitedAirspeedAcc, deltaTime / 1000);
            //const airspeedAcc = this.lagFilter.step(newValue.value, deltaTime);
            //console.log(filteredAirspeedAcc);
            const targetSpeed = filteredAirspeedAcc * 10;
            const sign = Math.sign(filteredAirspeedAcc);
            const offset = -targetSpeed * DistanceSpacing / ValueSpacing;
            let pathString;
            const neutralPos = 80.823;
            if (sign > 0) {
                pathString = `m15.455 ${neutralPos + offset} l -1.2531 2.4607 M15.455 ${neutralPos + offset} l 1.2531 2.4607`;
            }
            else {
                pathString = `m15.455 ${neutralPos + offset} l 1.2531 -2.4607 M15.455 ${neutralPos + offset} l -1.2531 -2.4607`;
            }
            this.offset.set(`m15.455 80.823v${offset.toFixed(10)}`);
            this.pathString.set(pathString);
            if (Math.abs(targetSpeed) < 1) {
                this.refElement.instance.setAttribute('visibility', 'hidden');
                // this.arrowBaseRef.instance.setAttribute('d', `m15.455 80.823v${offset}`)
                // this.arrowHeadRef.instance.setAttribute('d', pathString)
            }
            else {
                this.refElement.instance.setAttribute('visibility', 'visible');
            }
            this.previousTime = currentTime;
        });
    }
    render() {
        return (FSComponent.buildComponent("g", { id: "SpeedTrendArrow", ref: this.refElement },
            FSComponent.buildComponent("path", { id: "SpeedTrendArrowBase", ref: this.arrowBaseRef, class: "NormalStroke Yellow", d: this.offset }),
            FSComponent.buildComponent("path", { id: "SpeedTrendArrowHead", ref: this.arrowHeadRef, class: "NormalStroke Yellow", d: this.pathString })));
    }
}
class VLsBar extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.previousTime = new Date().appTime();
        this.lastVls = 0;
        this.vlsPath = Subject.create('');
        this.lastVAlphaProt = 0;
        this.lastAirSpeed = new Arinc429Word(0);
        this.smoothSpeeds = (vlsDestination) => {
            const currentTime = new Date().appTime();
            const deltaTime = currentTime - this.previousTime;
            const seconds = deltaTime / 1000;
            this.lastVls = SmoothSin(this.lastVls, vlsDestination, 0.5, seconds);
            return this.lastVls;
        };
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        this.props.VAlphaProt.sub(alpha => {
            this.lastVAlphaProt = alpha;
            const airSpeed = this.lastAirSpeed;
            const VLs = this.smoothSpeeds(SimVar.GetSimVarValue('L:A32NX_SPEEDS_VLS', 'number'));
            const VLsPos = (airSpeed.value - VLs) * DistanceSpacing / ValueSpacing + 80.818;
            const offset = (VLs - this.lastVAlphaProt) * DistanceSpacing / ValueSpacing;
            this.vlsPath.set(`m19.031 ${VLsPos}h 1.9748v${offset}`);
        });
        this.props.airspeed.sub(s => {
            const airSpeed = new Arinc429Word(s);
            this.lastAirSpeed = airSpeed;
            const VLs = this.smoothSpeeds(SimVar.GetSimVarValue('L:A32NX_SPEEDS_VLS', 'number'));
            const VLsPos = (airSpeed.value - VLs) * DistanceSpacing / ValueSpacing + 80.818;
            const offset = (VLs - this.lastVAlphaProt) * DistanceSpacing / ValueSpacing;
            this.vlsPath.set(`m19.031 ${VLsPos}h 1.9748v${offset}`);
        });
        /*     if (VLs - airspeed < -DisplayRange) {
                return null;
            }
         */
    }
    render() {
        return (FSComponent.buildComponent("path", { id: "VLsIndicator", class: "NormalStroke Amber", d: this.vlsPath }));
    }
}
class VAlphaLimBar extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.offsetPath = Subject.create('');
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        this.props.airspeed.sub(s => {
            const airSpeed = new Arinc429Word(s);
            const VAlphalim = SimVar.GetSimVarValue('L:A32NX_SPEEDS_ALPHA_MAX', 'number');
            if (VAlphalim - airSpeed.value < -DisplayRange) {
                return null;
            }
            const delta = airSpeed.value - DisplayRange - VAlphalim;
            const offset = delta * DistanceSpacing / ValueSpacing;
            this.offsetPath.set(`m19.031 123.56h3.425v${offset}h-3.425z`);
        });
    }
    render() {
        return (FSComponent.buildComponent("path", { id: "VAlimIndicator", class: "Fill Red", d: this.offsetPath }));
    }
}
/* const SpeedTarget = ({ airspeed, targetSpeed, isManaged }) => {
    const color = isManaged ? 'Magenta' : 'Cyan';
    const text = Math.round(targetSpeed).toString().padStart(3, '0');
    if (airspeed - targetSpeed > DisplayRange) {
        return (
            <text id="SelectedSpeedLowerText" class={`FontSmallest EndAlign ${color}`} x="23.994415" y="128.3132">{text}</text>
        );
    } if (airspeed - targetSpeed < -DisplayRange) {
        return (
            <text id="SelectedSpeedLowerText" class={`FontSmallest EndAlign ${color}`} x="23.994289" y="36.750431">{text}</text>
        );
    }
    const offset = (airspeed - targetSpeed) * DistanceSpacing / ValueSpacing;
    return (
        <path class={`NormalStroke ${color} CornerRound`} transform={`translate(0 ${offset})`} d="m19.274 81.895 5.3577 1.9512v-6.0476l-5.3577 1.9512" />
    );
}; */
/*  private createBugs(): [] {
        
 const ValphaMax = getSimVar('L:A32NX_SPEEDS_ALPHA_MAX', 'number');

 const bugs: [(offset: number) => JSX.Element, number][] = [];


 //VMAX
 bugs.push(...BarberpoleIndicator(airspeed, VMax, true, DisplayRange, VMaxBar, 5.040));


 //VPROT
 const showVProt = VMax > 240;
 if (showVProt) {
     bugs.push([VProtBug, VMax + 6]);
 }

 const clampedSpeed = Math.max(Math.min(airspeed, 660), 30);

 const flapsHandleIndex = getSimVar('L:A32NX_FLAPS_HANDLE_INDEX', 'Number');

 let v1 = NaN;
 if (FWCFlightPhase <= 4) {
     //V1 -> GET FLIGHT PHASE IN SUB
     v1 = getSimVar('L:AIRLINER_V1_SPEED', 'knots');
     if (v1 !== 0) {
         bugs.push([V1BugElement, Math.max(Math.min(v1, 660), 30)]);
     }

     //VR -> GET FLIGHT PHASE IN SUB
     const vr = getSimVar('L:AIRLINER_VR_SPEED', 'knots');
     if (vr !== 0) {
         bugs.push([VRBugElement, Math.max(Math.min(vr, 660), 30)]);
     }
 }

 // SUB ON FLAPSHANDLEINDEX
 if (flapsHandleIndex === 0) {
     const GreenDotSpeed = getSimVar('L:A32NX_SPEEDS_GD', 'number');
     bugs.push([GreenDotBugElement, GreenDotSpeed]);
 } else if (flapsHandleIndex === 1) {
     const SlatRetractSpeed = getSimVar('L:A32NX_SPEEDS_S', 'number');
     bugs.push([SlatRetractBugElement, SlatRetractSpeed]);
 } else if (flapsHandleIndex === 2 || flapsHandleIndex === 3) {
     const FlapRetractSpeed = getSimVar('L:A32NX_SPEEDS_F', 'number');
     bugs.push([FlapRetractBugElement, FlapRetractSpeed]);
 }

 // IDK maybe sub on altitude
 if (altitude.isNormalOperation() && altitude.value < 15000 && flapsHandleIndex < 4) {
     const VFENext = getSimVar('L:A32NX_SPEEDS_VFEN', 'number');
     bugs.push([VFENextBugElement, VFENext]);
 }
 return bugs;

} */
/*

interface MachNumberProps {
    mach: Arinc429Word,
}

export const MachNumber = ({ mach }: MachNumberProps) => {
    const machPermille = Math.round(mach.valueOr(0) * 1000);
    const [showMach, setShowMach] = useState(machPermille > 500);

    useEffect(() => {
        if (showMach && machPermille < 450) {
            setShowMach(false);
        }
        if (!showMach && machPermille > 500) {
            setShowMach(true);
        }
    }, [showMach, machPermille]);

    if (!mach.isNormalOperation()) {
        return (
            <text id="MachFailText" class="Blink9Seconds FontLargest StartAlign Red" x="5.4257932" y="136.88908">MACH</text>
        );
    }

    if (!showMach) {
        return null;
    }

    return (
        <text id="CurrentMachText" class="FontLargest StartAlign Green" x="5.4257932" y="136.88908">{`.${machPermille}`}</text>
    );
};

const V1Offtape = ({ airspeed, v1 }) => {
    if (v1 - airspeed > DisplayRange) {
        return (
            <text id="V1SpeedText" class="FontTiny Cyan" x="21.144159" y="43.103134">{Math.round(v1)}</text>
        );
    }
    return null;
};

// Needs filtering, not going to use until then
 */

class VerticalSpeedIndicator extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.verticalSpeedSub = Subject.create(new Arinc429Word(0));
        this.yOffsetSub = Subject.create(0);
        this.isAmberSub = Subject.create(-1);
        this.lastIrVerticalSpeed = new Arinc429Word(0);
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('vs_inert').whenChanged().handle(ivs => {
            const arinc = new Arinc429Word(ivs);
            if (arinc.isNormalOperation()) {
                this.verticalSpeedSub.set(arinc);
            }
            this.lastIrVerticalSpeed = arinc;
        });
        sub.on('vs_baro').whenChanged().handle(ivs => {
            const arinc = new Arinc429Word(ivs);
            // When available, the IR V/S has priority over the ADR barometric V/S.
            if (!this.lastIrVerticalSpeed.isNormalOperation()) {
                this.verticalSpeedSub.set(arinc);
            }
        });
        this.verticalSpeedSub.sub(vs => {
            const absVSpeed = Math.abs(vs.value);
            const radioAlt = SimVar.GetSimVarValue('PLANE ALT ABOVE GROUND MINUS CG', 'feet');
            if (absVSpeed > 6000 || (radioAlt < 2500 && radioAlt > 1000 && vs.value < -2000) || (radioAlt < 1000 && vs.value < -1200)) {
                this.isAmberSub.set(1);
            }
            else {
                this.isAmberSub.set(0);
            }
            const sign = Math.sign(vs.value);
            if (absVSpeed < 1000) {
                this.yOffsetSub.set(vs.value / 1000 * -27.22);
            }
            else if (absVSpeed < 2000) {
                this.yOffsetSub.set((vs.value - sign * 1000) / 1000 * -10.1 - sign * 27.22);
            }
            else if (absVSpeed < 6000) {
                this.yOffsetSub.set((vs.value - sign * 2000) / 4000 * -10.1 - sign * 37.32);
            }
            else {
                this.yOffsetSub.set(sign * -47.37);
            }
        });
    }
    render() {
        return (FSComponent.buildComponent("g", null,
            FSComponent.buildComponent("g", { id: 'vsfailed' },
                FSComponent.buildComponent("path", { class: "TapeBackground", d: "m151.84 131.72 4.1301-15.623v-70.556l-4.1301-15.623h-5.5404v101.8z" }),
                FSComponent.buildComponent("g", { id: "VSpeedFailText" },
                    FSComponent.buildComponent("text", { class: "Blink9Seconds FontLargest Red EndAlign", x: "153.13206", y: "77.501472" }, "V"),
                    FSComponent.buildComponent("text", { class: "Blink9Seconds FontLargest Red EndAlign", x: "153.13406", y: "83.211388" }, "/"),
                    FSComponent.buildComponent("text", { class: "Blink9Seconds FontLargest Red EndAlign", x: "152.99374", y: "88.870819" }, "S"))),
            FSComponent.buildComponent("path", { class: "TapeBackground", d: "m151.84 131.72 4.1301-15.623v-70.556l-4.1301-15.623h-5.5404v101.8z" }),
            FSComponent.buildComponent("g", { id: "VerticalSpeedGroup" },
                FSComponent.buildComponent("g", { class: "Fill White" },
                    FSComponent.buildComponent("path", { d: "m149.92 54.339v-1.4615h1.9151v1.4615z" }),
                    FSComponent.buildComponent("path", { d: "m149.92 44.26v-1.4615h1.9151v1.4615z" }),
                    FSComponent.buildComponent("path", { d: "m149.92 34.054v-1.2095h1.9151v1.2095z" }),
                    FSComponent.buildComponent("path", { d: "m151.84 107.31h-1.9151v1.4615h1.9151z" }),
                    FSComponent.buildComponent("path", { d: "m151.84 117.39h-1.9151v1.4615h1.9151z" }),
                    FSComponent.buildComponent("path", { d: "m151.84 127.59h-1.9151v1.2095h1.9151z" })),
                FSComponent.buildComponent("g", { class: "NormalStroke White" },
                    FSComponent.buildComponent("path", { d: "m149.92 67.216h1.7135" }),
                    FSComponent.buildComponent("path", { d: "m151.84 48.569h-1.9151" }),
                    FSComponent.buildComponent("path", { d: "m151.84 38.489h-1.9151" }),
                    FSComponent.buildComponent("path", { d: "m149.92 94.43h1.7135" }),
                    FSComponent.buildComponent("path", { d: "m151.84 113.08h-1.9151" }),
                    FSComponent.buildComponent("path", { d: "m151.84 123.16h-1.9151" })),
                FSComponent.buildComponent("g", { class: "FontSmallest MiddleAlign Fill White" },
                    FSComponent.buildComponent("text", { x: "148.07108", y: "109.72845" }, "1"),
                    FSComponent.buildComponent("text", { x: "148.14471", y: "119.8801" }, "2"),
                    FSComponent.buildComponent("text", { x: "148.07108", y: "129.90607" }, "6"),
                    FSComponent.buildComponent("text", { x: "148.09711", y: "55.316456" }, "1"),
                    FSComponent.buildComponent("text", { x: "148.06529", y: "45.356102" }, "2"),
                    FSComponent.buildComponent("text", { x: "148.11371", y: "35.195072" }, "6")),
                FSComponent.buildComponent("path", { class: "Fill Yellow", d: "m145.79 80.067h6.0476v1.5119h-6.0476z" }),
                FSComponent.buildComponent(VSpeedNeedle, { isAmber: this.isAmberSub, yOffset: this.yOffsetSub }),
                FSComponent.buildComponent(VSpeedText, { yOffset: this.yOffsetSub, isAmber: this.isAmberSub, VSpeed: this.verticalSpeedSub }))));
    }
}
class VSpeedNeedle extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.outLineRef = FSComponent.createRef();
        this.indicatorRef = FSComponent.createRef();
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        this.props.yOffset.sub(offset => {
            this.outLineRef.instance.setAttribute('d', `m162.74 80.822 l -12 ${offset}`);
            this.indicatorRef.instance.setAttribute('d', `m162.74 80.822 l -12 ${offset}`);
        });
        this.props.isAmber.sub(isAmberi => {
            const className = `HugeStroke ${isAmberi === 1 ? 'Amber' : 'Green'}`;
            console.log('le classname ' + className);
            this.indicatorRef.instance.setAttribute('class', className);
        });
    }
    render() {
        return (FSComponent.buildComponent(FSComponent.Fragment, null,
            FSComponent.buildComponent("path", { ref: this.outLineRef, class: "HugeOutline" }),
            FSComponent.buildComponent("path", { ref: this.indicatorRef, id: "VSpeedIndicator" })));
    }
}
class VSpeedText extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.vsTextRef = FSComponent.createRef();
        this.groupRef = FSComponent.createRef();
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        this.props.VSpeed.sub(vs => {
            const absVSpeed = Math.abs(vs.value);
            if (absVSpeed < 200) {
                this.groupRef.instance.setAttribute('visibility', 'hidden');
                return;
            }
            else {
                this.groupRef.instance.setAttribute('visibility', 'visible');
            }
            const sign = Math.sign(vs.value);
            const textOffset = this.props.yOffset.get() - sign * 2.4;
            const text = (Math.round(absVSpeed / 100) < 10 ? '0' : '') + Math.round(absVSpeed / 100).toString();
            this.vsTextRef.instance.textContent = text;
            this.groupRef.instance.setAttribute('transform', `translate(0 ${textOffset})`);
        });
        /*   this.props.yOffset.sub(offset => {
  
          }) */
        this.props.isAmber.sub(isAmber => {
            const className = `FontSmallest MiddleAlign ${isAmber === 1 ? 'Amber' : 'Green'}`;
            this.vsTextRef.instance.setAttribute('class', className);
        });
    }
    render() {
        return (FSComponent.buildComponent("g", { ref: this.groupRef, id: "VSpeedTextGroup" },
            FSComponent.buildComponent("path", { class: "BackgroundFill", d: "m158.4 83.011h-7.0514v-4.3989h7.0514z" }),
            FSComponent.buildComponent("text", { ref: this.vsTextRef, id: "VSpeedText", x: "154.84036", y: "82.554581" })));
    }
}

class PFDComponent extends DisplayComponent {
    constructor(props) {
        super(props);
        const subscriber = props.bus.getSubscriber();
        const consumer = subscriber.on('pitch');
        this.pitch = ConsumerSubject.create(consumer, 0);
    }
    onAfterRender(node) {
    }
    render() {
        return (FSComponent.buildComponent(DisplayUnit, { potentiometerIndex: 88, failed: false, bus: this.props.bus },
            FSComponent.buildComponent("svg", { class: "pfd-svg", version: "1.1", viewBox: "0 0 158.75 158.75", xmlns: "http://www.w3.org/2000/svg" },
                FSComponent.buildComponent(Horizon, { bus: this.props.bus, instrument: this.props.instrument, heading: new Arinc429Word(211), FDActive: true, selectedHeading: 222, isOnGround: true, radioAlt: 0, decisionHeight: 200, isAttExcessive: false }),
                FSComponent.buildComponent("path", { id: "Mask1", class: "BackgroundFill", 
                    // eslint-disable-next-line max-len
                    d: "m32.138 101.25c7.4164 13.363 21.492 21.652 36.768 21.652 15.277 0 29.352-8.2886 36.768-21.652v-40.859c-7.4164-13.363-21.492-21.652-36.768-21.652-15.277 0-29.352 8.2886-36.768 21.652zm-32.046 57.498h158.66v-158.75h-158.66z" }),
                FSComponent.buildComponent(HeadingTape, { bus: this.props.bus }),
                FSComponent.buildComponent(AltitudeIndicator, { bus: this.props.bus }),
                FSComponent.buildComponent(AirspeedIndicator
                /*        airspeed={clampedAirspeed}
                       airspeedAcc={filteredAirspeedAcc} */
                /*   FWCFlightPhase={FlightPhase} */
                /*    altitude={altitude}
                   VLs={vls}
                   VMax={VMax}
                   showBars={showSpeedBars} */
                , { 
                    /*        airspeed={clampedAirspeed}
                           airspeedAcc={filteredAirspeedAcc} */
                    /*   FWCFlightPhase={FlightPhase} */
                    /*    altitude={altitude}
                       VLs={vls}
                       VMax={VMax}
                       showBars={showSpeedBars} */
                    bus: this.props.bus, instrument: this.props.instrument }),
                FSComponent.buildComponent("path", { id: "Mask2", class: "BackgroundFill", 
                    // eslint-disable-next-line max-len
                    d: "m32.138 145.34h73.536v10.382h-73.536zm0-44.092c7.4164 13.363 21.492 21.652 36.768 21.652 15.277 0 29.352-8.2886 36.768-21.652v-40.859c-7.4164-13.363-21.492-21.652-36.768-21.652-15.277 0-29.352 8.2886-36.768 21.652zm-32.046 57.498h158.66v-158.75h-158.66zm115.14-35.191v-85.473h15.609v85.473zm-113.33 0v-85.473h27.548v85.473z" }),
                FSComponent.buildComponent(AirspeedIndicatorOfftape, { bus: this.props.bus }),
                FSComponent.buildComponent(AttitudeIndicatorFixedUpper, { bus: this.props.bus }),
                FSComponent.buildComponent(AttitudeIndicatorFixedCenter, { bus: this.props.bus }),
                FSComponent.buildComponent(VerticalSpeedIndicator, { bus: this.props.bus }),
                FSComponent.buildComponent(AltitudeIndicatorOfftape, { mode: '', bus: this.props.bus }),
                FSComponent.buildComponent(FMA, { bus: this.props.bus }))));
    }
}

class AdirsValueProvider {
    constructor(bus, pfdSimvar) {
        const sub = bus.getSubscriber();
        const url = document.getElementsByTagName('a32nx-pfd')[0].getAttribute('url');
        const displayIndex = url ? parseInt(url.substring(url.length - 1), 10) : 0;
        sub.on('attHdgKnob').whenChanged().handle(k => {
            const inertialSource = getSupplier(displayIndex, k);
            pfdSimvar.updateSimVarSource('vs_inert', { name: `L:A32NX_ADIRS_IR_${inertialSource}_VERTICAL_SPEED`, type: SimVarValueType.Number });
            pfdSimvar.updateSimVarSource('pitch', { name: `L:A32NX_ADIRS_IR_${inertialSource}_PITCH`, type: SimVarValueType.Number });
            pfdSimvar.updateSimVarSource('roll', { name: `L:A32NX_ADIRS_IR_${inertialSource}_ROLL`, type: SimVarValueType.Number });
            pfdSimvar.updateSimVarSource('heading', { name: `L:A32NX_ADIRS_IR_${inertialSource}_HEADING`, type: SimVarValueType.Number });
        });
        sub.on('airKnob').whenChanged().handle(a => {
            const airSource = getSupplier(displayIndex, a);
            pfdSimvar.updateSimVarSource('speed', { name: `L:A32NX_ADIRS_ADR_${airSource}_COMPUTED_AIRSPEED`, type: SimVarValueType.Number });
            pfdSimvar.updateSimVarSource('vs_baro', { name: `L:A32NX_ADIRS_ADR_${airSource}_BAROMETRIC_VERTICAL_SPEED`, type: SimVarValueType.Number });
            pfdSimvar.updateSimVarSource('altitude', { name: `L:A32NX_ADIRS_ADR_${airSource}_ALTITUDE`, type: SimVarValueType.Number });
        });
    }
}
const isCaptainSide = (displayIndex) => displayIndex === 1;
const getSupplier = (displayIndex, knobValue) => {
    const adirs3ToCaptain = 0;
    const adirs3ToFO = 2;
    if (isCaptainSide(displayIndex)) {
        return knobValue === adirs3ToCaptain ? 3 : 1;
    }
    return knobValue === adirs3ToFO ? 3 : 2;
};

var PFDVars;
(function (PFDVars) {
    PFDVars["ColdDark"] = "L:A32NX_COLD_AND_DARK_SPAWN";
    PFDVars["elec"] = "L:A32NX_ELEC_AC_ESS_BUS_IS_POWERED";
    PFDVars["potentiometer_captain"] = "LIGHT POTENTIOMETER:88";
    PFDVars["pitch"] = "L:A32NX_ADIRS_IR_1_PITCH";
    PFDVars["roll"] = "L:A32NX_ADIRS_IR_1_ROLL";
    PFDVars["heading"] = "L:A32NX_ADIRS_IR_1_HEADING";
    PFDVars["altitude"] = "L:A32NX_ADIRS_ADR_1_ALTITUDE";
    PFDVars["speed"] = "L:A32NX_ADIRS_ADR_1_COMPUTED_AIRSPEED";
    PFDVars["alpha_prot"] = "L:A32NX_SPEEDS_ALPHA_PROTECTION";
    PFDVars["onGround"] = "SIM ON GROUND";
    PFDVars["activeLateralMode"] = "L:A32NX_FMA_LATERAL_MODE";
    PFDVars["activeVerticalMode"] = "L:A32NX_FMA_VERTICAL_MODE";
    PFDVars["fma_mode_reversion"] = "L:A32NX_FMA_MODE_REVERSION";
    PFDVars["fma_speed_protection"] = "L:A32NX_FMA_SPEED_PROTECTION_MODE";
    PFDVars["AThrMode"] = "L:A32NX_AUTOTHRUST_MODE";
    PFDVars["ap_vs_selected"] = "L:A32NX_AUTOPILOT_VS_SELECTED";
    PFDVars["radio_alt"] = "PLANE ALT ABOVE GROUND MINUS CG";
    PFDVars["approachCapability"] = "L:A32NX_ApproachCapability";
    PFDVars["ap1Active"] = "L:A32NX_AUTOPILOT_1_ACTIVE";
    PFDVars["ap2Active"] = "L:A32NX_AUTOPILOT_2_ACTIVE";
    PFDVars["fmaVerticalArmed"] = "L:A32NX_FMA_VERTICAL_ARMED";
    PFDVars["fmaLateralArmed"] = "L:A32NX_FMA_LATERAL_ARMED";
    PFDVars["fd1Active"] = "AUTOPILOT FLIGHT DIRECTOR ACTIVE:1";
    PFDVars["fd2Active"] = "AUTOPILOT FLIGHT DIRECTOR ACTIVE:2";
    PFDVars["athrStatus"] = "L:A32NX_AUTOTHRUST_STATUS";
    PFDVars["athrModeMessage"] = "L:A32NX_AUTOTHRUST_MODE_MESSAGE";
    PFDVars["machPreselVal"] = "L:A32NX_MachPreselVal";
    PFDVars["speedPreselVal"] = "L:A32NX_SpeedPreselVal";
    PFDVars["mda"] = "L:AIRLINER_MINIMUM_DESCENT_ALTITUDE";
    PFDVars["dh"] = "L:AIRLINER_DECISION_HEIGHT";
    PFDVars["attHdgKnob"] = "L:A32NX_ATT_HDG_SWITCHING_KNOB";
    PFDVars["airKnob"] = "L:A32NX_AIR_DATA_SWITCHING_KNOB";
    PFDVars["vs_baro"] = "L:A32NX_ADIRS_ADR_1_BAROMETRIC_VERTICAL_SPEED";
    PFDVars["vs_inert"] = "L:A32NX_ADIRS_IR_1_VERTICAL_SPEED";
    PFDVars["sideStickX"] = "L:A32NX_SIDESTICK_POSITION_X";
    PFDVars["sideStickY"] = "L:A32NX_SIDESTICK_POSITION_Y";
    PFDVars["fdYawCommand"] = "L:A32NX_FLIGHT_DIRECTOR_YAW";
    PFDVars["fdBank"] = "L:A32NX_FLIGHT_DIRECTOR_BANK";
    PFDVars["fdPitch"] = "L:A32NX_FLIGHT_DIRECTOR_PITCH";
    PFDVars["v1"] = "L:AIRLINER_V1_SPEED";
    PFDVars["flightPhase"] = "L:A32NX_FWC_FLIGHT_PHASE";
})(PFDVars || (PFDVars = {}));
/** A publisher to poll and publish nav/com simvars. */
class PFDSimvarPublisher extends SimVarPublisher {
    /**
     * Create a NavComSimVarPublisher
     * @param bus The EventBus to publish to
     */
    constructor(bus) {
        super(PFDSimvarPublisher.simvars, bus);
    }
}
PFDSimvarPublisher.simvars = new Map([
    ['coldDark', { name: PFDVars.ColdDark, type: SimVarValueType.Number }],
    ['elec', { name: PFDVars.elec, type: SimVarValueType.Bool }],
    ['potentiometer_captain', { name: PFDVars.potentiometer_captain, type: SimVarValueType.Number }],
    ['pitch', { name: PFDVars.pitch, type: SimVarValueType.Number }],
    ['roll', { name: PFDVars.roll, type: SimVarValueType.Number }],
    ['heading', { name: PFDVars.heading, type: SimVarValueType.Number }],
    ['altitude', { name: PFDVars.altitude, type: SimVarValueType.Number }],
    ['speed', { name: PFDVars.speed, type: SimVarValueType.Number }],
    ['alpha_prot', { name: PFDVars.alpha_prot, type: SimVarValueType.Number }],
    ['onGround', { name: PFDVars.onGround, type: SimVarValueType.Number }],
    ['activeLateralMode', { name: PFDVars.activeLateralMode, type: SimVarValueType.Number }],
    ['activeVerticalMode', { name: PFDVars.activeVerticalMode, type: SimVarValueType.Number }],
    ['fma_mode_reversion', { name: PFDVars.fma_mode_reversion, type: SimVarValueType.Number }],
    ['fma_speed_protection', { name: PFDVars.fma_speed_protection, type: SimVarValueType.Number }],
    ['AThrMode', { name: PFDVars.AThrMode, type: SimVarValueType.Number }],
    ['ap_vs_selected', { name: PFDVars.ap_vs_selected, type: SimVarValueType.Number }],
    ['radio_alt', { name: PFDVars.radio_alt, type: SimVarValueType.Feet }],
    ['approachCapability', { name: PFDVars.approachCapability, type: SimVarValueType.Number }],
    ['ap1Active', { name: PFDVars.ap1Active, type: SimVarValueType.Bool }],
    ['ap2Active', { name: PFDVars.ap2Active, type: SimVarValueType.Bool }],
    ['fmaVerticalArmed', { name: PFDVars.fmaVerticalArmed, type: SimVarValueType.Number }],
    ['fmaLateralArmed', { name: PFDVars.fmaLateralArmed, type: SimVarValueType.Number }],
    ['fd1Active', { name: PFDVars.fd1Active, type: SimVarValueType.Bool }],
    ['fd2Active', { name: PFDVars.fd2Active, type: SimVarValueType.Bool }],
    ['athrStatus', { name: PFDVars.athrStatus, type: SimVarValueType.Number }],
    ['athrModeMessage', { name: PFDVars.athrModeMessage, type: SimVarValueType.Number }],
    ['machPreselVal', { name: PFDVars.machPreselVal, type: SimVarValueType.Number }],
    ['speedPreselVal', { name: PFDVars.speedPreselVal, type: SimVarValueType.Knots }],
    ['mda', { name: PFDVars.mda, type: SimVarValueType.Feet }],
    ['dh', { name: PFDVars.dh, type: SimVarValueType.Feet }],
    ['attHdgKnob', { name: PFDVars.attHdgKnob, type: SimVarValueType.Enum }],
    ['airKnob', { name: PFDVars.airKnob, type: SimVarValueType.Enum }],
    ['vs_baro', { name: PFDVars.vs_baro, type: SimVarValueType.Number }],
    ['vs_inert', { name: PFDVars.vs_baro, type: SimVarValueType.Number }],
    ['sideStickX', { name: PFDVars.sideStickX, type: SimVarValueType.Number }],
    ['sideStickY', { name: PFDVars.sideStickY, type: SimVarValueType.Number }],
    ['fdYawCommand', { name: PFDVars.fdYawCommand, type: SimVarValueType.Number }],
    ['fdBank', { name: PFDVars.fdBank, type: SimVarValueType.Number }],
    ['fdPitch', { name: PFDVars.fdPitch, type: SimVarValueType.Number }],
    ['v1', { name: PFDVars.v1, type: SimVarValueType.Number }],
    ['flightPhase', { name: PFDVars.flightPhase, type: SimVarValueType.Number }],
]);

class A32NX_PFD extends BaseInstrument {
    constructor() {
        super();
        this.bus = new EventBus();
        this.simVarPublisher = new PFDSimvarPublisher(this.bus);
    }
    get templateID() {
        return 'A32NX_PFD';
    }
    connectedCallback() {
        super.connectedCallback();
        this.simVarPublisher.subscribe('elec');
        this.simVarPublisher.subscribe('coldDark');
        this.simVarPublisher.subscribe('potentiometer_captain');
        this.simVarPublisher.subscribe('pitch');
        this.simVarPublisher.subscribe('roll');
        this.simVarPublisher.subscribe('heading');
        this.simVarPublisher.subscribe('altitude');
        this.simVarPublisher.subscribe('speed');
        this.simVarPublisher.subscribe('alpha_prot');
        this.simVarPublisher.subscribe('onGround');
        this.simVarPublisher.subscribe('activeLateralMode');
        this.simVarPublisher.subscribe('activeVerticalMode');
        this.simVarPublisher.subscribe('fma_mode_reversion');
        this.simVarPublisher.subscribe('fma_speed_protection');
        this.simVarPublisher.subscribe('AThrMode');
        this.simVarPublisher.subscribe('ap_vs_selected');
        this.simVarPublisher.subscribe('radio_alt');
        this.simVarPublisher.subscribe('approachCapability');
        this.simVarPublisher.subscribe('ap1Active');
        this.simVarPublisher.subscribe('ap2Active');
        this.simVarPublisher.subscribe('fmaVerticalArmed');
        this.simVarPublisher.subscribe('fmaLateralArmed');
        this.simVarPublisher.subscribe('fd1Active');
        this.simVarPublisher.subscribe('fd2Active');
        this.simVarPublisher.subscribe('athrStatus');
        this.simVarPublisher.subscribe('athrModeMessage');
        this.simVarPublisher.subscribe('machPreselVal');
        this.simVarPublisher.subscribe('speedPreselVal');
        this.simVarPublisher.subscribe('mda');
        this.simVarPublisher.subscribe('dh');
        this.simVarPublisher.subscribe('attHdgKnob');
        this.simVarPublisher.subscribe('airKnob');
        this.simVarPublisher.subscribe('vs_baro');
        this.simVarPublisher.subscribe('vs_inert');
        this.simVarPublisher.subscribe('sideStickY');
        this.simVarPublisher.subscribe('sideStickX');
        this.simVarPublisher.subscribe('fdYawCommand');
        this.simVarPublisher.subscribe('fdBank');
        this.simVarPublisher.subscribe('fdPitch');
        this.simVarPublisher.startPublish();
        new AdirsValueProvider(this.bus, this.simVarPublisher);
        FSComponent.render(FSComponent.buildComponent(PFDComponent, { bus: this.bus, instrument: this }), document.getElementById('PFD_CONTENT'));
    }
    /**
 * A callback called when the instrument gets a frame update.
 */
    Update() {
        super.Update();
        this.simVarPublisher.onUpdate();
    }
}
registerInstrument('a32nx-pfd', A32NX_PFD);
