/******************** DATA ********************/
const videoSets = [
    {
        sources: ["3.mp4", "2.mp4", "1.mp4"],
        startTimes: [190, 13, 0],
        endTimes: [null, 70, null],
        subtitles: [
            "Im Wald von Katyn (1943)",
            "Menashe Kadishman, “Shalekhet” (Fallen Leaves), Jewish Museum, Berlin, Germany (2014)",
            "Exhumations in “Death Valley”, Poland (2024)"
        ],
        scale: [1.3, 1, 1.5]
    },
    {
        sources: ["6.mp4", "5.webm", "4.mp4"],
        startTimes: [0, 20, 0],
        endTimes: [null, 106, null],
        subtitles: [
            "Soltau Woods Mass Grave, Germany (1945)",
            "Bucha Atrocities, Ukraine (2022)",
            "A new mass grave from the 1994 Tutsi genocide was discovered in southern Rwanda (2023)"
        ],
        scale: [1, 2, 1]
    },
    {
        sources: ["9.mp4", "8.mp4", "7.mp4"],
        startTimes: [6, 262, 0],
        endTimes: [null, null, null],
        subtitles: [
            "Zimbabwean families seek proper burials for victims of 1980s violence (2024)",
            "The Forensic Anthropology Foundation of Guatemala/FAFG (2014)",
            "Kampuchea: Further mass graves from Pol Pot regime discovered near Phnom Penh (1980)"
        ],
        scale: [1.5, 1, 1]
    },
    {
        sources: ["10.mp4", null, null],
        startTimes: [10, null, null],
        endTimes: [80, null, null],
        subtitles: [
            "Exhumation of remains from mass grave in Srebrenica, 2006",
            null,
            null
        ],
        scale: [1.2, 1, 1]
    }
];

/******************** GLOBALS ********************/
const LOOP_INTERVAL = 90000;
let videoProgress = [0, 0, 0]; // current index in videoSets per panel
let completedPanels = [false, false, false];
let videosReady = 0;
let overlayActive = false;

/******************** SLIDERS ********************/
function updateSubtitlesFrame() {
    const subtitle1 = document.getElementById("subtitle1");
    const subtitle2 = document.getElementById("subtitle2");
    const subtitle3 = document.getElementById("subtitle3");

    subtitle1.style.left = "0%";
    subtitle1.style.right = `${100 - slider1Pct}%`;

    subtitle2.style.left = `${slider1Pct}%`;
    subtitle2.style.right = `${100 - slider2Pct}%`;

    subtitle3.style.left = `${slider2Pct}%`;
    subtitle3.style.right = "0%";
}

let slider1Pct = 33.33;
let slider2Pct = 66.66;

function setupBlindSlider(slider, targetId, isSecond = false) {
    const target = document.getElementById(targetId);
    let dragging = false;

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

        const rect = document.getElementById("videoWrapper").getBoundingClientRect();
        let offsetX = e.clientX - rect.left;
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
    });
}

setupBlindSlider(document.getElementById("slider1"), "video1");
setupBlindSlider(document.getElementById("slider2"), "video2", true);
updateSubtitlesFrame();

/******************** VIDEO PLAYBACK ********************/
function loadVideo(panelIndex) {
    // Already completed?
    if (videoProgress[panelIndex] >= videoSets.length) {
        completedPanels[panelIndex] = true;
        checkAllPanelsComplete();
        return;
    }

    // Search for next valid video for this panel
    let localIndex = videoProgress[panelIndex];
    let videoSet = null;
    while (localIndex < videoSets.length) {
        const candidate = videoSets[localIndex];
        if (candidate.sources[panelIndex]) {
            videoSet = candidate;
            console.log(`🎬 Panel ${panelIndex + 1} loading: ${videoSet.sources[panelIndex]}`);
            break;
        } else {
            localIndex++;
        }
    }

    if (!videoSet) {
        completedPanels[panelIndex] = true;
        checkAllPanelsComplete();
        return;
    }

    videoProgress[panelIndex] = localIndex + 1;

    const video = document.querySelector(`#video${panelIndex + 1} video`);
    const subtitle = document.getElementById(`subtitle${panelIndex + 1}`);

    video.pause();
    video.src = videoSet.sources[panelIndex];
    video.controls = false;
    video.load();

    video.style.transform = `scale(${videoSet.scale?.[panelIndex] || 1})`;
    video.style.transformOrigin = "center center";
    subtitle.style.opacity = 0;

    video.addEventListener("loadedmetadata", () => {
        video.currentTime = videoSet.startTimes[panelIndex] || 0;
        video.play();

        setTimeout(() => {
            const text = videoSet.subtitles[panelIndex] || "";
        
            const span = document.createElement("span");
            span.textContent = text;
            span.style.display = "inline-block";
            span.style.whiteSpace = "nowrap";
        
            // Clear existing
            subtitle.innerHTML = "";
            subtitle.appendChild(span);
        
            requestAnimationFrame(() => {
                const needsScroll = span.scrollWidth > subtitle.clientWidth;
                if (needsScroll) {
                    span.classList.add("scrolling");
                }
                subtitle.style.opacity = 1;
            });
        }, 200);

        monitorEnd(video, panelIndex, videoSet.endTimes[panelIndex]);

        if (localIndex === 0) checkIntroReady();
    }, { once: true });
}


