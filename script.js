// --- 1. DATA MANAGEMENT ---
let stockData = JSON.parse(localStorage.getItem('gStockData')) || [];

function saveData() {
    localStorage.setItem('gStockData', JSON.stringify(stockData));
    updateUI();
}

// --- 2. LOGIC FUNCTIONS ---
function processBulkUpload() {
    const text = document.getElementById('bulk-input').value;
    if(!text.trim()) { alert("Please paste data first!"); return; }

    const entries = [];
    const lines = text.split('\n');
    let currentEntry = {};

    lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith("First name:")) currentEntry.firstname = trimmed.split(":")[1].trim();
        if (trimmed.startsWith("Last name:")) currentEntry.lastname = trimmed.split(":")[1].trim();
        if (trimmed.startsWith("Email:")) currentEntry.email = trimmed.split(":")[1].trim();
        if (trimmed.startsWith("Password:")) {
            currentEntry.pass = trimmed.split(":")[1].trim();
            if(currentEntry.email && currentEntry.pass) {
                entries.push({...currentEntry});
                currentEntry = {}; 
            }
        }
    });

    if (entries.length === 0) { alert("No valid data found!"); return; }

    let addedCount = 0;
    let duplicateCount = 0;

    entries.forEach(entry => {
        const exists = stockData.some(item => item.email === entry.email);
        if (!exists) {
            const newItem = {
                id: stockData.length > 0 ? stockData[stockData.length - 1].id + 1 : 1,
                firstname: entry.firstname || "",
                lastname: entry.lastname || "",
                email: entry.email,
                pass: entry.pass,
                status: 'available',
                paid: false,
                timestamp: new Date().toISOString()
            };
            stockData.push(newItem);
            addedCount++;
        } else { duplicateCount++; }
    });

    saveData();
    document.getElementById('bulk-input').value = ""; 
    document.getElementById('upload-status').innerHTML = `Added: <b class="text-green-600">${addedCount}</b> | Duplicates: <b class="text-red-500">${duplicateCount}</b>`;
}

function getNewAccount() {
    const account = stockData.find(item => item.status === 'available');
    if (!account) { 
        const msg = document.getElementById('error-msg');
        msg.classList.remove('hidden'); 
        setTimeout(() => msg.classList.add('hidden'), 3000);
        return; 
    }
    
    account.status = 'processing';
    saveData();
    
    setTimeout(() => {
        if(window.innerWidth < 768) {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        } else {
            const container = document.getElementById('active-tasks-container');
            container.scrollTop = container.scrollHeight;
        }
    }, 100);
}

function completeTask(id, result) {
    const account = stockData.find(item => item.id === id);
    if (account) {
        account.status = result === 'success' ? 'completed' : 'failed';
        saveData();
    }
}

function markQC(id, status) {
    const account = stockData.find(item => item.id === id);
    if(account) {
        account.status = status;
        saveData();
        renderQCList();
    }
}

function togglePayment(id) {
    const account = stockData.find(item => item.id === id);
    if(account) {
        account.paid = !account.paid;
        saveData();
        renderPaymentLists();
    }
}

// --- 3. UI FUNCTIONS ---
function updateUI() {
    // Stats Calculations
    const available = stockData.filter(i => i.status === 'available').length;
    const processing = stockData.filter(i => i.status === 'processing').length;
    const completed = stockData.filter(i => i.status === 'completed').length;
    const verified = stockData.filter(i => i.status === 'qc_approved').length;
    const paidCount = stockData.filter(i => i.status === 'qc_approved' && i.paid).length;
    const issues = stockData.filter(i => i.status === 'failed' || i.status === 'qc_wrong_pass').length;

    document.getElementById('stat-available').innerText = available;
    document.getElementById('stat-progress').innerText = processing;
    document.getElementById('stat-completed').innerText = completed;
    document.getElementById('stat-verified').innerText = verified;
    document.getElementById('stat-paid').innerText = paidCount;
    document.getElementById('stat-issues').innerText = issues;
    document.getElementById('active-count').innerText = processing + " Active";

    renderActiveTasks();
    renderActivityLog();
    renderAdminTable();

    if(!document.getElementById('view-qc').classList.contains('hidden')) renderQCList();
    if(!document.getElementById('view-payments').classList.contains('hidden')) renderPaymentLists();
}

