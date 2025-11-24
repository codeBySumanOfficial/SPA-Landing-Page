export function initLandingPage({ params, pageElm, route}){
    const hamburger = document.querySelector('.hamburger')
    const menu = document.querySelector('.menu')
    hamburger.addEventListener('click', (e) => {
        menu.classList.toggle('active')
        e.stopPropagation()
    })

    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && !hamburger.contains(e.target)) {
            menu.classList.remove('active')
        }
    })

    document.querySelector('.close').addEventListener('click', ()=>{
        menu.classList.remove('active')
    })
}