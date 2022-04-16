const dns2 = require('dns2');
const log = require('./logger.js');
const blacklist = require('./blacklist');

const { TCPClient } = dns2;
const { Packet } = dns2;

let blocked = new Set();
let cache = new Map();

const resolve = TCPClient({
    dns: '1.1.1.1'
});

const server = dns2.createServer({
    udp: true,
    handle: (request, send, rinfo) => {
        const response = Packet.createResponseFromRequest(request);
        const [ question ] = request.questions;
        const { name } = question;

        answer(send, name, request, response, rinfo);


    }
});

function answer(send, name, request, response, rinfo) {
    (async () => {
        try {
            if(!blocked.has(name)) {
                let cached;
                let result;

                let reqType = request.questions[0].type;
                let reqClass = request.questions[0].class;

                let ad;

                console.log(request.questions)

                if(cache.has(name)) {
                    cached = true;
                    ad = cache.get(name);

                } else {
                    result = await resolve(name);
                    ad = retrieveAddress(result);
                }

                if (ad != null) {
                    log.logger.info(` \\\\ (Response to ${[rinfo.address]}:${[request.header.id]}): ${[ad]} ` + (cached ? '[CACHED]' : ''));

                    for(let resp of result['answers']) {
                        response.answers.push(resp)
                    }

                    send(response);
                } else {
                    log.logger.debug('ad is null wow');
                }
            } else {
                log.logger.warn(` \\\\ (Response to ${[rinfo.address]}:${[request.header.id]}): BLOCKED`);
            }

        } catch(error) {
            log.logger.error(error);
        }
    })();
}

function retrieveAddress(result) {
    if(result != null) {
        let answers = result['answers'];

        for (const answer of answers) {
            if(answer != null) if(answer['address'] != null)
                return answer['address'];
        }
    }
}


server.on('request', (request, response, rinfo) => {
    log.logger.info(rinfo.address + ':' + request.header.id + ' > ' + JSON.stringify(request.questions[0]));
});

server.on('requestError', (error) => {
    log.logger.error('Client sent an invalid request', error);
});

server.on('listening', async () => {
    log.logger.info('LavaDNS server by @verdreht has been started.');
    log.logger.info('Configuration: ' + JSON.stringify(server.addresses()));
    await blacklist.begin('ex', function (err, result) {
        for(let arr of result) {
            arr.forEach(item => blocked.add(item))
        }
    });
});

server.on('close', () => {
    log.logger.info('server closed');
});

server.listen({
    // Optionally specify port and/or address for each server:
    udp: { port: 53 }
});
