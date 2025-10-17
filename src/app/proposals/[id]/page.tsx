'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { debounce } from 'lodash';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import apiClient from '@/lib/api';

// Types
interface Proposal {
  proposal_id: string;
  client_name: string;
  client_needs: string;
  needs_source: string;
  proposal_type: string;
  status: string;
  target_currency?: string;
  highlighted_insurance_name?: string;
  illustrations: IllustrationData[];
  created_at: string;
  updated_at: string;
}

interface IllustrationData {
  id: string;
  original_filename: string;
  illustration_order: number;
  extraction_status: string;
  cash_extraction_status?: string;
  extracted_insurance_name?: string;
  matched_insurance_id?: string;
  manual_insurance_assignment?: string;
  final_insurance_name?: string;
  is_duplicate_insurance: boolean;
  extraction_confidence?: number;
  processing_notes?: string;
  created_at: string;
}

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  extracting: 'bg-blue-100 text-blue-800',
  reviewing: 'bg-yellow-100 text-yellow-800',
  ready_for_age_analysis: 'bg-amber-100 text-amber-800',
  generating: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

const EXTRACTION_STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

const CASH_EXTRACTION_STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-800',
  extracting: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  no_cash_values: 'bg-orange-100 text-orange-800',
  failed: 'bg-red-100 text-red-800',
};

// Get the role ID to display commission rates for based on user role
const getDisplayRoleId = (userRole: string) => {
  const roleMap: Record<string, number> = {
    'SUPER_ADMIN': 6, // SUPER_ADMIN sees SENIOR_PARTNER rates
    'ADMIN': 6,       // ADMIN sees SENIOR_PARTNER rates
    'ADVISOR': 3,
    'LEADER_1': 4,
    'LEADER_2': 5,
    'SENIOR_PARTNER': 6,
    'MASTER': 6       // MASTER sees SENIOR_PARTNER rates
  };
  return roleMap[userRole] || 3; // Default to ADVISOR if unknown
};

// Helper function to get field value with priority: user_edited_data > comprehensive_data > fallback
const getFieldValue = (data: any, fieldName: string, fallback: any = null) => {
  // 1. Check user_edited_data first (user modifications)
  if (data.user_edited_data && data.user_edited_data[fieldName] !== null && data.user_edited_data[fieldName] !== undefined) {
    return data.user_edited_data[fieldName];
  }

  // 2. Special handling for nested comprehensive_data fields
  if (fieldName.includes('.')) {
    const [parentField, childField] = fieldName.split('.');

    // Check in user_edited_data first
    if (data.user_edited_data && data.user_edited_data[parentField] &&
        data.user_edited_data[parentField][childField] !== null &&
        data.user_edited_data[parentField][childField] !== undefined) {
      return data.user_edited_data[parentField][childField];
    }

    // Check in comprehensive_data
    if (data.comprehensive_data && data.comprehensive_data[childField] !== null &&
        data.comprehensive_data[childField] !== undefined) {
      return data.comprehensive_data[childField];
    }
  }

  // 3. Check comprehensive_data (AI extraction)
  if (data.comprehensive_data && data.comprehensive_data[fieldName] !== null && data.comprehensive_data[fieldName] !== undefined) {
    return data.comprehensive_data[fieldName];
  }

  // 4. Special handling for insurance_provider - check joined insurances table data
  if (fieldName === 'insurance_provider' && data.insurances && data.insurances.provider) {
    return data.insurances.provider;
  }

  // 5. Check direct field (legacy/direct database fields)
  if (data[fieldName] !== null && data[fieldName] !== undefined) {
    return data[fieldName];
  }

  // 6. Return fallback
  return fallback;
};


