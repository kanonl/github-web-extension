'use strict';

import { getCommits } from './modules/service.js';

(async () => {

  let browser = chrome || browser;
  let { config } = await browser.storage.local.get('config');

  setAlarm(config.refresh_interval);

  browser.alarms.onAlarm.addListener(async () => {
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
      config.updated = Date.now(); console.log(config);
      await browser.storage.local.set({ data, config });

      // Create notifications
      for (let i = 0; i < notifications.length; i++) {
        await browser.notifications.create(notifications[i].commit_url, {
          type: 'basic',
          iconUrl: notifications[i].avatar_url,
          title: notifications[i].branch,
          message: notifications[i].message,
          contextMessage: notifications[i].login + ' ' + (new Date(notifications[i].date)).toLocaleString(),
          buttons: [{ title: 'View Commit' }],
          priority: 0
        });
      }
    }
  });

  browser.notifications.onButtonClicked.addListener(async (url) => {
    await browser.tabs.create({ active: true, url });
  });

  function setAlarm(periodInMinutes) {
    clearAlarm();

    browser.alarms.create({ periodInMinutes });
  }

  function clearAlarm() {
    browser.alarms.clearAll();
  }

})();