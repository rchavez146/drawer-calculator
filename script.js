document.addEventListener('DOMContentLoaded', () => {
    const drawersContainer = document.getElementById('drawers');
    const addDrawerBtn = document.getElementById('addDrawerBtn');
    const depositAmountDisplay = document.getElementById('depositAmount');

    let drawersData = JSON.parse(localStorage.getItem('drawersData')) || [];

    function saveData() {
        localStorage.setItem('drawersData', JSON.stringify(drawersData));
    }

    function calculateDepositAmount() {
        // Calculate the total of all excess amounts
        const totalDepositAmount = drawersData.reduce((acc, drawer) => acc + (drawer.excessAmount || 0), 0);
        depositAmountDisplay.textContent = totalDepositAmount.toFixed(2);
    }

    function createDrawerElement(drawer, index) {
        const drawerDiv = document.createElement('div');
        drawerDiv.classList.add('drawer');

        drawerDiv.innerHTML = `
            <h2>Drawer ${index + 1}</h2>
            <div class="currency-input">
                <label>Target Amount:</label>
                <input type="number" class="target-amount" value="${drawer.targetAmount || ''}" step="0.01">
            </div>
            <!-- Rolled Coins -->
            <h3>Rolled Coins</h3>
            ${createCurrencyInputs(drawer, 'rolledCoins')}
            <!-- Coins -->
            <h3>Coins</h3>
            ${createCurrencyInputs(drawer, 'coins')}
            <!-- Bills -->
            <h3>Bills</h3>
            ${createCurrencyInputs(drawer, 'bills')}
            <!-- Totals -->
            <p>Total Amount: $<span class="total-amount">${drawer.totalAmount.toFixed(2)}</span></p>
            <p>Excess Amount: $<span class="excess-amount">${drawer.excessAmount.toFixed(2)}</span></p>
            <p>Captured Amount: <span class="captured-amount">${drawer.capturedAmount !== undefined ? drawer.capturedAmount.toFixed(2) : 'No amount captured yet.'}</span></p>
            <!-- Buttons -->
            <div class="drawer-buttons">
                <button class="captureBtn">Capture Amount</button>
                <button class="resetBtn">Reset</button>
                <button class="deleteBtn">Delete Drawer</button>
            </div>
        `;

        // Event listeners for inputs
        const inputs = drawerDiv.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                updateDrawerData(drawer, input);
                updateDrawerDisplay(drawerDiv, drawer);
                saveData();
                calculateDepositAmount();
            });
        });

        // Capture button
        const captureBtn = drawerDiv.querySelector('.captureBtn');
        captureBtn.addEventListener('click', () => {
            // Capture the current total amount for this drawer
            drawer.capturedAmount = drawer.totalAmount; 
            updateDrawerDisplay(drawerDiv, drawer); // Update the display
            saveData(); // Save the data
            // No need to recalculate deposit amount on capture
        });

        // Reset button
        const resetBtn = drawerDiv.querySelector('.resetBtn');
        resetBtn.addEventListener('click', () => {
            if (confirm('Are you sure you would like to reset this drawer?')) {
                resetDrawer(drawer);
                updateDrawerDisplay(drawerDiv, drawer);
                clearInputFields(drawerDiv); // Clear input fields visually
                saveData();
                calculateDepositAmount(); // Update the deposit amount
            }
        });

        // Delete button
        const deleteBtn = drawerDiv.querySelector('.deleteBtn');
        deleteBtn.addEventListener('click', () => {
            if (confirm('Are you sure you would like to delete this drawer?')) {
                drawersData.splice(index, 1);
                saveData();
                renderDrawers();
                calculateDepositAmount();
            }
        });

        return drawerDiv;
    }

    function createCurrencyInputs(drawer, category) {
        const denominations = {
            rolledCoins: [
                { label: '50 cents', value: 0.5 },
                { label: '$2', value: 2 },
                { label: '$5', value: 5 },
                { label: '$10', value: 10 }
            ],
            coins: [
                { label: '1 cent', value: 0.01 },
                { label: '5 cents', value: 0.05 },
                { label: '10 cents', value: 0.10 },
                { label: '25 cents', value: 0.25 }
            ],
            bills: [
                { label: '$1', value: 1 },
                { label: '$5', value: 5 },
                { label: '$10', value: 10 },
                { label: '$20', value: 20 },
                { label: '$50', value: 50 },
                { label: '$100', value: 100 }
            ]
        };

        let html = '';
        denominations[category].forEach(denom => {
            const count = drawer[category][denom.label] || '';
            html += `
                <div class="currency-input">
                    <label>${denom.label}:</label>
                    <input type="number" data-category="${category}" data-label="${denom.label}" value="${count}" step="1" min="0">
                </div>
            `;
        });
        return html;
    }

    function updateDrawerData(drawer, input) {
        const category = input.dataset.category;
        const label = input.dataset.label;
        const value = parseFloat(input.value) || 0;

        if (input.classList.contains('target-amount')) {
            drawer.targetAmount = value;
        } else if (category && label) {
            drawer[category][label] = value;
        }

        calculateDrawerTotals(drawer);
        highlightFieldOnTarget(drawer, input);  // Highlight field if target reached
    }

    function highlightFieldOnTarget(drawer, input) {
        if (drawer.totalAmount >= drawer.targetAmount && drawer.targetAmount > 0) {
            input.classList.add('reached');  // Add green border
        } else {
            input.classList.remove('reached');
        }
    }

    function calculateDrawerTotals(drawer) {
        const denominations = {
            rolledCoins: [
                { label: '50 cents', value: 0.5 },
                { label: '$2', value: 2 },
                { label: '$5', value: 5 },
                { label: '$10', value: 10 }
            ],
            coins: [
                { label: '1 cent', value: 0.01 },
                { label: '5 cents', value: 0.05 },
                { label: '10 cents', value: 0.10 },
                { label: '25 cents', value: 0.25 }
            ],
            bills: [
                { label: '$1', value: 1 },
                { label: '$5', value: 5 },
                { label: '$10', value: 10 },
                { label: '$20', value: 20 },
                { label: '$50', value: 50 },
                { label: '$100', value: 100 }
            ]
        };

        let totalAmount = 0;

        Object.keys(denominations).forEach(category => {
            denominations[category].forEach(denom => {
                const count = drawer[category][denom.label] || 0;
                totalAmount += count * denom.value;
            });
        });

        drawer.totalAmount = totalAmount;
        drawer.excessAmount = Math.max(0, totalAmount - drawer.targetAmount);
        // Removed amountToTakeOut as requested
    }

    function updateDrawerDisplay(drawerDiv, drawer) {
        const totalAmountDisplay = drawerDiv.querySelector('.total-amount');
        const excessAmountDisplay = drawerDiv.querySelector('.excess-amount');
        const capturedAmountDisplay = drawerDiv.querySelector('.captured-amount');

        totalAmountDisplay.textContent = drawer.totalAmount.toFixed(2);
        excessAmountDisplay.textContent = drawer.excessAmount.toFixed(2);
        capturedAmountDisplay.textContent = drawer.capturedAmount !== undefined ? `${drawer.capturedAmount.toFixed(2)}` : 'No amount captured yet.';
    }

    function resetDrawer(drawer) {
        drawer.targetAmount = 0;
        drawer.rolledCoins = {};
        drawer.coins = {};
        drawer.bills = {};
        drawer.totalAmount = 0;
        drawer.excessAmount = 0;
        drawer.capturedAmount = undefined; // Reset captured amount
    }

    function clearInputFields(drawerDiv) {
        const inputs = drawerDiv.querySelectorAll('input[type="number"]');
        inputs.forEach(input => {
            input.value = 0; // Clear input fields visually
        });
    }

    function renderDrawers() {
        drawersContainer.innerHTML = ''; // Clear the container
        drawersData.forEach((drawer, index) => {
            const drawerElement = createDrawerElement(drawer, index);
            drawersContainer.appendChild(drawerElement);
        });
    }

    // Add drawer button
    addDrawerBtn.addEventListener('click', () => {
        const newDrawer = {
            targetAmount: 0,
            rolledCoins: {},
            coins: {},
            bills: {},
            totalAmount: 0,
            excessAmount: 0,
            capturedAmount: undefined // Initialize captured amount for new drawers
        };
        drawersData.push(newDrawer);
        saveData();
        renderDrawers();
        calculateDepositAmount(); // Update the deposit amount
    });

    // Initial render
    renderDrawers();
    calculateDepositAmount();
});
