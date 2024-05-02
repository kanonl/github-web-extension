'use strict';

import { getCommits } from './modules/service.js';

let browser = chrome || browser;

(async () => await startup())();

browser.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
    let browser = chrome || browser;
    let { config } = await browser.storage.local.get('config');

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

browser.alarms.onAlarm.addListener(onAlarmEventHandler);

browser.notifications.onButtonClicked.addListener(async (url) => await browser.tabs.create({ active: true, url }));

async function onAlarmEventHandler(alarm) {
    let browser = chrome || browser;
    let { config } = await browser.storage.local.get('config');

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
                branch: commits.data[i].branch
            })
        }

        data.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Get new commits for notifications
        let notifications = data.filter(x => (new Date(x.date)).getTime() > config.updated);

        // Save new commit data and updated time to configuration
        config.updated = (data.length > 0) ? (new Date(data[0].date)).getTime() : Date.now();
        await browser.storage.local.set({ data, config });

        // Set new commits badge count & title
        updateBrowserActionBadgeText(notifications.length);
        setBrowserActionBadgeTitle(config.updated);

        // Create notifications
        createNewCommitNotifications(notifications);
    }
}

async function setAlarm(periodInMinutes) {
    let browser = chrome || browser;

    await browser.alarms.clearAll();
    await browser.alarms.create('github', { periodInMinutes });
    // await browser.alarms.create('alarm1', { periodInMinutes: periodInMinutes * 1.25 });
    await browser.alarms.create('alarm2', { periodInMinutes: periodInMinutes * 1.5 });
    // await browser.alarms.create('alarm3', { periodInMinutes: periodInMinutes * 1.75 });

    console.log(`[${(new Date()).toLocaleString()}] Alarm: ${periodInMinutes}`);
}

async function setBrowserActionBadgeTitle(updated) {
    let d = new Date(updated);
    await browser.action.setTitle({ title: d.toLocaleString() });
}

async function setBrowserActionBadgeText(text, backgroundColor, textColor) {
    let bColor = backgroundColor || '#28a745';
    let tColor = textColor || 'white';
    await browser.action.setBadgeText({ text });
    await browser.action.setBadgeBackgroundColor({ color: bColor });
    await browser.action.setBadgeTextColor({ color: tColor });
}

async function updateBrowserActionBadgeText(count) {
    if (count > 0) {
        await setBrowserActionBadgeText(count.toString());
    }
}

async function createNewCommitNotifications(notifications) {
    /*
        https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/notifications/NotificationOptions
        Firefox currently: only supports the type, title, message, and iconUrl properties; and the only supported value for type is 'basic'.
    */

    let browser = chrome || browser;

    for (let i = 0; i < notifications.length; i++) {
        let notificationOptions = {
            type: 'basic',
            iconUrl: notifications[i].avatar_url,
            title: notifications[i].branch,
            message: notifications[i].message,
            contextMessage: notifications[i].login + ' ' + (new Date(notifications[i].date)).toLocaleString(),
            buttons: [{ title: 'View Commit' }],
            eventTime: (new Date(notifications[i].date)).getTime()
        };

        try {
            await browser.notifications.create(notifications[i].commit_url, notificationOptions);
        }
        catch ({ message }) {
            // Firefox does not support notification buttons
            if (message.includes("buttons")) {
                delete notificationOptions.buttons;
                await browser.notifications.create(notifications[i].commit_url, notificationOptions);
            }
        }
    }
}

async function startup() {
    let browser = chrome || browser;
    let { config } = await browser.storage.local.get('config');

    if (config) {
        await setAlarm(parseFloat(config.refresh_interval));
    }
}