function ProposalDetailContent() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const proposalId = params.id as string;

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [manualAssignment, setManualAssignment] = useState<{
    illustrationId: string;
    insuranceName: string;
  } | null>(null);
  const [showExtractedData, setShowExtractedData] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [loadingExtractedData, setLoadingExtractedData] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [selectedIllustration, setSelectedIllustration] = useState<any>(null);
  const [insuranceSearchQuery, setInsuranceSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Proposal builder state
  const [userProfile, setUserProfile] = useState<any>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [commissionData, setCommissionData] = useState<any>({});
  const [loadingCommissions, setLoadingCommissions] = useState(false);
  const [loadedCommissionIds, setLoadedCommissionIds] = useState<string>('');
  const [selectedHighlightedInsurance, setSelectedHighlightedInsurance] = useState<string>('');
  const [page4Content, setPage4Content] = useState<any>(null);
  const [generatingPage4, setGeneratingPage4] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<string>('1.00 USD');
  const [loadingExchangeRate, setLoadingExchangeRate] = useState(false);
  const [page2Content, setPage2Content] = useState<any>({});
  const [retryCount, setRetryCount] = useState(0);
  const [generatingPage1, setGeneratingPage1] = useState(false);
  const [page1Content, setPage1Content] = useState<any>(null);
  const [myConversions, setMyConversions] = useState<any>({});
  const [loadingConversions, setLoadingConversions] = useState(false);
  const [hasCalculatedInitialRates, setHasCalculatedInitialRates] = useState(false);
  const [hasShownCompletionNotification, setHasShownCompletionNotification] = useState(false);
  const [editMode, setEditMode] = useState<{[key: string]: boolean}>({});
  const [editData, setEditData] = useState<{[key: string]: any}>({});
  const [savingChanges, setSavingChanges] = useState<{[key: string]: boolean}>({});
  // Separate state for cash surrender values edit mode
  const [cashEditMode, setCashEditMode] = useState<{[key: string]: boolean}>({});
  const [cashEditData, setCashEditData] = useState<{[key: string]: any}>({});

  // Auto-polling state
  const [isPolling, setIsPolling] = useState(false);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);
  const [lastPollTime, setLastPollTime] = useState<Date | null>(null);
  const [pollingRetryCount, setPollingRetryCount] = useState(0);

  // Use ref for synchronous completion check (prevents race conditions with setState)
  const hasShownCompletionRef = useRef(false);

  const [proposalData, setProposalData] = useState<any>({
    proposalTitle: 'Insurance Comparison Proposal',
    clientName: '',
    clientDob: '',
    companyName: '',
    agentName: '',
    agentContact: '',
    clientNeedsSummary: '',
    keyPointsSummary: '',
    insuranceKeyPoints: {}
  });

  // Load proposal data with retry logic
  const loadProposal = useCallback(async (currentRetry = 0) => {
    setRetryCount(currentRetry);
    
    try {
      const response = await apiClient.get(`/api/v1/proposals/${proposalId}`);
      const proposalData = response.data.data;
      setProposal(proposalData);

      // Reset currency calculation flag for new proposal
      setHasCalculatedInitialRates(false);
      setHasShownCompletionNotification(false);

      // Set highlighted insurance from database if it exists
      if (proposalData.highlighted_insurance_id) {
        setSelectedHighlightedInsurance(proposalData.highlighted_insurance_id);
      }

      setRetryCount(0); // Reset retry count on success
      setLoading(false); // Set loading false on success
    } catch (error: any) {
      console.error('Error loading proposal:', error);
      
      // Retry up to 3 times with exponential backoff for network issues
      if (currentRetry < 3 && (error.code === 'NETWORK_ERROR' || error.response?.status >= 500 || !error.response)) {
        console.log(`Retrying proposal load... attempt ${currentRetry + 1}`);
        const delay = Math.pow(2, currentRetry) * 1000; // 1s, 2s, 4s delays
        setTimeout(() => {
          loadProposal(currentRetry + 1);
        }, delay);
        return; // Don't set loading to false yet, keep retrying
      }
      
      // Only show error and redirect for actual errors (not network issues)  
      if (error.response?.status === 404) {
        toast.error('Proposal not found');
        setLoading(false);
        router.push('/proposals');
      } else if (error.response?.status === 403) {
        toast.error('Access denied to this proposal');
        setLoading(false);
        router.push('/proposals');
      } else if (currentRetry >= 3) {
        toast.error('Unable to load proposal. Please check your connection and try again.');
        setLoading(false);
        router.push('/proposals');
      }
      // For network errors during retry, keep loading true
    }
  }, [proposalId, router]);

  // Load user profile and company info
  const loadUserAndCompanyData = useCallback(async () => {
    try {
      // Load user profile
      const userResponse = await apiClient.get('/api/v1/auth/me');
      const user = userResponse.data;
      setUserProfile(user);
      
      // Update proposal data with user info
      setProposalData(prev => ({
        ...prev,
        agentName: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        agentContact: `${user.email || ''} | ${user.phone || ''}`.replace(' | ', user.phone ? ' | ' : ''),
        // Also set client info from proposal if available
        clientName: prev.clientName || proposal?.client_name || '',
        clientDob: prev.clientDob || proposal?.client_dob || ''
      }));

      // Load company info if user has company_id
      if (user.company_id) {
        const companyResponse = await apiClient.get(`/api/v1/companies/${user.company_id}`);
        const company = companyResponse.data;
        setCompanyInfo(company);

        setProposalData(prev => ({
          ...prev,
          companyName: company.name || company.company_name || '',
        }));
      }
    } catch (error) {
      console.error('Error loading user/company data:', error);
    }
  }, [proposal]);

  // Auto-save functionality with debouncing
  const updateProposalData = useCallback((field: string, value: string) => {
    setProposalData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-save to database with debouncing
    debouncedSaveProposal(field, value);
  }, []);

  // Debounced save function to avoid too many API calls
  const debouncedSaveProposal = useCallback(
    debounce(async (field: string, value: string) => {
      try {
        console.log('Auto-saving proposal field:', field, 'value:', value);
        const updateData: any = {};
        updateData[field] = value;

        await apiClient.put(`/api/v1/proposals/${proposalId}`, updateData);
        console.log('Proposal auto-saved successfully');
      } catch (error: any) {
        console.error('Failed to auto-save proposal:', error);
        // Don't show error toast for auto-save failures to avoid annoying the user
      }
    }, 1000), // 1 second debounce
    [proposalId]
  );

  // Calculate age from DOB
  const calculateAge = (dob: string): number | null => {
    if (!dob) return null;

    const today = new Date();
    const birthDate = new Date(dob);

    if (isNaN(birthDate.getTime())) return null;

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  };

  // Get calculated age with memoization to ensure it updates when DOB changes
  const calculatedAge = useMemo(() => {
    const age = calculateAge(proposalData.clientDob);
    console.log('Age calculation debug:', {
      clientDob: proposalData.clientDob,
      calculatedAge: age,
      dateValid: !isNaN(new Date(proposalData.clientDob || '').getTime())
    });
    return age;
  }, [proposalData.clientDob]);

  // Detect the primary currency from insurance data - SIMPLIFIED
  const getInsuranceCurrency = useCallback(() => {
    if (!extractedData || extractedData.length === 0) {
      console.log('🔄 EXCHANGE RATE DEBUG: No extracted data, defaulting to USD');
      return 'USD';
    }

    // Get the first available currency from comprehensive_data
    for (const item of extractedData) {
      const currency = item.comprehensive_data?.currency || item.currency;
      if (currency) {
        console.log('🔄 EXCHANGE RATE DEBUG: Found currency:', currency.toUpperCase());
        return currency.toUpperCase();
      }
    }

    console.log('🔄 EXCHANGE RATE DEBUG: No currency found, defaulting to USD');
    return 'USD';
  }, [extractedData]);

  // Fetch exchange rates
  const fetchExchangeRate = useCallback(async () => {
    console.log('🔄 EXCHANGE RATE DEBUG: Refresh button clicked!');
    console.log('🔄 EXCHANGE RATE DEBUG: Current extractedData:', extractedData);

    setLoadingExchangeRate(true);
    try {
      const sourceCurrency = getInsuranceCurrency();
      console.log('🔄 EXCHANGE RATE DEBUG: Using source currency:', sourceCurrency);

      // Using ExchangeRate-API for live exchange rates
      //
      // FREE TIER SETUP (No registration required):
      // - 2,000 requests/month shared across all users
      // - No API key needed
      // - Works out of the box
      //
      // PREMIUM TIER SETUP (Recommended for production):
      // 1. Visit: https://app.exchangerate-api.com/sign-up
      // 2. Sign up for free account (get 2,000 requests/month per account)
      // 3. Copy your API key from dashboard
      // 4. Add to your .env.local file: NEXT_PUBLIC_EXCHANGE_RATE_API_KEY=your_api_key_here
      // 5. Restart your development server
      //
      // PAID PLANS (if you need more requests):
      // - Starter: $9/month (10,000 requests)
      // - Professional: $15/month (100,000 requests)
      // - Enterprise: $99/month (1,000,000 requests)
      //
      const apiKey = process.env.NEXT_PUBLIC_EXCHANGE_RATE_API_KEY;

      if (!apiKey) {
        // Fallback to free tier without API key
        console.log('🔄 EXCHANGE RATE DEBUG: Using free tier API');
        const apiUrl = `https://api.exchangerate-api.com/v4/latest/${sourceCurrency}`;
        console.log('🔄 EXCHANGE RATE DEBUG: Calling:', apiUrl);

        const response = await fetch(apiUrl);
        const data = await response.json();
        console.log('🔄 EXCHANGE RATE DEBUG: API Response:', data);

        if (data.rates && data.rates.MYR) {
          const rate = data.rates.MYR;
          const formattedRate = `1 ${sourceCurrency} = ${rate.toFixed(2)} MYR`;
          console.log('🔄 EXCHANGE RATE DEBUG: Setting exchange rate:', formattedRate);
          setExchangeRate(formattedRate);
        } else {
          console.log('🔄 EXCHANGE RATE DEBUG: No MYR rate found in response');
        }
      } else {
        // With API key for higher limits
        console.log('🔄 EXCHANGE RATE DEBUG: Using premium API with key');
        const apiUrl = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${sourceCurrency}`;
        console.log('🔄 EXCHANGE RATE DEBUG: Calling:', apiUrl);

        const response = await fetch(apiUrl);
        const data = await response.json();
        console.log('🔄 EXCHANGE RATE DEBUG: API Response:', data);

        if (data.conversion_rates && data.conversion_rates.MYR) {
          const rate = data.conversion_rates.MYR;
          const formattedRate = `1 ${sourceCurrency} = ${rate.toFixed(2)} MYR`;
          console.log('🔄 EXCHANGE RATE DEBUG: Setting exchange rate:', formattedRate);
          setExchangeRate(formattedRate);
        } else {
          console.log('🔄 EXCHANGE RATE DEBUG: No MYR rate found in response');
        }
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      const sourceCurrency = getInsuranceCurrency();
      setExchangeRate(`1 ${sourceCurrency} = 1.00 MYR (offline)`);
    } finally {
      setLoadingExchangeRate(false);
    }
  }, [getInsuranceCurrency, extractedData]);

  // Load commission data for mapped insurances
  const loadCommissionData = useCallback(async (mappedInsurances: any[]) => {
    console.log('🔍 COMMISSION DEBUG: Starting loadCommissionData with mappedInsurances:', mappedInsurances);

    if (!mappedInsurances.length) {
      console.log('🔍 COMMISSION DEBUG: No mapped insurances, returning early');
      return;
    }

    setLoadingCommissions(true);
    try {
      const insuranceIds = mappedInsurances
        .filter(data => data.matched_insurance_id)
        .map(data => data.matched_insurance_id);

      console.log('🔍 COMMISSION DEBUG: Extracted insurance IDs:', insuranceIds);

      if (insuranceIds.length === 0) {
        console.log('🔍 COMMISSION DEBUG: No valid insurance IDs found, returning early');
        return;
      }

      // Get the appropriate role ID to display for this user
      const displayRoleId = getDisplayRoleId(user?.role || '');
      console.log('🔍 COMMISSION DEBUG: User role:', user?.role, 'Display role ID:', displayRoleId);

      // Build query string with all insurance IDs and role filter
      const queryParams = [
        ...insuranceIds.map(id => `insurance_ids=${id}`),
        `role_id=${displayRoleId}`
      ].join('&');
      console.log('🔍 COMMISSION DEBUG: API call URL params:', queryParams);

      const response = await apiClient.get(`/api/v1/commissions/bulk?${queryParams}`);
      console.log('🔍 COMMISSION DEBUG: API response received:', {
        status: response.status,
        dataLength: response.data?.length,
        data: response.data
      });

      // Transform response into a grouped lookup object
      const commissionLookup = {};
      response.data.forEach((commission: any) => {
        console.log('🔍 COMMISSION DEBUG: Processing commission record:', commission);

        const insuranceId = commission.insurance_id;
        const premiumTerm = commission.premium_term;

        // Initialize insurance if not exists
        if (!commissionLookup[insuranceId]) {
          commissionLookup[insuranceId] = {
            insurance_id: insuranceId,
            commissions_by_term: {}
          };
        }

        // Initialize premium term if not exists
        if (!commissionLookup[insuranceId].commissions_by_term[premiumTerm]) {
          commissionLookup[insuranceId].commissions_by_term[premiumTerm] = [];
        }

        // Add commission record to the appropriate term
        commissionLookup[insuranceId].commissions_by_term[premiumTerm].push(commission);
      });

      console.log('🔍 COMMISSION DEBUG: Final commission lookup object:', commissionLookup);
      setCommissionData(commissionLookup);

      // ✅ Track which insurance IDs were loaded to prevent redundant API calls
      const loadedIds = insuranceIds.sort().join(',');
      setLoadedCommissionIds(loadedIds);
      console.log('🔍 COMMISSION DEBUG: Marked IDs as loaded:', loadedIds);
    } catch (error) {
      console.error('🔍 COMMISSION DEBUG: Error loading commission data:', error);
      console.error('🔍 COMMISSION DEBUG: Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      toast.error('Failed to load commission data');
    } finally {
      setLoadingCommissions(false);
    }
  }, []);

  useEffect(() => {
    loadProposal();
  }, [proposalId, loadProposal]);

  // Load user and company data after proposal is loaded
  useEffect(() => {
    if (proposal) {
      loadUserAndCompanyData();
    }
  }, [proposal, loadUserAndCompanyData]);

  // Initialize proposal data from database when proposal is loaded
  useEffect(() => {
    if (proposal && !proposalData.clientDob) {
      console.log('Initializing proposal data from database:', {
        client_name: proposal.client_name,
        client_dob: proposal.client_dob,
        current_proposalData: proposalData
      });

      setProposalData(prev => ({
        ...prev,
        clientName: prev.clientName || proposal.client_name || '',
        clientDob: prev.clientDob || proposal.client_dob || ''
      }));
    }
  }, [proposal]); // Only depend on proposal to avoid loops

  // Auto-load extracted data when proposal has illustrations
  useEffect(() => {
    console.log('🔍 Auto-load useEffect triggered:', {
      proposalExists: !!proposal,
      proposalKeys: proposal ? Object.keys(proposal) : [],
      hasIllustrations: proposal?.illustrations ? proposal.illustrations.length > 0 : false,
      illustrationsLength: proposal?.illustrations?.length,
      extractedDataExists: !!extractedData,
      extractedDataLength: extractedData?.length,
      shouldAutoLoad: proposal && proposal.illustrations && proposal.illustrations.length > 0 && !extractedData
    });

    if (proposal && proposal.illustrations && proposal.illustrations.length > 0 && !extractedData) {
      console.log('🔄 Auto-loading extracted data for', proposal.illustrations.length, 'illustrations');
      handleManageIllustrations(true, true); // forceRefresh=true, autoLoad=true
    } else if (proposal && proposal.illustrations && proposal.illustrations.length > 0 && extractedData) {
      console.log('✅ ExtractedData already exists, currency conversion available via manual refresh');
      // Currency conversion available via manual refresh button
    }
  }, [proposal, extractedData]); // Load when proposal is ready and extractedData is not yet loaded

  // Load exchange rate when insurance data is available
  useEffect(() => {
    if (extractedData && extractedData.length > 0) {
      fetchExchangeRate();
    }
  }, [extractedData]); // Removed fetchExchangeRate from dependencies

  // Load commission data when all insurances are mapped
  useEffect(() => {
    if (extractedData && extractedData.length > 0) {
      const allMapped = extractedData.every((data: any) => data.matched_insurance_id);

      if (allMapped) {
        // Create sorted, comma-separated string of current insurance IDs
        const currentInsuranceIds = extractedData
          .filter((data: any) => data.matched_insurance_id)
          .map((data: any) => data.matched_insurance_id)
          .sort()
          .join(',');

        // ✅ Only load if the set of insurance IDs has changed
        // This prevents redundant API calls during polling while still reloading when insurances change
        if (currentInsuranceIds && currentInsuranceIds !== loadedCommissionIds) {
          console.log('🔍 COMMISSION DEBUG: Insurance IDs changed, loading commissions');
          console.log('🔍 COMMISSION DEBUG: Previous IDs:', loadedCommissionIds);
          console.log('🔍 COMMISSION DEBUG: Current IDs:', currentInsuranceIds);
          loadCommissionData(extractedData);
        } else if (currentInsuranceIds === loadedCommissionIds) {
          console.log('🔍 COMMISSION DEBUG: Insurance IDs unchanged, skipping commission load');
        }
      }
    }
  }, [extractedData, loadedCommissionIds]); // Added loadedCommissionIds dependency

  // Generate Page 4 recommendation content
  const generatePage4Content = useCallback(async (forceRegenerate = false) => {
    if (!selectedHighlightedInsurance || !extractedData || !proposal) return;

    setGeneratingPage4(true);
    try {
      console.log('🔥 Generating Page 4 content for insurance:', selectedHighlightedInsurance);

      // Call the new generate-page4-content API endpoint with insurance ID in request body
      const response = await apiClient.post(`/api/v1/proposals/${proposalId}/generate-page4-content`, {
        highlighted_insurance_id: selectedHighlightedInsurance
      }, {
        params: { force_regenerate: forceRegenerate }
      });

      const content = response.data.data;
      console.log('✅ Page 4 content generated:', content);

      // Map API response to UI structure
      const uiContent = {
        recommendedInsuranceName: content.page4_content.recommended_insurance_name,
        provider: content.page4_content.provider,
        keyFeatures: content.page4_content.key_features || [],
        recommendation: content.page4_content.rationale || '',
        advantages: content.page4_content.benefits || []
      };

      setPage4Content(uiContent);

      const message = content.regenerated
        ? 'Page 4 recommendation regenerated successfully'
        : content.cached
          ? 'Page 4 recommendation loaded from cache'
          : 'Page 4 recommendation generated successfully';

      toast.success(message);

    } catch (error) {
      console.error('❌ Error generating Page 4 content:', error);
      if (error.response?.status === 400) {
        toast.error(error.response.data?.detail || 'Please select an insurance product first');
      } else {
        toast.error('Failed to generate recommendation content');
      }
    } finally {
      setGeneratingPage4(false);
    }
  }, [selectedHighlightedInsurance, extractedData, proposal, proposalId]);

  // Generate Page 1 content using LLM
  const generatePage1Content = useCallback(async (forceRegenerate = false) => {
    if (!proposal || !extractedData) return;

    setGeneratingPage1(true);
    try {
      const response = await apiClient.post(`/api/v1/proposals/${proposalId}/generate-page1-content`, {}, {
        params: { force_regenerate: forceRegenerate }
      });
      const content = response.data.data;
      
      setPage1Content(content);
      
      // Update proposal data with generated content
      setProposalData(prev => ({
        ...prev,
        proposalTitle: content.proposal_title,
        clientNeedsSummary: content.client_needs_summary,
        insuranceKeyPoints: content.insurance_key_points
      }));
      
      const message = forceRegenerate ? 'Page 1 content regenerated successfully' : 'Page 1 content generated successfully';
      toast.success(message);
      
    } catch (error: any) {
      console.error('Error generating Page 1 content:', error);
      toast.error(error.response?.data?.detail || 'Failed to generate Page 1 content');
    } finally {
      setGeneratingPage1(false);
    }
  }, [proposal, extractedData, proposalId]);

  // Generate Page 2 content using LLM
  const generatePage2Content = useCallback(async () => {
    if (!proposal || !extractedData) return;

    setGeneratingPage1(true); // Reuse same loading state
    try {
      const response = await apiClient.post(`/api/v1/proposals/${proposalId}/generate-page2-content`);
      const content = response.data.data;

      // Update page2Content with generated key features
      const newPage2Content = {};
      Object.entries(content.insurance_key_features).forEach(([insuranceId, features]) => {
        newPage2Content[insuranceId] = {
          keyFeatures: features
        };
      });

      setPage2Content(newPage2Content);
      toast.success('Page 2 content generated successfully');

    } catch (error: any) {
      console.error('Error generating Page 2 content:', error);
      toast.error(error.response?.data?.detail || 'Failed to generate Page 2 content');
    } finally {
      setGeneratingPage1(false);
    }
  }, [proposal, extractedData, proposalId]);

  // Currency conversion hook - uses target_currency from proposal
  const convertToCurrency = useCallback(async (amount: number, fromCurrency: string) => {
    try {
      const targetCurrency = proposal?.target_currency || 'MYR';
      const response = await apiClient.get(`/api/v1/exchange-rates/${fromCurrency}/${targetCurrency}`);
      if (response.data.success) {
        const convertedAmount = amount * response.data.rate;
        return {
          success: true,
          amount: convertedAmount,
          rate: response.data.rate,
          targetCurrency: targetCurrency,
          formatted: `${targetCurrency} ${convertedAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
        };
      }
      return { success: false, error: 'Invalid API response' };
    } catch (error: any) {
      console.error('Currency conversion error:', error);
      return { success: false, error: error.message };
    }
  }, [proposal?.target_currency]);

  // Calculate currency conversions for all illustrations (uses target_currency)
  const calculateMYRValues = useCallback(async () => {
    if (!extractedData || extractedData.length === 0) {
      console.log('❌ No extracted data for currency conversion');
      toast.error('No data available for currency conversion');
      return;
    }

    const targetCurrency = proposal?.target_currency || 'MYR';

    // Show unified notification for refresh
    toast.loading(`Refreshing all exchange rates and converting to ${targetCurrency}...`, { id: 'refresh-currencies' });
    console.log(`💱 Calculating ${targetCurrency} values for`, extractedData.length, 'illustrations');
    setLoadingConversions(true);

    try {
      const newConversions: any = {};

    for (const item of extractedData) {
      const illustrationId = item.id;
      const currency = item.comprehensive_data?.currency || item.currency || 'USD';
      const annualPremium = item.comprehensive_data?.premium_per_year_original || item.premium_per_year;
      const totalPremium = item.comprehensive_data?.total_premium;

      console.log(`💱 Processing ${item.original_filename}:`, {
        currency,
        annualPremium,
        totalPremium,
        targetCurrency
      });

      // Convert annual premium
      let annualConversion = { success: false, formatted: `${targetCurrency} 0` };
      if (annualPremium && currency) {
        annualConversion = await convertToCurrency(annualPremium, currency);
      }

      // Convert total premium
      let totalConversion = { success: false, formatted: `${targetCurrency} 0` };
      if (totalPremium && currency) {
        totalConversion = await convertToCurrency(totalPremium, currency);
      }

      // Convert death benefit
      const deathBenefit = item.comprehensive_data?.death_benefit || item.death_benefit;
      let deathBenefitConversion = { success: false, formatted: `${targetCurrency} 0` };
      if (deathBenefit && currency) {
        deathBenefitConversion = await convertToCurrency(deathBenefit, currency);
      }

      newConversions[illustrationId] = {
        conversion: annualConversion,
        total_conversion: totalConversion,
        deathBenefitConversion: deathBenefitConversion
      };
    }

      console.log('✅ Currency conversions calculated:', newConversions);
      setMyConversions(newConversions);

      // Show success notification
      toast.success(`Exchange rates updated successfully to ${targetCurrency} for ${extractedData.length} insurance products`, { id: 'refresh-currencies' });
    } catch (error) {
      console.error('Error during currency conversion:', error);
      toast.error('Failed to refresh exchange rates. Please try again.', { id: 'refresh-currencies' });
    } finally {
      setLoadingConversions(false);
    }
  }, [extractedData, convertToCurrency, proposal?.target_currency]);

  // Auto-generate Page 1 and Page 2 content when all insurances are mapped and content is not already generated
  useEffect(() => {
    if (extractedData && extractedData.length > 0 && proposal) {
      const allMapped = extractedData.every((data: any) => data.matched_insurance_id);
      const noPage1ContentGenerated = !page1Content && !proposalData.clientNeedsSummary && !generatingPage1;
      const noPage2ContentGenerated = Object.keys(page2Content).length === 0;

      if (allMapped && noPage1ContentGenerated) {
        console.log('All insurances mapped, auto-generating Page 1 content...');
        generatePage1Content();
      }

      if (allMapped && noPage2ContentGenerated && !generatingPage1) {
        console.log('All insurances mapped, auto-generating Page 2 content...');
        // Add a small delay to avoid race conditions with Page 1 generation
        setTimeout(() => {
          generatePage2Content();
        }, 2000);
      }
    }
  }, [extractedData, proposal, page1Content, proposalData.clientNeedsSummary, page2Content, generatingPage1]); // Removed function dependencies

  // Fetch currency conversions when extracted data is available
  useEffect(() => {
    console.log('Currency conversion useEffect triggered:', {
      extractedDataExists: !!extractedData,
      extractedDataLength: extractedData?.length,
      completedIllustrations: extractedData?.filter((data: any) => data.extraction_status === 'completed').length,
      extractedData: extractedData
    });

    if (extractedData && extractedData.length > 0) {
      const completedIllustrations = extractedData.filter((data: any) => data.extraction_status === 'completed');
      console.log('Currency conversion check:', {
        totalIllustrations: extractedData.length,
        completedIllustrations: completedIllustrations.length,
        statuses: extractedData.map((d: any) => d.extraction_status)
      });

      if (completedIllustrations.length > 0 && !hasCalculatedInitialRates) {
        console.log('✅ First time illustrations completed - calculating initial currency conversion');
        setHasCalculatedInitialRates(true);
        setTimeout(() => {
          calculateMYRValues();
        }, 1000);
      } else if (completedIllustrations.length > 0) {
        console.log('💱 Currency conversion available via manual refresh button (already calculated once)');
      }
    }
  }, [extractedData, hasCalculatedInitialRates, calculateMYRValues]); // Run when extracted data changes

  // Auto-save highlighted insurance selection
  useEffect(() => {
    if (selectedHighlightedInsurance && extractedData && proposal) {
      const selectedInsurance = extractedData.find(
        (data: any) => data.matched_insurance_id === selectedHighlightedInsurance
      );

      if (selectedInsurance) {
        const updateData = {
          highlighted_insurance_id: selectedInsurance.matched_insurance_id,
          highlighted_insurance_name: selectedInsurance.final_insurance_name ||
                                      selectedInsurance.comprehensive_data?.insurance_name ||
                                      'Selected Insurance'
        };

        // Auto-save to database
        apiClient.put(`/api/v1/proposals/${proposalId}`, updateData)
          .then(() => {
            console.log('Auto-saved highlighted insurance:', updateData);
          })
          .catch(error => {
            console.error('Failed to auto-save highlighted insurance:', error);
          });
      }
    }
  }, [selectedHighlightedInsurance, extractedData, proposal, proposalId]);

  // NOTE: Cash surrender values now use intelligent age selection from Phase 2
  // Ages are selected by LLM based on coverage and client context (typically 60+, 5-year spacing)
  // Falls back to extracted ages if no intelligent analysis, or default [85, 90, 95, 100]

  // Helper function for cash surrender values - INTELLIGENT AGES + VALUES
  const getCashSurrenderAgesAndValues = useCallback((data: any, originalData: any, isEditMode: boolean = false) => {
    console.log('getCashSurrenderAgesAndValues called - DYNAMIC AGES MODE:', {
      isEditMode,
      hasLocalEditState: !!data.cash_surrender_values,
      hasUserEditedData: !!data.user_edited_data?.cash_surrender_values,
      proposalStatus: proposal?.status,
      hasIntelligentAnalysis: !!proposal?.intelligent_cash_analysis
    });

    // Check if Phase 2 is processing (ready_for_age_analysis status but no intelligent_cash_analysis yet)
    if (proposal?.status === 'ready_for_age_analysis' && !proposal?.intelligent_cash_analysis && !isEditMode) {
      console.log('🤖 PHASE 2 PROCESSING: Returning loading state for cash surrender values');
      return 'PHASE_2_LOADING'; // Special return value to indicate loading state
    }

    // Helper function to ensure data is a valid array
    const ensureArrayFormat = (rawData: any, source: string): any[] | null => {
      console.log(`🔧 ensureArrayFormat - ${source}:`, rawData, typeof rawData);

      // Special debug for string data to see the actual content
      if (typeof rawData === 'string') {
        console.log(`🔍 STRING DEBUG - ${source} raw string:`, JSON.stringify(rawData));
        console.log(`🔍 STRING DEBUG - ${source} string length:`, rawData.length);
        console.log(`🔍 STRING DEBUG - ${source} first 50 chars:`, rawData.substring(0, 50));
      }

      if (Array.isArray(rawData)) {
        console.log(`✅ ${source} is already an array`);
        return rawData;
      }

      if (typeof rawData === 'string') {
        try {
          // First attempt: direct JSON parse
          const parsed = JSON.parse(rawData);
          if (Array.isArray(parsed)) {
            console.log(`✅ ${source} parsed from string to array`);
            return parsed;
          }
        } catch (e) {
          console.log(`❌ ${source} failed direct JSON parse:`, e);

          // Second attempt: try to fix common JSON issues
          try {
            // Fix common JSON string issues (double quotes, escaping, etc.)
            let fixedData = rawData.trim();

            // Remove outer quotes if double-quoted
            if (fixedData.startsWith('"') && fixedData.endsWith('"')) {
              fixedData = fixedData.slice(1, -1);
            }

            // Unescape common escape sequences
            fixedData = fixedData.replace(/\\"/g, '"').replace(/\\\\/g, '\\');

            const parsed = JSON.parse(fixedData);
            if (Array.isArray(parsed)) {
              console.log(`✅ ${source} parsed from fixed string to array`);
              return parsed;
            }
          } catch (e2) {
            console.log(`❌ ${source} failed fixed JSON parse:`, e2);
          }

          // Third attempt: Convert Python dictionary format to JSON
          try {
            let pythonToJson = rawData.trim();

            // Convert Python dictionary format to JSON format
            // Replace single quotes with double quotes, but be careful with quotes inside strings
            pythonToJson = pythonToJson
              .replace(/'/g, '"')  // Replace all single quotes with double quotes
              .replace(/True/g, 'true')  // Python True -> JSON true
              .replace(/False/g, 'false')  // Python False -> JSON false
              .replace(/None/g, 'null');  // Python None -> JSON null

            console.log(`🔧 PYTHON->JSON conversion attempt for ${source}:`, pythonToJson);

            const parsed = JSON.parse(pythonToJson);
            if (Array.isArray(parsed)) {
              console.log(`✅ ${source} converted from Python format to JSON array`);
              return parsed;
            }
          } catch (e3) {
            console.log(`❌ ${source} failed Python->JSON conversion:`, e3);
          }
        }
      }

      console.log(`❌ ${source} is not array-compatible`);
      return null;
    };

    // 1. EDIT MODE: Check for local edit state first (user is typing)
    if (isEditMode && data.cash_surrender_values) {
      console.log('EDIT MODE: Checking local edit state:', data.cash_surrender_values);
      const localData = ensureArrayFormat(data.cash_surrender_values, 'local edit state');
      if (localData) {
        // Limit to 4 ages for proposal builder display
        const limitedData = localData.slice(0, 4);
        console.log('EDIT MODE: Returning local edit state (limited to 4 ages):', limitedData);
        return limitedData;
      }
    }

    // 2. Check for saved user edits (from database)
    console.log('🔍 STEP 2 - Checking user_edited_data:', {
      hasUserEditedData: !!data.user_edited_data,
      userEditedDataKeys: data.user_edited_data ? Object.keys(data.user_edited_data) : 'none',
      hasCashSurrenderValues: !!data.user_edited_data?.cash_surrender_values,
      cashSurrenderValues: data.user_edited_data?.cash_surrender_values
    });

    if (data.user_edited_data?.cash_surrender_values) {
      console.log('Checking saved user_edited_data cash surrender values:', data.user_edited_data.cash_surrender_values);
      const userData = ensureArrayFormat(data.user_edited_data.cash_surrender_values, 'user_edited_data');
      if (userData) {
        // Limit to 4 ages for proposal builder display
        const limitedData = userData.slice(0, 4);
        console.log('Returning user_edited_data cash surrender values (limited to 4 ages):', limitedData);
        return limitedData;
      }
    }

    // 3. Use intelligent ages with extracted comprehensive data
    if (proposal?.intelligent_cash_analysis?.selected_ages) {
      const intelligentAges = proposal.intelligent_cash_analysis.selected_ages;
      console.log('🤖 Using intelligent selected ages:', intelligentAges);

      // Get extracted cash values from comprehensive_data
      const extractedValues = originalData?.comprehensive_data?.cash_surrender_values;
      console.log('📊 Extracted cash surrender values:', extractedValues);

      if (extractedValues) {
        const extractedData = ensureArrayFormat(extractedValues, 'comprehensive_data');
        console.log('📊 Parsed extracted data:', extractedData);

        if (extractedData && extractedData.length > 0) {
          // Map intelligent ages to their corresponding values
          const mappedValues = intelligentAges.map(selectedAge => {
            // Find the value for this age in extracted data
            const match = extractedData.find((item: any) => {
              const itemAge = typeof item.age === 'string' ? parseInt(item.age, 10) : item.age;
              return itemAge === selectedAge;
            });

            if (match) {
              console.log(`✅ Matched age ${selectedAge} with value:`, match.value);
              return { age: selectedAge, value: match.value };
            } else {
              console.log(`⚠️ No match found for age ${selectedAge}, using '-'`);
              return { age: selectedAge, value: '-' };
            }
          });

          console.log('🎯 INTELLIGENT AGES + VALUES:', mappedValues);
          return mappedValues;
        }
      }

      // If we have intelligent ages but no values, show ages with '-'
      console.log('🤖 Using intelligent ages without values (will show \'-\')');
      return intelligentAges.map(age => ({ age, value: '-' }));
    }

    // 4. Fallback to extracted data without intelligent ages (legacy behavior)
    if (originalData?.comprehensive_data?.cash_surrender_values && originalData.comprehensive_data.cash_surrender_values.length > 0) {
      const extractedValues = originalData.comprehensive_data.cash_surrender_values;
      console.log('Using extracted values with dynamic ages (no intelligent analysis):', extractedValues);
      const extractedData = ensureArrayFormat(extractedValues, 'comprehensive_data');
      if (extractedData && extractedData.length > 0) {
        // Limit to 4 ages for proposal builder display
        const limitedData = extractedData.slice(0, 4);
        console.log('Returning comprehensive_data cash surrender values (limited to 4 ages):', limitedData);
        return limitedData;
      }
    }

    // 5. Final fallback: default ages if no data exists (start with common ages but user can edit)
    console.log('No extracted data or intelligent analysis, using default ages 85, 90, 95, 100 (user can customize)');
    const fallbackResult = [
      { age: 85, value: '-' },
      { age: 90, value: '-' },
      { age: 95, value: '-' },
      { age: 100, value: '-' }
    ];

    // Final safety check - ensure we always return an array
    console.log('PROTOTYPE: Final return value:', fallbackResult);
    return fallbackResult;
  }, [proposal?.status, proposal?.intelligent_cash_analysis]);

  // Edit mode functions for insurance cards
  const enterEditMode = useCallback((illustrationId: string, currentData: any) => {
    // Get synchronized client details from any illustration that has them saved
    const getSharedClientDetails = () => {
      // CRITICAL FIX: Always use DOB-calculated age as the primary source
      const dobAge = calculatedAge !== null ? String(calculatedAge) : '';
      console.log('👥 Using DOB-calculated age:', dobAge, 'from calculatedAge:', calculatedAge);

      if (!extractedData || extractedData.length === 0) {
        return {
          client_age: dobAge || getFieldValue(currentData, 'client_age', ''),
          gender: getFieldValue(currentData, 'gender', 'Unknown'),
          smoker_status: getFieldValue(currentData, 'smoker_status', 'Unknown')
        };
      }

      // Look for client details in any illustration (they should be the same across all)
      for (const item of extractedData) {
        const savedGender = getFieldValue(item, 'gender');
        const savedSmokerStatus = getFieldValue(item, 'smoker_status');

        // If we find saved client details anywhere, use them BUT always use DOB age
        if (savedGender !== 'Unknown' || savedSmokerStatus !== 'Unknown') {
          console.log('👥 Using synchronized client details from illustration:', item.id, 'with DOB age:', dobAge);
          return {
            client_age: dobAge || getFieldValue(currentData, 'client_age', ''),
            gender: savedGender || getFieldValue(currentData, 'gender', 'Unknown'),
            smoker_status: savedSmokerStatus || getFieldValue(currentData, 'smoker_status', 'Unknown')
          };
        }
      }

      // Fallback to current data but always use DOB age
      return {
        client_age: dobAge || getFieldValue(currentData, 'client_age', ''),
        gender: getFieldValue(currentData, 'gender', 'Unknown'),
        smoker_status: getFieldValue(currentData, 'smoker_status', 'Unknown')
      };
    };

    const sharedClientDetails = getSharedClientDetails();

    setEditMode(prev => ({ ...prev, [illustrationId]: true }));
    setEditData(prev => ({
      ...prev,
      [illustrationId]: {
        insurance_name: getFieldValue(currentData, 'insurance_name', currentData.final_insurance_name || ''),
        insurance_provider: getFieldValue(currentData, 'insurance_provider', ''),
        currency: getFieldValue(currentData, 'currency', 'USD'),
        premium_per_year: getFieldValue(currentData, 'premium_per_year', ''),
        death_benefit: getFieldValue(currentData, 'death_benefit', ''),
        payment_period: getFieldValue(currentData, 'payment_period', ''),
        coverage_term: getFieldValue(currentData, 'coverage_term', ''),
        total_premium: getFieldValue(currentData, 'total_premium', ''),
        has_cash_value: getFieldValue(currentData, 'has_cash_value', false),
        breakeven_years: getFieldValue(currentData, 'breakeven_years', ''),
        // Initialize cash surrender values from saved data
        cash_surrender_values: (() => {
          const savedCashValues = getFieldValue(currentData, 'cash_surrender_values');
          console.log('🔧 ENTER EDIT MODE - Loading cash surrender values:', {
            illustrationId,
            savedCashValues,
            type: typeof savedCashValues,
            isArray: Array.isArray(savedCashValues),
            currentDataKeys: currentData ? Object.keys(currentData) : 'no currentData',
            userEditedDataKeys: currentData?.user_edited_data ? Object.keys(currentData.user_edited_data) : 'no user_edited_data'
          });
          return savedCashValues;
        })(),
        // Use synchronized client details
        ...sharedClientDetails
      }
    }));
  }, [extractedData, calculatedAge]);

  const cancelEdit = useCallback((illustrationId: string) => {
    setEditMode(prev => ({ ...prev, [illustrationId]: false }));
    setEditData(prev => {
      const newData = { ...prev };
      delete newData[illustrationId];
      return newData;
    });
  }, []);

  const updateEditField = useCallback((illustrationId: string, field: string, value: any) => {
    setEditData(prev => ({
      ...prev,
      [illustrationId]: {
        ...prev[illustrationId],
        [field]: value
      }
    }));
  }, []);

  const saveChanges = useCallback(async (illustrationId: string) => {
    if (!editData[illustrationId]) return;

    setSavingChanges(prev => ({ ...prev, [illustrationId]: true }));

    try {
      const updateData = { ...editData[illustrationId] };

      // Calculate and save converted currency values if premium amounts or currency changed
      const currency = updateData.currency;
      const premiumPerYear = updateData.premium_per_year;
      const totalPremium = updateData.total_premium;
      const deathBenefit = updateData.death_benefit;

      if (currency && (premiumPerYear || totalPremium || deathBenefit)) {
        console.log('💱 Calculating conversions for user edited values...');

        // Calculate conversions for edited values
        const conversions: any = {};

        if (premiumPerYear) {
          const annualConversion = await convertToCurrency(parseFloat(premiumPerYear), currency);
          if (annualConversion.success) {
            conversions.premium_per_year_myr = annualConversion.amount;
            conversions.premium_per_year_myr_formatted = annualConversion.formatted;
          }
        }

        if (totalPremium) {
          const totalConversion = await convertToCurrency(parseFloat(totalPremium), currency);
          if (totalConversion.success) {
            conversions.total_premium_myr = totalConversion.amount;
            conversions.total_premium_myr_formatted = totalConversion.formatted;
          }
        }

        if (deathBenefit) {
          const deathConversion = await convertToCurrency(parseFloat(deathBenefit), currency);
          if (deathConversion.success) {
            conversions.death_benefit_myr = deathConversion.amount;
            conversions.death_benefit_myr_formatted = deathConversion.formatted;
          }
        }

        // Add timestamp for when conversions were calculated
        conversions.conversion_timestamp = new Date().toISOString();
        conversions.conversion_currency = currency;

        // Merge conversions into updateData
        Object.assign(updateData, conversions);
        console.log('💱 Added converted values to save data:', conversions);
      }

      // CRITICAL FIX: Exclude cash_surrender_values from save operation
      // Cash surrender values should only be managed by LLM intelligent age harmonization system
      const { cash_surrender_values, ...updateDataWithoutCashValues } = updateData;

      if (cash_surrender_values) {
        console.log('⚠️ SAVE PROTECTION: Excluding cash_surrender_values from save operation to preserve LLM-selected ages');
      }

      // Backend expects flat structure (NOT wrapped in user_edited_data)
      // The backend will handle saving to user_edited_data column
      console.log('🔍 DEBUG: Sending update data to backend:', JSON.stringify(updateDataWithoutCashValues, null, 2));
      console.log('💾 SAVE DEBUG - Keys being saved:', Object.keys(updateDataWithoutCashValues));
      console.log('💾 SAVE DEBUG - Cash surrender values excluded:', !!cash_surrender_values);

      const response = await apiClient.put(`/api/v1/proposals/${proposalId}/illustrations/${illustrationId}`, updateDataWithoutCashValues);
      console.log('🔍 DEBUG: Save response:', response.data);

      // Check if client details were updated - if so, sync across all illustrations
      const clientDetailFields = ['client_age', 'gender', 'smoker_status'];
      const clientDetailsChanged = clientDetailFields.some(field => updateData.hasOwnProperty(field));

      console.log('🔍 CLIENT SYNC DEBUG - Checking if client details changed:', {
        clientDetailsChanged,
        updateDataKeys: Object.keys(updateData),
        clientDetailFields,
        hasClientAge: updateData.hasOwnProperty('client_age'),
        hasGender: updateData.hasOwnProperty('gender'),
        hasSmokerStatus: updateData.hasOwnProperty('smoker_status'),
        updateDataValues: {
          client_age: updateData.client_age,
          gender: updateData.gender,
          smoker_status: updateData.smoker_status
        }
      });

      if (response.data.success && clientDetailsChanged) {
        console.log('👥 Client details changed - syncing across all illustrations...');

        // Extract only the client detail updates
        const clientDetailsToSync = {};
        clientDetailFields.forEach(field => {
          if (updateData.hasOwnProperty(field)) {
            clientDetailsToSync[field] = updateData[field];
          }
        });

        // Get all other illustration IDs from extractedData
        const otherIllustrationIds = extractedData
          .filter((data: any) => data.id !== illustrationId)
          .map((data: any) => data.id);

        console.log('👥 CLIENT SYNC DEBUG - Syncing client details to illustrations:', otherIllustrationIds, 'with data:', clientDetailsToSync);

        // Update all other illustrations with the same client details
        const syncPromises = otherIllustrationIds.map(async (otherIllustrationId: string) => {
          try {
            // Send flat structure - backend handles user_edited_data internally
            console.log(`👥 CLIENT SYNC DEBUG - Sending sync request to illustration ${otherIllustrationId}:`, clientDetailsToSync);
            const syncResponse = await apiClient.put(`/api/v1/proposals/${proposalId}/illustrations/${otherIllustrationId}`, clientDetailsToSync);
            console.log(`✅ CLIENT SYNC DEBUG - Synced client details to illustration ${otherIllustrationId}, response:`, syncResponse.data);
          } catch (syncError) {
            console.error(`❌ CLIENT SYNC DEBUG - Failed to sync client details to illustration ${otherIllustrationId}:`, syncError);
            console.error('Error response:', syncError.response?.data);
          }
        });

        // Wait for all sync operations to complete
        await Promise.all(syncPromises);
        console.log('👥 CLIENT SYNC DEBUG - All sync operations completed, waiting for database to commit...');

        // Wait a bit for database to commit all changes
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log('👥 CLIENT SYNC DEBUG - Database commit wait complete');

        // Show success message for sync
        if (otherIllustrationIds.length > 0) {
          toast.success(`🔗 Client details synced across ${otherIllustrationIds.length + 1} insurance cards!`);
        }
      }

      // Check if cash surrender value ages were updated - if so, sync ages across all illustrations
      const cashSurrenderValuesChanged = updateData.hasOwnProperty('cash_surrender_values');

      if (response.data.success && cashSurrenderValuesChanged) {
        console.log('📊 Cash surrender value ages changed - syncing ages across all illustrations...');

        // Extract ages from the updated cash surrender values
        const updatedCashValues = updateData.cash_surrender_values;
        let updatedAges: number[] = [];

        if (updatedCashValues) {
          try {
            // Handle both string and array formats
            let cashValuesArray = updatedCashValues;
            if (typeof updatedCashValues === 'string') {
              cashValuesArray = JSON.parse(updatedCashValues);
            }

            if (Array.isArray(cashValuesArray)) {
              updatedAges = cashValuesArray
                .map((item: any) => item.age ? parseInt(item.age) : null)
                .filter((age: number | null) => age !== null && age >= 60 && age <= 120)
                .sort((a: number, b: number) => a - b);

              console.log('📊 Extracted ages for synchronization:', updatedAges);
            }
          } catch (error) {
            console.error('❌ Failed to extract ages from cash surrender values:', error);
          }
        }

        if (updatedAges.length > 0) {
          // Get all other illustration IDs from extractedData
          const otherIllustrationIds = extractedData
            .filter((data: any) => data.id !== illustrationId)
            .map((data: any) => data.id);

          console.log('📊 Syncing ages to illustrations:', otherIllustrationIds, 'with ages:', updatedAges);

          // Update all other illustrations with the same ages (but keep their individual values)
          const ageSyncPromises = otherIllustrationIds.map(async (otherIllustrationId: string) => {
            try {
              // Get the current cash surrender values for this illustration
              const otherIllustrationData = extractedData.find((data: any) => data.id === otherIllustrationId);

              if (otherIllustrationData) {
                // Get existing cash surrender values
                let existingCashValues = [];
                const userData = otherIllustrationData.user_edited_data;
                const comprehensiveData = otherIllustrationData.comprehensive_data;

                // Try to get existing values (priority: user_edited_data > comprehensive_data)
                let sourceCashValues = userData?.cash_surrender_values || comprehensiveData?.cash_surrender_values;

                if (sourceCashValues) {
                  try {
                    if (typeof sourceCashValues === 'string') {
                      sourceCashValues = JSON.parse(sourceCashValues);
                    }
                    if (Array.isArray(sourceCashValues)) {
                      existingCashValues = sourceCashValues;
                    }
                  } catch (error) {
                    console.error('❌ Failed to parse existing cash values for illustration:', otherIllustrationId, error);
                  }
                }

                // Create new cash surrender values with synchronized ages but preserve individual values
                const syncedCashValues = updatedAges.map((age: number) => {
                  // Try to find existing value for this age
                  const existingEntry = existingCashValues.find((entry: any) => parseInt(entry.age) === age);
                  return {
                    age: age,
                    value: existingEntry?.value || '-' // Keep existing value or default to '-'
                  };
                });

                // Wrap ages synchronization in user_edited_data structure
                const wrappedAgeSync = {
                  user_edited_data: {
                    cash_surrender_values: syncedCashValues
                  }
                };

                await apiClient.put(`/api/v1/proposals/${proposalId}/illustrations/${otherIllustrationId}`, wrappedAgeSync);
                console.log(`✅ Synced ages to illustration ${otherIllustrationId}:`, syncedCashValues);
              }
            } catch (syncError) {
              console.error(`❌ Failed to sync ages to illustration ${otherIllustrationId}:`, syncError);
            }
          });

          // Wait for all age sync operations to complete
          await Promise.all(ageSyncPromises);
          console.log('📊 Age synchronization completed');

          // Show success message for age sync
          if (otherIllustrationIds.length > 0) {
            toast.success(`📊 Cash surrender value ages synced across ${otherIllustrationIds.length + 1} insurance cards!`);
          }
        }
      }

      if (response.data.success) {
        // Exit edit mode first
        setEditMode(prev => ({ ...prev, [illustrationId]: false }));
        setEditData(prev => {
          const newData = { ...prev };
          delete newData[illustrationId];
          return newData;
        });

        toast.success('Changes saved successfully!');

        console.log('👥 CLIENT SYNC DEBUG - Reloading extracted data from database...');
        // Reload extracted data to get the updated values from the database
        await handleManageIllustrations(true);
        console.log('👥 CLIENT SYNC DEBUG - Data reload complete. Check if UI updated with synced values.');

        // No need to recalculate conversions since we saved converted values
      }
    } catch (error: any) {
      console.error('Error saving changes:', error);
      console.error('Error details:', error.response?.data);

      // Handle 404 for illustrations - they might have been deleted
      if (error.response?.status === 404) {
        console.log('Illustration not found - it may have been deleted');
        toast.warning('Illustration was not found - it may have been deleted. Please refresh the page.');
        return;
      }

      toast.error(error.response?.data?.detail || 'Failed to save changes');
    } finally {
      setSavingChanges(prev => ({ ...prev, [illustrationId]: false }));
    }
  }, [editData, proposalId]);

  // Save proposal draft
  const handleSaveDraft = useCallback(async () => {
    try {
      const updateData: any = {
        client_name: proposalData.clientName,
        client_dob: proposalData.clientDob,
        client_needs: proposalData.clientNeedsSummary
      };

      // Add highlighted insurance data if selected
      if (selectedHighlightedInsurance && extractedData) {
        const selectedInsurance = extractedData.find(
          (data: any) => data.matched_insurance_id === selectedHighlightedInsurance
        );

        if (selectedInsurance) {
          updateData.highlighted_insurance_id = selectedInsurance.matched_insurance_id;
          updateData.highlighted_insurance_name = selectedInsurance.final_insurance_name ||
                                                  selectedInsurance.comprehensive_data?.insurance_name ||
                                                  'Selected Insurance';
        }
      }

      await apiClient.put(`/api/v1/proposals/${proposalId}`, updateData);
      toast.success('Draft saved successfully');
    } catch (error: any) {
      console.error('Error saving draft:', error);

      // Handle 409 Conflict - proposal might not exist, redirect to create new one
      if (error.response?.status === 409) {
        console.log('Proposal conflict - redirecting to create new proposal');
        toast.warning('Proposal state conflict. Redirecting to create a new proposal...');
        window.location.href = '/proposals?tab=create';
        return;
      }

      toast.error('Failed to save draft');
    }
  }, [proposalData.clientName, proposalData.clientDob, proposalData.clientNeedsSummary, selectedHighlightedInsurance, extractedData, proposalId]);

  // Generate final proposal
  const handleGenerateProposal = useCallback(async () => {
    try {
      // Validation: Ensure we have required data
      if (!proposal || !extractedData || extractedData.length === 0) {
        toast.error('Please ensure you have uploaded illustrations and mapped them to insurance products');
        return;
      }

      // Check if we have mapped insurance assignments - look in multiple places
      const mappedIllustrations = extractedData.filter(data => {
        // Check if there's an insurance assignment
        if (data.insurance_assignment?.insurance_id) {
          return true;
        }

        // Check if there's user_edited_data with insurance_name (indicates mapping completed)
        if (data.user_edited_data?.insurance_name) {
          return true;
        }

        // Check if there's comprehensive_data with insurance_name
        if (data.comprehensive_data?.insurance_name) {
          return true;
        }

        return false;
      });

      if (mappedIllustrations.length === 0) {
        console.log('❌ No mapped illustrations found. Available extractedData:', extractedData);
        toast.error('Please map at least one illustration to an insurance product');
        return;
      }

      console.log('✅ Found mapped illustrations:', mappedIllustrations.length, mappedIllustrations);

      // Auto-save any pending changes before generating
      await handleSaveDraft();

      toast('Generating proposal... This may take a moment');

      // Prepare generation request - backend expects proposal_id and generation_type only
      // All other data (client, illustrations, etc.) is pulled from the database
      const generationData = {
        proposal_id: proposalId as string,
        generation_type: 'complete'
      };

      console.log('Generating proposal with data:', generationData);

      // Call backend API to generate proposal
      const response = await apiClient.post(`/api/v1/proposals/${proposalId}/generate`, generationData);

      if (response.data.success) {
        toast.success('Proposal generated successfully!');

        // Open proposal preview in new tab so user can review while keeping builder page open
        const previewUrl = `/proposals/${proposalId}/preview`;
        window.open(previewUrl, '_blank');
      } else {
        throw new Error(response.data.message || 'Failed to generate proposal');
      }

    } catch (error: any) {
      console.error('Error generating proposal:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to generate proposal';
      toast.error(errorMessage);
    }
  }, [handleSaveDraft, proposal, extractedData, proposalId, user?.user_id]);

  // =============================================================================
  // AUTOMATIC STATUS POLLING SYSTEM
  // =============================================================================

  // Determine if we should be polling based on current status
  const shouldPoll = useCallback((currentProposal: Proposal | null, currentExtractedData: any) => {
    if (!currentProposal) return false;

    // IMPORTANT: Never restart polling if we've already shown completion notification (use ref for synchronous check)
    if (hasShownCompletionRef.current) {
      console.log('🛑 POLLING: Completion notification already shown, will not restart polling');
      return false;
    }

    // Check if proposal is in processing state
    if (currentProposal.status === 'extracting') {
      console.log('🔍 POLLING: Proposal status is extracting');
      return true;
    }

    // Check if Phase 2 is processing (ready_for_age_analysis but no intelligent_cash_analysis yet)
    if (currentProposal.status === 'ready_for_age_analysis' && !currentProposal.intelligent_cash_analysis) {
      console.log('🤖 POLLING: Phase 2 age analysis in progress');
      return true;
    }

    // Check if any illustrations are still processing
    const hasProcessingIllustrations = currentProposal.illustrations?.some(ill =>
      ill.extraction_status === 'processing'
    );

    if (hasProcessingIllustrations) {
      console.log('🔍 POLLING: Found processing illustrations');
      return true;
    }

    // Check extracted data for cash extraction status
    if (currentExtractedData && Array.isArray(currentExtractedData)) {
      const hasCashProcessing = currentExtractedData.some((data: any) =>
        data.cash_extraction_status === 'extracting' || data.cash_extraction_status === 'pending'
      );

      if (hasCashProcessing) {
        console.log('🔍 POLLING: Found cash extraction still processing');
        return true;
      }
    }

    console.log('🔍 POLLING: No processing activities detected');
    return false;
  }, []); // Ref doesn't need to be in dependencies

  // Targeted data refresh for polling
  const pollProcessingStatus = useCallback(async () => {
    try {
      console.log('📡 POLLING: Checking for status updates...');
      setPollingRetryCount(0); // Reset on successful attempt

      // 1. Check proposal status
      const proposalResponse = await apiClient.get(`/api/v1/proposals/${proposalId}`);
      const updatedProposal = proposalResponse.data.data;

      // 2. Check extracted data if we're showing it
      let updatedExtractedData = extractedData;
      if (showExtractedData || shouldPoll(updatedProposal, extractedData)) {
        const timestamp = new Date().getTime();
        const extractedResponse = await apiClient.get(`/api/v1/proposals/${proposalId}/illustrations/extracted-data?t=${timestamp}`);
        updatedExtractedData = extractedResponse.data.data || extractedResponse.data;
      }

      // Update data and continue polling if needed

      // Update state
      setProposal(updatedProposal);
      if (showExtractedData || updatedExtractedData !== extractedData) {
        setExtractedData(updatedExtractedData);
      }
      setLastPollTime(new Date());

      console.log('✅ POLLING: Status updated successfully');

      // Check if we should stop polling
      if (!shouldPoll(updatedProposal, updatedExtractedData)) {
        console.log('🛑 POLLING: Processing complete, stopping auto-polling');

        // Show completion notification only once using ref (synchronous check)
        if (!hasShownCompletionRef.current) {
          console.log('🎉 POLLING: Showing completion notification for the first time');
          hasShownCompletionRef.current = true; // Set ref immediately (synchronous)
          setHasShownCompletionNotification(true); // Update state for UI
          toast.success('🎉 Processing completed! All illustrations are ready.');
        } else {
          console.log('⏭️ POLLING: Completion notification already shown, skipping toast');
        }

        // Stop polling AFTER showing notification
        stopPolling();

        // Currency conversion available via manual refresh button
        console.log('💱 POLLING: Processing complete, currency conversion available via manual refresh');
      }

    } catch (error: any) {
      console.error('❌ POLLING ERROR:', error);

      // Handle polling errors with retry logic
      if (pollingRetryCount < 3) {
        setPollingRetryCount(prev => prev + 1);
        console.log(`🔄 POLLING: Retrying... attempt ${pollingRetryCount + 1}/3`);
      } else {
        console.log('🛑 POLLING: Max retries reached, stopping polling');
        stopPolling();
        toast.error('Auto-refresh failed. Please refresh manually if needed.');
      }
    }
  }, [proposalId, extractedData, showExtractedData, shouldPoll, pollingRetryCount]);

  // Start polling
  const startPolling = useCallback(() => {
    if (isPolling || pollInterval) return; // Already polling

    // Don't start polling if completion notification has been shown (use ref for synchronous check)
    if (hasShownCompletionRef.current) {
      console.log('🛑 POLLING: Not starting - completion notification already shown');
      return;
    }

    console.log('🚀 POLLING: Starting auto-status polling');
    setIsPolling(true);

    // Initial immediate check
    pollProcessingStatus();

    // Set up interval - 5 seconds for responsive updates
    const interval = setInterval(pollProcessingStatus, 5000);
    setPollInterval(interval);

    toast.success('🔄 Auto-refresh enabled for real-time updates');
  }, [isPolling, pollInterval, pollProcessingStatus]); // Ref doesn't need to be in dependencies

  // Stop polling
  const stopPolling = useCallback(() => {
    console.log('🛑 POLLING: Stopping auto-status polling');

    if (pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }

    setIsPolling(false);
    setPollingRetryCount(0);
  }, [pollInterval]);

  // Auto-start polling when processing begins
  useEffect(() => {
    if (proposal && !isPolling && !hasShownCompletionNotification) {
      if (shouldPoll(proposal, extractedData)) {
        console.log('🔄 POLLING: Auto-starting polling due to processing state');
        startPolling();
      } else {
        console.log('🔍 POLLING: No need to start polling - processing complete');
      }
    }
  }, [proposal, extractedData, isPolling, shouldPoll, startPolling, hasShownCompletionNotification]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [pollInterval]);

  // Manual refresh with polling restart
  const handleManualRefresh = useCallback(async () => {
    console.log('🔄 MANUAL REFRESH: Force refreshing status');

    // Stop current polling
    stopPolling();

    // Do manual refresh
    await loadProposal();

    // Refresh extracted data if currently shown
    if (showExtractedData) {
      try {
        setLoadingExtractedData(true);
        const timestamp = new Date().getTime();
        const response = await apiClient.get(`/api/v1/proposals/${proposalId}/illustrations/extracted-data?t=${timestamp}`);
        const data = response.data.data || response.data;
        setExtractedData(data);
      } catch (error) {
        console.error('Error refreshing extracted data:', error);
        toast.error('Failed to refresh illustration data');
      } finally {
        setLoadingExtractedData(false);
      }
    }

    // Restart polling only if processing is still active and we haven't shown completion notification
    setTimeout(() => {
      if (shouldPoll(proposal, extractedData) && !hasShownCompletionNotification) {
        console.log('🔄 POLLING: Restarting polling after manual refresh');
        startPolling();
      } else {
        console.log('🔍 POLLING: No need to restart polling after manual refresh - processing complete');
      }
    }, 1000);

    toast.success('Status refreshed manually');
  }, [stopPolling, loadProposal, showExtractedData, proposalId, shouldPoll, proposal, extractedData, startPolling, hasShownCompletionNotification]);

  // =============================================================================
  // END AUTOMATIC STATUS POLLING SYSTEM
  // =============================================================================

  // File upload handling
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!proposal) return;

    // Check file limits
    if (acceptedFiles.length + proposal.illustrations.length > 5) {
      toast.error('Maximum 5 illustrations allowed per proposal');
      return;
    }

    setUploading(true);
    
    try {
      // Validate minimum 2 files requirement
      if (acceptedFiles.length < 2) {
        toast.error('Please select at least 2 PDF files to upload');
        return;
      }

      // Upload all files together as the backend expects
      const formData = new FormData();
      
      acceptedFiles.forEach((file) => {
        formData.append('files', file);
      });
      
      await apiClient.post(`/api/v1/proposals/${proposalId}/illustrations`, formData);
      toast.success(`Successfully uploaded ${acceptedFiles.length} illustrations`);
      
      // Reload proposal data
      await loadProposal();
      
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
    }
  }, [proposal, proposalId, loadProposal]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxSize: 15 * 1024 * 1024, // 15MB
    disabled: uploading || (proposal?.illustrations.length || 0) >= 5
  });

  // Manual insurance assignment
  const handleManualAssignment = async () => {
    if (!manualAssignment) return;

    try {
      await apiClient.put(`/api/v1/proposals/${proposalId}/illustrations/${manualAssignment.illustrationId}/assign`, {
        insurance_name: manualAssignment.insuranceName,
      });

      // CRITICAL FIX: Sync client age from DOB to all illustrations after mapping
      if (calculatedAge !== null) {
        console.log('🔗 Syncing DOB-calculated age after insurance assignment:', calculatedAge);

        // Update the newly assigned illustration with DOB age
        await apiClient.put(`/api/v1/proposals/${proposalId}/illustrations/${manualAssignment.illustrationId}`, {
          user_edited_data: {
            client_age: String(calculatedAge)
          }
        });

        // Sync to all other illustrations as well to ensure consistency
        const currentExtractedData = await apiClient.get(`/api/v1/proposals/${proposalId}/illustrations/extracted-data`);
        const otherIllustrationIds = currentExtractedData.data
          .filter((data: any) => data.id !== manualAssignment.illustrationId)
          .map((data: any) => data.id);

        console.log('🔗 Syncing DOB age to other illustrations:', otherIllustrationIds);

        const syncPromises = otherIllustrationIds.map(async (illustrationId: string) => {
          try {
            await apiClient.put(`/api/v1/proposals/${proposalId}/illustrations/${illustrationId}`, {
              user_edited_data: {
                client_age: String(calculatedAge)
              }
            });
          } catch (syncError) {
            console.error(`Failed to sync age to illustration ${illustrationId}:`, syncError);
          }
        });

        await Promise.all(syncPromises);
        console.log('✅ Age synchronization completed after insurance assignment');
      }

      toast.success('Insurance assigned successfully');
      setManualAssignment(null);
      await loadProposal();
    } catch (error: any) {
      console.error('Error assigning insurance:', error);
      toast.error(error.detail || 'Failed to assign insurance');
    }
  };

  // Delete illustration
  const handleDeleteIllustration = async (illustrationId: string, filename: string) => {
    if (!proposal) return;

    const confirmDelete = window.confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`);
    if (!confirmDelete) return;

    try {
      await apiClient.delete(`/api/v1/proposals/${proposalId}/illustrations/${illustrationId}`);
      toast.success('Illustration deleted successfully');
      await loadProposal();
    } catch (error: any) {
      console.error('Error deleting illustration:', error);
      toast.error(error.detail || 'Failed to delete illustration');
    }
  };

  const handleCancelProcessing = async () => {
    if (!proposal) return;

    const confirmCancel = window.confirm(
      `Are you sure you want to cancel all processing and delete all illustrations? This will reset the proposal to draft status and remove all uploaded files. This action cannot be undone.`
    );
    if (!confirmCancel) return;

    try {
      await apiClient.post(`/api/v1/proposals/${proposalId}/illustrations/cancel-processing`);
      toast.success('Processing cancelled and proposal reset to draft');
      await loadProposal();
    } catch (error: any) {
      console.error('Error cancelling processing:', error);
      toast.error(error.detail || 'Failed to cancel processing');
    }
  };

  // Load extracted data
  const handleManageIllustrations = async (forceRefresh: boolean = false, autoLoad: boolean = false) => {
    console.log('🔄 handleManageIllustrations called:', {
      showExtractedData,
      forceRefresh,
      autoLoad,
      action: showExtractedData && !forceRefresh ? 'HIDE' : 'LOAD_AND_SHOW'
    });

    if (showExtractedData && !forceRefresh) {
      console.log('🔒 Hiding extracted data');
      setShowExtractedData(false);
      return;
    }

    setLoadingExtractedData(true);
    try {
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await apiClient.get(`/api/v1/proposals/${proposalId}/illustrations/extracted-data?t=${timestamp}`);
      console.log('API response:', response.data); // Debug log
      // The API returns {success: true, data: [...]}
      const data = response.data.data || response.data;
      console.log('🔍 DEBUG: Extracted data array:', data);

      // Debug: Check user_edited_data in the response
      data.forEach((item: any, index: number) => {
        console.log(`🔍 DEBUG: Item ${index} user_edited_data:`, item.user_edited_data);
        console.log(`🔍 DEBUG: Item ${index} comprehensive_data:`, item.comprehensive_data);
        console.log(`🔍 DEBUG: Item ${index} getFieldValue('client_age'):`, getFieldValue(item, 'client_age'));
        console.log(`🔍 DEBUG: Item ${index} getFieldValue('gender'):`, getFieldValue(item, 'gender'));
      });
      
      // Log each item to see the mapping status
      if (Array.isArray(data)) {
        data.forEach((item, index) => {
          console.log(`Item ${index}:`, {
            filename: item.original_filename,
            matched_insurance_id: item.matched_insurance_id,
            final_insurance_name: item.final_insurance_name,
            extracted_name: item.comprehensive_data?.insurance_name || item.extracted_insurance_name
          });
        });
      }
      
      setExtractedData(Array.isArray(data) ? data : []);
      // Show UI unless it's auto-loading
      if (!autoLoad) {
        console.log('✅ Showing extracted data UI (manual request)');
        setShowExtractedData(true);
      } else {
        console.log('🔇 Not showing UI (auto-loading)');
      }
    } catch (error: any) {
      console.error('Error loading extracted data:', error);
      toast.error('Failed to load extracted data');
    } finally {
      setLoadingExtractedData(false);
    }
  };

  // Search for insurance products
  const searchInsuranceProducts = async (query: string) => {
    if (!selectedIllustration || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await apiClient.get(`/api/v1/proposals/${proposalId}/illustrations/${selectedIllustration.id}/search-insurance?query=${encodeURIComponent(query)}`);
      setSearchResults(response.data.data || []);
    } catch (error: any) {
      console.error('Error searching insurance products:', error);
      toast.error('Failed to search insurance products');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Map illustration to selected insurance
  const handleMapInsurance = async (insuranceId: string, insuranceName: string) => {
    if (!selectedIllustration) return;

    try {
      // Show loading state
      const loadingToast = toast.loading('Mapping insurance...');
      
      await apiClient.post(`/api/v1/proposals/${proposalId}/illustrations/${selectedIllustration.id}/map-insurance?insurance_id=${insuranceId}`);
      
      // Close loading toast and show success
      toast.dismiss(loadingToast);
      toast.success(`Successfully mapped to ${insuranceName}`);
      
      setShowMappingModal(false);
      setSelectedIllustration(null);
      setInsuranceSearchQuery('');
      setSearchResults([]);
      
      // Force complete refresh - reload both proposal and extracted data
      await loadProposal();
      
      // Immediately refresh extracted data if shown
      if (showExtractedData) {
        console.log('Refreshing extracted data after mapping...');
        // Force refresh extracted data by first setting it to null, then reloading
        setExtractedData(null);
        // Add a small delay to ensure database consistency, then reload
        setTimeout(async () => {
          try {
            await handleManageIllustrations(true); // Force refresh extracted data
            console.log('Extracted data refreshed after mapping');
          } catch (refreshError) {
            console.error('Error refreshing extracted data:', refreshError);
            toast.error('Mapping successful, but failed to refresh display. Please click the Refresh button.');
          }
        }, 1500); // Increased delay to 1.5 seconds for better consistency
      }
      
    } catch (error: any) {
      console.error('Error mapping insurance:', error);
      toast.error(error.response?.data?.detail || 'Failed to map insurance');
    }
  };

  // Handle opening mapping modal
  const handleOpenMappingModal = (illustration: any) => {
    setSelectedIllustration(illustration);
    setShowMappingModal(true);
    // Pre-populate search with extracted insurance name
    const extractedName = illustration.comprehensive_data?.insurance_name || illustration.extracted_insurance_name || '';
    setInsuranceSearchQuery(extractedName);
    if (extractedName) {
      searchInsuranceProducts(extractedName);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Loading proposal...</span>
          </div>
          {retryCount > 0 && (
            <div className="text-sm text-gray-500">
              Connection issue detected. Retrying... (Attempt {retryCount + 1}/4)
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Proposal not found</h1>
          <p className="text-gray-600 mb-4">The requested proposal could not be found.</p>
          <button
            onClick={() => router.push('/proposals')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Proposals
          </button>
        </div>
      </div>
    );
  }

  const canUpload = proposal.illustrations.length < 5 && proposal.status !== 'completed';

  return (
    <Sidebar>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={() => router.push('/proposals')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Proposals
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{proposal.client_name}</h1>
              <p className="text-gray-600 mt-2">Proposal Type: {proposal.proposal_type}</p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Auto-polling indicator */}
              {isPolling && (
                <div className="flex items-center space-x-2 bg-blue-50 px-3 py-1 rounded-full">
                  <span className="animate-pulse text-blue-600">🔄</span>
                  <span className="text-xs text-blue-600 font-medium">Auto-updating...</span>
                  {lastPollTime && (
                    <span className="text-xs text-blue-500">
                      {lastPollTime.toLocaleTimeString()}
                    </span>
                  )}
                </div>
              )}

              <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[proposal.status as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-800'}`}>
                {proposal.status === 'extracting' && (
                  <span className="inline-block animate-pulse mr-1">⚙️</span>
                )}
                {proposal.status === 'ready_for_age_analysis' && (
                  <span className="inline-block animate-pulse mr-1">🤖</span>
                )}
                {proposal.status.toUpperCase()}
              </span>
              
              <button
                onClick={handleManageIllustrations}
                disabled={loadingExtractedData || proposal.illustrations.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loadingExtractedData ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showExtractedData ? "M19 9l-7 7-7-7" : "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"} />
                    </svg>
                    <span>{showExtractedData ? 'Hide Illustrations Data' : 'Manage Illustrations'}</span>
                  </>
                )}
              </button>

              {/* Manual refresh button */}
              <button
                onClick={handleManualRefresh}
                disabled={loading || loadingExtractedData}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh status manually"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Proposal Info */}
          <div className="lg:col-span-1">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Proposal Details</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Client Needs</label>
                  <p className="text-sm text-gray-900 mt-1">{proposal.client_needs}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Needs Source</label>
                  <p className="text-sm text-gray-900 mt-1 capitalize">{proposal.needs_source.replace('_', ' ')}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Target Currency</label>
                  <p className="text-sm text-gray-900 mt-1 font-medium">{proposal.target_currency || 'MYR'}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Created</label>
                  <p className="text-sm text-gray-900 mt-1">{new Date(proposal.created_at).toLocaleString()}</p>
                </div>
                
                {proposal.highlighted_insurance_name && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Highlighted Insurance</label>
                    <p className="text-sm text-gray-900 mt-1">{proposal.highlighted_insurance_name}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Illustrations */}
          <div className="lg:col-span-2">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">PDF Illustrations</h2>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600">
                    {proposal.illustrations.length}/5 uploaded
                  </span>
                  {proposal.status === 'extracting' && (
                    <button
                      onClick={handleCancelProcessing}
                      className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors flex items-center space-x-1"
                      title="Cancel processing and reset to draft"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Cancel Processing</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Upload Area */}
              {canUpload && (
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors mb-6 ${
                    isDragActive
                      ? 'border-blue-400 bg-blue-50'
                      : uploading
                      ? 'border-gray-300 bg-gray-50'
                      : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                  } ${uploading ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <input {...getInputProps()} />
                  
                  {uploading ? (
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                      <p className="text-gray-600">Uploading...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-lg font-medium text-gray-900 mb-2">
                        {isDragActive ? 'Drop PDFs here' : 'Upload PDF Illustrations'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Drag & drop PDF files or click to browse
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Upload 2-5 files, max 15MB each
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Illustrations List */}
              <div className="space-y-4">
                {proposal.illustrations.map((illustration) => (
                  <div
                    key={illustration.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 2H7a2 2 0 00-2 2v15a2 2 0 002 2z" />
                              </svg>
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {illustration.original_filename}
                            </p>
                            
                            <div className="flex items-center space-x-2 mt-1 flex-wrap">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${EXTRACTION_STATUS_COLORS[illustration.extraction_status as keyof typeof EXTRACTION_STATUS_COLORS] || 'bg-gray-100 text-gray-800'}`}>
                                {illustration.extraction_status === 'processing' && (
                                  <span className="inline-block animate-pulse mr-1">🔄</span>
                                )}
                                {illustration.extraction_status}
                              </span>

                              {/* Cash extraction status from extracted data */}
                              {extractedData && (() => {
                                const cashData = extractedData.find((data: any) => data.id === illustration.id);
                                const cashStatus = cashData?.cash_extraction_status;
                                if (cashStatus) {
                                  return (
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${CASH_EXTRACTION_STATUS_COLORS[cashStatus as keyof typeof CASH_EXTRACTION_STATUS_COLORS] || 'bg-gray-100 text-gray-800'}`}>
                                      {cashStatus === 'extracting' && (
                                        <span className="inline-block animate-pulse mr-1">💰</span>
                                      )}
                                      Cash: {cashStatus}
                                    </span>
                                  );
                                }
                                return null;
                              })()}

                              {illustration.final_insurance_name && (
                                <span className="text-xs text-gray-600">
                                  {illustration.final_insurance_name}
                                </span>
                              )}

                              {illustration.is_duplicate_insurance && (
                                <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Duplicate
                                </span>
                              )}
                            </div>
                            
                            {illustration.extraction_confidence && (
                              <div className="mt-2">
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-gray-500">Confidence:</span>
                                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-blue-600 h-2 rounded-full" 
                                      style={{ width: `${illustration.extraction_confidence * 100}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    {Math.round(illustration.extraction_confidence * 100)}%
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0 flex items-center space-x-2">
                        {illustration.extraction_status === 'completed' && !illustration.final_insurance_name && (
                          <button
                            onClick={() => setManualAssignment({
                              illustrationId: illustration.id,
                              insuranceName: ''
                            })}
                            className="px-3 py-1 text-xs bg-orange-100 text-orange-800 rounded hover:bg-orange-200 transition-colors"
                          >
                            Assign Manually
                          </button>
                        )}

                        {/* Delete button visible for all illustrations */}
                        <button
                          onClick={() => handleDeleteIllustration(illustration.id, illustration.original_filename)}
                          className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors flex items-center space-x-1"
                          title="Delete illustration"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                    
                    {illustration.processing_notes && (
                      <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
                        {illustration.processing_notes}
                      </div>
                    )}
                  </div>
                ))}
                
                {proposal.illustrations.length === 0 && (
                  <div className="text-center py-8">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-600">No illustrations uploaded yet</p>
                    <p className="text-sm text-gray-500 mt-1">Upload 2-5 PDF illustrations to continue</p>
                  </div>
                )}
              </div>
            </div>

            {/* Proposal Builder */}
            {showExtractedData && extractedData && (
              <div className="mt-6 space-y-6">
                {extractedData.length === 0 ? (
                  <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 text-center">
                    <p className="text-gray-600">No completed illustrations with extracted data found.</p>
                    <p className="text-sm text-gray-500 mt-1">Make sure your illustrations have finished processing successfully.</p>
                  </div>
                ) : (
                  <>
                    {/* Insurance Mapping Section */}
                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold text-gray-900">Insurance Database Mapping</h3>
                        <button
                          onClick={() => {
                            console.log('Manual refresh triggered');
                            setExtractedData(null);
                            handleManageIllustrations(true);
                          }}
                          className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors flex items-center space-x-1"
                          disabled={loadingExtractedData}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <span>{loadingExtractedData ? 'Refreshing...' : 'Refresh'}</span>
                        </button>
                      </div>
                      <div className="space-y-4">
                        {extractedData.map((data: any, index: number) => (
                          <div key={index} className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-gray-900">{data.original_filename}</h4>
                              <span className="text-sm text-gray-500">Order: {data.illustration_order}</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                              <div className="text-sm">
                                <span className="text-yellow-700">Extracted Name:</span>
                                <span className="ml-2 font-medium text-gray-900">{data.comprehensive_data?.insurance_name || data.extracted_insurance_name || 'Not extracted'}</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-yellow-700">Database Match:</span>
                                <span className="ml-2 font-medium text-gray-900">{data.final_insurance_name || 'Not mapped'}</span>
                              </div>
                            </div>
                            {!data.matched_insurance_id && (
                              <button
                                onClick={() => handleOpenMappingModal(data)}
                                className="px-3 py-1 text-xs bg-yellow-200 text-yellow-800 rounded hover:bg-yellow-300 transition-colors"
                              >
                                Map to Database Insurance
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Check if all insurances are mapped before showing proposal builder */}
                    {extractedData.every((data: any) => data.matched_insurance_id) ? (
                      <>
                        {/* Page 1: Proposal Overview */}
                        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-semibold text-gray-900">📄 Page 1: Proposal Overview</h3>
                            <div className="flex items-center space-x-3">
                              {generatingPage1 && (
                                <div className="flex items-center space-x-2 text-purple-600">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                                  <span className="text-sm">Generating content...</span>
                                </div>
                              )}
                              {!generatingPage1 && (page1Content || proposalData.clientNeedsSummary) && (
                                <button
                                  onClick={() => generatePage1Content(true)}
                                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors flex items-center space-x-1.5 border border-gray-300"
                                  title="Regenerate Page 1 content with new AI variations"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                  <span>Regenerate</span>
                                </button>
                              )}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Proposal Title</label>
                                <input
                                  type="text"
                                  value={proposalData.proposalTitle}
                                  onChange={(e) => updateProposalData('proposalTitle', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="AI-generated title will appear here automatically..."
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                                <input
                                  type="text"
                                  value={proposalData.clientName || proposal.client_name}
                                  onChange={(e) => updateProposalData('clientName', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Client Date of Birth</label>
                                <input
                                  type="date"
                                  value={proposalData.clientDob || proposal.client_dob || ''}
                                  onChange={(e) => updateProposalData('clientDob', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                            </div>
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                                <input
                                  type="text"
                                  value={proposalData.companyName}
                                  onChange={(e) => updateProposalData('companyName', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="Loading company info..."
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Agent Name</label>
                                <input
                                  type="text"
                                  value={proposalData.agentName}
                                  onChange={(e) => updateProposalData('agentName', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="Loading agent info..."
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Agent Contact</label>
                                <input
                                  type="text"
                                  value={proposalData.agentContact}
                                  onChange={(e) => updateProposalData('agentContact', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="Loading contact info..."
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-6">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Client Needs Summary</label>
                            <textarea
                              rows={3}
                              value={proposalData.clientNeedsSummary}
                              onChange={(e) => updateProposalData('clientNeedsSummary', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="AI-generated client needs summary will appear here automatically..."
                            />
                          </div>
                          
                          {/* Dynamic Key Points for Each Insurance */}
                          <div className="mt-6">
                            <label className="block text-sm font-medium text-gray-700 mb-3">Insurance Key Points Summary</label>
                            <div className="space-y-3">
                              {extractedData?.filter((data: any) => data.matched_insurance_id).map((data: any, index: number) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-3">
                                  <label className="block text-sm font-medium text-gray-600 mb-1">
                                    {data.final_insurance_name}
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={proposalData.insuranceKeyPoints[data.matched_insurance_id] || ''}
                                    onChange={(e) => setProposalData(prev => ({
                                      ...prev,
                                      insuranceKeyPoints: {
                                        ...prev.insuranceKeyPoints,
                                        [data.matched_insurance_id]: e.target.value
                                      }
                                    }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    placeholder="AI-generated key points for this insurance will appear here automatically..."
                                  />
                                </div>
                              ))}
                              {(!extractedData || extractedData.filter((data: any) => data.matched_insurance_id).length === 0) && (
                                <div className="text-center py-4 text-gray-500 border border-gray-200 rounded-lg">
                                  Complete insurance mapping first to see key points sections
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Page 2: Insurance Cards */}
                        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
                          <h3 className="text-xl font-semibold text-gray-900 mb-4">📋 Page 2: Insurance Product Cards</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {extractedData.map((data: any, index: number) => {
                              const cardContent = page2Content[data.matched_insurance_id] || {
                                keyFeatures: '• Comprehensive life insurance coverage\n• Competitive premium rates\n• Flexible payment options\n• Strong financial stability'
                              };
                              
                              return (
                                <div key={index} className="border border-gray-200 rounded-lg p-4">
                                  <h4 className="font-medium text-lg text-gray-900 mb-3">{data.final_insurance_name}</h4>
                                  <div className="space-y-2">
                                    <div className="text-sm">
                                      <span className="text-gray-600">Provider:</span>
                                      <span className="ml-2 font-medium">{data.comprehensive_data?.insurance_provider}</span>
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">Key Features (4 bullet points)</label>
                                      <textarea
                                        rows={4}
                                        value={cardContent.keyFeatures}
                                        onChange={(e) => {
                                          setPage2Content(prev => ({
                                            ...prev,
                                            [data.matched_insurance_id]: {
                                              ...prev[data.matched_insurance_id],
                                              keyFeatures: e.target.value
                                            }
                                          }));
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                        placeholder="• Key feature 1&#10;• Key feature 2&#10;• Key feature 3&#10;• Key feature 4"
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Page 3: Detailed Comparison */}
                        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
                          <h3 className="text-xl font-semibold text-gray-900 mb-4">📊 Page 3: Detailed Insurance Comparison</h3>
                          
                          {/* Quick Test Button */}
                          <div className="bg-yellow-50 p-3 rounded-lg mb-4 border border-yellow-200">
                            <button
                              onClick={calculateMYRValues}
                              className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
                            >
                              🔄 Refresh Currency Conversion
                            </button>
                            <span className="ml-3 text-sm text-gray-600">
                              {loadingConversions ? 'Converting...' : Object.keys(myConversions).length > 0 ? `${Object.keys(myConversions).length} conversions ready` : 'No conversions'}
                            </span>
                          </div>

                          {/* Client Information Header */}
                          <div className="bg-blue-50 p-4 rounded-lg mb-6">
                            <h4 className="font-medium text-blue-800 mb-3">👤 Client Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-blue-700 mb-1">Client Name</label>
                                <input
                                  type="text"
                                  value={proposalData.clientName || proposal.client_name}
                                  onChange={(e) => updateProposalData('clientName', e.target.value)}
                                  className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-blue-700 mb-1">Date of Birth</label>
                                <input
                                  type="date"
                                  value={proposalData.clientDob}
                                  onChange={(e) => updateProposalData('clientDob', e.target.value)}
                                  className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-blue-700 mb-1">Age</label>
                                <input
                                  type="text"
                                  value={calculatedAge !== null ? `${calculatedAge} years` : ''}
                                  placeholder="Auto-calculated from DOB"
                                  className="w-full px-3 py-2 border border-blue-300 rounded-lg bg-gray-50 text-sm"
                                  readOnly
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-blue-700 mb-1">Exchange Rate</label>
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={exchangeRate}
                                    onChange={(e) => setExchangeRate(e.target.value)}
                                    placeholder="1.00 USD"
                                    className="w-full px-3 py-2 pr-10 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                  />
                                  <button
                                    onClick={fetchExchangeRate}
                                    disabled={loadingExchangeRate}
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-800 disabled:opacity-50"
                                    title="Refresh exchange rate"
                                  >
                                    {loadingExchangeRate ? (
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                    ) : (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                      </svg>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Insurance Products - Vertical Layout */}
                          <div className="space-y-6">
                            {extractedData.map((data: any, index: number) => (
                              <div key={index} className="border border-gray-200 rounded-lg p-6">
                                <div className="flex justify-between items-start mb-6 pb-2 border-b border-gray-200">
                                  <div>
                                    <h4 className="font-medium text-xl text-gray-900">
                                      {editMode[data.id] ? (
                                        <input
                                          type="text"
                                          value={editData[data.id]?.insurance_name || ''}
                                          onChange={(e) => updateEditField(data.id, 'insurance_name', e.target.value)}
                                          className="border border-gray-300 rounded px-2 py-1 text-lg font-medium"
                                          placeholder="Insurance Name"
                                        />
                                      ) : (
                                        data.final_insurance_name
                                      )}
                                    </h4>
                                    <span className="text-sm font-normal text-gray-500">
                                      by {editMode[data.id] ? (
                                        <input
                                          type="text"
                                          value={editData[data.id]?.insurance_provider || ''}
                                          onChange={(e) => updateEditField(data.id, 'insurance_provider', e.target.value)}
                                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                                          placeholder="Provider"
                                        />
                                      ) : (
                                        getFieldValue(data, 'insurance_provider', 'Unknown Provider')
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex space-x-2">
                                    {editMode[data.id] ? (
                                      <>
                                        <button
                                          onClick={() => saveChanges(data.id)}
                                          disabled={savingChanges[data.id]}
                                          className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center space-x-1"
                                        >
                                          {savingChanges[data.id] ? (
                                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                          ) : (
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                          )}
                                          <span className="text-xs">Save</span>
                                        </button>
                                        <button
                                          onClick={() => cancelEdit(data.id)}
                                          className="px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-1"
                                        >
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                          <span className="text-xs">Cancel</span>
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        onClick={() => enterEditMode(data.id, data)}
                                        className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        <span className="text-xs">Edit</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Basic Client Information */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                                  <div className="bg-blue-50 p-4 rounded-lg">
                                    <div className="flex items-center justify-between border-b border-blue-200 pb-1 mb-3">
                                      <h5 className="font-medium text-blue-800">👤 Client Details</h5>
                                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                                        🔗 Synced across all cards
                                      </span>
                                    </div>
                                    <div className="space-y-2">
                                      <div className="text-sm">
                                        <span className="text-blue-700">Age:</span>
                                        {editMode[data.id] ? (
                                          <input
                                            type="number"
                                            value={editData[data.id]?.client_age || ''}
                                            onChange={(e) => updateEditField(data.id, 'client_age', e.target.value)}
                                            className="ml-2 border border-gray-300 rounded px-2 py-1 w-16 text-sm"
                                            placeholder="Age"
                                            min="0"
                                            max="120"
                                          />
                                        ) : (
                                          <span className="ml-2 font-medium text-gray-900">
                                            {calculatedAge !== null ? calculatedAge : getFieldValue(data, 'client_age', 'Not specified')}
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-sm">
                                        <span className="text-blue-700">Gender:</span>
                                        {editMode[data.id] ? (
                                          <select
                                            value={editData[data.id]?.gender || ''}
                                            onChange={(e) => updateEditField(data.id, 'gender', e.target.value)}
                                            className="ml-2 border border-gray-300 rounded px-2 py-1 text-sm"
                                          >
                                            <option value="">Select...</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Unknown">Unknown</option>
                                          </select>
                                        ) : (
                                          <span className="ml-2 font-medium text-gray-900 capitalize">{getFieldValue(data, 'gender', 'Unknown')}</span>
                                        )}
                                      </div>
                                      <div className="text-sm">
                                        <span className="text-blue-700">Smoker Status:</span>
                                        {editMode[data.id] ? (
                                          <select
                                            value={editData[data.id]?.smoker_status || ''}
                                            onChange={(e) => updateEditField(data.id, 'smoker_status', e.target.value)}
                                            className="ml-2 border border-gray-300 rounded px-2 py-1 text-sm"
                                          >
                                            <option value="">Select...</option>
                                            <option value="Non-smoker">Non-smoker</option>
                                            <option value="Smoker">Smoker</option>
                                            <option value="Unknown">Unknown</option>
                                          </select>
                                        ) : (
                                          <span className="ml-2 font-medium text-gray-900 capitalize">{getFieldValue(data, 'smoker_status', 'Not specified')}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Policy Terms - Moved to second position */}
                                  <div className="bg-orange-50 p-4 rounded-lg">
                                    <h5 className="font-medium text-orange-800 border-b border-orange-200 pb-1 mb-3">📋 Policy Terms</h5>
                                    <div className="space-y-2">
                                      <div className="text-sm">
                                        <span className="text-orange-700">Payment Period:</span>
                                        {editMode[data.id] ? (
                                          <input
                                            type="text"
                                            value={editData[data.id]?.payment_period || ''}
                                            onChange={(e) => updateEditField(data.id, 'payment_period', e.target.value)}
                                            className="ml-2 border border-gray-300 rounded px-2 py-1 text-sm w-24"
                                            placeholder="e.g., 10 years"
                                          />
                                        ) : (
                                          <span className="ml-2 font-medium text-gray-900">{data.comprehensive_data?.payment_period || data.payment_period || 'Not specified'}</span>
                                        )}
                                      </div>
                                      <div className="text-sm">
                                        <span className="text-orange-700">Coverage Term:</span>
                                        {editMode[data.id] ? (
                                          <input
                                            type="text"
                                            value={editData[data.id]?.coverage_term || ''}
                                            onChange={(e) => updateEditField(data.id, 'coverage_term', e.target.value)}
                                            className="ml-2 border border-gray-300 rounded px-2 py-1 text-sm w-24"
                                            placeholder="e.g., Whole Life"
                                          />
                                        ) : (
                                          <span className="ml-2 font-medium text-gray-900">{data.comprehensive_data?.coverage_term || data.coverage_term || 'Not specified'}</span>
                                        )}
                                      </div>
                                      <div className="text-sm">
                                        <span className="text-orange-700">Cash Value:</span>
                                        {editMode[data.id] ? (
                                          <select
                                            value={editData[data.id]?.has_cash_value?.toString() || ''}
                                            onChange={(e) => updateEditField(data.id, 'has_cash_value', e.target.value === 'true')}
                                            className="ml-2 border border-gray-300 rounded px-2 py-1 text-sm"
                                          >
                                            <option value="">Select...</option>
                                            <option value="true">Yes</option>
                                            <option value="false">No</option>
                                          </select>
                                        ) : (
                                          <span className={`ml-2 font-medium ${getFieldValue(data, 'has_cash_value') ? 'text-green-600' : 'text-red-600'}`}>
                                            {getFieldValue(data, 'has_cash_value') !== null ?
                                              (getFieldValue(data, 'has_cash_value') ? 'Yes' : 'No') :
                                              'Not specified'}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Premium Information - Moved to third position */}
                                  <div className="bg-purple-50 p-4 rounded-lg">
                                    <h5 className="font-medium text-purple-800 border-b border-purple-200 pb-1 mb-3">💵 Premium Details</h5>
                                    <div className="space-y-2">
                                      <div className="text-sm">
                                        <span className="text-purple-700">Annual Premium:</span>
                                        {editMode[data.id] ? (
                                          <input
                                            type="number"
                                            value={editData[data.id]?.premium_per_year || ''}
                                            onChange={(e) => updateEditField(data.id, 'premium_per_year', e.target.value)}
                                            className="ml-2 border border-gray-300 rounded px-2 py-1 text-sm w-32"
                                            placeholder="Annual Premium"
                                            min="0"
                                            step="0.01"
                                          />
                                        ) : (
                                          <span className="ml-2 font-medium text-gray-900">
                                            {(() => {
                                              const premium = getFieldValue(data, 'premium_per_year');
                                              const currency = getFieldValue(data, 'currency');
                                              if (premium) {
                                                return `${currency || ''} ${parseFloat(premium).toLocaleString()}`;
                                              }
                                              return 'Not specified';
                                            })()}
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-sm">
                                        <span className="text-purple-700">Annual (MYR):</span>
                                        <span className="ml-2 font-medium text-gray-900">
                                          {loadingConversions ? (
                                            <span className="inline-flex items-center">
                                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600 mr-1"></div>
                                              Converting...
                                            </span>
                                          ) : (() => {
                                            // Check saved converted values first, then fall back to calculated conversions
                                            const savedMyrFormatted = getFieldValue(data, 'premium_per_year_myr_formatted');
                                            if (savedMyrFormatted) {
                                              return <span className="text-green-600 font-medium">{savedMyrFormatted} ✓</span>;
                                            }

                                            console.log('Conversion display debug:', {
                                              dataId: data.id,
                                              savedMyrFormatted: savedMyrFormatted,
                                              myConversions: myConversions,
                                              conversionForThis: myConversions[data.id],
                                              conversionSuccess: myConversions[data.id]?.conversion?.success,
                                              formattedMyr: myConversions[data.id]?.conversion?.formatted
                                            });

                                            if (myConversions[data.id]?.conversion?.success) {
                                              return myConversions[data.id].conversion.formatted;
                                            } else if (myConversions[data.id]?.conversion?.error) {
                                              return (
                                                <span className="text-red-600 text-xs">
                                                  {myConversions[data.id].conversion.error}
                                                </span>
                                              );
                                            } else {
                                              return <span className="text-gray-500">-</span>;
                                            }
                                          })()}
                                        </span>
                                      </div>
                                      <div className="text-sm">
                                        <span className="text-purple-700">Total Premium:</span>
                                        {editMode[data.id] ? (
                                          <input
                                            type="number"
                                            value={editData[data.id]?.total_premium || ''}
                                            onChange={(e) => updateEditField(data.id, 'total_premium', e.target.value)}
                                            className="ml-2 border border-gray-300 rounded px-2 py-1 text-sm w-32"
                                            placeholder="Total Premium"
                                            min="0"
                                            step="0.01"
                                          />
                                        ) : (
                                          <span className="ml-2 font-medium text-gray-900">
                                            {getFieldValue(data, 'total_premium') ?
                                              `${getFieldValue(data, 'currency', '')} ${parseFloat(getFieldValue(data, 'total_premium')).toLocaleString()}` :
                                              'Not specified'}
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-sm">
                                        <span className="text-purple-700">Total Premium (MYR):</span>
                                        <span className="ml-2 font-medium text-gray-900">
                                          {loadingConversions ? (
                                            <span className="inline-flex items-center">
                                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600 mr-1"></div>
                                              Converting...
                                            </span>
                                          ) : (() => {
                                            // Check saved converted values first, then fall back to calculated conversions
                                            const savedTotalMyrFormatted = getFieldValue(data, 'total_premium_myr_formatted');
                                            if (savedTotalMyrFormatted) {
                                              return <span className="text-green-600 font-medium">{savedTotalMyrFormatted} ✓</span>;
                                            }

                                            console.log('Total conversion display debug:', {
                                              dataId: data.id,
                                              savedTotalMyrFormatted: savedTotalMyrFormatted,
                                              totalConversion: myConversions[data.id]?.total_conversion,
                                              success: myConversions[data.id]?.total_conversion?.success,
                                              formattedMyr: myConversions[data.id]?.total_conversion?.formatted
                                            });

                                            if (myConversions[data.id]?.total_conversion?.success) {
                                              return myConversions[data.id].total_conversion.formatted;
                                            } else if (myConversions[data.id]?.total_conversion?.error) {
                                              return (
                                                <span className="text-red-600 text-xs">
                                                  {myConversions[data.id].total_conversion.error}
                                                </span>
                                              );
                                            } else {
                                              return <span className="text-gray-500">-</span>;
                                            }
                                          })()}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Financial Details */}
                                  <div className="bg-green-50 p-4 rounded-lg">
                                    <h5 className="font-medium text-green-800 border-b border-green-200 pb-1 mb-3">💰 Financial Summary</h5>
                                    <div className="space-y-2">
                                      <div className="text-sm">
                                        <span className="text-green-700">Currency:</span>
                                        {editMode[data.id] ? (
                                          <select
                                            value={editData[data.id]?.currency || ''}
                                            onChange={(e) => updateEditField(data.id, 'currency', e.target.value)}
                                            className="ml-2 border border-gray-300 rounded px-2 py-1 text-sm"
                                          >
                                            <option value="">Select...</option>
                                            <option value="USD">USD</option>
                                            <option value="SGD">SGD</option>
                                            <option value="HKD">HKD</option>
                                            <option value="MYR">MYR</option>
                                            <option value="EUR">EUR</option>
                                            <option value="GBP">GBP</option>
                                            <option value="AUD">AUD</option>
                                            <option value="JPY">JPY</option>
                                          </select>
                                        ) : (
                                          <span className="ml-2 font-medium text-gray-900">{getFieldValue(data, 'currency', 'Not specified')}</span>
                                        )}
                                      </div>
                                      <div className="text-sm">
                                        <span className="text-green-700">Death Benefit:</span>
                                        {editMode[data.id] ? (
                                          <input
                                            type="number"
                                            value={editData[data.id]?.death_benefit || ''}
                                            onChange={(e) => updateEditField(data.id, 'death_benefit', e.target.value)}
                                            className="ml-2 border border-gray-300 rounded px-2 py-1 text-sm w-32"
                                            placeholder="Death Benefit"
                                            min="0"
                                            step="0.01"
                                          />
                                        ) : (
                                          <span className="ml-2 font-medium text-gray-900">
                                            {getFieldValue(data, 'death_benefit') ?
                                              `${getFieldValue(data, 'currency', '')} ${parseFloat(getFieldValue(data, 'death_benefit')).toLocaleString()}` :
                                              'Not specified'}
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-sm">
                                        <span className="text-green-700">Death Benefit ({proposal?.target_currency || 'MYR'}):</span>
                                        <span className="ml-2 font-medium text-gray-900">
                                          {loadingConversions ? (
                                            <span className="inline-flex items-center">
                                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600 mr-1"></div>
                                              Converting...
                                            </span>
                                          ) : (() => {
                                            // Check saved converted values first, then fall back to calculated conversions
                                            const savedMyrFormatted = getFieldValue(data, 'death_benefit_myr_formatted');
                                            if (savedMyrFormatted) {
                                              return <span className="text-green-600 font-medium">{savedMyrFormatted} ✓</span>;
                                            }

                                            if (myConversions[data.id]?.deathBenefitConversion?.success) {
                                              return myConversions[data.id].deathBenefitConversion.formatted;
                                            } else if (myConversions[data.id]?.deathBenefitConversion?.error) {
                                              return (
                                                <span className="text-red-600 text-xs">
                                                  {myConversions[data.id].deathBenefitConversion.error}
                                                </span>
                                              );
                                            } else {
                                              return 'Not calculated';
                                            }
                                          })()}
                                        </span>
                                      </div>
                                      <div className="text-sm">
                                        <span className="text-green-700">S&P Rating:</span>
                                        <span className="ml-2 font-bold text-blue-600">{data.sp_rating || 'Not rated'}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Investment Features */}
                                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                                  <h5 className="font-medium text-gray-800 border-b border-gray-300 pb-1 mb-3">📈 Investment & Performance</h5>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="text-sm">
                                      <span className="text-gray-700">Breakeven Period:</span>
                                      {editMode[data.id] ? (
                                        <div className="inline-block ml-2">
                                          <input
                                            type="number"
                                            value={editData[data.id]?.breakeven_years || ''}
                                            onChange={(e) => updateEditField(data.id, 'breakeven_years', e.target.value)}
                                            className="border border-gray-300 rounded px-2 py-1 text-sm w-16"
                                            placeholder="Years"
                                            min="0"
                                          />
                                          <span className="ml-1 text-gray-600">years</span>
                                        </div>
                                      ) : (
                                        <span className="ml-2 font-bold text-purple-600">
                                          {getFieldValue(data, 'breakeven_years') ?
                                            `${getFieldValue(data, 'breakeven_years')} years` :
                                            'Not calculated'}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-sm">
                                      <span className="text-gray-700">Cash Value Component:</span>
                                      <span className={`ml-2 font-bold ${
                                        // Check if there's an edit in progress for has_cash_value, otherwise use saved value
                                        editMode[data.id] && editData[data.id]?.has_cash_value !== undefined
                                          ? (editData[data.id].has_cash_value ? 'text-green-600' : 'text-red-600')
                                          : (getFieldValue(data, 'has_cash_value') ? 'text-green-600' : 'text-red-600')
                                      }`}>
                                        {editMode[data.id] && editData[data.id]?.has_cash_value !== undefined
                                          ? (editData[data.id].has_cash_value ? 'Yes' : 'No')
                                          : (getFieldValue(data, 'has_cash_value') !== null
                                              ? (getFieldValue(data, 'has_cash_value') ? 'Yes' : 'No')
                                              : 'Not specified')
                                        }
                                      </span>
                                    </div>
                                    <div className="text-sm">
                                      <span className="text-gray-700">Extraction Notes:</span>
                                      <span className="ml-2 text-gray-600 text-xs">
                                        {getFieldValue(data, 'extraction_notes', 'No additional notes')}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Cash Surrender Values Table - 4 Age Logic */}
                                <div className="mt-4">
                                  <div className="flex justify-between items-center border-b pb-1 mb-3">
                                    <h5 className="font-medium text-gray-700">💎 Cash Surrender Values by Age (UPDATED)</h5>
                                    <button
                                      onClick={() => {
                                        if (!cashEditMode[data.id]) {
                                          // Enter cash edit mode - initialize with current data
                                          setCashEditMode(prev => ({ ...prev, [data.id]: true }));
                                          setCashEditData(prev => ({
                                            ...prev,
                                            [data.id]: {
                                              cash_surrender_values: getCashSurrenderAgesAndValues(data, data, false)
                                            }
                                          }));
                                        } else {
                                          // Exit cash edit mode
                                          setCashEditMode(prev => ({ ...prev, [data.id]: false }));
                                          setCashEditData(prev => {
                                            const newData = { ...prev };
                                            delete newData[data.id];
                                            return newData;
                                          });
                                        }
                                      }}
                                      disabled={editMode[data.id]}
                                      className={`text-xs px-3 py-1 rounded-lg transition-colors flex items-center space-x-1 ${
                                        editMode[data.id]
                                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                          : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                      }`}
                                      title={editMode[data.id] ? 'Save card changes first before editing cash values' : 'Customize cash surrender value ages'}
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                      <span>{cashEditMode[data.id] ? 'Cancel' : 'Customize Ages'}</span>
                                    </button>
                                  </div>

                                  {!cashEditMode[data.id] ? (
                                    <div className="grid grid-cols-2 gap-3">
                                      {(() => {
                                        const agesAndValues = getCashSurrenderAgesAndValues(data, data, false);
                                        console.log('READ MODE - function returned:', agesAndValues, 'type:', typeof agesAndValues);
                                        console.log('Cash Surrender Values Debug:', {
                                          dataId: data.id,
                                          agesAndValues,
                                          userData: data.user_edited_data,
                                          comprehensive: data.comprehensive_data
                                        });

                                        // Check for Phase 2 loading state
                                        if (agesAndValues === 'PHASE_2_LOADING') {
                                          return (
                                            <div key="loading" className="col-span-2 flex flex-col items-center justify-center p-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg">
                                              <div className="flex items-center space-x-2 mb-3">
                                                <span className="inline-block animate-spin text-2xl">🤖</span>
                                                <span className="text-amber-800 font-medium">Analyzing optimal ages...</span>
                                              </div>
                                              <p className="text-sm text-amber-700 text-center">
                                                Our AI is selecting the best age intervals from your cash surrender value data.
                                                <br />
                                                <span className="text-xs">This usually takes 10-30 seconds.</span>
                                              </p>
                                            </div>
                                          );
                                        }

                                        // Safety check and fix string serialization issue
                                        console.log('READ MODE - checking agesAndValues:', agesAndValues, 'isArray:', Array.isArray(agesAndValues));
                                        let processedAgesAndValues = agesAndValues;

                                        if (!Array.isArray(agesAndValues)) {
                                          if (typeof agesAndValues === 'string') {
                                            try {
                                              // Try to parse string back to array
                                              processedAgesAndValues = JSON.parse(agesAndValues.replace(/'/g, '"'));
                                              console.log('READ MODE - parsed string to array:', processedAgesAndValues);
                                            } catch (e) {
                                              console.error('READ MODE - failed to parse string:', agesAndValues);
                                              return <div key="error" className="text-red-600 p-4 border border-red-300 rounded">Error: Invalid data format (READ MODE)</div>;
                                            }
                                          } else {
                                            console.error('READ MODE - agesAndValues is not an array:', agesAndValues, typeof agesAndValues);
                                            return <div key="error" className="text-red-600 p-4 border border-red-300 rounded">Error: Invalid data format (READ MODE)</div>;
                                          }
                                        }

                                        return processedAgesAndValues.map((ageValue: any, index: number) => {
                                          const targetAge = ageValue.age;
                                          const value = ageValue.value;

                                          return (
                                            <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                              <span className="font-medium text-gray-700">Age {targetAge}:</span>
                                              <span className="font-mono text-sm">
                                                {value === '-' ? '-' :
                                                 `${getFieldValue(data, 'currency', '')} ${typeof value === 'number' ? value.toLocaleString() : value}`}
                                              </span>
                                            </div>
                                          );
                                        });
                                      })()}
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                      {(() => {
                                        console.log('🔧 EDIT MODE RENDER - Debug info:', {
                                          dataId: data.id,
                                          hasEditData: !!editData[data.id],
                                          editDataKeys: editData[data.id] ? Object.keys(editData[data.id]) : 'no edit data',
                                          editDataCashValues: editData[data.id]?.cash_surrender_values,
                                          originalDataCashValues: data.user_edited_data?.cash_surrender_values
                                        });

                                        const agesAndValues = getCashSurrenderAgesAndValues(editData[data.id] || data, data, true);

                                        // Safety check to prevent crash
                                        console.log('EDIT MODE - checking agesAndValues:', agesAndValues, 'isArray:', Array.isArray(agesAndValues));
                                        if (!Array.isArray(agesAndValues)) {
                                          console.error('EDIT MODE - agesAndValues is not an array:', agesAndValues, typeof agesAndValues);
                                          return <div key="error" className="text-red-600 p-4 border border-red-300 rounded">Error: Invalid data format (EDIT MODE)</div>;
                                        }

                                        return agesAndValues.map((ageValue: any, index: number) => {
                                          const targetAge = ageValue.age;
                                          // Ensure currentValue is always a string to prevent controlled/uncontrolled input errors
                                          const currentValue = (ageValue.value === '-' || ageValue.value === null || ageValue.value === undefined)
                                            ? ''
                                            : String(ageValue.value);

                                          return (
                                            <div key={`cash-${data.id}-${targetAge}`} className="flex items-center space-x-3">
                                              <div className="flex items-center space-x-1">
                                                <span className="text-sm font-medium text-gray-700">Age</span>
                                                <input
                                                  type="number"
                                                  min="60"
                                                  max="120"
                                                  placeholder="Age"
                                                  value={targetAge}
                                                  onChange={(e) => {
                                                    const newAge = parseInt(e.target.value);
                                                    if (isNaN(newAge) || newAge < 60 || newAge > 120) return;

                                                    setEditData(prev => {
                                                      const current = prev[data.id] || {};
                                                      let currentCashValues = current.cash_surrender_values || [];

                                                      // CRITICAL FIX: Update the age while PRESERVING the original cash value
                                                      // Find the current value for this age entry
                                                      const currentEntry = currentCashValues.find((item: any) => item.age === targetAge);
                                                      const preservedValue = currentEntry?.value || ageValue.value;

                                                      // Update the age while preserving the original extracted value
                                                      const updatedValues = currentCashValues.map((item: any) =>
                                                        item.age === targetAge
                                                          ? { ...item, age: newAge, value: preservedValue }  // Keep original value!
                                                          : item
                                                      );

                                                      // Sort by age
                                                      updatedValues.sort((a, b) => a.age - b.age);

                                                      return {
                                                        ...prev,
                                                        [data.id]: {
                                                          ...current,
                                                          cash_surrender_values: updatedValues
                                                        }
                                                      };
                                                    });
                                                  }}
                                                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                                <span className="text-sm text-gray-500">:</span>
                                              </div>
                                              <input
                                                type="text"
                                                placeholder="Enter value or '-'"
                                                value={currentValue}
                                                onChange={(e) => {
                                                  const newValue = e.target.value;
                                                  setEditData(prev => {
                                                    const current = prev[data.id] || {};

                                                    // Get current cash values from edit state
                                                    let currentCashValues = current.cash_surrender_values || [];

                                                    // Create a clean copy and update the specific age
                                                    const updatedValues = currentCashValues.map((item: any) => ({ ...item }));
                                                    const existingIndex = updatedValues.findIndex((csv: any) => csv.age === targetAge);

                                                    if (existingIndex >= 0) {
                                                      updatedValues[existingIndex] = { age: targetAge, value: newValue === '' ? '-' : newValue };
                                                    } else {
                                                      updatedValues.push({ age: targetAge, value: newValue === '' ? '-' : newValue });
                                                      updatedValues.sort((a, b) => a.age - b.age);
                                                    }

                                                    return {
                                                      ...prev,
                                                      [data.id]: {
                                                        ...current,
                                                        cash_surrender_values: updatedValues
                                                      }
                                                    };
                                                  });
                                                }}
                                                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                              />
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setEditData(prev => {
                                                    const current = prev[data.id] || {};
                                                    let currentCashValues = current.cash_surrender_values || [];

                                                    // Remove this age-value pair
                                                    const updatedValues = currentCashValues.filter((item: any) => item.age !== targetAge);

                                                    return {
                                                      ...prev,
                                                      [data.id]: {
                                                        ...current,
                                                        cash_surrender_values: updatedValues
                                                      }
                                                    };
                                                  });
                                                }}
                                                className="px-2 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded text-sm"
                                                title="Remove this age"
                                              >
                                                ✕
                                              </button>
                                              <span className="text-xs text-gray-500 w-16">{getFieldValue(data, 'currency', 'Currency')}</span>
                                            </div>
                                          );
                                        });
                                      })()}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditData(prev => {
                                            const current = prev[data.id] || {};
                                            let currentCashValues = current.cash_surrender_values || [];

                                            // Find the next available age (increments from the highest existing age)
                                            const existingAges = currentCashValues.map((item: any) => item.age).sort((a, b) => a - b);
                                            const maxAge = existingAges.length > 0 ? Math.max(...existingAges) : 80;
                                            let newAge = maxAge + 5;

                                            // Make sure the new age is within reasonable bounds and not duplicate
                                            while (newAge <= 120 && existingAges.includes(newAge)) {
                                              newAge += 5;
                                            }

                                            if (newAge > 120) {
                                              // Find first available age between 65-120
                                              for (let age = 65; age <= 120; age += 5) {
                                                if (!existingAges.includes(age)) {
                                                  newAge = age;
                                                  break;
                                                }
                                              }
                                            }

                                            // Add new age-value pair if we found a valid age
                                            if (newAge <= 120) {
                                              const updatedValues = [...currentCashValues, { age: newAge, value: '-' }];
                                              updatedValues.sort((a, b) => a.age - b.age);

                                              return {
                                                ...prev,
                                                [data.id]: {
                                                  ...current,
                                                  cash_surrender_values: updatedValues
                                                }
                                              };
                                            }

                                            return prev; // No change if no valid age found
                                          });
                                        }}
                                        className="mt-3 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      >
                                        + Add Age
                                      </button>
                                      <div className="text-xs text-gray-500 mt-2">
                                        💡 Edit ages and values. Use ✕ to remove ages or + Add Age to create new ones.
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Commission Rates Section */}
                        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
                          <h3 className="text-xl font-semibold text-gray-900 mb-4">💰 Commission Rates</h3>
                          {loadingCommissions ? (
                            <div className="text-center py-8">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                              <p className="text-gray-600">Loading commission rates...</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {extractedData.map((data: any, index: number) => {
                                const commission = commissionData[data.matched_insurance_id];
                                console.log('🔍 COMMISSION DISPLAY DEBUG:', {
                                  insuranceName: data.final_insurance_name,
                                  matchedInsuranceId: data.matched_insurance_id,
                                  commissionData: commissionData,
                                  foundCommission: commission,
                                  hasCommission: !!commission
                                });
                                return (
                                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                                    <h4 className="font-medium text-lg text-gray-900 mb-3">{data.final_insurance_name}</h4>
                                    {commission ? (
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {commission.commissions_by_term && Object.keys(commission.commissions_by_term).length > 1 ? (
                                          // Multiple premium terms - show expandable view
                                          <div className="col-span-full">
                                            <div className="bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-400 mb-3">
                                              <p className="text-sm text-yellow-800">This product has multiple premium terms. Click to expand details.</p>
                                            </div>
                                            {Object.entries(commission.commissions_by_term).map(([term, rates]: [string, any]) => (
                                              <div key={term} className="mb-4 border border-gray-200 rounded-lg p-3">
                                                <h5 className="font-medium text-gray-900 mb-2">Premium Term: {term}</h5>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                  {rates.sort((a: any, b: any) => a.commission_year - b.commission_year).map((rate: any, rateIndex: number) => (
                                                    <div key={rateIndex} className="text-sm">
                                                      <span className="text-gray-600">Year {rate.commission_year}:</span>
                                                      <span className="ml-2 font-bold text-green-600">{rate.commission_rate}%</span>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          // Single premium term - show simple view with term name
                                          commission.commissions_by_term && Object.keys(commission.commissions_by_term).length === 1 && (
                                            <div className="col-span-full">
                                              {Object.entries(commission.commissions_by_term).map(([term, rates]: [string, any]) => (
                                                <div key={term} className="mb-4">
                                                  <h5 className="font-medium text-gray-900 mb-3">Premium Term: {term}</h5>
                                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                    {(rates as any[])
                                                      .sort((a: any, b: any) => a.commission_year - b.commission_year)
                                                      .map((rate: any, rateIndex: number) => (
                                                      <div key={rateIndex} className="bg-green-50 p-3 rounded-lg">
                                                        <div className="text-sm text-green-700">Year {rate.commission_year}</div>
                                                        <div className="text-lg font-bold text-green-600">{rate.commission_rate}%</div>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )
                                        )}
                                      </div>
                                    ) : (
                                      <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                                        No commission data available for this insurance product.
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Highlighted Insurance Selection */}
                        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
                          <h3 className="text-xl font-semibold text-gray-900 mb-4">⭐ Select Highlighted Insurance</h3>
                          <div className="space-y-3">
                            {extractedData.map((data: any, index: number) => (
                              <label key={index} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                                <input
                                  type="radio"
                                  name="highlightedInsurance"
                                  value={data.matched_insurance_id}
                                  checked={selectedHighlightedInsurance === data.matched_insurance_id}
                                  onChange={(e) => setSelectedHighlightedInsurance(e.target.value)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                />
                                <span className="ml-3 font-medium text-gray-900">{data.final_insurance_name}</span>
                                <span className="ml-2 text-sm text-gray-500">by {getFieldValue(data, 'insurance_provider', 'Unknown Provider')}</span>
                              </label>
                            ))}
                          </div>
                          <button
                            onClick={() => generatePage4Content(false)}
                            disabled={!selectedHighlightedInsurance || generatingPage4}
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                          >
                            {generatingPage4 ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Generating...</span>
                              </>
                            ) : (
                              <span>Generate Page 4 Recommendation</span>
                            )}
                          </button>
                        </div>

                        {/* Page 4: Recommendation */}
                        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
                          <h3 className="text-xl font-semibold text-gray-900 mb-4">🎯 Page 4: Final Recommendation</h3>
                          
                          {page4Content ? (
                            <div className="space-y-6">
                              {/* Recommended Insurance Header */}
                              <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                                <h4 className="font-medium text-green-800 text-lg mb-2">Recommended Insurance Product</h4>
                                <div className="text-green-700">
                                  <span className="font-bold">{page4Content.recommendedInsuranceName}</span>
                                  <span className="ml-2">by {page4Content.provider}</span>
                                </div>
                              </div>

                              {/* Key Features */}
                              <div>
                                <h5 className="font-medium text-gray-800 mb-3">🔑 Key Features</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {page4Content.keyFeatures.map((featureObj: any, index: number) => (
                                    <div key={index} className="flex items-center p-3 bg-blue-50 rounded-lg">
                                      <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                                      <span className="text-sm text-blue-800">
                                        {typeof featureObj === 'string' ? featureObj : featureObj.feature}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Recommendation Reasoning */}
                              <div>
                                <h5 className="font-medium text-gray-800 mb-3">💡 Why We Recommend This Product</h5>
                                <textarea
                                  rows={3}
                                  value={page4Content.recommendation}
                                  onChange={(e) => setPage4Content(prev => ({...prev, recommendation: e.target.value}))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>

                              {/* Key Advantages */}
                              <div>
                                <h5 className="font-medium text-gray-800 mb-3">✨ Key Advantages for Your Needs</h5>
                                <div className="space-y-2">
                                  {page4Content.advantages.map((advantageObj: any, index: number) => {
                                    const advantage = typeof advantageObj === 'string' ? advantageObj : advantageObj.benefit;
                                    return (
                                    <div key={index} className="flex items-start p-3 bg-purple-50 rounded-lg">
                                      <div className="w-5 h-5 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                                        {index + 1}
                                      </div>
                                      <input
                                        type="text"
                                        value={advantage}
                                        onChange={(e) => {
                                          const newAdvantages = [...page4Content.advantages];
                                          if (typeof advantageObj === 'string') {
                                            newAdvantages[index] = e.target.value;
                                          } else {
                                            newAdvantages[index] = { ...advantageObj, benefit: e.target.value };
                                          }
                                          setPage4Content(prev => ({...prev, advantages: newAdvantages}));
                                        }}
                                        className="flex-1 text-sm text-purple-800 bg-transparent border-none focus:outline-none focus:ring-0"
                                      />
                                    </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              {selectedHighlightedInsurance ? 
                                'Click "Generate Page 4 Recommendation" above to create recommendation content' :
                                'Select a highlighted insurance above to generate recommendation content'
                              }
                            </div>
                          )}
                        </div>

                        {/* Save and Generate Buttons */}
                        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
                          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 md:space-x-4">
                            <div className="text-sm text-gray-600">
                              {page4Content ? 
                                'All sections completed. Ready to generate proposal.' :
                                selectedHighlightedInsurance ?
                                'Generate Page 4 recommendation to complete the proposal.' :
                                'Select highlighted insurance and generate recommendation to continue.'
                              }
                            </div>
                            <div className="flex space-x-4">
                              <button 
                                onClick={handleSaveDraft}
                                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                Save Draft
                              </button>
                              <button 
                                onClick={handleGenerateProposal}
                                disabled={!page4Content}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Generate Proposal
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 text-center">
                        <p className="text-gray-600">Please map all illustrations to insurance products before proceeding with proposal creation.</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Mapped: {extractedData.filter((data: any) => data.matched_insurance_id).length} / {extractedData.length}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual Assignment Modal */}
      {manualAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Manual Insurance Assignment
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Insurance Name
              </label>
              <input
                type="text"
                value={manualAssignment.insuranceName}
                onChange={(e) => setManualAssignment({
                  ...manualAssignment,
                  insuranceName: e.target.value
                })}
                placeholder="Enter exact insurance name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setManualAssignment(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleManualAssignment}
                disabled={!manualAssignment.insuranceName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insurance Mapping Modal */}
      {showMappingModal && selectedIllustration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Map Insurance Product
              </h3>
              <button
                onClick={() => {
                  setShowMappingModal(false);
                  setSelectedIllustration(null);
                  setInsuranceSearchQuery('');
                  setSearchResults([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-medium">File:</span> {selectedIllustration.original_filename}
              </p>
              <p className="text-sm text-blue-800">
                <span className="font-medium">Extracted Name:</span> {selectedIllustration.comprehensive_data?.insurance_name || selectedIllustration.extracted_insurance_name || 'Not extracted'}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Insurance Database
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={insuranceSearchQuery}
                  onChange={(e) => {
                    setInsuranceSearchQuery(e.target.value);
                    searchInsuranceProducts(e.target.value);
                  }}
                  placeholder="Type to search insurance products..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {isSearching && (
                  <div className="absolute right-3 top-2.5">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Search Results */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {searchResults.length === 0 && insuranceSearchQuery.length >= 2 && !isSearching && (
                <div className="text-center py-4 text-gray-500">
                  No insurance products found for "{insuranceSearchQuery}"
                </div>
              )}
              
              {searchResults.map((insurance) => (
                <div
                  key={insurance.insurance_id}
                  className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleMapInsurance(insurance.insurance_id, insurance.insurance_name)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{insurance.insurance_name}</h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                        <span>Provider: {insurance.provider}</span>
                        <span>Category: {insurance.category}</span>
                        {insurance.currency && <span>Currency: {insurance.currency}</span>}
                      </div>
                    </div>
                    <button className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors">
                      Select
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowMappingModal(false);
                  setSelectedIllustration(null);
                  setInsuranceSearchQuery('');
                  setSearchResults([]);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </Sidebar>
  );
}

export default function ProposalDetailPage() {
  return (
    <ProtectedRoute>
      <ProposalDetailContent />
    </ProtectedRoute>
  );
}