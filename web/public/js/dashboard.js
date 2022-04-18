let config = document.getElementById('configuration');

let debug = document.getElementById('debug');
let cache = document.getElementById('cache');
let dns = document.getElementById('dns');
let port = document.getElementById('port');
let protocol = document.getElementById('protocol');
let apply = document.getElementById('apply');

let getUrl = window.location;
const endpoint = getUrl.protocol + "//" + getUrl.host + "/endpoint"

console.log(endpoint);

async function getData(method, params = []) {
    let url = endpoint + '?q=' + method;
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]))

    const response = await fetch(url);
    return response.json();
}

function showConfig() {
    let data = getData('config');
    if (data) {
        hideLoader();

        data.then(value => {
            config.style.display = 'block';

            debug.checked = value.general.debug
            cache.checked = value.general.cache
            dns.value = value.server.dns;
            port.value = value.server.port;
            protocol.value = value.server.protocol;
        })


    }

    apply.onclick = function () {

        let value = getData('config', {
            debug: debug.checked,
            cache: cache.checked
        });

        console.log(value);
    }
}


function hideLoader() {
    let loader = document.getElementById('config-loader');
    loader.remove();
}

setTimeout(function () {
    showConfig()
}, 500);
