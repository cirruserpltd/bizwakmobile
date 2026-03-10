import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from 'expo-constants';
const { API_BASE_URL } = Constants.expoConfig.extra;

export default function HomeScreen() {
  const [currentDate, setCurrentDate] = useState('');
  const [idrData, setIdrData] = useState(null);
  const [customerSummary, setCustomerSummary] = useState(null);
  const [loansSummary, setLoansSummary] = useState(null);
  const [installmentsSummary, setInstallmentsSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customerLoading, setCustomerLoading] = useState(true);
  const [loansLoading, setLoansLoading] = useState(true);
  const [installmentsLoading, setInstallmentsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [customerError, setCustomerError] = useState(null);
  const [loansError, setLoansError] = useState(null);
  const [installmentsError, setInstallmentsError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // View filter states
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewType, setViewType] = useState('all'); // 'all', 'branch', 'cluster'
  const [selectedView, setSelectedView] = useState(null);
  const [branches, setBranches] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [loadingViews, setLoadingViews] = useState(false);

  const [cashBalanceData, setCashBalanceData] = useState(null);
  const [cashBalanceLoading, setCashBalanceLoading] = useState(true);
  const [cashBalanceError, setCashBalanceError] = useState(null);

  const [paymentsSummary, setPaymentsSummary] = useState(null);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsError, setPaymentsError] = useState(null);

  const [collectionsData, setCollectionsData] = useState(null);
  const [disbursementsData, setDisbursementsData] = useState(null);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [disbursementsLoading, setDisbursementsLoading] = useState(true);
  const [collectionsError, setCollectionsError] = useState(null);
  const [disbursementsError, setDisbursementsError] = useState(null);
  const [dateFilter, setDateFilter] = useState('mtd');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const [kpiTeamsData, setKpiTeamsData] = useState(null);
  const [kpiTeamsLoading, setKpiTeamsLoading] = useState(true);
  const [kpiTeamsError, setKpiTeamsError] = useState(null);

  useEffect(() => {
    const today = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const dayName = days[today.getDay()];
    const day = today.getDate();
    const monthName = months[today.getMonth()];
    const year = today.getFullYear();
    
    const formattedDate = `${dayName.slice(0, 3)}, ${day}, ${monthName} ${year}`;
    setCurrentDate(formattedDate);
  }, []);

  useEffect(() => {
    fetchIDRData();
    fetchCashBalance();
    fetchCustomerSummary();
    fetchLoansSummary();
    fetchInstallmentsSummary();
    fetchPaymentsSummary();
    fetchKpiTeams();
  }, []);

  useEffect(() => {
    fetchCollections();          
    fetchDisbursements();
  }, [viewType, selectedView, dateFilter]);

  useEffect(() => {
    console.log('Current dateFilter:', dateFilter);
    console.log('Current viewType:', viewType);
    console.log('Current selectedView:', selectedView);
  }, [dateFilter, viewType, selectedView]);


  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchIDRData(), 
      fetchCashBalance(),
      fetchCollections(),          
      fetchDisbursements(),        
      fetchCustomerSummary(),
      fetchLoansSummary(),
      fetchInstallmentsSummary(),
      fetchPaymentsSummary(),
      fetchKpiTeams()
    ]);
    setRefreshing(false);
  };

  const fetchBranchesAndClusters = async () => {
    try {
      setLoadingViews(true);
      const token = await AsyncStorage.getItem("token");

      const [branchesResponse, clustersResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/branches`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
        }),
        fetch(`${API_BASE_URL}/api/clusters`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
        })
      ]);

      const branchesResult = await branchesResponse.json();
      const clustersResult = await clustersResponse.json();

      if (branchesResult.success && branchesResult.payload) {
        setBranches(branchesResult.payload);
      }

      if (clustersResult.success && clustersResult.payload) {
        setClusters(clustersResult.payload);
      }
    } catch (err) {
      console.error('Error fetching branches and clusters:', err);
      Alert.alert('Error', 'Failed to load branches and clusters');
    } finally {
      setLoadingViews(false);
    }
  };

  const handleViewButtonPress = async () => {
    await fetchBranchesAndClusters();
    setShowViewModal(true);
  };

  const handleViewSelection = (type, item = null) => {
    setViewType(type);
    setSelectedView(item);
    setShowViewModal(false);
  };

  const getViewLabel = () => {
    if (viewType === 'all') return 'All Branches';
    if (viewType === 'branch' && selectedView) return selectedView.name;
    if (viewType === 'cluster' && selectedView) return selectedView.name;
    return 'All Branches';
  };

  const fetchIDRData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await AsyncStorage.getItem("token");

      // Build query params
      let queryParams = '';
      if (viewType === 'branch' && selectedView) {
        queryParams = `?branch_id=${selectedView.id}`;
      } else if (viewType === 'cluster' && selectedView) {
        queryParams = `?cluster_id=${selectedView.id}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/dashboard/idr${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      const result = await response.json();

      if (result.success && result.payload) {
        setIdrData(result.payload);
      } else {
        setError(result.error || 'Failed to fetch IDR data');
      }
    } catch (err) {
      console.error('Error fetching IDR data:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchKpiTeams = async () => {
  try {
    setKpiTeamsLoading(true);
    setKpiTeamsError(null);
    const token = await AsyncStorage.getItem("token");

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Calculate previous month/year
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = prevDate.getMonth() + 1;
    const prevYear = prevDate.getFullYear();

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    const [currentRes, prevRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/dashboard/kpi/teams?month=${currentMonth}&year=${currentYear}`, {
        method: 'GET', headers, credentials: 'include',
      }),
      fetch(`${API_BASE_URL}/api/dashboard/kpi/teams?month=${prevMonth}&year=${prevYear}`, {
        method: 'GET', headers, credentials: 'include',
      }),
    ]);

    if (!currentRes.ok) throw new Error(`HTTP ${currentRes.status}`);
    if (!prevRes.ok) throw new Error(`HTTP ${prevRes.status}`);

    const [currentResult, prevResult] = await Promise.all([
      currentRes.json(),
      prevRes.json(),
    ]);

    const calcPercentage = (payload) => {
      const branches = payload?.data || [];
      const totals = branches.reduce((acc, branch) => {
        const bt = branch.branch_totals || {};
        acc.collection += bt.collection ?? 0;
        acc.expected   += bt.expected   ?? 0;
        return acc;
      }, { collection: 0, expected: 0 });
      return totals.expected > 0 ? (totals.collection / totals.expected) * 100 : 0;
    };

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    if (currentResult.success && currentResult.payload) {
      setKpiTeamsData({
        branches: currentResult.payload.data || [],
        grand_total_collection_percentage: calcPercentage(currentResult.payload),
        current_month_label: months[currentMonth - 1],
        prev_month_percentage: prevResult.success && prevResult.payload
          ? calcPercentage(prevResult.payload)
          : null,
        prev_month_label: months[prevMonth - 1],
      });
    } else {
      setKpiTeamsError(currentResult.error || 'Failed to fetch KPI data');
    }
  } catch (err) {
    setKpiTeamsError(err.message || 'Network error');
  } finally {
    setKpiTeamsLoading(false);
  }
};

  const fetchCustomerSummary = async () => {
    try {
      setCustomerLoading(true);
      setCustomerError(null);

      const token = await AsyncStorage.getItem("token");

      let body = {};
      
      // Add filters based on view type
      if (viewType === 'branch' && selectedView) {
        body.branch_id = selectedView.id;
      } else if (viewType === 'cluster' && selectedView) {
        body.cluster_id = selectedView.id;
      }

      const response = await fetch(`${API_BASE_URL}/api/members/getpaginatedclients/1/1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Customer summary error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      if (result.success && result.additional_data && result.additional_data.summary) {
        setCustomerSummary(result.additional_data.summary);
      } else if (result.success) {
        setCustomerError('Summary data not found in response');
      } else {
        setCustomerError(result.error || 'Failed to fetch customer summary');
      }
    } catch (err) {
      console.error('Error fetching customer summary:', err);
      setCustomerError(err.message || 'Network error. Please try again.');
    } finally {
      setCustomerLoading(false);
    }
  };

  const fetchLoansSummary = async () => {
    try {
      setLoansLoading(true);
      setLoansError(null);

      const token = await AsyncStorage.getItem("token");

      let body = {};
      
      if (viewType === 'branch' && selectedView) {
        body.branch = selectedView.id;
      } else if (viewType === 'cluster' && selectedView) {
        body.cluster = selectedView.id;
      }

      const response = await fetch(`${API_BASE_URL}/api/loans/getpaginatedloans/1/1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Loans summary error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      if (result.success && result.additional_data && result.additional_data.summary) {
        setLoansSummary(result.additional_data.summary);
      } else if (result.success) {
        setLoansError('Summary data not found in response');
      } else {
        setLoansError(result.error || 'Failed to fetch loans summary');
      }
    } catch (err) {
      console.error('Error fetching loans summary:', err);
      setLoansError(err.message || 'Network error. Please try again.');
    } finally {
      setLoansLoading(false);
    }
  };

  const fetchInstallmentsSummary = async () => {
  try {
    setInstallmentsLoading(true);
    setInstallmentsError(null);

    const token = await AsyncStorage.getItem("token");

    let queryParams = '';
    if (viewType === 'branch' && selectedView) {
      queryParams = `?branch=${selectedView.id}`;
    } else if (viewType === 'cluster' && selectedView) {
      queryParams = `?cluster=${selectedView.id}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/loans/getpaginatedinstallments/1/1${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Installments summary error response:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    if (result.success && result.additional_data && result.additional_data.summary) {
      setInstallmentsSummary(result.additional_data.summary);
    } else if (result.success) {
      setInstallmentsError('Summary data not found in response');
    } else {
      setInstallmentsError(result.error || 'Failed to fetch installments summary');
    }
  } catch (err) {
    console.error('Error fetching installments summary:', err);
    setInstallmentsError(err.message || 'Network error. Please try again.');
  } finally {
    setInstallmentsLoading(false);
  }
};
  const fetchCashBalance = async () => {
  try {
    setCashBalanceLoading(true);
    setCashBalanceError(null);

    const token = await AsyncStorage.getItem("token");

    const queryParams = `period=mtd`;

    const response = await fetch(`${API_BASE_URL}/api/cash_balance?${queryParams}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    //console.log("Cash Balance Payload:", result.payload);

    if (result.success && result.payload) {
      setCashBalanceData(result.payload);
    } else {
      setCashBalanceError(result.error || 'Failed to fetch cash balance');
    }
  } catch (err) {
    console.error('Error fetching cash balance:', err);
    setCashBalanceError(err.message || 'Network error. Please try again.');
  } finally {
    setCashBalanceLoading(false);
  }
};



const fetchPaymentsSummary = async () => {
  try {
    setPaymentsLoading(true);
    setPaymentsError(null);

    const token = await AsyncStorage.getItem("token");

    
    let queryParams = '';
    if (viewType === 'branch' && selectedView) {
      queryParams = `?branch=${selectedView.id}`;
    } else if (viewType === 'cluster' && selectedView) {
      queryParams = `?cluster=${selectedView.id}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/loans/getpaginatedpayments/1/1${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Payments summary error response:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    if (result.success && result.additional_data && result.additional_data.summary) {
      setPaymentsSummary(result.additional_data.summary);
    } else if (result.success) {
      setPaymentsError('Summary data not found in response');
    } else {
      setPaymentsError(result.error || 'Failed to fetch payments summary');
    }
  } catch (err) {
    console.error('Error fetching payments summary:', err);
    setPaymentsError(err.message || 'Network error. Please try again.');
  } finally {
    setPaymentsLoading(false);
  }
};

const fetchCollections = async () => {
  try {
    setCollectionsLoading(true);
    setCollectionsError(null);

    const token = await AsyncStorage.getItem("token");

    const period = dateFilter || 'mtd';
    let queryParams = `period=${period}`;
    
    if (viewType === 'branch' && selectedView) {
      queryParams += `&branch_id=${selectedView.id}`;
    } else if (viewType === 'cluster' && selectedView) {
      queryParams += `&cluster_id=${selectedView.id}`;
    }

    //console.log('Fetching collections with params:', queryParams); 

    const response = await fetch(`${API_BASE_URL}/api/collections?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Collections error response:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    //console.log('Collections result:', result); 

    if (result.success && result.payload) {
      setCollectionsData(result.payload);
    } else {
      setCollectionsError(result.error || 'Failed to fetch collections');
    }
  } catch (err) {
    console.error('Error fetching collections:', err);
    setCollectionsError(err.message || 'Network error. Please try again.');
  } finally {
    setCollectionsLoading(false);
  }
};

const fetchDisbursements = async () => {
  try {
    setDisbursementsLoading(true);
    setDisbursementsError(null);

    const token = await AsyncStorage.getItem("token");

    const period = dateFilter || 'mtd';
    let queryParams = `period=${period}`;
    
    if (viewType === 'branch' && selectedView) {
      queryParams += `&branch_id=${selectedView.id}`;
    } else if (viewType === 'cluster' && selectedView) {
      queryParams += `&cluster_id=${selectedView.id}`;
    }

    //console.log('Fetching disbursements with params:', queryParams); 

    const response = await fetch(`${API_BASE_URL}/api/disbursements?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Disbursements error response:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    //console.log('Disbursements result:', result); 

    if (result.success && result.payload) {
      setDisbursementsData(result.payload);
    } else {
      setDisbursementsError(result.error || 'Failed to fetch disbursements');
    }
  } catch (err) {
    console.error('Error fetching disbursements:', err);
    setDisbursementsError(err.message || 'Network error. Please try again.');
  } finally {
    setDisbursementsLoading(false);
  }
};

const calculateTotal = (groupedData) => {
  if (!groupedData) return 0;
  
  let total = 0;
  
  Object.values(groupedData).forEach(items => {
    if (Array.isArray(items)) {
      items.forEach(item => {
        total += parseFloat(item.amount || 0);
      });
    }
  });
  
  return Math.round(total);
};

  const handleProfilePress = () => {
    router.push({ pathname: '/userProfile' });
  };

  const renderViewModal = () => (
    <Modal
      visible={showViewModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowViewModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select View</Text>
            <TouchableOpacity onPress={() => setShowViewModal(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {loadingViews ? (
            <View style={styles.modalLoader}>
              <ActivityIndicator size="large" color="#2D5BFF" />
              <Text style={styles.modalLoaderText}>Loading...</Text>
            </View>
          ) : (
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* All Branches Option */}
              <TouchableOpacity
                style={[
                  styles.viewOption,
                  viewType === 'all' && styles.viewOptionSelected
                ]}
                onPress={() => handleViewSelection('all')}
              >
                <Ionicons 
                  name="business" 
                  size={24} 
                  color={viewType === 'all' ? '#2D5BFF' : '#666'} 
                />
                <Text style={[
                  styles.viewOptionText,
                  viewType === 'all' && styles.viewOptionTextSelected
                ]}>All Branches</Text>
                {viewType === 'all' && (
                  <Ionicons name="checkmark-circle" size={24} color="#2D5BFF" />
                )}
              </TouchableOpacity>

              {/* Clusters Section */}
              <View style={styles.viewSection}>
                <Text style={styles.viewSectionTitle}>View by Team</Text>
                {clusters.map((cluster) => (
                  <TouchableOpacity
                    key={cluster.id}
                    style={[
                      styles.viewOption,
                      viewType === 'cluster' && selectedView?.id === cluster.id && styles.viewOptionSelected
                    ]}
                    onPress={() => handleViewSelection('cluster', cluster)}
                  >
                    <Ionicons 
                      name="people" 
                      size={24} 
                      color={viewType === 'cluster' && selectedView?.id === cluster.id ? '#2D5BFF' : '#666'} 
                    />
                    <Text style={[
                      styles.viewOptionText,
                      viewType === 'cluster' && selectedView?.id === cluster.id && styles.viewOptionTextSelected
                    ]}>{cluster.name}</Text>
                    {viewType === 'cluster' && selectedView?.id === cluster.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#2D5BFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Branches Section */}
              <View style={styles.viewSection}>
                <Text style={styles.viewSectionTitle}>View by Branch</Text>
                {branches.map((branch) => (
                  <TouchableOpacity
                    key={branch.id}
                    style={[
                      styles.viewOption,
                      viewType === 'branch' && selectedView?.id === branch.id && styles.viewOptionSelected
                    ]}
                    onPress={() => handleViewSelection('branch', branch)}
                  >
                    <Ionicons 
                      name="location" 
                      size={24} 
                      color={viewType === 'branch' && selectedView?.id === branch.id ? '#2D5BFF' : '#666'} 
                    />
                    <View style={styles.viewOptionTextContainer}>
                      <Text style={[
                        styles.viewOptionText,
                        viewType === 'branch' && selectedView?.id === branch.id && styles.viewOptionTextSelected
                      ]}>{branch.name}</Text>
                      {branch.location && (
                        <Text style={styles.viewOptionSubtext}>{branch.location}</Text>
                      )}
                    </View>
                    {viewType === 'branch' && selectedView?.id === branch.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#2D5BFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderIDRCard = () => {
    if (loading) {
      return (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="trending-down" size={18} color="#2D5BFF" />
            <Text style={styles.cardTitle}>Installments Default Rate (IDR)</Text>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2D5BFF" />
            <Text style={styles.loadingText}>Loading IDR data...</Text>
          </View>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="trending-down" size={18} color="#2D5BFF" />
            <Text style={styles.cardTitle}>Installments Default Rate (IDR)</Text>
          </View>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={40} color="#FF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchIDRData}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (!idrData) {
      return (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="trending-down" size={18} color="#2D5BFF" />
            <Text style={styles.cardTitle}>Installments Default Rate (IDR)</Text>
          </View>
          <Text style={styles.noDataText}>No IDR data available</Text>
        </View>
      );
    }

    const getProgressColor = (percentage) => {
      if (percentage >= 30) return '#FF4444';
      if (percentage >= 20) return '#FF9800';
      return '#00C853';
    };

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="trending-down" size={18} color="#2D5BFF" />
          <Text style={styles.cardTitle}>Installments Default Rate (IDR)</Text>
        </View>

        {/* 1 Month */}
        <View style={styles.rateItem}>
          <Text style={styles.rateLabel}>1 Month</Text>
          <Text style={[styles.rateValue, { color: getProgressColor(idrData.one_month?.par_percentage || 0) }]}>
            {(idrData.one_month?.par_percentage || 0).toFixed(2)}%
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[
            styles.progressFill,
            {
              width: `${Math.min(idrData.one_month?.par_percentage || 0, 100)}%`,
              backgroundColor: getProgressColor(idrData.one_month?.par_percentage || 0)
            }
          ]} />
        </View>

        {/* 3 Months */}
        <View style={styles.rateItem}>
          <Text style={styles.rateLabel}>3 Months</Text>
          <Text style={[styles.rateValue, { color: getProgressColor(idrData.three_month?.par_percentage || 0) }]}>
            {(idrData.three_month?.par_percentage || 0).toFixed(2)}%
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[
            styles.progressFill,
            {
              width: `${Math.min(idrData.three_month?.par_percentage || 0, 100)}%`,
              backgroundColor: getProgressColor(idrData.three_month?.par_percentage || 0)
            }
          ]} />
        </View>

        {/* Overall */}
        <View style={styles.rateItem}>
          <Text style={styles.rateLabel}>Overall</Text>
          <Text style={[styles.rateValue, { color: getProgressColor(idrData.overall?.par_percentage || 0) }]}>
            {(idrData.overall?.par_percentage || 0).toFixed(2)}%
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[
            styles.progressFill,
            {
              width: `${Math.min(idrData.overall?.par_percentage || 0, 100)}%`,
              backgroundColor: getProgressColor(idrData.overall?.par_percentage || 0)
            }
          ]} />
        </View>

        {/* Additional Info */}
        {/* <View style={styles.idrDetailsContainer}>
          <View style={styles.idrDetailRow}>
            <Text style={styles.idrDetailLabel}>Active:</Text>
            <Text style={styles.idrDetailValue}>
              {(idrData.overall?.active || 0).toLocaleString('en-US', { 
                style: 'currency', 
                currency: 'KES',
                minimumFractionDigits: 0 
              })}
            </Text>
          </View>
          <View style={styles.idrDetailRow}>
            <Text style={styles.idrDetailLabel}>Defaulted:</Text>
            <Text style={[styles.idrDetailValue, { color: '#FF4444' }]}>
              {(idrData.overall?.defaulted || 0).toLocaleString('en-US', { 
                style: 'currency', 
                currency: 'KES',
                minimumFractionDigits: 0 
              })}
            </Text>
          </View>
          <View style={styles.idrDetailRow}>
            <Text style={styles.idrDetailLabel}>Paid:</Text>
            <Text style={[styles.idrDetailValue, { color: '#00C853' }]}>
              {(idrData.overall?.paid || 0).toLocaleString('en-US', { 
                style: 'currency', 
                currency: 'KES',
                minimumFractionDigits: 0 
              })}
            </Text>
          </View>
        </View> */}
      </View>
    );
  };

  const renderBusinessUnitCard = () => {
  if (cashBalanceLoading) {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="briefcase-outline" size={18} color="#2D5BFF" />
          <Text style={styles.cardTitle}>Business Unit (BU)</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2D5BFF" />
          <Text style={styles.loadingText}>Loading BU data...</Text>
        </View>
      </View>
    );
  }

  if (cashBalanceError) {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="briefcase-outline" size={18} color="#2D5BFF" />
          <Text style={styles.cardTitle}>Business Unit (BU)</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={40} color="#FF4444" />
          <Text style={styles.errorText}>{cashBalanceError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchCashBalance}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  

  const totalExpenses = Object.values(cashBalanceData).flat().reduce((acc, item) => acc + (item.expenses || 0), 0);
  const totalCashBalance = Object.values(cashBalanceData).flat().reduce((acc, item) => acc + (item.amount || 0), 0);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="briefcase-outline" size={18} color="#2D5BFF" />
        <Text style={styles.cardTitle}>Business Unit (BU)</Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryBox, { backgroundColor: '#FFE0B2', borderColor: '#FF6F00' }]}>
          <Text style={[styles.summaryValue, { color: '#E65100' }]}>
            {(totalExpenses || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}
          </Text>
          <Text style={styles.summaryLabel}>Expenses</Text>
        </View>
        <View style={[styles.summaryBox, { backgroundColor: '#E8F5E9', borderColor: '#00C853' }]}>
          <Text style={[styles.summaryValue, { color: '#00C853' }]}>
            {(totalCashBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}
          </Text>
          <Text style={styles.summaryLabel}>Cash Balance</Text>
        </View>
      </View>
    </View>
  );
};

  

 const renderCollectionsDisbursementsCards = () => {
  const collectionsTotal = calculateTotal(collectionsData);
  const disbursementsTotal = calculateTotal(disbursementsData);

  return (
    <View style={styles.updatesSection}>
      <View style={styles.sectionHeader}>
        
      </View>
      
      <View style={styles.updateCardsContainer}>
        {/* Collections Card */}
        <View style={[styles.updateCard, { backgroundColor: '#4CAF50' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            
            {kpiTeamsLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : kpiTeamsData ? (
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {/* Previous month badge */}
                {kpiTeamsData.prev_month_percentage !== null && (
                  <View style={[styles.collectionRateBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                    <Text style={styles.collectionRateText}>
                      {(kpiTeamsData.prev_month_percentage || 0).toFixed(1)}%
                    </Text>
                    <Text style={styles.collectionRateLabel}>{kpiTeamsData.prev_month_label}</Text>
                  </View>
                )}
                {/* Current month badge */}
                <View style={styles.collectionRateBadge}>
                  <Text style={styles.collectionRateText}>
                    {(kpiTeamsData.grand_total_collection_percentage || 0).toFixed(1)}%
                  </Text>
                  <Text style={styles.collectionRateLabel}>{kpiTeamsData.current_month_label}</Text>
                </View>
              </View>
          ) : null}
          </View>
          <Text style={styles.updateCardTitle}>Collections</Text>
          
          {collectionsLoading ? (
            <ActivityIndicator size="small" color="white" style={styles.updateCardLoader} />
          ) : collectionsError ? (
            <Text style={styles.updateCardError}>Error</Text>
          ) : (
            <Text style={styles.updateCardValue}>
              {collectionsTotal.toLocaleString('en-US', { minimumFractionDigits: 0 })}
            </Text>
          )}
          
          <TouchableOpacity 
            style={[styles.updateCardFooter, { backgroundColor: '#66BB6A' }]}
            onPress={() => setShowFilterMenu(!showFilterMenu)}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar" size={14} color="white" />
            <Text style={styles.updateCardFooterText}>
              {dateFilter === 'today' ? 'Today' : dateFilter === 'wtd' ? 'WTD' : 'MTD'}
            </Text>
            <Ionicons name="chevron-down" size={14} color="white" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>

        {/* Disbursements Card */}
        <View style={[styles.updateCard, { backgroundColor: '#2196F3' }]}>
          <View style={[styles.updateCardIconContainer, { backgroundColor: '#42A5F5' }]}>
            <Ionicons name="trending-down" size={22} color="white" />
          </View>
          <Text style={styles.updateCardTitle}>Disbursements</Text>
          
          {disbursementsLoading ? (
            <ActivityIndicator size="small" color="white" style={styles.updateCardLoader} />
          ) : disbursementsError ? (
            <Text style={styles.updateCardError}>Error</Text>
          ) : (
            <Text style={styles.updateCardValue}>
              {disbursementsTotal.toLocaleString('en-US', { minimumFractionDigits: 0 })}
            </Text>
          )}
          
          <TouchableOpacity 
            style={[styles.updateCardFooter, { backgroundColor: '#42A5F5' }]}
            onPress={() => setShowFilterMenu(!showFilterMenu)}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar" size={14} color="white" />
            <Text style={styles.updateCardFooterText}>
              {dateFilter === 'today' ? 'Today' : dateFilter === 'wtd' ? 'WTD' : 'MTD'}
            </Text>
            <Ionicons name="chevron-down" size={14} color="white" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Filter Menu */}
      {showFilterMenu && (
        <View style={styles.filterMenu}>
          <TouchableOpacity 
            style={[styles.filterOption, dateFilter === 'today' && styles.filterOptionActive]}
            onPress={() => {
              setDateFilter('today');
              setShowFilterMenu(false);
            }}
          >
            <Text style={[styles.filterOptionText, dateFilter === 'today' && styles.filterOptionTextActive]}>
              Today
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterOption, dateFilter === 'wtd' && styles.filterOptionActive]}
            onPress={() => {
              setDateFilter('wtd');
              setShowFilterMenu(false);
            }}
          >
            <Text style={[styles.filterOptionText, dateFilter === 'wtd' && styles.filterOptionTextActive]}>
              Week to Date
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterOption, dateFilter === 'mtd' && styles.filterOptionActive]}
            onPress={() => {
              setDateFilter('mtd');
              setShowFilterMenu(false);
            }}
          >
            <Text style={[styles.filterOptionText, dateFilter === 'mtd' && styles.filterOptionTextActive]}>
              Month to Date
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const renderStatsSummaryCard = () => {
  const isAnyLoading = customerLoading || loansLoading || installmentsLoading || paymentsLoading;
  const hasAnyError = customerError || loansError || installmentsError || paymentsError;

  if (isAnyLoading) {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="stats-chart-outline" size={18} color="#2D5BFF" />
          <Text style={styles.cardTitle}>Summary</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2D5BFF" />
          <Text style={styles.loadingText}>Loading summary data...</Text>
        </View>
      </View>
    );
  }

  if (hasAnyError) {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="stats-chart-outline" size={18} color="#2D5BFF" />
          <Text style={styles.cardTitle}>Summary Statistics</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={40} color="#FF4444" />
          <Text style={styles.errorText}>
            {customerError || loansError || installmentsError || paymentsError}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => {
              fetchCustomerSummary();
              fetchLoansSummary();
              fetchInstallmentsSummary();
              fetchPaymentsSummary();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="stats-chart-outline" size={18} color="#2D5BFF" />
        <Text style={styles.cardTitle}>Summary Statistics</Text>
      </View>

      {/* Row 1: Total Customers & Total Clients */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryBox, { backgroundColor: '#F5F5F5', borderColor: '#BDBDBD' }]}>
          <Text style={[styles.summaryValue, { color: '#424242' }]}>
            {customerSummary?.total_no_of_clients || 0}
          </Text>
          <Text style={styles.summaryLabel}>Total Customers</Text>
        </View>
        <View style={[styles.summaryBox, { backgroundColor: '#E8F5E9', borderColor: '#00C853' }]}>
          <Text style={[styles.summaryValue, { color: '#00C853' }]}>
            {customerSummary?.total_active || 0}
          </Text>
          <Text style={styles.summaryLabel}>Total Clients</Text>
        </View>
      </View>

      {/* Row 2: Total Loans & Total Installments */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryBox, { backgroundColor: '#E3F2FD', borderColor: '#2D5BFF' }]}>
          <Text style={[styles.summaryValue, { color: '#2D5BFF' }]}>
            {loansSummary?.total_no_of_loans || 0}
          </Text>
          <Text style={styles.summaryLabel}>Total Loans</Text>
        </View>
        <View style={[styles.summaryBox, { backgroundColor: '#FFF9E6', borderColor: '#FFA000' }]}>
          <Text style={[styles.summaryValue, { color: '#FFA000' }]}>
            {installmentsSummary?.total_no_of_installments || 0}
          </Text>
          <Text style={styles.summaryLabel}>Total Installments</Text>
        </View>
      </View>

      {/* Row 3: Total Payments (single box) */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryBox, { backgroundColor: '#E8F5E9', borderColor: '#00C853', flex: 1 }]}>
          <Text style={[styles.summaryValue, { color: '#00C853' }]}>
            {paymentsSummary?.total_no_of_payments || 0}
          </Text>
          <Text style={styles.summaryLabel}>Total Payments</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 8 }} />
      </View>
    </View>
  );
};


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2D5BFF']} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Text style={styles.dateLabel}>Date</Text>
              <Text style={styles.dateValue}>{currentDate}</Text>
            </View>
            <TouchableOpacity style={styles.profileButton} onPress={handleProfilePress}>
              <View style={styles.profileIcon}>
                <Ionicons name="person" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.headerBottom}>
            <View style={styles.currentViewContainer}>
              <Text style={styles.switchViewLabel}>Switch View</Text>
              <TouchableOpacity
                style={styles.currentViewBox}
                onPress={handleViewButtonPress}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={viewType === 'cluster' ? 'people' : viewType === 'branch' ? 'location' : 'business'} 
                  size={14} 
                  color="#2D5BFF" 
                  style={styles.currentViewIcon}
                />
                <View style={styles.currentViewTextContainer}>
                  <Text style={styles.currentViewLabel}>Current View:</Text>
                  <Text style={styles.currentViewValue}>{getViewLabel()}</Text>
                </View>
                <Ionicons name="chevron-down" size={14} color="#2D5BFF" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.actionsButton}
              onPress={() => router.push('/actions')}
            >
              <Text style={styles.actionsButtonText}>Actions</Text>
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Installments Default Rate */}
        {renderIDRCard()}

        {/* Business Unit (BU) - NEW POSITION */}
        {renderBusinessUnitCard()}


        {/* Collections & Disbursements */}
        {renderCollectionsDisbursementsCards()}

        {/* Summary Statistics - NEW CARD */}
        {renderStatsSummaryCard()}

        {/* Customer Summary - DYNAMIC CARD */}
        {/* {renderCustomerSummaryCard()} */}

        {/* Business Unit */}
        {/* <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="briefcase-outline" size={18} color="#2D5BFF" />
            <Text style={styles.cardTitle}>Business Unit (BU)</Text>
          </View>

          <View style={styles.businessUnitRow}>
            <View style={[styles.businessUnitBox, { backgroundColor: '#E8F5E9' }]}>
              <Text style={[styles.businessUnitValue, { color: '#00C853' }]}>790,072</Text>
              <Text style={styles.businessUnitLabel}>Advance</Text>
            </View>
            <View style={[styles.businessUnitBox, { backgroundColor: '#FCE4EC' }]}>
              <Text style={[styles.businessUnitValue, { color: '#D81B60' }]}>28,472</Text>
              <Text style={styles.businessUnitLabel}>Balance</Text>
            </View>
          </View>
        </View> */}

        {/* Loans Summary */}
        {/* <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="repeat-outline" size={18} color="#2D5BFF" />
            <Text style={styles.cardTitle}>Loans Summary</Text>
          </View>

          {loansLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2D5BFF" />
              <Text style={styles.loadingText}>Loading loans data...</Text>
            </View>
          ) : loansError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={40} color="#FF4444" />
              <Text style={styles.errorText}>{loansError}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchLoansSummary}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : !loansSummary ? (
            <Text style={styles.noDataText}>No loans data available</Text>
          ) : (
            <View style={[styles.singleStatBox, { borderColor: '#2D5BFF', backgroundColor: '#E3F2FD' }]}>
              <Text style={[styles.singleStatValue, { color: '#2D5BFF' }]}>
                {loansSummary.total_no_of_loans || 0}
              </Text>
              <Text style={styles.singleStatLabel}>Total Loans</Text>
            </View>
          )}
        </View> */}

        {/* Installments Summary */}
        {/* <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="calendar-outline" size={18} color="#FFA000" />
            <Text style={styles.cardTitle}>Installments Summary</Text>
          </View>

          {installmentsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FFA000" />
              <Text style={styles.loadingText}>Loading installments data...</Text>
            </View>
          ) : installmentsError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={40} color="#FF4444" />
              <Text style={styles.errorText}>{installmentsError}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchInstallmentsSummary}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : !installmentsSummary ? (
            <Text style={styles.noDataText}>No installments data available</Text>
          ) : (
            <View style={[styles.singleStatBox, { borderColor: '#FFA000', backgroundColor: '#FFF9E6' }]}>
              <Text style={[styles.singleStatValue, { color: '#FFA000' }]}>
                {installmentsSummary.total_no_of_installments || 0}
              </Text>
              <Text style={styles.singleStatLabel}>Total Installments</Text>
            </View>
          )}
        </View> */}

        {/* Payments Summary - Single Card */}
        {/* <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="cash-outline" size={18} color="#00C853" />
            <Text style={styles.cardTitle}>Payments</Text>
          </View>

          {paymentsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#00C853" />
              <Text style={styles.loadingText}>Loading payments data...</Text>
            </View>
          ) : paymentsError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={40} color="#FF4444" />
              <Text style={styles.errorText}>{paymentsError}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchPaymentsSummary}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : !paymentsSummary ? (
            <Text style={styles.noDataText}>No payments data available</Text>
          ) : (
            <View style={[styles.singleStatBox, { borderColor: '#00C853', backgroundColor: '#E8F5E9' }]}>
              <Text style={[styles.singleStatValue, { color: '#00C853' }]}>
                {paymentsSummary.total_no_of_payments || 0}
              </Text>
              <Text style={styles.singleStatLabel}>Total Payments</Text>
            </View>
          )}
        </View> */}

        {/* Payments Summary - NEW */}

        
        

        {/* Bottom Actions Button */}
        <TouchableOpacity
          style={styles.bottomActionsButton}
          onPress={() => router.push('/actions')}
        >
          <Text style={styles.actionsButtonText}>Actions</Text>
          <Ionicons name="chevron-forward" size={18} color="#fff" />
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* View Modal */}
      {renderViewModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scrollView: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: '#fff',
    marginTop: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: { flex: 1 },
  dateLabel: { fontSize: 11, color: '#757575', marginBottom: 2 },
  dateValue: { fontSize: 12, color: '#212121', fontWeight: '500' },
  profileButton: { padding: 2 },
  profileIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2D5BFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  currentViewContainer: { flex: 1, marginRight: 12 },
  switchViewLabel: { 
    fontSize: 11, 
    color: '#757575', 
    marginBottom: 4,
    fontWeight: '500',
  },
  currentViewBox: {
    backgroundColor: '#E3F2FD',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2D5BFF',
  },
  currentViewIcon: {
    marginRight: 6,
  },
  currentViewTextContainer: {
    flex: 1,
  },
  currentViewLabel: { 
    fontSize: 9, 
    color: '#757575', 
    marginBottom: 1,
  },
  currentViewValue: { 
    fontSize: 11, 
    color: '#2D5BFF', 
    fontWeight: '600',
  },
  actionsButton: {
    backgroundColor: '#2D5BFF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  actionsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  bottomActionsButton: {
    backgroundColor: '#2D5BFF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 16,
    borderRadius: 8,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  modalLoader: {
    padding: 40,
    alignItems: 'center',
  },
  modalLoaderText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  modalScroll: {
    paddingHorizontal: 20,
  },
  viewSection: {
    marginTop: 20,
  },
  viewSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  viewOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F5F5F5',
  },
  viewOptionSelected: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#2D5BFF',
  },
  viewOptionTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  viewOptionText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
    marginLeft: 12,
  },
  viewOptionTextSelected: {
    color: '#2D5BFF',
    fontWeight: '600',
  },
  viewOptionSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#212121',
    marginLeft: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#757575',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  errorText: {
    marginTop: 12,
    fontSize: 13,
    color: '#FF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2D5BFF',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  noDataText: {
    fontSize: 13,
    color: '#757575',
    textAlign: 'center',
    paddingVertical: 20,
  },
  rateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  rateLabel: { fontSize: 13, color: '#616161' },
  rateValue: { fontSize: 14, fontWeight: '600' },
  progressBar: {
    height: 6,
    backgroundColor: '#EEEEEE',
    borderRadius: 3,
    marginBottom: 14,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  idrDetailsContainer: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  idrDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  idrDetailLabel: {
    fontSize: 12,
    color: '#757575',
  },
  idrDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#212121',
  },
  businessUnitRow: { flexDirection: 'row', justifyContent: 'space-between' },
  businessUnitBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  businessUnitValue: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  businessUnitLabel: { fontSize: 11, color: '#757575' },
  customerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  customerBox: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  customerValue: { fontSize: 22, fontWeight: '700', color: '#212121', marginBottom: 4 },
  customerLabel: { fontSize: 10, color: '#757575' },
  additionalStatsContainer: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#212121',
  },
  loansRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  loanBox: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    marginHorizontal: 4,
    borderWidth: 1,
  },
  loanValue: { fontSize: 32, fontWeight: '700', marginBottom: 4 },
  loanLabel: { fontSize: 10, color: '#616161' },
  installmentsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  installmentBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  installmentValue: { fontSize: 26, fontWeight: '700', marginBottom: 4 },
  installmentLabel: { fontSize: 10, color: '#757575', textAlign: 'center' },
  bottomPadding: { height: 20 },
  paymentsRow: { 
  flexDirection: 'row', 
  justifyContent: 'space-between' 
},
paymentBox: {
  flex: 1,
  alignItems: 'center',
  paddingVertical: 12,
  paddingHorizontal: 8,
  marginHorizontal: 4,
  borderRadius: 6,
  borderWidth: 1,
  borderColor: '#E0E0E0',
  backgroundColor: '#FAFAFA',
},
paymentValue: { 
  fontSize: 26, 
  fontWeight: '700', 
  marginBottom: 4 
},
paymentLabel: { 
  fontSize: 10, 
  color: '#757575', 
  textAlign: 'center' 
},
paymentLabel: { 
    fontSize: 10, 
    color: '#757575', 
    textAlign: 'center' 
  },
  // ADD THESE NEW STYLES BELOW ↓↓↓
  singleStatBox: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    marginTop: 4,
  },
  singleStatValue: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 6,
  },
  singleStatLabel: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'center',
  },
  updatesSection: {
  paddingHorizontal: 16,
  marginBottom: 12,
},
sectionHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 16,
},
sectionTitle: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#000000',
  marginLeft: 8,
},
updateCardsContainer: {
  flexDirection: 'row',
  gap: 12,
},
updateCard: {
  flex: 1,
  borderRadius: 16,
  padding: 16,
  minHeight: 140,
  justifyContent: 'space-between',
},
updateCardIconContainer: {
  width: 44,
  height: 44,
  borderRadius: 12,
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: 8,
},
updateCardTitle: {
  fontSize: 13,
  color: 'white',
  fontWeight: '500',
  marginBottom: 8,
},
updateCardValue: {
  fontSize: 18,
  fontWeight: 'bold',
  color: 'white',
  marginBottom: 12,
},
updateCardLoader: {
  marginBottom: 12,
  alignSelf: 'flex-start',
},
updateCardError: {
  fontSize: 14,
  color: 'white',
  marginBottom: 12,
  opacity: 0.8,
},
updateCardFooter: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 6,
  paddingHorizontal: 12,
  borderRadius: 10,
  alignSelf: 'flex-start',
},
updateCardFooterText: {
  fontSize: 12,
  color: 'white',
  marginLeft: 6,
  fontWeight: '600',
},
filterMenu: {
  backgroundColor: 'white',
  borderRadius: 12,
  marginTop: 12,
  padding: 8,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.15,
  shadowRadius: 8,
  elevation: 5,
},
filterOption: {
  paddingVertical: 12,
  paddingHorizontal: 16,
  borderRadius: 8,
},
filterOptionActive: {
  backgroundColor: '#E3F2FD',
},
filterOptionText: {
  fontSize: 14,
  color: '#666666',
  fontWeight: '500',
},
filterOptionTextActive: {
  color: '#2D5BFF',
  fontWeight: '600',
},
summaryRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 12,
},
summaryBox: {
  flex: 1,
  alignItems: 'center',
  paddingVertical: 16,
  paddingHorizontal: 12,
  marginHorizontal: 4,
  borderRadius: 8,
  borderWidth: 1.5,
},
summaryValue: {
  fontSize: 24,
  fontWeight: '700',
  marginBottom: 4,
},
summaryLabel: {
  fontSize: 11,
  color: '#757575',
  textAlign: 'center',
  fontWeight: '500',
},
collectionRateBadge: {
  backgroundColor: 'rgba(255,255,255,0.2)',
  borderRadius: 10,
  paddingHorizontal: 10,
  paddingVertical: 6,
  alignItems: 'center',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.3)',
},
collectionRateText: {
  fontSize: 16,
  fontWeight: '700',
  color: 'white',
},
collectionRateLabel: {
  fontSize: 9,
  color: 'rgba(255,255,255,0.85)',
  fontWeight: '500',
  marginTop: 1,
},
  
});