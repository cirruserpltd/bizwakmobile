import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';

const { API_BASE_URL } = Constants.expoConfig.extra;

export default function DefaultedLoans() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [totalDefaulted, setTotalDefaulted] = useState(0);
  const [totalDefaultedAmount, setTotalDefaultedAmount] = useState(0);
  const [token, setToken] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch token on mount
  useEffect(() => {
    getToken();
  }, []);

  // Fetch data when token or page changes
  useEffect(() => {
    if (token) {
      fetchDefaultedLoans();
    }
  }, [token, currentPage]);

  const getToken = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
      } else {
        Alert.alert('Error', 'Authentication token not found. Please login again.');
      }
    } catch (error) {
      console.error('Error retrieving token:', error);
      Alert.alert('Error', 'Failed to retrieve authentication token.');
    }
  };

  const fetchDefaultedLoans = async (searchFilters = {}) => {
    setLoading(true);
    try {
      const url = `${API_BASE_URL}/api/loans/getpaginatedloans/${currentPage}/20`;
      
      // Build request body with status filter for defaulted loans (status = 6)
      const requestBody = {
        status: 6, // Defaulted status
        ...searchFilters
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (result.success) {
        const loans = result.payload || [];

        // Format data for display - showing Name, Phone, Amount Defaulted
        const formattedData = loans.map((loan) => ({
          id: loan.id,
          memberId: loan.client_id,
          name: loan.name || 'N/A',
          phone: loan.phone || 'N/A',
          amount: Number(loan.il_balance_due || 0), // Amount defaulted (balance due)
          principal: Number(loan.il_principal || 0),
          status: loan.status,
        }));

        // Update UI states
        setData(formattedData);
        setTotalPages(Math.ceil(result.all_items_total / 20));
        setTotalDefaulted(result.additional_data?.summary?.total_defaulted || 0);
        
        // Calculate total defaulted amount from the balance of all defaulted loans
        const totalAmount = result.additional_data?.totals?.balance || 0;
        setTotalDefaultedAmount(totalAmount);
      } else {
        Alert.alert('Error', result.error || 'Failed to fetch defaulted loans report');
      }
    } catch (error) {
      console.error('Error fetching defaulted loans report:', error);
      Alert.alert('Error', 'Failed to fetch defaulted loans report. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim() === '') {
      fetchDefaultedLoans();
      return;
    }

    const filters = {};
    
    // Check if search query is a phone number (digits only)
    if (/^\d+$/.test(searchQuery)) {
      filters.phone = searchQuery;
    } else {
      // Assume it's a name search
      filters.client_name = searchQuery;
    }

    fetchDefaultedLoans(filters);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setSearchQuery('');
    setCurrentPage(1);
    fetchDefaultedLoans();
  };

  const handleClientPress = (memberId) => {
    if (memberId) {
      router.push(`/profile?memberId=${memberId}`);
    } else {
      Alert.alert('Error', 'Member ID not found');
    }
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

  const renderItem = ({ item }) => (
    <View style={styles.tableRow}>
      <TouchableOpacity 
        style={[styles.cell, styles.nameCell]}
        onPress={() => handleClientPress(item.memberId)}
        activeOpacity={0.7}
      >
        <Text style={styles.nameCellText} numberOfLines={2}>{item.name}</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.cell, styles.phoneCell]}
        onPress={() => handleClientPress(item.memberId)}
        activeOpacity={0.7}
      >
        <Text style={styles.phoneCellText}>{formatPhone(item.phone)}</Text>
      </TouchableOpacity>
      <View style={styles.amountCellContainer}>
        <Text style={[styles.cell, styles.amountText]}>
          {formatCurrency(item.amount)}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#E53935" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Defaulted Loans Report</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Summary Section */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Defaulted</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(totalDefaultedAmount)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>No. of Loans</Text>
            <Text style={styles.summaryValue}>{totalDefaulted}</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or phone"
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            <TouchableOpacity onPress={handleSearch}>
              <Ionicons name="search" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, styles.nameCell]}>Name</Text>
          <Text style={[styles.headerCell, styles.phoneCell]}>Phone Number</Text>
          <Text style={[styles.headerCell, styles.amountHeaderCell]}>Amount Defaulted</Text>
        </View>

        {/* Table Data */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E53935" />
            <Text style={styles.loadingText}>Loading defaulted loans...</Text>
          </View>
        ) : (
          <FlatList
            data={data}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            style={styles.table}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>✓</Text>
                <Text style={styles.emptyText}>No defaulted loans found</Text>
                <Text style={styles.emptySubText}>All loans are in good standing!</Text>
              </View>
            }
          />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <View style={styles.pagination}>
            <TouchableOpacity
              style={[styles.pageButton, currentPage === 1 && styles.disabledButton]}
              onPress={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1 || loading}
            >
              <Text style={[styles.pageButtonText, currentPage === 1 && styles.disabledText]}>
                Previous
              </Text>
            </TouchableOpacity>
            
            <Text style={styles.pageText}>
              Page {currentPage} of {totalPages || 1}
            </Text>
            
            <TouchableOpacity
              style={[styles.pageButton, styles.nextButton, currentPage === totalPages && styles.disabledButton]}
              onPress={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || loading}
            >
              <Text style={[styles.pageButtonText, currentPage === totalPages && styles.disabledText]}>
                Next
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#E53935',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 16 : 50,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E53935',
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchBox: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerCell: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666',
  },
  nameCell: {
    width: '35%',
    paddingRight: 8,
  },
  phoneCell: {
    width: '30%',
    paddingRight: 8,
  },
  amountHeaderCell: {
    width: '35%',
    textAlign: 'right',
  },
  table: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
    minHeight: 60,
  },
  cell: {
    fontSize: 13,
    color: '#333',
  },
  nameCellText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  phoneCellText: {
    fontSize: 13,
    color: '#E53935',
    fontWeight: '500',
  },
  amountCellContainer: {
    width: '35%',
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E53935',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: 'white',
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
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  pageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#E53935',
    borderRadius: 6,
  },
  disabledButton: {
    backgroundColor: '#e0e0e0',
  },
  nextButton: {
    backgroundColor: '#E53935',
  },
  pageButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledText: {
    color: '#999',
  },
  pageText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});