# Windows Lab System Monitor Dashboard

A centralized, **agentless** web dashboard to monitor Windows computers in a lab environment in real-time. Built with Python (Flask) and a modern, glassmorphism-styled vanilla web frontend. 

Easily input a target computer's IP address, username, and password to instantly fetch its system specs, storage distribution, running services, and installed applications. No client software installation required!

## Prerequisites

- **Python 3.8+**
- Target Windows Machines on the same network or reachable over TCP port 5985.

## Installation and Setup

### 1. Host Machine Setup (The Dashboard)

Clone this repository to the machine that will host the dashboard (e.g., your admin PC or server):

```bash
# Clone the repo (if uploaded to github)
git clone https://github.com/yourusername/win-lab-dashboard.git
cd win-lab-dashboard

# Create a virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install requirements
pip install -r requirements.txt

# Run the backend server
python app.py
```

The server will start at `http://0.0.0.0:5000`. You can access the dashboard in your browser via `http://localhost:5000` or the host's IP address (`http://HOST_IP:5000`).

### 2. Target Windows Machine Setup

Because this is an agentless dashboard, it relies on **Windows Remote Management (WinRM)**. Lab environments often have this disabled for security reasons, so you must enable it on your target computers first.

Run the following command in an **elevated (Run as Administrator) PowerShell** console on the lab computers you wish to monitor:

```powershell
# Enable PSRemoting
Enable-PSRemoting -Force -SkipNetworkProfileCheck

# Enable basic authentication and unencrypted traffic for standard HTTP WinRM
# NOTE: Only use this in a secure lab environment!
Set-Item -Path WSMan:\localhost\Service\Auth\Basic -Value $true
Set-Item -Path WSMan:\localhost\Service\AllowUnencrypted -Value $true

# Open Windows Firewall for WinRM (Port 5985)
New-NetFirewallRule -Name "WinRM-HTTP" -DisplayName "Allow WinRM HTTP (5985)" -Enabled True -Profile Any -Action Allow -Direction Inbound -LocalPort 5985 -Protocol TCP

# Restart the WinRM service to apply
Restart-Service WinRM
```

## Usage

1. Open a web browser and go to `http://localhost:5000`.
2. Input the target Windows machine's IP address (e.g. `192.168.1.50`).
3. Enter the target's Administrator credentials or a user in the Remote Management Users group.
4. Click **Connect & Fetch Stats**.

The dashboard will asynchronously execute a PowerShell script payload, aggregate the data, and render beautiful live metrics!
