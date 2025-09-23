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
});

function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const receiptId = urlParams.get('receipt');
    
    if (receiptId) {
        // Guest mode
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
}

function renderItems() {
    const container = document.getElementById('items-list');
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
        return;
    }
    
    if (receiptData.items.length === 0) {
        alert('Please add at least one item');
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
}

function copyLink() {
    const shareUrl = document.getElementById('share-url');
    shareUrl.select();
    shareUrl.setSelectionRange(0, 99999);
    document.execCommand('copy');
    alert('Link copied to clipboard!');
}

function loadSharedReceipt(receiptId) {
    const savedData = localStorage.getItem(`receipt_${receiptId}`);
    if (savedData) {
        receiptData = JSON.parse(savedData);
        renderGuestItems();
    } else {
        alert('Receipt not found!');
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
}

function renderGuestItems() {
    const container = document.getElementById('guest-items-list');
    container.innerHTML = '';
    
    receiptData.items.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'item guest-item';
        itemEl.onclick = () => toggleItemSelection(item.id);
        
        const isSelected = item.claimedBy.includes(currentGuest);
        if (isSelected) {
            itemEl.classList.add('selected');
        }
        
        itemEl.innerHTML = `
            <input type="checkbox" class="item-checkbox" ${isSelected ? 'checked' : ''} 
                   onchange="toggleItemSelection(${item.id})" onclick="event.stopPropagation()">
            <div class="item-info">
                <span class="item-name">${item.name}</span>
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
    
    const subtotal = myItems.reduce((sum, item) => sum + item.price, 0);
    const totalItems = receiptData.items.reduce((sum, item) => sum + item.price, 0);
    const myShare = totalItems > 0 ? subtotal / totalItems : 0;
    
    const myTax = receiptData.tax * myShare;
    const myTip = receiptData.tip * myShare;
    const total = subtotal + myTax + myTip;
    
    const totalContainer = document.getElementById('guest-total');
    totalContainer.innerHTML = `
        <h3>Your Total</h3>
        <p>Items: $${subtotal.toFixed(2)}</p>
        <p>Tax: $${myTax.toFixed(2)}</p>
        <p>Tip: $${myTip.toFixed(2)}</p>
        <div class="total-amount">Total: $${total.toFixed(2)}</div>
    `;
}

function showSummary() {
    if (receiptData.items.length === 0) {
        alert('No items to summarize');
        return;
    }
    
    document.getElementById('host-section').style.display = 'none';
    document.getElementById('summary-section').style.display = 'block';
    
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
    
    const totalItems = receiptData.items.reduce((sum, item) => sum + item.price, 0);
    
    let summaryHtml = `<h3>${receiptData.name}</h3>`;
    
    Object.keys(people).forEach(person => {
        const personData = people[person];
        const myShare = totalItems > 0 ? personData.subtotal / totalItems : 0;
        const myTax = receiptData.tax * myShare;
        const myTip = receiptData.tip * myShare;
        const total = personData.subtotal + myTax + myTip;
        
        summaryHtml += `
            <div class="summary-card">
                <div class="summary-name">${person}</div>
                <div class="summary-items">
                    Items: ${personData.items.map(item => item.name).join(', ')}
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
        summaryHtml += `
            <div class="summary-card" style="border-left-color: #dc3545;">
                <div class="summary-name">⚠️ Unclaimed Items</div>
                <div class="summary-items">
                    ${unclaimedItems.map(item => `${item.name} ($${item.price.toFixed(2)})`).join(', ')}
                </div>
            </div>
        `;
    }
    
    summaryContainer.innerHTML = summaryHtml;
}

function backToHost() {
    document.getElementById('summary-section').style.display = 'none';
    document.getElementById('host-section').style.display = 'block';
}
