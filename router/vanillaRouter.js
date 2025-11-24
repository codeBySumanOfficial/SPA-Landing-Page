function escapeRegex(str) {
    return str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

export class Router {
    constructor(
        {
            id = "router",
            routes = {},
            useHistory = true,
            useHash = false,        
            log = false,
            basename = "/",
            hideClass = "hidden",
            fallBackRoute,
            getPageElement = (id) => document.getElementById(id),
            setUpNavigation,
            onLoadedInitFn
        } = {}
    ) {
        this.id = id;
        this.routes = routes;
        this.useHistory = useHistory;
        this.useHash = useHash;     // <── NEW
        this.log = log;
        this.currentElement = null;
        this.hideClass = hideClass;
        this.basename = basename;
        this.fallBackRoute = fallBackRoute;
        this.onLoadedInitFn = onLoadedInitFn;
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
        path = path.startsWith(this.basename) ? path.slice(this.basename.length) : path
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

    redirect(route){
        history.replaceState({}, '', route)
        this.show(route)
    }
    show(path) {
        // If using hash, ignore normal paths
        if (this.useHash && !path.startsWith("/")) {
            path = "/" + this.normalizePath(path);
        }

        const match = this.matchRoute(path);
        const fallBackRoute = this.fallBackRoute;
        if (!match?.pageId && !match?.redirectTo) {
            if (this.log) console.warn(`[${this.id}] No route found for`, path);
            if(fallBackRoute) this.redirect(fallBackRoute)
            return;
        }

        const { redirectTo,  pageId, hydrateFn, initFn, params, routePattern } = match;
        const onLoadedInitFn = this.onLoadedInitFn;

        if(redirectTo && this.useHistory){
            this.redirect(redirectTo)
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

        if (typeof onLoadedInitFn === "function") {
            onLoadedInitFn({ params, page: pageElement, route: path });
            this.onLoadedInitFn = null;
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
        let normalized = "/" + this.normalizePath(route);
        normalized = normalized.startsWith(this.basename) ? normalized : this.basename+normalized
        const isSameRoute = normalized === location.pathname;
        if (this.useHash && !isSameRoute) {
            this.setHashRoute(normalized);
            this.show(normalized);
            return;
        }

        if (this.useHistory && !isSameRoute) {
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
