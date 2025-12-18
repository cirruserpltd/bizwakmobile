import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
const { API_BASE_URL } = Constants.expoConfig.extra;

const { width } = Dimensions.get('window');

const actions = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dateFilter, setDateFilter] = useState('mtd');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // View filter states
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewType, setViewType] = useState('all'); // 'all', 'branch', 'cluster'
  const [selectedView, setSelectedView] = useState(null);
  const [branches, setBranches] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [loadingViews, setLoadingViews] = useState(false);
  
  //const [collectionsData, setCollectionsData] = useState(null);
  //const [disbursementsData, setDisbursementsData] = useState(null);
  const [clientSummary, setClientSummary] = useState(null);
  const [loanSummary, setLoanSummary] = useState(null);
  
  const [dashboardData, setDashboardData] = useState({
    actions: [
      { id: 1, label: 'Add a new Customer', icon: 'person-add', color: '#D1F4F7', iconColor: '#00BCD4', borderColor: '#00BCD4', route: '/newlead' },
      { id: 2, label: 'Allocate Customer', icon: 'sync', color: '#D1F4F7', iconColor: '#00BCD4', borderColor: '#00BCD4', count: 0, route: '/client_summary' },
      { id: 3, label: 'Assess Customer', icon: 'document-text', color: '#FFF9E6', iconColor: '#F57C00', borderColor: '#F57C00', count: 0, route: '/client_summary' },
      { id: 4, label: 'Approve Customer', icon: 'alert-circle', color: '#FFEBEE', iconColor: '#C62828', borderColor: '#C62828', count: 0, route: '/client_summary' },
      { id: 5, label: 'Onboard Customer', icon: 'send', color: '#E3F2FD', iconColor: '#1976D2', borderColor: '#1976D2', count: 0, route: '/client_summary' },
      { id: 6, label: 'Approve Onboard TL', icon: 'checkmark-circle', color: '#E8F5E9', iconColor: '#388E3C', borderColor: '#4CAF50', count: 0, route: 'ApproveOnboardTL' },
      { id: 7, label: 'Approve Onboard HQ', icon: 'checkmark-circle', color: '#E8F5E9', iconColor: '#388E3C', borderColor: '#4CAF50', count: 0, route: 'ApproveOnboardHQ' },
      { id: 13, label: 'Pay RF', icon: 'document-attach', color: '#FFF9E6', iconColor: '#F57C00', borderColor: '#F57C00', count: 0, route: '/client_summary' },
      { id: 14, label: 'Apply Loan', icon: 'cash', color: '#D1F4F7', iconColor: '#00BCD4', borderColor: '#00BCD4', route: '/client_summary' },
      { id: 15, label: 'Approve Loan Request TL', icon: 'checkmark-done', color: '#FFF9E6', iconColor: '#F57C00', borderColor: '#F57C00', count: 0, route: '/requestReport' },
      //{ id: 8, label: 'Apply Loan/ Top Up', icon: 'hand-left', color: '#D1F4F7', iconColor: '#00BCD4', borderColor: '#00BCD4', route: 'ApplyLoan' },
      { id: 9, label: 'Create Loan/Top Up', icon: 'hand-left', color: '#D1F4F7', iconColor: '#00BCD4', borderColor: '#2196F3', route: '/create_loan' },
      { id: 10, label: 'Approve Loan TL', icon: 'document-text', color: '#FFF9E6', iconColor: '#F57C00', borderColor: '#F57C00', subtitle: 'Ksh 0', count: 0, route: '/loan_summary' },
      { id: 11, label: 'Approve Loan HQ', icon: 'document-text', color: '#FFF9E6', iconColor: '#F57C00', borderColor: '#F57C00', subtitle: 'Ksh 0', count: 0, route: '/loan_summary' },
      { id: 12, label: 'Disburse Loan', icon: 'send', color: '#E3F2FD', iconColor: '#1976D2', borderColor: '#2196F3', subtitle: 'Ksh 0', count: 0, route: '/onboard' },
    ],
  });

  const ACTION_STATUS_MAP = {
    2: { status: 0, label: 'Pending Allocation', type: 'client' },  
    3: { status: 1, label: 'Pending Assessment', type: 'client' },
    4: { status: 2, label: 'Pending Approval', type: 'client' },
    5: { status: 3, label: 'Pending Onboarding', type: 'client' },
    6: { status: 4, label: 'Pending BM Approval', type: 'client' },
    7: { status: 5, label: 'Pending HQ Approval', type: 'client' },
    13: { status: 'pending_rf', label: 'Pending RF', type: 'client' },
    //14: { status: 10, label: 'Dormant', type: 'client' }, 
    15: { status: 0, label: 'Pending Approval Request', type: 'request' }, 
    // ID 8 removed - not in your actions array
    9: { status: 10, label: 'Dormant', type: 'client' }, 
    10: { status: 0, label: 'Pending BM Approval', type: 'loan' },
    11: { status: 2, label: 'Pending HQ Approval', type: 'loan' },
    12: { status: 3, label: 'Pending Disbursement', type: 'loan' },
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);

    getUserId();
    fetchDashboardData();

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [dateFilter, viewType, selectedView]);

  const getUserId = async () => {
    try {
      const storedUserId = await AsyncStorage.getItem('userId');
      if (storedUserId) {
        setUserId(storedUserId);
      }
    } catch (error) {
      console.error('Error getting user ID:', error);
    }
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

  const fetchClientSummary = async (token) => {
  try {
    let body = {};
    
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

    const result = await response.json();
    
    if (result.success && result.additional_data && result.additional_data.summary) {
      
      setClientSummary(result.additional_data.summary);
      return result.additional_data.summary;
    }
    return null;
  } catch (err) {
    console.error('Error fetching client summary:', err);
    return null;
  }
};


  const fetchLoanSummary = async (token) => {
  try {
    let body = {};
    
    // Add filters based on view type
    if (viewType === 'branch' && selectedView) {
      body.branch_id = selectedView.id;
    } else if (viewType === 'cluster' && selectedView) {
      body.cluster_id = selectedView.id;
    }

    // Fetch more records to get actual loan data (increase page size)
    const response = await fetch(`${API_BASE_URL}/api/loans/getpaginatedloans/1/100`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
      body: JSON.stringify(body),
    });

    const result = await response.json();
    
    if (result.success) {
      let summary = result.additional_data?.summary || {};
      
      if (result.payload && Array.isArray(result.payload)) {
        const loans = result.payload;
        
        const bmApprovalAmount = loans
          .filter(loan => loan.status === 0) // Pending BM approval
          .reduce((sum, loan) => sum + (parseFloat(loan.amount) || 0), 0);
          
        const hqApprovalAmount = loans
          .filter(loan => loan.status === 2) // Pending HQ approval
          .reduce((sum, loan) => sum + (parseFloat(loan.amount) || 0), 0);
          
        const disbursementAmount = loans
          .filter(loan => loan.status === 3) // Pending disbursement
          .reduce((sum, loan) => sum + (parseFloat(loan.amount) || 0), 0);
        
        // Add calculated amounts to summary
        summary = {
          ...summary,
          total_pending_bm_approval_amount: bmApprovalAmount,
          total_pending_hq_approval_amount: hqApprovalAmount,
          total_pending_disbursement_amount: disbursementAmount,
        };
        
      }
      
      setLoanSummary(summary);
      return summary;
    }
    return null;
  } catch (err) {
    console.error('Error fetching loan summary:', err);
    return null;
  }
};
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await AsyncStorage.getItem("token");


      // Fetch all data in parallel
      const [clientSum, loanSum] = await Promise.all([
        fetchClientSummary(token),
        fetchLoanSummary(token),
        //fetchRequestSummary(token)
      ]);

      // const collectionsResult = await collectionsResponse.json();
      // const disbursementsResult = await disbursementsResponse.json();

      // Update collections and disbursements
      // if (collectionsResult.success && collectionsResult.payload) {
      //   setCollectionsData(collectionsResult.payload);
      //   const totalCollections = calculateTotal(collectionsResult.payload);
        
      //   setDashboardData(prev => ({
      //     ...prev,
      //     updates: {
      //       ...prev.updates,
      //       collections: totalCollections
      //     }
      //   }));
      // }

      // if (disbursementsResult.success && disbursementsResult.payload) {
      //   setDisbursementsData(disbursementsResult.payload);
      //   const totalDisbursements = calculateTotal(disbursementsResult.payload);
        
      //   setDashboardData(prev => ({
      //     ...prev,
      //     updates: {
      //       ...prev.updates,
      //       disbursements: totalDisbursements
      //     }
      //   }));
      // }

      // Update action counts based on client and loan summaries
      if (clientSum || loanSum) {
        updateActionCounts(clientSum, loanSum);
      }

      // if (!collectionsResult.success || !disbursementsResult.success) {
      //   throw new Error('Failed to fetch dashboard data');
      // }

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
      Alert.alert('Error', 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateActionCounts = (clientSum, loanSum) => {
  
  setDashboardData(prev => ({
    ...prev,
    actions: prev.actions.map(action => {
      switch(action.id) {
        case 2: { // Allocate lead (status 0)
          const totalClients = clientSum?.total_no_of_clients || 0;
          const accountedClients = 
            (clientSum?.total_pending_assessment || 0) +
            (clientSum?.total_pending_approval || 0) +
            (clientSum?.total_pending_onboarding || 0) +
            (clientSum?.total_pending_bm_approval || 0) +
            (clientSum?.total_pending_hq_approval || 0) +
            (clientSum?.total_pending_appraisal || 0) +           
            (clientSum?.total_pending_appraisal_bm_approval || 0) + 
            (clientSum?.total_pending_appraisal_hq_approval || 0) + 
            (clientSum?.pending_rf || 0) +
            (clientSum?.total_dormant || 0) +                     
            (clientSum?.total_active || 0) +                      
            (clientSum?.total_blacklisted || 0);
          
          const allocateCount = Math.max(0, totalClients - accountedClients);
          return { ...action, count: allocateCount };
        }
          
        case 3: // Assess Lead (status 1)
          return { ...action, count: clientSum?.total_pending_assessment || 0 };
          
        case 4: // Approve Lead (status 2)
          return { ...action, count: clientSum?.total_pending_approval || 0 };
          
        case 5: // Onboarding (status 3)
          return { ...action, count: clientSum?.total_pending_onboarding || 0 };
          
        case 6: // BM Approval (status 4)
          return { ...action, count: clientSum?.total_pending_bm_approval || 0 };
          
        case 7: // HQ Approval (status 5)
          return { ...action, count: clientSum?.total_pending_hq_approval || 0 };

        case 13: // Pending RF
           return { ...action, count: clientSum?.pending_rf || 0 };
          
        case 8: // Apply Loan - Dormant (status 10) + Active (status 11)
          const applyLoanCount = (clientSum?.total_dormant || 0) + (clientSum?.total_active || 0);
          return { ...action, count: applyLoanCount };
          
        case 9: // Create Loan - Dormant (status 10) + Active (status 11)
          const createLoanCount = (clientSum?.total_dormant || 0) + (clientSum?.total_active || 0);
          return { ...action, count: createLoanCount };
        
        case 10: { // Approve Loan TL
          const amount = loanSum?.total_pending_bm_approval_amount || 0;
          return { 
            ...action, 
            count: loanSum?.total_pending_bm_approval || 0,
            subtitle: `Ksh ${formatNumber(amount)}`
          };
        }
  
        case 11: { // Approve Loan HQ
          const amount = loanSum?.total_pending_hq_approval_amount || 0;
          return { 
            ...action, 
            count: loanSum?.total_pending_hq_approval || 0,
            subtitle: `Ksh ${formatNumber(amount)}`
          };
        }
  
        case 12: { // Disburse Loan
          const amount = loanSum?.total_pending_disbursement_amount || 0;
          const count = loanSum?.total_pending_disbursements || 0; 
          return { 
            ...action, 
            count: count,
            subtitle: `Ksh ${formatNumber(amount)}`
          };
        }

        // case 14: { // Apply Loan
        //   const applyLoanCount = (clientSum?.total_dormant || 0) + (clientSum?.total_active || 0);
        //   return { ...action, count: applyLoanCount };
        // }
        
        // case 15: { // Approve Request TL
        //   return { ...action, count: requestCount };
        // }
        
        default:
          return action;
      }
    })
  }));
};

  // const calculateTotal = (groupedData) => {
  //   if (!groupedData) return 0;
    
  //   let total = 0;
    
  //   Object.values(groupedData).forEach(items => {
  //     if (Array.isArray(items)) {
  //       items.forEach(item => {
  //         total += parseFloat(item.amount || 0);
  //       });
  //     }
  //   });
    
  //   return Math.round(total);
  // };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const formatDate = (date) => {
    const options = { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const formatNumber = (num) => {
    return num.toLocaleString('en-US');
  };

  const getFilterLabel = () => {
    switch(dateFilter) {
      case 'today': return 'Today';
      case 'wtd': return 'WTD';
      case 'mtd': return 'MTD';
      default: return 'MTD';
    }
  };

  const handleFilterChange = (filter) => {
    setDateFilter(filter);
    setShowFilterMenu(false);
  };

  const handleActionPress = (action) => {
     if (action.id === 1) {
        router.push('/newlead');
        return;
      }

      if (action.id === 15) {
        router.push('/requestReport');
        return;
      }
    const actionConfig = ACTION_STATUS_MAP[action.id];
    
     if (!actionConfig) {
        console.warn(`No action config found for action ID: ${action.id}`);
        
        if (action.route) {
          router.push(action.route);
        }
        return;
      }

    if (actionConfig.type === 'client') {
      router.push({
        pathname: '/client_summary',
        params: { 
          statusFilter: actionConfig.status,
          filterLabel: actionConfig.label 
        }
      });
    } else if (actionConfig.type === 'loan') {
      router.push({
        pathname: '/loan_summary',
        params: { 
          statusFilter: actionConfig.status,
          filterLabel: actionConfig.label 
        }
      });
    }
    else if (actionConfig.type === 'request') {
      router.push('/requestReport');
    }
  };

  const handleProfilePress = () => {
    if (userId) {
      router.push({
        pathname: '/userProfile',
        params: { userId: userId }
      });
    } else {
      console.log('No user ID found');
    }
  };

//  const fetchRequestSummary = async (token) => {
//   try {
//     let body = {};
    
//     if (viewType === 'branch' && selectedView) {
//       body.branch_id = selectedView.id;
//     } else if (viewType === 'cluster' && selectedView) {
//       body.cluster_id = selectedView.id;
//     }

//     // Adjust this endpoint to match your API
//     const response = await fetch(`${API_BASE_URL}/api/requests/pending-tl`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${token}`,
//       },
//       credentials: 'include',
//       body: JSON.stringify(body),
//     });

//     const result = await response.json();
    
//     if (result.success) {
//       return result.count || 0; // Adjust based on your API response structure
//     }
//     return 0;
//   } catch (err) {
//     console.error('Error fetching request summary:', err);
//     return 0;
//   }
// };
  const renderActionItem = (action) => (
    <TouchableOpacity
      key={action.id}
      style={[styles.actionItem, { 
        backgroundColor: action.color,
        borderColor: action.borderColor,
      }]}
      onPress={() => handleActionPress(action)}
      activeOpacity={0.7}
    >
      <View style={styles.actionContent}>
        <View style={[styles.actionIconContainer, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]}>
          <Ionicons name={action.icon} size={28} color={action.iconColor} />
        </View>
        <View style={styles.actionTextContainer}>
          <Text style={[styles.actionLabel, { 
            color: action.id === 3 || action.id === 10 || action.id === 11 || action.id === 13 || action.id === 15 ? '#E65100' :
                  action.id === 4 ? '#C62828' :
                  action.id === 6 || action.id === 7 ? '#2E7D32' :
                  '#0277BD'
          }]}>{action.label}</Text>
          {action.subtitle && (
            <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
          )}
        </View>
        {action.count !== undefined && (
          <View style={[styles.actionBadge, { 
            backgroundColor: action.id === 3 || action.id === 10 || action.id === 11 || action.id === 13 || action.id === 15 ? '#FFE0B2' :
                          action.id === 4 ? '#FFCDD2' :
                          action.id === 6 || action.id === 7 ? '#C8E6C9' :
                          '#B3E5FC'
          }]}>
            <Text style={[styles.actionBadgeText, {
              color: action.id === 3 || action.id === 10 || action.id === 11 || action.id === 13 || action.id === 15 ? '#E65100' :
                    action.id === 4 ? '#C62828' :
                    action.id === 6 || action.id === 7 ? '#2E7D32' :
                    '#0277BD'
            }]}>{loading ? '...' : action.count}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

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
              <ActivityIndicator size="large" color="#2196F3" />
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
                  color={viewType === 'all' ? '#2196F3' : '#666'} 
                />
                <Text style={[
                  styles.viewOptionText,
                  viewType === 'all' && styles.viewOptionTextSelected
                ]}>All Branches</Text>
                {viewType === 'all' && (
                  <Ionicons name="checkmark-circle" size={24} color="#2196F3" />
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
                      color={viewType === 'cluster' && selectedView?.id === cluster.id ? '#2196F3' : '#666'} 
                    />
                    <Text style={[
                      styles.viewOptionText,
                      viewType === 'cluster' && selectedView?.id === cluster.id && styles.viewOptionTextSelected
                    ]}>{cluster.name}</Text>
                    {viewType === 'cluster' && selectedView?.id === cluster.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#2196F3" />
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
                      color={viewType === 'branch' && selectedView?.id === branch.id ? '#2196F3' : '#666'} 
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
                      <Ionicons name="checkmark-circle" size={24} color="#2196F3" />
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#2196F3']}
            tintColor="#2196F3"
          />
        }
      >
      {/* Date Section */}
      <View style={styles.dateSection}>
        <View style={styles.dateLeft}>
          <Text style={styles.dateLabel}>Date</Text>
          <Text style={styles.dateValue}>{formatDate(currentDate)}</Text>
          
          <View>
            <Text style={styles.switchViewLabel}>Switch View</Text>
            <TouchableOpacity 
              style={styles.currentViewBox}
              onPress={handleViewButtonPress}
              activeOpacity={0.7}
            >
              <View style={styles.currentViewContent}>
                <Ionicons 
                  name={viewType === 'cluster' ? 'people' : viewType === 'branch' ? 'location' : 'business'} 
                  size={16} 
                  color="#2196F3" 
                  style={styles.currentViewIcon}
                />
                <View style={styles.currentViewTextContainer}>
                  <Text style={styles.currentViewLabel}>Current View:</Text>
                  <Text style={styles.currentViewValue}>{getViewLabel()}</Text>
                </View>
                <Ionicons name="chevron-down" size={16} color="#2196F3" />
              </View>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.dateRight}>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={handleProfilePress}
            activeOpacity={0.7}
          >
            <Ionicons name="person" size={28} color="white" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.arrearsButton}
            onPress={() => router.push('/arrearsReport')}
            activeOpacity={0.7}
          >
            <Ionicons name="warning" size={18} color="#FF6B6B" />
            <Text style={styles.arrearsButtonText}>Arrears</Text>
          </TouchableOpacity>
        </View>
      </View>

        {/* Updates Section */}
        {/* <View style={styles.updatesSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trending-up" size={24} color="#2196F3" />
            <Text style={styles.sectionTitle}>Updates</Text>
          </View>
          <View style={styles.updateCardsContainer}>
            {renderUpdateCard(
              'Collections', 
              dashboardData.updates.collections, 
              '#4CAF50', 
              'trending-up',
              loading
            )}
            {renderUpdateCard(
              'Disbursements', 
              dashboardData.updates.disbursements, 
              '#2196F3', 
              'trending-down',
              loading
            )}
          </View>
          
          {/* Filter Menu */}
          {/* {showFilterMenu && (
            <View style={styles.filterMenu}>
              <TouchableOpacity 
                style={[styles.filterOption, dateFilter === 'today' && styles.filterOptionActive]}
                onPress={() => handleFilterChange('today')}
              >
                <Text style={[styles.filterOptionText, dateFilter === 'today' && styles.filterOptionTextActive]}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterOption, dateFilter === 'wtd' && styles.filterOptionActive]}
                onPress={() => handleFilterChange('wtd')}
              >
                <Text style={[styles.filterOptionText, dateFilter === 'wtd' && styles.filterOptionTextActive]}>Week to Date</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterOption, dateFilter === 'mtd' && styles.filterOptionActive]}
                onPress={() => handleFilterChange('mtd')}
              >
                <Text style={[styles.filterOptionText, dateFilter === 'mtd' && styles.filterOptionTextActive]}>Month to Date</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>  */}

        {/* My Actions Section */}
        <View style={styles.actionsSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="checkmark-circle" size={24} color="#2196F3" />
            <Text style={styles.sectionTitle}>My Actions</Text>
          </View>
          <View style={styles.actionsContainer}>
            {dashboardData.actions.map(action => renderActionItem(action))}
          </View>
        </View>
      </ScrollView>

      {/* View Modal */}
      {renderViewModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    paddingBottom: 40,
  },

  // Date Section
  dateSection: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  dateLeft: {
    flex: 1,
  },
  dateRight: {
    alignItems: 'flex-end',
    gap: 10,
  },
  dateLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  switchViewContainer: {
    flex: 1,
  },
  switchViewLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 6,
    fontWeight: '500',
  },
  currentViewBox: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  currentViewContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentViewIcon: {
    marginRight: 8,
  },
  currentViewTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  currentViewLabel: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 2,
  },
  currentViewValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2196F3',
  },
  profileButton: {
    width: 44,
    height: 44,
    backgroundColor: '#2196F3',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
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
    borderColor: '#2196F3',
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
    color: '#2196F3',
    fontWeight: '600',
  },
  viewOptionSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },

  // Updates Section
  updatesSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
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

  // Filter Menu
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
    color: '#2196F3',
    fontWeight: '600',
  },

  // Actions Section
  actionsSection: {
    paddingHorizontal: 20,
  },
  actionsContainer: {
    gap: 12,
  },
  actionItem: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 11,
    color: '#666666',
    marginTop: 2,
  },
  actionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBadgeText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  arrearsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B6B',
    marginTop: 18, 
    marginLeft: 'auto',
  },
  arrearsButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B6B',
    marginLeft: 6,
  },
  
});
export default actions;