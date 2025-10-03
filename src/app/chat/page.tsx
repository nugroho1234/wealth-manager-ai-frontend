'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import { apiClient } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Product {
  insurance_id: string;
  insurance_name: string;
  provider: string;
  category: string;
  key_features: string;
  created_at: string;
}

// Updated to match backend API
interface ChatMessage {
  message_id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  sequence_number: number;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'deleted';
  metadata?: Record<string, any>;
}

interface ChatSession {
  session_id: string;
  user_id: string;
  insurance_id: string;
  session_name: string;
  status: 'active' | 'archived' | 'deleted';
  created_at: string;
  updated_at: string;
  last_message_at: string;
  message_count: number;
  session_metadata?: Record<string, any>;
}

interface ChatSessionWithDetails extends ChatSession {
  insurance_title?: string;
  insurance_company?: string;
  insurance_product_type?: string;
  activity_status?: 'recent' | 'today' | 'this_week' | 'older';
}

// API Response types
interface CreateSessionResponse {
  success: boolean;
  session: ChatSession;
  first_message?: ChatMessage;
  message: string;
}

interface ListSessionsResponse {
  success: boolean;
  sessions: ChatSessionWithDetails[];
  total_count: number;
  active_count: number;
  archived_count: number;
}

interface SendMessageResponse {
  success: boolean;
  user_message: ChatMessage;
  assistant_message?: ChatMessage;
  session: ChatSession;
  message: string;
  error_details?: string;
}

interface GetMessagesResponse {
  success: boolean;
  messages: ChatMessage[];
  session: ChatSession;
  total_messages: number;
  page: number;
  limit: number;
  has_more: boolean;
}

