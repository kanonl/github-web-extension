'use strict';

import { getCommits } from './modules/service.js';

(async () => await startup())();

chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
    let { config } = await chrome.storage.local.get('config');

    if (request.sender === 'options') {
        if (request.event === 'OPTIONS_SAVE') {
            await onAlarmEventHandler();
            console.log('Configuration updated.');
        }
    }

    if (request.sender === 'popup') {
        if (request.event === 'SET_BADGE_TEXT') {
            await setBrowserActionBadgeText(request.data);
        }

        if (request.event === 'LAST_UPDATED') {
            return config.updated;
        }
    }
});

chrome.alarms.onAlarm.addListener(onAlarmEventHandler);

chrome.notifications.onButtonClicked.addListener(async (url) => await chrome.tabs.create({ active: true, url }));

async function onAlarmEventHandler(alarm) {
    let { config } = await chrome.storage.local.get('config');

    let commits = await getCommits(config);

    if (commits.ok) {
        let data = [];
        for (let i = 0; i < commits.data.length; i++) {
            data.push({
                login: commits.data[i].author?.login,
                name: commits.data[i].commit.author?.name,
                date: commits.data[i].commit.author?.date,
                message: commits.data[i].commit.message,
                html_url: commits.data[i].author?.html_url,
                avatar_url: commits.data[i].author?.avatar_url,
                commit_url: commits.data[i].html_url,
                label: commits.data[i].label
            })
        }

        data.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Get new commits for notifications
        let notifications = data.filter(x => (new Date(x.date)).getTime() > config.updated);

        // Save new commit data and updated time to configuration
        config.updated = (data.length > 0) ? (new Date(data[0].date)).getTime() : Date.now();
        await chrome.storage.local.set({ data, config });

        // Set new commits badge count & title
        updateBrowserActionBadgeText(notifications.length);
        setBrowserActionBadgeTitle(Date.now());

        // Create notifications
        createNewCommitNotifications(notifications);
    }
}

async function setAlarm(periodInMinutes) {
    await chrome.alarms.clearAll();
    await chrome.alarms.create('github', { periodInMinutes });
    // await chrome.alarms.create('alarm1', { periodInMinutes: periodInMinutes * 1.25 });
    await chrome.alarms.create('alarm2', { periodInMinutes: periodInMinutes * 1.5 });
    // await chrome.alarms.create('alarm3', { periodInMinutes: periodInMinutes * 1.75 });

    console.log(`[${(new Date()).toLocaleString()}] Alarm: ${periodInMinutes}`);
}

async function setBrowserActionBadgeTitle(updated) {
    let d = new Date(updated);
    await chrome.action.setTitle({ title: d.toLocaleString() });
}

async function setBrowserActionBadgeText(text, backgroundColor, textColor) {
    let bColor = backgroundColor || '#28a745';
    let tColor = textColor || 'white';

    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color: bColor });
    await chrome.action.setBadgeTextColor({ color: tColor });
}

async function updateBrowserActionBadgeText(count) {
    if (count > 0) {
        let badgeText = await chrome.action.getBadgeText({});
        if (badgeText && badgeText.length > 0) {
            console.log('count', `>${count}<`, 'badgeText', `>${badgeText}<`);
            count += parseInt(badgeText);
        }

        await setBrowserActionBadgeText(isNaN(count) ? '' : count.toString());
    }
}

async function createNewCommitNotifications(notifications) {
    /*
        https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/notifications/NotificationOptions
        Firefox currently: only supports the type, title, message, and iconUrl properties; and the only supported value for type is 'basic'.
    */

    for (let i = 0; i < notifications.length; i++) {
        let notificationOptions = {
            type: 'basic',
            iconUrl: notifications[i].avatar_url,
            title: notifications[i].label,
            message: notifications[i].message,
            contextMessage: notifications[i].login + ' ' + (new Date(notifications[i].date)).toLocaleString(),
            buttons: [{ title: 'View Commit' }],
            eventTime: (new Date(notifications[i].date)).getTime()
        };

        try {
            await chrome.notifications.create(notifications[i].commit_url, notificationOptions);
        }
        catch ({ message }) {
            // Firefox does not support notification buttons
            if (message.includes("buttons")) {
                delete notificationOptions.buttons;
                await chrome.notifications.create(notifications[i].commit_url, notificationOptions);
            }
        }
    }
}

async function startup() {
    let { config } = await chrome.storage.local.get('config');

    if (config) {
        await setAlarm(parseFloat(config.refresh_interval));
        await onAlarmEventHandler({});
    }
}
