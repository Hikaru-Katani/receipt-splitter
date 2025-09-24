// Global state
let receipts = {}; // Store all receipts
let currentReceiptId = null;
let receiptData = {
    name: '',
    items: [],
    tax: 0,
    tip: 0,
    people: {},
    payments: {},
    confirmedGuests: {}
};

let currentGuest = '';
let isHost = true;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    checkUrlParams();
    loadAllReceipts();
    if (isHost) {
        renderReceiptDashboard();
    }
});


function showDashboard() {
    document.getElementById('receipt-dashboard').style.display = 'block';
    document.getElementById('host-section').style.display = 'none';
    document.getElementById('guest-section').style.display = 'none';
    document.getElementById('summary-section').style.display = 'none';
}

function showHostSection() {
    document.getElementById('receipt-dashboard').style.display = 'none';
    document.getElementById('host-section').style.display = 'block';
    document.getElementById('guest-section').style.display = 'none';
    document.getElementById('summary-section').style.display = 'none';
}

function showGuestSection() {
    document.getElementById('receipt-dashboard').style.display = 'none';
    document.getElementById('host-section').style.display = 'none';
    document.getElementById('guest-section').style.display = 'block';
    document.getElementById('summary-section').style.display = 'none';
}

function showSummarySection() {
    document.getElementById('receipt-dashboard').style.display = 'none';
    document.getElementById('host-section').style.display = 'none';
    document.getElementById('guest-section').style.display = 'none';
    document.getElementById('summary-section').style.display = 'block';
}

// Load all receipts from localStorage
function loadAllReceipts() {
    receipts = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('receipt_')) {
            const receiptId = key.replace('receipt_', '');
            const savedData = localStorage.getItem(key);
            if (savedData) {
                try {
                    receipts[receiptId] = JSON.parse(savedData);
                } catch (e) {
                    console.error('Error loading receipt:', receiptId, e);
                }
            }
        }
    }
}

// Render the receipt dashboard
function renderReceiptDashboard() {
    const container = document.getElementById('receipts-list');
    const receiptIds = Object.keys(receipts);
    
    if (receiptIds.length === 0) {
        container.innerHTML = '<div class="empty-state">No receipts yet. Create your first receipt to get started!</div>';
        return;
    }
    
    container.innerHTML = '';
    
    receiptIds.forEach(receiptId => {
        const receipt = receipts[receiptId];
        const totalItems = receipt.items.length;
        const totalValue = receipt.items.reduce((sum, item) => sum + item.price, 0) + receipt.tax + receipt.tip;
        const people = {};
        
        receipt.items.forEach(item => {
            if (item.claimedBy) {
                item.claimedBy.forEach(person => {
                    people[person] = true;
                });
            }
        });
        
        const totalPeople = Object.keys(people).length;
        const createdDate = new Date(parseInt(receiptId)).toLocaleDateString();
        
        const receiptCard = document.createElement('div');
        receiptCard.className = 'receipt-card';
        receiptCard.innerHTML = `
            <div class="receipt-card-header">
                <div class="receipt-card-title">${receipt.name || 'Untitled Receipt'}</div>
                <div class="receipt-card-date">${createdDate}</div>
            </div>
            <div class="receipt-card-summary">
                <div class="receipt-stat">
                    <div class="receipt-stat-value">${totalItems}</div>
                    <div class="receipt-stat-label">Items</div>
                </div>
                <div class="receipt-stat">
                    <div class="receipt-stat-value">$${totalValue.toFixed(2)}</div>
                    <div class="receipt-stat-label">Total</div>
                </div>
                <div class="receipt-stat">
                    <div class="receipt-stat-value">${totalPeople}</div>
                    <div class="receipt-stat-label">People</div>
                </div>
            </div>
            <div class="receipt-actions">
                <button onclick="editReceipt('${receiptId}')" class="edit-receipt-btn">Edit</button>
                <button onclick="viewReceiptSummary('${receiptId}')" class="view-summary-btn">Summary</button>
                <button onclick="deleteReceipt('${receiptId}')" class="delete-receipt-btn">Delete</button>
            </div>
        `;
        container.appendChild(receiptCard);
    });
}

