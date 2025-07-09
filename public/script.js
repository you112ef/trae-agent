// Global state
let currentSessionId = null;
let isProcessing = false;

// DOM elements
const taskForm = document.getElementById('taskForm');
const taskInput = document.getElementById('taskInput');
const submitBtn = document.getElementById('submitBtn');
const chatContainer = document.getElementById('chatContainer');
const typingIndicator = document.getElementById('typingIndicator');
const statusIndicator = document.getElementById('statusIndicator');
const resultsPanel = document.getElementById('resultsPanel');
const resultsContent = document.getElementById('resultsContent');

// Configuration elements
const providerSelect = document.getElementById('provider');
const modelSelect = document.getElementById('model');
const maxStepsInput = document.getElementById('maxSteps');
const apiKeyInput = document.getElementById('apiKey');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Generate session ID
    currentSessionId = generateSessionId();
    
    // Set up event listeners
    taskForm.addEventListener('submit', handleTaskSubmit);
    providerSelect.addEventListener('change', updateModelOptions);
    
    // Load saved configuration from localStorage
    loadConfiguration();
    
    // Update model options based on initial provider
    updateModelOptions();
    
    console.log('Trae Agent Web Interface initialized');
});

// Generate unique session ID
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Handle task form submission
async function handleTaskSubmit(event) {
    event.preventDefault();
    
    if (isProcessing) {
        return;
    }
    
    const task = taskInput.value.trim();
    if (!task) {
        return;
    }
    
    // Validate configuration
    if (!validateConfiguration()) {
        return;
    }
    
    // Save configuration
    saveConfiguration();
    
    // Add user message to chat
    addMessage('user', task);
    
    // Clear input and disable form
    taskInput.value = '';
    setProcessingState(true);
    
    try {
        // Show typing indicator
        showTypingIndicator();
        
        // Prepare request data
        const requestData = {
            task: task,
            sessionId: currentSessionId,
            config: {
                provider: providerSelect.value,
                model: modelSelect.value,
                maxSteps: parseInt(maxStepsInput.value),
                apiKey: apiKeyInput.value
            }
        };
        
        // Make API request
        const response = await fetch('/api/execute-task', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Hide typing indicator
        hideTypingIndicator();
        
        if (result.success) {
            // Add agent response to chat
            addMessage('agent', result.response || 'Task completed successfully!');
            
            // Show results if available
            if (result.trajectory || result.files || result.output) {
                showResults(result);
            }
            
            // Update status
            updateStatus('success', 'Task completed');
        } else {
            throw new Error(result.error || 'Unknown error occurred');
        }
        
    } catch (error) {
        console.error('Error executing task:', error);
        hideTypingIndicator();
        addMessage('error', `Error: ${error.message}`);
        updateStatus('error', 'Task failed');
    } finally {
        setProcessingState(false);
    }
}

// Add message to chat
function addMessage(type, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'flex items-start space-x-3';
    
    let avatarHtml, messageClass, messageContent;
    
    switch (type) {
        case 'user':
            avatarHtml = '<div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">👤</div>';
            messageClass = 'bg-green-50 rounded-lg p-3 max-w-md ml-auto';
            messageContent = `<p class="text-sm">${escapeHtml(content)}</p>`;
            messageDiv.className += ' flex-row-reverse';
            break;
            
        case 'agent':
            avatarHtml = '<div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">🤖</div>';
            messageClass = 'bg-blue-50 rounded-lg p-3 max-w-md';
            messageContent = formatAgentMessage(content);
            break;
            
        case 'error':
            avatarHtml = '<div class="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold">⚠️</div>';
            messageClass = 'bg-red-50 border border-red-200 rounded-lg p-3 max-w-md';
            messageContent = `<p class="text-sm text-red-700">${escapeHtml(content)}</p>`;
            break;
    }
    
    messageDiv.innerHTML = `
        ${avatarHtml}
        <div class="${messageClass}">
            ${messageContent}
        </div>
    `;
    
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Format agent message with syntax highlighting for code
function formatAgentMessage(content) {
    // Simple markdown-like formatting
    let formatted = escapeHtml(content);
    
    // Format code blocks
    formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        const language = lang || 'text';
        return `<pre class="bg-gray-800 text-gray-100 p-3 rounded mt-2 mb-2 overflow-x-auto"><code class="language-${language}">${code.trim()}</code></pre>`;
    });
    
    // Format inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-gray-200 px-1 py-0.5 rounded text-sm">$1</code>');
    
    // Format bold text
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Format links
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:underline" target="_blank">$1</a>');
    
    return `<div class="text-sm">${formatted}</div>`;
}

// Show typing indicator
function showTypingIndicator() {
    typingIndicator.classList.add('active');
}

// Hide typing indicator
function hideTypingIndicator() {
    typingIndicator.classList.remove('active');
}

// Set processing state
function setProcessingState(processing) {
    isProcessing = processing;
    submitBtn.disabled = processing;
    taskInput.disabled = processing;
    
    if (processing) {
        submitBtn.textContent = 'Processing...';
        submitBtn.classList.add('opacity-50');
        updateStatus('processing', 'Working...');
    } else {
        submitBtn.textContent = 'Send';
        submitBtn.classList.remove('opacity-50');
        updateStatus('ready', 'Ready');
    }
}