function ChatContent() {
  const { user } = useAuth();
  const { notifyError, notifySuccess } = useNotifications();
  
  // Product selection state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Chat session state
  const [sessions, setSessions] = useState<ChatSessionWithDetails[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  
  // Message handling state
  const [inputMessage, setInputMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  // UI state
  const [showSessionActions, setShowSessionActions] = useState<string | null>(null);
  const [renameSessionId, setRenameSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const productSelectorRef = useRef<HTMLDivElement>(null);
  const sessionActionsRef = useRef<HTMLDivElement>(null);

  // Fetch products and sessions when component mounts
  useEffect(() => {
    fetchProducts();
    fetchSessions();
  }, []);
  
  // Load messages when current session ID changes (not just session object)
  useEffect(() => {
    if (currentSession) {
      fetchMessages(currentSession.session_id);
    } else {
      setMessages([]);
    }
  }, [currentSession?.session_id]); // Only depend on session_id, not the entire session object

  // Focus search input when selector opens
  useEffect(() => {
    if (showProductSelector && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showProductSelector]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle click outside for product selector
  useEffect(() => {
    if (!showProductSelector) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (productSelectorRef.current && !productSelectorRef.current.contains(event.target as Node)) {
        console.log('🔴 Click outside detected, closing product selector');
        setShowProductSelector(false);
      }
    };

    // Add event listener to document
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProductSelector]);

  // Handle click outside for session actions
  useEffect(() => {
    if (!showSessionActions) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (sessionActionsRef.current && !sessionActionsRef.current.contains(event.target as Node)) {
        console.log('🔴 Click outside detected, closing session actions');
        setShowSessionActions(null);
      }
    };

    // Add event listener to document
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSessionActions]);

  const fetchProducts = async () => {
    try {
      setIsLoadingProducts(true);
      
      const response = await apiClient.get<{
        success: boolean;
        message: string;
        data: Product[];
      }>('/api/v1/products');
      
      const productList = response.data.data || [];
      console.log('📦 Products loaded:', productList.length, 'products');
      console.log('📦 First product:', productList[0]);
      setProducts(productList);
      
    } catch (error: any) {
      console.error('Error fetching products:', error);
      const errorMessage = error.detail || error.message || 'Failed to fetch products';
      notifyError('Fetch Error', errorMessage);
      setProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  };
  
  const fetchSessions = async () => {
    try {
      setIsLoadingSessions(true);
      console.log('Current user:', user);
      console.log('Auth headers:', apiClient.defaults.headers.common['Authorization']);
      
      const response = await apiClient.get<ListSessionsResponse>('/api/v1/chat/sessions', {
        params: {
          status: 'active',
          limit: 50,
          order_by: 'last_message_at',
          order_direction: 'desc'
        }
      });
      
      if (response.data.success) {
        setSessions(response.data.sessions);
      }
      
    } catch (error: any) {
      console.error('Error fetching sessions:', error);
      console.error('Error type:', typeof error);
      console.error('Error keys:', Object.keys(error || {}));
      console.error('Error detail:', error?.detail);
      console.error('Error message:', error?.message);
      console.error('Error response:', error?.response);
      
      const errorMessage = error?.detail || error?.message || error?.response?.data?.detail || 'Failed to fetch chat sessions';
      const safeErrorMessage = typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage);
      notifyError('Fetch Error', safeErrorMessage);
      setSessions([]);
    } finally {
      setIsLoadingSessions(false);
    }
  };
  
  const fetchMessages = async (sessionId: string) => {
    try {
      console.log('🔄 fetchMessages called for session:', sessionId);
      setIsLoadingMessages(true);
      
      const response = await apiClient.get<GetMessagesResponse>(
        `/api/v1/chat/sessions/${sessionId}/messages`,
        {
          params: {
            limit: 50,
            order_direction: 'asc'
          }
        }
      );
      
      if (response.data.success) {
        console.log('✅ Messages loaded:', response.data.messages.length, 'messages');
        setMessages(response.data.messages);
      }
      
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      const errorMessage = error.detail || error.message || 'Failed to fetch messages';
      notifyError('Fetch Error', errorMessage);
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleProductSelect = async (product: Product) => {
    try {
      console.log('🎯 Product selected:', product);
      setSelectedProduct(product);
      setShowProductSelector(false);
      setSearchQuery('');
      
      // First, get fresh sessions data directly from API
      console.log('🔄 Product Select: Fetching fresh sessions from API...');
      const response = await apiClient.get<ListSessionsResponse>('/api/v1/chat/sessions', {
        params: {
          status: 'active',
          limit: 50,
          order_by: 'last_message_at',
          order_direction: 'desc'
        }
      });
      
      if (response.data.success) {
        const freshSessions = response.data.sessions;
        console.log('🔄 Fresh sessions loaded:', freshSessions.length);
        
        // Check if there's already an active session for this insurance product
        const existingSession = freshSessions.find(s => s.insurance_id === product.insurance_id);
        
        if (existingSession) {
          console.log('📋 Product Select: Found existing session in fresh data:', existingSession);
          // Update local sessions state and switch to existing session
          setSessions(freshSessions);
          setCurrentSession(existingSession);
          notifySuccess('Session Switched', `Switched to existing chat: ${existingSession.session_name}`);
          return;
        }
      }
      
      console.log('📞 Product Select: No existing session found, creating new session for insurance_id:', product.insurance_id);
      // Create a new chat session for this product
      await createNewSession(product.insurance_id);
      
    } catch (error: any) {
      console.error('❌ Error selecting product:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      const errorMessage = error?.detail || error?.message || 'Failed to start chat session';
      const safeErrorMessage = typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage);
      notifyError('Session Error', safeErrorMessage);
    }
  };
  
  const createNewSession = async (insuranceId: string, firstMessage?: string) => {
    try {
      console.log('🚀 createNewSession called with:', { insuranceId, firstMessage, currentSessionsCount: sessions.length });
      
      // Check if we're at the session limit (5 max)
      if (sessions.length >= 5) {
        console.log('⚠️ Session limit reached');
        notifyError('Session Limit', 'You can have maximum 5 active chat sessions. Please archive some sessions first.');
        return;
      }
      
      const requestPayload = {
        insurance_id: insuranceId,
        first_message: firstMessage
      };
      console.log('📡 Making API request to create session...');
      console.log('📋 Request payload:', requestPayload);
      const response = await apiClient.post<CreateSessionResponse>('/api/v1/chat/sessions', requestPayload);
      
      console.log('📥 API response received:', response);
      console.log('📥 Response data:', response.data);
      
      if (response.data.success) {
        const newSession = response.data.session;
        console.log('✅ Session created successfully:', newSession);
        
        // Update sessions list
        setSessions(prev => {
          const updated = [newSession, ...prev];
          console.log('📝 Updated sessions list:', updated);
          return updated;
        });
        setCurrentSession(newSession);
        console.log('🎯 Set current session:', newSession);
        
        // If there was a first message, add it to messages
        if (response.data.first_message) {
          setMessages([response.data.first_message]);
          console.log('💬 Set first message:', response.data.first_message);
        } else {
          setMessages([]);
          console.log('💬 No first message, cleared messages');
        }
        
        notifySuccess('Session Created', `Started new chat: ${newSession.session_name}`);
        console.log('🎉 Session creation completed successfully');
      } else {
        console.log('❌ Session creation failed - success: false');
      }
      
    } catch (error: any) {
      console.error('❌ Error creating session:', error);
      console.error('❌ Error detail:', error.detail);
      console.error('❌ Error status_code:', error.status_code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error name:', error.name);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Full error object:', JSON.stringify(error, null, 2));
      console.error('❌ Error keys:', Object.keys(error || {}));
      console.error('❌ Error type:', typeof error);
      
      // Also log the request payload for debugging
      console.error('❌ Request payload that failed:', requestPayload);
      
      // Handle specific error cases
      let errorMessage = 'Failed to create chat session';
      
      // Check if it's the constraint violation error from the JSON structure you showed
      const errorDetail = error?.detail || error?.message || '';
      
      if (typeof errorDetail === 'string' && errorDetail.includes('duplicate key value violates unique constraint')) {
        errorMessage = 'A chat session for this insurance product already exists. Please refresh the page to see existing sessions.';
      } else if (typeof errorDetail === 'object' && errorDetail.message && errorDetail.message.includes('duplicate key value violates unique constraint')) {
        errorMessage = 'A chat session for this insurance product already exists. Please refresh the page to see existing sessions.';
      } else if (errorDetail) {
        errorMessage = typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail);
      } else if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      
      notifyError('Session Error', errorMessage);
    }
  };
  
  const handleSessionSelect = async (session: ChatSessionWithDetails) => {
    if (currentSession?.session_id === session.session_id) return;
    
    setCurrentSession(session);
    
    // Find the associated product
    const associatedProduct = products.find(p => p.insurance_id === session.insurance_id);
    if (associatedProduct) {
      setSelectedProduct(associatedProduct);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    if (!currentSession) {
      notifyError('No Active Session', 'Please select a chat session or create a new one');
      return;
    }
    
    const messageContent = inputMessage.trim();
    
    try {
      setIsSendingMessage(true);
      setIsTyping(true);
      setInputMessage('');
      
      const response = await apiClient.post<SendMessageResponse>(
        `/api/v1/chat/sessions/${currentSession.session_id}/messages`,
        {
          content: messageContent,
          role: 'user'
        }
      );
      
      if (response.data.success) {
        console.log('💬 Message sent successfully, updating UI...');
        console.log('📥 User message:', response.data.user_message);
        console.log('🤖 Assistant message:', response.data.assistant_message);
        
        // Add both user and assistant messages
        const newMessages = [response.data.user_message];
        if (response.data.assistant_message) {
          newMessages.push(response.data.assistant_message);
        }
        
        setMessages(prev => {
          const updated = [...prev, ...newMessages];
          console.log('💬 Updated messages array:', updated.length, 'total messages');
          return updated;
        });
        
        // Update current session with new message count (this should NOT trigger message refetch now)
        if (response.data.session) {
          console.log('📊 Updating session metadata (should not refetch messages)');
          setCurrentSession(response.data.session);
          // Update session in the sessions list
          setSessions(prev => prev.map(s => 
            s.session_id === response.data.session.session_id ? 
            { ...s, ...response.data.session } : s
          ));
        }
      }
      
    } catch (error: any) {
      console.error('❌ Error sending message:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error keys:', Object.keys(error || {}));
      console.error('❌ Error detail:', error?.detail);
      console.error('❌ Error message:', error?.message);
      console.error('❌ Error response:', error?.response);
      
      const errorMessage = error?.detail || error?.message || error?.response?.data?.detail || 'Failed to send message';
      const safeErrorMessage = typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage);
      notifyError('Message Error', safeErrorMessage);
      
      // Restore the input message on error
      setInputMessage(messageContent);
    } finally {
      setIsSendingMessage(false);
      setIsTyping(false);
    }
  };
  
  const handleArchiveSession = async (sessionId: string) => {
    try {
      const response = await apiClient.delete(`/api/v1/chat/sessions/${sessionId}`);
      
      if (response.data.success) {
        // Remove session from list
        setSessions(prev => prev.filter(s => s.session_id !== sessionId));
        
        // If this was the current session, clear it
        if (currentSession?.session_id === sessionId) {
          setCurrentSession(null);
          setSelectedProduct(null);
          setMessages([]);
        }
        
        notifySuccess('Session Archived', 'Chat session has been archived');
      }
      
    } catch (error: any) {
      console.error('Error archiving session:', error);
      const errorMessage = error.detail || error.message || 'Failed to archive session';
      notifyError('Archive Error', errorMessage);
    }
    
    setShowSessionActions(null);
  };

  const handleRenameSession = async (sessionId: string, newName: string) => {
    try {
      const response = await apiClient.patch(`/api/v1/chat/sessions/${sessionId}/rename`, {
        new_name: newName
      });
      
      if (response.data.success) {
        // Update session in the list
        setSessions(prev => prev.map(s => 
          s.session_id === sessionId ? { ...s, session_name: newName } : s
        ));
        
        // If this is the current session, update it
        if (currentSession?.session_id === sessionId) {
          setCurrentSession(prev => prev ? { ...prev, session_name: newName } : null);
        }
        
        notifySuccess('Session Renamed', `Session renamed to "${newName}"`);
      }
      
    } catch (error: any) {
      console.error('Error renaming session:', error);
      const errorMessage = error.detail || error.message || 'Failed to rename session';
      notifyError('Rename Error', errorMessage);
    }
    
    setRenameSessionId(null);
    setRenameValue('');
  };
  
  const handleNewChat = async () => {
    if (!selectedProduct) {
      setShowProductSelector(true);
      return;
    }
    
    try {
      // First, get fresh sessions data directly from API
      console.log('🔄 New Chat: Fetching fresh sessions from API...');
      const response = await apiClient.get<ListSessionsResponse>('/api/v1/chat/sessions', {
        params: {
          status: 'active',
          limit: 50,
          order_by: 'last_message_at',
          order_direction: 'desc'
        }
      });
      
      if (response.data.success) {
        const freshSessions = response.data.sessions;
        console.log('🔄 Fresh sessions loaded:', freshSessions.length);
        
        // Check if there's already an active session for the selected product
        const existingSession = freshSessions.find(s => s.insurance_id === selectedProduct.insurance_id);
        
        if (existingSession) {
          console.log('📋 New Chat: Found existing session in fresh data:', existingSession);
          // Update local sessions state and switch to existing session
          setSessions(freshSessions);
          setCurrentSession(existingSession);
          notifySuccess('Session Switched', `Switched to existing chat: ${existingSession.session_name}`);
          return;
        }
      }
      
      console.log('📞 New Chat: No existing session found, creating new one');
      // Create new session
      await createNewSession(selectedProduct.insurance_id);
      
    } catch (error: any) {
      console.error('❌ Error in handleNewChat:', error);
      const errorMessage = error?.detail || error?.message || 'Failed to start new chat';
      const safeErrorMessage = typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage);
      notifyError('New Chat Error', safeErrorMessage);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredProducts = products.filter(product =>
    product.insurance_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryColor = (category: string | null | undefined) => {
    const colors = {
      'life': 'bg-blue-100 text-blue-800',
      'health': 'bg-green-100 text-green-800',
      'auto': 'bg-red-100 text-red-800',
      'home': 'bg-purple-100 text-purple-800',
      'travel': 'bg-yellow-100 text-yellow-800',
      'business': 'bg-indigo-100 text-indigo-800',
      'other': 'bg-gray-100 text-gray-800'
    };

    // Handle null/undefined cases
    if (!category) return colors.other;

    return colors[category.toLowerCase() as keyof typeof colors] || colors.other;
  };

  return (
    <Sidebar>
      <div className="h-screen bg-gradient-to-br from-gray-50 to-white overflow-hidden">
        <div className="flex h-full">
          {/* Chat Sessions Sidebar */}
          <div className="w-80 bg-white/80 backdrop-blur-sm border-r border-white/20 shadow-lg flex flex-col">
            {/* Sidebar Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Chat Sessions</h2>
                <button
                  onClick={handleNewChat}
                  className="bg-primary-600 hover:bg-primary-700 text-white rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200 flex items-center"
                  title="Start new chat"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Chat
                </button>
              </div>
              
              {/* Selected Product Display */}
              {selectedProduct && (
                <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl p-4 mb-4 border border-primary-100">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 text-sm leading-tight">
                        {selectedProduct.insurance_name}
                      </h3>
                      <p className="text-xs text-gray-600 mt-1">
                        🏢 {selectedProduct.provider}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(selectedProduct.category)}`}>
                    {selectedProduct.category}
                  </span>
                </div>
              )}

              {/* Product Selector Button */}
              <div className="relative" ref={productSelectorRef}>
                <button
                  onClick={() => setShowProductSelector(!showProductSelector)}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Select Insurance Product
                </button>

                {/* Product Selector Dropdown */}
                {showProductSelector && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-[60] max-h-80 flex flex-col">
                    {/* Search Input */}
                    <div className="p-3 border-b border-gray-100">
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search insurance products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                      />
                    </div>

                    {/* Products List */}
                    <div className="overflow-y-auto max-h-64">
                      {/* Test Click Handler */}
                      <div 
                        onClick={() => console.log('🧪 Test div clicked!')}
                        className="p-2 bg-red-100 text-red-800 text-sm cursor-pointer hover:bg-red-200"
                      >
                        🧪 Click Test (If you see this log, div clicks work)
                      </div>
                      {(() => {
                        console.log('🔍 Rendering products list:', {
                          isLoadingProducts,
                          productsCount: products.length,
                          filteredProductsCount: filteredProducts.length,
                          showProductSelector
                        });
                        return null;
                      })()}
                      {isLoadingProducts ? (
                        <div className="p-4 text-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                          <p className="text-sm text-gray-500 mt-2">Loading products...</p>
                        </div>
                      ) : filteredProducts.length === 0 ? (
                        <div className="p-4 text-center">
                          <p className="text-sm text-gray-500">No products found</p>
                        </div>
                      ) : (
                        filteredProducts.map((product) => (
                          <button
                            key={product.insurance_id}
                            onMouseDown={() => console.log('🖱️ Mouse down on:', product.insurance_name)}
                            onMouseUp={() => console.log('🖱️ Mouse up on:', product.insurance_name)}
                            onClick={(e) => {
                              console.log('🖱️ Product button clicked!', product.insurance_name);
                              e.preventDefault();
                              e.stopPropagation();
                              handleProductSelect(product);
                            }}
                            className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-50 last:border-b-0 transition-colors duration-150 cursor-pointer"
                            style={{pointerEvents: 'auto'}}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium text-sm text-gray-900 leading-tight">
                                {product.insurance_name}
                              </span>
                              <span className="text-xs text-gray-600 mt-1">
                                🏢 {product.provider}
                              </span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-2 w-fit ${getCategoryColor(product.category)}`}>
                                {product.category}
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto">
              {isLoadingSessions ? (
                <div className="p-6 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Loading sessions...</p>
                </div>
              ) : sessions.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="text-4xl mb-3">💬</div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">No Active Sessions</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Start a new chat by selecting an insurance product and clicking "New Chat".
                  </p>
                </div>
              ) : (
                <div className="space-y-2 p-3">
                  {sessions.map((session) => (
                    <div
                      key={session.session_id}
                      className={`relative group cursor-pointer rounded-lg p-3 transition-all duration-200 ${
                        currentSession?.session_id === session.session_id
                          ? 'bg-primary-50 border border-primary-200'
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                      onClick={() => handleSessionSelect(session)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm text-gray-900 truncate">
                            {session.session_name}
                          </h4>
                          <p className="text-xs text-gray-600 mt-1">
                            {session.insurance_title || session.insurance_company}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-500">
                              {session.message_count} messages
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(session.last_message_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        
                        <div className="relative" ref={showSessionActions === session.session_id ? sessionActionsRef : undefined}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowSessionActions(
                                showSessionActions === session.session_id ? null : session.session_id
                              );
                            }}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 p-1 transition-opacity duration-200"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>
                          
                          {showSessionActions === session.session_id && (
                            <div className="absolute right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[140px]">
                              <button
                                onMouseDown={() => console.log('🖱️ Rename button mouse down')}
                                onMouseUp={() => console.log('🖱️ Rename button mouse up')}
                                onClick={(e) => {
                                  console.log('🖱️ Rename button clicked!');
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setRenameSessionId(session.session_id);
                                  setRenameValue(session.session_name);
                                  setShowSessionActions(null);
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                                style={{pointerEvents: 'auto'}}
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Rename
                              </button>
                              <button
                                onMouseDown={() => console.log('🖱️ Archive button mouse down')}
                                onMouseUp={() => console.log('🖱️ Archive button mouse up')}
                                onClick={(e) => {
                                  console.log('🖱️ Archive button clicked!');
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleArchiveSession(session.session_id);
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                                style={{pointerEvents: 'auto'}}
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Archive
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 p-6 shadow-sm">
              <h1 className="text-2xl font-bold text-gray-900">
                {currentSession ? currentSession.session_name : 'Insurance Chat Assistant'}
              </h1>
              <p className="text-gray-600 mt-1">
                {currentSession && selectedProduct
                  ? `Chatting about ${selectedProduct.provider}'s ${selectedProduct.insurance_name}`
                  : 'Select a session or create a new chat to get started'
                }
              </p>
              {currentSession && (
                <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                  <span>{messages.length} messages</span>
                  <span>•</span>
                  <span>Last active: {new Date(currentSession.last_message_at).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading messages...</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🤖</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {currentSession ? 'Start Chatting!' : 'No Session Selected'}
                    </h3>
                    <p className="text-gray-600 max-w-md">
                      {currentSession
                        ? 'Ask me anything about this insurance product. I can help explain coverage, benefits, premiums, and more!'
                        : 'Select an existing chat session from the sidebar or create a new one to get started.'
                      }
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <div
                      key={message.message_id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-sm lg:max-w-2xl px-4 py-2 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-primary-600 text-white'
                            : message.role === 'assistant'
                            ? 'bg-white/80 backdrop-blur-sm border border-gray-200 text-gray-900'
                            : 'bg-gray-100 border border-gray-200 text-gray-700'
                        }`}
                      >
                        {message.role === 'assistant' ? (
                          <div className="text-sm prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-900 prose-strong:text-gray-900 prose-ul:text-gray-900 prose-ol:text-gray-900 prose-table:text-gray-900 prose-thead:text-gray-900 prose-tbody:text-gray-900 prose-tr:border-gray-200 prose-td:border-gray-200 prose-th:border-gray-200">
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              components={{
                                table: ({node, ...props}) => (
                                  <div className="overflow-x-auto my-4">
                                    <table className="min-w-full border-collapse border border-gray-300" {...props} />
                                  </div>
                                ),
                                th: ({node, ...props}) => (
                                  <th className="border border-gray-300 px-3 py-2 bg-gray-100 text-left font-semibold" {...props} />
                                ),
                                td: ({node, ...props}) => (
                                  <td className="border border-gray-300 px-3 py-2" {...props} />
                                ),
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        )}
                        <div className="flex items-center justify-between mt-1">
                          <p className={`text-xs ${
                            message.role === 'user' ? 'text-primary-100' : 'text-gray-500'
                          }`}>
                            {new Date(message.created_at).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                          {message.role === 'assistant' && (
                            <span className="text-xs text-gray-400 ml-2">AI</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-white/80 backdrop-blur-sm border border-gray-200 text-gray-900 px-4 py-2 rounded-lg">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-100"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-200"></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Message Input */}
            <div className="bg-white/80 backdrop-blur-sm border-t border-white/20 p-6 shadow-sm">
              {currentSession ? (
                <div className="flex space-x-3">
                  <div className="flex-1">
                    <textarea
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask a question about this insurance product..."
                      rows={1}
                      disabled={isSendingMessage}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                      style={{ minHeight: '48px' }}
                    />
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isSendingMessage || isTyping}
                    className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white rounded-lg px-6 py-3 transition-colors duration-200 flex items-center justify-center min-w-[64px]"
                  >
                    {isSendingMessage ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-gray-500 mb-3">No active chat session</p>
                  <button
                    onClick={handleNewChat}
                    className="bg-primary-600 hover:bg-primary-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200"
                  >
                    Start New Chat
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Click outside handlers are now handled by useEffect */}

        {/* Rename Session Modal */}
        {renameSessionId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Rename Session</h3>
                <button
                  onClick={() => {
                    setRenameSessionId(null);
                    setRenameValue('');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Name
                </label>
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && renameValue.trim()) {
                      handleRenameSession(renameSessionId, renameValue.trim());
                    } else if (e.key === 'Escape') {
                      setRenameSessionId(null);
                      setRenameValue('');
                    }
                  }}
                  placeholder="Enter new session name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  Press Enter to save, Escape to cancel
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setRenameSessionId(null);
                    setRenameValue('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (renameValue.trim()) {
                      handleRenameSession(renameSessionId, renameValue.trim());
                    }
                  }}
                  disabled={!renameValue.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  Rename
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Sidebar>
  );
}

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <ChatContent />
    </ProtectedRoute>
  );
}