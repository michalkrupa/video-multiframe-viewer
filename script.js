    /******************** DATA ********************/
    const videoSets = [
        {
            sources: ["3.mp4", "2.mp4", "1.mp4"],
            startTimes: [190, 13, 0],
            endTimes: [200, null, null],
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
            endTimes: [null, null, null],
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
        }
    ];
    
    /******************** GLOBALS ********************/
    let currentSet      = 0;
    let slider1Pct      = 33.33;
    let slider2Pct      = 66.66;
    let videosReady     = 0;   // count loadeddata events
    
    let creditsShown    = false; // show credits only once
    let overlayActive   = false; // blocks swap loop while overlay is up
    
    /******************** SLIDERS ********************/
    function updateSubtitlesFrame() {
        const subtitle1 = document.getElementById("subtitle1");
        const subtitle2 = document.getElementById("subtitle2");
        const subtitle3 = document.getElementById("subtitle3");
        
        subtitle1.style.left  = "0%";
        subtitle1.style.right = `${100 - slider1Pct}%`;
        
        subtitle2.style.left  = `${slider1Pct}%`;
        subtitle2.style.right = `${100 - slider2Pct}%`;
        
        subtitle3.style.left  = `${slider2Pct}%`;
        subtitle3.style.right = "0%";
    }
    
    function setupBlindSlider(slider, targetId, isSecond = false) {
        const target   = document.getElementById(targetId);
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
            
            const rect    = document.getElementById("videoWrapper").getBoundingClientRect();
            let offsetX   = e.clientX - rect.left;
            offsetX       = Math.max(0, Math.min(offsetX, rect.width));
            const pct     = (offsetX / rect.width) * 100;
            
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
    
    /******************** VIDEO MANAGEMENT ********************/
    function loadVideoSet(setIndex) {
        const set     = videoSets[setIndex];
        const layers  = [
            document.getElementById("video1"),
            document.getElementById("video2"),
            document.getElementById("video3")
        ];
        const videos     = layers.map(layer => layer.querySelector("video"));
        const subtitles  = [
            document.getElementById("subtitle1"),
            document.getElementById("subtitle2"),
            document.getElementById("subtitle3")
        ];
        
        currentSet = setIndex;
        
        videos.forEach((video, i) => {
            video.pause();
            video.src = set.sources[i];
            video.load();
            
            video.style.transform = `scale(${set.scale?.[i] || 1})`;
            video.style.transformOrigin = "center center";
            
            subtitles[i].style.opacity = 0;
            
            video.addEventListener("loadedmetadata", () => {
                video.currentTime = set.startTimes[i];
                video.play();
                
                setTimeout(() => {
                    subtitles[i].textContent = set.subtitles[i];
                    subtitles[i].style.opacity = 1;
                }, 200); // subtle sync delay
            }, { once: true });
        });
    }
    
    function showCreditOverlay(next) {
        overlayActive = true;
        const creditOverlay = document.getElementById("creditOverlay");
        creditOverlay.style.opacity = 1;  // fade in over 2s
        // Hold 4 seconds after fade-in begins
        setTimeout(() => {
            creditOverlay.style.opacity = 0; // fade out 2s
            setTimeout(() => {
                creditOverlay.remove();
                overlayActive = false;
                if (typeof next === "function") next();
            }, 2000); // wait fade-out
        }, 4000);
    }
    
    function swapVideosLoop() {
        const LOOP_INTERVAL = 90000; // 90 seconds
        setInterval(() => {
            if (overlayActive) return; // don't switch while overlay is up
            
            const nextSet = (currentSet + 1) % videoSets.length;
            
            if (nextSet === 0 && !creditsShown) {
                creditsShown = true;
                showCreditOverlay(() => {
                    loadVideoSet(nextSet);
                });
            } else {
                loadVideoSet(nextSet);
            }
        }, LOOP_INTERVAL);
    }
    
    /******************** INTRO SEQUENCE ********************/
    const titleOverlay = document.getElementById("titleOverlay");
    const introOverlay = document.getElementById("introOverlay");
    const videoWrapper = document.getElementById("videoWrapper");
    
    document.querySelectorAll("video").forEach(video => {
        video.addEventListener("loadeddata", () => {
            videosReady++;
            if (videosReady >= 3) runIntroSequence();
        });
    });
    
    // Pre‑load first set (keeps buffers warm)
    loadVideoSet(0);
    
    function runIntroSequence() {
        // Title is already visible. Hold 4 s, then fade out.
        setTimeout(() => {
            titleOverlay.style.opacity = 0;
            // After fade (2 s)
            setTimeout(() => {
                titleOverlay.remove();
                // Fade IN content‑warning
                introOverlay.style.opacity = 1;
                // Hold content‑warning 4 s
                setTimeout(() => {
                    introOverlay.style.opacity = 0;
                    // After fade (2 s)
                    setTimeout(() => {
                        introOverlay.remove();
                        videoWrapper.style.opacity = 1;
                        // Finally show videos and kick off loop
                        document.querySelectorAll(".video-layer").forEach(layer => {
                            layer.style.opacity = 1;
                        });
                        swapVideosLoop();
                    }, 2000);
                }, 4000);
            }, 2000);
        }, 1000); // small buffer once all videos buffered
    }