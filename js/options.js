'use strict';

import { getBranches, getRepositories, getUser } from '../modules/service.js';

let config;
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

    if (repositories && repositories.ok) {
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

async function save(event) {
    event.preventDefault();

    let access_token = document.querySelector("#accesstoken").value;
    document.querySelector("#username").value = (await getUser({ access_token })).login
    let username = document.querySelector("#username").value;
    let refresh_interval = parseInt(document.querySelector("#interval").value);
    let updated = Date.now();
    let track = await getRepositoryData();

    if (username.length == 0) {
        console.log('username not found.');
        return;
    }

    let config = { access_token, username, refresh_interval, track, updated };

    await chrome.storage.local.set({ config });
    await chrome.runtime.sendMessage({ sender: 'options', event: 'OPTIONS_SAVE' });

    console.log(config);
}

async function setLogin(login) {
    let addon = document.querySelector('.input-group.access-token .input-group-text');
    addon.innerHTML = login;
    addon.removeAttribute('hidden');
}

async function pageLoad() {
    config = (await chrome.storage.local.get('config')).config;

    if (config) {
        repositories = await getRepositories(config);

        document.querySelector("#accesstoken").value = config.access_token;
        document.querySelector("#username").value = config.username;
        document.querySelector("#interval").value = config.refresh_interval;
        setLogin(config.username);

        if (config.track?.length > 0) {
            let template = document.querySelector("#reporow");
            config.track.forEach(async ({ repository, sha }) => {
                const clone = template.content.cloneNode(true);

                repositories.data.forEach(({ full_name }) => {
                    let o = document.createElement('option');
                    o.value = full_name;
                    o.innerHTML = full_name;
                    clone.querySelector('.form-select.repository').appendChild(o);
                    clone.querySelector('.form-select.repository').addEventListener('change', loadBranches);
                }); clone.querySelector('.repository').value = repository;

                let branches = await getBranches(repository, config);
                if (branches.ok) {
                    branches.data.forEach(({ name, commit }) => {
                        let o = document.createElement('option');
                        o.value = commit.sha;
                        o.innerHTML = name;
                        if (commit.sha == sha) {
                            o.setAttribute('selected', 'selected');
                        }
                        clone.querySelector('.form-select.branch').appendChild(o);
                    });
                }

                clone.querySelector('.removeRepo').addEventListener('click', (event) => removeRow(event.target.parentNode));

                document.querySelector('.repos').appendChild(clone);
            });
        }
    }

    document.querySelector('#addRepo').addEventListener('click', addRow);
    document.querySelector('#button-addon').addEventListener('click', async function (e) {
        e.preventDefault();
        let access_token = document.querySelector("#accesstoken").value;
        if (access_token.length == 0) {
            return;
        }
        let { login } = await getUser({ access_token });
        if (login) {
            setLogin(login);
        }
    });
}

const getRepositoryData = async () => {
    let rows = document.querySelectorAll('.repos .row');
    let repos = [];

    rows.forEach(async row => {
        let repository = row.querySelector('.form-select.repository').value;
        let sha = row.querySelector('.form-select.branch').value;
        let branch = row.querySelector('.form-select.branch').options[row.querySelector('.form-select.branch').selectedIndex].text;

        if (sha.length == 0 || repository.length == 0) {
            return;
        }

        repos.push({ repository, branch, sha });
    });

    return repos;
}

document.querySelector('form').addEventListener('submit', save);

document.addEventListener('DOMContentLoaded', pageLoad);