// Create new receipt
function createNewReceipt() {
    currentReceiptId = Date.now().toString();
    receiptData = {
        name: '',
        items: [],
        tax: 0,
        tip: 0,
        people: {},
        payments: {},
        confirmedGuests: {}
    };
    
    // Clear form fields
    document.getElementById('receipt-name').value = '';
    document.getElementById('tax-amount').value = '';
    document.getElementById('tip-amount').value = '';
    document.getElementById('item-name').value = '';
    document.getElementById('item-price').value = '';
    document.getElementById('share-link').style.display = 'none';
    document.getElementById('share-url').value = '';
    
    showHostSection();
    renderItems();
    document.getElementById('receipt-name').focus();
}

// Edit existing receipt
function editReceipt(receiptId) {
    currentReceiptId = receiptId;
    receiptData = { ...receipts[receiptId] };
    
    // Ensure confirmedGuests exists
    if (!receiptData.confirmedGuests) {
        receiptData.confirmedGuests = {};
    }
    
    // Populate form fields
    document.getElementById('receipt-name').value = receiptData.name || '';
    document.getElementById('tax-amount').value = receiptData.tax || '';
    document.getElementById('tip-amount').value = receiptData.tip || '';
    document.getElementById('item-name').value = '';
    document.getElementById('item-price').value = '';
    
    // Set up share link if this receipt has items
    if (receiptData.items.length > 0) {
        const shareUrl = `${window.location.origin}${window.location.pathname}?receipt=${receiptId}`;
        document.getElementById('share-url').value = shareUrl;
        document.getElementById('share-link').style.display = 'block';
    } else {
        document.getElementById('share-link').style.display = 'none';
        document.getElementById('share-url').value = '';
    }
    
    showHostSection();
    renderItems();
}

// View receipt summary
function viewReceiptSummary(receiptId) {
    currentReceiptId = receiptId;
    receiptData = { ...receipts[receiptId] };
    
    // Ensure confirmedGuests exists
    if (!receiptData.confirmedGuests) {
        receiptData.confirmedGuests = {};
    }
    
    showSummarySection();
    renderSummary();
}

// Delete receipt
function deleteReceipt(receiptId) {
    const receipt = receipts[receiptId];
    if (confirm(`Delete "${receipt.name || 'Untitled Receipt'}"? This cannot be undone.`)) {
        localStorage.removeItem(`receipt_${receiptId}`);
        delete receipts[receiptId];
        renderReceiptDashboard();
    }
}

// Refresh receipt list
function refreshReceiptList() {
    loadAllReceipts();
    renderReceiptDashboard();
}

// Update back buttons to go to dashboard
function backToDashboard() {
    // Save current receipt if it has data
    if (currentReceiptId && (receiptData.items.length > 0 || receiptData.name)) {
        saveCurrentReceipt();
    }
    
    loadAllReceipts();
    renderReceiptDashboard();
    showDashboard();
}

