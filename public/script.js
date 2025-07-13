// Trae Agent - Simplified JavaScript

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
const apiKeyInput = document.getElementById('apiKey');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    currentSessionId = generateSessionId();
    
    taskForm.addEventListener('submit', handleTaskSubmit);
    providerSelect.addEventListener('change', updateModelOptions);
    
    loadConfiguration();
    updateModelOptions();
    
    console.log('Trae Agent initialized');
});

// Generate unique session ID
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Handle task form submission
async function handleTaskSubmit(event) {
    event.preventDefault();
    
    if (isProcessing) return;
    
    const task = taskInput.value.trim();
    if (!task) {
        showNotification('يرجى إدخال مهمة', 'error');
        return;
    }
    
    if (!validateConfiguration()) return;
    
    saveConfiguration();
    addMessage('user', task);
    taskInput.value = '';
    setProcessingState(true);
    
    try {
        showTypingIndicator();
        
        const requestData = {
            task: task,
            sessionId: currentSessionId,
            config: {
                provider: providerSelect.value,
                model: modelSelect.value,
                apiKey: apiKeyInput.value
            }
        };
        
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
        hideTypingIndicator();
        
        if (result.success) {
            addMessage('agent', result.response || 'تم إكمال المهمة بنجاح!');
            
            if (result.trajectory || result.files || result.output) {
                showResults(result);
            }
            
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
            avatarHtml = '<div class="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white text-sm"><i class="fas fa-user"></i></div>';
            messageClass = 'bg-green-50 rounded-lg p-3 max-w-md';
            messageContent = `<p class="text-sm text-gray-800">${escapeHtml(content)}</p>`;
            messageDiv.className += ' flex-row-reverse';
            break;
            
        case 'agent':
            avatarHtml = '<div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm"><i class="fas fa-robot"></i></div>';
            messageClass = 'bg-blue-50 rounded-lg p-3 max-w-md';
            messageContent = formatAgentMessage(content);
            break;
            
        case 'error':
            avatarHtml = '<div class="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-600 rounded-full flex items-center justify-center text-white text-sm"><i class="fas fa-exclamation-triangle"></i></div>';
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

// Format agent message
function formatAgentMessage(content) {
    let formatted = escapeHtml(content);
    
    // Format code blocks
    formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre class="code-block">${code.trim()}</pre>`;
    });
    
    // Format inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="code-inline">$1</code>');
    
    // Format bold text
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    return `<div class="text-sm text-gray-800">${formatted}</div>`;
}

// Show/hide typing indicator
function showTypingIndicator() {
    typingIndicator.classList.remove('hidden');
    typingIndicator.classList.add('flex');
}

function hideTypingIndicator() {
    typingIndicator.classList.add('hidden');
    typingIndicator.classList.remove('flex');
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
    statusIndicator.className = 'mr-3 px-2 py-1 text-xs rounded-full';
    
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
            <div class="border border-gray-200 rounded-lg p-3 bg-blue-50">
                <h4 class="font-medium mb-2 flex items-center text-gray-800">
                    <i class="fas fa-list-alt ml-2 text-blue-600"></i>
                    مسار التنفيذ
                </h4>
                <div class="text-sm text-gray-700">
                    <span>الخطوات: ${result.trajectory.steps || 'غير متوفر'}</span>
                </div>
            </div>
        `;
    }
    
    if (result.files && result.files.length > 0) {
        content += `
            <div class="border border-gray-200 rounded-lg p-3 bg-green-50">
                <h4 class="font-medium mb-2 flex items-center text-gray-800">
                    <i class="fas fa-folder ml-2 text-green-600"></i>
                    الملفات المُنشأة
                </h4>
                <div class="space-y-1">
        `;
        result.files.forEach(file => {
            content += `
                <div class="file-item">
                    <i class="fas fa-file-code text-gray-500 ml-2"></i>
                    <span class="text-sm text-gray-700">${escapeHtml(file.path)}</span>
                    <span class="file-action">${file.action}</span>
                </div>
            `;
        });
        content += '</div></div>';
    }
    
    if (result.output) {
        content += `
            <div class="border border-gray-200 rounded-lg p-3 bg-yellow-50">
                <h4 class="font-medium mb-2 flex items-center text-gray-800">
                    <i class="fas fa-terminal ml-2 text-yellow-600"></i>
                    مخرجات الأوامر
                </h4>
                <pre class="code-block">${escapeHtml(result.output)}</pre>
            </div>
        `;
    }
    
    if (content) {
        resultsContent.innerHTML = content;
        resultsPanel.classList.remove('hidden');
        resultsPanel.classList.add('show');
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} ml-2"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="mr-2 hover:opacity-75">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
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

// Update model options
function updateModelOptions() {
    const provider = providerSelect.value;
    const models = {
        openai: [
            { value: 'gpt-4o', text: 'GPT-4o' },
            { value: 'gpt-4o-mini', text: 'GPT-4o Mini' }
        ],
        anthropic: [
            { value: 'claude-sonnet-4-20250514', text: 'Claude Sonnet 4' },
            { value: 'claude-3-5-sonnet-20241022', text: 'Claude 3.5 Sonnet' }
        ],
        openrouter: [
            { value: 'openai/gpt-4o', text: 'GPT-4o (OpenRouter)' },
            { value: 'anthropic/claude-3-5-sonnet', text: 'Claude 3.5 Sonnet (OpenRouter)' }
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
    return true;
}

// Save/load configuration
function saveConfiguration() {
    const config = {
        provider: providerSelect.value,
        model: modelSelect.value
    };
    localStorage.setItem('traeAgentConfig', JSON.stringify(config));
}

function loadConfiguration() {
    const saved = localStorage.getItem('traeAgentConfig');
    if (saved) {
        try {
            const config = JSON.parse(saved);
            if (config.provider) providerSelect.value = config.provider;
            if (config.model) modelSelect.value = config.model;
        } catch (error) {
            console.warn('Failed to load configuration:', error);
        }
    }
}

// Fill task input
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

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        if (!isProcessing) {
            taskForm.dispatchEvent(new Event('submit'));
        }
    }
    
    if (event.key === 'Escape' && !isProcessing) {
        taskInput.value = '';
        resultsPanel.classList.add('hidden');
    }
});

// Network status
window.addEventListener('offline', function() {
    updateStatus('error', 'غير متصل');
    showNotification('انقطع الاتصال بالإنترنت', 'error');
});

window.addEventListener('online', function() {
    updateStatus('ready', 'جاهز');
    showNotification('تم إعادة الاتصال بالإنترنت', 'success');
});

// Export functions
window.fillTask = fillTask;
window.togglePassword = togglePassword;