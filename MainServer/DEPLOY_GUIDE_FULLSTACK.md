# Deployment Guide for Cred-It (Full Stack)

This guide walks you through deploying the **Frontend (React)** and **Backend (Django)** to your remote Ubuntu server.

**Target Server:** 217.216.35.29
**Project Root:** `e:\Deployment\Cred-It` (You must copy both frontend and backend)

---

## Prerequisites
- You need a method to transfer files to the server (SCP/FileZilla).
- You need the password for the server's root user.

---

## Step 1: Transfer Files to Server

**CRITICAL CHANGE:** You must now copy the **entire project folder** (containing both `frontend` and `MainServer`), not just `MainServer`.

**Using SCP:**
Run this from `e:\Deployment\` (parent of Cred-It):
```bash
scp -r Cred-It root@217.216.35.29:/root/
```

**Using FileZilla:**
1. Connect to `217.216.35.29`.
2. Upload the entire `Cred-It` folder to `/root/`.

---

## Step 2: Connect to Server via SSH

```bash
ssh root@217.216.35.29
```

---

## Step 3: Deployment

Navigate to the `MainServer` folder (where the scripts are):

```bash
cd /root/Cred-It/MainServer
```

Run the deployment scripts in order:

### 1. Update System
```bash
chmod +x deploy_scripts/*.sh
./deploy_scripts/01_system_update.sh
```

### 2. Install Docker
```bash
./deploy_scripts/02_install_docker.sh
```

### 3. Prepare Project
```bash
./deploy_scripts/03_prepare_project.sh
```

### 4. Run Application (Full Stack)
```bash
./deploy_scripts/04_run_application.sh
```
*Note: This step will now take longer (several minutes) because it is building your React frontend.*

---

## Verification

Wait for the build to finish. Then visit: **http://217.216.35.29**

- **Frontend:** You should see your Login/Landing page.
- **Backend:** The API is accessible at `http://217.216.35.29/api/` (invisible to user, but working).

## Troubleshooting

**Rebuild Frontend Only:**
If you make changes to frontend code:
```bash
docker compose -f docker-compose.prod.yml up -d --build frontend
```

**Restart All:**
```bash
./deploy_scripts/04_run_application.sh
```
