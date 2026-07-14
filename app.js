/* ==========================================================================
   APP STATE
   ========================================================================== */
const state = {
    shippingType: 'normal',
    shippingCost: 5.00,
    totalCost: 5.00,
    paymentMethod: 'card',
    donor: {
        name: '',
        email: '',
        phone: '',
        cpf: '24823194047', // Default mathematically valid CPF to bypass Mercado Pago requirements without asking client
        cep: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        size: 'M'
    }
};

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */
let mp;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Mercado Pago with the Public Key
    try {
        mp = new MercadoPago('APP_USR-6ef31b59-8d0c-4e29-97bd-d3b544dd91b2', {
            locale: 'es'
        });
    } catch (e) {
        console.error("Mercado Pago SDK failed to load:", e);
    }

    initCarousel();
    // initNotifications();

    // Flexible Alphanumeric Postal Code Input
    const cepInput = document.getElementById('input-cep');
    if (cepInput) {
        cepInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
            if (value.length > 10) value = value.substring(0, 10);
            e.target.value = value;
        });
    }

    // Format Credit Card Number Input (add spaces every 4 digits)
    const cardNumInput = document.getElementById('input-card-number');
    if (cardNumInput) {
        cardNumInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 16) value = value.substring(0, 16);
            
            // Format: 0000 0000 0000 0000
            let formatted = value.match(/.{1,4}/g);
            e.target.value = formatted ? formatted.join(' ') : '';
        });
    }

    // Format Card Expiration Input (MM/AA)
    const cardExpInput = document.getElementById('input-card-expiration');
    if (cardExpInput) {
        cardExpInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 4) value = value.substring(0, 4);
            
            if (value.length > 2) {
                e.target.value = value.substring(0, 2) + '/' + value.substring(2);
            } else {
                e.target.value = value;
            }
        });
    }

    // Format Card CVV Input (digits only, limit 4)
    const cardCvvInput = document.getElementById('input-card-cvv');
    if (cardCvvInput) {
        cardCvvInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 4) value = value.substring(0, 4);
            e.target.value = value;
        });
    }
});

/* ==========================================================================
   PRODUCT IMAGE GALLERY (CAROUSEL)
   ========================================================================== */
let activeSlideIndex = 0;

function initCarousel() {
    const track = document.getElementById('carousel-track');
    const slides = document.querySelectorAll('.carousel-slide');
    const dotsContainer = document.getElementById('carousel-dots');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    
    if (!slides.length) return;

    // Generate dots
    slides.forEach((_, index) => {
        const dot = document.createElement('span');
        dot.className = index === 0 ? 'carousel-dot active' : 'carousel-dot';
        dot.addEventListener('click', () => goToSlide(index));
        dotsContainer.appendChild(dot);
    });

    const updateSlidePosition = () => {
        track.style.transform = `translateX(-${activeSlideIndex * 100}%)`;
        
        // Update dots
        const dots = document.querySelectorAll('.carousel-dot');
        dots.forEach((dot, idx) => {
            dot.classList.toggle('active', idx === activeSlideIndex);
        });
    };

    const goToSlide = (index) => {
        activeSlideIndex = index;
        updateSlidePosition();
    };

    prevBtn.addEventListener('click', () => {
        activeSlideIndex = (activeSlideIndex === 0) ? slides.length - 1 : activeSlideIndex - 1;
        updateSlidePosition();
    });

    nextBtn.addEventListener('click', () => {
        activeSlideIndex = (activeSlideIndex === slides.length - 1) ? 0 : activeSlideIndex + 1;
        updateSlidePosition();
    });
}

/* ==========================================================================
   ACCORDION ACTION
   ========================================================================== */
