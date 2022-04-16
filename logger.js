let winston = require('winston');

// Logger configuration
const logConfiguration = {
    'transports': [
        new winston.transports.Console({
            level: 'info'
        }),

        new winston.transports.File({
            level: 'info',
            filename: 'logs/server.log'
        })
    ],
    format: winston.format.combine(
        winston.format.label({
            label: `LavaDNS`
        }),
        winston.format.timestamp({
            format: 'DD-MMM-YYYY HH:mm:ss'
        }),
        winston.format.printf(info => `[${[info.timestamp]} ${info.level}] (${info.label}): ${info.message}`),
    )
};

module.exports = {
    logger: winston.createLogger(logConfiguration)
}