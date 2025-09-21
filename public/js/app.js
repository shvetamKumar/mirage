// Application State
const App = {
    state: {
        user: null,
        token: null,
        endpoints: [],
        currentSection: 'dashboard',
        isLoading: false
    },

    // API Configuration
    api: {
        baseUrl: '/api/v1',

        // Helper method for API calls
        async request(endpoint, options = {}) {
            const url = `${this.baseUrl}${endpoint}`;
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            };

            // Add auth token if available
            if (App.state.token) {
                config.headers.Authorization = `Bearer ${App.state.token}`;
            }

            try {
                App.showLoading(true);
                const response = await fetch(url, config);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'An error occurred');
                }

                return data;
            } catch (error) {
                App.showAlert(error.message, 'error');
                throw error;
            } finally {
                App.showLoading(false);
            }
        },

        // Auth endpoints
        async login(email, password) {
            return this.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
        },

        async register(userData) {
            return this.request('/auth/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });
        },

        async getDashboard() {
            return this.request('/auth/dashboard');
        },

        async getProfile() {
            return this.request('/auth/profile');
        },

        async createApiKey(keyData) {
            return this.request('/auth/api-keys', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': await App.getCSRFToken()
                },
                body: JSON.stringify(keyData)
            });
        },

        async deactivateApiKey(keyId) {
            return this.request(`/auth/api-keys/${keyId}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-Token': await App.getCSRFToken()
                }
            });
        },

        // Mock endpoint endpoints
        async getEndpoints(query = {}) {
            const searchParams = new URLSearchParams();
            Object.keys(query).forEach(key => {
                if (query[key] !== '' && query[key] !== null && query[key] !== undefined) {
                    searchParams.append(key, query[key]);
                }
            });

            const queryString = searchParams.toString();
            const endpoint = queryString ? `/mock-endpoints?${queryString}` : '/mock-endpoints';
            return this.request(endpoint);
        },

        async getEndpoint(id) {
            return this.request(`/mock-endpoints/${id}`);
        },

        async createEndpoint(endpointData) {
            return this.request('/mock-endpoints', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': await App.getCSRFToken()
                },
                body: JSON.stringify(endpointData)
            });
        },

        async updateEndpoint(id, endpointData) {
            return this.request(`/mock-endpoints/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': await App.getCSRFToken()
                },
                body: JSON.stringify(endpointData)
            });
        },

        async deleteEndpoint(id) {
            return this.request(`/mock-endpoints/${id}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-Token': await App.getCSRFToken()
                }
            });
        }
    },

    // Initialization
    init() {
        this.loadState();
        this.bindEvents();
        this.updateUI();

        // Load initial data if logged in
        if (this.state.token) {
            this.loadDashboardData();
        }
    },

    // State management
    loadState() {
        const savedToken = localStorage.getItem('mirage_token');
        const savedUser = localStorage.getItem('mirage_user');

        if (savedToken && savedUser) {
            this.state.token = savedToken;
            this.state.user = JSON.parse(savedUser);
        }
    },

    saveState() {
        if (this.state.token && this.state.user) {
            localStorage.setItem('mirage_token', this.state.token);
            localStorage.setItem('mirage_user', JSON.stringify(this.state.user));
        } else {
            localStorage.removeItem('mirage_token');
            localStorage.removeItem('mirage_user');
        }
    },

    clearState() {
        this.state.user = null;
        this.state.token = null;
        this.state.endpoints = [];
        this.saveState();
    },

    // Event binding
    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.dataset.section;
                if (section) {
                    this.showSection(section);
                }
            });
        });

        // Auth buttons
        document.getElementById('loginBtn').addEventListener('click', () => this.showAuthModal('login'));
        document.getElementById('getStartedBtn').addEventListener('click', () => this.showAuthModal('register'));
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        // Auth modal
        this.bindAuthModal();

        // Endpoint management
        this.bindEndpointEvents();

        // API Key management
        this.bindApiKeyEvents();

        // Modal close buttons
        document.querySelectorAll('.modal .close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                modal.classList.remove('show');
            });
        });

        // Close modals when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                }
            });
        });
    },

    bindAuthModal() {
        const authModal = document.getElementById('authModal');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const authTitle = document.getElementById('authTitle');

        // Switch between login/register
        document.getElementById('showRegister').addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
            authTitle.textContent = 'Register';
        });

        document.getElementById('showLogin').addEventListener('click', (e) => {
            e.preventDefault();
            registerForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
            authTitle.textContent = 'Login';
        });

        // Form submissions
        document.getElementById('loginFormElement').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const email = formData.get('email');
            const password = formData.get('password');

            try {
                const response = await this.api.login(email, password);
                this.state.token = response.data.token;
                this.state.user = response.data.user;
                this.saveState();
                authModal.classList.remove('show');
                this.updateUI();
                this.loadDashboardData();
                this.showAlert('Login successful!', 'success');
            } catch (error) {
                // Error is already shown by api.request
            }
        });

        document.getElementById('registerFormElement').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const userData = {
                email: formData.get('email'),
                password: formData.get('password'),
                first_name: formData.get('first_name'),
                last_name: formData.get('last_name')
            };

            try {
                const response = await this.api.register(userData);
                authModal.classList.remove('show');
                this.showAlert('Registration successful! Please check your email for verification.', 'success');
                // Switch to login form
                registerForm.classList.add('hidden');
                loginForm.classList.remove('hidden');
                authTitle.textContent = 'Login';
            } catch (error) {
                // Error is already shown by api.request
            }
        });
    },

    bindEndpointEvents() {
        const addEndpointBtn = document.getElementById('addEndpointBtn');
        const endpointModal = document.getElementById('endpointModal');
        const endpointForm = document.getElementById('endpointForm');
        const cancelEndpoint = document.getElementById('cancelEndpoint');

        addEndpointBtn.addEventListener('click', () => {
            this.showEndpointModal();
        });

        cancelEndpoint.addEventListener('click', () => {
            endpointModal.classList.remove('show');
        });

        endpointForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);

            // Parse JSON fields
            let headers = {};
            let responseBody = {};

            try {
                const headersStr = formData.get('headers');
                if (headersStr.trim()) {
                    headers = JSON.parse(headersStr);
                }
            } catch (error) {
                this.showAlert('Invalid JSON in headers field', 'error');
                return;
            }

            try {
                const responseStr = formData.get('response_body');
                if (responseStr.trim()) {
                    responseBody = JSON.parse(responseStr);
                }
            } catch (error) {
                this.showAlert('Invalid JSON in response body field', 'error');
                return;
            }

            const delayValue = formData.get('delay');
            const delay = delayValue ? Math.max(0, Math.min(10000, parseInt(delayValue, 10) || 0)) : 0;

            const endpointData = {
                name: formData.get('name'),
                method: formData.get('method'),
                url_pattern: formData.get('url_pattern'),
                description: formData.get('description') || '',
                response_status_code: parseInt(formData.get('status_code')) || 200,
                response_delay_ms: delay,
                response_data: responseBody
            };

            try {
                console.log('Endpoint data being sent:', endpointData);
                const endpointId = endpointForm.dataset.endpointId;
                if (endpointId) {
                    await this.api.updateEndpoint(endpointId, endpointData);
                    this.showAlert('Endpoint updated successfully!', 'success');
                } else {
                    await this.api.createEndpoint(endpointData);
                    this.showAlert('Endpoint created successfully!', 'success');
                }

                endpointModal.classList.remove('show');
                this.loadEndpoints();
            } catch (error) {
                // Error is already shown by api.request
            }
        });

        // Filter events
        const filters = ['methodFilter', 'statusFilter', 'searchFilter'];
        filters.forEach(filterId => {
            const element = document.getElementById(filterId);
            element.addEventListener('change', () => this.loadEndpoints());
            if (filterId === 'searchFilter') {
                element.addEventListener('input', this.debounce(() => this.loadEndpoints(), 300));
            }
        });
    },

    bindApiKeyEvents() {
        const addApiKeyBtn = document.getElementById('addApiKeyBtn');
        const apiKeyModal = document.getElementById('apiKeyModal');
        const apiKeyForm = document.getElementById('apiKeyForm');
        const cancelApiKey = document.getElementById('cancelApiKey');

        addApiKeyBtn.addEventListener('click', () => {
            apiKeyModal.classList.add('show');
        });

        cancelApiKey.addEventListener('click', () => {
            apiKeyModal.classList.remove('show');
        });

        apiKeyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);

            const keyData = {
                name: formData.get('name'),
                expires_at: formData.get('expires_at') || undefined
            };

            try {
                const response = await this.api.createApiKey(keyData);
                apiKeyModal.classList.remove('show');

                this.showApiKeyCreatedModal(response.data.key);
                this.loadProfile();
            } catch (error) {
                // Error is already shown by api.request
            }
        });
    },

    showApiKeyCreatedModal(apiKey) {
        // Create a temporary modal to show the newly created API key
        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>API Key Created Successfully</h2>
                    <span class="close">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="api-key-created">
                        <p><strong>Important:</strong> Store this API key safely. It cannot be retrieved again.</p>
                        <div class="api-key-display">
                            <label for="newApiKey">Your API Key:</label>
                            <div class="api-key-copy-container">
                                <input type="text" id="newApiKey" value="${apiKey}" readonly>
                                <button class="btn btn-secondary copy-btn" id="copyApiKeyBtn">Copy</button>
                            </div>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-primary close-modal">I've Saved the Key</button>
                    </div>
                </div>
            </div>
        `;

        // Add event listeners
        const closeButtons = modal.querySelectorAll('.close, .close-modal');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                document.body.removeChild(modal);
            });
        });

        // Add copy button event listener
        const copyBtn = modal.querySelector('#copyApiKeyBtn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                this.copyToClipboard(apiKey);
            });
        }

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });

        document.body.appendChild(modal);
    },

    showDeactivateApiKeyModal(keyId, keyName) {
        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Deactivate API Key</h2>
                    <span class="close">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="warning-message">
                        <p><strong>⚠️ Warning:</strong> You are about to deactivate the API key "${keyName}".</p>
                        <p><strong>This action cannot be undone.</strong> Once deactivated, this API key will no longer work and cannot be reactivated.</p>
                        <p>Are you sure you want to continue?</p>
                    </div>
                </div>
                <div class="form-actions modal-buttons">
                    <button type="button" class="btn btn-secondary cancel-deactivate">Cancel</button>
                    <button type="button" class="btn btn-danger confirm-deactivate">Deactivate</button>
                </div>
            </div>
        `;

        // Add event listeners
        const closeButtons = modal.querySelectorAll('.close, .cancel-deactivate');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                document.body.removeChild(modal);
            });
        });

        const confirmBtn = modal.querySelector('.confirm-deactivate');
        confirmBtn.addEventListener('click', async () => {
            try {
                await this.api.deactivateApiKey(keyId);
                this.showAlert('API key deactivated successfully', 'success');
                document.body.removeChild(modal);
                this.loadProfile();
            } catch (error) {
                // Error is already shown by api.request
            }
        });

        // Click outside modal to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });

        document.body.appendChild(modal);
    },

    copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                this.showAlert('API key copied to clipboard!', 'success');
            }).catch(() => {
                this.fallbackCopyToClipboard(text);
            });
        } else {
            this.fallbackCopyToClipboard(text);
        }
    },

    fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                this.showAlert('API key copied to clipboard!', 'success');
            } else {
                this.showAlert('Failed to copy API key', 'error');
            }
        } catch (err) {
            this.showAlert('Failed to copy API key', 'error');
        }
        document.body.removeChild(textArea);
    },

    // UI Methods
    updateUI() {
        const isLoggedIn = !!this.state.token;
        const authNav = document.getElementById('authenticatedNav');
        const unauthNav = document.getElementById('unauthenticatedNav');
        const welcomeSection = document.getElementById('welcomeSection');
        const adminNavItem = document.getElementById('adminNavItem');

        if (isLoggedIn) {
            authNav.style.display = 'flex';
            unauthNav.style.display = 'none';
            welcomeSection.classList.add('hidden');

            // Show admin navigation if user is admin
            if (adminNavItem && this.state.user && (this.state.user.role === 'admin' || this.state.user.email === 'shvetamkumargumber@gmail.com')) {
                adminNavItem.style.display = 'block';
            } else if (adminNavItem) {
                adminNavItem.style.display = 'none';
            }

            this.showSection(this.state.currentSection);
        } else {
            authNav.style.display = 'none';
            unauthNav.style.display = 'block';
            welcomeSection.classList.remove('hidden');
            if (adminNavItem) {
                adminNavItem.style.display = 'none';
            }
            this.hideAllSections();
        }
    },

    showSection(sectionName) {
        this.state.currentSection = sectionName;

        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.section === sectionName) {
                link.classList.add('active');
            }
        });

        // Show/hide sections
        this.hideAllSections();
        const section = document.getElementById(`${sectionName}Section`);
        if (section) {
            section.classList.remove('hidden');
        }

        // Load section data
        switch (sectionName) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'endpoints':
                this.loadEndpoints();
                break;
            case 'profile':
                this.loadProfile();
                break;
            case 'admin':
                this.loadAdminDashboard();
                break;
        }
    },

    hideAllSections() {
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.add('hidden');
        });
    },

    showAuthModal(mode = 'login') {
        const modal = document.getElementById('authModal');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const authTitle = document.getElementById('authTitle');

        if (mode === 'login') {
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
            authTitle.textContent = 'Login';
        } else {
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
            authTitle.textContent = 'Register';
        }

        modal.classList.add('show');
    },

    showEndpointModal(endpoint = null) {
        const modal = document.getElementById('endpointModal');
        const form = document.getElementById('endpointForm');
        const title = document.getElementById('endpointModalTitle');

        if (endpoint) {
            title.textContent = 'Edit Endpoint';
            form.dataset.endpointId = endpoint.id;

            // Populate form
            document.getElementById('endpointName').value = endpoint.name;
            document.getElementById('endpointMethod').value = endpoint.method;
            document.getElementById('endpointUrl').value = endpoint.url_pattern;
            document.getElementById('endpointDescription').value = endpoint.description || '';
            document.getElementById('endpointStatus').value = endpoint.response_status_code || endpoint.status_code;
            document.getElementById('endpointDelay').value = endpoint.response_delay_ms || endpoint.delay || 0;
            document.getElementById('endpointHeaders').value = JSON.stringify(endpoint.headers || {}, null, 2);
            document.getElementById('endpointResponse').value = JSON.stringify(endpoint.response_data || endpoint.response_body || {}, null, 2);
        } else {
            title.textContent = 'Add Endpoint';
            form.dataset.endpointId = '';
            form.reset();
            document.getElementById('endpointHeaders').value = '{"Content-Type": "application/json"}';
            document.getElementById('endpointResponse').value = '{"message": "Hello World"}';
        }

        modal.classList.add('show');
    },

    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (show) {
            spinner.classList.remove('hidden');
        } else {
            spinner.classList.add('hidden');
        }
    },

    showAlert(message, type = 'info') {
        const container = document.getElementById('alertContainer');
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;

        container.appendChild(alert);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 5000);
    },

    // Data loading methods
    async loadDashboardData() {
        try {
            const response = await this.api.getDashboard();
            const data = response.data;

            // Update stats
            document.getElementById('totalEndpoints').textContent = data.usage_stats?.current_period_endpoints || 0;
            document.getElementById('activeEndpoints').textContent = data.usage_stats?.current_period_endpoints || 0;
            document.getElementById('totalRequests').textContent = data.usage_stats?.current_period_requests || 0;

            // Update recent activity
            const activityList = document.getElementById('recentActivityList');
            if (data.recent_usage && data.recent_usage.length > 0) {
                activityList.innerHTML = data.recent_usage.map(activity => {
                    const statusClass = activity.response_status_code >= 400 ? 'error' :
                                       activity.response_status_code >= 300 ? 'warning' : 'success';
                    const processingTime = activity.processing_time_ms ? `${activity.processing_time_ms}ms` : 'N/A';
                    const statusText = this.getStatusText(activity.response_status_code);
                    const timeAgo = this.getTimeAgo(activity.created_at);
                    const endpointName = activity.endpoint_name || 'Unnamed Endpoint';
                    const endpointInfo = activity.endpoint_name ? ` (${endpointName})` : '';

                    return `
                        <div class="activity-item">
                            <div class="activity-header">
                                <span class="method-badge method-${activity.method}">${activity.method || 'Unknown'}</span>
                                <span class="url-pattern">${activity.url_pattern || 'Unknown'}${endpointInfo}</span>
                                <span class="status-badge status-${statusClass}">${activity.response_status_code || 'N/A'}</span>
                            </div>
                            <div class="activity-details">
                                <span class="processing-time">⏱️ ${processingTime}</span>
                                <span class="status-text">📊 ${statusText}</span>
                                <span class="activity-time">🕒 ${timeAgo}</span>
                                <span class="activity-date">📅 ${activity.created_at ? new Date(activity.created_at).toLocaleDateString() : 'Unknown date'}</span>
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                activityList.innerHTML = '<div class="activity-item">No recent activity</div>';
            }
        } catch (error) {
            // Error is already shown by api.request
        }
    },

    async loadEndpoints() {
        try {
            const query = {
                method: document.getElementById('methodFilter').value,
                is_active: document.getElementById('statusFilter').value,
                search: document.getElementById('searchFilter').value
            };

            const response = await this.api.getEndpoints(query);
            console.log('API Response:', response); // Debug log
            this.state.endpoints = response.endpoints || response.data || [];
            console.log('Endpoints loaded:', this.state.endpoints); // Debug log
            this.renderEndpoints();
        } catch (error) {
            console.error('Error loading endpoints:', error);
            // Error is already shown by api.request
        }
    },

    renderEndpoints() {
        const container = document.getElementById('endpointsList');
        if (!container) {
            console.warn('endpointsList container not found');
            return;
        }

        if (this.state.endpoints.length === 0) {
            container.innerHTML = `
                <div class="endpoint-card">
                    <p>No endpoints found. <a href="#" id="createFirstEndpoint">Create your first endpoint</a></p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.state.endpoints.map(endpoint => `
            <div class="endpoint-card">
                <div class="endpoint-status ${endpoint.is_active ? 'status-active' : 'status-inactive'}">
                    ${endpoint.is_active ? 'Active' : 'Inactive'}
                </div>
                <div class="endpoint-header">
                    <div class="endpoint-info">
                        <h3>${endpoint.name}</h3>
                        <div class="method-url">
                            <span class="method-badge method-${endpoint.method}">${endpoint.method}</span>
                            <span class="endpoint-url">${endpoint.url_pattern}</span>
                        </div>
                        ${endpoint.description ? `<div class="endpoint-description">${endpoint.description}</div>` : ''}
                    </div>
                    <div class="endpoint-actions">
                        <button class="btn btn-secondary" data-action="edit" data-endpoint-id="${endpoint.id}">Edit</button>
                        ${endpoint.is_active ?
                            `<button class="btn btn-danger" data-action="delete" data-endpoint-id="${endpoint.id}">Delete</button>` :
                            `<button class="btn btn-success" data-action="activate" data-endpoint-id="${endpoint.id}">Activate</button>`
                        }
                    </div>
                </div>
            </div>
        `).join('');

        // Add event listeners for endpoint action buttons
        this.bindEndpointActionEvents();
    },

    bindEndpointActionEvents() {
        const container = document.getElementById('endpointsList');
        if (!container) {
            console.warn('endpointsList container not found');
            return;
        }

        // Handle endpoint action buttons
        const actionButtons = container.querySelectorAll('[data-action]');
        actionButtons.forEach(button => {
            button.addEventListener('click', this.handleEndpointAction.bind(this));
        });

        // Handle "create first endpoint" link
        const createFirstLink = container.querySelector('#createFirstEndpoint');
        if (createFirstLink) {
            createFirstLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showEndpointModal();
            });
        }
    },

    handleEndpointAction(e) {
        const button = e.target;
        const action = button.dataset.action;
        const endpointId = button.dataset.endpointId;

        if (action === 'edit') {
            this.editEndpoint(endpointId);
        } else if (action === 'delete') {
            this.deleteEndpoint(endpointId);
        } else if (action === 'activate') {
            this.activateEndpoint(endpointId);
        }
    },

    async loadProfile() {
        try {
            const response = await this.api.getDashboard();
            const data = response.data;

            // Update profile info
            const profileContainer = document.getElementById('userProfile');
            const subscription = data.subscription;
            const usageStats = data.usage_stats;

            profileContainer.innerHTML = `
                <div class="profile-section">
                    <h3>Account Information</h3>
                    <div class="profile-field">
                        <span class="label">Email:</span>
                        <span class="value">${data.user.email}</span>
                    </div>
                    <div class="profile-field">
                        <span class="label">Name:</span>
                        <span class="value">${data.user.first_name || ''} ${data.user.last_name || ''}</span>
                    </div>
                    <div class="profile-field">
                        <span class="label">Verified:</span>
                        <span class="value">${data.user.is_verified ? 'Yes' : 'No'}</span>
                    </div>
                    <div class="profile-field">
                        <span class="label">Member since:</span>
                        <span class="value">${new Date(data.user.created_at).toLocaleDateString()}</span>
                    </div>
                </div>

                <div class="profile-section">
                    <h3>Subscription Plan</h3>
                    <div class="subscription-card ${subscription?.plan?.name?.toLowerCase() || 'free'}">
                        <div class="plan-header">
                            <h4>${subscription?.plan?.name || 'Free'} Plan</h4>
                            <span class="plan-price">${subscription?.plan?.price_monthly ? '$' + subscription.plan.price_monthly + '/mo' : 'Free'}</span>
                        </div>
                        <div class="plan-description">
                            ${subscription?.plan?.description || 'Basic plan with limited features'}
                        </div>

                        <div class="usage-limits">
                            <h5>Usage Limits & Current Usage</h5>

                            <div class="limit-item">
                                <div class="limit-header">
                                    <span class="limit-name">Monthly Requests</span>
                                    <span class="limit-usage">${usageStats?.current_period_requests || 0} / ${usageStats?.max_requests || 10}</span>
                                </div>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${Math.min(100, ((usageStats?.current_period_requests || 0) / (usageStats?.max_requests || 10)) * 100)}%"></div>
                                </div>
                                <div class="remaining">${usageStats?.requests_remaining || 0} remaining</div>
                            </div>

                            <div class="limit-item">
                                <div class="limit-header">
                                    <span class="limit-name">Active Endpoints</span>
                                    <span class="limit-usage">${usageStats?.current_period_endpoints || 0} / ${usageStats?.max_endpoints || 10}</span>
                                </div>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${Math.min(100, ((usageStats?.current_period_endpoints || 0) / (usageStats?.max_endpoints || 10)) * 100)}%"></div>
                                </div>
                                <div class="remaining">${usageStats?.endpoints_remaining || 0} remaining</div>
                            </div>
                        </div>

                        ${subscription?.plan?.features && subscription.plan.features.length > 0 ? `
                            <div class="plan-features">
                                <h5>Plan Features</h5>
                                <ul>
                                    ${subscription.plan.features.map(feature => `<li>✓ ${feature}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}

                        <div class="plan-period">
                            ${subscription ? `
                                <div class="profile-field">
                                    <span class="label">Started:</span>
                                    <span class="value">${new Date(subscription.started_at).toLocaleDateString()}</span>
                                </div>
                                ${subscription.expires_at ? `
                                    <div class="profile-field">
                                        <span class="label">Expires:</span>
                                        <span class="value">${new Date(subscription.expires_at).toLocaleDateString()}</span>
                                    </div>
                                ` : ''}
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;

            // Update API keys
            const apiKeysContainer = document.getElementById('apiKeysList');
            if (data.api_keys && data.api_keys.length > 0) {
                apiKeysContainer.innerHTML = data.api_keys.map(key => {
                    return `
                        <div class="api-key-item">
                            <div class="api-key-info">
                                <h4>${key.name}</h4>
                                <p>Key: <span class="api-key-prefix">${key.key_prefix}...</span>
                                   <small class="key-hidden-note">(Hidden for security)</small>
                                </p>
                                <p>Created: ${new Date(key.created_at).toLocaleDateString()}</p>
                                ${key.expires_at ? `<p>Expires: ${new Date(key.expires_at).toLocaleDateString()}</p>` : ''}
                                ${key.last_used_at ? `<p>Last used: ${new Date(key.last_used_at).toLocaleDateString()}</p>` : '<p>Never used</p>'}
                            </div>
                            <div class="api-key-actions">
                                <span class="${key.is_active ? 'status-active' : 'status-inactive'}">${key.is_active ? 'Active' : 'Inactive'}</span>
                                ${key.is_active ? `
                                    <button class="btn btn-danger btn-sm deactivate-api-key" data-key-id="${key.id}" data-key-name="${key.name}">
                                        Deactivate
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                apiKeysContainer.innerHTML = '<p>No API keys created yet.</p>';
            }

            // Add event listeners for deactivate buttons
            const deactivateButtons = document.querySelectorAll('.deactivate-api-key');
            deactivateButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const keyId = e.target.getAttribute('data-key-id');
                    const keyName = e.target.getAttribute('data-key-name');
                    this.showDeactivateApiKeyModal(keyId, keyName);
                });
            });
        } catch (error) {
            // Error is already shown by api.request
        }
    },

    // Endpoint actions
    async editEndpoint(id) {
        console.log('Edit endpoint clicked, ID:', id);
        try {
            const response = await this.api.getEndpoint(id);
            console.log('Endpoint data received:', response);
            this.showEndpointModal(response.data || response);
        } catch (error) {
            console.error('Error editing endpoint:', error);
        }
    },

    async deleteEndpoint(id) {
        console.log('Delete endpoint clicked, ID:', id);
        if (!confirm('Are you sure you want to deactivate this endpoint?')) {
            return;
        }

        try {
            await this.api.deleteEndpoint(id);
            this.showAlert('Endpoint deactivated successfully!', 'success');
            this.loadEndpoints();
        } catch (error) {
            console.error('Error deleting endpoint:', error);
        }
    },

    async activateEndpoint(id) {
        console.log('Activate endpoint clicked, ID:', id);
        if (!confirm('Are you sure you want to activate this endpoint?')) {
            return;
        }

        try {
            await this.api.updateEndpoint(id, { is_active: true });
            this.showAlert('Endpoint activated successfully!', 'success');
            this.loadEndpoints();
        } catch (error) {
            console.error('Error activating endpoint:', error);
        }
    },

    // Utility methods
    getStatusText(statusCode) {
        if (!statusCode) return 'Unknown';
        if (statusCode >= 200 && statusCode < 300) return 'Success';
        if (statusCode >= 300 && statusCode < 400) return 'Redirect';
        if (statusCode >= 400 && statusCode < 500) return 'Client Error';
        if (statusCode >= 500) return 'Server Error';
        return 'Unknown';
    },

    getTimeAgo(dateString) {
        if (!dateString) return 'Unknown time';

        const now = new Date();
        const date = new Date(dateString);
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    },

    logout() {
        this.clearState();
        this.updateUI();
        this.showAlert('Logged out successfully!', 'success');
    },

    // Admin Functions
    async loadAdminDashboard() {
        try {
            const response = await this.api.request('/admin/dashboard');
            const data = response.data;

            // Update admin stats
            document.getElementById('adminTotalUsers').textContent = data.system_stats.users.total_users || '0';
            document.getElementById('adminActiveUsers').textContent = data.system_stats.users.active_users || '0';
            document.getElementById('adminTotalApiKeys').textContent = data.system_stats.api_keys.total_api_keys || '0';
            document.getElementById('adminMonthlyRequests').textContent = data.system_stats.usage.total_requests_this_month || '0';

            // Initialize admin tabs
            this.initAdminTabs();
            this.loadAdminUsers();
        } catch (error) {
            console.error('Error loading admin dashboard:', error);
        }
    },

    initAdminTabs() {
        // Tab switching logic
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;

                // Update active tab button
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                // Show/hide tab content
                document.querySelectorAll('.admin-tab-content').forEach(content => {
                    content.classList.add('hidden');
                });
                document.getElementById(`${tabName}Tab`).classList.remove('hidden');

                // Load tab data
                switch(tabName) {
                    case 'users':
                        this.loadAdminUsers();
                        break;
                    case 'subscriptions':
                        this.loadAdminSubscriptions();
                        break;
                    case 'apikeys':
                        this.loadAdminApiKeys();
                        break;
                    case 'stats':
                        this.loadAdminStats();
                        break;
                }
            });
        });

        // Admin button event delegation
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('admin-view-user')) {
                const userId = e.target.dataset.userId;
                this.viewUserDetails(userId);
            } else if (e.target.classList.contains('admin-toggle-role')) {
                const userId = e.target.dataset.userId;
                const userRole = e.target.dataset.userRole;
                this.toggleUserRole(userId, userRole);
            } else if (e.target.classList.contains('admin-edit-plan')) {
                const planId = e.target.dataset.planId;
                this.editSubscriptionPlan(planId);
            } else if (e.target.classList.contains('admin-deactivate-key')) {
                const keyId = e.target.dataset.keyId;
                this.deactivateApiKey(keyId);
            }
        });
    },

    async loadAdminUsers() {
        try {
            const response = await this.api.request('/admin/users');
            const users = response.data.users;

            const tbody = document.querySelector('#adminUsersTable tbody');
            tbody.innerHTML = '';

            users.forEach(user => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${user.email}</td>
                    <td>${user.first_name || ''} ${user.last_name || ''}</td>
                    <td><span class="badge ${user.role === 'admin' ? 'badge-admin' : 'badge-user'}">${user.role}</span></td>
                    <td><span class="badge ${user.is_active ? 'badge-active' : 'badge-inactive'}">${user.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>${new Date(user.created_at).toLocaleDateString()}</td>
                    <td>
                        <button class="btn btn-sm btn-secondary admin-view-user" data-user-id="${user.id}">View</button>
                        <button class="btn btn-sm ${user.role === 'admin' ? 'btn-warning' : 'btn-primary'} admin-toggle-role"
                                data-user-id="${user.id}" data-user-role="${user.role}">
                            ${user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        } catch (error) {
            console.error('Error loading admin users:', error);
        }
    },

    async loadAdminSubscriptions() {
        try {
            const response = await this.api.request('/admin/subscription-plans');
            const plans = response.data.plans;

            const tbody = document.querySelector('#adminPlansTable tbody');
            tbody.innerHTML = '';

            plans.forEach(plan => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${plan.name}</td>
                    <td>$${plan.price_monthly}</td>
                    <td>$${plan.price_yearly}</td>
                    <td>${plan.max_endpoints}</td>
                    <td>${plan.max_requests_per_month.toLocaleString()}</td>
                    <td>${plan.active_subscriptions || 0}</td>
                    <td>
                        <button class="btn btn-sm btn-secondary admin-edit-plan" data-plan-id="${plan.id}">Edit</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        } catch (error) {
            console.error('Error loading admin subscriptions:', error);
        }
    },

    async loadAdminApiKeys() {
        try {
            const response = await this.api.request('/admin/api-keys');
            const apiKeys = response.data.api_keys;

            const tbody = document.querySelector('#adminApiKeysTable tbody');
            tbody.innerHTML = '';

            apiKeys.forEach(key => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${key.user_email}</td>
                    <td>${key.name}</td>
                    <td>${new Date(key.created_at).toLocaleDateString()}</td>
                    <td>${key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}</td>
                    <td><span class="badge ${key.is_active ? 'badge-active' : 'badge-inactive'}">${key.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                        ${key.is_active ? `<button class="btn btn-sm btn-danger admin-deactivate-key" data-key-id="${key.id}">Deactivate</button>` : ''}
                    </td>
                `;
                tbody.appendChild(row);
            });
        } catch (error) {
            console.error('Error loading admin API keys:', error);
        }
    },

    async loadAdminStats() {
        // This would load detailed statistics - for now just show placeholder
        document.getElementById('userStatsContent').innerHTML = '<p>Detailed user statistics will be displayed here</p>';
        document.getElementById('subscriptionStatsContent').innerHTML = '<p>Subscription analytics will be displayed here</p>';
        document.getElementById('usageStatsContent').innerHTML = '<p>Usage metrics will be displayed here</p>';
        document.getElementById('recentActivityContent').innerHTML = '<p>Recent system activity will be displayed here</p>';
    },

    async toggleUserRole(userId, currentRole) {
        try {
            const newRole = currentRole === 'admin' ? 'user' : 'admin';
            await this.api.request(`/admin/users/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': await this.getCSRFToken()
                },
                body: JSON.stringify({ role: newRole })
            });
            this.showAlert(`User role updated to ${newRole}`, 'success');
            this.loadAdminUsers();
        } catch (error) {
            console.error('Error updating user role:', error);
        }
    },

    async deactivateApiKey(keyId) {
        if (!confirm('Are you sure you want to deactivate this API key?')) return;

        try {
            await this.api.request(`/admin/api-keys/${keyId}`, {
                method: 'DELETE',
                headers: { 'X-CSRF-Token': await this.getCSRFToken() }
            });
            this.showAlert('API key deactivated', 'success');
            this.loadAdminApiKeys();
        } catch (error) {
            console.error('Error deactivating API key:', error);
        }
    },

    async viewUserDetails(userId) {
        // This would open a modal with detailed user information
        this.showAlert('User details functionality to be implemented', 'info');
    },

    async editSubscriptionPlan(planId) {
        // This would open a modal for editing subscription plans
        this.showAlert('Edit subscription plan functionality to be implemented', 'info');
    },

    async getCSRFToken() {
        try {
            // Check if we have a cached token that's still valid (cache for 10 minutes)
            const now = Date.now();
            if (this.csrfToken && this.csrfTokenExpiry && now < this.csrfTokenExpiry) {
                return this.csrfToken;
            }

            // Fetch a new CSRF token
            const response = await fetch('/api/v1/auth/csrf-token', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch CSRF token');
            }

            const data = await response.json();

            // Cache the token for 10 minutes
            this.csrfToken = data.csrfToken;
            this.csrfTokenExpiry = now + (10 * 60 * 1000); // 10 minutes

            return this.csrfToken;
        } catch (error) {
            console.error('Error fetching CSRF token:', error);
            return '';
        }
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// Make App globally available for onclick handlers
window.App = App;

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});