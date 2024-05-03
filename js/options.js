'use strict';

import { getBranches, getRepositories } from '../modules/service.js';

let config;
let branches;
let repositories;

async function loadBranches(e) {
    let branches = await getBranches(e.target.value, config);
    let select = this.parentNode.parentNode.parentNode.querySelector('.form-select.branch');
    if (branches.ok) {
        select.innerHTML = '';
        branches.data.forEach(({ name, commit: { sha } }) => {
            let o = document.createElement('option');
            o.value = sha;
            o.innerHTML = name;
            select.appendChild(o);
        });
    }
}

async function removeRow(node) {
    if (node.classList.contains('row')) {
        node.remove();
    }
    else {
        removeRow(node.parentNode);
    }
}

async function addRow() {
    let template = document.querySelector("#reporow");
    const clone = template.content.cloneNode(true);
    clone.querySelector('.removeRepo').addEventListener('click', (event) => removeRow(event.target.parentNode));

    if (repositories.ok) {
        repositories.data.forEach(({ full_name }) => {
            let o = document.createElement('option');
            o.value = full_name;
            o.innerHTML = full_name;
            clone.querySelector('.form-select.repository').appendChild(o);
            clone.querySelector('.form-select.repository').addEventListener('change', loadBranches);
        });

        document.querySelector('.repos').appendChild(clone);
    }
}

const getRepoData = async (config) => {
    // branches ??= await getBranches(config);
    let rows = document.querySelectorAll('.repos .row');
    let repos = [];
    rows.forEach(async row => {
        let organization = row.querySelector('.organization').value;
        let repository = row.querySelector('.repository').value;
        let branch = row.querySelector('.branch').value;
        // let sha = branches.data.find(b => b.name === branch)?.commit.sha ?? '';

        if (organization.length == 0 || repository.length == 0) {
            return;
        }

        // repos.push({ organization, repository, branch, sha });
        repos.push({ organization, repository, branch });
    });
    return repos;
}

// Save
document.querySelector('form').addEventListener('submit', async (event) => {
    event.preventDefault();

    let access_token = document.querySelector("#accesstoken").value;
    let username = document.querySelector("#username").value;
    let refresh_interval = parseInt(document.querySelector("#interval").value);
    let updated = Date.now();
    let track = await getRepoData({ access_token, username });

    let config = { access_token, username, refresh_interval, track, updated };

    await chrome.storage.local.set({ config });
    await chrome.runtime.sendMessage({ sender: 'options', event: 'OPTIONS_SAVE' });
});

// Load
document.addEventListener('DOMContentLoaded', async () => {
    config = (await chrome.storage.local.get('config')).config;

    if (config) {
        repositories = await getRepositories(config);

        document.querySelector("#accesstoken").value = config.access_token;
        document.querySelector("#username").value = config.username;
        document.querySelector("#interval").value = config.refresh_interval;

        // if (config.track?.length > 0) {
        //     let template = document.querySelector("#reporow");
        //     config.track.forEach(t => {
        //         const clone = template.content.cloneNode(true);
        //         clone.querySelector('.organization').value = t.organization;
        //         clone.querySelector('.repository').value = t.repository;
        //         clone.querySelector('.branch').value = t.branch;
        //         // clone.querySelector('.sha').innerHTML = t.sha;
        //         clone.querySelector('.removeRepo').addEventListener('click', (event) => {
        //             removeRow(event.target.parentNode);
        //         });
        //         document.querySelector('.repos').appendChild(clone);
        //     });
        // }
    }

    document.querySelector('#addRepo').addEventListener('click', addRow);
});
