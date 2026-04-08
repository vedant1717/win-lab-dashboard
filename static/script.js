document.addEventListener('DOMContentLoaded', () => {
    // UI Elements - Screen Management
    const screenConnect = document.getElementById('screen-connect');
    const screenDashboard = document.getElementById('screen-dashboard');
    const disconnectBtn = document.getElementById('disconnectBtn');

    // UI Elements - Connect Form
    const form = document.getElementById('connectForm');
    const submitBtn = document.getElementById('submitBtn');
    const saveBtn = document.getElementById('saveBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const spinner = document.getElementById('spinner');
    const errorBox = document.getElementById('errorBox');
    const deviceList = document.getElementById('deviceList');
    const navTargetIp = document.getElementById('navTargetIp');

    // Init View
    fetchDevices();

    // --- SCREEN NAVIGATION LOGIC ---
    function showDashboard() {
        screenConnect.classList.remove('active-screen');
        screenConnect.classList.add('hidden-screen');
        screenDashboard.classList.remove('hidden-screen');
        // Minor timeout to allow display:block to apply before fading in opacity
        setTimeout(() => {
            screenDashboard.classList.add('active-screen');
        }, 50);
    }

    function showConnectScreen() {
        screenDashboard.classList.remove('active-screen');
        screenDashboard.classList.add('hidden-screen');
        screenConnect.classList.remove('hidden-screen');
        setTimeout(() => {
            screenConnect.classList.add('active-screen');
        }, 50);
    }

    disconnectBtn.addEventListener('click', showConnectScreen);

    // --- DEVICE MANAGEMENT ---
    async function fetchDevices() {
        try {
            const res = await fetch('/api/devices');
            const devices = await res.json();
            renderDeviceList(devices);
        } catch (e) {
            console.error('Failed to load devices', e);
        }
    }

    function renderDeviceList(devices) {
        deviceList.innerHTML = '';
        if (devices.length === 0) {
            deviceList.innerHTML = '<p style="color: var(--text-dim); font-size: 0.8rem;">No entries in registry.</p>';
            return;
        }

        devices.forEach(dev => {
            const div = document.createElement('div');
            div.className = 'device-item';
            div.innerHTML = `
                <div class="device-info">
                    <strong>${dev.name}</strong>
                    <span>${dev.ip}</span>
                </div>
                <button class="device-delete" data-id="${dev.id}" style="background:transparent;border:none;color:var(--danger);cursor:pointer;">&times;</button>
            `;
            
            div.addEventListener('click', (e) => {
                if(e.target.classList.contains('device-delete')) return;
                document.getElementById('name').value = dev.name;
                document.getElementById('ip').value = dev.ip;
                document.getElementById('username').value = dev.username;
                document.getElementById('password').value = dev.password;
                
                form.dispatchEvent(new Event('submit'));
            });

            div.querySelector('.device-delete').addEventListener('click', async () => {
                await fetch(`/api/devices/${dev.id}`, { method: 'DELETE' });
                fetchDevices();
            });

            deviceList.appendChild(div);
        });
    }

    saveBtn.addEventListener('click', async () => {
        const name = document.getElementById('name').value || 'Unknown Node';
        const ip = document.getElementById('ip').value;
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (!ip || !username || !password) {
            alert('IP, Username, and Password required for registry payload.');
            return;
        }

        await fetch('/api/devices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, ip, username, password })
        });
        
        fetchDevices();
    });


    // --- CONNECTION EXECUTOR ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        errorBox.classList.add('hidden');
        submitBtn.disabled = true;
        btnText.textContent = 'ESTABLISHING...';
        spinner.classList.remove('hidden');

        const ip = document.getElementById('ip').value;
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip, username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.details || data.error || 'Connection refused by standard parameters.');
            }

            navTargetIp.textContent = ip;
            populateDashboard(data);
            showDashboard();

        } catch (error) {
            errorBox.textContent = `TELEMETRY ERROR: ${error.message}`;
            errorBox.classList.remove('hidden');
        } finally {
            submitBtn.disabled = false;
            btnText.textContent = 'ESTABLISH UPLINK';
            spinner.classList.add('hidden');
        }
    });

    // --- SEARCH FILTERS ---
    function setupFilter(inputId, tableId) {
        document.getElementById(inputId).addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const rows = document.getElementById(tableId).querySelector('tbody').querySelectorAll('tr');
            rows.forEach(row => {
                row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
            });
        });
    }
    
    setupFilter('searchServices', 'servicesTable');
    setupFilter('searchApps', 'appsTable');

    // --- UI POPULATOR ---
    function populateDashboard(data) {
        // System Info
        const sys = data.SystemInfo;
        document.getElementById('osName').textContent = sys.OSName;
        document.getElementById('osVersion').textContent = sys.OSVersion;
        document.getElementById('cpuName').textContent = sys.Processor || 'Unknown CPU Unit';
        
        // Circular RAM Gradient using conic-gradient
        const ramPercent = Math.min((sys.RAMUsedGB / sys.RAMTotalGB) * 100, 100).toFixed(0);
        document.getElementById('ramPercentText').textContent = `${ramPercent}%`;
        document.getElementById('ramUsageDesc').textContent = `${sys.RAMUsedGB} GB used of ${sys.RAMTotalGB} GB total`;
        
        const ramGradient = document.getElementById('ramGradient');
        // Reset and Animate
        ramGradient.style.background = `conic-gradient(var(--cyan) 0%, transparent 0%)`;
        setTimeout(() => {
            const deg = (ramPercent / 100) * 360;
            // The gradient fills clockwise
            ramGradient.style.background = `conic-gradient(var(--cyan) ${deg}deg, transparent ${deg}deg)`;
        }, 200);

        // Storage
        const storageContainer = document.getElementById('storageContainer');
        storageContainer.innerHTML = '';
        if (data.Storage && data.Storage.length > 0) {
            data.Storage.forEach(disk => {
                const used = disk.SizeGB - disk.FreeGB;
                const percent = (used / disk.SizeGB) * 100;
                
                const item = document.createElement('div');
                item.className = 'storage-item';
                item.innerHTML = `
                    <div class="storage-header">
                        <span>ARRAY ${disk.DeviceID}</span>
                        <span>${used.toFixed(1)} GB / ${disk.SizeGB} GB</span>
                    </div>
                    <div class="s-bar-bg">
                        <div class="s-bar-fill" style="width: 0%"></div>
                    </div>
                `;
                storageContainer.appendChild(item);
                
                // Animate bar
                setTimeout(() => {
                    item.querySelector('.s-bar-fill').style.width = `${percent}%`;
                }, 100);
            });
        } else {
            storageContainer.innerHTML = '<p class="cyan-text">No storage arrays detected.</p>';
        }

        // Services
        const servicesTable = document.getElementById('servicesTable').querySelector('tbody');
        servicesTable.innerHTML = '';
        document.getElementById('searchServices').value = ''; 
        if (data.Services && data.Services.length > 0) {
            document.getElementById('servicesCount').textContent = data.Services.length;
            data.Services.forEach(srv => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${srv.Name}</td>
                    <td>${srv.DisplayName || '-'}</td>
                    <td style="color: var(--cyan)">${srv.Status}</td>
                `;
                servicesTable.appendChild(tr);
            });
        }

        // Applications
        const appsTable = document.getElementById('appsTable').querySelector('tbody');
        appsTable.innerHTML = '';
        document.getElementById('searchApps').value = '';
        if (data.Applications && data.Applications.length > 0) {
            document.getElementById('appsCount').textContent = data.Applications.length;
            data.Applications.forEach(app => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${app.DisplayName}</td>
                    <td>${app.DisplayVersion || '-'}</td>
                    <td>${app.Publisher || '-'}</td>
                `;
                appsTable.appendChild(tr);
            });
        }
    }
});
