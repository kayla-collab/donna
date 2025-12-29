document.addEventListener('DOMContentLoaded', () => {
    const hoursInput = document.getElementById('calc-hours');
    const rateInput = document.getElementById('calc-rate');
    const calcBtn = document.getElementById('calc-btn');
    const resultSection = document.getElementById('calc-result');
    const resultLoss = document.getElementById('calc-loss-amount');
    const resultWeeks = document.getElementById('calc-roi-weeks');

    if (calcBtn) {
        calcBtn.addEventListener('click', () => {
            const hours = parseFloat(hoursInput.value) || 0;
            const rate = parseFloat(rateInput.value) || 0;

            if (hours === 0 || rate === 0) {
                alert("Please enter both your hours and hourly rate.");
                return;
            }

            // Calculation: Hours/week * 52 weeks * Hourly Rate
            const annualLoss = hours * 52 * rate;
            const systemCost = 888;
            
            // ROI: How many weeks to break even?
            // Weekly Loss = hours * rate
            const weeklyLoss = hours * rate;
            const weeksToBreakEven = Math.ceil(systemCost / weeklyLoss);

            // Animate Numbers
            resultSection.classList.remove('hidden');
            resultSection.classList.add('fade-in-up');
            
            resultLoss.textContent = annualLoss.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
            resultWeeks.textContent = weeksToBreakEven + (weeksToBreakEven === 1 ? ' week' : ' weeks');
        });
    }
});