// Save current receipt
function saveCurrentReceipt() {
    if (currentReceiptId) {
        // Update receipt data with current form values
        receiptData.name = document.getElementById('receipt-name').value.trim() || 'Untitled Receipt';
        receiptData.tax = parseFloat(document.getElementById('tax-amount').value) || 0;
        receiptData.tip = parseFloat(document.getElementById('tip-amount').value) || 0;
        
        localStorage.setItem(`receipt_${currentReceiptId}`, JSON.stringify(receiptData));
        receipts[currentReceiptId] = { ...receiptData };
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
    saveCurrentReceipt(); // Auto-save
    
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
    saveCurrentReceipt();
}

// Updated generateShareLink with Firebase
async function generateShareLink() {
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
    
    try {
        // Save to Firebase
        const receiptRef = database.ref('receipts').push();
        await receiptRef.set(receiptData);
        
        currentReceiptId = receiptRef.key;
        
        // Also save locally
        localStorage.setItem(`receipt_${currentReceiptId}`, JSON.stringify(receiptData));
        receipts[currentReceiptId] = { ...receiptData };
        
        const shareUrl = `${window.location.origin}${window.location.pathname}?receipt=${currentReceiptId}`;
        document.getElementById('share-url').value = shareUrl;
        document.getElementById('share-link').style.display = 'block';
        
        console.log('Receipt saved to Firebase:', currentReceiptId);
        document.getElementById('share-link').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('Error saving to Firebase:', error);
        alert('Error creating share link. Please check your internet connection.');
    }
}

// Updated loadSharedReceipt with Firebase sync
function loadSharedReceipt(receiptId) {
    console.log('Loading shared receipt:', receiptId);
    currentReceiptId = receiptId;
    
    const receiptRef = database.ref(`receipts/${receiptId}`);
    
    // Listen for real-time updates
    receiptRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            console.log('Received updated data from Firebase');
            receiptData = data;
            
            // Ensure required properties exist
            if (!receiptData.confirmedGuests) {
                receiptData.confirmedGuests = {};
            }
            if (!receiptData.payments) {
                receiptData.payments = {};
            }
            
            // Cache locally
            localStorage.setItem(`receipt_${receiptId}`, JSON.stringify(receiptData));
            
            // Update UI
            document.getElementById('receipt-title').textContent = receiptData.name;
            if (!isHost) {
                renderGuestItems();
            }
        } else {
            console.error('Receipt not found in Firebase');
            alert('Receipt not found! Please check your link.');
        }
    }, (error) => {
        console.error('Firebase error:', error);
        alert('Error loading receipt. Please check your internet connection.');
    });
}

// Updated toggleItemSelection with Firebase sync
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
    
    // Reset confirmation status when items change
    if (receiptData.confirmedGuests && receiptData.confirmedGuests[currentGuest]) {
        delete receiptData.confirmedGuests[currentGuest];
    }
    
    // Save to Firebase (real-time sync)
    if (currentReceiptId) {
        database.ref(`receipts/${currentReceiptId}`).set(receiptData)
            .then(() => {
                console.log('Item selection synced to Firebase');
            })
            .catch((error) => {
                console.error('Error syncing to Firebase:', error);
                alert('Error syncing changes. Please check your connection.');
            });
    }
    
    renderGuestItems();
}

// Updated confirmSelectionWithHost with Firebase sync
function confirmSelectionWithHost() {
    if (!currentGuest) {
        alert('Please set your name first');
        return;
    }
    
    const myItems = receiptData.items.filter(item => 
        item.claimedBy.includes(currentGuest)
    );
    
    if (myItems.length === 0) {
        alert('Please select at least one item before confirming');
        return;
    }
    
    // Mark this guest as confirmed
    if (!receiptData.confirmedGuests) {
        receiptData.confirmedGuests = {};
    }
    
    receiptData.confirmedGuests[currentGuest] = {
        confirmedAt: new Date().toISOString(),
        items: myItems.map(item => item.name),
        total: myItems.reduce((sum, item) => sum + item.price, 0)
    };
    
    // Save to Firebase
    if (currentReceiptId) {
        database.ref(`receipts/${currentReceiptId}`).set(receiptData)
            .then(() => {
                console.log('Confirmation synced to Firebase');
                updateGuestTotal();
                alert('Your selection has been confirmed and synced with the host!');
            })
            .catch((error) => {
                console.error('Error syncing confirmation:', error);
                alert('Error confirming selection. Please try again.');
            });
    }
}

// Updated updatePayment with Firebase sync
function updatePayment(person, amount) {
    const paymentAmount = parseFloat(amount) || 0;
    receiptData.payments[person] = paymentAmount;
    
    // Save to Firebase
    if (currentReceiptId) {
        database.ref(`receipts/${currentReceiptId}/payments`).set(receiptData.payments)
            .then(() => {
                console.log('Payment update synced to Firebase');
            })
            .catch((error) => {
                console.error('Error syncing payment:', error);
            });
    }
    
    renderSummary();
}

