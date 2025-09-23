// Global state
let receiptData = {
    name: '',
    items: [],
    tax: 0,
    tip: 0,
    people: {}
};

let currentGuest = '';
let isHost = true;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    checkUrlParams();
    renderItems(); // Show empty state initially
});

function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const receiptId = urlParams.get('receipt');
    
    if (receiptId) {
        // Guest mode - people can only claim items
        isHost = false;
        loadSharedReceipt(receiptId);
        document.getElementById('host-section').style.display = 'none';
        document.getElementById('guest-section').style.display = 'block';
    }
}

function addItem() {
    const name = document.getElementById('item-name').value.trim();
    const price = parseFloat(document.getElementById('item-price').value);
    
    if (!name || !price || price <= 0) {
        alert('Please enter a valid item name and price');
        return;
    }
    
    const item = {
        id: Date.now(),
        name: name,
        price: price,
        claimedBy: []
    };
    
    receiptData.items.push(item);
    document.getElementById('item-name').value = '';
    document.getElementById('item-price').value = '';
    
    renderItems();
    
    // Auto-focus back to item name for quick entry
    document.getElementById('item-name').focus();
}

function renderItems() {
    const container = document.getElementById('items-list');
    
    if (receiptData.items.length === 0) {
        container.innerHTML = '<div class="empty-state">No items added yet. Start entering items from your receipt.</div>';
        return;
    }
    
    container.innerHTML = '';
    
    receiptData.items.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'item';
        itemEl.innerHTML = `
            <div class="item-info">
                <span class="item-name">${item.name}</span>
                <span class="item-price">$${item.price.toFixed(2)}</span>
            </div>
            <div class="item-actions">
                <button class="delete-btn" onclick="deleteItem(${item.id})">Delete</button>
            </div>
        `;
        container.appendChild(itemEl);
    });
}

function deleteItem(id) {
    receiptData.items = receiptData.items.filter(item => item.id !== id);
    renderItems();
}

function generateShareLink() {
    const receiptName = document.getElementById('receipt-name').value.trim();
    const tax = parseFloat(document.getElementById('tax-amount').value) || 0;
    const tip = parseFloat(document.getElementById('tip-amount').value) || 0;
    
    if (!receiptName) {
        alert('Please enter a receipt name');
        document.getElementById('receipt-name').focus();
        return;
    }
    
    if (receiptData.items.length === 0) {
        alert('Please add at least one item from your receipt');
        document.getElementById('item-name').focus();
        return;
    }
    
    receiptData.name = receiptName;
    receiptData.tax = tax;
    receiptData.tip = tip;
    
    // Save to localStorage (in a real app, this would be sent to a server)
    const receiptId = Date.now().toString();
    localStorage.setItem(`receipt_${receiptId}`, JSON.stringify(receiptData));
    
    const shareUrl = `${window.location.origin}${window.location.pathname}?receipt=${receiptId}`;
    document.getElementById('share-url').value = shareUrl;
    document.getElementById('share-link').style.display = 'block';
    
    // Scroll to share section
    document.getElementById('share-link').scrollIntoView({ behavior: 'smooth' });
}

function copyLink() {
    const shareUrl = document.getElementById('share-url');
    shareUrl.select();
    shareUrl.setSelectionRange(0, 99999);
    document.execCommand('copy');
    
    // Show feedback
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = 'Copied! ✓';
    button.style.background = '#38a169';
    
    setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '';
    }, 2000);
}

function loadSharedReceipt(receiptId) {
    const savedData = localStorage.getItem(`receipt_${receiptId}`);
    if (savedData) {
        receiptData = JSON.parse(savedData);
        document.getElementById('receipt-title').textContent = receiptData.name;
        renderGuestItems();
    } else {
        alert('Receipt not found! Please check your link.');
    }
}

function setGuestName() {
    const name = document.getElementById('guest-name').value.trim();
    if (!name) {
        alert('Please enter your name');
        return;
    }
    currentGuest = name;
    document.getElementById('guest-name').disabled = true;
    renderGuestItems();
    
    // Scroll to items
    document.getElementById('guest-items-list').scrollIntoView({ behavior: 'smooth' });
}

