# Windows PC Remote Access Setup

Run these steps on your home Windows PC to enable SSH access.

## 1. Install Tailscale

Download and install from: https://tailscale.com/download/windows

Sign in with the same account you used on your Mac.

## 2. Enable OpenSSH Server

Open **PowerShell as Administrator** and run:

```powershell
# Install OpenSSH Server
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0

# Start the service
Start-Service sshd

# Set it to start automatically on boot
Set-Service -Name sshd -StartupType Automatic
```

## 3. Verify It's Running

```powershell
Get-Service sshd
```

Should show `Status: Running`

## 4. Connect from Your Mac

From your Mac, run:

```bash
# See your devices
tailscale status

# Connect (replace with your Windows username and PC name)
ssh your-windows-username@your-pc-tailscale-name
```

## Optional: SSH Key Auth (No Password)

On your Mac, run:

```bash
ssh-copy-id your-windows-username@your-pc-tailscale-name
```

Enter your Windows password once, then future connections won't require it.
