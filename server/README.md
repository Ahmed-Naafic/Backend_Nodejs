# NIRA System - Node.js Backend

## Overview

This is the Node.js + Express + MongoDB backend for the NIRA System (National Identity Registration Authority). It provides a RESTful API for citizen registration and management.

## Technology Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js 4.x
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (JSON Web Tokens)
- **File Upload:** Multer
- **Validation:** Express Validator
- **Security:** Helmet, CORS

## Project Structure

```
server/
├── config/              # Configuration files
│   └── database.js      # MongoDB connection
├── models/              # Mongoose schemas
│   ├── User.model.js
│   ├── Citizen.model.js
│   ├── Role.model.js
│   ├── Permission.model.js
│   ├── Menu.model.js
│   ├── Activity.model.js
│   ├── Notice.model.js
│   └── StatusChangeLog.model.js
├── routes/              # API routes
│   ├── auth.routes.js
│   ├── citizen.routes.js
│   ├── user.routes.js
│   ├── dashboard.routes.js
│   ├── report.routes.js
│   ├── notice.routes.js
│   ├── activity.routes.js
│   └── file.routes.js
├── services/            # Business logic
│   ├── activity.service.js
│   ├── citizen.service.js
│   ├── user.service.js
│   ├── rbac.service.js
│   ├── dashboard.service.js
│   ├── report.service.js
│   └── notice.service.js
├── middleware/          # Express middleware
│   ├── auth.middleware.js
│   ├── permission.middleware.js
│   └── errorHandler.middleware.js
├── utils/              # Utility functions
│   ├── jwt.util.js
│   ├── nationalIdGenerator.util.js
│   └── fileUpload.util.js
├── database/           # Database scripts
│   └── seed.js        # Database seeder
├── uploads/           # Uploaded files
│   ├── images/
│   ├── documents/
│   └── profiles/
├── server.js          # Entry point
├── package.json       # Dependencies
└── .env              # Environment variables
```

## Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment variables:**
```bash
cp .env.example .env
```

Edit `.env` and set:
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `PORT` - Server port (default: 3000)

3. **Start MongoDB:**
Make sure MongoDB is running on your system.

4. **Seed the database:**
```bash
node database/seed.js
```

This will create:
- Roles (Admin, Officer, Viewer)
- Permissions
- Menus
- Default users (admin/admin123, officer1/admin123)

5. **Start the server:**
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/refresh` - Refresh access token

### Citizens
- `GET /api/citizens` - List citizens (paginated)
- `GET /api/citizens/:nationalId` - Get citizen by National ID
- `GET /api/citizens/search?query=...` - Search citizens
- `POST /api/citizens` - Create new citizen (with file uploads)
- `PUT /api/citizens/:nationalId` - Update citizen
- `DELETE /api/citizens/:nationalId` - Soft delete citizen
- `POST /api/citizens/:nationalId/status` - Update citizen status
- `GET /api/citizens/trash` - List deleted citizens
- `POST /api/citizens/trash/:nationalId/restore` - Restore citizen
- `DELETE /api/citizens/trash/:nationalId` - Permanently delete

### Users
- `GET /api/users` - List users (paginated)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Soft delete user
- `POST /api/users/:id/status` - Change user status
- `POST /api/users/:id/reset-password` - Reset user password
- `GET /api/users/trash` - List deleted users
- `POST /api/users/trash/:id/restore` - Restore user
- `DELETE /api/users/trash/:id` - Permanently delete

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

### Reports
- `GET /api/reports/summary` - Summary report
- `GET /api/reports/citizens` - Citizen registration report
- `GET /api/reports/registrations` - Registration statistics
- `GET /api/reports/users` - User activity report

### Notices
- `GET /api/notices` - Get active notices
- `POST /api/notices` - Create notice
- `DELETE /api/notices/:id` - Delete notice

### Activities
- `GET /api/activities/recent` - Get recent activities

### Files
- `GET /api/files/get?path=...` - Serve uploaded files

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Role-Based Access Control (RBAC)

The system has three roles:
- **ADMIN** - Full system access
- **OFFICER** - Citizen management, view reports
- **VIEWER** - View-only access

Permissions are checked via middleware on each route.

## File Uploads

File uploads are handled using Multer. Supported:
- **Images:** JPEG, PNG, GIF, WEBP (max 5MB)
- **Documents:** PDF, DOC, DOCX, JPG, PNG (max 10MB)

Files are stored in `uploads/` directory:
- `uploads/images/` - Citizen images
- `uploads/documents/` - Citizen documents
- `uploads/profiles/` - User profile pictures

## MongoDB Schema

### Collections
- `users` - System users
- `citizens` - Citizen records
- `roles` - User roles
- `permissions` - System permissions
- `menus` - Navigation menus
- `activities` - Activity logs
- `notices` - System notices
- `status_change_logs` - Status change audit trail

## Environment Variables

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/nira_system
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
MAX_IMAGE_SIZE=5242880
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
SESSION_TIMEOUT=300
```

## Default Credentials

After seeding:
- **Admin:** username=`admin`, password=`admin123`
- **Officer:** username=`officer1`, password=`admin123`

⚠️ **Change these passwords in production!**

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run database seeder
node database/seed.js
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Use a strong `JWT_SECRET`
3. Configure MongoDB connection string
4. Set up file storage (consider cloud storage)
5. Enable HTTPS
6. Configure proper CORS origins
7. Set up logging and monitoring

## License

ISC
