'use strict';

import { getBranches } from '../modules/service.js';

let branches;
let browser = chrome || browser;

// Save
document.querySelector('form').addEventListener('submit', async function (e) {
    e.preventDefault();

    let access_token = document.querySelector("#accesstoken").value;
    let username = document.querySelector("#username").value;
    let refresh_interval = parseInt(document.querySelector("#interval").value);
    let track = await getRepoData({ access_token, username });

    let config = { access_token, username, refresh_interval, track };

    browser.storage.local.set({ config });
});

// Load
document.addEventListener('DOMContentLoaded', async function () {
    let { config } = await browser.storage.local.get('config');

    if (config) {
        document.querySelector("#accesstoken").value = config.access_token;
        document.querySelector("#username").value = config.username;
        document.querySelector("#interval").value = config.refresh_interval;

        if (config.track?.length > 0) {
            let template = document.querySelector("#reporow");
            config.track.forEach(t => {
                const clone = template.content.cloneNode(true);
                clone.querySelector('.organization').value = t.organization;
                clone.querySelector('.repository').value = t.repository;
                clone.querySelector('.branch').value = t.branch;
                clone.querySelector('.sha').innerHTML = t.sha;
                document.querySelector('.repos').appendChild(clone);
            });
        }
    }
});

// Add new tracking row
document.querySelector('#addRepo').addEventListener('click', function (e) {
    let template = document.querySelector("#reporow");
    const clone = template.content.cloneNode(true);
    document.querySelector('.repos').appendChild(clone);
});

const getRepoData = async (config) => {
    branches ??= await getBranches(config);
    let rows = document.querySelectorAll('.repos .row');
    let repos = [];
    rows.forEach(async row => {
        let organization = row.querySelector('.organization').value;
        let repository = row.querySelector('.repository').value;
        let branch = row.querySelector('.branch').value;
        let sha = branches.data.find(b => b.name === branch)?.commit.sha ?? '';

        if (organization.length == 0 || repository.length == 0) {
            return;
        }

        repos.push({ organization, repository, branch, sha });
    });
    return repos;
}