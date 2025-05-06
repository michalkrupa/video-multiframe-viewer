/******************** DATA ********************/
const videoSets = [
    {
        sources: ["videos/1.mp4", "videos/2.mp4", "videos/3.mp4"],
        startTimes: [0, 0, 0],
        endTimes: [null, null, null],
        subtitles: [
            "Subtitle 1",
            "Subtitle 2",
            "Subtitle 3"
        ],
        scale: [1, 1, 1]
    },
    {
        sources: ["videos/4.mp4", "videos/5.mp4", "videos/6.mp4"],
        startTimes: [0, 0, 0],
        endTimes: [null, null, null],
        subtitles: [
            "Subtitle 4",
            "Subtitle 5",
            "Subtitle 6"
        ],
        scale: [1, 2, 1]
    },
    {
        sources: ["videos/7.mp4", "videos/8.mp4", "videos/9.mp4"],
        startTimes: [0, 0, 0],
        endTimes: [null, null, null],
        subtitles: [
            "Subtitle 7",
            "Subtitle 8",
            "Subtitle 9"
        ],
        scale: [1, 1, 1]
    },
    {
        sources: ["videos/10.mp4", null, null],
        startTimes: [0, null, null],
        endTimes: [null, null, null],
        subtitles: [
            "Subtitle 10",
            null,
            null
        ],
        scale: [1, 1, 1]
    }
];


/******************** GLOBALS ********************/
const LOOP_INTERVAL = 90000;
let videoProgress = [0, 0, 0];
let completedPanels = [false, false, false];
let introFlags = [false, false, false];
let overlayActive = false;
let introReadyCount = 0;
let introStarted = false;
let hasLooped = [false, false, false];
let creditsShown = false;
const loopForever = true; // or false

/******************** SLIDERS ********************/
let slider1Pct = 33.33;
let slider2Pct = 66.66;

function updateSubtitlesFrame() {
    document.getElementById("subtitle1").style.left = "0%";
    document.getElementById("subtitle1").style.right = `${100 - slider1Pct}%`;
    document.getElementById("subtitle2").style.left = `${slider1Pct}%`;
    document.getElementById("subtitle2").style.right = `${100 - slider2Pct}%`;
    document.getElementById("subtitle3").style.left = `${slider2Pct}%`;
    document.getElementById("subtitle3").style.right = "0%";
}

function setupBlindSlider(slider, targetId, isSecond = false) {
    const target = document.getElementById(targetId);
    let dragging = false;

    function updateSliderPosition(clientX) {
        const rect = document.getElementById("videoWrapper").getBoundingClientRect();
        let offsetX = clientX - rect.left;
        offsetX = Math.max(0, Math.min(offsetX, rect.width));
        const pct = (offsetX / rect.width) * 100;

        slider.style.left = pct + "%";

        if (isSecond) {
            slider2Pct = pct;
            target.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
        } else {
            slider1Pct = pct;
            target.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
        }

        updateSubtitlesFrame();
    }

    slider.addEventListener("mousedown", () => {
        dragging = true;
        document.body.style.cursor = "ew-resize";
    });
    window.addEventListener("mouseup", () => {
        dragging = false;
        document.body.style.cursor = "";
    });
    window.addEventListener("mousemove", e => {
        if (!dragging) return;
        updateSliderPosition(e.clientX);
    });

    slider.addEventListener("touchstart", () => {
        dragging = true;
    });
    window.addEventListener("touchend", () => {
        dragging = false;
    });
    window.addEventListener("touchmove", e => {
        if (!dragging || e.touches.length === 0) return;
        updateSliderPosition(e.touches[0].clientX);
    });
}

setupBlindSlider(document.getElementById("slider1"), "video1");
setupBlindSlider(document.getElementById("slider2"), "video2", true);
updateSubtitlesFrame();

/******************** VIDEO PLAYBACK ********************/
function loadVideo(panelIndex) {
    const video = document.querySelector(`#video${panelIndex + 1} video`);
    const subtitle = document.getElementById(`subtitle${panelIndex + 1}`);

    while (videoProgress[panelIndex] < videoSets.length) {
        const candidate = videoSets[videoProgress[panelIndex]];
        const src = candidate.sources[panelIndex];

        if (!src) {
            videoProgress[panelIndex]++;
            continue;
        }

        console.log(`🎬 Panel ${panelIndex + 1} loading: ${src}`);

        video.pause();
        video.src = src;
        video.controls = false;
        video.load();

        video.style.transform = `scale(${candidate.scale?.[panelIndex] || 1})`;
        video.style.transformOrigin = "center center";
        subtitle.style.opacity = 0;

        video.addEventListener("loadedmetadata", () => {
            video.currentTime = candidate.startTimes[panelIndex] || 0;
            video.play();

            videoProgress[panelIndex]++;

            setTimeout(() => {
                const text = candidate.subtitles[panelIndex] || "";
                const span = document.createElement("span");
                span.textContent = text;
                span.style.display = "inline-block";
                span.style.whiteSpace = "nowrap";

                subtitle.innerHTML = "";
                subtitle.appendChild(span);

                requestAnimationFrame(() => {
                    const needsScroll = span.scrollWidth > subtitle.clientWidth;
                    if (needsScroll) span.classList.add("scrolling");
                    subtitle.style.opacity = 1;
                });
            }, 200);

            monitorEnd(video, panelIndex, candidate.endTimes[panelIndex]);

            if (!introFlags[panelIndex]) {
                introFlags[panelIndex] = true;
                checkIntroReady();
            }
        }, { once: true });

        return;
    }

    // Reached end of videoSets: loop and flag completion
    hasLooped[panelIndex] = true;
    videoProgress[panelIndex] = 0;
    checkLoopComplete();
    loadVideo(panelIndex);
}


