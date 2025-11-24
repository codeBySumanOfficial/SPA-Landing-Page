import { Router } from "./router/vanillaRouter.js";
import { initLandingPage } from "./router/init/landingPage.js";

const basename = '/SPA-Landing-Page';
const mainRouter = new Router({
    id: "main",
    log: true,
    routes: {
        '/': {
            redirectTo: '/landing-page'
        },
        'index.html': {
            redirectTo: '/landing-page'
        },
        'getitnow': {
            pageId: 'getitnow'
        },
        'landing-page': {
            pageId: 'landing-page'
        },
        'features': {
            pageId: 'features-page'
        },
        'contactus': {
            pageId: 'contactus-page'
        },
        'about': {
            pageId: 'about-page'
        },
        'pricing': {
            pageId: 'pricing-page'
        },
        'not-found':{
            pageId: 'not-found'
        }
    },
    basename: basename,
    fallBackRoute: 'not-found',
    setUpNavigation(navigateTo) {
        document.addEventListener('click', (e) => {
            e.preventDefault()
            let elm = e.target.closest('a[data-link]')
            let link = elm?.dataset.link
            if (elm && link) {
                navigateTo(link)
            }
        })

    },
    onLoadedInitFn: initLandingPage
})

mainRouter.init()
initLandingPage()

