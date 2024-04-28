const
    GITHUB = 'https://api.github.com',
    VERSION = '2022-11-28',
    ORGANIZATION = 'tcp-software',
    REPOSITORY = 'TIMECO';

const getFetchUrl = (action) => {
    let url = new URL(GITHUB);
    url.pathname = `repos/${ORGANIZATION}/${REPOSITORY}/${action}`;
    return url;
}

const getFetchUrl2 = (action, track) => {
    let url = new URL(GITHUB);
    url.pathname = `repos/${track.organization}/${track.repository}/${action}`;
    return url;
}

const getFetchOptions = (config) => {
    return {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github+json',
            'Authorization': `Bearer ${config.access_token}`,
            'X-GitHub-Api-Version': VERSION,
            'User-Agent': config.username
        }
    };
}

const getSinceDate = (days) => {
    let d = new Date();
    return new Date(d.setDate(d.getDate() + days)).toISOString();
}

const getCommits = async (config) => {
    let json = { ok: true, data: [] };
    for (let i = 0; i < config.track.length; i++) {
        let url = getFetchUrl2('commits', config.track[i]);
        let params = new URLSearchParams();
        params.set('since', getSinceDate(-7));
        params.set('sha', config.track[i].branch);
        // params.set('author', 'GitHub username or email address to use to filter by commit author');
        // params.set('committer', 'GitHub username or email address to use to filter by commit committer');
        // params.set('until', 'YYYY-MM-DDTHH:MM:SSZ');
        // params.set('per_page', 30);
        // params.set('page', 1);
        url.search = params;
        let x = await sendRequest(url, config);

        if (x.ok) {
            x.data.forEach(d => {
                let b = [];
                b.push(config.track[i].organization);
                b.push(config.track[i].repository);
                if (config.track[i].branch.length > 0) {
                    b.push(config.track[i].branch);
                }
                d.branch = b.join('/');
            });
            json.ok = true;
            json.data = [...json.data, ...x.data];
        }
    }
    return json;
}

const getBranches = async (config) => {
    let url = getFetchUrl('branches');
    let params = new URLSearchParams();
    // params.set('protected', true);
    // params.set('per_page', 30);
    // params.set('page', 1);
    url.search = params;

    let json = await sendRequest(url, config);
    return json;
}

const sendRequest = async (url, config) => {
    let data = [];
    let moreResults = true;

    try {
        while (moreResults) {
            let response = await fetch(url, getFetchOptions(config));
            if (!response.ok)
                throw new Error(response.statusText);

            let json = await response.json();
            data = [...data, ...json];

            // Read 'link' header to determine if the results are paginated and we
            // need to get the next page for more results.
            let link = response.headers.get("link");
            if (link?.includes('next')) {
                let links = link.split(',');
                links.forEach(l => {
                    if (l.includes('next')) {
                        let x = l.split(';')[0];
                        url = x.replace('<', '').replace('>', '');
                    }
                });
            }
            else {
                moreResults = false;
            }
        }
        return { ok: true, data };
    }
    catch (error) {
        return { ok: false, error };
    }
}

export { getCommits, getBranches };