function renderGuestItems() {
    const container = document.getElementById('guest-items-list');
    container.innerHTML = '';
    
    if (receiptData.items.length === 0) {
        container.innerHTML = '<div class="empty-state">No items available to select.</div>';
        return;
    }
    
    receiptData.items.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'item guest-item';
        itemEl.onclick = () => toggleItemSelection(item.id);
        
        const isSelected = item.claimedBy.includes(currentGuest);
        if (isSelected) {
            itemEl.classList.add('selected');
        }
        
        // Show who else claimed this item
        const otherClaimers = item.claimedBy.filter(name => name !== currentGuest);
        const claimerText = otherClaimers.length > 0 ? ` (also claimed by: ${otherClaimers.join(', ')})` : '';
        
        itemEl.innerHTML = `
            <input type="checkbox" class="item-checkbox" ${isSelected ? 'checked' : ''} 
                   onchange="toggleItemSelection(${item.id})" onclick="event.stopPropagation()">
            <div class="item-info">
                <span class="item-name">${item.name}${claimerText}</span>
                <span class="item-price">$${item.price.toFixed(2)}</span>
            </div>
        `;
        container.appendChild(itemEl);
    });
    
    updateGuestTotal();
}

function toggleItemSelection(itemId) {
    if (!currentGuest) {
        alert('Please set your name first');
        return;
    }
    
    const item = receiptData.items.find(i => i.id === itemId);
    if (!item) return;
    
    const index = item.claimedBy.indexOf(currentGuest);
    if (index > -1) {
        item.claimedBy.splice(index, 1);
    } else {
        item.claimedBy.push(currentGuest);
    }
    
    // Save updated data
    const urlParams = new URLSearchParams(window.location.search);
    const receiptId = urlParams.get('receipt');
    localStorage.setItem(`receipt_${receiptId}`, JSON.stringify(receiptData));
    
    renderGuestItems();
}

function updateGuestTotal() {
    if (!currentGuest) return;
    
    const myItems = receiptData.items.filter(item => 
        item.claimedBy.includes(currentGuest)
    );
    
    if (myItems.length === 0) {
        document.getElementById('guest-total').style.display = 'none';
        return;
    }
    
    document.getElementById('guest-total').style.display = 'block';
    
    const subtotal = myItems.reduce((sum, item) => sum + item.price, 0);
    const totalItemsValue = receiptData.items.reduce((sum, item) => sum + item.price, 0);
    const myProportion = totalItemsValue > 0 ? subtotal / totalItemsValue : 0;
    
    const myTax = receiptData.tax * myProportion;
    const myTip = receiptData.tip * myProportion;
    const total = subtotal + myTax + myTip;
    
    const totalContainer = document.getElementById('guest-total');
    totalContainer.innerHTML = `
        <h3>Your Total</h3>
        <p><strong>Items:</strong> $${subtotal.toFixed(2)}</p>
        <p><strong>Tax (your share):</strong> $${myTax.toFixed(2)}</p>
        <p><strong>Tip (your share):</strong> $${myTip.toFixed(2)}</p>
        <div class="total-amount">You Owe: $${total.toFixed(2)}</div>
    `;
}

function showSummary() {
    if (receiptData.items.length === 0) {
        alert('No items to summarize. Please add items first.');
        return;
    }
    
    // Update receipt data with current values
    receiptData.name = document.getElementById('receipt-name').value.trim() || 'Untitled Receipt';
    receiptData.tax = parseFloat(document.getElementById('tax-amount').value) || 0;
    receiptData.tip = parseFloat(document.getElementById('tip-amount').value) || 0;
    
    document.getElementById('host-section').style.display = 'none';
    document.getElementById('summary-section').style.display = 'block';
    
    renderSummary();
}

