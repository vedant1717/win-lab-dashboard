document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('connectForm');
    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const spinner = document.getElementById('spinner');
    const errorBox = document.getElementById('errorBox');
    const resultsSection = document.getElementById('results');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // UI Loading State
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

            // Populate Results
            populateDashboard(data);
            
            // Show Results
            resultsSection.classList.remove('hidden');
            
            // Scroll to results seamlessly
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (error) {
            errorBox.textContent = `Error: ${error.message}`;
            errorBox.classList.remove('hidden');
        } finally {
            // Reset UI
            submitBtn.disabled = false;
            btnText.textContent = 'Connect & Fetch Stats';
            spinner.classList.add('hidden');
        }
    });

    function populateDashboard(data) {
        // System Info
        const sys = data.SystemInfo;
        document.getElementById('osName').textContent = sys.OSName;
        document.getElementById('osVersion').textContent = sys.OSVersion;
        document.getElementById('cpuName').textContent = sys.Processor;
        document.getElementById('ramUsage').textContent = `${sys.RAMUsedGB} GB / ${sys.RAMTotalGB} GB`;
        
        const ramPercent = (sys.RAMUsedGB / sys.RAMTotalGB) * 100;
        const ramProgressBar = document.getElementById('ramProgress');
        // Small timeout to allow css transition to occur after display block
        setTimeout(() => {
            ramProgressBar.style.width = `${Math.min(ramPercent, 100)}%`;
            if (ramPercent > 85) {
                ramProgressBar.style.background = 'var(--danger-color)';
            } else {
                ramProgressBar.style.background = 'linear-gradient(90deg, var(--primary-color), var(--success-color))';
            }
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

        // Services
        const servicesTable = document.getElementById('servicesTable').querySelector('tbody');
        servicesTable.innerHTML = '';
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
