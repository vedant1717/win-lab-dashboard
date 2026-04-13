# NESCO Cyber Lab Monitoring Dashboard

A centralized, **agentless** Single Page Application (SPA) dashboard to universally monitor Windows computers in a lab environment in real-time. Built with Python (Flask) and a state-of-the-art futuristic GUI.

Easily input a target computer's IP address, username, and password to instantly fetch its system specs, storage distribution, running services, and installed applications. No client software installation required!

## Features
- **True SPA Architecture**: Clean transitions between Secure Gateway, Target Registry, and Data Views.
- **KPMG/NESCO Branding**: Built-in institutional aesthetics featuring premium dark mode, glassmorphism UI, and custom animated `<conic-gradient>` telemetry data rendering.
- **Save State Persistence**: Allows users to save favorite remote computers (IP + Creds) securely to an offline `devices.json` configuration for one-click access.
- **Instant Search Filtering**: Locate specific running Windows Services or Apps instantaneously through client-side Javascript-filtered inputs.
- **Encrypted Application Access**: The frontend is guarded by a secure `.env` mathematical Hash system.
- **Autopilot Timeout**: Activity listeners automatically expire Flask JWT Sessions and rip users to the login screen after 5 minutes of total inactivity.

## Prerequisites

- **Python 3.8+**
- Target Windows Machines on the same network or reachable over TCP port 5985.

## Installation and Setup

### 1. Host Machine Setup (The Dashboard)

Clone this repository to the machine that will host the dashboard (e.g., your admin PC or server):

```bash
# Clone the repository
git clone https://github.com/vedantpatil/win-lab-dashboard.git
cd win-lab-dashboard

# Create a virtual environment (optional but recommended)
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install requirements
pip install -r requirements.txt
```

### 2. Configure Local Authentication Keys
Since this repository enforces heavily-encrypted zero-trust boundaries, credentials are not shipped with the installation. You must initialize your local gateway manually before the dashboard will grant you access.

Run the provided python configuration script inside your repository:
```bash
python setup_auth.py
```
This interactive bootstrapper will ask you to supply a username and an access key (password). It will automatically run your inputs through a mathematical `SHA-256` hashing algorithm and safely construct a local `.env` configuration file on your machine.

*Note: The generated `.env` file is completely ignored by Git for your absolute security.*

### 3. Target Windows Machine Setup

Because this is an agentless dashboard, it relies on **Windows Remote Management (WinRM)**. Lab environments often have this disabled for security reasons, so you must enable it on your target computers first.

Run the following command in an **elevated (Run as Administrator) PowerShell** console on the Windows machines you wish to monitor:

```powershell
# Enable PSRemoting
Enable-PSRemoting -Force -SkipNetworkProfileCheck

# Enable basic authentication and unencrypted traffic for standard HTTP WinRM
# NOTE: Only use this in a secure local lab environment!
Set-Item -Path WSMan:\localhost\Service\Auth\Basic -Value $true
Set-Item -Path WSMan:\localhost\Service\AllowUnencrypted -Value $true

# Open Windows Firewall for WinRM (Port 5985)
New-NetFirewallRule -Name "WinRM-HTTP" -DisplayName "Allow WinRM HTTP (5985)" -Enabled True -Profile Any -Action Allow -Direction Inbound -LocalPort 5985 -Protocol TCP

# Restart the WinRM service to apply
Restart-Service WinRM
```

## Running The System
```bash
# Run the backend server
python app.py
```

1. Open a web browser and navigate directly to `http://localhost:5000`.
2. Provide your Initial Application Authorization (`vedantpatil`).
3. You will enter the System Registry. Provide an IP Address and Windows Login for a target Lab System, and hit **ESTABLISH UPLINK**!
