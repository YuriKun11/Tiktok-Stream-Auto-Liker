let isLikingActive = false; 
let clickIntervalId = null; 
let pauseTimeoutId = null; 

/**
 * @returns {HTMLElement|null} 
 */
function findLikeButton() {
    const newLikeButtons = document.querySelectorAll(
        'div.cursor-pointer svg path'
    );

    for (const path of newLikeButtons) {
        const d = path.getAttribute("d");
        if (d && d.startsWith("M24 9.44c3.2-4.03")) {
            console.log("Found like button via new TikTok UI heart SVG path.");
            return path.closest("div.cursor-pointer");
        }
    }

    const potentialLikeButtons = document.querySelectorAll(
        'div[role="button"][aria-label*="Like" i]:has(svg)'
    );

    for (const btn of potentialLikeButtons) {
        const svgs = btn.querySelectorAll("svg path");
        for (const path of svgs) {
            const d = path.getAttribute("d");
            if (d && (d.includes("M12 21.35") || d.includes("M12 20.35"))) {
                console.log("Found like button via aria-label + SVG heart fallback.");
                return btn;
            }
        }
    }
    
    const genericDivs = document.querySelectorAll('div.cursor-pointer svg path');
    for (const path of genericDivs) {
        const d = path.getAttribute("d");
        if (d && (d.includes("M12 21.35") || d.includes("M12 20.35"))) {
            console.log("Found like button via generic SVG path fallback.");
            return path.closest("div.cursor-pointer");
        }
    }

    console.warn("TikTok Auto Liker: Could not find a like button.");
    return null;
}

/**
 * @returns {boolean} 
 */
function clickLikeButton() {
    const likeButton = findLikeButton();
    if (likeButton) {
        // Use safer event dispatching
        const event = new MouseEvent("click", { bubbles: true, cancelable: true, view: window });
        likeButton.dispatchEvent(event);
        return true;
    } else {
        return false;
    }
}

function startLikingLoop() {
    if (!isLikingActive) {
        console.log("TikTok Auto Liker: Liking loop stopped externally.");
        return;
    }

    console.log("TikTok Auto Liker: Starting a liking burst.");
    // DURATION SETTINGS
    const LIKING_DURATION_SECONDS = 5; 
    const CLICK_INTERVAL_MS = 40; 

    let clicksMadeInBurst = 0;
    const maxClicksInBurst = Math.floor((LIKING_DURATION_SECONDS * 1000) / CLICK_INTERVAL_MS);

    if (clickIntervalId) {
        clearInterval(clickIntervalId);
    }

    clickIntervalId = setInterval(() => {
        if (isLikingActive && clicksMadeInBurst < maxClicksInBurst) {
            if (clickLikeButton()) { 
                clicksMadeInBurst++;
            }
        } else {
            clearInterval(clickIntervalId); 
            clickIntervalId = null;

            if (isLikingActive) {
                const PAUSE_DURATION_SECONDS = 5; 
                console.log(`TikTok Auto Liker: ${LIKING_DURATION_SECONDS}-second burst finished. Pausing for ${PAUSE_DURATION_SECONDS} seconds.`);

                if (pauseTimeoutId) {
                    clearTimeout(pauseTimeoutId);
                }
                pauseTimeoutId = setTimeout(() => {
                    pauseTimeoutId = null; 
                    if (isLikingActive) {
                        console.log("TikTok Auto Liker: Pause finished. Restarting liking burst.");
                        startLikingLoop(); 
                    } else {
                        console.log("TikTok Auto Liker: Liking loop stopped during pause.");
                    }
                }, PAUSE_DURATION_SECONDS * 1000); 
            } else {
                console.log("TikTok Auto Liker: Liking burst stopped externally.");
            }
        }
    }, CLICK_INTERVAL_MS); 
}

function startLiking() {
    if (isLikingActive) return; 
    isLikingActive = true;
    chrome.storage.local.set({ isLikingActive: true }); 
    console.log("TikTok Auto Liker: Activated.");
    startLikingLoop(); 
}

function stopLiking() {
    if (!isLikingActive) return; 
    isLikingActive = false;
    chrome.storage.local.set({ isLikingActive: false }); 
    console.log("TikTok Auto Liker: Deactivated.");
    
    if (clickIntervalId) {
        clearInterval(clickIntervalId);
        clickIntervalId = null;
    }
    if (pauseTimeoutId) {
        clearTimeout(pauseTimeoutId);
        pauseTimeoutId = null;
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "startLiking") {
        startLiking();
        sendResponse({ status: "active", message: "Status: Active (Liking...)" });
    } else if (request.action === "stopLiking") {
        stopLiking();
        sendResponse({ status: "inactive", message: "Status: Inactive" });
    } else if (request.action === "checkStatus") {
        if (isLikingActive) {
            sendResponse({ status: "active", message: "Status: Active (Liking...)" });
        } else {
            sendResponse({ status: "inactive", message: "Status: Inactive" });
        }
    }
   
    return true;
});

chrome.storage.local.get('isLikingActive', (data) => {
    if (data.isLikingActive) {
        console.log("TikTok Auto Liker: Resuming based on stored state.");
        startLiking();
    } else {
        console.log("TikTok Auto Liker: Initialized. Currently inactive.");
    }
});