function renderActiveTasks() {
    const container = document.getElementById('active-tasks-container');
    const tasks = stockData.filter(i => i.status === 'processing');

    if (tasks.length === 0) {
        container.innerHTML = `
            <div class="h-full flex flex-col justify-center items-center text-gray-400 p-6">
                <i class="fa-solid fa-layer-group text-3xl mb-2 text-gray-300"></i>
                <p class="text-sm">No active tasks.</p>
                <p class="text-xs">Click "Get New Email"</p>
            </div>`;
        return;
    }

    let html = '';
    tasks.forEach(task => {
        html += `
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 relative group transition hover:shadow-md">
            <div class="flex justify-between items-start mb-3">
                <button onclick="copyAllDetails(${task.id})" class="text-[10px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold py-1 px-2 rounded border border-indigo-200 flex items-center gap-1 active:scale-95 transition">
                    <i class="fa-regular fa-clipboard"></i> Copy All
                </button>
                <span class="text-[10px] font-mono text-gray-400">#${task.id}</span>
            </div>
            <div class="space-y-3 mb-4">
                <div class="grid grid-cols-1 gap-1">
                    <label class="text-[9px] font-bold text-gray-400 uppercase">First Name</label>
                    <div class="flex">
                        <input type="text" value="${task.firstname || ''}" readonly class="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-l px-2 py-1.5 font-bold focus:outline-none">
                        <button onclick="copyToClipboard('${task.firstname || ''}')" class="bg-gray-100 px-3 rounded-r border border-l-0 border-gray-200 text-gray-500 active:bg-gray-200"><i class="fa-regular fa-copy"></i></button>
                    </div>
                </div>
                <div class="grid grid-cols-1 gap-1">
                    <label class="text-[9px] font-bold text-gray-400 uppercase">Email</label>
                    <div class="flex">
                        <input type="text" value="${task.email}" readonly class="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-l px-2 py-1.5 font-mono focus:outline-none">
                        <button onclick="copyToClipboard('${task.email}')" class="bg-gray-100 px-3 rounded-r border border-l-0 border-gray-200 text-gray-500 active:bg-gray-200"><i class="fa-regular fa-copy"></i></button>
                    </div>
                </div>
                <div class="grid grid-cols-1 gap-1">
                    <label class="text-[9px] font-bold text-gray-400 uppercase">Password</label>
                    <div class="flex">
                        <input type="text" value="${task.pass}" readonly class="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-l px-2 py-1.5 font-mono focus:outline-none">
                        <button onclick="copyToClipboard('${task.pass}')" class="bg-gray-100 px-3 rounded-r border border-l-0 border-gray-200 text-gray-500 active:bg-gray-200"><i class="fa-regular fa-copy"></i></button>
                    </div>
                </div>
            </div>
            <div class="flex gap-2">
                <button onclick="completeTask(${task.id}, 'success')" class="flex-1 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-bold py-2 rounded-lg text-xs transition shadow-sm flex items-center justify-center gap-1"><i class="fa-solid fa-check"></i> Done</button>
                <button onclick="completeTask(${task.id}, 'failed')" class="flex-1 bg-white border border-red-200 text-red-500 hover:bg-red-50 active:bg-red-100 font-bold py-2 rounded-lg text-xs transition flex items-center justify-center gap-1"><i class="fa-solid fa-xmark"></i> Fail</button>
            </div>
        </div>
        `;
    });

    if(container.innerHTML !== html) container.innerHTML = html;
}

