const { createLogger, format, transports } = require('winston'); 
const { combine, timestamp, printf, colorize } = format; 
const logger = createLogger({ 
  level: 'info', 
  format: combine( 
    timestamp(),
    colorize(), 
    printf(({ level, message, timestamp }) => `${timestamp} [${level}]: ${message}`) 
  ), 
  transports: [ new transports.Console(), // Logs to the console 
    new transports.File({ filename: 'logs/error.log', level: 'error' }), // Error logs 
    new transports.File({ filename: 'logs/combined.log' }), // All logs 
    ], 
  }); 
  
  module.exports = logger;