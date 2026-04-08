import json
import os
import uuid
from flask import Flask, request, jsonify, send_file
import winrm

app = Flask(__name__, static_folder='static', static_url_path='')

DEVICES_FILE = 'devices.json'

def load_devices():
    if not os.path.exists(DEVICES_FILE):
        return []
    with open(DEVICES_FILE, 'r') as f:
        try:
            return json.load(f)
        except:
            return []

def save_devices(devices):
    with open(DEVICES_FILE, 'w') as f:
        json.dump(devices, f, indent=4)

@app.route('/')
def serve_index():
    return send_file('static/index.html')

@app.route('/api/devices', methods=['GET'])
def get_devices():
    return jsonify(load_devices())

@app.route('/api/devices', methods=['POST'])
def add_device():
    data = request.json
    devices = load_devices()
    new_device = {
        'id': str(uuid.uuid4()),
        'name': data.get('name', 'Unknown Device'),
        'ip': data.get('ip'),
        'username': data.get('username'),
        'password': data.get('password')
    }
    devices.append(new_device)
    save_devices(devices)
    return jsonify(new_device)

@app.route('/api/devices/<device_id>', methods=['DELETE'])
def delete_device(device_id):
    devices = load_devices()
    devices = [d for d in devices if d.get('id') != device_id]
    save_devices(devices)
    return jsonify({'status': 'success'})

@app.route('/api/scan', methods=['POST'])
def scan_system():
    data = request.json
    ip = data.get('ip')
    username = data.get('username')
    password = data.get('password')

    if not ip or not username or not password:
        return jsonify({'error': 'Missing IP, username, or password'}), 400

    try:
        session = winrm.Session(
            f'http://{ip}:5985/wsman', 
            auth=(username, password),
            transport='ntlm',
            server_cert_validation='ignore'
        )

        ps_script = """
        [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
        $ErrorActionPreference = "SilentlyContinue"

        # System Info
        $os = Get-CimInstance Win32_OperatingSystem
        $cs = Get-CimInstance Win32_ComputerSystem
        $cpu = Get-CimInstance Win32_Processor | Select-Object -First 1

        $ramTotal = [math]::Round($cs.TotalPhysicalMemory / 1GB, 2)
        $ramFree = [math]::Round($os.FreePhysicalMemory / 1024, 2)
        $ramUsed = $ramTotal - $ramFree

        $systemInfo = @{
            OSName = $os.Caption
            OSVersion = $os.Version
            Processor = $cpu.Name
            RAMTotalGB = $ramTotal
            RAMUsedGB = $ramUsed
            RAMFreeGB = $ramFree
        }

        # Storage
        $disks = Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | Select-Object DeviceID,
            @{Name="SizeGB";Expression={[math]::Round($_.Size / 1GB, 2)}},
            @{Name="FreeGB";Expression={[math]::Round($_.FreeSpace / 1GB, 2)}}

        $storageList = @($disks)

        # Services
        $services = Get-Service | Where-Object {$_.Status -eq 'Running'} | Select-Object Name, DisplayName, Status
        $servicesList = @($services)

        # Applications
        $apps32 = Get-ItemProperty HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Where-Object {$_.DisplayName -ne $null} | Select-Object DisplayName, DisplayVersion, Publisher
        $apps64 = Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Where-Object {$_.DisplayName -ne $null} | Select-Object DisplayName, DisplayVersion, Publisher
        $allApps = @($apps32) + @($apps64) | Sort-Object DisplayName -Unique

        # Connected Users via quser
        $quserRaw = quser 2>&1
        $usersList = @()
        if ($quserRaw -notmatch "No User exists" -and $quserRaw -notmatch "is not recognized") {
            foreach ($line in $quserRaw | Select-Object -Skip 1) {
                # Replace multiple spaces with a single pipe
                $lineParsed = $line -replace '\s{2,}', '|'
                $parts = $lineParsed.Split('|')
                if ($parts.Count -ge 5) {
                    $uName = $parts[0].Trim().TrimStart('>')
                    $usersList += @{
                        Username = $uName
                        Session = $parts[1]
                        State = $parts[3]
                        LogonTime = $parts[$parts.Count - 1]
                    }
                } elseif ($parts.Count -ge 3) {
                    # Handle disconnected sessions which might have blank fields
                    $uName = $parts[0].Trim().TrimStart('>')
                    $usersList += @{
                        Username = $uName
                        Session = "Unknown"
                        State = $parts[2]
                        LogonTime = "Unknown"
                    }
                }
            }
        }
        
        $result = @{
            SystemInfo = $systemInfo
            Storage = $storageList
            Services = $servicesList
            Applications = $allApps
            ConnectedUsers = $usersList
        }

        $result | ConvertTo-Json -Depth 4
        """

        r = session.run_ps(ps_script)

        if r.status_code == 0:
            output = r.std_out.decode('utf-8', errors='replace')
            return jsonify(json.loads(output))
        else:
            error_msg = r.std_err.decode('utf-8', errors='replace')
            return jsonify({'error': 'WinRM command failed', 'details': error_msg}), 500

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
