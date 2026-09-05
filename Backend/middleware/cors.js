// Expo web (localhost:8081) and native clients call this API from another origin.
export default function cors(req, res, next) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-request-id');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
}
