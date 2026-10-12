# Production Setup Documentation

## VPS Details
- **Provider**: Hostinger
- **Hostname**: `srv1576380.hstgr.cloud`
- **IP Address**: `2.24.28.130`
- **OS**: Ubuntu 25.10
- **Access**: SSH as root

## Production API
- **URL**: `https://api.okccarmeets.com`
- **Backend Location on VPS**: `/opt/okcarevents/backend/`

## Production Database
- **Type**: MongoDB (installed locally on VPS)
- **Connection URL**: `mongodb://localhost:27017`
- **Database Name**: `test_database`
- **Users Count**: 227 (as of Oct 2026)

## Production Environment Variables (VPS)
Located at: `/opt/okcarevents/backend/.env`
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
GOOGLE_CLIENT_ID=211008012524-l8k1999l1llvlfsqp0rm8jshg2ad96ev.apps.googleusercontent.com
JWT_SECRET=48f4261868bf50c892b4838fcef64f40c816c3b2ca52bacb68ee2e384d56edfa
```
Note: OpenAI API key exists but not documented here for security.

## Preview Environment (Emergent)
- **Backend URL**: `https://event-hub-okc-1.preview.emergentagent.com`
- **Database**: Local MongoDB (`mongodb://localhost:27017`)
- **Database Name**: `bike_database`
- **Note**: Preview DB is separate from production - has 0 users, only test data

## Other Deployments on VPS
- **Bike Meets App**: `/opt/okcbikemeets/backend/` (separate project)

## Useful Commands (on VPS)

### Check user count:
```bash
mongosh test_database --eval "db.users.countDocuments({})"
```

### Check event count:
```bash
mongosh test_database --eval "db.events.countDocuments({})"
```

### View backend logs:
```bash
# Check what process manager is being used
pm2 logs
# or
journalctl -u okcarevents
```

### Restart backend:
```bash
pm2 restart okcarevents
# or
systemctl restart okcarevents
```

## Frontend Environment
For the mobile app to connect to production:
```
EXPO_PUBLIC_BACKEND_URL=https://api.okccarmeets.com
```
