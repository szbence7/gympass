# Gym Registration Flow with Stripe Payment

## 🎯 New Multi-Step Registration

The registration form is now split into **3 beautiful steps** instead of one long page:

### Step 1: Gym Information
- Gym Name
- Subdomain (Slug)
- Admin Email Address

### Step 2: Business Information  
- Company Name
- Tax Number
- Address (Line 1, Line 2, City, Postal Code, Country)

### Step 3: Contact Person & Payment Info
- Contact Name
- Contact Email
- Contact Phone
- **Payment preview showing 49,990 HUF/month**

## 💳 Payment Flow

Here's what happens when you click "Create Gym & Pay":

```
1. User fills 3-step form
   ↓
2. Clicks "Create Gym & Pay"
   ↓
3. Backend creates gym with status = "PENDING"
   ↓
4. Backend creates Stripe Checkout Session
   ↓
5. User is REDIRECTED to Stripe Checkout page
   ↓
6. User enters card details on Stripe (secure, hosted by Stripe)
   ↓
7. Payment processed by Stripe
   ↓
8. Two possible outcomes:
   
   ✅ SUCCESS:
   - Stripe webhook → Backend updates gym status to "ACTIVE"
   - User redirected to: /registration/success
   - Credentials shown ONE TIME
   - Gym can now be accessed
   
   ❌ CANCEL:
   - User redirected to: /registration/cancel
   - Gym stays "PENDING"
   - Can retry payment
```

## 🔒 Security & Access Control

### PENDING Gyms (not paid yet)
- Cannot access staff portal
- Get error: "This gym is pending payment"
- Must complete Stripe payment first

### ACTIVE Gyms (paid)
- Full access to staff portal
- Full access to APIs
- Can log in at: `gymname.gym.local/{staffLoginPath}`

## 🎨 UI Improvements

### Step Indicator
- Visual progress bar showing which step you're on
- Steps 1, 2, 3 clearly labeled
- Completed steps shown with checkmarks

### Navigation
- "Next Step →" button (validates current step)
- "← Previous" button (go back to edit)
- "Create Gym & Pay →" on final step

### Payment Preview
- Shows exactly what will be charged: **49,990 HUF / month**
- "🔒 Secure payment powered by Stripe" badge
- Clear explanation that payment happens next

### Validation
- Real-time validation on each step
- Must fill all required fields before proceeding
- Slug format validation (3-30 chars, lowercase, numbers, hyphens)
- Better error messages

## 📱 User Experience

### Before (OLD):
❌ Long single-page form (overwhelming)
❌ No clear indication of payment requirement
❌ Unclear when payment happens

### After (NEW):
✅ Clean 3-step process (manageable chunks)
✅ Clear payment preview before submission
✅ Professional step indicator
✅ Smooth transitions between steps
✅ Better mobile responsive
✅ Stripe-hosted secure payment page

## 🧪 Testing the Flow

1. Visit: `http://localhost:8081/`
2. Fill Step 1 (Gym Info) → Click "Next Step"
3. Fill Step 2 (Business) → Click "Next Step"
4. Fill Step 3 (Contact) → See payment preview
5. Click "Create Gym & Pay"
6. Watch button change to "Creating gym..."
7. Automatically redirected to Stripe Checkout
8. Use test card: `4242 4242 4242 4242`
9. Complete payment
10. Redirected to success page with credentials

## 🎯 What's NOT Changed

✅ Backend Stripe integration (already working)
✅ Webhook handling (already working)
✅ Success/Cancel pages (already created)
✅ Admin portal subscription display (already working)
✅ Tenant routing (no changes)
✅ Staff login paths (no changes)

## 📁 Files Modified

- `registration-portal/index.html` - Multi-step form structure
- `registration-portal/styles.css` - Step indicator, navigation buttons, payment preview
- `registration-portal/app.js` - Step navigation logic, validation

## 🚀 Result

Registration now looks **professional** and **clear**:
- Users understand the payment requirement upfront
- Form is less overwhelming (split into logical steps)
- Payment happens on secure Stripe page
- No confusion about when/how to pay



