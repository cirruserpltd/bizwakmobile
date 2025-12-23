import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
const { API_BASE_URL } = Constants.expoConfig.extra;


const ClientSummary = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState(null);
  const itemsPerPage = 20;
  
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();

 
  const getStatusFromRoute = (route) => {
  const statusMap = {
    'New Lead': 0,              // __NEWLEAD
    'Allocate Lead': 1,         // __ALLOCATEDLEAD
    'Assess Lead': 2,           // __ASSESSEDLEAD
    'Approve Lead': 3,          // __APPROVEDLEAD
    'Onboard Customer': 4,      // __ONBOARDED
    'Approve Onboard BM': 5,    // __CLIENTBMAPPROVED
    'Approve Onboard HQ': 6,    // __CLIENTHQAPPROVED
    'Appraise': 7,              // __APPRAISED
    'Approve Appraisal BM': 8,  // __APPRAISALBMAPPROVED
    'Approve Appraisal HQ': 9,  // __APPRAISALHQAPPROVED
    'Active': 10,               // __ACTIVE
    'Rejected Lead': -1,        // __REJECTEDLEAD
    'Rejected Client': -2,      // __REJECTEDCLIENT
    'Rejected Appraisal': -3,   // __REJECTEDAPPRAISAL
    'Blacklisted': -4,          // BLACKLISTED
  };
  return statusMap[route];
};

  const getFilterLabel = (status) => {
    const labels = {
      0: 'Pending Allocation',      
      1: 'Pending Assessment',       
      2: 'Pending Approval',         
      3: 'Pending Onboarding',       
      4: 'Pending BM Approval',      
      5: 'Pending HQ Approval',      
      6: 'Dormant',
      7: 'Appraise',
      8: 'Approve Appraisal BM',
      9: 'Approve Appraisal HQ',
      10: 'Active',
    };
    return labels[status] || 'Unknown Status';
  };

  const fetchClients = async (page = 1, filters = {}) => {
    try {
      setLoading(true);
      
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        Alert.alert('Error', 'Authentication token not found. Please login again.');
        return;
      }

      const apiUrl = `${API_BASE_URL}/api/members/getpaginatedclients/${page}/${itemsPerPage}`;
      
      const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(filters),
      };

      const response = await fetch(apiUrl, requestOptions);

      if (!response.ok) {
        if (response.status === 401) {
          Alert.alert('Session Expired', 'Please login again.');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        const transformedLeads = (data.payload || []).map((client) => ({
          id: client.id?.toString() || client.client_id?.toString(),
          date: formatDate(client.created_at),
          name: client.name || 'N/A',
          phone: client.phone || 'N/A',
          status: 
            client.status === 0 ? 'Pending Allocation' :
            client.status === 1 ? 'Pending Assessment' :
            client.status === 2 ? 'Pending Approval' :
            client.status === 3 ? 'Pending Onboarding' :
            client.status === 4 ? 'Pending BM Approval' :
            client.status === 5 ? 'Pending HQ Approval' :
            client.status === 6 ? 'Pending Appraisal' :       
            client.status === 7 ? 'Pending Appraisal (BM)' : 
            client.status === 8 ? 'Pending Appraisal (HQ)' :   
            client.status === 9 ? 'Pending RF' :
            client.status === 10 ? 'Dormant' :                 
            client.status === 11 ? 'Active' :                 
            client.status === -1 ? 'Rejected Lead' :
            client.status === -2 ? 'Rejected Client' :
            client.status === -3 ? 'Rejected Appraisal' :
            client.status === -4 ? 'Blacklisted' :
            'Unknown',
          statusValue: client.status,
        }));

        const calculatedTotalPages = Math.ceil((data.all_items_total || 0) / itemsPerPage);
        console.log('✅ Calculated Pages:', {
          all_items_total: data.all_items_total,
          itemsPerPage,
          calculatedTotalPages
        });
        
        setLeads(transformedLeads);
        setFilteredLeads(transformedLeads);
        setTotalPages(calculatedTotalPages > 0 ? calculatedTotalPages : 1);
        setCurrentPage(page);
      } else {
        Alert.alert('Error', data.error || 'Failed to fetch clients');
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      Alert.alert('Error', `Failed to load clients: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      return 'N/A';
    }
  };

  // Initial load with filter from params
  useEffect(() => {
    const statusFilter = params?.statusFilter;
    const filterLabel = params?.filterLabel;
    
    if (statusFilter !== undefined) {
      setActiveFilter(statusFilter);
      fetchClients(1, { status: statusFilter });
    } else if (filterLabel) {
      const statusValue = getStatusFromRoute(filterLabel);
      if (statusValue !== undefined) {
        setActiveFilter(statusValue);
        fetchClients(1, { status: statusValue });
      } else {
        fetchClients(1);
      }
    } else {
      fetchClients(1);
    }
  }, [params?.statusFilter, params?.filterLabel]);

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text === '') {
      setFilteredLeads(leads);
    } else {
      const filtered = leads.filter(
        (lead) =>
          lead.name.toLowerCase().includes(text.toLowerCase()) ||
          lead.phone.includes(text)
      );
      setFilteredLeads(filtered);
    }
  };

  const handleServerSearch = async () => {
    if (searchQuery.trim() === '') {
      const filters = activeFilter !== null ? { status: activeFilter } : {};
      fetchClients(1, filters);
      return;
    }

    const filters = {};
    
    if (activeFilter !== null) {
      filters.status = activeFilter;
    }
    
    if (/^\d+$/.test(searchQuery)) {
      filters.phone = searchQuery;
    } else {
      filters.name = searchQuery;
    }

    await fetchClients(1, filters);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setSearchQuery('');
    const filters = activeFilter !== null ? { status: activeFilter } : {};
    fetchClients(1, filters);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      const filters = activeFilter !== null ? { status: activeFilter } : {};
      fetchClients(currentPage + 1, filters);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      const filters = activeFilter !== null ? { status: activeFilter } : {};
      fetchClients(currentPage - 1, filters);
    }
  };

  const handleClearFilter = () => {
    setActiveFilter(null);
    setSearchQuery('');
    fetchClients(1);
  };

  const handlePhonePress = (lead) => {
    router.push({
      pathname: '/profile',
      params: { memberId: lead.id },
    });
  };

  const formatPhone = (phone) => {
    if (!phone || phone === 'N/A') return phone;
    return phone.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
  };

  const getStatusStyles = (status) => {
  switch (status) {
    case 'Pending Allocation':
      return { badge: { backgroundColor: '#FFF3E0' }, text: { color: '#F57C00' } };
    case 'Pending Assessment':
      return { badge: { backgroundColor: '#E3F2FD' }, text: { color: '#1976D2' } };
    case 'Pending Approval':
      return { badge: { backgroundColor: '#E8F5E9' }, text: { color: '#388E3C' } };
    case 'Pending Onboarding':
      return { badge: { backgroundColor: '#E1F5FE' }, text: { color: '#0288D1' } };
    case 'Pending BM Approval':
      return { badge: { backgroundColor: '#FFF8E1' }, text: { color: '#FBC02D' } };
    case 'Pending HQ Approval':
      return { badge: { backgroundColor: '#E8EAF6' }, text: { color: '#3F51B5' } };
    case 'Pending RF':
      return { badge: { backgroundColor: '#F5F5F5' }, text: { color: '#F57C00' } };
    case 'Active':
      return { badge: { backgroundColor: '#E8F5E9' }, text: { color: '#4CAF50' } };
    case 'Appraise':
      return { badge: { backgroundColor: '#F3E5F5' }, text: { color: '#8E24AA' } };
    case 'Approve Appraisal BM':
      return { badge: { backgroundColor: '#E0F7FA' }, text: { color: '#0097A7' } };
    case 'Approve Appraisal HQ':
      return { badge: { backgroundColor: '#E0F2F1' }, text: { color: '#00796B' } };
    case 'Rejected Lead':
      return { badge: { backgroundColor: '#FFEBEE' }, text: { color: '#D32F2F' } };
    case 'Rejected Client':
      return { badge: { backgroundColor: '#FFEBEE' }, text: { color: '#D32F2F' } };
    case 'Rejected Appraisal':
      return { badge: { backgroundColor: '#FFEBEE' }, text: { color: '#D32F2F' } };
    case 'Blacklisted':
      return { badge: { backgroundColor: '#212121' }, text: { color: '#FFFFFF' } };
    default:
      return { badge: { backgroundColor: '#ECEFF1' }, text: { color: '#607D8B' } };
  }
};

  const renderLeadItem = ({ item }) => {
    const statusStyle = getStatusStyles(item.status);
    return (
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, styles.dateCell]}>{item.date}</Text>
        <Text style={[styles.tableCell, styles.nameCell]} numberOfLines={2}>{item.name}</Text>
        <TouchableOpacity onPress={() => handlePhonePress(item)} style={styles.phoneCellContainer}>
          <Text style={[styles.tableCell, styles.phoneCell, styles.phoneLink]}>
            {formatPhone(item.phone)}
          </Text>
        </TouchableOpacity>
        <View style={styles.statusCellContainer}>
          <View style={[styles.statusBadge, statusStyle.badge]}>
            <Text style={[styles.statusText, statusStyle.text]}>{item.status}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.safeArea, styles.centerContent]}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={styles.loadingText}>Loading clients...</Text>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#4285F4" />

      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Leads Management</Text>
        </View>
      </View>

      <View style={styles.contentContainer}>
        {/* Active Filter Banner */}
        {activeFilter !== null && (
          <View style={styles.filterBanner}>
            <Text style={styles.filterText}>
              Showing: {getFilterLabel(activeFilter)}
            </Text>
            <TouchableOpacity onPress={handleClearFilter} style={styles.clearFilterButton}>
              <Text style={styles.clearFilterText}>Clear Filter ✕</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push("/newlead")} 
          >
            <Text style={styles.addButtonIcon}>👤</Text>
            <Text style={styles.addButtonText}>Add New Lead</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.summaryButton}>
            <Text style={styles.summaryButtonIcon}>☰</Text>
            <Text style={styles.summaryButtonText}>Leads Summary</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or phone"
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={handleSearch}
            onSubmitEditing={handleServerSearch}
            returnKeyType="search"
          />
          <TouchableOpacity onPress={handleServerSearch}>
            <Text style={styles.searchIcon}>🔍</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, styles.dateCell]}>Date</Text>
          <Text style={[styles.headerCell, styles.nameCell]}>Name</Text>
          <Text style={[styles.headerCell, styles.phoneHeaderCell]}>Phone</Text>
          <Text style={[styles.headerCell, styles.statusHeaderCell]}>Status</Text>
        </View>

        <FlatList
          data={filteredLeads}
          renderItem={renderLeadItem}
          keyExtractor={(item) => item.id}
          style={styles.tableContent}
          showsVerticalScrollIndicator={false}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No clients found</Text>
            </View>
          }
        />

        {true && (
          <View style={styles.paginationContainer}>
            <TouchableOpacity
              style={[styles.paginationButton, currentPage === 1 && styles.disabledButton]}
              onPress={handlePreviousPage}
              disabled={currentPage === 1}
            >
              <Text style={[styles.paginationText, currentPage === 1 && styles.disabledText]}>
                Previous
              </Text>
            </TouchableOpacity>
            
            <Text style={styles.pageInfo}>
              Page {currentPage} of {totalPages}
            </Text>
            
            <TouchableOpacity
              style={[styles.paginationButton, currentPage === totalPages && styles.disabledButton]}
              onPress={handleNextPage}
              disabled={currentPage === totalPages}
            >
              <Text style={[styles.paginationText, currentPage === totalPages && styles.disabledText]}>
                Next
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  headerContainer: {
    backgroundColor: '#4285F4',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 44,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4285F4',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  backIcon: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '400',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '500',
  },
  filterBanner: {
    backgroundColor: '#FFF3E0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0B2',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
  },
  clearFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  clearFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E65100',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
    backgroundColor: '#f5f5f5',
  },
  addButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  addButtonIcon: {
    fontSize: 18,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  summaryButton: {
    flex: 1,
    backgroundColor: '#4285F4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  summaryButtonIcon: {
    color: '#fff',
    fontSize: 18,
  },
  summaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  searchIcon: {
    fontSize: 18,
    marginLeft: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerCell: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666',
  },
  tableContent: {
    backgroundColor: '#fff',
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
    minHeight: 70,
  },
  tableCell: {
    fontSize: 13,
    color: '#333',
  },
  dateCell: {
    width: '23%',
    paddingRight: 4,
  },
  nameCell: {
    width: '25%',
    paddingRight: 4,
  },
  phoneHeaderCell: {
    width: '30%',
    paddingRight: 4,
  },
  phoneCellContainer: {
    width: '30%',
    paddingRight: 4,
  },
  phoneCell: {
    lineHeight: 16,
  },
  phoneLink: {
    color: '#4285F4',
    fontWeight: '500',
  },
  statusCellContainer: {
    width: '22%',
    alignItems: 'flex-start',
  },
  statusHeaderCell: {
    width: '22%',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  paginationButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#4285F4',
    borderRadius: 6,
  },
  disabledButton: {
    backgroundColor: '#e0e0e0',
  },
  paginationText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledText: {
    color: '#999',
  },
  pageInfo: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});

export default ClientSummary;