'use strict';

(async () => {

    let { data } = await chrome.storage.local.get('data');

    if (!data) {
        chrome.runtime.openOptionsPage();
        return;
    }

    await setLastUpdated();
    await clearBadgeText();

    for (let i = 0; i < data.length; i++) {
        let { avatar_url, commit_url, date, html_url, label, login, message, name } = data[i];
        let template = document.querySelector("#commititem");
        const clone = template.content.cloneNode(true);

        let authorEl = clone.querySelector('.author');
        let commitEl = clone.querySelector('.commit');
        let branchEl = clone.querySelector('.branch');

        commitEl.querySelector('.commit-message').innerHTML = message;
        commitEl.querySelector('.commit-message').addEventListener('click', async (event) => await chrome.tabs.create({ active: true, url: commit_url }));

        if (login && html_url && avatar_url) {
            authorEl.querySelector('a').innerHTML = login;
            authorEl.querySelector('a').href = html_url;
            authorEl.querySelector('img').src = avatar_url;
            authorEl.querySelector('img').title = name;
        }
        else {
            authorEl.querySelector('a').innerHTML = name;
            authorEl.querySelector('img').src = 'https://github.githubassets.com/images/gravatars/gravatar-user-420.png?size=32';
        }

        let commitDate = (new Date(date)).toLocaleString();
        authorEl.querySelector('span.date').innerHTML = commitDate;
        authorEl.querySelector('span.date').title = commitDate;
        branchEl.innerHTML = label;

        document.querySelector('main').appendChild(clone);
    }

    async function setLastUpdated() {
        let lastUpdated = await chrome.runtime.sendMessage({ sender: 'popup', event: 'LAST_UPDATED' });
        let d = new Date(lastUpdated);
        document.querySelector('.last-updated').innerHTML = `Updated: ${d.toLocaleString()}`;
    }

    async function clearBadgeText() {
        let badgeText = await chrome.action.getBadgeText({});
        if (badgeText !== '') {
            await chrome.runtime.sendMessage({ sender: 'popup', event: 'SET_BADGE_TEXT', data: '' });
        }
    }

})();