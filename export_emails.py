import subprocess
import json
import csv
import os

def export_emails():
    cmd = "sshpass -p 'Jul1@n/221/cloudhost' ssh -o StrictHostKeyChecking=no -o PreferredAuthentications=password -o PubkeyAuthentication=no root@31.97.116.21 \"docker exec deck-salone-api node -e \\\"const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); (async () => { const users = await prisma.user.findMany({ select: { id: true, email: true, username: true, role: true, createdAt: true }, orderBy: { createdAt: 'desc' } }); console.log(JSON.stringify(users)); })();\\\"\""

    res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    raw = res.stdout.strip()
    
    start_idx = raw.find('[')
    end_idx = raw.rfind(']') + 1
    if start_idx == -1 or end_idx == 0:
        print("Failed to get JSON output:", raw, res.stderr)
        return

    users = json.loads(raw[start_idx:end_idx])
    
    csv_path = "/Users/djfredmax/Desktop/Deck Salone/deck_salone_user_emails.csv"
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["ID", "Email", "Username", "Role", "Created At"])
        for u in users:
            writer.writerow([u.get("id", ""), u.get("email", ""), u.get("username", ""), u.get("role", ""), u.get("createdAt", "")])
            
    print(f"EXPORT COMPLETE: {len(users)} users written to {csv_path}")

if __name__ == "__main__":
    export_emails()
