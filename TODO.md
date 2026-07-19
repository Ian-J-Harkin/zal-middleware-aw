# Epic 5 - Session Recovery TODO

Since Docker Desktop crashed and required a machine reboot, follow this exact checklist when you get back into your IDE to pick up exactly where we left off:

### 1. Boot the Infrastructure
Wait for Docker Desktop to fully launch (look for the green engine icon in your system tray).
Once running, open your terminal and run:
```powershell
docker-compose up -d
```
*(Note: We already fixed the `package.json` build scripts and modified the TypeScript configurations. Your containers will boot instantly without needing to rebuild!)*

### 2. Verify Container Health
Ensure both `zalando-middleware` and `minio` are running:
```powershell
docker-compose ps
```

### 3. Verify MinIO UI
Open Chrome/Edge and navigate to:
`http://localhost:9001`
*(Login with `minioadmin` / `minioadmin` to ensure the bucket is accessible).*

### 4. Run the End-to-End Sync Test
With the containers running, execute the pipeline test using the explicit Windows curl executable:
```powershell
curl.exe -X GET http://localhost:4020/api/v1/export
```
You should see a JSON response with `"status": "Transmitted"`.

### 5. Final Visual Check
Return to the MinIO UI at `http://localhost:9001` and verify the `zalando-media` bucket now contains the physical image files!

---
*Once this checklist is complete, Epic 5 is fully proven. You can then delete this `TODO.md` file!*