// Update status indicator
function updateStatus(status, message) {
    statusIndicator.textContent = message;
    statusIndicator.className = 'ml-3 px-2 py-1 text-xs rounded-full';
    
    switch (status) {
        case 'ready':
            statusIndicator.classList.add('bg-green-100', 'text-green-800');
            break;
        case 'processing':
            statusIndicator.classList.add('bg-yellow-100', 'text-yellow-800');
            break;
        case 'success':
            statusIndicator.classList.add('bg-blue-100', 'text-blue-800');
            break;
        case 'error':
            statusIndicator.classList.add('bg-red-100', 'text-red-800');
            break;
    }
}

// Show results panel
function showResults(result) {
    let content = '';
    
    if (result.trajectory) {
        content += `
            <div class="border rounded-lg p-4">
                <h4 class="font-medium mb-2">📋 Execution Trajectory</h4>
                <p class="text-sm text-gray-600 mb-2">Steps: ${result.trajectory.steps || 'N/A'}</p>
                <p class="text-sm text-gray-600">Duration: ${result.trajectory.duration || 'N/A'}</p>
            </div>
        `;
    }
    
    if (result.files && result.files.length > 0) {
        content += `
            <div class="border rounded-lg p-4">
                <h4 class="font-medium mb-2">📁 Files Created/Modified</h4>
                <ul class="text-sm space-y-1">
        `;
        result.files.forEach(file => {
            content += `<li class="flex items-center space-x-2">
                <span class="text-gray-500">📄</span>
                <span>${escapeHtml(file.path)}</span>
                <span class="text-xs text-gray-400">(${file.action})</span>
            </li>`;
        });
        content += '</ul></div>';
    }
    
    if (result.output) {
        content += `
            <div class="border rounded-lg p-4">
                <h4 class="font-medium mb-2">💻 Command Output</h4>
                <pre class="bg-gray-100 p-3 rounded text-xs overflow-x-auto">${escapeHtml(result.output)}</pre>
            </div>
        `;
    }
    
    if (content) {
        resultsContent.innerHTML = content;
        resultsPanel.classList.remove('hidden');
    }
}

// Update model options based on selected provider
function updateModelOptions() {
    const provider = providerSelect.value;
    const models = {
        openai: [
            { value: 'gpt-4o', text: 'GPT-4o' },
            { value: 'gpt-4o-mini', text: 'GPT-4o Mini' },
            { value: 'gpt-4-turbo', text: 'GPT-4 Turbo' }
        ],
        anthropic: [
            { value: 'claude-sonnet-4-20250514', text: 'Claude Sonnet 4' },
            { value: 'claude-3-5-sonnet-20241022', text: 'Claude 3.5 Sonnet' },
            { value: 'claude-3-haiku-20240307', text: 'Claude 3 Haiku' }
        ],
        openrouter: [
            { value: 'openai/gpt-4o', text: 'GPT-4o (OpenRouter)' },
            { value: 'anthropic/claude-3-5-sonnet', text: 'Claude 3.5 Sonnet (OpenRouter)' },
            { value: 'google/gemini-pro', text: 'Gemini Pro (OpenRouter)' }
        ],
        azure: [
            { value: 'gpt-4', text: 'GPT-4 (Azure)' },
            { value: 'gpt-35-turbo', text: 'GPT-3.5 Turbo (Azure)' }
        ],
        doubao: [
            { value: 'doubao-seed-1.6', text: 'Doubao Seed 1.6' },
            { value: 'doubao-pro-32k', text: 'Doubao Pro 32K' }
        ]
    };
    
    modelSelect.innerHTML = '';
    models[provider].forEach(model => {
        const option = document.createElement('option');
        option.value = model.value;
        option.textContent = model.text;
        modelSelect.appendChild(option);
    });
}

// Validate configuration
function validateConfiguration() {
    if (!apiKeyInput.value.trim()) {
        alert('Please enter your API key');
        apiKeyInput.focus();
        return false;
    }
    
    if (maxStepsInput.value < 1 || maxStepsInput.value > 50) {
        alert('Max steps must be between 1 and 50');
        maxStepsInput.focus();
        return false;
    }
    
    return true;
}

// Save configuration to localStorage
function saveConfiguration() {
    const config = {
        provider: providerSelect.value,
        model: modelSelect.value,
        maxSteps: maxStepsInput.value
        // Note: We don't save API key for security
    };
    
    localStorage.setItem('traeAgentConfig', JSON.stringify(config));
}

// Load configuration from localStorage
function loadConfiguration() {
    const saved = localStorage.getItem('traeAgentConfig');
    if (saved) {
        try {
            const config = JSON.parse(saved);
            if (config.provider) providerSelect.value = config.provider;
            if (config.model) modelSelect.value = config.model;
            if (config.maxSteps) maxStepsInput.value = config.maxSteps;
        } catch (error) {
            console.warn('Failed to load saved configuration:', error);
        }
    }
}

// Fill task input with example task
function fillTask(task) {
    taskInput.value = task;
    taskInput.focus();
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Handle keyboard shortcuts
document.addEventListener('keydown', function(event) {
    // Ctrl/Cmd + Enter to submit
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        if (!isProcessing) {
            taskForm.dispatchEvent(new Event('submit'));
        }
    }
    
    // Escape to clear input
    if (event.key === 'Escape' && !isProcessing) {
        taskInput.value = '';
        resultsPanel.classList.add('hidden');
    }
});

// Auto-resize textarea functionality for future enhancements
function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

// Handle network errors gracefully
window.addEventListener('offline', function() {
    updateStatus('error', 'Offline');
});

window.addEventListener('online', function() {
    updateStatus('ready', 'Ready');
});

// Export functions for global access
window.fillTask = fillTask;