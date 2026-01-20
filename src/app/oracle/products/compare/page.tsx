'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import { apiClient } from '@/lib/api';

interface Product {
  insurance_id: string;
  insurance_name: string;
  provider: string;
  provider_country?: string;
  category: string;
  key_features?: string;
  key_features_bullets?: string;
  age_of_entry?: string;
  premium?: string;
  minimum_sum_assured?: string;
  maximum_sum_assured?: string;
  guaranteed_interest_rate?: string;
  historical_performance?: string;
  insurance_yield?: string;
  riders_addons?: string;
  premium_payment_options?: string;
  death_benefit_options?: string;
  suitable_for?: string;
  time_horizon?: string;
  specific_needs?: string;
  reason_for_need?: string;
  target_market?: string;
  market_positioning?: string;
}

interface CommissionData {
  commission_id: string;
  insurance_id: string;
  premium_term: string;
  role_id: number;
  commission_year: number;
  commission_rate: number;
  created_at: string;
  updated_at: string;
}

interface CommissionsByTerm {
  [premiumTerm: string]: CommissionData[];
}

function CompareContent() {
  const { user } = useAuth();
  const { notifyError, notifySuccess } = useNotifications();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [commissionData, setCommissionData] = useState<Record<string, CommissionsByTerm>>({});
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const printContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const productIds = searchParams.get('products');
    if (productIds) {
      const ids = productIds.split(',');
      fetchComparisonData(ids);
    } else {
      notifyError('Invalid Request', 'No products selected for comparison');
      router.push('/oracle/products');
    }
  }, [searchParams]);

  const fetchComparisonData = async (productIds: string[]) => {
    try {
      setLoading(true);
      
      // Fetch detailed product information
      const productPromises = productIds.map(id => 
        apiClient.get<{success: boolean; data: Product}>(`/api/v1/oracle/products/${id}`)
      );
      
      const productResults = await Promise.all(productPromises);
      const productData = productResults
        .filter(result => result.data.success)
        .map(result => result.data.data);
      
      if (productData.length === 0) {
        notifyError('No Products Found', 'Could not load product comparison data');
        router.push('/oracle/products');
        return;
      }
      
      setProducts(productData);
      
      // Fetch commission data for each product  
      if (user?.role) {
        const roleMap: Record<string, number> = {
          'ADVISOR': 3,
          'LEADER_1': 4,
          'LEADER_2': 5,
          'SENIOR_PARTNER': 6,
          'SUPER_ADMIN': 6,
          'ADMIN': 6
        };
        const userRoleId = roleMap[user.role] || 3;
        
        const commissionPromises = productIds.map(async (id) => {
          try {
            // Try to get all commission data if user is SUPER_ADMIN or ADMIN
            if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
              const response = await apiClient.get<CommissionData[]>(`/api/v1/oracle/commissions/insurance/${id}`);
              
              if (response.data && response.data.length > 0) {
                // Filter for user's role and group by premium term
                const userCommissions = response.data.filter(comm => comm.role_id === userRoleId);
                
                // Group by premium term
                const commissionsByTerm: CommissionsByTerm = {};
                userCommissions.forEach(comm => {
                  if (!commissionsByTerm[comm.premium_term]) {
                    commissionsByTerm[comm.premium_term] = [];
                  }
                  commissionsByTerm[comm.premium_term].push(comm);
                });
                
                return { productId: id, data: commissionsByTerm };
              }
            } else {
              // For non-admin users, try common premium terms
              const commonTerms = ['10-14 year', '15-19 year', '20+ year', 'premium term 2', 'premium term 5'];
              const commissionsByTerm: CommissionsByTerm = {};
              
              for (const term of commonTerms) {
                try {
                  const response = await apiClient.get<{
                    insurance_id: string;
                    premium_term: string;
                    commission_structure: Record<string, Record<string, number>>;
                  }>(`/api/v1/oracle/commissions/calculate/${id}?premium_term=${encodeURIComponent(term)}`);
                  
                  if (response.data.commission_structure) {
                    const userCommissions = response.data.commission_structure[userRoleId.toString()] || {};
                    
                    if (Object.keys(userCommissions).length > 0) {
                      const commissionArray: CommissionData[] = [];
                      Object.entries(userCommissions).forEach(([year, rate]) => {
                        commissionArray.push({
                          commission_id: `calc-${id}-${term}-${year}`,
                          insurance_id: id,
                          premium_term: response.data.premium_term,
                          role_id: userRoleId,
                          commission_year: parseInt(year),
                          commission_rate: rate,
                          created_at: new Date().toISOString(),
                          updated_at: new Date().toISOString()
                        });
                      });
                      
                      if (commissionArray.length > 0) {
                        commissionsByTerm[response.data.premium_term] = commissionArray;
                      }
                    }
                  }
                } catch (termError) {
                  // This term doesn't exist for this product, continue to next
                  console.log(`Term "${term}" not found for product ${id}`);
                }
              }
              
              return { productId: id, data: commissionsByTerm };
            }
          } catch (error) {
            console.error(`Error fetching commission for product ${id}:`, error);
          }
          return { productId: id, data: {} };
        });
        
        const commissionResults = await Promise.all(commissionPromises);
        const commissionMap: Record<string, CommissionsByTerm> = {};
        commissionResults.forEach(result => {
          commissionMap[result.productId] = result.data;
        });
        
        setCommissionData(commissionMap);
      }
      
    } catch (error) {
      console.error('Error fetching comparison data:', error);
      notifyError('Fetch Error', 'Failed to load comparison data');
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined || value === '') {
      return 'Not specified';
    }
    return String(value);
  };

  const getRoleId = (): number => {
    const roleMap: Record<string, number> = {
      'ADVISOR': 3,
      'LEADER_1': 4,
      'LEADER_2': 5,
      'SENIOR_PARTNER': 6,
      'SUPER_ADMIN': 6,
      'ADMIN': 6
    };
    return roleMap[user?.role || ''] || 3;
  };

  const getCommissionRatesForProduct = (productId: string, year: number): {premiumTerm: string, rate: string}[] => {
    const commissionsByTerm = commissionData[productId] || {};
    const results: {premiumTerm: string, rate: string}[] = [];
    
    // Get all premium terms for this product, sorted alphabetically
    const premiumTerms = Object.keys(commissionsByTerm).sort();
    
    premiumTerms.forEach(premiumTerm => {
      const commissions = commissionsByTerm[premiumTerm] || [];
      const yearCommission = commissions.find(c => c.commission_year === year);
      
      if (yearCommission) {
        results.push({
          premiumTerm,
          rate: `${yearCommission.commission_rate}%`
        });
      }
    });
    
    return results.length > 0 ? results : [{premiumTerm: 'Not available', rate: 'Not specified'}];
  };

  const handleSharePDF = async (includeCommission: boolean) => {
    try {
      setIsGeneratingPDF(true);
      
      if (!printContentRef.current) {
        notifyError('PDF Error', 'Unable to generate PDF. Please try again.');
        return;
      }

      // Import libraries directly
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      
      const element = printContentRef.current;
      
      // Create a clone for PDF generation
      const clonedElement = element.cloneNode(true) as HTMLElement;
      
      // Remove buttons from cloned element
      const buttonsToRemove = clonedElement.querySelectorAll('.pdf-hide');
      buttonsToRemove.forEach(button => button.remove());
      
      // Hide commission table if not including commissions
      if (!includeCommission) {
        const commissionTables = clonedElement.querySelectorAll('[data-table="commission"]');
        commissionTables.forEach(table => table.remove());
        
        // Also hide suitability information for client presentations
        const suitabilityTables = clonedElement.querySelectorAll('[data-table="suitability"]');
        suitabilityTables.forEach(table => table.remove());
      }

      // Remove horizontal scroll containers and optimize table layout for PDF
      const scrollContainers = clonedElement.querySelectorAll('.overflow-x-auto');
      scrollContainers.forEach(container => {
        const table = container.querySelector('table');
        if (table) {
          // Remove scroll container classes and make table full width
          container.classList.remove('overflow-x-auto');
          table.style.width = '100%';
          table.style.minWidth = 'unset';
          table.style.tableLayout = 'fixed'; // Use fixed layout for consistent columns
          
          // Get all rows to determine column structure
          const rows = table.querySelectorAll('tr');
          if (rows.length > 0) {
            const headerRow = rows[0];
            const cells = headerRow.querySelectorAll('th, td');
            const totalColumns = cells.length;
            
            if (totalColumns > 1) {
              const productCount = totalColumns - 1; // Subtract 1 for the field name column
              
              // Dynamic field column width: 10% for 5 products, 15% for others
              const fieldColumnWidth = productCount >= 5 ? '10%' : '15%';
              const remainingWidth = productCount >= 5 ? 90 : 85;
              const dataColumnWidth = `${remainingWidth / productCount}%`;
              
              // Dynamic font size based on number of products
              let fontSize: string;
              let padding: string;
              
              if (productCount <= 2) {
                fontSize = '14px';
                padding = '16px 12px';
              } else if (productCount <= 3) {
                fontSize = '13px'; 
                padding = '14px 10px';
              } else if (productCount <= 4) {
                fontSize = '12px';
                padding = '12px 8px';
              } else {
                fontSize = '11px';
                padding = '10px 6px';
              }
              
              // Apply widths to all rows
              rows.forEach(row => {
                const rowCells = row.querySelectorAll('th, td');
                rowCells.forEach((cell, index) => {
                  const htmlCell = cell as HTMLElement;
                  
                  if (index === 0) {
                    // First column - field names
                    htmlCell.style.width = fieldColumnWidth;
                    htmlCell.style.minWidth = fieldColumnWidth;
                    htmlCell.style.maxWidth = fieldColumnWidth;
                    htmlCell.style.fontWeight = '600';
                    htmlCell.style.backgroundColor = '#f8fafc';
                  } else {
                    // Data columns
                    htmlCell.style.width = dataColumnWidth;
                    htmlCell.style.minWidth = dataColumnWidth;
                    htmlCell.style.maxWidth = dataColumnWidth;
                  }
                  
                  // Common cell styling
                  htmlCell.style.whiteSpace = 'normal';
                  htmlCell.style.wordBreak = 'break-word';
                  htmlCell.style.overflow = 'visible';
                  htmlCell.style.textOverflow = 'unset';
                  htmlCell.style.padding = padding;
                  htmlCell.style.fontSize = fontSize;
                  htmlCell.style.lineHeight = '1.5';
                });
              });
            }
          }
        }
      });

      // Style the cloned element for PDF
      clonedElement.style.position = 'absolute';
      clonedElement.style.left = '-9999px';
      clonedElement.style.top = '0';
      clonedElement.style.width = '1200px'; // Fixed width for consistent layout
      clonedElement.style.backgroundColor = '#ffffff';
      clonedElement.style.padding = '20px';
      clonedElement.style.boxSizing = 'border-box';

      // Temporarily append to DOM
      document.body.appendChild(clonedElement);

      try {
        // Wait for DOM to settle
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Capture the full content
        const canvas = await html2canvas(clonedElement, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: 1200,
          height: clonedElement.scrollHeight,
          windowWidth: 1200,
          windowHeight: clonedElement.scrollHeight
        });

        console.log('Canvas created:', {
          width: canvas.width,
          height: canvas.height
        });

        if (canvas.width === 0 || canvas.height === 0) {
          throw new Error('Canvas has no content');
        }

        // Create single long page PDF
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdfWidth = 210; // A4 width in mm
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width; // Calculate height to maintain aspect ratio

        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [pdfWidth, Math.max(297, pdfHeight + 20)] // Ensure minimum A4 height, add padding
        });

        // Add the image as a single page
        pdf.addImage(imgData, 'JPEG', 0, 10, pdfWidth, pdfHeight);
        pdf.save(`insurance-comparison-${new Date().toISOString().split('T')[0]}.pdf`);
        
      } finally {
        // Clean up cloned element
        if (document.body.contains(clonedElement)) {
          document.body.removeChild(clonedElement);
        }
      }
      
      notifySuccess('PDF Generated', 'Comparison PDF has been downloaded successfully');
      setShowShareModal(false);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      notifyError('PDF Error', `Failed to generate PDF: ${error}`);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (loading) {
    return (
      <Sidebar>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading comparison data...</p>
          </div>
        </div>
      </Sidebar>
    );
  }

  if (products.length === 0) {
    return (
      <Sidebar>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">No Products to Compare</h1>
            <p className="text-gray-600 mb-4">Please select products from the products page.</p>
            <button
              onClick={() => router.push('/oracle/products')}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Back to Products
            </button>
          </div>
        </div>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div ref={printContentRef}>
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold text-gray-900">
                Insurance Product Comparison
              </h1>
              <div className="flex items-center space-x-3 pdf-hide">
                <button
                  onClick={() => setShowShareModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => router.push('/oracle/products')}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  ← Back to Products
                </button>
              </div>
            </div>
            
            {/* Product Names */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Comparing Products:</h2>
              <div className="flex flex-wrap gap-3">
                {products.map((product, index) => (
                  <div
                    key={product.insurance_id}
                    className="bg-primary-100 text-primary-800 px-4 py-2 rounded-full font-medium"
                  >
                    {index + 1}. {product.insurance_name}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Comparison Tables */}
          <div className="space-y-8">
            {/* Table 1: General Information */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                <h3 className="text-xl font-semibold text-white">General Information</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 md:px-6 py-4 text-left text-xs md:text-sm font-medium text-gray-900 sticky left-0 bg-gray-50 min-w-32">
                        Field
                      </th>
                      {products.map(product => (
                        <th key={product.insurance_id} className="px-4 md:px-6 py-4 text-left text-xs md:text-sm font-medium text-gray-900 min-w-48">
                          <div className="break-words max-w-48">
                            {product.insurance_name}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 sticky left-0 bg-white border-r">
                        Provider
                      </td>
                      {products.map(product => (
                        <td key={product.insurance_id} className="px-6 py-4 text-sm text-gray-700">
                          {formatValue(product.provider)}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 sticky left-0 bg-gray-50 border-r">
                        Provider Country
                      </td>
                      {products.map(product => (
                        <td key={product.insurance_id} className="px-6 py-4 text-sm text-gray-700">
                          {formatValue(product.provider_country)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 sticky left-0 bg-white border-r">
                        Category
                      </td>
                      {products.map(product => (
                        <td key={product.insurance_id} className="px-6 py-4 text-sm text-gray-700">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {formatValue(product.category)}
                          </span>
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 sticky left-0 bg-gray-50 border-r">
                        Key Features
                      </td>
                      {products.map(product => (
                        <td key={product.insurance_id} className="px-6 py-4 text-sm text-gray-700 min-w-64 max-w-80">
                          <div className="whitespace-pre-wrap break-words leading-relaxed">
                            {formatValue(product.key_features_bullets || product.key_features)}
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 sticky left-0 bg-white border-r">
                        Age of Entry
                      </td>
                      {products.map(product => (
                        <td key={product.insurance_id} className="px-6 py-4 text-sm text-gray-700">
                          {formatValue(product.age_of_entry)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 2: Commission Rates */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden" data-table="commission">
              <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4">
                <h3 className="text-xl font-semibold text-white">Commission Rates</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 md:px-6 py-4 text-left text-xs md:text-sm font-medium text-gray-900 sticky left-0 bg-gray-50 min-w-32">
                        Year
                      </th>
                      {products.map(product => (
                        <th key={product.insurance_id} className="px-4 md:px-6 py-4 text-left text-xs md:text-sm font-medium text-gray-900 min-w-48">
                          <div className="break-words max-w-48">
                            {product.insurance_name}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {[1, 2, 3].map((year, yearIndex) => (
                      <tr key={year} className={yearIndex % 2 === 0 ? '' : 'bg-gray-50'}>
                        <td className={`px-4 md:px-6 py-4 text-sm font-medium text-gray-900 sticky left-0 border-r ${yearIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          Year {year}
                        </td>
                        {products.map(product => {
                          const rates = getCommissionRatesForProduct(product.insurance_id, year);
                          return (
                            <td key={product.insurance_id} className="px-4 md:px-6 py-4 text-sm text-gray-700">
                              <div className="space-y-2">
                                {rates.map((rateInfo, index) => (
                                  <div key={`${product.insurance_id}-${year}-${index}`} className="flex flex-col">
                                    <div className="font-medium text-gray-900">
                                      {rateInfo.rate}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      ({rateInfo.premiumTerm})
                                    </div>
                                    {index < rates.length - 1 && (
                                      <div className="border-b border-gray-200 mt-2"></div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 3: Financial Information */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
                <h3 className="text-xl font-semibold text-white">Financial Information</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900 sticky left-0 bg-gray-50">
                        Field
                      </th>
                      {products.map(product => (
                        <th key={product.insurance_id} className="px-6 py-4 text-left text-sm font-medium text-gray-900 min-w-48">
                          {product.insurance_name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {[
                      { key: 'premium', label: 'Premium' },
                      { key: 'minimum_sum_assured', label: 'Minimum Sum Assured' },
                      { key: 'maximum_sum_assured', label: 'Maximum Sum Assured' },
                      { key: 'guaranteed_interest_rate', label: 'Guaranteed Interest Rate' },
                      { key: 'historical_performance', label: 'Historical Performance' },
                      { key: 'insurance_yield', label: 'Insurance Yield' },
                      { key: 'riders_addons', label: 'Riders/Add-ons' },
                      { key: 'premium_payment_options', label: 'Premium Payment Options' },
                      { key: 'death_benefit_options', label: 'Death Benefit Options' }
                    ].map((field, index) => (
                      <tr key={field.key} className={index % 2 === 0 ? '' : 'bg-gray-50'}>
                        <td className={`px-6 py-4 text-sm font-medium text-gray-900 sticky left-0 border-r ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          {field.label}
                        </td>
                        {products.map(product => (
                          <td key={product.insurance_id} className="px-6 py-4 text-sm text-gray-700">
                            {formatValue(product[field.key as keyof Product])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 4: Suitability Information */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden" data-table="suitability">
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
                <h3 className="text-xl font-semibold text-white">Suitability Information</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900 sticky left-0 bg-gray-50">
                        Field
                      </th>
                      {products.map(product => (
                        <th key={product.insurance_id} className="px-6 py-4 text-left text-sm font-medium text-gray-900 min-w-48">
                          {product.insurance_name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {[
                      { key: 'suitable_for', label: 'Suitable For' },
                      { key: 'time_horizon', label: 'Time Horizon' },
                      { key: 'specific_needs', label: 'Specific Needs' },
                      { key: 'reason_for_need', label: 'Reason for Need' },
                      { key: 'target_market', label: 'Target Market' },
                      { key: 'market_positioning', label: 'Market Positioning' }
                    ].map((field, index) => (
                      <tr key={field.key} className={index % 2 === 0 ? '' : 'bg-gray-50'}>
                        <td className={`px-6 py-4 text-sm font-medium text-gray-900 sticky left-0 border-r ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          {field.label}
                        </td>
                        {products.map(product => (
                          <td key={product.insurance_id} className="px-6 py-4 text-sm text-gray-700 min-w-64 max-w-80">
                            <div className="whitespace-pre-wrap break-words leading-relaxed">
                              {formatValue(product[field.key as keyof Product])}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          </div>
        </main>

        {/* Download PDF Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">Download PDF</h3>
                <p className="text-gray-600">Would you like to include commission rates in the PDF?</p>
              </div>
              
              <div className="space-y-4">
                <button
                  onClick={() => handleSharePDF(true)}
                  disabled={isGeneratingPDF}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center disabled:opacity-50"
                >
                  {isGeneratingPDF ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating PDF...
                    </>
                  ) : (
                    'Yes - Include Commission Rates'
                  )}
                </button>
                <button
                  onClick={() => handleSharePDF(false)}
                  disabled={isGeneratingPDF}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center disabled:opacity-50"
                >
                  {isGeneratingPDF ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating PDF...
                    </>
                  ) : (
                    'Client Presentation Only (No Internal Data)'
                  )}
                </button>
                <button
                  onClick={() => setShowShareModal(false)}
                  disabled={isGeneratingPDF}
                  className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
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

function ComparePage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={
        <Sidebar>
          <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading comparison...</p>
            </div>
          </div>
        </Sidebar>
      }>
        <CompareContent />
      </Suspense>
    </ProtectedRoute>
  );
}

export default ComparePage;