const app = {
    selectSize(size, element) {
        state.donor.size = size;
        
        // Remove active class from other size buttons
        const buttons = document.querySelectorAll('.size-btn');
        buttons.forEach(btn => {
            btn.classList.remove('active');
        });
        element.classList.add('active');

        // Sync to summary views
        const checkoutSizeDisp = document.getElementById('checkoutDisplaySize');
        if (checkoutSizeDisp) checkoutSizeDisp.textContent = size;

        const successSizeDisp = document.getElementById('successDisplaySize');
        if (successSizeDisp) successSizeDisp.textContent = size;
    },

    toggleAccordion(headerButton) {
        const item = headerButton.parentElement;
        const content = headerButton.nextElementSibling;
        const isActive = item.classList.contains('active');
        
        // Close all other accordions
        document.querySelectorAll('.accordion-item').forEach(acc => {
            acc.classList.remove('active');
            acc.querySelector('.accordion-content').style.maxHeight = null;
        });
        
        if (!isActive) {
            item.classList.add('active');
            content.style.maxHeight = content.scrollHeight + 'px';
        }
    },

    switchView(fromId, toId) {
        const fromView = document.getElementById(fromId);
        const toView = document.getElementById(toId);
        
        if (fromView) {
            fromView.classList.remove('active');
        }
        if (toView) {
            toView.classList.add('active');
            
            const scrollableChild = toView.querySelector('.product-content, .checkout-content, .success-screen-content');
            if (scrollableChild) {
                scrollableChild.scrollTop = 0;
                scrollableChild.style.overflowY = 'hidden';
                setTimeout(() => {
                    scrollableChild.style.overflowY = 'auto';
                }, 15);
            }
        }
    },

    /* ==========================================================================
       CHECKOUT VIEW NAVIGATION
       ========================================================================== */
    openCheckout() {
        this.switchView('view-product', 'view-checkout');
        if (window.fbq) fbq('track', 'InitiateCheckout');
    },

    closeCheckout() {
        this.switchView('view-checkout', 'view-product');
    },

    goToCheckoutStep3() {
        this.switchView('view-success', 'view-checkout');
        this.goToStep(3);
    },

    goToStep(step) {
        // Adjust step indicator header UI
        const indicators = document.querySelectorAll('.step-indicator');
        indicators.forEach((indicator, index) => {
            if (index + 1 === step) {
                indicator.className = 'step-indicator active';
            } else if (index + 1 < step) {
                indicator.className = 'step-indicator completed';
            } else {
                indicator.className = 'step-indicator';
            }
        });

        // Hide other step views, show requested step view
        document.getElementById('step-form-1').classList.toggle('active', step === 1);
        document.getElementById('step-form-2').classList.toggle('active', step === 2);
        document.getElementById('step-form-3').classList.toggle('active', step === 3);
        
        const checkoutView = document.getElementById('view-checkout');
        if (checkoutView) checkoutView.scrollTop = 0;
    },

    prevStep(step) {
        this.goToStep(step);
    },

    nextStep(currentStep, event) {
        event.preventDefault();
        
        if (currentStep === 1) {
            // STEP 1 VALIDATION
            const nameInput = document.getElementById('input-name');
            const emailInput = document.getElementById('input-email');
            const phoneInput = document.getElementById('input-phone');

            let isValid = true;

            // Name validation (at least first and last name)
            const nameVal = nameInput.value.trim();
            if (nameVal.split(' ').length < 2) {
                this.setInputError(nameInput, 'error-name', true);
                isValid = false;
            } else {
                this.setInputError(nameInput, 'error-name', false);
            }

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailInput.value.trim())) {
                this.setInputError(emailInput, 'error-email', true);
                isValid = false;
            } else {
                this.setInputError(emailInput, 'error-email', false);
            }

            // Phone validation
            const phoneVal = phoneInput.value.replace(/\D/g, '');
            if (phoneVal.length < 8) {
                this.setInputError(phoneInput, 'error-phone', true);
                isValid = false;
            } else {
                this.setInputError(phoneInput, 'error-phone', false);
            }

            if (isValid) {
                state.donor.name = nameVal;
                state.donor.email = emailInput.value.trim();
                state.donor.phone = phoneInput.value.trim();
                
                this.goToStep(2);
                if (window.fbq) fbq('track', 'AddPaymentInfo');
            }
        } else if (currentStep === 2) {
            // STEP 2 VALIDATION
            const cepInput = document.getElementById('input-cep');
            const streetInput = document.getElementById('input-street');
            const numberInput = document.getElementById('input-number');
            const neighborhoodInput = document.getElementById('input-neighborhood');
            const cityInput = document.getElementById('input-city');
            const stateInput = document.getElementById('input-state');

            let isValid = true;

            if (cepInput.value.trim().length < 3) {
                this.setInputError(cepInput, 'error-cep', true);
                isValid = false;
            } else {
                this.setInputError(cepInput, 'error-cep', false);
            }

            if (!streetInput.value.trim()) {
                streetInput.parentElement.classList.add('has-error');
                isValid = false;
            } else {
                streetInput.parentElement.classList.remove('has-error');
            }

            if (!numberInput.value.trim()) {
                numberInput.parentElement.classList.add('has-error');
                isValid = false;
            } else {
                numberInput.parentElement.classList.remove('has-error');
            }

            if (!neighborhoodInput.value.trim()) {
                neighborhoodInput.parentElement.classList.add('has-error');
                isValid = false;
            } else {
                neighborhoodInput.parentElement.classList.remove('has-error');
            }

            if (!cityInput.value.trim()) {
                cityInput.parentElement.classList.add('has-error');
                isValid = false;
            } else {
                cityInput.parentElement.classList.remove('has-error');
            }

            if (!stateInput.value.trim()) {
                stateInput.parentElement.classList.add('has-error');
                isValid = false;
            } else {
                stateInput.parentElement.classList.remove('has-error');
            }

            if (isValid) {
                state.donor.cep = cepInput.value.trim();
                state.donor.street = streetInput.value.trim();
                state.donor.number = numberInput.value.trim();
                state.donor.complement = document.getElementById('input-complement').value.trim();
                state.donor.neighborhood = neighborhoodInput.value.trim();
                state.donor.city = cityInput.value.trim();
                state.donor.state = stateInput.value.trim();

                // Sync pricing variables
                this.updateShippingDetailsBox();
                this.goToStep(3);
            }
        }
    },

    setInputError(inputElement, errorId, hasError) {
        const group = inputElement.parentElement;
        if (hasError) {
            group.classList.add('has-error');
        } else {
            group.classList.remove('has-error');
        }
    },

    /* Dynamic Shipping updates */
    updateShipping(cost, type) {
        state.shippingCost = cost;
        state.shippingType = type;
        state.totalCost = cost; // product is 0, so total is just donation

        // Adjust active shipping cards styles
        const normalCard = document.getElementById('label-shipping-normal');
        const sedexCard = document.getElementById('label-shipping-sedex');
        const testCard = document.getElementById('label-shipping-test');

        if (normalCard) normalCard.classList.toggle('active', type === 'normal');
        if (sedexCard) sedexCard.classList.toggle('active', type === 'sedex');
        if (testCard) testCard.classList.toggle('active', type === 'test');

        this.updateShippingDetailsBox();
    },

    updateShippingDetailsBox() {
        let typeText = 'Donación Devoto (Envío Gratis)';
        if (state.shippingType === 'sedex') {
            typeText = 'Donación Protector (Envío Gratis)';
        } else if (state.shippingType === 'test') {
            typeText = 'Donación Padrino (Envío Gratis)';
        }
        const costText = `$ ${state.shippingCost.toFixed(2)}`;
        
        document.getElementById('checkoutDisplayShippingType').textContent = typeText;
        document.getElementById('checkoutDisplayShippingCost').textContent = costText;
        document.getElementById('checkoutDisplayTotal').textContent = costText;

        // Update installments dropdown
        this.updateCardInstallmentsDropdown();
    },

    updateCardInstallmentsDropdown() {
        const select = document.getElementById('input-card-installments');
        if (!select) return;
        
        select.innerHTML = '';
        
        // Setup static elegant installment calculations up to 3x sin interés
        const amt = state.shippingCost;
        const options = [
            { val: 1, text: `1 cuota de $ ${amt.toFixed(2)} sin interés` },
            { val: 2, text: `2 cuotas de $ ${(amt / 2).toFixed(2)} sin interés` },
            { val: 3, text: `3 cuotas de $ ${(amt / 3).toFixed(2)} sin interés` }
        ];
        
        options.forEach(opt => {
            const el = document.createElement('option');
            el.value = opt.val;
            el.textContent = opt.text;
            select.appendChild(el);
        });
    },

    /* Redirect to corresponding Hotmart Checkout link with pre-filled parameters */
    redirectToHotmart() {
        let baseUrl = '';
        if (state.shippingType === 'normal') {
            baseUrl = 'https://pay.hotmart.com/E106108740J?off=y91fzdtt';
        } else if (state.shippingType === 'sedex') {
            baseUrl = 'https://pay.hotmart.com/E106108740J?off=7vwujben';
        } else if (state.shippingType === 'test') {
            baseUrl = 'https://pay.hotmart.com/E106108740J?off=r7arwhnz';
        }

        // Pre-fill parameters for Hotmart Checkout
        const name = encodeURIComponent(state.donor.name);
        const email = encodeURIComponent(state.donor.email);
        const phone = encodeURIComponent(state.donor.phone.replace(/\D/g, ''));

        const finalUrl = `${baseUrl}&name=${name}&email=${email}&phone=${phone}`;

        // Trigger Facebook Pixel purchase event before redirecting
        if (window.fbq) {
            fbq('track', 'Purchase', { value: state.shippingCost, currency: 'USD' });
        }

        // Redirect lead to Hotmart Checkout
        window.location.href = finalUrl;
    },

    startConfetti() {
        const canvas = document.getElementById('confetti-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const container = document.querySelector('.mobile-container');
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        
        const colors = ["#FFCC00", "#FF3B30", "#34C759", "#007AFF", "#AF52DE", "#5AC8FA"];
        const particles = [];
        this.confettiActive = true;
        
        for (let i = 0; i < 100; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * -canvas.height - 20,
                r: Math.random() * 6 + 4,
                d: Math.random() * canvas.height,
                color: colors[Math.floor(Math.random() * colors.length)],
                tilt: Math.random() * 10 - 5,
                tiltAngleIncremental: Math.random() * 0.07 + 0.02,
                tiltAngle: 0
            });
        }
        
        const draw = () => {
            if (!this.confettiActive) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            particles.forEach((p, idx) => {
                p.tiltAngle += p.tiltAngleIncremental;
                p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
                p.x += Math.sin(p.tiltAngle);
                
                ctx.beginPath();
                ctx.lineWidth = p.r;
                ctx.strokeStyle = p.color;
                ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
                ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
                ctx.stroke();
                
                if (p.y > canvas.height) {
                    particles[idx] = {
                        x: Math.random() * canvas.width,
                        y: -20,
                        r: p.r,
                        d: p.d,
                        color: p.color,
                        tilt: p.tilt,
                        tiltAngleIncremental: p.tiltAngleIncremental,
                        tiltAngle: p.tiltAngle
                    };
                }
            });
            
            requestAnimationFrame(draw);
        };
        
        draw();
        
        setTimeout(() => {
            this.confettiActive = false;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }, 6000);
    },

    resetEcomFlow() {
        // Reset all views and form inputs
        this.switchView('view-success', 'view-product');
        
        document.getElementById('form-personal').reset();
        document.getElementById('form-shipping').reset();
        
        // Clear state
        state.shippingType = 'normal';
        state.shippingCost = 5.00;
        state.totalCost = 5.00;
        state.paymentMethod = 'card';
        state.donor.size = 'M';
        
        // Reset active size button
        const buttons = document.querySelectorAll('.size-btn');
        buttons.forEach(btn => {
            btn.classList.toggle('active', btn.textContent === 'M');
        });
        const checkoutSizeDisp = document.getElementById('checkoutDisplaySize');
        if (checkoutSizeDisp) checkoutSizeDisp.textContent = 'M';
        
        this.updateShipping(5.00, 'normal');
        
        window.scrollTo({ top: 0 });
    },

    /* ==========================================================================
       IMAGE ZOOM MODAL ACTIONS
       ========================================================================== */
    zoomImage(src) {
        const overlay = document.getElementById('zoom-modal');
        const img = document.getElementById('zoom-modal-img');
        img.src = src;
        overlay.classList.add('active');
    },

    closeZoomImage() {
        document.getElementById('zoom-modal').classList.remove('active');
    },
    
    showNotificationTip() {
        const toast = document.getElementById('toast-tip');
        toast.classList.add('active');
        setTimeout(() => toast.classList.remove('active'), 5000);
    }
};

