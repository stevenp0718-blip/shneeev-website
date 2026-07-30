/*
========================================

SHNEEEV
Main JavaScript

========================================
*/

/*======================================
    CONFIG
======================================*/



// Number of videos displayed
const MAX_RESULTS = 3;

/*======================================
    PAGE READY
======================================*/

document.addEventListener("DOMContentLoaded", () => {

    fadeInPage();

    setupNavbar();

    setupScrollReveal();

    setupHeroParallax();

    setupCardTilt();

    setupMouseGlow();

    loadYouTubeVideos();

});


/*======================================
    PAGE FADE
======================================*/

function fadeInPage(){

    document.body.style.opacity = "0";

    document.body.style.transition = "opacity .8s ease";

    requestAnimationFrame(()=>{

        document.body.style.opacity = "1";

    });

}


/*======================================
    NAVBAR
======================================*/

function setupNavbar(){

    const header = document.querySelector("header");

    let lastScroll = 0;

    window.addEventListener("scroll",()=>{

        const current = window.scrollY;

        if(current > lastScroll && current > 120){

            header.style.transform =
            "translateY(-120%)";

        }

        else{

            header.style.transform =
            "translateY(0)";

        }

        lastScroll = current;

    });

}


/*======================================
    SCROLL REVEAL
======================================*/

function setupScrollReveal(){

    const elements = document.querySelectorAll(

        ".about,.setupCard,.reviewCard,.business"

    );

    elements.forEach(el=>{

        el.classList.add("reveal");

    });

    const observer = new IntersectionObserver(

        entries=>{

            entries.forEach(entry=>{

                if(entry.isIntersecting){

                    entry.target.classList.add(

                        "visible"

                    );

                }

            });

        },

        {

            threshold:.15

        }

    );

    elements.forEach(el=>{

        observer.observe(el);

    });

}


/*======================================
    HERO PARALLAX
======================================*/

function setupHeroParallax(){}

/*======================================
    CARD TILT
======================================*/

function setupCardTilt(){

    const cards = document.querySelectorAll(

        ".setupCard,.reviewCard"

    );

    cards.forEach(card=>{

        card.addEventListener(

            "mousemove",

            e=>{

                const rect =

                card.getBoundingClientRect();

                const x =

                e.clientX-rect.left;

                const y =

                e.clientY-rect.top;

                const rotateY =

                ((x/rect.width)-0.5)*10;

                const rotateX =

                ((y/rect.height)-0.5)*-10;

                card.style.transform =

                `perspective(1000px)
                rotateX(${rotateX}deg)
                rotateY(${rotateY}deg)
                translateY(-10px)`;

            }

        );

        card.addEventListener(

            "mouseleave",

            ()=>{

                card.style.transform = "";

            }

        );

    });

}


/*======================================
    MOUSE GLOW
======================================*/

function setupMouseGlow(){

    const glow = document.createElement("div");

    glow.className = "mouseGlow";

    glow.style.position = "fixed";

    glow.style.width = "500px";

    glow.style.height = "500px";

    glow.style.borderRadius = "50%";

    glow.style.pointerEvents = "none";

    glow.style.filter = "blur(90px)";

    glow.style.background =

    "radial-gradient(circle, rgba(79,166,108,.12), transparent 70%)";

    glow.style.zIndex = "-10";

    document.body.appendChild(glow);

    window.addEventListener(

        "mousemove",

        e=>{

            glow.style.left =

            (e.clientX-250)+"px";

            glow.style.top =

            (e.clientY-250)+"px";

        }

    );

}

async function loadYouTubeVideos() {

    const container =
        document.getElementById("youtubeVideos");

    if (!container) return;

    container.innerHTML = "";

    try {

        const response =
            await fetch("https://tiny-moon-0007.stevenp0718.workers.dev/api/videos")

        const videos =
            await response.json();

        videos.forEach(video => {

            const card =
                document.createElement("a");

            card.className =
                "reviewCard";

            card.href =
                video.url;

            card.target =
                "_blank";

            card.innerHTML = `

                <div class="reviewThumbnail">

                    <img
                        src="${video.thumbnail}"
                        alt="${video.title}"
                        loading="lazy">

                </div>

                <div class="reviewInfo">

                    <h3>${video.title}</h3>

                    <p>${new Date(video.published).toLocaleDateString()}</p>

                </div>

            `;

            container.appendChild(card);

        });

    }

    catch (err) {

        console.error(err);

        container.innerHTML = `

            <div class="reviewCard">

                <div class="reviewInfo">

                    <h3>Unable to load videos</h3>

                    <p>Please try again later.</p>

                </div>

            </div>

        `;

    }

}