// Updated markAsPaid with Firebase sync
function markAsPaid(person, totalAmount) {
    if (confirm(`Mark ${person} as fully paid ($${totalAmount})?`)) {
        receiptData.payments[person] = parseFloat(totalAmount);
        
        // Save to Firebase
        if (currentReceiptId) {
            database.ref(`receipts/${currentReceiptId}/payments`).set(receiptData.payments)
                .then(() => {
                    console.log('Payment marked and synced to Firebase');
                    renderSummary();
                })
                .catch((error) => {
                    console.error('Error syncing payment:', error);
                    alert('Error updating payment. Please try again.');
                });
        }
        
        const button = event.target;
        const originalText = button.textContent;
        button.textContent = 'Marked Paid';
        button.style.background = '#38a169';
        button.disabled = true;
        
        setTimeout(() => {
            renderSummary();
        }, 1500);
    }
}

// Add real-time listener for host summary view
function showSummary() {
    if (receiptData.items.length === 0) {
        alert('No items to summarize. Please add items first.');
        return;
    }
    
    receiptData.name = document.getElementById('receipt-name').value.trim() || 'Untitled Receipt';
    receiptData.tax = parseFloat(document.getElementById('tax-amount').value) || 0;
    receiptData.tip = parseFloat(document.getElementById('tip-amount').value) || 0;
    
    // Start listening for real-time updates
    if (currentReceiptId) {
        const receiptRef = database.ref(`receipts/${currentReceiptId}`);
        receiptRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Merge updated data
                receiptData.items = data.items || receiptData.items;
                receiptData.payments = data.payments || {};
                receiptData.confirmedGuests = data.confirmedGuests || {};
                
                renderSummary();
            }
        });
    }
    
    showSummarySection();
    renderSummary();
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
    
    try {
        // Create a clean copy of data without unnecessary properties
        const cleanData = {
            name: receiptData.name,
            items: receiptData.items.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                claimedBy: item.claimedBy || []
            })),
            tax: receiptData.tax,
            tip: receiptData.tip,
            confirmedGuests: {},
            payments: {}
        };
        
        console.log('Clean data size:', JSON.stringify(cleanData).length);
        
        // Try URL encoding method
        const jsonString = JSON.stringify(cleanData);
        console.log('JSON string length:', jsonString.length);
        
        if (jsonString.length > 2000) {
            // Fallback: use localStorage method instead
            console.log('Data too large for URL, using localStorage method');
            
            if (!currentReceiptId) {
                currentReceiptId = Date.now().toString();
            }
            
            localStorage.setItem(`receipt_${currentReceiptId}`, JSON.stringify(cleanData));
            receipts[currentReceiptId] = { ...cleanData };
            
            // Generate a shorter URL using receipt ID
            const shareUrl = `${window.location.origin}${window.location.pathname}?receipt=${currentReceiptId}`;
            document.getElementById('share-url').value = shareUrl;
            
            alert('Share link created! Note: Your friends will need to visit this link from a device that has accessed this receipt before, or you can manually share the receipt details with them.');
        } else {
            // Use URL encoding method for smaller data
            const encodedData = btoa(unescape(encodeURIComponent(jsonString)));
            console.log('Encoded data length:', encodedData.length);
            
            const shareUrl = `${window.location.origin}${window.location.pathname}?data=${encodedData}`;
            console.log('Final URL length:', shareUrl.length);
            
            if (shareUrl.length > 2048) {
                throw new Error('URL too long even after compression');
            }
            
            document.getElementById('share-url').value = shareUrl;
        }
        
        // Also save locally for host
        if (!currentReceiptId) {
            currentReceiptId = Date.now().toString();
        }
        localStorage.setItem(`receipt_${currentReceiptId}`, JSON.stringify(cleanData));
        receipts[currentReceiptId] = { ...cleanData };
        
        document.getElementById('share-link').style.display = 'block';
        console.log('Share link generated successfully');
        document.getElementById('share-link').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('Detailed error:', error);
        
        // Fallback method: just use receipt ID
        try {
            if (!currentReceiptId) {
                currentReceiptId = Date.now().toString();
            }
            
            localStorage.setItem(`receipt_${currentReceiptId}`, JSON.stringify(receiptData));
            receipts[currentReceiptId] = { ...receiptData };
            
            const shareUrl = `${window.location.origin}${window.location.pathname}?receipt=${currentReceiptId}`;
            document.getElementById('share-url').value = shareUrl;
            document.getElementById('share-link').style.display = 'block';
            
            alert('Share link created using fallback method! Your friends can access this receipt by visiting the link from any device.');
            
        } catch (fallbackError) {
            console.error('Fallback method also failed:', fallbackError);
            alert('Unable to create share link. Try refreshing the page and creating a simpler receipt with fewer items.');
        }
    }
}

