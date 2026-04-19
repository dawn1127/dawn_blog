# Restore Notes

These notes describe the intended restore shape for Win11/WSL2 and Ubuntu Server.

1. Stop the app or schedule maintenance.
2. Restore Postgres:

   ```bash
   docker compose exec -T postgres psql -U network -d network_engineer_ai < backups/<timestamp>/postgres.sql
   ```

3. Restore MinIO volume data before starting services that depend on it.
4. Recreate `.env` from the server's secret store or saved deployment notes.
5. Start services:

   ```bash
   docker compose up -d
   ```

6. Verify login, provider metadata, chat history, file metadata, and artifact metadata.

Do not store production `.env` files or plaintext provider API keys in backups committed to the repo.