function checkIntroReady() {
    introReadyCount++;
    if (introReadyCount >= 3 && !introStarted) {
        introStarted = true;
        runIntroSequence();
    }
}

function monitorEnd(video, panelIndex, endTime) {
    const checkInterval = 200;
    let lastTime = video.currentTime;
    let stalledCount = 0;
    let finished = false;

    const endCheck = setInterval(() => {
        if (finished || video.readyState < 2) return;

        if (video.currentTime === lastTime) {
            stalledCount++;
        } else {
            stalledCount = 0;
            lastTime = video.currentTime;
        }

        if (stalledCount > (3000 / checkInterval)) finish();
        if (endTime !== null && video.currentTime >= endTime) finish();
    }, checkInterval);

    const fallback = setTimeout(() => {
        if (!finished) finish();
    }, LOOP_INTERVAL);

    function finish() {
        if (finished) return;
        finished = true;
        clearInterval(endCheck);
        clearTimeout(fallback);
        video.pause();
        loadVideo(panelIndex);
    }
}


function advancePanel(panelIndex) {
    loadVideo(panelIndex);
}

function checkLoopComplete() {
    if (!creditsShown && hasLooped.every(Boolean)) {
        creditsShown = true;
        showCreditOverlay(() => {
            if (loopForever) {
                // Reset and loop again
                videoProgress = [0, 0, 0];
                hasLooped = [false, false, false];
                creditsShown = false;
                loadVideo(0);
                loadVideo(1);
                loadVideo(2);
            } else {
                console.log("🛑 Loop finished. Halting playback.");
            }
        });
    }
}

/******************** OVERLAYS ********************/
function showCreditOverlay(next) {
    overlayActive = true;
    const creditOverlay = document.getElementById("creditOverlay");
    creditOverlay.style.opacity = 1;
    setTimeout(() => {
        creditOverlay.style.opacity = 0;
        setTimeout(() => {
            creditOverlay.remove();
            overlayActive = false;
            if (typeof next === "function") next();
        }, 2000);
    }, 7000);
}

/******************** INTRO SEQUENCE ********************/
const titleOverlay = document.getElementById("titleOverlay");
const introOverlay = document.getElementById("introOverlay");
const videoWrapper = document.getElementById("videoWrapper");

function runIntroSequence() {
    setTimeout(() => {
        titleOverlay.style.opacity = 0;
        setTimeout(() => {
            titleOverlay.remove();
            introOverlay.style.opacity = 1;
            setTimeout(() => {
                introOverlay.style.opacity = 0;
                setTimeout(() => {
                    introOverlay.remove();
                    videoWrapper.style.opacity = 1;
                    document.querySelectorAll(".video-layer").forEach(layer => {
                        layer.style.opacity = 1;
                    });
                }, 2000);
            }, 4000);
        }, 2000);
    }, 1000);
}

/******************** AUDIO MANAGEMENT ********************/
let currentAudioIndex = -1; // -1 = using background audio
const bgAudio = document.getElementById("backgroundAudio");
bgAudio.volume = 1;
bgAudio.muted = false;
bgAudio.loop = true;

let audioReady = false;
let userInteracted = false;

// Step 1: Mark audio as ready
bgAudio.addEventListener("canplaythrough", () => {
    console.log("🎧 backgroundAudio ready");
    audioReady = true;
    if (userInteracted) tryPlayBackgroundAudio();
});

// Step 2: On first user interaction, start audio
window.addEventListener("click", () => {
    userInteracted = true;
    if (audioReady) tryPlayBackgroundAudio();
}, { once: true });

// Step 3: Safe play wrapper
function tryPlayBackgroundAudio() {
    bgAudio.muted = false;
    bgAudio.play()
        .then(() => {
            console.log("✅ backgroundAudio is playing");
            setAudioSource(-1);
        })
        .catch(err => {
            console.warn("❌ Failed to play backgroundAudio:", err);
        });
}

// Step 4: Audio switcher function
function setAudioSource(panelIndex) {
    const videos = [
        document.querySelector("#video1 video"),
        document.querySelector("#video2 video"),
        document.querySelector("#video3 video")
    ];

    videos.forEach(video => video.muted = true);

    if (panelIndex === -1) {
        bgAudio.muted = false;
        bgAudio.play().catch(err => {
            console.warn("⚠️ Failed to resume background audio", err);
        });
    } else {
        bgAudio.pause();
        bgAudio.muted = true;
        videos[panelIndex].muted = false;
    }

    currentAudioIndex = panelIndex;
}

// Optional: allow clicking any panel to switch audio focus
["video1", "video2", "video3"].forEach((id, idx) => {
    document.getElementById(id).addEventListener("click", () => {
        if (currentAudioIndex === idx) {
            setAudioSource(-1); // toggle back to background
        } else {
            setAudioSource(idx);
        }
    });
});


// Start loading videos right away
loadVideo(0);
loadVideo(1);
loadVideo(2);
