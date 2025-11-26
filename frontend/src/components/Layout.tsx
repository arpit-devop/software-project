/**
 * Layout Component
 * Clean and minimal layout with sidebar navigation and header
 * Features:
 * - Collapsible sidebar with smooth slide animation
 * - Clean navbar with user menu and notifications
 * - Persistent sidebar state using localStorage
 * - Minimalist design with clean spacing and typography
 */

import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Pill,
  FileText,
  ShoppingCart,
  BarChart3,
  MessageSquare,
  LogOut,
  Menu,
  ChevronLeft,
  User,
  Settings,
  X,
  Mail,
  Shield,
  Key,
  Search,
  Send,
  Bot,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatbotService } from '../services/api';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  /**
   * Initialize sidebar state from localStorage or default to true (open) on desktop
   * On mobile, default to false (closed)
   */
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen');
    if (saved !== null) {
      return saved === 'true';
    }
    // Default: open on desktop, closed on mobile
    return window.innerWidth >= 1024;
  });

  /**
   * State for dropdown menus
   */
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  /**
   * Refs for dropdown containers to handle click outside
   */
  const profileRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  /**
   * Persist sidebar state to localStorage whenever it changes
   */
  useEffect(() => {
    localStorage.setItem('sidebarOpen', sidebarOpen.toString());
  }, [sidebarOpen]);

  /**
   * Handle window resize to adjust sidebar state
   * On mobile, close sidebar when window is resized to mobile size
   */
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        // On mobile, ensure sidebar is closed
        if (sidebarOpen) {
          setSidebarOpen(false);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  /**
   * Close dropdowns when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Medicines', href: '/medicines', icon: Pill },
    { name: 'Prescriptions', href: '/prescriptions', icon: FileText },
    { name: 'Reorder Requests', href: '/reorders', icon: ShoppingCart },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  ];

  /**
   * Check if a navigation item is currently active
   */
  const isActive = (href: string) => location.pathname === href;

  /**
   * Toggle sidebar open/closed state
   */
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  /**
   * Get current page title based on route
   */
  const getPageTitle = () => {
    const route = location.pathname.split('/')[1] || 'dashboard';
    return route.charAt(0).toUpperCase() + route.slice(1);
  };

  /**
   * Handle global search
   */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to medicines page with search query
      navigate(`/medicines?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setSearchOpen(false);
    }
  };

  /**
   * Chat popup state and handlers - Enhanced with better error handling
   */
  const [chatMessages, setChatMessages] = useState<Array<{ type: 'user' | 'bot'; content: string; timestamp: Date }>>([
    {
      type: 'bot',
      content: 'Hello! I can help you with medicine availability, alternatives, and usage information. How can I assist you today?',
      timestamp: new Date(),
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  /**
   * Scroll chat to bottom when new messages arrive
   */
  useEffect(() => {
    if (chatOpen && chatMessagesEndRef.current) {
      setTimeout(() => {
        chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
    }
  }, [chatMessages, chatOpen, chatLoading]);

  /**
   * Auto-focus input when chat opens
   */
  useEffect(() => {
    if (chatOpen && chatInputRef.current) {
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 300);
    }
  }, [chatOpen]);

  /**
   * Handle chat message send - Enhanced with better error handling and retry
   */
  const handleChatSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = {
      type: 'user' as const,
      content: chatInput.trim(),
      timestamp: new Date(),
    };

    const queryText = chatInput.trim();
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);
    setChatError(null);

    try {
      // Call chatbot API
      const response = await chatbotService.chat(queryText);
      
      // Handle different response structures
      let botResponse = '';
      
      if (response?.data?.data?.response) {
        // Standard response structure
        botResponse = response.data.data.response;
      } else if (response?.data?.response) {
        // Alternative response structure
        botResponse = response.data.response;
      } else if (typeof response?.data === 'string') {
        // Direct string response
        botResponse = response.data;
      } else {
        throw new Error('Invalid response format from server');
      }

      if (botResponse && botResponse.trim()) {
        const botMessage = {
          type: 'bot' as const,
          content: botResponse.trim(),
          timestamp: new Date(),
        };
        setChatMessages((prev) => [...prev, botMessage]);
      } else {
        throw new Error('Empty response from server');
      }
    } catch (error: any) {
      console.error('Chatbot error:', error);
      
      // Detailed error handling
      let errorMessage = 'Sorry, I encountered an error. Please try again.';
      
      if (error.response) {
        // Server responded with error
        if (error.response.status === 401) {
          errorMessage = 'Please log in to use the chatbot.';
        } else if (error.response.status === 403) {
          errorMessage = 'You do not have permission to use the chatbot.';
        } else if (error.response.status === 429) {
          errorMessage = 'Too many requests. Please wait a moment and try again.';
        } else if (error.response.status >= 500) {
          errorMessage = 'Server error. Please try again in a moment.';
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        // Request was made but no response
        errorMessage = 'Unable to connect to the server. Please check your internet connection.';
      } else {
        // Something else happened
        errorMessage = error.message || 'An unexpected error occurred.';
      }

      const errorBotMessage = {
        type: 'bot' as const,
        content: errorMessage,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, errorBotMessage]);
      setChatError(errorMessage);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop - only show on mobile when sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - clean and minimal design */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full relative">
          {/* Navigation - clean and minimal */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => {
                    // Close sidebar on mobile when navigating
                    if (window.innerWidth < 1024) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={`flex items-center px-3 py-2.5 rounded-md text-sm transition-all ${
                    isActive(item.href)
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-3 flex-shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Bottom section - Settings and Logout */}
          <div className="px-4 py-4 border-t border-gray-200 space-y-1">
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className="flex items-center w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
              title="Settings"
            >
              <Settings className="h-4 w-4 mr-3 flex-shrink-0" />
              <span>Settings & Admin</span>
            </button>
            <button
              onClick={logout}
              className="flex items-center w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
            >
              <LogOut className="h-4 w-4 mr-3 flex-shrink-0" />
              <span>Logout</span>
            </button>
          </div>

          {/* Subtle toggle button at bottom right of sidebar */}
          <div className="absolute bottom-4 right-4">
            <button
              onClick={toggleSidebar}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-all"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content - adjust padding based on sidebar state */}
      <div className={`transition-all duration-300 ${
        sidebarOpen ? 'lg:pl-64' : 'lg:pl-0'
      }`}>
        {/* Gradient Background */}
        <div className="h-2 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600"></div>
        
        {/* Clean Navbar with Search */}
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between h-16 px-6">
            {/* Left section: Menu button and Logo */}
            <div className="flex items-center space-x-4">
              {!sidebarOpen && (
                <button
                  onClick={toggleSidebar}
                  className="text-gray-600 hover:text-gray-900 transition-colors p-1.5 rounded-md hover:bg-gray-100"
                  aria-label="Open sidebar"
                >
                  <Menu className="h-5 w-5" />
                </button>
              )}
              <h1 className="text-lg font-bold text-primary-600 logo-font">
                Pharmaventory
              </h1>
            </div>

            {/* Center section: Global Search */}
            <div className="flex-1 max-w-2xl mx-8">
              <form onSubmit={handleSearch} className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchOpen(true)}
                    placeholder="Search medicines, prescriptions..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors"
                  />
                </div>
              </form>
            </div>

            {/* Right section: Admin and Profile */}
            <div className="flex items-center space-x-4">
              {/* Admin Role */}
              <h2 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">
                {user?.role || 'User'}
              </h2>

              {/* Profile Dropdown */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => {
                    setProfileOpen(!profileOpen);
                  }}
                  className="h-9 w-9 rounded-lg bg-primary-600 hover:bg-primary-700 flex items-center justify-center transition-colors shadow-sm"
                >
                  <User className="h-5 w-5 text-white" />
                </button>

                {/* Profile Dropdown Menu */}
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                      <p className="text-xs text-gray-500 capitalize mt-1">{user?.email}</p>
                      <p className="text-xs text-gray-500 capitalize mt-1">Role: {user?.role}</p>
                    </div>
                    <div className="py-2">
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          setSettingsOpen(true);
                        }}
                        className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Settings className="h-4 w-4 mr-3 text-gray-400" />
                        Settings
                      </button>
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Settings className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Settings & Admin</h2>
                  <p className="text-sm text-gray-500">Manage your account settings</p>
                </div>
              </div>
              <button
                onClick={() => setSettingsOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* User Info Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Account Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                      <p className="text-xs text-gray-500">Full Name</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                      <p className="text-xs text-gray-500">Email Address</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Shield className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 capitalize">{user?.role}</p>
                      <p className="text-xs text-gray-500">User Role</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Section */}
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Actions</h3>
                <div className="space-y-2">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <div className="flex items-center">
                      <Key className="h-4 w-4 mr-3 text-gray-400" />
                      <span>Change Password</span>
                    </div>
                    <span className="text-xs text-gray-400">Coming soon</span>
                  </button>
                  {user?.role === 'admin' && (
                    <button
                      className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center">
                        <Shield className="h-4 w-4 mr-3 text-gray-400" />
                        <span>Admin Panel</span>
                      </div>
                      <span className="text-xs text-gray-400">Coming soon</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSettingsOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Chatbot Button and Popup - Bottom Right - BEST VERSION */}
      <div className="fixed bottom-6 right-6 z-50" style={{ right: '1.5rem', bottom: '1.5rem', left: 'auto' }}>
        {/* Chat Popup - Enhanced UI */}
        {chatOpen && (
          <div className="mb-4 w-96 max-w-[calc(100vw-3rem)] h-[500px] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-scale-up">
            {/* Chat Header - Enhanced */}
            <div className="px-4 py-3 bg-gradient-to-r from-green-500 via-green-600 to-green-700 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-white/20 rounded-lg">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">AI Chatbot</h3>
                  <p className="text-xs text-green-100">Always here to help</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setChatOpen(false);
                  setChatError(null);
                }}
                className="text-white hover:bg-white/20 p-1.5 rounded transition-colors"
                aria-label="Close chat"
                title="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages - Enhanced with better styling */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
              {chatMessages.length === 0 && (
                <div className="text-center py-8">
                  <Bot className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500">Start a conversation!</p>
                </div>
              )}
              {chatMessages.map((message, index) => (
                <div
                  key={index}
                  className={`flex items-start space-x-3 ${
                    message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.type === 'user'
                        ? 'bg-primary-600 text-white shadow-md'
                        : 'bg-green-100 text-green-700 border-2 border-green-200'
                    }`}
                  >
                    {message.type === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`rounded-2xl px-4 py-2.5 ${
                        message.type === 'user'
                          ? 'bg-primary-600 text-white shadow-md'
                          : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      <p
                        className={`text-xs mt-1.5 ${
                          message.type === 'user' ? 'text-primary-100' : 'text-gray-400'
                        }`}
                      >
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Loading Indicator - Enhanced */}
              {chatLoading && (
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 text-green-700 border-2 border-green-200 flex items-center justify-center">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="flex-1 rounded-2xl px-4 py-3 bg-white border border-gray-200 shadow-sm">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">Thinking</span>
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Error Display */}
              {chatError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs text-red-700">{chatError}</p>
                </div>
              )}
              
              <div ref={chatMessagesEndRef} />
            </div>

            {/* Input - Enhanced */}
            <form onSubmit={handleChatSend} className="border-t border-gray-200 p-4 bg-white">
              <div className="flex space-x-2">
                <input
                  ref={chatInputRef}
                  type="text"
                  value={chatInput}
                  onChange={(e) => {
                    setChatInput(e.target.value);
                    setChatError(null);
                  }}
                  placeholder="Ask about medicine availability, alternatives, or usage..."
                  className="flex-1 px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  disabled={chatLoading}
                  maxLength={500}
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center justify-center"
                  title="Send message"
                >
                  {chatLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
              {chatInput.length > 0 && (
                <p className="text-xs text-gray-400 mt-1.5 text-right">
                  {chatInput.length}/500
                </p>
              )}
            </form>
          </div>
        )}

        {/* Chatbot Toggle Button - Enhanced */}
        <button
          onClick={() => {
            setChatOpen(!chatOpen);
            setChatError(null);
          }}
          className={`rounded-full bg-gradient-to-br from-green-400 via-green-500 to-green-600 hover:from-green-500 hover:via-green-600 hover:to-green-700 flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 ${
            chatOpen ? 'h-10 w-10' : 'h-14 w-14'
          } ${!chatOpen ? 'animate-pulse' : ''}`}
          style={{
            boxShadow: chatOpen 
              ? '0 0 15px rgba(34, 197, 94, 0.5)' 
              : '0 0 25px rgba(34, 197, 94, 0.7), 0 0 50px rgba(34, 197, 94, 0.5)',
          }}
          aria-label={chatOpen ? 'Close Chatbot' : 'Open Chatbot'}
          title={chatOpen ? 'Close Chat' : 'Open AI Chatbot'}
        >
          {chatOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <MessageSquare className="h-6 w-6" />
          )}
        </button>
      </div>
    </div>
  );
};

export default Layout;

