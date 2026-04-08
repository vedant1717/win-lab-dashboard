import json
from flask import Flask, request, jsonify, send_file
import winrm

app = Flask(__name__, static_folder='static', static_url_path='')

@app.route('/')
def serve_index():
    return send_file('static/index.html')

@app.route('/api/scan', methods=['POST'])
def scan_system():
    data = request.json
    ip = data.get('ip')
    username = data.get('username')
    password = data.get('password')

    if not ip or not username or not password:
        return jsonify({'error': 'Missing IP, username, or password'}), 400

    try:
        # Create a WinRM session
        # Use http on port 5985. Lab environment assumed.
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

        # Applications (Combine 32-bit and 64-bit registry keys)
        $apps32 = Get-ItemProperty HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Where-Object {$_.DisplayName -ne $null} | Select-Object DisplayName, DisplayVersion, Publisher
        $apps64 = Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Where-Object {$_.DisplayName -ne $null} | Select-Object DisplayName, DisplayVersion, Publisher
        
        $allApps = @($apps32) + @($apps64) | Sort-Object DisplayName -Unique
        
        $result = @{
            SystemInfo = $systemInfo
            Storage = $storageList
            Services = $servicesList
            Applications = $allApps
        }

        $result | ConvertTo-Json -Depth 4
        """

        # Execute PowerShell Script
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
    # Run the server on all interfaces so it can be accessed over the network
    app.run(host='0.0.0.0', port=5000, debug=True)
