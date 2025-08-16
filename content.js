let isLikingActive = false; 
let clickIntervalId = null; 
let pauseTimeoutId = null; 

/**
 * @returns {HTMLElement|null} 
 */
function findLikeButton() {
    let likeButton = document.querySelector('div.tiktok-1cu4ad.e1tv929b3');
    if (likeButton) {
        console.log("Found like button via specific div class names: .tiktok-1cu4ad.e1tv929b3");
        return likeButton;
    }
    const potentialLikeButtons = document.querySelectorAll(
        'div[role="button"][aria-label*="Like" i]:has(svg)'
    );

    for (const btn of potentialLikeButtons) {
       
        const svgContent = btn.innerHTML;
        if (
            svgContent.includes('heart') ||
            svgContent.includes('M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z') || // Common heart SVG path
            svgContent.includes('path d="M12 20.35l-1.45-1.32C5.4 14.36 2 11.28 2 7.5 2 4.42 4.42 2 7.5 2c1.74 0 3.41.81 4.5 2.09C13.09 2.81 14.76 2 16.5 2 19.58 2 22 4.42 22 7.5c0 3.78-3.4 6.86-8.55 11.54L12 20.35z"') // Another common heart SVG path variation
        ) {
            console.log("Found like button via aria-label and verified SVG heart content (fallback).");
            return btn;
        }
    }

    const genericDivsWithSvg = document.querySelectorAll('div[role="button"]:has(svg)');
    for (const btn of genericDivsWithSvg) {
        const svgContent = btn.innerHTML;
        if (
            svgContent.includes('heart') ||
            svgContent.includes('M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z') ||
            svgContent.includes('path d="M12 20.35l-1.45-1.32C5.4 14.36 2 11.28 2 7.5 2 4.42 4.42 2 7.5 2c1.74 0 3.41.81 4.5 2.09C13.09 2.81 14.76 2 16.5 2 19.58 2 22 4.42 22 7.5c0 3.78-3.4 6.86-8.55 11.54L12 20.35z"')
        ) {
            console.log("Found like button via generic SVG heart pattern (fallback).");
            return btn;
        }
    }

    console.warn("TikTok Auto Liker: Could not find a definitive like button using any known selectors.");
    return null;
}

/**
 * @returns {boolean} 
 */
function clickLikeButton() {
    const likeButton = findLikeButton();
    if (likeButton) {
        likeButton.click();
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
    //DURATION
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
