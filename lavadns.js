let childProcess = require('child_process');
const log = require("./logger");

function runScript(scriptPath, callback) {

    let invoked = false;

    let process = childProcess.fork(scriptPath);

    // listen for errors as they may prevent the exit event from firing
    process.on('error', function (err) {
        if (invoked) return;
        invoked = true;
        callback(err);
    });

    // execute the callback once the process has finished running
    process.on('exit', function (code) {
        if (invoked) return;
        invoked = true;
        let err = code === 0 ? null : new Error('exit code ' + code);
        callback(err);
    });

}

runScript('./web/web.js', function (err) {
    if (err) throw err;
    log.logger.info('Web server closed.')
});
