// Load config (will use dev defaults if no env set)
const API_BASE_URL = config.apiBaseUrl;

const form = document.getElementById('registrationForm');
const submitBtn = document.getElementById('submitBtn');
const result = document.getElementById('result');
const gymSlugInput = document.getElementById('gymSlug');
const slugPreview = document.getElementById('slugPreview');

let currentStep = 1;
const totalSteps = 3;

// Update URL preview as user types
gymSlugInput.addEventListener('input', (e) => {
  const slug = e.target.value || 'yourslug';
  slugPreview.textContent = slug;
});

// Step navigation functions
function showStep(stepNumber) {
  // Hide all steps
  document.querySelectorAll('.form-step').forEach(step => {
    step.classList.remove('active');
  });
  
  // Show current step
  const currentStepElement = document.querySelector(`.form-step[data-step="${stepNumber}"]`);
  if (currentStepElement) {
    currentStepElement.classList.add('active');
  }
  
  // Update step indicators
  document.querySelectorAll('.step').forEach((step, index) => {
    const stepNum = index + 1;
    step.classList.remove('active', 'completed');
    
    if (stepNum === stepNumber) {
      step.classList.add('active');
    } else if (stepNum < stepNumber) {
      step.classList.add('completed');
    }
  });
  
  currentStep = stepNumber;
}

function validateStep(stepNumber) {
  const stepElement = document.querySelector(`.form-step[data-step="${stepNumber}"]`);
  const inputs = stepElement.querySelectorAll('input[required]');
  
  for (const input of inputs) {
    if (!input.value.trim()) {
      input.focus();
      showError(`Please fill in: ${input.previousElementSibling.textContent}`);
      return false;
    }
    
    // Validate slug format for step 1
    if (stepNumber === 1 && input.name === 'slug') {
      if (!/^[a-z0-9-]{3,30}$/.test(input.value)) {
        input.focus();
        showError('Invalid slug format. Use 3-30 characters: lowercase letters, numbers, and hyphens only.');
        return false;
      }
    }
  }
  
  result.classList.add('hidden');
  return true;
}

// Next button handlers
document.querySelectorAll('.btn-next').forEach(btn => {
  btn.addEventListener('click', () => {
    if (validateStep(currentStep)) {
      showStep(currentStep + 1);
    }
  });
});

// Previous button handlers
document.querySelectorAll('.btn-prev').forEach(btn => {
  btn.addEventListener('click', () => {
    showStep(currentStep - 1);
  });
});

// Initialize - show first step
showStep(1);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Validate final step
  if (!validateStep(3)) {
    return;
  }
  
  const formData = new FormData(form);
  const data = {
    name: formData.get('name'),
    slug: formData.get('slug').toLowerCase().trim(),
    adminEmail: formData.get('adminEmail').trim(),
    companyName: formData.get('companyName').trim(),
    taxNumber: formData.get('taxNumber').trim(),
    addressLine1: formData.get('addressLine1').trim(),
    addressLine2: formData.get('addressLine2')?.trim() || '',
    city: formData.get('city').trim(),
    postalCode: formData.get('postalCode').trim(),
    country: formData.get('country').trim() || 'HU',
    contactName: formData.get('contactName').trim(),
    contactEmail: formData.get('contactEmail').trim(),
    contactPhone: formData.get('contactPhone').trim(),
  };

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating gym...';
  result.classList.add('hidden');

  try {
    // Step 1: Create registration session (NOT the gym yet)
    const response = await fetch(`${API_BASE_URL}/gyms/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.error?.message || 'Registration failed');
    }

    // Save session ID for later (credentials will be shown after payment success)
    sessionStorage.setItem('registrationSessionId', responseData.sessionId);

    // Redirect to Stripe Checkout (URL is already in response)
    submitBtn.textContent = 'Redirecting to payment...';
    window.location.href = responseData.checkoutUrl;
  } catch (error) {
    showError(error.message);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Gym';
  }
});

// Success message is now shown on success.html page after Stripe payment

function showError(message) {
  result.className = 'result error';
  result.innerHTML = `
    <h3>❌ Registration Failed</h3>
    <p>${message}</p>
  `;
}
