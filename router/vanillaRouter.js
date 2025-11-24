import { appState } from "../modules/appState.js";

function escapeRegex(str) {
    return str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

export class Router {
    constructor(
        {
            id = "router",
            routes = {},
            useHistory = true,
            useHash = false,        // <── NEW
            mountPrefix = "",
            log = false,
            hideClass = "hidden",
            getPageElement = (id) => document.getElementById(id),
            setUpNavigation
        } = {}
    ) {
        this.id = id;
        this.routes = routes;
        this.useHistory = useHistory;
        this.useHash = useHash;     // <── NEW
        this.log = log;
        this.currentElement = null;
        this.mountPrefix = mountPrefix;
        this.hideClass = hideClass;

        this.getPageElement = getPageElement;
        this.setUpNavigation =
            setUpNavigation ||
            ((navigate) => {
                console.log(`[${this.id}] Using default navigation system.`);
                document.addEventListener("click", (e) => {
                    const link = e.target.closest("a[data-link]");
                    if (!link) return;
                    e.preventDefault();
                    navigate(link.dataset.link);
                });
            });

        appState.routers[id] = this;

        // Handle back button
        if (this.useHistory && !this.useHash) {
            window.addEventListener("popstate", (e) => {
                const route = e.state?.route || location.pathname;
                this.show(route);
            });
        }

        // Hash-based navigation listener
        if (this.useHash) {
            window.addEventListener("hashchange", () => {
                this.show(this.getHashRoute());
            });
        }
    }

    /* ---------------------------
     * Route Normalization Helpers
     * --------------------------- */

    normalizePath(path) {
        if (!path) return "/";
        return path.replace(/^\/+|\/+$/g, "") || "/";
    }

    // Extract path from hash
    getHashRoute() {
        const hash = location.hash.slice(1);  // remove #
        return "/" + this.normalizePath(hash);
    }

    // Write path into hash
    setHashRoute(route) {
        const clean = this.normalizePath(route);
        location.hash = "/" + clean;
    }

    /* ---------------------------
     * Pattern Matching
     * --------------------------- */

    patternToRegex(pattern) {
        const paramNames = [];

        const regexPattern = pattern
            .split("/")
            .map((segment) => {
                if (segment.startsWith("[") && segment.endsWith("]")) {
                    paramNames.push(segment.slice(1, -1));
                    return "([^/]+)";
                }
                return escapeRegex(segment);
            })
            .join("/");

        return {
            regex: new RegExp(`^${regexPattern}$`),
            paramNames
        };
    }

    matchRoute(path) {
        const cleanPath = this.normalizePath(path);

        for (const routePattern in this.routes) {
            const { regex, paramNames } = this.patternToRegex(routePattern);

            const match = cleanPath.match(regex);
            if (match) {
                const values = match.slice(1);
                const params = Object.fromEntries(
                    paramNames.map((name, i) => [name, values[i]])
                );

                const route = this.routes[routePattern];

                return {
                    routePattern,
                    pageId: route.pageId,
                    hydrateFn: route.hydrateFn,
                    initFn: route.initFn,
                    redirectTo: route?.redirectTo,
                    params
                };
            }
        }

        return null;
    }

    /* ---------------------------
     * Core Rendering
     * --------------------------- */

    show(path) {
        // If using hash, ignore normal paths
        if (this.useHash && !path.startsWith("/")) {
            path = "/" + this.normalizePath(path);
        }

        const match = this.matchRoute(path);
        if (!match) {
            if (this.log) console.warn(`[${this.id}] No route found for`, path);
            return;
        }

        const { redirectTo,  pageId, hydrateFn, initFn, params, routePattern } = match;

        if(redirectTo && this.useHistory){
            history.replaceState({}, '', redirectTo)
            this.show(redirectTo)
            return
        }
        const pageElement = this.getPageElement(pageId);

        if (!pageElement) {
            console.error(`[${this.id}] Missing element for pageId="${pageId}"`);
            return;
        }

        if (this.currentElement && this.currentElement !== pageElement) {
            this.currentElement.classList.add(this.hideClass);
        }

        pageElement.classList.remove(this.hideClass);
        this.currentElement = pageElement;

        if (typeof hydrateFn === "function") {
            hydrateFn({ params, page: pageElement, route: path });
        }

        if (typeof initFn === "function") {
            initFn({ params, page: pageElement, route: path });
            this.routes[routePattern].initFn = null;
        }

        if (this.log) {
            console.log(`[${this.id}] Route change:`, {
                params,
                pageId,
                route: path
            });
        }
    }

    /* ---------------------------
     * Navigation
     * --------------------------- */

    navigate(route) {
        const normalized = "/" + this.normalizePath(route);

        if (this.useHash) {
            this.setHashRoute(normalized);
            this.show(normalized);
            return;
        }

        if (this.useHistory && normalized !== location.pathname) {
            history.pushState({ route: normalized }, "", normalized);
        }

        this.show(normalized);
    }

    /* ---------------------------
     * Init
     * --------------------------- */

    init() {
        this.setUpNavigation(this.navigate.bind(this));

        let initialRoute = this.useHash
            ? this.getHashRoute()
            : location.pathname;

        this.show(initialRoute);
    }
}
