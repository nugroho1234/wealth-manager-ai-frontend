'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import { UserRole } from '@/types/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useParams } from 'next/navigation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';


interface Commission {
  commission_id: string;
  insurance_id: string;
  premium_term: string;
  role_id: number;
  commission_year: number;
  commission_rate: number;
  role_name?: string;
}

interface CommissionFormData {
  premium_term: string;
  role_id: number;
  commission_year: number;
  commission_rate: number;
}

interface YearSection {
  year: number;
  rates: {
    3: number; // Advisor
    4: number; // Leader 1
    5: number; // Leader 2
    6: number; // Senior Partner
  };
}

function CommissionEditContent() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  
  // Helper function to get auth token
  const getAuthToken = () => {
    const authTokensStr = localStorage.getItem('auth_tokens');
    if (authTokensStr) {
      try {
        const authTokens = JSON.parse(authTokensStr);
        return authTokens?.access_token;
      } catch (e) {
        console.error('Failed to parse auth tokens:', e);
      }
    }
    return null;
  };
  
  const insurance_id = params.insurance_id as string;
  const insurance_name = searchParams.get('name') || 'Unknown Insurance';
  const provider = searchParams.get('provider') || 'Unknown Provider';

  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCommission, setEditingCommission] = useState<Commission | null>(null);
  
  // New state for inline editing
  const [editMode, setEditMode] = useState(false);
  const [editingData, setEditingData] = useState<Record<string, Record<string, number>>>({});
  const [pendingChanges, setPendingChanges] = useState<Record<string, any>>({});

  const [formData, setFormData] = useState<CommissionFormData>({
    premium_term: '',
    role_id: 3, // Default to ADVISOR
    commission_year: 1,
    commission_rate: 0
  });

  // Enhanced form state for bulk entry
  const [bulkFormData, setBulkFormData] = useState({
    premium_term: '',
    yearSections: [
      { year: 1, rates: { 3: 0, 4: 0, 5: 0, 6: 0 } }
    ] as YearSection[]
  });

  useEffect(() => {
    fetchData();
  }, [insurance_id]);

  const fetchData = async () => {
    try {
      await fetchCommissions();
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };


  const fetchCommissions = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/oracle/commissions/insurance/${insurance_id}`,
        {
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        // Add role names to commissions
        const commissionsWithRoles = data.map((commission: Commission) => ({
          ...commission,
          role_name: getRoleName(commission.role_id)
        }));
        setCommissions(commissionsWithRoles);
        
        // Initialize editing data after commissions are loaded
        if (!editMode) {
          const editData: Record<string, Record<string, number>> = {};
          commissionsWithRoles.forEach((commission: Commission) => {
            const key = `${commission.premium_term}-${commission.commission_year}`;
            if (!editData[key]) {
              editData[key] = {};
            }
            editData[key][commission.role_id] = commission.commission_rate;
          });
          setEditingData(editData);
        }
      }
    } catch (error) {
      console.error('Error fetching commissions:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingCommission
        ? `${API_BASE_URL}/api/v1/oracle/commissions/${editingCommission.commission_id}`
        : `${API_BASE_URL}/api/v1/oracle/commissions`;

      const method = editingCommission ? 'PUT' : 'POST';
      
      const payload = editingCommission
        ? formData
        : { ...formData, insurance_id };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await fetchCommissions();
        resetForm();
        setShowAddForm(false);
        setEditingCommission(null);
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail || 'Failed to save commission'}`);
      }
    } catch (error) {
      console.error('Error saving commission:', error);
      alert('Failed to save commission');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (commissionId: string) => {
    if (!confirm('Are you sure you want to delete this commission rate?')) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/oracle/commissions/${commissionId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
          },
        }
      );

      if (response.ok) {
        await fetchCommissions();
      } else {
        alert('Failed to delete commission');
      }
    } catch (error) {
      console.error('Error deleting commission:', error);
      alert('Failed to delete commission');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (commission: Commission) => {
    setEditingCommission(commission);
    setFormData({
      premium_term: commission.premium_term,
      role_id: commission.role_id,
      commission_year: commission.commission_year,
      commission_rate: commission.commission_rate
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      premium_term: '',
      role_id: 3,
      commission_year: 1,
      commission_rate: 0
    });
    setEditingCommission(null);
  };

  const getRoleName = (roleId: number) => {
    const roleNames: { [key: number]: string } = {
      3: 'ADVISOR',
      4: 'LEADER 1', 
      5: 'LEADER 2',
      6: 'SENIOR PARTNER'
    };
    return roleNames[roleId] || 'Unknown';
  };

  // Bulk form functions
  const addYearSection = () => {
    if (bulkFormData.yearSections.length >= 10) {
      alert('Maximum 10 years allowed');
      return;
    }
    
    // Find the next available year starting from 1
    const existingYears = bulkFormData.yearSections.map(s => s.year).sort((a, b) => a - b);
    let nextYear = 1;
    for (const year of existingYears) {
      if (nextYear === year) {
        nextYear++;
      } else {
        break;
      }
    }
    
    setBulkFormData(prev => ({
      ...prev,
      yearSections: [...prev.yearSections, {
        year: nextYear,
        rates: { 3: 0, 4: 0, 5: 0, 6: 0 }
      }]
    }));
  };

  const removeYearSection = (yearToRemove: number) => {
    if (bulkFormData.yearSections.length === 1) {
      alert('At least one year is required');
      return;
    }
    setBulkFormData(prev => ({
      ...prev,
      yearSections: prev.yearSections.filter(section => section.year !== yearToRemove)
    }));
  };

  const updateYearNumber = (oldYear: number, newYear: number) => {
    if (newYear < 1 || newYear > 10) {
      alert('Year must be between 1 and 10');
      return;
    }
    
    // Check if new year already exists
    if (bulkFormData.yearSections.some(section => section.year === newYear && section.year !== oldYear)) {
      alert(`Year ${newYear} already exists`);
      return;
    }

    setBulkFormData(prev => ({
      ...prev,
      yearSections: prev.yearSections.map(section => 
        section.year === oldYear ? { ...section, year: newYear } : section
      ).sort((a, b) => a.year - b.year)
    }));
  };

  const updateRate = (year: number, roleId: number, rate: number) => {
    setBulkFormData(prev => ({
      ...prev,
      yearSections: prev.yearSections.map(section =>
        section.year === year
          ? { ...section, rates: { ...section.rates, [roleId]: rate } }
          : section
      )
    }));
  };

  const copyFromYear = (sourceYear: number, targetYear: number) => {
    const sourceSection = bulkFormData.yearSections.find(s => s.year === sourceYear);
    if (!sourceSection) return;

    setBulkFormData(prev => ({
      ...prev,
      yearSections: prev.yearSections.map(section =>
        section.year === targetYear
          ? { ...section, rates: { ...sourceSection.rates } }
          : section
      )
    }));
  };

  const resetBulkForm = () => {
    setBulkFormData({
      premium_term: '',
      yearSections: [{ year: 1, rates: { 3: 0, 4: 0, 5: 0, 6: 0 } }]
    });
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bulkFormData.premium_term.trim()) {
      alert('Premium term is required');
      return;
    }

    setSaving(true);
    try {
      const token = getAuthToken();
      if (!token) {
        alert('Authentication token not found. Please log in again.');
        return;
      }

      // Create all commission records
      const promises = [];
      let hasZeroRates = false;
      
      // Check if there are any zero rates
      for (const yearSection of bulkFormData.yearSections) {
        for (const roleId of [3, 4, 5, 6]) {
          const rate = yearSection.rates[roleId as keyof typeof yearSection.rates];
          if (rate === 0) {
            hasZeroRates = true;
            break;
          }
        }
        if (hasZeroRates) break;
      }
      
      // Ask once about zero rates if any exist
      const includeZeroRates = !hasZeroRates || confirm(
        'Some commission rates are set to 0%. Do you want to include these 0% rates in the database?\n\nClick OK to include all rates, or Cancel to skip 0% rates.'
      );
      
      for (const yearSection of bulkFormData.yearSections) {
        for (const roleId of [3, 4, 5, 6]) {
          const rate = yearSection.rates[roleId as keyof typeof yearSection.rates];
          
          // Include rate if it's non-zero OR user chose to include zero rates
          if (rate > 0 || includeZeroRates) {
            const commissionData = {
              insurance_id: insurance_id,
              premium_term: bulkFormData.premium_term.trim(),
              role_id: roleId,
              commission_year: yearSection.year,
              commission_rate: rate
            };

            promises.push(
              fetch(`${API_BASE_URL}/api/v1/oracle/commissions`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(commissionData),
              })
            );
          }
        }
      }

      // Execute all requests
      const responses = await Promise.all(promises);
      
      // Check if all requests succeeded
      const failures = responses.filter(response => !response.ok);
      if (failures.length > 0) {
        const errorMessages = await Promise.all(
          failures.map(async (response) => {
            const error = await response.text();
            return `${response.status}: ${error}`;
          })
        );
        alert(`Some commission rates failed to save:\n${errorMessages.join('\n')}`);
      } else {
        alert(`Successfully created ${responses.length} commission rates!`);
        resetBulkForm();
        setShowAddForm(false);
        await fetchCommissions();
      }
      
    } catch (error) {
      console.error('Error saving bulk commission rates:', error);
      alert('Failed to save commission rates');
    } finally {
      setSaving(false);
    }
  };

  // Initialize editing data when commissions load
  const initializeEditingData = () => {
    const data: Record<string, Record<string, number>> = {};
    commissions.forEach((commission) => {
      // Validate commission year before adding to editing data
      if (commission.commission_year > 0 && commission.commission_year <= 10) {
        const key = `${commission.premium_term}-${commission.commission_year}`;
        if (!data[key]) {
          data[key] = {};
        }
        data[key][commission.role_id] = commission.commission_rate;
      }
    });
    setEditingData(data);
    
    // Clean up any invalid entries from previous sessions
    cleanupInvalidEditingData();
  };

  // Clean up any invalid entries in editing data
  const cleanupInvalidEditingData = () => {
    setEditingData(prev => {
      const cleaned: Record<string, Record<string, number>> = {};
      Object.entries(prev).forEach(([key, rates]) => {
        const parts = key.split('-');
        if (parts.length >= 2) {
          const yearPart = parts[parts.length - 1];
          const year = parseInt(yearPart);
          if (!isNaN(year) && year > 0 && year <= 10) {
            cleaned[key] = rates;
          }
        }
      });
      return cleaned;
    });

    // Clean up pending changes too
    setPendingChanges(prev => {
      const cleaned: Record<string, any> = {};
      Object.entries(prev).forEach(([key, change]) => {
        if (change.commission_year > 0 && change.commission_year <= 10) {
          cleaned[key] = change;
        }
      });
      return cleaned;
    });
  };

  // Handle cell edit
  const handleCellEdit = (premiumTerm: string, year: number, roleId: number, value: number) => {
    const key = `${premiumTerm}-${year}`;
    setEditingData(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [roleId]: value
      }
    }));

    // Track pending changes
    const changeKey = `${premiumTerm}-${year}-${roleId}`;
    setPendingChanges(prev => ({
      ...prev,
      [changeKey]: {
        premium_term: premiumTerm,
        commission_year: year,
        role_id: roleId,
        commission_rate: value
      }
    }));
  };

  // Add new year for a premium term
  const handleAddYear = (premiumTerm: string) => {
    // Get all existing years for this premium term from both database and editing state
    const existingYears = new Set<number>();
    
    // Add years from database
    commissions
      .filter(c => c.premium_term === premiumTerm)
      .forEach(c => existingYears.add(c.commission_year));
    
    // Add years from editing state
    Object.keys(editingData)
      .filter(key => key.startsWith(premiumTerm + '-'))
      .forEach(key => {
        // Extract year from the end of the key
        const lastDashIndex = key.lastIndexOf('-');
        if (lastDashIndex > 0) {
          const yearPart = key.substring(lastDashIndex + 1);
          const year = parseInt(yearPart);
          if (!isNaN(year) && year > 0 && year <= 10) { // Validate year
            existingYears.add(year);
          }
        }
      });
    
    // Find next available year starting from 1
    const sortedYears = Array.from(existingYears).sort((a, b) => a - b);
    let newYear = 1;
    for (const year of sortedYears) {
      if (newYear === year) {
        newYear++;
      } else {
        break;
      }
    }

    // Initialize new year with 0% for all roles
    const key = `${premiumTerm}-${newYear}`;
    const newYearData: Record<string, number> = {};
    [3, 4, 5, 6].forEach(roleId => {
      newYearData[roleId] = 0;
    });

    setEditingData(prev => ({
      ...prev,
      [key]: newYearData
    }));

    // Add to pending changes
    [3, 4, 5, 6].forEach(roleId => {
      const changeKey = `${premiumTerm}-${newYear}-${roleId}`;
      setPendingChanges(prev => ({
        ...prev,
        [changeKey]: {
          premium_term: premiumTerm,
          commission_year: newYear,
          role_id: roleId,
          commission_rate: 0
        }
      }));
    });
  };

  // Delete entire year for a premium term
  const handleDeleteYear = async (premiumTerm: string, year: number) => {
    if (!confirm(`Are you sure you want to delete Year ${year} for Premium Term "${premiumTerm}"?\n\nThis will remove commission rates for all roles (Advisor, Leader 1, Leader 2, Senior Partner) in this year.`)) {
      return;
    }

    setSaving(true);
    try {
      // Find all commissions for this premium term and year
      const commissionsToDelete = commissions.filter(
        c => c.premium_term === premiumTerm && c.commission_year === year
      );

      // Delete each commission
      for (const commission of commissionsToDelete) {
        await fetch(`${API_BASE_URL}/api/v1/oracle/commissions/${commission.commission_id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
          },
        });
      }

      // Remove from editing data
      const key = `${premiumTerm}-${year}`;
      setEditingData(prev => {
        const newData = { ...prev };
        delete newData[key];
        return newData;
      });

      // Remove from pending changes
      const keysToRemove = Object.keys(pendingChanges).filter(
        changeKey => changeKey.startsWith(`${premiumTerm}-${year}-`)
      );
      setPendingChanges(prev => {
        const newChanges = { ...prev };
        keysToRemove.forEach(key => delete newChanges[key]);
        return newChanges;
      });

      // Refresh data
      await fetchCommissions();
      
    } catch (error) {
      console.error('Error deleting year:', error);
      alert('Failed to delete year');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePremiumTerm = async (premiumTerm: string) => {
    if (!confirm(`Are you sure you want to delete the entire Premium Term "${premiumTerm}"?\n\nThis will permanently remove ALL commission rates for ALL roles and ALL years under this premium term.\n\nThis action cannot be undone.`)) {
      return;
    }

    setSaving(true);
    try {
      const token = getAuthToken();
      if (!token) {
        alert('Authentication token not found. Please log in again.');
        return;
      }

      // Get all commissions for this premium term from database
      const commissionsToDelete = commissions.filter(c => c.premium_term === premiumTerm);
      
      // Check if this is a phantom premium term (exists only in editingData)
      const phantomKeys = Object.keys(editingData).filter(key => key.startsWith(premiumTerm + '-'));
      const phantomPendingKeys = Object.keys(pendingChanges).filter(key => 
        pendingChanges[key].premium_term === premiumTerm
      );
      
      if (commissionsToDelete.length === 0) {
        // This is a phantom premium term - only exists in frontend state
        if (phantomKeys.length > 0 || phantomPendingKeys.length > 0) {
          // Just clean up local state
          setEditingData(prev => {
            const newData = { ...prev };
            phantomKeys.forEach(key => delete newData[key]);
            return newData;
          });

          setPendingChanges(prev => {
            const newChanges = { ...prev };
            phantomPendingKeys.forEach(key => delete newChanges[key]);
            return newChanges;
          });
          
          alert(`Removed phantom premium term "${premiumTerm}" from display (it was not saved to database).`);
          return;
        } else {
          alert('No commissions found for this premium term.');
          return;
        }
      }

      // Delete all commissions for this premium term
      const deletePromises = commissionsToDelete.map(commission =>
        fetch(`${API_BASE_URL}/api/v1/oracle/commissions/${commission.commission_id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
      );

      const responses = await Promise.all(deletePromises);
      
      // Check if all deletions succeeded
      const failures = responses.filter(response => !response.ok);
      if (failures.length > 0) {
        alert(`Failed to delete ${failures.length} commission records. Please try again.`);
        return;
      }

      // Clean up local state
      const keysToRemove = Object.keys(editingData).filter(key => key.startsWith(premiumTerm + '-'));
      const pendingKeysToRemove = Object.keys(pendingChanges).filter(key => 
        pendingChanges[key].premium_term === premiumTerm
      );

      setEditingData(prev => {
        const newData = { ...prev };
        keysToRemove.forEach(key => delete newData[key]);
        return newData;
      });

      setPendingChanges(prev => {
        const newChanges = { ...prev };
        pendingKeysToRemove.forEach(key => delete newChanges[key]);
        return newChanges;
      });

      // Refresh commissions data
      await fetchCommissions();
      
      alert(`Successfully deleted premium term "${premiumTerm}" and all associated commission rates (${commissionsToDelete.length} records).`);
      
    } catch (error) {
      console.error('Error deleting premium term:', error);
      alert('Failed to delete premium term. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Save all pending changes
  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const changes = Object.values(pendingChanges);

      console.log('💾 Saving changes:', changes);

      let successCount = 0;
      let errorCount = 0;

      for (const change of changes) {
        // Check if commission already exists
        const existing = commissions.find(
          c => c.premium_term === change.premium_term &&
               c.commission_year === change.commission_year &&
               c.role_id === change.role_id
        );

        try {
          let response;
          if (existing) {
            // Update existing commission
            console.log(`Updating commission ${existing.commission_id}:`, change);
            response = await fetch(`${API_BASE_URL}/api/v1/oracle/commissions/${existing.commission_id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`,
              },
              body: JSON.stringify({
                commission_rate: change.commission_rate
              }),
            });
          } else {
            // Create new commission
            console.log('Creating new commission:', { ...change, insurance_id });
            response = await fetch(`${API_BASE_URL}/api/v1/oracle/commissions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`,
              },
              body: JSON.stringify({
                ...change,
                insurance_id
              }),
            });
          }

          if (response.ok) {
            successCount++;
          } else {
            const errorData = await response.json();
            console.error(`Failed to save commission:`, errorData);
            errorCount++;
          }
        } catch (err) {
          console.error('Error saving individual commission:', err);
          errorCount++;
        }
      }

      // Refresh data
      await fetchCommissions();
      setPendingChanges({});
      setEditMode(false);

      // Show result
      if (errorCount === 0) {
        alert(`✅ Successfully saved ${successCount} commission rate(s)`);
      } else {
        alert(`⚠️ Saved ${successCount} commission rate(s), but ${errorCount} failed. Check console for details.`);
      }

    } catch (error) {
      console.error('Error saving changes:', error);
      alert('❌ Failed to save changes. Please check the console for details.');
    } finally {
      setSaving(false);
    }
  };

  // Group commissions by premium term and year for better display
  const groupedCommissions = commissions.reduce((acc, commission) => {
    const key = `${commission.premium_term}-${commission.commission_year}`;
    if (!acc[key]) {
      acc[key] = {
        premium_term: commission.premium_term,
        commission_year: commission.commission_year,
        rates: []
      };
    }
    acc[key].rates.push(commission);
    return acc;
  }, {} as Record<string, { premium_term: string; commission_year: number; rates: Commission[] }>);

  // Restrict access to SUPER_ADMIN only
  if (user?.role !== UserRole.SUPER_ADMIN) {
    return (
      <Sidebar>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h1>
            <p className="text-gray-600">Only Super Administrators can manage commissions.</p>
          </div>
        </div>
      </Sidebar>
    );
  }

  if (loading) {
    return (
      <Sidebar>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading commission data...</p>
          </div>
        </div>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <main className="max-w-6xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center text-primary-600 hover:text-primary-700 mb-4"
            >
              <span className="mr-2">←</span>
              Back to Commission Management
            </button>
            
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{insurance_name}</h1>
                <p className="text-gray-600">Provider: {provider}</p>
              </div>
              <button
                onClick={() => {
                  resetBulkForm();
                  setShowAddForm(!showAddForm);
                }}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {showAddForm ? 'Cancel' : 'Add Commission Rates'}
              </button>
            </div>
          </div>

          {/* Enhanced Bulk Add Form */}
          {showAddForm && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Add Commission Rates
              </h3>
              
              <form onSubmit={handleBulkSubmit} className="space-y-6">
                {/* Premium Term */}
                <div className="border-b border-gray-200 pb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Premium Term *
                  </label>
                  <input
                    type="text"
                    value={bulkFormData.premium_term}
                    onChange={(e) => setBulkFormData(prev => ({ ...prev, premium_term: e.target.value }))}
                    placeholder="e.g., 10-14 yr, above 25yr, 10"
                    className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>

                {/* Years & Commission Rates */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">Years & Commission Rates</h4>
                    <button
                      type="button"
                      onClick={addYearSection}
                      disabled={bulkFormData.yearSections.length >= 10}
                      className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-3 py-2 rounded text-sm transition-colors"
                    >
                      ➕ Add Another Year
                    </button>
                  </div>

                  <div className="space-y-4">
                    {bulkFormData.yearSections.map((yearSection, index) => (
                      <div key={`${yearSection.year}-${index}`} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-4">
                            <label className="text-sm font-medium text-gray-700">Year:</label>
                            <input
                              type="number"
                              value={yearSection.year}
                              onChange={(e) => updateYearNumber(yearSection.year, parseInt(e.target.value))}
                              min="1"
                              max="10"
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            {bulkFormData.yearSections.length > 1 && (
                              <select
                                onChange={(e) => e.target.value && copyFromYear(parseInt(e.target.value), yearSection.year)}
                                className="text-xs px-2 py-1 border border-gray-300 rounded"
                                defaultValue=""
                              >
                                <option value="">Copy from...</option>
                                {bulkFormData.yearSections
                                  .filter(s => s.year !== yearSection.year)
                                  .map(s => (
                                    <option key={s.year} value={s.year}>Year {s.year}</option>
                                  ))}
                              </select>
                            )}
                            {bulkFormData.yearSections.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeYearSection(yearSection.year)}
                                className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-sm transition-colors"
                              >
                                ❌ Remove
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Role commission inputs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {[
                            { roleId: 3, name: 'Advisor', color: 'blue' },
                            { roleId: 4, name: 'Leader 1', color: 'green' },
                            { roleId: 5, name: 'Leader 2', color: 'purple' },
                            { roleId: 6, name: 'Senior Partner', color: 'orange' }
                          ].map(({ roleId, name, color }) => (
                            <div key={roleId}>
                              <label className={`block text-sm font-medium text-${color}-700 mb-1`}>
                                {name}:
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  value={yearSection.rates[roleId as keyof typeof yearSection.rates]}
                                  onChange={(e) => updateRate(yearSection.year, roleId, parseFloat(e.target.value) || 0)}
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  className={`w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-${color}-500 focus:border-${color}-500`}
                                  placeholder="0.00"
                                />
                                <span className="absolute right-2 top-2 text-gray-500 text-sm">%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      resetBulkForm();
                      setShowAddForm(false);
                    }}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={resetBulkForm}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      🔄 Reset Form
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-colors font-medium"
                    >
                      {saving ? 'Saving...' : '💾 Save All Commission Rates'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Commission Rates Display - Inline Editing */}
          {Object.keys(editingData).length > 0 || Object.keys(groupedCommissions).length > 0 ? (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Commission Rate Structure</h2>
                
                {/* Control buttons */}
                <div className="flex items-center space-x-3">
                  {editMode && Object.keys(pendingChanges).length > 0 && (
                    <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-sm font-medium">
                      {Object.keys(pendingChanges).length} pending changes
                    </span>
                  )}
                  
                  {!editMode ? (
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => {
                          // Clean up any invalid state before entering edit mode
                          cleanupInvalidEditingData();
                          setEditMode(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        📝 Edit Mode
                      </button>
                      <button
                        onClick={() => {
                          // Refresh data to clean up any issues
                          fetchCommissions();
                          setEditingData({});
                          setPendingChanges({});
                        }}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded-lg transition-colors text-sm"
                        title="Refresh data to clean up display issues"
                      >
                        🔄 Refresh
                      </button>
                    </div>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSaveAll}
                        disabled={saving || Object.keys(pendingChanges).length === 0}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        {saving ? 'Saving...' : '💾 Save All'}
                      </button>
                      <button
                        onClick={() => {
                          setEditMode(false);
                          setPendingChanges({});
                          initializeEditingData();
                        }}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        ❌ Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Group by Premium Term */}
              {Array.from(new Set([
                ...Object.values(groupedCommissions).map(g => g.premium_term),
                ...Object.keys(editingData).map(key => {
                  // Parse premium term from key format "premiumTerm-year"
                  // Find the last dash to separate premium term from year
                  const lastDashIndex = key.lastIndexOf('-');
                  if (lastDashIndex > 0) {
                    const potentialYear = key.substring(lastDashIndex + 1);
                    // If it's a valid year (number), extract premium term
                    if (!isNaN(parseInt(potentialYear)) && parseInt(potentialYear) > 0 && parseInt(potentialYear) <= 10) {
                      return key.substring(0, lastDashIndex);
                    }
                  }
                  return key; // Fallback if parsing fails
                })
              ])).filter(premiumTerm => {
                // Only show premium terms that have valid data
                const hasDbData = Object.values(groupedCommissions).some(g => g.premium_term === premiumTerm);
                const hasEditingData = Object.keys(editingData).some(key => key.startsWith(premiumTerm + '-'));
                return hasDbData || hasEditingData;
              }).map((premiumTerm) => {
                // Get all years for this premium term
                const allYears = new Set<number>();
                
                // Add years from editingData with validation
                Object.keys(editingData)
                  .filter(key => key.startsWith(premiumTerm + '-'))
                  .forEach(key => {
                    // Extract year from the end of the key
                    const lastDashIndex = key.lastIndexOf('-');
                    if (lastDashIndex > 0) {
                      const yearPart = key.substring(lastDashIndex + 1);
                      const year = parseInt(yearPart);
                      if (!isNaN(year) && year > 0 && year <= 10) { // Validate year range
                        allYears.add(year);
                      }
                    }
                  });
                
                // Add years from database commissions
                Object.values(groupedCommissions)
                  .filter(g => g.premium_term === premiumTerm)
                  .forEach(g => {
                    if (g.commission_year > 0 && g.commission_year <= 10) { // Validate year range
                      allYears.add(g.commission_year);
                    }
                  });
                
                const sortedYears = Array.from(allYears).sort((a, b) => a - b);
                
                return (
                  <div key={premiumTerm} className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-semibold text-gray-900">
                        Premium Term: {premiumTerm}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                          {sortedYears.length} year{sortedYears.length !== 1 ? 's' : ''} configured
                        </span>
                        {editMode && (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleAddYear(premiumTerm)}
                              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                            >
                              ➕ Add Year
                            </button>
                            <button
                              onClick={() => handleDeletePremiumTerm(premiumTerm)}
                              disabled={saving}
                              className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm transition-colors"
                              title={`Delete entire premium term "${premiumTerm}" and all associated commission rates`}
                            >
                              🗑️ Delete Term
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Inline Editable Commission Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse bg-white rounded-lg overflow-hidden shadow-sm">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Year</th>
                            <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Advisor</th>
                            <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Leader 1</th>
                            <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Leader 2</th>
                            <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Senior Partner</th>
                            {editMode && <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Actions</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {sortedYears.map((year) => {
                            const key = `${premiumTerm}-${year}`;
                            const yearData = editingData[key] || {};
                            
                            return (
                              <tr key={year} className="hover:bg-gray-50">
                                <td className="border border-gray-200 px-4 py-3 font-semibold text-gray-900">
                                  Year {year}
                                </td>
                                {[3, 4, 5, 6].map((roleId, index) => {
                                  const colors = ['text-blue-600', 'text-green-600', 'text-purple-600', 'text-orange-600'];
                                  const value = yearData[roleId] || 0;
                                  
                                  return (
                                    <td key={roleId} className="border border-gray-200 px-4 py-3 text-center">
                                      {editMode ? (
                                        <input
                                          type="number"
                                          min="0"
                                          max="100"
                                          step="0.01"
                                          value={value}
                                          onChange={(e) => handleCellEdit(premiumTerm, year, roleId, parseFloat(e.target.value) || 0)}
                                          className="w-16 px-2 py-1 border rounded text-center font-bold text-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                      ) : (
                                        <span className={`font-bold text-lg ${colors[index]}`}>
                                          {value}%
                                        </span>
                                      )}
                                    </td>
                                  );
                                })}
                                {editMode && (
                                  <td className="border border-gray-200 px-4 py-3 text-center">
                                    <button
                                      onClick={() => handleDeleteYear(premiumTerm, year)}
                                      disabled={saving}
                                      className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white px-2 py-1 rounded text-sm transition-colors"
                                      title={`Delete Year ${year} and all commission rates`}
                                    >
                                      🗑️ Delete
                                    </button>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No commission rates configured</h3>
              <p className="text-gray-600">Add commission rates for different roles and premium terms.</p>
            </div>
          )}
        </main>
      </div>
    </Sidebar>
  );
}

export default function CommissionEditPage() {
  return (
    <ProtectedRoute>
      <CommissionEditContent />
    </ProtectedRoute>
  );
}