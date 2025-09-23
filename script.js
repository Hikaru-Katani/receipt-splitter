// Global state
let receiptData = {
    name: '',
    items: [],
    tax: 0,
    tip: 0,
    people: {},
    payments: {}
};

let currentGuest = '';
let isHost = true;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    checkUrlParams();
    renderItems(); // Show empty state initially
    setTimeout(loadDraft, 100); // Load draft after other init functions
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

// NEW: Function to start a new receipt
function newReceipt() {
    // Confirm if there's existing data
    if (receiptData.items.length > 0 || receiptData.name) {
        if (!confirm('This will clear your current receipt. Are you sure?')) {
            return;
        }
    }
    
    // Reset all data
    receiptData = {
        name: '',
        items: [],
        tax: 0,
        tip: 0,
        people: {},
        payments: {}
    };
    
    // Clear form fields
    document.getElementById('receipt-name').value = '';
    document.getElementById('tax-amount').value = '';
    document.getElementById('tip-amount').value = '';
    document.getElementById('item-name').value = '';
    document.getElementById('item-price').value = '';
    
    // Hide share link section
    document.getElementById('share-link').style.display = 'none';
    
    // Clear draft from localStorage
    localStorage.removeItem('receipt_draft');
    
    // Re-render items (will show empty state)
    renderItems();
    
    // Focus on receipt name field
    document.getElementById('receipt-name').focus();
    
    // Show confirmation
    alert('New receipt started! You can now enter items for a fresh receipt.');
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
    button.textContent = 'Copied!';
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
            <div class="summary-name">Receipt: ${receiptData.name}</div>
            <div class="summary-items">
                <strong>Items Total:</strong> $${totalItemsValue.toFixed(2)} | 
                <strong>Tax:</strong> $${receiptData.tax.toFixed(2)} | 
                <strong>Tip:</strong> $${receiptData.tip.toFixed(2)} | 
                <strong>Grand Total:</strong> $${totalBill.toFixed(2)}
            </div>
        </div>
    `;
    
    // FIXED: Better detection of people with claims
    const peopleWithClaims = Object.keys(people);
    const hasPeopleClaims = peopleWithClaims.length > 0;
    
    // Debug info (remove this in production)
    console.log('People with claims:', peopleWithClaims);
    console.log('Has people claims:', hasPeopleClaims);
    
    if (hasPeopleClaims) {
        // Payment tracking summary
        let totalPaid = 0;
        let totalOwed = 0;
        const owingDetails = [];
        
        // Show each person's breakdown with payment status
        peopleWithClaims.forEach(person => {
            const personData = people[person];
            const myProportion = totalItemsValue > 0 ? personData.subtotal / totalItemsValue : 0;
            const myTax = receiptData.tax * myProportion;
            const myTip = receiptData.tip * myProportion;
            const total = personData.subtotal + myTax + myTip;
            const paid = receiptData.payments[person] || 0;
            const balance = total - paid;
            
            totalOwed += total;
            totalPaid += paid;
            
            // Track who owes what for the summary
            if (balance > 0.01) {
                owingDetails.push({ person, amount: balance });
            }
            
            const paymentStatus = balance <= 0.01 ? 'paid' : balance < total ? 'partial' : 'unpaid';
            const statusIcon = balance <= 0.01 ? '✅' : balance < total ? '🟡' : '❌';
            const statusColor = balance <= 0.01 ? '#38a169' : balance < total ? '#d69e2e' : '#e53e3e';
            
            summaryHtml += `
                <div class="summary-card ${paymentStatus}">
                    <div class="summary-name">
                        ${statusIcon} ${person}
                        <span class="payment-status" style="color: ${statusColor}; font-size: 0.9rem; font-weight: normal;">
                            ${balance <= 0.01 ? 'PAID' : balance < total ? 'PARTIAL' : 'UNPAID'}
                        </span>
                    </div>
                    <div class="summary-items">
                        <strong>Items:</strong> ${personData.items.map(item => item.name).join(', ')}<br>
                        <strong>Breakdown:</strong> $${personData.subtotal.toFixed(2)} (items) + $${myTax.toFixed(2)} (tax) + $${myTip.toFixed(2)} (tip)
                    </div>
                    <div class="payment-tracking">
                        <div class="amount-owed">Total Bill: $${total.toFixed(2)}</div>
                        <div class="payment-input">
                            <label>Amount Paid:</label>
                            <input type="number" step="0.01" value="${paid.toFixed(2)}" 
                                   onchange="updatePayment('${person}', this.value)"
                                   class="payment-amount">
                        </div>
                        <div class="balance" style="color: ${statusColor}; font-weight: bold;">
                            ${balance <= 0.01 ? 'Fully Paid' : `Still Owes: $${balance.toFixed(2)}`}
                        </div>
                    </div>
                </div>
            `;
        });
        
        // Overall payment summary with "Who Owes How Much"
        const remainingBalance = totalOwed - totalPaid;
        summaryHtml += `
            <div class="summary-card payment-summary">
                <div class="summary-name">💰 Payment Summary</div>
                <div class="payment-totals">
                    <div class="total-row">
                        <span>Total Owed:</span>
                        <span class="amount">$${totalOwed.toFixed(2)}</span>
                    </div>
                    <div class="total-row">
                        <span>Total Paid:</span>
                        <span class="amount paid">$${totalPaid.toFixed(2)}</span>
                    </div>
                    <div class="total-row balance-row">
                        <span>Remaining Balance:</span>
                        <span class="amount ${remainingBalance <= 0.01 ? 'paid' : 'unpaid'}">
                            $${remainingBalance.toFixed(2)}
                        </span>
                    </div>
                </div>
        `;
        
        // Add "Who Owes How Much" section
        if (owingDetails.length > 0) {
            summaryHtml += `
                <div class="who-owes-section">
                    <h4 style="margin: 20px 0 10px 0; color: #2d3748; font-size: 1.1rem;">📋 Who Still Owes Money:</h4>
                    <ul style="margin: 0; padding: 0; list-style: none; background: #f7fafc; border-radius: 8px; padding: 15px;">
            `;
            
            owingDetails.forEach(({ person, amount }) => {
                summaryHtml += `
                    <li style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 600; color: #2d3748;">${person}</span>
                        <span style="color: #e53e3e; font-weight: 700; font-size: 1.1rem;">$${amount.toFixed(2)}</span>
                    </li>
                `;
            });
            
            summaryHtml += `
                    </ul>
                </div>
            `;
        } else {
            summaryHtml += `
                <div class="who-owes-section">
                    <h4 style="margin: 20px 0 10px 0; color: #38a169; font-size: 1.1rem;">✅ Everyone Has Paid!</h4>
                </div>
            `;
        }
        
        summaryHtml += `
                ${remainingBalance <= 0.01 ? 
                    '<div class="all-paid">🎉 All payments received!</div>' : 
                    `<div class="pending-payment">Still waiting for $${remainingBalance.toFixed(2)} total</div>`
                }
            </div>
        `;
    } else {
        // No one has claimed items yet
        summaryHtml += `
            <div class="summary-card">
                <div class="summary-name">⏳ Waiting for People to Claim Items</div>
                <div class="summary-items">
                    No one has claimed any items yet. Share the link with your friends so they can select what they ordered!
                </div>
            </div>
        `;
    }
    
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

function updatePayment(person, amount) {
    const paymentAmount = parseFloat(amount) || 0;
    receiptData.payments[person] = paymentAmount;
    
    // Save to localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const receiptId = urlParams.get('receipt');
    
    if (receiptId) {
        localStorage.setItem(`receipt_${receiptId}`, JSON.stringify(receiptData));
    } else {
        // Save draft
        localStorage.setItem('receipt_draft', JSON.stringify(receiptData));
    }
    
    // Re-render summary to update colors and status
    renderSummary();
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
    button.textContent = 'Updated';
    
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

// NEW: Function to edit receipt items
function editReceipt() {
    // Ask for confirmation since this might affect shared links
    const hasSharedLink = document.getElementById('share-link').style.display !== 'none';
    if (hasSharedLink) {
        if (!confirm('This receipt has been shared with others. Editing items might affect their selections. Continue?')) {
            return;
        }
    }
    
    document.getElementById('summary-section').style.display = 'none';
    document.getElementById('host-section').style.display = 'block';
    
    // Focus on add item field for quick editing
    document.getElementById('item-name').focus();
}

// Auto-save every few seconds
setInterval(autoSave, 3000);
