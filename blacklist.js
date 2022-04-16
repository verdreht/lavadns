const fs = require('fs');

const log = require('./logger');

let promise = function (file) {
    return new Promise(function(accepted) {

        log.logger.info('Found blacklist: ' + file.replace('.', ''));
        const domains = [];

        let array = fs.readFileSync(file).toString().split("\r\n");

        for (const line in array) {
            if (array[line] != null && array[line] && array[line].includes(' ') && !array[line].trimLeft().startsWith('#')) {
                let split = array[line].split(' ');
                if (split.length === 2) {
                    let domain = split[1];
                    domains.push(domain.trim().toLowerCase());
                }
            }
        }
        log.logger.info('Loaded blacklist: ' + file.replace('.', '') + ' (' + domains.length + ' domains loaded)');
        accepted(domains);
    });
}

let begin = async function beginScanning(data, callback) {
    let promises = [];

    fs.readdir('./blacklist/', (err, files) => {
        let arr = [];
        log.logger.info('Scanning for blacklists at location (blacklist/*)...');
        files.forEach(file => {
            promises.push(promise('./blacklist/' + file))
        });

        Promise.all(promises).then((value) =>
            callback(null, (value))
        );

    });
}

exports.begin = begin;