document.addEventListener('DOMContentLoaded', () => {
    // --- SCROLL-TRIGGERED ANIMATIONS ---
    const animatedElements = document.querySelectorAll('.fade-in-up, .reveal-on-scroll');
    const supportsIntersectionObserver = 'IntersectionObserver' in window;
    const prefersReducedMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

    if (animatedElements.length) {
        if (!supportsIntersectionObserver || prefersReducedMotion) {
            animatedElements.forEach(el => el.classList.add('is-visible'));
        } else {
            document.body.classList.add('animations-enabled');

            const observer = new IntersectionObserver((entries, obs) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;

                    const { target } = entry;
                    target.classList.add('is-visible');

                    const animateOnce = target.dataset.animateOnce !== 'false';
                    if (animateOnce) {
                        obs.unobserve(target);
                    }
                });
            }, {
                threshold: 0.2,
                rootMargin: '0px 0px -10% 0px'
            });

            animatedElements.forEach(el => {
                const delay = el.dataset.animateDelay;
                if (delay) {
                    el.style.animationDelay = delay;
                    el.style.transitionDelay = delay;
                }
                observer.observe(el);
            });

            requestAnimationFrame(() => {
                animatedElements.forEach(el => {
                    if (el.classList.contains('is-visible')) return;
                    const rect = el.getBoundingClientRect();
                    if (rect.top <= window.innerHeight * 0.85) {
                        el.classList.add('is-visible');
                        const animateOnce = el.dataset.animateOnce !== 'false';
                        if (animateOnce) {
                            observer.unobserve(el);
                        }
                    }
                });
            });
        }
    }

    // Mobile Menu Toggle
    const btn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');

    if (btn && menu) {
        btn.addEventListener('click', () => {
            menu.classList.toggle('hidden');
        });
    }

    // --- CHATBOT LOGIC ---
    const bubble = document.getElementById('clarity-bubble');
    const chatWindow = document.getElementById('clarity-chat-window');
    const closeChatBtn = document.getElementById('close-chat-btn');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    const quickPromptsContainer = document.getElementById('quick-prompts');

    // Toggle Chat Window
    function toggleChat() {
        if (chatWindow.classList.contains('hidden')) {
            // Open
            chatWindow.classList.remove('hidden');
            setTimeout(() => {
                chatWindow.classList.remove('scale-95', 'opacity-0');
            }, 10);
            bubble.classList.add('hidden'); // Hide bubble when chat is open
            renderQuickPrompts(); // Ensure prompts are visible
        } else {
            // Close
            chatWindow.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                chatWindow.classList.add('hidden');
                bubble.classList.remove('hidden');
            }, 300);
        }
    }

    if (bubble) bubble.addEventListener('click', toggleChat);
    if (closeChatBtn) closeChatBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent bubbling
        toggleChat();
    });

    // --- CHAT MEMORY & API CONFIG ---
    const API_ENDPOINT = window.CLARITY_API_ENDPOINT || '/api/clarity';
    const conversationHistory = [];
    const MAX_HISTORY_ITEMS = 20;

    function appendToHistory(entry) {
        if (!entry || !entry.role || !entry.content) return;
        conversationHistory.push(entry);
        while (conversationHistory.length > MAX_HISTORY_ITEMS) {
            conversationHistory.shift();
        }
    }

    function stripHtmlTags(html) {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        return temp.textContent || temp.innerText || '';
    }

    function formatResponseText(text) {
        if (!text) return '';
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
    }

    async function fetchGeminiResponse(userMessage) {
        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: userMessage,
                    history: conversationHistory
                })
            });

            if (!response.ok) {
                throw new Error(`API responded with status ${response.status}`);
            }

            const data = await response.json();

            if (data.reply) {
                return formatResponseText(data.reply);
            }

            throw new Error('Missing reply in API response');
        } catch (error) {
            console.error('Clarity AI API Error:', error);
            return formatResponseText(getMockResponse(userMessage));
        }
    }

    // Updated Chat Handler
    if (chatForm) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const userMsg = chatInput.value.trim();
            if (!userMsg) return;

            chatInput.value = '';
            handleUserMessage(userMsg);
        });
    }

    async function handleUserMessage(userMsg) {
        addMessage(userMsg, 'user');
        appendToHistory({ role: 'user', content: userMsg });
        showTyping();

        const response = await fetchGeminiResponse(userMsg);

        removeTyping();
        addMessage(response, 'bot');
        appendToHistory({ role: 'assistant', content: stripHtmlTags(response) });
    }

    // --- KNOWLEDGE BASE (Fallback) ---

    // Quick Prompts Logic
    const quickQuestions = [
        "How do I label transactions?",
        "How much does it cost?",
        "Can I connect my bank?",
        "What about my debt?",
        "Is there a payment plan?"
    ];

    function renderQuickPrompts() {
        if (!quickPromptsContainer) return;
        quickPromptsContainer.innerHTML = '';
        // quickPromptsContainer.style.display = 'flex'; // Already handled by CSS classes
        
        quickQuestions.forEach(q => {
            const btn = document.createElement('button');
            btn.className = "flex-shrink-0 px-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-xs text-brand-dark hover:bg-brand-pop hover:text-white hover:border-brand-pop transition-all whitespace-nowrap shadow-sm mb-1";
            btn.textContent = q;
            btn.onclick = () => {
                handleUserMessage(q);
            };
            quickPromptsContainer.appendChild(btn);
        });
    }

    function addMessage(text, sender) {
        const div = document.createElement('div');
        div.className = `flex gap-3 items-end ${sender === 'user' ? 'flex-row-reverse' : ''}`;
        
        const avatarHtml = sender === 'bot' 
            ? `<div class="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-gray-100"><img src="images/clarity-avatar-v2.png" class="w-full h-full object-cover"></div>` 
            : `<div class="w-8 h-8 rounded-full bg-brand-secondary flex items-center justify-center text-white text-xs flex-shrink-0 shadow-sm"><i class="fa-solid fa-user"></i></div>`;

        const bubbleClass = sender === 'bot'
            ? 'bg-brand-offwhite text-brand-dark border border-gray-100 rounded-bl-none'
            : 'bg-brand-pop text-white rounded-br-none shadow-md';

        div.innerHTML = `
            ${avatarHtml}
            <div class="${bubbleClass} p-4 rounded-2xl text-sm leading-relaxed max-w-[85%]">
                ${text}
            </div>
        `;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function showTyping() {
        const id = 'typing-indicator';
        if (document.getElementById(id)) return;
        
        const div = document.createElement('div');
        div.id = id;
        div.className = 'flex gap-3 items-end';
        div.innerHTML = `
            <div class="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-gray-100"><img src="images/clarity-avatar-v2.png" class="w-full h-full object-cover"></div>
            <div class="bg-brand-offwhite p-4 rounded-2xl rounded-bl-none text-sm border border-gray-100 flex gap-1 items-center h-12 w-16 justify-center">
                <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100"></span>
                <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200"></span>
            </div>
        `;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function removeTyping() {
        const el = document.getElementById('typing-indicator');
        if (el) el.remove();
    }

    // --- FEATURE MODAL LOGIC (New "Feature Explorer") ---
    window.openFeatureModal = (featureId) => {
        const modal = document.getElementById('feature-modal');
        const modalImage = document.getElementById('modal-image');
        const modalTitle = document.getElementById('modal-title');
        const modalDesc = document.getElementById('modal-desc');
        const modalVerdict = document.getElementById('modal-verdict');
        const modalCompetitorStatus = document.getElementById('modal-competitor-status');

        if(!modal) return;

        // Content Map
        const content = {
            'dashboard': {
                title: 'Total Clarity Dashboard',
                desc: 'Most tools just show you a list of transactions. We show you your *actual* financial health. See your "Safe to Spend" number instantly, track your progress toward goals, and visualize your cash flow timeline.',
                verdict: 'Clarity vs. Confusion.',
                competitor: 'Basic Lists Only',
                image: 'images/dashboard-mockup.png' // Placeholder
            },
            'networth': {
                title: 'Net Worth Tracker',
                desc: 'Income is vanity; Net Worth is sanity. We track your assets (home, investments, savings) against your liabilities (loans, debt) to show you your true wealth score.',
                verdict: 'Wealth Building vs. Bill Paying.',
                competitor: 'Not Included',
                image: 'images/dashboard-mockup.png' // Placeholder
            },
            'debt': {
                title: 'Debt Destroyer',
                desc: 'Stop guessing which debt to pay first. Our built-in calculator lets you toggle between "Snowball" (lowest balance) and "Avalanche" (highest interest) methods to see exactly when you will be debt-free.',
                verdict: 'Strategic Payoff vs. Minimum Payments.',
                competitor: 'Basic Ledger Only',
                image: 'images/dashboard-mockup.png' // Placeholder
            },
            'calendar': {
                title: 'Smart Bill Calendar',
                desc: 'A visual calendar that overlays your paydays with your due dates. Spot potential overdrafts weeks in advance and sleep easier knowing everything is scheduled.',
                verdict: 'Proactive vs. Reactive.',
                competitor: 'List View Only',
                image: 'images/dashboard-mockup.png' // Placeholder
            },
            'ai': {
                title: 'Clarity AI Guide',
                desc: 'Your judgment-free financial friend. Ask "Can I afford a vacation?" or "How do I categorize this?" and get instant, personalized answers based on your unique data.',
                verdict: 'Personal Guidance vs. DIY.',
                competitor: 'No AI Support',
                image: 'images/dashboard-mockup.png' // Placeholder
            },
            'onelogin': {
                title: 'Personal + Business',
                desc: 'Entrepreneurs don\'t live in silos. View your business profit alongside your personal spending in one seamless toggle. No need for two expensive subscriptions.',
                verdict: 'Unified Life vs. Fragmented.',
                competitor: 'Requires 2 Subscriptions',
                image: 'images/dashboard-mockup.png' // Placeholder
            }
        };

        const data = content[featureId];
        if (data) {
            modalTitle.textContent = data.title;
            modalDesc.textContent = data.desc;
            modalVerdict.textContent = data.verdict;
            modalCompetitorStatus.textContent = data.competitor;
            modalImage.src = data.image;
            
            modal.classList.remove('hidden');
        }
    };

    window.closeFeatureModal = () => {
        const modal = document.getElementById('feature-modal');
        if (modal) modal.classList.add('hidden');
    };

    // --- KNOWLEDGE BASE (Simulating User Guide Integration) ---
    const knowledgeBase = [
        {
            keywords: ['label', 'categorize', 'tag', 'sort'],
            response: "Great question! Labeling is key to clarity. In the <strong>Transactions Tab</strong>, simply click the 'Category' dropdown next to any expense. You can select from our preset list (like 'Groceries' or 'Business') or create a custom label. <br><br><em>Tip: Clarity AI can auto-label these for you after you do it once!</em>"
        },
        {
            keywords: ['price', 'cost', 'expensive', 'much', 'money'],
            response: "The Money Mastery System is an annual investment of **$888** (that breaks down to just **$2.43 a day**). This includes the full system, Clarity AI access, and all future updates for the year."
        },
        {
            keywords: ['start', 'begin', 'setup', 'first step'],
            response: "Welcome to your financial bliss! To get started, you'll want to: <br>1. Log in to your portal<br>2. Connect your bank accounts via Stripe (it's secure!)<br>3. Watch the 'Welcome' video from Donna on the dashboard."
        },
        {
            keywords: ['clarity', 'ai', 'who', 'bot'],
            response: "I'm Clarity, your AI financial guide! I'm here to answer questions, help you categorize transactions, and give you judgment-free advice based on the Money Mastery principles."
        },
        {
            keywords: ['stripe', 'bank', 'connect', 'csv'],
            response: "We integrate directly with Stripe to securely sync your transactions. This means **no more manual CSV uploads**! Your data updates automatically so you always have a real-time view."
        },
        {
            keywords: ['debt', 'payoff', 'loan', 'credit card'],
            response: "Our Debt Payoff tool uses the 'Snowball' and 'Avalanche' methods. You simply enter your debts, and I'll help you calculate the fastest (or cheapest) way to become debt-free."
        },
        {
            keywords: ['login', 'sign in', 'access'],
            response: "You can log in at the top right of this page (once you're a member). If you haven't joined yet, click 'Start Your Free Walkthrough'!"
        },
        {
            keywords: ['gemini', 'google', 'integration'],
            response: "I am powered by advanced AI models to understand your natural language questions and provide helpful, context-aware answers from the Money Mastery User Guide."
        },
        {
            keywords: ['refund', 'cancel', 'guarantee', 'payment plan'],
            response: "Due to the digital nature of our proprietary system, we don't offer refunds on the base product. However, we DO offer payment plans for the Fierce Financials coaching tier."
        }
    ];

    function getMockResponse(input) {
        const lowerInput = input.toLowerCase();
        
        // Check Knowledge Base
        for (const entry of knowledgeBase) {
            if (entry.keywords.some(keyword => lowerInput.includes(keyword))) {
                return entry.response;
            }
        }

        // Expanded Fallback for unknown queries
        return "That's a specific question that might be in your personal data or deep in the guide. Once you're fully logged in, I can pull that answer instantly. For now, try asking about 'Pricing', 'Debt', or 'How to Start'.";
    }
});