function renderPaymentLists() {
    const pendingContainer = document.getElementById('payment-pending-list');
    const paidContainer = document.getElementById('payment-paid-list');
    
    const verifiedItems = stockData.filter(i => i.status === 'qc_approved');
    const pendingItems = verifiedItems.filter(i => !i.paid);
    const paidItems = verifiedItems.filter(i => i.paid);

    // Render Pending
    if(pendingItems.length === 0) {
        pendingContainer.innerHTML = '<p class="text-gray-400 text-xs italic">No pending payments.</p>';
    } else {
        let html = '';
        pendingItems.forEach(item => {
            html += `
                <div class="bg-white p-3 rounded-lg border border-orange-100 shadow-sm flex justify-between items-center">
                    <div><div class="flex items-center gap-2"><span class="font-mono text-xs font-bold text-gray-700">#${item.id}</span><span class="text-xs text-gray-600 truncate w-32 md:w-48">${item.email}</span></div></div>
                    <button onclick="togglePayment(${item.id})" class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md text-xs font-bold transition shadow-sm active:scale-95">Mark Paid</button>
                </div>
            `;
        });
        pendingContainer.innerHTML = html;
    }

    // Render Paid
    if(paidItems.length === 0) {
        paidContainer.innerHTML = '<p class="text-gray-400 text-xs italic">No paid history.</p>';
    } else {
        let html = '';
        paidItems.reverse().slice(0, 20).forEach(item => {
            html += `
                <div class="bg-gray-50 p-2 rounded border border-gray-100 flex justify-between items-center">
                    <div class="flex items-center gap-2 text-gray-500"><span class="font-mono text-[10px]">#${item.id}</span><span class="text-xs line-through decoration-gray-400">${item.email}</span></div>
                    <button onclick="togglePayment(${item.id})" class="text-[10px] text-red-400 hover:text-red-600 font-medium">Undo</button>
                </div>
            `;
        });
        paidContainer.innerHTML = html;
    }
}

function renderActivityLog() {
    const list = document.getElementById('recent-activity-list');
    const items = stockData.filter(i => ['completed', 'failed', 'qc_approved', 'qc_wrong_pass'].includes(i.status)).reverse().slice(0, 15);
    
    if(items.length === 0) {
        list.innerHTML = '<p class="text-gray-400 text-center text-xs py-4">No recent activity</p>';
        return;
    }

    let html = '';
    items.forEach(item => {
        let icon = ''; let color = ''; let text = item.status;
        if(item.status === 'completed') { icon = 'fa-clock text-yellow-500'; color='text-yellow-700'; text="To QC"; }
        if(item.status === 'qc_approved') { 
            icon = 'fa-check-circle text-green-500'; 
            color = item.paid ? 'text-indigo-600 font-bold' : 'text-green-700 font-bold'; 
            text = item.paid ? "PAID" : "Verified"; 
        }
        if(item.status === 'qc_wrong_pass') { icon = 'fa-key text-red-400'; color='text-red-600'; text="Pass"; }
        if(item.status === 'failed') { icon = 'fa-xmark-circle text-red-500'; color='text-red-600'; text="Fail"; }

        html += `
            <div class="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100 mb-1">
                <span class="font-mono text-[9px] text-gray-400">#${item.id}</span>
                <span class="text-[10px] truncate w-24 text-gray-600">${item.email}</span>
                <span class="text-[9px] ${color} flex items-center gap-1"><i class="fa-solid ${icon}"></i> ${text}</span>
            </div>
        `;
    });
    list.innerHTML = html;
}

