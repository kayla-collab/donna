document.addEventListener('DOMContentLoaded', () => {
    const questions = [
        {
            id: 'q1',
            type: 'text-input',
            question: "Let's get to know you. What's your name?",
            inputs: [
                { name: 'firstName', placeholder: 'First Name', type: 'text' },
                { name: 'lastName', placeholder: 'Last Name', type: 'text' }
            ]
        },
        {
            id: 'q2',
            type: 'choice',
            question: "How do you feel when you think about your money?",
            options: [
                "Anxious / Stressed",
                "Confused / Lost",
                "Overwhelmed",
                "Frustrated",
                "Hopeful",
                "Fine / Neutral"
            ]
        },
        {
            id: 'q3',
            type: 'slider',
            question: "On a scale of 1-10, how confident are you that you know where your money goes each month?",
            min: 1,
            max: 10,
            labels: { 1: "No Clue", 10: "Totally Confident" }
        },
        {
            id: 'q4',
            type: 'choice',
            question: "What stresses you out most about money right now?",
            options: [
                "Debt (CCs, Loans)",
                "Paying Bills on Time",
                "Not Saving Enough",
                "Not Knowing If I'm Doing It Right",
                "Feeling Behind My Peers"
            ]
        },
        {
            id: 'q5',
            type: 'slider',
            question: "How much time do you realistically have for money stuff each week?",
            min: 0,
            max: 60,
            step: 5,
            suffix: " minutes"
        },
        {
            id: 'q6',
            type: 'choice',
            question: "What would make you feel like you're WINNING with money?",
            options: [
                "Being Debt Free",
                "Having a huge savings buffer",
                "Traveling without guilt",
                "Understanding my investments",
                "Just sleeping through the night"
            ]
        },
        {
            id: 'q7',
            type: 'choice',
            question: "If you could wave a magic wand and fix ONE money thing, what would it be?",
            options: [
                "Erase my debt",
                "Automate my bills",
                "Double my income",
                "Get a personal money coach",
                "Understand taxes"
            ]
        },
        {
            id: 'q8',
            type: 'text-input',
            question: "Last step! Where should we send your personalized plan?",
            inputs: [
                { name: 'email', placeholder: 'Your Email Address', type: 'email' },
                { name: 'phone', placeholder: 'Phone Number (Optional)', type: 'tel' }
            ]
        }
    ];

    let currentStep = 0;
    const answers = {};

    // DOM Elements
    const startBtn = document.getElementById('start-quiz-btn');
    const quizIntro = document.getElementById('quiz-intro');
    const quizContainer = document.getElementById('quiz-container');
    const quizResults = document.getElementById('quiz-results');
    const progressBar = document.getElementById('quiz-progress');
    const questionWrapper = document.getElementById('question-wrapper');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    if (!startBtn) return; // Exit if not on page

    // Start Quiz
    startBtn.addEventListener('click', () => {
        quizIntro.classList.add('hidden');
        quizContainer.classList.remove('hidden');
        renderQuestion();
    });

    // Navigation
    nextBtn.addEventListener('click', () => {
        if (validateStep()) {
            saveAnswer();
            if (currentStep < questions.length - 1) {
                currentStep++;
                renderQuestion();
            } else {
                finishQuiz();
            }
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentStep > 0) {
            currentStep--;
            renderQuestion();
        }
    });

    function renderQuestion() {
        const q = questions[currentStep];
        
        // Update Progress
        const progress = ((currentStep) / questions.length) * 100;
        progressBar.style.width = `${progress}%`;

        // Generate HTML
        let html = `
            <h3 class="font-serif text-2xl font-bold mb-6 text-brand-text">${q.question}</h3>
            <div class="fade-in-up">
        `;

        if (q.type === 'choice') {
            html += `<div class="grid grid-cols-1 md:grid-cols-2 gap-4">`;
            q.options.forEach(opt => {
                const isSelected = answers[q.id] === opt ? 'border-brand-primary bg-brand-primary/10 ring-2 ring-brand-primary' : 'border-gray-200 hover:border-brand-primary/50';
                html += `
                    <div class="option-card cursor-pointer p-4 border-2 rounded-lg transition-all ${isSelected}" onclick="selectOption('${opt}', this)">
                        <span class="font-medium text-brand-text">${opt}</span>
                    </div>
                `;
            });
            html += `</div>`;
        } else if (q.type === 'slider') {
            const val = answers[q.id] || Math.ceil((q.max - q.min) / 2);
            html += `
                <div class="py-8 px-4">
                    <input type="range" min="${q.min}" max="${q.max}" value="${val}" step="${q.step || 1}" class="w-full" oninput="updateSliderVal(this.value, '${q.suffix || ''}')">
                    <div class="text-center mt-4 font-bold text-2xl text-brand-primary">
                        <span id="slider-val">${val}</span>${q.suffix || ''}
                    </div>
                    <div class="flex justify-between text-xs text-gray-500 mt-2">
                        <span>${q.labels ? q.labels[q.min] : q.min}</span>
                        <span>${q.labels ? q.labels[q.max] : q.max}</span>
                    </div>
                </div>
            `;
            // Auto save default slider value if not present
            if (!answers[q.id]) answers[q.id] = val;
        } else if (q.type === 'text-input') {
            html += `<div class="space-y-4 max-w-md mx-auto">`;
            q.inputs.forEach(input => {
                const val = answers[input.name] || '';
                html += `
                    <input type="${input.type}" name="${input.name}" placeholder="${input.placeholder}" value="${val}" 
                    class="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-shadow"
                    oninput="saveInput('${input.name}', this.value)">
                `;
            });
            html += `</div>`;
        }

        html += `</div>`;
        questionWrapper.innerHTML = html;

        // Button State
        prevBtn.disabled = currentStep === 0;
        prevBtn.style.opacity = currentStep === 0 ? '0.3' : '1';
        
        if (currentStep === questions.length - 1) {
            nextBtn.textContent = "Get My Plan";
            nextBtn.classList.add('bg-brand-primary');
            nextBtn.classList.remove('bg-brand-text');
        } else {
            nextBtn.textContent = "Next";
            nextBtn.classList.remove('bg-brand-primary');
            nextBtn.classList.add('bg-brand-text');
        }
    }

    // Helper Functions attached to window for inline onclicks
    window.selectOption = (val, el) => {
        answers[questions[currentStep].id] = val;
        document.querySelectorAll('.option-card').forEach(c => {
            c.classList.remove('border-brand-primary', 'bg-brand-primary/10', 'ring-2', 'ring-brand-primary');
            c.classList.add('border-gray-200');
        });
        el.classList.remove('border-gray-200');
        el.classList.add('border-brand-primary', 'bg-brand-primary/10', 'ring-2', 'ring-brand-primary');
    };

    window.updateSliderVal = (val, suffix) => {
        document.getElementById('slider-val').textContent = val;
        answers[questions[currentStep].id] = val;
    };

    window.saveInput = (name, val) => {
        answers[name] = val;
    };

    function validateStep() {
        const q = questions[currentStep];
        if (q.type === 'choice' && !answers[q.id]) {
            alert('Please select an option.');
            return false;
        }
        if (q.type === 'text-input') {
            let valid = true;
            q.inputs.forEach(input => {
                if (input.type !== 'tel' && !answers[input.name]) valid = false; // Tel is optional
            });
            if (!valid) {
                alert('Please fill out the required fields.');
                return false;
            }
        }
        return true;
    }

    function saveAnswer() {
        // Already handled by input events
    }

    function finishQuiz() {
        quizContainer.classList.add('hidden');
        
        // Simulate Processing
        const processingDiv = document.createElement('div');
        processingDiv.className = 'text-center py-20 fade-in-up';
        processingDiv.innerHTML = `
            <i class="fa-solid fa-circle-notch fa-spin text-5xl text-brand-primary mb-4"></i>
            <h3 class="text-2xl font-serif">Generating your plan...</h3>
        `;
        quizIntro.parentNode.appendChild(processingDiv);

        setTimeout(() => {
            processingDiv.remove();
            quizResults.classList.remove('hidden');
            quizResults.classList.add('fade-in-up');
            
            // Customize Result based on input (Simple Logic)
            const stress = answers['q4'];
            const focusTitle = document.getElementById('result-focus');
            const focusDesc = document.getElementById('result-desc');

            if (stress && stress.includes('Debt')) {
                focusTitle.textContent = "Debt Destroyer Strategy";
                focusDesc.textContent = "Your anxiety comes from the weight of debt. Your plan focuses on organization and a snowball repayment method that builds momentum fast.";
            } else if (stress && stress.includes('Saving')) {
                focusTitle.textContent = "Wealth Accumulation Path";
                focusDesc.textContent = "You're earning, but it's disappearing. Your plan focuses on 'Pay Yourself First' automation and spending consciousness.";
            } else {
                focusTitle.textContent = "The Foundation Reset";
                focusDesc.textContent = "You need clarity before complexity. Your plan focuses on automating the basics so you can stop stressing about the day-to-day.";
            }

        }, 2000);
    }
});