function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const encodedData = urlParams.get('data');
    const receiptId = urlParams.get('receipt');
    
    console.log('Checking URL params - data:', !!encodedData, 'receiptId:', receiptId);
    
    if (encodedData) {
        // Guest mode - load from URL data
        try {
            console.log('Attempting to decode URL data...');
            const decodedString = decodeURIComponent(escape(atob(encodedData)));
            const decodedData = JSON.parse(decodedString);
            
            receiptData = decodedData;
            if (!receiptData.confirmedGuests) {
                receiptData.confirmedGuests = {};
            }
            if (!receiptData.payments) {
                receiptData.payments = {};
            }
            
            isHost = false;
            currentReceiptId = 'shared_' + Date.now().toString();
            localStorage.setItem(`receipt_${currentReceiptId}`, JSON.stringify(receiptData));
            
            console.log('Successfully loaded receipt from URL:', receiptData.name);
            showGuestSection();
            setTimeout(renderGuestItems, 100);
            
        } catch (error) {
            console.error('Failed to decode URL data:', error);
            alert('Invalid or corrupted share link. Please ask for a new link.');
            showDashboard();
        }
    } else if (receiptId) {
        // Load from localStorage using receipt ID
        console.log('Loading receipt from localStorage:', receiptId);
        isHost = false;
        loadSharedReceipt(receiptId);
        showGuestSection();
    } else {
        // Host mode
        isHost = true;
        showDashboard();
    }
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

function setGuestName() {
    const name = document.getElementById('guest-name').value.trim();
    if (!name) {
        alert('Please enter your name');
        return;
    }
    currentGuest = name;
    document.getElementById('guest-name').disabled = true;
    renderGuestItems();
    
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
    
    // Check if already confirmed
    const isConfirmed = receiptData.confirmedGuests && receiptData.confirmedGuests[currentGuest];
    
    const totalContainer = document.getElementById('guest-total');
    
    if (isConfirmed) {
        // Show confirmed state
        totalContainer.innerHTML = `
            <h3>Selection Confirmed!</h3>
            <p><strong>Items:</strong> $${subtotal.toFixed(2)}</p>
            <p><strong>Tax (your share):</strong> $${myTax.toFixed(2)}</p>
            <p><strong>Tip (your share):</strong> $${myTip.toFixed(2)}</p>
            <div class="total-amount">You Owe: $${total.toFixed(2)}</div>
            
            <div class="confirmation-success">
                <div class="success-message">
                    Your selection has been confirmed and sent to the host!
                </div>
                <p class="success-note">
                    The host can now see that you've confirmed your items. 
                    You can still make changes if needed.
                </p>
                <button onclick="makeChangesToSelection()" class="secondary-btn">
                    Make Changes
                </button>
            </div>
        `;
    } else {
        // Show unconfirmed state with confirm button
        totalContainer.innerHTML = `
            <h3>Your Selection</h3>
            <p><strong>Items:</strong> $${subtotal.toFixed(2)}</p>
            <p><strong>Tax (your share):</strong> $${myTax.toFixed(2)}</p>
            <p><strong>Tip (your share):</strong> $${myTip.toFixed(2)}</p>
            <div class="total-amount">You Owe: $${total.toFixed(2)}</div>
            
            <div class="guest-confirm-section">
                <button onclick="confirmSelectionWithHost()" class="confirm-selection-btn">
                    Confirm My Selection
                </button>
                <p class="confirm-note">
                    Click to confirm your items and notify the host that you've made your selection.
                </p>
            </div>
        `;
    }
}


