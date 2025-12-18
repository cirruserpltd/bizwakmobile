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
import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const { API_BASE_URL } = Constants.expoConfig.extra;

const ArrearsReport = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [arrearsData, setArrearsData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalClients, setTotalClients] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState({
    total_clients_with_arrears: 0,
    total_loans_with_arrears: 0,
    total_overdue_installments: 0,
    total_expected_amount: 0,
    total_paid_amount: 0,
    total_arrears_amount: 0,
  });
  const itemsPerPage = 20;
  
  const router = useRouter();
  const navigation = useNavigation();

  const fetchArrearsReport = async (page = 1, filters = {}) => {
    try {
      setLoading(true);
      
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        Alert.alert('Error', 'Authentication token not found. Please login again.');
        return;
      }

      const apiUrl = `${API_BASE_URL}/api/loans/arrears/${page}/${itemsPerPage}`;
      
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
        const transformedData = (data.payload || []).map((item) => ({
          id: item.client_id?.toString(),
          name: item.client_name || 'N/A',
          phone: item.client_phone || 'N/A',
          amount: item.total_arrears || 0,
          loansCount: item.total_loans || 0,
          installmentsCount: item.total_overdue_installments || 0,
        }));

        setArrearsData(transformedData);
        setFilteredData(transformedData);
        setTotalClients(data.all_items_total || 0);
        
        // Calculate total pages
        const pages = Math.ceil((data.all_items_total || 0) / itemsPerPage);
        setTotalPages(pages);
        setCurrentPage(data.current_page || 1);

        // Set summary data
        if (data.additional_data && data.additional_data.summary) {
          setSummary(data.additional_data.summary);
        }
      } else {
        Alert.alert('Error', data.error || 'Failed to fetch arrears report');
      }
    } catch (error) {
      console.error('Error fetching arrears report:', error);
      Alert.alert('Error', `Failed to load arrears report: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchArrearsReport(1);
  }, []);

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text === '') {
      setFilteredData(arrearsData);
    } else {
      const filtered = arrearsData.filter(
        (item) =>
          item.name.toLowerCase().includes(text.toLowerCase()) ||
          item.phone.includes(text)
      );
      setFilteredData(filtered);
    }
  };

  const handleServerSearch = async () => {
    if (searchQuery.trim() === '') {
      fetchArrearsReport(1);
      return;
    }

    const filters = {};
    
    if (/^\d+$/.test(searchQuery)) {
      filters.phone = searchQuery;
    } else {
      filters.client_name = searchQuery;
    }

    await fetchArrearsReport(1, filters);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setSearchQuery('');
    fetchArrearsReport(1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      fetchArrearsReport(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      fetchArrearsReport(currentPage - 1);
    }
  };

  const handleClientPress = (client) => {
    router.push({
      pathname: '/profile',
      params: { memberId: client.id },
    });
  };

  const formatPhone = (phone) => {
    if (!phone || phone === 'N/A') return phone;
    return phone.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const renderArrearsItem = ({ item }) => {
    return (
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, styles.nameCell]} numberOfLines={2}>
          {item.name}
        </Text>
        <TouchableOpacity 
          onPress={() => handleClientPress(item)} 
          style={styles.phoneCellContainer}
        >
          <Text style={[styles.tableCell, styles.phoneCell, styles.phoneLink]}>
            {formatPhone(item.phone)}
          </Text>
        </TouchableOpacity>
        <View style={styles.amountCellContainer}>
          <Text style={[styles.tableCell, styles.amountCell]}>
            {formatCurrency(item.amount)}
          </Text>
          <Text style={styles.subText}>
            {item.loansCount} loan{item.loansCount !== 1 ? 's' : ''} • {item.installmentsCount} overdue
          </Text>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.safeArea, styles.centerContent]}>
        <ActivityIndicator size="large" color="#E53935" />
        <Text style={styles.loadingText}>Loading arrears report...</Text>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#E53935" />

      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Arrears Report</Text>
        </View>
      </View>

      <View style={styles.contentContainer}>
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Arrears</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(summary.total_arrears_amount)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Clients</Text>
            <Text style={styles.summaryValue}>
              {summary.total_clients_with_arrears}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Overdue</Text>
            <Text style={styles.summaryValue}>
              {summary.total_overdue_installments}
            </Text>
          </View>
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
          <Text style={[styles.headerCell, styles.nameCell]}>Name</Text>
          <Text style={[styles.headerCell, styles.phoneHeaderCell]}>Phone</Text>
          <Text style={[styles.headerCell, styles.amountHeaderCell]}>Arrears Amount</Text>
        </View>

        <FlatList
          data={filteredData}
          renderItem={renderArrearsItem}
          keyExtractor={(item) => item.id}
          style={styles.tableContent}
          showsVerticalScrollIndicator={false}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>✓</Text>
              <Text style={styles.emptyText}>No arrears found</Text>
              <Text style={styles.emptySubText}>All clients are up to date!</Text>
            </View>
          }
        />

        {totalPages > 1 && (
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
    backgroundColor: '#E53935',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 44,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#E53935',
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
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
    backgroundColor: '#f5f5f5',
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E53935',
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
  nameCell: {
    width: '30%',
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
    color: '#E53935',
    fontWeight: '500',
  },
  amountHeaderCell: {
    width: '40%',
  },
  amountCellContainer: {
    width: '40%',
    alignItems: 'flex-end',
  },
  amountCell: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E53935',
  },
  subText: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    color: '#4CAF50',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
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
    backgroundColor: '#E53935',
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

export default ArrearsReport;