/* ==========================================================================
   SIMULATED CLIENT TOAST NOTIFICATIONS (SOCIAL PROOF)
   ========================================================================== */
function initNotifications() {
    const locations = [
        'Ciudad de México', 'Madrid', 'Bogotá', 'Guadalajara', 'Medellín',
        'Santiago', 'Lima', 'Buenos Aires', 'Valencia', 'Puebla', 'Barcelona'
    ];
    
    const names = [
        'María', 'Ana', 'Carmen', 'Francisca', 'Josefa', 'Lucía', 'Gaby',
        'José', 'Juan', 'Luis', 'Antonio', 'Alejandro', 'Felipe', 'Carlos'
    ];
    
    const toast = document.getElementById('toast-tip');
    const toastMsg = toast.querySelector('.toast-msg');
    
    const triggerToast = () => {
        const name = names[Math.floor(Math.random() * names.length)];
        const loc = locations[Math.floor(Math.random() * locations.length)];
        
        toastMsg.innerHTML = `<strong>${name}</strong> de ${loc} acaba de solicitar su camiseta gratis.`;
        toast.classList.add('active');
        
        setTimeout(() => {
            toast.classList.remove('active');
        }, 5000);
    };
    
    // Start after 8 seconds, loop every 20 seconds
    setTimeout(() => {
        triggerToast();
        setInterval(triggerToast, 20000);
    }, 8000);
}

window.app = app;