function makeChangesToSelection() {
    // Remove confirmation status
    if (receiptData.confirmedGuests && receiptData.confirmedGuests[currentGuest]) {
        delete receiptData.confirmedGuests[currentGuest];
    }
    
    // Save to localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const receiptId = urlParams.get('receipt');
    localStorage.setItem(`receipt_${receiptId}`, JSON.stringify(receiptData));
    
    // Update display
    updateGuestTotal();
}

function showSummary() {
    if (receiptData.items.length === 0) {
        alert('No items to summarize. Please add items first.');
        return;
    }
    
    receiptData.name = document.getElementById('receipt-name').value.trim() || 'Untitled Receipt';
    receiptData.tax = parseFloat(document.getElementById('tax-amount').value) || 0;
    receiptData.tip = parseFloat(document.getElementById('tip-amount').value) || 0;
    
    // Sync with saved data if receipt exists
    if (currentReceiptId) {
        const savedData = localStorage.getItem(`receipt_${currentReceiptId}`);
        if (savedData) {
            const sharedReceiptData = JSON.parse(savedData);
            receiptData.items = sharedReceiptData.items;
            receiptData.payments = sharedReceiptData.payments || {};
            receiptData.confirmedGuests = sharedReceiptData.confirmedGuests || {};
        }
    }
    
    showSummarySection();
    renderSummary();
}