function renderSummary() {
    const summaryContainer = document.getElementById('summary-content');
    const people = {};
    
    // Calculate each person's share
    receiptData.items.forEach(item => {
        item.claimedBy.forEach(person => {
            if (!people[person]) {
                people[person] = { items: [], subtotal: 0 };
            }
            people[person].items.push(item);
            people[person].subtotal += item.price;
        });
    });
    
    const totalItemsValue = receiptData.items.reduce((sum, item) => sum + item.price, 0);
    const totalBill = totalItemsValue + receiptData.tax + receiptData.tip;
    
    let summaryHtml = `
        <div class="summary-card">
            <div class="summary-name">📋 ${receiptData.name}</div>
            <div class="summary-items">
                <strong>Items Total:</strong> $${totalItemsValue.toFixed(2)} | 
                <strong>Tax:</strong> $${receiptData.tax.toFixed(2)} | 
                <strong>Tip:</strong> $${receiptData.tip.toFixed(2)} | 
                <strong>Grand Total:</strong> $${totalBill.toFixed(2)}
            </div>
        </div>
    `;
    
    // Show each person's breakdown
    Object.keys(people).forEach(person => {
        const personData = people[person];
        const myProportion = totalItemsValue > 0 ? personData.subtotal / totalItemsValue : 0;
        const myTax = receiptData.tax * myProportion;
        const myTip = receiptData.tip * myProportion;
        const total = personData.subtotal + myTax + myTip;
        
        summaryHtml += `
            <div class="summary-card">
                <div class="summary-name">👤 ${person}</div>
                <div class="summary-items">
                    <strong>Items:</strong> ${personData.items.map(item => item.name).join(', ')}<br>
                    <strong>Breakdown:</strong> $${personData.subtotal.toFixed(2)} (items) + $${myTax.toFixed(2)} (tax) + $${myTip.toFixed(2)} (tip)
                </div>
                <div class="summary-total">Owes: $${total.toFixed(2)}</div>
            </div>
        `;
    });
    
    // Show unclaimed items
    const unclaimedItems = receiptData.items.filter(item => 
        item.claimedBy.length === 0
    );
    
    if (unclaimedItems.length > 0) {
        const unclaimedTotal = unclaimedItems.reduce((sum, item) => sum + item.price, 0);
        summaryHtml += `
            <div class="summary-card unclaimed-items">
                <div class="summary-name">⚠️ Unclaimed Items</div>
                <div class="summary-items">
                    <strong>Items:</strong> ${unclaimedItems.map(item => `${item.name} ($${item.price.toFixed(2)})`).join(', ')}<br>
                    <strong>Total Value:</strong> $${unclaimedTotal.toFixed(2)}
                </div>
                <div style="color: #c53030; font-weight: 600; margin-top: 10px;">
                    These items need to be claimed by someone or split equally.
                </div>
            </div>
        `;
    }
    
    summaryContainer.innerHTML = summaryHtml;
}

function refreshSummary() {
    // Reload data from localStorage if we're viewing a shared receipt
    const urlParams = new URLSearchParams(window.location.search);
    const receiptId = urlParams.get('receipt');
    
    if (receiptId) {
        const savedData = localStorage.getItem(`receipt_${receiptId}`);
        if (savedData) {
            receiptData = JSON.parse(savedData);
        }
    }
    
    renderSummary();
    
    // Show feedback
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = '✓ Updated';
    
    setTimeout(() => {
        button.textContent = originalText;
    }, 1500);
}

function backToHost() {
    document.getElementById('summary-section').style.display = 'none';
    document.getElementById('host-section').style.display = 'block';
}

// Allow Enter key to add items quickly
document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        const activeElement = document.activeElement;
        
        // If in item name or price field, add the item
        if (activeElement && (activeElement.id === 'item-name' || activeElement.id === 'item-price')) {
            event.preventDefault();
            addItem();
        }
        
        // If in guest name field, set the name
        if (activeElement && activeElement.id === 'guest-name') {
            event.preventDefault();
            setGuestName();
        }
    }
});

// Auto-save functionality for host
function autoSave() {
    if (isHost && receiptData.items.length > 0) {
        const receiptName = document.getElementById('receipt-name').value.trim();
        const tax = parseFloat(document.getElementById('tax-amount').value) || 0;
        const tip = parseFloat(document.getElementById('tip-amount').value) || 0;
        
        receiptData.name = receiptName;
        receiptData.tax = tax;
        receiptData.tip = tip;
        
        // Save to localStorage with a draft key
        localStorage.setItem('receipt_draft', JSON.stringify(receiptData));
    }
}

// Load draft on page load
function loadDraft() {
    if (isHost) {
        const draftData = localStorage.getItem('receipt_draft');
        if (draftData) {
            receiptData = JSON.parse(draftData);
            
            // Populate form fields
            if (receiptData.name) document.getElementById('receipt-name').value = receiptData.name;
            if (receiptData.tax) document.getElementById('tax-amount').value = receiptData.tax;
            if (receiptData.tip) document.getElementById('tip-amount').value = receiptData.tip;
            
            renderItems();
        }
    }
}

// Auto-save every few seconds
setInterval(autoSave, 3000);

// Load draft when page loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(loadDraft, 100); // Small delay to ensure other init functions run first
});
