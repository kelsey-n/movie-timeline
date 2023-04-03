
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity$2 = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function get_root_for_style(node) {
        if (!node)
            return document;
        const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
        if (root && root.host) {
            return root;
        }
        return node.ownerDocument;
    }
    function append_empty_stylesheet(node) {
        const style_element = element('style');
        append_stylesheet(get_root_for_style(node), style_element);
        return style_element.sheet;
    }
    function append_stylesheet(node, style) {
        append(node.head || node, style);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function xlink_attr(node, attribute, value) {
        node.setAttributeNS('http://www.w3.org/1999/xlink', attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    // unfortunately this can't be a constant as that wouldn't be tree-shakeable
    // so we cache the result instead
    let crossorigin;
    function is_crossorigin() {
        if (crossorigin === undefined) {
            crossorigin = false;
            try {
                if (typeof window !== 'undefined' && window.parent) {
                    void window.parent.document;
                }
            }
            catch (error) {
                crossorigin = true;
            }
        }
        return crossorigin;
    }
    function add_resize_listener(node, fn) {
        const computed_style = getComputedStyle(node);
        if (computed_style.position === 'static') {
            node.style.position = 'relative';
        }
        const iframe = element('iframe');
        iframe.setAttribute('style', 'display: block; position: absolute; top: 0; left: 0; width: 100%; height: 100%; ' +
            'overflow: hidden; border: 0; opacity: 0; pointer-events: none; z-index: -1;');
        iframe.setAttribute('aria-hidden', 'true');
        iframe.tabIndex = -1;
        const crossorigin = is_crossorigin();
        let unsubscribe;
        if (crossorigin) {
            iframe.src = "data:text/html,<script>onresize=function(){parent.postMessage(0,'*')}</script>";
            unsubscribe = listen(window, 'message', (event) => {
                if (event.source === iframe.contentWindow)
                    fn();
            });
        }
        else {
            iframe.src = 'about:blank';
            iframe.onload = () => {
                unsubscribe = listen(iframe.contentWindow, 'resize', fn);
            };
        }
        append(node, iframe);
        return () => {
            if (crossorigin) {
                unsubscribe();
            }
            else if (unsubscribe && iframe.contentWindow) {
                unsubscribe();
            }
            detach(iframe);
        };
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    // we need to store the information for multiple documents because a Svelte application could also contain iframes
    // https://github.com/sveltejs/svelte/issues/3624
    const managed_styles = new Map();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_style_information(doc, node) {
        const info = { stylesheet: append_empty_stylesheet(node), rules: {} };
        managed_styles.set(doc, info);
        return info;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = get_root_for_style(node);
        const { stylesheet, rules } = managed_styles.get(doc) || create_style_information(doc, node);
        if (!rules[name]) {
            rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            managed_styles.forEach(info => {
                const { stylesheet } = info;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                info.rules = {};
            });
            managed_styles.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity$2, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                started = true;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.49.0' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function ascending(a, b) {
      return a == null || b == null ? NaN : a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
    }

    function descending(a, b) {
      return a == null || b == null ? NaN
        : b < a ? -1
        : b > a ? 1
        : b >= a ? 0
        : NaN;
    }

    function bisector(f) {
      let compare1, compare2, delta;

      // If an accessor is specified, promote it to a comparator. In this case we
      // can test whether the search value is (self-) comparable. We can’t do this
      // for a comparator (except for specific, known comparators) because we can’t
      // tell if the comparator is symmetric, and an asymmetric comparator can’t be
      // used to test whether a single value is comparable.
      if (f.length !== 2) {
        compare1 = ascending;
        compare2 = (d, x) => ascending(f(d), x);
        delta = (d, x) => f(d) - x;
      } else {
        compare1 = f === ascending || f === descending ? f : zero$1;
        compare2 = f;
        delta = f;
      }

      function left(a, x, lo = 0, hi = a.length) {
        if (lo < hi) {
          if (compare1(x, x) !== 0) return hi;
          do {
            const mid = (lo + hi) >>> 1;
            if (compare2(a[mid], x) < 0) lo = mid + 1;
            else hi = mid;
          } while (lo < hi);
        }
        return lo;
      }

      function right(a, x, lo = 0, hi = a.length) {
        if (lo < hi) {
          if (compare1(x, x) !== 0) return hi;
          do {
            const mid = (lo + hi) >>> 1;
            if (compare2(a[mid], x) <= 0) lo = mid + 1;
            else hi = mid;
          } while (lo < hi);
        }
        return lo;
      }

      function center(a, x, lo = 0, hi = a.length) {
        const i = left(a, x, lo, hi - 1);
        return i > lo && delta(a[i - 1], x) > -delta(a[i], x) ? i - 1 : i;
      }

      return {left, center, right};
    }

    function zero$1() {
      return 0;
    }

    function number$1(x) {
      return x === null ? NaN : +x;
    }

    const ascendingBisect = bisector(ascending);
    const bisectRight = ascendingBisect.right;
    bisector(number$1).center;
    var bisect = bisectRight;

    var e10 = Math.sqrt(50),
        e5 = Math.sqrt(10),
        e2 = Math.sqrt(2);

    function ticks(start, stop, count) {
      var reverse,
          i = -1,
          n,
          ticks,
          step;

      stop = +stop, start = +start, count = +count;
      if (start === stop && count > 0) return [start];
      if (reverse = stop < start) n = start, start = stop, stop = n;
      if ((step = tickIncrement(start, stop, count)) === 0 || !isFinite(step)) return [];

      if (step > 0) {
        let r0 = Math.round(start / step), r1 = Math.round(stop / step);
        if (r0 * step < start) ++r0;
        if (r1 * step > stop) --r1;
        ticks = new Array(n = r1 - r0 + 1);
        while (++i < n) ticks[i] = (r0 + i) * step;
      } else {
        step = -step;
        let r0 = Math.round(start * step), r1 = Math.round(stop * step);
        if (r0 / step < start) ++r0;
        if (r1 / step > stop) --r1;
        ticks = new Array(n = r1 - r0 + 1);
        while (++i < n) ticks[i] = (r0 + i) / step;
      }

      if (reverse) ticks.reverse();

      return ticks;
    }

    function tickIncrement(start, stop, count) {
      var step = (stop - start) / Math.max(0, count),
          power = Math.floor(Math.log(step) / Math.LN10),
          error = step / Math.pow(10, power);
      return power >= 0
          ? (error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1) * Math.pow(10, power)
          : -Math.pow(10, -power) / (error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1);
    }

    function tickStep(start, stop, count) {
      var step0 = Math.abs(stop - start) / Math.max(0, count),
          step1 = Math.pow(10, Math.floor(Math.log(step0) / Math.LN10)),
          error = step0 / step1;
      if (error >= e10) step1 *= 10;
      else if (error >= e5) step1 *= 5;
      else if (error >= e2) step1 *= 2;
      return stop < start ? -step1 : step1;
    }

    function max$1(values, valueof) {
      let max;
      if (valueof === undefined) {
        for (const value of values) {
          if (value != null
              && (max < value || (max === undefined && value >= value))) {
            max = value;
          }
        }
      } else {
        let index = -1;
        for (let value of values) {
          if ((value = valueof(value, ++index, values)) != null
              && (max < value || (max === undefined && value >= value))) {
            max = value;
          }
        }
      }
      return max;
    }

    function min$1(values, valueof) {
      let min;
      if (valueof === undefined) {
        for (const value of values) {
          if (value != null
              && (min > value || (min === undefined && value >= value))) {
            min = value;
          }
        }
      } else {
        let index = -1;
        for (let value of values) {
          if ((value = valueof(value, ++index, values)) != null
              && (min > value || (min === undefined && value >= value))) {
            min = value;
          }
        }
      }
      return min;
    }

    function filter(values, test) {
      if (typeof test !== "function") throw new TypeError("test is not a function");
      const array = [];
      let index = -1;
      for (const value of values) {
        if (test(value, ++index, values)) {
          array.push(value);
        }
      }
      return array;
    }

    function define(constructor, factory, prototype) {
      constructor.prototype = factory.prototype = prototype;
      prototype.constructor = constructor;
    }

    function extend$1(parent, definition) {
      var prototype = Object.create(parent.prototype);
      for (var key in definition) prototype[key] = definition[key];
      return prototype;
    }

    function Color() {}

    var darker = 0.7;
    var brighter = 1 / darker;

    var reI = "\\s*([+-]?\\d+)\\s*",
        reN = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*",
        reP = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*",
        reHex = /^#([0-9a-f]{3,8})$/,
        reRgbInteger = new RegExp(`^rgb\\(${reI},${reI},${reI}\\)$`),
        reRgbPercent = new RegExp(`^rgb\\(${reP},${reP},${reP}\\)$`),
        reRgbaInteger = new RegExp(`^rgba\\(${reI},${reI},${reI},${reN}\\)$`),
        reRgbaPercent = new RegExp(`^rgba\\(${reP},${reP},${reP},${reN}\\)$`),
        reHslPercent = new RegExp(`^hsl\\(${reN},${reP},${reP}\\)$`),
        reHslaPercent = new RegExp(`^hsla\\(${reN},${reP},${reP},${reN}\\)$`);

    var named = {
      aliceblue: 0xf0f8ff,
      antiquewhite: 0xfaebd7,
      aqua: 0x00ffff,
      aquamarine: 0x7fffd4,
      azure: 0xf0ffff,
      beige: 0xf5f5dc,
      bisque: 0xffe4c4,
      black: 0x000000,
      blanchedalmond: 0xffebcd,
      blue: 0x0000ff,
      blueviolet: 0x8a2be2,
      brown: 0xa52a2a,
      burlywood: 0xdeb887,
      cadetblue: 0x5f9ea0,
      chartreuse: 0x7fff00,
      chocolate: 0xd2691e,
      coral: 0xff7f50,
      cornflowerblue: 0x6495ed,
      cornsilk: 0xfff8dc,
      crimson: 0xdc143c,
      cyan: 0x00ffff,
      darkblue: 0x00008b,
      darkcyan: 0x008b8b,
      darkgoldenrod: 0xb8860b,
      darkgray: 0xa9a9a9,
      darkgreen: 0x006400,
      darkgrey: 0xa9a9a9,
      darkkhaki: 0xbdb76b,
      darkmagenta: 0x8b008b,
      darkolivegreen: 0x556b2f,
      darkorange: 0xff8c00,
      darkorchid: 0x9932cc,
      darkred: 0x8b0000,
      darksalmon: 0xe9967a,
      darkseagreen: 0x8fbc8f,
      darkslateblue: 0x483d8b,
      darkslategray: 0x2f4f4f,
      darkslategrey: 0x2f4f4f,
      darkturquoise: 0x00ced1,
      darkviolet: 0x9400d3,
      deeppink: 0xff1493,
      deepskyblue: 0x00bfff,
      dimgray: 0x696969,
      dimgrey: 0x696969,
      dodgerblue: 0x1e90ff,
      firebrick: 0xb22222,
      floralwhite: 0xfffaf0,
      forestgreen: 0x228b22,
      fuchsia: 0xff00ff,
      gainsboro: 0xdcdcdc,
      ghostwhite: 0xf8f8ff,
      gold: 0xffd700,
      goldenrod: 0xdaa520,
      gray: 0x808080,
      green: 0x008000,
      greenyellow: 0xadff2f,
      grey: 0x808080,
      honeydew: 0xf0fff0,
      hotpink: 0xff69b4,
      indianred: 0xcd5c5c,
      indigo: 0x4b0082,
      ivory: 0xfffff0,
      khaki: 0xf0e68c,
      lavender: 0xe6e6fa,
      lavenderblush: 0xfff0f5,
      lawngreen: 0x7cfc00,
      lemonchiffon: 0xfffacd,
      lightblue: 0xadd8e6,
      lightcoral: 0xf08080,
      lightcyan: 0xe0ffff,
      lightgoldenrodyellow: 0xfafad2,
      lightgray: 0xd3d3d3,
      lightgreen: 0x90ee90,
      lightgrey: 0xd3d3d3,
      lightpink: 0xffb6c1,
      lightsalmon: 0xffa07a,
      lightseagreen: 0x20b2aa,
      lightskyblue: 0x87cefa,
      lightslategray: 0x778899,
      lightslategrey: 0x778899,
      lightsteelblue: 0xb0c4de,
      lightyellow: 0xffffe0,
      lime: 0x00ff00,
      limegreen: 0x32cd32,
      linen: 0xfaf0e6,
      magenta: 0xff00ff,
      maroon: 0x800000,
      mediumaquamarine: 0x66cdaa,
      mediumblue: 0x0000cd,
      mediumorchid: 0xba55d3,
      mediumpurple: 0x9370db,
      mediumseagreen: 0x3cb371,
      mediumslateblue: 0x7b68ee,
      mediumspringgreen: 0x00fa9a,
      mediumturquoise: 0x48d1cc,
      mediumvioletred: 0xc71585,
      midnightblue: 0x191970,
      mintcream: 0xf5fffa,
      mistyrose: 0xffe4e1,
      moccasin: 0xffe4b5,
      navajowhite: 0xffdead,
      navy: 0x000080,
      oldlace: 0xfdf5e6,
      olive: 0x808000,
      olivedrab: 0x6b8e23,
      orange: 0xffa500,
      orangered: 0xff4500,
      orchid: 0xda70d6,
      palegoldenrod: 0xeee8aa,
      palegreen: 0x98fb98,
      paleturquoise: 0xafeeee,
      palevioletred: 0xdb7093,
      papayawhip: 0xffefd5,
      peachpuff: 0xffdab9,
      peru: 0xcd853f,
      pink: 0xffc0cb,
      plum: 0xdda0dd,
      powderblue: 0xb0e0e6,
      purple: 0x800080,
      rebeccapurple: 0x663399,
      red: 0xff0000,
      rosybrown: 0xbc8f8f,
      royalblue: 0x4169e1,
      saddlebrown: 0x8b4513,
      salmon: 0xfa8072,
      sandybrown: 0xf4a460,
      seagreen: 0x2e8b57,
      seashell: 0xfff5ee,
      sienna: 0xa0522d,
      silver: 0xc0c0c0,
      skyblue: 0x87ceeb,
      slateblue: 0x6a5acd,
      slategray: 0x708090,
      slategrey: 0x708090,
      snow: 0xfffafa,
      springgreen: 0x00ff7f,
      steelblue: 0x4682b4,
      tan: 0xd2b48c,
      teal: 0x008080,
      thistle: 0xd8bfd8,
      tomato: 0xff6347,
      turquoise: 0x40e0d0,
      violet: 0xee82ee,
      wheat: 0xf5deb3,
      white: 0xffffff,
      whitesmoke: 0xf5f5f5,
      yellow: 0xffff00,
      yellowgreen: 0x9acd32
    };

    define(Color, color, {
      copy(channels) {
        return Object.assign(new this.constructor, this, channels);
      },
      displayable() {
        return this.rgb().displayable();
      },
      hex: color_formatHex, // Deprecated! Use color.formatHex.
      formatHex: color_formatHex,
      formatHex8: color_formatHex8,
      formatHsl: color_formatHsl,
      formatRgb: color_formatRgb,
      toString: color_formatRgb
    });

    function color_formatHex() {
      return this.rgb().formatHex();
    }

    function color_formatHex8() {
      return this.rgb().formatHex8();
    }

    function color_formatHsl() {
      return hslConvert(this).formatHsl();
    }

    function color_formatRgb() {
      return this.rgb().formatRgb();
    }

    function color(format) {
      var m, l;
      format = (format + "").trim().toLowerCase();
      return (m = reHex.exec(format)) ? (l = m[1].length, m = parseInt(m[1], 16), l === 6 ? rgbn(m) // #ff0000
          : l === 3 ? new Rgb((m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), ((m & 0xf) << 4) | (m & 0xf), 1) // #f00
          : l === 8 ? rgba(m >> 24 & 0xff, m >> 16 & 0xff, m >> 8 & 0xff, (m & 0xff) / 0xff) // #ff000000
          : l === 4 ? rgba((m >> 12 & 0xf) | (m >> 8 & 0xf0), (m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), (((m & 0xf) << 4) | (m & 0xf)) / 0xff) // #f000
          : null) // invalid hex
          : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) // rgb(255, 0, 0)
          : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) // rgb(100%, 0%, 0%)
          : (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) // rgba(255, 0, 0, 1)
          : (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) // rgb(100%, 0%, 0%, 1)
          : (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) // hsl(120, 50%, 50%)
          : (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) // hsla(120, 50%, 50%, 1)
          : named.hasOwnProperty(format) ? rgbn(named[format]) // eslint-disable-line no-prototype-builtins
          : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0)
          : null;
    }

    function rgbn(n) {
      return new Rgb(n >> 16 & 0xff, n >> 8 & 0xff, n & 0xff, 1);
    }

    function rgba(r, g, b, a) {
      if (a <= 0) r = g = b = NaN;
      return new Rgb(r, g, b, a);
    }

    function rgbConvert(o) {
      if (!(o instanceof Color)) o = color(o);
      if (!o) return new Rgb;
      o = o.rgb();
      return new Rgb(o.r, o.g, o.b, o.opacity);
    }

    function rgb(r, g, b, opacity) {
      return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
    }

    function Rgb(r, g, b, opacity) {
      this.r = +r;
      this.g = +g;
      this.b = +b;
      this.opacity = +opacity;
    }

    define(Rgb, rgb, extend$1(Color, {
      brighter(k) {
        k = k == null ? brighter : Math.pow(brighter, k);
        return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
      },
      darker(k) {
        k = k == null ? darker : Math.pow(darker, k);
        return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
      },
      rgb() {
        return this;
      },
      clamp() {
        return new Rgb(clampi(this.r), clampi(this.g), clampi(this.b), clampa(this.opacity));
      },
      displayable() {
        return (-0.5 <= this.r && this.r < 255.5)
            && (-0.5 <= this.g && this.g < 255.5)
            && (-0.5 <= this.b && this.b < 255.5)
            && (0 <= this.opacity && this.opacity <= 1);
      },
      hex: rgb_formatHex, // Deprecated! Use color.formatHex.
      formatHex: rgb_formatHex,
      formatHex8: rgb_formatHex8,
      formatRgb: rgb_formatRgb,
      toString: rgb_formatRgb
    }));

    function rgb_formatHex() {
      return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}`;
    }

    function rgb_formatHex8() {
      return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}${hex((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
    }

    function rgb_formatRgb() {
      const a = clampa(this.opacity);
      return `${a === 1 ? "rgb(" : "rgba("}${clampi(this.r)}, ${clampi(this.g)}, ${clampi(this.b)}${a === 1 ? ")" : `, ${a})`}`;
    }

    function clampa(opacity) {
      return isNaN(opacity) ? 1 : Math.max(0, Math.min(1, opacity));
    }

    function clampi(value) {
      return Math.max(0, Math.min(255, Math.round(value) || 0));
    }

    function hex(value) {
      value = clampi(value);
      return (value < 16 ? "0" : "") + value.toString(16);
    }

    function hsla(h, s, l, a) {
      if (a <= 0) h = s = l = NaN;
      else if (l <= 0 || l >= 1) h = s = NaN;
      else if (s <= 0) h = NaN;
      return new Hsl(h, s, l, a);
    }

    function hslConvert(o) {
      if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
      if (!(o instanceof Color)) o = color(o);
      if (!o) return new Hsl;
      if (o instanceof Hsl) return o;
      o = o.rgb();
      var r = o.r / 255,
          g = o.g / 255,
          b = o.b / 255,
          min = Math.min(r, g, b),
          max = Math.max(r, g, b),
          h = NaN,
          s = max - min,
          l = (max + min) / 2;
      if (s) {
        if (r === max) h = (g - b) / s + (g < b) * 6;
        else if (g === max) h = (b - r) / s + 2;
        else h = (r - g) / s + 4;
        s /= l < 0.5 ? max + min : 2 - max - min;
        h *= 60;
      } else {
        s = l > 0 && l < 1 ? 0 : h;
      }
      return new Hsl(h, s, l, o.opacity);
    }

    function hsl(h, s, l, opacity) {
      return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
    }

    function Hsl(h, s, l, opacity) {
      this.h = +h;
      this.s = +s;
      this.l = +l;
      this.opacity = +opacity;
    }

    define(Hsl, hsl, extend$1(Color, {
      brighter(k) {
        k = k == null ? brighter : Math.pow(brighter, k);
        return new Hsl(this.h, this.s, this.l * k, this.opacity);
      },
      darker(k) {
        k = k == null ? darker : Math.pow(darker, k);
        return new Hsl(this.h, this.s, this.l * k, this.opacity);
      },
      rgb() {
        var h = this.h % 360 + (this.h < 0) * 360,
            s = isNaN(h) || isNaN(this.s) ? 0 : this.s,
            l = this.l,
            m2 = l + (l < 0.5 ? l : 1 - l) * s,
            m1 = 2 * l - m2;
        return new Rgb(
          hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
          hsl2rgb(h, m1, m2),
          hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2),
          this.opacity
        );
      },
      clamp() {
        return new Hsl(clamph(this.h), clampt(this.s), clampt(this.l), clampa(this.opacity));
      },
      displayable() {
        return (0 <= this.s && this.s <= 1 || isNaN(this.s))
            && (0 <= this.l && this.l <= 1)
            && (0 <= this.opacity && this.opacity <= 1);
      },
      formatHsl() {
        const a = clampa(this.opacity);
        return `${a === 1 ? "hsl(" : "hsla("}${clamph(this.h)}, ${clampt(this.s) * 100}%, ${clampt(this.l) * 100}%${a === 1 ? ")" : `, ${a})`}`;
      }
    }));

    function clamph(value) {
      value = (value || 0) % 360;
      return value < 0 ? value + 360 : value;
    }

    function clampt(value) {
      return Math.max(0, Math.min(1, value || 0));
    }

    /* From FvD 13.37, CSS Color Module Level 3 */
    function hsl2rgb(h, m1, m2) {
      return (h < 60 ? m1 + (m2 - m1) * h / 60
          : h < 180 ? m2
          : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60
          : m1) * 255;
    }

    var constant$1 = x => () => x;

    function linear$1(a, d) {
      return function(t) {
        return a + t * d;
      };
    }

    function exponential(a, b, y) {
      return a = Math.pow(a, y), b = Math.pow(b, y) - a, y = 1 / y, function(t) {
        return Math.pow(a + t * b, y);
      };
    }

    function gamma(y) {
      return (y = +y) === 1 ? nogamma : function(a, b) {
        return b - a ? exponential(a, b, y) : constant$1(isNaN(a) ? b : a);
      };
    }

    function nogamma(a, b) {
      var d = b - a;
      return d ? linear$1(a, d) : constant$1(isNaN(a) ? b : a);
    }

    var interpolateRgb = (function rgbGamma(y) {
      var color = gamma(y);

      function rgb$1(start, end) {
        var r = color((start = rgb(start)).r, (end = rgb(end)).r),
            g = color(start.g, end.g),
            b = color(start.b, end.b),
            opacity = nogamma(start.opacity, end.opacity);
        return function(t) {
          start.r = r(t);
          start.g = g(t);
          start.b = b(t);
          start.opacity = opacity(t);
          return start + "";
        };
      }

      rgb$1.gamma = rgbGamma;

      return rgb$1;
    })(1);

    function numberArray(a, b) {
      if (!b) b = [];
      var n = a ? Math.min(b.length, a.length) : 0,
          c = b.slice(),
          i;
      return function(t) {
        for (i = 0; i < n; ++i) c[i] = a[i] * (1 - t) + b[i] * t;
        return c;
      };
    }

    function isNumberArray(x) {
      return ArrayBuffer.isView(x) && !(x instanceof DataView);
    }

    function genericArray(a, b) {
      var nb = b ? b.length : 0,
          na = a ? Math.min(nb, a.length) : 0,
          x = new Array(na),
          c = new Array(nb),
          i;

      for (i = 0; i < na; ++i) x[i] = interpolate(a[i], b[i]);
      for (; i < nb; ++i) c[i] = b[i];

      return function(t) {
        for (i = 0; i < na; ++i) c[i] = x[i](t);
        return c;
      };
    }

    function date(a, b) {
      var d = new Date;
      return a = +a, b = +b, function(t) {
        return d.setTime(a * (1 - t) + b * t), d;
      };
    }

    function interpolateNumber(a, b) {
      return a = +a, b = +b, function(t) {
        return a * (1 - t) + b * t;
      };
    }

    function object(a, b) {
      var i = {},
          c = {},
          k;

      if (a === null || typeof a !== "object") a = {};
      if (b === null || typeof b !== "object") b = {};

      for (k in b) {
        if (k in a) {
          i[k] = interpolate(a[k], b[k]);
        } else {
          c[k] = b[k];
        }
      }

      return function(t) {
        for (k in i) c[k] = i[k](t);
        return c;
      };
    }

    var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g,
        reB = new RegExp(reA.source, "g");

    function zero(b) {
      return function() {
        return b;
      };
    }

    function one(b) {
      return function(t) {
        return b(t) + "";
      };
    }

    function interpolateString(a, b) {
      var bi = reA.lastIndex = reB.lastIndex = 0, // scan index for next number in b
          am, // current match in a
          bm, // current match in b
          bs, // string preceding current number in b, if any
          i = -1, // index in s
          s = [], // string constants and placeholders
          q = []; // number interpolators

      // Coerce inputs to strings.
      a = a + "", b = b + "";

      // Interpolate pairs of numbers in a & b.
      while ((am = reA.exec(a))
          && (bm = reB.exec(b))) {
        if ((bs = bm.index) > bi) { // a string precedes the next number in b
          bs = b.slice(bi, bs);
          if (s[i]) s[i] += bs; // coalesce with previous string
          else s[++i] = bs;
        }
        if ((am = am[0]) === (bm = bm[0])) { // numbers in a & b match
          if (s[i]) s[i] += bm; // coalesce with previous string
          else s[++i] = bm;
        } else { // interpolate non-matching numbers
          s[++i] = null;
          q.push({i: i, x: interpolateNumber(am, bm)});
        }
        bi = reB.lastIndex;
      }

      // Add remains of b.
      if (bi < b.length) {
        bs = b.slice(bi);
        if (s[i]) s[i] += bs; // coalesce with previous string
        else s[++i] = bs;
      }

      // Special optimization for only a single match.
      // Otherwise, interpolate each of the numbers and rejoin the string.
      return s.length < 2 ? (q[0]
          ? one(q[0].x)
          : zero(b))
          : (b = q.length, function(t) {
              for (var i = 0, o; i < b; ++i) s[(o = q[i]).i] = o.x(t);
              return s.join("");
            });
    }

    function interpolate(a, b) {
      var t = typeof b, c;
      return b == null || t === "boolean" ? constant$1(b)
          : (t === "number" ? interpolateNumber
          : t === "string" ? ((c = color(b)) ? (b = c, interpolateRgb) : interpolateString)
          : b instanceof color ? interpolateRgb
          : b instanceof Date ? date
          : isNumberArray(b) ? numberArray
          : Array.isArray(b) ? genericArray
          : typeof b.valueOf !== "function" && typeof b.toString !== "function" || isNaN(b) ? object
          : interpolateNumber)(a, b);
    }

    function interpolateRound(a, b) {
      return a = +a, b = +b, function(t) {
        return Math.round(a * (1 - t) + b * t);
      };
    }

    const pi$1 = Math.PI,
        tau$1 = 2 * pi$1,
        epsilon$1 = 1e-6,
        tauEpsilon = tau$1 - epsilon$1;

    function Path() {
      this._x0 = this._y0 = // start of current subpath
      this._x1 = this._y1 = null; // end of current subpath
      this._ = "";
    }

    function path() {
      return new Path;
    }

    Path.prototype = path.prototype = {
      constructor: Path,
      moveTo: function(x, y) {
        this._ += "M" + (this._x0 = this._x1 = +x) + "," + (this._y0 = this._y1 = +y);
      },
      closePath: function() {
        if (this._x1 !== null) {
          this._x1 = this._x0, this._y1 = this._y0;
          this._ += "Z";
        }
      },
      lineTo: function(x, y) {
        this._ += "L" + (this._x1 = +x) + "," + (this._y1 = +y);
      },
      quadraticCurveTo: function(x1, y1, x, y) {
        this._ += "Q" + (+x1) + "," + (+y1) + "," + (this._x1 = +x) + "," + (this._y1 = +y);
      },
      bezierCurveTo: function(x1, y1, x2, y2, x, y) {
        this._ += "C" + (+x1) + "," + (+y1) + "," + (+x2) + "," + (+y2) + "," + (this._x1 = +x) + "," + (this._y1 = +y);
      },
      arcTo: function(x1, y1, x2, y2, r) {
        x1 = +x1, y1 = +y1, x2 = +x2, y2 = +y2, r = +r;
        var x0 = this._x1,
            y0 = this._y1,
            x21 = x2 - x1,
            y21 = y2 - y1,
            x01 = x0 - x1,
            y01 = y0 - y1,
            l01_2 = x01 * x01 + y01 * y01;

        // Is the radius negative? Error.
        if (r < 0) throw new Error("negative radius: " + r);

        // Is this path empty? Move to (x1,y1).
        if (this._x1 === null) {
          this._ += "M" + (this._x1 = x1) + "," + (this._y1 = y1);
        }

        // Or, is (x1,y1) coincident with (x0,y0)? Do nothing.
        else if (!(l01_2 > epsilon$1));

        // Or, are (x0,y0), (x1,y1) and (x2,y2) collinear?
        // Equivalently, is (x1,y1) coincident with (x2,y2)?
        // Or, is the radius zero? Line to (x1,y1).
        else if (!(Math.abs(y01 * x21 - y21 * x01) > epsilon$1) || !r) {
          this._ += "L" + (this._x1 = x1) + "," + (this._y1 = y1);
        }

        // Otherwise, draw an arc!
        else {
          var x20 = x2 - x0,
              y20 = y2 - y0,
              l21_2 = x21 * x21 + y21 * y21,
              l20_2 = x20 * x20 + y20 * y20,
              l21 = Math.sqrt(l21_2),
              l01 = Math.sqrt(l01_2),
              l = r * Math.tan((pi$1 - Math.acos((l21_2 + l01_2 - l20_2) / (2 * l21 * l01))) / 2),
              t01 = l / l01,
              t21 = l / l21;

          // If the start tangent is not coincident with (x0,y0), line to.
          if (Math.abs(t01 - 1) > epsilon$1) {
            this._ += "L" + (x1 + t01 * x01) + "," + (y1 + t01 * y01);
          }

          this._ += "A" + r + "," + r + ",0,0," + (+(y01 * x20 > x01 * y20)) + "," + (this._x1 = x1 + t21 * x21) + "," + (this._y1 = y1 + t21 * y21);
        }
      },
      arc: function(x, y, r, a0, a1, ccw) {
        x = +x, y = +y, r = +r, ccw = !!ccw;
        var dx = r * Math.cos(a0),
            dy = r * Math.sin(a0),
            x0 = x + dx,
            y0 = y + dy,
            cw = 1 ^ ccw,
            da = ccw ? a0 - a1 : a1 - a0;

        // Is the radius negative? Error.
        if (r < 0) throw new Error("negative radius: " + r);

        // Is this path empty? Move to (x0,y0).
        if (this._x1 === null) {
          this._ += "M" + x0 + "," + y0;
        }

        // Or, is (x0,y0) not coincident with the previous point? Line to (x0,y0).
        else if (Math.abs(this._x1 - x0) > epsilon$1 || Math.abs(this._y1 - y0) > epsilon$1) {
          this._ += "L" + x0 + "," + y0;
        }

        // Is this arc empty? We’re done.
        if (!r) return;

        // Does the angle go the wrong way? Flip the direction.
        if (da < 0) da = da % tau$1 + tau$1;

        // Is this a complete circle? Draw two arcs to complete the circle.
        if (da > tauEpsilon) {
          this._ += "A" + r + "," + r + ",0,1," + cw + "," + (x - dx) + "," + (y - dy) + "A" + r + "," + r + ",0,1," + cw + "," + (this._x1 = x0) + "," + (this._y1 = y0);
        }

        // Is this arc non-empty? Draw an arc!
        else if (da > epsilon$1) {
          this._ += "A" + r + "," + r + ",0," + (+(da >= pi$1)) + "," + cw + "," + (this._x1 = x + r * Math.cos(a1)) + "," + (this._y1 = y + r * Math.sin(a1));
        }
      },
      rect: function(x, y, w, h) {
        this._ += "M" + (this._x0 = this._x1 = +x) + "," + (this._y0 = this._y1 = +y) + "h" + (+w) + "v" + (+h) + "h" + (-w) + "Z";
      },
      toString: function() {
        return this._;
      }
    };

    function formatDecimal(x) {
      return Math.abs(x = Math.round(x)) >= 1e21
          ? x.toLocaleString("en").replace(/,/g, "")
          : x.toString(10);
    }

    // Computes the decimal coefficient and exponent of the specified number x with
    // significant digits p, where x is positive and p is in [1, 21] or undefined.
    // For example, formatDecimalParts(1.23) returns ["123", 0].
    function formatDecimalParts(x, p) {
      if ((i = (x = p ? x.toExponential(p - 1) : x.toExponential()).indexOf("e")) < 0) return null; // NaN, ±Infinity
      var i, coefficient = x.slice(0, i);

      // The string returned by toExponential either has the form \d\.\d+e[-+]\d+
      // (e.g., 1.2e+3) or the form \de[-+]\d+ (e.g., 1e+3).
      return [
        coefficient.length > 1 ? coefficient[0] + coefficient.slice(2) : coefficient,
        +x.slice(i + 1)
      ];
    }

    function exponent(x) {
      return x = formatDecimalParts(Math.abs(x)), x ? x[1] : NaN;
    }

    function formatGroup(grouping, thousands) {
      return function(value, width) {
        var i = value.length,
            t = [],
            j = 0,
            g = grouping[0],
            length = 0;

        while (i > 0 && g > 0) {
          if (length + g + 1 > width) g = Math.max(1, width - length);
          t.push(value.substring(i -= g, i + g));
          if ((length += g + 1) > width) break;
          g = grouping[j = (j + 1) % grouping.length];
        }

        return t.reverse().join(thousands);
      };
    }

    function formatNumerals(numerals) {
      return function(value) {
        return value.replace(/[0-9]/g, function(i) {
          return numerals[+i];
        });
      };
    }

    // [[fill]align][sign][symbol][0][width][,][.precision][~][type]
    var re = /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;

    function formatSpecifier(specifier) {
      if (!(match = re.exec(specifier))) throw new Error("invalid format: " + specifier);
      var match;
      return new FormatSpecifier({
        fill: match[1],
        align: match[2],
        sign: match[3],
        symbol: match[4],
        zero: match[5],
        width: match[6],
        comma: match[7],
        precision: match[8] && match[8].slice(1),
        trim: match[9],
        type: match[10]
      });
    }

    formatSpecifier.prototype = FormatSpecifier.prototype; // instanceof

    function FormatSpecifier(specifier) {
      this.fill = specifier.fill === undefined ? " " : specifier.fill + "";
      this.align = specifier.align === undefined ? ">" : specifier.align + "";
      this.sign = specifier.sign === undefined ? "-" : specifier.sign + "";
      this.symbol = specifier.symbol === undefined ? "" : specifier.symbol + "";
      this.zero = !!specifier.zero;
      this.width = specifier.width === undefined ? undefined : +specifier.width;
      this.comma = !!specifier.comma;
      this.precision = specifier.precision === undefined ? undefined : +specifier.precision;
      this.trim = !!specifier.trim;
      this.type = specifier.type === undefined ? "" : specifier.type + "";
    }

    FormatSpecifier.prototype.toString = function() {
      return this.fill
          + this.align
          + this.sign
          + this.symbol
          + (this.zero ? "0" : "")
          + (this.width === undefined ? "" : Math.max(1, this.width | 0))
          + (this.comma ? "," : "")
          + (this.precision === undefined ? "" : "." + Math.max(0, this.precision | 0))
          + (this.trim ? "~" : "")
          + this.type;
    };

    // Trims insignificant zeros, e.g., replaces 1.2000k with 1.2k.
    function formatTrim(s) {
      out: for (var n = s.length, i = 1, i0 = -1, i1; i < n; ++i) {
        switch (s[i]) {
          case ".": i0 = i1 = i; break;
          case "0": if (i0 === 0) i0 = i; i1 = i; break;
          default: if (!+s[i]) break out; if (i0 > 0) i0 = 0; break;
        }
      }
      return i0 > 0 ? s.slice(0, i0) + s.slice(i1 + 1) : s;
    }

    var prefixExponent;

    function formatPrefixAuto(x, p) {
      var d = formatDecimalParts(x, p);
      if (!d) return x + "";
      var coefficient = d[0],
          exponent = d[1],
          i = exponent - (prefixExponent = Math.max(-8, Math.min(8, Math.floor(exponent / 3))) * 3) + 1,
          n = coefficient.length;
      return i === n ? coefficient
          : i > n ? coefficient + new Array(i - n + 1).join("0")
          : i > 0 ? coefficient.slice(0, i) + "." + coefficient.slice(i)
          : "0." + new Array(1 - i).join("0") + formatDecimalParts(x, Math.max(0, p + i - 1))[0]; // less than 1y!
    }

    function formatRounded(x, p) {
      var d = formatDecimalParts(x, p);
      if (!d) return x + "";
      var coefficient = d[0],
          exponent = d[1];
      return exponent < 0 ? "0." + new Array(-exponent).join("0") + coefficient
          : coefficient.length > exponent + 1 ? coefficient.slice(0, exponent + 1) + "." + coefficient.slice(exponent + 1)
          : coefficient + new Array(exponent - coefficient.length + 2).join("0");
    }

    var formatTypes = {
      "%": (x, p) => (x * 100).toFixed(p),
      "b": (x) => Math.round(x).toString(2),
      "c": (x) => x + "",
      "d": formatDecimal,
      "e": (x, p) => x.toExponential(p),
      "f": (x, p) => x.toFixed(p),
      "g": (x, p) => x.toPrecision(p),
      "o": (x) => Math.round(x).toString(8),
      "p": (x, p) => formatRounded(x * 100, p),
      "r": formatRounded,
      "s": formatPrefixAuto,
      "X": (x) => Math.round(x).toString(16).toUpperCase(),
      "x": (x) => Math.round(x).toString(16)
    };

    function identity$1(x) {
      return x;
    }

    var map = Array.prototype.map,
        prefixes = ["y","z","a","f","p","n","µ","m","","k","M","G","T","P","E","Z","Y"];

    function formatLocale(locale) {
      var group = locale.grouping === undefined || locale.thousands === undefined ? identity$1 : formatGroup(map.call(locale.grouping, Number), locale.thousands + ""),
          currencyPrefix = locale.currency === undefined ? "" : locale.currency[0] + "",
          currencySuffix = locale.currency === undefined ? "" : locale.currency[1] + "",
          decimal = locale.decimal === undefined ? "." : locale.decimal + "",
          numerals = locale.numerals === undefined ? identity$1 : formatNumerals(map.call(locale.numerals, String)),
          percent = locale.percent === undefined ? "%" : locale.percent + "",
          minus = locale.minus === undefined ? "−" : locale.minus + "",
          nan = locale.nan === undefined ? "NaN" : locale.nan + "";

      function newFormat(specifier) {
        specifier = formatSpecifier(specifier);

        var fill = specifier.fill,
            align = specifier.align,
            sign = specifier.sign,
            symbol = specifier.symbol,
            zero = specifier.zero,
            width = specifier.width,
            comma = specifier.comma,
            precision = specifier.precision,
            trim = specifier.trim,
            type = specifier.type;

        // The "n" type is an alias for ",g".
        if (type === "n") comma = true, type = "g";

        // The "" type, and any invalid type, is an alias for ".12~g".
        else if (!formatTypes[type]) precision === undefined && (precision = 12), trim = true, type = "g";

        // If zero fill is specified, padding goes after sign and before digits.
        if (zero || (fill === "0" && align === "=")) zero = true, fill = "0", align = "=";

        // Compute the prefix and suffix.
        // For SI-prefix, the suffix is lazily computed.
        var prefix = symbol === "$" ? currencyPrefix : symbol === "#" && /[boxX]/.test(type) ? "0" + type.toLowerCase() : "",
            suffix = symbol === "$" ? currencySuffix : /[%p]/.test(type) ? percent : "";

        // What format function should we use?
        // Is this an integer type?
        // Can this type generate exponential notation?
        var formatType = formatTypes[type],
            maybeSuffix = /[defgprs%]/.test(type);

        // Set the default precision if not specified,
        // or clamp the specified precision to the supported range.
        // For significant precision, it must be in [1, 21].
        // For fixed precision, it must be in [0, 20].
        precision = precision === undefined ? 6
            : /[gprs]/.test(type) ? Math.max(1, Math.min(21, precision))
            : Math.max(0, Math.min(20, precision));

        function format(value) {
          var valuePrefix = prefix,
              valueSuffix = suffix,
              i, n, c;

          if (type === "c") {
            valueSuffix = formatType(value) + valueSuffix;
            value = "";
          } else {
            value = +value;

            // Determine the sign. -0 is not less than 0, but 1 / -0 is!
            var valueNegative = value < 0 || 1 / value < 0;

            // Perform the initial formatting.
            value = isNaN(value) ? nan : formatType(Math.abs(value), precision);

            // Trim insignificant zeros.
            if (trim) value = formatTrim(value);

            // If a negative value rounds to zero after formatting, and no explicit positive sign is requested, hide the sign.
            if (valueNegative && +value === 0 && sign !== "+") valueNegative = false;

            // Compute the prefix and suffix.
            valuePrefix = (valueNegative ? (sign === "(" ? sign : minus) : sign === "-" || sign === "(" ? "" : sign) + valuePrefix;
            valueSuffix = (type === "s" ? prefixes[8 + prefixExponent / 3] : "") + valueSuffix + (valueNegative && sign === "(" ? ")" : "");

            // Break the formatted value into the integer “value” part that can be
            // grouped, and fractional or exponential “suffix” part that is not.
            if (maybeSuffix) {
              i = -1, n = value.length;
              while (++i < n) {
                if (c = value.charCodeAt(i), 48 > c || c > 57) {
                  valueSuffix = (c === 46 ? decimal + value.slice(i + 1) : value.slice(i)) + valueSuffix;
                  value = value.slice(0, i);
                  break;
                }
              }
            }
          }

          // If the fill character is not "0", grouping is applied before padding.
          if (comma && !zero) value = group(value, Infinity);

          // Compute the padding.
          var length = valuePrefix.length + value.length + valueSuffix.length,
              padding = length < width ? new Array(width - length + 1).join(fill) : "";

          // If the fill character is "0", grouping is applied after padding.
          if (comma && zero) value = group(padding + value, padding.length ? width - valueSuffix.length : Infinity), padding = "";

          // Reconstruct the final output based on the desired alignment.
          switch (align) {
            case "<": value = valuePrefix + value + valueSuffix + padding; break;
            case "=": value = valuePrefix + padding + value + valueSuffix; break;
            case "^": value = padding.slice(0, length = padding.length >> 1) + valuePrefix + value + valueSuffix + padding.slice(length); break;
            default: value = padding + valuePrefix + value + valueSuffix; break;
          }

          return numerals(value);
        }

        format.toString = function() {
          return specifier + "";
        };

        return format;
      }

      function formatPrefix(specifier, value) {
        var f = newFormat((specifier = formatSpecifier(specifier), specifier.type = "f", specifier)),
            e = Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3,
            k = Math.pow(10, -e),
            prefix = prefixes[8 + e / 3];
        return function(value) {
          return f(k * value) + prefix;
        };
      }

      return {
        format: newFormat,
        formatPrefix: formatPrefix
      };
    }

    var locale;
    var format;
    var formatPrefix;

    defaultLocale({
      thousands: ",",
      grouping: [3],
      currency: ["$", ""]
    });

    function defaultLocale(definition) {
      locale = formatLocale(definition);
      format = locale.format;
      formatPrefix = locale.formatPrefix;
      return locale;
    }

    function precisionFixed(step) {
      return Math.max(0, -exponent(Math.abs(step)));
    }

    function precisionPrefix(step, value) {
      return Math.max(0, Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3 - exponent(Math.abs(step)));
    }

    function precisionRound(step, max) {
      step = Math.abs(step), max = Math.abs(max) - step;
      return Math.max(0, exponent(max) - exponent(step)) + 1;
    }

    function initRange(domain, range) {
      switch (arguments.length) {
        case 0: break;
        case 1: this.range(domain); break;
        default: this.range(range).domain(domain); break;
      }
      return this;
    }

    function constants(x) {
      return function() {
        return x;
      };
    }

    function number(x) {
      return +x;
    }

    var unit = [0, 1];

    function identity(x) {
      return x;
    }

    function normalize(a, b) {
      return (b -= (a = +a))
          ? function(x) { return (x - a) / b; }
          : constants(isNaN(b) ? NaN : 0.5);
    }

    function clamper(a, b) {
      var t;
      if (a > b) t = a, a = b, b = t;
      return function(x) { return Math.max(a, Math.min(b, x)); };
    }

    // normalize(a, b)(x) takes a domain value x in [a,b] and returns the corresponding parameter t in [0,1].
    // interpolate(a, b)(t) takes a parameter t in [0,1] and returns the corresponding range value x in [a,b].
    function bimap(domain, range, interpolate) {
      var d0 = domain[0], d1 = domain[1], r0 = range[0], r1 = range[1];
      if (d1 < d0) d0 = normalize(d1, d0), r0 = interpolate(r1, r0);
      else d0 = normalize(d0, d1), r0 = interpolate(r0, r1);
      return function(x) { return r0(d0(x)); };
    }

    function polymap(domain, range, interpolate) {
      var j = Math.min(domain.length, range.length) - 1,
          d = new Array(j),
          r = new Array(j),
          i = -1;

      // Reverse descending domains.
      if (domain[j] < domain[0]) {
        domain = domain.slice().reverse();
        range = range.slice().reverse();
      }

      while (++i < j) {
        d[i] = normalize(domain[i], domain[i + 1]);
        r[i] = interpolate(range[i], range[i + 1]);
      }

      return function(x) {
        var i = bisect(domain, x, 1, j) - 1;
        return r[i](d[i](x));
      };
    }

    function copy(source, target) {
      return target
          .domain(source.domain())
          .range(source.range())
          .interpolate(source.interpolate())
          .clamp(source.clamp())
          .unknown(source.unknown());
    }

    function transformer() {
      var domain = unit,
          range = unit,
          interpolate$1 = interpolate,
          transform,
          untransform,
          unknown,
          clamp = identity,
          piecewise,
          output,
          input;

      function rescale() {
        var n = Math.min(domain.length, range.length);
        if (clamp !== identity) clamp = clamper(domain[0], domain[n - 1]);
        piecewise = n > 2 ? polymap : bimap;
        output = input = null;
        return scale;
      }

      function scale(x) {
        return x == null || isNaN(x = +x) ? unknown : (output || (output = piecewise(domain.map(transform), range, interpolate$1)))(transform(clamp(x)));
      }

      scale.invert = function(y) {
        return clamp(untransform((input || (input = piecewise(range, domain.map(transform), interpolateNumber)))(y)));
      };

      scale.domain = function(_) {
        return arguments.length ? (domain = Array.from(_, number), rescale()) : domain.slice();
      };

      scale.range = function(_) {
        return arguments.length ? (range = Array.from(_), rescale()) : range.slice();
      };

      scale.rangeRound = function(_) {
        return range = Array.from(_), interpolate$1 = interpolateRound, rescale();
      };

      scale.clamp = function(_) {
        return arguments.length ? (clamp = _ ? true : identity, rescale()) : clamp !== identity;
      };

      scale.interpolate = function(_) {
        return arguments.length ? (interpolate$1 = _, rescale()) : interpolate$1;
      };

      scale.unknown = function(_) {
        return arguments.length ? (unknown = _, scale) : unknown;
      };

      return function(t, u) {
        transform = t, untransform = u;
        return rescale();
      };
    }

    function continuous() {
      return transformer()(identity, identity);
    }

    function tickFormat(start, stop, count, specifier) {
      var step = tickStep(start, stop, count),
          precision;
      specifier = formatSpecifier(specifier == null ? ",f" : specifier);
      switch (specifier.type) {
        case "s": {
          var value = Math.max(Math.abs(start), Math.abs(stop));
          if (specifier.precision == null && !isNaN(precision = precisionPrefix(step, value))) specifier.precision = precision;
          return formatPrefix(specifier, value);
        }
        case "":
        case "e":
        case "g":
        case "p":
        case "r": {
          if (specifier.precision == null && !isNaN(precision = precisionRound(step, Math.max(Math.abs(start), Math.abs(stop))))) specifier.precision = precision - (specifier.type === "e");
          break;
        }
        case "f":
        case "%": {
          if (specifier.precision == null && !isNaN(precision = precisionFixed(step))) specifier.precision = precision - (specifier.type === "%") * 2;
          break;
        }
      }
      return format(specifier);
    }

    function linearish(scale) {
      var domain = scale.domain;

      scale.ticks = function(count) {
        var d = domain();
        return ticks(d[0], d[d.length - 1], count == null ? 10 : count);
      };

      scale.tickFormat = function(count, specifier) {
        var d = domain();
        return tickFormat(d[0], d[d.length - 1], count == null ? 10 : count, specifier);
      };

      scale.nice = function(count) {
        if (count == null) count = 10;

        var d = domain();
        var i0 = 0;
        var i1 = d.length - 1;
        var start = d[i0];
        var stop = d[i1];
        var prestep;
        var step;
        var maxIter = 10;

        if (stop < start) {
          step = start, start = stop, stop = step;
          step = i0, i0 = i1, i1 = step;
        }
        
        while (maxIter-- > 0) {
          step = tickIncrement(start, stop, count);
          if (step === prestep) {
            d[i0] = start;
            d[i1] = stop;
            return domain(d);
          } else if (step > 0) {
            start = Math.floor(start / step) * step;
            stop = Math.ceil(stop / step) * step;
          } else if (step < 0) {
            start = Math.ceil(start * step) / step;
            stop = Math.floor(stop * step) / step;
          } else {
            break;
          }
          prestep = step;
        }

        return scale;
      };

      return scale;
    }

    function linear() {
      var scale = continuous();

      scale.copy = function() {
        return copy(scale, linear());
      };

      initRange.apply(scale, arguments);

      return linearish(scale);
    }

    function transformPow(exponent) {
      return function(x) {
        return x < 0 ? -Math.pow(-x, exponent) : Math.pow(x, exponent);
      };
    }

    function transformSqrt(x) {
      return x < 0 ? -Math.sqrt(-x) : Math.sqrt(x);
    }

    function transformSquare(x) {
      return x < 0 ? -x * x : x * x;
    }

    function powish(transform) {
      var scale = transform(identity, identity),
          exponent = 1;

      function rescale() {
        return exponent === 1 ? transform(identity, identity)
            : exponent === 0.5 ? transform(transformSqrt, transformSquare)
            : transform(transformPow(exponent), transformPow(1 / exponent));
      }

      scale.exponent = function(_) {
        return arguments.length ? (exponent = +_, rescale()) : exponent;
      };

      return linearish(scale);
    }

    function pow() {
      var scale = powish(transformer());

      scale.copy = function() {
        return copy(scale, pow()).exponent(scale.exponent());
      };

      initRange.apply(scale, arguments);

      return scale;
    }

    function sqrt$1() {
      return pow.apply(null, arguments).exponent(0.5);
    }

    function quantize() {
      var x0 = 0,
          x1 = 1,
          n = 1,
          domain = [0.5],
          range = [0, 1],
          unknown;

      function scale(x) {
        return x != null && x <= x ? range[bisect(domain, x, 0, n)] : unknown;
      }

      function rescale() {
        var i = -1;
        domain = new Array(n);
        while (++i < n) domain[i] = ((i + 1) * x1 - (i - n) * x0) / (n + 1);
        return scale;
      }

      scale.domain = function(_) {
        return arguments.length ? ([x0, x1] = _, x0 = +x0, x1 = +x1, rescale()) : [x0, x1];
      };

      scale.range = function(_) {
        return arguments.length ? (n = (range = Array.from(_)).length - 1, rescale()) : range.slice();
      };

      scale.invertExtent = function(y) {
        var i = range.indexOf(y);
        return i < 0 ? [NaN, NaN]
            : i < 1 ? [x0, domain[0]]
            : i >= n ? [domain[n - 1], x1]
            : [domain[i - 1], domain[i]];
      };

      scale.unknown = function(_) {
        return arguments.length ? (unknown = _, scale) : scale;
      };

      scale.thresholds = function() {
        return domain.slice();
      };

      scale.copy = function() {
        return quantize()
            .domain([x0, x1])
            .range(range)
            .unknown(unknown);
      };

      return initRange.apply(linearish(scale), arguments);
    }

    function constant(x) {
      return function constant() {
        return x;
      };
    }

    const abs = Math.abs;
    const atan2 = Math.atan2;
    const cos = Math.cos;
    const max = Math.max;
    const min = Math.min;
    const sin = Math.sin;
    const sqrt = Math.sqrt;

    const epsilon = 1e-12;
    const pi = Math.PI;
    const halfPi = pi / 2;
    const tau = 2 * pi;

    function acos(x) {
      return x > 1 ? 0 : x < -1 ? pi : Math.acos(x);
    }

    function asin(x) {
      return x >= 1 ? halfPi : x <= -1 ? -halfPi : Math.asin(x);
    }

    function arcInnerRadius(d) {
      return d.innerRadius;
    }

    function arcOuterRadius(d) {
      return d.outerRadius;
    }

    function arcStartAngle(d) {
      return d.startAngle;
    }

    function arcEndAngle(d) {
      return d.endAngle;
    }

    function arcPadAngle(d) {
      return d && d.padAngle; // Note: optional!
    }

    function intersect(x0, y0, x1, y1, x2, y2, x3, y3) {
      var x10 = x1 - x0, y10 = y1 - y0,
          x32 = x3 - x2, y32 = y3 - y2,
          t = y32 * x10 - x32 * y10;
      if (t * t < epsilon) return;
      t = (x32 * (y0 - y2) - y32 * (x0 - x2)) / t;
      return [x0 + t * x10, y0 + t * y10];
    }

    // Compute perpendicular offset line of length rc.
    // http://mathworld.wolfram.com/Circle-LineIntersection.html
    function cornerTangents(x0, y0, x1, y1, r1, rc, cw) {
      var x01 = x0 - x1,
          y01 = y0 - y1,
          lo = (cw ? rc : -rc) / sqrt(x01 * x01 + y01 * y01),
          ox = lo * y01,
          oy = -lo * x01,
          x11 = x0 + ox,
          y11 = y0 + oy,
          x10 = x1 + ox,
          y10 = y1 + oy,
          x00 = (x11 + x10) / 2,
          y00 = (y11 + y10) / 2,
          dx = x10 - x11,
          dy = y10 - y11,
          d2 = dx * dx + dy * dy,
          r = r1 - rc,
          D = x11 * y10 - x10 * y11,
          d = (dy < 0 ? -1 : 1) * sqrt(max(0, r * r * d2 - D * D)),
          cx0 = (D * dy - dx * d) / d2,
          cy0 = (-D * dx - dy * d) / d2,
          cx1 = (D * dy + dx * d) / d2,
          cy1 = (-D * dx + dy * d) / d2,
          dx0 = cx0 - x00,
          dy0 = cy0 - y00,
          dx1 = cx1 - x00,
          dy1 = cy1 - y00;

      // Pick the closer of the two intersection points.
      // TODO Is there a faster way to determine which intersection to use?
      if (dx0 * dx0 + dy0 * dy0 > dx1 * dx1 + dy1 * dy1) cx0 = cx1, cy0 = cy1;

      return {
        cx: cx0,
        cy: cy0,
        x01: -ox,
        y01: -oy,
        x11: cx0 * (r1 / r - 1),
        y11: cy0 * (r1 / r - 1)
      };
    }

    function arc() {
      var innerRadius = arcInnerRadius,
          outerRadius = arcOuterRadius,
          cornerRadius = constant(0),
          padRadius = null,
          startAngle = arcStartAngle,
          endAngle = arcEndAngle,
          padAngle = arcPadAngle,
          context = null;

      function arc() {
        var buffer,
            r,
            r0 = +innerRadius.apply(this, arguments),
            r1 = +outerRadius.apply(this, arguments),
            a0 = startAngle.apply(this, arguments) - halfPi,
            a1 = endAngle.apply(this, arguments) - halfPi,
            da = abs(a1 - a0),
            cw = a1 > a0;

        if (!context) context = buffer = path();

        // Ensure that the outer radius is always larger than the inner radius.
        if (r1 < r0) r = r1, r1 = r0, r0 = r;

        // Is it a point?
        if (!(r1 > epsilon)) context.moveTo(0, 0);

        // Or is it a circle or annulus?
        else if (da > tau - epsilon) {
          context.moveTo(r1 * cos(a0), r1 * sin(a0));
          context.arc(0, 0, r1, a0, a1, !cw);
          if (r0 > epsilon) {
            context.moveTo(r0 * cos(a1), r0 * sin(a1));
            context.arc(0, 0, r0, a1, a0, cw);
          }
        }

        // Or is it a circular or annular sector?
        else {
          var a01 = a0,
              a11 = a1,
              a00 = a0,
              a10 = a1,
              da0 = da,
              da1 = da,
              ap = padAngle.apply(this, arguments) / 2,
              rp = (ap > epsilon) && (padRadius ? +padRadius.apply(this, arguments) : sqrt(r0 * r0 + r1 * r1)),
              rc = min(abs(r1 - r0) / 2, +cornerRadius.apply(this, arguments)),
              rc0 = rc,
              rc1 = rc,
              t0,
              t1;

          // Apply padding? Note that since r1 ≥ r0, da1 ≥ da0.
          if (rp > epsilon) {
            var p0 = asin(rp / r0 * sin(ap)),
                p1 = asin(rp / r1 * sin(ap));
            if ((da0 -= p0 * 2) > epsilon) p0 *= (cw ? 1 : -1), a00 += p0, a10 -= p0;
            else da0 = 0, a00 = a10 = (a0 + a1) / 2;
            if ((da1 -= p1 * 2) > epsilon) p1 *= (cw ? 1 : -1), a01 += p1, a11 -= p1;
            else da1 = 0, a01 = a11 = (a0 + a1) / 2;
          }

          var x01 = r1 * cos(a01),
              y01 = r1 * sin(a01),
              x10 = r0 * cos(a10),
              y10 = r0 * sin(a10);

          // Apply rounded corners?
          if (rc > epsilon) {
            var x11 = r1 * cos(a11),
                y11 = r1 * sin(a11),
                x00 = r0 * cos(a00),
                y00 = r0 * sin(a00),
                oc;

            // Restrict the corner radius according to the sector angle.
            if (da < pi && (oc = intersect(x01, y01, x00, y00, x11, y11, x10, y10))) {
              var ax = x01 - oc[0],
                  ay = y01 - oc[1],
                  bx = x11 - oc[0],
                  by = y11 - oc[1],
                  kc = 1 / sin(acos((ax * bx + ay * by) / (sqrt(ax * ax + ay * ay) * sqrt(bx * bx + by * by))) / 2),
                  lc = sqrt(oc[0] * oc[0] + oc[1] * oc[1]);
              rc0 = min(rc, (r0 - lc) / (kc - 1));
              rc1 = min(rc, (r1 - lc) / (kc + 1));
            }
          }

          // Is the sector collapsed to a line?
          if (!(da1 > epsilon)) context.moveTo(x01, y01);

          // Does the sector’s outer ring have rounded corners?
          else if (rc1 > epsilon) {
            t0 = cornerTangents(x00, y00, x01, y01, r1, rc1, cw);
            t1 = cornerTangents(x11, y11, x10, y10, r1, rc1, cw);

            context.moveTo(t0.cx + t0.x01, t0.cy + t0.y01);

            // Have the corners merged?
            if (rc1 < rc) context.arc(t0.cx, t0.cy, rc1, atan2(t0.y01, t0.x01), atan2(t1.y01, t1.x01), !cw);

            // Otherwise, draw the two corners and the ring.
            else {
              context.arc(t0.cx, t0.cy, rc1, atan2(t0.y01, t0.x01), atan2(t0.y11, t0.x11), !cw);
              context.arc(0, 0, r1, atan2(t0.cy + t0.y11, t0.cx + t0.x11), atan2(t1.cy + t1.y11, t1.cx + t1.x11), !cw);
              context.arc(t1.cx, t1.cy, rc1, atan2(t1.y11, t1.x11), atan2(t1.y01, t1.x01), !cw);
            }
          }

          // Or is the outer ring just a circular arc?
          else context.moveTo(x01, y01), context.arc(0, 0, r1, a01, a11, !cw);

          // Is there no inner ring, and it’s a circular sector?
          // Or perhaps it’s an annular sector collapsed due to padding?
          if (!(r0 > epsilon) || !(da0 > epsilon)) context.lineTo(x10, y10);

          // Does the sector’s inner ring (or point) have rounded corners?
          else if (rc0 > epsilon) {
            t0 = cornerTangents(x10, y10, x11, y11, r0, -rc0, cw);
            t1 = cornerTangents(x01, y01, x00, y00, r0, -rc0, cw);

            context.lineTo(t0.cx + t0.x01, t0.cy + t0.y01);

            // Have the corners merged?
            if (rc0 < rc) context.arc(t0.cx, t0.cy, rc0, atan2(t0.y01, t0.x01), atan2(t1.y01, t1.x01), !cw);

            // Otherwise, draw the two corners and the ring.
            else {
              context.arc(t0.cx, t0.cy, rc0, atan2(t0.y01, t0.x01), atan2(t0.y11, t0.x11), !cw);
              context.arc(0, 0, r0, atan2(t0.cy + t0.y11, t0.cx + t0.x11), atan2(t1.cy + t1.y11, t1.cx + t1.x11), cw);
              context.arc(t1.cx, t1.cy, rc0, atan2(t1.y11, t1.x11), atan2(t1.y01, t1.x01), !cw);
            }
          }

          // Or is the inner ring just a circular arc?
          else context.arc(0, 0, r0, a10, a00, cw);
        }

        context.closePath();

        if (buffer) return context = null, buffer + "" || null;
      }

      arc.centroid = function() {
        var r = (+innerRadius.apply(this, arguments) + +outerRadius.apply(this, arguments)) / 2,
            a = (+startAngle.apply(this, arguments) + +endAngle.apply(this, arguments)) / 2 - pi / 2;
        return [cos(a) * r, sin(a) * r];
      };

      arc.innerRadius = function(_) {
        return arguments.length ? (innerRadius = typeof _ === "function" ? _ : constant(+_), arc) : innerRadius;
      };

      arc.outerRadius = function(_) {
        return arguments.length ? (outerRadius = typeof _ === "function" ? _ : constant(+_), arc) : outerRadius;
      };

      arc.cornerRadius = function(_) {
        return arguments.length ? (cornerRadius = typeof _ === "function" ? _ : constant(+_), arc) : cornerRadius;
      };

      arc.padRadius = function(_) {
        return arguments.length ? (padRadius = _ == null ? null : typeof _ === "function" ? _ : constant(+_), arc) : padRadius;
      };

      arc.startAngle = function(_) {
        return arguments.length ? (startAngle = typeof _ === "function" ? _ : constant(+_), arc) : startAngle;
      };

      arc.endAngle = function(_) {
        return arguments.length ? (endAngle = typeof _ === "function" ? _ : constant(+_), arc) : endAngle;
      };

      arc.padAngle = function(_) {
        return arguments.length ? (padAngle = typeof _ === "function" ? _ : constant(+_), arc) : padAngle;
      };

      arc.context = function(_) {
        return arguments.length ? ((context = _ == null ? null : _), arc) : context;
      };

      return arc;
    }

    function array(x) {
      return typeof x === "object" && "length" in x
        ? x // Array, TypedArray, NodeList, array-like
        : Array.from(x); // Map, Set, iterable, string, or anything else
    }

    function Linear(context) {
      this._context = context;
    }

    Linear.prototype = {
      areaStart: function() {
        this._line = 0;
      },
      areaEnd: function() {
        this._line = NaN;
      },
      lineStart: function() {
        this._point = 0;
      },
      lineEnd: function() {
        if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
        this._line = 1 - this._line;
      },
      point: function(x, y) {
        x = +x, y = +y;
        switch (this._point) {
          case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
          case 1: this._point = 2; // falls through
          default: this._context.lineTo(x, y); break;
        }
      }
    };

    function curveLinear(context) {
      return new Linear(context);
    }

    function x(p) {
      return p[0];
    }

    function y(p) {
      return p[1];
    }

    function line(x$1, y$1) {
      var defined = constant(true),
          context = null,
          curve = curveLinear,
          output = null;

      x$1 = typeof x$1 === "function" ? x$1 : (x$1 === undefined) ? x : constant(x$1);
      y$1 = typeof y$1 === "function" ? y$1 : (y$1 === undefined) ? y : constant(y$1);

      function line(data) {
        var i,
            n = (data = array(data)).length,
            d,
            defined0 = false,
            buffer;

        if (context == null) output = curve(buffer = path());

        for (i = 0; i <= n; ++i) {
          if (!(i < n && defined(d = data[i], i, data)) === defined0) {
            if (defined0 = !defined0) output.lineStart();
            else output.lineEnd();
          }
          if (defined0) output.point(+x$1(d, i, data), +y$1(d, i, data));
        }

        if (buffer) return output = null, buffer + "" || null;
      }

      line.x = function(_) {
        return arguments.length ? (x$1 = typeof _ === "function" ? _ : constant(+_), line) : x$1;
      };

      line.y = function(_) {
        return arguments.length ? (y$1 = typeof _ === "function" ? _ : constant(+_), line) : y$1;
      };

      line.defined = function(_) {
        return arguments.length ? (defined = typeof _ === "function" ? _ : constant(!!_), line) : defined;
      };

      line.curve = function(_) {
        return arguments.length ? (curve = _, context != null && (output = curve(context)), line) : curve;
      };

      line.context = function(_) {
        return arguments.length ? (_ == null ? context = output = null : output = curve(context = _), line) : context;
      };

      return line;
    }

    function point(that, x, y) {
      that._context.bezierCurveTo(
        (2 * that._x0 + that._x1) / 3,
        (2 * that._y0 + that._y1) / 3,
        (that._x0 + 2 * that._x1) / 3,
        (that._y0 + 2 * that._y1) / 3,
        (that._x0 + 4 * that._x1 + x) / 6,
        (that._y0 + 4 * that._y1 + y) / 6
      );
    }

    function Basis(context) {
      this._context = context;
    }

    Basis.prototype = {
      areaStart: function() {
        this._line = 0;
      },
      areaEnd: function() {
        this._line = NaN;
      },
      lineStart: function() {
        this._x0 = this._x1 =
        this._y0 = this._y1 = NaN;
        this._point = 0;
      },
      lineEnd: function() {
        switch (this._point) {
          case 3: point(this, this._x1, this._y1); // falls through
          case 2: this._context.lineTo(this._x1, this._y1); break;
        }
        if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
        this._line = 1 - this._line;
      },
      point: function(x, y) {
        x = +x, y = +y;
        switch (this._point) {
          case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
          case 1: this._point = 2; break;
          case 2: this._point = 3; this._context.lineTo((5 * this._x0 + this._x1) / 6, (5 * this._y0 + this._y1) / 6); // falls through
          default: point(this, x, y); break;
        }
        this._x0 = this._x1, this._x1 = x;
        this._y0 = this._y1, this._y1 = y;
      }
    };

    function curveBasis(context) {
      return new Basis(context);
    }

    function Transform(k, x, y) {
      this.k = k;
      this.x = x;
      this.y = y;
    }

    Transform.prototype = {
      constructor: Transform,
      scale: function(k) {
        return k === 1 ? this : new Transform(this.k * k, this.x, this.y);
      },
      translate: function(x, y) {
        return x === 0 & y === 0 ? this : new Transform(this.k, this.x + this.k * x, this.y + this.k * y);
      },
      apply: function(point) {
        return [point[0] * this.k + this.x, point[1] * this.k + this.y];
      },
      applyX: function(x) {
        return x * this.k + this.x;
      },
      applyY: function(y) {
        return y * this.k + this.y;
      },
      invert: function(location) {
        return [(location[0] - this.x) / this.k, (location[1] - this.y) / this.k];
      },
      invertX: function(x) {
        return (x - this.x) / this.k;
      },
      invertY: function(y) {
        return (y - this.y) / this.k;
      },
      rescaleX: function(x) {
        return x.copy().domain(x.range().map(this.invertX, this).map(x.invert, x));
      },
      rescaleY: function(y) {
        return y.copy().domain(y.range().map(this.invertY, this).map(y.invert, y));
      },
      toString: function() {
        return "translate(" + this.x + "," + this.y + ") scale(" + this.k + ")";
      }
    };

    new Transform(1, 0, 0);

    Transform.prototype;

    var data = [
      {
        Movie: "Bottle Rocket",
        Year: 1996,
        Budget: 7000000,
        BoxOffice: 560069,
        RottenTomatoes_Tomatometer: 85,
        RottenTomatoes_Audience: 79,
      },
      {
        Movie: "Rushmore",
        Year: 1998,
        Budget: 9000000,
        BoxOffice: 17196103,
        RottenTomatoes_Tomatometer: 89,
        RottenTomatoes_Audience: 91,
      },
      {
        Movie: "The Royal Tenenbaums",
        Year: 2001,
        Budget: 21000000,
        BoxOffice: 71444482,
        RottenTomatoes_Tomatometer: 81,
        RottenTomatoes_Audience: 89,
      },
      {
        Movie: "The Life Aquatic with Steve Zissou",
        Year: 2004,
        Budget: 50000000,
        BoxOffice: 34809623,
        RottenTomatoes_Tomatometer: 57,
        RottenTomatoes_Audience: 82,
      },
      {
        Movie: "The Darjeeling Limited",
        Year: 2007,
        Budget: 16000000,
        BoxOffice: 35310019,
        RottenTomatoes_Tomatometer: 69,
        RottenTomatoes_Audience: 78,
      },
      {
        Movie: "Fantastic Mr. Fox",
        Year: 2009,
        Budget: 40000000,
        BoxOffice: 46474181,
        RottenTomatoes_Tomatometer: 93,
        RottenTomatoes_Audience: 85,
      },
      {
        Movie: "Moonrise Kingdom",
        Year: 2012,
        Budget: 16000000,
        BoxOffice: 68264022,
        RottenTomatoes_Tomatometer: 93,
        RottenTomatoes_Audience: 86,
      },
      {
        Movie: "The Grand Budapest Hotel",
        Year: 2014,
        Budget: 25000000,
        BoxOffice: 173082189,
        RottenTomatoes_Tomatometer: 92,
        RottenTomatoes_Audience: 86,
      },
      {
        Movie: "Isle of Dogs",
        Year: 2018,
        Budget: 35000000,
        BoxOffice: 64337744,
        RottenTomatoes_Tomatometer: 90,
        RottenTomatoes_Audience: 87,
      },
      {
        Movie: "The French Dispatch",
        Year: 2021,
        Budget: 25000000,
        BoxOffice: 46333545,
        RottenTomatoes_Tomatometer: 75,
        RottenTomatoes_Audience: 76,
      },
    ];

    // export default [
    //   {
    //     Movie: "Reservoir Dogs",
    //     Year: 1992,
    //     Budget: 1200000,
    //     BoxOffice: 2913644,
    //     RottenTomatoes_Tomatometer: 90,
    //     RottenTomatoes_Audience: 94,
    //   },
    //   {
    //     Movie: "Pulp Fiction",
    //     Year: 1994,
    //     Budget: 8000000,
    //     BoxOffice: 213928762,
    //     RottenTomatoes_Tomatometer: 92,
    //     RottenTomatoes_Audience: 96,
    //   },
    //   {
    //     Movie: "Jackie Brown",
    //     Year: 1997,
    //     Budget: 12000000,
    //     BoxOffice: 39673807,
    //     RottenTomatoes_Tomatometer: 87,
    //     RottenTomatoes_Audience: 85,
    //   },
    //   {
    //     Movie: "Kill Bill: Volume 1",
    //     Year: 2003,
    //     Budget: 30000000,
    //     BoxOffice: 180906076,
    //     RottenTomatoes_Tomatometer: 85,
    //     RottenTomatoes_Audience: 81,
    //   },
    //   {
    //     Movie: "Kill Bill: Volume 2",
    //     Year: 2004,
    //     Budget: 30000000,
    //     BoxOffice: 154118820,
    //     RottenTomatoes_Tomatometer: 84,
    //     RottenTomatoes_Audience: 89,
    //   },
    //   {
    //     Movie: "Death Proof",
    //     Year: 2007,
    //     Budget: 30000000,
    //     BoxOffice: 31126421,
    //     RottenTomatoes_Tomatometer: 64,
    //     RottenTomatoes_Audience: 72,
    //   },
    //   {
    //     Movie: "Inglourious Basterds",
    //     Year: 2009,
    //     Budget: 70000000,
    //     BoxOffice: 321457747,
    //     RottenTomatoes_Tomatometer: 89,
    //     RottenTomatoes_Audience: 88,
    //   },
    //   {
    //     Movie: "Django Unchained",
    //     Year: 2012,
    //     Budget: 100000000,
    //     BoxOffice: 426074373,
    //     RottenTomatoes_Tomatometer: 86,
    //     RottenTomatoes_Audience: 92,
    //   },
    //   {
    //     Movie: "The Hateful Eight",
    //     Year: 2015,
    //     Budget: 44000000,
    //     BoxOffice: 156480177,
    //     RottenTomatoes_Tomatometer: 74,
    //     RottenTomatoes_Audience: 76,
    //   },
    //   {
    //     Movie: "Once Upon a Time... In Hollywood",
    //     Year: 2019,
    //     Budget: 90000000,
    //     BoxOffice: 374565754,
    //     RottenTomatoes_Tomatometer: 85,
    //     RottenTomatoes_Audience: 70,
    //   },
    // ];

    /* src/components/Bubble.svelte generated by Svelte v3.49.0 */
    const file$7 = "src/components/Bubble.svelte";

    function get_each_context$5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[23] = list[i];
    	child_ctx[25] = i;
    	return child_ctx;
    }

    // (78:4) {:else}
    function create_else_block$2(ctx) {
    	let circle0;
    	let circle0_fill_value;
    	let circle1;
    	let circle1_cy_value;
    	let circle1_fill_value;

    	const block = {
    		c: function create() {
    			circle0 = svg_element("circle");
    			circle1 = svg_element("circle");
    			attr_dev(circle0, "class", "boxoffice-circle");
    			attr_dev(circle0, "cx", /*x*/ ctx[1]);
    			attr_dev(circle0, "cy", /*y*/ ctx[2]);
    			attr_dev(circle0, "r", /*boxoffice*/ ctx[4]);
    			attr_dev(circle0, "fill", circle0_fill_value = /*colorScheme*/ ctx[8].BoxOff);
    			add_location(circle0, file$7, 78, 6, 1767);
    			attr_dev(circle1, "class", "budget-circle");
    			attr_dev(circle1, "cx", /*x*/ ctx[1]);
    			attr_dev(circle1, "cy", circle1_cy_value = /*y*/ ctx[2] - /*budget*/ ctx[3] + /*boxoffice*/ ctx[4]);
    			attr_dev(circle1, "r", /*budget*/ ctx[3]);
    			attr_dev(circle1, "fill", circle1_fill_value = /*colorScheme*/ ctx[8].Budget);
    			add_location(circle1, file$7, 85, 6, 1909);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, circle0, anchor);
    			insert_dev(target, circle1, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*x*/ 2) {
    				attr_dev(circle0, "cx", /*x*/ ctx[1]);
    			}

    			if (dirty & /*y*/ 4) {
    				attr_dev(circle0, "cy", /*y*/ ctx[2]);
    			}

    			if (dirty & /*boxoffice*/ 16) {
    				attr_dev(circle0, "r", /*boxoffice*/ ctx[4]);
    			}

    			if (dirty & /*colorScheme*/ 256 && circle0_fill_value !== (circle0_fill_value = /*colorScheme*/ ctx[8].BoxOff)) {
    				attr_dev(circle0, "fill", circle0_fill_value);
    			}

    			if (dirty & /*x*/ 2) {
    				attr_dev(circle1, "cx", /*x*/ ctx[1]);
    			}

    			if (dirty & /*y, budget, boxoffice*/ 28 && circle1_cy_value !== (circle1_cy_value = /*y*/ ctx[2] - /*budget*/ ctx[3] + /*boxoffice*/ ctx[4])) {
    				attr_dev(circle1, "cy", circle1_cy_value);
    			}

    			if (dirty & /*budget*/ 8) {
    				attr_dev(circle1, "r", /*budget*/ ctx[3]);
    			}

    			if (dirty & /*colorScheme*/ 256 && circle1_fill_value !== (circle1_fill_value = /*colorScheme*/ ctx[8].Budget)) {
    				attr_dev(circle1, "fill", circle1_fill_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(circle0);
    			if (detaching) detach_dev(circle1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(78:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (63:4) {#if budget > boxoffice}
    function create_if_block$5(ctx) {
    	let circle0;
    	let circle0_fill_value;
    	let circle1;
    	let circle1_cy_value;
    	let circle1_fill_value;

    	const block = {
    		c: function create() {
    			circle0 = svg_element("circle");
    			circle1 = svg_element("circle");
    			attr_dev(circle0, "class", "budget-circle");
    			attr_dev(circle0, "cx", /*x*/ ctx[1]);
    			attr_dev(circle0, "cy", /*y*/ ctx[2]);
    			attr_dev(circle0, "r", /*budget*/ ctx[3]);
    			attr_dev(circle0, "fill", circle0_fill_value = /*colorScheme*/ ctx[8].Budget);
    			add_location(circle0, file$7, 63, 6, 1456);
    			attr_dev(circle1, "class", "boxoffice-circle");
    			attr_dev(circle1, "cx", /*x*/ ctx[1]);
    			attr_dev(circle1, "cy", circle1_cy_value = /*y*/ ctx[2] - /*boxoffice*/ ctx[4] + /*budget*/ ctx[3]);
    			attr_dev(circle1, "r", /*boxoffice*/ ctx[4]);
    			attr_dev(circle1, "fill", circle1_fill_value = /*colorScheme*/ ctx[8].BoxOff);
    			add_location(circle1, file$7, 70, 6, 1592);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, circle0, anchor);
    			insert_dev(target, circle1, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*x*/ 2) {
    				attr_dev(circle0, "cx", /*x*/ ctx[1]);
    			}

    			if (dirty & /*y*/ 4) {
    				attr_dev(circle0, "cy", /*y*/ ctx[2]);
    			}

    			if (dirty & /*budget*/ 8) {
    				attr_dev(circle0, "r", /*budget*/ ctx[3]);
    			}

    			if (dirty & /*colorScheme*/ 256 && circle0_fill_value !== (circle0_fill_value = /*colorScheme*/ ctx[8].Budget)) {
    				attr_dev(circle0, "fill", circle0_fill_value);
    			}

    			if (dirty & /*x*/ 2) {
    				attr_dev(circle1, "cx", /*x*/ ctx[1]);
    			}

    			if (dirty & /*y, boxoffice, budget*/ 28 && circle1_cy_value !== (circle1_cy_value = /*y*/ ctx[2] - /*boxoffice*/ ctx[4] + /*budget*/ ctx[3])) {
    				attr_dev(circle1, "cy", circle1_cy_value);
    			}

    			if (dirty & /*boxoffice*/ 16) {
    				attr_dev(circle1, "r", /*boxoffice*/ ctx[4]);
    			}

    			if (dirty & /*colorScheme*/ 256 && circle1_fill_value !== (circle1_fill_value = /*colorScheme*/ ctx[8].BoxOff)) {
    				attr_dev(circle1, "fill", circle1_fill_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(circle0);
    			if (detaching) detach_dev(circle1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$5.name,
    		type: "if",
    		source: "(63:4) {#if budget > boxoffice}",
    		ctx
    	});

    	return block;
    }

    // (94:4) {#each ratingArr as val, idx}
    function create_each_block$5(ctx) {
    	let line;
    	let line_x__value;
    	let line_y__value;
    	let line_x__value_1;
    	let line_y__value_1;
    	let line_stroke_value;

    	const block = {
    		c: function create() {
    			line = svg_element("line");
    			attr_dev(line, "x1", line_x__value = /*x*/ ctx[1] + (max$1([/*budget*/ ctx[3], /*boxoffice*/ ctx[4]]) + /*padding*/ ctx[12]) * Math.cos(2 * Math.PI / /*strokeNum*/ ctx[11] * /*idx*/ ctx[25] - Math.PI / 2));
    			attr_dev(line, "y1", line_y__value = /*y*/ ctx[2] + (max$1([/*budget*/ ctx[3], /*boxoffice*/ ctx[4]]) + /*padding*/ ctx[12]) * Math.sin(2 * Math.PI / /*strokeNum*/ ctx[11] * /*idx*/ ctx[25] - Math.PI / 2));
    			attr_dev(line, "x2", line_x__value_1 = /*x*/ ctx[1] + (max$1([/*budget*/ ctx[3], /*boxoffice*/ ctx[4]]) + /*strokeLength*/ ctx[6]) * Math.cos(2 * Math.PI / /*strokeNum*/ ctx[11] * /*idx*/ ctx[25] - Math.PI / 2));
    			attr_dev(line, "y2", line_y__value_1 = /*y*/ ctx[2] + (max$1([/*budget*/ ctx[3], /*boxoffice*/ ctx[4]]) + /*strokeLength*/ ctx[6]) * Math.sin(2 * Math.PI / /*strokeNum*/ ctx[11] * /*idx*/ ctx[25] - Math.PI / 2));

    			attr_dev(line, "stroke", line_stroke_value = /*val*/ ctx[23] === 1
    			? /*colorScheme*/ ctx[8].StrokeFilled
    			: /*colorScheme*/ ctx[8].StrokeEmpty);

    			attr_dev(line, "stroke-width", /*strokeWidth*/ ctx[5]);
    			attr_dev(line, "stroke-linecap", "round");
    			add_location(line, file$7, 94, 6, 2110);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, line, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*x, budget, boxoffice*/ 26 && line_x__value !== (line_x__value = /*x*/ ctx[1] + (max$1([/*budget*/ ctx[3], /*boxoffice*/ ctx[4]]) + /*padding*/ ctx[12]) * Math.cos(2 * Math.PI / /*strokeNum*/ ctx[11] * /*idx*/ ctx[25] - Math.PI / 2))) {
    				attr_dev(line, "x1", line_x__value);
    			}

    			if (dirty & /*y, budget, boxoffice*/ 28 && line_y__value !== (line_y__value = /*y*/ ctx[2] + (max$1([/*budget*/ ctx[3], /*boxoffice*/ ctx[4]]) + /*padding*/ ctx[12]) * Math.sin(2 * Math.PI / /*strokeNum*/ ctx[11] * /*idx*/ ctx[25] - Math.PI / 2))) {
    				attr_dev(line, "y1", line_y__value);
    			}

    			if (dirty & /*x, budget, boxoffice, strokeLength*/ 90 && line_x__value_1 !== (line_x__value_1 = /*x*/ ctx[1] + (max$1([/*budget*/ ctx[3], /*boxoffice*/ ctx[4]]) + /*strokeLength*/ ctx[6]) * Math.cos(2 * Math.PI / /*strokeNum*/ ctx[11] * /*idx*/ ctx[25] - Math.PI / 2))) {
    				attr_dev(line, "x2", line_x__value_1);
    			}

    			if (dirty & /*y, budget, boxoffice, strokeLength*/ 92 && line_y__value_1 !== (line_y__value_1 = /*y*/ ctx[2] + (max$1([/*budget*/ ctx[3], /*boxoffice*/ ctx[4]]) + /*strokeLength*/ ctx[6]) * Math.sin(2 * Math.PI / /*strokeNum*/ ctx[11] * /*idx*/ ctx[25] - Math.PI / 2))) {
    				attr_dev(line, "y2", line_y__value_1);
    			}

    			if (dirty & /*ratingArr, colorScheme*/ 1280 && line_stroke_value !== (line_stroke_value = /*val*/ ctx[23] === 1
    			? /*colorScheme*/ ctx[8].StrokeFilled
    			: /*colorScheme*/ ctx[8].StrokeEmpty)) {
    				attr_dev(line, "stroke", line_stroke_value);
    			}

    			if (dirty & /*strokeWidth*/ 32) {
    				attr_dev(line, "stroke-width", /*strokeWidth*/ ctx[5]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(line);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$5.name,
    		type: "each",
    		source: "(94:4) {#each ratingArr as val, idx}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let g2;
    	let g0;
    	let circle;
    	let circle_r_value;
    	let if_block_anchor;
    	let g1;
    	let path;
    	let path_d_value;
    	let path_id_value;
    	let text0;
    	let textPath0;
    	let t0;
    	let textPath0_xlink_href_value;
    	let text1;
    	let textPath1;
    	let t1;
    	let textPath1_xlink_href_value;
    	let text1_fill_value;
    	let g1_transform_value;
    	let text2;
    	let t2;
    	let text2_y_value;
    	let text2_fill_value;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*budget*/ ctx[3] > /*boxoffice*/ ctx[4]) return create_if_block$5;
    		return create_else_block$2;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);
    	let each_value = /*ratingArr*/ ctx[10];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$5(get_each_context$5(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			g2 = svg_element("g");
    			g0 = svg_element("g");
    			circle = svg_element("circle");
    			if_block.c();
    			if_block_anchor = empty();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			g1 = svg_element("g");
    			path = svg_element("path");
    			text0 = svg_element("text");
    			textPath0 = svg_element("textPath");
    			t0 = text(/*movie*/ ctx[0]);
    			text1 = svg_element("text");
    			textPath1 = svg_element("textPath");
    			t1 = text(/*movie*/ ctx[0]);
    			text2 = svg_element("text");
    			t2 = text(/*year*/ ctx[7]);
    			attr_dev(circle, "cx", /*x*/ ctx[1]);
    			attr_dev(circle, "cy", /*y*/ ctx[2]);
    			attr_dev(circle, "r", circle_r_value = max$1([/*budget*/ ctx[3], /*boxoffice*/ ctx[4]]) + /*padding*/ ctx[12] + /*strokeLength*/ ctx[6]);
    			attr_dev(circle, "fill", "white");
    			add_location(circle, file$7, 55, 4, 1251);
    			add_location(g0, file$7, 53, 2, 1091);
    			attr_dev(path, "d", path_d_value = /*arcGenerator*/ ctx[9](/*x*/ ctx[1]));
    			attr_dev(path, "fill", "none");
    			attr_dev(path, "id", path_id_value = `bubble-${/*movie*/ ctx[0]}`);
    			add_location(path, file$7, 116, 4, 2986);
    			xlink_attr(textPath0, "xlink:href", textPath0_xlink_href_value = `#bubble-${/*movie*/ ctx[0]}`);
    			attr_dev(textPath0, "startOffset", "50%");
    			attr_dev(textPath0, "text-anchor", "middle");
    			add_location(textPath0, file$7, 126, 6, 3293);
    			attr_dev(text0, "dy", "-3");
    			attr_dev(text0, "font-size", /*fontSize*/ ctx[13]);
    			attr_dev(text0, "stroke", "white");
    			attr_dev(text0, "fill", "white");
    			attr_dev(text0, "stroke-width", "5");
    			attr_dev(text0, "stroke-linejoin", "round");
    			attr_dev(text0, "class", "svelte-1m8a2bh");
    			add_location(text0, file$7, 118, 4, 3141);
    			xlink_attr(textPath1, "xlink:href", textPath1_xlink_href_value = `#bubble-${/*movie*/ ctx[0]}`);
    			attr_dev(textPath1, "startOffset", "50%");
    			attr_dev(textPath1, "text-anchor", "middle");
    			add_location(textPath1, file$7, 133, 6, 3510);
    			attr_dev(text1, "dy", "-3");
    			attr_dev(text1, "font-size", /*fontSize*/ ctx[13]);
    			attr_dev(text1, "fill", text1_fill_value = /*colorScheme*/ ctx[8].Timeline);
    			attr_dev(text1, "class", "svelte-1m8a2bh");
    			add_location(text1, file$7, 132, 4, 3440);
    			attr_dev(g1, "transform", g1_transform_value = `translate(${/*x*/ ctx[1]},${/*y*/ ctx[2]})`);
    			add_location(g1, file$7, 114, 2, 2878);
    			attr_dev(text2, "x", /*x*/ ctx[1]);
    			attr_dev(text2, "y", text2_y_value = /*y*/ ctx[2] + max$1([/*budget*/ ctx[3], /*boxoffice*/ ctx[4]]) + /*padding*/ ctx[12] + /*strokeLength*/ ctx[6] + /*yearFontSize*/ ctx[14]);
    			attr_dev(text2, "font-size", /*yearFontSize*/ ctx[14]);
    			attr_dev(text2, "text-anchor", "middle");
    			attr_dev(text2, "fill", text2_fill_value = /*colorScheme*/ ctx[8].Timeline);
    			attr_dev(text2, "stroke", "white");
    			attr_dev(text2, "stroke-width", "5");
    			attr_dev(text2, "stroke-linejoin", "round");
    			attr_dev(text2, "paint-order", "stroke");
    			attr_dev(text2, "class", "year-text svelte-1m8a2bh");
    			add_location(text2, file$7, 141, 2, 3716);
    			add_location(g2, file$7, 52, 0, 1085);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, g2, anchor);
    			append_dev(g2, g0);
    			append_dev(g0, circle);
    			if_block.m(g0, null);
    			append_dev(g0, if_block_anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(g0, null);
    			}

    			append_dev(g2, g1);
    			append_dev(g1, path);
    			append_dev(g1, text0);
    			append_dev(text0, textPath0);
    			append_dev(textPath0, t0);
    			append_dev(g1, text1);
    			append_dev(text1, textPath1);
    			append_dev(textPath1, t1);
    			append_dev(g2, text2);
    			append_dev(text2, t2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(g0, "mouseenter", /*enter*/ ctx[15], false, false, false),
    					listen_dev(g0, "mouseleave", /*leave*/ ctx[16], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*x*/ 2) {
    				attr_dev(circle, "cx", /*x*/ ctx[1]);
    			}

    			if (dirty & /*y*/ 4) {
    				attr_dev(circle, "cy", /*y*/ ctx[2]);
    			}

    			if (dirty & /*budget, boxoffice, strokeLength*/ 88 && circle_r_value !== (circle_r_value = max$1([/*budget*/ ctx[3], /*boxoffice*/ ctx[4]]) + /*padding*/ ctx[12] + /*strokeLength*/ ctx[6])) {
    				attr_dev(circle, "r", circle_r_value);
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(g0, if_block_anchor);
    				}
    			}

    			if (dirty & /*x, max, budget, boxoffice, padding, Math, strokeNum, y, strokeLength, ratingArr, colorScheme, strokeWidth*/ 7550) {
    				each_value = /*ratingArr*/ ctx[10];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$5(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$5(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(g0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*arcGenerator, x*/ 514 && path_d_value !== (path_d_value = /*arcGenerator*/ ctx[9](/*x*/ ctx[1]))) {
    				attr_dev(path, "d", path_d_value);
    			}

    			if (dirty & /*movie*/ 1 && path_id_value !== (path_id_value = `bubble-${/*movie*/ ctx[0]}`)) {
    				attr_dev(path, "id", path_id_value);
    			}

    			if (dirty & /*movie*/ 1) set_data_dev(t0, /*movie*/ ctx[0]);

    			if (dirty & /*movie*/ 1 && textPath0_xlink_href_value !== (textPath0_xlink_href_value = `#bubble-${/*movie*/ ctx[0]}`)) {
    				xlink_attr(textPath0, "xlink:href", textPath0_xlink_href_value);
    			}

    			if (dirty & /*movie*/ 1) set_data_dev(t1, /*movie*/ ctx[0]);

    			if (dirty & /*movie*/ 1 && textPath1_xlink_href_value !== (textPath1_xlink_href_value = `#bubble-${/*movie*/ ctx[0]}`)) {
    				xlink_attr(textPath1, "xlink:href", textPath1_xlink_href_value);
    			}

    			if (dirty & /*colorScheme*/ 256 && text1_fill_value !== (text1_fill_value = /*colorScheme*/ ctx[8].Timeline)) {
    				attr_dev(text1, "fill", text1_fill_value);
    			}

    			if (dirty & /*x, y*/ 6 && g1_transform_value !== (g1_transform_value = `translate(${/*x*/ ctx[1]},${/*y*/ ctx[2]})`)) {
    				attr_dev(g1, "transform", g1_transform_value);
    			}

    			if (dirty & /*year*/ 128) set_data_dev(t2, /*year*/ ctx[7]);

    			if (dirty & /*x*/ 2) {
    				attr_dev(text2, "x", /*x*/ ctx[1]);
    			}

    			if (dirty & /*y, budget, boxoffice, strokeLength*/ 92 && text2_y_value !== (text2_y_value = /*y*/ ctx[2] + max$1([/*budget*/ ctx[3], /*boxoffice*/ ctx[4]]) + /*padding*/ ctx[12] + /*strokeLength*/ ctx[6] + /*yearFontSize*/ ctx[14])) {
    				attr_dev(text2, "y", text2_y_value);
    			}

    			if (dirty & /*colorScheme*/ 256 && text2_fill_value !== (text2_fill_value = /*colorScheme*/ ctx[8].Timeline)) {
    				attr_dev(text2, "fill", text2_fill_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(g2);
    			if_block.d();
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let ratingArr;
    	let arcGenerator;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Bubble', slots, []);
    	let { movie } = $$props;
    	let { x } = $$props;
    	let { y } = $$props;
    	let { budget } = $$props;
    	let { boxoffice } = $$props;
    	let { rating } = $$props;
    	let { strokeWidth } = $$props;
    	let { strokeLength } = $$props;
    	let { year } = $$props;
    	let { minYear } = $$props;
    	let { maxYear } = $$props;
    	let { state } = $$props;
    	let { colorScheme } = $$props;
    	let hovering;
    	let strokeNum = 40;
    	let padding = 4;
    	const fontSize = strokeLength + 1;
    	const yearFontSize = fontSize + 2;
    	let defaultMovie = "Default";

    	function enter() {
    		hovering = true;
    		$$invalidate(17, state = movie);
    	}

    	function leave() {
    		hovering = false;
    		$$invalidate(17, state = defaultMovie);
    	}

    	const writable_props = [
    		'movie',
    		'x',
    		'y',
    		'budget',
    		'boxoffice',
    		'rating',
    		'strokeWidth',
    		'strokeLength',
    		'year',
    		'minYear',
    		'maxYear',
    		'state',
    		'colorScheme'
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Bubble> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('movie' in $$props) $$invalidate(0, movie = $$props.movie);
    		if ('x' in $$props) $$invalidate(1, x = $$props.x);
    		if ('y' in $$props) $$invalidate(2, y = $$props.y);
    		if ('budget' in $$props) $$invalidate(3, budget = $$props.budget);
    		if ('boxoffice' in $$props) $$invalidate(4, boxoffice = $$props.boxoffice);
    		if ('rating' in $$props) $$invalidate(18, rating = $$props.rating);
    		if ('strokeWidth' in $$props) $$invalidate(5, strokeWidth = $$props.strokeWidth);
    		if ('strokeLength' in $$props) $$invalidate(6, strokeLength = $$props.strokeLength);
    		if ('year' in $$props) $$invalidate(7, year = $$props.year);
    		if ('minYear' in $$props) $$invalidate(19, minYear = $$props.minYear);
    		if ('maxYear' in $$props) $$invalidate(20, maxYear = $$props.maxYear);
    		if ('state' in $$props) $$invalidate(17, state = $$props.state);
    		if ('colorScheme' in $$props) $$invalidate(8, colorScheme = $$props.colorScheme);
    	};

    	$$self.$capture_state = () => ({
    		max: max$1,
    		arc,
    		curveBasis,
    		movie,
    		x,
    		y,
    		budget,
    		boxoffice,
    		rating,
    		strokeWidth,
    		strokeLength,
    		year,
    		minYear,
    		maxYear,
    		state,
    		colorScheme,
    		hovering,
    		strokeNum,
    		padding,
    		fontSize,
    		yearFontSize,
    		defaultMovie,
    		enter,
    		leave,
    		arcGenerator,
    		ratingArr
    	});

    	$$self.$inject_state = $$props => {
    		if ('movie' in $$props) $$invalidate(0, movie = $$props.movie);
    		if ('x' in $$props) $$invalidate(1, x = $$props.x);
    		if ('y' in $$props) $$invalidate(2, y = $$props.y);
    		if ('budget' in $$props) $$invalidate(3, budget = $$props.budget);
    		if ('boxoffice' in $$props) $$invalidate(4, boxoffice = $$props.boxoffice);
    		if ('rating' in $$props) $$invalidate(18, rating = $$props.rating);
    		if ('strokeWidth' in $$props) $$invalidate(5, strokeWidth = $$props.strokeWidth);
    		if ('strokeLength' in $$props) $$invalidate(6, strokeLength = $$props.strokeLength);
    		if ('year' in $$props) $$invalidate(7, year = $$props.year);
    		if ('minYear' in $$props) $$invalidate(19, minYear = $$props.minYear);
    		if ('maxYear' in $$props) $$invalidate(20, maxYear = $$props.maxYear);
    		if ('state' in $$props) $$invalidate(17, state = $$props.state);
    		if ('colorScheme' in $$props) $$invalidate(8, colorScheme = $$props.colorScheme);
    		if ('hovering' in $$props) hovering = $$props.hovering;
    		if ('strokeNum' in $$props) $$invalidate(11, strokeNum = $$props.strokeNum);
    		if ('padding' in $$props) $$invalidate(12, padding = $$props.padding);
    		if ('defaultMovie' in $$props) defaultMovie = $$props.defaultMovie;
    		if ('arcGenerator' in $$props) $$invalidate(9, arcGenerator = $$props.arcGenerator);
    		if ('ratingArr' in $$props) $$invalidate(10, ratingArr = $$props.ratingArr);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*rating*/ 262144) {
    			$$invalidate(10, ratingArr = [...Array(Math.round(rating / 100 * strokeNum)).fill(1)].concat([...Array(strokeNum - Math.round(rating / 100 * strokeNum)).fill(0)]));
    		}

    		if ($$self.$$.dirty & /*budget, boxoffice, strokeLength*/ 88) {
    			// arc generator to draw circle textPath for movie names
    			$$invalidate(9, arcGenerator = arc().innerRadius(0).outerRadius(max$1([budget, boxoffice]) + padding + strokeLength).startAngle(-Math.PI).endAngle(2 * Math.PI));
    		}
    	};

    	return [
    		movie,
    		x,
    		y,
    		budget,
    		boxoffice,
    		strokeWidth,
    		strokeLength,
    		year,
    		colorScheme,
    		arcGenerator,
    		ratingArr,
    		strokeNum,
    		padding,
    		fontSize,
    		yearFontSize,
    		enter,
    		leave,
    		state,
    		rating,
    		minYear,
    		maxYear
    	];
    }

    class Bubble extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {
    			movie: 0,
    			x: 1,
    			y: 2,
    			budget: 3,
    			boxoffice: 4,
    			rating: 18,
    			strokeWidth: 5,
    			strokeLength: 6,
    			year: 7,
    			minYear: 19,
    			maxYear: 20,
    			state: 17,
    			colorScheme: 8
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Bubble",
    			options,
    			id: create_fragment$7.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*movie*/ ctx[0] === undefined && !('movie' in props)) {
    			console.warn("<Bubble> was created without expected prop 'movie'");
    		}

    		if (/*x*/ ctx[1] === undefined && !('x' in props)) {
    			console.warn("<Bubble> was created without expected prop 'x'");
    		}

    		if (/*y*/ ctx[2] === undefined && !('y' in props)) {
    			console.warn("<Bubble> was created without expected prop 'y'");
    		}

    		if (/*budget*/ ctx[3] === undefined && !('budget' in props)) {
    			console.warn("<Bubble> was created without expected prop 'budget'");
    		}

    		if (/*boxoffice*/ ctx[4] === undefined && !('boxoffice' in props)) {
    			console.warn("<Bubble> was created without expected prop 'boxoffice'");
    		}

    		if (/*rating*/ ctx[18] === undefined && !('rating' in props)) {
    			console.warn("<Bubble> was created without expected prop 'rating'");
    		}

    		if (/*strokeWidth*/ ctx[5] === undefined && !('strokeWidth' in props)) {
    			console.warn("<Bubble> was created without expected prop 'strokeWidth'");
    		}

    		if (/*strokeLength*/ ctx[6] === undefined && !('strokeLength' in props)) {
    			console.warn("<Bubble> was created without expected prop 'strokeLength'");
    		}

    		if (/*year*/ ctx[7] === undefined && !('year' in props)) {
    			console.warn("<Bubble> was created without expected prop 'year'");
    		}

    		if (/*minYear*/ ctx[19] === undefined && !('minYear' in props)) {
    			console.warn("<Bubble> was created without expected prop 'minYear'");
    		}

    		if (/*maxYear*/ ctx[20] === undefined && !('maxYear' in props)) {
    			console.warn("<Bubble> was created without expected prop 'maxYear'");
    		}

    		if (/*state*/ ctx[17] === undefined && !('state' in props)) {
    			console.warn("<Bubble> was created without expected prop 'state'");
    		}

    		if (/*colorScheme*/ ctx[8] === undefined && !('colorScheme' in props)) {
    			console.warn("<Bubble> was created without expected prop 'colorScheme'");
    		}
    	}

    	get movie() {
    		throw new Error("<Bubble>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set movie(value) {
    		throw new Error("<Bubble>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get x() {
    		throw new Error("<Bubble>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set x(value) {
    		throw new Error("<Bubble>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get y() {
    		throw new Error("<Bubble>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set y(value) {
    		throw new Error("<Bubble>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get budget() {
    		throw new Error("<Bubble>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set budget(value) {
    		throw new Error("<Bubble>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get boxoffice() {
    		throw new Error("<Bubble>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set boxoffice(value) {
    		throw new Error("<Bubble>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get rating() {
    		throw new Error("<Bubble>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set rating(value) {
    		throw new Error("<Bubble>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get strokeWidth() {
    		throw new Error("<Bubble>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set strokeWidth(value) {
    		throw new Error("<Bubble>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get strokeLength() {
    		throw new Error("<Bubble>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set strokeLength(value) {
    		throw new Error("<Bubble>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get year() {
    		throw new Error("<Bubble>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set year(value) {
    		throw new Error("<Bubble>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get minYear() {
    		throw new Error("<Bubble>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set minYear(value) {
    		throw new Error("<Bubble>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get maxYear() {
    		throw new Error("<Bubble>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set maxYear(value) {
    		throw new Error("<Bubble>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get state() {
    		throw new Error("<Bubble>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set state(value) {
    		throw new Error("<Bubble>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get colorScheme() {
    		throw new Error("<Bubble>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set colorScheme(value) {
    		throw new Error("<Bubble>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    function cubicInOut(t) {
        return t < 0.5 ? 4.0 * t * t * t : 0.5 * Math.pow(2.0 * t - 2.0, 3.0) + 1.0;
    }
    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }
    function quintOut(t) {
        return --t * t * t * t * t + 1;
    }

    function is_date(obj) {
        return Object.prototype.toString.call(obj) === '[object Date]';
    }

    function get_interpolator(a, b) {
        if (a === b || a !== a)
            return () => a;
        const type = typeof a;
        if (type !== typeof b || Array.isArray(a) !== Array.isArray(b)) {
            throw new Error('Cannot interpolate values of different type');
        }
        if (Array.isArray(a)) {
            const arr = b.map((bi, i) => {
                return get_interpolator(a[i], bi);
            });
            return t => arr.map(fn => fn(t));
        }
        if (type === 'object') {
            if (!a || !b)
                throw new Error('Object cannot be null');
            if (is_date(a) && is_date(b)) {
                a = a.getTime();
                b = b.getTime();
                const delta = b - a;
                return t => new Date(a + t * delta);
            }
            const keys = Object.keys(b);
            const interpolators = {};
            keys.forEach(key => {
                interpolators[key] = get_interpolator(a[key], b[key]);
            });
            return t => {
                const result = {};
                keys.forEach(key => {
                    result[key] = interpolators[key](t);
                });
                return result;
            };
        }
        if (type === 'number') {
            const delta = b - a;
            return t => a + t * delta;
        }
        throw new Error(`Cannot interpolate ${type} values`);
    }
    function tweened(value, defaults = {}) {
        const store = writable(value);
        let task;
        let target_value = value;
        function set(new_value, opts) {
            if (value == null) {
                store.set(value = new_value);
                return Promise.resolve();
            }
            target_value = new_value;
            let previous_task = task;
            let started = false;
            let { delay = 0, duration = 400, easing = identity$2, interpolate = get_interpolator } = assign(assign({}, defaults), opts);
            if (duration === 0) {
                if (previous_task) {
                    previous_task.abort();
                    previous_task = null;
                }
                store.set(value = target_value);
                return Promise.resolve();
            }
            const start = now() + delay;
            let fn;
            task = loop(now => {
                if (now < start)
                    return true;
                if (!started) {
                    fn = interpolate(value, new_value);
                    if (typeof duration === 'function')
                        duration = duration(value, new_value);
                    started = true;
                }
                if (previous_task) {
                    previous_task.abort();
                    previous_task = null;
                }
                const elapsed = now - start;
                if (elapsed > duration) {
                    store.set(value = new_value);
                    return false;
                }
                // @ts-ignore
                store.set(value = fn(easing(elapsed / duration)));
                return true;
            });
            return task.promise;
        }
        return {
            set,
            update: (fn, opts) => set(fn(target_value, value), opts),
            subscribe: store.subscribe
        };
    }

    function ownKeys(object, enumerableOnly) {
      var keys = Object.keys(object);

      if (Object.getOwnPropertySymbols) {
        var symbols = Object.getOwnPropertySymbols(object);

        if (enumerableOnly) {
          symbols = symbols.filter(function (sym) {
            return Object.getOwnPropertyDescriptor(object, sym).enumerable;
          });
        }

        keys.push.apply(keys, symbols);
      }

      return keys;
    }

    function _objectSpread2(target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i] != null ? arguments[i] : {};

        if (i % 2) {
          ownKeys(Object(source), true).forEach(function (key) {
            _defineProperty(target, key, source[key]);
          });
        } else if (Object.getOwnPropertyDescriptors) {
          Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
        } else {
          ownKeys(Object(source)).forEach(function (key) {
            Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
          });
        }
      }

      return target;
    }

    function _defineProperty(obj, key, value) {
      if (key in obj) {
        Object.defineProperty(obj, key, {
          value: value,
          enumerable: true,
          configurable: true,
          writable: true
        });
      } else {
        obj[key] = value;
      }

      return obj;
    }

    function _extends() {
      _extends = Object.assign || function (target) {
        for (var i = 1; i < arguments.length; i++) {
          var source = arguments[i];

          for (var key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
              target[key] = source[key];
            }
          }
        }

        return target;
      };

      return _extends.apply(this, arguments);
    }

    function _unsupportedIterableToArray(o, minLen) {
      if (!o) return;
      if (typeof o === "string") return _arrayLikeToArray(o, minLen);
      var n = Object.prototype.toString.call(o).slice(8, -1);
      if (n === "Object" && o.constructor) n = o.constructor.name;
      if (n === "Map" || n === "Set") return Array.from(o);
      if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
    }

    function _arrayLikeToArray(arr, len) {
      if (len == null || len > arr.length) len = arr.length;

      for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];

      return arr2;
    }

    function _createForOfIteratorHelper(o, allowArrayLike) {
      var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"];

      if (!it) {
        if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") {
          if (it) o = it;
          var i = 0;

          var F = function () {};

          return {
            s: F,
            n: function () {
              if (i >= o.length) return {
                done: true
              };
              return {
                done: false,
                value: o[i++]
              };
            },
            e: function (e) {
              throw e;
            },
            f: F
          };
        }

        throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
      }

      var normalCompletion = true,
          didErr = false,
          err;
      return {
        s: function () {
          it = it.call(o);
        },
        n: function () {
          var step = it.next();
          normalCompletion = step.done;
          return step;
        },
        e: function (e) {
          didErr = true;
          err = e;
        },
        f: function () {
          try {
            if (!normalCompletion && it.return != null) it.return();
          } finally {
            if (didErr) throw err;
          }
        }
      };
    }

    /**
     * de Casteljau's algorithm for drawing and splitting bezier curves.
     * Inspired by https://pomax.github.io/bezierinfo/
     *
     * @param {Number[][]} points Array of [x,y] points: [start, control1, control2, ..., end]
     *   The original segment to split.
     * @param {Number} t Where to split the curve (value between [0, 1])
     * @return {Object} An object { left, right } where left is the segment from 0..t and
     *   right is the segment from t..1.
     */
    function decasteljau(points, t) {
      var left = [];
      var right = [];

      function decasteljauRecurse(points, t) {
        if (points.length === 1) {
          left.push(points[0]);
          right.push(points[0]);
        } else {
          var newPoints = Array(points.length - 1);

          for (var i = 0; i < newPoints.length; i++) {
            if (i === 0) {
              left.push(points[0]);
            }

            if (i === newPoints.length - 1) {
              right.push(points[i + 1]);
            }

            newPoints[i] = [(1 - t) * points[i][0] + t * points[i + 1][0], (1 - t) * points[i][1] + t * points[i + 1][1]];
          }

          decasteljauRecurse(newPoints, t);
        }
      }

      if (points.length) {
        decasteljauRecurse(points, t);
      }

      return {
        left: left,
        right: right.reverse()
      };
    }
    /**
     * Convert segments represented as points back into a command object
     *
     * @param {Number[][]} points Array of [x,y] points: [start, control1, control2, ..., end]
     *   Represents a segment
     * @return {Object} A command object representing the segment.
     */


    function pointsToCommand(points) {
      var command = {};

      if (points.length === 4) {
        command.x2 = points[2][0];
        command.y2 = points[2][1];
      }

      if (points.length >= 3) {
        command.x1 = points[1][0];
        command.y1 = points[1][1];
      }

      command.x = points[points.length - 1][0];
      command.y = points[points.length - 1][1];

      if (points.length === 4) {
        // start, control1, control2, end
        command.type = 'C';
      } else if (points.length === 3) {
        // start, control, end
        command.type = 'Q';
      } else {
        // start, end
        command.type = 'L';
      }

      return command;
    }
    /**
     * Runs de Casteljau's algorithm enough times to produce the desired number of segments.
     *
     * @param {Number[][]} points Array of [x,y] points for de Casteljau (the initial segment to split)
     * @param {Number} segmentCount Number of segments to split the original into
     * @return {Number[][][]} Array of segments
     */


    function splitCurveAsPoints(points, segmentCount) {
      segmentCount = segmentCount || 2;
      var segments = [];
      var remainingCurve = points;
      var tIncrement = 1 / segmentCount; // x-----x-----x-----x
      // t=  0.33   0.66   1
      // x-----o-----------x
      // r=  0.33
      //       x-----o-----x
      // r=         0.5  (0.33 / (1 - 0.33))  === tIncrement / (1 - (tIncrement * (i - 1))
      // x-----x-----x-----x----x
      // t=  0.25   0.5   0.75  1
      // x-----o----------------x
      // r=  0.25
      //       x-----o----------x
      // r=         0.33  (0.25 / (1 - 0.25))
      //             x-----o----x
      // r=         0.5  (0.25 / (1 - 0.5))

      for (var i = 0; i < segmentCount - 1; i++) {
        var tRelative = tIncrement / (1 - tIncrement * i);
        var split = decasteljau(remainingCurve, tRelative);
        segments.push(split.left);
        remainingCurve = split.right;
      } // last segment is just to the end from the last point


      segments.push(remainingCurve);
      return segments;
    }
    /**
     * Convert command objects to arrays of points, run de Casteljau's algorithm on it
     * to split into to the desired number of segments.
     *
     * @param {Object} commandStart The start command object
     * @param {Object} commandEnd The end command object
     * @param {Number} segmentCount The number of segments to create
     * @return {Object[]} An array of commands representing the segments in sequence
     */


    function splitCurve(commandStart, commandEnd, segmentCount) {
      var points = [[commandStart.x, commandStart.y]];

      if (commandEnd.x1 != null) {
        points.push([commandEnd.x1, commandEnd.y1]);
      }

      if (commandEnd.x2 != null) {
        points.push([commandEnd.x2, commandEnd.y2]);
      }

      points.push([commandEnd.x, commandEnd.y]);
      return splitCurveAsPoints(points, segmentCount).map(pointsToCommand);
    }

    var commandTokenRegex = /[MLCSTQAHVZmlcstqahv]|-?[\d.e+-]+/g;
    /**
     * List of params for each command type in a path `d` attribute
     */

    var typeMap = {
      M: ['x', 'y'],
      L: ['x', 'y'],
      H: ['x'],
      V: ['y'],
      C: ['x1', 'y1', 'x2', 'y2', 'x', 'y'],
      S: ['x2', 'y2', 'x', 'y'],
      Q: ['x1', 'y1', 'x', 'y'],
      T: ['x', 'y'],
      A: ['rx', 'ry', 'xAxisRotation', 'largeArcFlag', 'sweepFlag', 'x', 'y'],
      Z: []
    }; // Add lower case entries too matching uppercase (e.g. 'm' == 'M')

    Object.keys(typeMap).forEach(function (key) {
      typeMap[key.toLowerCase()] = typeMap[key];
    });

    function arrayOfLength(length, value) {
      var array = Array(length);

      for (var i = 0; i < length; i++) {
        array[i] = value;
      }

      return array;
    }
    /**
     * Converts a command object to a string to be used in a `d` attribute
     * @param {Object} command A command object
     * @return {String} The string for the `d` attribute
     */


    function commandToString(command) {
      return "".concat(command.type).concat(typeMap[command.type].map(function (p) {
        return command[p];
      }).join(','));
    }
    /**
     * Converts command A to have the same type as command B.
     *
     * e.g., L0,5 -> C0,5,0,5,0,5
     *
     * Uses these rules:
     * x1 <- x
     * x2 <- x
     * y1 <- y
     * y2 <- y
     * rx <- 0
     * ry <- 0
     * xAxisRotation <- read from B
     * largeArcFlag <- read from B
     * sweepflag <- read from B
     *
     * @param {Object} aCommand Command object from path `d` attribute
     * @param {Object} bCommand Command object from path `d` attribute to match against
     * @return {Object} aCommand converted to type of bCommand
     */


    function convertToSameType(aCommand, bCommand) {
      var conversionMap = {
        x1: 'x',
        y1: 'y',
        x2: 'x',
        y2: 'y'
      };
      var readFromBKeys = ['xAxisRotation', 'largeArcFlag', 'sweepFlag']; // convert (but ignore M types)

      if (aCommand.type !== bCommand.type && bCommand.type.toUpperCase() !== 'M') {
        var aConverted = {};
        Object.keys(bCommand).forEach(function (bKey) {
          var bValue = bCommand[bKey]; // first read from the A command

          var aValue = aCommand[bKey]; // if it is one of these values, read from B no matter what

          if (aValue === undefined) {
            if (readFromBKeys.includes(bKey)) {
              aValue = bValue;
            } else {
              // if it wasn't in the A command, see if an equivalent was
              if (aValue === undefined && conversionMap[bKey]) {
                aValue = aCommand[conversionMap[bKey]];
              } // if it doesn't have a converted value, use 0


              if (aValue === undefined) {
                aValue = 0;
              }
            }
          }

          aConverted[bKey] = aValue;
        }); // update the type to match B

        aConverted.type = bCommand.type;
        aCommand = aConverted;
      }

      return aCommand;
    }
    /**
     * Interpolate between command objects commandStart and commandEnd segmentCount times.
     * If the types are L, Q, or C then the curves are split as per de Casteljau's algorithm.
     * Otherwise we just copy commandStart segmentCount - 1 times, finally ending with commandEnd.
     *
     * @param {Object} commandStart Command object at the beginning of the segment
     * @param {Object} commandEnd Command object at the end of the segment
     * @param {Number} segmentCount The number of segments to split this into. If only 1
     *   Then [commandEnd] is returned.
     * @return {Object[]} Array of ~segmentCount command objects between commandStart and
     *   commandEnd. (Can be segmentCount+1 objects if commandStart is type M).
     */


    function splitSegment(commandStart, commandEnd, segmentCount) {
      var segments = []; // line, quadratic bezier, or cubic bezier

      if (commandEnd.type === 'L' || commandEnd.type === 'Q' || commandEnd.type === 'C') {
        segments = segments.concat(splitCurve(commandStart, commandEnd, segmentCount)); // general case - just copy the same point
      } else {
        var copyCommand = _extends({}, commandStart); // convert M to L


        if (copyCommand.type === 'M') {
          copyCommand.type = 'L';
        }

        segments = segments.concat(arrayOfLength(segmentCount - 1).map(function () {
          return copyCommand;
        }));
        segments.push(commandEnd);
      }

      return segments;
    }
    /**
     * Extends an array of commandsToExtend to the length of the referenceCommands by
     * splitting segments until the number of commands match. Ensures all the actual
     * points of commandsToExtend are in the extended array.
     *
     * @param {Object[]} commandsToExtend The command object array to extend
     * @param {Object[]} referenceCommands The command object array to match in length
     * @param {Function} excludeSegment a function that takes a start command object and
     *   end command object and returns true if the segment should be excluded from splitting.
     * @return {Object[]} The extended commandsToExtend array
     */


    function extend(commandsToExtend, referenceCommands, excludeSegment) {
      // compute insertion points:
      // number of segments in the path to extend
      var numSegmentsToExtend = commandsToExtend.length - 1; // number of segments in the reference path.

      var numReferenceSegments = referenceCommands.length - 1; // this value is always between [0, 1].

      var segmentRatio = numSegmentsToExtend / numReferenceSegments; // create a map, mapping segments in referenceCommands to how many points
      // should be added in that segment (should always be >= 1 since we need each
      // point itself).
      // 0 = segment 0-1, 1 = segment 1-2, n-1 = last vertex

      var countPointsPerSegment = arrayOfLength(numReferenceSegments).reduce(function (accum, d, i) {
        var insertIndex = Math.floor(segmentRatio * i); // handle excluding segments

        if (excludeSegment && insertIndex < commandsToExtend.length - 1 && excludeSegment(commandsToExtend[insertIndex], commandsToExtend[insertIndex + 1])) {
          // set the insertIndex to the segment that this point should be added to:
          // round the insertIndex essentially so we split half and half on
          // neighbouring segments. hence the segmentRatio * i < 0.5
          var addToPriorSegment = segmentRatio * i % 1 < 0.5; // only skip segment if we already have 1 point in it (can't entirely remove a segment)

          if (accum[insertIndex]) {
            // TODO - Note this is a naive algorithm that should work for most d3-area use cases
            // but if two adjacent segments are supposed to be skipped, this will not perform as
            // expected. Could be updated to search for nearest segment to place the point in, but
            // will only do that if necessary.
            // add to the prior segment
            if (addToPriorSegment) {
              if (insertIndex > 0) {
                insertIndex -= 1; // not possible to add to previous so adding to next
              } else if (insertIndex < commandsToExtend.length - 1) {
                insertIndex += 1;
              } // add to next segment

            } else if (insertIndex < commandsToExtend.length - 1) {
              insertIndex += 1; // not possible to add to next so adding to previous
            } else if (insertIndex > 0) {
              insertIndex -= 1;
            }
          }
        }

        accum[insertIndex] = (accum[insertIndex] || 0) + 1;
        return accum;
      }, []); // extend each segment to have the correct number of points for a smooth interpolation

      var extended = countPointsPerSegment.reduce(function (extended, segmentCount, i) {
        // if last command, just add `segmentCount` number of times
        if (i === commandsToExtend.length - 1) {
          var lastCommandCopies = arrayOfLength(segmentCount, _extends({}, commandsToExtend[commandsToExtend.length - 1])); // convert M to L

          if (lastCommandCopies[0].type === 'M') {
            lastCommandCopies.forEach(function (d) {
              d.type = 'L';
            });
          }

          return extended.concat(lastCommandCopies);
        } // otherwise, split the segment segmentCount times.


        return extended.concat(splitSegment(commandsToExtend[i], commandsToExtend[i + 1], segmentCount));
      }, []); // add in the very first point since splitSegment only adds in the ones after it

      extended.unshift(commandsToExtend[0]);
      return extended;
    }
    /**
     * Takes a path `d` string and converts it into an array of command
     * objects. Drops the `Z` character.
     *
     * @param {String|null} d A path `d` string
     */


    function pathCommandsFromString(d) {
      // split into valid tokens
      var tokens = (d || '').match(commandTokenRegex) || [];
      var commands = [];
      var commandArgs;
      var command; // iterate over each token, checking if we are at a new command
      // by presence in the typeMap

      for (var i = 0; i < tokens.length; ++i) {
        commandArgs = typeMap[tokens[i]]; // new command found:

        if (commandArgs) {
          command = {
            type: tokens[i]
          }; // add each of the expected args for this command:

          for (var a = 0; a < commandArgs.length; ++a) {
            command[commandArgs[a]] = +tokens[i + a + 1];
          } // need to increment our token index appropriately since
          // we consumed token args


          i += commandArgs.length;
          commands.push(command);
        }
      }

      return commands;
    }
    /**
     * Interpolate from A to B by extending A and B during interpolation to have
     * the same number of points. This allows for a smooth transition when they
     * have a different number of points.
     *
     * Ignores the `Z` command in paths unless both A and B end with it.
     *
     * This function works directly with arrays of command objects instead of with
     * path `d` strings (see interpolatePath for working with `d` strings).
     *
     * @param {Object[]} aCommandsInput Array of path commands
     * @param {Object[]} bCommandsInput Array of path commands
     * @param {Function} excludeSegment a function that takes a start command object and
     *   end command object and returns true if the segment should be excluded from splitting.
     * @returns {Function} Interpolation function that maps t ([0, 1]) to an array of path commands.
     */

    function interpolatePathCommands(aCommandsInput, bCommandsInput, excludeSegment) {
      // make a copy so we don't mess with the input arrays
      var aCommands = aCommandsInput == null ? [] : aCommandsInput.slice();
      var bCommands = bCommandsInput == null ? [] : bCommandsInput.slice(); // both input sets are empty, so we don't interpolate

      if (!aCommands.length && !bCommands.length) {
        return function nullInterpolator() {
          return [];
        };
      } // do we add Z during interpolation? yes if both have it. (we'd expect both to have it or not)


      var addZ = (aCommands.length === 0 || aCommands[aCommands.length - 1].type === 'Z') && (bCommands.length === 0 || bCommands[bCommands.length - 1].type === 'Z'); // we temporarily remove Z

      if (aCommands.length > 0 && aCommands[aCommands.length - 1].type === 'Z') {
        aCommands.pop();
      }

      if (bCommands.length > 0 && bCommands[bCommands.length - 1].type === 'Z') {
        bCommands.pop();
      } // if A is empty, treat it as if it used to contain just the first point
      // of B. This makes it so the line extends out of from that first point.


      if (!aCommands.length) {
        aCommands.push(bCommands[0]); // otherwise if B is empty, treat it as if it contains the first point
        // of A. This makes it so the line retracts into the first point.
      } else if (!bCommands.length) {
        bCommands.push(aCommands[0]);
      } // extend to match equal size


      var numPointsToExtend = Math.abs(bCommands.length - aCommands.length);

      if (numPointsToExtend !== 0) {
        // B has more points than A, so add points to A before interpolating
        if (bCommands.length > aCommands.length) {
          aCommands = extend(aCommands, bCommands, excludeSegment); // else if A has more points than B, add more points to B
        } else if (bCommands.length < aCommands.length) {
          bCommands = extend(bCommands, aCommands, excludeSegment);
        }
      } // commands have same length now.
      // convert commands in A to the same type as those in B


      aCommands = aCommands.map(function (aCommand, i) {
        return convertToSameType(aCommand, bCommands[i]);
      }); // create mutable interpolated command objects

      var interpolatedCommands = aCommands.map(function (aCommand) {
        return _objectSpread2({}, aCommand);
      });

      if (addZ) {
        interpolatedCommands.push({
          type: 'Z'
        });
        aCommands.push({
          type: 'Z'
        }); // required for when returning at t == 0
      }

      return function pathCommandInterpolator(t) {
        // at 1 return the final value without the extensions used during interpolation
        if (t === 1) {
          return bCommandsInput == null ? [] : bCommandsInput;
        } // work with aCommands directly since interpolatedCommands are mutated


        if (t === 0) {
          return aCommands;
        } // interpolate the commands using the mutable interpolated command objs


        for (var i = 0; i < interpolatedCommands.length; ++i) {
          // if (interpolatedCommands[i].type === 'Z') continue;
          var aCommand = aCommands[i];
          var bCommand = bCommands[i];
          var interpolatedCommand = interpolatedCommands[i];

          var _iterator = _createForOfIteratorHelper(typeMap[interpolatedCommand.type]),
              _step;

          try {
            for (_iterator.s(); !(_step = _iterator.n()).done;) {
              var arg = _step.value;
              interpolatedCommand[arg] = (1 - t) * aCommand[arg] + t * bCommand[arg]; // do not use floats for flags (#27), round to integer

              if (arg === 'largeArcFlag' || arg === 'sweepFlag') {
                interpolatedCommand[arg] = Math.round(interpolatedCommand[arg]);
              }
            }
          } catch (err) {
            _iterator.e(err);
          } finally {
            _iterator.f();
          }
        }

        return interpolatedCommands;
      };
    }
    /**
     * Interpolate from A to B by extending A and B during interpolation to have
     * the same number of points. This allows for a smooth transition when they
     * have a different number of points.
     *
     * Ignores the `Z` character in paths unless both A and B end with it.
     *
     * @param {String} a The `d` attribute for a path
     * @param {String} b The `d` attribute for a path
     * @param {Function} excludeSegment a function that takes a start command object and
     *   end command object and returns true if the segment should be excluded from splitting.
     * @returns {Function} Interpolation function that maps t ([0, 1]) to a path `d` string.
     */

    function interpolatePath(a, b, excludeSegment) {
      var aCommands = pathCommandsFromString(a);
      var bCommands = pathCommandsFromString(b);

      if (!aCommands.length && !bCommands.length) {
        return function nullInterpolator() {
          return '';
        };
      }

      var commandInterpolator = interpolatePathCommands(aCommands, bCommands, excludeSegment);
      return function pathStringInterpolator(t) {
        // at 1 return the final value without the extensions used during interpolation
        if (t === 1) {
          return b == null ? '' : b;
        }

        var interpolatedCommands = commandInterpolator(t); // convert to a string (fastest concat: https://jsperf.com/join-concat/150)

        var interpolatedString = '';

        var _iterator2 = _createForOfIteratorHelper(interpolatedCommands),
            _step2;

        try {
          for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
            var interpolatedCommand = _step2.value;
            interpolatedString += commandToString(interpolatedCommand);
          }
        } catch (err) {
          _iterator2.e(err);
        } finally {
          _iterator2.f();
        }

        return interpolatedString;
      };
    }

    /* src/components/Timeline.svelte generated by Svelte v3.49.0 */
    const file$6 = "src/components/Timeline.svelte";

    function get_each_context$4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i].x;
    	child_ctx[6] = list[i].y;
    	child_ctx[7] = list[i].year;
    	child_ctx[9] = i;
    	return child_ctx;
    }

    // (40:2) {#if year % 10 === 0 && year !== 0}
    function create_if_block$4(ctx) {
    	let path;
    	let path_d_value;
    	let t0;
    	let text_1;
    	let textPath;
    	let t1_value = /*year*/ ctx[7] + "";
    	let t1;

    	const block = {
    		c: function create() {
    			path = svg_element("path");
    			t0 = space();
    			text_1 = svg_element("text");
    			textPath = svg_element("textPath");
    			t1 = text(t1_value);

    			attr_dev(path, "d", path_d_value = /*lineGenerator*/ ctx[2]([
    				/*timelineData*/ ctx[0][/*idx*/ ctx[9] - 3],
    				/*timelineData*/ ctx[0][/*idx*/ ctx[9] - 2],
    				/*timelineData*/ ctx[0][/*idx*/ ctx[9] - 1],
    				/*timelineData*/ ctx[0][/*idx*/ ctx[9]],
    				/*timelineData*/ ctx[0][/*idx*/ ctx[9] + 1]
    			]));

    			attr_dev(path, "id", `timeline${/*idx*/ ctx[9]}`);
    			attr_dev(path, "fill", "none");
    			add_location(path, file$6, 41, 4, 1135);
    			xlink_attr(textPath, "xlink:href", `#timeline${/*idx*/ ctx[9]}`);
    			attr_dev(textPath, "startOffset", "75%");
    			attr_dev(textPath, "text-anchor", "middle");
    			attr_dev(textPath, "fill", "red");
    			add_location(textPath, file$6, 53, 6, 1405);
    			attr_dev(text_1, "dy", "-5");
    			add_location(text_1, file$6, 52, 4, 1384);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, path, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, text_1, anchor);
    			append_dev(text_1, textPath);
    			append_dev(textPath, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*timelineData*/ 1 && path_d_value !== (path_d_value = /*lineGenerator*/ ctx[2]([
    				/*timelineData*/ ctx[0][/*idx*/ ctx[9] - 3],
    				/*timelineData*/ ctx[0][/*idx*/ ctx[9] - 2],
    				/*timelineData*/ ctx[0][/*idx*/ ctx[9] - 1],
    				/*timelineData*/ ctx[0][/*idx*/ ctx[9]],
    				/*timelineData*/ ctx[0][/*idx*/ ctx[9] + 1]
    			]))) {
    				attr_dev(path, "d", path_d_value);
    			}

    			if (dirty & /*timelineData*/ 1 && t1_value !== (t1_value = /*year*/ ctx[7] + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(path);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(text_1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(40:2) {#if year % 10 === 0 && year !== 0}",
    		ctx
    	});

    	return block;
    }

    // (39:0) {#each timelineData as { x, y, year }
    function create_each_block$4(ctx) {
    	let if_block_anchor;
    	let if_block = /*year*/ ctx[7] % 10 === 0 && /*year*/ ctx[7] !== 0 && create_if_block$4(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*year*/ ctx[7] % 10 === 0 && /*year*/ ctx[7] !== 0) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$4(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$4.name,
    		type: "each",
    		source: "(39:0) {#each timelineData as { x, y, year }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let path;
    	let t;
    	let each_1_anchor;
    	let each_value = /*timelineData*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			path = svg_element("path");
    			t = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			attr_dev(path, "class", "line svelte-yniea2");
    			attr_dev(path, "d", /*linePath*/ ctx[1]);
    			add_location(path, file$6, 37, 0, 958);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, path, anchor);
    			insert_dev(target, t, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*linePath*/ 2) {
    				attr_dev(path, "d", /*linePath*/ ctx[1]);
    			}

    			if (dirty & /*timelineData, lineGenerator*/ 5) {
    				each_value = /*timelineData*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$4(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$4(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(path);
    			if (detaching) detach_dev(t);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let linePath;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Timeline', slots, []);
    	let { timelineData } = $$props;
    	let { height } = $$props;
    	const lineGenerator = line().x(d => d.x).y(d => d.y).curve(curveBasis);

    	const tLinePath = tweened(null, {
    		duration: 400,
    		// easing: cubicOut,
    		interpolate: interpolatePath
    	});

    	const writable_props = ['timelineData', 'height'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Timeline> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('timelineData' in $$props) $$invalidate(0, timelineData = $$props.timelineData);
    		if ('height' in $$props) $$invalidate(3, height = $$props.height);
    	};

    	$$self.$capture_state = () => ({
    		tweened,
    		cubicOut,
    		line,
    		curveBasis,
    		min: min$1,
    		max: max$1,
    		interpolatePath,
    		timelineData,
    		height,
    		lineGenerator,
    		tLinePath,
    		linePath
    	});

    	$$self.$inject_state = $$props => {
    		if ('timelineData' in $$props) $$invalidate(0, timelineData = $$props.timelineData);
    		if ('height' in $$props) $$invalidate(3, height = $$props.height);
    		if ('linePath' in $$props) $$invalidate(1, linePath = $$props.linePath);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*timelineData, height*/ 9) {
    			for (let i = 0; i < timelineData.length - 1; i++) {
    				if (timelineData[i + 1].y === timelineData[i].y) {
    					timelineData.splice(i + 1, 0, {
    						year: 0,
    						x: (timelineData[i].x + timelineData[i + 1].x) / 2,
    						y: timelineData[i].y > height / 2
    						? timelineData[i].y + 50
    						: timelineData[i].y - 50, //TODO: MAKE 50 DYNAMIC (?)
    						
    					});
    				}
    			}
    		}

    		if ($$self.$$.dirty & /*timelineData*/ 1) {
    			$$invalidate(1, linePath = lineGenerator(timelineData));
    		}

    		if ($$self.$$.dirty & /*linePath*/ 2) {
    			tLinePath.set(linePath);
    		}
    	};

    	return [timelineData, linePath, lineGenerator, height];
    }

    class Timeline extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { timelineData: 0, height: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Timeline",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*timelineData*/ ctx[0] === undefined && !('timelineData' in props)) {
    			console.warn("<Timeline> was created without expected prop 'timelineData'");
    		}

    		if (/*height*/ ctx[3] === undefined && !('height' in props)) {
    			console.warn("<Timeline> was created without expected prop 'height'");
    		}
    	}

    	get timelineData() {
    		throw new Error("<Timeline>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set timelineData(value) {
    		throw new Error("<Timeline>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get height() {
    		throw new Error("<Timeline>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set height(value) {
    		throw new Error("<Timeline>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Chart.svelte generated by Svelte v3.49.0 */
    const file$5 = "src/components/Chart.svelte";

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[23] = list[i].movie;
    	child_ctx[24] = list[i].x;
    	child_ctx[25] = list[i].y;
    	child_ctx[26] = list[i].budget;
    	child_ctx[27] = list[i].boxoffice;
    	child_ctx[28] = list[i].rating;
    	child_ctx[29] = list[i].strokeWidth;
    	child_ctx[30] = list[i].strokeLength;
    	child_ctx[31] = list[i].year;
    	child_ctx[32] = list[i].minYear;
    	return child_ctx;
    }

    // (92:2) {#if width && height}
    function create_if_block$3(ctx) {
    	let svg;
    	let timeline;
    	let current;

    	timeline = new Timeline({
    			props: {
    				timelineData: /*timelineData*/ ctx[2],
    				height: /*height*/ ctx[1],
    				width: /*width*/ ctx[0]
    			},
    			$$inline: true
    		});

    	let each_value = /*renderedData*/ ctx[3];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			create_component(timeline.$$.fragment);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(svg, "width", /*width*/ ctx[0]);
    			attr_dev(svg, "height", /*height*/ ctx[1]);
    			add_location(svg, file$5, 92, 4, 3197);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			mount_component(timeline, svg, null);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(svg, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const timeline_changes = {};
    			if (dirty[0] & /*timelineData*/ 4) timeline_changes.timelineData = /*timelineData*/ ctx[2];
    			if (dirty[0] & /*height*/ 2) timeline_changes.height = /*height*/ ctx[1];
    			if (dirty[0] & /*width*/ 1) timeline_changes.width = /*width*/ ctx[0];
    			timeline.$set(timeline_changes);

    			if (dirty[0] & /*renderedData*/ 8) {
    				each_value = /*renderedData*/ ctx[3];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(svg, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (!current || dirty[0] & /*width*/ 1) {
    				attr_dev(svg, "width", /*width*/ ctx[0]);
    			}

    			if (!current || dirty[0] & /*height*/ 2) {
    				attr_dev(svg, "height", /*height*/ ctx[1]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(timeline.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(timeline.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    			destroy_component(timeline);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(92:2) {#if width && height}",
    		ctx
    	});

    	return block;
    }

    // (95:6) {#each renderedData as { movie, x, y, budget, boxoffice, rating, strokeWidth, strokeLength, year, minYear }}
    function create_each_block$3(ctx) {
    	let bubble_1;
    	let current;

    	bubble_1 = new Bubble({
    			props: {
    				movie: /*movie*/ ctx[23],
    				x: /*x*/ ctx[24],
    				y: /*y*/ ctx[25],
    				budget: /*budget*/ ctx[26],
    				boxoffice: /*boxoffice*/ ctx[27],
    				rating: /*rating*/ ctx[28],
    				strokeWidth: /*strokeWidth*/ ctx[29],
    				strokeLength: /*strokeLength*/ ctx[30],
    				year: /*year*/ ctx[31],
    				minYear: /*minYear*/ ctx[32]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(bubble_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(bubble_1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const bubble_1_changes = {};
    			if (dirty[0] & /*renderedData*/ 8) bubble_1_changes.movie = /*movie*/ ctx[23];
    			if (dirty[0] & /*renderedData*/ 8) bubble_1_changes.x = /*x*/ ctx[24];
    			if (dirty[0] & /*renderedData*/ 8) bubble_1_changes.y = /*y*/ ctx[25];
    			if (dirty[0] & /*renderedData*/ 8) bubble_1_changes.budget = /*budget*/ ctx[26];
    			if (dirty[0] & /*renderedData*/ 8) bubble_1_changes.boxoffice = /*boxoffice*/ ctx[27];
    			if (dirty[0] & /*renderedData*/ 8) bubble_1_changes.rating = /*rating*/ ctx[28];
    			if (dirty[0] & /*renderedData*/ 8) bubble_1_changes.strokeWidth = /*strokeWidth*/ ctx[29];
    			if (dirty[0] & /*renderedData*/ 8) bubble_1_changes.strokeLength = /*strokeLength*/ ctx[30];
    			if (dirty[0] & /*renderedData*/ 8) bubble_1_changes.year = /*year*/ ctx[31];
    			if (dirty[0] & /*renderedData*/ 8) bubble_1_changes.minYear = /*minYear*/ ctx[32];
    			bubble_1.$set(bubble_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(bubble_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(bubble_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(bubble_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$3.name,
    		type: "each",
    		source: "(95:6) {#each renderedData as { movie, x, y, budget, boxoffice, rating, strokeWidth, strokeLength, year, minYear }}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let div;
    	let div_resize_listener;
    	let current;
    	let if_block = /*width*/ ctx[0] && /*height*/ ctx[1] && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block) if_block.c();
    			attr_dev(div, "class", "chart svelte-1026jzk");
    			add_render_callback(() => /*div_elementresize_handler*/ ctx[18].call(div));
    			add_location(div, file$5, 90, 0, 3097);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    			div_resize_listener = add_resize_listener(div, /*div_elementresize_handler*/ ctx[18].bind(div));
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*width*/ ctx[0] && /*height*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty[0] & /*width, height*/ 3) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    			div_resize_listener();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let paddingTop;
    	let paddingBottom;
    	let paddingLeft;
    	let paddingRight;
    	let innerWidth;
    	let innerHeight;
    	let xScale;
    	let yScale;
    	let circleScale;
    	let strokeNumScale;
    	let strokeWidthScale;
    	let strokeLengthScale;
    	let renderedData;
    	let timelineData;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Chart', slots, []);
    	let { data } = $$props;
    	let { xRange } = $$props;
    	let { yRange } = $$props;
    	let { circleRange } = $$props;
    	let width;
    	let height;

    	// create dataset of points for every year between the min and max to draw our timeline
    	// this is so that we ensure we show the transition between the first & last years in every decade
    	const years = new Set(data.map(d => d.Year));

    	let allYears = [];
    	const writable_props = ['data', 'xRange', 'yRange', 'circleRange'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Chart> was created with unknown prop '${key}'`);
    	});

    	function div_elementresize_handler() {
    		width = this.clientWidth;
    		height = this.clientHeight;
    		$$invalidate(0, width);
    		$$invalidate(1, height);
    	}

    	$$self.$$set = $$props => {
    		if ('data' in $$props) $$invalidate(4, data = $$props.data);
    		if ('xRange' in $$props) $$invalidate(5, xRange = $$props.xRange);
    		if ('yRange' in $$props) $$invalidate(6, yRange = $$props.yRange);
    		if ('circleRange' in $$props) $$invalidate(7, circleRange = $$props.circleRange);
    	};

    	$$self.$capture_state = () => ({
    		min: min$1,
    		max: max$1,
    		scaleLinear: linear,
    		scaleSqrt: sqrt$1,
    		scaleQuantize: quantize,
    		Bubble,
    		TimeLine: Timeline,
    		data,
    		xRange,
    		yRange,
    		circleRange,
    		width,
    		height,
    		years,
    		allYears,
    		yScale,
    		xScale,
    		timelineData,
    		strokeLengthScale,
    		strokeWidthScale,
    		circleScale,
    		renderedData,
    		strokeNumScale,
    		innerHeight,
    		paddingTop,
    		paddingBottom,
    		paddingRight,
    		paddingLeft,
    		innerWidth
    	});

    	$$self.$inject_state = $$props => {
    		if ('data' in $$props) $$invalidate(4, data = $$props.data);
    		if ('xRange' in $$props) $$invalidate(5, xRange = $$props.xRange);
    		if ('yRange' in $$props) $$invalidate(6, yRange = $$props.yRange);
    		if ('circleRange' in $$props) $$invalidate(7, circleRange = $$props.circleRange);
    		if ('width' in $$props) $$invalidate(0, width = $$props.width);
    		if ('height' in $$props) $$invalidate(1, height = $$props.height);
    		if ('allYears' in $$props) $$invalidate(22, allYears = $$props.allYears);
    		if ('yScale' in $$props) $$invalidate(8, yScale = $$props.yScale);
    		if ('xScale' in $$props) $$invalidate(9, xScale = $$props.xScale);
    		if ('timelineData' in $$props) $$invalidate(2, timelineData = $$props.timelineData);
    		if ('strokeLengthScale' in $$props) $$invalidate(10, strokeLengthScale = $$props.strokeLengthScale);
    		if ('strokeWidthScale' in $$props) $$invalidate(11, strokeWidthScale = $$props.strokeWidthScale);
    		if ('circleScale' in $$props) $$invalidate(12, circleScale = $$props.circleScale);
    		if ('renderedData' in $$props) $$invalidate(3, renderedData = $$props.renderedData);
    		if ('strokeNumScale' in $$props) strokeNumScale = $$props.strokeNumScale;
    		if ('innerHeight' in $$props) $$invalidate(13, innerHeight = $$props.innerHeight);
    		if ('paddingTop' in $$props) $$invalidate(14, paddingTop = $$props.paddingTop);
    		if ('paddingBottom' in $$props) $$invalidate(15, paddingBottom = $$props.paddingBottom);
    		if ('paddingRight' in $$props) $$invalidate(16, paddingRight = $$props.paddingRight);
    		if ('paddingLeft' in $$props) $$invalidate(17, paddingLeft = $$props.paddingLeft);
    		if ('innerWidth' in $$props) innerWidth = $$props.innerWidth;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*height*/ 2) {
    			$$invalidate(14, paddingTop = height / 10); //TODO: make dynamic based on window dimensions
    		}

    		if ($$self.$$.dirty[0] & /*height*/ 2) {
    			$$invalidate(15, paddingBottom = height / 10);
    		}

    		if ($$self.$$.dirty[0] & /*width*/ 1) {
    			$$invalidate(17, paddingLeft = width / 3);
    		}

    		if ($$self.$$.dirty[0] & /*height*/ 2) {
    			$$invalidate(16, paddingRight = height / 10);
    		}

    		if ($$self.$$.dirty[0] & /*width, paddingLeft, paddingRight*/ 196609) {
    			innerWidth = width - paddingLeft - paddingRight;
    		}

    		if ($$self.$$.dirty[0] & /*height, paddingTop, paddingBottom*/ 49154) {
    			$$invalidate(13, innerHeight = height - paddingTop - paddingBottom);
    		}

    		if ($$self.$$.dirty[0] & /*xRange, paddingLeft, width, paddingRight*/ 196641) {
    			$$invalidate(9, xScale = linear().domain(xRange).range([paddingLeft, width - paddingRight]));
    		}

    		if ($$self.$$.dirty[0] & /*yRange, height, paddingBottom, paddingTop*/ 49218) {
    			$$invalidate(8, yScale = linear().domain(yRange).range([height - paddingBottom, paddingTop]));
    		}

    		if ($$self.$$.dirty[0] & /*circleRange, innerHeight*/ 8320) {
    			$$invalidate(12, circleScale = sqrt$1().domain(circleRange).range([10, (innerHeight / 10 - 11 * 3) / 2]));
    		}

    		if ($$self.$$.dirty[0] & /*circleRange*/ 128) {
    			// create scales to map radius to number of strokes, stroke width and stroke length
    			// scaleQuantize maps a continuous domain to a discrete range
    			strokeNumScale = quantize().domain(circleRange).range([30, 40]); //currently not using
    		}

    		if ($$self.$$.dirty[0] & /*circleRange*/ 128) {
    			$$invalidate(11, strokeWidthScale = linear().domain(circleRange).range([2, 4]));
    		}

    		if ($$self.$$.dirty[0] & /*circleRange*/ 128) {
    			// $: strokeLengthScale = scaleLinear().domain(circleRange).range([9, 14]);
    			$$invalidate(10, strokeLengthScale = linear().domain(circleRange).range([6, 11]));
    		}

    		if ($$self.$$.dirty[0] & /*data, xScale, yScale, circleScale, strokeWidthScale, strokeLengthScale*/ 7952) {
    			$$invalidate(3, renderedData = data.map(d => {
    				return {
    					movie: d.Movie,
    					x: xScale(Math.floor(d.Year / 10)),
    					// reverse the y scale for every other decade - found by subtracting each decade from the first decade & determining if even or odd
    					y: (Math.floor(d.Year / 10) - min$1(data.map(d => Math.floor(d.Year / 10)))) % 2 === 0
    					? yScale(d.Year % 10)
    					: yScale(9 - d.Year % 10),
    					budget: circleScale(d.Budget),
    					boxoffice: circleScale(d.BoxOffice),
    					rating: (d.RottenTomatoes_Tomatometer + d.RottenTomatoes_Audience) / 2,
    					//   strokeNum: strokeNumScale(max([d.Budget, d.BoxOffice])),
    					strokeWidth: strokeWidthScale(max$1([d.Budget, d.BoxOffice])),
    					strokeLength: strokeLengthScale(max$1([d.Budget, d.BoxOffice])),
    					year: d.Year,
    					minYear: min$1(years)
    				};
    			}));
    		}

    		if ($$self.$$.dirty[0] & /*xScale, data, yScale*/ 784) {
    			$$invalidate(2, timelineData = allYears.map(d => {
    				return {
    					year: d.Year,
    					x: xScale(Math.floor(d.Year / 10)),
    					// reverse the y scale for every other decade - found by subtracting each decade from the first decade & determining if even or odd
    					y: (Math.floor(d.Year / 10) - min$1(data.map(d => Math.floor(d.Year / 10)))) % 2 === 0
    					? yScale(d.Year % 10)
    					: yScale(9 - d.Year % 10)
    				};
    			}));
    		}
    	};

    	for (let currYear = min$1(years); currYear <= max$1(years); currYear++) {
    		allYears.push({ Year: currYear });
    	}

    	return [
    		width,
    		height,
    		timelineData,
    		renderedData,
    		data,
    		xRange,
    		yRange,
    		circleRange,
    		yScale,
    		xScale,
    		strokeLengthScale,
    		strokeWidthScale,
    		circleScale,
    		innerHeight,
    		paddingTop,
    		paddingBottom,
    		paddingRight,
    		paddingLeft,
    		div_elementresize_handler
    	];
    }

    class Chart extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance$5,
    			create_fragment$5,
    			safe_not_equal,
    			{
    				data: 4,
    				xRange: 5,
    				yRange: 6,
    				circleRange: 7
    			},
    			null,
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Chart",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*data*/ ctx[4] === undefined && !('data' in props)) {
    			console.warn("<Chart> was created without expected prop 'data'");
    		}

    		if (/*xRange*/ ctx[5] === undefined && !('xRange' in props)) {
    			console.warn("<Chart> was created without expected prop 'xRange'");
    		}

    		if (/*yRange*/ ctx[6] === undefined && !('yRange' in props)) {
    			console.warn("<Chart> was created without expected prop 'yRange'");
    		}

    		if (/*circleRange*/ ctx[7] === undefined && !('circleRange' in props)) {
    			console.warn("<Chart> was created without expected prop 'circleRange'");
    		}
    	}

    	get data() {
    		throw new Error("<Chart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<Chart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get xRange() {
    		throw new Error("<Chart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set xRange(value) {
    		throw new Error("<Chart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get yRange() {
    		throw new Error("<Chart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set yRange(value) {
    		throw new Error("<Chart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get circleRange() {
    		throw new Error("<Chart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set circleRange(value) {
    		throw new Error("<Chart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var movieColors = {
      // default colors are those for grand budapest hotel
      Default: {
        StrokeFilled: "#4f718d",
        Budget: "#e57291",
        BoxOff: "#edc1c2",
        StrokeEmpty: "#4f718d20",
        Timeline: "#603a47",
      },
      "Bottle Rocket": {
        Budget: "#a77520",
        BoxOff: "#f8d75c",
        StrokeFilled: "#010404",
        StrokeEmpty: "#01040415",
        Timeline: "#8e3d24",
      },
      Rushmore: {
        Budget: "#4675b9",
        BoxOff: "#9cc6e3",
        StrokeFilled: "#b30707",
        StrokeEmpty: "#b3070720",
        Timeline: "#000000",
      },
      "The Royal Tenenbaums": {
        Budget: "#7d2312",
        BoxOff: "#d98e5a",
        StrokeFilled: "#930201",
        StrokeEmpty: "#93020120",
        Timeline: "#64351c",
      },
      "The Life Aquatic with Steve Zissou": {
        Budget: "#004d57",
        BoxOff: "#66a0a7",
        StrokeFilled: "#7a6831",
        StrokeEmpty: "#7a683120",
        Timeline: "#000000",
      },
      "The Darjeeling Limited": {
        Budget: "#34664c",
        BoxOff: "#82ae99",
        StrokeFilled: "#958217",
        StrokeEmpty: "#95821720",
        Timeline: "#7a3f01",
      },
      "Fantastic Mr. Fox": {
        Budget: "#b5591c",
        BoxOff: "#eebe77",
        StrokeFilled: "#842b2e",
        StrokeEmpty: "#842b2e20",
        Timeline: "#7f4520",
      },
      "Moonrise Kingdom": {
        StrokeFilled: "#a37100",
        Budget: "#5c5a14",
        BoxOff: "#baa766",
        StrokeEmpty: "#a3710020",
        Timeline: "#874901",
      },
      "The Grand Budapest Hotel": {
        StrokeFilled: "#4f718d",
        Budget: "#e57291",
        BoxOff: "#edc1c2",
        StrokeEmpty: "#4f718d20",
        Timeline: "#603a47",
      },
      "Isle of Dogs": {
        Budget: "#941a18",
        BoxOff: "#ec3e3c",
        StrokeFilled: "#a8571f",
        StrokeEmpty: "#db732820",
        Timeline: "#100302",
      },
      "The French Dispatch": {
        Budget: "#F7c61f",
        BoxOff: "#F5e9c0",
        StrokeFilled: "#2f7070",
        StrokeEmpty: "#2f707020",
        Timeline: "#754d29",
      },
    };

    function draw(node, { delay = 0, speed, duration, easing = cubicInOut } = {}) {
        let len = node.getTotalLength();
        const style = getComputedStyle(node);
        if (style.strokeLinecap !== 'butt') {
            len += parseInt(style.strokeWidth);
        }
        if (duration === undefined) {
            if (speed === undefined) {
                duration = 800;
            }
            else {
                duration = len / speed;
            }
        }
        else if (typeof duration === 'function') {
            duration = duration(len);
        }
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `stroke-dasharray: ${t * len} ${u * len}`
        };
    }

    /* src/components/TimelineHorizontal.svelte generated by Svelte v3.49.0 */
    const file$4 = "src/components/TimelineHorizontal.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i].x;
    	child_ctx[11] = list[i].y;
    	child_ctx[12] = list[i].year;
    	child_ctx[14] = i;
    	return child_ctx;
    }

    // (63:0) {:else}
    function create_else_block$1(ctx) {
    	let path;
    	let path_stroke_value;

    	const block = {
    		c: function create() {
    			path = svg_element("path");
    			attr_dev(path, "class", "line svelte-des1j5");
    			attr_dev(path, "stroke", path_stroke_value = /*colorScheme*/ ctx[2].Timeline);
    			attr_dev(path, "d", /*linePath*/ ctx[6]);
    			add_location(path, file$4, 63, 2, 1699);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, path, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*colorScheme*/ 4 && path_stroke_value !== (path_stroke_value = /*colorScheme*/ ctx[2].Timeline)) {
    				attr_dev(path, "stroke", path_stroke_value);
    			}

    			if (dirty & /*linePath*/ 64) {
    				attr_dev(path, "d", /*linePath*/ ctx[6]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(path);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(63:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (50:0) {#if hoveredYear}
    function create_if_block_1(ctx) {
    	let path0;
    	let path0_stroke_value;
    	let path0_intro;
    	let t;
    	let path1;
    	let path1_stroke_value;
    	let path1_intro;

    	const block = {
    		c: function create() {
    			path0 = svg_element("path");
    			t = space();
    			path1 = svg_element("path");
    			attr_dev(path0, "class", "line svelte-des1j5");
    			attr_dev(path0, "stroke", path0_stroke_value = /*colorScheme*/ ctx[2].Timeline);
    			attr_dev(path0, "d", /*linePath1*/ ctx[5]);
    			add_location(path0, file$4, 50, 2, 1479);
    			attr_dev(path1, "class", "line svelte-des1j5");
    			attr_dev(path1, "stroke", path1_stroke_value = /*colorScheme*/ ctx[2].Timeline);
    			attr_dev(path1, "d", /*linePath2*/ ctx[4]);
    			add_location(path1, file$4, 56, 2, 1585);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, path0, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, path1, anchor);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*colorScheme*/ 4 && path0_stroke_value !== (path0_stroke_value = /*colorScheme*/ ctx[2].Timeline)) {
    				attr_dev(path0, "stroke", path0_stroke_value);
    			}

    			if (dirty & /*linePath1*/ 32) {
    				attr_dev(path0, "d", /*linePath1*/ ctx[5]);
    			}

    			if (dirty & /*colorScheme*/ 4 && path1_stroke_value !== (path1_stroke_value = /*colorScheme*/ ctx[2].Timeline)) {
    				attr_dev(path1, "stroke", path1_stroke_value);
    			}

    			if (dirty & /*linePath2*/ 16) {
    				attr_dev(path1, "d", /*linePath2*/ ctx[4]);
    			}
    		},
    		i: function intro(local) {
    			if (!path0_intro) {
    				add_render_callback(() => {
    					path0_intro = create_in_transition(path0, draw, /*tLinePath*/ ctx[8]);
    					path0_intro.start();
    				});
    			}

    			if (!path1_intro) {
    				add_render_callback(() => {
    					path1_intro = create_in_transition(path1, draw, /*tLinePath*/ ctx[8]);
    					path1_intro.start();
    				});
    			}
    		},
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(path0);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(path1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(50:0) {#if hoveredYear}",
    		ctx
    	});

    	return block;
    }

    // (67:2) {#if year % 10 === 0 && year !== 0 && idx !== 0}
    function create_if_block$2(ctx) {
    	let path;
    	let path_d_value;
    	let t0;
    	let text0;
    	let textPath0;
    	let t1_value = /*year*/ ctx[12] + "";
    	let t1;
    	let textPath0_startOffset_value;
    	let t2;
    	let text1;
    	let textPath1;
    	let t3_value = /*year*/ ctx[12] + "";
    	let t3;
    	let textPath1_startOffset_value;
    	let textPath1_fill_value;

    	const block = {
    		c: function create() {
    			path = svg_element("path");
    			t0 = space();
    			text0 = svg_element("text");
    			textPath0 = svg_element("textPath");
    			t1 = text(t1_value);
    			t2 = space();
    			text1 = svg_element("text");
    			textPath1 = svg_element("textPath");
    			t3 = text(t3_value);

    			attr_dev(path, "d", path_d_value = /*x*/ ctx[10] > /*width*/ ctx[1] / 2
    			? /*lineGenerator*/ ctx[7]([
    					/*timelineData*/ ctx[0][/*idx*/ ctx[14] + 1],
    					/*timelineData*/ ctx[0][/*idx*/ ctx[14]],
    					/*timelineData*/ ctx[0][/*idx*/ ctx[14] - 1],
    					/*timelineData*/ ctx[0][/*idx*/ ctx[14] - 2],
    					/*timelineData*/ ctx[0][/*idx*/ ctx[14] - 3]
    				])
    			: /*lineGenerator*/ ctx[7]([
    					/*timelineData*/ ctx[0][/*idx*/ ctx[14] - 3],
    					/*timelineData*/ ctx[0][/*idx*/ ctx[14] - 2],
    					/*timelineData*/ ctx[0][/*idx*/ ctx[14] - 1],
    					/*timelineData*/ ctx[0][/*idx*/ ctx[14]],
    					/*timelineData*/ ctx[0][/*idx*/ ctx[14] + 1]
    				]));

    			attr_dev(path, "id", `timeline${/*idx*/ ctx[14]}`);
    			attr_dev(path, "fill", "none");
    			add_location(path, file$4, 67, 4, 1869);
    			xlink_attr(textPath0, "xlink:href", `#timeline${/*idx*/ ctx[14]}`);
    			attr_dev(textPath0, "text-anchor", "middle");
    			attr_dev(textPath0, "startOffset", textPath0_startOffset_value = /*x*/ ctx[10] > /*width*/ ctx[1] / 2 ? "25%" : "75%");
    			attr_dev(textPath0, "stroke", "white");
    			attr_dev(textPath0, "fill", "white");
    			attr_dev(textPath0, "stroke-width", "5");
    			attr_dev(textPath0, "stroke-linejoin", "round");
    			add_location(textPath0, file$4, 87, 6, 2397);
    			attr_dev(text0, "dy", "-5");
    			add_location(text0, file$4, 86, 4, 2376);
    			xlink_attr(textPath1, "xlink:href", `#timeline${/*idx*/ ctx[14]}`);
    			attr_dev(textPath1, "text-anchor", "middle");
    			attr_dev(textPath1, "startOffset", textPath1_startOffset_value = /*x*/ ctx[10] > /*width*/ ctx[1] / 2 ? "25%" : "75%");
    			attr_dev(textPath1, "fill", textPath1_fill_value = /*colorScheme*/ ctx[2].Timeline);
    			add_location(textPath1, file$4, 98, 6, 2690);
    			attr_dev(text1, "dy", "-5");
    			add_location(text1, file$4, 97, 4, 2669);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, path, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, text0, anchor);
    			append_dev(text0, textPath0);
    			append_dev(textPath0, t1);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, text1, anchor);
    			append_dev(text1, textPath1);
    			append_dev(textPath1, t3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*timelineData, width*/ 3 && path_d_value !== (path_d_value = /*x*/ ctx[10] > /*width*/ ctx[1] / 2
    			? /*lineGenerator*/ ctx[7]([
    					/*timelineData*/ ctx[0][/*idx*/ ctx[14] + 1],
    					/*timelineData*/ ctx[0][/*idx*/ ctx[14]],
    					/*timelineData*/ ctx[0][/*idx*/ ctx[14] - 1],
    					/*timelineData*/ ctx[0][/*idx*/ ctx[14] - 2],
    					/*timelineData*/ ctx[0][/*idx*/ ctx[14] - 3]
    				])
    			: /*lineGenerator*/ ctx[7]([
    					/*timelineData*/ ctx[0][/*idx*/ ctx[14] - 3],
    					/*timelineData*/ ctx[0][/*idx*/ ctx[14] - 2],
    					/*timelineData*/ ctx[0][/*idx*/ ctx[14] - 1],
    					/*timelineData*/ ctx[0][/*idx*/ ctx[14]],
    					/*timelineData*/ ctx[0][/*idx*/ ctx[14] + 1]
    				]))) {
    				attr_dev(path, "d", path_d_value);
    			}

    			if (dirty & /*timelineData*/ 1 && t1_value !== (t1_value = /*year*/ ctx[12] + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*timelineData, width*/ 3 && textPath0_startOffset_value !== (textPath0_startOffset_value = /*x*/ ctx[10] > /*width*/ ctx[1] / 2 ? "25%" : "75%")) {
    				attr_dev(textPath0, "startOffset", textPath0_startOffset_value);
    			}

    			if (dirty & /*timelineData*/ 1 && t3_value !== (t3_value = /*year*/ ctx[12] + "")) set_data_dev(t3, t3_value);

    			if (dirty & /*timelineData, width*/ 3 && textPath1_startOffset_value !== (textPath1_startOffset_value = /*x*/ ctx[10] > /*width*/ ctx[1] / 2 ? "25%" : "75%")) {
    				attr_dev(textPath1, "startOffset", textPath1_startOffset_value);
    			}

    			if (dirty & /*colorScheme*/ 4 && textPath1_fill_value !== (textPath1_fill_value = /*colorScheme*/ ctx[2].Timeline)) {
    				attr_dev(textPath1, "fill", textPath1_fill_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(path);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(text0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(text1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(67:2) {#if year % 10 === 0 && year !== 0 && idx !== 0}",
    		ctx
    	});

    	return block;
    }

    // (66:0) {#each timelineData as { x, y, year }
    function create_each_block$2(ctx) {
    	let if_block_anchor;
    	let if_block = /*year*/ ctx[12] % 10 === 0 && /*year*/ ctx[12] !== 0 && /*idx*/ ctx[14] !== 0 && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*year*/ ctx[12] % 10 === 0 && /*year*/ ctx[12] !== 0 && /*idx*/ ctx[14] !== 0) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(66:0) {#each timelineData as { x, y, year }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let t;
    	let each_1_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*hoveredYear*/ ctx[3]) return create_if_block_1;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);
    	let each_value = /*timelineData*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			if_block.c();
    			t = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, t, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t.parentNode, t);
    				}
    			}

    			if (dirty & /*timelineData, width, colorScheme, lineGenerator*/ 135) {
    				each_value = /*timelineData*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: function intro(local) {
    			transition_in(if_block);
    		},
    		o: noop,
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(t);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let hoveredYearIndex;
    	let linePath;
    	let linePath1;
    	let linePath2;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('TimelineHorizontal', slots, []);
    	let { timelineData } = $$props;
    	let { width } = $$props;
    	let { colorScheme } = $$props;
    	let { hoveredYear } = $$props;
    	const lineGenerator = line().x(d => d.x).y(d => d.y).curve(curveBasis);
    	const tLinePath = tweened(null, { duration: 1500, easing: quintOut }); // interpolate: interpolatePath,
    	const writable_props = ['timelineData', 'width', 'colorScheme', 'hoveredYear'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<TimelineHorizontal> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('timelineData' in $$props) $$invalidate(0, timelineData = $$props.timelineData);
    		if ('width' in $$props) $$invalidate(1, width = $$props.width);
    		if ('colorScheme' in $$props) $$invalidate(2, colorScheme = $$props.colorScheme);
    		if ('hoveredYear' in $$props) $$invalidate(3, hoveredYear = $$props.hoveredYear);
    	};

    	$$self.$capture_state = () => ({
    		tweened,
    		cubicOut,
    		quintOut,
    		draw,
    		line,
    		curveBasis,
    		min: min$1,
    		max: max$1,
    		interpolatePath,
    		timelineData,
    		width,
    		colorScheme,
    		hoveredYear,
    		lineGenerator,
    		tLinePath,
    		hoveredYearIndex,
    		linePath2,
    		linePath1,
    		linePath
    	});

    	$$self.$inject_state = $$props => {
    		if ('timelineData' in $$props) $$invalidate(0, timelineData = $$props.timelineData);
    		if ('width' in $$props) $$invalidate(1, width = $$props.width);
    		if ('colorScheme' in $$props) $$invalidate(2, colorScheme = $$props.colorScheme);
    		if ('hoveredYear' in $$props) $$invalidate(3, hoveredYear = $$props.hoveredYear);
    		if ('hoveredYearIndex' in $$props) $$invalidate(9, hoveredYearIndex = $$props.hoveredYearIndex);
    		if ('linePath2' in $$props) $$invalidate(4, linePath2 = $$props.linePath2);
    		if ('linePath1' in $$props) $$invalidate(5, linePath1 = $$props.linePath1);
    		if ('linePath' in $$props) $$invalidate(6, linePath = $$props.linePath);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*timelineData, width*/ 3) {
    			for (let i = 0; i < timelineData.length - 1; i++) {
    				if (timelineData[i + 1].x === timelineData[i].x) {
    					timelineData.splice(i + 1, 0, {
    						year: 0,
    						x: timelineData[i].x > width / 2
    						? timelineData[i].x + 50
    						: timelineData[i].x - 50, //TODO: MAKE 50 DYNAMIC (?)
    						y: (timelineData[i].y + timelineData[i + 1].y) / 2
    					});
    				}
    			}
    		}

    		if ($$self.$$.dirty & /*timelineData, hoveredYear*/ 9) {
    			// create two line paths - for timeline data before/after the hovered year
    			// each will have its own transition upon hovering on a movie
    			$$invalidate(9, hoveredYearIndex = timelineData.findIndex(d => d.year === hoveredYear) + 1);
    		}

    		if ($$self.$$.dirty & /*timelineData*/ 1) {
    			$$invalidate(6, linePath = lineGenerator(timelineData));
    		}

    		if ($$self.$$.dirty & /*timelineData, hoveredYearIndex*/ 513) {
    			$$invalidate(5, linePath1 = lineGenerator(timelineData.slice(0, hoveredYearIndex).reverse()));
    		}

    		if ($$self.$$.dirty & /*timelineData, hoveredYearIndex*/ 513) {
    			$$invalidate(4, linePath2 = lineGenerator(timelineData.slice(-(timelineData.length - hoveredYearIndex + 1))));
    		}
    	};

    	return [
    		timelineData,
    		width,
    		colorScheme,
    		hoveredYear,
    		linePath2,
    		linePath1,
    		linePath,
    		lineGenerator,
    		tLinePath,
    		hoveredYearIndex
    	];
    }

    class TimelineHorizontal extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
    			timelineData: 0,
    			width: 1,
    			colorScheme: 2,
    			hoveredYear: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TimelineHorizontal",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*timelineData*/ ctx[0] === undefined && !('timelineData' in props)) {
    			console.warn("<TimelineHorizontal> was created without expected prop 'timelineData'");
    		}

    		if (/*width*/ ctx[1] === undefined && !('width' in props)) {
    			console.warn("<TimelineHorizontal> was created without expected prop 'width'");
    		}

    		if (/*colorScheme*/ ctx[2] === undefined && !('colorScheme' in props)) {
    			console.warn("<TimelineHorizontal> was created without expected prop 'colorScheme'");
    		}

    		if (/*hoveredYear*/ ctx[3] === undefined && !('hoveredYear' in props)) {
    			console.warn("<TimelineHorizontal> was created without expected prop 'hoveredYear'");
    		}
    	}

    	get timelineData() {
    		throw new Error("<TimelineHorizontal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set timelineData(value) {
    		throw new Error("<TimelineHorizontal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get width() {
    		throw new Error("<TimelineHorizontal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set width(value) {
    		throw new Error("<TimelineHorizontal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get colorScheme() {
    		throw new Error("<TimelineHorizontal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set colorScheme(value) {
    		throw new Error("<TimelineHorizontal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get hoveredYear() {
    		throw new Error("<TimelineHorizontal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set hoveredYear(value) {
    		throw new Error("<TimelineHorizontal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Description.svelte generated by Svelte v3.49.0 */

    const file$3 = "src/components/Description.svelte";

    function create_fragment$3(ctx) {
    	let div0;
    	let t0;
    	let br0;
    	let br1;
    	let t1;
    	let div1;
    	let t2;
    	let br2;
    	let t3;
    	let br3;
    	let t4;
    	let em0;
    	let t6;
    	let em1;
    	let t8;
    	let br4;
    	let t9;
    	let br5;
    	let t10;
    	let br6;
    	let t11;
    	let br7;
    	let t12;
    	let div2;
    	let br8;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = text("Wes Anderson: Many Hits, Few Misses");
    			br0 = element("br");
    			br1 = element("br");
    			t1 = space();
    			div1 = element("div");
    			t2 = text("Wes Anderson's masterful eye for crafting a scene is evident in all of his\n  movies. His style has become iconic, spawning instagram accounts, imitators,\n  articles, and in-depth analyses. ");
    			br2 = element("br");
    			t3 = space();
    			br3 = element("br");
    			t4 = text("\n  This timeline of his movies shows the reception of each - both critical (Rotten\n  Tomatoes score) and financial (box office vs. budget). On only two occasions did\n  his budget exceed the amount reaped from the box office - his first movie,\n  ");
    			em0 = element("em");
    			em0.textContent = "Bottle Rocket";
    			t6 = text(", and ");
    			em1 = element("em");
    			em1.textContent = "The Life Aquatic with Steve Zissou";
    			t8 = text(".\n  ");
    			br4 = element("br");
    			t9 = space();
    			br5 = element("br");
    			t10 = text(" This ode to the director also celebrates his skillful use of color.\n  Hover on a movie to see for yourself!\n  ");
    			br6 = element("br");
    			t11 = space();
    			br7 = element("br");
    			t12 = space();
    			div2 = element("div");
    			br8 = element("br");
    			add_location(br0, file$3, 0, 54, 54);
    			add_location(br1, file$3, 0, 60, 60);
    			attr_dev(div0, "class", "title svelte-c80o5a");
    			add_location(div0, file$3, 0, 0, 0);
    			add_location(br2, file$3, 4, 35, 283);
    			add_location(br3, file$3, 5, 2, 292);
    			add_location(em0, file$3, 9, 2, 543);
    			add_location(em1, file$3, 9, 30, 571);
    			add_location(br4, file$3, 10, 2, 618);
    			add_location(br5, file$3, 11, 2, 627);
    			add_location(br6, file$3, 13, 2, 744);
    			add_location(br7, file$3, 13, 9, 751);
    			attr_dev(div1, "class", "text svelte-c80o5a");
    			add_location(div1, file$3, 1, 0, 73);
    			add_location(br8, file$3, 15, 5, 770);
    			add_location(div2, file$3, 15, 0, 765);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, t0);
    			append_dev(div0, br0);
    			append_dev(div0, br1);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, t2);
    			append_dev(div1, br2);
    			append_dev(div1, t3);
    			append_dev(div1, br3);
    			append_dev(div1, t4);
    			append_dev(div1, em0);
    			append_dev(div1, t6);
    			append_dev(div1, em1);
    			append_dev(div1, t8);
    			append_dev(div1, br4);
    			append_dev(div1, t9);
    			append_dev(div1, br5);
    			append_dev(div1, t10);
    			append_dev(div1, br6);
    			append_dev(div1, t11);
    			append_dev(div1, br7);
    			insert_dev(target, t12, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, br8);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t12);
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Description', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Description> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Description extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Description",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/components/Legend.svelte generated by Svelte v3.49.0 */
    const file$2 = "src/components/Legend.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[23] = list[i];
    	child_ctx[25] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[23] = list[i];
    	child_ctx[25] = i;
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[23] = list[i];
    	child_ctx[25] = i;
    	return child_ctx;
    }

    // (196:4) {#each ratingArr25 as val, idx}
    function create_each_block_2(ctx) {
    	let line;
    	let line_x__value;
    	let line_y__value;
    	let line_x__value_1;
    	let line_y__value_1;
    	let line_stroke_value;
    	let line_stroke_width_value;

    	const block = {
    		c: function create() {
    			line = svg_element("line");
    			attr_dev(line, "x1", line_x__value = /*cx25*/ ctx[14] + (/*smallR*/ ctx[18] + /*padding*/ ctx[21]) * Math.cos(2 * Math.PI / /*strokeNum*/ ctx[20] * /*idx*/ ctx[25] - Math.PI / 2));
    			attr_dev(line, "y1", line_y__value = /*cy25*/ ctx[13] + (/*smallR*/ ctx[18] + /*padding*/ ctx[21]) * Math.sin(2 * Math.PI / /*strokeNum*/ ctx[20] * /*idx*/ ctx[25] - Math.PI / 2));
    			attr_dev(line, "x2", line_x__value_1 = /*cx25*/ ctx[14] + (/*smallR*/ ctx[18] + /*strokeLengthScale*/ ctx[3](/*circleScale*/ ctx[1].invert(/*smallR*/ ctx[18]))) * Math.cos(2 * Math.PI / /*strokeNum*/ ctx[20] * /*idx*/ ctx[25] - Math.PI / 2));
    			attr_dev(line, "y2", line_y__value_1 = /*cy25*/ ctx[13] + (/*smallR*/ ctx[18] + /*strokeLengthScale*/ ctx[3](/*circleScale*/ ctx[1].invert(/*smallR*/ ctx[18]))) * Math.sin(2 * Math.PI / /*strokeNum*/ ctx[20] * /*idx*/ ctx[25] - Math.PI / 2));

    			attr_dev(line, "stroke", line_stroke_value = /*val*/ ctx[23] === 1
    			? /*colorScheme*/ ctx[4].StrokeFilled
    			: /*colorScheme*/ ctx[4].StrokeEmpty);

    			attr_dev(line, "stroke-width", line_stroke_width_value = /*strokeWidthScale*/ ctx[2](/*circleScale*/ ctx[1].invert(/*smallR*/ ctx[18])));
    			attr_dev(line, "stroke-linecap", "round");
    			add_location(line, file$2, 196, 6, 5313);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, line, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*cx25*/ 16384 && line_x__value !== (line_x__value = /*cx25*/ ctx[14] + (/*smallR*/ ctx[18] + /*padding*/ ctx[21]) * Math.cos(2 * Math.PI / /*strokeNum*/ ctx[20] * /*idx*/ ctx[25] - Math.PI / 2))) {
    				attr_dev(line, "x1", line_x__value);
    			}

    			if (dirty & /*cy25*/ 8192 && line_y__value !== (line_y__value = /*cy25*/ ctx[13] + (/*smallR*/ ctx[18] + /*padding*/ ctx[21]) * Math.sin(2 * Math.PI / /*strokeNum*/ ctx[20] * /*idx*/ ctx[25] - Math.PI / 2))) {
    				attr_dev(line, "y1", line_y__value);
    			}

    			if (dirty & /*cx25, strokeLengthScale, circleScale*/ 16394 && line_x__value_1 !== (line_x__value_1 = /*cx25*/ ctx[14] + (/*smallR*/ ctx[18] + /*strokeLengthScale*/ ctx[3](/*circleScale*/ ctx[1].invert(/*smallR*/ ctx[18]))) * Math.cos(2 * Math.PI / /*strokeNum*/ ctx[20] * /*idx*/ ctx[25] - Math.PI / 2))) {
    				attr_dev(line, "x2", line_x__value_1);
    			}

    			if (dirty & /*cy25, strokeLengthScale, circleScale*/ 8202 && line_y__value_1 !== (line_y__value_1 = /*cy25*/ ctx[13] + (/*smallR*/ ctx[18] + /*strokeLengthScale*/ ctx[3](/*circleScale*/ ctx[1].invert(/*smallR*/ ctx[18]))) * Math.sin(2 * Math.PI / /*strokeNum*/ ctx[20] * /*idx*/ ctx[25] - Math.PI / 2))) {
    				attr_dev(line, "y2", line_y__value_1);
    			}

    			if (dirty & /*ratingArr25, colorScheme*/ 32784 && line_stroke_value !== (line_stroke_value = /*val*/ ctx[23] === 1
    			? /*colorScheme*/ ctx[4].StrokeFilled
    			: /*colorScheme*/ ctx[4].StrokeEmpty)) {
    				attr_dev(line, "stroke", line_stroke_value);
    			}

    			if (dirty & /*strokeWidthScale, circleScale*/ 6 && line_stroke_width_value !== (line_stroke_width_value = /*strokeWidthScale*/ ctx[2](/*circleScale*/ ctx[1].invert(/*smallR*/ ctx[18])))) {
    				attr_dev(line, "stroke-width", line_stroke_width_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(line);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(196:4) {#each ratingArr25 as val, idx}",
    		ctx
    	});

    	return block;
    }

    // (215:4) {#each ratingArr50 as val, idx}
    function create_each_block_1(ctx) {
    	let line;
    	let line_x__value;
    	let line_y__value;
    	let line_x__value_1;
    	let line_y__value_1;
    	let line_stroke_value;
    	let line_stroke_width_value;

    	const block = {
    		c: function create() {
    			line = svg_element("line");
    			attr_dev(line, "x1", line_x__value = /*cx50*/ ctx[11] + (/*smallR*/ ctx[18] + /*padding*/ ctx[21]) * Math.cos(2 * Math.PI / /*strokeNum*/ ctx[20] * /*idx*/ ctx[25] - Math.PI / 2));
    			attr_dev(line, "y1", line_y__value = /*cy50*/ ctx[10] + (/*smallR*/ ctx[18] + /*padding*/ ctx[21]) * Math.sin(2 * Math.PI / /*strokeNum*/ ctx[20] * /*idx*/ ctx[25] - Math.PI / 2));
    			attr_dev(line, "x2", line_x__value_1 = /*cx50*/ ctx[11] + (/*smallR*/ ctx[18] + /*strokeLengthScale*/ ctx[3](/*circleScale*/ ctx[1].invert(/*smallR*/ ctx[18]))) * Math.cos(2 * Math.PI / /*strokeNum*/ ctx[20] * /*idx*/ ctx[25] - Math.PI / 2));
    			attr_dev(line, "y2", line_y__value_1 = /*cy50*/ ctx[10] + (/*smallR*/ ctx[18] + /*strokeLengthScale*/ ctx[3](/*circleScale*/ ctx[1].invert(/*smallR*/ ctx[18]))) * Math.sin(2 * Math.PI / /*strokeNum*/ ctx[20] * /*idx*/ ctx[25] - Math.PI / 2));

    			attr_dev(line, "stroke", line_stroke_value = /*val*/ ctx[23] === 1
    			? /*colorScheme*/ ctx[4].StrokeFilled
    			: /*colorScheme*/ ctx[4].StrokeEmpty);

    			attr_dev(line, "stroke-width", line_stroke_width_value = /*strokeWidthScale*/ ctx[2](/*circleScale*/ ctx[1].invert(/*smallR*/ ctx[18])));
    			attr_dev(line, "stroke-linecap", "round");
    			add_location(line, file$2, 215, 6, 6121);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, line, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*cx50*/ 2048 && line_x__value !== (line_x__value = /*cx50*/ ctx[11] + (/*smallR*/ ctx[18] + /*padding*/ ctx[21]) * Math.cos(2 * Math.PI / /*strokeNum*/ ctx[20] * /*idx*/ ctx[25] - Math.PI / 2))) {
    				attr_dev(line, "x1", line_x__value);
    			}

    			if (dirty & /*cy50*/ 1024 && line_y__value !== (line_y__value = /*cy50*/ ctx[10] + (/*smallR*/ ctx[18] + /*padding*/ ctx[21]) * Math.sin(2 * Math.PI / /*strokeNum*/ ctx[20] * /*idx*/ ctx[25] - Math.PI / 2))) {
    				attr_dev(line, "y1", line_y__value);
    			}

    			if (dirty & /*cx50, strokeLengthScale, circleScale*/ 2058 && line_x__value_1 !== (line_x__value_1 = /*cx50*/ ctx[11] + (/*smallR*/ ctx[18] + /*strokeLengthScale*/ ctx[3](/*circleScale*/ ctx[1].invert(/*smallR*/ ctx[18]))) * Math.cos(2 * Math.PI / /*strokeNum*/ ctx[20] * /*idx*/ ctx[25] - Math.PI / 2))) {
    				attr_dev(line, "x2", line_x__value_1);
    			}

    			if (dirty & /*cy50, strokeLengthScale, circleScale*/ 1034 && line_y__value_1 !== (line_y__value_1 = /*cy50*/ ctx[10] + (/*smallR*/ ctx[18] + /*strokeLengthScale*/ ctx[3](/*circleScale*/ ctx[1].invert(/*smallR*/ ctx[18]))) * Math.sin(2 * Math.PI / /*strokeNum*/ ctx[20] * /*idx*/ ctx[25] - Math.PI / 2))) {
    				attr_dev(line, "y2", line_y__value_1);
    			}

    			if (dirty & /*ratingArr50, colorScheme*/ 4112 && line_stroke_value !== (line_stroke_value = /*val*/ ctx[23] === 1
    			? /*colorScheme*/ ctx[4].StrokeFilled
    			: /*colorScheme*/ ctx[4].StrokeEmpty)) {
    				attr_dev(line, "stroke", line_stroke_value);
    			}

    			if (dirty & /*strokeWidthScale, circleScale*/ 6 && line_stroke_width_value !== (line_stroke_width_value = /*strokeWidthScale*/ ctx[2](/*circleScale*/ ctx[1].invert(/*smallR*/ ctx[18])))) {
    				attr_dev(line, "stroke-width", line_stroke_width_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(line);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(215:4) {#each ratingArr50 as val, idx}",
    		ctx
    	});

    	return block;
    }

    // (234:4) {#each ratingArr75 as val, idx}
    function create_each_block$1(ctx) {
    	let line;
    	let line_x__value;
    	let line_y__value;
    	let line_x__value_1;
    	let line_y__value_1;
    	let line_stroke_value;
    	let line_stroke_width_value;

    	const block = {
    		c: function create() {
    			line = svg_element("line");
    			attr_dev(line, "x1", line_x__value = /*cx75*/ ctx[8] + (/*smallR*/ ctx[18] + /*padding*/ ctx[21]) * Math.cos(2 * Math.PI / /*strokeNum*/ ctx[20] * /*idx*/ ctx[25] - Math.PI / 2));
    			attr_dev(line, "y1", line_y__value = /*cy75*/ ctx[7] + (/*smallR*/ ctx[18] + /*padding*/ ctx[21]) * Math.sin(2 * Math.PI / /*strokeNum*/ ctx[20] * /*idx*/ ctx[25] - Math.PI / 2));
    			attr_dev(line, "x2", line_x__value_1 = /*cx75*/ ctx[8] + (/*smallR*/ ctx[18] + /*strokeLengthScale*/ ctx[3](/*circleScale*/ ctx[1].invert(/*smallR*/ ctx[18]))) * Math.cos(2 * Math.PI / /*strokeNum*/ ctx[20] * /*idx*/ ctx[25] - Math.PI / 2));
    			attr_dev(line, "y2", line_y__value_1 = /*cy75*/ ctx[7] + (/*smallR*/ ctx[18] + /*strokeLengthScale*/ ctx[3](/*circleScale*/ ctx[1].invert(/*smallR*/ ctx[18]))) * Math.sin(2 * Math.PI / /*strokeNum*/ ctx[20] * /*idx*/ ctx[25] - Math.PI / 2));

    			attr_dev(line, "stroke", line_stroke_value = /*val*/ ctx[23] === 1
    			? /*colorScheme*/ ctx[4].StrokeFilled
    			: /*colorScheme*/ ctx[4].StrokeEmpty);

    			attr_dev(line, "stroke-width", line_stroke_width_value = /*strokeWidthScale*/ ctx[2](/*circleScale*/ ctx[1].invert(/*smallR*/ ctx[18])));
    			attr_dev(line, "stroke-linecap", "round");
    			add_location(line, file$2, 234, 6, 6929);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, line, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*cx75*/ 256 && line_x__value !== (line_x__value = /*cx75*/ ctx[8] + (/*smallR*/ ctx[18] + /*padding*/ ctx[21]) * Math.cos(2 * Math.PI / /*strokeNum*/ ctx[20] * /*idx*/ ctx[25] - Math.PI / 2))) {
    				attr_dev(line, "x1", line_x__value);
    			}

    			if (dirty & /*cy75*/ 128 && line_y__value !== (line_y__value = /*cy75*/ ctx[7] + (/*smallR*/ ctx[18] + /*padding*/ ctx[21]) * Math.sin(2 * Math.PI / /*strokeNum*/ ctx[20] * /*idx*/ ctx[25] - Math.PI / 2))) {
    				attr_dev(line, "y1", line_y__value);
    			}

    			if (dirty & /*cx75, strokeLengthScale, circleScale*/ 266 && line_x__value_1 !== (line_x__value_1 = /*cx75*/ ctx[8] + (/*smallR*/ ctx[18] + /*strokeLengthScale*/ ctx[3](/*circleScale*/ ctx[1].invert(/*smallR*/ ctx[18]))) * Math.cos(2 * Math.PI / /*strokeNum*/ ctx[20] * /*idx*/ ctx[25] - Math.PI / 2))) {
    				attr_dev(line, "x2", line_x__value_1);
    			}

    			if (dirty & /*cy75, strokeLengthScale, circleScale*/ 138 && line_y__value_1 !== (line_y__value_1 = /*cy75*/ ctx[7] + (/*smallR*/ ctx[18] + /*strokeLengthScale*/ ctx[3](/*circleScale*/ ctx[1].invert(/*smallR*/ ctx[18]))) * Math.sin(2 * Math.PI / /*strokeNum*/ ctx[20] * /*idx*/ ctx[25] - Math.PI / 2))) {
    				attr_dev(line, "y2", line_y__value_1);
    			}

    			if (dirty & /*ratingArr75, colorScheme*/ 528 && line_stroke_value !== (line_stroke_value = /*val*/ ctx[23] === 1
    			? /*colorScheme*/ ctx[4].StrokeFilled
    			: /*colorScheme*/ ctx[4].StrokeEmpty)) {
    				attr_dev(line, "stroke", line_stroke_value);
    			}

    			if (dirty & /*strokeWidthScale, circleScale*/ 6 && line_stroke_width_value !== (line_stroke_width_value = /*strokeWidthScale*/ ctx[2](/*circleScale*/ ctx[1].invert(/*smallR*/ ctx[18])))) {
    				attr_dev(line, "stroke-width", line_stroke_width_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(line);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(234:4) {#each ratingArr75 as val, idx}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let svg;
    	let g0;
    	let circle0;
    	let circle0_cx_value;
    	let circle0_fill_value;
    	let circle1;
    	let circle1_cx_value;
    	let circle1_fill_value;
    	let circle2;
    	let circle2_cx_value;
    	let circle2_fill_value;
    	let circle3;
    	let circle3_cx_value;
    	let circle3_fill_value;
    	let g1;
    	let text0;
    	let t0;
    	let text0_x_value;
    	let text1;
    	let t1;
    	let text1_x_value;
    	let text2;
    	let t2;
    	let text2_x_value;
    	let text3;
    	let t3;
    	let text3_x_value;
    	let text4;
    	let t4;
    	let text4_x_value;
    	let text5;
    	let t5;
    	let text5_x_value;
    	let g2;
    	let line0;
    	let line0_x__value;
    	let line0_x__value_1;
    	let line1;
    	let line1_x__value;
    	let line1_x__value_1;
    	let line2;
    	let line2_x__value;
    	let line2_x__value_1;
    	let line3;
    	let line3_x__value;
    	let line3_x__value_1;
    	let g3;
    	let circle4;
    	let circle4_cx_value;
    	let circle4_cy_value;
    	let circle5;
    	let circle5_cx_value;
    	let circle5_cy_value;
    	let circle6;
    	let circle6_cx_value;
    	let circle6_cy_value;
    	let g4;
    	let line4;
    	let line4_x__value;
    	let line4_y__value;
    	let line4_x__value_1;
    	let line4_y__value_1;
    	let line5;
    	let line5_x__value;
    	let line5_y__value;
    	let line5_x__value_1;
    	let line5_y__value_1;
    	let line6;
    	let line6_x__value;
    	let line6_y__value;
    	let line6_x__value_1;
    	let line6_y__value_1;
    	let g5;
    	let text6;
    	let t6_value = format("$~s")(/*circleScale*/ ctx[1].invert(/*r3*/ ctx[5])) + "";
    	let t6;
    	let text6_x_value;
    	let text6_y_value;
    	let text7;
    	let t7_value = format("$~s")(/*circleScale*/ ctx[1].invert(/*r2*/ ctx[6])) + "";
    	let t7;
    	let text7_x_value;
    	let text7_y_value;
    	let text8;
    	let t8_value = format("$~s")(/*circleScale*/ ctx[1].invert(/*r1*/ ctx[16])) + "";
    	let t8;
    	let text8_x_value;
    	let text8_y_value;
    	let foreignObject;
    	let div;
    	let foreignObject_y_value;
    	let foreignObject_width_value;
    	let g6;
    	let each0_anchor;
    	let each1_anchor;
    	let g7;
    	let text9;
    	let t10;
    	let text9_x_value;
    	let text10;
    	let t11;
    	let text10_y_value;
    	let text11;
    	let t12;
    	let text11_x_value;
    	let svg_width_value;
    	let each_value_2 = /*ratingArr25*/ ctx[15];
    	validate_each_argument(each_value_2);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let each_value_1 = /*ratingArr50*/ ctx[12];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*ratingArr75*/ ctx[9];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g0 = svg_element("g");
    			circle0 = svg_element("circle");
    			circle1 = svg_element("circle");
    			circle2 = svg_element("circle");
    			circle3 = svg_element("circle");
    			g1 = svg_element("g");
    			text0 = svg_element("text");
    			t0 = text("Budget");
    			text1 = svg_element("text");
    			t1 = text("Box Office");
    			text2 = svg_element("text");
    			t2 = text("(is greater than)");
    			text3 = svg_element("text");
    			t3 = text("Box Office");
    			text4 = svg_element("text");
    			t4 = text("Budget");
    			text5 = svg_element("text");
    			t5 = text("(is greater than)");
    			g2 = svg_element("g");
    			line0 = svg_element("line");
    			line1 = svg_element("line");
    			line2 = svg_element("line");
    			line3 = svg_element("line");
    			g3 = svg_element("g");
    			circle4 = svg_element("circle");
    			circle5 = svg_element("circle");
    			circle6 = svg_element("circle");
    			g4 = svg_element("g");
    			line4 = svg_element("line");
    			line5 = svg_element("line");
    			line6 = svg_element("line");
    			g5 = svg_element("g");
    			text6 = svg_element("text");
    			t6 = text(t6_value);
    			text7 = svg_element("text");
    			t7 = text(t7_value);
    			text8 = svg_element("text");
    			t8 = text(t8_value);
    			foreignObject = svg_element("foreignObject");
    			div = element("div");
    			div.textContent = "Average of Rotten Tomatoes Audience & Critics Scores:";
    			g6 = svg_element("g");

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			each0_anchor = empty();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			each1_anchor = empty();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			g7 = svg_element("g");
    			text9 = svg_element("text");
    			t10 = text("25%");
    			text10 = svg_element("text");
    			t11 = text("50%");
    			text11 = svg_element("text");
    			t12 = text("75%");
    			attr_dev(circle0, "cx", circle0_cx_value = (/*paddingLeft*/ ctx[0] - 80) / 2 - /*bigR*/ ctx[17] * 2);
    			attr_dev(circle0, "cy", /*bigR*/ ctx[17] + /*smallR*/ ctx[18]);
    			attr_dev(circle0, "r", /*bigR*/ ctx[17]);
    			attr_dev(circle0, "fill", circle0_fill_value = /*colorScheme*/ ctx[4].Budget);
    			add_location(circle0, file$2, 39, 4, 1469);
    			attr_dev(circle1, "cx", circle1_cx_value = (/*paddingLeft*/ ctx[0] - 80) / 2 - /*bigR*/ ctx[17] * 2);
    			attr_dev(circle1, "cy", 2 * /*bigR*/ ctx[17]);
    			attr_dev(circle1, "r", /*smallR*/ ctx[18]);
    			attr_dev(circle1, "fill", circle1_fill_value = /*colorScheme*/ ctx[4].BoxOff);
    			add_location(circle1, file$2, 45, 4, 1605);
    			attr_dev(circle2, "cx", circle2_cx_value = (/*paddingLeft*/ ctx[0] - 80) / 2 + /*bigR*/ ctx[17] * 2);
    			attr_dev(circle2, "cy", /*bigR*/ ctx[17] + /*smallR*/ ctx[18]);
    			attr_dev(circle2, "r", /*bigR*/ ctx[17]);
    			attr_dev(circle2, "fill", circle2_fill_value = /*colorScheme*/ ctx[4].BoxOff);
    			add_location(circle2, file$2, 51, 4, 1738);
    			attr_dev(circle3, "cx", circle3_cx_value = (/*paddingLeft*/ ctx[0] - 80) / 2 + /*bigR*/ ctx[17] * 2);
    			attr_dev(circle3, "cy", 2 * /*bigR*/ ctx[17]);
    			attr_dev(circle3, "r", /*smallR*/ ctx[18]);
    			attr_dev(circle3, "fill", circle3_fill_value = /*colorScheme*/ ctx[4].Budget);
    			add_location(circle3, file$2, 57, 4, 1874);
    			add_location(g0, file$2, 38, 2, 1461);
    			attr_dev(text0, "x", text0_x_value = (/*paddingLeft*/ ctx[0] - 80) / 2 - /*bigR*/ ctx[17] * 3 - 20);
    			attr_dev(text0, "y", /*smallR*/ ctx[18] + 2);
    			attr_dev(text0, "text-anchor", "end");
    			attr_dev(text0, "font-size", "9");
    			add_location(text0, file$2, 66, 4, 2021);
    			attr_dev(text1, "x", text1_x_value = (/*paddingLeft*/ ctx[0] - 80) / 2 - /*bigR*/ ctx[17] * 3 - 20);
    			attr_dev(text1, "y", 2 * /*bigR*/ ctx[17] - /*smallR*/ ctx[18] + 2);
    			attr_dev(text1, "text-anchor", "end");
    			attr_dev(text1, "font-size", "9");
    			add_location(text1, file$2, 72, 4, 2164);
    			attr_dev(text2, "x", text2_x_value = (/*paddingLeft*/ ctx[0] - 80) / 2 - /*bigR*/ ctx[17] * 3 - 20);
    			attr_dev(text2, "y", (2 * /*bigR*/ ctx[17] + 4) / 2);
    			attr_dev(text2, "text-anchor", "end");
    			attr_dev(text2, "font-size", "8");
    			add_location(text2, file$2, 78, 4, 2322);
    			attr_dev(text3, "x", text3_x_value = (/*paddingLeft*/ ctx[0] - 80) / 2 + /*bigR*/ ctx[17] * 3 + 20);
    			attr_dev(text3, "y", /*smallR*/ ctx[18] + 2);
    			attr_dev(text3, "font-size", "9");
    			add_location(text3, file$2, 84, 4, 2484);
    			attr_dev(text4, "x", text4_x_value = (/*paddingLeft*/ ctx[0] - 80) / 2 + /*bigR*/ ctx[17] * 3 + 20);
    			attr_dev(text4, "y", 2 * /*bigR*/ ctx[17] - /*smallR*/ ctx[18] + 2);
    			attr_dev(text4, "font-size", "9");
    			add_location(text4, file$2, 89, 4, 2607);
    			attr_dev(text5, "x", text5_x_value = (/*paddingLeft*/ ctx[0] - 80) / 2 + /*bigR*/ ctx[17] * 3 + 20);
    			attr_dev(text5, "y", (2 * /*bigR*/ ctx[17] + 4) / 2);
    			attr_dev(text5, "font-size", "8");
    			add_location(text5, file$2, 94, 4, 2737);
    			add_location(g1, file$2, 65, 2, 2013);
    			attr_dev(line0, "x1", line0_x__value = (/*paddingLeft*/ ctx[0] - 80) / 2 - /*bigR*/ ctx[17] * 2);
    			attr_dev(line0, "y1", /*smallR*/ ctx[18]);
    			attr_dev(line0, "x2", line0_x__value_1 = (/*paddingLeft*/ ctx[0] - 80) / 2 - /*bigR*/ ctx[17] * 3 - 19);
    			attr_dev(line0, "y2", /*smallR*/ ctx[18]);
    			add_location(line0, file$2, 102, 4, 2903);
    			attr_dev(line1, "x1", line1_x__value = (/*paddingLeft*/ ctx[0] - 80) / 2 - /*bigR*/ ctx[17] * 2);
    			attr_dev(line1, "y1", 2 * /*bigR*/ ctx[17] - /*smallR*/ ctx[18]);
    			attr_dev(line1, "x2", line1_x__value_1 = (/*paddingLeft*/ ctx[0] - 80) / 2 - /*bigR*/ ctx[17] * 3 - 19);
    			attr_dev(line1, "y2", 2 * /*bigR*/ ctx[17] - /*smallR*/ ctx[18]);
    			add_location(line1, file$2, 108, 4, 3051);
    			attr_dev(line2, "x1", line2_x__value = (/*paddingLeft*/ ctx[0] - 80) / 2 + /*bigR*/ ctx[17] * 2);
    			attr_dev(line2, "y1", /*smallR*/ ctx[18]);
    			attr_dev(line2, "x2", line2_x__value_1 = (/*paddingLeft*/ ctx[0] - 80) / 2 + /*bigR*/ ctx[17] * 3 + 19);
    			attr_dev(line2, "y2", /*smallR*/ ctx[18]);
    			add_location(line2, file$2, 114, 4, 3221);
    			attr_dev(line3, "x1", line3_x__value = (/*paddingLeft*/ ctx[0] - 80) / 2 + /*bigR*/ ctx[17] * 2);
    			attr_dev(line3, "y1", 2 * /*bigR*/ ctx[17] - /*smallR*/ ctx[18]);
    			attr_dev(line3, "x2", line3_x__value_1 = (/*paddingLeft*/ ctx[0] - 80) / 2 + /*bigR*/ ctx[17] * 3 + 19);
    			attr_dev(line3, "y2", 2 * /*bigR*/ ctx[17] - /*smallR*/ ctx[18]);
    			add_location(line3, file$2, 120, 4, 3369);
    			attr_dev(g2, "class", "lines svelte-1k49nyr");
    			add_location(g2, file$2, 101, 2, 2881);
    			attr_dev(circle4, "cx", circle4_cx_value = (/*paddingLeft*/ ctx[0] - 80) / 2);
    			attr_dev(circle4, "cy", circle4_cy_value = /*smallR*/ ctx[18] + 2 * /*bigR*/ ctx[17] + 2 * /*r3*/ ctx[5]);
    			attr_dev(circle4, "r", /*r3*/ ctx[5]);
    			add_location(circle4, file$2, 128, 4, 3580);
    			attr_dev(circle5, "cx", circle5_cx_value = (/*paddingLeft*/ ctx[0] - 80) / 2);
    			attr_dev(circle5, "cy", circle5_cy_value = /*smallR*/ ctx[18] + 2 * /*bigR*/ ctx[17] + 2 * /*r3*/ ctx[5] - /*r2*/ ctx[6] + /*r3*/ ctx[5]);
    			attr_dev(circle5, "r", /*r2*/ ctx[6]);
    			add_location(circle5, file$2, 133, 4, 3684);
    			attr_dev(circle6, "cx", circle6_cx_value = (/*paddingLeft*/ ctx[0] - 80) / 2);
    			attr_dev(circle6, "cy", circle6_cy_value = /*smallR*/ ctx[18] + 2 * /*bigR*/ ctx[17] + 2 * /*r3*/ ctx[5] - /*r1*/ ctx[16] + /*r3*/ ctx[5]);
    			attr_dev(circle6, "r", /*r1*/ ctx[16]);
    			add_location(circle6, file$2, 138, 4, 3798);
    			attr_dev(g3, "class", "circles-size-legend svelte-1k49nyr");
    			add_location(g3, file$2, 127, 2, 3544);
    			attr_dev(line4, "x1", line4_x__value = (/*paddingLeft*/ ctx[0] - 80) / 2);
    			attr_dev(line4, "y1", line4_y__value = /*smallR*/ ctx[18] + 2 * /*bigR*/ ctx[17] + 2 * /*r3*/ ctx[5] - /*r3*/ ctx[5]);
    			attr_dev(line4, "x2", line4_x__value_1 = (/*paddingLeft*/ ctx[0] - 80) / 2 + /*r3*/ ctx[5] + 40);
    			attr_dev(line4, "y2", line4_y__value_1 = /*smallR*/ ctx[18] + 2 * /*bigR*/ ctx[17] + 2 * /*r3*/ ctx[5] - /*r3*/ ctx[5]);
    			add_location(line4, file$2, 146, 4, 3940);
    			attr_dev(line5, "x1", line5_x__value = (/*paddingLeft*/ ctx[0] - 80) / 2);
    			attr_dev(line5, "y1", line5_y__value = /*smallR*/ ctx[18] + 2 * /*bigR*/ ctx[17] + 2 * /*r3*/ ctx[5] - 2 * /*r2*/ ctx[6] + /*r3*/ ctx[5]);
    			attr_dev(line5, "x2", line5_x__value_1 = (/*paddingLeft*/ ctx[0] - 80) / 2 + /*r3*/ ctx[5] + 40);
    			attr_dev(line5, "y2", line5_y__value_1 = /*smallR*/ ctx[18] + 2 * /*bigR*/ ctx[17] + 2 * /*r3*/ ctx[5] - 2 * /*r2*/ ctx[6] + /*r3*/ ctx[5]);
    			add_location(line5, file$2, 152, 4, 4121);
    			attr_dev(line6, "x1", line6_x__value = (/*paddingLeft*/ ctx[0] - 80) / 2);
    			attr_dev(line6, "y1", line6_y__value = /*smallR*/ ctx[18] + 2 * /*bigR*/ ctx[17] + 2 * /*r3*/ ctx[5] - 2 * /*r1*/ ctx[16] + /*r3*/ ctx[5]);
    			attr_dev(line6, "x2", line6_x__value_1 = (/*paddingLeft*/ ctx[0] - 80) / 2 + /*r3*/ ctx[5] + 40);
    			attr_dev(line6, "y2", line6_y__value_1 = /*smallR*/ ctx[18] + 2 * /*bigR*/ ctx[17] + 2 * /*r3*/ ctx[5] - 2 * /*r1*/ ctx[16] + /*r3*/ ctx[5]);
    			add_location(line6, file$2, 158, 4, 4320);
    			attr_dev(g4, "class", "lines svelte-1k49nyr");
    			add_location(g4, file$2, 145, 2, 3918);
    			attr_dev(text6, "x", text6_x_value = (/*paddingLeft*/ ctx[0] - 80) / 2 + /*r3*/ ctx[5] + 40);
    			attr_dev(text6, "y", text6_y_value = /*smallR*/ ctx[18] + 2 * /*bigR*/ ctx[17] + 2 * /*r3*/ ctx[5] - /*r3*/ ctx[5] + 2);
    			add_location(text6, file$2, 167, 4, 4553);
    			attr_dev(text7, "x", text7_x_value = (/*paddingLeft*/ ctx[0] - 80) / 2 + /*r3*/ ctx[5] + 40);
    			attr_dev(text7, "y", text7_y_value = /*smallR*/ ctx[18] + 2 * /*bigR*/ ctx[17] + 2 * /*r3*/ ctx[5] - 2 * /*r2*/ ctx[6] + /*r3*/ ctx[5] + 2);
    			add_location(text7, file$2, 172, 4, 4711);
    			attr_dev(text8, "x", text8_x_value = (/*paddingLeft*/ ctx[0] - 80) / 2 + /*r3*/ ctx[5] + 40);
    			attr_dev(text8, "y", text8_y_value = /*smallR*/ ctx[18] + 2 * /*bigR*/ ctx[17] + 2 * /*r3*/ ctx[5] - 2 * /*r1*/ ctx[16] + /*r3*/ ctx[5] + 2);
    			add_location(text8, file$2, 177, 4, 4878);
    			attr_dev(g5, "class", "size-labels svelte-1k49nyr");
    			add_location(g5, file$2, 166, 2, 4525);
    			add_location(div, file$2, 191, 4, 5180);
    			attr_dev(foreignObject, "x", "0");
    			attr_dev(foreignObject, "y", foreignObject_y_value = /*cy25*/ ctx[13] - /*smallR*/ ctx[18] * 3.5);
    			attr_dev(foreignObject, "width", foreignObject_width_value = /*paddingLeft*/ ctx[0] - 80);
    			attr_dev(foreignObject, "height", "100%");
    			attr_dev(foreignObject, "font-size", "10px");
    			add_location(foreignObject, file$2, 184, 2, 5051);
    			add_location(g6, file$2, 194, 2, 5267);
    			attr_dev(text9, "x", text9_x_value = /*cx25*/ ctx[14] + /*smallR*/ ctx[18] + /*strokeLengthScale*/ ctx[3](/*circleScale*/ ctx[1].invert(/*smallR*/ ctx[18])) + /*padding*/ ctx[21]);
    			attr_dev(text9, "y", /*cy25*/ ctx[13]);
    			add_location(text9, file$2, 255, 4, 7733);
    			attr_dev(text10, "x", /*cx50*/ ctx[11]);
    			attr_dev(text10, "y", text10_y_value = /*cy50*/ ctx[10] + /*smallR*/ ctx[18] + /*strokeLengthScale*/ ctx[3](/*circleScale*/ ctx[1].invert(/*smallR*/ ctx[18])) + /*padding*/ ctx[21] * 3);
    			attr_dev(text10, "text-anchor", "middle");
    			add_location(text10, file$2, 262, 4, 7880);
    			attr_dev(text11, "x", text11_x_value = /*cx75*/ ctx[8] - /*smallR*/ ctx[18] - /*strokeLengthScale*/ ctx[3](/*circleScale*/ ctx[1].invert(/*smallR*/ ctx[18])) - /*padding*/ ctx[21]);
    			attr_dev(text11, "y", /*cy75*/ ctx[7]);
    			attr_dev(text11, "text-anchor", "end");
    			add_location(text11, file$2, 270, 4, 8058);
    			attr_dev(g7, "class", "size-labels svelte-1k49nyr");
    			add_location(g7, file$2, 254, 2, 7705);
    			attr_dev(svg, "width", svg_width_value = /*paddingLeft*/ ctx[0] - 80);
    			attr_dev(svg, "height", /*legendHeight*/ ctx[19]);
    			attr_dev(svg, "overflow", "visible");
    			add_location(svg, file$2, 37, 0, 1387);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g0);
    			append_dev(g0, circle0);
    			append_dev(g0, circle1);
    			append_dev(g0, circle2);
    			append_dev(g0, circle3);
    			append_dev(svg, g1);
    			append_dev(g1, text0);
    			append_dev(text0, t0);
    			append_dev(g1, text1);
    			append_dev(text1, t1);
    			append_dev(g1, text2);
    			append_dev(text2, t2);
    			append_dev(g1, text3);
    			append_dev(text3, t3);
    			append_dev(g1, text4);
    			append_dev(text4, t4);
    			append_dev(g1, text5);
    			append_dev(text5, t5);
    			append_dev(svg, g2);
    			append_dev(g2, line0);
    			append_dev(g2, line1);
    			append_dev(g2, line2);
    			append_dev(g2, line3);
    			append_dev(svg, g3);
    			append_dev(g3, circle4);
    			append_dev(g3, circle5);
    			append_dev(g3, circle6);
    			append_dev(svg, g4);
    			append_dev(g4, line4);
    			append_dev(g4, line5);
    			append_dev(g4, line6);
    			append_dev(svg, g5);
    			append_dev(g5, text6);
    			append_dev(text6, t6);
    			append_dev(g5, text7);
    			append_dev(text7, t7);
    			append_dev(g5, text8);
    			append_dev(text8, t8);
    			append_dev(svg, foreignObject);
    			append_dev(foreignObject, div);
    			append_dev(svg, g6);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].m(g6, null);
    			}

    			append_dev(g6, each0_anchor);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(g6, null);
    			}

    			append_dev(g6, each1_anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(g6, null);
    			}

    			append_dev(svg, g7);
    			append_dev(g7, text9);
    			append_dev(text9, t10);
    			append_dev(g7, text10);
    			append_dev(text10, t11);
    			append_dev(g7, text11);
    			append_dev(text11, t12);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*paddingLeft*/ 1 && circle0_cx_value !== (circle0_cx_value = (/*paddingLeft*/ ctx[0] - 80) / 2 - /*bigR*/ ctx[17] * 2)) {
    				attr_dev(circle0, "cx", circle0_cx_value);
    			}

    			if (dirty & /*colorScheme*/ 16 && circle0_fill_value !== (circle0_fill_value = /*colorScheme*/ ctx[4].Budget)) {
    				attr_dev(circle0, "fill", circle0_fill_value);
    			}

    			if (dirty & /*paddingLeft*/ 1 && circle1_cx_value !== (circle1_cx_value = (/*paddingLeft*/ ctx[0] - 80) / 2 - /*bigR*/ ctx[17] * 2)) {
    				attr_dev(circle1, "cx", circle1_cx_value);
    			}

    			if (dirty & /*colorScheme*/ 16 && circle1_fill_value !== (circle1_fill_value = /*colorScheme*/ ctx[4].BoxOff)) {
    				attr_dev(circle1, "fill", circle1_fill_value);
    			}

    			if (dirty & /*paddingLeft*/ 1 && circle2_cx_value !== (circle2_cx_value = (/*paddingLeft*/ ctx[0] - 80) / 2 + /*bigR*/ ctx[17] * 2)) {
    				attr_dev(circle2, "cx", circle2_cx_value);
    			}

    			if (dirty & /*colorScheme*/ 16 && circle2_fill_value !== (circle2_fill_value = /*colorScheme*/ ctx[4].BoxOff)) {
    				attr_dev(circle2, "fill", circle2_fill_value);
    			}

    			if (dirty & /*paddingLeft*/ 1 && circle3_cx_value !== (circle3_cx_value = (/*paddingLeft*/ ctx[0] - 80) / 2 + /*bigR*/ ctx[17] * 2)) {
    				attr_dev(circle3, "cx", circle3_cx_value);
    			}

    			if (dirty & /*colorScheme*/ 16 && circle3_fill_value !== (circle3_fill_value = /*colorScheme*/ ctx[4].Budget)) {
    				attr_dev(circle3, "fill", circle3_fill_value);
    			}

    			if (dirty & /*paddingLeft*/ 1 && text0_x_value !== (text0_x_value = (/*paddingLeft*/ ctx[0] - 80) / 2 - /*bigR*/ ctx[17] * 3 - 20)) {
    				attr_dev(text0, "x", text0_x_value);
    			}

    			if (dirty & /*paddingLeft*/ 1 && text1_x_value !== (text1_x_value = (/*paddingLeft*/ ctx[0] - 80) / 2 - /*bigR*/ ctx[17] * 3 - 20)) {
    				attr_dev(text1, "x", text1_x_value);
    			}

    			if (dirty & /*paddingLeft*/ 1 && text2_x_value !== (text2_x_value = (/*paddingLeft*/ ctx[0] - 80) / 2 - /*bigR*/ ctx[17] * 3 - 20)) {
    				attr_dev(text2, "x", text2_x_value);
    			}

    			if (dirty & /*paddingLeft*/ 1 && text3_x_value !== (text3_x_value = (/*paddingLeft*/ ctx[0] - 80) / 2 + /*bigR*/ ctx[17] * 3 + 20)) {
    				attr_dev(text3, "x", text3_x_value);
    			}

    			if (dirty & /*paddingLeft*/ 1 && text4_x_value !== (text4_x_value = (/*paddingLeft*/ ctx[0] - 80) / 2 + /*bigR*/ ctx[17] * 3 + 20)) {
    				attr_dev(text4, "x", text4_x_value);
    			}

    			if (dirty & /*paddingLeft*/ 1 && text5_x_value !== (text5_x_value = (/*paddingLeft*/ ctx[0] - 80) / 2 + /*bigR*/ ctx[17] * 3 + 20)) {
    				attr_dev(text5, "x", text5_x_value);
    			}

    			if (dirty & /*paddingLeft*/ 1 && line0_x__value !== (line0_x__value = (/*paddingLeft*/ ctx[0] - 80) / 2 - /*bigR*/ ctx[17] * 2)) {
    				attr_dev(line0, "x1", line0_x__value);
    			}

    			if (dirty & /*paddingLeft*/ 1 && line0_x__value_1 !== (line0_x__value_1 = (/*paddingLeft*/ ctx[0] - 80) / 2 - /*bigR*/ ctx[17] * 3 - 19)) {
    				attr_dev(line0, "x2", line0_x__value_1);
    			}

    			if (dirty & /*paddingLeft*/ 1 && line1_x__value !== (line1_x__value = (/*paddingLeft*/ ctx[0] - 80) / 2 - /*bigR*/ ctx[17] * 2)) {
    				attr_dev(line1, "x1", line1_x__value);
    			}

    			if (dirty & /*paddingLeft*/ 1 && line1_x__value_1 !== (line1_x__value_1 = (/*paddingLeft*/ ctx[0] - 80) / 2 - /*bigR*/ ctx[17] * 3 - 19)) {
    				attr_dev(line1, "x2", line1_x__value_1);
    			}

    			if (dirty & /*paddingLeft*/ 1 && line2_x__value !== (line2_x__value = (/*paddingLeft*/ ctx[0] - 80) / 2 + /*bigR*/ ctx[17] * 2)) {
    				attr_dev(line2, "x1", line2_x__value);
    			}

    			if (dirty & /*paddingLeft*/ 1 && line2_x__value_1 !== (line2_x__value_1 = (/*paddingLeft*/ ctx[0] - 80) / 2 + /*bigR*/ ctx[17] * 3 + 19)) {
    				attr_dev(line2, "x2", line2_x__value_1);
    			}

    			if (dirty & /*paddingLeft*/ 1 && line3_x__value !== (line3_x__value = (/*paddingLeft*/ ctx[0] - 80) / 2 + /*bigR*/ ctx[17] * 2)) {
    				attr_dev(line3, "x1", line3_x__value);
    			}

    			if (dirty & /*paddingLeft*/ 1 && line3_x__value_1 !== (line3_x__value_1 = (/*paddingLeft*/ ctx[0] - 80) / 2 + /*bigR*/ ctx[17] * 3 + 19)) {
    				attr_dev(line3, "x2", line3_x__value_1);
    			}

    			if (dirty & /*paddingLeft*/ 1 && circle4_cx_value !== (circle4_cx_value = (/*paddingLeft*/ ctx[0] - 80) / 2)) {
    				attr_dev(circle4, "cx", circle4_cx_value);
    			}

    			if (dirty & /*r3*/ 32 && circle4_cy_value !== (circle4_cy_value = /*smallR*/ ctx[18] + 2 * /*bigR*/ ctx[17] + 2 * /*r3*/ ctx[5])) {
    				attr_dev(circle4, "cy", circle4_cy_value);
    			}

    			if (dirty & /*r3*/ 32) {
    				attr_dev(circle4, "r", /*r3*/ ctx[5]);
    			}

    			if (dirty & /*paddingLeft*/ 1 && circle5_cx_value !== (circle5_cx_value = (/*paddingLeft*/ ctx[0] - 80) / 2)) {
    				attr_dev(circle5, "cx", circle5_cx_value);
    			}

    			if (dirty & /*r3, r2*/ 96 && circle5_cy_value !== (circle5_cy_value = /*smallR*/ ctx[18] + 2 * /*bigR*/ ctx[17] + 2 * /*r3*/ ctx[5] - /*r2*/ ctx[6] + /*r3*/ ctx[5])) {
    				attr_dev(circle5, "cy", circle5_cy_value);
    			}

    			if (dirty & /*r2*/ 64) {
    				attr_dev(circle5, "r", /*r2*/ ctx[6]);
    			}

    			if (dirty & /*paddingLeft*/ 1 && circle6_cx_value !== (circle6_cx_value = (/*paddingLeft*/ ctx[0] - 80) / 2)) {
    				attr_dev(circle6, "cx", circle6_cx_value);
    			}

    			if (dirty & /*r3, r1*/ 65568 && circle6_cy_value !== (circle6_cy_value = /*smallR*/ ctx[18] + 2 * /*bigR*/ ctx[17] + 2 * /*r3*/ ctx[5] - /*r1*/ ctx[16] + /*r3*/ ctx[5])) {
    				attr_dev(circle6, "cy", circle6_cy_value);
    			}

    			if (dirty & /*r1*/ 65536) {
    				attr_dev(circle6, "r", /*r1*/ ctx[16]);
    			}

    			if (dirty & /*paddingLeft*/ 1 && line4_x__value !== (line4_x__value = (/*paddingLeft*/ ctx[0] - 80) / 2)) {
    				attr_dev(line4, "x1", line4_x__value);
    			}

    			if (dirty & /*r3*/ 32 && line4_y__value !== (line4_y__value = /*smallR*/ ctx[18] + 2 * /*bigR*/ ctx[17] + 2 * /*r3*/ ctx[5] - /*r3*/ ctx[5])) {
    				attr_dev(line4, "y1", line4_y__value);
    			}

    			if (dirty & /*paddingLeft, r3*/ 33 && line4_x__value_1 !== (line4_x__value_1 = (/*paddingLeft*/ ctx[0] - 80) / 2 + /*r3*/ ctx[5] + 40)) {
    				attr_dev(line4, "x2", line4_x__value_1);
    			}

    			if (dirty & /*r3*/ 32 && line4_y__value_1 !== (line4_y__value_1 = /*smallR*/ ctx[18] + 2 * /*bigR*/ ctx[17] + 2 * /*r3*/ ctx[5] - /*r3*/ ctx[5])) {
    				attr_dev(line4, "y2", line4_y__value_1);
    			}

    			if (dirty & /*paddingLeft*/ 1 && line5_x__value !== (line5_x__value = (/*paddingLeft*/ ctx[0] - 80) / 2)) {
    				attr_dev(line5, "x1", line5_x__value);
    			}

    			if (dirty & /*r3, r2*/ 96 && line5_y__value !== (line5_y__value = /*smallR*/ ctx[18] + 2 * /*bigR*/ ctx[17] + 2 * /*r3*/ ctx[5] - 2 * /*r2*/ ctx[6] + /*r3*/ ctx[5])) {
    				attr_dev(line5, "y1", line5_y__value);
    			}

    			if (dirty & /*paddingLeft, r3*/ 33 && line5_x__value_1 !== (line5_x__value_1 = (/*paddingLeft*/ ctx[0] - 80) / 2 + /*r3*/ ctx[5] + 40)) {
    				attr_dev(line5, "x2", line5_x__value_1);
    			}

    			if (dirty & /*r3, r2*/ 96 && line5_y__value_1 !== (line5_y__value_1 = /*smallR*/ ctx[18] + 2 * /*bigR*/ ctx[17] + 2 * /*r3*/ ctx[5] - 2 * /*r2*/ ctx[6] + /*r3*/ ctx[5])) {
    				attr_dev(line5, "y2", line5_y__value_1);
    			}

    			if (dirty & /*paddingLeft*/ 1 && line6_x__value !== (line6_x__value = (/*paddingLeft*/ ctx[0] - 80) / 2)) {
    				attr_dev(line6, "x1", line6_x__value);
    			}

    			if (dirty & /*r3, r1*/ 65568 && line6_y__value !== (line6_y__value = /*smallR*/ ctx[18] + 2 * /*bigR*/ ctx[17] + 2 * /*r3*/ ctx[5] - 2 * /*r1*/ ctx[16] + /*r3*/ ctx[5])) {
    				attr_dev(line6, "y1", line6_y__value);
    			}

    			if (dirty & /*paddingLeft, r3*/ 33 && line6_x__value_1 !== (line6_x__value_1 = (/*paddingLeft*/ ctx[0] - 80) / 2 + /*r3*/ ctx[5] + 40)) {
    				attr_dev(line6, "x2", line6_x__value_1);
    			}

    			if (dirty & /*r3, r1*/ 65568 && line6_y__value_1 !== (line6_y__value_1 = /*smallR*/ ctx[18] + 2 * /*bigR*/ ctx[17] + 2 * /*r3*/ ctx[5] - 2 * /*r1*/ ctx[16] + /*r3*/ ctx[5])) {
    				attr_dev(line6, "y2", line6_y__value_1);
    			}

    			if (dirty & /*circleScale, r3*/ 34 && t6_value !== (t6_value = format("$~s")(/*circleScale*/ ctx[1].invert(/*r3*/ ctx[5])) + "")) set_data_dev(t6, t6_value);

    			if (dirty & /*paddingLeft, r3*/ 33 && text6_x_value !== (text6_x_value = (/*paddingLeft*/ ctx[0] - 80) / 2 + /*r3*/ ctx[5] + 40)) {
    				attr_dev(text6, "x", text6_x_value);
    			}

    			if (dirty & /*r3*/ 32 && text6_y_value !== (text6_y_value = /*smallR*/ ctx[18] + 2 * /*bigR*/ ctx[17] + 2 * /*r3*/ ctx[5] - /*r3*/ ctx[5] + 2)) {
    				attr_dev(text6, "y", text6_y_value);
    			}

    			if (dirty & /*circleScale, r2*/ 66 && t7_value !== (t7_value = format("$~s")(/*circleScale*/ ctx[1].invert(/*r2*/ ctx[6])) + "")) set_data_dev(t7, t7_value);

    			if (dirty & /*paddingLeft, r3*/ 33 && text7_x_value !== (text7_x_value = (/*paddingLeft*/ ctx[0] - 80) / 2 + /*r3*/ ctx[5] + 40)) {
    				attr_dev(text7, "x", text7_x_value);
    			}

    			if (dirty & /*r3, r2*/ 96 && text7_y_value !== (text7_y_value = /*smallR*/ ctx[18] + 2 * /*bigR*/ ctx[17] + 2 * /*r3*/ ctx[5] - 2 * /*r2*/ ctx[6] + /*r3*/ ctx[5] + 2)) {
    				attr_dev(text7, "y", text7_y_value);
    			}

    			if (dirty & /*circleScale, r1*/ 65538 && t8_value !== (t8_value = format("$~s")(/*circleScale*/ ctx[1].invert(/*r1*/ ctx[16])) + "")) set_data_dev(t8, t8_value);

    			if (dirty & /*paddingLeft, r3*/ 33 && text8_x_value !== (text8_x_value = (/*paddingLeft*/ ctx[0] - 80) / 2 + /*r3*/ ctx[5] + 40)) {
    				attr_dev(text8, "x", text8_x_value);
    			}

    			if (dirty & /*r3, r1*/ 65568 && text8_y_value !== (text8_y_value = /*smallR*/ ctx[18] + 2 * /*bigR*/ ctx[17] + 2 * /*r3*/ ctx[5] - 2 * /*r1*/ ctx[16] + /*r3*/ ctx[5] + 2)) {
    				attr_dev(text8, "y", text8_y_value);
    			}

    			if (dirty & /*cy25*/ 8192 && foreignObject_y_value !== (foreignObject_y_value = /*cy25*/ ctx[13] - /*smallR*/ ctx[18] * 3.5)) {
    				attr_dev(foreignObject, "y", foreignObject_y_value);
    			}

    			if (dirty & /*paddingLeft*/ 1 && foreignObject_width_value !== (foreignObject_width_value = /*paddingLeft*/ ctx[0] - 80)) {
    				attr_dev(foreignObject, "width", foreignObject_width_value);
    			}

    			if (dirty & /*cx25, smallR, padding, Math, strokeNum, cy25, strokeLengthScale, circleScale, ratingArr25, colorScheme, strokeWidthScale*/ 3465246) {
    				each_value_2 = /*ratingArr25*/ ctx[15];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_2[i] = create_each_block_2(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(g6, each0_anchor);
    					}
    				}

    				for (; i < each_blocks_2.length; i += 1) {
    					each_blocks_2[i].d(1);
    				}

    				each_blocks_2.length = each_value_2.length;
    			}

    			if (dirty & /*cx50, smallR, padding, Math, strokeNum, cy50, strokeLengthScale, circleScale, ratingArr50, colorScheme, strokeWidthScale*/ 3415070) {
    				each_value_1 = /*ratingArr50*/ ctx[12];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(g6, each1_anchor);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty & /*cx75, smallR, padding, Math, strokeNum, cy75, strokeLengthScale, circleScale, ratingArr75, colorScheme, strokeWidthScale*/ 3408798) {
    				each_value = /*ratingArr75*/ ctx[9];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(g6, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*cx25, strokeLengthScale, circleScale*/ 16394 && text9_x_value !== (text9_x_value = /*cx25*/ ctx[14] + /*smallR*/ ctx[18] + /*strokeLengthScale*/ ctx[3](/*circleScale*/ ctx[1].invert(/*smallR*/ ctx[18])) + /*padding*/ ctx[21])) {
    				attr_dev(text9, "x", text9_x_value);
    			}

    			if (dirty & /*cy25*/ 8192) {
    				attr_dev(text9, "y", /*cy25*/ ctx[13]);
    			}

    			if (dirty & /*cx50*/ 2048) {
    				attr_dev(text10, "x", /*cx50*/ ctx[11]);
    			}

    			if (dirty & /*cy50, strokeLengthScale, circleScale*/ 1034 && text10_y_value !== (text10_y_value = /*cy50*/ ctx[10] + /*smallR*/ ctx[18] + /*strokeLengthScale*/ ctx[3](/*circleScale*/ ctx[1].invert(/*smallR*/ ctx[18])) + /*padding*/ ctx[21] * 3)) {
    				attr_dev(text10, "y", text10_y_value);
    			}

    			if (dirty & /*cx75, strokeLengthScale, circleScale*/ 266 && text11_x_value !== (text11_x_value = /*cx75*/ ctx[8] - /*smallR*/ ctx[18] - /*strokeLengthScale*/ ctx[3](/*circleScale*/ ctx[1].invert(/*smallR*/ ctx[18])) - /*padding*/ ctx[21])) {
    				attr_dev(text11, "x", text11_x_value);
    			}

    			if (dirty & /*cy75*/ 128) {
    				attr_dev(text11, "y", /*cy75*/ ctx[7]);
    			}

    			if (dirty & /*paddingLeft*/ 1 && svg_width_value !== (svg_width_value = /*paddingLeft*/ ctx[0] - 80)) {
    				attr_dev(svg, "width", svg_width_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    			destroy_each(each_blocks_2, detaching);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let r2;
    	let r1;
    	let r3;
    	let ratingArr25;
    	let cx25;
    	let cy25;
    	let ratingArr50;
    	let cx50;
    	let cy50;
    	let ratingArr75;
    	let cx75;
    	let cy75;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Legend', slots, []);
    	let { paddingLeft } = $$props;
    	let { circleScale } = $$props;
    	let { strokeWidthScale } = $$props;
    	let { strokeLengthScale } = $$props;
    	let { colorScheme } = $$props;
    	let bigR = 23;
    	let smallR = 11;
    	let legendHeight = 280;
    	let niceDomain = circleScale.nice().domain();
    	let strokeNum = 40;
    	let padding = 4;

    	const writable_props = [
    		'paddingLeft',
    		'circleScale',
    		'strokeWidthScale',
    		'strokeLengthScale',
    		'colorScheme'
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Legend> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('paddingLeft' in $$props) $$invalidate(0, paddingLeft = $$props.paddingLeft);
    		if ('circleScale' in $$props) $$invalidate(1, circleScale = $$props.circleScale);
    		if ('strokeWidthScale' in $$props) $$invalidate(2, strokeWidthScale = $$props.strokeWidthScale);
    		if ('strokeLengthScale' in $$props) $$invalidate(3, strokeLengthScale = $$props.strokeLengthScale);
    		if ('colorScheme' in $$props) $$invalidate(4, colorScheme = $$props.colorScheme);
    	};

    	$$self.$capture_state = () => ({
    		format,
    		paddingLeft,
    		circleScale,
    		strokeWidthScale,
    		strokeLengthScale,
    		colorScheme,
    		bigR,
    		smallR,
    		legendHeight,
    		niceDomain,
    		strokeNum,
    		padding,
    		r3,
    		cy75,
    		cx75,
    		ratingArr75,
    		cy50,
    		cx50,
    		ratingArr50,
    		cy25,
    		cx25,
    		ratingArr25,
    		r2,
    		r1
    	});

    	$$self.$inject_state = $$props => {
    		if ('paddingLeft' in $$props) $$invalidate(0, paddingLeft = $$props.paddingLeft);
    		if ('circleScale' in $$props) $$invalidate(1, circleScale = $$props.circleScale);
    		if ('strokeWidthScale' in $$props) $$invalidate(2, strokeWidthScale = $$props.strokeWidthScale);
    		if ('strokeLengthScale' in $$props) $$invalidate(3, strokeLengthScale = $$props.strokeLengthScale);
    		if ('colorScheme' in $$props) $$invalidate(4, colorScheme = $$props.colorScheme);
    		if ('bigR' in $$props) $$invalidate(17, bigR = $$props.bigR);
    		if ('smallR' in $$props) $$invalidate(18, smallR = $$props.smallR);
    		if ('legendHeight' in $$props) $$invalidate(19, legendHeight = $$props.legendHeight);
    		if ('niceDomain' in $$props) $$invalidate(22, niceDomain = $$props.niceDomain);
    		if ('strokeNum' in $$props) $$invalidate(20, strokeNum = $$props.strokeNum);
    		if ('padding' in $$props) $$invalidate(21, padding = $$props.padding);
    		if ('r3' in $$props) $$invalidate(5, r3 = $$props.r3);
    		if ('cy75' in $$props) $$invalidate(7, cy75 = $$props.cy75);
    		if ('cx75' in $$props) $$invalidate(8, cx75 = $$props.cx75);
    		if ('ratingArr75' in $$props) $$invalidate(9, ratingArr75 = $$props.ratingArr75);
    		if ('cy50' in $$props) $$invalidate(10, cy50 = $$props.cy50);
    		if ('cx50' in $$props) $$invalidate(11, cx50 = $$props.cx50);
    		if ('ratingArr50' in $$props) $$invalidate(12, ratingArr50 = $$props.ratingArr50);
    		if ('cy25' in $$props) $$invalidate(13, cy25 = $$props.cy25);
    		if ('cx25' in $$props) $$invalidate(14, cx25 = $$props.cx25);
    		if ('ratingArr25' in $$props) $$invalidate(15, ratingArr25 = $$props.ratingArr25);
    		if ('r2' in $$props) $$invalidate(6, r2 = $$props.r2);
    		if ('r1' in $$props) $$invalidate(16, r1 = $$props.r1);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*circleScale*/ 2) {
    			$$invalidate(6, r2 = circleScale(Math.round((niceDomain[1] + niceDomain[0]) / 2)));
    		}

    		if ($$self.$$.dirty & /*circleScale, r2*/ 66) {
    			$$invalidate(16, r1 = circleScale(Math.round((niceDomain[0] + circleScale.invert(r2)) / 2)));
    		}

    		if ($$self.$$.dirty & /*circleScale, r2*/ 66) {
    			$$invalidate(5, r3 = circleScale(Math.round((niceDomain[1] + circleScale.invert(r2)) / 2)));
    		}

    		if ($$self.$$.dirty & /*paddingLeft*/ 1) {
    			$$invalidate(14, cx25 = (paddingLeft - 80) * 0.25); //+ smallR * 2;
    		}

    		if ($$self.$$.dirty & /*r3*/ 32) {
    			$$invalidate(13, cy25 = smallR + 2 * bigR + 2 * r3 + r3 + 70);
    		}

    		if ($$self.$$.dirty & /*paddingLeft*/ 1) {
    			$$invalidate(11, cx50 = (paddingLeft - 80) * 0.5); //+ smallR * 2;
    		}

    		if ($$self.$$.dirty & /*r3*/ 32) {
    			$$invalidate(10, cy50 = smallR + 2 * bigR + 2 * r3 + r3 + 70);
    		}

    		if ($$self.$$.dirty & /*paddingLeft*/ 1) {
    			$$invalidate(8, cx75 = (paddingLeft - 80) * 0.75); //* 2; //+ smallR * 10;
    		}

    		if ($$self.$$.dirty & /*r3*/ 32) {
    			$$invalidate(7, cy75 = smallR + 2 * bigR + 2 * r3 + r3 + 70);
    		}
    	};

    	$$invalidate(15, ratingArr25 = [...Array(Math.round(25 / 100 * strokeNum)).fill(1)].concat([...Array(strokeNum - Math.round(25 / 100 * strokeNum)).fill(0)]));
    	$$invalidate(12, ratingArr50 = [...Array(Math.round(50 / 100 * strokeNum)).fill(1)].concat([...Array(strokeNum - Math.round(50 / 100 * strokeNum)).fill(0)]));
    	$$invalidate(9, ratingArr75 = [...Array(Math.round(75 / 100 * strokeNum)).fill(1)].concat([...Array(strokeNum - Math.round(75 / 100 * strokeNum)).fill(0)]));

    	return [
    		paddingLeft,
    		circleScale,
    		strokeWidthScale,
    		strokeLengthScale,
    		colorScheme,
    		r3,
    		r2,
    		cy75,
    		cx75,
    		ratingArr75,
    		cy50,
    		cx50,
    		ratingArr50,
    		cy25,
    		cx25,
    		ratingArr25,
    		r1,
    		bigR,
    		smallR,
    		legendHeight,
    		strokeNum,
    		padding
    	];
    }

    class Legend extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			paddingLeft: 0,
    			circleScale: 1,
    			strokeWidthScale: 2,
    			strokeLengthScale: 3,
    			colorScheme: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Legend",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*paddingLeft*/ ctx[0] === undefined && !('paddingLeft' in props)) {
    			console.warn("<Legend> was created without expected prop 'paddingLeft'");
    		}

    		if (/*circleScale*/ ctx[1] === undefined && !('circleScale' in props)) {
    			console.warn("<Legend> was created without expected prop 'circleScale'");
    		}

    		if (/*strokeWidthScale*/ ctx[2] === undefined && !('strokeWidthScale' in props)) {
    			console.warn("<Legend> was created without expected prop 'strokeWidthScale'");
    		}

    		if (/*strokeLengthScale*/ ctx[3] === undefined && !('strokeLengthScale' in props)) {
    			console.warn("<Legend> was created without expected prop 'strokeLengthScale'");
    		}

    		if (/*colorScheme*/ ctx[4] === undefined && !('colorScheme' in props)) {
    			console.warn("<Legend> was created without expected prop 'colorScheme'");
    		}
    	}

    	get paddingLeft() {
    		throw new Error("<Legend>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set paddingLeft(value) {
    		throw new Error("<Legend>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get circleScale() {
    		throw new Error("<Legend>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set circleScale(value) {
    		throw new Error("<Legend>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get strokeWidthScale() {
    		throw new Error("<Legend>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set strokeWidthScale(value) {
    		throw new Error("<Legend>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get strokeLengthScale() {
    		throw new Error("<Legend>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set strokeLengthScale(value) {
    		throw new Error("<Legend>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get colorScheme() {
    		throw new Error("<Legend>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set colorScheme(value) {
    		throw new Error("<Legend>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/ChartHorizontal.svelte generated by Svelte v3.49.0 */
    const file$1 = "src/components/ChartHorizontal.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[32] = list[i].movie;
    	child_ctx[33] = list[i].x;
    	child_ctx[34] = list[i].y;
    	child_ctx[35] = list[i].budget;
    	child_ctx[36] = list[i].boxoffice;
    	child_ctx[37] = list[i].rating;
    	child_ctx[38] = list[i].strokeWidth;
    	child_ctx[39] = list[i].strokeLength;
    	child_ctx[40] = list[i].year;
    	return child_ctx;
    }

    // (118:2) {#if width && height}
    function create_if_block$1(ctx) {
    	let svg;
    	let foreignObject;
    	let description;
    	let legend;
    	let foreignObject_width_value;
    	let timelinehorizontal;
    	let current;
    	description = new Description({ $$inline: true });

    	legend = new Legend({
    			props: {
    				paddingLeft: /*paddingLeft*/ ctx[7],
    				circleScale: /*circleScale*/ ctx[6],
    				strokeWidthScale: /*strokeWidthScale*/ ctx[5],
    				strokeLengthScale: /*strokeLengthScale*/ ctx[4],
    				colorScheme: /*colorScheme*/ ctx[10]
    			},
    			$$inline: true
    		});

    	timelinehorizontal = new TimelineHorizontal({
    			props: {
    				timelineData: /*timelineData*/ ctx[9],
    				height: /*height*/ ctx[2],
    				width: /*width*/ ctx[1],
    				colorScheme: /*colorScheme*/ ctx[10],
    				hoveredYear: /*hoveredYear*/ ctx[8]
    			},
    			$$inline: true
    		});

    	let each_value = /*renderedData*/ ctx[3];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			foreignObject = svg_element("foreignObject");
    			create_component(description.$$.fragment);
    			create_component(legend.$$.fragment);
    			create_component(timelinehorizontal.$$.fragment);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(foreignObject, "x", "10");
    			attr_dev(foreignObject, "y", "10");
    			attr_dev(foreignObject, "width", foreignObject_width_value = /*paddingLeft*/ ctx[7] - 80);
    			attr_dev(foreignObject, "height", /*height*/ ctx[2]);
    			attr_dev(foreignObject, "class", "left-menu svelte-d3k7cc");
    			add_location(foreignObject, file$1, 120, 6, 4290);
    			attr_dev(svg, "width", /*width*/ ctx[1]);
    			attr_dev(svg, "height", /*height*/ ctx[2]);
    			attr_dev(svg, "class", "svelte-d3k7cc");
    			add_location(svg, file$1, 118, 4, 4155);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, foreignObject);
    			mount_component(description, foreignObject, null);
    			mount_component(legend, foreignObject, null);
    			mount_component(timelinehorizontal, svg, null);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(svg, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const legend_changes = {};
    			if (dirty[0] & /*paddingLeft*/ 128) legend_changes.paddingLeft = /*paddingLeft*/ ctx[7];
    			if (dirty[0] & /*circleScale*/ 64) legend_changes.circleScale = /*circleScale*/ ctx[6];
    			if (dirty[0] & /*strokeWidthScale*/ 32) legend_changes.strokeWidthScale = /*strokeWidthScale*/ ctx[5];
    			if (dirty[0] & /*strokeLengthScale*/ 16) legend_changes.strokeLengthScale = /*strokeLengthScale*/ ctx[4];
    			if (dirty[0] & /*colorScheme*/ 1024) legend_changes.colorScheme = /*colorScheme*/ ctx[10];
    			legend.$set(legend_changes);

    			if (!current || dirty[0] & /*paddingLeft*/ 128 && foreignObject_width_value !== (foreignObject_width_value = /*paddingLeft*/ ctx[7] - 80)) {
    				attr_dev(foreignObject, "width", foreignObject_width_value);
    			}

    			if (!current || dirty[0] & /*height*/ 4) {
    				attr_dev(foreignObject, "height", /*height*/ ctx[2]);
    			}

    			const timelinehorizontal_changes = {};
    			if (dirty[0] & /*timelineData*/ 512) timelinehorizontal_changes.timelineData = /*timelineData*/ ctx[9];
    			if (dirty[0] & /*height*/ 4) timelinehorizontal_changes.height = /*height*/ ctx[2];
    			if (dirty[0] & /*width*/ 2) timelinehorizontal_changes.width = /*width*/ ctx[1];
    			if (dirty[0] & /*colorScheme*/ 1024) timelinehorizontal_changes.colorScheme = /*colorScheme*/ ctx[10];
    			if (dirty[0] & /*hoveredYear*/ 256) timelinehorizontal_changes.hoveredYear = /*hoveredYear*/ ctx[8];
    			timelinehorizontal.$set(timelinehorizontal_changes);

    			if (dirty[0] & /*renderedData, minYear, maxYear, colorScheme, state*/ 7177) {
    				each_value = /*renderedData*/ ctx[3];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(svg, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (!current || dirty[0] & /*width*/ 2) {
    				attr_dev(svg, "width", /*width*/ ctx[1]);
    			}

    			if (!current || dirty[0] & /*height*/ 4) {
    				attr_dev(svg, "height", /*height*/ ctx[2]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(description.$$.fragment, local);
    			transition_in(legend.$$.fragment, local);
    			transition_in(timelinehorizontal.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(description.$$.fragment, local);
    			transition_out(legend.$$.fragment, local);
    			transition_out(timelinehorizontal.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    			destroy_component(description);
    			destroy_component(legend);
    			destroy_component(timelinehorizontal);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(118:2) {#if width && height}",
    		ctx
    	});

    	return block;
    }

    // (144:6) {#each renderedData as { movie, x, y, budget, boxoffice, rating, strokeWidth, strokeLength, year }}
    function create_each_block(ctx) {
    	let bubble_1;
    	let updating_state;
    	let current;

    	function bubble_1_state_binding(value) {
    		/*bubble_1_state_binding*/ ctx[26](value);
    	}

    	let bubble_1_props = {
    		movie: /*movie*/ ctx[32],
    		x: /*x*/ ctx[33],
    		y: /*y*/ ctx[34],
    		budget: /*budget*/ ctx[35],
    		boxoffice: /*boxoffice*/ ctx[36],
    		rating: /*rating*/ ctx[37],
    		strokeWidth: /*strokeWidth*/ ctx[38],
    		strokeLength: /*strokeLength*/ ctx[39],
    		year: /*year*/ ctx[40],
    		minYear: /*minYear*/ ctx[11],
    		maxYear: /*maxYear*/ ctx[12],
    		colorScheme: /*colorScheme*/ ctx[10]
    	};

    	if (/*state*/ ctx[0] !== void 0) {
    		bubble_1_props.state = /*state*/ ctx[0];
    	}

    	bubble_1 = new Bubble({ props: bubble_1_props, $$inline: true });
    	binding_callbacks.push(() => bind(bubble_1, 'state', bubble_1_state_binding));

    	const block = {
    		c: function create() {
    			create_component(bubble_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(bubble_1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const bubble_1_changes = {};
    			if (dirty[0] & /*renderedData*/ 8) bubble_1_changes.movie = /*movie*/ ctx[32];
    			if (dirty[0] & /*renderedData*/ 8) bubble_1_changes.x = /*x*/ ctx[33];
    			if (dirty[0] & /*renderedData*/ 8) bubble_1_changes.y = /*y*/ ctx[34];
    			if (dirty[0] & /*renderedData*/ 8) bubble_1_changes.budget = /*budget*/ ctx[35];
    			if (dirty[0] & /*renderedData*/ 8) bubble_1_changes.boxoffice = /*boxoffice*/ ctx[36];
    			if (dirty[0] & /*renderedData*/ 8) bubble_1_changes.rating = /*rating*/ ctx[37];
    			if (dirty[0] & /*renderedData*/ 8) bubble_1_changes.strokeWidth = /*strokeWidth*/ ctx[38];
    			if (dirty[0] & /*renderedData*/ 8) bubble_1_changes.strokeLength = /*strokeLength*/ ctx[39];
    			if (dirty[0] & /*renderedData*/ 8) bubble_1_changes.year = /*year*/ ctx[40];
    			if (dirty[0] & /*colorScheme*/ 1024) bubble_1_changes.colorScheme = /*colorScheme*/ ctx[10];

    			if (!updating_state && dirty[0] & /*state*/ 1) {
    				updating_state = true;
    				bubble_1_changes.state = /*state*/ ctx[0];
    				add_flush_callback(() => updating_state = false);
    			}

    			bubble_1.$set(bubble_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(bubble_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(bubble_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(bubble_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(144:6) {#each renderedData as { movie, x, y, budget, boxoffice, rating, strokeWidth, strokeLength, year }}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let div_resize_listener;
    	let current;
    	let if_block = /*width*/ ctx[1] && /*height*/ ctx[2] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block) if_block.c();
    			attr_dev(div, "class", "chart svelte-d3k7cc");
    			add_render_callback(() => /*div_elementresize_handler*/ ctx[27].call(div));
    			add_location(div, file$1, 116, 0, 4055);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    			div_resize_listener = add_resize_listener(div, /*div_elementresize_handler*/ ctx[27].bind(div));
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*width*/ ctx[1] && /*height*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty[0] & /*width, height*/ 6) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    			div_resize_listener();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let colorScheme;
    	let paddingTop;
    	let paddingBottom;
    	let paddingLeft;
    	let paddingRight;
    	let innerWidth;
    	let innerHeight;
    	let xScale;
    	let yScale;
    	let yearsArr;
    	let yearsDiff;
    	let circleScale;
    	let strokeNumScale;
    	let strokeWidthScale;
    	let strokeLengthScale;
    	let renderedData;
    	let timelineData;
    	let hoveredYear;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ChartHorizontal', slots, []);
    	let state = "Default"; //controls the current hovered movie in order to change the color scheme. defaults to grand budapest
    	let { data } = $$props;
    	let { xRange } = $$props;
    	let { yRange } = $$props;
    	let { circleDomain } = $$props;
    	let { stateWrapper } = $$props;
    	let width;
    	let height;

    	// create dataset of points for every year between the min and max to draw our timeline
    	// this is to ensure we show the transition between the first & last years in every decade
    	const years = new Set(data.map(d => d.Year));

    	let allYears = [];
    	let minYear = min$1(years);
    	let maxYear = max$1(years);
    	const writable_props = ['data', 'xRange', 'yRange', 'circleDomain', 'stateWrapper'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ChartHorizontal> was created with unknown prop '${key}'`);
    	});

    	function bubble_1_state_binding(value) {
    		state = value;
    		$$invalidate(0, state);
    	}

    	function div_elementresize_handler() {
    		width = this.clientWidth;
    		height = this.clientHeight;
    		$$invalidate(1, width);
    		$$invalidate(2, height);
    	}

    	$$self.$$set = $$props => {
    		if ('data' in $$props) $$invalidate(14, data = $$props.data);
    		if ('xRange' in $$props) $$invalidate(15, xRange = $$props.xRange);
    		if ('yRange' in $$props) $$invalidate(16, yRange = $$props.yRange);
    		if ('circleDomain' in $$props) $$invalidate(17, circleDomain = $$props.circleDomain);
    		if ('stateWrapper' in $$props) $$invalidate(13, stateWrapper = $$props.stateWrapper);
    	};

    	$$self.$capture_state = () => ({
    		min: min$1,
    		max: max$1,
    		scaleLinear: linear,
    		scaleSqrt: sqrt$1,
    		scaleQuantize: quantize,
    		filter,
    		movieColors,
    		Bubble,
    		TimeLineHorizontal: TimelineHorizontal,
    		Description,
    		Legend,
    		state,
    		data,
    		xRange,
    		yRange,
    		circleDomain,
    		stateWrapper,
    		width,
    		height,
    		years,
    		allYears,
    		minYear,
    		maxYear,
    		renderedData,
    		hoveredYear,
    		yScale,
    		xScale,
    		timelineData,
    		strokeLengthScale,
    		strokeWidthScale,
    		circleScale,
    		strokeNumScale,
    		innerWidth,
    		yearsDiff,
    		yearsArr,
    		paddingBottom,
    		paddingTop,
    		paddingRight,
    		paddingLeft,
    		innerHeight,
    		colorScheme
    	});

    	$$self.$inject_state = $$props => {
    		if ('state' in $$props) $$invalidate(0, state = $$props.state);
    		if ('data' in $$props) $$invalidate(14, data = $$props.data);
    		if ('xRange' in $$props) $$invalidate(15, xRange = $$props.xRange);
    		if ('yRange' in $$props) $$invalidate(16, yRange = $$props.yRange);
    		if ('circleDomain' in $$props) $$invalidate(17, circleDomain = $$props.circleDomain);
    		if ('stateWrapper' in $$props) $$invalidate(13, stateWrapper = $$props.stateWrapper);
    		if ('width' in $$props) $$invalidate(1, width = $$props.width);
    		if ('height' in $$props) $$invalidate(2, height = $$props.height);
    		if ('allYears' in $$props) $$invalidate(31, allYears = $$props.allYears);
    		if ('minYear' in $$props) $$invalidate(11, minYear = $$props.minYear);
    		if ('maxYear' in $$props) $$invalidate(12, maxYear = $$props.maxYear);
    		if ('renderedData' in $$props) $$invalidate(3, renderedData = $$props.renderedData);
    		if ('hoveredYear' in $$props) $$invalidate(8, hoveredYear = $$props.hoveredYear);
    		if ('yScale' in $$props) $$invalidate(18, yScale = $$props.yScale);
    		if ('xScale' in $$props) $$invalidate(19, xScale = $$props.xScale);
    		if ('timelineData' in $$props) $$invalidate(9, timelineData = $$props.timelineData);
    		if ('strokeLengthScale' in $$props) $$invalidate(4, strokeLengthScale = $$props.strokeLengthScale);
    		if ('strokeWidthScale' in $$props) $$invalidate(5, strokeWidthScale = $$props.strokeWidthScale);
    		if ('circleScale' in $$props) $$invalidate(6, circleScale = $$props.circleScale);
    		if ('strokeNumScale' in $$props) strokeNumScale = $$props.strokeNumScale;
    		if ('innerWidth' in $$props) $$invalidate(20, innerWidth = $$props.innerWidth);
    		if ('yearsDiff' in $$props) $$invalidate(21, yearsDiff = $$props.yearsDiff);
    		if ('yearsArr' in $$props) $$invalidate(22, yearsArr = $$props.yearsArr);
    		if ('paddingBottom' in $$props) $$invalidate(23, paddingBottom = $$props.paddingBottom);
    		if ('paddingTop' in $$props) $$invalidate(24, paddingTop = $$props.paddingTop);
    		if ('paddingRight' in $$props) $$invalidate(25, paddingRight = $$props.paddingRight);
    		if ('paddingLeft' in $$props) $$invalidate(7, paddingLeft = $$props.paddingLeft);
    		if ('innerHeight' in $$props) innerHeight = $$props.innerHeight;
    		if ('colorScheme' in $$props) $$invalidate(10, colorScheme = $$props.colorScheme);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*state*/ 1) {
    			$$invalidate(10, colorScheme = movieColors[state]);
    		}

    		if ($$self.$$.dirty[0] & /*state*/ 1) {
    			$$invalidate(13, stateWrapper = state);
    		}

    		if ($$self.$$.dirty[0] & /*height*/ 4) {
    			$$invalidate(24, paddingTop = height / 10); //TODO: make dynamic based on window dimensions
    		}

    		if ($$self.$$.dirty[0] & /*height*/ 4) {
    			$$invalidate(23, paddingBottom = height / 10);
    		}

    		if ($$self.$$.dirty[0] & /*width*/ 2) {
    			$$invalidate(7, paddingLeft = width / 3);
    		}

    		if ($$self.$$.dirty[0] & /*height*/ 4) {
    			$$invalidate(25, paddingRight = height / 10);
    		}

    		if ($$self.$$.dirty[0] & /*width, paddingLeft, paddingRight*/ 33554562) {
    			$$invalidate(20, innerWidth = width - paddingLeft - paddingRight);
    		}

    		if ($$self.$$.dirty[0] & /*height, paddingTop, paddingBottom*/ 25165828) {
    			innerHeight = height - paddingTop - paddingBottom;
    		}

    		if ($$self.$$.dirty[0] & /*xRange, paddingLeft, width, paddingRight*/ 33587330) {
    			$$invalidate(19, xScale = linear().domain(xRange).range([paddingLeft, width - paddingRight]));
    		}

    		if ($$self.$$.dirty[0] & /*yRange, paddingTop, height, paddingBottom*/ 25231364) {
    			$$invalidate(18, yScale = linear().domain(yRange).range([paddingTop, height - paddingBottom]));
    		}

    		if ($$self.$$.dirty[0] & /*yearsArr, yearsDiff*/ 6291456) {
    			yearsArr.forEach((year, idx) => {
    				if (yearsArr[idx - 1]) yearsDiff.push(yearsArr[idx] - yearsArr[idx - 1]);
    			});
    		}

    		if ($$self.$$.dirty[0] & /*circleDomain, yearsDiff, innerWidth*/ 3276800) {
    			$$invalidate(6, circleScale = sqrt$1().domain(circleDomain).range(min$1(yearsDiff) < 2
    			? [1, (innerWidth / 10 - 11 * 2) / 2]
    			: [1, innerWidth / 10 / 2]));
    		}

    		if ($$self.$$.dirty[0] & /*circleDomain*/ 131072) {
    			// create scales to map radius to number of strokes, stroke width and stroke length
    			// scaleQuantize maps a continuous domain to a discrete range
    			strokeNumScale = quantize().domain(circleDomain).range([30, 40]); //currently not using
    		}

    		if ($$self.$$.dirty[0] & /*circleDomain*/ 131072) {
    			$$invalidate(5, strokeWidthScale = linear().domain(circleDomain).range([1.5, 3]));
    		}

    		if ($$self.$$.dirty[0] & /*circleDomain*/ 131072) {
    			// $: strokeLengthScale = scaleLinear().domain(circleDomain).range([9, 14]);
    			$$invalidate(4, strokeLengthScale = linear().domain(circleDomain).range([7, 11]));
    		}

    		if ($$self.$$.dirty[0] & /*data, xScale, yScale, circleScale, strokeWidthScale, strokeLengthScale*/ 802928) {
    			$$invalidate(3, renderedData = data.map(d => {
    				return {
    					movie: d.Movie,
    					x: (Math.floor(d.Year / 10) - min$1(data.map(d => Math.floor(d.Year / 10)))) % 2 === 0
    					? xScale(d.Year % 10)
    					: xScale(9 - d.Year % 10),
    					// reverse the y scale for every other decade - found by subtracting each decade from the first decade & determining if even or odd
    					y: yScale(Math.floor(d.Year / 10)),
    					budget: circleScale(d.Budget),
    					boxoffice: circleScale(d.BoxOffice),
    					rating: (d.RottenTomatoes_Tomatometer + d.RottenTomatoes_Audience) / 2,
    					//   strokeNum: strokeNumScale(max([d.Budget, d.BoxOffice])),
    					strokeWidth: strokeWidthScale(max$1([d.Budget, d.BoxOffice])),
    					strokeLength: strokeLengthScale(max$1([d.Budget, d.BoxOffice])),
    					year: d.Year
    				};
    			}));
    		}

    		if ($$self.$$.dirty[0] & /*data, xScale, yScale*/ 802816) {
    			$$invalidate(9, timelineData = allYears.map(d => {
    				return {
    					year: d.Year,
    					x: (Math.floor(d.Year / 10) - min$1(data.map(d => Math.floor(d.Year / 10)))) % 2 === 0
    					? xScale(d.Year % 10)
    					: xScale(9 - d.Year % 10),
    					// reverse the y scale for every other decade - found by subtracting each decade from the first decade & determining if even or odd
    					y: yScale(Math.floor(d.Year / 10))
    				};
    			}));
    		}

    		if ($$self.$$.dirty[0] & /*renderedData, state*/ 9) {
    			$$invalidate(8, hoveredYear = renderedData.filter(d => d.movie === state).map(d => d.year)[0]);
    		}
    	};

    	$$invalidate(22, yearsArr = [...years]);
    	$$invalidate(21, yearsDiff = []);

    	for (let currYear = min$1(years); currYear <= max$1(years); currYear++) {
    		allYears.push({ Year: currYear });
    	}

    	return [
    		state,
    		width,
    		height,
    		renderedData,
    		strokeLengthScale,
    		strokeWidthScale,
    		circleScale,
    		paddingLeft,
    		hoveredYear,
    		timelineData,
    		colorScheme,
    		minYear,
    		maxYear,
    		stateWrapper,
    		data,
    		xRange,
    		yRange,
    		circleDomain,
    		yScale,
    		xScale,
    		innerWidth,
    		yearsDiff,
    		yearsArr,
    		paddingBottom,
    		paddingTop,
    		paddingRight,
    		bubble_1_state_binding,
    		div_elementresize_handler
    	];
    }

    class ChartHorizontal extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance$1,
    			create_fragment$1,
    			safe_not_equal,
    			{
    				data: 14,
    				xRange: 15,
    				yRange: 16,
    				circleDomain: 17,
    				stateWrapper: 13
    			},
    			null,
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ChartHorizontal",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*data*/ ctx[14] === undefined && !('data' in props)) {
    			console.warn("<ChartHorizontal> was created without expected prop 'data'");
    		}

    		if (/*xRange*/ ctx[15] === undefined && !('xRange' in props)) {
    			console.warn("<ChartHorizontal> was created without expected prop 'xRange'");
    		}

    		if (/*yRange*/ ctx[16] === undefined && !('yRange' in props)) {
    			console.warn("<ChartHorizontal> was created without expected prop 'yRange'");
    		}

    		if (/*circleDomain*/ ctx[17] === undefined && !('circleDomain' in props)) {
    			console.warn("<ChartHorizontal> was created without expected prop 'circleDomain'");
    		}

    		if (/*stateWrapper*/ ctx[13] === undefined && !('stateWrapper' in props)) {
    			console.warn("<ChartHorizontal> was created without expected prop 'stateWrapper'");
    		}
    	}

    	get data() {
    		throw new Error("<ChartHorizontal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<ChartHorizontal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get xRange() {
    		throw new Error("<ChartHorizontal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set xRange(value) {
    		throw new Error("<ChartHorizontal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get yRange() {
    		throw new Error("<ChartHorizontal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set yRange(value) {
    		throw new Error("<ChartHorizontal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get circleDomain() {
    		throw new Error("<ChartHorizontal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set circleDomain(value) {
    		throw new Error("<ChartHorizontal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get stateWrapper() {
    		throw new Error("<ChartHorizontal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set stateWrapper(value) {
    		throw new Error("<ChartHorizontal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.49.0 */
    const file = "src/App.svelte";

    // (36:2) {:else}
    function create_else_block(ctx) {
    	let charthorizontal;
    	let updating_stateWrapper;
    	let current;

    	function charthorizontal_stateWrapper_binding(value) {
    		/*charthorizontal_stateWrapper_binding*/ ctx[8](value);
    	}

    	let charthorizontal_props = {
    		data,
    		xRange: [0, 9],
    		yRange: [min$1(data.map(/*func_3*/ ctx[6])), max$1(data.map(/*func_4*/ ctx[7]))],
    		circleDomain: [
    			// min(data.map((d) => [d.Budget, d.BoxOffice]).flat()),
    			0,
    			max$1(data.map(func_5).flat())
    		]
    	};

    	if (/*stateWrapper*/ ctx[0] !== void 0) {
    		charthorizontal_props.stateWrapper = /*stateWrapper*/ ctx[0];
    	}

    	charthorizontal = new ChartHorizontal({
    			props: charthorizontal_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(charthorizontal, 'stateWrapper', charthorizontal_stateWrapper_binding));

    	const block = {
    		c: function create() {
    			create_component(charthorizontal.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(charthorizontal, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const charthorizontal_changes = {};

    			if (!updating_stateWrapper && dirty & /*stateWrapper*/ 1) {
    				updating_stateWrapper = true;
    				charthorizontal_changes.stateWrapper = /*stateWrapper*/ ctx[0];
    				add_flush_callback(() => updating_stateWrapper = false);
    			}

    			charthorizontal.$set(charthorizontal_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(charthorizontal.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(charthorizontal.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(charthorizontal, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(36:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (22:2) {#if height > width}
    function create_if_block(ctx) {
    	let chart;
    	let current;

    	chart = new Chart({
    			props: {
    				data,
    				xRange: [min$1(data.map(/*func*/ ctx[4])), max$1(data.map(/*func_1*/ ctx[5]))],
    				yRange: [0, 9],
    				circleDomain: [
    					//min(data.map((d) => [d.Budget, d.BoxOffice]).flat()),
    					0,
    					max$1(data.map(func_2).flat())
    				]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(chart.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(chart, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(chart.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(chart.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(chart, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(22:2) {#if height > width}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div;
    	let current_block_type_index;
    	let if_block;
    	let div_class_value;
    	let div_resize_listener;
    	let current;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*height*/ ctx[2] > /*width*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			attr_dev(div, "class", div_class_value = "wrapper " + `wrapper${/*imgNum*/ ctx[3]}` + " svelte-rda9cl");
    			add_render_callback(() => /*div_elementresize_handler*/ ctx[9].call(div));
    			add_location(div, file, 16, 0, 341);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_blocks[current_block_type_index].m(div, null);
    			div_resize_listener = add_resize_listener(div, /*div_elementresize_handler*/ ctx[9].bind(div));
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(div, null);
    			}

    			if (!current || dirty & /*imgNum*/ 8 && div_class_value !== (div_class_value = "wrapper " + `wrapper${/*imgNum*/ ctx[3]}` + " svelte-rda9cl")) {
    				attr_dev(div, "class", div_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_blocks[current_block_type_index].d();
    			div_resize_listener();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const func_2 = d => [d.Budget, d.BoxOffice];
    const func_5 = d => [d.Budget, d.BoxOffice];

    function instance($$self, $$props, $$invalidate) {
    	let imgNum;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let width;
    	let height;
    	let movies = data.map(d => d.Movie);
    	let stateWrapper = "";
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const func = d => Math.floor(d.Year / 10);
    	const func_1 = d => Math.floor(d.Year / 10);
    	const func_3 = d => Math.floor(d.Year / 10);
    	const func_4 = d => Math.floor(d.Year / 10);

    	function charthorizontal_stateWrapper_binding(value) {
    		stateWrapper = value;
    		$$invalidate(0, stateWrapper);
    	}

    	function div_elementresize_handler() {
    		width = this.clientWidth;
    		height = this.clientHeight;
    		$$invalidate(1, width);
    		$$invalidate(2, height);
    	}

    	$$self.$capture_state = () => ({
    		min: min$1,
    		max: max$1,
    		data,
    		Chart,
    		ChartHorizontal,
    		width,
    		height,
    		movies,
    		stateWrapper,
    		imgNum
    	});

    	$$self.$inject_state = $$props => {
    		if ('width' in $$props) $$invalidate(1, width = $$props.width);
    		if ('height' in $$props) $$invalidate(2, height = $$props.height);
    		if ('movies' in $$props) $$invalidate(10, movies = $$props.movies);
    		if ('stateWrapper' in $$props) $$invalidate(0, stateWrapper = $$props.stateWrapper);
    		if ('imgNum' in $$props) $$invalidate(3, imgNum = $$props.imgNum);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*stateWrapper*/ 1) {
    			$$invalidate(3, imgNum = movies.indexOf(stateWrapper));
    		}
    	};

    	return [
    		stateWrapper,
    		width,
    		height,
    		imgNum,
    		func,
    		func_1,
    		func_3,
    		func_4,
    		charthorizontal_stateWrapper_binding,
    		div_elementresize_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
      target: document.body,
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