function renderSummary() {
    // Always sync with saved data
    if (isHost && currentReceiptId) {
        const savedData = localStorage.getItem(`receipt_${currentReceiptId}`);
        if (savedData) {
            const savedReceiptData = JSON.parse(savedData);
            receiptData.items = savedReceiptData.items;
            receiptData.payments = savedReceiptData.payments || {};
            receiptData.confirmedGuests = savedReceiptData.confirmedGuests || {};
        }
    }
    
    const summaryContainer = document.getElementById('summary-content');
    const people = {};
    
    receiptData.items.forEach(item => {
        if (item.claimedBy && Array.isArray(item.claimedBy)) {
            item.claimedBy.forEach(person => {
                if (!people[person]) {
                    people[person] = { items: [], subtotal: 0 };
                }
                people[person].items.push(item);
                people[person].subtotal += item.price;
            });
        }
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
    
    const peopleWithClaims = Object.keys(people);
    const hasPeopleClaims = peopleWithClaims.length > 0;
    
    if (hasPeopleClaims) {
        let totalPaid = 0;
        let totalOwed = 0;
        const owingDetails = [];
        
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
                        <div class="payment-controls">
                            <div class="payment-input">
                                <label>Amount Paid:</label>
                                <input type="number" step="0.01" value="${paid.toFixed(2)}" 
                                       onchange="updatePayment('${person}', this.value)"
                                       class="payment-amount">
                            </div>
                            ${balance > 0.01 ? `
                                <button onclick="markAsPaid('${person}', ${total.toFixed(2)})" 
                                        class="mark-paid-btn">
                                    ✓ Mark as Paid
                                </button>
                            ` : ''}
                        </div>
                        <div class="balance" style="color: ${statusColor}; font-weight: bold;">
                            ${balance <= 0.01 ? 'Fully Paid' : `Still Owes: $${balance.toFixed(2)}`}
                        </div>
                    </div>
                </div>
            `;
        });
        
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
        
        if (owingDetails.length > 0) {
            summaryHtml += `
                <div class="who-owes-section">
                    <h4 style="margin: 20px 0 10px 0; color: #2d3748; font-size: 1.1rem;">📋 Who Still Owes Money:</h4>
                    <ul style="margin: 0; padding: 0; list-style: none; background: #f7fafc; border-radius: 8px; padding: 15px;">
            `;
            
            owingDetails.forEach(({ person, amount }) => {
                const personTotalBill = people[person].subtotal + (receiptData.tax + receiptData.tip) * (people[person].subtotal / totalItemsValue);
                summaryHtml += `
                    <li style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 600; color: #2d3748;">${person}</span>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="color: #e53e3e; font-weight: 700; font-size: 1.1rem;">$${amount.toFixed(2)}</span>
                            <button onclick="markAsPaid('${person}', ${personTotalBill.toFixed(2)})" 
                                    class="quick-paid-btn" style="font-size: 0.8rem; padding: 4px 8px;">
                                ✓ Paid
                            </button>
                        </div>
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
        
        // Add guest confirmation status section
        if (receiptData.confirmedGuests && Object.keys(receiptData.confirmedGuests).length > 0) {
            summaryHtml += `
                <div class="summary-card confirmation-status">
                    <div class="summary-name">📋 Guest Confirmation Status</div>
                    <div class="confirmation-list">
            `;
            
            // Show all people who have claimed items and their confirmation status
            Object.keys(people).forEach(person => {
                const isConfirmed = receiptData.confirmedGuests[person];
                const confirmTime = isConfirmed ? new Date(isConfirmed.confirmedAt).toLocaleString() : null;
                
                summaryHtml += `
                    <div class="guest-status ${isConfirmed ? 'confirmed' : 'pending'}">
                        <div class="guest-info">
                            <span class="guest-name">${person}</span>
                            <span class="confirmation-badge">
                                ${isConfirmed ? '✅ Confirmed' : '⏳ Pending'}
                            </span>
                        </div>
                        ${isConfirmed ? `
                            <div class="confirm-time">Confirmed: ${confirmTime}</div>
                        ` : `
                            <div class="pending-note">Waiting for confirmation</div>
                        `}
                    </div>
                `;
            });
            
            summaryHtml += `
                    </div>
                </div>
            `;
        }
    } else {
        summaryHtml += `
            <div class="summary-card">
                <div class="summary-name">⏳ Waiting for People to Claim Items</div>
                <div class="summary-items">
                    No one has claimed any items yet. Share the link with your friends so they can select what they ordered!
                </div>
            </div>
        `;
    }
    
    const unclaimedItems = receiptData.items.filter(item => 
        !item.claimedBy || item.claimedBy.length === 0
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
    if (currentReceiptId) {
        const savedData = localStorage.getItem(`receipt_${currentReceiptId}`);
        if (savedData) {
            receiptData = JSON.parse(savedData);
        }
    }
    
    renderSummary();
    
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = '✓ Updated';
    
    setTimeout(() => {
        button.textContent = originalText;
    }, 1500);
}

function backToHost() {
    showHostSection();
}

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        const activeElement = document.activeElement;
        
        if (activeElement && (activeElement.id === 'item-name' || activeElement.id === 'item-price')) {
            event.preventDefault();
            addItem();
        }
        
        if (activeElement && activeElement.id === 'guest-name') {
            event.preventDefault();
            setGuestName();
        }
    }
});

// Auto-save functionality
function autoSave() {
    if (isHost && currentReceiptId && receiptData.items.length > 0) {
        const receiptName = document.getElementById('receipt-name').value.trim();
        const tax = parseFloat(document.getElementById('tax-amount').value) || 0;
        const tip = parseFloat(document.getElementById('tip-amount').value) || 0;
        
        receiptData.name = receiptName;
        receiptData.tax = tax;
        receiptData.tip = tip;
        
        localStorage.setItem(`receipt_${currentReceiptId}`, JSON.stringify(receiptData));
    }
}

setInterval(autoSave, 3000);

