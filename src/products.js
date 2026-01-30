import Splide from "@splidejs/splide";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger, CustomEase, SplitText);


document.querySelectorAll('.ticker').forEach(ticker => {
    const inner = ticker.querySelector('.ticker-wrap')
    const content = inner.querySelector('.ticker-text')
    const duration = ticker.getAttribute('data-duration')
    inner.append(content.cloneNode(true))

    const animations = []
    inner.querySelectorAll('.ticker-text').forEach(element => {
        const animation = gsap.to(element, {
            x: "-100%",
            repeat: -1,
            duration: duration,
            ease: 'linear'
        })
        animations.push(animation)
    })

    ticker.addEventListener('mouseenter', () => {
        animations.forEach(anim => anim.pause())
    })

    ticker.addEventListener('mouseleave', () => {
        animations.forEach(anim => anim.play())
    })
})



new Splide('.splide', {
    type: 'loop',
    perPage: 1,
    focus: 'center',
    arrows: false,
    breakpoints: {
        1200: {
            perPage: 1
        },
        813: {
            perPage: 1
        }
    }
}).mount();




const showAnim = gsap.from('.nav-container', {
    yPercent: -100,
    paused: true,
    duration: 0.2
}).progress(1);

ScrollTrigger.create({
    scroller: outerContainer,
    start: "50px top",
    end: "max",
    // markers: true,
    onEnter: () => {
        document.querySelector('.nav-container').classList.add('nav-bg')
    },
    onLeaveBack: () => {
        document.querySelector('.nav-container').classList.remove('nav-bg')
    },
    onUpdate: (self) => {
        self.direction === -1 ? showAnim.play() : showAnim.reverse()
    },
});

CustomEase.create('hop', ".87, 0, .13, 1")

const textContainers = document.querySelectorAll(".menu-col")
let splitTextByContainer = []

textContainers.forEach((container) => {
    const textElements = container.querySelectorAll("a, p")
    let containerSplits = []

    textElements.forEach((element) => {
        const split = SplitText.create(element, {
            type: "lines",
            mask: "lines",
            linesClass: "line"
        })
        containerSplits.push(split)
        gsap.set(split.lines, { y: "110%" })
    })
    splitTextByContainer.push(containerSplits)
})


const outerContainer = document.querySelector(".outerContainer")
const menuToggleBtn = document.querySelector(".menu-toggle-btn");
const menuOverlay = document.querySelector(".menu-overlay")
const menuOverlayContainer = document.querySelector('.menu-overlay-content')
const menuMediaWrapper = document.querySelector(".menu-media-wrapper")
const copyContainers = document.querySelectorAll('.menu-cols')
const menuToggleLabel = document.querySelector('.menu-toggle-label p')
const hamburgerIcon = document.querySelector(".menu-hamburger-icon")
const mobileLogo = document.querySelector('.mobile-logo')

let isMenuOpen = false;
let isAnimating = false;

let toggleMenu = () => {
    if (isAnimating) return
    if (!isMenuOpen) {
        isAnimating = true
        if (lenis) {
            lenis.stop()
        }
        mobileLogo.setAttribute("src", whiteLogo)

        const t1 = gsap.timeline()
        t1.to(menuToggleLabel, {
            y: "-110%",
            duration: 1,
            ease: "hop"
        }).to(outerContainer, {
            y: "100svh",
            duration: 1,
            ease: "hop",
        }, "<").to(menuOverlay, {
            clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
            duration: 1,
            ease: "hop"
        }, "<").to(menuOverlayContainer, {
            yPercent: 0,
            duration: 1,
            ease: 'hop'
        }, "<")

        splitTextByContainer.forEach((containerSplits) => {
            const copyLines = containerSplits.flatMap((split) => split.lines)
            t1.to(copyLines, {
                y: "0%",
                duration: 2,
                ease: 'hop',
                stagger: -0.075,
            }, -0.15)

        })

        hamburgerIcon.classList.add('active')
        t1.call(() => {
            isAnimating = false;
        })
        console.log('opened')
        isMenuOpen = true

    }
    else {
        isAnimating = true
        hamburgerIcon.classList.remove('active')
        const t1 = gsap.timeline()
        t1.to(outerContainer, {
            y: "0svh",
            duration: 1,
            ease: "hop",
            clearProps: "all",
        }, "<").to(menuOverlay, {
            clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
            duration: 1,
            ease: "hop"
        }, "<").to(menuOverlayContainer, {
            yPercent: -50,
            duration: 0.5,
            ease: 'hop',
            delay: 0.3
        }, "<").to(menuToggleLabel, {
            y: "-0%",
            duration: 1,
            ease: "hop",
            onStart: () => {
                mobileLogo.setAttribute("src", blackLogo)
            }
        }).to(copyContainers, {
            opacity: 0.25,
            duration: 0.75,
            ease: "power2.out",
            delay: 0.5,
        }, "<")


        t1.call(() => {
            splitTextByContainer.forEach((containerSplits) => {
                const copyLines = containerSplits.flatMap((split) => split.lines)
                gsap.set(copyLines, { y: "-110%" })
            })
            gsap.set(copyContainers, { opacity: 1 })
            gsap.set(menuMediaWrapper, { opacity: 0 })
            isAnimating = false
            if (lenis) {
                lenis.start()
            }
        })
        isMenuOpen = false
    }
}

menuToggleBtn.addEventListener("click", toggleMenu)