function renderQCList() {
    const container = document.getElementById('qc-list-container');
    const qcItems = stockData.filter(i => i.status === 'completed');

    if(qcItems.length === 0) {
        container.innerHTML = `
            <div class="text-center py-10 text-gray-400 bg-white rounded-xl shadow border border-gray-100">
                <i class="fa-solid fa-clipboard-check text-3xl mb-2 text-gray-300"></i>
                <p class="text-sm">All clear.</p>
            </div>`;
        return;
    }

    let html = '';
    qcItems.forEach(item => {
        html += `
            <div class="bg-white p-3 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition">
                <div class="flex items-center justify-between mb-2">
                     <div class="bg-gray-100 text-gray-500 font-bold h-6 w-6 rounded-full flex items-center justify-center text-[10px]">#${item.id}</div>
                     <div class="flex gap-2">
                        <button onclick="markQC(${item.id}, 'qc_approved')" class="bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1 rounded text-xs font-bold active:scale-95">OK</button>
                        <button onclick="markQC(${item.id}, 'qc_wrong_pass')" class="bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded text-xs font-bold active:scale-95">Pass</button>
                     </div>
                </div>
                <div class="space-y-1">
                    <div class="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded border">
                        <span class="font-mono text-xs text-gray-800 truncate flex-1">${item.email}</span>
                        <button onclick="copyToClipboard('${item.email}')" class="text-blue-500 p-1"><i class="fa-regular fa-copy"></i></button>
                    </div>
                    <div class="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded border">
                        <span class="font-mono text-xs text-gray-500 truncate flex-1">${item.pass}</span>
                        <button onclick="copyToClipboard('${item.pass}')" class="text-blue-500 p-1"><i class="fa-regular fa-copy"></i></button>
                    </div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function renderAdminTable() {
    const tbody = document.getElementById('stock-table-body');
    let html = '';
    [...stockData].reverse().slice(0, 30).forEach(item => { 
        let color = "bg-gray-100 text-gray-600";
        if(item.status === 'available') color = "bg-blue-100 text-blue-700";
        if(item.status === 'processing') color = "bg-yellow-100 text-yellow-700";
        if(item.status === 'completed') color = "bg-purple-100 text-purple-700";
        if(item.status === 'qc_approved') color = "bg-emerald-100 text-emerald-700";
        if(item.status.includes('fail') || item.status.includes('wrong')) color = "bg-red-100 text-red-700";

        let paidStatus = item.paid ? '<span class="text-[9px] font-bold text-indigo-600 border border-indigo-200 px-1 rounded">PAID</span>' : '<span class="text-[9px] text-gray-300">-</span>';

        html += `
            <tr class="bg-white border-b hover:bg-gray-50">
                <td class="px-4 py-2 font-bold text-gray-500">#${item.id}</td>
                <td class="px-4 py-2 font-mono text-xs text-gray-700 truncate max-w-[150px]">${item.email}</td>
                <td class="px-4 py-2"><span class="${color} text-[9px] uppercase font-bold px-1.5 py-0.5 rounded">${item.status.replace('qc_', '')}</span></td>
                <td class="px-4 py-2">${paidStatus}</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function switchTab(tab) {
    document.getElementById('view-dashboard').classList.add('hidden');
    document.getElementById('view-stock').classList.add('hidden');
    document.getElementById('view-qc').classList.add('hidden');
    document.getElementById('view-payments').classList.add('hidden');

    const btnBase = "flex-1 md:flex-none px-3 py-2 rounded-lg transition font-medium text-xs md:text-sm text-center whitespace-nowrap";
    const btnInactive = `${btnBase} text-gray-300 hover:bg-slate-800 border border-transparent`;
    const btnActive = `${btnBase} bg-blue-600 text-white`;
    const btnBorderedInactive = `${btnBase} text-gray-300 hover:bg-slate-800 border border-slate-700`;
    const btnBorderedActive = `${btnBase} bg-indigo-600 text-white border border-indigo-500`;

    document.getElementById('btn-dashboard').className = btnInactive;
    document.getElementById('btn-stock').className = btnInactive;
    document.getElementById('btn-qc').className = btnBorderedInactive;
    document.getElementById('btn-payments').className = btnBorderedInactive;

    if (tab === 'dashboard') {
        document.getElementById('view-dashboard').classList.remove('hidden');
        document.getElementById('btn-dashboard').className = btnActive;
    } else if (tab === 'stock') {
        document.getElementById('view-stock').classList.remove('hidden');
        document.getElementById('btn-stock').className = btnActive;
    } else if (tab === 'qc') {
        document.getElementById('view-qc').classList.remove('hidden');
        document.getElementById('btn-qc').className = btnBorderedActive;
        renderQCList();
    } else if (tab === 'payments') {
        document.getElementById('view-payments').classList.remove('hidden');
        document.getElementById('btn-payments').className = btnBorderedActive;
        renderPaymentLists();
    }
}

function copyAllDetails(id) {
    const task = stockData.find(i => i.id === id);
    if (task) {
        const textToCopy = `#${task.id} | Name: ${task.firstname || ''} | Email: ${task.email} | Pass: ${task.pass}`;
        copyToClipboard(textToCopy);
    }
}

function copyToClipboard(text) {
    const tempInput = document.createElement("textarea");
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand("copy");
    document.body.removeChild(tempInput);
    
    const toast = document.getElementById('toast');
    toast.style.opacity = '1';
    setTimeout(() => toast.style.opacity = '0', 1500);
}

function clearDatabase() {
    if(confirm("Clear ALL data?")) {
        localStorage.removeItem('gStockData');
        stockData = [];
        updateUI();
        location.reload();
    }
}

// Init
try {
    updateUI();
} catch(e) {
    console.error("Init error", e);
}
