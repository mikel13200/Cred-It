# Deployment Guide for Cred-It (MainServer)

This guide walks you through deploying the `MainServer` backend to your remote Ubuntu server.

**Target Server:** 217.216.35.29
**Project Directory:** `MainServer`

---

## Prerequisites
- You need a method to transfer files to the server. We will use **SCP** (standard file copy tool included with SSH) or you can drag-and-drop using an SFTP client like **FileZilla**.
- You need the password for the server's root (or sudo) user.

---

## Step 1: Transfer Files to Server

You need to copy the entire `MainServer` folder content to your server.

**Using SCP (Command Line):**
Run this command from your local computer's terminal (change `user` to your server username, usually `root`):
```bash
# Run this from e:\Deployment\Cred-It\
scp -r MainServer root@217.216.35.29:/root/cred-it-backend
```

**Using FileZilla:**
1. Connect to `217.216.35.29` with your username/password (Port 22).
2. Create a folder named `cred-it-backend`.
3. Upload all files from your local `MainServer` folder into `cred-it-backend`.

---

## Step 2: Connect to Server via SSH

Open your terminal (PowerShell or CMD) and connect:

```bash
ssh root@217.216.35.29
```
(Enter password when prompted)

---

## Step 3: Deployment

Once logged in, navigate to the folder you uploaded:

```bash
cd /root/cred-it-backend
```

Run the deployment scripts in order:

### 1. Update System
```bash
chmod +x deploy_scripts/*.sh  # Make scripts executable
./deploy_scripts/01_system_update.sh
```

### 2. Install Docker
```bash
./deploy_scripts/02_install_docker.sh
```
*You may need to log out and log back in if the script asks, but usually root doesn't need to.*

### 3. Prepare Project
```bash
./deploy_scripts/03_prepare_project.sh
```

### 4. Run Application
```bash
./deploy_scripts/04_run_application.sh
```

---

## Verification

After Step 4 completes, wait about 10-20 seconds for the database connection to initialize.

Open your browser and visit: **http://217.216.35.29**
(Or test the API: http://217.216.35.29/api/)

## Troubleshooting

**View Logs:**
```bash
docker compose -f docker-compose.prod.yml logs -f web
```

**Restart Application:**
```bash
./deploy_scripts/04_run_application.sh
```
