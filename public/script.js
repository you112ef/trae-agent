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
    
    // Add smooth scrolling to chat container
    chatContainer.style.scrollBehavior = 'smooth';
    
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
        showNotification('يرجى إدخال مهمة', 'error');
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
            throw new Error(`خطأ في HTTP! الحالة: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Hide typing indicator
        hideTypingIndicator();
        
        if (result.success) {
            // Add agent response to chat
            addMessage('agent', result.response || 'تم إكمال المهمة بنجاح!');
            
            // Show results if available
            if (result.trajectory || result.files || result.output) {
                showResults(result);
            }
            
            // Update status
            updateStatus('success', 'تم الإكمال');
            showNotification('تم إكمال المهمة بنجاح!', 'success');
        } else {
            throw new Error(result.error || 'حدث خطأ غير معروف');
        }
        
    } catch (error) {
        console.error('Error executing task:', error);
        hideTypingIndicator();
        addMessage('error', `خطأ: ${error.message}`);
        updateStatus('error', 'فشلت المهمة');
        showNotification(`خطأ: ${error.message}`, 'error');
    } finally {
        setProcessingState(false);
    }
}

// Add message to chat
function addMessage(type, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'flex items-start space-x-3 space-x-reverse message-bubble';
    
    let avatarHtml, messageClass, messageContent;
    
    switch (type) {
        case 'user':
            avatarHtml = '<div class="w-10 h-10 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg"><i class="fas fa-user"></i></div>';
            messageClass = 'bg-gradient-to-r from-green-50 to-teal-50 rounded-2xl p-4 max-w-md shadow-sm';
            messageContent = `<p class="text-sm text-gray-800">${escapeHtml(content)}</p>`;
            messageDiv.className += ' flex-row-reverse';
            break;
            
        case 'agent':
            avatarHtml = '<div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg"><i class="fas fa-robot"></i></div>';
            messageClass = 'bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-4 max-w-md shadow-sm';
            messageContent = formatAgentMessage(content);
            break;
            
        case 'error':
            avatarHtml = '<div class="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg"><i class="fas fa-exclamation-triangle"></i></div>';
            messageClass = 'bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl p-4 max-w-md shadow-sm';
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
        return `<pre class="bg-gray-800 text-gray-100 p-4 rounded-xl mt-3 mb-3 overflow-x-auto shadow-lg"><code class="language-${language}">${code.trim()}</code></pre>`;
    });
    
    // Format inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-gray-200 px-2 py-1 rounded text-sm font-mono">$1</code>');
    
    // Format bold text
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>');
    
    // Format links
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:text-blue-800 underline" target="_blank">$1</a>');
    
    return `<div class="text-sm text-gray-800">${formatted}</div>`;
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
        submitBtn.innerHTML = '<i class="fas fa-spinner loading-spinner ml-2"></i>جاري المعالجة...';
        submitBtn.classList.add('opacity-50');
        updateStatus('processing', 'يعمل...');
    } else {
        submitBtn.innerHTML = '<i class="fas fa-paper-plane ml-2"></i>إرسال';
        submitBtn.classList.remove('opacity-50');
        updateStatus('ready', 'جاهز');
    }
}

// Update status indicator
function updateStatus(status, message) {
    statusIndicator.textContent = message;
    statusIndicator.className = 'mr-4 px-3 py-1 text-xs rounded-full font-medium';
    
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
            <div class="border border-gray-200 rounded-xl p-4 bg-gradient-to-r from-blue-50 to-purple-50">
                <h4 class="font-medium mb-3 flex items-center text-gray-800">
                    <i class="fas fa-list-alt ml-3 text-blue-600"></i>
                    مسار التنفيذ
                </h4>
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div class="flex items-center">
                        <i class="fas fa-steps ml-2 text-gray-500"></i>
                        <span class="text-gray-700">الخطوات: ${result.trajectory.steps || 'غير متوفر'}</span>
                    </div>
                    <div class="flex items-center">
                        <i class="fas fa-clock ml-2 text-gray-500"></i>
                        <span class="text-gray-700">المدة: ${result.trajectory.duration || 'غير متوفر'}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    if (result.files && result.files.length > 0) {
        content += `
            <div class="border border-gray-200 rounded-xl p-4 bg-gradient-to-r from-green-50 to-teal-50">
                <h4 class="font-medium mb-3 flex items-center text-gray-800">
                    <i class="fas fa-folder ml-3 text-green-600"></i>
                    الملفات المُنشأة/المُعدلة
                </h4>
                <ul class="text-sm space-y-2">
        `;
        result.files.forEach(file => {
            content += `<li class="flex items-center space-x-2 space-x-reverse">
                <i class="fas fa-file-code text-gray-500"></i>
                <span class="text-gray-700">${escapeHtml(file.path)}</span>
                <span class="text-xs text-gray-400 bg-gray-200 px-2 py-1 rounded">${file.action}</span>
            </li>`;
        });
        content += '</ul></div>';
    }
    
    if (result.output) {
        content += `
            <div class="border border-gray-200 rounded-xl p-4 bg-gradient-to-r from-yellow-50 to-orange-50">
                <h4 class="font-medium mb-3 flex items-center text-gray-800">
                    <i class="fas fa-terminal ml-3 text-yellow-600"></i>
                    مخرجات الأوامر
                </h4>
                <pre class="bg-gray-800 text-gray-100 p-4 rounded-xl text-xs overflow-x-auto shadow-lg">${escapeHtml(result.output)}</pre>
            </div>
        `;
    }
    
    if (content) {
        resultsContent.innerHTML = content;
        resultsPanel.classList.remove('hidden');
        
        // Add animation
        resultsPanel.style.opacity = '0';
        resultsPanel.style.transform = 'translateY(20px)';
        setTimeout(() => {
            resultsPanel.style.transition = 'all 0.3s ease';
            resultsPanel.style.opacity = '1';
            resultsPanel.style.transform = 'translateY(0)';
        }, 100);
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-lg transform transition-all duration-300 translate-x-full`;
    
    let bgColor, icon;
    switch (type) {
        case 'success':
            bgColor = 'bg-green-500';
            icon = 'fas fa-check-circle';
            break;
        case 'error':
            bgColor = 'bg-red-500';
            icon = 'fas fa-exclamation-circle';
            break;
        case 'warning':
            bgColor = 'bg-yellow-500';
            icon = 'fas fa-exclamation-triangle';
            break;
        default:
            bgColor = 'bg-blue-500';
            icon = 'fas fa-info-circle';
    }
    
    notification.className += ` ${bgColor} text-white`;
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="${icon} ml-3"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="mr-3 hover:opacity-75">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Toggle password visibility
function togglePassword() {
    const passwordIcon = document.getElementById('passwordIcon');
    if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        passwordIcon.className = 'fas fa-eye-slash';
    } else {
        apiKeyInput.type = 'password';
        passwordIcon.className = 'fas fa-eye';
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
        showNotification('يرجى إدخال مفتاح API', 'error');
        apiKeyInput.focus();
        return false;
    }
    
    if (maxStepsInput.value < 1 || maxStepsInput.value > 50) {
        showNotification('يجب أن تكون الخطوات القصوى بين 1 و 50', 'error');
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
    
    // Add visual feedback
    taskInput.style.transform = 'scale(1.02)';
    setTimeout(() => {
        taskInput.style.transform = 'scale(1)';
    }, 200);
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
    updateStatus('error', 'غير متصل');
    showNotification('انقطع الاتصال بالإنترنت', 'error');
});

window.addEventListener('online', function() {
    updateStatus('ready', 'جاهز');
    showNotification('تم إعادة الاتصال بالإنترنت', 'success');
});

// Export functions for global access
window.fillTask = fillTask;
window.togglePassword = togglePassword;