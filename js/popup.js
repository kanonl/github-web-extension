'use strict';

(async () => {

  let browser = chrome || browser;
  let { data } = await browser.storage.local.get('data');

  for (let i = 0; i < data.length; i++) {
    let { login, name, date, message, html_url, avatar_url, branch } = data[i];
    let template = document.querySelector("#commititem");
    const clone = template.content.cloneNode(true);

    let authorEl = clone.querySelector('.author');
    let commitEl = clone.querySelector('.commit');
    let branchEl = clone.querySelector('.branch');

    commitEl.querySelector('.commit-message').innerHTML = message;

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

})();