'use strict';

(async () => {

    let browser = chrome || browser;
    let { data } = await browser.storage.local.get('data');

    if (!data) {
        browser.runtime.openOptionsPage();
        return;
    }

    await setLastUpdated();
    await clearBadgeText();

    for (let i = 0; i < data.length; i++) {
        let { login, name, date, message, html_url, avatar_url, branch, commit_url } = data[i];
        let template = document.querySelector("#commititem");
        const clone = template.content.cloneNode(true);

        let authorEl = clone.querySelector('.author');
        let commitEl = clone.querySelector('.commit');
        let branchEl = clone.querySelector('.branch');

        commitEl.querySelector('.commit-message').innerHTML = message;
        commitEl.querySelector('.commit-message').addEventListener('click', async (event) => await browser.tabs.create({ active: true, url: commit_url }));

        if (login && html_url && avatar_url) {
            authorEl.querySelector('a').innerHTML = login;
            authorEl.querySelector('a').href = html_url;
            authorEl.querySelector('img').src = avatar_url;
        }
        else {
            authorEl.querySelector('a').innerHTML = name;
            authorEl.querySelector('img').src = 'https://github.githubassets.com/images/gravatars/gravatar-user-420.png?size=32';
        }

        let commitDate = (new Date(date)).toLocaleString();
        authorEl.querySelector('span.date').innerHTML = commitDate;
        authorEl.querySelector('span.date').title = commitDate;
        branchEl.innerHTML = branch;

        document.querySelector('main').appendChild(clone);
    }

    async function setLastUpdated() {
        let lastUpdated = await browser.runtime.sendMessage({ sender: 'popup', event: 'LAST_UPDATED' });
        let d = new Date(lastUpdated);
        document.querySelector('.last-updated').innerHTML = `Updated: ${d.toLocaleString()}`;
    }

    async function clearBadgeText() {
        let badgeText = await browser.action.getBadgeText({});
        if (badgeText !== '') {
            await browser.runtime.sendMessage({ sender: 'popup', event: 'SET_BADGE_TEXT', data: '' });
        }
    }

})();