/*======================================
    HERO FLOAT
======================================*/

/*======================================
    BUTTON RIPPLE
======================================*/

document.querySelectorAll(

".primary,.secondary,.youtubeButton"

).forEach(button=>{

    button.addEventListener("click",e=>{

        const ripple = document.createElement("span");

        const rect = button.getBoundingClientRect();

        const size = Math.max(rect.width,rect.height);

        ripple.style.position = "absolute";

        ripple.style.width = size + "px";

        ripple.style.height = size + "px";

        ripple.style.left =

        (e.clientX-rect.left-size/2)+"px";

        ripple.style.top =

        (e.clientY-rect.top-size/2)+"px";

        ripple.style.borderRadius = "50%";

        ripple.style.pointerEvents = "none";

        ripple.style.background =

        "rgba(255,255,255,.35)";

        ripple.style.transform = "scale(0)";

        ripple.style.transition =

        "transform .6s ease,opacity .6s ease";

        button.style.position = "relative";

        button.style.overflow = "hidden";

        button.appendChild(ripple);

        requestAnimationFrame(()=>{

            ripple.style.transform = "scale(4)";

            ripple.style.opacity = "0";

        });

        setTimeout(()=>{

            ripple.remove();

        },600);

    });

});


/*======================================
    FLOATING PARTICLES
======================================*/

function createParticles(){

    const background = document.querySelector(".background");

    if(!background) return;

    for(let i=0;i<30;i++){

        const particle = document.createElement("div");

        particle.style.position = "absolute";

        particle.style.width =

        (Math.random()*4+2)+"px";

        particle.style.height =

        particle.style.width;

        particle.style.borderRadius = "50%";

        particle.style.background =

        "rgba(131,231,162,.55)";

        particle.style.left =

        Math.random()*100+"%";

        particle.style.top =

        Math.random()*100+"%";

        particle.style.opacity =

        Math.random()*.5+.2;

        particle.style.transition =

        "transform 12s linear";

        background.appendChild(particle);

        animateParticle(particle);

    }

}

function animateParticle(particle){

    function move(){

        particle.animate([

            {

                transform:"translate(0px,0px)"

            },

            {

                transform:

                `translate(

                ${(Math.random()*120)-60}px,

                ${(Math.random()*120)-60}px

                )`

            }

        ],{

            duration:

            12000+Math.random()*10000,

            fill:"forwards"

        }).onfinish=move;

    }

    move();

}

createParticles();


/*======================================
    EMAIL GLOW
======================================*/

const email =

document.querySelector(".email");

if(email){

setInterval(()=>{

email.animate([

{

textShadow:

"0 0 0 rgba(79,166,108,0)"

},

{

textShadow:

"0 0 35px rgba(79,166,108,.65)"

},

{

textShadow:

"0 0 0 rgba(79,166,108,0)"

}

],{

duration:2500

});

},5000);

}


/*======================================
    REVIEW IMAGE HOVER
======================================*/

document.querySelectorAll(

".reviewThumbnail img"

).forEach(img=>{

img.style.transition="transform .6s ease";

img.parentElement.style.overflow="hidden";

img.parentElement.addEventListener(

"mouseenter",

()=>{

img.style.transform="scale(1.08)";

});

img.parentElement.addEventListener(

"mouseleave",

()=>{

img.style.transform="scale(1)";

});

});


/*======================================
    CONSOLE MESSAGE
======================================*/

console.clear();

console.log(

"%cSHNEEEV",

"font-size:30px;font-weight:bold;color:#83E7A2;"

);

console.log(

"%cTechnology. Naturally.",

"font-size:16px;color:white;"

);

console.log(

"%cBusiness: business@shneeev.com",

"font-size:14px;color:#83E7A2;"

);

console.log(

"%cThanks for checking out the source code.",

"font-size:14px;color:#9BA59E;"

);
