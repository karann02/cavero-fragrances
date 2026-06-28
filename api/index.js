// Vercel Serverless Function entry.
// Wraps the Express app (server.js exports it without calling listen()).
// vercel.json rewrites every /api/* request to this function; Express then
// matches its own /api/... routes against the original req.url.
module.exports = require('../backend/auth-service/server.js');