function monitorEnd(video, panelIndex, endTime) {
    const checkInterval = 200;
    let lastTime = video.currentTime;
    let stalledCount = 0;

    const endCheck = setInterval(() => {
        if (video.readyState < 2) return; // not enough data to play

        // Detect stall
        if (video.currentTime === lastTime) {
            stalledCount++;
        } else {
            stalledCount = 0;
            lastTime = video.currentTime;
        }

        // If stalled for more than 3 seconds, advance anyway
        if (stalledCount > (3000 / checkInterval)) {
            console.warn(`⚠️ Video ${panelIndex + 1} appears stalled, advancing`);
            clearInterval(endCheck);
            video.pause();
            advancePanel(panelIndex);
            return;
        }

        if (endTime !== null && video.currentTime >= endTime) {
            clearInterval(endCheck);
            video.pause();
            advancePanel(panelIndex);
        }
    }, checkInterval);

    // Fallback timeout if no endTime (e.g., for 8.mp4)
    if (endTime === null) {
        setTimeout(() => {
            if (!video.paused && !video.ended) {
                console.warn(`⏱ Video ${panelIndex + 1} timed out via LOOP_INTERVAL`);
                clearInterval(endCheck);
                video.pause();
                advancePanel(panelIndex);
            }
        }, LOOP_INTERVAL);
    }
}

function advancePanel(panelIndex) {
    videoProgress[panelIndex]++;
    loadVideo(panelIndex);
}

function checkAllPanelsComplete() {
    if (completedPanels.every(Boolean)) {
        showCreditOverlay(() => {
            // Reset state to start another full loop
            videoProgress = [0, 0, 0];
            completedPanels = [false, false, false];

            // Restart all panels
            loadVideo(0);
            loadVideo(1);
            loadVideo(2);
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

let introReadyCount = 0;

function checkIntroReady() {
    introReadyCount++;
    if (introReadyCount === 3) runIntroSequence();
}

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
let currentAudioIndex = -1; // -1 means using backgroundAudio (2.mp4)

const bgAudio = document.getElementById("backgroundAudio");
bgAudio.loop = true;
bgAudio.volume = 1;
bgAudio.muted = false;

let userInteracted = false;
let audioReady = false;

// Step 1: Mark when audio is ready
bgAudio.addEventListener("canplaythrough", () => {
    console.log("🎧 backgroundAudio ready to play");
    audioReady = true;
    if (userInteracted) tryPlayBackgroundAudio();
});

// Step 2: Mark when user has clicked
window.addEventListener("click", () => {
    console.log("🟢 User interacted with page");
    userInteracted = true;
    if (audioReady) tryPlayBackgroundAudio();
}, { once: true });

// Step 3: Safe play wrapper
function tryPlayBackgroundAudio() {
    bgAudio.play()
        .then(() => {
            console.log("✅ backgroundAudio is playing");
            setAudioSource(-1);
        })
        .catch(err => {
            console.warn("❌ backgroundAudio play() failed", err);
        });
}


function setAudioSource(panelIndex) {
    const videos = [
        document.querySelector("#video1 video"),
        document.querySelector("#video2 video"),
        document.querySelector("#video3 video")
    ];

    // Mute all visible video panels
    videos.forEach(video => video.muted = true);

    if (panelIndex === -1) {
        // Use hidden background audio (2.mp4)
        bgAudio.muted = false;
        bgAudio.play().catch(err => {
            console.warn("⚠️ Failed to play background audio", err);
        });
    } else {
        // Use visible panel's audio
        bgAudio.pause();
        bgAudio.muted = true;
        videos[panelIndex].muted = false;
    }

    currentAudioIndex = panelIndex;
}

// BEGIN initial loading BEFORE intro sequence
loadVideo(0);
loadVideo(1);
loadVideo(2);
setAudioSource(-1); // play 2.mp4 by default

window.addEventListener("click", () => {
bgAudio.play()
});