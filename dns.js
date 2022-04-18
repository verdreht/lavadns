const dns2 = require('dns2');

const config = require('./config.json');
const log = require('./logger.js');
const blacklist = require('./blacklist');

const {TCPClient} = dns2;
const {Packet} = dns2;

let blocked = new Set();
let cache = new Map();

function swap(json) {
    let ret = {};
    for (let key in json) {
        ret[json[key]] = key;
    }
    return ret;
}

let blockedQueries = 0;
let allowedQueries = 0;

const ns_type = swap({
    'invalid': 0,  // Cookie.
    'a': 1,    // Host address.
    'ns': 2,   // Authoritative server.
    'md': 3,   // Mail destination.
    'mf': 4,   // Mail forwarder.
    'cname': 5,    // Canonical name.
    'soa': 6,  // Start of authority zone.
    'mb': 7,   // Mailbox domain name.
    'mg': 8,   // Mail group member.
    'mr': 9,   // Mail rename name.
    'null': 10,    // Null resource record.
    'wks': 11, // Well known service.
    'ptr': 12, // Domain name pointer.
    'hinfo': 13,   // Host information.
    'minfo': 14,   // Mailbox information.
    'mx': 15,  // Mail routing information.
    'txt': 16, // Text strings.
    'rp': 17,  // Responsible person.
    'afsdb': 18,   // AFS cell database.
    'x25': 19, // X_25 calling address.
    'isdn': 20,    // ISDN calling address.
    'rt': 21,  // Router.
    'nsap': 22,    // NSAP address.
    'ns_nsap_ptr': 23, // Reverse NSAP lookup (deprecated)
    'sig': 24, // Security signature.
    'key': 25, // Security key.
    'px': 26,  // X.400 mail mapping.
    'gpos': 27,    // Geographical position (withdrawn).
    'aaaa': 28,    // Ip6 Address.
    'loc': 29, // Location Information.
    'nxt': 30, // Next domain (security)
    'eid': 31, // Endpoint identifier.
    'nimloc': 32,  // Nimrod Locator.
    'srv': 33, // Server Selection.
    'atma': 34,    // ATM Address
    'naptr': 35,   // Naming Authority PoinTeR
    'kx': 36,  // Key Exchange
    'cert': 37,    // Certification Record
    'a6': 38,  // IPv6 Address (deprecated, use ns_t_aaaa)
    'dname': 39,   // Non-terminal DNAME (for IPv6)
    'sink': 40,    // Kitchen sink (experimental)
    'opt': 41, // EDNS0 option (meta-RR)
    'apl': 42, // Address prefix list (RFC3123)
    'ds': 43,  // Delegation Signer
    'sshfp': 44,   // SSH Fingerprint
    'ipseckey': 45,// IPSEC Key
    'rrsig': 46,   // RRSet Signature
    'nsec': 47,    // Negative Security
    'dnskey': 48,  // DNS Key
    'dhcid': 49,   // Dynamic host configuartion identifier
    'nsec3': 50,   // Negative security type 3
    'nsec3param': 51,  // Negative security type 3 parameters
    'hip': 55, // Host Identity Protocol
    'spf': 99, // Sender Policy Framework
    'tkey': 249,   // Transaction key
    'tsig': 250,   // Transaction signature.
    'ixfr': 251,   // Incremental zone transfer.
    'axfr': 252,   // Transfer zone of authority.
    'mailb': 253,  // Transfer mailbox records.
    'maila': 254,  // Transfer mail agent records.
    'any': 255,    // Wildcard match.
    'zxfr': 256,   // BIND-specific, nonstandard.
    'dlv': 32769,  // DNSSEC look-aside validation.
    'max': 65536
});

const resolve = TCPClient({
    dns: config.server.dns
});

const server = dns2.createServer({
    udp: true,
    handle: (request, send, rinfo) => {
        log.logger.info(rinfo.address + ':' + request.header.id + ' > ' + JSON.stringify(request.questions[0]));

        const response = Packet.createResponseFromRequest(request);
        const [question] = request.questions;
        const {name} = question;

        answer(send, name, request, response, rinfo);


    }
});

function answer(send, name, request, response, rinfo) {
    (async () => {
        try {
            if (!blocked.has(name)) {
                let custom = config.custom;
                if (!isPresent(custom, name)) {
                    let cached = false;
                    let reqType = ns_type[(request.questions[0].type)].toUpperCase();
                    let reqTypeRaw = request.questions[0];


                    if (cache.has(name)) {
                        cached = true;
                        continueResponse(response, name, rinfo, request, send, reqType, cached, reqTypeRaw, cache.get(name))

                    } else {
                        const result = await resolve(name, reqType);

                        continueResponse(response, name, rinfo, request, send, reqType, cached, reqTypeRaw, result)

                    }
                } else {
                    let add = getCustomAddress(custom, name);
                    log.logger.info(' \\\\ Custom domain triggered: ' + name + ' >>> ' + add);
                    response.answers.push({
                        name: name,
                        type: 1,
                        ttl: 300,
                        address: add
                    })
                    send(response);
                }
                allowedQueries++;
            } else {
                log.logger.warn(` \\\\ (Response to ${[rinfo.address]}:${[request.header.id]}): BLOCKED`);
                blockedQueries++;
            }

        } catch (error) {
            log.logger.error(error);
        }
    })();
}

function isPresent(json, domain) {
    for (let obj of json) {
        if (Object.keys(obj)[0] === domain) {
            return true;
        }
    }
}

function getCustomAddress(json, domain) {
    for (let obj of json) {
        if (Object.keys(obj)[0] === domain) {
            return Object.values(obj)[0];
        }
    }
}

function continueResponse(response, name, rinfo, request, send, reqType, cached, reqTypeRaw, ad) {
    if (ad != null) {
        log.logger.info(` \\\\ (Response to ${[rinfo.address]}:${[request.header.id]}/${reqType}): ${[JSON.stringify(ad['answers'])]} ` + (cached ? '[CACHED]' : ''));
        //log.logger.info(` \\\\ (Response to ${[rinfo.address]}:${[request.header.id]}/${reqType}): ` + (cached ? '[CACHED]' : ''));

        for (let answer of ad['answers']) {
            response.answers.push(answer);
        }

        //for(let resp of ad) {
        //    response.answers.push({
        //        name: name,
        //        address: resp,
        //        type: request.questions[0].type,
        //        ttl: 300
        //    });
        //}

        send(response);
    } else {
        log.logger.error('ad is null wow');
    }
}

server.on('requestError', (error) => {
    log.logger.error('Client sent an invalid request', error);
});

server.on('listening', async () => {
    log.logger.info('LavaDNS server by @verdreht has been started.');
    log.logger.info('Configuration: ' + JSON.stringify(server.addresses()));
    if (config.blacklist.enabled)
        await blacklist.begin('ex', function (err, result) {
            for (let arr of result) {
                arr.forEach(item => blocked.add(item))
            }
        });
});

server.on('close', () => {
    log.logger.info('server closed');
});

server.listen({
    // Optionally specify port and/or address for each server:
    udp: {port: config.server.port}
});

exports.blockedQ = function () {
    return blockedQueries;
}

exports.blockedD = function () {
    return blocked.size;
}

exports.allowedQ = function () {
    return allowedQueries;
}