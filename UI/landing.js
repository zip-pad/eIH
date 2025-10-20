// Landing Page JavaScript - Simple Black Design
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables. Please check your .env file.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

let currentAuthTab = 'login';

// Check if user is already authenticated
async function checkAuthSession() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Auth check error:', error);
            return;
        }
        
        if (session) {
            // User is already signed in, redirect to main app
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Auth check failed:', error);
    }
}

// Switch between login and signup
function switchAuthTab(tab) {
    currentAuthTab = tab;
    
    const form = document.getElementById('auth-form');
    const submitBtn = document.getElementById('auth-submit');
    const confirmPasswordGroup = document.getElementById('confirm-password-group');
    const switchText = document.getElementById('auth-switch-text');
    
    if (tab === 'login') {
        submitBtn.textContent = 'Sign In';
        confirmPasswordGroup.style.display = 'none';
        switchText.innerHTML = 'Don\'t have an account? <a href="#" onclick="switchAuthTab(\'signup\')">Sign up</a>';
    } else {
        submitBtn.textContent = 'Sign Up';
        confirmPasswordGroup.style.display = 'block';
        switchText.innerHTML = 'Already have an account? <a href="#" onclick="switchAuthTab(\'login\')">Sign in</a>';
    }
    
    // Clear form
    form.reset();
    hideError();
}

// Make functions globally available
window.switchAuthTab = switchAuthTab;
window.signInWithGoogle = signInWithGoogle;
window.signInWithGitHub = signInWithGitHub;

// Debug function to test with known working credentials
window.testSignIn = async function() {
    console.log('🧪 Testing with known working credentials...');
    await signIn('nicolas.g.wittig@gmail.com', 'test123456');
};

// Debug function to test signup and see what happens
window.testSignUp = async function() {
    console.log('🧪 Testing signup...');
    await signUp('test@example.com', 'test123456');
};

// Show error message
function showError(message) {
    const errorElement = document.getElementById('error-message');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

// Hide error message
function hideError() {
    const errorElement = document.getElementById('error-message');
    errorElement.style.display = 'none';
}

// Sign up function
async function signUp(email, password) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (error) {
            throw error;
        }

        if (data.user && !data.user.email_confirmed_at) {
            showError('Please check your email for a confirmation link.');
        } else {
            showError('Account created successfully! Redirecting...');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        }
    } catch (error) {
        console.error('Sign up error:', error);
        showError(error.message || 'Failed to create account. Please try again.');
    }
}

// Sign in function
async function signIn(email, password) {
    console.log('🔐 Sign in called for:', email);
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        console.log('📊 Sign in response:', { 
            hasUser: !!data.user, 
            hasSession: !!data.session, 
            hasError: !!error 
        });

        if (error) {
            throw error;
        }

        // Check for session (most reliable)
        if (data.session) {
            console.log('✅ Session created - sign in successful!');
            showError('Sign in successful! Redirecting...');
            // onAuthStateChange will handle the redirect automatically
        } else if (data.user) {
            // User exists but no session (email not confirmed)
            console.warn('⚠️ User exists but no session - email not confirmed?');
            showError('Please check your email to confirm your account before signing in.');
        } else {
            console.error('❌ No user or session in response');
            showError('Sign in failed. Please try again.');
        }
    } catch (error) {
        console.error('❌ Sign in error:', error);
        showError(error.message || 'Failed to sign in. Please check your credentials.');
    }
}

// OAuth functions (ready when configured)
async function signInWithGoogle() {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/index.html'
            }
        });

        if (error) {
            throw error;
        }
    } catch (error) {
        console.error('Google OAuth error:', error);
        showError('Google sign-in is not configured yet. Please use email/password.');
    }
}

async function signInWithGitHub() {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: window.location.origin + '/index.html'
            }
        });

        if (error) {
            throw error;
        }
    } catch (error) {
        console.error('GitHub OAuth error:', error);
        showError('GitHub sign-in is not configured yet. Please use email/password.');
    }
}

// Form submission handler
function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirm-password');
    
    // Basic validation
    if (!email || !password) {
        showError('Please fill in all fields.');
        return;
    }
    
    if (currentAuthTab === 'signup') {
        if (!confirmPassword) {
            showError('Please confirm your password.');
            return;
        }
        
        if (password !== confirmPassword) {
            showError('Passwords do not match.');
            return;
        }
        
        if (password.length < 6) {
            showError('Password must be at least 6 characters long.');
            return;
        }
        
        signUp(email, password);
    } else {
        signIn(email, password);
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already authenticated
    checkAuthSession();
    
    // Set up form submission
    const form = document.getElementById('auth-form');
    form.addEventListener('submit', handleFormSubmit);
    
    // Set up auth state change listener
    console.log('🎧 Setting up auth state listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('🔔 Auth state changed:', event, 'Session exists:', !!session);
        if (event === 'SIGNED_IN' && session) {
            console.log('✅ SIGNED_IN event - redirecting to main app...');
            window.location.href = 'index.html';
        }
    });
    console.log('✅ Auth state listener active');
    
    // Initialize with login tab
    switchAuthTab('login');
});