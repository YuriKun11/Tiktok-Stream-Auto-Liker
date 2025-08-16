document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.getElementById('toggleButton');
    const statusDiv = document.getElementById('status');

    function updateStatusUI(isActive, message = '') {
        if (isActive) {
            statusDiv.textContent = message || 'Status: Active (Liking...)';
            statusDiv.className = 'status-active';
            toggleButton.textContent = 'Stop Auto Liking';
            toggleButton.style.backgroundColor = '#dc3545';
            toggleButton.disabled = false;
        } else {
            statusDiv.textContent = message || 'Status: Inactive';
            statusDiv.className = 'status-inactive';
            toggleButton.textContent = 'Start Auto Liking';
            toggleButton.style.backgroundColor = '#fe2c55';
            toggleButton.disabled = false;
        }
    }

    async function sendMessageToContentScript(action) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab || !tab.id || !tab.url || !tab.url.includes("tiktok.com")) {
            updateStatusUI(false, 'Status: Please go to a TikTok live stream page.');
            toggleButton.style.backgroundColor = '#999';
            toggleButton.disabled = true;
            return null;
        }

        try {
            const response = await chrome.tabs.sendMessage(tab.id, { action: action });
            if (response && response.status) {
                updateStatusUI(response.status === "active", response.message || '');
            }
            return response;
        } catch (error) {
            updateStatusUI(false, 'Status: Initializing...');
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                });
                const response = await chrome.tabs.sendMessage(tab.id, { action: action });
                if (response && response.status) {
                    updateStatusUI(response.status === "active", response.message || '');
                }
                return response;
            } catch (injectionError) {
                updateStatusUI(false, 'Status: Error initializing. Not on TikTok live?');
                toggleButton.style.backgroundColor = '#999';
                toggleButton.disabled = true;
                return null;
            }
        }
    }

    sendMessageToContentScript("checkStatus");

    toggleButton.addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab || !tab.id || !tab.url || !tab.url.includes("tiktok.com")) {
            updateStatusUI(false, 'Status: Please go to a TikTok live stream page.');
            toggleButton.style.backgroundColor = '#999';
            toggleButton.disabled = true;
            return;
        }

        const response = await sendMessageToContentScript("checkStatus");
        if (response && response.status) {
            const newAction = (response.status === "active") ? "stopLiking" : "startLiking";
            sendMessageToContentScript(newAction);
        } else {
            sendMessageToContentScript("startLiking");
        }
    });

    chrome.tabs.onActivated.addListener(() => {
        sendMessageToContentScript("checkStatus");
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (tab.active && changeInfo.status === 'complete') {
            sendMessageToContentScript("checkStatus");
        }
    });
});
