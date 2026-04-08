document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('connectForm');
    const submitBtn = document.getElementById('submitBtn');
    const saveBtn = document.getElementById('saveBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const spinner = document.getElementById('spinner');
    const errorBox = document.getElementById('errorBox');
    const resultsSection = document.getElementById('results');
    const deviceList = document.getElementById('deviceList');

    // Search Inputs
    const searchServices = document.getElementById('searchServices');
    const searchApps = document.getElementById('searchApps');

    // Initial Load
    fetchDevices();

    // --- Device Management ---
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
            deviceList.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.85rem;">No devices saved yet.</p>';
            return;
        }

        devices.forEach(dev => {
            const div = document.createElement('div');
            div.className = 'device-item';
            div.innerHTML = `
                <div class="device-info">
                    <span class="device-name">${dev.name}</span>
                    <span class="device-ip">${dev.ip}</span>
                </div>
                <button class="device-delete" data-id="${dev.id}">&times;</button>
            `;
            
            // Connect on click
            div.addEventListener('click', (e) => {
                if(e.target.classList.contains('device-delete')) return;
                document.getElementById('name').value = dev.name;
                document.getElementById('ip').value = dev.ip;
                document.getElementById('username').value = dev.username;
                document.getElementById('password').value = dev.password;
                
                // Trigger form submission
                form.dispatchEvent(new Event('submit'));
            });

            // Delete on click
            div.querySelector('.device-delete').addEventListener('click', async () => {
                await fetch(`/api/devices/${dev.id}`, { method: 'DELETE' });
                fetchDevices();
            });

            deviceList.appendChild(div);
        });
    }

    saveBtn.addEventListener('click', async () => {
        const name = document.getElementById('name').value || 'Unnamed Device';
        const ip = document.getElementById('ip').value;
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (!ip || !username || !password) {
            alert('Please fill out IP, Username, and Password to save a device.');
            return;
        }

        await fetch('/api/devices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, ip, username, password })
        });
        
        fetchDevices();
        alert('Device saved to sidebar!');
    });


    // --- Connect & Fetch ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        errorBox.classList.add('hidden');
        resultsSection.classList.add('hidden');
        submitBtn.disabled = true;
        btnText.textContent = 'Connecting...';
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
                throw new Error(data.details || data.error || 'Failed to connect to the target machine.');
            }

            populateDashboard(data);
            resultsSection.classList.remove('hidden');
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (error) {
            errorBox.textContent = `Error: ${error.message}`;
            errorBox.classList.remove('hidden');
        } finally {
            submitBtn.disabled = false;
            btnText.textContent = 'Connect & Fetch Stats';
            spinner.classList.add('hidden');
        }
    });

    // --- Search Filtering ---
    function setupFilter(inputId, tableId) {
        document.getElementById(inputId).addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const tbody = document.getElementById(tableId).querySelector('tbody');
            const rows = tbody.querySelectorAll('tr');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(term) ? '' : 'none';
            });
        });
    }
    
    setupFilter('searchServices', 'servicesTable');
    setupFilter('searchApps', 'appsTable');


    // --- Dom Population ---
    function populateDashboard(data) {
        // System Info
        const sys = data.SystemInfo;
        document.getElementById('osName').textContent = sys.OSName;
        document.getElementById('osVersion').textContent = sys.OSVersion;
        document.getElementById('cpuName').textContent = sys.Processor;
        document.getElementById('ramUsage').textContent = `${sys.RAMUsedGB} GB / ${sys.RAMTotalGB} GB`;
        
        const ramPercent = (sys.RAMUsedGB / sys.RAMTotalGB) * 100;
        const ramProgressBar = document.getElementById('ramProgress');
        setTimeout(() => {
            ramProgressBar.style.width = `${Math.min(ramPercent, 100)}%`;
            ramProgressBar.style.background = ramPercent > 85 ? 'var(--danger-color)' : 'linear-gradient(90deg, var(--primary-color), var(--success-color))';
        }, 50);

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
                    <div class="storage-item-header">
                        <span>Drive ${disk.DeviceID}</span>
                        <span>${used.toFixed(2)} GB / ${disk.SizeGB} GB</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${percent}%; background: ${percent > 90 ? 'var(--danger-color)' : 'linear-gradient(90deg, var(--primary-color), var(--success-color))'}"></div>
                    </div>
                `;
                storageContainer.appendChild(item);
            });
        } else {
            storageContainer.innerHTML = '<p>No storage info available.</p>';
        }

        // Active Users
        const usersList = document.getElementById('usersList');
        usersList.innerHTML = '';
        if (data.ConnectedUsers && data.ConnectedUsers.length > 0) {
            data.ConnectedUsers.forEach(u => {
                const li = document.createElement('li');
                li.className = 'user-item';
                const isAct = u.State && u.State.toLowerCase().includes('act');
                li.innerHTML = `
                    <span><strong>User:</strong> ${u.Username}</span>
                    <span><strong>State:</strong> <span class="${isAct ? 'state-active' : ''}">${u.State}</span></span>
                    <span><strong>Logon Time:</strong> ${u.LogonTime || 'Unknown'}</span>
                `;
                usersList.appendChild(li);
            });
        } else {
            usersList.innerHTML = '<li class="user-item">No active remote users detected.</li>';
        }

        // Services
        const servicesTable = document.getElementById('servicesTable').querySelector('tbody');
        servicesTable.innerHTML = '';
        // Reset search
        document.getElementById('searchServices').value = ''; 
        if (data.Services && data.Services.length > 0) {
            document.getElementById('servicesCount').textContent = data.Services.length;
            data.Services.forEach(srv => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${srv.Name}</td>
                    <td>${srv.DisplayName || '-'}</td>
                `;
                servicesTable.appendChild(tr);
            });
        } else {
            document.getElementById('servicesCount').textContent = '0';
            servicesTable.innerHTML = '<tr><td colspan="2">No services found.</td></tr>';
        }

        // Applications
        const appsTable = document.getElementById('appsTable').querySelector('tbody');
        appsTable.innerHTML = '';
        // Reset search
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
        } else {
            document.getElementById('appsCount').textContent = '0';
            appsTable.innerHTML = '<tr><td colspan="3">No applications found.</td></tr>';
        }
    }
});