// Load draft functionality (for new receipts)
function loadDraft() {
    if (isHost && !currentReceiptId) {
        const draftData = localStorage.getItem('receipt_draft');
        if (draftData) {
            try {
                const draft = JSON.parse(draftData);
                receiptData = draft;
                
                // Populate form fields
                if (receiptData.name) document.getElementById('receipt-name').value = receiptData.name;
                if (receiptData.tax) document.getElementById('tax-amount').value = receiptData.tax;
                if (receiptData.tip) document.getElementById('tip-amount').value = receiptData.tip;
                
                renderItems();
            } catch (e) {
                console.error('Error loading draft:', e);
            }
        }
    }
}

// Backwards compatibility functions
function newReceipt() {
    createNewReceipt();
}

// Helper function to calculate person's total bill
function calculatePersonTotal(person, people, totalItemsValue) {
    const personData = people[person];
    if (!personData) return 0;
    
    const myProportion = totalItemsValue > 0 ? personData.subtotal / totalItemsValue : 0;
    const myTax = receiptData.tax * myProportion;
    const myTip = receiptData.tip * myProportion;
    return personData.subtotal + myTax + myTip;
}

// Utility function to format currency
function formatCurrency(amount) {
    return `$${amount.toFixed(2)}`;
}

// Function to export receipt data
function exportReceiptData(receiptId) {
    const receipt = receipts[receiptId];
    if (receipt) {
        const dataStr = JSON.stringify(receipt, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `receipt-${receipt.name || 'untitled'}-${new Date(parseInt(receiptId)).toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

// Function to import receipt data
function importReceiptData(event) {
    const file = event.target.files[0];
    if (file && file.type === 'application/json') {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedReceipt = JSON.parse(e.target.result);
                const newReceiptId = Date.now().toString();
                
                if (importedReceipt.name !== undefined && Array.isArray(importedReceipt.items)) {
                    localStorage.setItem(`receipt_${newReceiptId}`, JSON.stringify(importedReceipt));
                    loadAllReceipts();
                    renderReceiptDashboard();
                    alert(`Receipt "${importedReceipt.name}" imported successfully!`);
                } else {
                    alert('Invalid receipt file format.');
                }
            } catch (error) {
                alert('Error importing receipt file.');
                console.error('Import error:', error);
            }
        };
        reader.readAsText(file);
    }
}

// Clean up old localStorage entries
function cleanupOldReceipts() {
    const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days
    let cleanedCount = 0;
    
    for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith('receipt_')) {
            const receiptId = key.replace('receipt_', '');
            const timestamp = parseInt(receiptId);
            
            if (timestamp < oneMonthAgo) {
                localStorage.removeItem(key);
                cleanedCount++;
            }
        }
    }
    
    if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} old receipts`);
        loadAllReceipts();
        renderReceiptDashboard();
    }
}

// Debug function to view all localStorage data
function debugLocalStorage() {
    console.log('=== Receipt Splitter Debug Info ===');
    console.log('Current receipts in memory:', receipts);
    console.log('Current receipt data:', receiptData);
    console.log('Current receipt ID:', currentReceiptId);
    console.log('Is host:', isHost);
    console.log('Current guest:', currentGuest);
    
    console.log('\n=== LocalStorage Contents ===');
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('receipt_')) {
            const data = JSON.parse(localStorage.getItem(key));
            console.log(`${key}:`, data);
        }
    }
}

// Error handling wrapper for localStorage operations
function safeLocalStorageOperation(operation, key, data = null) {
    try {
        switch (operation) {
            case 'get':
                return localStorage.getItem(key);
            case 'set':
                localStorage.setItem(key, data);
                return true;
            case 'remove':
                localStorage.removeItem(key);
                return true;
            default:
                throw new Error('Invalid operation');
        }
    } catch (error) {
        console.error('LocalStorage operation failed:', error);
        if (error.name === 'QuotaExceededError') {
            alert('Storage quota exceeded. Please delete some old receipts.');
        }
        return null;
    }
}

// Initialize the app with error handling
function initializeApp() {
    try {
        checkUrlParams();
        loadAllReceipts();
        if (isHost) {
            renderReceiptDashboard();
        }
    } catch (error) {
        console.error('App initialization failed:', error);
        alert('There was an error loading the app. Please refresh the page.');
    }
}
